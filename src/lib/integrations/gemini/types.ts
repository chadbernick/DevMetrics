/**
 * Gemini CLI Integration Types
 *
 * All type definitions specific to Gemini CLI telemetry.
 * These types are isolated from other integrations.
 */

// ============================================
// OTLP REQUEST TYPES (JSON only for Gemini)
// ============================================

export interface OtlpResource {
  attributes?: OtlpKeyValue[];
  droppedAttributesCount?: number;
}

export interface OtlpKeyValue {
  key: string;
  value: OtlpAnyValue;
}

export interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string | number;
  doubleValue?: number;
  arrayValue?: { values: OtlpAnyValue[] };
  kvlistValue?: { values: OtlpKeyValue[] };
  bytesValue?: string;
}

export interface OtlpInstrumentationScope {
  name?: string;
  version?: string;
  attributes?: OtlpKeyValue[];
}

// ============================================
// METRICS TYPES
// ============================================

export interface OtlpExportMetricsServiceRequest {
  resourceMetrics?: OtlpResourceMetrics[];
}

export interface OtlpResourceMetrics {
  resource?: OtlpResource;
  scopeMetrics?: OtlpScopeMetrics[];
  schemaUrl?: string;
}

export interface OtlpScopeMetrics {
  scope?: OtlpInstrumentationScope;
  metrics?: OtlpMetric[];
  schemaUrl?: string;
}

export interface OtlpMetric {
  name: string;
  description?: string;
  unit?: string;
  gauge?: OtlpGauge;
  sum?: OtlpSum;
  histogram?: OtlpHistogram;
}

export interface OtlpGauge {
  dataPoints?: OtlpNumberDataPoint[];
}

export interface OtlpSum {
  dataPoints?: OtlpNumberDataPoint[];
  aggregationTemporality?: number;
  isMonotonic?: boolean;
}

export interface OtlpHistogram {
  dataPoints?: OtlpHistogramDataPoint[];
  aggregationTemporality?: number;
}

export interface OtlpNumberDataPoint {
  attributes?: OtlpKeyValue[];
  startTimeUnixNano?: string;
  timeUnixNano?: string;
  asDouble?: number;
  asInt?: string | number;
}

export interface OtlpHistogramDataPoint {
  attributes?: OtlpKeyValue[];
  startTimeUnixNano?: string;
  timeUnixNano?: string;
  count?: string | number;
  sum?: number;
  bucketCounts?: (string | number)[];
  explicitBounds?: number[];
  min?: number;
  max?: number;
}

// ============================================
// LOGS TYPES
// ============================================

export interface OtlpExportLogsServiceRequest {
  resourceLogs?: OtlpResourceLogs[];
}

export interface OtlpResourceLogs {
  resource?: OtlpResource;
  scopeLogs?: OtlpScopeLogs[];
  schemaUrl?: string;
}

export interface OtlpScopeLogs {
  scope?: OtlpInstrumentationScope;
  logRecords?: OtlpLogRecord[];
  schemaUrl?: string;
}

export interface OtlpLogRecord {
  timeUnixNano?: string;
  observedTimeUnixNano?: string;
  severityNumber?: number;
  severityText?: string;
  body?: OtlpAnyValue;
  attributes?: OtlpKeyValue[];
  droppedAttributesCount?: number;
  flags?: number;
  traceId?: string;
  spanId?: string;
}

// ============================================
// RESPONSE TYPE
// ============================================

export interface OtlpExportResponse {
  partialSuccess?: {
    rejectedDataPoints?: number;
    rejectedLogRecords?: number;
    errorMessage?: string;
  };
}

// ============================================
// GEMINI CLI SPECIFIC ATTRIBUTE TYPES
// ============================================

/**
 * Parsed tool call attributes from gemini_cli.tool_call log
 */
export interface GeminiToolCallAttributes {
  tool_name?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
}

/**
 * Parsed edit strategy attributes from gemini_cli.edit_strategy log
 */
export interface GeminiEditStrategyAttributes {
  strategy?: string;
  file_path?: string;
  lines_affected?: number;
}

/**
 * Parsed edit correction attributes from gemini_cli.edit_correction log
 */
export interface GeminiEditCorrectionAttributes {
  original_file?: string;
  correction_reason?: string;
  lines_corrected?: number;
}

/**
 * Token usage type attribute
 */
export type TokenUsageType =
  | "input"
  | "output"
  | "cache_read"
  | "cache_creation";

// ============================================
// METRIC PROCESSING RESULT
// ============================================

export interface MetricProcessingResult {
  processed: number;
  rejected: number;
  error?: string;
}
