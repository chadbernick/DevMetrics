/**
 * OpenAI Codex CLI Logs Endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";
import { parseLogsRequest } from "@/lib/integrations/codex/parser";
import { processCodexLogs } from "@/lib/integrations/codex/logs-handler";
import { CODEX_INTEGRATION } from "@/lib/integrations/codex";
import type { OtlpExportResponse } from "@/lib/integrations/codex/types";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("codex");

  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { partialSuccess: { rejectedLogRecords: -1, errorMessage: authResult.error } } satisfies OtlpExportResponse,
        { status: authResult.status }
      );
    }

    let body;
    try {
      body = await parseLogsRequest(request);
    } catch (parseError) {
      return NextResponse.json(
        { partialSuccess: { rejectedLogRecords: -1, errorMessage: `Parse error: ${parseError}` } } satisfies OtlpExportResponse,
        { status: 400 }
      );
    }

    const result = await processCodexLogs(authResult.userId, body, requestId);
    console.log(`[${requestId}] Codex logs: processed=${result.processed}, rejected=${result.rejected}`);

    return NextResponse.json({
      partialSuccess: result.rejected > 0 ? { rejectedLogRecords: result.rejected } : {},
    } satisfies OtlpExportResponse);
  } catch (error) {
    console.error(`[${requestId}] Codex logs error:`, error);
    return NextResponse.json(
      { partialSuccess: { rejectedLogRecords: -1, errorMessage: String(error) } } satisfies OtlpExportResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    integration: CODEX_INTEGRATION.id,
    endpoint: CODEX_INTEGRATION.endpoints.logs,
    supportedEvents: CODEX_INTEGRATION.logEventNames,
  });
}
