"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Ghost,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface IntegrationsGuideProps {
  apiKeyPreview: string | null;
  userName: string | null;
}

type Tool = "claude-code" | "kiro" | "codex" | "copilot" | "cursor" | "github" | "gemini";

const tools: Array<{
  id: Tool;
  name: string;
  description: string;
  logo: React.ReactNode;
  docsUrl: string;
}> = [
  {
    id: "github",
    name: "GitHub",
    description: "Track commits, PRs, and code changes",
    logo: "🐙",
    docsUrl: "https://docs.github.com/webhooks",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic's AI coding assistant CLI",
    logo: "🤖",
    docsUrl: "https://docs.anthropic.com/claude-code",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    description: "Google's AI coding assistant CLI",
    logo: "✨",
    docsUrl: "https://geminicli.com",
  },
  {
    id: "kiro",
    name: "Kiro",
    description: "AWS's spec-driven AI development tool",
    logo: <Ghost className="h-8 w-8 text-purple-400" />,
    docsUrl: "https://kiro.dev",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    description: "OpenAI's code generation model",
    logo: "🔮",
    docsUrl: "https://openai.com/codex",
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    description: "AI pair programmer by GitHub",
    logo: "✈️",
    docsUrl: "https://github.com/features/copilot",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "AI-first code editor",
    logo: "📝",
    docsUrl: "https://cursor.sh",
  },
];

