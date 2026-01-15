/**
 * Claude Code Integration Types
 *
 * All type definitions specific to Claude Code telemetry.
 * These types are isolated from other integrations.
 */

// ============================================
// OTLP REQUEST TYPES
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
// CLAUDE CODE SPECIFIC ATTRIBUTE TYPES
// ============================================

/**
 * Parsed API request attributes from claude_code.api_request log
 */
export interface ClaudeApiRequestAttributes {
  model?: string;
  cost?: number;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
}

/**
 * Parsed tool result attributes from claude_code.tool_result log
 */
export interface ClaudeToolResultAttributes {
  tool_name?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
}

/**
 * Parsed edit decision attributes from claude_code.code_edit_tool.decision log
 */
export interface ClaudeEditDecisionAttributes {
  decision?: "accepted" | "rejected" | "modified" | "auto_applied";
  edit_type?: string;
  file_path?: string;
  lines_affected?: number;
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
