/**
 * Gemini CLI Logs Handler
 *
 * Processes Gemini CLI specific log events.
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
import {
  parseToolCallAttributes,
  parseEditStrategyAttributes,
  parseEditCorrectionAttributes,
} from "./parser";
import type {
  OtlpExportLogsServiceRequest,
  OtlpLogRecord,
  MetricProcessingResult,
} from "./types";
import type { GeminiLogEventName } from "./index";

/**
 * Process Gemini CLI logs
 *
 * @param userId - The authenticated user ID
 * @param body - The OTLP logs request body
 * @param requestId - Request ID for logging
 * @returns Processing result with counts
 */
export async function processGeminiLogs(
  userId: string,
  body: OtlpExportLogsServiceRequest,
  requestId: string
): Promise<MetricProcessingResult> {
  let processed = 0;
  let rejected = 0;

  for (const resourceLogs of body.resourceLogs ?? []) {
    for (const scopeLogs of resourceLogs.scopeLogs ?? []) {
      for (const logRecord of scopeLogs.logRecords ?? []) {
        const eventName = getLogBody(logRecord) as GeminiLogEventName;
        const timestamp = nanoToDate(logRecord.timeUnixNano);
        const dateString = getDateString(timestamp);

        try {
          switch (eventName) {
            case "gemini_cli.tool_call": {
              await handleToolCall(logRecord, userId, timestamp, dateString);
              processed++;
              break;
            }

            case "gemini_cli.edit_strategy": {
              await handleEditStrategy(logRecord, userId, timestamp, dateString);
              processed++;
              break;
            }

            case "gemini_cli.edit_correction": {
              await handleEditCorrection(logRecord, userId, timestamp, dateString);
              processed++;
              break;
            }

            case "gemini_cli.api_request": {
              // Track API requests (could extract token info if available)
              processed++;
              break;
            }

            case "gemini_cli.api_error": {
              const attrs = attributesToObject(logRecord.attributes);
              console.warn(
                `[${requestId}] Gemini CLI API error:`,
                attrs.error_message ?? attrs.message ?? attrs.error
              );
              processed++;
              break;
            }

            case "gemini_cli.config":
            case "gemini_cli.user_prompt":
            case "gemini_cli.tool_output_truncated":
            case "gemini_cli.file_operation":
            case "gemini_cli.api_response":
            case "gemini_cli.slash_command":
            case "gemini_cli.model_routing":
            case "gemini_cli.agent.start":
            case "gemini_cli.agent.finish":
            case "gen_ai.client.inference.operation.details":
              // Track but no specific handling needed
              processed++;
              break;

            default:
              // Unknown event - skip but count as processed
              processed++;
              break;
          }
        } catch (error) {
          console.error(
            `[${requestId}] Error processing Gemini log ${eventName}:`,
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
 * Handle gemini_cli.tool_call log event
 */
async function handleToolCall(
  logRecord: OtlpLogRecord,
  userId: string,
  timestamp: Date,
  dateString: string
): Promise<void> {
  const attrs = parseToolCallAttributes(logRecord);

  if (!attrs.tool_name) {
    return;
  }

  // Insert into toolCalls table
  await db.insert(schema.toolCalls).values({
    id: uuidv4(),
    userId,
    timestamp,
    toolName: attrs.tool_name,
    tool: "gemini",
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
 * Handle gemini_cli.edit_strategy log event
 */
async function handleEditStrategy(
  logRecord: OtlpLogRecord,
  userId: string,
  timestamp: Date,
  dateString: string
): Promise<void> {
  const attrs = parseEditStrategyAttributes(logRecord);

  // Edit strategy events are treated as "auto_applied" decisions
  await db.insert(schema.codeEditDecisions).values({
    id: uuidv4(),
    userId,
    timestamp,
    decision: "auto_applied",
    tool: "gemini",
    editType: attrs.strategy,
    filePath: attrs.file_path,
    linesAffected: attrs.lines_affected,
  });

  await upsertDailyAggregate(userId, dateString, {
    editDecisions: 1,
    autoAppliedEdits: 1,
  });
}

/**
 * Handle gemini_cli.edit_correction log event
 */
async function handleEditCorrection(
  logRecord: OtlpLogRecord,
  userId: string,
  timestamp: Date,
  dateString: string
): Promise<void> {
  const attrs = parseEditCorrectionAttributes(logRecord);

  // Track corrections as modified edits that were fixed
  await db.insert(schema.codeEditDecisions).values({
    id: uuidv4(),
    userId,
    timestamp,
    decision: "modified",
    tool: "gemini",
    filePath: attrs.original_file,
    linesAffected: attrs.lines_corrected,
    wasCorrection: true,
    correctionReason: attrs.correction_reason,
  });

  await upsertDailyAggregate(userId, dateString, {
    editDecisions: 1,
    modifiedEdits: 1,
    editCorrections: 1,
  });
}
