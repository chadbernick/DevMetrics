/**
 * LEGACY OTLP Logs Endpoint
 *
 * DEPRECATED: This endpoint forwards to integration-specific endpoints.
 * Use the new endpoints directly:
 * - Claude: /api/v1/integrations/claude/logs
 * - Gemini: /api/v1/integrations/gemini/logs
 * - Codex: /api/v1/integrations/codex/logs
 *
 * This endpoint detects the tool from the request and routes accordingly.
 */

import { NextRequest, NextResponse } from "next/server";
import type { OtlpExportResponse } from "@/lib/otlp/types";
import { parseOtlpLogsRequest } from "@/lib/otlp/protobuf";
import { getStringAttr, getLogBody } from "@/lib/otlp/parser";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";

// Import integration handlers directly
import { processClaudeLogs } from "@/lib/integrations/claude/logs-handler";
import { processGeminiLogs } from "@/lib/integrations/gemini/logs-handler";
import { processCodexLogs } from "@/lib/integrations/codex/logs-handler";

type ToolId = "claude_code" | "gemini" | "codex" | "other";

/**
 * Detect tool from OTLP logs request
 */
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

    // Check log event prefixes
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

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("legacy");

  // Log deprecation warning
  console.warn(
    `[${requestId}] DEPRECATED: /api/v1/otlp/v1/logs is deprecated. ` +
    `Please migrate to /api/v1/integrations/{tool}/logs`
  );

  try {
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

    // Parse request body
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

    // Detect tool and route to appropriate handler
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
        // For unknown tools, try Claude handler as fallback
        console.log(`[${requestId}] Unknown tool, using Claude handler as fallback`);
        result = await processClaudeLogs(userId, body, requestId);
        break;
    }

    console.log(
      `[${requestId}] Legacy OTLP logs (${toolId}): processed=${result.processed}, rejected=${result.rejected}`
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
    console.error(`[${requestId}] Legacy OTLP logs error:`, error);
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
 * Health check - now shows deprecation notice
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "otlp/v1/logs",
    deprecated: true,
    message: "This endpoint is deprecated. Please use integration-specific endpoints.",
    newEndpoints: {
      claude: "/api/v1/integrations/claude/logs",
      gemini: "/api/v1/integrations/gemini/logs",
      codex: "/api/v1/integrations/codex/logs",
    },
    version: "1.0-legacy",
  });
}
