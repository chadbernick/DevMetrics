# Kiro Integration

## Overview

Kiro is AWS's AI coding assistant. It does not have native OTLP support, so metrics are collected via manual ingest or git hooks.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/kiro/ingest?user=<uuid>` | POST | Manual metrics ingest |
| `/api/v1/integrations/kiro/ingest` | GET | Health check |

## Configuration Options

1. **Git Hooks**: Add post-commit hooks to track Kiro-assisted commits
2. **Manual Ingest**: POST metrics directly to the ingest endpoint
3. **CloudWatch**: If available, sync metrics from AWS CloudWatch

## Manual Ingest Example

```bash
curl -X POST "http://your-dashboard/api/v1/integrations/kiro/ingest?user=YOUR_UUID" \
  -H "Content-Type: application/json" \
  -d '{"sessions": 5, "inputTokens": 10000, "outputTokens": 3000}'
```

## External Documentation

- [AWS Kiro](https://aws.amazon.com/kiro)
