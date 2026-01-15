/**
 * GitHub Integration Module
 *
 * Handles GitHub webhook events for tracking commits and PRs.
 */

export const GITHUB_INTEGRATION = {
  id: "github",
  displayName: "GitHub",
  description: "Track commits and pull requests via webhooks",
  endpoints: {
    webhook: "/api/v1/webhooks/github",
  },
  supportedEvents: [
    "push",
    "pull_request",
    "pull_request_review",
  ],
};

// Re-export utilities
export { verifyWebhookSignature } from "./signature";
export { classifyCommitMessage, classifyPrTitle, getSupportedWorkTypes } from "./classifier";
export type { WorkType, ClassificationResult } from "./classifier";
