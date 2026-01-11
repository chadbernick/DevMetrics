import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-check";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const requestId = uuidv4().slice(0, 8);
  const { invitationId } = await params;

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
    // Find the invitation
    const invitation = await db.query.invitations.findFirst({
      where: eq(schema.invitations.id, invitationId),
    });

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "Invitation not found",
          code: "NOT_FOUND",
          requestId,
        },
        { status: 404 }
      );
    }

    // Only revoke pending invitations
    if (invitation.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot revoke invitation with status: ${invitation.status}`,
          code: "INVALID_STATUS",
          requestId,
        },
        { status: 400 }
      );
    }

    // Update status to revoked
    await db
      .update(schema.invitations)
      .set({ status: "revoked" })
      .where(eq(schema.invitations.id, invitationId));

    return NextResponse.json({
      success: true,
      message: "Invitation revoked successfully",
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Error revoking invitation:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to revoke invitation",
        code: "DATABASE_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}
