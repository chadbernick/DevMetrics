import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import { correlateDeployment } from "@/lib/correlations/deployment-session";
import crypto from "crypto";

// Vercel webhook secret verification
function verifyVercelSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return true; // Skip if no secret configured

  const hmac = crypto.createHmac("sha1", secret);
  const digest = hmac.update(rawBody).digest("hex");
  return signature === digest;
}

// Vercel Deployment webhook event types
interface VercelDeploymentEvent {
  id: string;
  type: "deployment.created" | "deployment.succeeded" | "deployment.failed" | "deployment.canceled" | "deployment.error";
  createdAt: number;
  payload: {
    deployment: {
      id: string;
      name: string;
      url: string;
      meta?: {
        githubCommitSha?: string;
        githubCommitRef?: string;
        githubCommitMessage?: string;
        githubCommitAuthorLogin?: string;
        githubPrId?: number;
        githubRepo?: string;
        githubOrg?: string;
      };
    };
    project: {
      id: string;
      name: string;
    };
    target?: "production" | "staging" | "preview";
    user?: {
      id: string;
      username: string;
      email: string;
    };
  };
}

// Map Vercel event type to deployment status
function mapEventTypeToStatus(
  eventType: string
): "success" | "failure" | "pending" | "cancelled" {
  switch (eventType) {
    case "deployment.succeeded":
      return "success";
    case "deployment.failed":
    case "deployment.error":
      return "failure";
    case "deployment.canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

// Map Vercel target to environment
function mapTargetToEnvironment(
  target?: string
): "production" | "staging" | "preview" | "development" {
  switch (target) {
    case "production":
      return "production";
    case "staging":
      return "staging";
    case "preview":
      return "preview";
    default:
      return "development";
  }
}

// Find user by email
async function findUserByEmail(email: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  return user?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-vercel-signature");

    // Get webhook secret from settings (optional)
    const secretSetting = await db.query.settings.findFirst({
      where: eq(schema.settings.key, "vercel_webhook_secret"),
    });
    const webhookSecret = typeof secretSetting?.value === "string" ? secretSetting.value : undefined;

    // Verify signature if secret is configured
    if (webhookSecret && !verifyVercelSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: VercelDeploymentEvent = JSON.parse(rawBody);
    const results: Array<{ type: string; id: string; aiAssisted?: boolean }> = [];

    // Only process deployment events
    const deploymentEvents = [
      "deployment.created",
      "deployment.succeeded",
      "deployment.failed",
      "deployment.canceled",
      "deployment.error",
    ];

    if (!deploymentEvents.includes(event.type)) {
      return NextResponse.json({
        success: true,
        message: `Event type ${event.type} not processed`,
      });
    }

    const { deployment, project, target, user } = event.payload;
    const meta = deployment.meta || {};
    const timestamp = new Date(event.createdAt);

    // For pending deployments (created), we might want to skip or just track
    // For terminal states, we create/update the deployment record
    const status = mapEventTypeToStatus(event.type);
    const environment = mapTargetToEnvironment(target);

    // Build repository name
    const repository = meta.githubRepo
      ? `${meta.githubOrg || ""}/${meta.githubRepo}`.replace(/^\//, "")
      : project.name;

    // Find user - try email first, then GitHub username
    let userId: string | null = null;
    if (user?.email) {
      userId = await findUserByEmail(user.email);
    }
    if (!userId && meta.githubCommitAuthorLogin) {
      // Try to find by GitHub username mapping using the settings service
      const { getUserIdByGitHubUsername } = await import("@/lib/settings/github");
      userId = await getUserIdByGitHubUsername(meta.githubCommitAuthorLogin);
    }

    // Check if we already have this deployment (by Vercel deployment ID)
    const existingDeployment = await db.query.deployments.findFirst({
      where: eq(schema.deployments.workflowRunId, deployment.id),
    });

    if (existingDeployment) {
      // Update existing deployment
      await db
        .update(schema.deployments)
        .set({
          status,
          deploymentUrl: `https://${deployment.url}`,
        })
        .where(eq(schema.deployments.id, existingDeployment.id));

      // Update daily aggregate for status change
      if (userId && status !== "pending") {
        await upsertDailyAggregate(userId, getDateString(timestamp), {
          deploymentsSuccess: status === "success" ? 1 : 0,
          deploymentsFailed: status === "failure" ? 1 : 0,
        });
      }

      results.push({ type: "deployment_updated", id: existingDeployment.id });
    } else {
      // Create new deployment record
      const deploymentId = uuidv4();

      await db.insert(schema.deployments).values({
        id: deploymentId,
        userId,
        timestamp,
        environment,
        status,
        sha: meta.githubCommitSha || deployment.id,
        ref: meta.githubCommitRef,
        repository,
        workflowRunId: deployment.id, // Store Vercel deployment ID
        workflowName: "Vercel Deployment",
        deploymentUrl: `https://${deployment.url}`,
        prNumber: meta.githubPrId,
        source: "vercel",
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

      // Try to correlate with AI session via PR
      let aiAssisted = false;
      if (meta.githubPrId && repository) {
        const correlation = await correlateDeployment(
          deploymentId,
          meta.githubPrId,
          repository
        );
        aiAssisted = correlation.linked;
      }

      // Create incident for failed production deployments
      if (status === "failure" && environment === "production") {
        const incidentId = uuidv4();
        await db.insert(schema.incidents).values({
          id: incidentId,
          source: "deployment_failure",
          sourceId: deployment.id,
          sourceUrl: `https://${deployment.url}`,
          title: `Vercel deployment failed: ${project.name}`,
          description: meta.githubCommitMessage || undefined,
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

      results.push({ type: "deployment", id: deploymentId, aiAssisted });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Vercel webhook error:", error);
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
    endpoint: "vercel-webhook",
    supportedEvents: [
      "deployment.created",
      "deployment.succeeded",
      "deployment.failed",
      "deployment.canceled",
      "deployment.error",
    ],
    documentation: "Configure this URL as a Vercel webhook to track deployments",
    setup: {
      step1: "Go to your Vercel project settings",
      step2: "Navigate to Git > Deploy Hooks or Webhooks",
      step3: "Add this URL as a webhook endpoint",
      step4: "Select deployment events to track",
    },
  });
}
