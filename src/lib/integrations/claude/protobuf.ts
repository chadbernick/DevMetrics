/**
 * Claude Code Integration Protobuf Parser
 *
 * Isolated protobuf decoding for Claude Code.
 * This is a copy of the shared protobuf logic to ensure isolation.
 */

import type {
  OtlpExportMetricsServiceRequest,
  OtlpExportLogsServiceRequest,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const root = require("@opentelemetry/otlp-transformer/build/src/generated/root");

const ExportMetricsServiceRequest =
  root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
const ExportLogsServiceRequest =
  root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;

/**
 * Decode protobuf-encoded OTLP metrics request
 */
export function decodeMetricsProtobuf(
  buffer: Uint8Array
): OtlpExportMetricsServiceRequest {
  const decoded = ExportMetricsServiceRequest.decode(buffer);
  return ExportMetricsServiceRequest.toObject(decoded, {
    longs: String,
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
 * Check if request is protobuf format
 */
export function isProtobufRequest(contentType: string): boolean {
  return (
    contentType.includes("application/x-protobuf") ||
    contentType.includes("application/protobuf")
  );
}

/**
 * Parse OTLP metrics request body (supports both JSON and protobuf)
 */
export async function parseMetricsRequest(
  request: Request
): Promise<OtlpExportMetricsServiceRequest> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (isProtobufRequest(contentType)) {
    const buffer = await request.arrayBuffer();
    return decodeMetricsProtobuf(new Uint8Array(buffer));
  }

  return (await request.json()) as OtlpExportMetricsServiceRequest;
}

/**
 * Parse OTLP logs request body (supports both JSON and protobuf)
 */
export async function parseLogsRequest(
  request: Request
): Promise<OtlpExportLogsServiceRequest> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (isProtobufRequest(contentType)) {
    const buffer = await request.arrayBuffer();
    return decodeLogsProtobuf(new Uint8Array(buffer));
  }

  return (await request.json()) as OtlpExportLogsServiceRequest;
}
