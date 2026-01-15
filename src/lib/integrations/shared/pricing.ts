/**
 * Model Pricing Utilities - Shared Across All Integrations
 *
 * Provides consistent pricing calculation for token costs.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Pricing configuration for a model
 */
export interface ModelPricing {
  inputPrice: number; // USD per million tokens
  outputPrice: number;
  thinkingPrice: number;
  cacheWritePrice: number;
  cacheReadPrice: number;
}

/**
 * Default pricing for unknown models
 */
export const DEFAULT_PRICING: ModelPricing = {
  inputPrice: 3.0,
  outputPrice: 15.0,
  thinkingPrice: 15.0,
  cacheWritePrice: 3.75,
  cacheReadPrice: 0.3,
};

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
 * Get model pricing by model name
 *
 * Looks up pricing from database using regex pattern matching.
 * Falls back to default pricing if no match found.
 *
 * @param modelName - The model name to look up
 * @returns Pricing configuration for the model
 */
export async function getModelPricing(
  modelName?: string
): Promise<ModelPricing> {
  if (!modelName) return DEFAULT_PRICING;

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
      // Invalid regex pattern, skip
      continue;
    }
  }

  return DEFAULT_PRICING;
}

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
