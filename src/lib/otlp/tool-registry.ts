/**
 * Tool Registry - Reusable definitions for all supported AI coding tools
 *
 * This module provides a centralized registry of tool definitions, metric mappings,
 * and normalization functions to handle telemetry from multiple AI coding tools.
 */

import type { OtlpKeyValue } from "./types";
import { getStringAttr } from "./parser";

// ============================================
// TOOL TYPES
// ============================================

export type ToolId = "claude_code" | "gemini" | "codex" | "copilot" | "cursor" | "kiro" | "other";

export interface ToolDefinition {
  id: ToolId;
  displayName: string;
  description: string;
  hasOtelSupport: boolean;
  hasApiSupport: boolean;
  serviceNamePatterns: string[]; // Patterns to match in service.name
  metricPrefixes: string[]; // Prefixes for tool-specific metrics
  color: string;
  logo: string;
  docsUrl: string;
}

// ============================================
// TOOL DEFINITIONS
// ============================================

export const TOOL_REGISTRY: Record<ToolId, ToolDefinition> = {
  claude_code: {
    id: "claude_code",
    displayName: "Claude Code",
    description: "Anthropic's AI coding assistant CLI",
    hasOtelSupport: true,
    hasApiSupport: false,
    serviceNamePatterns: ["claude", "claude-code", "claude_code"],
    metricPrefixes: ["claude_code.", "gen_ai.client."],
    color: "cyan",
    logo: "🤖",
    docsUrl: "https://docs.anthropic.com/claude-code",
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini CLI",
    description: "Google's AI coding assistant CLI",
    hasOtelSupport: true,
    hasApiSupport: false,
    serviceNamePatterns: ["gemini", "gemini-cli", "gemini_cli"],
    metricPrefixes: ["gemini_cli.", "gemini.", "gen_ai.client."],
    color: "purple",
    logo: "✨",
    docsUrl: "https://geminicli.com/docs/cli/telemetry/",
  },
  codex: {
    id: "codex",
    displayName: "OpenAI Codex",
    description: "OpenAI's Codex CLI for AI-assisted coding",
    hasOtelSupport: true,
    hasApiSupport: false,
    serviceNamePatterns: ["codex", "openai-codex", "openai_codex"],
    metricPrefixes: ["codex.", "gen_ai.client."],
    color: "green",
    logo: "🔮",
    docsUrl: "https://developers.openai.com/codex/config-advanced/",
  },
  copilot: {
    id: "copilot",
    displayName: "GitHub Copilot",
    description: "AI pair programmer by GitHub",
    hasOtelSupport: false,
    hasApiSupport: true, // Has REST API for metrics
    serviceNamePatterns: ["copilot", "github-copilot"],
    metricPrefixes: ["copilot."],
    color: "blue",
    logo: "✈️",
    docsUrl: "https://docs.github.com/en/rest/copilot/copilot-metrics",
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    description: "AI-first code editor",
    hasOtelSupport: false,
    hasApiSupport: false,
    serviceNamePatterns: ["cursor"],
    metricPrefixes: ["cursor."],
    color: "yellow",
    logo: "📝",
    docsUrl: "https://cursor.sh",
  },
  kiro: {
    id: "kiro",
    displayName: "Kiro",
    description: "AWS's spec-driven AI development tool",
    hasOtelSupport: false,
    hasApiSupport: false,
    serviceNamePatterns: ["kiro", "aws-kiro"],
    metricPrefixes: ["kiro."],
    color: "orange",
    logo: "👻",
    docsUrl: "https://kiro.dev",
  },
  other: {
    id: "other",
    displayName: "Other",
    description: "Unknown or generic AI tool",
    hasOtelSupport: true,
    hasApiSupport: false,
    serviceNamePatterns: [],
    metricPrefixes: ["gen_ai.client."],
    color: "gray",
    logo: "🔧",
    docsUrl: "",
  },
};

