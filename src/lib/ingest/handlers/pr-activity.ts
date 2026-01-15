/**
 * PR Activity Handler
 *
 * Handles pr_activity events for tracking pull request actions.
 */

import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import { prActivitySchema, type HandlerContext, type HandlerResult } from "../types";

/**
 * Handle pr_activity event
 */
export async function handlePrActivity(
  ctx: HandlerContext,
  data: unknown
): Promise<HandlerResult> {
  const prData = prActivitySchema.parse(data);

  const activityId = uuidv4();
  await db.insert(schema.prActivity).values({
    id: activityId,
    userId: ctx.userId,
    timestamp: ctx.eventTime,
    prNumber: prData.prNumber,
    repository: prData.repository,
    title: prData.title,
    action: prData.action,
    aiAssisted: prData.aiAssisted ?? false,
    sessionId: prData.sessionId,
  });

  await upsertDailyAggregate(ctx.userId, getDateString(ctx.eventTime), {
    prsCreated: prData.action === "created" ? 1 : 0,
    prsReviewed: prData.action === "reviewed" ? 1 : 0,
    prsMerged: prData.action === "merged" ? 1 : 0,
  });

  return { id: activityId };
}
