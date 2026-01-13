"use server";

import { db, schema } from "@/lib/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { createHash } from "crypto";
import { hashPassword } from "@/lib/auth/session";

export async function resetPasswordAction(state: unknown, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    return { error: "Reset token is required" };
  }

  if (!password || !confirmPassword) {
    return { error: "Password and confirmation are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // Hash the token and look it up
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(schema.passwordResetTokens.tokenHash, tokenHash),
      gt(schema.passwordResetTokens.expiresAt, new Date()),
      isNull(schema.passwordResetTokens.usedAt)
    ),
  });

  if (!resetToken) {
    return { error: "Invalid or expired reset token" };
  }

  // Hash the new password and update the user
  const passwordHash = hashPassword(password);

  await db
    .update(schema.users)
    .set({ password: passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, resetToken.userId));

  // Mark the token as used
  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResetTokens.id, resetToken.id));

  return { success: true };
}
