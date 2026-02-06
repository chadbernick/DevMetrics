import { HybridDashboard } from "@/components/dashboard/hybrid-dashboard";
import { db, schema } from "@/lib/db";
import { desc, gte, eq, sql, and, lt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

// DORA rating thresholds
function getDeployFrequencyRating(deploysPerWeek: number): "elite" | "high" | "medium" | "low" {
  if (deploysPerWeek >= 7) return "elite"; // Multiple per day
  if (deploysPerWeek >= 1) return "high"; // Weekly
  if (deploysPerWeek >= 0.25) return "medium"; // Monthly
  return "low";
}

function getLeadTimeRating(hours: number): "elite" | "high" | "medium" | "low" {
  if (hours < 24) return "elite"; // Less than a day
  if (hours < 168) return "high"; // Less than a week
  if (hours < 720) return "medium"; // Less than a month
  return "low";
}

function getFailureRateRating(rate: number): "elite" | "high" | "medium" | "low" {
  if (rate <= 5) return "elite"; // 0-5%
  if (rate <= 10) return "high"; // 6-10%
  if (rate <= 15) return "medium"; // 11-15%
  return "low";
}

function getOverallRating(ratings: Array<"elite" | "high" | "medium" | "low">): "elite" | "high" | "medium" | "low" {
  const scores = { elite: 4, high: 3, medium: 2, low: 1 };
  const avgScore = ratings.reduce((sum, r) => sum + scores[r], 0) / ratings.length;
  if (avgScore >= 3.5) return "elite";
  if (avgScore >= 2.5) return "high";
  if (avgScore >= 1.5) return "medium";
  return "low";
}

function formatLeadTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

async function getHybridDashboardData() {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];

  // Previous period for comparisons
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(now.getDate() - 60);
  const prevStartDate = sixtyDaysAgo.toISOString().split("T")[0];

  // Fetch all data in parallel
  const [
    aggregates,
    prevAggregates,
    activeSessions,
    toolUsage,
    mergedPrs,
    workItems,
    costConfig,
  ] = await Promise.all([
    // Current period aggregates
    db.query.dailyAggregates.findMany({
      where: gte(schema.dailyAggregates.date, startDate),
      orderBy: [desc(schema.dailyAggregates.date)],
    }),
    // Previous period aggregates
    db.query.dailyAggregates.findMany({
      where: and(
        gte(schema.dailyAggregates.date, prevStartDate),
        lt(schema.dailyAggregates.date, startDate)
      ),
    }),
    // Active sessions
    db.query.sessions.findMany({
      where: eq(schema.sessions.status, "active"),
      limit: 10,
    }),
    // Tool usage for sessions column
    db
      .select({
        tool: schema.sessions.tool,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(schema.sessions)
      .where(gte(schema.sessions.startedAt, thirtyDaysAgo))
      .groupBy(schema.sessions.tool),
    // Merged PRs for DORA
    db.query.prActivity.findMany({
      where: and(
        gte(schema.prActivity.timestamp, thirtyDaysAgo),
        eq(schema.prActivity.action, "merged")
      ),
    }),
    // Work items for DORA
    db.query.workItems.findMany({
      where: and(
        gte(schema.workItems.timestamp, thirtyDaysAgo),
        eq(schema.workItems.source, "commit")
      ),
    }),
    // Cost config
    db.query.costConfig.findFirst({
      where: eq(schema.costConfig.isActive, true),
    }),
  ]);

  // Sum aggregates helper
  const sumAggregates = (aggs: typeof aggregates) =>
    aggs.reduce(
      (acc, agg) => ({
        sessions: acc.sessions + agg.totalSessions,
        minutes: acc.minutes + agg.totalMinutes,
        inputTokens: acc.inputTokens + agg.totalInputTokens,
        outputTokens: acc.outputTokens + agg.totalOutputTokens,
        cost: acc.cost + agg.totalTokenCostUsd,
        linesAdded: acc.linesAdded + agg.totalLinesAdded,
        linesModified: acc.linesModified + agg.totalLinesModified,
        features: acc.features + agg.featuresCompleted,
        bugs: acc.bugs + agg.bugsFixed,
        prs: acc.prs + agg.prsCreated,
      }),
      {
        sessions: 0,
        minutes: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        linesAdded: 0,
        linesModified: 0,
        features: 0,
        bugs: 0,
        prs: 0,
      }
    );

  const totals = sumAggregates(aggregates);
  const prevTotals = sumAggregates(prevAggregates);

  // Calculate changes
  const calcChange = (current: number, previous: number): number | undefined => {
    if (previous === 0) return current > 0 ? undefined : undefined;
    return ((current - previous) / previous) * 100;
  };

  // Productivity multiplier from cost config
  const productivityMultiplier = costConfig?.featureMultiplier ?? 3.0;
  const avgHourlyRate = costConfig
    ? (costConfig.juniorHourlyRate + costConfig.midHourlyRate + costConfig.seniorHourlyRate) / 3
    : 75;

  // Calculate hours saved
  const LINES_PER_HOUR = 25;
  const currLines = totals.linesAdded + totals.linesModified;
  const prevLines = prevTotals.linesAdded + prevTotals.linesModified;
  const hoursSaved = (currLines / LINES_PER_HOUR) * (1 - 1 / productivityMultiplier);
  const prevHoursSaved = (prevLines / LINES_PER_HOUR) * (1 - 1 / productivityMultiplier);

  // Calculate value and ROI
  const valueGenerated = hoursSaved * avgHourlyRate;
  const roi = totals.cost > 0 ? ((valueGenerated - totals.cost) / totals.cost) * 100 : 0;
  const prevValue = prevHoursSaved * avgHourlyRate;
  const prevRoi = prevTotals.cost > 0 ? ((prevValue - prevTotals.cost) / prevTotals.cost) * 100 : 0;

  // DORA Metrics calculation
  const totalDeployments = mergedPrs.length;
  const deploysPerWeek = totalDeployments / (30 / 7);

  // Lead time (simplified - from PR creation to merge)
  const totalCommits = workItems.length;
  const bugFixes = workItems.filter((i) => i.type === "bug_fix").length;
  const failureRate = totalCommits > 0 ? (bugFixes / totalCommits) * 100 : 0;

  // Average session duration for lead time approximation
  const avgLeadTimeHours = totals.sessions > 0 ? (totals.minutes / totals.sessions) / 60 * 2 : 0;

  // Build sparkline data (last 7 days of token usage)
  const last7Days = aggregates.slice(0, 7).reverse();
  const tokenSparkline = last7Days.map((a) => a.totalInputTokens + a.totalOutputTokens);
  const costSparkline = last7Days.map((a) => a.totalTokenCostUsd);

  // Tool usage for sessions column
  const sessionsByTool = toolUsage.map((t) => ({
    tool: t.tool,
    count: t.count,
  }));

  // Build DORA metrics object
  const dfRating = getDeployFrequencyRating(deploysPerWeek);
  const ltRating = getLeadTimeRating(avgLeadTimeHours);
  const cfrRating = getFailureRateRating(failureRate);

  return {
    // Executive metrics
    roi,
    roiChange: calcChange(roi, prevRoi),
    valueGenerated,
    totalCost: totals.cost,
    costChange: calcChange(totals.cost, prevTotals.cost),

    // Session metrics
    totalSessions: totals.sessions,
    activeSessions: activeSessions.length,
    avgDuration: totals.sessions > 0 ? Math.round(totals.minutes / totals.sessions) : 0,
    sessionsByTool,
    sessionsChange: calcChange(totals.sessions, prevTotals.sessions),

    // Token metrics
    totalTokens: totals.inputTokens + totals.outputTokens,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    cacheTokens: 0, // Not tracked in daily aggregates yet
    thinkingTokens: 0, // Not tracked in daily aggregates yet
    tokensChange: calcChange(
      totals.inputTokens + totals.outputTokens,
      prevTotals.inputTokens + prevTotals.outputTokens
    ),
    tokenSparkline,

    // Productivity metrics
    linesOfCode: currLines,
    linesChange: calcChange(currLines, prevLines),
    features: totals.features,
    bugs: totals.bugs,
    prs: totals.prs,
    hoursSaved,
    hoursSavedChange: calcChange(hoursSaved, prevHoursSaved),

    // Cost sparkline
    costSparkline,

    // DORA metrics
    dora: {
      deployFrequency: {
        value: deploysPerWeek >= 1 ? `${deploysPerWeek.toFixed(1)}/wk` : `${totalDeployments}/mo`,
        rating: dfRating,
        trend: "neutral" as const,
      },
      leadTime: {
        value: formatLeadTime(avgLeadTimeHours),
        rating: ltRating,
        trend: "neutral" as const,
      },
      changeFailureRate: {
        value: `${failureRate.toFixed(0)}%`,
        rating: cfrRating,
        trend: "neutral" as const,
      },
      mttr: {
        value: "—",
        rating: "medium" as const,
        trend: "neutral" as const,
      },
      overallRating: getOverallRating([dfRating, ltRating, cfrRating]),
    },
  };
}

async function getActivityData() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [sessions, activeSessions, workItems, prActivities, users] =
    await Promise.all([
      db.query.sessions.findMany({
        where: gte(schema.sessions.startedAt, sevenDaysAgo),
        orderBy: [desc(schema.sessions.startedAt)],
        limit: 20,
      }),
      db.query.sessions.findMany({
        where: eq(schema.sessions.status, "active"),
        limit: 10,
      }),
      db.query.workItems.findMany({
        where: gte(schema.workItems.timestamp, sevenDaysAgo),
        orderBy: [desc(schema.workItems.timestamp)],
        limit: 20,
      }),
      db.query.prActivity.findMany({
        where: gte(schema.prActivity.timestamp, sevenDaysAgo),
        orderBy: [desc(schema.prActivity.timestamp)],
        limit: 20,
      }),
      db.query.users.findMany(),
    ]);

  const userMap = new Map(users.map((u) => [u.id, u]));

  const toolDisplayNames: Record<string, string> = {
    claude_code: "Claude Code",
    kiro: "Kiro",
    codex: "Codex",
    copilot: "Copilot",
    cursor: "Cursor",
    gemini: "Gemini",
    other: "Other",
  };

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  type EventType = "session" | "feature" | "bug" | "pr" | "deploy" | "alert";
  type TagType = "tokens" | "lines" | "cost" | "time" | "default";

  interface ActivityEvent {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    timestamp: string;
    timeAgo: string;
    tags?: Array<{ label: string; type: TagType }>;
  }

  const events: ActivityEvent[] = [];

  // Session events
  for (const session of sessions) {
    if (session.status === "completed") {
      const userName = userMap.get(session.userId)?.name || "Unknown";
      events.push({
        id: `session-${session.id}`,
        type: "session",
        title: `${userName} completed a session`,
        description: `${toolDisplayNames[session.tool] || session.tool} - ${session.projectName || "Unknown project"}`,
        timestamp: session.startedAt.toISOString(),
        timeAgo: formatTimeAgo(session.startedAt),
        tags: session.durationMinutes
          ? [{ label: `${session.durationMinutes}m`, type: "time" as const }]
          : undefined,
      });
    }
  }

  // Work items
  for (const item of workItems) {
    const typeMap: Record<string, EventType> = {
      feature: "feature",
      bug_fix: "bug",
      refactor: "feature",
      docs: "feature",
      test: "feature",
      chore: "feature",
      other: "feature",
    };

    const userName = userMap.get(item.userId)?.name || "Unknown";
    events.push({
      id: `work-${item.id}`,
      type: typeMap[item.type] || "feature",
      title: item.title,
      description: userName,
      timestamp: item.timestamp.toISOString(),
      timeAgo: formatTimeAgo(item.timestamp),
    });
  }

  // PR events
  for (const pr of prActivities) {
    const userName = userMap.get(pr.userId)?.name || "Unknown";
    const actionLabels: Record<string, string> = {
      created: "opened",
      reviewed: "reviewed",
      merged: "merged",
      closed: "closed",
      commented: "commented on",
    };

    events.push({
      id: `pr-${pr.id}`,
      type: "pr",
      title: `${userName} ${actionLabels[pr.action] || pr.action} PR #${pr.prNumber}`,
      description: pr.title || pr.repository,
      timestamp: pr.timestamp.toISOString(),
      timeAgo: formatTimeAgo(pr.timestamp),
    });
  }

  // Sort and limit
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Build active sessions
  const activeSessionsList = activeSessions.map((s) => {
    const userName = userMap.get(s.userId)?.name || "Unknown";
    const durationMins = s.startedAt
      ? Math.floor((Date.now() - s.startedAt.getTime()) / 60000)
      : 0;

    return {
      id: s.id,
      name: userName,
      tool: toolDisplayNames[s.tool] || s.tool,
      tokens: "—",
      status: "active" as const,
      duration: durationMins > 0 ? `${durationMins}m` : undefined,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = events.filter((e) => new Date(e.timestamp) >= today).length;

  return {
    events: events.slice(0, 20),
    activeSessions: activeSessionsList,
    eventCount: todayCount,
  };
}

export default async function HybridDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [dashboardData, activityData] = await Promise.all([
    getHybridDashboardData(),
    getActivityData(),
  ]);

  return (
    <HybridDashboard initialData={dashboardData} initialActivity={activityData} />
  );
}
