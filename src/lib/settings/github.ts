/**
 * GitHub Settings
 *
 * Type-safe accessors for GitHub-specific settings.
 */

import { getSetting, setSetting } from "./index";

/**
 * GitHub username to user ID mapping
 */
export interface GitHubUserMapping {
  [githubUsername: string]: string; // maps to userId
}

/**
 * GitHub integration settings
 */
export interface GitHubSettings {
  webhookSecret: string | null;
  userMappings: GitHubUserMapping;
  defaultUserId: string | null;
  enableSignatureVerification: boolean;
}

// Settings keys
const KEYS = {
  WEBHOOK_SECRET: "github_webhook_secret",
  USER_MAPPINGS: "github_user_mappings",
  DEFAULT_USER_ID: "github_default_user_id",
  ENABLE_SIGNATURE_VERIFICATION: "github_enable_signature_verification",
} as const;

/**
 * Get GitHub user mappings (GitHub username -> userId)
 */
export async function getGitHubUserMappings(): Promise<GitHubUserMapping> {
  return getSetting<GitHubUserMapping>(KEYS.USER_MAPPINGS, {});
}

/**
 * Set GitHub user mappings
 */
export async function setGitHubUserMappings(mappings: GitHubUserMapping): Promise<void> {
  await setSetting(
    KEYS.USER_MAPPINGS,
    mappings,
    "Maps GitHub usernames to internal user IDs"
  );
}

/**
 * Get GitHub webhook secret
 */
export async function getGitHubWebhookSecret(): Promise<string | null> {
  return getSetting<string | null>(KEYS.WEBHOOK_SECRET, null);
}

/**
 * Set GitHub webhook secret
 */
export async function setGitHubWebhookSecret(secret: string): Promise<void> {
  await setSetting(
    KEYS.WEBHOOK_SECRET,
    secret,
    "GitHub webhook signature verification secret"
  );
}

/**
 * Get default user ID for GitHub events when no mapping exists
 */
export async function getGitHubDefaultUserId(): Promise<string | null> {
  return getSetting<string | null>(KEYS.DEFAULT_USER_ID, null);
}

/**
 * Set default user ID for GitHub events
 */
export async function setGitHubDefaultUserId(userId: string): Promise<void> {
  await setSetting(
    KEYS.DEFAULT_USER_ID,
    userId,
    "Default user ID for GitHub events when no mapping exists"
  );
}

/**
 * Check if webhook signature verification is enabled
 */
export async function isSignatureVerificationEnabled(): Promise<boolean> {
  return getSetting<boolean>(KEYS.ENABLE_SIGNATURE_VERIFICATION, true);
}

/**
 * Set signature verification enabled state
 */
export async function setSignatureVerificationEnabled(enabled: boolean): Promise<void> {
  await setSetting(
    KEYS.ENABLE_SIGNATURE_VERIFICATION,
    enabled,
    "Whether to verify GitHub webhook signatures"
  );
}

/**
 * Get all GitHub settings
 */
export async function getGitHubSettings(): Promise<GitHubSettings> {
  const [webhookSecret, userMappings, defaultUserId, enableSignatureVerification] =
    await Promise.all([
      getGitHubWebhookSecret(),
      getGitHubUserMappings(),
      getGitHubDefaultUserId(),
      isSignatureVerificationEnabled(),
    ]);

  return {
    webhookSecret,
    userMappings,
    defaultUserId,
    enableSignatureVerification,
  };
}

/**
 * Look up user ID by GitHub username
 * Falls back to default user ID if no mapping exists
 */
export async function getUserIdByGitHubUsername(
  githubUsername: string
): Promise<string | null> {
  const mappings = await getGitHubUserMappings();
  const userId = mappings[githubUsername];

  if (userId) {
    return userId;
  }

  // Fall back to default user ID
  return getGitHubDefaultUserId();
}
