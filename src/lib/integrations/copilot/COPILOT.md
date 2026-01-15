# GitHub Copilot Integration

## Overview

GitHub Copilot metrics are collected via GitHub's REST API, not OTLP. This integration polls the Copilot Metrics API to sync usage data.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/copilot/sync?user=<uuid>` | POST | Trigger metrics sync |
| `/api/v1/integrations/copilot/sync` | GET | Health check |

## Configuration

1. Generate a GitHub Personal Access Token with `copilot` scope
2. Store the token in Settings > Integrations
3. Sync is triggered manually or via scheduled job

## Data Collected

- Total active users
- Code completions suggested/accepted
- Lines of code suggested/accepted
- Chat interactions
- Editor usage breakdown

## External Documentation

- [GitHub Copilot Metrics API](https://docs.github.com/en/rest/copilot/copilot-metrics)
