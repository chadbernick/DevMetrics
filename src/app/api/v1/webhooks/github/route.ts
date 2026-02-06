import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, and, lte, desc } from "drizzle-orm";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import { verifyWebhookSignature, classifyCommitMessage } from "@/lib/integrations/github";
import { getUserIdByGitHubUsername, getGitHubWebhookSecret } from "@/lib/settings/github";
import { correlateDeployment } from "@/lib/correlations/deployment-session";

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

interface GitHubDeploymentStatusEvent {
  action: "created";
  deployment_status: {
    state: "error" | "failure" | "inactive" | "in_progress" | "queued" | "pending" | "success";
    description: string | null;
    environment: string;
    target_url: string | null;
    created_at: string;
    updated_at: string;
    deployment_url: string;
    repository_url: string;
  };
  deployment: {
    id: number;
    sha: string;
    ref: string;
    environment: string;
    description: string | null;
    creator: {
      login: string;
    };
    created_at: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
  sender: {
    login: string;
  };
}

interface GitHubWorkflowRunEvent {
  action: "completed" | "requested" | "in_progress";
  workflow_run: {
    id: number;
    name: string;
    head_sha: string;
    head_branch: string;
    status: "completed" | "in_progress" | "queued";
    conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
    html_url: string;
    run_started_at: string;
    updated_at: string;
    actor: {
      login: string;
    };
    triggering_actor: {
      login: string;
    };
    pull_requests: Array<{
      number: number;
    }>;
  };
  workflow: {
    id: number;
    name: string;
    path: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
  sender: {
    login: string;
  };
}

interface GitHubIssuesEvent {
  action: "opened" | "closed" | "reopened" | "labeled" | "unlabeled";
  issue: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    html_url: string;
    state: "open" | "closed";
    labels: Array<{
      name: string;
    }>;
    user: {
      login: string;
    };
    created_at: string;
    closed_at: string | null;
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

    // Handle deployment_status events (for DORA Deploy Frequency)
    if (event === "deployment_status") {
      const deployEvent = payload as GitHubDeploymentStatusEvent;
      const repository = deployEvent.repository.full_name;
      const timestamp = new Date(deployEvent.deployment_status.created_at);

      // Only track terminal states
      const terminalStates = ["success", "failure", "error"];
      if (terminalStates.includes(deployEvent.deployment_status.state)) {
        const userId = await findUserByGithubUsername(deployEvent.deployment.creator.login);

        // Map GitHub deployment state to our status
        let status: "success" | "failure" | "pending" | "cancelled" = "pending";
        if (deployEvent.deployment_status.state === "success") {
          status = "success";
        } else if (["failure", "error"].includes(deployEvent.deployment_status.state)) {
          status = "failure";
        }

        // Map environment name
        let environment: "production" | "staging" | "preview" | "development" = "development";
        const envLower = deployEvent.deployment_status.environment.toLowerCase();
        if (envLower.includes("prod")) {
          environment = "production";
        } else if (envLower.includes("stag")) {
          environment = "staging";
        } else if (envLower.includes("preview") || envLower.includes("pr-")) {
          environment = "preview";
        }

        const deploymentId = uuidv4();
        await db.insert(schema.deployments).values({
          id: deploymentId,
          userId,
          timestamp,
          environment,
          status,
          sha: deployEvent.deployment.sha,
          ref: deployEvent.deployment.ref,
          repository,
          source: "github_actions",
          deploymentUrl: deployEvent.deployment_status.target_url || undefined,
          createdAt: new Date(),
        });

        // Update daily aggregate if we have a user
        if (userId) {
          await upsertDailyAggregate(userId, getDateString(timestamp), {
            deploymentsTotal: 1,
            deploymentsSuccess: status === "success" ? 1 : 0,
            deploymentsFailed: status === "failure" ? 1 : 0,
          });
        }

        // Try to correlate deployment with AI session via PR
        // Note: deployment_status events don't have PR info, but workflow_run does
        // This will be populated if we have a linked PR activity

        // If deployment failed in production, create an incident
        if (status === "failure" && environment === "production") {
          const incidentId = uuidv4();
          await db.insert(schema.incidents).values({
            id: incidentId,
            source: "deployment_failure",
            sourceId: deployEvent.deployment.id.toString(),
            sourceUrl: deployEvent.deployment_status.target_url || undefined,
            title: `Deployment failed: ${deployEvent.deployment.sha.substring(0, 7)}`,
            description: deployEvent.deployment_status.description || undefined,
            repository,
            environment,
            severity: "high",
            status: "open",
            deploymentId,
            userId,
            createdAt: timestamp,
          });

          if (userId) {
            await upsertDailyAggregate(userId, getDateString(timestamp), {
              incidentsOpened: 1,
            });
          }

          results.push({ type: "incident", id: incidentId });
        }

        results.push({ type: "deployment", id: deploymentId });
      }
    }

