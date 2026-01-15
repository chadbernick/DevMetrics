/**
 * Protobuf parsing utilities for OTLP endpoints
 * Uses the generated protobuf types from @opentelemetry/otlp-transformer
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const root = require("@opentelemetry/otlp-transformer/build/src/generated/root");

const ExportMetricsServiceRequest =
  root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
const ExportLogsServiceRequest =
  root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;

import type {
  OtlpExportMetricsServiceRequest,
  OtlpExportLogsServiceRequest,
} from "./types";

/**
 * Decode protobuf-encoded OTLP metrics request
 */
export function decodeMetricsProtobuf(
  buffer: Uint8Array
): OtlpExportMetricsServiceRequest {
  const decoded = ExportMetricsServiceRequest.decode(buffer);
  // toJSON converts protobuf message to plain object matching our types
  return ExportMetricsServiceRequest.toObject(decoded, {
    longs: String, // Convert int64 to string
    enums: String,
    bytes: String,
    defaults: true,
    arrays: true,
    objects: true,
  }) as OtlpExportMetricsServiceRequest;
}

/**
 * Decode protobuf-encoded OTLP logs request
 */
export function decodeLogsProtobuf(
  buffer: Uint8Array
): OtlpExportLogsServiceRequest {
  const decoded = ExportLogsServiceRequest.decode(buffer);
  return ExportLogsServiceRequest.toObject(decoded, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
    arrays: true,
    objects: true,
  }) as OtlpExportLogsServiceRequest;
}

/**
 * Parse OTLP request body based on content type
 * Supports both JSON and protobuf formats
 */
export async function parseOtlpMetricsRequest(
  request: Request
): Promise<OtlpExportMetricsServiceRequest> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (
    contentType.includes("application/x-protobuf") ||
    contentType.includes("application/protobuf")
  ) {
    const buffer = await request.arrayBuffer();
    return decodeMetricsProtobuf(new Uint8Array(buffer));
  }

  // Default to JSON
  return (await request.json()) as OtlpExportMetricsServiceRequest;
}

/**
 * Parse OTLP logs request body based on content type
 */
export async function parseOtlpLogsRequest(
  request: Request
): Promise<OtlpExportLogsServiceRequest> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (
    contentType.includes("application/x-protobuf") ||
    contentType.includes("application/protobuf")
  ) {
    const buffer = await request.arrayBuffer();
    return decodeLogsProtobuf(new Uint8Array(buffer));
  }

  return (await request.json()) as OtlpExportLogsServiceRequest;
}
