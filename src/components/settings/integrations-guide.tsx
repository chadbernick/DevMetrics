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
export GEMINI_TELEMETRY_OTLP_ENDPOINT=${dashboardUrl}/api/v1/otlp?user=${userName || 'default'}`,
        steps: [
          {
            title: "1. Enable OpenTelemetry",
            description: "Gemini CLI has built-in OpenTelemetry support. Add these environment variables to your shell profile to enable telemetry and send data to DevMetrics:",
            code: `# Add to ~/.zshenv (macOS) or ~/.bashrc (Linux)
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
export GEMINI_TELEMETRY_OTLP_ENDPOINT=${dashboardUrl}/api/v1/otlp?user=${userName || 'default'}

# Restart your terminal or run:
source ~/.zshenv`,
            note: "This uses Gemini CLI's native OpenTelemetry support - no custom scripts required.",
          },
          {
            title: "2. Available Metrics",
            description: "Gemini CLI automatically exports various metrics via OpenTelemetry. Refer to the official documentation for a complete list.",
          },
          {
            title: "3. Configure Dashboard Metrics",
            description: "Click the 'Add Data' button at the top of the dashboard to enable or disable specific metrics. You can choose which metrics appear in the top row cards.",
          },
          {
            title: "4. Verify Integration",
            description: "Start a Gemini CLI session and verify data appears in DevMetrics:",
            code: `# Start Gemini CLI
gemini

# Do some work (ask questions, edit files)

# Check DevMetrics dashboard for:
# - Token usage appearing in real-time
# - Lines of code metrics
# - Cost tracking
# - Session counts`,
            note: "Data should appear within seconds of Gemini CLI processing requests.",
          },
        ],
      },
      kiro: {
        envVars: `# Add to your shell profile
export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key-here"`,
        steps: [
          {
            title: "1. Create an API Key",
            description: "Go to the API Keys tab and create a new key for Kiro.",
          },
          {
            title: "2. Configure Environment Variables",
            description: "Add these environment variables:",
            code: `# Add to ~/.zshrc or ~/.bashrc
export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key-here"`,
          },
          {
            title: "3. Configure Kiro Hooks",
            description: "Add a post-action hook in your Kiro project configuration:",
            code: `# In your kiro.yaml or project config
hooks:
  post_generate:
    - curl -X POST $DEVMETRICS_URL/api/v1/ingest \\
        -H "Content-Type: application/json" \\
        -H "X-API-Key: $DEVMETRICS_API_KEY" \\
        -d '{
          "event": "code_change",
          "data": {
            "tool": "kiro",
            "linesAdded": $LINES_ADDED,
            "linesModified": $LINES_MODIFIED,
            "filesChanged": $FILES_CHANGED,
            "repository": "$REPO_NAME"
          }
        }'`,
          },
          {
            title: "4. Test the Integration",
            description: "Run a Kiro command and verify data appears in the dashboard.",
          },
        ],
      },
      codex: {
        envVars: `export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key-here"`,
        steps: [
          {
            title: "1. Create an API Key",
            description: "Go to the API Keys tab and create a new key for Codex.",
          },
          {
            title: "2. Use the Wrapper Script",
            description: "Create a wrapper script to log Codex usage:",
            code: `#!/bin/bash
# Save as ~/bin/codex-tracked

# Run codex and capture output
output=$(codex "$@")
exit_code=$?

# Log to DevMetrics
curl -s -X POST $DEVMETRICS_URL/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $DEVMETRICS_API_KEY" \\
  -d '{
    "event": "session_end",
    "data": {
      "tool": "codex",
      "model": "gpt-4"
    }
  }' > /dev/null 2>&1 &

echo "$output"
exit $exit_code`,
          },
          {
            title: "3. Add to PATH",
            description: "Make the script executable and add to your PATH:",
            code: `chmod +x ~/bin/codex-tracked
alias codex='~/bin/codex-tracked'`,
          },
        ],
      },
      copilot: {
        envVars: `export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key-here"`,
        steps: [
          {
            title: "1. Create an API Key",
            description: "Go to the API Keys tab and create a new key for Copilot.",
          },
          {
            title: "2. Install VS Code Extension",
            description: "Install the DevMetrics extension for VS Code (coming soon), or use git hooks:",
            code: `# Add to .git/hooks/post-commit
#!/bin/bash

# Get commit stats
LINES_ADDED=$(git diff --stat HEAD~1 | tail -1 | awk '{print $4}')
LINES_DELETED=$(git diff --stat HEAD~1 | tail -1 | awk '{print $6}')
COMMIT_MSG=$(git log -1 --pretty=%B)

curl -s -X POST $DEVMETRICS_URL/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $DEVMETRICS_API_KEY" \\
  -d '{
    "event": "commit",
    "data": {
      "sha": "'$(git rev-parse HEAD)'",
      "message": "'"$COMMIT_MSG"'",
      "repository": "'$(basename $(git rev-parse --show-toplevel))'",
      "linesAdded": '$LINES_ADDED',
      "linesDeleted": '$LINES_DELETED'
    }
  }' > /dev/null 2>&1 &`,
          },
          {
            title: "3. Make Hook Executable",
            description: "Enable the git hook:",
            code: `chmod +x .git/hooks/post-commit`,
          },
        ],
      },
      cursor: {
        envVars: `export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key-here"`,
        steps: [
          {
            title: "1. Create an API Key",
            description: "Go to the API Keys tab and create a new key for Cursor.",
          },
          {
            title: "2. Use Git Hooks",
            description: "Since Cursor doesn't have a plugin API yet, use git hooks to track commits:",
            code: `# Create .git/hooks/post-commit
#!/bin/bash

curl -s -X POST $DEVMETRICS_URL/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $DEVMETRICS_API_KEY" \\
  -d '{
    "event": "commit",
    "data": {
      "sha": "'$(git rev-parse HEAD)'",
      "message": "'$(git log -1 --pretty=%B | head -1)'",
      "repository": "'$(basename $(git rev-parse --show-toplevel))'",
      "branch": "'$(git branch --show-current)'"
    }
  }' > /dev/null 2>&1 &`,
          },
          {
            title: "3. Global Git Hook (Optional)",
            description: "Set up a global git hook template for all repositories:",
            code: `# Create template directory
mkdir -p ~/.git-templates/hooks

# Copy your hook
cp .git/hooks/post-commit ~/.git-templates/hooks/

# Configure git to use template
git config --global init.templateDir ~/.git-templates`,
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
