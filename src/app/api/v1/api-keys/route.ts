import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
import { createHash } from "crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  // Generate a key like: dm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
  return `dm_live_${nanoid(32)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { success: false, error: "userId and name are required" },
        { status: 400 }
      );
    }

    const apiKey = generateApiKey();
    const keyHash = hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12);
    const keyId = uuidv4();

    await db.insert(schema.apiKeys).values({
      id: keyId,
      userId,
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

export async function GET() {
  try {
    const keys = await db.query.apiKeys.findMany({
      orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
    });

    return NextResponse.json({
      success: true,
      keys: keys.map((k) => ({
        id: k.id,
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
