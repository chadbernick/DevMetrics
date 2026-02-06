import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, lte } from "drizzle-orm";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import { classifyCommitMessage } from "@/lib/integrations/github";

// GitLab webhook types
interface GitLabPushEvent {
  object_kind: "push";
  ref: string;
  checkout_sha: string;
  user_name: string;
  user_email: string;
  user_username: string;
  project: {
    id: number;
    name: string;
    path_with_namespace: string;
    web_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    modified: string[];
    removed: string[];
  }>;
}

interface GitLabMergeRequestEvent {
  object_kind: "merge_request";
  user: {
    name: string;
    username: string;
    email: string;
  };
  project: {
    id: number;
    name: string;
    path_with_namespace: string;
  };
  object_attributes: {
    iid: number;
    title: string;
    description: string | null;
    state: "opened" | "closed" | "merged";
    action: "open" | "close" | "reopen" | "update" | "merge";
    source_branch: string;
    target_branch: string;
  };
}

interface GitLabPipelineEvent {
  object_kind: "pipeline";
  object_attributes: {
    id: number;
    ref: string;
    sha: string;
    status: "pending" | "running" | "success" | "failed" | "canceled" | "skipped";
    duration: number | null;
    created_at: string;
    finished_at: string | null;
  };
  user: {
    name: string;
    username: string;
    email: string;
  };
  project: {
    id: number;
    name: string;
    path_with_namespace: string;
    web_url: string;
  };
  merge_request?: {
    iid: number;
    title: string;
  };
}

interface GitLabIssueEvent {
  object_kind: "issue";
  user: {
    name: string;
    username: string;
    email: string;
  };
  project: {
    id: number;
    name: string;
    path_with_namespace: string;
  };
  object_attributes: {
    id: number;
    iid: number;
    title: string;
    description: string | null;
    state: "opened" | "closed";
    action: "open" | "close" | "reopen" | "update";
    url: string;
    created_at: string;
    closed_at: string | null;
  };
  labels: Array<{
    title: string;
  }>;
}

// Find user by email
async function findUserByEmail(email: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  return user?.id ?? null;
}

// Find user by GitLab username mapping
async function findUserByGitLabUsername(username: string): Promise<string | null> {
  // First try to find a setting with this GitLab username
  const mapping = await db.query.settings.findFirst({
    where: eq(schema.settings.key, `gitlab_username:${username}`),
  });

  if (mapping?.value) {
    // The value should contain the user ID as a JSON string or object
    const value = mapping.value;
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (typeof obj.userId === "string") return obj.userId;
    }
  }

  // Fall back to trying to find user by email matching the username
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, `${username}@gitlab.com`),
  });

  return user?.id ?? null;
}

