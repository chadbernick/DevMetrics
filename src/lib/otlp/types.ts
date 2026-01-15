// OTLP JSON types based on OpenTelemetry Protocol specification
// https://opentelemetry.io/docs/specs/otlp/

// Common types
export interface OtlpKeyValue {
  key: string;
  value: OtlpAnyValue;
}

export interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string | number; // OTLP uses string for int64
  doubleValue?: number;
  arrayValue?: { values: OtlpAnyValue[] };
  kvlistValue?: { values: OtlpKeyValue[] };
  bytesValue?: string; // base64 encoded
}

export interface OtlpResource {
  attributes?: OtlpKeyValue[];
  droppedAttributesCount?: number;
}

export interface OtlpInstrumentationScope {
  name?: string;
  version?: string;
  attributes?: OtlpKeyValue[];
  droppedAttributesCount?: number;
}

// ============================================
// METRICS
// ============================================

export interface OtlpExportMetricsServiceRequest {
  resourceMetrics?: OtlpResourceMetrics[];
}

export interface OtlpResourceMetrics {
  resource?: OtlpResource;
  scopeMetrics?: OtlpScopeMetrics[];
  schemaUrl?: string;
}

export interface OtlpScopeMetrics {
  scope?: OtlpInstrumentationScope;
  metrics?: OtlpMetric[];
  schemaUrl?: string;
}

export interface OtlpMetric {
  name: string;
  description?: string;
  unit?: string;
  // One of the following:
  gauge?: OtlpGauge;
  sum?: OtlpSum;
  histogram?: OtlpHistogram;
  exponentialHistogram?: OtlpExponentialHistogram;
  summary?: OtlpSummary;
}

export interface OtlpGauge {
  dataPoints?: OtlpNumberDataPoint[];
}

export interface OtlpSum {
  dataPoints?: OtlpNumberDataPoint[];
  aggregationTemporality?: number; // 1=DELTA, 2=CUMULATIVE
  isMonotonic?: boolean;
}

export interface OtlpHistogram {
  dataPoints?: OtlpHistogramDataPoint[];
  aggregationTemporality?: number;
}

export interface OtlpExponentialHistogram {
  dataPoints?: OtlpExponentialHistogramDataPoint[];
  aggregationTemporality?: number;
}

export interface OtlpSummary {
  dataPoints?: OtlpSummaryDataPoint[];
}

export interface OtlpNumberDataPoint {
  attributes?: OtlpKeyValue[];
  startTimeUnixNano?: string;
  timeUnixNano?: string;
  asDouble?: number;
  asInt?: string | number;
  exemplars?: OtlpExemplar[];
  flags?: number;
}

export interface OtlpHistogramDataPoint {
  attributes?: OtlpKeyValue[];
  startTimeUnixNano?: string;
  timeUnixNano?: string;
  count?: string | number;
  sum?: number;
  bucketCounts?: (string | number)[];
  explicitBounds?: number[];
  exemplars?: OtlpExemplar[];
  flags?: number;
  min?: number;
  max?: number;
}

export interface OtlpExponentialHistogramDataPoint {
  attributes?: OtlpKeyValue[];
  startTimeUnixNano?: string;
  timeUnixNano?: string;
  count?: string | number;
  sum?: number;
  scale?: number;
  zeroCount?: string | number;
  positive?: OtlpBuckets;
  negative?: OtlpBuckets;
  flags?: number;
  exemplars?: OtlpExemplar[];
  min?: number;
  max?: number;
  zeroThreshold?: number;
}

export interface OtlpBuckets {
  offset?: number;
  bucketCounts?: (string | number)[];
}

export interface OtlpSummaryDataPoint {
  attributes?: OtlpKeyValue[];
  startTimeUnixNano?: string;
  timeUnixNano?: string;
  count?: string | number;
  sum?: number;
  quantileValues?: OtlpQuantileValue[];
  flags?: number;
}

export interface OtlpQuantileValue {
  quantile?: number;
  value?: number;
}

