/**
 * OpenAI Codex CLI Integration
 *
 * OpenAI's AI coding assistant CLI with OpenTelemetry support.
 * This module is completely self-contained and isolated from other integrations.
 */

export const CODEX_INTEGRATION = {
  id: "codex" as const,
  displayName: "OpenAI Codex",
  description: "OpenAI's AI coding assistant CLI",

  // Protocol configuration
  supportedProtocols: ["http/protobuf", "http/json"] as const,
  preferredProtocol: "http/protobuf" as const,

  // Endpoint paths (logs only - Codex primarily uses logs)
  endpoints: {
    logs: "/api/v1/integrations/codex/logs",
  },

  // Documentation
  docsPath: "src/lib/integrations/codex/CODEX.md",
  externalDocsUrl: "https://developers.openai.com/codex",

  // Supported log event names (this integration ONLY handles these)
  logEventNames: [
    "codex.conversation_starts",
    "codex.api_request",
    "codex.sse_event",
    "codex.user_prompt",
    "codex.tool_decision",
    "codex.tool_result",
  ] as const,

  // UI configuration
  color: "#10A37F",
  logo: "openai",
};

export type CodexIntegration = typeof CODEX_INTEGRATION;
export type CodexLogEventName = (typeof CODEX_INTEGRATION.logEventNames)[number];
