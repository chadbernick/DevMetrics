import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, desc, gte, eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const range = searchParams.get("range") || "30"; // days

    const days = parseInt(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conditions = [gte(schema.codeEditDecisions.timestamp, startDate)];
    if (userId) {
      conditions.push(eq(schema.codeEditDecisions.userId, userId));
    }

    // Aggregate decisions
    const decisionStats = await db
      .select({
        decision: schema.codeEditDecisions.decision,
        count: sql<number>`count(*)`,
        lines: sql<number>`sum(${schema.codeEditDecisions.linesAffected})`,
      })
      .from(schema.codeEditDecisions)
      .where(and(...conditions))
      .groupBy(schema.codeEditDecisions.decision);

    // Calculate totals
    let totalDecisions = 0;
    let accepted = 0;
    let rejected = 0;
    let modified = 0;
    let autoApplied = 0;
    
    let totalLines = 0;
    let rejectedLines = 0;

    for (const stat of decisionStats) {
      const count = stat.count;
      const lines = stat.lines || 0;
      totalDecisions += count;
      totalLines += lines;

      switch (stat.decision) {
        case "accepted":
          accepted += count;
          break;
        case "rejected":
          rejected += count;
          rejectedLines += lines;
          break;
        case "modified":
          modified += count;
          break;
        case "auto_applied":
          autoApplied += count;
          // Auto-applied usually means high confidence/accepted implicitly
          accepted += count; 
          break;
      }
    }

    // Calculate rates
    const acceptanceRate = totalDecisions > 0 ? (accepted / totalDecisions) * 100 : 0;
    const rejectionRate = totalDecisions > 0 ? (rejected / totalDecisions) * 100 : 0;
    const modificationRate = totalDecisions > 0 ? (modified / totalDecisions) * 100 : 0;

    // "Waste" is considered Rejected Lines + (Modified Lines * 0.5 estimate)
    // We only have exact lines for the aggregate, so we estimate modified lines
    const estimatedModifiedLines = totalLines * (modificationRate / 100);
    const wasteLines = rejectedLines + (estimatedModifiedLines * 0.5);
    const wasteRate = totalLines > 0 ? (wasteLines / totalLines) * 100 : 0;

    // Get time series of acceptance rate
    // Group by day
    const timeSeries = await db
      .select({
        date: sql<string>`date(${schema.codeEditDecisions.timestamp})`,
        accepted: sql<number>`sum(case when ${schema.codeEditDecisions.decision} in ('accepted', 'auto_applied') then 1 else 0 end)`,
        total: sql<number>`count(*)`,
      })
      .from(schema.codeEditDecisions)
      .where(and(...conditions))
      .groupBy(sql`date(${schema.codeEditDecisions.timestamp})`)
      .orderBy(sql`date(${schema.codeEditDecisions.timestamp})`);

    const history = timeSeries.map(day => ({
      date: day.date,
      rate: day.total > 0 ? (day.accepted / day.total) * 100 : 0
    }));

    return NextResponse.json({
      acceptanceRate,
      rejectionRate,
      modificationRate,
      wasteRate,
      totalDecisions,
      history,
    });

  } catch (error) {
    console.error("Quality metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
