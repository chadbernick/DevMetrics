/**
 * Claude Code Metrics Endpoint
 *
 * Isolated endpoint for Claude Code OTLP metrics.
 * This endpoint ONLY handles Claude Code telemetry.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";
import { parseMetricsRequest, isProtobufRequest } from "@/lib/integrations/claude/protobuf";
import { processClaudeMetrics } from "@/lib/integrations/claude/metrics-handler";
import { CLAUDE_INTEGRATION } from "@/lib/integrations/claude";
import type { OtlpExportResponse } from "@/lib/integrations/claude/types";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("claude");

  try {
    // Log request details
    const contentType = request.headers.get("Content-Type") ?? "";
    const isProtobuf = isProtobufRequest(contentType);

    console.log(
      `[${requestId}] Claude metrics request - Content-Type: ${contentType}, isProtobuf: ${isProtobuf}`
    );

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

    // Parse request body (supports both JSON and protobuf)
    let body;
    try {
      body = await parseMetricsRequest(request);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OTLP body:`, parseError);
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
            errorMessage: `Invalid ${isProtobuf ? "protobuf" : "JSON"} body: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          },
        } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    // Process metrics using Claude-specific handler
    const result = await processClaudeMetrics(userId, body, requestId);

    console.log(
      `[${requestId}] Claude metrics: processed=${result.processed}, rejected=${result.rejected}`
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
    console.error(`[${requestId}] Claude metrics error:`, error);
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
 * Health check and integration info
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    integration: CLAUDE_INTEGRATION.id,
    endpoint: CLAUDE_INTEGRATION.endpoints.metrics,
    version: "1.0",
    formats: ["application/json", "application/x-protobuf"],
    supportedMetrics: CLAUDE_INTEGRATION.metricNames,
    documentation: CLAUDE_INTEGRATION.docsPath,
    externalDocs: CLAUDE_INTEGRATION.externalDocsUrl,
    configuration: {
      envVars: [
        "CLAUDE_CODE_ENABLE_TELEMETRY=1",
        "OTEL_METRICS_EXPORTER=otlp",
        "OTEL_LOGS_EXPORTER=otlp",
        "OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf",
        "OTEL_EXPORTER_OTLP_ENDPOINT=<dashboard-url>/api/v1/integrations/claude?user=<uuid>",
      ],
    },
  });
}
