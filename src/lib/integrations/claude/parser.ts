/**
 * Claude Code Integration Parser
 *
 * Parsing utilities specific to Claude Code telemetry.
 * Uses shared primitives but adds Claude-specific logic.
 */

import {
  attributesToObject,
  getStringAttr,
  type OtlpKeyValue,
} from "../shared/otlp-primitives";
import type {
  OtlpLogRecord,
  ClaudeApiRequestAttributes,
  ClaudeToolResultAttributes,
  ClaudeEditDecisionAttributes,
  TokenUsageType,
} from "./types";

/**
 * Parse Claude Code API request attributes from log record
 */
export function parseApiRequestAttributes(
  logRecord: OtlpLogRecord
): ClaudeApiRequestAttributes {
  const attrs = attributesToObject(logRecord.attributes);

  return {
    model: typeof attrs.model === "string" ? attrs.model : undefined,
    cost: typeof attrs.cost === "number" ? attrs.cost : undefined,
    duration_ms:
      typeof attrs.duration_ms === "number" ? attrs.duration_ms : undefined,
    input_tokens:
      typeof attrs.input_tokens === "number" ? attrs.input_tokens : undefined,
    output_tokens:
      typeof attrs.output_tokens === "number" ? attrs.output_tokens : undefined,
    cache_read_tokens:
      typeof attrs.cache_read_tokens === "number"
        ? attrs.cache_read_tokens
        : undefined,
    cache_creation_tokens:
      typeof attrs.cache_creation_tokens === "number"
        ? attrs.cache_creation_tokens
        : undefined,
  };
}

/**
 * Parse Claude Code tool result attributes from log record
 */
export function parseToolResultAttributes(
  logRecord: OtlpLogRecord
): ClaudeToolResultAttributes {
  const attrs = attributesToObject(logRecord.attributes);

  return {
    tool_name:
      typeof attrs.tool_name === "string" ? attrs.tool_name : undefined,
    success: typeof attrs.success === "boolean" ? attrs.success : undefined,
    duration_ms:
      typeof attrs.duration_ms === "number" ? attrs.duration_ms : undefined,
    error: typeof attrs.error === "string" ? attrs.error : undefined,
  };
}

/**
 * Parse Claude Code edit decision attributes from log record
 */
export function parseEditDecisionAttributes(
  logRecord: OtlpLogRecord
): ClaudeEditDecisionAttributes {
  const attrs = attributesToObject(logRecord.attributes);

  const decision = attrs.decision as string | undefined;
  const validDecisions = ["accepted", "rejected", "modified", "auto_applied"];

  return {
    decision: validDecisions.includes(decision ?? "")
      ? (decision as "accepted" | "rejected" | "modified" | "auto_applied")
      : undefined,
    edit_type:
      typeof attrs.edit_type === "string" ? attrs.edit_type : undefined,
    file_path:
      typeof attrs.file_path === "string" ? attrs.file_path : undefined,
    lines_affected:
      typeof attrs.lines_affected === "number" ? attrs.lines_affected : undefined,
  };
}

/**
 * Extract token usage type from data point attributes
 */
export function getTokenUsageType(
  attributes: OtlpKeyValue[] | undefined
): TokenUsageType | null {
  // Try standard GenAI attribute first
  const genAiType = getStringAttr(attributes, "gen_ai.usage.token_type");
  if (genAiType) {
    if (
      genAiType === "input" ||
      genAiType === "output" ||
      genAiType === "cache_read" ||
      genAiType === "cache_creation"
    ) {
      return genAiType;
    }
  }

  // Fall back to simple "type" attribute
  const type = getStringAttr(attributes, "type");
  if (
    type === "input" ||
    type === "output" ||
    type === "cache_read" ||
    type === "cache_creation"
  ) {
    return type;
  }

  return null;
}

/**
 * Check if this is Claude Code telemetry based on service name
 */
export function isClaudeCodeTelemetry(
  resourceAttributes: OtlpKeyValue[] | undefined
): boolean {
  const serviceName = getStringAttr(resourceAttributes, "service.name") ?? "";
  const serviceNameLower = serviceName.toLowerCase();

  return (
    serviceNameLower.includes("claude") ||
    serviceNameLower === "claude-code" ||
    serviceNameLower === "claude_code"
  );
}

/**
 * Check if a metric name belongs to Claude Code
 */
export function isClaudeMetric(metricName: string): boolean {
  return (
    metricName.startsWith("claude_code.") ||
    metricName === "gen_ai.client.token.usage" ||
    metricName === "gen_ai.client.operation.duration"
  );
}

/**
 * Check if a log event name belongs to Claude Code
 */
export function isClaudeLogEvent(eventName: string): boolean {
  return eventName.startsWith("claude_code.");
}
