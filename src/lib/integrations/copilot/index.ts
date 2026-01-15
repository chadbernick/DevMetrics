/**
 * GitHub Copilot Integration
 *
 * GitHub Copilot metrics via REST API polling (not OTLP).
 * This module is completely self-contained and isolated from other integrations.
 */

export const COPILOT_INTEGRATION = {
  id: "copilot" as const,
  displayName: "GitHub Copilot",
  description: "GitHub's AI pair programmer (REST API)",

  // Protocol configuration - REST API, not OTLP
  supportedProtocols: ["rest-api"] as const,
  preferredProtocol: "rest-api" as const,

  // Endpoint paths
  endpoints: {
    sync: "/api/v1/integrations/copilot/sync",
  },

  // Documentation
  docsPath: "src/lib/integrations/copilot/COPILOT.md",
  externalDocsUrl: "https://docs.github.com/en/rest/copilot",

  // UI configuration
  color: "#6e40c9",
  logo: "github",
};

export type CopilotIntegration = typeof COPILOT_INTEGRATION;
