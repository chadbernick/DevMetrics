"use server";

import { logout } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await logout();
  redirect("/login");
}
