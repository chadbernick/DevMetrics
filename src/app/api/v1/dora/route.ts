import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, desc, gte, lt, eq, sql, count, avg, sum } from "drizzle-orm";

// DORA rating thresholds (based on DORA State of DevOps research)
const DEPLOY_FREQ_THRESHOLDS = {
  elite: 7, // Multiple deploys per day (7+ per week)
  high: 1, // Once per day to once per week (1-7 per week)
  medium: 0.25, // Once per week to once per month (0.25-1 per week)
  low: 0, // Less than once per month
};

const LEAD_TIME_THRESHOLDS = {
  elite: 24, // Less than one day (24 hours)
  high: 168, // One day to one week (24-168 hours)
  medium: 720, // One week to one month (168-720 hours)
  low: Infinity, // More than one month
};

const CFR_THRESHOLDS = {
  elite: 5, // 0-5%
  high: 10, // 5-10%
  medium: 15, // 10-15%
  low: Infinity, // 15%+
};

const MTTR_THRESHOLDS = {
  elite: 60, // Less than one hour (60 minutes)
  high: 1440, // Less than one day (1440 minutes)
  medium: 10080, // One day to one week (10080 minutes)
  low: Infinity, // More than one week
};

function getDeployFreqRating(value: number): "elite" | "high" | "medium" | "low" {
  if (value >= DEPLOY_FREQ_THRESHOLDS.elite) return "elite";
  if (value >= DEPLOY_FREQ_THRESHOLDS.high) return "high";
  if (value >= DEPLOY_FREQ_THRESHOLDS.medium) return "medium";
  return "low";
}

function getLeadTimeRating(hours: number): "elite" | "high" | "medium" | "low" {
  if (hours <= LEAD_TIME_THRESHOLDS.elite) return "elite";
  if (hours <= LEAD_TIME_THRESHOLDS.high) return "high";
  if (hours <= LEAD_TIME_THRESHOLDS.medium) return "medium";
  return "low";
}

function getCfrRating(percentage: number): "elite" | "high" | "medium" | "low" {
  if (percentage <= CFR_THRESHOLDS.elite) return "elite";
  if (percentage <= CFR_THRESHOLDS.high) return "high";
  if (percentage <= CFR_THRESHOLDS.medium) return "medium";
  return "low";
}

