import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, sql } from "drizzle-orm";
import type {
  OtlpExportLogsServiceRequest,
  OtlpExportResponse,
  ClaudeCodeLogEventName,
} from "@/lib/otlp/types";
import {
  attributesToObject,
  nanoToDate,
  getDateString,
  getLogBody,
  parseApiRequestAttributes,
  parseToolResultAttributes,
} from "@/lib/otlp/parser";

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

  const existing = await db.query.dailyAggregates.findFirst({
    where: eq(schema.dailyAggregates.id, aggregateId),
  });

  if (existing) {
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

// NOTE: Default user fallback removed for security
// All OTLP requests must include a valid user parameter

// Get model pricing
async function getModelPricing(modelName?: string) {
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

// Calculate costs
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
    totalCost:
      inputCost + outputCost + thinkingCost + cacheReadCost + cacheWriteCost,
  };
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);

  try {
    // Parse request body
    const contentType = request.headers.get("Content-Type") ?? "";

    if (
      !contentType.includes("application/json") &&
      !contentType.includes("application/x-protobuf")
    ) {
      console.warn(`[${requestId}] Unsupported Content-Type: ${contentType}`);
    }

    let body: OtlpExportLogsServiceRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: "Invalid JSON body",
          },
        } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    // Get user from query param or default
    const url = new URL(request.url);
    const userNameParam = url.searchParams.get("user");
    let userId: string | null = null;

    if (userNameParam) {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.name, userNameParam),
      });
      if (user) {
        userId = user.id;
      } else {
        return NextResponse.json(
          {
            partialSuccess: {
              rejectedLogRecords: -1,
              errorMessage: `User '${userNameParam}' not found`,
            },
          } satisfies OtlpExportResponse,
          { status: 401 }
        );
      }
    }

    // Require user parameter - no anonymous logs
    if (!userId) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: "Authentication required. Include ?user=<username> parameter in OTLP endpoint URL",
          },
        } satisfies OtlpExportResponse,
        { status: 401 }
      );
    }

    let rejectedLogRecords = 0;
    let processedLogRecords = 0;

    // Process each resource logs
    for (const resourceLogs of body.resourceLogs ?? []) {
      const resourceAttrs = attributesToObject(
        resourceLogs.resource?.attributes
      );

      // Process each scope logs
      for (const scopeLogs of resourceLogs.scopeLogs ?? []) {
        // Process each log record
        for (const logRecord of scopeLogs.logRecords ?? []) {
          const eventName = getLogBody(logRecord) as ClaudeCodeLogEventName;
          const timestamp = nanoToDate(logRecord.timeUnixNano);
          const dateString = getDateString(timestamp);

          try {
            switch (eventName) {
              case "claude_code.api_request": {
                const attrs = parseApiRequestAttributes(logRecord);

                // Skip if no token data
                if (!attrs.input_tokens && !attrs.output_tokens) {
                  processedLogRecords++;
                  break;
                }

                // Get pricing and calculate costs
                const pricing = await getModelPricing(attrs.model);

                // If cost is provided directly, use it; otherwise calculate
                let totalCost = attrs.cost;
                let inputCost = 0;
                let outputCost = 0;
                let cacheReadCost = 0;
                let cacheWriteCost = 0;

                if (totalCost === undefined) {
                  const costs = calculateCosts(
                    {
                      inputTokens: attrs.input_tokens ?? 0,
                      outputTokens: attrs.output_tokens ?? 0,
                      cacheReadTokens: attrs.cache_read_tokens,
                      cacheWriteTokens: attrs.cache_creation_tokens,
                    },
                    pricing
                  );
                  totalCost = costs.totalCost;
                  inputCost = costs.inputCost;
                  outputCost = costs.outputCost;
                  cacheReadCost = costs.cacheReadCost;
                  cacheWriteCost = costs.cacheWriteCost;
                }

                // Insert into token usage
                await db.insert(schema.tokenUsage).values({
                  id: uuidv4(),
                  userId,
                  timestamp,
                  inputTokens: attrs.input_tokens ?? 0,
                  outputTokens: attrs.output_tokens ?? 0,
                  cacheReadTokens: attrs.cache_read_tokens ?? 0,
                  cacheWriteTokens: attrs.cache_creation_tokens ?? 0,
                  totalTokens:
                    (attrs.input_tokens ?? 0) + (attrs.output_tokens ?? 0),
                  inputCostUsd: inputCost,
                  outputCostUsd: outputCost,
                  cacheReadCostUsd: cacheReadCost,
                  cacheWriteCostUsd: cacheWriteCost,
                  totalCostUsd: totalCost,
                  tool: "claude_code",
                  model: attrs.model,
                });

                // Update daily aggregate
                await upsertDailyAggregate(userId, dateString, {
                  inputTokens: attrs.input_tokens ?? 0,
                  outputTokens: attrs.output_tokens ?? 0,
                  tokenCost: totalCost,
                });

                processedLogRecords++;
                break;
              }

              case "claude_code.api_error": {
                // Log errors but don't store them for now
                const attrs = attributesToObject(logRecord.attributes);
                console.warn(
                  `[${requestId}] Claude Code API error:`,
                  attrs.error_message ?? attrs.message
                );
                processedLogRecords++;
                break;
              }

              case "claude_code.tool_result": {
                const attrs = parseToolResultAttributes(logRecord);
                // Could track tool usage in the future
                processedLogRecords++;
                break;
              }

              case "claude_code.tool_decision": {
                // Track tool permission decisions
                processedLogRecords++;
                break;
              }

              case "claude_code.user_prompt": {
                // Could track prompt statistics
                processedLogRecords++;
                break;
              }

              case "claude_code.code_edit_tool.decision": {
                // Track code edit decisions
                processedLogRecords++;
                break;
              }

              default:
                // Unknown event, skip but don't reject
                processedLogRecords++;
                break;
            }
          } catch (error) {
            console.error(
              `[${requestId}] Error processing log ${eventName}:`,
              error
            );
            rejectedLogRecords++;
          }
        }
      }
    }

    console.log(
      `[${requestId}] OTLP logs: processed=${processedLogRecords}, rejected=${rejectedLogRecords}`
    );

    const response: OtlpExportResponse = {
      partialSuccess:
        rejectedLogRecords > 0
          ? {
              rejectedLogRecords,
              errorMessage: `${rejectedLogRecords} log records could not be processed`,
            }
          : {},
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] OTLP logs error:`, error);
    return NextResponse.json(
      {
        partialSuccess: {
          rejectedLogRecords: -1,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      } satisfies OtlpExportResponse,
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "otlp/v1/logs",
    version: "1.0",
    formats: ["application/json"],
    supportedEvents: [
      "claude_code.api_request",
      "claude_code.api_error",
      "claude_code.tool_result",
      "claude_code.tool_decision",
      "claude_code.user_prompt",
      "claude_code.code_edit_tool.decision",
    ],
  });
}
