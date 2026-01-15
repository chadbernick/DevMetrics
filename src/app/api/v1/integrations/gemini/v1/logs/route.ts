import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseOtlpLogsRequest } from "@/lib/otlp/protobuf";
import {
  nanoToDate,
  attributesToObject,
  getStringAttr,
} from "@/lib/otlp/parser";
import {
  upsertDailyAggregate,
  getDateString,
} from "@/lib/integrations/common/db";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { GEMINI_TOOL_ID } from "@/lib/integrations/gemini/constants";
import type { OtlpExportResponse } from "@/lib/otlp/types";

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);
  const toolId = GEMINI_TOOL_ID;

  try {
    let body;
    try {
      body = await parseOtlpLogsRequest(request);
    } catch (parseError) {
      console.error(`[${requestId}] [Gemini Logs] Parse error:`, parseError);
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: "Invalid OTLP body",
          },
        },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const userIdParam =
      url.searchParams.get("user") ?? request.headers.get("x-user-id");

    if (!userIdParam) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: "Authentication required",
          },
        },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userIdParam),
    });

    if (!user) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedLogRecords: -1,
            errorMessage: "User not found",
          },
        },
        { status: 401 }
      );
    }

    const userId = user.id;
    let processedCount = 0;

    for (const resourceLogs of body.resourceLogs ?? []) {
      for (const scopeLogs of resourceLogs.scopeLogs ?? []) {
        for (const logRecord of scopeLogs.logRecords ?? []) {
          const timestamp = nanoToDate(logRecord.timeUnixNano);
          const dateString = getDateString(timestamp);
          const attrs = attributesToObject(logRecord.attributes);
          
          // The event name is usually in the body or a specific attribute
          // Gemini CLI often puts the event name in the body as a string
          let eventName = "";
          if (logRecord.body && typeof logRecord.body === 'object') {
             if ('stringValue' in logRecord.body) {
                eventName = logRecord.body.stringValue as string;
             }
          }
          
          // Also check attributes for event name if body is empty or generic
          if (!eventName) {
             eventName = getStringAttr(logRecord.attributes, "event.name") ?? "";
          }

          // Handle Gemini Log Events
          if (eventName === "gemini_cli.tool_call" || eventName.includes("tool_call")) {
             // Record tool call
             await upsertDailyAggregate(userId, dateString, { features: 1 }); // proxy for activity
             
             // Insert detailed tool call record
             await db.insert(schema.toolCalls).values({
                id: uuidv4(),
                sessionId: null, // We might need to extract session ID from attributes if available
                userId,
                tool: toolId,
                toolName: (attrs.tool_name as string) ?? "unknown",
                success: attrs.success !== false,
                durationMs: (attrs.duration_ms as number) ?? 0,
                error: attrs.success === false ? ((attrs.error as string) ?? "Unknown error") : null,
                timestamp,
             });
          }
          else if (eventName === "gemini_cli.file_operation") {
             await upsertDailyAggregate(userId, dateString, { filesChanged: 1 });
          }
          
          processedCount++;
        }
      }
    }

    console.log(`[${requestId}] [Gemini Logs] Processed ${processedCount} logs`);

    return NextResponse.json({ partialSuccess: {} } satisfies OtlpExportResponse);
  } catch (error) {
    console.error(`[${requestId}] [Gemini Logs] Error:`, error);
    return NextResponse.json(
      {
        partialSuccess: {
          rejectedLogRecords: -1,
          errorMessage: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
