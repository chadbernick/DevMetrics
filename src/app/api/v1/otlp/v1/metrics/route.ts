import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, sql } from "drizzle-orm";
import type {
  OtlpExportMetricsServiceRequest,
  OtlpExportResponse,
  ClaudeCodeMetricName,
} from "@/lib/otlp/types";
import {
  attributesToObject,
  extractDataPointValue,
  nanoToDate,
  getDateString,
  getStringAttr,
  getTokenUsageType,
} from "@/lib/otlp/parser";

// Helper to get today's date in YYYY-MM-DD format
function getDateStringFromDate(date: Date = new Date()): string {
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

// Get default user for development mode
async function getDefaultUser(): Promise<string | null> {
  const user = await db.query.users.findFirst();
  return user?.id ?? null;
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);

  try {
    // Parse request body
    const contentType = request.headers.get("Content-Type") ?? "";

    // Only support JSON for now
    if (
      !contentType.includes("application/json") &&
      !contentType.includes("application/x-protobuf")
    ) {
      console.warn(
        `[${requestId}] Unsupported Content-Type: ${contentType}`
      );
    }

    let body: OtlpExportMetricsServiceRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
            errorMessage: "Invalid JSON body",
          },
        } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    // Get user (dev mode: use first user)
    const userId = await getDefaultUser();
    if (!userId) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
            errorMessage: "No user found. Run seed script first.",
          },
        } satisfies OtlpExportResponse,
        { status: 500 }
      );
    }

    let rejectedDataPoints = 0;
    let processedDataPoints = 0;

    // Process each resource metrics
    for (const resourceMetrics of body.resourceMetrics ?? []) {
      const resourceAttrs = attributesToObject(
        resourceMetrics.resource?.attributes
      );

      // Process each scope metrics
      for (const scopeMetrics of resourceMetrics.scopeMetrics ?? []) {
        // Process each metric
        for (const metric of scopeMetrics.metrics ?? []) {
          const metricName = metric.name as ClaudeCodeMetricName;

          try {
            // Handle Sum metrics (most Claude Code metrics are Sums)
            if (metric.sum?.dataPoints) {
              for (const dataPoint of metric.sum.dataPoints) {
                const value = extractDataPointValue(dataPoint);
                const timestamp = nanoToDate(dataPoint.timeUnixNano);
                const dateString = getDateString(timestamp);
                const dpAttrs = attributesToObject(dataPoint.attributes);

                switch (metricName) {
                  case "claude_code.token.usage": {
                    const tokenType = getTokenUsageType(dataPoint.attributes);
                    if (tokenType === "input") {
                      await upsertDailyAggregate(userId, dateString, {
                        inputTokens: value,
                      });
                    } else if (tokenType === "output") {
                      await upsertDailyAggregate(userId, dateString, {
                        outputTokens: value,
                      });
                    }
                    // cache_read and cache_creation tracked via logs (api_request)
                    processedDataPoints++;
                    break;
                  }

                  case "claude_code.cost.usage": {
                    await upsertDailyAggregate(userId, dateString, {
                      tokenCost: value,
                    });
                    processedDataPoints++;
                    break;
                  }

                  case "claude_code.lines_of_code.count": {
                    // Insert into code metrics
                    await db.insert(schema.codeMetrics).values({
                      id: uuidv4(),
                      userId,
                      timestamp,
                      linesAdded: value,
                      linesModified: 0,
                      linesDeleted: 0,
                      filesChanged: 0,
                    });

                    await upsertDailyAggregate(userId, dateString, {
                      linesAdded: value,
                    });
                    processedDataPoints++;
                    break;
                  }

                  case "claude_code.session.count": {
                    await upsertDailyAggregate(userId, dateString, {
                      sessions: value,
                    });
                    processedDataPoints++;
                    break;
                  }

                  case "claude_code.active_time.total": {
                    // Value is in seconds, convert to minutes
                    const minutes = Math.round(value / 60);
                    await upsertDailyAggregate(userId, dateString, {
                      minutes,
                    });
                    processedDataPoints++;
                    break;
                  }

                  case "claude_code.commit.count": {
                    // Track commits (could create work items)
                    processedDataPoints++;
                    break;
                  }

                  case "claude_code.pull_request.count": {
                    await upsertDailyAggregate(userId, dateString, {
                      prsCreated: value,
                    });
                    processedDataPoints++;
                    break;
                  }

                  case "claude_code.tool.usage": {
                    // Track general tool usage
                    // Could store in a separate table for detailed analytics
                    processedDataPoints++;
                    break;
                  }

                  default:
                    // Unknown metric, log and process
                    console.log(
                      `[${requestId}] Unknown metric received: ${metricName}`
                    );
                    processedDataPoints++;
                    break;
                }
              }
            }

            // Handle Gauge metrics
            if (metric.gauge?.dataPoints) {
              for (const dataPoint of metric.gauge.dataPoints) {
                // Process gauge data points similarly
                processedDataPoints++;
              }
            }
          } catch (error) {
            console.error(
              `[${requestId}] Error processing metric ${metricName}:`,
              error
            );
            rejectedDataPoints++;
          }
        }
      }
    }

    console.log(
      `[${requestId}] OTLP metrics: processed=${processedDataPoints}, rejected=${rejectedDataPoints}`
    );

    const response: OtlpExportResponse = {
      partialSuccess:
        rejectedDataPoints > 0
          ? {
              rejectedDataPoints,
              errorMessage: `${rejectedDataPoints} data points could not be processed`,
            }
          : {},
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] OTLP metrics error:`, error);
    return NextResponse.json(
      {
        partialSuccess: {
          rejectedDataPoints: -1,
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
    endpoint: "otlp/v1/metrics",
    version: "1.0",
    formats: ["application/json"],
    supportedMetrics: [
      "claude_code.session.count",
      "claude_code.token.usage",
      "claude_code.cost.usage",
      "claude_code.lines_of_code.count",
      "claude_code.active_time.total",
      "claude_code.commit.count",
      "claude_code.pull_request.count",
      "claude_code.code_edit_tool.decision",
      "claude_code.tool.usage",
    ],
  });
}
