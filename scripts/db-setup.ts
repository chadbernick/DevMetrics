/**
 * Database Setup Script
 *
 * Handles initial database setup:
 * - Creates schema if needed
 * - Prompts for admin user creation on first run
 * - Seeds required configuration data (model pricing, cost config)
 *
 * Usage: npm run db:setup
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";
import * as readline from "readline";

const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "dashboard.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// ============================================
// READLINE HELPERS
// ============================================

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function questionHidden(
  rl: readline.Interface,
  prompt: string
): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    stdin.setRawMode(true);
    stdin.resume();

    let password = "";
    const onData = (char: Buffer) => {
      const c = char.toString("utf8");

      switch (c) {
        case "\n":
        case "\r":
        case "\u0004": // Ctrl-D
          stdin.setRawMode(wasRaw);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          break;
        case "\u0003": // Ctrl-C
          process.exit();
          break;
        case "\u007F": // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(prompt + "*".repeat(password.length));
          }
          break;
        default:
          password += c;
          process.stdout.write("*");
          break;
      }
    };

    stdin.on("data", onData);
  });
}

// ============================================
// PASSWORD HASHING
// ============================================

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// ============================================
// ADMIN USER CREATION
// ============================================

async function promptForAdminUser(): Promise<{
  name: string;
  email: string;
  password: string;
} | null> {
  const rl = createReadlineInterface();

  console.log("\n========================================");
  console.log("   Initial Admin User Setup");
  console.log("========================================\n");

  try {
    const name = await question(rl, "Admin Name: ");
    if (!name) {
      console.log("Name is required. Aborting.");
      rl.close();
      return null;
    }

    const email = await question(rl, "Admin Email: ");
    if (!email || !email.includes("@")) {
      console.log("Valid email is required. Aborting.");
      rl.close();
      return null;
    }

    const password = await questionHidden(rl, "Admin Password: ");
    if (!password || password.length < 8) {
      console.log("Password must be at least 8 characters. Aborting.");
      rl.close();
      return null;
    }

    const confirmPassword = await questionHidden(rl, "Confirm Password: ");
    if (password !== confirmPassword) {
      console.log("Passwords do not match. Aborting.");
      rl.close();
      return null;
    }

    rl.close();
    return { name, email, password };
  } catch (error) {
    rl.close();
    throw error;
  }
}

// ============================================
// SEED DATA
// ============================================

async function seedModelPricing(): Promise<void> {
  // Check if pricing already exists
  const existingPricing = await db.query.modelPricing.findFirst();
  if (existingPricing) {
    console.log("  Model pricing already exists, skipping...");
    return;
  }

  const modelPricingData = [
    // Claude models (Anthropic)
    {
      id: uuidv4(),
      modelPattern: "claude-3-opus",
      displayName: "Claude 3 Opus",
      provider: "anthropic" as const,
      inputPrice: 15.0,
      outputPrice: 75.0,
      thinkingPrice: 75.0,
      cacheWritePrice: 18.75,
      cacheReadPrice: 1.5,
    },
    {
      id: uuidv4(),
      modelPattern: "claude-3.5-sonnet|claude-3-5-sonnet",
      displayName: "Claude 3.5 Sonnet",
      provider: "anthropic" as const,
      inputPrice: 3.0,
      outputPrice: 15.0,
      thinkingPrice: 15.0,
      cacheWritePrice: 3.75,
      cacheReadPrice: 0.3,
    },
    {
      id: uuidv4(),
      modelPattern: "claude-sonnet-4|claude-4-sonnet",
      displayName: "Claude Sonnet 4",
      provider: "anthropic" as const,
      inputPrice: 3.0,
      outputPrice: 15.0,
      thinkingPrice: 15.0,
      cacheWritePrice: 3.75,
      cacheReadPrice: 0.3,
    },
    {
      id: uuidv4(),
      modelPattern: "claude-opus-4|claude-4-opus",
      displayName: "Claude Opus 4",
      provider: "anthropic" as const,
      inputPrice: 15.0,
      outputPrice: 75.0,
      thinkingPrice: 75.0,
      cacheWritePrice: 18.75,
      cacheReadPrice: 1.5,
    },
    {
      id: uuidv4(),
      modelPattern: "claude-3-haiku|claude-3.5-haiku",
      displayName: "Claude 3 Haiku",
      provider: "anthropic" as const,
      inputPrice: 0.25,
      outputPrice: 1.25,
      thinkingPrice: 1.25,
      cacheWritePrice: 0.3,
      cacheReadPrice: 0.03,
    },
    // OpenAI models
    {
      id: uuidv4(),
      modelPattern: "gpt-4o",
      displayName: "GPT-4o",
      provider: "openai" as const,
      inputPrice: 2.5,
      outputPrice: 10.0,
      thinkingPrice: 0,
      cacheWritePrice: 0,
      cacheReadPrice: 1.25,
    },
    {
      id: uuidv4(),
      modelPattern: "gpt-4-turbo|gpt-4",
      displayName: "GPT-4 Turbo",
      provider: "openai" as const,
      inputPrice: 10.0,
      outputPrice: 30.0,
      thinkingPrice: 0,
      cacheWritePrice: 0,
      cacheReadPrice: 0,
    },
    {
      id: uuidv4(),
      modelPattern: "o1|o1-preview",
      displayName: "O1",
      provider: "openai" as const,
      inputPrice: 15.0,
      outputPrice: 60.0,
      thinkingPrice: 60.0,
      cacheWritePrice: 0,
      cacheReadPrice: 7.5,
    },
    {
      id: uuidv4(),
      modelPattern: "o3-mini",
      displayName: "O3 Mini",
      provider: "openai" as const,
      inputPrice: 1.1,
      outputPrice: 4.4,
      thinkingPrice: 4.4,
      cacheWritePrice: 0,
      cacheReadPrice: 0.55,
    },
    // Google models
    {
      id: uuidv4(),
      modelPattern: "gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash",
      provider: "google" as const,
      inputPrice: 0.1,
      outputPrice: 0.4,
      thinkingPrice: 0.4,
      cacheWritePrice: 0,
      cacheReadPrice: 0.025,
    },
    {
      id: uuidv4(),
      modelPattern: "gemini-1.5-pro",
      displayName: "Gemini 1.5 Pro",
      provider: "google" as const,
      inputPrice: 1.25,
      outputPrice: 5.0,
      thinkingPrice: 0,
      cacheWritePrice: 0,
      cacheReadPrice: 0.315,
    },
  ];

  for (const pricing of modelPricingData) {
    await db.insert(schema.modelPricing).values(pricing);
  }
  console.log("  Created model pricing configuration");
}

async function seedCostConfig(): Promise<void> {
  // Check if cost config already exists
  const existingConfig = await db.query.costConfig.findFirst();
  if (existingConfig) {
    console.log("  Cost configuration already exists, skipping...");
    return;
  }

  await db.insert(schema.costConfig).values({
    id: uuidv4(),
    name: "Default",
    isActive: true,
  });
  console.log("  Created default cost configuration");
}

// ============================================
// MAIN SETUP
// ============================================

async function setup(): Promise<void> {
  console.log("\n========================================");
  console.log("   Developer Dashboard - Database Setup");
  console.log("========================================\n");

  // Check if any users exist
  const existingUsers = await db.query.users.findMany();

  if (existingUsers.length === 0) {
    console.log("No users found. This appears to be a fresh installation.\n");

    const adminData = await promptForAdminUser();
    if (!adminData) {
      console.log("\nSetup cancelled. No admin user created.");
      return;
    }

    // Create admin user
    const adminId = uuidv4();
    await db.insert(schema.users).values({
      id: adminId,
      email: adminData.email,
      name: adminData.name,
      password: hashPassword(adminData.password),
      role: "admin",
      engineerLevel: "senior",
      isActive: true,
    });

    console.log(`\nAdmin user "${adminData.name}" created successfully.`);
  } else {
    console.log(`Found ${existingUsers.length} existing user(s).`);

    // List admins
    const admins = existingUsers.filter((u) => u.role === "admin");
    if (admins.length > 0) {
      console.log("\nCurrent admin users:");
      admins.forEach((admin) => {
        console.log(`  - ${admin.name} (${admin.email})`);
      });
    }
  }

  console.log("\nSeeding required configuration data...");
  await seedModelPricing();
  await seedCostConfig();

  console.log("\n========================================");
  console.log("   Setup Complete!");
  console.log("========================================\n");
}

setup()
  .catch(console.error)
  .finally(() => {
    sqlite.close();
    process.exit(0);
  });
