/**
 * Claude Code Logs Handler
 *
 * Processes Claude Code specific log events.
 * Completely isolated from other integration handlers.
 */

import { v4 as uuidv4 } from "uuid";
import { db, schema } from "@/lib/db";
import {
  upsertDailyAggregate,
  nanoToDate,
  getDateString,
  getLogBody,
  attributesToObject,
} from "../shared";
import { getModelPricing, calculateCosts } from "../shared/pricing";
import {
  parseApiRequestAttributes,
  parseToolResultAttributes,
  parseEditDecisionAttributes,
} from "./parser";
import type {
  OtlpExportLogsServiceRequest,
  MetricProcessingResult,
} from "./types";
import type { ClaudeLogEventName } from "./index";

/**
 * Process Claude Code logs
 *
 * @param userId - The authenticated user ID
 * @param body - The OTLP logs request body
 * @param requestId - Request ID for logging
 * @returns Processing result with counts
 */
export async function processClaudeLogs(
  userId: string,
  body: OtlpExportLogsServiceRequest,
  requestId: string
): Promise<MetricProcessingResult> {
  let processed = 0;
  let rejected = 0;

  for (const resourceLogs of body.resourceLogs ?? []) {
    for (const scopeLogs of resourceLogs.scopeLogs ?? []) {
      for (const logRecord of scopeLogs.logRecords ?? []) {
        const eventName = getLogBody(logRecord) as ClaudeLogEventName;
        const timestamp = nanoToDate(logRecord.timeUnixNano);
        const dateString = getDateString(timestamp);

        try {
          switch (eventName) {
            case "claude_code.api_request": {
              await handleApiRequest(
                logRecord,
                userId,
                timestamp,
                dateString,
                requestId
              );
              processed++;
              break;
            }

            case "claude_code.api_error": {
              const attrs = attributesToObject(logRecord.attributes);
              console.warn(
                `[${requestId}] Claude Code API error:`,
                attrs.error_message ?? attrs.message
              );
              processed++;
              break;
            }

            case "claude_code.tool_result": {
              await handleToolResult(
                logRecord,
                userId,
                timestamp,
                dateString
              );
              processed++;
              break;
            }

            case "claude_code.tool_decision": {
              // Track tool permission decisions (no-op for now)
              processed++;
              break;
            }

            case "claude_code.user_prompt": {
              // Could track prompt statistics (no-op for now)
              processed++;
              break;
            }

            case "claude_code.code_edit_tool.decision": {
              await handleEditDecision(
                logRecord,
                userId,
                timestamp,
                dateString
              );
              processed++;
              break;
            }

            default:
              // Unknown event - skip but count as processed
              processed++;
              break;
          }
        } catch (error) {
          console.error(
            `[${requestId}] Error processing Claude log ${eventName}:`,
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
 * Handle claude_code.api_request log event
 */
async function handleApiRequest(
  logRecord: import("./types").OtlpLogRecord,
  userId: string,
  timestamp: Date,
  dateString: string,
  requestId: string
): Promise<void> {
  const attrs = parseApiRequestAttributes(logRecord);

  // Skip if no token data
  if (!attrs.input_tokens && !attrs.output_tokens) {
    return;
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

  // Insert into token usage table
  await db.insert(schema.tokenUsage).values({
    id: uuidv4(),
    userId,
    timestamp,
    inputTokens: attrs.input_tokens ?? 0,
    outputTokens: attrs.output_tokens ?? 0,
    cacheReadTokens: attrs.cache_read_tokens ?? 0,
    cacheWriteTokens: attrs.cache_creation_tokens ?? 0,
    totalTokens: (attrs.input_tokens ?? 0) + (attrs.output_tokens ?? 0),
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
}

/**
 * Handle claude_code.tool_result log event
 */
async function handleToolResult(
  logRecord: import("./types").OtlpLogRecord,
  userId: string,
  timestamp: Date,
  dateString: string
): Promise<void> {
  const attrs = parseToolResultAttributes(logRecord);

  if (!attrs.tool_name) {
    return;
  }

  // Insert into toolCalls table
  await db.insert(schema.toolCalls).values({
    id: uuidv4(),
    userId,
    timestamp,
    toolName: attrs.tool_name,
    tool: "claude_code",
    success: attrs.success ?? true,
    durationMs: attrs.duration_ms,
    error: attrs.error,
  });

  // Update daily aggregate
  await upsertDailyAggregate(userId, dateString, {
    toolCalls: 1,
    successfulToolCalls: attrs.success !== false ? 1 : 0,
    failedToolCalls: attrs.success === false ? 1 : 0,
  });
}

/**
 * Handle claude_code.code_edit_tool.decision log event
 */
async function handleEditDecision(
  logRecord: import("./types").OtlpLogRecord,
  userId: string,
  timestamp: Date,
  dateString: string
): Promise<void> {
  const attrs = parseEditDecisionAttributes(logRecord);

  if (!attrs.decision) {
    return;
  }

  // Insert into codeEditDecisions table
  await db.insert(schema.codeEditDecisions).values({
    id: uuidv4(),
    userId,
    timestamp,
    decision: attrs.decision,
    tool: "claude_code",
    editType: attrs.edit_type,
    filePath: attrs.file_path,
    linesAffected: attrs.lines_affected,
  });

  // Update daily aggregate
  await upsertDailyAggregate(userId, dateString, {
    editDecisions: 1,
    acceptedEdits: attrs.decision === "accepted" ? 1 : 0,
    rejectedEdits: attrs.decision === "rejected" ? 1 : 0,
    modifiedEdits: attrs.decision === "modified" ? 1 : 0,
    autoAppliedEdits: attrs.decision === "auto_applied" ? 1 : 0,
  });
}
