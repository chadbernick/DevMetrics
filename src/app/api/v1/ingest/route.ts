import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { eq, and, sql, desc } from "drizzle-orm";
import { createHash } from "crypto";

// Error codes for client handling
const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_API_KEY: "INVALID_API_KEY",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

// Helper to get date in YYYY-MM-DD format using local timezone
function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
async function authenticateRequest(
  request: NextRequest,
  requestUserId?: string
): Promise<{ userId: string | null; error?: string }> {
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

      return { userId: keyRecord.userId };
    } else {
      return { userId: null, error: "Invalid or inactive API key" };
    }
  }

  // Fall back to userId in request body
  if (requestUserId) {
    // Verify user exists
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, requestUserId),
    });
    if (user) {
      return { userId: requestUserId };
    }
    return { userId: null, error: "User not found" };
  }

  // Authentication required - no fallback to default user
  return { userId: null, error: "Authentication required. Provide X-API-Key header or valid userId" };
}

// Find or create a session by external ID (e.g., Claude Code's session_id)
// Uses retry pattern to handle race conditions when multiple requests try to create
// sessions with the same external ID concurrently
async function findOrCreateSessionByExternalId(
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
      limit: 20, // Increased limit to reduce chance of missing sessions
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
    // If still not found, re-throw the original error
    throw error;
  }
}

