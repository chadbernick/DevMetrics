/**
 * OpenAI Codex CLI Integration Parser
 */

import { attributesToObject } from "../shared/otlp-primitives";
import type {
  OtlpLogRecord,
  OtlpExportLogsServiceRequest,
  CodexToolResultAttributes,
  CodexToolDecisionAttributes,
} from "./types";

export function parseToolResultAttributes(
  logRecord: OtlpLogRecord
): CodexToolResultAttributes {
  const attrs = attributesToObject(logRecord.attributes);
  return {
    tool_name: typeof attrs.tool_name === "string" ? attrs.tool_name : undefined,
    success: typeof attrs.success === "boolean" ? attrs.success : undefined,
    duration_ms: typeof attrs.duration_ms === "number" ? attrs.duration_ms : undefined,
    error: typeof attrs.error === "string" ? attrs.error : undefined,
  };
}

export function parseToolDecisionAttributes(
  logRecord: OtlpLogRecord
): CodexToolDecisionAttributes {
  const attrs = attributesToObject(logRecord.attributes);
  const decision = attrs.decision as string | undefined;
  const validDecisions = ["accepted", "rejected", "modified"];
  return {
    decision: validDecisions.includes(decision ?? "")
      ? (decision as "accepted" | "rejected" | "modified")
      : undefined,
    tool_name: typeof attrs.tool_name === "string" ? attrs.tool_name : undefined,
  };
}

export async function parseLogsRequest(request: Request): Promise<OtlpExportLogsServiceRequest> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/x-protobuf") || contentType.includes("application/protobuf")) {
    // Use protobuf decoder
    const { decodeLogsProtobuf } = await import("./protobuf");
    const buffer = await request.arrayBuffer();
    return decodeLogsProtobuf(new Uint8Array(buffer));
  }
  return (await request.json()) as OtlpExportLogsServiceRequest;
}
