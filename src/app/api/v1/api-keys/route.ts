import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { requireAuth } from "@/lib/auth/admin-check";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  // Generate a key like: dm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
  return `dm_live_${nanoid(32)}`;
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error, code: auth.code },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    // Use authenticated user's ID if not specified, or validate authorization
    const targetUserId = userId ?? auth.userId;

    // Non-admins can only create keys for themselves
    if (targetUserId !== auth.userId && auth.user?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Cannot create API keys for other users" },
        { status: 403 }
      );
    }

    // Verify target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.id, targetUserId),
    });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const apiKey = generateApiKey();
    const keyHash = hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12);
    const keyId = uuidv4();

    await db.insert(schema.apiKeys).values({
      id: keyId,
      userId: targetUserId,
      name,
      keyHash,
      keyPrefix,
      scopes: ["ingest", "read"],
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      id: keyId,
      key: apiKey,
      keyPrefix,
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error, code: auth.code },
        { status: 401 }
      );
    }

    // Admins see all keys, others only see their own
    const keys = auth.user?.role === "admin"
      ? await db.query.apiKeys.findMany({
          orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
        })
      : await db.query.apiKeys.findMany({
          where: eq(schema.apiKeys.userId, auth.userId!),
          orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
        });

    return NextResponse.json({
      success: true,
      keys: keys.map((k) => ({
        id: k.id,
        userId: k.userId,
        name: k.name,
        keyPrefix: k.keyPrefix,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        isActive: k.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}
