import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "dashboard.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding database...");

  // Create a team
  const teamId = uuidv4();
  await db.insert(schema.teams).values({
    id: teamId,
    name: "Engineering Team",
    description: "Main development team",
  });
  console.log("✓ Created team");

  // Create users
  const users = [
    { name: "Alex Chen", email: "alex@example.com", level: "senior" as const, role: "admin" as const },
    { name: "Jordan Smith", email: "jordan@example.com", level: "mid" as const, role: "developer" as const },
    { name: "Sam Taylor", email: "sam@example.com", level: "junior" as const, role: "developer" as const },
    { name: "Casey Johnson", email: "casey@example.com", level: "staff" as const, role: "developer" as const },
  ];

  const userIds: string[] = [];
  for (const user of users) {
    const userId = uuidv4();
    userIds.push(userId);
    await db.insert(schema.users).values({
      id: userId,
      email: user.email,
      name: user.name,
      engineerLevel: user.level,
      role: user.role,
      teamId: teamId,
    });
  }
  console.log("✓ Created users");

  // Create default cost config
  const costConfigId = uuidv4();
  await db.insert(schema.costConfig).values({
    id: costConfigId,
    name: "Default",
    isActive: true,
  });
  console.log("✓ Created cost configuration");

  // Create model pricing
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
  console.log("✓ Created model pricing configuration");

  // Generate sample data for the past 30 days
  const now = new Date();
  const tools: Array<"claude_code" | "kiro" | "codex" | "copilot"> = ["claude_code", "kiro", "codex", "copilot"];
  const workTypes: Array<"feature" | "bug_fix" | "refactor" | "docs" | "test"> = ["feature", "bug_fix", "refactor", "docs", "test"];
  const complexities: Array<"trivial" | "simple" | "medium" | "complex" | "very_complex"> = ["trivial", "simple", "medium", "complex", "very_complex"];

  for (let day = 30; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split("T")[0];

    for (const userId of userIds) {
      // Random number of sessions per day (0-4)
      const numSessions = Math.floor(Math.random() * 5);

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
        const durationMinutes = 15 + Math.floor(Math.random() * 120);
        dailyMinutes += durationMinutes;

        const startTime = new Date(date);
        startTime.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);

        await db.insert(schema.sessions).values({
          id: sessionId,
          userId,
          tool,
          model: tool === "claude_code" ? "claude-3-opus" : tool === "codex" ? "gpt-4" : "unknown",
          startedAt: startTime,
          endedAt: endTime,
          durationMinutes,
          status: "completed",
          projectName: "main-app",
        });

        // Token usage
        const inputTokens = 500 + Math.floor(Math.random() * 5000);
        const outputTokens = 200 + Math.floor(Math.random() * 3000);
        const inputCost = (inputTokens / 1000000) * 3; // $3 per 1M tokens
        const outputCost = (outputTokens / 1000000) * 15; // $15 per 1M tokens
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
          model: tool === "claude_code" ? "claude-3-opus" : "gpt-4",
        });

        // Code metrics
        const linesAdded = Math.floor(Math.random() * 200);
        const linesModified = Math.floor(Math.random() * 100);
        const linesDeleted = Math.floor(Math.random() * 50);
        const filesChanged = 1 + Math.floor(Math.random() * 10);
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
          language: ["typescript", "javascript", "python", "go"][Math.floor(Math.random() * 4)],
          repository: "main-app",
          branch: "main",
        });

        // Work items (random chance)
        if (Math.random() > 0.5) {
          const workType = workTypes[Math.floor(Math.random() * workTypes.length)];
          const complexity = complexities[Math.floor(Math.random() * complexities.length)];

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
            title: `${workType.replace("_", " ")} - ${["user auth", "api endpoint", "dashboard", "data sync", "performance"][Math.floor(Math.random() * 5)]}`,
            complexity,
            estimatedHours: { trivial: 0.5, simple: 1, medium: 2, complex: 4, very_complex: 8 }[complexity],
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
            repository: "main-app",
            title: "Update feature implementation",
            action: "created",
            aiAssisted: true,
            sessionId,
          });
        }
      }

      // Create daily aggregate
      if (numSessions > 0) {
        // Calculate estimated value based on work done
        const baseHoursSaved =
          dailyFeatures * 2 + // 2 hours saved per feature
          dailyBugs * 1.5 + // 1.5 hours saved per bug
          dailyRefactors * 3; // 3 hours saved per refactor

        const estimatedValue = baseHoursSaved * 100; // $100/hour avg

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

  console.log("✓ Created sample sessions, token usage, code metrics, work items, and aggregates");
  console.log("✓ Database seeded successfully!");
}

seed()
  .catch(console.error)
  .finally(() => {
    sqlite.close();
    process.exit(0);
  });
