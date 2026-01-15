/**
 * Daily Aggregate Upsert - Single Source of Truth
 *
 * This is the ONLY implementation of daily aggregate updates.
 * All integrations use this shared function to ensure consistency.
 */

import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

/**
 * All possible fields that can be updated in daily aggregates
 */
export interface DailyAggregateUpdate {
  // Session & time metrics
  sessions?: number;
  minutes?: number;

  // Token metrics
  inputTokens?: number;
  outputTokens?: number;
  tokenCost?: number;

  // Code metrics
  linesAdded?: number;
  linesModified?: number;
  linesDeleted?: number;
  filesChanged?: number;

  // Source Breakdown
  gitLinesAdded?: number;
  gitLinesDeleted?: number;
  aiLinesAdded?: number;
  aiLinesDeleted?: number;

  // Work classification
  features?: number;
  bugs?: number;
  refactors?: number;

  // PR metrics
  prsCreated?: number;
  prsReviewed?: number;
  prsMerged?: number;

  // ROI metrics
  hoursSaved?: number;
  value?: number;

  // Intelligence per Token metrics
  toolCalls?: number;
  successfulToolCalls?: number;
  failedToolCalls?: number;
  editDecisions?: number;
  acceptedEdits?: number;
  rejectedEdits?: number;
  modifiedEdits?: number;
  autoAppliedEdits?: number;
  editCorrections?: number;
  aiAssistedCommits?: number;
}

/**
 * Upsert daily aggregate - creates or updates the daily aggregate for a user
 *
 * @param userId - The user's UUID
 * @param date - Date string in YYYY-MM-DD format
 * @param updates - Fields to increment
 */
