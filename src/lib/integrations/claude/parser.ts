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

  // Claude Code sends "cost_usd" per official docs, but also support legacy "cost"
  const costValue = attrs.cost_usd ?? attrs.cost;

  return {
    model: typeof attrs.model === "string" ? attrs.model : undefined,
    cost: typeof costValue === "number" ? costValue : undefined,
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

  // Claude Code sends success as string "true"/"false" per official docs
  let success: boolean | undefined;
  if (typeof attrs.success === "boolean") {
    success = attrs.success;
  } else if (typeof attrs.success === "string") {
    success = attrs.success === "true";
  }

  return {
    tool_name:
      typeof attrs.tool_name === "string" ? attrs.tool_name : undefined,
    success,
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
 * Normalize token type values to our internal format.
 * Claude Code sends camelCase ("cacheRead", "cacheCreation") per official docs,
 * but we also support snake_case ("cache_read", "cache_creation").
 */
function normalizeTokenType(type: string): TokenUsageType | null {
  switch (type) {
    case "input":
      return "input";
    case "output":
      return "output";
    case "cache_read":
    case "cacheRead":
      return "cache_read";
    case "cache_creation":
    case "cacheCreation":
      return "cache_creation";
    default:
      return null;
  }
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
    const normalized = normalizeTokenType(genAiType);
    if (normalized) return normalized;
  }

  // Fall back to simple "type" attribute
  const type = getStringAttr(attributes, "type");
  if (type) {
    const normalized = normalizeTokenType(type);
    if (normalized) return normalized;
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
