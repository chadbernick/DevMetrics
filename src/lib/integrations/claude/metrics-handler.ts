/**
 * Claude Code Metrics Handler
 *
 * Processes Claude Code specific metrics.
 * Completely isolated from other integration handlers.
 */

import { v4 as uuidv4 } from "uuid";
import { db, schema } from "@/lib/db";
import {
  upsertDailyAggregate,
  extractDataPointValue,
  nanoToDate,
  getDateString,
  attributesToObject,
  getStringAttr,
  type DailyAggregateUpdate,
} from "../shared";
import { getTokenUsageType } from "./parser";
import type {
  OtlpExportMetricsServiceRequest,
  OtlpNumberDataPoint,
  OtlpKeyValue,
  MetricProcessingResult,
} from "./types";

/**
 * Process Claude Code metrics
 *
 * @param userId - The authenticated user ID
 * @param body - The OTLP metrics request body
 * @param requestId - Request ID for logging
 * @returns Processing result with counts
 */
export async function processClaudeMetrics(
  userId: string,
  body: OtlpExportMetricsServiceRequest,
  requestId: string
): Promise<MetricProcessingResult> {
  let processed = 0;
  let rejected = 0;

  for (const resourceMetrics of body.resourceMetrics ?? []) {
    for (const scopeMetrics of resourceMetrics.scopeMetrics ?? []) {
      for (const metric of scopeMetrics.metrics ?? []) {
        const metricName = metric.name;

        try {
          // Process Sum metrics (most common for counters)
          if (metric.sum?.dataPoints) {
            for (const dataPoint of metric.sum.dataPoints) {
              await processDataPoint(
                metricName,
                dataPoint,
                userId,
                requestId
              );
              processed++;
            }
          }

          // Process Gauge metrics
          if (metric.gauge?.dataPoints) {
            for (const dataPoint of metric.gauge.dataPoints) {
              await processDataPoint(
                metricName,
                dataPoint,
                userId,
                requestId
              );
              processed++;
            }
          }

          // Process Histogram metrics (for duration/latency)
          if (metric.histogram?.dataPoints) {
            for (const dataPoint of metric.histogram.dataPoints) {
              const value = dataPoint.sum ?? Number(dataPoint.count ?? 0);
              const timestamp = nanoToDate(dataPoint.timeUnixNano);
              const dateString = getDateString(timestamp);

              const updates = handleMetric(
                metricName,
                value,
                dataPoint.attributes,
                requestId
              );
              if (updates) {
                await upsertDailyAggregate(userId, dateString, updates);
              }
              processed++;
            }
          }
        } catch (error) {
          console.error(
            `[${requestId}] Error processing Claude metric ${metricName}:`,
            error
          );
          rejected++;
        }
      }
    }
  }

  return { processed, rejected };
}

/**
 * Process a single data point
 */
async function processDataPoint(
  metricName: string,
  dataPoint: OtlpNumberDataPoint,
  userId: string,
  requestId: string
): Promise<void> {
  const value = extractDataPointValue(dataPoint);
  const timestamp = nanoToDate(dataPoint.timeUnixNano);
  const dateString = getDateString(timestamp);

  const updates = handleMetric(
    metricName,
    value,
    dataPoint.attributes,
    requestId
  );

  if (updates) {
    // Handle special case: lines of code needs detailed tracking
    if (updates.linesAdded !== undefined && updates.linesAdded > 0) {
      await db.insert(schema.codeMetrics).values({
        id: uuidv4(),
        userId,
        timestamp,
        linesAdded: updates.linesAdded,
        linesModified: updates.linesModified ?? 0,
        linesDeleted: updates.linesDeleted ?? 0,
        filesChanged: updates.filesChanged ?? 0,
      });
    }

    await upsertDailyAggregate(userId, dateString, updates);
  }
}

/**
 * Handle a Claude Code metric and return aggregate updates
 */
function handleMetric(
  metricName: string,
  value: number,
  attributes: OtlpKeyValue[] | undefined,
  requestId: string
): DailyAggregateUpdate | null {
  // Session count
  if (metricName === "claude_code.session.count") {
    return { sessions: value };
  }

  // Token usage
  if (
    metricName === "claude_code.token.usage" ||
    metricName === "gen_ai.client.token.usage"
  ) {
    const tokenType = getTokenUsageType(attributes);
    if (tokenType === "input") {
      return { inputTokens: value };
    } else if (tokenType === "output") {
      return { outputTokens: value };
    }
    return null;
  }

  // Cost usage
  if (metricName === "claude_code.cost.usage") {
    return { tokenCost: value };
  }

  // Lines of code
  if (metricName === "claude_code.lines_of_code.count") {
    const dpAttrs = attributesToObject(attributes);
    const changeType = dpAttrs.change_type as string | undefined;

    if (changeType === "added") {
      return { linesAdded: value };
    } else if (changeType === "modified") {
      return { linesModified: value };
    } else if (changeType === "deleted") {
      return { linesDeleted: value };
    }
    // Default to lines added
    return { linesAdded: value };
  }

  // Active time (in seconds, convert to minutes)
  if (
    metricName === "claude_code.active_time.total" ||
    metricName === "gen_ai.client.operation.duration"
  ) {
    return { minutes: Math.round(value / 60) };
  }

  // Commit count
  if (metricName === "claude_code.commit.count") {
    return { aiAssistedCommits: value };
  }

  // Pull request count
  if (metricName === "claude_code.pull_request.count") {
    return { prsCreated: value };
  }

  // Tool usage
  if (metricName === "claude_code.tool.usage") {
    return { toolCalls: value };
  }

  // Code edit decisions (handled more in logs, but metrics might have counts)
  if (metricName === "claude_code.code_edit_tool.decision") {
    const dpAttrs = attributesToObject(attributes);
    const decision = dpAttrs.decision as string | undefined;

    const updates: DailyAggregateUpdate = { editDecisions: value };

    if (decision === "accepted") {
      updates.acceptedEdits = value;
    } else if (decision === "rejected") {
      updates.rejectedEdits = value;
    } else if (decision === "modified") {
      updates.modifiedEdits = value;
    } else if (decision === "auto_applied") {
      updates.autoAppliedEdits = value;
    }

    return updates;
  }

  // Unknown metric - log for debugging
  console.log(`[${requestId}] Unhandled Claude metric: ${metricName}`);
  return null;
}
