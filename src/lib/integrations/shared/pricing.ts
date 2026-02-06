/**
 * Model Pricing Utilities - Shared Across All Integrations
 *
 * Provides consistent pricing calculation for token costs.
 * Supports multiple cost modes: blended frontier average, per-model lookup, and (future) flat-rate.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSetting } from "@/lib/settings";

// ============================================
// Types
// ============================================

/**
 * Pricing configuration for a model (USD per million tokens)
 */
export interface ModelPricing {
  inputPrice: number;
  outputPrice: number;
  thinkingPrice: number;
  cacheWritePrice: number;
  cacheReadPrice: number;
}

/**
 * Token counts for cost calculation
 */
export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

/**
 * Calculated costs breakdown
 */
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  totalCost: number;
}

/**
 * Cost calculation mode
 *
 * - "blended": Uses an average across top-tier frontier models (default)
 * - "per-model": Regex-based per-model lookup from modelPricing table
 * - "flat-rate": For license-based tools (future, not yet implemented)
 */
export type CostMode = "blended" | "per-model" | "flat-rate";

/**
 * Cost mode settings stored in the settings table under key "cost.mode"
 */
export interface CostModeSettings {
  mode: CostMode;
  /** User override of blended rates (only used when mode is "blended") */
  blendedOverride?: {
    inputPrice: number;
    outputPrice: number;
    thinkingPrice: number;
    cacheWritePrice: number;
    cacheReadPrice: number;
  };
}

// ============================================
// Blended Frontier Pricing
// ============================================

/**
 * Blended frontier pricing: average of top-tier models across providers.
 *
 * Source models (per 1M tokens):
 *   - Claude Sonnet 4 (Anthropic): Input $3.00, Output $15.00
 *   - GPT-4o (OpenAI):             Input $2.50, Output $10.00
 *   - Gemini 2.5 Pro (Google):     Input $1.25, Output $10.00
 *
 * Averages:
 *   Input:  (3.00 + 2.50 + 1.25) / 3 = $2.25
 *   Output: (15.00 + 10.00 + 10.00) / 3 = $11.67
 *   Thinking: same as output = $11.67
 *   Cache write: ~1.25x input = $2.81
 *   Cache read: ~0.1x input = $0.23
 */
export const BLENDED_FRONTIER_PRICING: ModelPricing = {
  inputPrice: 2.25,
  outputPrice: 11.67,
  thinkingPrice: 11.67,
  cacheWritePrice: 2.81,
  cacheReadPrice: 0.23,
};

/**
 * Default pricing fallback (points to blended frontier pricing)
 */
export const DEFAULT_PRICING: ModelPricing = { ...BLENDED_FRONTIER_PRICING };

/** Default cost mode settings */
const DEFAULT_COST_MODE: CostModeSettings = { mode: "blended" };

// ============================================
// Cost Mode Cache (1-minute TTL)
// ============================================

let cachedCostMode: CostModeSettings | null = null;
let costModeCacheExpiry = 0;
const COST_MODE_CACHE_TTL = 60_000;

/**
 * Get the current cost mode from settings (cached)
 */
export async function getCostMode(): Promise<CostModeSettings> {
  const now = Date.now();
  if (cachedCostMode && now < costModeCacheExpiry) {
    return cachedCostMode;
  }

  const setting = await getSetting<CostModeSettings>(
    "cost.mode",
    DEFAULT_COST_MODE
  );
  cachedCostMode = setting;
  costModeCacheExpiry = now + COST_MODE_CACHE_TTL;
  return setting;
}

/**
 * Invalidate the cost mode cache (call after saving settings)
 */
export function invalidateCostModeCache(): void {
  cachedCostMode = null;
  costModeCacheExpiry = 0;
}

// ============================================
// Pricing Lookup
// ============================================

/**
 * Get model pricing based on the active cost mode.
 *
 * - Blended mode: returns the blended frontier average (or user override)
 * - Per-model mode: regex lookup against modelPricing table, falls back to blended
 *
 * @param modelName - The model name to look up (used in per-model mode)
 * @returns Pricing configuration
 */
export async function getModelPricing(
  modelName?: string
): Promise<ModelPricing> {
  const costMode = await getCostMode();

  if (costMode.mode === "blended") {
    if (costMode.blendedOverride) {
      return costMode.blendedOverride;
    }
    return BLENDED_FRONTIER_PRICING;
  }

  if (costMode.mode === "per-model") {
    if (!modelName) return BLENDED_FRONTIER_PRICING;

    const pricingRecords = await db.query.modelPricing.findMany({
      where: eq(schema.modelPricing.isActive, true),
    });

    for (const pricing of pricingRecords) {
      try {
        const regex = new RegExp(pricing.modelPattern, "i");
        if (regex.test(modelName)) {
          return {
            inputPrice: pricing.inputPrice,
            outputPrice: pricing.outputPrice,
            thinkingPrice: pricing.thinkingPrice,
            cacheWritePrice: pricing.cacheWritePrice,
            cacheReadPrice: pricing.cacheReadPrice,
          };
        }
      } catch {
        continue;
      }
    }

    // No regex match — fall back to blended
    return BLENDED_FRONTIER_PRICING;
  }

  // flat-rate mode (future): return zero pricing since costs are tracked separately
  return {
    inputPrice: 0,
    outputPrice: 0,
    thinkingPrice: 0,
    cacheWritePrice: 0,
    cacheReadPrice: 0,
  };
}

// ============================================
// Cost Calculation
// ============================================

/**
 * Calculate costs from token counts and pricing
 *
 * @param tokens - Token counts
 * @param pricing - Pricing configuration
 * @returns Cost breakdown
 */
export function calculateCosts(
  tokens: TokenCounts,
  pricing: ModelPricing
): CostBreakdown {
  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.outputPrice;
  const thinkingCost =
    ((tokens.thinkingTokens ?? 0) / 1_000_000) * pricing.thinkingPrice;
  const cacheReadCost =
    ((tokens.cacheReadTokens ?? 0) / 1_000_000) * pricing.cacheReadPrice;
  const cacheWriteCost =
    ((tokens.cacheWriteTokens ?? 0) / 1_000_000) * pricing.cacheWritePrice;

  return {
    inputCost,
    outputCost,
    thinkingCost,
    cacheReadCost,
    cacheWriteCost,
    totalCost:
      inputCost + outputCost + thinkingCost + cacheReadCost + cacheWriteCost,
  };
}
