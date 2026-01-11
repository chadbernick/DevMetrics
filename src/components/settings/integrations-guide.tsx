"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Zap,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface IntegrationsGuideProps {
  apiKeyPreview: string | null;
}

type Tool = "claude-code" | "kiro" | "codex" | "copilot" | "cursor" | "github";

const tools: Array<{
  id: Tool;
  name: string;
  description: string;
  logo: string;
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
    id: "kiro",
    name: "Kiro",
    description: "AWS's spec-driven AI development tool",
    logo: "☁️",
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

export function IntegrationsGuide({ apiKeyPreview }: IntegrationsGuideProps) {
  const [selectedTool, setSelectedTool] = useState<Tool>("github");
  const [copied, setCopied] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const testConnection = async () => {
    setTestStatus("testing");
    try {
      // For GitHub, test the webhook endpoint directly
      if (selectedTool === "github") {
        const response = await fetch("/api/v1/webhooks/github", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-GitHub-Event": "ping",
          },
          body: JSON.stringify({ zen: "Test connection" }),
        });

        if (response.ok) {
          setTestStatus("success");
        } else {
          setTestStatus("error");
        }
      } else {
        const response = await fetch("/api/v1/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "session_start",
            data: {
              tool: selectedTool.replace("-", "_"),
              model: "test",
              projectName: "integration-test",
            },
          }),
        });

        if (response.ok) {
          setTestStatus("success");
        } else {
          setTestStatus("error");
        }
      }
    } catch {
      setTestStatus("error");
    }
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  const dashboardUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const getToolConfig = (tool: Tool) => {
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
        envVars: `# Add to your shell profile (~/.zshrc or ~/.bashrc)
export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key-here"
# Optional: Enable debug logging
export DEVMETRICS_DEBUG="false"`,
        steps: [
          {
            title: "1. Create an API Key",
            description: "Go to the API Keys tab and create a new key for Claude Code.",
          },
          {
            title: "2. Configure Environment Variables",
            description: "Add these environment variables to your shell profile:",
            code: `# Add to ~/.zshrc or ~/.bashrc
export DEVMETRICS_URL="${dashboardUrl}"
export DEVMETRICS_API_KEY="your-api-key-here"

# Optional: Enable debug logging to ~/.claude/devmetrics_debug.log
export DEVMETRICS_DEBUG="false"

# Reload your shell
source ~/.zshrc`,
          },
          {
            title: "3. Download the Hook Script",
            description: "Download the DevMetrics hook script to your Claude Code hooks directory. This script parses Claude's JSONL logs to accurately track token usage:",
            code: `# Create hooks directory
mkdir -p ~/.claude/hooks

# Download the hook script (or copy from the dashboard repo)
curl -o ~/.claude/hooks/devmetrics_hook.py \\
  ${dashboardUrl}/scripts/devmetrics_hook.py

# Make it executable
chmod +x ~/.claude/hooks/devmetrics_hook.py`,
            note: "The script tracks sessions, parses JSONL logs for accurate token counts (including cache tokens), and tracks code changes.",
          },
          {
            title: "4. Configure Claude Code Hooks",
            description: "Add the hooks configuration to ~/.claude/settings.json. The Stop hook is critical - it parses token usage when sessions end:",
            code: `{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/devmetrics_hook.py"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/devmetrics_hook.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/devmetrics_hook.py"
          }
        ]
      }
    ]
  }
}`,
            note: "The Stop hook triggers when Claude finishes responding, which is when we parse JSONL logs for token totals.",
          },
          {
            title: "5. What Gets Tracked",
            description: "The hook automatically tracks:",
            code: `Sessions:
- Start time, project name, duration
- Mapped to Claude's internal session ID

Token Usage (parsed from JSONL logs):
- Input tokens, output tokens
- Cache read/write tokens (prompt caching)
- Model used, costs calculated automatically

Code Changes:
- Files created (Write tool)
- Files modified (Edit tool)
- Language detection from file extension`,
          },
          {
            title: "6. Verify Integration",
            description: "Start a new Claude Code session and have a short conversation. When the session ends (or you start a new one), token usage will be recorded. Check your dashboard to see the metrics.",
            note: "Enable DEVMETRICS_DEBUG=true to see detailed logs at ~/.claude/devmetrics_debug.log if you encounter issues.",
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

  const config = getToolConfig(selectedTool);
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
            <span className="text-3xl">{tool.logo}</span>
            <span className="font-medium text-sm">{tool.name}</span>
          </button>
        ))}
      </div>

      {/* Selected Tool Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{selectedToolInfo.logo}</span>
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

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Test Your Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            Click the button below to send a test event and verify your integration is working.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={testConnection}
              disabled={testStatus === "testing"}
              className="flex items-center gap-2 rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
            >
              {testStatus === "testing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Send Test Event
                </>
              )}
            </button>
            {testStatus === "success" && (
              <span className="flex items-center gap-2 text-sm text-accent-green">
                <CheckCircle2 className="h-4 w-4" />
                Connection successful! Check your dashboard.
              </span>
            )}
            {testStatus === "error" && (
              <span className="flex items-center gap-2 text-sm text-accent-red">
                <AlertCircle className="h-4 w-4" />
                Connection failed. Check your configuration.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
