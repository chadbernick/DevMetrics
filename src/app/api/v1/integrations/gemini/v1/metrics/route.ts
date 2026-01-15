import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseOtlpMetricsRequest } from "@/lib/otlp/protobuf";
import {
  extractDataPointValue,
  nanoToDate,
  attributesToObject,
  getStringAttr,
  getTokenUsageType,
} from "@/lib/otlp/parser";
import {
  upsertDailyAggregate,
  getDateString,
  findOrCreateSessionByExternalId,
} from "@/lib/integrations/common/db";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { GEMINI_TOOL_ID } from "@/lib/integrations/gemini/constants";
import type { OtlpExportResponse } from "@/lib/otlp/types";

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);
  const toolId = GEMINI_TOOL_ID;

  try {
    // 1. Parse Body (JSON or Protobuf)
    let body;
    try {
      body = await parseOtlpMetricsRequest(request);
    } catch (parseError) {
      console.error(`[${requestId}] [Gemini] Parse error:`, parseError);
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
            errorMessage: "Invalid OTLP body",
          },
        },
        { status: 400 }
      );
    }

    // 2. Authentication (User ID from query or header)
    const url = new URL(request.url);
    const userIdParam =
      url.searchParams.get("user") ?? request.headers.get("x-user-id");

    if (!userIdParam) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
            errorMessage: "Authentication required. Provide ?user=<uuid>",
          },
        },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userIdParam),
    });

    if (!user) {
      return NextResponse.json(
        {
          partialSuccess: {
            rejectedDataPoints: -1,
            errorMessage: `User '${userIdParam}' not found`,
          },
        },
        { status: 401 }
      );
    }

    const userId = user.id;
    let processedCount = 0;

    // 3. Process Metrics
    for (const resourceMetrics of body.resourceMetrics ?? []) {
      for (const scopeMetrics of resourceMetrics.scopeMetrics ?? []) {
        for (const metric of scopeMetrics.metrics ?? []) {
          const metricName = metric.name;

          // Handle Sum metrics (Counters)
          if (metric.sum?.dataPoints) {
            for (const dp of metric.sum.dataPoints) {
              const value = extractDataPointValue(dp);
              const timestamp = nanoToDate(dp.timeUnixNano);
              const dateString = getDateString(timestamp);
              const attrs = attributesToObject(dp.attributes);
              const rawAttrs = dp.attributes;

              // Gemini Metric Mappings
              if (metricName === "gemini_cli.session.count" || metricName === "gemini.session.count") {
                 await upsertDailyAggregate(userId, dateString, { sessions: value });
              }
              else if (metricName === "gemini_cli.token.usage" || metricName === "gemini.token.usage" || metricName === "gen_ai.client.token.usage") {
                const tokenType = getStringAttr(rawAttrs, "gen_ai.usage.token_type") || getTokenUsageType(rawAttrs) || attrs["type"];
                if (tokenType === "input") {
                  await upsertDailyAggregate(userId, dateString, { inputTokens: value });
                } else if (tokenType === "output") {
                   await upsertDailyAggregate(userId, dateString, { outputTokens: value });
                }
              }
              else if (metricName === "gemini_cli.tool.call.count" || metricName === "gemini.tool.call.count") {
                await upsertDailyAggregate(userId, dateString, { features: value }); // Mapping tool calls to features/activity for now
              }
              else if (metricName === "gemini_cli.lines.changed") {
                 await upsertDailyAggregate(userId, dateString, { 
                   linesAdded: value,
                   aiLinesAdded: value
                 });
                 // Also record raw metric
                 await db.insert(schema.codeMetrics).values({
                    id: uuidv4(),
                    userId,
                    timestamp,
                    linesAdded: value,
                    linesModified: 0,
                    linesDeleted: 0,
                    filesChanged: 0,
                 });
              }
              
              processedCount++;
            }
          }
          
          // Handle Gauge/Histogram if needed (e.g. duration)
           if (metric.histogram?.dataPoints) {
             for (const dp of metric.histogram.dataPoints) {
                const value = dp.sum ?? dp.count ?? 0; // simplified
                 const timestamp = nanoToDate(dp.timeUnixNano);
                const dateString = getDateString(timestamp);
                
                if (metricName.includes("duration")) {
                   // Assume milliseconds
                   const minutes = Math.round(Number(value) / 60000);
                   if (minutes > 0) {
                      await upsertDailyAggregate(userId, dateString, { minutes });
                   }
                }
             }
           }
        }
      }
    }

    console.log(`[${requestId}] [Gemini] Processed ${processedCount} metrics for user ${userId}`);

    return NextResponse.json({ partialSuccess: {} } satisfies OtlpExportResponse);
  } catch (error) {
    console.error(`[${requestId}] [Gemini] Error:`, error);
    return NextResponse.json(
      {
        partialSuccess: {
          rejectedDataPoints: -1,
          errorMessage: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
