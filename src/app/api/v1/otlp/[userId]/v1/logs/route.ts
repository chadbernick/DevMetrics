/**
 * OTLP Logs Endpoint with User ID in Path
 *
 * Route: /api/v1/otlp/[userId]/v1/logs
 *
 * This endpoint accepts the user ID as a path parameter instead of a query
 * parameter, which is necessary because OTLP SDKs strip query parameters
 * when appending /v1/logs to the base endpoint URL.
 *
 * Configuration:
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000/api/v1/otlp/<userId>
 */

import { NextRequest, NextResponse } from "next/server";
import type { OtlpExportResponse } from "@/lib/otlp/types";
import { parseOtlpLogsRequest } from "@/lib/otlp/protobuf";
import { getStringAttr, getLogBody } from "@/lib/otlp/parser";
import { authenticateUserById, generateRequestId } from "@/lib/integrations/shared";

import { processClaudeLogs } from "@/lib/integrations/claude/logs-handler";
import { processGeminiLogs } from "@/lib/integrations/gemini/logs-handler";
import { processCodexLogs } from "@/lib/integrations/codex/logs-handler";

type ToolId = "claude_code" | "gemini" | "codex" | "other";

function detectToolFromBody(body: {
  resourceLogs?: Array<{
    resource?: { attributes?: Array<{ key: string; value: { stringValue?: string } }> };
    scopeLogs?: Array<{ logRecords?: Array<{ body?: { stringValue?: string } }> }>;
  }>;
}): ToolId {
  for (const rl of body.resourceLogs ?? []) {
    const serviceName = getStringAttr(rl.resource?.attributes, "service.name") ?? "";
    const serviceNameLower = serviceName.toLowerCase();

    if (serviceNameLower.includes("claude")) return "claude_code";
    if (serviceNameLower.includes("gemini")) return "gemini";
    if (serviceNameLower.includes("codex")) return "codex";

    for (const sl of rl.scopeLogs ?? []) {
      for (const lr of sl.logRecords ?? []) {
        const eventName = lr.body?.stringValue ?? "";
        if (eventName.startsWith("claude_code.")) return "claude_code";
        if (eventName.startsWith("gemini_cli.")) return "gemini";
        if (eventName.startsWith("codex.")) return "codex";
      }
    }
  }

  return "other";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: userIdParam } = await params;
  const requestId = generateRequestId("otlp");

  try {
    // Authenticate using path parameter
    const authResult = await authenticateUserById(userIdParam);
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

    let body;
    try {
      body = await parseOtlpLogsRequest(request);
    } catch (parseError) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: `Parse error: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          },
        } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    const toolId = detectToolFromBody(body);

    let result;
    switch (toolId) {
      case "claude_code":
        result = await processClaudeLogs(userId, body, requestId);
        break;
      case "gemini":
        result = await processGeminiLogs(userId, body, requestId);
        break;
      case "codex":
        result = await processCodexLogs(userId, body, requestId);
        break;
      default:
        result = await processClaudeLogs(userId, body, requestId);
        break;
    }

    console.log(
      `[${requestId}] OTLP logs (${toolId}): processed=${result.processed}, rejected=${result.rejected}`
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
    console.error(`[${requestId}] OTLP logs error:`, error);
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
