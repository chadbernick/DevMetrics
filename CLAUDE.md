# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Developer Metrics Dashboard - a Next.js 16 application tracking AI-assisted development productivity across multiple tools (Claude Code, Kiro, Codex, Copilot, Cursor). It measures ROI, integrates with GitHub via webhooks, and visualizes metrics.

## Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push schema to SQLite database
npm run db:seed      # Seed sample data
npm run db:studio    # Open Drizzle Studio GUI
npm run db:generate  # Generate migrations
```

## Architecture

### Data Flow
1. **OTLP API** (`/api/v1/otlp/v1/metrics` and `/api/v1/otlp/v1/logs`) receives OpenTelemetry data from Claude Code, Gemini, Codex, and others
2. Metrics and logs are processed and stored in SQLite
3. **Daily aggregates** are updated atomically on every event (pre-computed metrics)
4. **Dashboard API** queries aggregates for fast rendering
5. **GitHub Webhooks** (`/api/v1/webhooks/github`) track commits and PRs

### Key Abstractions

**Session Tracking**: Sessions have both internal IDs and external IDs (from Claude Code). The ingest API auto-creates sessions when receiving token_usage with only an external ID.

**Model Pricing**: Regex patterns in `modelPricing` table match model names for dynamic cost calculation. Supports input/output/thinking/cache tokens.

**Authentication**: API keys are SHA256 hashed, never stored plain. Authentication checks header `X-API-Key` first, falls back to request body `userId`.

### Database Schema (`src/lib/db/schema.ts`)

Core tables:
- `sessions` - AI tool sessions with tool type, model, duration
- `tokenUsage` - Itemized token tracking (input, output, thinking, cache read/write) with costs
- `dailyAggregates` - Pre-computed daily metrics per user (key for dashboard performance)
- `dashboardMetrics` - Configurable dashboard metrics (OTLP, computed, GitHub)
- `modelPricing` - Regex-based pricing per model
- `apiKeys` - Hashed keys with scopes and expiration
- `settings` - Key-value store (includes GitHub username mappings)

### API Patterns

All APIs use consistent error handling:
```typescript
{ success: false, error: "message", code: "ERROR_CODE", requestId: "abc123", hint: "..." }
```

Error codes: `INVALID_REQUEST`, `AUTH_REQUIRED`, `VALIDATION_ERROR`, `DATABASE_ERROR`

### Claude Code Integration

Uses OpenTelemetry (OTLP) for metrics collection. Claude Code's built-in telemetry exports:
- `claude_code.session.count` - Sessions started
- `claude_code.token.usage` - Input/output/cache tokens
- `claude_code.cost.usage` - Costs in USD
- `claude_code.lines_of_code.count` - Lines changed
- `claude_code.active_time.total` - Active time
- `claude_code.api_request` (log) - Per-request details

Configure by setting environment variables:
```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobug
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000/api/v1/otlp/UUID
```

### Dashboard Metrics Configuration

The `dashboardMetrics` table stores configurable metrics:
- Users can enable/disable metrics via the "+Add Data" button
- Metrics can be shown in top row cards or charts
- Supports OTLP metrics, OTLP logs, computed metrics, and GitHub data

## Integration Architecture

Each AI tool integration is isolated in its own module under `src/lib/integrations/`:

| Integration | Endpoints | Protocol |
|-------------|-----------|----------|
| Claude Code | `/api/v1/integrations/claude/metrics`, `/logs` | HTTP/protobuf + JSON |
| Gemini CLI | `/api/v1/integrations/gemini/metrics`, `/logs` | HTTP/JSON only |
| Codex | `/api/v1/integrations/codex/logs` | HTTP/protobuf |
| Copilot | `/api/v1/integrations/copilot/sync` | REST API |
| Kiro | `/api/v1/integrations/kiro/ingest` | Manual |
| Cursor | `/api/v1/integrations/cursor/ingest` | Git hooks |

**Key design principles:**
- Each integration has its own directory with all code it needs
- Protobuf decoders are copied per integration for isolation
- Only generic utilities are shared (see `src/lib/integrations/shared/`)
- Legacy OTLP endpoints (`/api/v1/otlp/v1/*`) forward to integration-specific handlers

**Shared utilities:**
- `src/lib/utils/date.ts` - Centralized date formatting
- `src/lib/settings/` - Settings service (typed accessors for settings table)
- `src/lib/roi/cost-config.ts` - Cost configuration with caching
- `src/lib/integrations/shared/` - OTLP primitives, daily aggregates, auth, pricing

See `src/lib/integrations/README.md` for full architecture documentation.

## Code Conventions

- Path alias: `@/*` maps to `src/*`
- Server Components fetch data, Client Components (use client) handle interactivity
- Formatting utilities in `src/lib/utils/format.ts` for consistent number/currency/token display
- All API routes in `src/app/api/v1/`
- UI components use Tailwind with custom color palette (accent-cyan, accent-purple, etc.)

