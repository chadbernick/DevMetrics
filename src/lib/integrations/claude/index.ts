/**
 * Claude Code Integration
 *
 * Anthropic's AI coding assistant CLI with built-in OpenTelemetry support.
 * This module is completely self-contained and isolated from other integrations.
 */

export const CLAUDE_INTEGRATION = {
  id: "claude_code" as const,
  displayName: "Claude Code",
  description: "Anthropic's AI coding assistant CLI",

  // Protocol configuration
  supportedProtocols: ["http/protobuf", "http/json"] as const,
  preferredProtocol: "http/protobuf" as const,

  // Endpoint paths
  endpoints: {
    metrics: "/api/v1/integrations/claude/metrics",
    logs: "/api/v1/integrations/claude/logs",
  },

  // Documentation
  docsPath: "src/lib/integrations/claude/CLAUDE.md",
  externalDocsUrl: "https://docs.anthropic.com/en/docs/claude-code",

  // Supported metric names (this integration ONLY handles these)
  metricNames: [
    "claude_code.session.count",
    "claude_code.token.usage",
    "claude_code.cost.usage",
    "claude_code.lines_of_code.count",
    "claude_code.active_time.total",
    "claude_code.commit.count",
    "claude_code.pull_request.count",
    "claude_code.code_edit_tool.decision",
    "claude_code.tool.usage",
    // Also handle standard GenAI metrics when service.name is claude
    "gen_ai.client.token.usage",
    "gen_ai.client.operation.duration",
  ] as const,

  // Supported log event names (this integration ONLY handles these)
  logEventNames: [
    "claude_code.api_request",
    "claude_code.api_error",
    "claude_code.tool_result",
    "claude_code.tool_decision",
    "claude_code.user_prompt",
    "claude_code.code_edit_tool.decision",
  ] as const,

  // UI configuration
  color: "#FF6B35",
  logo: "anthropic",
};

export type ClaudeIntegration = typeof CLAUDE_INTEGRATION;
export type ClaudeMetricName = (typeof CLAUDE_INTEGRATION.metricNames)[number];
export type ClaudeLogEventName =
  (typeof CLAUDE_INTEGRATION.logEventNames)[number];
