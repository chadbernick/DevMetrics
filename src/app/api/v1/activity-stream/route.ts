import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, gte, eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

interface ActivityEvent {
  id: string;
  type: "session" | "feature" | "bug" | "pr" | "deploy" | "alert";
  title: string;
  description?: string;
  timestamp: string;
  timeAgo: string;
  tags?: Array<{
    label: string;
    type: "tokens" | "lines" | "cost" | "time" | "default";
  }>;
}

interface ActiveSession {
  id: string;
  name: string;
  tool: string;
  tokens: string;
  status: "active" | "idle" | "waiting";
  duration?: string;
}

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

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

const toolDisplayNames: Record<string, string> = {
  claude_code: "Claude Code",
  kiro: "Kiro",
  codex: "Codex",
  copilot: "Copilot",
  cursor: "Cursor",
  gemini: "Gemini",
  other: "Other",
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Get events from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // Fetch data in parallel
    const [sessions, activeSessions, workItems, prActivities, users] =
      await Promise.all([
        // Recent completed sessions
        db.query.sessions.findMany({
          where: userId
            ? and(
                gte(schema.sessions.startedAt, sevenDaysAgo),
                eq(schema.sessions.userId, userId)
              )
            : gte(schema.sessions.startedAt, sevenDaysAgo),
          orderBy: [desc(schema.sessions.startedAt)],
          limit: limit,
        }),

        // Currently active sessions
        db.query.sessions.findMany({
          where: eq(schema.sessions.status, "active"),
          orderBy: [desc(schema.sessions.startedAt)],
          limit: 10,
        }),

        // Recent work items
        db.query.workItems.findMany({
          where: userId
            ? and(
                gte(schema.workItems.timestamp, sevenDaysAgo),
                eq(schema.workItems.userId, userId)
              )
            : gte(schema.workItems.timestamp, sevenDaysAgo),
          orderBy: [desc(schema.workItems.timestamp)],
          limit: limit,
        }),

        // Recent PR activity
        db.query.prActivity.findMany({
          where: userId
            ? and(
                gte(schema.prActivity.timestamp, sevenDaysAgo),
                eq(schema.prActivity.userId, userId)
              )
            : gte(schema.prActivity.timestamp, sevenDaysAgo),
          orderBy: [desc(schema.prActivity.timestamp)],
          limit: limit,
        }),

        // Get all users for name lookup
        db.query.users.findMany(),
      ]);

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Build activity events
    const events: ActivityEvent[] = [];

    // Session events
    for (const session of sessions) {
      if (session.status === "completed") {
        const userName = userMap.get(session.userId)?.name || "Unknown";
        events.push({
          id: `session-${session.id}`,
          type: "session",
          title: `${userName} completed a session`,
          description: `${toolDisplayNames[session.tool] || session.tool} - ${
            session.projectName || "Unknown project"
          }`,
          timestamp: session.startedAt.toISOString(),
          timeAgo: formatTimeAgo(session.startedAt),
          tags: session.durationMinutes
            ? [{ label: `${session.durationMinutes}m`, type: "time" as const }]
            : undefined,
        });
      }
    }

    // Work item events
    for (const item of workItems) {
      const typeMap: Record<string, ActivityEvent["type"]> = {
        feature: "feature",
        bug_fix: "bug",
        refactor: "feature",
        docs: "feature",
        test: "feature",
        chore: "feature",
        other: "feature",
      };

      const typeLabels: Record<string, string> = {
        feature: "Feature",
        bug_fix: "Bug Fix",
        refactor: "Refactor",
        docs: "Documentation",
        test: "Test",
        chore: "Chore",
        other: "Work Item",
      };

      const userName = userMap.get(item.userId)?.name || "Unknown";
      events.push({
        id: `work-${item.id}`,
        type: typeMap[item.type] || "feature",
        title: item.title,
        description: `${userName} - ${typeLabels[item.type]}`,
        timestamp: item.timestamp.toISOString(),
        timeAgo: formatTimeAgo(item.timestamp),
        tags: item.estimatedHours
          ? [{ label: `${item.estimatedHours}h`, type: "time" as const }]
          : undefined,
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

    // Sort by timestamp (most recent first)
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Build active sessions list
    const activeSessionsList: ActiveSession[] = activeSessions.map((s) => {
      const userName = userMap.get(s.userId)?.name || "Unknown";
      const durationMins = s.startedAt
        ? Math.floor((Date.now() - s.startedAt.getTime()) / 60000)
        : 0;

      return {
        id: s.id,
        name: userName,
        tool: toolDisplayNames[s.tool] || s.tool,
        tokens: "—", // Would need to aggregate from tokenUsage
        status: "active" as const,
        duration: durationMins > 0 ? `${durationMins}m` : undefined,
      };
    });

    // Count today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = events.filter(
      (e) => new Date(e.timestamp) >= today
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        events: events.slice(0, limit),
        activeSessions: activeSessionsList,
        eventCount: todayCount,
      },
    });
  } catch (error) {
    console.error("Activity stream error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity stream" },
      { status: 500 }
    );
  }
}
