import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { requireAdmin, AuthErrorCodes } from "@/lib/auth/admin-check";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "developer", "viewer"]).default("developer"),
  engineerLevel: z
    .enum(["junior", "mid", "senior", "staff", "principal"])
    .default("mid"),
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
    const users = await db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        engineerLevel: user.engineerLevel,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total: users.length,
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Error fetching users:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
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
    const parsed = createUserSchema.safeParse(body);

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

    const { email, name, role, engineerLevel } = parsed.data;

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
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

    const userId = uuidv4();
    const now = new Date();

    await db.insert(schema.users).values({
      id: userId,
      email,
      name,
      role,
      engineerLevel,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const newUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser!.id,
          email: newUser!.email,
          name: newUser!.name,
          role: newUser!.role,
          engineerLevel: newUser!.engineerLevel,
          isActive: newUser!.isActive,
          createdAt: newUser!.createdAt,
          updatedAt: newUser!.updatedAt,
        },
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[${requestId}] Error creating user:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create user",
        code: "DATABASE_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}