// ============================================
// METRIC NAME MAPPINGS
// ============================================

export interface NormalizedMetricUpdate {
  sessions?: number;
  minutes?: number;
  inputTokens?: number;
  outputTokens?: number;
  tokenCost?: number;
  linesAdded?: number;
  linesModified?: number;
  linesDeleted?: number;
  filesChanged?: number;
  features?: number;
  bugs?: number;
  refactors?: number;
  prsCreated?: number;
  prsReviewed?: number;
  prsMerged?: number;
  hoursSaved?: number;
  value?: number;
  toolCalls?: number;
}

/**
 * Metric mapping configuration
 * Maps tool-specific metric names to normalized update fields
 */
export interface MetricMapping {
  pattern: string | RegExp;
  handler: (value: number, attributes: Record<string, unknown>) => NormalizedMetricUpdate;
}

/**
 * Universal metric mappings that work across all tools
 * These use standard OpenTelemetry GenAI semantic conventions
 */
export const UNIVERSAL_METRIC_MAPPINGS: MetricMapping[] = [
  // Standard GenAI token usage (works for all tools)
  {
    pattern: /^gen_ai\.client\.token\.usage$/,
    handler: (value, attrs) => {
      const tokenType = attrs["gen_ai.usage.token_type"] || attrs["type"];
      if (tokenType === "input") return { inputTokens: value };
      if (tokenType === "output") return { outputTokens: value };
      return {};
    },
  },
  // Standard GenAI operation duration
  {
    pattern: /^gen_ai\.client\.operation\.duration$/,
    handler: (value) => ({ minutes: Math.round(value / 60) }),
  },
];

/**
 * Claude Code specific metric mappings
 */
export const CLAUDE_CODE_METRIC_MAPPINGS: MetricMapping[] = [
  {
    pattern: "claude_code.session.count",
    handler: (value) => ({ sessions: value }),
  },
  {
    pattern: "claude_code.token.usage",
    handler: (value, attrs) => {
      const tokenType = attrs["gen_ai.usage.token_type"] || attrs["type"];
      if (tokenType === "input") return { inputTokens: value };
      if (tokenType === "output") return { outputTokens: value };
      return {};
    },
  },
  {
    pattern: "claude_code.cost.usage",
    handler: (value) => ({ tokenCost: value }),
  },
  {
    pattern: "claude_code.lines_of_code.count",
    handler: (value) => ({ linesAdded: value }),
  },
  {
    pattern: "claude_code.active_time.total",
    handler: (value) => ({ minutes: Math.round(value / 60) }),
  },
  {
    pattern: "claude_code.commit.count",
    handler: () => ({}), // Tracked via GitHub webhooks
  },
  {
    pattern: "claude_code.pull_request.count",
    handler: (value) => ({ prsCreated: value }),
  },
  {
    pattern: "claude_code.tool.usage",
    handler: (value) => ({ toolCalls: value }),
  },
];

/**
 * Gemini CLI specific metric mappings
 */
export const GEMINI_CLI_METRIC_MAPPINGS: MetricMapping[] = [
  {
    pattern: "gemini_cli.session.count",
    handler: (value) => ({ sessions: value }),
  },
  {
    pattern: "gemini_cli.token.usage",
    handler: (value, attrs) => {
      const tokenType = attrs["gen_ai.usage.token_type"] || attrs["type"];
      if (tokenType === "input") return { inputTokens: value };
      if (tokenType === "output") return { outputTokens: value };
      return {};
    },
  },
  {
    pattern: "gemini_cli.api.request.count",
    handler: (value) => ({ sessions: value }),
  },
  {
    pattern: "gemini_cli.tool.call.count",
    handler: (value) => ({ toolCalls: value }),
  },
  {
    pattern: "gemini_cli.file.operation.count",
    handler: (value) => ({ filesChanged: value }),
  },
  {
    pattern: "gemini_cli.lines.changed",
    handler: (value) => ({ linesAdded: value }),
  },
  {
    pattern: "gemini_cli.agent.run.count",
    handler: (value) => ({ sessions: value }),
  },
  {
    pattern: "gemini_cli.agent.duration",
    handler: (value) => ({ minutes: Math.round(value / 60000) }), // Assuming ms
  },
  // Fallback patterns for older metric names
  {
    pattern: "gemini.api_request.count",
    handler: (value) => ({ sessions: value }),
  },
  {
    pattern: "gemini.tool_call.count",
    handler: (value) => ({ toolCalls: value }),
  },
  {
    pattern: "gemini.file_operation.count",
    handler: (value) => ({ filesChanged: value }),
  },
  {
    pattern: "gemini.agent_run.count",
    handler: (value) => ({ sessions: value }),
  },
];

