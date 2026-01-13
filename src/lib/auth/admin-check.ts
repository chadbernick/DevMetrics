import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { getSession } from "./session";

export const AuthErrorCodes = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_API_KEY: "INVALID_API_KEY",
  USER_INACTIVE: "USER_INACTIVE",
  FORBIDDEN: "FORBIDDEN",
} as const;

export interface AuthResult {
  authorized: boolean;
  userId?: string;
  user?: typeof schema.users.$inferSelect;
  error?: string;
  code?: keyof typeof AuthErrorCodes;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const apiKey = request.headers.get("X-API-Key");

  // If API key provided, validate it
  if (apiKey) {
    const keyHash = hashKey(apiKey);
    const keyRecord = await db.query.apiKeys.findFirst({
      where: and(
        eq(schema.apiKeys.keyHash, keyHash),
        eq(schema.apiKeys.isActive, true)
      ),
    });

    if (!keyRecord) {
      return {
        authorized: false,
        error: "Invalid or inactive API key",
        code: "INVALID_API_KEY",
      };
    }

    // Update last used timestamp
    await db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, keyRecord.id));

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, keyRecord.userId),
    });

    if (!user) {
      return {
        authorized: false,
        error: "User not found",
        code: "USER_INACTIVE",
      };
    }

    if (!user.isActive) {
      return {
        authorized: false,
        error: "User account is deactivated",
        code: "USER_INACTIVE",
      };
    }

    if (user.role !== "admin") {
      return {
        authorized: false,
        error: "Admin access required",
        code: "FORBIDDEN",
      };
    }

    return {
      authorized: true,
      userId: user.id,
      user,
    };
  }

  // Check Session Cookie
  const session = await getSession();
  if (session) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });

    if (!user || !user.isActive) {
      return {
        authorized: false,
        error: "User not found or inactive",
        code: "USER_INACTIVE",
      };
    }

    if (user.role !== "admin") {
      return {
        authorized: false,
        error: "Admin access required",
        code: "FORBIDDEN",
      };
    }

    return { authorized: true, userId: user.id, user };
  }

  // No valid authentication provided - no fallback to default user
  return {
    authorized: false,
    error: "Authentication required. Provide X-API-Key header or valid session cookie",
    code: "AUTH_REQUIRED",
  };
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    // Check Session Cookie
    const session = await getSession();
    if (session) {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, session.userId),
      });

      if (user && user.isActive) {
        return { authorized: true, userId: user.id, user };
      }
    }

    return {
      authorized: false,
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    };
  }

  const keyHash = hashKey(apiKey);
  const keyRecord = await db.query.apiKeys.findFirst({
    where: and(
      eq(schema.apiKeys.keyHash, keyHash),
      eq(schema.apiKeys.isActive, true)
    ),
  });

  if (!keyRecord) {
    return {
      authorized: false,
      error: "Invalid or inactive API key",
      code: "INVALID_API_KEY",
    };
  }

  // Update last used timestamp
  await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, keyRecord.id));

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, keyRecord.userId),
  });

  if (!user) {
    return {
      authorized: false,
      error: "User not found",
      code: "USER_INACTIVE",
    };
  }

  if (!user.isActive) {
    return {
      authorized: false,
      error: "User account is deactivated",
      code: "USER_INACTIVE",
    };
  }

  return {
    authorized: true,
    userId: user.id,
    user,
  };
}
