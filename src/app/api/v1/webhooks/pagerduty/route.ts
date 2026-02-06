import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { getDateString } from "@/lib/utils/date";
import { upsertDailyAggregate } from "@/lib/integrations/shared";
import crypto from "crypto";

// Verify PagerDuty webhook signature (v3 webhooks)
function verifyPagerDutySignature(
  rawBody: string,
  signatures: string | null,
  secret: string
): boolean {
  if (!signatures || !secret) return true;

  // PagerDuty sends multiple signatures, comma-separated
  const signatureList = signatures.split(",");

  for (const sig of signatureList) {
    const [version, hash] = sig.trim().split("=");
    if (version === "v1") {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = hmac.update(rawBody).digest("hex");
      if (hash === digest) return true;
    }
  }

  return false;
}

// PagerDuty V3 Webhook event types
interface PagerDutyWebhookEvent {
  event: {
    id: string;
    event_type: string;
    resource_type: string;
    occurred_at: string;
    agent?: {
      type: string;
      id?: string;
      name?: string;
      email?: string;
    };
    client?: {
      name: string;
    };
    data: {
      id: string;
      type: string;
      self?: string;
      html_url?: string;
      number?: number;
      title?: string;
      description?: string;
      status?: "triggered" | "acknowledged" | "resolved";
      urgency?: "high" | "low";
      priority?: {
        id: string;
        name: string;
        description: string;
      };
      service?: {
        id: string;
        name: string;
        description?: string;
      };
      created_at?: string;
      resolved_at?: string;
      last_status_change_at?: string;
      assignees?: Array<{
        id: string;
        type: string;
        summary: string;
        html_url: string;
      }>;
    };
  };
}

// Map PagerDuty urgency/priority to severity
function mapToSeverity(
  urgency?: string,
  priority?: { name: string }
): "critical" | "high" | "medium" | "low" {
  // Check priority name first
  if (priority?.name) {
    const name = priority.name.toLowerCase();
    if (name.includes("p1") || name.includes("critical") || name.includes("sev1")) {
      return "critical";
    }
    if (name.includes("p2") || name.includes("high") || name.includes("sev2")) {
      return "high";
    }
    if (name.includes("p3") || name.includes("medium") || name.includes("sev3")) {
      return "medium";
    }
  }

  // Fall back to urgency
  return urgency === "high" ? "high" : "medium";
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
    const signatures = request.headers.get("x-pagerduty-signature");

    // Get webhook secret from settings
    const secretSetting = await db.query.settings.findFirst({
      where: eq(schema.settings.key, "pagerduty_webhook_secret"),
    });
    const webhookSecret = typeof secretSetting?.value === "string" ? secretSetting.value : undefined;

    // Verify signature if secret is configured
    if (webhookSecret && !verifyPagerDutySignature(rawBody, signatures, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: PagerDutyWebhookEvent = JSON.parse(rawBody);
    const results: Array<{ type: string; id: string }> = [];

    const { event } = payload;
    const eventType = event.event_type;
    const incidentData = event.data;
    const timestamp = new Date(event.occurred_at);

    // Find user from agent email
    let userId: string | null = null;
    if (event.agent?.email) {
      userId = await findUserByEmail(event.agent.email);
    }

    const serviceName = incidentData.service?.name || "Unknown Service";
    const severity = mapToSeverity(incidentData.urgency, incidentData.priority);

    // Handle incident.triggered
    if (eventType === "incident.triggered") {
      // Check if incident already exists
      const existingIncident = await db.query.incidents.findFirst({
        where: and(
          eq(schema.incidents.source, "pagerduty"),
          eq(schema.incidents.sourceId, incidentData.id)
        ),
      });

      if (!existingIncident) {
        const incidentId = uuidv4();
        await db.insert(schema.incidents).values({
          id: incidentId,
          source: "pagerduty",
          sourceId: incidentData.id,
          sourceUrl: incidentData.html_url,
          title: incidentData.title || `Incident #${incidentData.number}`,
          description: incidentData.description,
          repository: serviceName, // Use service name as "repository"
          environment: "production",
          severity,
          status: "open",
          userId,
          createdAt: incidentData.created_at ? new Date(incidentData.created_at) : timestamp,
        });

        if (userId) {
          await upsertDailyAggregate(userId, getDateString(timestamp), {
            incidentsOpened: 1,
          });
        }

        results.push({ type: "incident_triggered", id: incidentId });
      }
    }

    // Handle incident.acknowledged
    if (eventType === "incident.acknowledged") {
      const incident = await db.query.incidents.findFirst({
        where: and(
          eq(schema.incidents.source, "pagerduty"),
          eq(schema.incidents.sourceId, incidentData.id)
        ),
      });

      if (incident && incident.status === "open") {
        await db
          .update(schema.incidents)
          .set({
            status: "acknowledged",
          })
          .where(eq(schema.incidents.id, incident.id));

        results.push({ type: "incident_acknowledged", id: incident.id });
      }
    }

    // Handle incident.resolved
    if (eventType === "incident.resolved") {
      const incident = await db.query.incidents.findFirst({
        where: and(
          eq(schema.incidents.source, "pagerduty"),
          eq(schema.incidents.sourceId, incidentData.id)
        ),
      });

      if (incident && incident.status !== "resolved") {
        const resolvedAt = incidentData.resolved_at
          ? new Date(incidentData.resolved_at)
          : timestamp;
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

    // Handle incident.reopened (unresolved)
    if (eventType === "incident.reopened" || eventType === "incident.unacknowledged") {
      const incident = await db.query.incidents.findFirst({
        where: and(
          eq(schema.incidents.source, "pagerduty"),
          eq(schema.incidents.sourceId, incidentData.id)
        ),
      });

      if (incident) {
        await db
          .update(schema.incidents)
          .set({
            status: "open",
            resolvedAt: null,
            timeToRecoveryMinutes: null,
          })
          .where(eq(schema.incidents.id, incident.id));

        results.push({ type: "incident_reopened", id: incident.id });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("PagerDuty webhook error:", error);
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
    endpoint: "pagerduty-webhook",
    supportedEvents: [
      "incident.triggered",
      "incident.acknowledged",
      "incident.resolved",
      "incident.reopened",
    ],
    documentation: "Configure this URL as a PagerDuty webhook to track incidents and MTTR",
    setup: {
      step1: "Go to PagerDuty > Integrations > Generic Webhooks (v3)",
      step2: "Create a new webhook subscription",
      step3: "Add this URL as the Endpoint URL",
      step4: "Select scope (Account or specific services)",
      step5: "Subscribe to: incident.triggered, incident.acknowledged, incident.resolved",
      step6: "Copy the webhook signing secret and add to DevMetrics settings",
    },
  });
}