/**
 * OpenAI Codex CLI specific metric mappings
 */
export const CODEX_CLI_METRIC_MAPPINGS: MetricMapping[] = [
  {
    pattern: "codex.thread.started",
    handler: (value) => ({ sessions: value }),
  },
  {
    pattern: "codex.conversation.turn.count",
    handler: (value) => ({ sessions: value }),
  },
  {
    pattern: "codex.tool.call",
    handler: (value) => ({ toolCalls: value }),
  },
  {
    pattern: "codex.mcp.call",
    handler: (value) => ({ toolCalls: value }),
  },
  {
    pattern: "codex.model.call.duration_ms",
    handler: (value) => ({ minutes: Math.round(value / 60000) }),
  },
];

// ============================================
// TOOL DETECTION
// ============================================

/**
 * Detect which tool sent the telemetry based on resource attributes and metric names
 */
export function detectTool(
  resourceAttributes: OtlpKeyValue[] | undefined,
  metricName?: string
): ToolId {
  // First try to match by service.name
  const serviceName = getStringAttr(resourceAttributes, "service.name")?.toLowerCase() ?? "";

  for (const [toolId, tool] of Object.entries(TOOL_REGISTRY)) {
    if (toolId === "other") continue; // Skip 'other' for pattern matching

    for (const pattern of tool.serviceNamePatterns) {
      if (serviceName.includes(pattern.toLowerCase())) {
        return toolId as ToolId;
      }
    }
  }

  // Try to match by metric prefix
  if (metricName) {
    for (const [toolId, tool] of Object.entries(TOOL_REGISTRY)) {
      if (toolId === "other") continue;

      for (const prefix of tool.metricPrefixes) {
        if (metricName.startsWith(prefix) && !prefix.startsWith("gen_ai.")) {
          return toolId as ToolId;
        }
      }
    }
  }

  // Check for tool-specific attributes
  const toolAttr = getStringAttr(resourceAttributes, "tool.name")?.toLowerCase();
  if (toolAttr) {
    if (toolAttr.includes("claude")) return "claude_code";
    if (toolAttr.includes("gemini")) return "gemini";
    if (toolAttr.includes("codex")) return "codex";
    if (toolAttr.includes("copilot")) return "copilot";
    if (toolAttr.includes("cursor")) return "cursor";
    if (toolAttr.includes("kiro")) return "kiro";
  }

  return "other";
}

/**
 * Get all metric mappings for a specific tool, including universal mappings
 */
export function getMetricMappingsForTool(toolId: ToolId): MetricMapping[] {
  const toolSpecificMappings: Record<ToolId, MetricMapping[]> = {
    claude_code: CLAUDE_CODE_METRIC_MAPPINGS,
    gemini: GEMINI_CLI_METRIC_MAPPINGS,
    codex: CODEX_CLI_METRIC_MAPPINGS,
    copilot: [], // No OTEL support
    cursor: [], // No OTEL support
    kiro: [], // No OTEL support
    other: [],
  };

  return [...UNIVERSAL_METRIC_MAPPINGS, ...(toolSpecificMappings[toolId] || [])];
}

