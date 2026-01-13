import { cookies } from "next/headers";
import { db, schema } from "@/lib/db";
import { eq, gt } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string) {
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(schema.userSessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) return null;

  const session = await db.query.userSessions.findFirst({
    where: (sessions, { eq, and, gt }) => and(
      eq(sessions.id, sessionId),
      gt(sessions.expiresAt, new Date())
    ),
    with: {
      // We can't easily include relations if not defined in schema relations, 
      // but we can fetch user separately or assume relation exists if I added it.
      // Schema definition: references(() => users.id) establishes FK but not ORM relation object.
      // So I'll just fetch user separately or join.
    }
  });

  if (!session) return null;

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
  });

  return user;
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.delete(schema.userSessions).where(eq(schema.userSessions.id, sessionId));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const verifyHash = scryptSync(password, salt, 64).toString("hex");
  return hash === verifyHash;
}
