# Claude Code Integration

## Overview

Claude Code is Anthropic's AI coding assistant CLI with built-in OpenTelemetry support. This integration receives telemetry data from Claude Code and tracks usage metrics, token consumption, and code changes.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/claude/metrics?user=<uuid>` | POST | Receives OTLP metrics |
| `/api/v1/integrations/claude/logs?user=<uuid>` | POST | Receives OTLP logs |
| `/api/v1/integrations/claude/metrics` | GET | Health check & supported metrics |
| `/api/v1/integrations/claude/logs` | GET | Health check & supported events |

## Configuration

Add these environment variables to your shell profile or `.bashrc`:

```bash
# Enable telemetry
export CLAUDE_CODE_ENABLE_TELEMETRY=1

# Configure OTLP export
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://your-dashboard-url/api/v1/integrations/claude?user=YOUR_UUID
```

Find your UUID in **Settings > Integrations** in the dashboard.

## Supported Protocols

- **http/protobuf** (recommended) - Binary format, smaller payload size
- **http/json** - JSON format, easier to debug

## Supported Metrics

| Metric Name | Description | Aggregate Field |
|------------|-------------|-----------------|
| `claude_code.session.count` | CLI sessions initiated | `totalSessions` |
| `claude_code.token.usage` | Token consumption (input/output/cache) | `totalInputTokens`, `totalOutputTokens` |
| `claude_code.cost.usage` | Session costs in USD | `totalTokenCostUsd` |
| `claude_code.lines_of_code.count` | Lines of code changed | `totalLinesAdded`, etc. |
| `claude_code.active_time.total` | Active session duration (seconds) | `totalMinutes` |
| `claude_code.commit.count` | Git commits | `aiAssistedCommits` |
| `claude_code.pull_request.count` | Pull requests created | `prsCreated` |
| `claude_code.code_edit_tool.decision` | Code edit acceptance/rejection | `editDecisions`, etc. |
| `claude_code.tool.usage` | General tool usage count | `totalToolCalls` |
| `gen_ai.client.token.usage` | Standard GenAI token usage | `totalInputTokens`, `totalOutputTokens` |
| `gen_ai.client.operation.duration` | Standard GenAI operation duration | `totalMinutes` |

## Supported Log Events

| Event Name | Description | Data Captured |
|-----------|-------------|---------------|
| `claude_code.api_request` | API calls with token/cost details | Model, tokens, cost, duration |
| `claude_code.api_error` | API failures | Error message |
| `claude_code.tool_result` | Tool execution outcomes | Tool name, success, duration, error |
| `claude_code.tool_decision` | Tool authorization decisions | (logged only) |
| `claude_code.user_prompt` | User prompt submissions | (logged only) |
| `claude_code.code_edit_tool.decision` | Code edit decisions | Decision, edit type, file path, lines affected |

## Example Payloads

### Metrics Request (JSON)

```json
{
  "resourceMetrics": [{
    "resource": {
      "attributes": [
        { "key": "service.name", "value": { "stringValue": "claude-code" } }
      ]
    },
    "scopeMetrics": [{
      "metrics": [{
        "name": "claude_code.token.usage",
        "sum": {
          "dataPoints": [{
            "asInt": "1500",
            "timeUnixNano": "1704067200000000000",
            "attributes": [
              { "key": "type", "value": { "stringValue": "input" } }
            ]
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
        { "key": "service.name", "value": { "stringValue": "claude-code" } }
      ]
    },
    "scopeLogs": [{
      "logRecords": [{
        "timeUnixNano": "1704067200000000000",
        "body": { "stringValue": "claude_code.api_request" },
        "attributes": [
          { "key": "model", "value": { "stringValue": "claude-3-opus-20240229" } },
          { "key": "input_tokens", "value": { "intValue": "1500" } },
          { "key": "output_tokens", "value": { "intValue": "500" } },
          { "key": "cost", "value": { "doubleValue": 0.045 } }
        ]
      }]
    }]
  }]
}
```

## Troubleshooting

### No data appearing in dashboard

1. Verify telemetry is enabled: `echo $CLAUDE_CODE_ENABLE_TELEMETRY` should return `1`
2. Check the endpoint URL includes your UUID: `?user=YOUR_UUID`
3. Test the endpoint: `curl http://your-dashboard-url/api/v1/integrations/claude/metrics`
4. Check server logs for errors

### Authentication errors

- Ensure your UUID is correct (find it in Settings > Integrations)
- The UUID must belong to an existing user in the dashboard

### Protobuf parsing errors

- If using protobuf, ensure `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`
- Try switching to JSON: `OTEL_EXPORTER_OTLP_PROTOCOL=http/json`

## External Documentation

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Claude Code Telemetry Guide](https://docs.anthropic.com/en/docs/claude-code/monitoring-usage)
- [OpenTelemetry Protocol Specification](https://opentelemetry.io/docs/specs/otlp/)