export interface OtlpExemplar {
  filteredAttributes?: OtlpKeyValue[];
  timeUnixNano?: string;
  asDouble?: number;
  asInt?: string | number;
  spanId?: string;
  traceId?: string;
}

// ============================================
// LOGS
// ============================================

export interface OtlpExportLogsServiceRequest {
  resourceLogs?: OtlpResourceLogs[];
}

export interface OtlpResourceLogs {
  resource?: OtlpResource;
  scopeLogs?: OtlpScopeLogs[];
  schemaUrl?: string;
}

export interface OtlpScopeLogs {
  scope?: OtlpInstrumentationScope;
  logRecords?: OtlpLogRecord[];
  schemaUrl?: string;
}

export interface OtlpLogRecord {
  timeUnixNano?: string;
  observedTimeUnixNano?: string;
  severityNumber?: number; // 1-24 (TRACE to FATAL)
  severityText?: string;
  body?: OtlpAnyValue;
  attributes?: OtlpKeyValue[];
  droppedAttributesCount?: number;
  flags?: number;
  traceId?: string; // hex
  spanId?: string; // hex
}

// ============================================
// RESPONSE
// ============================================

export interface OtlpExportResponse {
  partialSuccess?: {
    rejectedDataPoints?: number;
    rejectedLogRecords?: number;
    errorMessage?: string;
  };
}

// ============================================
// CLAUDE CODE SPECIFIC TYPES
// ============================================

// All metric names from Claude Code telemetry
// Reference: https://code.claude.com/docs/en/monitoring-usage
export type ClaudeCodeMetricName =
  // Session metrics
  | "claude_code.session.count" // CLI sessions initiated
  // Token metrics
  | "claude_code.token.usage" // Token consumption (input/output/cache)
  | "gen_ai.client.token.usage" // Standard GenAI token usage
  // Cost metrics
  | "claude_code.cost.usage" // Session costs in USD
  // Code metrics
  | "claude_code.lines_of_code.count" // Lines of code changed
  // Time metrics
  | "claude_code.active_time.total" // Active session duration in seconds
  | "gen_ai.client.operation.duration" // Standard GenAI operation duration
  // Git metrics
  | "claude_code.commit.count" // Git commits
  | "claude_code.pull_request.count" // Pull requests created
  // Tool metrics
  | "claude_code.code_edit_tool.decision" // Code edit acceptance/rejection
  | "claude_code.tool.usage"; // General tool usage count

// All log event names from Claude Code telemetry
export type ClaudeCodeLogEventName =
  // API events
  | "claude_code.api_request" // API calls with token/cost details
  | "claude_code.api_error" // API failures
  // Tool events
  | "claude_code.tool_result" // Tool execution outcomes
  | "claude_code.tool_decision" // Tool authorization decisions
  | "claude_code.code_edit_tool.decision" // Code edit decisions
  // User events
  | "claude_code.user_prompt"; // User prompt submissions

// Metric definitions for dashboard configuration
export interface ClaudeCodeMetricDefinition {
  name: ClaudeCodeMetricName;
  displayName: string;
  description: string;
  category: "usage" | "cost" | "productivity" | "code" | "activity";
  format: "number" | "currency" | "percentage" | "duration" | "tokens";
  aggregateField?: string; // Field in dailyAggregates
  icon: string;
  color: string;
}

