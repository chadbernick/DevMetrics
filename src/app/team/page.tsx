import { db, schema } from "@/lib/db";
import { desc, gte, sql, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { TeamLeaderboardClient } from "@/components/team/team-leaderboard-client";

// Constants for hours saved calculation
const LINES_PER_HOUR_MANUAL = 25;

async function getTeamLeaderboardData() {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];

  // Get all users
  const users = await db.query.users.findMany({
    where: eq(schema.users.isActive, true),
  });

  // Get daily aggregates for last 30 days
  const aggregates = await db.query.dailyAggregates.findMany({
    where: gte(schema.dailyAggregates.date, startDate),
  });

  // Get active cost config for productivity multiplier
  const costConfig = await db.query.costConfig.findFirst({
    where: eq(schema.costConfig.isActive, true),
  });

  const productivityMultiplier = costConfig?.featureMultiplier ?? 3.0;
  const avgHourlyRate = costConfig
    ? (costConfig.juniorHourlyRate + costConfig.midHourlyRate + costConfig.seniorHourlyRate) / 3
    : 75;

  // Calculate hours saved from lines
  const calculateHoursSaved = (lines: number) => {
    const manualHours = lines / LINES_PER_HOUR_MANUAL;
    return manualHours * (1 - 1 / productivityMultiplier);
  };

  // Aggregate per user
  const userStats = new Map<string, {
    sessions: number;
    tokens: number;
    cost: number;
    linesAdded: number;
    linesModified: number;
    features: number;
    bugs: number;
    prs: number;
    hoursSaved: number;
    value: number;
  }>();

  // Initialize all users with zero stats
  for (const user of users) {
    userStats.set(user.id, {
      sessions: 0,
      tokens: 0,
      cost: 0,
      linesAdded: 0,
      linesModified: 0,
      features: 0,
      bugs: 0,
      prs: 0,
      hoursSaved: 0,
      value: 0,
    });
  }

  // Sum up aggregates per user
  for (const agg of aggregates) {
    const existing = userStats.get(agg.userId);
    if (existing) {
      const lines = agg.totalLinesAdded + agg.totalLinesModified;
      const hoursSaved = calculateHoursSaved(lines);
      const value = hoursSaved * avgHourlyRate;

      userStats.set(agg.userId, {
        sessions: existing.sessions + agg.totalSessions,
        tokens: existing.tokens + agg.totalInputTokens + agg.totalOutputTokens,
        cost: existing.cost + agg.totalTokenCostUsd,
        linesAdded: existing.linesAdded + agg.totalLinesAdded,
        linesModified: existing.linesModified + agg.totalLinesModified,
        features: existing.features + agg.featuresCompleted,
        bugs: existing.bugs + agg.bugsFixed,
        prs: existing.prs + agg.prsCreated,
        hoursSaved: existing.hoursSaved + hoursSaved,
        value: existing.value + value,
      });
    }
  }

  // Build leaderboard entries
  const leaderboard = users.map((user) => {
    const stats = userStats.get(user.id)!;
    const totalLines = stats.linesAdded + stats.linesModified;
    const roi = stats.cost > 0 ? ((stats.value - stats.cost) / stats.cost) * 100 : 0;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      engineerLevel: user.engineerLevel,
      sessions: stats.sessions,
      tokens: stats.tokens,
      cost: stats.cost,
      linesOfCode: totalLines,
      hoursSaved: stats.hoursSaved,
      value: stats.value,
      roi,
      features: stats.features,
      bugs: stats.bugs,
      prs: stats.prs,
    };
  });

  // Sort by lines of code by default (can be changed client-side)
  leaderboard.sort((a, b) => b.linesOfCode - a.linesOfCode);

  return { leaderboard };
}

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { leaderboard } = await getTeamLeaderboardData();

  return <TeamLeaderboardClient leaderboard={leaderboard} currentUserId={user.id} />;
}
