"use server";

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function loginAction(state: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (!user || !user.password) {
    // Mimic timing of password check
    return { error: "Invalid email or password" };
  }

  const isValid = verifyPassword(password, user.password);

  if (!isValid) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect("/");
}