// All available Claude Code metrics with their definitions
export const CLAUDE_CODE_METRICS: Record<string, ClaudeCodeMetricDefinition> = {
  sessions: {
    name: "claude_code.session.count",
    displayName: "Total Sessions",
    description: "Count of AI coding sessions started",
    category: "usage",
    format: "number",
    aggregateField: "totalSessions",
    icon: "Zap",
    color: "cyan",
  },
  inputTokens: {
    name: "claude_code.token.usage",
    displayName: "Input Tokens",
    description: "Total input tokens consumed",
    category: "usage",
    format: "tokens",
    aggregateField: "totalInputTokens",
    icon: "ArrowUpRight",
    color: "cyan",
  },
  outputTokens: {
    name: "claude_code.token.usage",
    displayName: "Output Tokens",
    description: "Total output tokens generated",
    category: "usage",
    format: "tokens",
    aggregateField: "totalOutputTokens",
    icon: "ArrowDownRight",
    color: "purple",
  },
  totalCost: {
    name: "claude_code.cost.usage",
    displayName: "Total Cost",
    description: "Total cost in USD",
    category: "cost",
    format: "currency",
    aggregateField: "totalTokenCostUsd",
    icon: "DollarSign",
    color: "green",
  },
  linesOfCode: {
    name: "claude_code.lines_of_code.count",
    displayName: "Lines of Code (Total)",
    description: "Total lines of code changed",
    category: "code",
    format: "number",
    aggregateField: "totalLinesAdded",
    icon: "Code2",
    color: "purple",
  },
  aiLines: {
    name: "claude_code.lines_of_code.count",
    displayName: "AI Generated Lines",
    description: "Lines of code generated by AI",
    category: "code",
    format: "number",
    aggregateField: "aiLinesAdded",
    icon: "Code2",
    color: "pink",
  },
  gitLines: {
    name: "claude_code.commit.count",
    displayName: "Committed Lines",
    description: "Lines of code committed to Git",
    category: "code",
    format: "number",
    aggregateField: "gitLinesAdded",
    icon: "GitCommit",
    color: "cyan",
  },
  activeTime: {
    name: "claude_code.active_time.total",
    displayName: "Active Time",
    description: "Total active session time",
    category: "usage",
    format: "duration",
    aggregateField: "totalMinutes",
    icon: "Clock",
    color: "cyan",
  },
  commits: {
    name: "claude_code.commit.count",
    displayName: "Commits",
    description: "Git commits made",
    category: "activity",
    format: "number",
    icon: "GitCommit",
    color: "green",
  },
  pullRequests: {
    name: "claude_code.pull_request.count",
    displayName: "Pull Requests",
    description: "Pull requests created",
    category: "activity",
    format: "number",
    aggregateField: "prsCreated",
    icon: "GitPullRequest",
    color: "purple",
  },
  codeEditDecisions: {
    name: "claude_code.code_edit_tool.decision",
    displayName: "Code Edit Decisions",
    description: "Code edit acceptance/rejection rate",
    category: "productivity",
    format: "number",
    icon: "CheckCircle",
    color: "green",
  },
  hoursSaved: {
    name: "claude_code.active_time.total",
    displayName: "Hours Saved",
    description: "Estimated time saved using AI",
    category: "productivity",
    format: "duration",
    aggregateField: "estimatedHoursSaved",
    icon: "Clock",
    color: "green",
  },
  roi: {
    name: "claude_code.cost.usage",
    displayName: "ROI",
    description: "Return on investment percentage",
    category: "productivity",
    format: "percentage",
    icon: "TrendingUp",
    color: "cyan",
  },
};

// Log event definitions
export interface ClaudeCodeLogEventDefinition {
  name: ClaudeCodeLogEventName;
  displayName: string;
  description: string;
}

export const CLAUDE_CODE_LOG_EVENTS: Record<string, ClaudeCodeLogEventDefinition> = {
  apiRequest: {
    name: "claude_code.api_request",
    displayName: "API Requests",
    description: "API calls with token and cost details",
  },
  apiError: {
    name: "claude_code.api_error",
    displayName: "API Errors",
    description: "API failures and errors",
  },
  toolResult: {
    name: "claude_code.tool_result",
    displayName: "Tool Results",
    description: "Tool execution outcomes and timing",
  },
  toolDecision: {
    name: "claude_code.tool_decision",
    displayName: "Tool Decisions",
    description: "Tool authorization decisions",
  },
  userPrompt: {
    name: "claude_code.user_prompt",
    displayName: "User Prompts",
    description: "User prompt submissions",
  },
  codeEditDecision: {
    name: "claude_code.code_edit_tool.decision",
    displayName: "Code Edit Decisions",
    description: "Code edit acceptance/rejection",
  },
};

