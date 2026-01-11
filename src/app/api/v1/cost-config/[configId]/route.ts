import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateCostConfigSchema = z.object({
  juniorHourlyRate: z.number().min(0).optional(),
  midHourlyRate: z.number().min(0).optional(),
  seniorHourlyRate: z.number().min(0).optional(),
  staffHourlyRate: z.number().min(0).optional(),
  principalHourlyRate: z.number().min(0).optional(),
  featureMultiplier: z.number().min(1).optional(),
  bugFixMultiplier: z.number().min(1).optional(),
  refactorMultiplier: z.number().min(1).optional(),
  docsMultiplier: z.number().min(1).optional(),
  testMultiplier: z.number().min(1).optional(),
  overheadPercentage: z.number().min(0).max(100).optional(),
  claudeInputPrice: z.number().min(0).optional(),
  claudeOutputPrice: z.number().min(0).optional(),
  gpt4InputPrice: z.number().min(0).optional(),
  gpt4OutputPrice: z.number().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const { configId } = await params;
    const body = await request.json();
    const parsed = updateCostConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existingConfig = await db.query.costConfig.findFirst({
      where: eq(schema.costConfig.id, configId),
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "Cost configuration not found" },
        { status: 404 }
      );
    }

    const updatedConfig = await db
      .update(schema.costConfig)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.costConfig.id, configId))
      .returning();

    return NextResponse.json(updatedConfig[0]);
  } catch (error) {
    console.error("Failed to update cost config:", error);
    return NextResponse.json(
      { error: "Failed to update cost configuration" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  try {
    const { configId } = await params;
    const config = await db.query.costConfig.findFirst({
      where: eq(schema.costConfig.id, configId),
    });

    if (!config) {
      return NextResponse.json(
        { error: "Cost configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to fetch cost config:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost configuration" },
      { status: 500 }
    );
  }
}
