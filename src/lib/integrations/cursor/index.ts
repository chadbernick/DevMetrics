/**
 * Cursor Integration
 *
 * Cursor AI coding IDE. No native API - uses git hooks for tracking.
 */

export const CURSOR_INTEGRATION = {
  id: "cursor" as const,
  displayName: "Cursor",
  description: "AI-first code editor (git hooks)",

  supportedProtocols: ["manual"] as const,
  preferredProtocol: "manual" as const,

  endpoints: {
    ingest: "/api/v1/integrations/cursor/ingest",
  },

  docsPath: "src/lib/integrations/cursor/CURSOR.md",
  externalDocsUrl: "https://cursor.sh",

  color: "#00D4FF",
  logo: "cursor",
};

export type CursorIntegration = typeof CURSOR_INTEGRATION;
