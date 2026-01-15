/**
 * CostConfig Service
 *
 * Centralized access to cost configuration with caching.
 * Provides consistent defaults and helper functions for ROI calculations.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Cost configuration structure matching the database schema
 */
export interface CostConfig {
  id: string;
  name: string;
  isActive: boolean;
  // Hourly rates by engineer level
  juniorHourlyRate: number;
  midHourlyRate: number;
  seniorHourlyRate: number;
  staffHourlyRate: number;
  principalHourlyRate: number;
  // Productivity multipliers
  featureMultiplier: number;
  bugFixMultiplier: number;
  refactorMultiplier: number;
  docsMultiplier: number;
  testMultiplier: number;
  // Overhead
  overheadPercentage: number;
}

/**
 * Default cost configuration values
 */
export const DEFAULT_COST_CONFIG: CostConfig = {
  id: "default",
  name: "Default Configuration",
  isActive: true,
  // Hourly rates (USD)
  juniorHourlyRate: 50,
  midHourlyRate: 85,
  seniorHourlyRate: 120,
  staffHourlyRate: 160,
  principalHourlyRate: 200,
  // Productivity multipliers
  featureMultiplier: 3.0,
  bugFixMultiplier: 2.5,
  refactorMultiplier: 4.0,
  docsMultiplier: 5.0,
  testMultiplier: 3.5,
  // Overhead
  overheadPercentage: 30,
};

/**
 * Work type for ROI calculations
 */
export type WorkType = "feature" | "bug_fix" | "refactor" | "docs" | "test" | "chore" | "other";

// In-memory cache
let cachedConfig: CostConfig | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Get the active cost configuration
 * Uses in-memory caching to reduce database queries
 */
export async function getCostConfig(): Promise<CostConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  try {
    const config = await db.query.costConfig.findFirst({
      where: eq(schema.costConfig.isActive, true),
    });

    if (!config) {
      cachedConfig = DEFAULT_COST_CONFIG;
    } else {
      cachedConfig = {
        id: config.id,
        name: config.name,
        isActive: config.isActive,
        juniorHourlyRate: config.juniorHourlyRate ?? DEFAULT_COST_CONFIG.juniorHourlyRate,
        midHourlyRate: config.midHourlyRate ?? DEFAULT_COST_CONFIG.midHourlyRate,
        seniorHourlyRate: config.seniorHourlyRate ?? DEFAULT_COST_CONFIG.seniorHourlyRate,
        staffHourlyRate: config.staffHourlyRate ?? DEFAULT_COST_CONFIG.staffHourlyRate,
        principalHourlyRate: config.principalHourlyRate ?? DEFAULT_COST_CONFIG.principalHourlyRate,
        featureMultiplier: config.featureMultiplier ?? DEFAULT_COST_CONFIG.featureMultiplier,
        bugFixMultiplier: config.bugFixMultiplier ?? DEFAULT_COST_CONFIG.bugFixMultiplier,
        refactorMultiplier: config.refactorMultiplier ?? DEFAULT_COST_CONFIG.refactorMultiplier,
        docsMultiplier: config.docsMultiplier ?? DEFAULT_COST_CONFIG.docsMultiplier,
        testMultiplier: config.testMultiplier ?? DEFAULT_COST_CONFIG.testMultiplier,
        overheadPercentage: config.overheadPercentage ?? DEFAULT_COST_CONFIG.overheadPercentage,
      };
    }

    cacheExpiry = now + CACHE_TTL_MS;
    return cachedConfig;
  } catch (error) {
    console.error("Failed to get cost config:", error);
    return DEFAULT_COST_CONFIG;
  }
}

/**
 * Invalidate the cost config cache
 * Call this after updating the cost configuration
 */
export function invalidateCostConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}

/**
 * Get the productivity multiplier for a work type
 */
export function getMultiplier(config: CostConfig, workType: WorkType): number {
  const multipliers: Record<WorkType, number> = {
    feature: config.featureMultiplier,
    bug_fix: config.bugFixMultiplier,
    refactor: config.refactorMultiplier,
    docs: config.docsMultiplier,
    test: config.testMultiplier,
    chore: 2.0,
    other: 2.0,
  };
  return multipliers[workType];
}

/**
 * Get the average hourly rate across all engineer levels
 */
export function getAverageHourlyRate(config: CostConfig): number {
  return (
    (config.juniorHourlyRate +
      config.midHourlyRate +
      config.seniorHourlyRate +
      config.staffHourlyRate +
      config.principalHourlyRate) /
    5
  );
}

/**
 * Get the fully-loaded hourly rate (including overhead)
 */
export function getFullyLoadedRate(config: CostConfig): number {
  const avgRate = getAverageHourlyRate(config);
  return avgRate * (1 + config.overheadPercentage / 100);
}

/**
 * Get hourly rate for a specific engineer level
 */
export function getHourlyRateByLevel(
  config: CostConfig,
  level: "junior" | "mid" | "senior" | "staff" | "principal"
): number {
  const rates: Record<string, number> = {
    junior: config.juniorHourlyRate,
    mid: config.midHourlyRate,
    senior: config.seniorHourlyRate,
    staff: config.staffHourlyRate,
    principal: config.principalHourlyRate,
  };
  return rates[level];
}

/**
 * Calculate hours saved from AI assistance
 *
 * @param config - Cost configuration
 * @param linesOfCode - Lines of code produced with AI assistance
 * @param linesPerHourManual - Estimated lines per hour for manual coding (default 25)
 * @param workType - Type of work for multiplier selection
 * @returns Estimated hours saved
 */
export function calculateHoursSaved(
  config: CostConfig,
  linesOfCode: number,
  linesPerHourManual: number = 25,
  workType: WorkType = "feature"
): number {
  const multiplier = getMultiplier(config, workType);
  const manualHours = linesOfCode / linesPerHourManual;
  // Hours saved = manual_hours * (1 - 1/multiplier)
  return manualHours * (1 - 1 / multiplier);
}

/**
 * Calculate monetary value from hours saved
 *
 * @param config - Cost configuration
 * @param hoursSaved - Number of hours saved
 * @returns Estimated value in USD
 */
export function calculateValueUsd(config: CostConfig, hoursSaved: number): number {
  return hoursSaved * getFullyLoadedRate(config);
}

/**
 * Calculate ROI percentage
 *
 * @param value - Value generated (USD)
 * @param cost - Cost incurred (USD)
 * @returns ROI as a percentage
 */
export function calculateRoi(value: number, cost: number): number {
  if (cost === 0) return 0;
  return ((value - cost) / cost) * 100;
}
