import type {
  OtlpKeyValue,
  OtlpAnyValue,
  OtlpNumberDataPoint,
  OtlpLogRecord,
  ClaudeCodeApiRequestAttributes,
  ClaudeCodeToolResultAttributes,
  TokenUsageType,
} from "./types";

/**
 * Extract a primitive value from an OTLP AnyValue
 */
export function extractValue(
  value: OtlpAnyValue | undefined
): string | number | boolean | null {
  if (!value) return null;

  if (value.stringValue !== undefined) return value.stringValue;
  if (value.intValue !== undefined) {
    // intValue can be string (for int64) or number
    return typeof value.intValue === "string"
      ? parseInt(value.intValue, 10)
      : value.intValue;
  }
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.boolValue !== undefined) return value.boolValue;

  return null;
}

/**
 * Convert OTLP attributes array to a plain object
 */
export function attributesToObject(
  attributes: OtlpKeyValue[] | undefined
): Record<string, string | number | boolean | null> {
  if (!attributes) return {};

  const result: Record<string, string | number | boolean | null> = {};
  for (const attr of attributes) {
    result[attr.key] = extractValue(attr.value);
  }
  return result;
}

/**
 * Get a string attribute value
 */
export function getStringAttr(
  attributes: OtlpKeyValue[] | undefined,
  key: string
): string | undefined {
  const value = attributesToObject(attributes)[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Get a number attribute value
 */
export function getNumberAttr(
  attributes: OtlpKeyValue[] | undefined,
  key: string
): number | undefined {
  const value = attributesToObject(attributes)[key];
  return typeof value === "number" ? value : undefined;
}

/**
 * Get a boolean attribute value
 */
export function getBoolAttr(
  attributes: OtlpKeyValue[] | undefined,
  key: string
): boolean | undefined {
  const value = attributesToObject(attributes)[key];
  return typeof value === "boolean" ? value : undefined;
}

/**
 * Extract numeric value from a data point (handles both asInt and asDouble)
 */
export function extractDataPointValue(
  dataPoint: OtlpNumberDataPoint
): number {
  if (dataPoint.asDouble !== undefined) {
    return dataPoint.asDouble;
  }
  if (dataPoint.asInt !== undefined) {
    return typeof dataPoint.asInt === "string"
      ? parseInt(dataPoint.asInt, 10)
      : dataPoint.asInt;
  }
  return 0;
}

/**
 * Convert OTLP nanosecond timestamp to Date
 */
export function nanoToDate(timeUnixNano: string | undefined): Date {
  if (!timeUnixNano) return new Date();

  // timeUnixNano is in nanoseconds, convert to milliseconds
  const nanos = BigInt(timeUnixNano);
  const millis = Number(nanos / BigInt(1_000_000));
  return new Date(millis);
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
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

/**
 * Extract log record body as string
 */
export function getLogBody(logRecord: OtlpLogRecord): string {
  if (!logRecord.body) return "";

  if (logRecord.body.stringValue !== undefined) {
    return logRecord.body.stringValue;
  }

  // Handle other body types if needed
  return "";
}

/**
 * Parse Claude Code API request attributes from log record
 */
export function parseApiRequestAttributes(
  logRecord: OtlpLogRecord
): ClaudeCodeApiRequestAttributes {
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
): ClaudeCodeToolResultAttributes {
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
 * Get service name from resource attributes
 */
export function getServiceName(
  resourceAttributes: OtlpKeyValue[] | undefined
): string {
  return getStringAttr(resourceAttributes, "service.name") ?? "unknown";
}

/**
 * Check if this is Claude Code telemetry
 */
export function isClaudeCodeTelemetry(
  resourceAttributes: OtlpKeyValue[] | undefined
): boolean {
  const serviceName = getServiceName(resourceAttributes);
  return (
    serviceName.toLowerCase().includes("claude") ||
    serviceName === "claude-code"
  );
}
