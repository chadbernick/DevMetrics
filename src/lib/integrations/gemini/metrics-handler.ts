/**
 * Gemini CLI Metrics Handler
 *
 * Processes Gemini CLI specific metrics.
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
 * Process Gemini CLI metrics
 *
 * @param userId - The authenticated user ID
 * @param body - The OTLP metrics request body
 * @param requestId - Request ID for logging
 * @returns Processing result with counts
 */
export async function processGeminiMetrics(
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
            `[${requestId}] Error processing Gemini metric ${metricName}:`,
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
    // Handle special case: lines changed needs detailed tracking
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
 * Handle a Gemini CLI metric and return aggregate updates
 */
function handleMetric(
  metricName: string,
  value: number,
  attributes: OtlpKeyValue[] | undefined,
  requestId: string
): DailyAggregateUpdate | null {
  // Session count
  if (metricName === "gemini_cli.session.count") {
    return { sessions: value };
  }

  // Token usage
  if (
    metricName === "gemini_cli.token.usage" ||
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

  // API request count
  if (
    metricName === "gemini_cli.api.request.count" ||
    metricName === "gemini.api_request.count"
  ) {
    // Track as sessions (each API request is a conversation turn)
    return { sessions: value };
  }

  // Tool call count
  if (
    metricName === "gemini_cli.tool.call.count" ||
    metricName === "gemini.tool_call.count"
  ) {
    return { toolCalls: value };
  }

  // Lines changed
  if (metricName === "gemini_cli.lines.changed") {
    return { linesAdded: value };
  }

  // Agent run count
  if (
    metricName === "gemini_cli.agent.run.count" ||
    metricName === "gemini.agent_run.count"
  ) {
    return { sessions: value };
  }

  // Agent duration (in milliseconds, convert to minutes)
  if (
    metricName === "gemini_cli.agent.duration" ||
    metricName === "gemini.agent_run.duration"
  ) {
    return { minutes: Math.round(value / 60000) };
  }

  // Operation duration (in seconds, convert to minutes)
  if (metricName === "gen_ai.client.operation.duration") {
    return { minutes: Math.round(value / 60) };
  }

  // File operation count
  if (
    metricName === "gemini_cli.file.operation.count" ||
    metricName === "gemini.file_operation.count"
  ) {
    return { filesChanged: value };
  }

  // Agent turns
  if (metricName === "gemini_cli.agent.turns") {
    // Track as tool calls (each turn is an interaction)
    return { toolCalls: value };
  }

  // API request latency - ignore for aggregates
  if (
    metricName === "gemini_cli.api.request.latency" ||
    metricName === "gemini.api_request.latency" ||
    metricName === "gemini_cli.tool.call.latency" ||
    metricName === "gemini.tool_call.latency"
  ) {
    return null;
  }

  // Unknown metric - log for debugging
  console.log(`[${requestId}] Unhandled Gemini metric: ${metricName}`);
  return null;
}
