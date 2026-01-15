/**
 * Ingest API Route
 *
 * Receives events from AI development tools and records metrics.
 * Supports: session_start, session_end, token_usage, code_change, commit, pr_activity
 */

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { z } from "zod";

import {
  ErrorCodes,
  ingestSchema,
  handleSessionStart,
  handleSessionEnd,
  handleTokenUsage,
  handleCodeChange,
  handleCommit,
  handlePrActivity,
  type HandlerContext,
} from "@/lib/ingest";

// ============================================
// AUTHENTICATION
// ============================================

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function authenticateRequest(
  request: NextRequest,
  requestUserId?: string
): Promise<{ userId: string | null; error?: string }> {
  const apiKey = request.headers.get("X-API-Key");

  if (apiKey) {
    const keyHash = hashKey(apiKey);
    const keyRecord = await db.query.apiKeys.findFirst({
      where: and(
        eq(schema.apiKeys.keyHash, keyHash),
        eq(schema.apiKeys.isActive, true)
      ),
    });

    if (keyRecord) {
      await db
        .update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, keyRecord.id));

      return { userId: keyRecord.userId };
    } else {
      return { userId: null, error: "Invalid or inactive API key" };
    }
  }

  if (requestUserId) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, requestUserId),
    });
    if (user) {
      return { userId: requestUserId };
    }
    return { userId: null, error: "User not found" };
  }

  return {
    userId: null,
    error: "Authentication required. Provide X-API-Key header or valid userId",
  };
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);

  try {
    const body = await request.json();
    const parsed = ingestSchema.safeParse(body);

    if (!parsed.success) {
      console.warn(`[${requestId}] Invalid request body:`, parsed.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          code: ErrorCodes.INVALID_REQUEST,
          details: parsed.error.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    const { event, data, timestamp, userId: requestUserId } = parsed.data;
    const eventTime = timestamp ? new Date(timestamp) : new Date();

    const authResult = await authenticateRequest(request, requestUserId);
    if (!authResult.userId) {
      console.warn(`[${requestId}] Authentication failed:`, authResult.error);
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Authentication required",
          code: ErrorCodes.AUTH_REQUIRED,
          hint: "Provide X-API-Key header or valid userId",
          requestId,
        },
        { status: 401 }
      );
    }

    const ctx: HandlerContext = {
      userId: authResult.userId,
      eventTime,
      requestId,
    };

    // Route to appropriate handler
    let result;
    switch (event) {
      case "session_start":
        result = await handleSessionStart(ctx, data);
        break;
      case "session_end":
        result = await handleSessionEnd(ctx, data);
        break;
      case "token_usage":
        result = await handleTokenUsage(ctx, data);
        break;
      case "code_change":
        result = await handleCodeChange(ctx, data);
        break;
      case "commit":
        result = await handleCommit(ctx, data);
        break;
      case "pr_activity":
        result = await handlePrActivity(ctx, data);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown event type: ${event}`,
            code: ErrorCodes.INVALID_REQUEST,
            requestId,
          },
          { status: 400 }
        );
    }

    const response: Record<string, unknown> = {
      success: true,
      id: result.id,
      event,
      timestamp: eventTime.toISOString(),
      requestId,
    };

    if (result.warnings && result.warnings.length > 0) {
      response.warnings = result.warnings;
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isValidationError =
      error instanceof z.ZodError ||
      errorMessage.includes("Expected") ||
      errorMessage.includes("Required");
    const isForeignKeyError = errorMessage.includes("FOREIGN KEY");

    console.error(`[${requestId}] Ingest error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: isValidationError
          ? ErrorCodes.VALIDATION_ERROR
          : isForeignKeyError
            ? ErrorCodes.DATABASE_ERROR
            : ErrorCodes.UNKNOWN_ERROR,
        requestId,
        hint: isForeignKeyError
          ? "A referenced entity (session, user) does not exist"
          : undefined,
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// ============================================
// GET HEALTH CHECK
// ============================================

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "ingest",
    version: "3.0",
    events: [
      "session_start",
      "session_end",
      "token_usage",
      "code_change",
      "commit",
      "pr_activity",
    ],
    features: [
      "optional_session_id",
      "external_session_id_mapping",
      "auto_session_creation",
      "extended_token_tracking",
      "cache_token_support",
      "modular_handlers",
    ],
  });
}
