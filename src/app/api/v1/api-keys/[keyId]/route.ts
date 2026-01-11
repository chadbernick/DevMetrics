import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await params;

    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, keyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
