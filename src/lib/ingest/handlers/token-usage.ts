/**
 * Token Usage Handler
 *
 * Handles token_usage events for tracking API consumption.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import { tokenUsageSchema, type HandlerContext, type HandlerResult } from "../types";
import {
  findOrCreateSessionByExternalId,
  getMostRecentSession,
  getModelPricing,
  calculateCosts,
} from "../utils";

/**
 * Handle token_usage event
 */
export async function handleTokenUsage(
  ctx: HandlerContext,
  data: unknown
): Promise<HandlerResult> {
  const tokenData = tokenUsageSchema.parse(data);
  const warnings: string[] = [];

  // Resolve session ID
  let resolvedSessionId: string | null = null;
  let sessionTool: string = tokenData.tool ?? "claude_code";

  if (tokenData.sessionId) {
    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.id, tokenData.sessionId),
    });
    if (session) {
      resolvedSessionId = session.id;
      sessionTool = session.tool;
    } else {
      warnings.push(
        `Session ${tokenData.sessionId} not found - recording without session`
      );
    }
  } else if (tokenData.externalSessionId) {
    resolvedSessionId = await findOrCreateSessionByExternalId(
      tokenData.externalSessionId,
      ctx.userId,
      (tokenData.tool ?? "claude_code") as
        | "claude_code"
        | "kiro"
        | "codex"
        | "copilot"
        | "cursor"
        | "gemini"
        | "other",
      tokenData.model,
      tokenData.projectName
    );
    warnings.push(
      `Auto-resolved external session ${tokenData.externalSessionId} to ${resolvedSessionId}`
    );
  } else {
    resolvedSessionId = await getMostRecentSession(ctx.userId, tokenData.tool);
    if (!resolvedSessionId) {
      warnings.push(
        "No active session found - recording token usage without session association"
      );
    }
  }

  const pricing = await getModelPricing(tokenData.model);
  const costs = calculateCosts(
    {
      inputTokens: tokenData.inputTokens,
      outputTokens: tokenData.outputTokens,
      thinkingTokens: tokenData.thinkingTokens,
      cacheReadTokens: tokenData.cacheReadTokens,
      cacheWriteTokens: tokenData.cacheWriteTokens,
    },
    pricing
  );

  const usageId = uuidv4();
  await db.insert(schema.tokenUsage).values({
    id: usageId,
    sessionId: resolvedSessionId,
    userId: ctx.userId,
    timestamp: ctx.eventTime,
    inputTokens: tokenData.inputTokens,
    outputTokens: tokenData.outputTokens,
    thinkingTokens: tokenData.thinkingTokens ?? 0,
    cacheReadTokens: tokenData.cacheReadTokens ?? 0,
    cacheWriteTokens: tokenData.cacheWriteTokens ?? 0,
    toolUseCount: tokenData.toolUseCount ?? 0,
    totalTokens:
      tokenData.inputTokens +
      tokenData.outputTokens +
      (tokenData.thinkingTokens ?? 0),
    inputCostUsd: costs.inputCost,
    outputCostUsd: costs.outputCost,
    thinkingCostUsd: costs.thinkingCost,
    cacheReadCostUsd: costs.cacheReadCost,
    cacheWriteCostUsd: costs.cacheWriteCost,
    totalCostUsd: costs.totalCost,
    tool: sessionTool,
    model: tokenData.model,
  });

  await upsertDailyAggregate(ctx.userId, getDateString(ctx.eventTime), {
    inputTokens: tokenData.inputTokens,
    outputTokens: tokenData.outputTokens,
    tokenCost: costs.totalCost,
  });

  return { id: usageId, warnings: warnings.length > 0 ? warnings : undefined };
}
