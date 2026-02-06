import { NextRequest, NextResponse } from "next/server";
import { getAIImpactStats, getDeploymentTrends } from "@/lib/correlations/deployment-session";
import { db, schema } from "@/lib/db";
import { and, gte, eq, sql, count, avg, sum } from "drizzle-orm";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = parseInt(searchParams.get("range") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    // Get core AI impact stats
    const impactStats = await getAIImpactStats(startDate);

    // Get deployment trends
    const trends = await getDeploymentTrends(startDate);

    // Get session-to-deploy velocity for AI-assisted deployments
    const sessionStats = await db
      .select({
        totalSessions: count(),
        totalMinutes: sum(schema.sessions.durationMinutes),
        avgMinutes: avg(schema.sessions.durationMinutes),
      })
      .from(schema.sessions)
      .where(gte(schema.sessions.startedAt, startDate));

    const totalSessions = sessionStats[0]?.totalSessions ?? 0;
    const avgSessionMinutes = Number(sessionStats[0]?.avgMinutes) || 0;

    // Get PR merge stats for AI-assisted PRs
    const prStats = await db
      .select({
        total: count(),
        aiAssisted: sql<number>`SUM(CASE WHEN ${schema.prActivity.aiAssisted} = 1 THEN 1 ELSE 0 END)`,
      })
      .from(schema.prActivity)
      .where(
        and(
          gte(schema.prActivity.timestamp, startDate),
          eq(schema.prActivity.action, "merged")
        )
      );

    const totalMergedPRs = prStats[0]?.total ?? 0;
    const aiAssistedPRs = prStats[0]?.aiAssisted ?? 0;
    const prAIAssistRate = totalMergedPRs > 0 ? (aiAssistedPRs / totalMergedPRs) * 100 : 0;

    // Calculate key insights
    const insights: Array<{
      label: string;
      value: string;
      description: string;
      trend: "positive" | "negative" | "neutral";
      icon: string;
    }> = [];

    // Velocity multiplier insight
    if (impactStats.velocityMultiplier && impactStats.velocityMultiplier > 1) {
      insights.push({
        label: "Velocity Boost",
        value: `${impactStats.velocityMultiplier.toFixed(1)}x`,
        description: "Faster deployments with AI",
        trend: "positive",
        icon: "rocket",
      });
    }

    // Success rate comparison
    if (impactStats.aiSuccessRate > impactStats.nonAISuccessRate) {
      const diff = impactStats.aiSuccessRate - impactStats.nonAISuccessRate;
      insights.push({
        label: "Success Rate",
        value: `+${diff.toFixed(0)}%`,
        description: "Higher success rate for AI-assisted deploys",
        trend: "positive",
        icon: "check",
      });
    }

    // AI adoption rate
    if (impactStats.aiAssistRate > 0) {
      insights.push({
        label: "AI Adoption",
        value: `${impactStats.aiAssistRate.toFixed(0)}%`,
        description: "Of deployments are AI-assisted",
        trend: impactStats.aiAssistRate > 50 ? "positive" : "neutral",
        icon: "sparkles",
      });
    }

    // Time to production
    if (impactStats.avgTimeToProduction) {
      insights.push({
        label: "Time to Prod",
        value: formatDuration(impactStats.avgTimeToProduction),
        description: "Average AI session to production",
        trend: impactStats.avgTimeToProduction < 1440 ? "positive" : "neutral",
        icon: "clock",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        // Summary metrics
        summary: {
          totalDeployments: impactStats.totalDeployments,
          aiAssistedDeployments: impactStats.aiAssistedDeployments,
          aiAssistRate: parseFloat(impactStats.aiAssistRate.toFixed(1)),
          velocityMultiplier: impactStats.velocityMultiplier
            ? parseFloat(impactStats.velocityMultiplier.toFixed(2))
            : null,
        },

        // Velocity comparison
        velocity: {
          aiLeadTime: impactStats.avgLeadTimeAI
            ? {
                minutes: Math.round(impactStats.avgLeadTimeAI),
                formatted: formatDuration(impactStats.avgLeadTimeAI),
              }
            : null,
          nonAILeadTime: impactStats.avgLeadTimeNonAI
            ? {
                minutes: Math.round(impactStats.avgLeadTimeNonAI),
                formatted: formatDuration(impactStats.avgLeadTimeNonAI),
              }
            : null,
          multiplier: impactStats.velocityMultiplier
            ? parseFloat(impactStats.velocityMultiplier.toFixed(2))
            : null,
        },

        // Success rates
        successRates: {
          ai: parseFloat(impactStats.aiSuccessRate.toFixed(1)),
          nonAI: parseFloat(impactStats.nonAISuccessRate.toFixed(1)),
          difference: parseFloat(
            (impactStats.aiSuccessRate - impactStats.nonAISuccessRate).toFixed(1)
          ),
        },

        // Session metrics
        sessions: {
          total: totalSessions,
          avgDuration: avgSessionMinutes
            ? {
                minutes: Math.round(avgSessionMinutes),
                formatted: formatDuration(avgSessionMinutes),
              }
            : null,
        },

        // PR metrics
        pullRequests: {
          totalMerged: totalMergedPRs,
          aiAssisted: aiAssistedPRs,
          aiAssistRate: parseFloat(prAIAssistRate.toFixed(1)),
        },

        // Time series data
        trends: trends.map(t => ({
          date: t.date,
          ai: t.aiDeployments,
          nonAI: t.nonAIDeployments,
          total: t.aiDeployments + t.nonAIDeployments,
          aiSuccessRate: parseFloat(t.aiSuccessRate.toFixed(1)),
          nonAISuccessRate: parseFloat(t.nonAISuccessRate.toFixed(1)),
        })),

        // Key insights for display
        insights,

        // Period info
        period: {
          days: range,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("AI Impact analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
