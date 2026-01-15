/**
 * GitHub Copilot Sync Endpoint
 *
 * Triggers sync of Copilot metrics from GitHub REST API.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, generateRequestId } from "@/lib/integrations/shared";
import { COPILOT_INTEGRATION } from "@/lib/integrations/copilot";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("copilot");

  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    // TODO: Implement Copilot API sync
    // This would call the GitHub Copilot Metrics API using stored credentials

    console.log(`[${requestId}] Copilot sync triggered for user ${authResult.userId}`);

    return NextResponse.json({
      success: true,
      message: "Copilot sync not yet implemented. Configure GitHub token in Settings > Integrations.",
      daysProcessed: 0,
    });
  } catch (error) {
    console.error(`[${requestId}] Copilot sync error:`, error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    integration: COPILOT_INTEGRATION.id,
    endpoint: COPILOT_INTEGRATION.endpoints.sync,
    note: "Copilot uses REST API polling, not OTLP",
    documentation: COPILOT_INTEGRATION.docsPath,
  });
}
