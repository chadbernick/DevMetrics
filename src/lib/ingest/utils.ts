/**
 * Ingest Utilities
 *
 * Shared utility functions used by event handlers.
 */

import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";

// ============================================
// SESSION UTILITIES
// ============================================

type ToolType = "claude_code" | "kiro" | "codex" | "copilot" | "cursor" | "gemini" | "other";

/**
 * Find or create a session by external ID (e.g., Claude Code's session_id)
 * Uses retry pattern to handle race conditions
 */
export async function findOrCreateSessionByExternalId(
  externalSessionId: string,
  userId: string,
  tool: ToolType,
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

  // First check: look for existing session
  const existingId = await findExistingSession();
  if (existingId) {
    return existingId;
  }

  // No existing session found - attempt to create a new one
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

    // Update daily aggregate with new session
    await upsertDailyAggregate(userId, getDateString(), {
      sessions: 1,
    });

    return sessionId;
  } catch (error) {
    // If insert fails (e.g., due to race condition), check if another request
    // created a session with this external ID
    const concurrentId = await findExistingSession();
    if (concurrentId) {
      return concurrentId;
    }
    throw error;
  }
}

/**
 * Get the most recent active session for a user
 */
export async function getMostRecentSession(
  userId: string,
  tool?: string
): Promise<string | null> {
  const conditions = [
    eq(schema.sessions.userId, userId),
    eq(schema.sessions.status, "active"),
  ];

  if (tool) {
    conditions.push(eq(schema.sessions.tool, tool as ToolType));
  }

  const session = await db.query.sessions.findFirst({
    where: and(...conditions),
    orderBy: [desc(schema.sessions.startedAt)],
  });

  return session?.id ?? null;
}

/**
 * Find a session by its internal ID
 */
export async function findSessionById(sessionId: string) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
  });
}

/**
 * Find a session by external ID in metadata
 */
export async function findSessionByExternalId(
  userId: string,
  externalSessionId: string
) {
  const sessions = await db.query.sessions.findMany({
    where: and(
      eq(schema.sessions.userId, userId),
      eq(schema.sessions.status, "active")
    ),
    orderBy: [desc(schema.sessions.startedAt)],
    limit: 20,
  });

  for (const session of sessions) {
    const metadata = session.metadata as Record<string, unknown> | null;
    if (metadata?.externalSessionId === externalSessionId) {
      return session;
    }
  }
  return null;
}

// ============================================
// PRICING UTILITIES
// ============================================

export interface TokenPricing {
  inputPrice: number;
  outputPrice: number;
  thinkingPrice: number;
  cacheWritePrice: number;
  cacheReadPrice: number;
}

const DEFAULT_PRICING: TokenPricing = {
  inputPrice: 3.0,
  outputPrice: 15.0,
  thinkingPrice: 15.0,
  cacheWritePrice: 3.75,
  cacheReadPrice: 0.3,
};

/**
 * Get token pricing for a specific model from modelPricing table
 */
export async function getModelPricing(modelName?: string): Promise<TokenPricing> {
  if (!modelName) return DEFAULT_PRICING;

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

  return DEFAULT_PRICING;
}

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface TokenCosts {
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  totalCost: number;
}

/**
 * Calculate costs for token usage
 */
export function calculateCosts(tokens: TokenCounts, pricing: TokenPricing): TokenCosts {
  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.outputPrice;
  const thinkingCost = ((tokens.thinkingTokens ?? 0) / 1_000_000) * pricing.thinkingPrice;
  const cacheReadCost = ((tokens.cacheReadTokens ?? 0) / 1_000_000) * pricing.cacheReadPrice;
  const cacheWriteCost = ((tokens.cacheWriteTokens ?? 0) / 1_000_000) * pricing.cacheWritePrice;

  return {
    inputCost,
    outputCost,
    thinkingCost,
    cacheReadCost,
    cacheWriteCost,
    totalCost: inputCost + outputCost + thinkingCost + cacheReadCost + cacheWriteCost,
  };
}