// Find session for commit correlation
async function findSessionForCommit(
  userId: string,
  commitTimestamp: Date,
  repository?: string
): Promise<string | null> {
  const bufferMinutes = 30;

  const sessions = await db.query.sessions.findMany({
    where: and(
      eq(schema.sessions.userId, userId),
      lte(schema.sessions.startedAt, commitTimestamp)
    ),
    orderBy: [desc(schema.sessions.startedAt)],
    limit: 10,
  });

  for (const session of sessions) {
    let endBoundary: Date;
    if (session.endedAt) {
      endBoundary = new Date(session.endedAt.getTime() + bufferMinutes * 60 * 1000);
    } else if (session.status === "active") {
      endBoundary = new Date(session.startedAt.getTime() + 24 * 60 * 60 * 1000);
    } else {
      endBoundary = new Date(session.startedAt.getTime() + 4 * 60 * 60 * 1000);
    }

    if (commitTimestamp <= endBoundary) {
      if (repository && session.projectName) {
        const sessionRepo = session.projectName.split("/").pop()?.toLowerCase();
        const commitRepo = repository.split("/").pop()?.toLowerCase();
        if (sessionRepo === commitRepo) {
          return session.id;
        }
      }
      if (!repository || !session.projectName) {
        return session.id;
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const gitlabToken = request.headers.get("X-Gitlab-Token");
    const eventType = request.headers.get("X-Gitlab-Event");

    // Verify token if configured
    const tokenSetting = await db.query.settings.findFirst({
      where: eq(schema.settings.key, "gitlab_webhook_token"),
    });
    const webhookToken = typeof tokenSetting?.value === "string" ? tokenSetting.value : undefined;
    if (webhookToken && gitlabToken !== webhookToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const results: Array<{ type: string; id: string; sessionId?: string; aiAssisted?: boolean }> = [];

    // Handle Push Events (commits)
    if (payload.object_kind === "push") {
      const pushEvent = payload as GitLabPushEvent;
      const repository = pushEvent.project.path_with_namespace;
      const branch = pushEvent.ref.replace("refs/heads/", "");

      for (const commit of pushEvent.commits) {
        let userId = await findUserByEmail(commit.author.email);
        if (!userId) {
          userId = await findUserByGitLabUsername(pushEvent.user_username);
        }
        if (!userId) continue;

        const classification = classifyCommitMessage(commit.message);
        const timestamp = new Date(commit.timestamp);
        const filesChanged = commit.added.length + commit.modified.length + commit.removed.length;

        const sessionId = await findSessionForCommit(userId, timestamp, repository);
        const isAiAssisted = sessionId !== null;

        const workItemId = uuidv4();
        await db.insert(schema.workItems).values({
          id: workItemId,
          userId,
          sessionId,
          timestamp,
          type: classification.type,
          source: "commit",
          sourceId: commit.id,
          title: commit.message.split("\n")[0].substring(0, 100),
          description: commit.message,
          aiClassified: true,
          confidence: classification.confidence,
        });

        await db.insert(schema.codeMetrics).values({
          id: uuidv4(),
          userId,
          sessionId,
          timestamp,
          linesAdded: commit.added.length * 10,
          linesModified: commit.modified.length * 5,
          linesDeleted: commit.removed.length * 3,
          filesChanged,
          repository,
          branch,
        });

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

    // Handle Merge Request Events
    if (payload.object_kind === "merge_request") {
      const mrEvent = payload as GitLabMergeRequestEvent;
      const repository = mrEvent.project.path_with_namespace;
      const timestamp = new Date();

      let userId = await findUserByEmail(mrEvent.user.email);
      if (!userId) {
        userId = await findUserByGitLabUsername(mrEvent.user.username);
      }

      if (userId) {
        let action: "created" | "reviewed" | "merged" | "closed" | null = null;

        if (mrEvent.object_attributes.action === "open") {
          action = "created";
        } else if (mrEvent.object_attributes.action === "merge") {
          action = "merged";
        } else if (mrEvent.object_attributes.action === "close") {
          action = "closed";
        }

        if (action) {
          const activityId = uuidv4();
          await db.insert(schema.prActivity).values({
            id: activityId,
            userId,
            timestamp,
            prNumber: mrEvent.object_attributes.iid,
            repository,
            title: mrEvent.object_attributes.title,
            action,
            aiAssisted: false,
          });

          await upsertDailyAggregate(userId, getDateString(timestamp), {
            prsCreated: action === "created" ? 1 : 0,
            prsMerged: action === "merged" ? 1 : 0,
          });

          results.push({ type: "merge_request", id: activityId });
        }
      }
    }

    // Handle Pipeline Events (deployments)
    if (payload.object_kind === "pipeline") {
      const pipelineEvent = payload as GitLabPipelineEvent;
      const { object_attributes: pipeline, project, user, merge_request } = pipelineEvent;

      // Only track terminal states
      const terminalStates = ["success", "failed", "canceled"];
      if (terminalStates.includes(pipeline.status)) {
        let userId = await findUserByEmail(user.email);
        if (!userId) {
          userId = await findUserByGitLabUsername(user.username);
        }

        const timestamp = pipeline.finished_at
          ? new Date(pipeline.finished_at)
          : new Date();
        const repository = project.path_with_namespace;

        // Determine environment from branch
        let environment: "production" | "staging" | "preview" | "development" = "development";
        const branch = pipeline.ref.toLowerCase();
        if (branch === "main" || branch === "master") {
          environment = "production";
        } else if (branch.includes("stag")) {
          environment = "staging";
        } else if (branch.startsWith("mr-") || branch.includes("preview")) {
          environment = "preview";
        }

        // Map status
        let status: "success" | "failure" | "pending" | "cancelled" = "pending";
        if (pipeline.status === "success") {
          status = "success";
        } else if (pipeline.status === "failed") {
          status = "failure";
        } else if (pipeline.status === "canceled") {
          status = "cancelled";
        }

        const deploymentId = uuidv4();
        await db.insert(schema.deployments).values({
          id: deploymentId,
          userId,
          timestamp,
          environment,
          status,
          sha: pipeline.sha,
          ref: pipeline.ref,
          repository,
          workflowRunId: pipeline.id.toString(),
          workflowName: "GitLab CI Pipeline",
          deploymentUrl: `${project.web_url}/-/pipelines/${pipeline.id}`,
          duration: pipeline.duration ?? undefined,
          prNumber: merge_request?.iid,
          source: "gitlab",
          createdAt: new Date(),
        });

        if (userId) {
          await upsertDailyAggregate(userId, getDateString(timestamp), {
            deploymentsTotal: 1,
            deploymentsSuccess: status === "success" ? 1 : 0,
            deploymentsFailed: status === "failure" ? 1 : 0,
          });
        }

        // Create incident for failed production pipelines
        if (status === "failure" && environment === "production") {
          const incidentId = uuidv4();
          await db.insert(schema.incidents).values({
            id: incidentId,
            source: "deployment_failure",
            sourceId: pipeline.id.toString(),
            sourceUrl: `${project.web_url}/-/pipelines/${pipeline.id}`,
            title: `GitLab pipeline failed: ${project.name}`,
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

        results.push({ type: "pipeline", id: deploymentId });
      }
    }

    // Handle Issue Events (for incident tracking)
    if (payload.object_kind === "issue") {
      const issueEvent = payload as GitLabIssueEvent;
      const { object_attributes: issue, labels, project, user } = issueEvent;
      const repository = project.path_with_namespace;
      const timestamp = new Date();

      // Check if this is a bug or incident
      const labelTitles = labels.map((l) => l.title.toLowerCase());
      const isBugOrIncident = labelTitles.some(
        (l) =>
          l === "bug" ||
          l === "incident" ||
          l.includes("production") ||
          l.includes("critical")
      );

      if (isBugOrIncident) {
        let userId = await findUserByEmail(user.email);
        if (!userId) {
          userId = await findUserByGitLabUsername(user.username);
        }

        // Determine severity
        let severity: "critical" | "high" | "medium" | "low" = "medium";
        if (labelTitles.some((l) => l.includes("critical") || l.includes("p0"))) {
          severity = "critical";
        } else if (labelTitles.some((l) => l.includes("high") || l.includes("p1"))) {
          severity = "high";
        } else if (labelTitles.some((l) => l.includes("low") || l.includes("p3"))) {
          severity = "low";
        }

        if (issue.action === "open") {
          const existingIncident = await db.query.incidents.findFirst({
            where: and(
              eq(schema.incidents.source, "gitlab_issue"),
              eq(schema.incidents.sourceId, issue.id.toString())
            ),
          });

          if (!existingIncident) {
            const incidentId = uuidv4();
            await db.insert(schema.incidents).values({
              id: incidentId,
              source: "gitlab_issue",
              sourceId: issue.id.toString(),
              sourceUrl: issue.url,
              title: issue.title,
              description: issue.description || undefined,
              repository,
              severity,
              status: "open",
              userId,
              createdAt: new Date(issue.created_at),
            });

            if (userId) {
              await upsertDailyAggregate(userId, getDateString(timestamp), {
                incidentsOpened: 1,
              });
            }

            results.push({ type: "incident_opened", id: incidentId });
          }
        }

        if (issue.action === "close") {
          const incident = await db.query.incidents.findFirst({
            where: and(
              eq(schema.incidents.source, "gitlab_issue"),
              eq(schema.incidents.sourceId, issue.id.toString())
            ),
          });

          if (incident && incident.status !== "resolved") {
            const resolvedAt = issue.closed_at ? new Date(issue.closed_at) : new Date();
            const createdAt = new Date(incident.createdAt);
            const mttrMinutes = Math.floor(
              (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60)
            );

            await db
              .update(schema.incidents)
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
    console.error("GitLab webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "gitlab-webhook",
    supportedEvents: [
      "Push Hook",
      "Merge Request Hook",
      "Pipeline Hook",
      "Issue Hook",
    ],
    documentation: "Configure this URL as a GitLab webhook to track commits, MRs, pipelines, and issues",
    setup: {
      step1: "Go to your GitLab project Settings > Webhooks",
      step2: "Add this URL as the webhook endpoint",
      step3: "Select triggers: Push events, Merge request events, Pipeline events, Issues events",
      step4: "(Optional) Add a secret token for verification",
    },
  });
}
