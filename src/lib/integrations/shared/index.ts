/**
 * Shared Integration Utilities
 *
 * These utilities are shared across all integrations.
 * Only add truly integration-agnostic code here.
 */

export {
  upsertDailyAggregate,
  type DailyAggregateUpdate,
} from "./daily-aggregate";

export {
  extractValue,
  attributesToObject,
  getStringAttr,
  getNumberAttr,
  getBoolAttr,
  extractDataPointValue,
  nanoToDate,
  getDateString,
  getLogBody,
  getServiceName,
  getTokenUsageType,
  type OtlpAnyValue,
  type OtlpKeyValue,
  type OtlpNumberDataPoint,
  type OtlpLogRecord,
  type TokenUsageType,
} from "./otlp-primitives";

export {
  authenticateUser,
  generateRequestId,
  type AuthResult,
  type AuthError,
} from "./auth";

export {
  getModelPricing,
  calculateCosts,
  DEFAULT_PRICING,
  type ModelPricing,
  type TokenCounts,
  type CostBreakdown,
} from "./pricing";
