"use server";

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";

const RESET_TOKEN_EXPIRY_MS = 1000 * 60 * 60; // 1 hour

export async function forgotPasswordAction(state: unknown, formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required" };
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (!user) {
    // Don't reveal whether user exists
    return { error: "If an account exists with this email, a reset link will be generated." };
  }

  // Generate a random token
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  // Store the token hash
  await db.insert(schema.passwordResetTokens).values({
    id: uuidv4(),
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // Build the reset link
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const resetLink = `${protocol}://${host}/login/reset-password?token=${token}`;

  return {
    success: true,
    resetLink,
  };
}
