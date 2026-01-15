import { db, schema } from "@/lib/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Helper to get date in YYYY-MM-DD format using local timezone
export function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function upsertDailyAggregate(
  userId: string,
  date: string,
  updates: {
    sessions?: number;
    minutes?: number;
    inputTokens?: number;
    outputTokens?: number;
    tokenCost?: number;
    linesAdded?: number;
    linesModified?: number;
    linesDeleted?: number;
    filesChanged?: number;
    gitLinesAdded?: number;
    gitLinesDeleted?: number;
    aiLinesAdded?: number;
    aiLinesDeleted?: number;
    features?: number;
    bugs?: number;
    refactors?: number;
    prsCreated?: number;
    prsReviewed?: number;
    prsMerged?: number;
    hoursSaved?: number;
    value?: number;
  }
) {
  const aggregateId = `${userId}-${date}`;

  // Check if aggregate exists
  const existing = await db.query.dailyAggregates.findFirst({
    where: eq(schema.dailyAggregates.id, aggregateId),
  });

  if (existing) {
    // Update existing aggregate by adding to current values
    await db
      .update(schema.dailyAggregates)
      .set({
        totalSessions: sql`${schema.dailyAggregates.totalSessions} + ${updates.sessions ?? 0}`,
        totalMinutes: sql`${schema.dailyAggregates.totalMinutes} + ${updates.minutes ?? 0}`,
        totalInputTokens: sql`${schema.dailyAggregates.totalInputTokens} + ${updates.inputTokens ?? 0}`,
        totalOutputTokens: sql`${schema.dailyAggregates.totalOutputTokens} + ${updates.outputTokens ?? 0}`,
        totalTokenCostUsd: sql`${schema.dailyAggregates.totalTokenCostUsd} + ${updates.tokenCost ?? 0}`,
        totalLinesAdded: sql`${schema.dailyAggregates.totalLinesAdded} + ${updates.linesAdded ?? 0}`,
        totalLinesModified: sql`${schema.dailyAggregates.totalLinesModified} + ${updates.linesModified ?? 0}`,
        totalLinesDeleted: sql`${schema.dailyAggregates.totalLinesDeleted} + ${updates.linesDeleted ?? 0}`,
        totalFilesChanged: sql`${schema.dailyAggregates.totalFilesChanged} + ${updates.filesChanged ?? 0}`,
        gitLinesAdded: sql`${schema.dailyAggregates.gitLinesAdded} + ${updates.gitLinesAdded ?? 0}`,
        gitLinesDeleted: sql`${schema.dailyAggregates.gitLinesDeleted} + ${updates.gitLinesDeleted ?? 0}`,
        aiLinesAdded: sql`${schema.dailyAggregates.aiLinesAdded} + ${updates.aiLinesAdded ?? 0}`,
        aiLinesDeleted: sql`${schema.dailyAggregates.aiLinesDeleted} + ${updates.aiLinesDeleted ?? 0}`,
        featuresCompleted: sql`${schema.dailyAggregates.featuresCompleted} + ${updates.features ?? 0}`,
        bugsFixed: sql`${schema.dailyAggregates.bugsFixed} + ${updates.bugs ?? 0}`,
        refactorsCompleted: sql`${schema.dailyAggregates.refactorsCompleted} + ${updates.refactors ?? 0}`,
        prsCreated: sql`${schema.dailyAggregates.prsCreated} + ${updates.prsCreated ?? 0}`,
        prsReviewed: sql`${schema.dailyAggregates.prsReviewed} + ${updates.prsReviewed ?? 0}`,
        prsMerged: sql`${schema.dailyAggregates.prsMerged} + ${updates.prsMerged ?? 0}`,
        estimatedHoursSaved: sql`${schema.dailyAggregates.estimatedHoursSaved} + ${updates.hoursSaved ?? 0}`,
        estimatedValueUsd: sql`${schema.dailyAggregates.estimatedValueUsd} + ${updates.value ?? 0}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.dailyAggregates.id, aggregateId));
  } else {
    // Create new aggregate
    await db.insert(schema.dailyAggregates).values({
      id: aggregateId,
      userId,
      date,
      totalSessions: updates.sessions ?? 0,
      totalMinutes: updates.minutes ?? 0,
      totalInputTokens: updates.inputTokens ?? 0,
      totalOutputTokens: updates.outputTokens ?? 0,
      totalTokenCostUsd: updates.tokenCost ?? 0,
      totalLinesAdded: updates.linesAdded ?? 0,
      totalLinesModified: updates.linesModified ?? 0,
      totalLinesDeleted: updates.linesDeleted ?? 0,
      totalFilesChanged: updates.filesChanged ?? 0,
      gitLinesAdded: updates.gitLinesAdded ?? 0,
      gitLinesDeleted: updates.gitLinesDeleted ?? 0,
      aiLinesAdded: updates.aiLinesAdded ?? 0,
      aiLinesDeleted: updates.aiLinesDeleted ?? 0,
      featuresCompleted: updates.features ?? 0,
      bugsFixed: updates.bugs ?? 0,
      refactorsCompleted: updates.refactors ?? 0,
      prsCreated: updates.prsCreated ?? 0,
      prsReviewed: updates.prsReviewed ?? 0,
      prsMerged: updates.prsMerged ?? 0,
      estimatedHoursSaved: updates.hoursSaved ?? 0,
      estimatedValueUsd: updates.value ?? 0,
    });
  }
}

export async function findOrCreateSessionByExternalId(
  externalSessionId: string,
  userId: string,
  tool: "claude_code" | "kiro" | "codex" | "copilot" | "cursor" | "other",
  model?: string,
  projectName?: string
): Promise<string> {
  // Helper to find existing session by external ID
  const findExistingSession = async (): Promise<string | null> => {
    const existingSessions = await db.query.sessions.findMany({
      where: and(
        eq(schema.sessions.userId, userId),
        eq(schema.sessions.tool, tool),
        eq(schema.sessions.status, "active")
      ),
      orderBy: [desc(schema.sessions.startedAt)],
      limit: 20,
    });

    for (const session of existingSessions) {
      const metadata = session.metadata as Record<string, unknown> | null;
      if (metadata?.externalSessionId === externalSessionId) {
        return session.id;
      }
    }
    return null;
  };

  const existingId = await findExistingSession();
  if (existingId) {
    return existingId;
  }

  const sessionId = uuidv4();

  try {
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId,
      tool,
      model,
      startedAt: new Date(),
      status: "active",
      projectName,
      metadata: { externalSessionId, autoCreated: true },
    });

    await upsertDailyAggregate(userId, getDateString(), {
      sessions: 1,
    });

    return sessionId;
  } catch (error) {
    const concurrentId = await findExistingSession();
    if (concurrentId) {
      return concurrentId;
    }
    throw error;
  }
}

export async function getMostRecentSession(
  userId: string,
  tool?: string
): Promise<string | null> {
  const conditions = [
    eq(schema.sessions.userId, userId),
    eq(schema.sessions.status, "active"),
  ];

  if (tool) {
    conditions.push(
      eq(
        schema.sessions.tool,
        tool as "claude_code" | "kiro" | "codex" | "copilot" | "cursor" | "other"
      )
    );
  }

  const session = await db.query.sessions.findFirst({
    where: and(...conditions),
    orderBy: [desc(schema.sessions.startedAt)],
  });

  return session?.id ?? null;
}

export async function getModelPricing(modelName?: string) {
  const defaultPricing = {
    inputPrice: 3.0,
    outputPrice: 15.0,
    thinkingPrice: 15.0,
    cacheWritePrice: 3.75,
    cacheReadPrice: 0.3,
  };

  if (!modelName) return defaultPricing;

  const pricingRecords = await db.query.modelPricing.findMany({
    where: eq(schema.modelPricing.isActive, true),
  });

  for (const pricing of pricingRecords) {
    try {
      const regex = new RegExp(pricing.modelPattern, "i");
      if (regex.test(modelName)) {
        return {
          inputPrice: pricing.inputPrice,
          outputPrice: pricing.outputPrice,
          thinkingPrice: pricing.thinkingPrice,
          cacheWritePrice: pricing.cacheWritePrice,
          cacheReadPrice: pricing.cacheReadPrice,
        };
      }
    } catch {
      continue;
    }
  }

  return defaultPricing;
}

export function calculateCosts(
  tokens: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  },
  pricing: {
    inputPrice: number;
    outputPrice: number;
    thinkingPrice: number;
    cacheReadPrice: number;
    cacheWritePrice: number;
  }
) {
  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.outputPrice;
  const thinkingCost =
    ((tokens.thinkingTokens ?? 0) / 1_000_000) * pricing.thinkingPrice;
  const cacheReadCost =
    ((tokens.cacheReadTokens ?? 0) / 1_000_000) * pricing.cacheReadPrice;
  const cacheWriteCost =
    ((tokens.cacheWriteTokens ?? 0) / 1_000_000) * pricing.cacheWritePrice;

  return {
    inputCost,
    outputCost,
    thinkingCost,
    cacheReadCost,
    cacheWriteCost,
    totalCost: inputCost + outputCost + thinkingCost + cacheReadCost + cacheWriteCost,
  };
}
