/**
 * Deployment → Session Correlation Service
 *
 * Links deployments to AI sessions through PR activity to measure
 * the impact of AI-assisted development on deployment velocity.
 */

import { db, schema } from "@/lib/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";

/**
 * Find AI session linked to a deployment via PR
 *
 * Flow: Deployment → PR Number → PR Activity → Session
 */
export async function findSessionForDeployment(
  prNumber: number,
  repository: string
): Promise<string | null> {
  const prActivity = await db.query.prActivity.findFirst({
    where: and(
      eq(schema.prActivity.prNumber, prNumber),
      eq(schema.prActivity.repository, repository),
      sql`${schema.prActivity.sessionId} IS NOT NULL`
    ),
    orderBy: [desc(schema.prActivity.timestamp)],
  });

  return prActivity?.sessionId || null;
}

/**
 * Link a deployment to an AI session
 */
export async function linkDeploymentToSession(
  deploymentId: string,
  sessionId: string
): Promise<void> {
  await db
    .update(schema.deployments)
    .set({
      sessionId,
      aiAssisted: true,
    })
    .where(eq(schema.deployments.id, deploymentId));
}

/**
 * Auto-correlate a deployment by finding linked session through PR
 */
export async function correlateDeployment(
  deploymentId: string,
  prNumber: number | null,
  repository: string
): Promise<{ linked: boolean; sessionId: string | null }> {
  if (!prNumber) {
    return { linked: false, sessionId: null };
  }

  const sessionId = await findSessionForDeployment(prNumber, repository);

  if (sessionId) {
    await linkDeploymentToSession(deploymentId, sessionId);
    return { linked: true, sessionId };
  }

  return { linked: false, sessionId: null };
}

/**
 * Get AI impact statistics for a time period
 */
export async function getAIImpactStats(startDate: Date): Promise<{
  totalDeployments: number;
  aiAssistedDeployments: number;
  aiAssistRate: number;

  // Velocity comparison
  avgLeadTimeAI: number | null;
  avgLeadTimeNonAI: number | null;
  velocityMultiplier: number | null;

  // Success rates
  aiSuccessRate: number;
  nonAISuccessRate: number;

  // Time to production
  avgTimeToProduction: number | null;
}> {
  // Get all deployments in period
  const allDeployments = await db
    .select({
      total: sql<number>`count(*)`,
      aiAssisted: sql<number>`SUM(CASE WHEN ${schema.deployments.aiAssisted} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(schema.deployments)
    .where(
      and(
        gte(schema.deployments.timestamp, startDate),
        eq(schema.deployments.environment, "production")
      )
    );

  const totalDeployments = allDeployments[0]?.total ?? 0;
  const aiAssistedDeployments = allDeployments[0]?.aiAssisted ?? 0;
  const aiAssistRate = totalDeployments > 0
    ? (aiAssistedDeployments / totalDeployments) * 100
    : 0;

  // Get lead time comparison (AI vs non-AI)
  const leadTimeStats = await db
    .select({
      aiAssisted: schema.deployments.aiAssisted,
      avgLeadTime: sql<number>`AVG(${schema.deployments.leadTimeMinutes})`,
      successCount: sql<number>`SUM(CASE WHEN ${schema.deployments.status} = 'success' THEN 1 ELSE 0 END)`,
      totalCount: sql<number>`count(*)`,
    })
    .from(schema.deployments)
    .where(
      and(
        gte(schema.deployments.timestamp, startDate),
        eq(schema.deployments.environment, "production"),
        sql`${schema.deployments.leadTimeMinutes} IS NOT NULL`
      )
    )
    .groupBy(schema.deployments.aiAssisted);

  let avgLeadTimeAI: number | null = null;
  let avgLeadTimeNonAI: number | null = null;
  let aiSuccessRate = 0;
  let nonAISuccessRate = 0;

  for (const stat of leadTimeStats) {
    if (stat.aiAssisted) {
      avgLeadTimeAI = stat.avgLeadTime;
      aiSuccessRate = stat.totalCount > 0 ? (stat.successCount / stat.totalCount) * 100 : 0;
    } else {
      avgLeadTimeNonAI = stat.avgLeadTime;
      nonAISuccessRate = stat.totalCount > 0 ? (stat.successCount / stat.totalCount) * 100 : 0;
    }
  }

  // Calculate velocity multiplier
  let velocityMultiplier: number | null = null;
  if (avgLeadTimeAI && avgLeadTimeNonAI && avgLeadTimeAI > 0) {
    velocityMultiplier = avgLeadTimeNonAI / avgLeadTimeAI;
  }

  // Get average time from session to production for AI-assisted deployments
  const timeToProductionResult = await db
    .select({
      avgMinutes: sql<number>`AVG(${schema.deployments.leadTimeMinutes})`,
    })
    .from(schema.deployments)
    .where(
      and(
        gte(schema.deployments.timestamp, startDate),
        eq(schema.deployments.environment, "production"),
        eq(schema.deployments.aiAssisted, true),
        sql`${schema.deployments.leadTimeMinutes} IS NOT NULL`
      )
    );

  const avgTimeToProduction = timeToProductionResult[0]?.avgMinutes ?? null;

  return {
    totalDeployments,
    aiAssistedDeployments,
    aiAssistRate,
    avgLeadTimeAI,
    avgLeadTimeNonAI,
    velocityMultiplier,
    aiSuccessRate,
    nonAISuccessRate,
    avgTimeToProduction,
  };
}

/**
 * Get deployment trends comparing AI vs non-AI over time
 */
export async function getDeploymentTrends(startDate: Date): Promise<Array<{
  date: string;
  aiDeployments: number;
  nonAIDeployments: number;
  aiSuccessRate: number;
  nonAISuccessRate: number;
}>> {
  const trends = await db
    .select({
      date: sql<string>`date(${schema.deployments.timestamp})`,
      aiDeployments: sql<number>`SUM(CASE WHEN ${schema.deployments.aiAssisted} = 1 THEN 1 ELSE 0 END)`,
      nonAIDeployments: sql<number>`SUM(CASE WHEN ${schema.deployments.aiAssisted} = 0 OR ${schema.deployments.aiAssisted} IS NULL THEN 1 ELSE 0 END)`,
      aiSuccess: sql<number>`SUM(CASE WHEN ${schema.deployments.aiAssisted} = 1 AND ${schema.deployments.status} = 'success' THEN 1 ELSE 0 END)`,
      nonAISuccess: sql<number>`SUM(CASE WHEN (${schema.deployments.aiAssisted} = 0 OR ${schema.deployments.aiAssisted} IS NULL) AND ${schema.deployments.status} = 'success' THEN 1 ELSE 0 END)`,
    })
    .from(schema.deployments)
    .where(
      and(
        gte(schema.deployments.timestamp, startDate),
        eq(schema.deployments.environment, "production")
      )
    )
    .groupBy(sql`date(${schema.deployments.timestamp})`)
    .orderBy(sql`date(${schema.deployments.timestamp})`);

  return trends.map(t => ({
    date: t.date,
    aiDeployments: t.aiDeployments,
    nonAIDeployments: t.nonAIDeployments,
    aiSuccessRate: t.aiDeployments > 0 ? (t.aiSuccess / t.aiDeployments) * 100 : 0,
    nonAISuccessRate: t.nonAIDeployments > 0 ? (t.nonAISuccess / t.nonAIDeployments) * 100 : 0,
  }));
}
