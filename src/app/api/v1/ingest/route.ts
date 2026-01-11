import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { eq, and, sql } from "drizzle-orm";
import { createHash } from "crypto";

// Helper to get today's date in YYYY-MM-DD format
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

// Upsert daily aggregate - creates or updates the daily aggregate for a user
async function upsertDailyAggregate(
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

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// Authenticate via API key and return userId
async function authenticateRequest(request: NextRequest, requestUserId?: string): Promise<string | null> {
  // Check for API key in header
  const apiKey = request.headers.get("X-API-Key");

  if (apiKey) {
    const keyHash = hashKey(apiKey);
    const keyRecord = await db.query.apiKeys.findFirst({
      where: and(
        eq(schema.apiKeys.keyHash, keyHash),
        eq(schema.apiKeys.isActive, true)
      ),
    });

    if (keyRecord) {
      // Update last used timestamp
      await db
        .update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, keyRecord.id));

      return keyRecord.userId;
    }
  }

  // Fall back to userId in request body
  if (requestUserId) {
    return requestUserId;
  }

  // Default to first user (for testing)
  const defaultUser = await db.query.users.findFirst();
  return defaultUser?.id ?? null;
}

// Event type schemas
const sessionStartSchema = z.object({
  tool: z.enum(["claude_code", "kiro", "codex", "copilot", "cursor", "other"]),
  model: z.string().optional(),
  projectName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sessionEndSchema = z.object({
  sessionId: z.string(),
  durationMinutes: z.number().optional(),
});

const tokenUsageSchema = z.object({
  sessionId: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  model: z.string().optional(),
});

const codeChangeSchema = z.object({
  sessionId: z.string().optional(),
  linesAdded: z.number().int().nonnegative(),
  linesModified: z.number().int().nonnegative(),
  linesDeleted: z.number().int().nonnegative(),
  filesChanged: z.number().int().nonnegative(),
  language: z.string().optional(),
  languages: z.array(z.string()).optional(),
  repository: z.string().optional(),
  branch: z.string().optional(),
});

const commitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  repository: z.string(),
  branch: z.string().optional(),
  linesAdded: z.number().int().optional(),
  linesDeleted: z.number().int().optional(),
  filesChanged: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

const prActivitySchema = z.object({
  prNumber: z.number().int(),
  repository: z.string(),
  title: z.string().optional(),
  action: z.enum(["created", "reviewed", "merged", "closed", "commented"]),
  aiAssisted: z.boolean().optional(),
  sessionId: z.string().optional(),
});

// Main request schema
const ingestSchema = z.object({
  apiKey: z.string().optional(),
  userId: z.string().optional(),
  event: z.enum([
    "session_start",
    "session_end",
    "token_usage",
    "code_change",
    "commit",
    "pr_activity",
  ]),
  timestamp: z.string().datetime().optional(),
  data: z.record(z.string(), z.unknown()),
});

// Get token pricing from cost config
async function getTokenPricing() {
  const config = await db.query.costConfig.findFirst({
    where: eq(schema.costConfig.isActive, true),
  });

  return {
    claudeInputPrice: config?.claudeInputPrice ?? 3.0,
    claudeOutputPrice: config?.claudeOutputPrice ?? 15.0,
    gpt4InputPrice: config?.gpt4InputPrice ?? 10.0,
    gpt4OutputPrice: config?.gpt4OutputPrice ?? 30.0,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ingestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { event, data, timestamp, userId: requestUserId } = parsed.data;
    const eventTime = timestamp ? new Date(timestamp) : new Date();

    // Authenticate via API key or fall back to userId in request
    const userId = await authenticateRequest(request, requestUserId);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Provide X-API-Key header or userId." },
        { status: 401 }
      );
    }

    let resultId: string | undefined;

    switch (event) {
      case "session_start": {
        const sessionData = sessionStartSchema.parse(data);
        const sessionId = uuidv4();
        await db.insert(schema.sessions).values({
          id: sessionId,
          userId,
          tool: sessionData.tool,
          model: sessionData.model,
          startedAt: eventTime,
          status: "active",
          projectName: sessionData.projectName,
          metadata: sessionData.metadata,
        });

        // Update daily aggregate with new session
        await upsertDailyAggregate(userId, getDateString(eventTime), {
          sessions: 1,
        });

        resultId = sessionId;
        break;
      }

      case "session_end": {
        const endData = sessionEndSchema.parse(data);
        const session = await db.query.sessions.findFirst({
          where: eq(schema.sessions.id, endData.sessionId),
        });

        if (session) {
          const duration = endData.durationMinutes ??
            Math.round((eventTime.getTime() - new Date(session.startedAt).getTime()) / 60000);

          await db
            .update(schema.sessions)
            .set({
              endedAt: eventTime,
              durationMinutes: duration,
              status: "completed",
            })
            .where(eq(schema.sessions.id, endData.sessionId));

          // Update daily aggregate with session duration
          await upsertDailyAggregate(session.userId, getDateString(session.startedAt), {
            minutes: duration,
          });
        }
        resultId = endData.sessionId;
        break;
      }

      case "token_usage": {
        const tokenData = tokenUsageSchema.parse(data);
        const pricing = await getTokenPricing();

        // Determine pricing based on model
        const isGpt = tokenData.model?.toLowerCase().includes("gpt");
        const inputPrice = isGpt ? pricing.gpt4InputPrice : pricing.claudeInputPrice;
        const outputPrice = isGpt ? pricing.gpt4OutputPrice : pricing.claudeOutputPrice;

        const inputCost = (tokenData.inputTokens / 1000000) * inputPrice;
        const outputCost = (tokenData.outputTokens / 1000000) * outputPrice;
        const totalCost = inputCost + outputCost;

        // Get session to determine tool
        const session = await db.query.sessions.findFirst({
          where: eq(schema.sessions.id, tokenData.sessionId),
        });

        const usageId = uuidv4();
        await db.insert(schema.tokenUsage).values({
          id: usageId,
          sessionId: tokenData.sessionId,
          userId,
          timestamp: eventTime,
          inputTokens: tokenData.inputTokens,
          outputTokens: tokenData.outputTokens,
          totalTokens: tokenData.inputTokens + tokenData.outputTokens,
          inputCostUsd: inputCost,
          outputCostUsd: outputCost,
          totalCostUsd: totalCost,
          tool: session?.tool ?? "claude_code",
          model: tokenData.model,
        });

        // Update daily aggregate with token usage
        await upsertDailyAggregate(userId, getDateString(eventTime), {
          inputTokens: tokenData.inputTokens,
          outputTokens: tokenData.outputTokens,
          tokenCost: totalCost,
        });

        resultId = usageId;
        break;
      }

      case "code_change": {
        const codeData = codeChangeSchema.parse(data);
        const metricId = uuidv4();
        await db.insert(schema.codeMetrics).values({
          id: metricId,
          sessionId: codeData.sessionId,
          userId,
          timestamp: eventTime,
          linesAdded: codeData.linesAdded,
          linesModified: codeData.linesModified,
          linesDeleted: codeData.linesDeleted,
          filesChanged: codeData.filesChanged,
          language: codeData.language,
          languages: codeData.languages,
          repository: codeData.repository,
          branch: codeData.branch,
        });

        // Update daily aggregate with code metrics
        await upsertDailyAggregate(userId, getDateString(eventTime), {
          linesAdded: codeData.linesAdded,
          linesModified: codeData.linesModified,
          linesDeleted: codeData.linesDeleted,
          filesChanged: codeData.filesChanged,
        });

        resultId = metricId;
        break;
      }

      case "commit": {
        const commitData = commitSchema.parse(data);

        // Classify commit type based on message
        const message = commitData.message.toLowerCase();
        let workType: "feature" | "bug_fix" | "refactor" | "docs" | "test" | "chore" | "other" = "other";
        let confidence = 0.5;

        if (message.includes("feat") || message.includes("add") || message.includes("implement")) {
          workType = "feature";
          confidence = 0.8;
        } else if (message.includes("fix") || message.includes("bug") || message.includes("patch")) {
          workType = "bug_fix";
          confidence = 0.85;
        } else if (message.includes("refactor") || message.includes("clean") || message.includes("restructure")) {
          workType = "refactor";
          confidence = 0.75;
        } else if (message.includes("doc") || message.includes("readme")) {
          workType = "docs";
          confidence = 0.9;
        } else if (message.includes("test") || message.includes("spec")) {
          workType = "test";
          confidence = 0.85;
        } else if (message.includes("chore") || message.includes("deps") || message.includes("config")) {
          workType = "chore";
          confidence = 0.7;
        }

        const workItemId = uuidv4();
        await db.insert(schema.workItems).values({
          id: workItemId,
          sessionId: commitData.sessionId,
          userId,
          timestamp: eventTime,
          type: workType,
          source: "commit",
          sourceId: commitData.sha,
          title: commitData.message.split("\n")[0].substring(0, 100),
          description: commitData.message,
          aiClassified: true,
          confidence,
        });

        // Update daily aggregate with work item type and code metrics
        const linesAdded = commitData.linesAdded ?? 0;
        const linesDeleted = commitData.linesDeleted ?? 0;
        const filesChanged = commitData.filesChanged?.length ?? 0;

        await upsertDailyAggregate(userId, getDateString(eventTime), {
          features: workType === "feature" ? 1 : 0,
          bugs: workType === "bug_fix" ? 1 : 0,
          refactors: workType === "refactor" ? 1 : 0,
          linesAdded,
          linesDeleted,
          filesChanged,
          // Estimate hours saved based on work type
          hoursSaved: workType === "feature" ? 2 : workType === "bug_fix" ? 1.5 : workType === "refactor" ? 3 : 0.5,
          value: (workType === "feature" ? 2 : workType === "bug_fix" ? 1.5 : workType === "refactor" ? 3 : 0.5) * 100,
        });

        // Also add code metrics if provided
        if (commitData.linesAdded !== undefined || commitData.linesDeleted !== undefined) {
          await db.insert(schema.codeMetrics).values({
            id: uuidv4(),
            sessionId: commitData.sessionId,
            userId,
            timestamp: eventTime,
            linesAdded,
            linesModified: 0,
            linesDeleted,
            filesChanged,
            repository: commitData.repository,
            branch: commitData.branch,
          });
        }
        resultId = workItemId;
        break;
      }

      case "pr_activity": {
        const prData = prActivitySchema.parse(data);
        const activityId = uuidv4();
        await db.insert(schema.prActivity).values({
          id: activityId,
          userId,
          timestamp: eventTime,
          prNumber: prData.prNumber,
          repository: prData.repository,
          title: prData.title,
          action: prData.action,
          aiAssisted: prData.aiAssisted ?? false,
          sessionId: prData.sessionId,
        });

        // Update daily aggregate with PR activity
        await upsertDailyAggregate(userId, getDateString(eventTime), {
          prsCreated: prData.action === "created" ? 1 : 0,
          prsReviewed: prData.action === "reviewed" ? 1 : 0,
          prsMerged: prData.action === "merged" ? 1 : 0,
        });

        resultId = activityId;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      id: resultId,
      event,
      timestamp: eventTime.toISOString(),
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "ingest",
    events: ["session_start", "session_end", "token_usage", "code_change", "commit", "pr_activity"],
  });
}
