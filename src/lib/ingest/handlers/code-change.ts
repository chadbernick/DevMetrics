/**
 * Code Change Handler
 *
 * Handles code_change events for tracking code modifications.
 */

import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import {
  getCostConfig,
  calculateHoursSaved,
  calculateValueUsd,
} from "@/lib/roi/cost-config";
import { codeChangeSchema, type HandlerContext, type HandlerResult } from "../types";
import { findOrCreateSessionByExternalId } from "../utils";

/**
 * Handle code_change event
 */
export async function handleCodeChange(
  ctx: HandlerContext,
  data: unknown
): Promise<HandlerResult> {
  const codeData = codeChangeSchema.parse(data);

  // Resolve session ID if external ID provided
  let resolvedSessionId = codeData.sessionId ?? null;
  if (!resolvedSessionId && codeData.externalSessionId) {
    resolvedSessionId = await findOrCreateSessionByExternalId(
      codeData.externalSessionId,
      ctx.userId,
      "claude_code",
      undefined,
      codeData.repository
    );
  }

  const metricId = uuidv4();
  await db.insert(schema.codeMetrics).values({
    id: metricId,
    sessionId: resolvedSessionId,
    userId: ctx.userId,
    timestamp: ctx.eventTime,
    linesAdded: codeData.linesAdded,
    linesModified: codeData.linesModified,
    linesDeleted: codeData.linesDeleted,
    filesChanged: codeData.filesChanged,
    language: codeData.language,
    languages: codeData.languages,
    repository: codeData.repository,
    branch: codeData.branch,
  });

  // Calculate hours saved from lines of code produced
  const totalLines = codeData.linesAdded + codeData.linesModified;
  const costConfig = await getCostConfig();
  const hoursSaved = calculateHoursSaved(costConfig, totalLines);
  const valueSaved = calculateValueUsd(costConfig, hoursSaved);

  await upsertDailyAggregate(ctx.userId, getDateString(ctx.eventTime), {
    linesAdded: codeData.linesAdded,
    linesModified: codeData.linesModified,
    linesDeleted: codeData.linesDeleted,
    aiLinesAdded: codeData.linesAdded,
    aiLinesDeleted: codeData.linesDeleted,
    filesChanged: codeData.filesChanged,
    hoursSaved,
    value: valueSaved,
  });

  return { id: metricId };
}
