import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, or } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { scryptSync, randomBytes } from "crypto";
import path from "path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "dashboard.db");

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log("Usage: npx tsx scripts/reset-password.ts <email-or-name> <new-password>");
    console.log("Example: npx tsx scripts/reset-password.ts chad@example.com password123");
    process.exit(1);
  }

  // Find user by email or name (case-insensitive)
  const users = await db.query.users.findMany();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() ||
      u.name.toLowerCase().includes(email.toLowerCase())
  );

  if (!user) {
    console.error(`User not found: ${email}`);
    console.log("Available users:");
    users.forEach((u) => console.log(`  - ${u.name} (${u.email})`));
    process.exit(1);
  }

  const passwordHash = hashPassword(newPassword);

  await db
    .update(schema.users)
    .set({ password: passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  console.log(`Password reset successfully for ${user.name} (${user.email})`);
}

resetPassword()
  .catch(console.error)
  .finally(() => {
    sqlite.close();
    process.exit(0);
  });
