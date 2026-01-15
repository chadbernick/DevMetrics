/**
 * Gemini CLI Metrics Endpoint
 *
 * Isolated endpoint for Gemini CLI OTLP metrics.
 * This endpoint ONLY handles Gemini CLI telemetry.
 * JSON only - no protobuf support.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";
import { parseMetricsRequest } from "@/lib/integrations/gemini/parser";
import { processGeminiMetrics } from "@/lib/integrations/gemini/metrics-handler";
import { GEMINI_INTEGRATION } from "@/lib/integrations/gemini";
import type { OtlpExportResponse } from "@/lib/integrations/gemini/types";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("gemini");

  try {
    // Log request details
    const contentType = request.headers.get("Content-Type") ?? "";

    console.log(
      `[${requestId}] Gemini metrics request - Content-Type: ${contentType}`
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

    // Parse request body (JSON only for Gemini)
    let body;
    try {
      body = await parseMetricsRequest(request);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse OTLP body:`, parseError);
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
            errorMessage: `Invalid JSON body: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          },
        } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    // Process metrics using Gemini-specific handler
    const result = await processGeminiMetrics(userId, body, requestId);

    console.log(
      `[${requestId}] Gemini metrics: processed=${result.processed}, rejected=${result.rejected}`
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
    console.error(`[${requestId}] Gemini metrics error:`, error);
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
    integration: GEMINI_INTEGRATION.id,
    endpoint: GEMINI_INTEGRATION.endpoints.metrics,
    version: "1.0",
    formats: ["application/json"],
    supportedMetrics: GEMINI_INTEGRATION.metricNames,
    documentation: GEMINI_INTEGRATION.docsPath,
    externalDocs: GEMINI_INTEGRATION.externalDocsUrl,
    configuration: {
      settingsJson: {
        telemetry: {
          enabled: true,
          target: "local",
          otlpProtocol: "http",
          otlpEndpoint: "<dashboard-url>/api/v1/integrations/gemini?user=<uuid>",
        },
      },
      envVars: [
        "GEMINI_TELEMETRY_ENABLED=true",
        "GEMINI_TELEMETRY_TARGET=local",
        "GEMINI_TELEMETRY_OTLP_PROTOCOL=http",
        "GEMINI_TELEMETRY_OTLP_ENDPOINT=<dashboard-url>/api/v1/integrations/gemini?user=<uuid>",
      ],
    },
  });
}
