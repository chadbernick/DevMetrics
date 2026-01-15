/**
 * Gemini CLI Integration Parser
 *
 * Parsing utilities specific to Gemini CLI telemetry.
 * Uses shared primitives but adds Gemini-specific logic.
 */

import {
  attributesToObject,
  getStringAttr,
  type OtlpKeyValue,
} from "../shared/otlp-primitives";
import type {
  OtlpLogRecord,
  OtlpExportMetricsServiceRequest,
  OtlpExportLogsServiceRequest,
  GeminiToolCallAttributes,
  GeminiEditStrategyAttributes,
  GeminiEditCorrectionAttributes,
  TokenUsageType,
} from "./types";

/**
 * Parse Gemini CLI tool call attributes from log record
 */
export function parseToolCallAttributes(
  logRecord: OtlpLogRecord
): GeminiToolCallAttributes {
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
 * Parse Gemini CLI edit strategy attributes from log record
 */
export function parseEditStrategyAttributes(
  logRecord: OtlpLogRecord
): GeminiEditStrategyAttributes {
  const attrs = attributesToObject(logRecord.attributes);

  return {
    strategy:
      typeof attrs.strategy === "string" ? attrs.strategy : undefined,
    file_path:
      typeof attrs.file_path === "string" ? attrs.file_path : undefined,
    lines_affected:
      typeof attrs.lines_affected === "number" ? attrs.lines_affected : undefined,
  };
}

/**
 * Parse Gemini CLI edit correction attributes from log record
 */
export function parseEditCorrectionAttributes(
  logRecord: OtlpLogRecord
): GeminiEditCorrectionAttributes {
  const attrs = attributesToObject(logRecord.attributes);

  return {
    original_file:
      typeof attrs.original_file === "string" ? attrs.original_file : undefined,
    correction_reason:
      typeof attrs.correction_reason === "string"
        ? attrs.correction_reason
        : undefined,
    lines_corrected:
      typeof attrs.lines_corrected === "number" ? attrs.lines_corrected : undefined,
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
 * Check if this is Gemini CLI telemetry based on service name
 */
export function isGeminiTelemetry(
  resourceAttributes: OtlpKeyValue[] | undefined
): boolean {
  const serviceName = getStringAttr(resourceAttributes, "service.name") ?? "";
  const serviceNameLower = serviceName.toLowerCase();

  return (
    serviceNameLower.includes("gemini") ||
    serviceNameLower === "gemini-cli" ||
    serviceNameLower === "gemini_cli"
  );
}

/**
 * Check if a metric name belongs to Gemini CLI
 */
export function isGeminiMetric(metricName: string): boolean {
  return (
    metricName.startsWith("gemini_cli.") ||
    metricName.startsWith("gemini.") ||
    metricName === "gen_ai.client.token.usage" ||
    metricName === "gen_ai.client.operation.duration"
  );
}

/**
 * Check if a log event name belongs to Gemini CLI
 */
export function isGeminiLogEvent(eventName: string): boolean {
  return (
    eventName.startsWith("gemini_cli.") ||
    eventName === "gen_ai.client.inference.operation.details"
  );
}

/**
 * Parse JSON request for Gemini CLI metrics (JSON only, no protobuf)
 */
export async function parseMetricsRequest(
  request: Request
): Promise<OtlpExportMetricsServiceRequest> {
  return (await request.json()) as OtlpExportMetricsServiceRequest;
}

/**
 * Parse JSON request for Gemini CLI logs (JSON only, no protobuf)
 */
export async function parseLogsRequest(
  request: Request
): Promise<OtlpExportLogsServiceRequest> {
  return (await request.json()) as OtlpExportLogsServiceRequest;
}
