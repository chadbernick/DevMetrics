/**
 * LEGACY OTLP Metrics Endpoint
 *
 * DEPRECATED: This endpoint forwards to integration-specific endpoints.
 * Use the new endpoints directly:
 * - Claude: /api/v1/integrations/claude/metrics
 * - Gemini: /api/v1/integrations/gemini/metrics
 *
 * This endpoint detects the tool from the request and routes accordingly.
 */

import { NextRequest, NextResponse } from "next/server";
import type { OtlpExportResponse } from "@/lib/otlp/types";
import { parseOtlpMetricsRequest } from "@/lib/otlp/protobuf";
import { getStringAttr } from "@/lib/otlp/parser";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";

// Import integration handlers directly (no forwarding overhead)
import { processClaudeMetrics } from "@/lib/integrations/claude/metrics-handler";
import { processGeminiMetrics } from "@/lib/integrations/gemini/metrics-handler";

type ToolId = "claude_code" | "gemini" | "codex" | "other";

/**
 * Detect tool from OTLP request
 */
function detectToolFromBody(body: {
  resourceMetrics?: Array<{
    resource?: { attributes?: Array<{ key: string; value: { stringValue?: string } }> };
    scopeMetrics?: Array<{ metrics?: Array<{ name: string }> }>;
  }>;
}): ToolId {
  for (const rm of body.resourceMetrics ?? []) {
    const serviceName = getStringAttr(rm.resource?.attributes, "service.name") ?? "";
    const serviceNameLower = serviceName.toLowerCase();

    if (serviceNameLower.includes("claude")) return "claude_code";
    if (serviceNameLower.includes("gemini")) return "gemini";
    if (serviceNameLower.includes("codex")) return "codex";

    // Check metric prefixes
    for (const sm of rm.scopeMetrics ?? []) {
      for (const metric of sm.metrics ?? []) {
        if (metric.name.startsWith("claude_code.")) return "claude_code";
        if (metric.name.startsWith("gemini_cli.") || metric.name.startsWith("gemini.")) return "gemini";
        if (metric.name.startsWith("codex.")) return "codex";
      }
    }
  }

  return "other";
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("legacy");

  // Log deprecation warning
  console.warn(
    `[${requestId}] DEPRECATED: /api/v1/otlp/v1/metrics is deprecated. ` +
    `Please migrate to /api/v1/integrations/{tool}/metrics`
  );

  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
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
      body = await parseOtlpMetricsRequest(request);
    } catch (parseError) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
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
        result = await processClaudeMetrics(userId, body, requestId);
        break;
      case "gemini":
        result = await processGeminiMetrics(userId, body, requestId);
        break;
      default:
        // For unknown tools, try Claude handler as fallback
        console.log(`[${requestId}] Unknown tool, using Claude handler as fallback`);
        result = await processClaudeMetrics(userId, body, requestId);
        break;
    }

    console.log(
      `[${requestId}] Legacy OTLP metrics (${toolId}): processed=${result.processed}, rejected=${result.rejected}`
    );

    const response: OtlpExportResponse = {
      partialSuccess:
        result.rejected > 0
          ? {
              rejectedDataPoints: result.rejected,
              errorMessage: `${result.rejected} data points could not be processed`,
            }
          : {},
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] Legacy OTLP metrics error:`, error);
    return NextResponse.json(
      {
        partialSuccess: {
          rejectedDataPoints: -1,
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
    endpoint: "otlp/v1/metrics",
    deprecated: true,
    message: "This endpoint is deprecated. Please use integration-specific endpoints.",
    newEndpoints: {
      claude: "/api/v1/integrations/claude/metrics",
      gemini: "/api/v1/integrations/gemini/metrics",
    },
    version: "2.0-legacy",
  });
}
