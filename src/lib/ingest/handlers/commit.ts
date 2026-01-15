/**
 * Commit Handler
 *
 * Handles commit events for tracking code commits.
 */

import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import { commitSchema, type HandlerContext, type HandlerResult } from "../types";

type WorkType = "feature" | "bug_fix" | "refactor" | "docs" | "test" | "chore" | "other";

interface CommitClassification {
  type: WorkType;
  confidence: number;
  hoursSaved: number;
  valuePerHour: number;
}

/**
 * Classify commit type based on message
 */
function classifyCommitMessage(message: string): CommitClassification {
  const msg = message.toLowerCase();

  if (
    msg.includes("feat") ||
    msg.includes("add") ||
    msg.includes("implement")
  ) {
    return { type: "feature", confidence: 0.8, hoursSaved: 2, valuePerHour: 100 };
  }

  if (
    msg.includes("fix") ||
    msg.includes("bug") ||
    msg.includes("patch")
  ) {
    return { type: "bug_fix", confidence: 0.85, hoursSaved: 1.5, valuePerHour: 100 };
  }

  if (
    msg.includes("refactor") ||
    msg.includes("clean") ||
    msg.includes("restructure")
  ) {
    return { type: "refactor", confidence: 0.75, hoursSaved: 3, valuePerHour: 100 };
  }

  if (msg.includes("doc") || msg.includes("readme")) {
    return { type: "docs", confidence: 0.9, hoursSaved: 0.5, valuePerHour: 100 };
  }

  if (msg.includes("test") || msg.includes("spec")) {
    return { type: "test", confidence: 0.85, hoursSaved: 1, valuePerHour: 100 };
  }

  if (
    msg.includes("chore") ||
    msg.includes("deps") ||
    msg.includes("config")
  ) {
    return { type: "chore", confidence: 0.7, hoursSaved: 0.5, valuePerHour: 100 };
  }

  return { type: "other", confidence: 0.5, hoursSaved: 0.5, valuePerHour: 100 };
}

/**
 * Handle commit event
 */
export async function handleCommit(
  ctx: HandlerContext,
  data: unknown
): Promise<HandlerResult> {
  const commitData = commitSchema.parse(data);
  const classification = classifyCommitMessage(commitData.message);

  const workItemId = uuidv4();
  await db.insert(schema.workItems).values({
    id: workItemId,
    sessionId: commitData.sessionId,
    userId: ctx.userId,
    timestamp: ctx.eventTime,
    type: classification.type,
    source: "commit",
    sourceId: commitData.sha,
    title: commitData.message.split("\n")[0].substring(0, 100),
    description: commitData.message,
    aiClassified: true,
    confidence: classification.confidence,
  });

  const linesAdded = commitData.linesAdded ?? 0;
  const linesDeleted = commitData.linesDeleted ?? 0;
  const filesChanged = commitData.filesChanged?.length ?? 0;

  await upsertDailyAggregate(ctx.userId, getDateString(ctx.eventTime), {
    features: classification.type === "feature" ? 1 : 0,
    bugs: classification.type === "bug_fix" ? 1 : 0,
    refactors: classification.type === "refactor" ? 1 : 0,
    linesAdded,
    linesDeleted,
    filesChanged,
    gitLinesAdded: linesAdded,
    gitLinesDeleted: linesDeleted,
    hoursSaved: classification.hoursSaved,
    value: classification.hoursSaved * classification.valuePerHour,
  });

  // Also add code metrics if provided
  if (commitData.linesAdded !== undefined || commitData.linesDeleted !== undefined) {
    await db.insert(schema.codeMetrics).values({
      id: uuidv4(),
      sessionId: commitData.sessionId,
      userId: ctx.userId,
      timestamp: ctx.eventTime,
      linesAdded,
      linesModified: 0,
      linesDeleted,
      filesChanged,
      repository: commitData.repository,
      branch: commitData.branch,
    });
  }

  return { id: workItemId };
}
