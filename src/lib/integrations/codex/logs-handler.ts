/**
 * OpenAI Codex CLI Logs Handler
 */

import { v4 as uuidv4 } from "uuid";
import { db, schema } from "@/lib/db";
import { upsertDailyAggregate, nanoToDate, getDateString, getLogBody } from "../shared";
import { parseToolResultAttributes, parseToolDecisionAttributes } from "./parser";
import type { OtlpExportLogsServiceRequest, MetricProcessingResult } from "./types";
import type { CodexLogEventName } from "./index";

export async function processCodexLogs(
  userId: string,
  body: OtlpExportLogsServiceRequest,
  requestId: string
): Promise<MetricProcessingResult> {
  let processed = 0;
  let rejected = 0;

  for (const resourceLogs of body.resourceLogs ?? []) {
    for (const scopeLogs of resourceLogs.scopeLogs ?? []) {
      for (const logRecord of scopeLogs.logRecords ?? []) {
        const eventName = getLogBody(logRecord) as CodexLogEventName;
        const timestamp = nanoToDate(logRecord.timeUnixNano);
        const dateString = getDateString(timestamp);

        try {
          switch (eventName) {
            case "codex.tool_result": {
              const attrs = parseToolResultAttributes(logRecord);
              if (attrs.tool_name) {
                await db.insert(schema.toolCalls).values({
                  id: uuidv4(),
                  userId,
                  timestamp,
                  toolName: attrs.tool_name,
                  tool: "codex",
                  success: attrs.success ?? true,
                  durationMs: attrs.duration_ms,
                  error: attrs.error,
                });
                await upsertDailyAggregate(userId, dateString, {
                  toolCalls: 1,
                  successfulToolCalls: attrs.success !== false ? 1 : 0,
                  failedToolCalls: attrs.success === false ? 1 : 0,
                });
              }
              processed++;
              break;
            }

            case "codex.tool_decision": {
              const attrs = parseToolDecisionAttributes(logRecord);
              if (attrs.decision) {
                await db.insert(schema.codeEditDecisions).values({
                  id: uuidv4(),
                  userId,
                  timestamp,
                  decision: attrs.decision,
                  tool: "codex",
                });
                await upsertDailyAggregate(userId, dateString, {
                  editDecisions: 1,
                  acceptedEdits: attrs.decision === "accepted" ? 1 : 0,
                  rejectedEdits: attrs.decision === "rejected" ? 1 : 0,
                  modifiedEdits: attrs.decision === "modified" ? 1 : 0,
                });
              }
              processed++;
              break;
            }

            default:
              processed++;
              break;
          }
        } catch (error) {
          console.error(`[${requestId}] Error processing Codex log ${eventName}:`, error);
          rejected++;
        }
      }
    }
  }

  return { processed, rejected };
}
