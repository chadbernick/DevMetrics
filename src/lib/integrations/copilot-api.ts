/**
 * GitHub Copilot Metrics API Integration
 *
 * Polls the GitHub Copilot Metrics API to fetch usage data.
 * Requires GitHub Enterprise with Copilot Business/Enterprise and appropriate permissions.
 *
 * Reference: https://docs.github.com/en/rest/copilot/copilot-metrics
 */

import type { CopilotMetricsResponse } from "@/lib/otlp/types";

export interface CopilotConfig {
  githubToken: string;
  organizationSlug?: string;
  enterpriseSlug?: string;
  teamSlug?: string;
}

export interface NormalizedCopilotMetrics {
  date: string;
  totalActiveUsers: number;
  totalEngagedUsers: number;
  totalCodeSuggestions: number;
  totalCodeAcceptances: number;
  totalLinesAccepted: number;
  totalChats: number;
  acceptanceRate: number;
}

/**
 * Fetch Copilot metrics from GitHub API
 */
export async function fetchCopilotMetrics(
  config: CopilotConfig,
  since?: string,
  until?: string
): Promise<CopilotMetricsResponse[]> {
  const baseUrl = "https://api.github.com";
  let endpoint: string;

  // Determine endpoint based on config
  if (config.enterpriseSlug) {
    endpoint = `/enterprises/${config.enterpriseSlug}/copilot/metrics`;
  } else if (config.organizationSlug && config.teamSlug) {
    endpoint = `/orgs/${config.organizationSlug}/team/${config.teamSlug}/copilot/metrics`;
  } else if (config.organizationSlug) {
    endpoint = `/orgs/${config.organizationSlug}/copilot/metrics`;
  } else {
    throw new Error("Must provide either enterpriseSlug or organizationSlug");
  }

  const params = new URLSearchParams();
  if (since) params.append("since", since);
  if (until) params.append("until", until);

  const url = `${baseUrl}${endpoint}${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Copilot API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Normalize Copilot metrics to our standard format
 */
export function normalizeCopilotMetrics(
  rawMetrics: CopilotMetricsResponse[]
): NormalizedCopilotMetrics[] {
  return rawMetrics.map((day) => {
    let totalCodeSuggestions = 0;
    let totalCodeAcceptances = 0;
    let totalLinesAccepted = 0;
    let totalChats = 0;

    // Aggregate IDE code completions
    if (day.copilot_ide_code_completions?.editors) {
      for (const editor of day.copilot_ide_code_completions.editors) {
        for (const model of editor.models ?? []) {
          for (const lang of model.languages ?? []) {
            totalCodeSuggestions += lang.total_code_suggestions ?? 0;
            totalCodeAcceptances += lang.total_code_acceptances ?? 0;
            totalLinesAccepted += lang.total_code_lines_accepted ?? 0;
          }
        }
      }
    }

    // Aggregate IDE chat
    if (day.copilot_ide_chat?.editors) {
      for (const editor of day.copilot_ide_chat.editors) {
        for (const model of editor.models ?? []) {
          totalChats += model.total_chats ?? 0;
        }
      }
    }

    // Aggregate dotcom chat
    if (day.copilot_dotcom_chat?.models) {
      for (const model of day.copilot_dotcom_chat.models) {
        totalChats += model.total_chats ?? 0;
      }
    }

    const acceptanceRate =
      totalCodeSuggestions > 0
        ? (totalCodeAcceptances / totalCodeSuggestions) * 100
        : 0;

    return {
      date: day.date,
      totalActiveUsers: day.total_active_users ?? 0,
      totalEngagedUsers: day.total_engaged_users ?? 0,
      totalCodeSuggestions,
      totalCodeAcceptances,
      totalLinesAccepted,
      totalChats,
      acceptanceRate,
    };
  });
}

/**
 * Convert Copilot metrics to daily aggregate updates
 */
export function copilotMetricsToAggregateUpdates(
  metrics: NormalizedCopilotMetrics
): {
  sessions: number;
  linesAdded: number;
} {
  return {
    // Use chats + suggestions as proxy for "sessions"
    sessions: metrics.totalChats + Math.ceil(metrics.totalCodeSuggestions / 10),
    // Lines accepted is closest to lines added
    linesAdded: metrics.totalLinesAccepted,
  };
}
