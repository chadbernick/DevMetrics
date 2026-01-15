/**
 * OpenAI Codex CLI Integration Types
 *
 * All type definitions specific to Codex CLI telemetry.
 * These types are isolated from other integrations.
 */

export interface OtlpResource {
  attributes?: OtlpKeyValue[];
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
}

export interface OtlpExportLogsServiceRequest {
  resourceLogs?: OtlpResourceLogs[];
}

export interface OtlpResourceLogs {
  resource?: OtlpResource;
  scopeLogs?: OtlpScopeLogs[];
}

export interface OtlpScopeLogs {
  logRecords?: OtlpLogRecord[];
}

export interface OtlpLogRecord {
  timeUnixNano?: string;
  body?: OtlpAnyValue;
  attributes?: OtlpKeyValue[];
}

export interface OtlpExportResponse {
  partialSuccess?: {
    rejectedLogRecords?: number;
    errorMessage?: string;
  };
}

export interface CodexToolResultAttributes {
  tool_name?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
}

export interface CodexToolDecisionAttributes {
  decision?: "accepted" | "rejected" | "modified";
  tool_name?: string;
}

export interface MetricProcessingResult {
  processed: number;
  rejected: number;
  error?: string;
}
