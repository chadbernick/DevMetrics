import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, and, sql } from "drizzle-orm";
import { createHmac } from "crypto";

// Helper to get date string
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return !secret; // Allow if no secret configured
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  return signature === expected;
}

// Upsert daily aggregate
async function upsertDailyAggregate(
  userId: string,
  date: string,
  updates: {
    sessions?: number;
    minutes?: number;
    inputTokens?: number;
    outputTokens?: number;
    tokenCost?: number;
    linesAdded?: number;
    linesModified?: number;
    linesDeleted?: number;
    filesChanged?: number;
    features?: number;
    bugs?: number;
    refactors?: number;
    prsCreated?: number;
    prsReviewed?: number;
    prsMerged?: number;
    hoursSaved?: number;
    value?: number;
  }
) {
  const aggregateId = `${userId}-${date}`;

  const existing = await db.query.dailyAggregates.findFirst({
    where: eq(schema.dailyAggregates.id, aggregateId),
  });

  if (existing) {
    await db
      .update(schema.dailyAggregates)
      .set({
        totalSessions: sql`${schema.dailyAggregates.totalSessions} + ${updates.sessions ?? 0}`,
        totalMinutes: sql`${schema.dailyAggregates.totalMinutes} + ${updates.minutes ?? 0}`,
        totalInputTokens: sql`${schema.dailyAggregates.totalInputTokens} + ${updates.inputTokens ?? 0}`,
        totalOutputTokens: sql`${schema.dailyAggregates.totalOutputTokens} + ${updates.outputTokens ?? 0}`,
        totalTokenCostUsd: sql`${schema.dailyAggregates.totalTokenCostUsd} + ${updates.tokenCost ?? 0}`,
        totalLinesAdded: sql`${schema.dailyAggregates.totalLinesAdded} + ${updates.linesAdded ?? 0}`,
        totalLinesModified: sql`${schema.dailyAggregates.totalLinesModified} + ${updates.linesModified ?? 0}`,
        totalLinesDeleted: sql`${schema.dailyAggregates.totalLinesDeleted} + ${updates.linesDeleted ?? 0}`,
        totalFilesChanged: sql`${schema.dailyAggregates.totalFilesChanged} + ${updates.filesChanged ?? 0}`,
        featuresCompleted: sql`${schema.dailyAggregates.featuresCompleted} + ${updates.features ?? 0}`,
        bugsFixed: sql`${schema.dailyAggregates.bugsFixed} + ${updates.bugs ?? 0}`,
        refactorsCompleted: sql`${schema.dailyAggregates.refactorsCompleted} + ${updates.refactors ?? 0}`,
        prsCreated: sql`${schema.dailyAggregates.prsCreated} + ${updates.prsCreated ?? 0}`,
        prsReviewed: sql`${schema.dailyAggregates.prsReviewed} + ${updates.prsReviewed ?? 0}`,
        prsMerged: sql`${schema.dailyAggregates.prsMerged} + ${updates.prsMerged ?? 0}`,
        estimatedHoursSaved: sql`${schema.dailyAggregates.estimatedHoursSaved} + ${updates.hoursSaved ?? 0}`,
        estimatedValueUsd: sql`${schema.dailyAggregates.estimatedValueUsd} + ${updates.value ?? 0}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.dailyAggregates.id, aggregateId));
  } else {
    await db.insert(schema.dailyAggregates).values({
      id: aggregateId,
      userId,
      date,
      totalSessions: updates.sessions ?? 0,
      totalMinutes: updates.minutes ?? 0,
      totalInputTokens: updates.inputTokens ?? 0,
      totalOutputTokens: updates.outputTokens ?? 0,
      totalTokenCostUsd: updates.tokenCost ?? 0,
      totalLinesAdded: updates.linesAdded ?? 0,
      totalLinesModified: updates.linesModified ?? 0,
      totalLinesDeleted: updates.linesDeleted ?? 0,
      totalFilesChanged: updates.filesChanged ?? 0,
      featuresCompleted: updates.features ?? 0,
      bugsFixed: updates.bugs ?? 0,
      refactorsCompleted: updates.refactors ?? 0,
      prsCreated: updates.prsCreated ?? 0,
      prsReviewed: updates.prsReviewed ?? 0,
      prsMerged: updates.prsMerged ?? 0,
      estimatedHoursSaved: updates.hoursSaved ?? 0,
      estimatedValueUsd: updates.value ?? 0,
    });
  }
}

// Classify commit type based on message
function classifyCommit(message: string): {
  type: "feature" | "bug_fix" | "refactor" | "docs" | "test" | "chore" | "other";
  confidence: number;
  hoursSaved: number;
} {
  const msg = message.toLowerCase();

  if (msg.includes("feat") || msg.includes("add") || msg.includes("implement") || msg.includes("new")) {
    return { type: "feature", confidence: 0.8, hoursSaved: 2 };
  }
  if (msg.includes("fix") || msg.includes("bug") || msg.includes("patch") || msg.includes("resolve")) {
    return { type: "bug_fix", confidence: 0.85, hoursSaved: 1.5 };
  }
  if (msg.includes("refactor") || msg.includes("clean") || msg.includes("restructure") || msg.includes("improve")) {
    return { type: "refactor", confidence: 0.75, hoursSaved: 3 };
  }
  if (msg.includes("doc") || msg.includes("readme") || msg.includes("comment")) {
    return { type: "docs", confidence: 0.9, hoursSaved: 0.5 };
  }
  if (msg.includes("test") || msg.includes("spec") || msg.includes("coverage")) {
    return { type: "test", confidence: 0.85, hoursSaved: 1 };
  }
  if (msg.includes("chore") || msg.includes("deps") || msg.includes("config") || msg.includes("build") || msg.includes("ci")) {
    return { type: "chore", confidence: 0.7, hoursSaved: 0.5 };
  }

  return { type: "other", confidence: 0.5, hoursSaved: 0.5 };
}

// Find user by email (GitHub author email)
async function findUserByEmail(email: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  return user?.id ?? null;
}

// Find user by GitHub username in settings or fall back to default
async function findUserByGithubUsername(username: string): Promise<string | null> {
  // Check settings for GitHub username mappings
  const setting = await db.query.settings.findFirst({
    where: eq(schema.settings.key, "github_user_mappings"),
  });

  if (setting?.value) {
    const mappings = setting.value as Record<string, string>;
    if (mappings[username]) {
      return mappings[username];
    }
  }

  return null;
}

// GitHub webhook types
interface GitHubPushEvent {
  ref: string;
  repository: {
    name: string;
    full_name: string;
  };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  pusher: {
    name: string;
    email: string;
  };
  sender: {
    login: string;
  };
}

interface GitHubPullRequestEvent {
  action: "opened" | "closed" | "reopened" | "synchronize" | "review_requested" | "submitted";
  number: number;
  pull_request: {
    title: string;
    body: string | null;
    merged: boolean;
    additions: number;
    deletions: number;
    changed_files: number;
    user: {
      login: string;
    };
  };
  repository: {
    name: string;
    full_name: string;
  };
  sender: {
    login: string;
  };
}

interface GitHubPullRequestReviewEvent {
  action: "submitted" | "edited" | "dismissed";
  review: {
    state: "approved" | "changes_requested" | "commented";
    user: {
      login: string;
    };
  };
  pull_request: {
    number: number;
    title: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
  sender: {
    login: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("X-Hub-Signature-256");
    const event = request.headers.get("X-GitHub-Event");

    // Get webhook secret from settings (optional)
    const secretSetting = await db.query.settings.findFirst({
      where: eq(schema.settings.key, "github_webhook_secret"),
    });
    const webhookSecret = (secretSetting?.value as string) || "";

    // Verify signature if secret is configured
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Handle ping event (GitHub sends this when webhook is first configured)
    if (event === "ping") {
      return NextResponse.json({ message: "pong", zen: payload.zen });
    }

    const results: Array<{ type: string; id: string }> = [];

    // Handle push events (commits)
    if (event === "push") {
      const pushEvent = payload as GitHubPushEvent;
      const repository = pushEvent.repository.name;
      const branch = pushEvent.ref.replace("refs/heads/", "");

      for (const commit of pushEvent.commits) {
        // Try to find user by email or GitHub username
        let userId = await findUserByEmail(commit.author.email);
        if (!userId && commit.author.username) {
          userId = await findUserByGithubUsername(commit.author.username);
        }
        if (!userId) {
          userId = await findUserByGithubUsername(pushEvent.sender.login);
        }

        // Skip if we can't identify the user
        if (!userId) continue;

        const classification = classifyCommit(commit.message);
        const timestamp = new Date(commit.timestamp);
        const filesChanged = commit.added.length + commit.modified.length + commit.removed.length;

        // Create work item
        const workItemId = uuidv4();
        await db.insert(schema.workItems).values({
          id: workItemId,
          userId,
          timestamp,
          type: classification.type,
          source: "commit",
          sourceId: commit.id,
          title: commit.message.split("\n")[0].substring(0, 100),
          description: commit.message,
          aiClassified: true,
          confidence: classification.confidence,
        });

        // Create code metrics
        await db.insert(schema.codeMetrics).values({
          id: uuidv4(),
          userId,
          timestamp,
          linesAdded: commit.added.length * 10, // Estimate - GitHub doesn't give line counts in push events
          linesModified: commit.modified.length * 5,
          linesDeleted: commit.removed.length * 3,
          filesChanged,
          repository,
          branch,
        });

        // Update daily aggregate
        await upsertDailyAggregate(userId, getDateString(timestamp), {
          features: classification.type === "feature" ? 1 : 0,
          bugs: classification.type === "bug_fix" ? 1 : 0,
          refactors: classification.type === "refactor" ? 1 : 0,
          linesAdded: commit.added.length * 10,
          linesModified: commit.modified.length * 5,
          linesDeleted: commit.removed.length * 3,
          filesChanged,
          hoursSaved: classification.hoursSaved,
          value: classification.hoursSaved * 100,
        });

        results.push({ type: "commit", id: workItemId });
      }
    }

    // Handle pull request events
    if (event === "pull_request") {
      const prEvent = payload as GitHubPullRequestEvent;
      const repository = prEvent.repository.name;
      const prNumber = prEvent.number;
      const timestamp = new Date();

      // Find user
      let userId = await findUserByGithubUsername(prEvent.sender.login);
      if (!userId) {
        userId = await findUserByGithubUsername(prEvent.pull_request.user.login);
      }

      if (userId) {
        let action: "created" | "reviewed" | "merged" | "closed" | "commented" | null = null;

        if (prEvent.action === "opened") {
          action = "created";
        } else if (prEvent.action === "closed" && prEvent.pull_request.merged) {
          action = "merged";
        } else if (prEvent.action === "closed") {
          action = "closed";
        }

        if (action) {
          const activityId = uuidv4();
          await db.insert(schema.prActivity).values({
            id: activityId,
            userId,
            timestamp,
            prNumber,
            repository,
            title: prEvent.pull_request.title,
            action,
            aiAssisted: false,
          });

          // Update daily aggregate
          await upsertDailyAggregate(userId, getDateString(timestamp), {
            prsCreated: action === "created" ? 1 : 0,
            prsMerged: action === "merged" ? 1 : 0,
          });

          // If PR is merged, also track the code changes
          if (action === "merged") {
            await db.insert(schema.codeMetrics).values({
              id: uuidv4(),
              userId,
              timestamp,
              linesAdded: prEvent.pull_request.additions,
              linesModified: 0,
              linesDeleted: prEvent.pull_request.deletions,
              filesChanged: prEvent.pull_request.changed_files,
              repository,
            });

            await upsertDailyAggregate(userId, getDateString(timestamp), {
              linesAdded: prEvent.pull_request.additions,
              linesDeleted: prEvent.pull_request.deletions,
              filesChanged: prEvent.pull_request.changed_files,
            });
          }

          results.push({ type: "pr_activity", id: activityId });
        }
      }
    }

    // Handle pull request review events
    if (event === "pull_request_review") {
      const reviewEvent = payload as GitHubPullRequestReviewEvent;
      const repository = reviewEvent.repository.name;
      const timestamp = new Date();

      const userId = await findUserByGithubUsername(reviewEvent.sender.login);

      if (userId && reviewEvent.action === "submitted") {
        const activityId = uuidv4();
        await db.insert(schema.prActivity).values({
          id: activityId,
          userId,
          timestamp,
          prNumber: reviewEvent.pull_request.number,
          repository,
          title: reviewEvent.pull_request.title,
          action: "reviewed",
          aiAssisted: false,
        });

        await upsertDailyAggregate(userId, getDateString(timestamp), {
          prsReviewed: 1,
        });

        results.push({ type: "pr_review", id: activityId });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint for health check and webhook info
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "github-webhook",
    supportedEvents: ["push", "pull_request", "pull_request_review", "ping"],
    documentation: "Configure this URL as a GitHub webhook to track commits and PRs",
  });
}
