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

    const conditions = [gte(schema.codeMetrics.timestamp, startDate)];
    if (userId) {
      conditions.push(eq(schema.codeMetrics.userId, userId));
    }

    // 1. Projects Overview (Grouped by Repository)
    // We aggregate lines of code and file changes per repository
    const projectMetrics = await db
      .select({
        repository: schema.codeMetrics.repository,
        linesAdded: sql<number>`sum(${schema.codeMetrics.linesAdded})`,
        linesDeleted: sql<number>`sum(${schema.codeMetrics.linesDeleted})`,
        filesChanged: sql<number>`sum(${schema.codeMetrics.filesChanged})`,
        lastActive: sql<string>`max(${schema.codeMetrics.timestamp})`,
        activityCount: sql<number>`count(*)`,
      })
      .from(schema.codeMetrics)
      .where(and(...conditions))
      .groupBy(schema.codeMetrics.repository)
      .orderBy(desc(sql`sum(${schema.codeMetrics.linesAdded})`));

    // 2. Token Usage per Project (Approximate via Session)
    // Since tokenUsage is linked to Session, and Session has projectName, we try to link them.
    // However, codeMetrics uses 'repository'.
    // We'll return a separate aggregation for Sessions/Tokens based on projectName.
    // Frontend can attempt to match them or display them side-by-side.
    
    const sessionConditions = [gte(schema.sessions.startedAt, startDate)];
    if (userId) {
      sessionConditions.push(eq(schema.sessions.userId, userId));
    }

    const sessionMetrics = await db
      .select({
        projectName: schema.sessions.projectName,
        tool: schema.sessions.tool,
        sessionCount: sql<number>`count(*)`,
        totalDuration: sql<number>`sum(${schema.sessions.durationMinutes})`,
      })
      .from(schema.sessions)
      .where(and(...sessionConditions))
      .groupBy(schema.sessions.projectName, schema.sessions.tool);

    // 3. File Hotspots (Most frequently touched files)
    // Using codeEditDecisions if available, as it tracks specific files.
    // If codeMetrics tracks file paths (it currently just tracks aggregates), we use EditDecisions.
    // codeEditDecisions has 'filePath'.
    
    const editConditions = [gte(schema.codeEditDecisions.timestamp, startDate)];
    if (userId) {
      editConditions.push(eq(schema.codeEditDecisions.userId, userId));
    }

    const fileHotspots = await db
      .select({
        filePath: schema.codeEditDecisions.filePath,
        repository: schema.codeEditDecisions.repository,
        editCount: sql<number>`count(*)`,
        linesAffected: sql<number>`sum(${schema.codeEditDecisions.linesAffected})`,
      })
      .from(schema.codeEditDecisions)
      .where(and(...editConditions))
      .groupBy(schema.codeEditDecisions.filePath, schema.codeEditDecisions.repository)
      .orderBy(desc(sql`count(*)`))
      .limit(10); // Top 10 files

    // Format the response
    const projects = projectMetrics.map((p) => {
      const repoName = p.repository || "Unknown Repository";
      
      // Find matching session metrics (naive matching by name)
      const relatedSessions = sessionMetrics.filter(
        (s) => s.projectName === repoName || (s.projectName && repoName.includes(s.projectName))
      );

      const totalSessions = relatedSessions.reduce((acc, s) => acc + s.sessionCount, 0);
      const toolsUsed = Array.from(new Set(relatedSessions.map((s) => s.tool)));

      return {
        name: repoName,
        linesAdded: p.linesAdded,
        linesDeleted: p.linesDeleted,
        netLines: (p.linesAdded || 0) - (p.linesDeleted || 0),
        filesChanged: p.filesChanged,
        lastActive: p.lastActive,
        sessions: totalSessions,
        tools: toolsUsed,
      };
    });

    return NextResponse.json({
      projects,
      hotspots: fileHotspots.map(f => ({
        path: f.filePath,
        repo: f.repository,
        count: f.editCount,
        lines: f.linesAffected
      })),
    });

  } catch (error) {
    console.error("Codebase metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
