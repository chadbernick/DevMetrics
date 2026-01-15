import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function authenticateRequest(
  request: NextRequest,
  requestUserId?: string
): Promise<{ userId: string | null; error?: string }> {
  // Check for API key in header
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
      // Update last used timestamp
      await db
        .update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, keyRecord.id));

      return { userId: keyRecord.userId };
    } else {
      return { userId: null, error: "Invalid or inactive API key" };
    }
  }

  // Fall back to userId in request body
  if (requestUserId) {
    // Verify user exists
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, requestUserId),
    });
    if (user) {
      return { userId: requestUserId };
    }
    return { userId: null, error: "User not found" };
  }

  // Authentication required - no fallback to default user
  return { userId: null, error: "Authentication required. Provide X-API-Key header or valid userId" };
}