    // Handle workflow_run events (alternative deployment tracking via CI/CD)
    if (event === "workflow_run") {
      const workflowEvent = payload as GitHubWorkflowRunEvent;
      const repository = workflowEvent.repository.full_name;

      // Only process completed workflows
      if (workflowEvent.action === "completed" && workflowEvent.workflow_run.conclusion) {
        const timestamp = new Date(workflowEvent.workflow_run.updated_at);
        const userId = await findUserByGithubUsername(workflowEvent.workflow_run.actor.login);

        // Check if this is a deployment workflow (common naming patterns)
        const workflowName = workflowEvent.workflow.name.toLowerCase();
        const isDeployWorkflow =
          workflowName.includes("deploy") ||
          workflowName.includes("release") ||
          workflowName.includes("cd") ||
          workflowEvent.workflow.path.includes("deploy");

        if (isDeployWorkflow) {
          // Determine environment from workflow name or branch
          let environment: "production" | "staging" | "preview" | "development" = "development";
          const branchLower = workflowEvent.workflow_run.head_branch.toLowerCase();
          if (branchLower === "main" || branchLower === "master" || workflowName.includes("prod")) {
            environment = "production";
          } else if (branchLower.includes("stag") || workflowName.includes("stag")) {
            environment = "staging";
          } else if (branchLower.startsWith("pr-") || workflowName.includes("preview")) {
            environment = "preview";
          }

          // Map conclusion to status
          let status: "success" | "failure" | "pending" | "cancelled" = "pending";
          if (workflowEvent.workflow_run.conclusion === "success") {
            status = "success";
          } else if (["failure", "timed_out"].includes(workflowEvent.workflow_run.conclusion)) {
            status = "failure";
          } else if (workflowEvent.workflow_run.conclusion === "cancelled") {
            status = "cancelled";
          }

          // Calculate duration
          const startTime = new Date(workflowEvent.workflow_run.run_started_at);
          const endTime = new Date(workflowEvent.workflow_run.updated_at);
          const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

          // Get PR number if available
          const prNumber = workflowEvent.workflow_run.pull_requests[0]?.number;

          const deploymentId = uuidv4();
          await db.insert(schema.deployments).values({
            id: deploymentId,
            userId,
            timestamp,
            environment,
            status,
            sha: workflowEvent.workflow_run.head_sha,
            ref: workflowEvent.workflow_run.head_branch,
            repository,
            workflowRunId: workflowEvent.workflow_run.id.toString(),
            workflowName: workflowEvent.workflow.name,
            deploymentUrl: workflowEvent.workflow_run.html_url,
            duration,
            prNumber,
            source: "github_actions",
            createdAt: new Date(),
          });

          // Update daily aggregate
          if (userId) {
            await upsertDailyAggregate(userId, getDateString(timestamp), {
              deploymentsTotal: 1,
              deploymentsSuccess: status === "success" ? 1 : 0,
              deploymentsFailed: status === "failure" ? 1 : 0,
            });
          }

          // Try to correlate deployment with AI session via PR
          if (prNumber) {
            const correlation = await correlateDeployment(deploymentId, prNumber, repository);
            if (correlation.linked) {
              results.push({
                type: "workflow_deployment",
                id: deploymentId,
                sessionId: correlation.sessionId ?? undefined,
                aiAssisted: true,
              });
            } else {
              results.push({ type: "workflow_deployment", id: deploymentId });
            }
          } else {
            results.push({ type: "workflow_deployment", id: deploymentId });
          }
        }
      }
    }

