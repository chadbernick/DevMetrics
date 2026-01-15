/**
 * Gemini CLI Logs Endpoint
 *
 * Isolated endpoint for Gemini CLI OTLP logs.
 * This endpoint ONLY handles Gemini CLI telemetry.
 * JSON only - no protobuf support.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";
import { parseLogsRequest } from "@/lib/integrations/gemini/parser";
import { processGeminiLogs } from "@/lib/integrations/gemini/logs-handler";
import { GEMINI_INTEGRATION } from "@/lib/integrations/gemini";
import type { OtlpExportResponse } from "@/lib/integrations/gemini/types";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("gemini");

  try {
    // Log request details
    const contentType = request.headers.get("Content-Type") ?? "";

    console.log(
      `[${requestId}] Gemini logs request - Content-Type: ${contentType}`
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

    // Parse request body (JSON only for Gemini)
    let body;
    try {
      body = await parseLogsRequest(request);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OTLP body:`, parseError);
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: `Invalid JSON body: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          },
        } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    // Process logs using Gemini-specific handler
    const result = await processGeminiLogs(userId, body, requestId);

    console.log(
      `[${requestId}] Gemini logs: processed=${result.processed}, rejected=${result.rejected}`
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
    console.error(`[${requestId}] Gemini logs error:`, error);
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
    integration: GEMINI_INTEGRATION.id,
    endpoint: GEMINI_INTEGRATION.endpoints.logs,
    version: "1.0",
    formats: ["application/json"],
    supportedEvents: GEMINI_INTEGRATION.logEventNames,
    documentation: GEMINI_INTEGRATION.docsPath,
    externalDocs: GEMINI_INTEGRATION.externalDocsUrl,
  });
}