/**
 * Find the appropriate metric handler for a given metric name
 */
export function findMetricHandler(
  metricName: string,
  toolId: ToolId
): MetricMapping["handler"] | null {
  const mappings = getMetricMappingsForTool(toolId);

  for (const mapping of mappings) {
    if (typeof mapping.pattern === "string") {
      if (metricName === mapping.pattern) {
        return mapping.handler;
      }
    } else if (mapping.pattern.test(metricName)) {
      return mapping.handler;
    }
  }

  return null;
}

// ============================================
// LOG EVENT MAPPINGS
// ============================================

export interface LogEventMapping {
  pattern: string | RegExp;
  handler: (attributes: Record<string, unknown>) => NormalizedMetricUpdate;
}

/**
 * Claude Code log event mappings
 */
export const CLAUDE_CODE_LOG_MAPPINGS: LogEventMapping[] = [
  {
    pattern: "claude_code.api_request",
    handler: (attrs) => ({
      inputTokens: typeof attrs.input_tokens === "number" ? attrs.input_tokens : 0,
      outputTokens: typeof attrs.output_tokens === "number" ? attrs.output_tokens : 0,
      tokenCost: typeof attrs.cost === "number" ? attrs.cost : 0,
    }),
  },
];

/**
 * Gemini CLI log event mappings
 */
export const GEMINI_CLI_LOG_MAPPINGS: LogEventMapping[] = [
  {
    pattern: "gemini_cli.api_request",
    handler: (attrs) => ({
      inputTokens: typeof attrs.input_tokens === "number" ? attrs.input_tokens : 0,
      outputTokens: typeof attrs.output_tokens === "number" ? attrs.output_tokens : 0,
    }),
  },
  {
    pattern: "gemini_cli.tool_call",
    handler: () => ({ toolCalls: 1 }),
  },
  {
    pattern: "gemini_cli.file_operation",
    handler: () => ({ filesChanged: 1 }),
  },
  {
    pattern: "gemini_cli.agent.finish",
    handler: (attrs) => ({
      sessions: 1,
      minutes: typeof attrs.duration_ms === "number" ? Math.round(attrs.duration_ms / 60000) : 0,
    }),
  },
];

/**
 * Codex CLI log event mappings
 */
export const CODEX_CLI_LOG_MAPPINGS: LogEventMapping[] = [
  {
    pattern: "codex.api_request",
    handler: (attrs) => ({
      inputTokens: typeof attrs.input_tokens === "number" ? attrs.input_tokens : 0,
      outputTokens: typeof attrs.output_tokens === "number" ? attrs.output_tokens : 0,
    }),
  },
  {
    pattern: "codex.conversation_starts",
    handler: () => ({ sessions: 1 }),
  },
  {
    pattern: "codex.tool_result",
    handler: () => ({ toolCalls: 1 }),
  },
];

/**
 * Get log event mappings for a tool
 */
export function getLogMappingsForTool(toolId: ToolId): LogEventMapping[] {
  const mappings: Record<ToolId, LogEventMapping[]> = {
    claude_code: CLAUDE_CODE_LOG_MAPPINGS,
    gemini: GEMINI_CLI_LOG_MAPPINGS,
    codex: CODEX_CLI_LOG_MAPPINGS,
    copilot: [],
    cursor: [],
    kiro: [],
    other: [],
  };

  return mappings[toolId] || [];
}

/**
 * Find the appropriate log event handler
 */
export function findLogHandler(
  eventName: string,
  toolId: ToolId
): LogEventMapping["handler"] | null {
  const mappings = getLogMappingsForTool(toolId);

  for (const mapping of mappings) {
    if (typeof mapping.pattern === "string") {
      if (eventName === mapping.pattern) {
        return mapping.handler;
      }
    } else if (mapping.pattern.test(eventName)) {
      return mapping.handler;
    }
  }

  return null;
}
