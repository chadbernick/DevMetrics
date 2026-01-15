#!/bin/bash

# setup-gemini.sh
# Quick setup script for Gemini CLI integration with Developer Metrics Dashboard

USER_ID="$1"
DASHBOARD_URL="$2"

if [ -z "$USER_ID" ] || [ -z "$DASHBOARD_URL" ]; then
  echo "Usage: ./setup-gemini.sh <USER_ID> <DASHBOARD_URL>"
  exit 1
fi

echo "✨ Configuring Gemini CLI Telemetry..."

# 1. Determine Shell
SHELL_CONFIG=""
case $SHELL in
  */zsh)
    SHELL_CONFIG="$HOME/.zshrc"
    ;;
  */bash)
    SHELL_CONFIG="$HOME/.bashrc"
    ;;
  */fish)
    SHELL_CONFIG="$HOME/.config/fish/config.fish"
    echo "⚠️  Fish shell detected. Manual configuration might be required for environment variables."
    ;;
  *)
    SHELL_CONFIG="$HOME/.profile"
    ;;
esac

echo "📂 Detected shell config: $SHELL_CONFIG"

# 2. Add Environment Variables
# Check if already exists to avoid duplicates
if grep -q "GEMINI_TELEMETRY_ENABLED" "$SHELL_CONFIG"; then
  echo "ℹ️  Environment variables already present in $SHELL_CONFIG. Skipping append."
else
  echo "" >> "$SHELL_CONFIG"
  echo "# Gemini CLI Telemetry (Developer Metrics Dashboard)" >> "$SHELL_CONFIG"
  echo "export GEMINI_TELEMETRY_ENABLED=true" >> "$SHELL_CONFIG"
  echo "export GEMINI_TELEMETRY_OTLP_ENDPOINT=\"$DASHBOARD_URL/api/v1/integrations/gemini\"" >> "$SHELL_CONFIG"
  echo "export GEMINI_TELEMETRY_OTLP_PROTOCOL=http" >> "$SHELL_CONFIG"
  echo "✅ Added environment variables to $SHELL_CONFIG"
fi

# 3. Configure settings.json
GEMINI_DIR="$HOME/.gemini"
SETTINGS_FILE="$GEMINI_DIR/settings.json"

mkdir -p "$GEMINI_DIR"

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# Use a temporary python script to safely update JSON
# (Avoids dependency on jq which might not be installed)
python3 -c "
import json
import os

file_path = '$SETTINGS_FILE'
dashboard_url = '$DASHBOARD_URL'
user_id = '$USER_ID'

try:
    with open(file_path, 'r') as f:
        data = json.load(f)
except:
    data = {}

if 'telemetry' not in data:
    data['telemetry'] = {}

data['telemetry']['enabled'] = True
data['telemetry']['target'] = 'local'
data['telemetry']['otlpProtocol'] = 'http'
data['telemetry']['otlpEndpoint'] = f'{dashboard_url}/api/v1/integrations/gemini?user={user_id}'

with open(file_path, 'w') as f:
    json.dump(data, f, indent=2)
"

echo "✅ Updated $SETTINGS_FILE"
echo ""
echo "🎉 Setup complete! Restart your terminal or run 'source $SHELL_CONFIG' to apply changes."