export function IntegrationsGuide({ apiKeyPreview, userName }: IntegrationsGuideProps) {
  const [selectedTool, setSelectedTool] = useState<Tool>("github");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const dashboardUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const getToolConfig = (tool: Tool, userName: string | null) => {
    const configs: Record<Tool, { steps: Array<{ title: string; code?: string; description: string; note?: string }>; envVars: string }> = {
      github: {
        envVars: `# Webhook URL to configure in GitHub
${dashboardUrl}/api/v1/webhooks/github`,
        steps: [
          {
            title: "1. Get Your Webhook URL",
            description: "Copy the webhook URL below to use when configuring GitHub:",
            code: `${dashboardUrl}/api/v1/webhooks/github`,
          },
          {
            title: "2. Configure GitHub Username Mapping",
            description: "Your GitHub username needs to be mapped to your dashboard user. Contact your admin or add a mapping in the database settings.",
            note: "The webhook uses your commit email or GitHub username to identify you.",
          },
          {
            title: "3. Add Webhook to Your Repository",
            description: "Go to your GitHub repository Settings > Webhooks > Add webhook:",
            code: `Payload URL: ${dashboardUrl}/api/v1/webhooks/github
Content type: application/json
Secret: (optional - leave blank for now)

Events to trigger:
- Push events (for tracking commits)
- Pull requests (for tracking PRs)
- Pull request reviews (for tracking reviews)`,
          },
          {
            title: "4. What Gets Tracked",
            description: "Once configured, the following will be automatically tracked:",
            code: `Commits:
- Automatically classified as Feature, Bug Fix, Refactor, etc.
- Based on commit message keywords (feat, fix, refactor, etc.)
- Files changed and estimated hours saved

Pull Requests:
- PRs created, merged, and closed
- Code review activity
- Lines added/deleted when PRs are merged`,
          },
          {
            title: "5. Verify Integration",
            description: "Push a commit or create a PR in your repository. Check your dashboard to see if the activity appears. Commits with messages containing 'feat', 'fix', 'refactor' will be categorized accordingly.",
          },
        ],
      },
      "claude-code": {
        envVars: `# OpenTelemetry Configuration
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=${dashboardUrl}/api/v1/otlp`,
        steps: [
          {
            title: "1. Enable OpenTelemetry",
            description: "Claude Code has built-in OpenTelemetry support. Add these environment variables to your shell profile to enable telemetry and send data to DevMetrics:",
            code: `# Add to ~/.zshenv (macOS) or ~/.bashrc (Linux)
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=${dashboardUrl}/api/v1/otlp

# Restart your terminal or run:
source ~/.zshenv`,
            note: "This uses Claude Code's native OpenTelemetry support - no custom scripts required.",
          },
          {
            title: "2. Available Metrics",
            description: "Claude Code automatically exports the following metrics via OpenTelemetry:",
            code: `Metrics (tracked automatically):
- claude_code.session.count      - Sessions started
- claude_code.token.usage        - Tokens (input/output/cache)
- claude_code.cost.usage         - Costs in USD
- claude_code.lines_of_code.count - Lines changed
- claude_code.active_time.total  - Active session time
- claude_code.commit.count       - Git commits
- claude_code.pull_request.count - PRs created
- claude_code.code_edit_tool.decision - Edit acceptance rate

Log Events:
- claude_code.api_request        - Per-request token details
- claude_code.tool_result        - Tool execution outcomes
- claude_code.user_prompt        - Prompt statistics`,
          },
          {
            title: "3. Configure Dashboard Metrics",
            description: "Click the 'Add Data' button at the top of the dashboard to enable or disable specific metrics. You can choose which metrics appear in the top row cards.",
          },
          {
            title: "4. Optional: Advanced Configuration",
            description: "Claude Code supports additional OpenTelemetry configuration options:",
            code: `# Optional: Include additional metadata
export OTEL_METRICS_INCLUDE_SESSION_ID=true
export OTEL_METRICS_INCLUDE_VERSION=true

# Optional: Reduce export interval for faster updates
export OTEL_METRIC_EXPORT_INTERVAL=10000  # 10 seconds

# Optional: Enable user prompt logging (redacted by default)
export OTEL_LOG_USER_PROMPTS=1`,
            note: "See Claude Code documentation for all available options.",
          },
          {
            title: "5. Verify Integration",
            description: "Start a Claude Code session and verify data appears in DevMetrics:",
            code: `# Start Claude Code
claude

# Do some work (ask questions, edit files)

# Check DevMetrics dashboard for:
# - Token usage appearing in real-time
# - Lines of code metrics
# - Cost tracking
# - Session counts`,
            note: "Data should appear within seconds of Claude Code processing requests.",
          },
        ],
      },
      gemini: {
        envVars: `# OpenTelemetry Configuration
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
export GEMINI_TELEMETRY_OTLP_ENDPOINT=${dashboardUrl}/api/v1/otlp?user=${userName || 'YOUR_USERNAME'}`,
        steps: [
          {
            title: "1. Enable OpenTelemetry",
            description: "Gemini CLI has built-in OpenTelemetry support. You can configure it via settings.json or environment variables:",
            code: `# Option A: Add to ~/.gemini/settings.json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpProtocol": "http",
    "otlpEndpoint": "${dashboardUrl}/api/v1/otlp?user=${userName || 'YOUR_USERNAME'}"
  }
}

# Option B: Add to ~/.zshenv (macOS) or ~/.bashrc (Linux)
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
export GEMINI_TELEMETRY_OTLP_ENDPOINT=${dashboardUrl}/api/v1/otlp?user=${userName || 'YOUR_USERNAME'}

# Restart your terminal or run:
source ~/.zshenv`,
            note: "Settings.json takes precedence. CLI flags override both for a specific session.",
          },
          {
            title: "2. Available Metrics",
            description: "Gemini CLI exports comprehensive metrics via OpenTelemetry:",
            code: `Metrics:
- gemini_cli.session.count       - Sessions started
- gemini_cli.token.usage         - Token consumption
- gemini_cli.api.request.count   - API requests made
- gemini_cli.tool.call.count     - Tool executions
- gemini_cli.file.operation.count - File operations
- gemini_cli.lines.changed       - Lines of code changed
- gemini_cli.agent.run.count     - Agent runs
- gemini_cli.agent.duration      - Agent execution time
- gen_ai.client.token.usage      - Standard GenAI tokens
- gen_ai.client.operation.duration - Standard GenAI duration

Log Events:
- gemini_cli.api_request        - API call details
- gemini_cli.tool_call          - Tool execution details
- gemini_cli.file_operation     - File change details
- gemini_cli.agent.start/finish - Agent lifecycle`,
          },
          {
            title: "3. Optional: Log Prompts",
            description: "Enable prompt logging for debugging (disabled by default for privacy):",
            code: `# In settings.json:
{
  "telemetry": {
    "logPrompts": true
  }
}

# Or environment variable:
export GEMINI_TELEMETRY_LOG_PROMPTS=true`,
            note: "Only enable for debugging. Prompts may contain sensitive information.",
          },
          {
            title: "4. Verify Integration",
            description: "Start a Gemini CLI session and verify data appears in DevMetrics:",
            code: `# Start Gemini CLI
gemini

# Do some work (ask questions, edit files)

# Check DevMetrics dashboard for:
# - Token usage appearing in real-time
# - Tool call counts
# - Session counts`,
            note: "Data should appear within seconds. Check the browser console if data doesn't appear.",
          },
        ],
      },
      kiro: {
        envVars: `# Kiro does not currently have native telemetry export
# Use AWS CloudWatch or git hooks for tracking`,
        steps: [
          {
            title: "1. Current Status",
            description: "AWS Kiro is a spec-driven AI IDE. Telemetry options:",
            code: `Native Options:
- Kiro collects internal telemetry (for AWS service improvement)
- Can be disabled in Kiro settings

Integration Options:
- AWS CloudWatch via AWS Distro for OpenTelemetry (ADOT)
- Git hooks for commit tracking
- DevMetrics API for manual logging`,
            note: "Kiro is based on Code OSS (VS Code) but doesn't expose usage metrics via OTEL.",
          },
          {
            title: "2. Create an API Key",
            description: "Go to the API Keys tab and create a new key for Kiro tracking.",
          },
          {
            title: "3. Configure Environment Variables",
            description: "Add these environment variables:",
            code: `# Add to ~/.zshrc or ~/.bashrc
export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key"`,
          },
          {
            title: "4. Git Hook Integration",
            description: "Track commits made in Kiro using git hooks:",
            code: `# Create .git/hooks/post-commit
#!/bin/bash

DEVMETRICS_URL="${dashboardUrl}"
DEVMETRICS_API_KEY="your-api-key"

# Get commit stats
STATS=$(git diff --stat HEAD~1 2>/dev/null | tail -1)
INSERTIONS=$(echo "$STATS" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(echo "$STATS" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')

curl -s -X POST $DEVMETRICS_URL/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $DEVMETRICS_API_KEY" \\
  -d '{
    "event": "commit",
    "data": {
      "tool": "kiro",
      "sha": "'$(git rev-parse HEAD)'",
      "message": "'$(git log -1 --pretty=%B | head -1 | sed 's/"/\\\\"/g')'",
      "repository": "'$(basename $(git rev-parse --show-toplevel))'",
      "linesAdded": '$INSERTIONS',
      "linesDeleted": '$DELETIONS',
      "filesChanged": '$FILES'
    }
  }' > /dev/null 2>&1 &

chmod +x .git/hooks/post-commit`,
          },
          {
            title: "5. AWS CloudWatch Integration (Advanced)",
            description: "For teams using AWS, integrate via CloudWatch Application Signals:",
            code: `# Kiro supports MCP (Model Context Protocol)
# Use CloudWatch Application Signals for observability

# AWS Distro for OpenTelemetry can be configured
# to export metrics from Kiro-built applications
# See: https://aws-otel.github.io/`,
            note: "This tracks applications built with Kiro, not Kiro usage itself.",
          },
        ],
      },
      codex: {
        envVars: `# Codex CLI has built-in OpenTelemetry support
# Configure in ~/.codex/config.toml`,
        steps: [
          {
            title: "1. Enable OpenTelemetry Export",
            description: "OpenAI Codex CLI has built-in OpenTelemetry support. Add this to your ~/.codex/config.toml:",
            code: `# ~/.codex/config.toml
[otel]
environment = "production"

# OTLP HTTP Export to DevMetrics
exporter = { otlp-http = {
  endpoint = "${dashboardUrl}/api/v1/otlp/v1/logs?user=${userName || 'YOUR_USERNAME'}",
  protocol = "binary",
  headers = {}
}}

# Optional: Log user prompts (disabled by default)
log_user_prompt = false`,
            note: "Codex uses TOML config files. OTEL export is off by default and must be explicitly enabled.",
          },
          {
            title: "2. Available Telemetry",
            description: "Codex exports structured log events covering the full conversation lifecycle:",
            code: `Log Events:
- codex.conversation_starts    - New conversation started
- codex.api_request           - API calls with token details
- codex.sse_event             - Streaming response events
- codex.user_prompt           - User prompts (redacted by default)
- codex.tool_decision         - Tool approval decisions
- codex.tool_result           - Tool execution outcomes

Metrics:
- codex.thread.started        - Threads/sessions started
- codex.conversation.turn.count - Conversation turns
- codex.tool.call             - Tool calls made
- codex.mcp.call              - MCP protocol calls
- codex.model.call.duration_ms - Model latency

Context Fields (for filtering):
- surface: cli | vscode | exec | mcp
- version: Codex version
- model: Model name used`,
          },
          {
            title: "3. Alternative: gRPC Export",
            description: "If your setup requires gRPC instead of HTTP:",
            code: `# ~/.codex/config.toml
[otel]
exporter = { otlp-grpc = {
  endpoint = "https://your-otel-collector:4317",
  headers = { "x-otlp-meta" = "your-token" }
}}`,
          },
          {
            title: "4. Disable Analytics (Optional)",
            description: "Codex sends anonymous usage data to OpenAI by default. To disable:",
            code: `# ~/.codex/config.toml
[analytics]
enabled = false`,
            note: "This is separate from OTEL export and only affects OpenAI's internal analytics.",
          },
          {
            title: "5. Verify Integration",
            description: "Start a Codex session and verify data appears in DevMetrics:",
            code: `# Start Codex
codex

# Do some work

# Check DevMetrics dashboard for session and tool data`,
          },
        ],
      },
      copilot: {
        envVars: `# GitHub Copilot uses REST API for metrics
# Requires GitHub Enterprise with Copilot Business/Enterprise`,
        steps: [
          {
            title: "1. Requirements",
            description: "GitHub Copilot metrics are available via the GitHub REST API. You'll need:",
            code: `Requirements:
- GitHub Enterprise Cloud or Server
- Copilot Business or Enterprise subscription
- Personal Access Token with one of these scopes:
  • manage_billing:copilot
  • read:org
  • read:enterprise (for enterprise-level metrics)`,
            note: "Copilot does not support OpenTelemetry export. Metrics must be polled via REST API.",
          },
          {
            title: "2. Available Metrics",
            description: "The Copilot Metrics API provides:",
            code: `Organization/Enterprise Metrics:
- Total active users
- Total engaged users
- Code completions accepted/suggested
- Lines of code accepted/suggested
- Chat interactions
- PR summaries created

Breakdown by:
- Language (TypeScript, Python, etc.)
- Editor (VS Code, JetBrains, etc.)
- Model used`,
          },
          {
            title: "3. Manual Integration (API Polling)",
            description: "Poll the GitHub API and send metrics to DevMetrics. Create a cron job or scheduled task:",
            code: `#!/bin/bash
# Save as ~/bin/sync-copilot-metrics.sh

GITHUB_TOKEN="your-github-token"
ORG="your-org-slug"
DEVMETRICS_URL="${dashboardUrl}"
DEVMETRICS_API_KEY="your-api-key"

# Fetch yesterday's metrics
YESTERDAY=$(date -v-1d +%Y-%m-%d)

# Get Copilot metrics from GitHub
metrics=$(curl -s \\
  -H "Authorization: Bearer $GITHUB_TOKEN" \\
  -H "Accept: application/vnd.github+json" \\
  -H "X-GitHub-Api-Version: 2022-11-28" \\
  "https://api.github.com/orgs/$ORG/copilot/metrics?since=$YESTERDAY")

# Send to DevMetrics
curl -s -X POST $DEVMETRICS_URL/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $DEVMETRICS_API_KEY" \\
  -d '{
    "event": "copilot_metrics",
    "data": '"$metrics"'
  }'`,
          },
          {
            title: "4. Schedule Daily Sync",
            description: "Add to crontab to run daily:",
            code: `# Run daily at 1am
0 1 * * * ~/bin/sync-copilot-metrics.sh

# Or use launchd on macOS`,
          },
          {
            title: "5. Alternative: Git Hooks",
            description: "Track commits made with Copilot using git hooks:",
            code: `# Add to .git/hooks/post-commit
#!/bin/bash

curl -s -X POST ${dashboardUrl}/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "event": "commit",
    "data": {
      "tool": "copilot",
      "sha": "'$(git rev-parse HEAD)'",
      "message": "'$(git log -1 --pretty=%B | head -1)'",
      "repository": "'$(basename $(git rev-parse --show-toplevel))'"
    }
  }' > /dev/null 2>&1 &`,
            note: "Git hooks can't distinguish Copilot-assisted commits from manual commits.",
          },
        ],
      },
      cursor: {
        envVars: `# Cursor does not have native telemetry export
# Use git hooks to track AI-assisted commits`,
        steps: [
          {
            title: "1. Current Status",
            description: "Cursor does not currently expose a telemetry API or OpenTelemetry support. Integration options:",
            code: `Available Options:
- Git hooks: Track commits made in Cursor
- GitHub webhooks: Track all commits (see GitHub integration)
- Manual logging: Use the DevMetrics API directly

Coming Soon:
- Cursor extension API (when available)
- Native telemetry export`,
            note: "Cursor is an AI-first code editor but doesn't yet expose usage metrics externally.",
          },
          {
            title: "2. Create an API Key",
            description: "Go to the API Keys tab and create a new key for tracking Cursor commits.",
          },
          {
            title: "3. Set Up Git Hooks",
            description: "Track commits made in Cursor using git hooks:",
            code: `# Create .git/hooks/post-commit
#!/bin/bash

DEVMETRICS_URL="${dashboardUrl}"
DEVMETRICS_API_KEY="your-api-key"

# Get commit stats
STATS=$(git diff --stat HEAD~1 2>/dev/null | tail -1)
INSERTIONS=$(echo "$STATS" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(echo "$STATS" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

curl -s -X POST $DEVMETRICS_URL/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $DEVMETRICS_API_KEY" \\
  -d '{
    "event": "commit",
    "data": {
      "tool": "cursor",
      "sha": "'$(git rev-parse HEAD)'",
      "message": "'$(git log -1 --pretty=%B | head -1 | sed 's/"/\\\\"/g')'",
      "repository": "'$(basename $(git rev-parse --show-toplevel))'",
      "branch": "'$(git branch --show-current)'",
      "linesAdded": '$INSERTIONS',
      "linesDeleted": '$DELETIONS'
    }
  }' > /dev/null 2>&1 &`,
          },
          {
            title: "4. Make Hook Executable",
            description: "Enable the git hook:",
            code: `chmod +x .git/hooks/post-commit`,
          },
          {
            title: "5. Global Git Hook (Recommended)",
            description: "Set up a global git hook template for all repositories:",
            code: `# Create template directory
mkdir -p ~/.git-templates/hooks

# Copy your hook
cp .git/hooks/post-commit ~/.git-templates/hooks/

# Configure git to use template
git config --global init.templateDir ~/.git-templates

# Re-init existing repos to apply hook
cd your-repo && git init`,
            note: "New repos will automatically get the hook. Existing repos need 'git init' to apply.",
          },
        ],
      },
    };
    return configs[tool];
  };

  const config = getToolConfig(selectedTool, userName);
  const selectedToolInfo = tools.find((t) => t.id === selectedTool)!;

  return (
    <div className="space-y-6">
      {/* Tool Selector */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
              selectedTool === tool.id
                ? "border-accent-cyan bg-accent-cyan/10"
                : "border-border hover:border-accent-cyan/50 hover:bg-background-secondary"
            )}
          >
            <div className="text-3xl flex items-center justify-center h-8">{tool.logo}</div>
            <span className="font-medium text-sm">{tool.name}</span>
          </button>
        ))}
      </div>

      {/* Selected Tool Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl flex items-center justify-center w-12 h-12">{selectedToolInfo.logo}</div>
              <div>
                <CardTitle>{selectedToolInfo.name} Integration</CardTitle>
                <p className="text-sm text-foreground-secondary mt-1">
                  {selectedToolInfo.description}
                </p>
              </div>
            </div>
            <a
              href={selectedToolInfo.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-accent-cyan hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
      </Card>

      {/* API Key Warning */}
      {!apiKeyPreview && (
        <div className="rounded-lg bg-accent-yellow/10 border border-accent-yellow/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent-yellow shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-accent-yellow">API Key Required</p>
              <p className="text-sm text-foreground-secondary mt-1">
                You need to create an API key first.{" "}
                <a href="/settings/api-keys" className="text-accent-cyan hover:underline">
                  Create one now →
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Setup Steps */}
      <div className="space-y-4">
        {config.steps.map((step, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-cyan/10 text-accent-cyan font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-foreground-secondary">{step.description}</p>
                  {step.code && (
                    <div className="relative">
                      <pre className="rounded-lg bg-background-tertiary p-4 text-sm overflow-x-auto">
                        <code>{step.code}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(step.code!, `step-${index}`)}
                        className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs border border-border hover:bg-background-secondary transition-colors"
                      >
                        {copied === `step-${index}` ? (
                          <>
                            <Check className="h-3 w-3 text-accent-green" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {"note" in step && step.note && (
                    <p className="text-xs text-foreground-muted mt-2 italic">
                      {step.note}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
