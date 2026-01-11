import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, gte, lte, eq, desc } from "drizzle-orm";

// Complexity to base hours mapping
const complexityHours: Record<string, number> = {
  trivial: 0.5,
  simple: 1,
  medium: 2,
  complex: 4,
  very_complex: 8,
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const teamId = searchParams.get("teamId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    // Get active cost config
    const costConfig = await db.query.costConfig.findFirst({
      where: eq(schema.costConfig.isActive, true),
    });

    if (!costConfig) {
      return NextResponse.json(
        { error: "No active cost configuration found" },
        { status: 400 }
      );
    }

    // Get team user IDs if filtering by team
    let userIds: string[] | undefined;
    if (teamId) {
      const teamUsers = await db.query.users.findMany({
        where: eq(schema.users.teamId, teamId),
        columns: { id: true },
      });
      userIds = teamUsers.map((u) => u.id);
    } else if (userId) {
      userIds = [userId];
    }

    // Get daily aggregates
    const conditions = [
      gte(schema.dailyAggregates.date, startStr),
      lte(schema.dailyAggregates.date, endStr),
    ];

    if (userId) {
      conditions.push(eq(schema.dailyAggregates.userId, userId));
    }

    const aggregates = await db.query.dailyAggregates.findMany({
      where: and(...conditions),
    });

    const filteredAggregates = userIds
      ? aggregates.filter((a) => userIds!.includes(a.userId))
      : aggregates;

    // Get work items for detailed breakdown
    const workItems = await db.query.workItems.findMany({
      where: and(
        gte(schema.workItems.timestamp, start),
        lte(schema.workItems.timestamp, end),
        userId ? eq(schema.workItems.userId, userId) : undefined
      ),
    });

    const filteredWorkItems = userIds
      ? workItems.filter((w) => userIds!.includes(w.userId))
      : workItems;

    // Calculate total costs
    const totalTokenCost = filteredAggregates.reduce(
      (sum, a) => sum + a.totalTokenCostUsd,
      0
    );

    // Calculate hours saved by work type
    const byWorkType: Record<
      string,
      { count: number; hoursSaved: number; value: number }
    > = {
      feature: { count: 0, hoursSaved: 0, value: 0 },
      bug_fix: { count: 0, hoursSaved: 0, value: 0 },
      refactor: { count: 0, hoursSaved: 0, value: 0 },
      docs: { count: 0, hoursSaved: 0, value: 0 },
      test: { count: 0, hoursSaved: 0, value: 0 },
      chore: { count: 0, hoursSaved: 0, value: 0 },
      other: { count: 0, hoursSaved: 0, value: 0 },
    };

    const multipliers: Record<string, number> = {
      feature: costConfig.featureMultiplier,
      bug_fix: costConfig.bugFixMultiplier,
      refactor: costConfig.refactorMultiplier,
      docs: costConfig.docsMultiplier,
      test: costConfig.testMultiplier,
      chore: 2.0,
      other: 2.0,
    };

    const avgHourlyRate =
      (costConfig.juniorHourlyRate +
        costConfig.midHourlyRate +
        costConfig.seniorHourlyRate +
        costConfig.staffHourlyRate +
        costConfig.principalHourlyRate) /
      5;

    const fullyLoadedRate = avgHourlyRate * (1 + costConfig.overheadPercentage / 100);

    for (const item of filteredWorkItems) {
      const baseHours = item.estimatedHours ?? complexityHours[item.complexity ?? "medium"];
      const multiplier = multipliers[item.type] ?? 2.0;
      const hoursSaved = baseHours * (1 - 1 / multiplier);
      const value = hoursSaved * fullyLoadedRate;

      byWorkType[item.type].count++;
      byWorkType[item.type].hoursSaved += hoursSaved;
      byWorkType[item.type].value += value;
    }

    // Calculate totals
    const totalHoursSaved = Object.values(byWorkType).reduce(
      (sum, t) => sum + t.hoursSaved,
      0
    );
    const totalValue = Object.values(byWorkType).reduce(
      (sum, t) => sum + t.value,
      0
    );
    const netSavings = totalValue - totalTokenCost;
    const roiPercentage = totalTokenCost > 0 ? (netSavings / totalTokenCost) * 100 : 0;

    // Get user-level breakdown
    const userMap = new Map<
      string,
      { cost: number; hoursSaved: number; value: number; workItems: number }
    >();

    for (const agg of filteredAggregates) {
      const existing = userMap.get(agg.userId) || {
        cost: 0,
        hoursSaved: 0,
        value: 0,
        workItems: 0,
      };
      userMap.set(agg.userId, {
        ...existing,
        cost: existing.cost + agg.totalTokenCostUsd,
        hoursSaved: existing.hoursSaved + agg.estimatedHoursSaved,
        value: existing.value + agg.estimatedValueUsd,
      });
    }

    for (const item of filteredWorkItems) {
      const existing = userMap.get(item.userId);
      if (existing) {
        existing.workItems++;
      }
    }

    const users = await db.query.users.findMany();
    const userBreakdown = Array.from(userMap.entries()).map(([id, metrics]) => {
      const user = users.find((u) => u.id === id);
      const userNet = metrics.value - metrics.cost;
      const userRoi = metrics.cost > 0 ? (userNet / metrics.cost) * 100 : 0;
      return {
        userId: id,
        name: user?.name ?? "Unknown",
        level: user?.engineerLevel ?? "mid",
        ...metrics,
        netSavings: userNet,
        roi: userRoi,
      };
    });

    // Calculate previous period for comparison
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const prevStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime() - 1);
    const prevStartStr = prevStart.toISOString().split("T")[0];
    const prevEndStr = prevEnd.toISOString().split("T")[0];

    const prevAggregates = await db.query.dailyAggregates.findMany({
      where: and(
        gte(schema.dailyAggregates.date, prevStartStr),
        lte(schema.dailyAggregates.date, prevEndStr),
        userId ? eq(schema.dailyAggregates.userId, userId) : undefined
      ),
    });

    const filteredPrevAggregates = userIds
      ? prevAggregates.filter((a) => userIds!.includes(a.userId))
      : prevAggregates;

    const prevCost = filteredPrevAggregates.reduce(
      (sum, a) => sum + a.totalTokenCostUsd,
      0
    );
    const prevHoursSaved = filteredPrevAggregates.reduce(
      (sum, a) => sum + a.estimatedHoursSaved,
      0
    );
    const prevValue = filteredPrevAggregates.reduce(
      (sum, a) => sum + a.estimatedValueUsd,
      0
    );
    const prevRoi = prevCost > 0 ? ((prevValue - prevCost) / prevCost) * 100 : 0;

    return NextResponse.json({
      period: {
        start: startStr,
        end: endStr,
        days: periodDays,
      },
      costs: {
        aiToolCost: totalTokenCost,
        estimatedLicenseCost: 0, // Can be added later
        totalCost: totalTokenCost,
      },
      value: {
        estimatedHoursSaved: totalHoursSaved,
        equivalentEngineerCost: totalValue,
        averageHourlyRate: avgHourlyRate,
        fullyLoadedRate: fullyLoadedRate,
      },
      roi: {
        netSavings,
        roiPercentage,
        costPerHourSaved: totalHoursSaved > 0 ? totalTokenCost / totalHoursSaved : 0,
      },
      breakdown: {
        byWorkType: Object.entries(byWorkType).map(([type, metrics]) => ({
          type,
          ...metrics,
        })),
        byUser: userBreakdown,
      },
      comparison: {
        previousPeriod: {
          start: prevStartStr,
          end: prevEndStr,
          cost: prevCost,
          hoursSaved: prevHoursSaved,
          value: prevValue,
          roi: prevRoi,
        },
        changes: {
          costChange: prevCost > 0 ? ((totalTokenCost - prevCost) / prevCost) * 100 : 0,
          hoursSavedChange:
            prevHoursSaved > 0
              ? ((totalHoursSaved - prevHoursSaved) / prevHoursSaved) * 100
              : 0,
          roiChange: prevRoi > 0 ? roiPercentage - prevRoi : 0,
        },
      },
      config: {
        hourlyRates: {
          junior: costConfig.juniorHourlyRate,
          mid: costConfig.midHourlyRate,
          senior: costConfig.seniorHourlyRate,
          staff: costConfig.staffHourlyRate,
          principal: costConfig.principalHourlyRate,
        },
        multipliers: {
          feature: costConfig.featureMultiplier,
          bugFix: costConfig.bugFixMultiplier,
          refactor: costConfig.refactorMultiplier,
          docs: costConfig.docsMultiplier,
          test: costConfig.testMultiplier,
        },
        overheadPercentage: costConfig.overheadPercentage,
      },
    });
  } catch (error) {
    console.error("ROI calculation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
