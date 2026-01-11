import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ============================================
// USERS & TEAMS
// ============================================

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: text("role", { enum: ["admin", "developer", "viewer"] })
      .notNull()
      .default("developer"),
    engineerLevel: text("engineer_level", {
      enum: ["junior", "mid", "senior", "staff", "principal"],
    })
      .notNull()
      .default("mid"),
    teamId: text("team_id").references(() => teams.id),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_team_idx").on(table.teamId),
  ]
);

// ============================================
// AI TOOL SESSIONS
// ============================================

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tool: text("tool", {
      enum: ["claude_code", "kiro", "codex", "copilot", "cursor", "other"],
    }).notNull(),
    model: text("model"),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    durationMinutes: integer("duration_minutes"),
    status: text("status", { enum: ["active", "completed", "abandoned"] })
      .notNull()
      .default("active"),
    projectName: text("project_name"),
    metadata: text("metadata", { mode: "json" }),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_started_idx").on(table.startedAt),
    index("sessions_tool_idx").on(table.tool),
  ]
);

// ============================================
// TOKEN USAGE METRICS
// ============================================

export const tokenUsage = sqliteTable(
  "token_usage",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    timestamp: integer("timestamp", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    inputCostUsd: real("input_cost_usd").notNull().default(0),
    outputCostUsd: real("output_cost_usd").notNull().default(0),
    totalCostUsd: real("total_cost_usd").notNull().default(0),
    tool: text("tool").notNull(),
    model: text("model"),
  },
  (table) => [
    index("token_usage_session_idx").on(table.sessionId),
    index("token_usage_user_idx").on(table.userId),
    index("token_usage_timestamp_idx").on(table.timestamp),
  ]
);

// ============================================
// CODE METRICS
// ============================================

export const codeMetrics = sqliteTable(
  "code_metrics",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").references(() => sessions.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    timestamp: integer("timestamp", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    linesAdded: integer("lines_added").notNull().default(0),
    linesModified: integer("lines_modified").notNull().default(0),
    linesDeleted: integer("lines_deleted").notNull().default(0),
    filesChanged: integer("files_changed").notNull().default(0),
    language: text("language"),
    languages: text("languages", { mode: "json" }),
    repository: text("repository"),
    branch: text("branch"),
  },
  (table) => [
    index("code_metrics_session_idx").on(table.sessionId),
    index("code_metrics_user_idx").on(table.userId),
    index("code_metrics_timestamp_idx").on(table.timestamp),
  ]
);

// ============================================
// WORK ITEMS (Features, Bugs, etc.)
// ============================================

export const workItems = sqliteTable(
  "work_items",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").references(() => sessions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    timestamp: integer("timestamp", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    type: text("type", {
      enum: ["feature", "bug_fix", "refactor", "docs", "test", "chore", "other"],
    }).notNull(),
    source: text("source", { enum: ["commit", "pr", "manual"] }).notNull(),
    sourceId: text("source_id"),
    title: text("title").notNull(),
    description: text("description"),
    aiClassified: integer("ai_classified", { mode: "boolean" })
      .notNull()
      .default(true),
    confidence: real("confidence"),
    complexity: text("complexity", {
      enum: ["trivial", "simple", "medium", "complex", "very_complex"],
    }),
    estimatedHours: real("estimated_hours"),
  },
  (table) => [
    index("work_items_user_idx").on(table.userId),
    index("work_items_type_idx").on(table.type),
    index("work_items_timestamp_idx").on(table.timestamp),
  ]
);

// ============================================
// PR ACTIVITY
// ============================================

