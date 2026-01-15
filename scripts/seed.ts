/**
 * Database Seed Script
 *
 * This script manages mock/sample data:
 * - Clears all mock data (users with @example.com emails and their associated data)
 * - Preserves real users (like Chad Bernick)
 * - Can optionally generate fresh sample data with --sample flag
 *
 * Usage:
 *   npm run db:seed              # Clear mock data only
 *   npm run db:seed -- --sample  # Clear mock data and generate new sample data
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { like, inArray, eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "dashboard.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// Check for --sample flag
const generateSampleData = process.argv.includes("--sample");

// ============================================
// CLEAR MOCK DATA
// ============================================

async function clearMockData(): Promise<void> {
  console.log("\nClearing mock data...\n");

  // Find all mock users (those with @example.com emails)
  const mockUsers = await db.query.users.findMany({
    where: like(schema.users.email, "%@example.com"),
  });

  if (mockUsers.length === 0) {
    console.log("  No mock users found to clear.");
    return;
  }

  const mockUserIds = mockUsers.map((u) => u.id);
  console.log(`  Found ${mockUsers.length} mock user(s) to remove:`);
  mockUsers.forEach((u) => console.log(`    - ${u.name} (${u.email})`));

  // Delete associated data (cascade should handle most, but let's be explicit)
  // Note: Foreign key cascades should handle most of this, but being explicit ensures cleanup

  console.log("\n  Clearing associated data...");

  // Clear daily aggregates for mock users
  const deletedAggregates = await db
    .delete(schema.dailyAggregates)
    .where(inArray(schema.dailyAggregates.userId, mockUserIds));
  console.log(`    - Daily aggregates cleared`);

  // Clear PR activity for mock users
  const deletedPRs = await db
    .delete(schema.prActivity)
    .where(inArray(schema.prActivity.userId, mockUserIds));
  console.log(`    - PR activity cleared`);

  // Clear work items for mock users
  const deletedWorkItems = await db
    .delete(schema.workItems)
    .where(inArray(schema.workItems.userId, mockUserIds));
  console.log(`    - Work items cleared`);

  // Clear code metrics for mock users
  const deletedCodeMetrics = await db
    .delete(schema.codeMetrics)
    .where(inArray(schema.codeMetrics.userId, mockUserIds));
  console.log(`    - Code metrics cleared`);

  // Clear token usage for mock users
  const deletedTokenUsage = await db
    .delete(schema.tokenUsage)
    .where(inArray(schema.tokenUsage.userId, mockUserIds));
  console.log(`    - Token usage cleared`);

  // Clear tool calls for mock users
  const deletedToolCalls = await db
    .delete(schema.toolCalls)
    .where(inArray(schema.toolCalls.userId, mockUserIds));
  console.log(`    - Tool calls cleared`);

  // Clear code edit decisions for mock users
  const deletedEditDecisions = await db
    .delete(schema.codeEditDecisions)
    .where(inArray(schema.codeEditDecisions.userId, mockUserIds));
  console.log(`    - Code edit decisions cleared`);

  // Clear sessions for mock users
  const deletedSessions = await db
    .delete(schema.sessions)
    .where(inArray(schema.sessions.userId, mockUserIds));
  console.log(`    - Sessions cleared`);

  // Clear API keys for mock users
  const deletedApiKeys = await db
    .delete(schema.apiKeys)
    .where(inArray(schema.apiKeys.userId, mockUserIds));
  console.log(`    - API keys cleared`);

  // Clear invitations created by mock users
  const deletedInvitations = await db
    .delete(schema.invitations)
    .where(inArray(schema.invitations.createdBy, mockUserIds));
  console.log(`    - Invitations cleared`);

  // Finally, delete the mock users themselves
  const deletedUsers = await db
    .delete(schema.users)
    .where(inArray(schema.users.id, mockUserIds));
  console.log(`\n  Removed ${mockUsers.length} mock user(s)`);

  // Also clear the "Engineering Team" mock team if it exists and has no remaining members
  const engineeringTeam = await db.query.teams.findFirst({
    where: eq(schema.teams.name, "Engineering Team"),
  });

  if (engineeringTeam) {
    const teamMembers = await db.query.users.findFirst({
      where: eq(schema.users.teamId, engineeringTeam.id),
    });

    if (!teamMembers) {
      await db.delete(schema.teams).where(eq(schema.teams.id, engineeringTeam.id));
      console.log(`  Removed empty mock team "Engineering Team"`);
    }
  }
}

// ============================================
// GENERATE SAMPLE DATA
// ============================================

async function generateSample(): Promise<void> {
  console.log("\nGenerating sample data...\n");

  // Check if there are any real users to attach sample data to
  const realUsers = await db.query.users.findMany({
    where: (users, { not, like }) => not(like(users.email, "%@example.com")),
  });

  if (realUsers.length === 0) {
    console.log(
      "  No real users found. Run 'npm run db:setup' to create an admin user first."
    );
    return;
  }

  console.log(`  Generating sample data for ${realUsers.length} user(s)...`);

  const userIds = realUsers.map((u) => u.id);
  const tools: Array<"claude_code" | "kiro" | "codex" | "copilot" | "gemini"> = [
    "claude_code",
    "kiro",
    "codex",
    "copilot",
    "gemini",
  ];
  const workTypes: Array<"feature" | "bug_fix" | "refactor" | "docs" | "test"> =
    ["feature", "bug_fix", "refactor", "docs", "test"];
  const complexities: Array<
    "trivial" | "simple" | "medium" | "complex" | "very_complex"
  > = ["trivial", "simple", "medium", "complex", "very_complex"];

  const now = new Date();

  // Generate 14 days of sample data (reduced from 30)
  for (let day = 14; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split("T")[0];

    for (const userId of userIds) {
      // Random number of sessions per day (0-3)
      const numSessions = Math.floor(Math.random() * 4);

      let dailyInputTokens = 0;
      let dailyOutputTokens = 0;
      let dailyCost = 0;
      let dailyLinesAdded = 0;
      let dailyLinesModified = 0;
      let dailyLinesDeleted = 0;
      let dailyFilesChanged = 0;
      let dailyMinutes = 0;
      let dailyFeatures = 0;
      let dailyBugs = 0;
      let dailyRefactors = 0;
      let dailyPRsCreated = 0;

      for (let s = 0; s < numSessions; s++) {
        const sessionId = uuidv4();
        const tool = tools[Math.floor(Math.random() * tools.length)];
        const durationMinutes = 15 + Math.floor(Math.random() * 90);
        dailyMinutes += durationMinutes;

        const startTime = new Date(date);
        startTime.setHours(
          9 + Math.floor(Math.random() * 8),
          Math.floor(Math.random() * 60)
        );
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);

        await db.insert(schema.sessions).values({
          id: sessionId,
          userId,
          tool,
          model:
            tool === "claude_code"
              ? "claude-sonnet-4"
              : tool === "gemini"
                ? "gemini-2.0-flash"
                : tool === "codex"
                  ? "gpt-4o"
                  : "unknown",
          startedAt: startTime,
          endedAt: endTime,
          durationMinutes,
          status: "completed",
          projectName: "sample-project",
        });

        // Token usage
        const inputTokens = 500 + Math.floor(Math.random() * 3000);
        const outputTokens = 200 + Math.floor(Math.random() * 2000);
        const inputCost = (inputTokens / 1000000) * 3;
        const outputCost = (outputTokens / 1000000) * 15;
        dailyInputTokens += inputTokens;
        dailyOutputTokens += outputTokens;
        dailyCost += inputCost + outputCost;

        await db.insert(schema.tokenUsage).values({
          id: uuidv4(),
          sessionId,
          userId,
          timestamp: startTime,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          inputCostUsd: inputCost,
          outputCostUsd: outputCost,
          totalCostUsd: inputCost + outputCost,
          tool,
          model:
            tool === "claude_code"
              ? "claude-sonnet-4"
              : tool === "gemini"
                ? "gemini-2.0-flash"
                : "gpt-4o",
        });

        // Code metrics
        const linesAdded = Math.floor(Math.random() * 150);
        const linesModified = Math.floor(Math.random() * 75);
        const linesDeleted = Math.floor(Math.random() * 40);
        const filesChanged = 1 + Math.floor(Math.random() * 8);
        dailyLinesAdded += linesAdded;
        dailyLinesModified += linesModified;
        dailyLinesDeleted += linesDeleted;
        dailyFilesChanged += filesChanged;

        await db.insert(schema.codeMetrics).values({
          id: uuidv4(),
          sessionId,
          userId,
          timestamp: startTime,
          linesAdded,
          linesModified,
          linesDeleted,
          filesChanged,
          language: ["typescript", "javascript", "python", "go"][
            Math.floor(Math.random() * 4)
          ],
          repository: "sample-project",
          branch: "main",
        });

        // Work items (random chance)
        if (Math.random() > 0.5) {
          const workType =
            workTypes[Math.floor(Math.random() * workTypes.length)];
          const complexity =
            complexities[Math.floor(Math.random() * complexities.length)];

          if (workType === "feature") dailyFeatures++;
          else if (workType === "bug_fix") dailyBugs++;
          else if (workType === "refactor") dailyRefactors++;

          await db.insert(schema.workItems).values({
            id: uuidv4(),
            sessionId,
            userId,
            timestamp: endTime,
            type: workType,
            source: "commit",
            sourceId: uuidv4().substring(0, 8),
            title: `${workType.replace("_", " ")} - sample task`,
            complexity,
            estimatedHours:
              { trivial: 0.5, simple: 1, medium: 2, complex: 4, very_complex: 8 }[
                complexity
              ],
          });
        }

        // PR activity (random chance)
        if (Math.random() > 0.7) {
          dailyPRsCreated++;
          await db.insert(schema.prActivity).values({
            id: uuidv4(),
            userId,
            timestamp: endTime,
            prNumber: 100 + Math.floor(Math.random() * 500),
            repository: "sample-project",
            title: "Sample pull request",
            action: "created",
            aiAssisted: true,
            sessionId,
          });
        }
      }

      // Create daily aggregate if there were sessions
      if (numSessions > 0) {
        const baseHoursSaved =
          dailyFeatures * 2 + dailyBugs * 1.5 + dailyRefactors * 3;
        const estimatedValue = baseHoursSaved * 100;

        await db.insert(schema.dailyAggregates).values({
          id: `${userId}-${dateStr}`,
          userId,
          date: dateStr,
          totalSessions: numSessions,
          totalMinutes: dailyMinutes,
          totalInputTokens: dailyInputTokens,
          totalOutputTokens: dailyOutputTokens,
          totalTokenCostUsd: dailyCost,
          totalLinesAdded: dailyLinesAdded,
          totalLinesModified: dailyLinesModified,
          totalLinesDeleted: dailyLinesDeleted,
          totalFilesChanged: dailyFilesChanged,
          featuresCompleted: dailyFeatures,
          bugsFixed: dailyBugs,
          refactorsCompleted: dailyRefactors,
          prsCreated: dailyPRsCreated,
          prsReviewed: 0,
          prsMerged: 0,
          estimatedHoursSaved: baseHoursSaved,
          estimatedValueUsd: estimatedValue,
        });
      }
    }
  }

  console.log("  Generated 14 days of sample data");
}

// ============================================
// MAIN
// ============================================

async function seed(): Promise<void> {
  console.log("\n========================================");
  console.log("   Developer Dashboard - Seed Script");
  console.log("========================================");

  // Always clear mock data first
  await clearMockData();

  // Only generate sample data if --sample flag is provided
  if (generateSampleData) {
    await generateSample();
  } else {
    console.log("\n  Tip: Use 'npm run db:seed -- --sample' to generate sample data");
  }

  console.log("\n========================================");
  console.log("   Seed Complete!");
  console.log("========================================\n");
}

seed()
  .catch(console.error)
  .finally(() => {
    sqlite.close();
    process.exit(0);
  });
