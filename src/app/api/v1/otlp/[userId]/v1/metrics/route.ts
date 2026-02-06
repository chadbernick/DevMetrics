/**
 * OTLP Metrics Endpoint with User ID in Path
 *
 * Route: /api/v1/otlp/[userId]/v1/metrics
 *
 * This endpoint accepts the user ID as a path parameter instead of a query
 * parameter, which is necessary because OTLP SDKs strip query parameters
 * when appending /v1/metrics to the base endpoint URL.
 *
 * Configuration:
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000/api/v1/otlp/<userId>
 */

import { NextRequest, NextResponse } from "next/server";
import type { OtlpExportResponse } from "@/lib/otlp/types";
import { parseOtlpMetricsRequest } from "@/lib/otlp/protobuf";
import { getStringAttr } from "@/lib/otlp/parser";
import { authenticateUserById, generateRequestId } from "@/lib/integrations/shared";

import { processClaudeMetrics } from "@/lib/integrations/claude/metrics-handler";
import { processGeminiMetrics } from "@/lib/integrations/gemini/metrics-handler";

type ToolId = "claude_code" | "gemini" | "codex" | "other";

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
            rejectedDataPoints: -1,
            errorMessage: authResult.error,
          },
        } satisfies OtlpExportResponse,
        { status: authResult.status }
      );
    }

    const userId = authResult.userId;

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
        result = await processClaudeMetrics(userId, body, requestId);
        break;
    }

    console.log(
      `[${requestId}] OTLP metrics (${toolId}): processed=${result.processed}, rejected=${result.rejected}`
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
    console.error(`[${requestId}] OTLP metrics error:`, error);
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