export const prActivity = sqliteTable(
  "pr_activity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    timestamp: integer("timestamp", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    prNumber: integer("pr_number").notNull(),
    repository: text("repository").notNull(),
    title: text("title"),
    action: text("action", {
      enum: ["created", "reviewed", "merged", "closed", "commented"],
    }).notNull(),
    aiAssisted: integer("ai_assisted", { mode: "boolean" })
      .notNull()
      .default(false),
    sessionId: text("session_id").references(() => sessions.id),
  },
  (table) => [
    index("pr_activity_user_idx").on(table.userId),
    index("pr_activity_timestamp_idx").on(table.timestamp),
  ]
);

// ============================================
// COST CONFIGURATION
// ============================================

export const costConfig = sqliteTable("cost_config", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),

  // Engineer hourly rates by level (USD)
  juniorHourlyRate: real("junior_hourly_rate").notNull().default(50),
  midHourlyRate: real("mid_hourly_rate").notNull().default(85),
  seniorHourlyRate: real("senior_hourly_rate").notNull().default(120),
  staffHourlyRate: real("staff_hourly_rate").notNull().default(160),
  principalHourlyRate: real("principal_hourly_rate").notNull().default(200),

  // Productivity multipliers
  featureMultiplier: real("feature_multiplier").notNull().default(3.0),
  bugFixMultiplier: real("bug_fix_multiplier").notNull().default(2.5),
  refactorMultiplier: real("refactor_multiplier").notNull().default(4.0),
  docsMultiplier: real("docs_multiplier").notNull().default(5.0),
  testMultiplier: real("test_multiplier").notNull().default(3.5),

  // Token pricing (per 1M tokens, USD)
  claudeInputPrice: real("claude_input_price").notNull().default(3.0),
  claudeOutputPrice: real("claude_output_price").notNull().default(15.0),
  gpt4InputPrice: real("gpt4_input_price").notNull().default(10.0),
  gpt4OutputPrice: real("gpt4_output_price").notNull().default(30.0),

  // Overhead
  overheadPercentage: real("overhead_percentage").notNull().default(30),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================
// DAILY AGGREGATES
// ============================================

export const dailyAggregates = sqliteTable(
  "daily_aggregates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    date: text("date").notNull(), // YYYY-MM-DD format

    // Session metrics
    totalSessions: integer("total_sessions").notNull().default(0),
    totalMinutes: integer("total_minutes").notNull().default(0),

    // Token metrics
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalTokenCostUsd: real("total_token_cost_usd").notNull().default(0),

    // Code metrics
    totalLinesAdded: integer("total_lines_added").notNull().default(0),
    totalLinesModified: integer("total_lines_modified").notNull().default(0),
    totalLinesDeleted: integer("total_lines_deleted").notNull().default(0),
    totalFilesChanged: integer("total_files_changed").notNull().default(0),

    // Work items
    featuresCompleted: integer("features_completed").notNull().default(0),
    bugsFixed: integer("bugs_fixed").notNull().default(0),
    refactorsCompleted: integer("refactors_completed").notNull().default(0),

    // PRs
    prsCreated: integer("prs_created").notNull().default(0),
    prsReviewed: integer("prs_reviewed").notNull().default(0),
    prsMerged: integer("prs_merged").notNull().default(0),

    // ROI metrics
    estimatedHoursSaved: real("estimated_hours_saved").notNull().default(0),
    estimatedValueUsd: real("estimated_value_usd").notNull().default(0),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("daily_aggregates_user_date_idx").on(table.userId, table.date),
    index("daily_aggregates_date_idx").on(table.date),
  ]
);

// ============================================
// API KEYS
// ============================================

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    scopes: text("scopes", { mode: "json" })
      .notNull()
      .$default(() => ["ingest"]),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("api_keys_user_idx").on(table.userId)]
);

// ============================================
// APPLICATION SETTINGS
// ============================================

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type CodeMetric = typeof codeMetrics.$inferSelect;
export type WorkItem = typeof workItems.$inferSelect;
export type PrActivity = typeof prActivity.$inferSelect;
export type CostConfig = typeof costConfig.$inferSelect;
export type DailyAggregate = typeof dailyAggregates.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
