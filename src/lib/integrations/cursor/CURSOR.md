# Cursor Integration

## Overview

Cursor is an AI-first code editor. It does not have a native telemetry API, so metrics are collected via git hooks.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/cursor/ingest?user=<uuid>` | POST | Manual metrics ingest |
| `/api/v1/integrations/cursor/ingest` | GET | Health check |

## Configuration

### Git Hooks Setup

Add a global post-commit hook to track Cursor-assisted commits:

```bash
# ~/.config/git/hooks/post-commit
#!/bin/bash

# Check if commit was made in Cursor
if [[ "$GIT_EDITOR" == *"cursor"* ]] || [[ -n "$CURSOR_SESSION" ]]; then
  curl -s -X POST "http://your-dashboard/api/v1/integrations/cursor/ingest?user=YOUR_UUID" \
    -H "Content-Type: application/json" \
    -d '{"sessions": 1, "aiAssistedCommits": 1}'
fi
```

## Manual Ingest Example

```bash
curl -X POST "http://your-dashboard/api/v1/integrations/cursor/ingest?user=YOUR_UUID" \
  -H "Content-Type: application/json" \
  -d '{"sessions": 3, "linesAdded": 150}'
```

## External Documentation

- [Cursor](https://cursor.sh)
