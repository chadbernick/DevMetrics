/**
 * Session Event Handlers
 *
 * Handles session_start and session_end events.
 */

import { db, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import {
  sessionStartSchema,
  sessionEndSchema,
  type HandlerContext,
  type HandlerResult,
} from "../types";
import { getModelPricing, calculateCosts } from "../utils";

/**
 * Handle session_start event
 */
export async function handleSessionStart(
  ctx: HandlerContext,
  data: unknown
): Promise<HandlerResult> {
  const sessionData = sessionStartSchema.parse(data);
  const sessionId = uuidv4();

  const metadata: Record<string, unknown> = {
    ...(sessionData.metadata ?? {}),
  };

  if (sessionData.externalSessionId) {
    metadata.externalSessionId = sessionData.externalSessionId;
  }

  await db.insert(schema.sessions).values({
    id: sessionId,
    userId: ctx.userId,
    tool: sessionData.tool,
    model: sessionData.model,
    startedAt: ctx.eventTime,
    status: "active",
    projectName: sessionData.projectName,
    metadata,
  });

  await upsertDailyAggregate(ctx.userId, getDateString(ctx.eventTime), {
    sessions: 1,
  });

  return { id: sessionId };
}

/**
 * Handle session_end event
 */
export async function handleSessionEnd(
  ctx: HandlerContext,
  data: unknown
): Promise<HandlerResult> {
  const endData = sessionEndSchema.parse(data);
  const warnings: string[] = [];

  // Find session by ID or external ID
  let session = null;
  if (endData.sessionId) {
    session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.id, endData.sessionId),
    });
  }

  if (!session && endData.externalSessionId) {
    const sessions = await db.query.sessions.findMany({
      where: and(
        eq(schema.sessions.userId, ctx.userId),
        eq(schema.sessions.status, "active")
      ),
      orderBy: [desc(schema.sessions.startedAt)],
      limit: 20,
    });

    for (const s of sessions) {
      const metadata = s.metadata as Record<string, unknown> | null;
      if (metadata?.externalSessionId === endData.externalSessionId) {
        session = s;
        break;
      }
    }
  }

  if (!session) {
    warnings.push("Session not found - no session to end");
    return {
      id: endData.sessionId ?? endData.externalSessionId ?? "unknown",
      warnings,
    };
  }

  const duration =
    endData.durationMinutes ??
    Math.round(
      (ctx.eventTime.getTime() - new Date(session.startedAt).getTime()) / 60000
    );

  await db
    .update(schema.sessions)
    .set({
      endedAt: ctx.eventTime,
      durationMinutes: duration,
      status: "completed",
    })
    .where(eq(schema.sessions.id, session.id));

  await upsertDailyAggregate(session.userId, getDateString(session.startedAt), {
    minutes: duration,
  });

  // If token totals provided, record them as final usage
  if (endData.totalInputTokens || endData.totalOutputTokens) {
    const pricing = await getModelPricing(
      endData.model ?? session.model ?? undefined
    );
    const costs = calculateCosts(
      {
        inputTokens: endData.totalInputTokens ?? 0,
        outputTokens: endData.totalOutputTokens ?? 0,
        cacheReadTokens: endData.totalCacheReadTokens,
        cacheWriteTokens: endData.totalCacheWriteTokens,
      },
      pricing
    );

    const usageId = uuidv4();
    await db.insert(schema.tokenUsage).values({
      id: usageId,
      sessionId: session.id,
      userId: ctx.userId,
      timestamp: ctx.eventTime,
      inputTokens: endData.totalInputTokens ?? 0,
      outputTokens: endData.totalOutputTokens ?? 0,
      cacheReadTokens: endData.totalCacheReadTokens ?? 0,
      cacheWriteTokens: endData.totalCacheWriteTokens ?? 0,
      totalTokens:
        (endData.totalInputTokens ?? 0) + (endData.totalOutputTokens ?? 0),
      inputCostUsd: costs.inputCost,
      outputCostUsd: costs.outputCost,
      cacheReadCostUsd: costs.cacheReadCost,
      cacheWriteCostUsd: costs.cacheWriteCost,
      totalCostUsd: costs.totalCost,
      tool: session.tool,
      model: endData.model ?? session.model,
    });

    await upsertDailyAggregate(ctx.userId, getDateString(ctx.eventTime), {
      inputTokens: endData.totalInputTokens ?? 0,
      outputTokens: endData.totalOutputTokens ?? 0,
      tokenCost: costs.totalCost,
    });
  }

  return { id: session.id, warnings: warnings.length > 0 ? warnings : undefined };
}