// Get the most recent active session for a user
async function getMostRecentSession(
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

// Event type schemas
const sessionStartSchema = z.object({
  tool: z.enum(["claude_code", "kiro", "codex", "copilot", "cursor", "other"]),
  model: z.string().optional(),
  projectName: z.string().optional(),
  externalSessionId: z.string().optional(), // Claude Code's session_id
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sessionEndSchema = z.object({
  sessionId: z.string().optional(),
  externalSessionId: z.string().optional(), // Claude Code's session_id
  durationMinutes: z.number().optional(),
  // Token totals for the entire session (from JSONL parsing)
  totalInputTokens: z.number().int().nonnegative().optional(),
  totalOutputTokens: z.number().int().nonnegative().optional(),
  totalCacheReadTokens: z.number().int().nonnegative().optional(),
  totalCacheWriteTokens: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
});

const tokenUsageSchema = z.object({
  // Session identification - all optional, will use most recent or create if needed
  sessionId: z.string().optional(),
  externalSessionId: z.string().optional(), // Claude Code's session_id

  // Standard tokens - required
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),

  // Extended thinking tokens (Claude)
  thinkingTokens: z.number().int().nonnegative().optional(),

  // Cache tokens (prompt caching)
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),

  // Tool usage
  toolUseCount: z.number().int().nonnegative().optional(),

  // Model info
  model: z.string().optional(),
  tool: z.enum(["claude_code", "kiro", "codex", "copilot", "cursor", "other"]).optional(),

  // Project context
  projectName: z.string().optional(),
});

const codeChangeSchema = z.object({
  sessionId: z.string().optional(),
  externalSessionId: z.string().optional(),
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

// Get token pricing for a specific model from modelPricing table
async function getModelPricing(modelName?: string) {
  // Default pricing if no model specified (Sonnet 4 pricing)
  const defaultPricing = {
    inputPrice: 3.0,
    outputPrice: 15.0,
    thinkingPrice: 15.0,
    cacheWritePrice: 3.75,
    cacheReadPrice: 0.3,
  };

  if (!modelName) return defaultPricing;

  // Get all active pricing records
  const pricingRecords = await db.query.modelPricing.findMany({
    where: eq(schema.modelPricing.isActive, true),
  });

  // Find matching pricing by regex pattern
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
      // Invalid regex, skip
      continue;
    }
  }

  return defaultPricing;
}

// Calculate costs for token usage
function calculateCosts(
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

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);

  try {
    const body = await request.json();
    const parsed = ingestSchema.safeParse(body);

    if (!parsed.success) {
      console.warn(`[${requestId}] Invalid request body:`, parsed.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          code: ErrorCodes.INVALID_REQUEST,
          details: parsed.error.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    const { event, data, timestamp, userId: requestUserId } = parsed.data;
    const eventTime = timestamp ? new Date(timestamp) : new Date();

    // Authenticate via API key or fall back to userId in request
    const authResult = await authenticateRequest(request, requestUserId);
    if (!authResult.userId) {
      console.warn(`[${requestId}] Authentication failed:`, authResult.error);
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Authentication required",
          code: ErrorCodes.AUTH_REQUIRED,
          hint: "Provide X-API-Key header or valid userId",
          requestId,
        },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    let resultId: string | undefined;
    const warnings: string[] = [];

    switch (event) {
      case "session_start": {
        const sessionData = sessionStartSchema.parse(data);
        const sessionId = uuidv4();

        const metadata: Record<string, unknown> = {
          ...(sessionData.metadata ?? {}),
        };

        // Store external session ID for later lookup
        if (sessionData.externalSessionId) {
          metadata.externalSessionId = sessionData.externalSessionId;
        }

        await db.insert(schema.sessions).values({
          id: sessionId,
          userId,
          tool: sessionData.tool,
          model: sessionData.model,
          startedAt: eventTime,
          status: "active",
          projectName: sessionData.projectName,
          metadata,
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

        // Find session by ID or external ID
        let session = null;
        if (endData.sessionId) {
          session = await db.query.sessions.findFirst({
            where: eq(schema.sessions.id, endData.sessionId),
          });
        }

        if (!session && endData.externalSessionId) {
          // Search by external session ID in metadata
          const sessions = await db.query.sessions.findMany({
            where: and(
              eq(schema.sessions.userId, userId),
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

        if (session) {
          const duration =
            endData.durationMinutes ??
            Math.round(
              (eventTime.getTime() - new Date(session.startedAt).getTime()) /
                60000
            );

          await db
            .update(schema.sessions)
            .set({
              endedAt: eventTime,
              durationMinutes: duration,
              status: "completed",
            })
            .where(eq(schema.sessions.id, session.id));

          // Update daily aggregate with session duration
          await upsertDailyAggregate(
            session.userId,
            getDateString(session.startedAt),
            {
              minutes: duration,
            }
          );

          // If token totals provided, record them as final usage
          if (endData.totalInputTokens || endData.totalOutputTokens) {
            const pricing = await getModelPricing(endData.model ?? session.model ?? undefined);
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
              userId,
              timestamp: eventTime,
              inputTokens: endData.totalInputTokens ?? 0,
              outputTokens: endData.totalOutputTokens ?? 0,
              cacheReadTokens: endData.totalCacheReadTokens ?? 0,
              cacheWriteTokens: endData.totalCacheWriteTokens ?? 0,
              totalTokens:
                (endData.totalInputTokens ?? 0) +
                (endData.totalOutputTokens ?? 0),
              inputCostUsd: costs.inputCost,
              outputCostUsd: costs.outputCost,
              cacheReadCostUsd: costs.cacheReadCost,
              cacheWriteCostUsd: costs.cacheWriteCost,
              totalCostUsd: costs.totalCost,
              tool: session.tool,
              model: endData.model ?? session.model,
            });

            // Update daily aggregate with token usage
            await upsertDailyAggregate(userId, getDateString(eventTime), {
              inputTokens: endData.totalInputTokens ?? 0,
              outputTokens: endData.totalOutputTokens ?? 0,
              tokenCost: costs.totalCost,
            });
          }

          resultId = session.id;
        } else {
          warnings.push("Session not found - no session to end");
          resultId = endData.sessionId ?? endData.externalSessionId;
        }
        break;
      }

      case "token_usage": {
        const tokenData = tokenUsageSchema.parse(data);

        // Resolve session ID - try in order: explicit sessionId, externalSessionId lookup, most recent session, or null
        let resolvedSessionId: string | null = null;
        let sessionTool: string = tokenData.tool ?? "claude_code";

        if (tokenData.sessionId) {
          // Verify session exists
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
          // Look up or create session by external ID
          resolvedSessionId = await findOrCreateSessionByExternalId(
            tokenData.externalSessionId,
            userId,
            (tokenData.tool ?? "claude_code") as "claude_code" | "kiro" | "codex" | "copilot" | "cursor" | "other",
            tokenData.model,
            tokenData.projectName
          );
          warnings.push(
            `Auto-resolved external session ${tokenData.externalSessionId} to ${resolvedSessionId}`
          );
        } else {
          // Try to find most recent active session
          resolvedSessionId = await getMostRecentSession(
            userId,
            tokenData.tool
          );
          if (!resolvedSessionId) {
            warnings.push(
              "No active session found - recording token usage without session association"
            );
          }
        }

        // Get pricing for this specific model
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
          userId,
          timestamp: eventTime,
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

        // Update daily aggregate with token usage
        await upsertDailyAggregate(userId, getDateString(eventTime), {
          inputTokens: tokenData.inputTokens,
          outputTokens: tokenData.outputTokens,
          tokenCost: costs.totalCost,
        });

        resultId = usageId;
        break;
      }

      case "code_change": {
        const codeData = codeChangeSchema.parse(data);

        // Resolve session ID if external ID provided
        let resolvedSessionId = codeData.sessionId ?? null;
        if (!resolvedSessionId && codeData.externalSessionId) {
          resolvedSessionId = await findOrCreateSessionByExternalId(
            codeData.externalSessionId,
            userId,
            "claude_code",
            undefined,
            codeData.repository
          );
        }

        const metricId = uuidv4();
        await db.insert(schema.codeMetrics).values({
          id: metricId,
          sessionId: resolvedSessionId,
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

        // Calculate hours saved from lines of code produced
        // Industry average: ~25 lines of quality code per hour manually
        // AI-assisted coding uses productivity multiplier from config
        const totalLines = codeData.linesAdded + codeData.linesModified;
        const LINES_PER_HOUR_MANUAL = 25;

        // Get productivity multiplier from cost config (default to 3x)
        const costConfig = await db.query.costConfig.findFirst({
          where: eq(schema.costConfig.isActive, true),
        });
        const productivityMultiplier = costConfig?.featureMultiplier ?? 3.0;

        // Calculate time savings
        // Manual hours = lines / lines_per_hour
        // AI hours = manual_hours / multiplier
        // Hours saved = manual_hours - AI_hours = manual_hours * (1 - 1/multiplier)
        const manualHours = totalLines / LINES_PER_HOUR_MANUAL;
        const hoursSaved = manualHours * (1 - 1 / productivityMultiplier);

        // Calculate value based on average hourly rate
        const avgHourlyRate = costConfig
          ? (costConfig.juniorHourlyRate +
              costConfig.midHourlyRate +
              costConfig.seniorHourlyRate +
              costConfig.staffHourlyRate +
              costConfig.principalHourlyRate) /
            5
          : 100;
        const fullyLoadedRate = avgHourlyRate * (1 + (costConfig?.overheadPercentage ?? 30) / 100);
        const valueSaved = hoursSaved * fullyLoadedRate;

        // Update daily aggregate with code metrics AND hours saved
        await upsertDailyAggregate(userId, getDateString(eventTime), {
          linesAdded: codeData.linesAdded,
          linesModified: codeData.linesModified,
          linesDeleted: codeData.linesDeleted,
          filesChanged: codeData.filesChanged,
          hoursSaved,
          value: valueSaved,
        });

        resultId = metricId;
        break;
      }

      case "commit": {
        const commitData = commitSchema.parse(data);

        // Classify commit type based on message
        const message = commitData.message.toLowerCase();
        let workType:
          | "feature"
          | "bug_fix"
          | "refactor"
          | "docs"
          | "test"
          | "chore"
          | "other" = "other";
        let confidence = 0.5;

        if (
          message.includes("feat") ||
          message.includes("add") ||
          message.includes("implement")
        ) {
          workType = "feature";
          confidence = 0.8;
        } else if (
          message.includes("fix") ||
          message.includes("bug") ||
          message.includes("patch")
        ) {
          workType = "bug_fix";
          confidence = 0.85;
        } else if (
          message.includes("refactor") ||
          message.includes("clean") ||
          message.includes("restructure")
        ) {
          workType = "refactor";
          confidence = 0.75;
        } else if (message.includes("doc") || message.includes("readme")) {
          workType = "docs";
          confidence = 0.9;
        } else if (message.includes("test") || message.includes("spec")) {
          workType = "test";
          confidence = 0.85;
        } else if (
          message.includes("chore") ||
          message.includes("deps") ||
          message.includes("config")
        ) {
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
          hoursSaved:
            workType === "feature"
              ? 2
              : workType === "bug_fix"
                ? 1.5
                : workType === "refactor"
                  ? 3
                  : 0.5,
          value:
            (workType === "feature"
              ? 2
              : workType === "bug_fix"
                ? 1.5
                : workType === "refactor"
                  ? 3
                  : 0.5) * 100,
        });

        // Also add code metrics if provided
        if (
          commitData.linesAdded !== undefined ||
          commitData.linesDeleted !== undefined
        ) {
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

    const response: Record<string, unknown> = {
      success: true,
      id: resultId,
      event,
      timestamp: eventTime.toISOString(),
      requestId,
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isValidationError =
      error instanceof z.ZodError ||
      errorMessage.includes("Expected") ||
      errorMessage.includes("Required");
    const isForeignKeyError = errorMessage.includes("FOREIGN KEY");

    console.error(`[${requestId}] Ingest error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: isValidationError
          ? ErrorCodes.VALIDATION_ERROR
          : isForeignKeyError
            ? ErrorCodes.DATABASE_ERROR
            : ErrorCodes.UNKNOWN_ERROR,
        requestId,
        hint: isForeignKeyError
          ? "A referenced entity (session, user) does not exist"
          : undefined,
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "ingest",
    version: "2.0",
    events: [
      "session_start",
      "session_end",
      "token_usage",
      "code_change",
      "commit",
      "pr_activity",
    ],
    features: [
      "optional_session_id",
      "external_session_id_mapping",
      "auto_session_creation",
      "extended_token_tracking",
      "cache_token_support",
    ],
  });
}
