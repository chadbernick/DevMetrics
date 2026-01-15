# Gemini CLI Integration

## Overview

Gemini CLI is Google's AI coding assistant with OpenTelemetry support. This integration receives telemetry data from Gemini CLI and tracks usage metrics, token consumption, and code changes.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/gemini/metrics?user=<uuid>` | POST | Receives OTLP metrics |
| `/api/v1/integrations/gemini/logs?user=<uuid>` | POST | Receives OTLP logs |
| `/api/v1/integrations/gemini/metrics` | GET | Health check & supported metrics |
| `/api/v1/integrations/gemini/logs` | GET | Health check & supported events |

## Configuration

### Option 1: Settings JSON

Add to your `~/.gemini/settings.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpProtocol": "http",
    "otlpEndpoint": "http://your-dashboard-url/api/v1/integrations/gemini?user=YOUR_UUID"
  }
}
```

### Option 2: Environment Variables

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://your-dashboard-url/api/v1/integrations/gemini?user=YOUR_UUID
```

Find your UUID in **Settings > Integrations** in the dashboard.

## Supported Protocols

- **http/json** - JSON format (Gemini CLI default)

Note: Unlike Claude Code, Gemini CLI does not support protobuf format.

## Supported Metrics

| Metric Name | Description | Aggregate Field |
|------------|-------------|-----------------|
| `gemini_cli.session.count` | CLI sessions initiated | `totalSessions` |
| `gemini_cli.token.usage` | Token consumption | `totalInputTokens`, `totalOutputTokens` |
| `gemini_cli.api.request.count` | API requests made | `totalSessions` |
| `gemini_cli.tool.call.count` | Tool executions | `totalToolCalls` |
| `gemini_cli.file.operation.count` | File operations | `totalFilesChanged` |
| `gemini_cli.lines.changed` | Lines of code changed | `totalLinesAdded` |
| `gemini_cli.agent.run.count` | Agent runs | `totalSessions` |
| `gemini_cli.agent.duration` | Agent run duration (ms) | `totalMinutes` |
| `gemini_cli.agent.turns` | Agent conversation turns | `totalToolCalls` |
| `gen_ai.client.token.usage` | Standard GenAI tokens | `totalInputTokens`, `totalOutputTokens` |
| `gen_ai.client.operation.duration` | Operation duration | `totalMinutes` |

### Legacy Metric Names (Backwards Compatible)

| Legacy Name | Maps To |
|------------|---------|
| `gemini.tool_call.count` | `gemini_cli.tool.call.count` |
| `gemini.api_request.count` | `gemini_cli.api.request.count` |
| `gemini.file_operation.count` | `gemini_cli.file.operation.count` |
| `gemini.agent_run.count` | `gemini_cli.agent.run.count` |
| `gemini.agent_run.duration` | `gemini_cli.agent.duration` |

## Supported Log Events

| Event Name | Description | Data Captured |
|-----------|-------------|---------------|
| `gemini_cli.tool_call` | Tool execution | Tool name, success, duration, error |
| `gemini_cli.edit_strategy` | Edit applied | Strategy, file path, lines affected |
| `gemini_cli.edit_correction` | Edit corrected | Original file, reason, lines corrected |
| `gemini_cli.api_request` | API call made | (logged only) |
| `gemini_cli.api_error` | API failure | Error message |
| `gemini_cli.config` | Configuration loaded | (logged only) |
| `gemini_cli.user_prompt` | User input | (logged only) |
| `gemini_cli.file_operation` | File changed | (logged only) |
| `gemini_cli.agent.start` | Agent started | (logged only) |
| `gemini_cli.agent.finish` | Agent completed | (logged only) |

## Example Payloads

### Metrics Request (JSON)

```json
{
  "resourceMetrics": [{
    "resource": {
      "attributes": [
        { "key": "service.name", "value": { "stringValue": "gemini-cli" } }
      ]
    },
    "scopeMetrics": [{
      "metrics": [{
        "name": "gemini_cli.tool.call.count",
        "sum": {
          "dataPoints": [{
            "asInt": "5",
            "timeUnixNano": "1704067200000000000"
          }]
        }
      }]
    }]
  }]
}
```

### Logs Request (JSON)

```json
{
  "resourceLogs": [{
    "resource": {
      "attributes": [
        { "key": "service.name", "value": { "stringValue": "gemini-cli" } }
      ]
    },
    "scopeLogs": [{
      "logRecords": [{
        "timeUnixNano": "1704067200000000000",
        "body": { "stringValue": "gemini_cli.tool_call" },
        "attributes": [
          { "key": "tool_name", "value": { "stringValue": "edit_file" } },
          { "key": "success", "value": { "boolValue": true } },
          { "key": "duration_ms", "value": { "intValue": "150" } }
        ]
      }]
    }]
  }]
}
```

## Troubleshooting

### No data appearing in dashboard

1. Verify telemetry is enabled in settings.json or environment
2. Check the endpoint URL includes your UUID: `?user=YOUR_UUID`
3. Test the endpoint: `curl http://your-dashboard-url/api/v1/integrations/gemini/metrics`
4. Check server logs for errors

### Authentication errors

- Ensure your UUID is correct (find it in Settings > Integrations)
- The UUID must belong to an existing user in the dashboard

### JSON parsing errors

- Ensure Content-Type header is `application/json`
- Validate JSON payload format matches OTLP specification

## External Documentation

- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [OpenTelemetry Protocol Specification](https://opentelemetry.io/docs/specs/otlp/)