// Parsed API request attributes
export interface ClaudeCodeApiRequestAttributes {
  model?: string;
  cost?: number;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
}

// Parsed tool result attributes
export interface ClaudeCodeToolResultAttributes {
  tool_name?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
}

// Parsed user prompt attributes
export interface ClaudeCodeUserPromptAttributes {
  prompt_length?: number;
  prompt_content?: string; // Only if OTEL_LOG_USER_PROMPTS=1
}

// Parsed code edit decision attributes (Claude Code)
export interface ClaudeCodeEditDecisionAttributes {
  decision?: "accepted" | "rejected" | "modified" | "auto_applied";
  edit_type?: string;
  file_path?: string;
  lines_affected?: number;
}

// Parsed tool call attributes (Gemini CLI)
export interface GeminiCliToolCallAttributes {
  tool_name?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
}

// Parsed edit strategy attributes (Gemini CLI)
export interface GeminiCliEditStrategyAttributes {
  strategy?: string;
  file_path?: string;
  lines_affected?: number;
}

// Parsed edit correction attributes (Gemini CLI)
export interface GeminiCliEditCorrectionAttributes {
  original_file?: string;
  correction_reason?: string;
  lines_corrected?: number;
}

// Parsed tool result attributes (Codex)
export interface CodexToolResultAttributes {
  tool_name?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
}

// Parsed tool decision attributes (Codex)
export interface CodexToolDecisionAttributes {
  decision?: "accepted" | "rejected" | "modified";
  tool_name?: string;
}

// Token usage type attribute
export type TokenUsageType =
  | "input"
  | "output"
  | "cache_read"
  | "cache_creation";

// ============================================
// GEMINI CLI SPECIFIC TYPES
// ============================================

// Gemini CLI metric names
// Reference: https://geminicli.com/docs/cli/telemetry/
export type GeminiCliMetricName =
  // Standard GenAI metrics (also used by Claude Code)
  | "gen_ai.client.token.usage"
  | "gen_ai.client.operation.duration"
  // Gemini-specific metrics (new naming convention)
  | "gemini_cli.session.count"
  | "gemini_cli.token.usage"
  | "gemini_cli.api.request.count"
  | "gemini_cli.api.request.latency"
  | "gemini_cli.tool.call.count"
  | "gemini_cli.tool.call.latency"
  | "gemini_cli.file.operation.count"
  | "gemini_cli.lines.changed"
  | "gemini_cli.agent.run.count"
  | "gemini_cli.agent.duration"
  | "gemini_cli.agent.turns"
  // Legacy metric names (for backwards compatibility)
  | "gemini.tool_call.count"
  | "gemini.tool_call.latency"
  | "gemini.api_request.count"
  | "gemini.api_request.latency"
  | "gemini.file_operation.count"
  | "gemini.chat_compression.count"
  | "gemini.model_routing.decision"
  | "gemini.agent_run.count"
  | "gemini.agent_run.duration";

// Gemini CLI log event names
export type GeminiCliLogEventName =
  | "gemini_cli.config"
  | "gemini_cli.user_prompt"
  | "gemini_cli.tool_call"
  | "gemini_cli.tool_output_truncated"
  | "gemini_cli.edit_strategy"
  | "gemini_cli.edit_correction"
  | "gemini_cli.file_operation"
  | "gemini_cli.api_request"
  | "gemini_cli.api_response"
  | "gemini_cli.api_error"
  | "gemini_cli.slash_command"
  | "gemini_cli.model_routing"
  | "gemini_cli.agent.start"
  | "gemini_cli.agent.finish"
  | "gen_ai.client.inference.operation.details";

// ============================================
// OPENAI CODEX CLI SPECIFIC TYPES
// ============================================

