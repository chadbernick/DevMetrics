/**
 * Cost Mode Settings API
 *
 * GET  - Returns current cost mode configuration
 * PATCH - Updates cost mode configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSetting, setSetting } from "@/lib/settings";
import {
  invalidateCostModeCache,
  BLENDED_FRONTIER_PRICING,
  type CostModeSettings,
  type CostMode,
} from "@/lib/integrations/shared";

const SETTING_KEY = "cost.mode";
const DEFAULT_COST_MODE: CostModeSettings = { mode: "blended" };
const VALID_MODES: CostMode[] = ["blended", "per-model", "flat-rate"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSetting<CostModeSettings>(
    SETTING_KEY,
    DEFAULT_COST_MODE
  );

  return NextResponse.json({
    ...settings,
    blendedDefaults: BLENDED_FRONTIER_PRICING,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Validate mode
  if (!body.mode || !VALID_MODES.includes(body.mode)) {
    return NextResponse.json(
      { error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` },
      { status: 400 }
    );
  }

  // flat-rate not yet implemented
  if (body.mode === "flat-rate") {
    return NextResponse.json(
      { error: "Flat-rate mode is not yet implemented" },
      { status: 400 }
    );
  }

  const settings: CostModeSettings = {
    mode: body.mode,
  };

  // Validate and store blended override if provided
  if (body.mode === "blended" && body.blendedOverride) {
    const o = body.blendedOverride;
    if (
      typeof o.inputPrice === "number" &&
      typeof o.outputPrice === "number" &&
      o.inputPrice >= 0 &&
      o.outputPrice >= 0
    ) {
      settings.blendedOverride = {
        inputPrice: o.inputPrice,
        outputPrice: o.outputPrice,
        thinkingPrice:
          typeof o.thinkingPrice === "number"
            ? o.thinkingPrice
            : o.outputPrice,
        cacheWritePrice:
          typeof o.cacheWritePrice === "number"
            ? o.cacheWritePrice
            : o.inputPrice * 1.25,
        cacheReadPrice:
          typeof o.cacheReadPrice === "number"
            ? o.cacheReadPrice
            : o.inputPrice * 0.1,
      };
    }
  }

  await setSetting(SETTING_KEY, settings, "Token cost calculation mode");
  invalidateCostModeCache();

  return NextResponse.json({
    ...settings,
    blendedDefaults: BLENDED_FRONTIER_PRICING,
  });
}
