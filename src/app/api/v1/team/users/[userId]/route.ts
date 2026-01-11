import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { eq, and, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin-check";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "developer", "viewer"]).optional(),
  engineerLevel: z
    .enum(["junior", "mid", "senior", "staff", "principal"])
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const requestId = uuidv4().slice(0, 8);
  const { userId } = await params;

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
    const parsed = updateUserSchema.safeParse(body);

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

    // Find the user to update
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          code: "NOT_FOUND",
          requestId,
        },
        { status: 404 }
      );
    }

    const updates = parsed.data;

    // Prevent self-deactivation
    if (updates.isActive === false && userId === auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot deactivate your own account",
          code: "SELF_DEACTIVATION_FORBIDDEN",
          requestId,
        },
        { status: 400 }
      );
    }

    // Prevent self-demotion from admin
    if (updates.role && updates.role !== "admin" && userId === auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot change your own admin role",
          code: "SELF_DEMOTION_FORBIDDEN",
          requestId,
        },
        { status: 400 }
      );
    }

    // Check for last admin protection
    if (
      (updates.role && updates.role !== "admin") ||
      updates.isActive === false
    ) {
      if (existingUser.role === "admin") {
        const adminCount = await db.query.users.findMany({
          where: and(
            eq(schema.users.role, "admin"),
            eq(schema.users.isActive, true)
          ),
        });

        if (adminCount.length <= 1) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Cannot demote or deactivate the last admin. Promote another user to admin first.",
              code: "LAST_ADMIN_PROTECTION",
              requestId,
            },
            { status: 400 }
          );
        }
      }
    }

    // Check email uniqueness if updating email
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await db.query.users.findFirst({
        where: and(
          eq(schema.users.email, updates.email),
          ne(schema.users.id, userId)
        ),
      });

      if (emailExists) {
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
    }

    // Build update object
    const updateData: Partial<typeof schema.users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.engineerLevel !== undefined)
      updateData.engineerLevel = updates.engineerLevel;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, userId));

    const updatedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        role: updatedUser!.role,
        engineerLevel: updatedUser!.engineerLevel,
        isActive: updatedUser!.isActive,
        createdAt: updatedUser!.createdAt,
        updatedAt: updatedUser!.updatedAt,
      },
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Error updating user:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
        code: "DATABASE_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}
