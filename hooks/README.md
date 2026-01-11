# Claude Code Hooks Integration

This directory contains configuration for integrating Claude Code with the Developer Metrics Dashboard.

## Setup Instructions

### 1. Configure Claude Code Hooks

Add the following to your Claude Code settings or `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -X POST http://localhost:3000/api/v1/ingest -H 'Content-Type: application/json' -d '{\"event\": \"token_usage\", \"data\": {\"sessionId\": \"$CLAUDE_SESSION_ID\", \"inputTokens\": $INPUT_TOKENS, \"outputTokens\": $OUTPUT_TOKENS, \"model\": \"$MODEL\"}}'"
          }
        ]
      }
    ]
  }
}
```

### 2. Environment Variables

Set the following environment variables:

```bash
export DASHBOARD_URL=http://localhost:3000
export DASHBOARD_API_KEY=your-api-key  # Optional for local development
```

### 3. Start the Dashboard

```bash
cd /path/to/developer_dashboard
npm run dev
```

## Manual Data Ingestion

You can manually send events to the dashboard using curl:

### Start a Session
```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event": "session_start",
    "data": {
      "tool": "claude_code",
      "model": "claude-3-opus",
      "projectName": "my-project"
    }
  }'
```

### Record Token Usage
```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event": "token_usage",
    "data": {
      "sessionId": "<session-id-from-start>",
      "inputTokens": 1500,
      "outputTokens": 800,
      "model": "claude-3-opus"
    }
  }'
```

### Record Code Changes
```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event": "code_change",
    "data": {
      "sessionId": "<session-id>",
      "linesAdded": 50,
      "linesModified": 20,
      "linesDeleted": 5,
      "filesChanged": 3,
      "language": "typescript",
      "repository": "my-repo",
      "branch": "main"
    }
  }'
```

### Record a Commit
```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event": "commit",
    "data": {
      "sha": "abc123",
      "message": "feat: Add new authentication flow",
      "repository": "my-repo",
      "branch": "main",
      "linesAdded": 100,
      "linesDeleted": 20
    }
  }'
```

### Record PR Activity
```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event": "pr_activity",
    "data": {
      "prNumber": 123,
      "repository": "my-repo",
      "title": "Add authentication",
      "action": "created",
      "aiAssisted": true
    }
  }'
```

### End a Session
```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event": "session_end",
    "data": {
      "sessionId": "<session-id>"
    }
  }'
```

## Supported Events

| Event | Description |
|-------|-------------|
| `session_start` | Start of an AI coding session |
| `session_end` | End of a session |
| `token_usage` | Token consumption during session |
| `code_change` | Lines of code added/modified/deleted |
| `commit` | Git commits (auto-classifies type) |
| `pr_activity` | Pull request actions |

## API Endpoints

- `POST /api/v1/ingest` - Data ingestion
- `GET /api/v1/metrics` - Query metrics
- `GET /api/v1/roi` - Get ROI calculations
