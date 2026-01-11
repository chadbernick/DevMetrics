import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { CLAUDE_CODE_METRICS } from "@/lib/otlp/types";

// GET all dashboard metrics configuration
export async function GET() {
  try {
    // Get all configured metrics
    const metrics = await db.query.dashboardMetrics.findMany({
      orderBy: (t) => [t.displayOrder],
    });

    // If no metrics configured, return default metrics from CLAUDE_CODE_METRICS
    if (metrics.length === 0) {
      const defaultMetrics = Object.entries(CLAUDE_CODE_METRICS).map(
        ([key, def], index) => ({
          id: key,
          metricKey: key,
          displayName: def.displayName,
          description: def.description,
          category: def.category,
          dataSource: "otlp_metric" as const,
          otlpMetricName: def.name,
          aggregateField: def.aggregateField,
          format: def.format,
          icon: def.icon,
          color: def.color,
          isEnabled: true, // All metrics enabled by default
          displayOrder: index,
          showInTopRow: true,
          showInChart: false,
        })
      );

      return NextResponse.json({
        metrics: defaultMetrics,
        isDefault: true,
      });
    }

    return NextResponse.json({
      metrics,
      isDefault: false,
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Initialize default metrics or add a new metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is an initialization request
    if (body.action === "initialize") {
      // Check if metrics already exist
      const existing = await db.query.dashboardMetrics.findFirst();
      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Metrics already initialized",
        });
      }

      // Insert default metrics - all enabled by default
      const defaultMetrics = Object.entries(CLAUDE_CODE_METRICS).map(
        ([key, def], index) => ({
          id: uuidv4(),
          metricKey: key,
          displayName: def.displayName,
          description: def.description,
          category: def.category,
          dataSource: "otlp_metric" as const,
          otlpMetricName: def.name,
          aggregateField: def.aggregateField,
          format: def.format,
          icon: def.icon,
          color: def.color,
          isEnabled: true,
          displayOrder: index,
          showInTopRow: true,
          showInChart: false,
        })
      );

      await db.insert(schema.dashboardMetrics).values(defaultMetrics);

      return NextResponse.json({
        success: true,
        message: "Default metrics initialized",
        count: defaultMetrics.length,
      });
    }

    // Otherwise, add a new custom metric
    const {
      metricKey,
      displayName,
      description,
      category,
      dataSource,
      otlpMetricName,
      otlpLogEventName,
      aggregateField,
      format,
      icon,
      color,
    } = body;

    if (!metricKey || !displayName || !category || !dataSource) {
      return NextResponse.json(
        { error: "Missing required fields: metricKey, displayName, category, dataSource" },
        { status: 400 }
      );
    }

    // Check for duplicate key
    const existing = await db.query.dashboardMetrics.findFirst({
      where: eq(schema.dashboardMetrics.metricKey, metricKey),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Metric with this key already exists" },
        { status: 409 }
      );
    }

    // Get max display order
    const maxOrder = await db.query.dashboardMetrics.findFirst({
      orderBy: (t) => [t.displayOrder],
    });

    const newMetric = {
      id: uuidv4(),
      metricKey,
      displayName,
      description: description ?? null,
      category,
      dataSource,
      otlpMetricName: otlpMetricName ?? null,
      otlpLogEventName: otlpLogEventName ?? null,
      aggregateField: aggregateField ?? null,
      format: format ?? "number",
      icon: icon ?? null,
      color: color ?? "cyan",
      isEnabled: true,
      displayOrder: (maxOrder?.displayOrder ?? 0) + 1,
      showInTopRow: false,
      showInChart: false,
    };

    await db.insert(schema.dashboardMetrics).values(newMetric);

    return NextResponse.json({
      success: true,
      metric: newMetric,
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper to initialize default metrics in database
async function initializeDefaultMetrics() {
  const defaultMetrics = Object.entries(CLAUDE_CODE_METRICS).map(
    ([key, def], index) => ({
      id: uuidv4(),
      metricKey: key,
      displayName: def.displayName,
      description: def.description,
      category: def.category,
      dataSource: "otlp_metric" as const,
      otlpMetricName: def.name,
      aggregateField: def.aggregateField,
      format: def.format,
      icon: def.icon,
      color: def.color,
      isEnabled: true,
      displayOrder: index,
      showInTopRow: true,
      showInChart: false,
    })
  );

  await db.insert(schema.dashboardMetrics).values(defaultMetrics);
  return defaultMetrics;
}

// PATCH - Update metric configuration (enable/disable, reorder, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { metricId, updates } = body;

    if (!metricId) {
      return NextResponse.json(
        { error: "Missing required field: metricId" },
        { status: 400 }
      );
    }

    // Check if metrics exist in database
    const existingMetrics = await db.query.dashboardMetrics.findMany();

    // If no metrics in DB, initialize them first
    if (existingMetrics.length === 0) {
      await initializeDefaultMetrics();
    }

    // Now find the metric to update - could be by id or metricKey
    let metric = await db.query.dashboardMetrics.findFirst({
      where: eq(schema.dashboardMetrics.id, metricId),
    });

    // If not found by id, try by metricKey (for default metrics)
    if (!metric) {
      metric = await db.query.dashboardMetrics.findFirst({
        where: eq(schema.dashboardMetrics.metricKey, metricId),
      });
    }

    if (!metric) {
      return NextResponse.json(
        { error: "Metric not found" },
        { status: 404 }
      );
    }

    // Validate updates
    const allowedUpdates = [
      "isEnabled",
      "displayOrder",
      "showInTopRow",
      "showInChart",
      "displayName",
      "description",
      "icon",
      "color",
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates ?? {})) {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    // Add updatedAt
    filteredUpdates.updatedAt = new Date();

    await db
      .update(schema.dashboardMetrics)
      .set(filteredUpdates)
      .where(eq(schema.dashboardMetrics.id, metric.id));

    return NextResponse.json({
      success: true,
      message: "Metric updated",
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a custom metric
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metricId = searchParams.get("metricId");

    if (!metricId) {
      return NextResponse.json(
        { error: "Missing required parameter: metricId" },
        { status: 400 }
      );
    }

    await db
      .delete(schema.dashboardMetrics)
      .where(eq(schema.dashboardMetrics.id, metricId));

    return NextResponse.json({
      success: true,
      message: "Metric deleted",
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
