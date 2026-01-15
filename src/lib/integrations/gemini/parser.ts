/**
 * Gemini CLI Parser
 *
 * Gemini-specific OTLP parsing utilities.
 */

import type { NextRequest } from "next/server";
import type { OtlpKeyValue, OtlpLogRecord } from "@/lib/otlp/types";
import { attributesToObject, getStringAttr } from "@/lib/otlp/parser";
import type {
  OtlpExportLogsServiceRequest,
  OtlpExportMetricsServiceRequest,
} from "./types";

// ============================================
// TYPES
// ============================================

export interface GeminiToolCallAttributes {
  tool_name?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
}

export interface GeminiEditStrategyAttributes {
  strategy?: string;
  file_path?: string;
  lines_affected?: number;
}

export interface GeminiEditCorrectionAttributes {
  original_file?: string;
  correction_reason?: string;
  lines_corrected?: number;
}

export type TokenUsageType = "input" | "output" | "cache_read" | "cache_creation";

// ============================================
// PARSING FUNCTIONS
// ============================================

export function parseGeminiToolCallAttributes(
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

export function parseGeminiEditStrategyAttributes(
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

export function parseGeminiEditCorrectionAttributes(
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

// ============================================
// ALIASES (for backward compatibility)
// ============================================

export const parseToolCallAttributes = parseGeminiToolCallAttributes;
export const parseEditStrategyAttributes = parseGeminiEditStrategyAttributes;
export const parseEditCorrectionAttributes = parseGeminiEditCorrectionAttributes;

// ============================================
// REQUEST PARSING (JSON only for Gemini)
// ============================================

/**
 * Parse OTLP metrics request body (JSON only for Gemini)
 */
export async function parseMetricsRequest(
  request: NextRequest
): Promise<OtlpExportMetricsServiceRequest> {
  const body = await request.json();
  return body as OtlpExportMetricsServiceRequest;
}

/**
 * Parse OTLP logs request body (JSON only for Gemini)
 */
export async function parseLogsRequest(
  request: NextRequest
): Promise<OtlpExportLogsServiceRequest> {
  const body = await request.json();
  return body as OtlpExportLogsServiceRequest;
}