    // Handle issues events (for incident tracking / MTTR)
    if (event === "issues") {
      const issueEvent = payload as GitHubIssuesEvent;
      const repository = issueEvent.repository.full_name;
      const timestamp = new Date();

      // Check if this is a bug or incident issue
      const labels = issueEvent.issue.labels.map(l => l.name.toLowerCase());
      const isBugOrIncident = labels.some(l =>
        l === "bug" ||
        l === "incident" ||
        l.includes("production") ||
        l.includes("outage") ||
        l.includes("critical")
      );

      if (isBugOrIncident) {
        const userId = await findUserByGithubUsername(issueEvent.sender.login);

        // Determine severity from labels
        let severity: "critical" | "high" | "medium" | "low" = "medium";
        if (labels.some(l => l.includes("critical") || l.includes("p0") || l.includes("sev0"))) {
          severity = "critical";
        } else if (labels.some(l => l.includes("high") || l.includes("p1") || l.includes("sev1"))) {
          severity = "high";
        } else if (labels.some(l => l.includes("low") || l.includes("p3") || l.includes("sev3"))) {
          severity = "low";
        }

        if (issueEvent.action === "opened" || issueEvent.action === "labeled") {
          // Check if incident already exists
          const existingIncident = await db.query.incidents.findFirst({
            where: and(
              eq(schema.incidents.source, "github_issue"),
              eq(schema.incidents.sourceId, issueEvent.issue.id.toString())
            ),
          });

          if (!existingIncident) {
            const incidentId = uuidv4();
            await db.insert(schema.incidents).values({
              id: incidentId,
              source: "github_issue",
              sourceId: issueEvent.issue.id.toString(),
              sourceUrl: issueEvent.issue.html_url,
              title: issueEvent.issue.title,
              description: issueEvent.issue.body || undefined,
              repository,
              severity,
              status: "open",
              userId,
              createdAt: new Date(issueEvent.issue.created_at),
            });

            if (userId) {
              await upsertDailyAggregate(userId, getDateString(timestamp), {
                incidentsOpened: 1,
              });
            }

            results.push({ type: "incident_opened", id: incidentId });
          }
        }

        if (issueEvent.action === "closed") {
          // Find and resolve the incident
          const incident = await db.query.incidents.findFirst({
            where: and(
              eq(schema.incidents.source, "github_issue"),
              eq(schema.incidents.sourceId, issueEvent.issue.id.toString())
            ),
          });

          if (incident && incident.status !== "resolved") {
            const resolvedAt = issueEvent.issue.closed_at
              ? new Date(issueEvent.issue.closed_at)
              : new Date();

            // Calculate MTTR
            const createdAt = new Date(incident.createdAt);
            const mttrMinutes = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60));

            await db.update(schema.incidents)
              .set({
                status: "resolved",
                resolvedAt,
                timeToRecoveryMinutes: mttrMinutes,
              })
              .where(eq(schema.incidents.id, incident.id));

            if (userId) {
              await upsertDailyAggregate(userId, getDateString(timestamp), {
                incidentsResolved: 1,
                totalMttrMinutes: mttrMinutes,
              });
            }

            results.push({ type: "incident_resolved", id: incident.id });
          }
        }
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
    supportedEvents: [
      "push",
      "pull_request",
      "pull_request_review",
      "deployment_status",
      "workflow_run",
      "issues",
      "ping",
    ],
    documentation: "Configure this URL as a GitHub webhook to track commits, PRs, deployments, and incidents",
    doraMetrics: {
      deployFrequency: "deployment_status, workflow_run events",
      leadTime: "Computed from first commit to deployment",
      changeFailureRate: "Failed deployments / Total deployments",
      mttr: "Issue open to close time for bug/incident labels",
    },
  });
}
