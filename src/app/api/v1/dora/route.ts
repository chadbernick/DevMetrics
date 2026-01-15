import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, desc, gte, eq, sql, lt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const range = searchParams.get("range") || "30"; // days

    const days = parseInt(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 1. Deployment Frequency (PRs Merged)
    // Grouped by week or day depending on range
    const prConditions = [
      gte(schema.prActivity.timestamp, startDate),
      eq(schema.prActivity.action, "merged"),
    ];
    if (userId) {
      prConditions.push(eq(schema.prActivity.userId, userId));
    }

    const deployments = await db
      .select({
        date: sql<string>`date(${schema.prActivity.timestamp})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.prActivity)
      .where(and(...prConditions))
      .groupBy(sql`date(${schema.prActivity.timestamp})`)
      .orderBy(sql`date(${schema.prActivity.timestamp})`);

    const totalDeployments = deployments.reduce((acc, d) => acc + d.count, 0);
    const deploymentFrequency = totalDeployments / (days / 7); // per week

    // 2. Lead Time for Changes
    // Join PRs (merged) with their linked Session (startedAt)
    // If no linked session, fall back to PR creation time (from same table if tracked, or approximate)
    // For now, we only calculate for PRs that HAVE a session linked (AI-assisted)
    
    const leadTimeConditions = [
      gte(schema.prActivity.timestamp, startDate),
      eq(schema.prActivity.action, "merged"),
    ];
    if (userId) {
      leadTimeConditions.push(eq(schema.prActivity.userId, userId));
    }

    // We need to find the session start time for these merged PRs
    // Since Drizzle doesn't support complex joins in query builder easily, we might need raw SQL or separate queries
    // Let's fetch merged PRs with sessionIDs
    const mergedPrs = await db.query.prActivity.findMany({
      where: and(...leadTimeConditions),
      limit: 100,
    });

    let totalLeadTimeMinutes = 0;
    let leadTimeCount = 0;

    // Manually fetch sessions if relation isn't set up in ORM types
    // Optimization: fetch all relevant sessions in one go
    const sessionIds = mergedPrs
      .map(pr => pr.sessionId)
      .filter((id): id is string => !!id);

    const relatedSessions = sessionIds.length > 0 
      ? await db.query.sessions.findMany({
          where: sql`${schema.sessions.id} IN ${sessionIds}`,
        })
      : [];
    
    const sessionMap = new Map(relatedSessions.map(s => [s.id, s]));

    for (const pr of mergedPrs) {
      if (pr.sessionId) {
        const session = sessionMap.get(pr.sessionId);
        if (session) {
          const mergeTime = pr.timestamp.getTime();
          const startTime = session.startedAt.getTime();
          const diffMinutes = (mergeTime - startTime) / (1000 * 60);
          
          if (diffMinutes > 0) {
            totalLeadTimeMinutes += diffMinutes;
            leadTimeCount++;
          }
        }
      }
    }

    const avgLeadTimeHours = leadTimeCount > 0 
      ? (totalLeadTimeMinutes / leadTimeCount) / 60 
      : 0;

    // 3. Change Failure Rate
    // (Bug Fix Commits / Total Commits) * 100
    const commitConditions = [
      gte(schema.workItems.timestamp, startDate),
      eq(schema.workItems.source, "commit"),
    ];
    if (userId) {
      commitConditions.push(eq(schema.workItems.userId, userId));
    }

    const workItems = await db.query.workItems.findMany({
      where: and(...commitConditions),
    });

    const totalCommits = workItems.length;
    const bugFixes = workItems.filter(i => i.type === "bug_fix").length;
    const failureRate = totalCommits > 0 ? (bugFixes / totalCommits) * 100 : 0;

    return NextResponse.json({
      deploymentFrequency: {
        value: parseFloat(deploymentFrequency.toFixed(2)),
        unit: "deployments/week",
        total: totalDeployments,
        history: deployments,
      },
      leadTime: {
        value: parseFloat(avgLeadTimeHours.toFixed(1)),
        unit: "hours",
        sampleSize: leadTimeCount,
      },
      changeFailureRate: {
        value: parseFloat(failureRate.toFixed(1)),
        unit: "percent",
        totalCommits,
        bugFixes,
      },
    });

  } catch (error) {
    console.error("DORA metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
