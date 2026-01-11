import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);

  try {
    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          code: "VALIDATION_ERROR",
          details: parsed.error.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    const { token, name } = parsed.data;
    const tokenHash = hashToken(token);

    // Find the invitation by token hash
    const invitation = await db.query.invitations.findFirst({
      where: eq(schema.invitations.tokenHash, tokenHash),
    });

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired invitation",
          code: "INVALID_TOKEN",
          requestId,
        },
        { status: 400 }
      );
    }

    // Check status
    if (invitation.status === "accepted") {
      return NextResponse.json(
        {
          success: false,
          error: "This invitation has already been accepted",
          code: "INVITATION_ALREADY_ACCEPTED",
          requestId,
        },
        { status: 400 }
      );
    }

    if (invitation.status === "revoked") {
      return NextResponse.json(
        {
          success: false,
          error: "This invitation has been revoked",
          code: "INVITATION_REVOKED",
          requestId,
        },
        { status: 400 }
      );
    }

    // Check expiry
    if (invitation.expiresAt < new Date()) {
      // Update status to expired
      await db
        .update(schema.invitations)
        .set({ status: "expired" })
        .where(eq(schema.invitations.id, invitation.id));

      return NextResponse.json(
        {
          success: false,
          error: "This invitation has expired",
          code: "INVITATION_EXPIRED",
          requestId,
        },
        { status: 400 }
      );
    }

    // Check if email already exists (shouldn't happen but safety check)
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, invitation.email),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "A user with this email already exists",
          code: "EMAIL_ALREADY_EXISTS",
          requestId,
        },
        { status: 409 }
      );
    }

    // Create the user
    const userId = uuidv4();
    const now = new Date();

    await db.insert(schema.users).values({
      id: userId,
      email: invitation.email,
      name,
      role: invitation.role,
      engineerLevel: invitation.engineerLevel,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Mark invitation as accepted
    await db
      .update(schema.invitations)
      .set({
        status: "accepted",
        acceptedAt: now,
      })
      .where(eq(schema.invitations.id, invitation.id));

    const newUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser!.id,
        email: newUser!.email,
        name: newUser!.name,
        role: newUser!.role,
        engineerLevel: newUser!.engineerLevel,
      },
      message: "Account created successfully",
      redirectTo: "/settings/profile",
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Error accepting invitation:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to accept invitation",
        code: "DATABASE_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}
