/**
 * Claude Code Logs Endpoint
 *
 * Isolated endpoint for Claude Code OTLP logs.
 * This endpoint ONLY handles Claude Code telemetry.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";
import { parseLogsRequest, isProtobufRequest } from "@/lib/integrations/claude/protobuf";
import { processClaudeLogs } from "@/lib/integrations/claude/logs-handler";
import { CLAUDE_INTEGRATION } from "@/lib/integrations/claude";
import type { OtlpExportResponse } from "@/lib/integrations/claude/types";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("claude");

  try {
    // Log request details
    const contentType = request.headers.get("Content-Type") ?? "";
    const isProtobuf = isProtobufRequest(contentType);

    console.log(
      `[${requestId}] Claude logs request - Content-Type: ${contentType}, isProtobuf: ${isProtobuf}`
    );

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: authResult.error,
          },
        } satisfies OtlpExportResponse,
        { status: authResult.status }
      );
    }

    const userId = authResult.userId;

    // Parse request body (supports both JSON and protobuf)
    let body;
    try {
      body = await parseLogsRequest(request);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OTLP body:`, parseError);
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: `Invalid ${isProtobuf ? "protobuf" : "JSON"} body: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          },
        } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    // Process logs using Claude-specific handler
    const result = await processClaudeLogs(userId, body, requestId);

    console.log(
      `[${requestId}] Claude logs: processed=${result.processed}, rejected=${result.rejected}`
    );

    const response: OtlpExportResponse = {
      partialSuccess:
        result.rejected > 0
          ? {
              rejectedLogRecords: result.rejected,
              errorMessage: `${result.rejected} log records could not be processed`,
            }
          : {},
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] Claude logs error:`, error);
    return NextResponse.json(
      {
        partialSuccess: {
          rejectedLogRecords: -1,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      } satisfies OtlpExportResponse,
      { status: 500 }
    );
  }
}

/**
 * Health check and integration info
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    integration: CLAUDE_INTEGRATION.id,
    endpoint: CLAUDE_INTEGRATION.endpoints.logs,
    version: "1.0",
    formats: ["application/json", "application/x-protobuf"],
    supportedEvents: CLAUDE_INTEGRATION.logEventNames,
    documentation: CLAUDE_INTEGRATION.docsPath,
    externalDocs: CLAUDE_INTEGRATION.externalDocsUrl,
  });
}
