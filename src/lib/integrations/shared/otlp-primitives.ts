/**
 * OTLP Primitives - Tool-Agnostic Parsing Utilities
 *
 * These are low-level utilities for parsing OTLP data structures.
 * They contain NO tool-specific logic and can be safely shared.
 */

/**
 * OTLP AnyValue type
 */
export interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string | number;
  doubleValue?: number;
  arrayValue?: { values: OtlpAnyValue[] };
  kvlistValue?: { values: OtlpKeyValue[] };
  bytesValue?: string;
}

/**
 * OTLP KeyValue type
 */
export interface OtlpKeyValue {
  key: string;
  value: OtlpAnyValue;
}

/**
 * OTLP Number Data Point type
 */
export interface OtlpNumberDataPoint {
  attributes?: OtlpKeyValue[];
  startTimeUnixNano?: string;
  timeUnixNano?: string;
  asDouble?: number;
  asInt?: string | number;
}

/**
 * OTLP Log Record type
 */
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

/**
 * Extract a primitive value from an OTLP AnyValue
 */
export function extractValue(
  value: OtlpAnyValue | undefined
): string | number | boolean | null {
  if (!value) return null;

  if (value.stringValue !== undefined) return value.stringValue;
  if (value.intValue !== undefined) {
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
export function extractDataPointValue(dataPoint: OtlpNumberDataPoint): number {
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

  const nanos = BigInt(timeUnixNano);
  const millis = Number(nanos / BigInt(1_000_000));
  return new Date(millis);
}

// Re-export date utility from shared location
export { getDateString } from "@/lib/utils/date";

/**
 * Extract log record body as string
 */
export function getLogBody(logRecord: OtlpLogRecord): string {
  if (!logRecord.body) return "";

  if (logRecord.body.stringValue !== undefined) {
    return logRecord.body.stringValue;
  }

  return "";
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
 * Token usage type
 */
export type TokenUsageType =
  | "input"
  | "output"
  | "cache_read"
  | "cache_creation";

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