export async function upsertDailyAggregate(
  userId: string,
  date: string,
  updates: DailyAggregateUpdate
): Promise<void> {
  const aggregateId = `${userId}-${date}`;

  const existing = await db.query.dailyAggregates.findFirst({
    where: eq(schema.dailyAggregates.id, aggregateId),
  });

  if (existing) {
    await db
      .update(schema.dailyAggregates)
      .set({
        // Session & time
        totalSessions: sql`${schema.dailyAggregates.totalSessions} + ${updates.sessions ?? 0}`,
        totalMinutes: sql`${schema.dailyAggregates.totalMinutes} + ${updates.minutes ?? 0}`,

        // Tokens
        totalInputTokens: sql`${schema.dailyAggregates.totalInputTokens} + ${updates.inputTokens ?? 0}`,
        totalOutputTokens: sql`${schema.dailyAggregates.totalOutputTokens} + ${updates.outputTokens ?? 0}`,
        totalTokenCostUsd: sql`${schema.dailyAggregates.totalTokenCostUsd} + ${updates.tokenCost ?? 0}`,

        // Code
        totalLinesAdded: sql`${schema.dailyAggregates.totalLinesAdded} + ${updates.linesAdded ?? 0}`,
        totalLinesModified: sql`${schema.dailyAggregates.totalLinesModified} + ${updates.linesModified ?? 0}`,
        totalLinesDeleted: sql`${schema.dailyAggregates.totalLinesDeleted} + ${updates.linesDeleted ?? 0}`,
        totalFilesChanged: sql`${schema.dailyAggregates.totalFilesChanged} + ${updates.filesChanged ?? 0}`,

        // Source Breakdown
        gitLinesAdded: sql`${schema.dailyAggregates.gitLinesAdded} + ${updates.gitLinesAdded ?? 0}`,
        gitLinesDeleted: sql`${schema.dailyAggregates.gitLinesDeleted} + ${updates.gitLinesDeleted ?? 0}`,
        aiLinesAdded: sql`${schema.dailyAggregates.aiLinesAdded} + ${updates.aiLinesAdded ?? 0}`,
        aiLinesDeleted: sql`${schema.dailyAggregates.aiLinesDeleted} + ${updates.aiLinesDeleted ?? 0}`,

        // Work classification
        featuresCompleted: sql`${schema.dailyAggregates.featuresCompleted} + ${updates.features ?? 0}`,
        bugsFixed: sql`${schema.dailyAggregates.bugsFixed} + ${updates.bugs ?? 0}`,
        refactorsCompleted: sql`${schema.dailyAggregates.refactorsCompleted} + ${updates.refactors ?? 0}`,

        // PRs
        prsCreated: sql`${schema.dailyAggregates.prsCreated} + ${updates.prsCreated ?? 0}`,
        prsReviewed: sql`${schema.dailyAggregates.prsReviewed} + ${updates.prsReviewed ?? 0}`,
        prsMerged: sql`${schema.dailyAggregates.prsMerged} + ${updates.prsMerged ?? 0}`,

        // ROI
        estimatedHoursSaved: sql`${schema.dailyAggregates.estimatedHoursSaved} + ${updates.hoursSaved ?? 0}`,
        estimatedValueUsd: sql`${schema.dailyAggregates.estimatedValueUsd} + ${updates.value ?? 0}`,

        // Intelligence per Token
        totalToolCalls: sql`${schema.dailyAggregates.totalToolCalls} + ${updates.toolCalls ?? 0}`,
        successfulToolCalls: sql`${schema.dailyAggregates.successfulToolCalls} + ${updates.successfulToolCalls ?? 0}`,
        failedToolCalls: sql`${schema.dailyAggregates.failedToolCalls} + ${updates.failedToolCalls ?? 0}`,
        totalEditDecisions: sql`${schema.dailyAggregates.totalEditDecisions} + ${updates.editDecisions ?? 0}`,
        acceptedEdits: sql`${schema.dailyAggregates.acceptedEdits} + ${updates.acceptedEdits ?? 0}`,
        rejectedEdits: sql`${schema.dailyAggregates.rejectedEdits} + ${updates.rejectedEdits ?? 0}`,
        modifiedEdits: sql`${schema.dailyAggregates.modifiedEdits} + ${updates.modifiedEdits ?? 0}`,
        autoAppliedEdits: sql`${schema.dailyAggregates.autoAppliedEdits} + ${updates.autoAppliedEdits ?? 0}`,
        editCorrections: sql`${schema.dailyAggregates.editCorrections} + ${updates.editCorrections ?? 0}`,
        aiAssistedCommits: sql`${schema.dailyAggregates.aiAssistedCommits} + ${updates.aiAssistedCommits ?? 0}`,

        updatedAt: new Date(),
      })
      .where(eq(schema.dailyAggregates.id, aggregateId));
  } else {
    await db.insert(schema.dailyAggregates).values({
      id: aggregateId,
      userId,
      date,

      // Session & time
      totalSessions: updates.sessions ?? 0,
      totalMinutes: updates.minutes ?? 0,

      // Tokens
      totalInputTokens: updates.inputTokens ?? 0,
      totalOutputTokens: updates.outputTokens ?? 0,
      totalTokenCostUsd: updates.tokenCost ?? 0,

      // Code
      totalLinesAdded: updates.linesAdded ?? 0,
      totalLinesModified: updates.linesModified ?? 0,
      totalLinesDeleted: updates.linesDeleted ?? 0,
      totalFilesChanged: updates.filesChanged ?? 0,

      // Source Breakdown
      gitLinesAdded: updates.gitLinesAdded ?? 0,
      gitLinesDeleted: updates.gitLinesDeleted ?? 0,
      aiLinesAdded: updates.aiLinesAdded ?? 0,
      aiLinesDeleted: updates.aiLinesDeleted ?? 0,

      // Work classification
      featuresCompleted: updates.features ?? 0,
      bugsFixed: updates.bugs ?? 0,
      refactorsCompleted: updates.refactors ?? 0,

      // PRs
      prsCreated: updates.prsCreated ?? 0,
      prsReviewed: updates.prsReviewed ?? 0,
      prsMerged: updates.prsMerged ?? 0,

      // ROI
      estimatedHoursSaved: updates.hoursSaved ?? 0,
      estimatedValueUsd: updates.value ?? 0,

      // Intelligence per Token
      totalToolCalls: updates.toolCalls ?? 0,
      successfulToolCalls: updates.successfulToolCalls ?? 0,
      failedToolCalls: updates.failedToolCalls ?? 0,
      totalEditDecisions: updates.editDecisions ?? 0,
      acceptedEdits: updates.acceptedEdits ?? 0,
      rejectedEdits: updates.rejectedEdits ?? 0,
      modifiedEdits: updates.modifiedEdits ?? 0,
      autoAppliedEdits: updates.autoAppliedEdits ?? 0,
      editCorrections: updates.editCorrections ?? 0,
      aiAssistedCommits: updates.aiAssistedCommits ?? 0,
    });
  }
}
