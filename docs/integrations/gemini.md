# Gemini CLI Integration

This document details the integration between **Gemini CLI** and the **Developer Metrics Dashboard**.

## Overview

*   **Protocol**: OTLP/HTTP (JSON)
*   **Base Endpoint**: `/api/v1/integrations/gemini`
*   **Metrics Endpoint**: `/api/v1/integrations/gemini/v1/metrics`
*   **Logs Endpoint**: `/api/v1/integrations/gemini/v1/logs`
*   **Authentication**: Query parameter `?user=<UUID>` or Header `x-user-id: <UUID>`

## Configuration

The integration can be configured via environment variables or `~/.gemini/settings.json`.

### Recommended Setup (settings.json)

```json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpProtocol": "http",
    "otlpEndpoint": "https://<dashboard-url>/api/v1/integrations/gemini?user=<UUID>"
  }
}
```

### Environment Variables

*   `GEMINI_TELEMETRY_ENABLED=true`
*   `GEMINI_TELEMETRY_TARGET=local`
*   `GEMINI_TELEMETRY_OTLP_PROTOCOL=http`
*   `GEMINI_TELEMETRY_OTLP_ENDPOINT=https://<dashboard-url>/api/v1/integrations/gemini?user=<UUID>`

## Supported Telemetry

### Metrics

| Metric Name | Type | Description | Dashboard Mapping |
| :--- | :--- | :--- | :--- |
| `gemini_cli.session.count` | Counter | Number of sessions started | `sessions` |
| `gemini_cli.token.usage` | Counter | Input/Output tokens used | `inputTokens`, `outputTokens` |
| `gemini_cli.tool.call.count` | Counter | Number of tool calls | `features` (Activity proxy) |
| `gemini_cli.lines.changed` | Counter | Lines of code modified | `linesAdded` |
| `gemini_cli.agent.duration` | Histogram | Duration of agent runs | `minutes` |

### Logs

| Event Name | Attributes | Description |
| :--- | :--- | :--- |
| `gemini_cli.tool_call` | `tool_name`, `input`, `output`, `success`, `duration_ms` | Detailed tool execution record. Stored in `toolCalls` table. |
| `gemini_cli.file_operation` | `file_path`, `operation` | File system changes. Updates `filesChanged` aggregate. |

## Implementation Details

The integration logic is isolated in:
*   `src/app/api/v1/integrations/gemini/`
*   `src/lib/integrations/gemini/`

It utilizes shared database helpers from `src/lib/integrations/common/` to ensure consistent data storage while maintaining protocol isolation.
