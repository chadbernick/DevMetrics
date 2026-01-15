/**
 * OpenAI Codex CLI Integration Protobuf Parser
 */

import type { OtlpExportLogsServiceRequest } from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const root = require("@opentelemetry/otlp-transformer/build/src/generated/root");
const ExportLogsServiceRequest = root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;

export function decodeLogsProtobuf(buffer: Uint8Array): OtlpExportLogsServiceRequest {
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
