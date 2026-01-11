import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
import { eq, and, or } from "drizzle-orm";
import { createHash } from "crypto";
import { requireAdmin } from "@/lib/auth/admin-check";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateInviteToken(): string {
  return `dminv_${nanoid(32)}`;
}

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "developer", "viewer"]).default("developer"),
  engineerLevel: z
    .enum(["junior", "mid", "senior", "staff", "principal"])
    .default("mid"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export async function GET(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);

  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error,
        code: auth.code,
        requestId,
      },
      { status: auth.code === "FORBIDDEN" ? 403 : 401 }
    );
  }

  try {
    // Get all invitations with creator info
    const invitations = await db.query.invitations.findMany({
      orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
    });

    // Get creator names
    const creatorIds = [...new Set(invitations.map((inv) => inv.createdBy))];
    const creators = await db.query.users.findMany({
      where: or(...creatorIds.map((id) => eq(schema.users.id, id))),
    });
    const creatorMap = new Map(creators.map((c) => [c.id, c.name]));

    // Mark expired invitations
    const now = new Date();
    const invitationsWithStatus = invitations.map((inv) => {
      let status = inv.status;
      if (status === "pending" && inv.expiresAt < now) {
        status = "expired";
      }
      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        engineerLevel: inv.engineerLevel,
        tokenPrefix: inv.tokenPrefix,
        status,
        createdBy: inv.createdBy,
        createdByName: creatorMap.get(inv.createdBy) ?? "Unknown",
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        acceptedAt: inv.acceptedAt,
      };
    });

    return NextResponse.json({
      success: true,
      invitations: invitationsWithStatus,
      total: invitations.length,
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Error fetching invitations:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch invitations",
        code: "DATABASE_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8);

  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error,
        code: auth.code,
        requestId,
      },
      { status: auth.code === "FORBIDDEN" ? 403 : 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);

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

    const { email, role, engineerLevel, expiresInDays } = parsed.data;

    // Check if user already exists with this email
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "A user with this email already exists",
          code: "EMAIL_ALREADY_EXISTS",
          hint: "Use the direct user creation endpoint instead",
          requestId,
        },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(schema.invitations.email, email),
        eq(schema.invitations.status, "pending")
      ),
    });

    if (existingInvitation) {
      // Check if it's expired
      if (existingInvitation.expiresAt < new Date()) {
        // Update to expired status
        await db
          .update(schema.invitations)
          .set({ status: "expired" })
          .where(eq(schema.invitations.id, existingInvitation.id));
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "A pending invitation already exists for this email",
            code: "INVITATION_ALREADY_EXISTS",
            hint: "Revoke the existing invitation first or wait for it to expire",
            requestId,
          },
          { status: 409 }
        );
      }
    }

    // Generate token
    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const tokenPrefix = token.slice(0, 12);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invitationId = uuidv4();

    await db.insert(schema.invitations).values({
      id: invitationId,
      email,
      role,
      engineerLevel,
      tokenHash,
      tokenPrefix,
      createdBy: auth.userId!,
      status: "pending",
      expiresAt,
      createdAt: new Date(),
    });

    // Build invite link
    const baseUrl = request.headers.get("origin") ?? "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/accept?token=${token}`;

    return NextResponse.json(
      {
        success: true,
        invitation: {
          id: invitationId,
          email,
          role,
          engineerLevel,
          tokenPrefix,
          inviteLink,
          token, // Only returned on creation - not stored plain
          expiresAt,
          expiresInDays,
        },
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[${requestId}] Error creating invitation:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create invitation",
        code: "DATABASE_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}