// Codex CLI metric names
// Reference: https://developers.openai.com/codex/config-advanced/
export type CodexCliMetricName =
  // Standard GenAI metrics
  | "gen_ai.client.token.usage"
  | "gen_ai.client.operation.duration"
  // Codex-specific metrics
  | "codex.features.state"
  | "codex.thread.started"
  | "codex.task.compact"
  | "codex.approval.requested"
  | "codex.conversation.turn.count"
  | "codex.mcp.call"
  | "codex.model.call.duration_ms"
  | "codex.tool.call"
  | "codex.user.feedback.submitted";

// Codex CLI log event names
export type CodexCliLogEventName =
  | "codex.conversation_starts"
  | "codex.api_request"
  | "codex.sse_event"
  | "codex.user_prompt"
  | "codex.tool_decision"
  | "codex.tool_result";

// ============================================
// GITHUB COPILOT TYPES (REST API)
// ============================================

// Copilot metrics from REST API
// Reference: https://docs.github.com/en/rest/copilot/copilot-metrics
export interface CopilotMetricsResponse {
  date: string;
  total_active_users: number;
  total_engaged_users: number;
  copilot_ide_code_completions?: {
    total_engaged_users: number;
    languages?: Array<{
      name: string;
      total_engaged_users: number;
    }>;
    editors?: Array<{
      name: string;
      total_engaged_users: number;
      models?: Array<{
        name: string;
        is_custom_model: boolean;
        total_engaged_users: number;
        languages?: Array<{
          name: string;
          total_engaged_users: number;
          total_code_suggestions: number;
          total_code_acceptances: number;
          total_code_lines_suggested: number;
          total_code_lines_accepted: number;
        }>;
      }>;
    }>;
  };
  copilot_ide_chat?: {
    total_engaged_users: number;
    editors?: Array<{
      name: string;
      total_engaged_users: number;
      models?: Array<{
        name: string;
        is_custom_model: boolean;
        total_engaged_users: number;
        total_chats: number;
        total_chat_insertion_events: number;
        total_chat_copy_events: number;
      }>;
    }>;
  };
  copilot_dotcom_chat?: {
    total_engaged_users: number;
    models?: Array<{
      name: string;
      is_custom_model: boolean;
      total_engaged_users: number;
      total_chats: number;
    }>;
  };
  copilot_dotcom_pull_requests?: {
    total_engaged_users: number;
    repositories?: Array<{
      name: string;
      total_engaged_users: number;
      models?: Array<{
        name: string;
        is_custom_model: boolean;
        total_pr_summaries_created: number;
        total_engaged_users: number;
      }>;
    }>;
  };
}

// Combined metric name type for all supported tools
export type SupportedMetricName = ClaudeCodeMetricName | GeminiCliMetricName | CodexCliMetricName;

// Gemini CLI metric definitions
export const GEMINI_CLI_METRICS: Record<string, ClaudeCodeMetricDefinition> = {
  geminiSessions: {
    name: "gen_ai.client.operation.duration" as ClaudeCodeMetricName,
    displayName: "Gemini Sessions",
    description: "Gemini CLI sessions",
    category: "usage",
    format: "number",
    aggregateField: "totalSessions",
    icon: "Zap",
    color: "purple",
  },
  geminiTokens: {
    name: "gen_ai.client.token.usage" as ClaudeCodeMetricName,
    displayName: "Gemini Tokens",
    description: "Tokens used in Gemini CLI",
    category: "usage",
    format: "tokens",
    icon: "ArrowUpRight",
    color: "purple",
  },
  geminiToolCalls: {
    name: "gemini.tool_call.count" as ClaudeCodeMetricName,
    displayName: "Tool Calls",
    description: "Gemini CLI tool executions",
    category: "activity",
    format: "number",
    icon: "Zap",
    color: "cyan",
  },
  geminiAgentRuns: {
    name: "gemini.agent_run.count" as ClaudeCodeMetricName,
    displayName: "Agent Runs",
    description: "Gemini agent executions",
    category: "activity",
    format: "number",
    icon: "Zap",
    color: "green",
  },
};
