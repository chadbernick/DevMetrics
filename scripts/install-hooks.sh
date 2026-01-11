#!/bin/bash
#
# DevMetrics Hook Installer for Claude Code
#
# This script downloads and installs the DevMetrics telemetry hooks
# for Claude Code, enabling automatic tracking of sessions, token usage,
# and code changes.
#
# Usage:
#   curl -fsSL http://localhost:3000/scripts/install-hooks.sh | bash
#
# Or with custom dashboard URL:
#   curl -fsSL http://localhost:3000/scripts/install-hooks.sh | DEVMETRICS_URL=https://your-dashboard.com bash
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEVMETRICS_URL="${DEVMETRICS_URL:-http://localhost:3000}"
CLAUDE_DIR="${HOME}/.claude"
HOOKS_DIR="${CLAUDE_DIR}/hooks"
SETTINGS_FILE="${CLAUDE_DIR}/settings.json"
HOOK_SCRIPT="${HOOKS_DIR}/devmetrics_hook.py"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     DevMetrics Hook Installer v2.0         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Python 3 found: $(python3 --version)"

# Create hooks directory
echo -e "\n${YELLOW}Creating hooks directory...${NC}"
mkdir -p "${HOOKS_DIR}"
echo -e "${GREEN}✓${NC} Directory ready: ${HOOKS_DIR}"

# Download hook script
echo -e "\n${YELLOW}Downloading hook script...${NC}"
if curl -fsSL "${DEVMETRICS_URL}/scripts/devmetrics_hook.py" -o "${HOOK_SCRIPT}"; then
    chmod +x "${HOOK_SCRIPT}"
    echo -e "${GREEN}✓${NC} Hook script installed: ${HOOK_SCRIPT}"
else
    echo -e "${RED}Error: Failed to download hook script from ${DEVMETRICS_URL}${NC}"
    echo -e "${YELLOW}Make sure the dashboard is running at ${DEVMETRICS_URL}${NC}"
    exit 1
fi

# Configure settings.json
echo -e "\n${YELLOW}Configuring Claude Code settings...${NC}"

# Create hooks configuration
HOOKS_CONFIG='{
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
}'

# Check if settings.json exists
if [ -f "${SETTINGS_FILE}" ]; then
    # Backup existing settings
    cp "${SETTINGS_FILE}" "${SETTINGS_FILE}.backup"
    echo -e "${GREEN}✓${NC} Backed up existing settings to ${SETTINGS_FILE}.backup"

    # Check if jq is available for JSON manipulation
    if command -v jq &> /dev/null; then
        # Use jq to merge hooks into existing settings
        EXISTING_SETTINGS=$(cat "${SETTINGS_FILE}")

        # Check if hooks already exist
        if echo "${EXISTING_SETTINGS}" | jq -e '.hooks' > /dev/null 2>&1; then
            # Merge with existing hooks
            echo "${EXISTING_SETTINGS}" | jq --argjson hooks "${HOOKS_CONFIG}" '.hooks = (.hooks // {}) * $hooks' > "${SETTINGS_FILE}.tmp"
            mv "${SETTINGS_FILE}.tmp" "${SETTINGS_FILE}"
            echo -e "${GREEN}✓${NC} Merged DevMetrics hooks with existing configuration"
        else
            # Add hooks to existing settings
            echo "${EXISTING_SETTINGS}" | jq --argjson hooks "${HOOKS_CONFIG}" '. + {hooks: $hooks}' > "${SETTINGS_FILE}.tmp"
            mv "${SETTINGS_FILE}.tmp" "${SETTINGS_FILE}"
            echo -e "${GREEN}✓${NC} Added hooks to existing settings"
        fi
    else
        # Without jq, we need to be more careful
        echo -e "${YELLOW}Note: jq not found, using Python for JSON manipulation${NC}"

        python3 << PYTHON_SCRIPT
import json
import sys

settings_file = "${SETTINGS_FILE}"
hooks_config = json.loads('''${HOOKS_CONFIG}''')

try:
    with open(settings_file, 'r') as f:
        settings = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    settings = {}

# Merge hooks
if 'hooks' not in settings:
    settings['hooks'] = {}

for hook_name, hook_config in hooks_config.items():
    if hook_name not in settings['hooks']:
        settings['hooks'][hook_name] = hook_config
    else:
        # Check if devmetrics hook already exists
        existing_hooks = settings['hooks'][hook_name]
        has_devmetrics = any(
            'devmetrics_hook.py' in str(h.get('hooks', []))
            for h in existing_hooks
        )
        if not has_devmetrics:
            settings['hooks'][hook_name].extend(hook_config)

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)

print("Settings updated successfully")
PYTHON_SCRIPT
        echo -e "${GREEN}✓${NC} Updated settings using Python"
    fi
else
    # Create new settings file with hooks
    echo "{\"hooks\": ${HOOKS_CONFIG}}" | python3 -m json.tool > "${SETTINGS_FILE}"
    echo -e "${GREEN}✓${NC} Created new settings file with hooks"
fi

# Check for API key
echo -e "\n${YELLOW}Checking environment configuration...${NC}"

if [ -z "${DEVMETRICS_API_KEY}" ]; then
    echo -e "${YELLOW}!${NC} DEVMETRICS_API_KEY not set in environment"
    echo ""
    echo -e "To complete setup, add these to your shell profile (~/.zshrc or ~/.bashrc):"
    echo ""
    echo -e "  ${BLUE}export DEVMETRICS_URL=\"${DEVMETRICS_URL}\"${NC}"
    echo -e "  ${BLUE}export DEVMETRICS_API_KEY=\"your-api-key-here\"${NC}"
    echo ""
    echo -e "Get your API key from: ${DEVMETRICS_URL}/settings/api-keys"
else
    echo -e "${GREEN}✓${NC} DEVMETRICS_API_KEY is configured"
fi

# Summary
echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}Installation complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "The following hooks are now configured:"
echo -e "  ${BLUE}SessionStart${NC} - Tracks when you start Claude Code"
echo -e "  ${BLUE}Stop${NC}         - Parses JSONL logs for token usage"
echo -e "  ${BLUE}PostToolUse${NC}  - Tracks file changes (Write/Edit)"
echo ""
echo "Next steps:"
echo "  1. Set your API key in your shell profile (if not already done)"
echo "  2. Restart your terminal or run: source ~/.zshrc"
echo "  3. Start a new Claude Code session"
echo "  4. Check your dashboard for metrics!"
echo ""
echo -e "Dashboard: ${BLUE}${DEVMETRICS_URL}${NC}"
echo ""
