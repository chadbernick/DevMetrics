/**
 * Gemini CLI Integration
 *
 * Google's AI coding assistant CLI with OpenTelemetry support.
 * This module is completely self-contained and isolated from other integrations.
 */

export const GEMINI_INTEGRATION = {
  id: "gemini" as const,
  displayName: "Gemini CLI",
  description: "Google's AI coding assistant CLI",

  // Protocol configuration - JSON only (no protobuf)
  supportedProtocols: ["http/json"] as const,
  preferredProtocol: "http/json" as const,

  // Endpoint paths
  endpoints: {
    metrics: "/api/v1/integrations/gemini/metrics",
    logs: "/api/v1/integrations/gemini/logs",
  },

  // Documentation
  docsPath: "src/lib/integrations/gemini/GEMINI.md",
  externalDocsUrl: "https://github.com/google-gemini/gemini-cli",

  // Supported metric names (this integration ONLY handles these)
  metricNames: [
    // Standard GenAI metrics
    "gen_ai.client.token.usage",
    "gen_ai.client.operation.duration",
    // Gemini-specific metrics (new naming convention)
    "gemini_cli.session.count",
    "gemini_cli.token.usage",
    "gemini_cli.api.request.count",
    "gemini_cli.api.request.latency",
    "gemini_cli.tool.call.count",
    "gemini_cli.tool.call.latency",
    "gemini_cli.file.operation.count",
    "gemini_cli.lines.changed",
    "gemini_cli.agent.run.count",
    "gemini_cli.agent.duration",
    "gemini_cli.agent.turns",
    // Legacy metric names (for backwards compatibility)
    "gemini.tool_call.count",
    "gemini.tool_call.latency",
    "gemini.api_request.count",
    "gemini.api_request.latency",
    "gemini.file_operation.count",
    "gemini.agent_run.count",
    "gemini.agent_run.duration",
  ] as const,

  // Supported log event names (this integration ONLY handles these)
  logEventNames: [
    "gemini_cli.config",
    "gemini_cli.user_prompt",
    "gemini_cli.tool_call",
    "gemini_cli.tool_output_truncated",
    "gemini_cli.edit_strategy",
    "gemini_cli.edit_correction",
    "gemini_cli.file_operation",
    "gemini_cli.api_request",
    "gemini_cli.api_response",
    "gemini_cli.api_error",
    "gemini_cli.slash_command",
    "gemini_cli.model_routing",
    "gemini_cli.agent.start",
    "gemini_cli.agent.finish",
    "gen_ai.client.inference.operation.details",
  ] as const,

  // UI configuration
  color: "#4285F4",
  logo: "google",
};

export type GeminiIntegration = typeof GEMINI_INTEGRATION;
export type GeminiMetricName = (typeof GEMINI_INTEGRATION.metricNames)[number];
export type GeminiLogEventName =
  (typeof GEMINI_INTEGRATION.logEventNames)[number];
