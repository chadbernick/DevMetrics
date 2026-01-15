import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, and, lte, desc } from "drizzle-orm";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import { verifyWebhookSignature, classifyCommitMessage } from "@/lib/integrations/github";
import { getUserIdByGitHubUsername, getGitHubWebhookSecret } from "@/lib/settings/github";

// Find matching session for a commit
// Matches by: userId + timestamp within session window + optional repository match
async function findSessionForCommit(
  userId: string,
  commitTimestamp: Date,
  repository?: string
): Promise<string | null> {
  // Define the time window: commit should be within session start and end (or now if active)
  // Also allow a 30-minute buffer after session ends for delayed commits
  const bufferMinutes = 30;

  // Find sessions that started before the commit and belong to this user
  const sessions = await db.query.sessions.findMany({
    where: and(
      eq(schema.sessions.userId, userId),
      // Session started before the commit
      lte(schema.sessions.startedAt, commitTimestamp)
    ),
    orderBy: [desc(schema.sessions.startedAt)],
    limit: 10,
  });

  for (const session of sessions) {
    // Calculate the end boundary (session end + buffer, or now if still active)
    let endBoundary: Date;
    if (session.endedAt) {
      endBoundary = new Date(session.endedAt.getTime() + bufferMinutes * 60 * 1000);
    } else if (session.status === "active") {
      // Active session - commit is valid if session started within last 24 hours
      const maxActiveHours = 24;
      endBoundary = new Date(session.startedAt.getTime() + maxActiveHours * 60 * 60 * 1000);
    } else {
      // Abandoned/completed without end time - use start + typical session length
      endBoundary = new Date(session.startedAt.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    }

    // Check if commit falls within the session window
    if (commitTimestamp <= endBoundary) {
      // If repository specified, try to match with session's project
      if (repository && session.projectName) {
        // Extract repo name from project path if needed
        const sessionRepo = session.projectName.split("/").pop()?.toLowerCase();
        const commitRepo = repository.toLowerCase();

        if (sessionRepo === commitRepo || session.projectName.toLowerCase().includes(commitRepo)) {
          return session.id;
        }
      }

      // If no repository to match or no project name, accept the session
      if (!repository || !session.projectName) {
        return session.id;
      }
    }
  }

  return null;
}

// Find user by email (GitHub author email)
async function findUserByEmail(email: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  return user?.id ?? null;
}

// Find user by GitHub username using the settings service
async function findUserByGithubUsername(username: string): Promise<string | null> {
  return getUserIdByGitHubUsername(username);
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

    // Get webhook secret from settings service
    const webhookSecret = await getGitHubWebhookSecret();

    // Verify signature if secret is configured
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Handle ping event (GitHub sends this when webhook is first configured)
    if (event === "ping") {
      return NextResponse.json({ message: "pong", zen: payload.zen });
    }

    const results: Array<{ type: string; id: string; sessionId?: string; aiAssisted?: boolean }> = [];

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

        const classification = classifyCommitMessage(commit.message);
        const timestamp = new Date(commit.timestamp);
        const filesChanged = commit.added.length + commit.modified.length + commit.removed.length;

        // Find matching session for this commit (AI-assisted correlation)
        const sessionId = await findSessionForCommit(userId, timestamp, repository);
        const isAiAssisted = sessionId !== null;

        // Create work item with session correlation
        const workItemId = uuidv4();
        await db.insert(schema.workItems).values({
          id: workItemId,
          userId,
          sessionId, // Now populated if we found a matching session
          timestamp,
          type: classification.type,
          source: "commit",
          sourceId: commit.id,
          title: commit.message.split("\n")[0].substring(0, 100),
          description: commit.message,
          aiClassified: true,
          confidence: classification.confidence,
        });

        // Create code metrics with session correlation
        await db.insert(schema.codeMetrics).values({
          id: uuidv4(),
          userId,
          sessionId, // Also link code metrics to session
          timestamp,
          linesAdded: commit.added.length * 10, // Estimate - GitHub doesn't give line counts in push events
          linesModified: commit.modified.length * 5,
          linesDeleted: commit.removed.length * 3,
          filesChanged,
          repository,
          branch,
        });

        // Update daily aggregate with AI-assisted commit tracking
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
          aiAssistedCommits: isAiAssisted ? 1 : 0,
        });

        results.push({
          type: "commit",
          id: workItemId,
          sessionId: sessionId ?? undefined,
          aiAssisted: isAiAssisted,
        });
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
