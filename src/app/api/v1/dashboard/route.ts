import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, gte, eq, and, lt, sql, asc } from "drizzle-orm";
import { CLAUDE_CODE_METRICS } from "@/lib/otlp/types";

// Constants for hours saved calculation
const LINES_PER_HOUR_MANUAL = 25; // Average lines of code per hour for manual coding

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    // Get data for last 30 days (current period)
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    // Get data for previous 30 days (comparison period: days 31-60 ago)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const prevStartDate = sixtyDaysAgo.toISOString().split("T")[0];

    // Build conditions for current period
    const conditions = [gte(schema.dailyAggregates.date, startDate)];
    if (userId) {
      conditions.push(eq(schema.dailyAggregates.userId, userId));
    }

    // Build conditions for previous period
    const prevConditions = [
      gte(schema.dailyAggregates.date, prevStartDate),
      lt(schema.dailyAggregates.date, startDate),
    ];
    if (userId) {
      prevConditions.push(eq(schema.dailyAggregates.userId, userId));
    }

    // Query daily aggregates for both periods
    const [aggregates, prevAggregates] = await Promise.all([
      db.query.dailyAggregates.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.dailyAggregates.date)],
      }),
      db.query.dailyAggregates.findMany({
        where: and(...prevConditions),
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
      if (previous === 0) return current > 0 ? null : null; // No previous data
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

    // Build session conditions
    const sessionConditions = [gte(schema.sessions.startedAt, thirtyDaysAgo)];
    if (userId) {
      sessionConditions.push(eq(schema.sessions.userId, userId));
    }

    // Get recent sessions, tool usage counts, users, metrics config, and cost config in parallel
    const [recentSessions, toolUsageResults, users, metricsConfig, costConfig] = await Promise.all([
      db.query.sessions.findMany({
        where: and(...sessionConditions),
        orderBy: [desc(schema.sessions.startedAt)],
        limit: 5,
      }),
      db
        .select({
          tool: schema.sessions.tool,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(schema.sessions)
        .where(and(...sessionConditions))
        .groupBy(schema.sessions.tool),
      db.query.users.findMany(),
      db.query.dashboardMetrics.findMany({
        orderBy: [asc(schema.dashboardMetrics.displayOrder)],
      }),
      db.query.costConfig.findFirst({
        where: eq(schema.costConfig.isActive, true),
      }),
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

    // Get productivity multiplier from cost config (default 3x)
    const productivityMultiplier = costConfig?.featureMultiplier ?? 3.0;
    const avgHourlyRate = costConfig
      ? (costConfig.juniorHourlyRate + costConfig.midHourlyRate + costConfig.seniorHourlyRate) / 3
      : 75; // Default $75/hr

    // Calculate hours saved dynamically from lines of code
    // Formula: (lines / LINES_PER_HOUR_MANUAL) * (1 - 1/multiplier)
    const calculateHoursSaved = (lines: number) => {
      const manualHours = lines / LINES_PER_HOUR_MANUAL;
      return manualHours * (1 - 1 / productivityMultiplier);
    };

    const hoursSaved = calculateHoursSaved(currLines);
    const prevHoursSaved = calculateHoursSaved(prevLines);

    // Calculate value from hours saved
    const valueGenerated = hoursSaved * avgHourlyRate;

    // Calculate ROI
    const roi = totals.cost > 0 ? ((valueGenerated - totals.cost) / totals.cost) * 100 : 0;

    // Build widgets configuration
    // If no metrics configured, use defaults
    let widgets;
    if (metricsConfig.length === 0) {
      // Default widgets configuration - all enabled by default
      widgets = [
        { id: "sessions", metricKey: "sessions", displayName: "Total Sessions", isEnabled: true, displayOrder: 0, icon: "Zap", color: "cyan", format: "number" },
        { id: "linesOfCode", metricKey: "linesOfCode", displayName: "Lines of Code", isEnabled: true, displayOrder: 1, icon: "Code2", color: "purple", format: "number" },
        { id: "hoursSaved", metricKey: "hoursSaved", displayName: "Hours Saved", isEnabled: true, displayOrder: 2, icon: "Clock", color: "green", format: "duration" },
        { id: "roi", metricKey: "roi", displayName: "ROI", isEnabled: true, displayOrder: 3, icon: "TrendingUp", color: "cyan", format: "percentage" },
        { id: "totalCost", metricKey: "totalCost", displayName: "Total Cost", isEnabled: true, displayOrder: 4, icon: "DollarSign", color: "green", format: "currency" },
        { id: "inputTokens", metricKey: "inputTokens", displayName: "Input Tokens", isEnabled: true, displayOrder: 5, icon: "ArrowUpRight", color: "cyan", format: "tokens" },
        { id: "outputTokens", metricKey: "outputTokens", displayName: "Output Tokens", isEnabled: true, displayOrder: 6, icon: "ArrowDownRight", color: "pink", format: "tokens" },
        { id: "activeTime", metricKey: "activeTime", displayName: "Active Time", isEnabled: true, displayOrder: 7, icon: "Clock", color: "yellow", format: "duration" },
      ];
    } else {
      widgets = metricsConfig.map((m) => ({
        id: m.id,
        metricKey: m.metricKey,
        displayName: m.displayName,
        description: m.description,
        isEnabled: m.isEnabled,
        showInTopRow: m.showInTopRow,
        showInChart: m.showInChart,
        displayOrder: m.displayOrder,
        icon: m.icon,
        color: m.color,
        format: m.format,
        category: m.category,
      }));
    }

    // Map metric keys to their values
    const metricValues: Record<string, number> = {
      sessions: totals.sessions,
      linesOfCode: currLines,
      hoursSaved: hoursSaved, // Calculated dynamically from lines of code
      roi: roi,
      totalCost: totals.cost,
      inputTokens: aggregates.reduce((sum, a) => sum + a.totalInputTokens, 0),
      outputTokens: aggregates.reduce((sum, a) => sum + a.totalOutputTokens, 0),
      activeTime: totals.minutes,
      commits: 0, // Would need to track this separately
      pullRequests: totals.prs,
      features: totals.features,
      bugs: totals.bugs,
      refactors: totals.refactors,
      valueGenerated: valueGenerated, // Add value generated
    };

    // Map metric keys to their change percentages
    const metricChanges: Record<string, number | null> = {
      sessions: changes.sessions,
      linesOfCode: changes.linesOfCode,
      hoursSaved: calcChange(hoursSaved, prevHoursSaved), // Calculated from lines of code changes
      roi: changes.roi,
      totalCost: calcChange(totals.cost, prevTotals.cost),
      inputTokens: calcChange(
        aggregates.reduce((sum, a) => sum + a.totalInputTokens, 0),
        prevAggregates.reduce((sum, a) => sum + a.totalInputTokens, 0)
      ),
      outputTokens: calcChange(
        aggregates.reduce((sum, a) => sum + a.totalOutputTokens, 0),
        prevAggregates.reduce((sum, a) => sum + a.totalOutputTokens, 0)
      ),
      activeTime: calcChange(totals.minutes, prevTotals.minutes),
    };

    // Update totals with dynamically calculated values
    const updatedTotals = {
      ...totals,
      hoursSaved: hoursSaved,
      value: valueGenerated,
    };

    return NextResponse.json({
      totals: updatedTotals,
      changes,
      timeSeries,
      toolUsage,
      recentSessions: recentSessions.map((s) => ({
        ...s,
        userName: userMap.get(s.userId)?.name ?? "Unknown",
      })),
      roi,
      widgets,
      metricValues,
      metricChanges,
      productivityMultiplier, // Include for reference
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
