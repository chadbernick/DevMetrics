import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "developer", "viewer"]).optional(),
  engineerLevel: z.enum(["junior", "mid", "senior", "staff", "principal"]).optional(),
  teamId: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await db
      .update(schema.users)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    return NextResponse.json(updatedUser[0]);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        team: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
