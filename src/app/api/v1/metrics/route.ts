import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, gte, lte, eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const teamId = searchParams.get("teamId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    // Build conditions for daily aggregates query
    const conditions = [
      gte(schema.dailyAggregates.date, startStr),
      lte(schema.dailyAggregates.date, endStr),
    ];

    if (userId) {
      conditions.push(eq(schema.dailyAggregates.userId, userId));
    }

    // Fetch all relevant users upfront (single query for both team filtering and name lookup)
    // This eliminates the N+1 query pattern
    const usersQuery = teamId
      ? db.query.users.findMany({ where: eq(schema.users.teamId, teamId) })
      : db.query.users.findMany();

    const [allUsers, aggregates] = await Promise.all([
      usersQuery,
      db.query.dailyAggregates.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.dailyAggregates.date)],
      }),
    ]);

    // Create a lookup map for user data
    const usersMap = new Map(allUsers.map((u) => [u.id, u]));
    const teamUserIds = teamId ? allUsers.map((u) => u.id) : undefined;

    // Filter by team if needed
    const filteredAggregates = teamUserIds
      ? aggregates.filter((a) => teamUserIds!.includes(a.userId))
      : aggregates;

    // Calculate summary metrics
    const summary = filteredAggregates.reduce(
      (acc, agg) => ({
        totalSessions: acc.totalSessions + agg.totalSessions,
        totalMinutes: acc.totalMinutes + agg.totalMinutes,
        totalInputTokens: acc.totalInputTokens + agg.totalInputTokens,
        totalOutputTokens: acc.totalOutputTokens + agg.totalOutputTokens,
        totalCost: acc.totalCost + agg.totalTokenCostUsd,
        linesAdded: acc.linesAdded + agg.totalLinesAdded,
        linesModified: acc.linesModified + agg.totalLinesModified,
        linesDeleted: acc.linesDeleted + agg.totalLinesDeleted,
        filesChanged: acc.filesChanged + agg.totalFilesChanged,
        features: acc.features + agg.featuresCompleted,
        bugFixes: acc.bugFixes + agg.bugsFixed,
        refactors: acc.refactors + agg.refactorsCompleted,
        prsCreated: acc.prsCreated + agg.prsCreated,
        prsReviewed: acc.prsReviewed + agg.prsReviewed,
        prsMerged: acc.prsMerged + agg.prsMerged,
        hoursSaved: acc.hoursSaved + agg.estimatedHoursSaved,
        valueGenerated: acc.valueGenerated + agg.estimatedValueUsd,
      }),
      {
        totalSessions: 0,
        totalMinutes: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        linesAdded: 0,
        linesModified: 0,
        linesDeleted: 0,
        filesChanged: 0,
        features: 0,
        bugFixes: 0,
        refactors: 0,
        prsCreated: 0,
        prsReviewed: 0,
        prsMerged: 0,
        hoursSaved: 0,
        valueGenerated: 0,
      }
    );

    // Group by date for time series
    const byDate = new Map<string, typeof summary>();
    for (const agg of filteredAggregates) {
      const existing = byDate.get(agg.date) || {
        totalSessions: 0,
        totalMinutes: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        linesAdded: 0,
        linesModified: 0,
        linesDeleted: 0,
        filesChanged: 0,
        features: 0,
        bugFixes: 0,
        refactors: 0,
        prsCreated: 0,
        prsReviewed: 0,
        prsMerged: 0,
        hoursSaved: 0,
        valueGenerated: 0,
      };
      byDate.set(agg.date, {
        totalSessions: existing.totalSessions + agg.totalSessions,
        totalMinutes: existing.totalMinutes + agg.totalMinutes,
        totalInputTokens: existing.totalInputTokens + agg.totalInputTokens,
        totalOutputTokens: existing.totalOutputTokens + agg.totalOutputTokens,
        totalCost: existing.totalCost + agg.totalTokenCostUsd,
        linesAdded: existing.linesAdded + agg.totalLinesAdded,
        linesModified: existing.linesModified + agg.totalLinesModified,
        linesDeleted: existing.linesDeleted + agg.totalLinesDeleted,
        filesChanged: existing.filesChanged + agg.totalFilesChanged,
        features: existing.features + agg.featuresCompleted,
        bugFixes: existing.bugFixes + agg.bugsFixed,
        refactors: existing.refactors + agg.refactorsCompleted,
        prsCreated: existing.prsCreated + agg.prsCreated,
        prsReviewed: existing.prsReviewed + agg.prsReviewed,
        prsMerged: existing.prsMerged + agg.prsMerged,
        hoursSaved: existing.hoursSaved + agg.estimatedHoursSaved,
        valueGenerated: existing.valueGenerated + agg.estimatedValueUsd,
      });
    }

    const timeSeries = Array.from(byDate.entries())
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by user
    const byUser = new Map<string, typeof summary>();
    for (const agg of filteredAggregates) {
      const existing = byUser.get(agg.userId) || {
        totalSessions: 0,
        totalMinutes: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        linesAdded: 0,
        linesModified: 0,
        linesDeleted: 0,
        filesChanged: 0,
        features: 0,
        bugFixes: 0,
        refactors: 0,
        prsCreated: 0,
        prsReviewed: 0,
        prsMerged: 0,
        hoursSaved: 0,
        valueGenerated: 0,
      };
      byUser.set(agg.userId, {
        totalSessions: existing.totalSessions + agg.totalSessions,
        totalMinutes: existing.totalMinutes + agg.totalMinutes,
        totalInputTokens: existing.totalInputTokens + agg.totalInputTokens,
        totalOutputTokens: existing.totalOutputTokens + agg.totalOutputTokens,
        totalCost: existing.totalCost + agg.totalTokenCostUsd,
        linesAdded: existing.linesAdded + agg.totalLinesAdded,
        linesModified: existing.linesModified + agg.totalLinesModified,
        linesDeleted: existing.linesDeleted + agg.totalLinesDeleted,
        filesChanged: existing.filesChanged + agg.totalFilesChanged,
        features: existing.features + agg.featuresCompleted,
        bugFixes: existing.bugFixes + agg.bugsFixed,
        refactors: existing.refactors + agg.refactorsCompleted,
        prsCreated: existing.prsCreated + agg.prsCreated,
        prsReviewed: existing.prsReviewed + agg.prsReviewed,
        prsMerged: existing.prsMerged + agg.prsMerged,
        hoursSaved: existing.hoursSaved + agg.estimatedHoursSaved,
        valueGenerated: existing.valueGenerated + agg.estimatedValueUsd,
      });
    }

    // Get user names from the already-fetched users map (no additional query needed)
    const userMetrics = Array.from(byUser.entries()).map(([userId, metrics]) => {
      const user = usersMap.get(userId);
      return {
        userId,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
        level: user?.engineerLevel ?? "mid",
        ...metrics,
      };
    });

    // Get recent sessions for activity feed
    const recentSessions = await db.query.sessions.findMany({
      where: and(
        gte(schema.sessions.startedAt, start),
        lte(schema.sessions.startedAt, end),
        userId ? eq(schema.sessions.userId, userId) : undefined
      ),
      orderBy: [desc(schema.sessions.startedAt)],
      limit: 10,
    });

    return NextResponse.json({
      period: {
        start: startStr,
        end: endStr,
      },
      summary: {
        ...summary,
        totalTokens: summary.totalInputTokens + summary.totalOutputTokens,
      },
      timeSeries,
      byUser: userMetrics,
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        tool: s.tool,
        model: s.model,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationMinutes: s.durationMinutes,
        status: s.status,
        projectName: s.projectName,
      })),
    });
  } catch (error) {
    console.error("Metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
