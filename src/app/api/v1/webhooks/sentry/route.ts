import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import crypto from "crypto";

// Verify Sentry webhook signature
function verifySentrySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return true;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody, "utf8").digest("hex");
  return signature === digest;
}

// Sentry webhook event types
interface SentryIssueEvent {
  action: "created" | "resolved" | "assigned" | "archived" | "unresolved";
  data: {
    issue: {
      id: string;
      shortId: string;
      title: string;
      culprit: string;
      level: "fatal" | "error" | "warning" | "info" | "debug";
      status: "unresolved" | "resolved" | "ignored";
      firstSeen: string;
      lastSeen: string;
      count: number;
      userCount: number;
      project: {
        id: string;
        name: string;
        slug: string;
      };
      metadata?: {
        type?: string;
        value?: string;
        filename?: string;
        function?: string;
      };
    };
  };
  actor?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface SentryErrorEvent {
  action: "created";
  data: {
    error: {
      event_id: string;
      project: number;
      release?: string;
      platform: string;
      message: string;
      datetime: string;
      tags: Array<{ key: string; value: string }>;
      contexts?: {
        browser?: { name: string; version: string };
        os?: { name: string; version: string };
        runtime?: { name: string; version: string };
      };
    };
  };
}

interface SentryAlertEvent {
  action: "triggered" | "resolved";
  data: {
    metric_alert?: {
      id: string;
      alert_rule: {
        id: string;
        name: string;
      };
      date_created: string;
      date_closed?: string;
      status: number;
    };
    issue_alert?: {
      id: string;
      title: string;
      web_url: string;
    };
  };
  actor?: {
    id: string;
    name: string;
    email?: string;
  };
}

// Map Sentry level to severity
function mapLevelToSeverity(
  level: string
): "critical" | "high" | "medium" | "low" {
  switch (level) {
    case "fatal":
      return "critical";
    case "error":
      return "high";
    case "warning":
      return "medium";
    default:
      return "low";
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
    const signature = request.headers.get("sentry-hook-signature");
    const resource = request.headers.get("sentry-hook-resource");

    // Get webhook secret from settings
    const secretSetting = await db.query.settings.findFirst({
      where: eq(schema.settings.key, "sentry_webhook_secret"),
    });
    const webhookSecret = typeof secretSetting?.value === "string" ? secretSetting.value : undefined;

    // Verify signature if secret is configured
    if (webhookSecret && !verifySentrySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const results: Array<{ type: string; id: string }> = [];

    // Handle Issue events (new errors, resolved errors)
    if (resource === "issue") {
      const issueEvent = payload as SentryIssueEvent;
      const { action, data, actor } = issueEvent;
      const issue = data.issue;
      const timestamp = new Date();

      // Find user from actor
      let userId: string | null = null;
      if (actor?.email) {
        userId = await findUserByEmail(actor.email);
      }

      const repository = issue.project.name;
      const severity = mapLevelToSeverity(issue.level);

      if (action === "created") {
        // Check if incident already exists
        const existingIncident = await db.query.incidents.findFirst({
          where: and(
            eq(schema.incidents.source, "sentry"),
            eq(schema.incidents.sourceId, issue.id)
          ),
        });

        if (!existingIncident) {
          const incidentId = uuidv4();
          await db.insert(schema.incidents).values({
            id: incidentId,
            source: "sentry",
            sourceId: issue.id,
            sourceUrl: `https://sentry.io/issues/${issue.id}`,
            title: issue.title,
            description: issue.culprit || issue.metadata?.value,
            repository,
            environment: "production", // Sentry typically monitors production
            severity,
            status: "open",
            userId,
            createdAt: new Date(issue.firstSeen),
          });

          if (userId) {
            await upsertDailyAggregate(userId, getDateString(timestamp), {
              incidentsOpened: 1,
            });
          }

          results.push({ type: "incident_created", id: incidentId });
        }
      }

      if (action === "resolved") {
        const incident = await db.query.incidents.findFirst({
          where: and(
            eq(schema.incidents.source, "sentry"),
            eq(schema.incidents.sourceId, issue.id)
          ),
        });

        if (incident && incident.status !== "resolved") {
          const resolvedAt = new Date();
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

    // Handle Metric Alert events
    if (resource === "metric_alert") {
      const alertEvent = payload as SentryAlertEvent;
      const { action, data, actor } = alertEvent;
      const alert = data.metric_alert;

      if (!alert) {
        return NextResponse.json({ success: true, message: "No metric alert data" });
      }

      const timestamp = new Date();
      let userId: string | null = null;
      if (actor?.email) {
        userId = await findUserByEmail(actor.email);
      }

      if (action === "triggered") {
        const existingIncident = await db.query.incidents.findFirst({
          where: and(
            eq(schema.incidents.source, "sentry"),
            eq(schema.incidents.sourceId, alert.id)
          ),
        });

        if (!existingIncident) {
          const incidentId = uuidv4();
          await db.insert(schema.incidents).values({
            id: incidentId,
            source: "sentry",
            sourceId: alert.id,
            title: `Alert: ${alert.alert_rule.name}`,
            environment: "production",
            severity: "high",
            status: "open",
            userId,
            createdAt: new Date(alert.date_created),
          });

          if (userId) {
            await upsertDailyAggregate(userId, getDateString(timestamp), {
              incidentsOpened: 1,
            });
          }

          results.push({ type: "alert_triggered", id: incidentId });
        }
      }

      if (action === "resolved") {
        const incident = await db.query.incidents.findFirst({
          where: and(
            eq(schema.incidents.source, "sentry"),
            eq(schema.incidents.sourceId, alert.id)
          ),
        });

        if (incident && incident.status !== "resolved") {
          const resolvedAt = alert.date_closed ? new Date(alert.date_closed) : new Date();
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

          results.push({ type: "alert_resolved", id: incident.id });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Sentry webhook error:", error);
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
    endpoint: "sentry-webhook",
    supportedEvents: ["issue.created", "issue.resolved", "metric_alert.triggered", "metric_alert.resolved"],
    documentation: "Configure this URL as a Sentry webhook to auto-create incidents from errors",
    setup: {
      step1: "Go to Sentry Settings > Developer Settings > Custom Integrations",
      step2: "Create a new Internal Integration",
      step3: "Add this URL as the webhook endpoint",
      step4: "Select permissions: issue & event:read",
      step5: "Subscribe to: issue, metric_alert webhooks",
      step6: "Copy the Client Secret and add to DevMetrics settings",
    },
  });
}
