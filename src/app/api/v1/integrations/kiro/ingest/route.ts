/**
 * Kiro Manual Ingest Endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, generateRequestId, upsertDailyAggregate, getDateString } from "@/lib/integrations/shared";
import { KIRO_INTEGRATION } from "@/lib/integrations/kiro";
import type { KiroIngestRequest } from "@/lib/integrations/kiro/types";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId("kiro");

  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = (await request.json()) as KiroIngestRequest;
    const dateString = body.date ?? getDateString(new Date());

    await upsertDailyAggregate(authResult.userId, dateString, {
      sessions: body.sessions ?? 0,
      inputTokens: body.inputTokens ?? 0,
      outputTokens: body.outputTokens ?? 0,
      linesAdded: body.linesAdded ?? 0,
    });

    console.log(`[${requestId}] Kiro ingest for user ${authResult.userId}: date=${dateString}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[${requestId}] Kiro ingest error:`, error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    integration: KIRO_INTEGRATION.id,
    endpoint: KIRO_INTEGRATION.endpoints.ingest,
    note: "Kiro uses manual ingest, not OTLP",
  });
}
