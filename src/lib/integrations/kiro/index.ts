/**
 * Kiro Integration
 *
 * AWS Kiro AI coding assistant. No native OTLP support - uses manual ingest.
 */

export const KIRO_INTEGRATION = {
  id: "kiro" as const,
  displayName: "Kiro",
  description: "AWS AI coding assistant (manual ingest)",

  supportedProtocols: ["manual"] as const,
  preferredProtocol: "manual" as const,

  endpoints: {
    ingest: "/api/v1/integrations/kiro/ingest",
  },

  docsPath: "src/lib/integrations/kiro/KIRO.md",
  externalDocsUrl: "https://aws.amazon.com/kiro",

  color: "#FF9900",
  logo: "aws",
};

export type KiroIntegration = typeof KIRO_INTEGRATION;
