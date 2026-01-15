# OpenAI Codex CLI Integration

## Overview

OpenAI Codex CLI is OpenAI's AI coding assistant with OpenTelemetry support. This integration receives telemetry logs from Codex CLI.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/codex/logs?user=<uuid>` | POST | Receives OTLP logs |
| `/api/v1/integrations/codex/logs` | GET | Health check |

## Configuration

Add to your `~/.codex/config.toml`:

```toml
[otel]
exporter = { otlp-http = { endpoint = "http://your-dashboard-url/api/v1/integrations/codex/logs?user=YOUR_UUID" }}
```

## Supported Log Events

| Event Name | Description |
|-----------|-------------|
| `codex.tool_result` | Tool execution outcomes |
| `codex.tool_decision` | Tool acceptance/rejection |
| `codex.conversation_starts` | Conversation initiated |
| `codex.api_request` | API calls |
| `codex.user_prompt` | User input |

## External Documentation

- [OpenAI Codex Documentation](https://developers.openai.com/codex)
