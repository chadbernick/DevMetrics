import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import path from "path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "dashboard.db");

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  return `dm_live_${nanoid(32)}`;
}

async function createApiKey() {
  const emailOrName = process.argv[2];
  const keyName = process.argv[3] || "Default Key";

  if (!emailOrName) {
    console.log("Usage: npx tsx scripts/create-api-key.ts <email-or-name> [key-name]");
    console.log("Example: npx tsx scripts/create-api-key.ts chad@example.com 'My API Key'");
    process.exit(1);
  }

  // Find user
  const users = await db.query.users.findMany();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === emailOrName.toLowerCase() ||
      u.name.toLowerCase().includes(emailOrName.toLowerCase())
  );

  if (!user) {
    console.error(`User not found: ${emailOrName}`);
    console.log("Available users:");
    users.forEach((u) => console.log(`  - ${u.name} (${u.email})`));
    process.exit(1);
  }

  const apiKey = generateApiKey();
  const keyHash = hashKey(apiKey);
  const keyPrefix = apiKey.substring(0, 12);
  const keyId = uuidv4();

  await db.insert(schema.apiKeys).values({
    id: keyId,
    userId: user.id,
    name: keyName,
    keyHash,
    keyPrefix,
    scopes: ["ingest", "read"],
    isActive: true,
  });

  console.log(`\nAPI Key created for ${user.name} (${user.email})`);
  console.log(`Name: ${keyName}`);
  console.log(`Key:  ${apiKey}`);
  console.log(`\nSave this key - it cannot be retrieved again!`);
}

createApiKey()
  .catch(console.error)
  .finally(() => {
    sqlite.close();
    process.exit(0);
  });
