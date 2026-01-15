/**
 * Ingest Module
 *
 * Modular event handlers for the ingest API.
 */

// Export types
export {
  ErrorCodes,
  EventType,
  ToolType,
  ingestSchema,
  sessionStartSchema,
  sessionEndSchema,
  tokenUsageSchema,
  codeChangeSchema,
  commitSchema,
  prActivitySchema,
  type ErrorCode,
  type IngestRequest,
  type SessionStartData,
  type SessionEndData,
  type TokenUsageData,
  type CodeChangeData,
  type CommitData,
  type PrActivityData,
  type HandlerContext,
  type HandlerResult,
} from "./types";

// Export handlers
export { handleSessionStart, handleSessionEnd } from "./handlers/session";
export { handleTokenUsage } from "./handlers/token-usage";
export { handleCodeChange } from "./handlers/code-change";
export { handleCommit } from "./handlers/commit";
export { handlePrActivity } from "./handlers/pr-activity";

// Export utilities
export {
  findOrCreateSessionByExternalId,
  getMostRecentSession,
  findSessionById,
  findSessionByExternalId,
  getModelPricing,
  calculateCosts,
  type TokenPricing,
  type TokenCounts,
  type TokenCosts,
} from "./utils";
