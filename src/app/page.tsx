import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { db, schema } from "@/lib/db";
import { desc, gte, lt, sql } from "drizzle-orm";
import { and } from "drizzle-orm";

async function getDashboardData() {
  // Get data for last 30 days (current period)
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];

  // Get data for previous 30 days (comparison period: days 31-60 ago)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(now.getDate() - 60);
  const prevStartDate = sixtyDaysAgo.toISOString().split("T")[0];

  // Query daily aggregates for both periods
  const [aggregates, prevAggregates] = await Promise.all([
    db.query.dailyAggregates.findMany({
      where: gte(schema.dailyAggregates.date, startDate),
      orderBy: [desc(schema.dailyAggregates.date)],
    }),
    db.query.dailyAggregates.findMany({
      where: and(
        gte(schema.dailyAggregates.date, prevStartDate),
        lt(schema.dailyAggregates.date, startDate)
      ),
      orderBy: [desc(schema.dailyAggregates.date)],
    }),
  ]);

  // Helper to sum aggregates
  const sumAggregates = (aggs: typeof aggregates) =>
    aggs.reduce(
      (acc, agg) => ({
        sessions: acc.sessions + agg.totalSessions,
        minutes: acc.minutes + agg.totalMinutes,
        tokens: acc.tokens + agg.totalInputTokens + agg.totalOutputTokens,
        cost: acc.cost + agg.totalTokenCostUsd,
        linesAdded: acc.linesAdded + agg.totalLinesAdded,
        linesModified: acc.linesModified + agg.totalLinesModified,
        features: acc.features + agg.featuresCompleted,
        bugs: acc.bugs + agg.bugsFixed,
        refactors: acc.refactors + agg.refactorsCompleted,
        prs: acc.prs + agg.prsCreated,
        hoursSaved: acc.hoursSaved + agg.estimatedHoursSaved,
        value: acc.value + agg.estimatedValueUsd,
      }),
      {
        sessions: 0,
        minutes: 0,
        tokens: 0,
        cost: 0,
        linesAdded: 0,
        linesModified: 0,
        features: 0,
        bugs: 0,
        refactors: 0,
        prs: 0,
        hoursSaved: 0,
        value: 0,
      }
    );

  // Calculate totals for current and previous periods
  const totals = sumAggregates(aggregates);
  const prevTotals = sumAggregates(prevAggregates);

  // Calculate percentage changes (returns null if no previous data)
  const calcChange = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? null : null;
    return ((current - previous) / previous) * 100;
  };

  const prevLines = prevTotals.linesAdded + prevTotals.linesModified;
  const currLines = totals.linesAdded + totals.linesModified;
  const prevRoi = prevTotals.cost > 0 ? ((prevTotals.value - prevTotals.cost) / prevTotals.cost) * 100 : 0;
  const currRoi = totals.cost > 0 ? ((totals.value - totals.cost) / totals.cost) * 100 : 0;

  const changes = {
    sessions: calcChange(totals.sessions, prevTotals.sessions),
    linesOfCode: calcChange(currLines, prevLines),
    hoursSaved: calcChange(totals.hoursSaved, prevTotals.hoursSaved),
    roi: calcChange(currRoi, prevRoi),
  };

  // Group by date for time series
  const byDate = new Map<string, { tokens: number; cost: number; lines: number }>();
  for (const agg of aggregates) {
    const existing = byDate.get(agg.date) || { tokens: 0, cost: 0, lines: 0 };
    byDate.set(agg.date, {
      tokens: existing.tokens + agg.totalInputTokens + agg.totalOutputTokens,
      cost: existing.cost + agg.totalTokenCostUsd,
      lines: existing.lines + agg.totalLinesAdded + agg.totalLinesModified,
    });
  }

  const timeSeries = Array.from(byDate.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get recent sessions, tool usage, and users in parallel
  const [recentSessions, toolUsageResults, users] = await Promise.all([
    db.query.sessions.findMany({
      where: gte(schema.sessions.startedAt, thirtyDaysAgo),
      orderBy: [desc(schema.sessions.startedAt)],
      limit: 5,
    }),
    db
      .select({
        tool: schema.sessions.tool,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(schema.sessions)
      .where(gte(schema.sessions.startedAt, thirtyDaysAgo))
      .groupBy(schema.sessions.tool),
    db.query.users.findMany(),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Format tool usage with colors
  const toolColors: Record<string, string> = {
    claude_code: "var(--accent-cyan)",
    kiro: "var(--accent-purple)",
    codex: "var(--accent-pink)",
    copilot: "var(--accent-green)",
    cursor: "var(--accent-yellow)",
    other: "var(--foreground-muted)",
  };

  const toolNames: Record<string, string> = {
    claude_code: "Claude Code",
    kiro: "Kiro",
    codex: "Codex",
    copilot: "Copilot",
    cursor: "Cursor",
    other: "Other",
  };

  const toolUsage = toolUsageResults
    .map((t) => ({
      name: toolNames[t.tool] || t.tool,
      sessions: t.count,
      color: toolColors[t.tool] || "var(--foreground-muted)",
    }))
    .sort((a, b) => b.sessions - a.sessions);

  // Calculate ROI
  const roi = currRoi;

  return {
    initialData: {
      totals,
      changes,
      timeSeries,
      toolUsage,
      recentSessions: recentSessions.map((s) => ({
        ...s,
        userName: userMap.get(s.userId)?.name ?? "Unknown",
      })),
      roi,
    },
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      engineerLevel: u.engineerLevel,
    })),
  };
}

export default async function DashboardPage() {
  const { initialData, users } = await getDashboardData();
  return <DashboardClient initialData={initialData} users={users} />;
}