function getMttrRating(minutes: number): "elite" | "high" | "medium" | "low" {
  if (minutes <= MTTR_THRESHOLDS.elite) return "elite";
  if (minutes <= MTTR_THRESHOLDS.high) return "high";
  if (minutes <= MTTR_THRESHOLDS.medium) return "medium";
  return "low";
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

function getOverallRating(
  deployRating: string,
  leadTimeRating: string,
  cfrRating: string,
  mttrRating: string
): "elite" | "high" | "medium" | "low" {
  const ratings = [deployRating, leadTimeRating, cfrRating, mttrRating];
  const scores = ratings.map(r => {
    if (r === "elite") return 4;
    if (r === "high") return 3;
    if (r === "medium") return 2;
    return 1;
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg >= 3.5) return "elite";
  if (avg >= 2.5) return "high";
  if (avg >= 1.5) return "medium";
  return "low";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const range = searchParams.get("range") || "30"; // days

    const days = parseInt(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const weeks = days / 7;

    // Build base conditions
    const deploymentConditions = [
      gte(schema.deployments.timestamp, startDate),
      eq(schema.deployments.environment, "production"), // Focus on production deploys
    ];
    if (userId) {
      deploymentConditions.push(eq(schema.deployments.userId, userId));
    }

    // 1. DEPLOYMENT FREQUENCY
    // Count actual production deployments
    const deploymentStats = await db
      .select({
        total: count(),
        successful: sql<number>`SUM(CASE WHEN ${schema.deployments.status} = 'success' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${schema.deployments.status} = 'failure' THEN 1 ELSE 0 END)`,
      })
      .from(schema.deployments)
      .where(and(...deploymentConditions));

    const totalDeployments = deploymentStats[0]?.total ?? 0;
    const successfulDeployments = deploymentStats[0]?.successful ?? 0;
    const failedDeployments = deploymentStats[0]?.failed ?? 0;
    const deploymentFrequency = weeks > 0 ? totalDeployments / weeks : 0;
    const deployFreqRating = getDeployFreqRating(deploymentFrequency);

    // Get deployment history by day
    const deploymentHistory = await db
      .select({
        date: sql<string>`date(${schema.deployments.timestamp})`,
        count: count(),
        success: sql<number>`SUM(CASE WHEN ${schema.deployments.status} = 'success' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${schema.deployments.status} = 'failure' THEN 1 ELSE 0 END)`,
      })
      .from(schema.deployments)
      .where(and(...deploymentConditions))
      .groupBy(sql`date(${schema.deployments.timestamp})`)
      .orderBy(sql`date(${schema.deployments.timestamp})`);

    // 2. LEAD TIME FOR CHANGES
    // Average time from first commit to production deployment
    const leadTimeConditions = [
      gte(schema.deployments.timestamp, startDate),
      eq(schema.deployments.environment, "production"),
      eq(schema.deployments.status, "success"),
      sql`${schema.deployments.leadTimeMinutes} IS NOT NULL`,
    ];
    if (userId) {
      leadTimeConditions.push(eq(schema.deployments.userId, userId));
    }

    const leadTimeStats = await db
      .select({
        avgMinutes: avg(schema.deployments.leadTimeMinutes),
        count: count(),
      })
      .from(schema.deployments)
      .where(and(...leadTimeConditions));

    const avgLeadTimeMinutes = leadTimeStats[0]?.avgMinutes ?? 0;
    const avgLeadTimeHours = Number(avgLeadTimeMinutes) / 60;
    const leadTimeCount = leadTimeStats[0]?.count ?? 0;
    const leadTimeRating = getLeadTimeRating(avgLeadTimeHours);

    // 3. CHANGE FAILURE RATE
    // Failed deployments / Total deployments
    const changeFailureRate = totalDeployments > 0
      ? (failedDeployments / totalDeployments) * 100
      : 0;
    const cfrRating = getCfrRating(changeFailureRate);

    // 4. MEAN TIME TO RECOVERY (MTTR)
    // Average time to resolve incidents
    const incidentConditions = [
      gte(schema.incidents.createdAt, startDate),
      eq(schema.incidents.status, "resolved"),
      sql`${schema.incidents.timeToRecoveryMinutes} IS NOT NULL`,
    ];
    if (userId) {
      incidentConditions.push(eq(schema.incidents.userId, userId));
    }

    const mttrStats = await db
      .select({
        avgMinutes: avg(schema.incidents.timeToRecoveryMinutes),
        count: count(),
        totalMinutes: sum(schema.incidents.timeToRecoveryMinutes),
      })
      .from(schema.incidents)
      .where(and(...incidentConditions));

    const avgMttrMinutes = mttrStats[0]?.avgMinutes ?? 0;
    const resolvedIncidents = mttrStats[0]?.count ?? 0;
    const mttrRating = getMttrRating(Number(avgMttrMinutes) || Infinity);

    // Get open incidents count
    const openIncidentsConditions = [
      gte(schema.incidents.createdAt, startDate),
      sql`${schema.incidents.status} != 'resolved'`,
    ];
    if (userId) {
      openIncidentsConditions.push(eq(schema.incidents.userId, userId));
    }

    const openIncidentsResult = await db
      .select({ count: count() })
      .from(schema.incidents)
      .where(and(...openIncidentsConditions));

    const openIncidents = openIncidentsResult[0]?.count ?? 0;

    // Calculate overall rating
    const overallRating = getOverallRating(
      deployFreqRating,
      leadTimeRating,
      cfrRating,
      mttrRating
    );

    // Calculate previous period for trend comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const previousDeploymentConditions = [
      gte(schema.deployments.timestamp, previousStartDate),
      lt(schema.deployments.timestamp, startDate),
      eq(schema.deployments.environment, "production"),
    ];
    if (userId) {
      previousDeploymentConditions.push(eq(schema.deployments.userId, userId));
    }

    const previousStats = await db
      .select({
        total: count(),
        failed: sql<number>`SUM(CASE WHEN ${schema.deployments.status} = 'failure' THEN 1 ELSE 0 END)`,
      })
      .from(schema.deployments)
      .where(and(...previousDeploymentConditions));

    const previousDeployments = previousStats[0]?.total ?? 0;
    const previousFrequency = weeks > 0 ? previousDeployments / weeks : 0;
    const deployFreqTrend = deploymentFrequency > previousFrequency ? "up" :
                           deploymentFrequency < previousFrequency ? "down" : "neutral";

    const previousCfr = previousDeployments > 0
      ? ((previousStats[0]?.failed ?? 0) / previousDeployments) * 100
      : 0;
    const cfrTrend = changeFailureRate < previousCfr ? "up" :
                    changeFailureRate > previousCfr ? "down" : "neutral";

    return NextResponse.json({
      // Deployment Frequency
      deployFrequency: {
        value: `${deploymentFrequency.toFixed(1)}/wk`,
        rating: deployFreqRating,
        trend: deployFreqTrend,
        previousValue: previousFrequency > 0 ? `${previousFrequency.toFixed(1)}/wk` : undefined,
        raw: {
          perWeek: parseFloat(deploymentFrequency.toFixed(2)),
          total: totalDeployments,
          successful: successfulDeployments,
          failed: failedDeployments,
          history: deploymentHistory,
        },
      },

      // Lead Time for Changes
      leadTime: {
        value: avgLeadTimeHours > 0 ? formatDuration(Number(avgLeadTimeMinutes)) : "N/A",
        rating: leadTimeCount > 0 ? leadTimeRating : "medium",
        trend: "neutral", // Would need historical data for trend
        raw: {
          avgHours: parseFloat(avgLeadTimeHours.toFixed(1)),
          avgMinutes: Number(avgLeadTimeMinutes),
          sampleSize: leadTimeCount,
        },
      },

      // Change Failure Rate
      changeFailureRate: {
        value: `${changeFailureRate.toFixed(1)}%`,
        rating: cfrRating,
        trend: cfrTrend,
        previousValue: previousCfr > 0 ? `${previousCfr.toFixed(1)}%` : undefined,
        raw: {
          percentage: parseFloat(changeFailureRate.toFixed(1)),
          totalDeployments,
          failedDeployments,
        },
      },

      // Mean Time to Recovery
      mttr: {
        value: resolvedIncidents > 0 ? formatDuration(Number(avgMttrMinutes)) : "N/A",
        rating: resolvedIncidents > 0 ? mttrRating : "medium",
        trend: "neutral",
        raw: {
          avgMinutes: Number(avgMttrMinutes) || 0,
          resolvedIncidents,
          openIncidents,
        },
      },

      // Overall
      overallRating,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },

      // Legacy format (for backward compatibility)
      deploymentFrequency: {
        value: parseFloat(deploymentFrequency.toFixed(2)),
        unit: "deployments/week",
        total: totalDeployments,
        history: deploymentHistory,
      },
      leadTimeHours: {
        value: parseFloat(avgLeadTimeHours.toFixed(1)),
        unit: "hours",
        sampleSize: leadTimeCount,
      },
      failureRate: {
        value: parseFloat(changeFailureRate.toFixed(1)),
        unit: "percent",
        totalDeployments,
        failedDeployments,
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
