/**
 * Ingest Event Types and Schemas
 *
 * Defines all event types, Zod schemas, and shared types for the ingest system.
 */

import { z } from "zod";

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_API_KEY: "INVALID_API_KEY",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// EVENT TYPE
// ============================================

export const EventType = {
  SESSION_START: "session_start",
  SESSION_END: "session_end",
  TOKEN_USAGE: "token_usage",
  CODE_CHANGE: "code_change",
  COMMIT: "commit",
  PR_ACTIVITY: "pr_activity",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

// ============================================
// TOOL TYPE
// ============================================

export const ToolType = {
  CLAUDE_CODE: "claude_code",
  KIRO: "kiro",
  CODEX: "codex",
  COPILOT: "copilot",
  CURSOR: "cursor",
  GEMINI: "gemini",
  OTHER: "other",
} as const;

export type ToolType = (typeof ToolType)[keyof typeof ToolType];

// ============================================
// EVENT SCHEMAS
// ============================================

export const sessionStartSchema = z.object({
  tool: z.enum(["claude_code", "kiro", "codex", "copilot", "cursor", "gemini", "other"]),
  model: z.string().optional(),
  projectName: z.string().optional(),
  externalSessionId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SessionStartData = z.infer<typeof sessionStartSchema>;

export const sessionEndSchema = z.object({
  sessionId: z.string().optional(),
  externalSessionId: z.string().optional(),
  durationMinutes: z.number().optional(),
  totalInputTokens: z.number().int().nonnegative().optional(),
  totalOutputTokens: z.number().int().nonnegative().optional(),
  totalCacheReadTokens: z.number().int().nonnegative().optional(),
  totalCacheWriteTokens: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
});

export type SessionEndData = z.infer<typeof sessionEndSchema>;

export const tokenUsageSchema = z.object({
  sessionId: z.string().optional(),
  externalSessionId: z.string().optional(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  thinkingTokens: z.number().int().nonnegative().optional(),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  toolUseCount: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  tool: z.enum(["claude_code", "kiro", "codex", "copilot", "cursor", "gemini", "other"]).optional(),
  projectName: z.string().optional(),
});

export type TokenUsageData = z.infer<typeof tokenUsageSchema>;

export const codeChangeSchema = z.object({
  sessionId: z.string().optional(),
  externalSessionId: z.string().optional(),
  linesAdded: z.number().int().nonnegative(),
  linesModified: z.number().int().nonnegative(),
  linesDeleted: z.number().int().nonnegative(),
  filesChanged: z.number().int().nonnegative(),
  language: z.string().optional(),
  languages: z.array(z.string()).optional(),
  repository: z.string().optional(),
  branch: z.string().optional(),
});

export type CodeChangeData = z.infer<typeof codeChangeSchema>;

export const commitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  repository: z.string(),
  branch: z.string().optional(),
  linesAdded: z.number().int().optional(),
  linesDeleted: z.number().int().optional(),
  filesChanged: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

export type CommitData = z.infer<typeof commitSchema>;

export const prActivitySchema = z.object({
  prNumber: z.number().int(),
  repository: z.string(),
  title: z.string().optional(),
  action: z.enum(["created", "reviewed", "merged", "closed", "commented"]),
  aiAssisted: z.boolean().optional(),
  sessionId: z.string().optional(),
});

export type PrActivityData = z.infer<typeof prActivitySchema>;

// ============================================
// MAIN REQUEST SCHEMA
// ============================================

export const ingestSchema = z.object({
  apiKey: z.string().optional(),
  userId: z.string().optional(),
  event: z.enum([
    "session_start",
    "session_end",
    "token_usage",
    "code_change",
    "commit",
    "pr_activity",
  ]),
  timestamp: z.string().datetime().optional(),
  data: z.record(z.string(), z.unknown()),
});

export type IngestRequest = z.infer<typeof ingestSchema>;

// ============================================
// HANDLER CONTEXT
// ============================================

/**
 * Context passed to all event handlers
 */
export interface HandlerContext {
  userId: string;
  eventTime: Date;
  requestId: string;
}

/**
 * Result from an event handler
 */
export interface HandlerResult {
  id: string;
  warnings?: string[];
}
