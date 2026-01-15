# Integration Architecture

This directory contains the integration modules for various AI development tools.

## Directory Structure

```
src/lib/integrations/
├── shared/                    # Shared utilities used by all integrations
│   ├── index.ts              # Re-exports all shared utilities
│   ├── daily-aggregate.ts    # SINGLE source of truth for daily aggregates
│   ├── otlp-primitives.ts    # Tool-agnostic OTLP parsing utilities
│   ├── auth.ts               # User authentication helpers
│   └── pricing.ts            # Model pricing calculation
│
├── claude/                   # Claude Code integration
│   ├── index.ts             # Integration config & metadata
│   ├── CLAUDE.md            # Claude Code integration docs
│   ├── parser.ts            # Claude-specific OTLP parsing
│   ├── protobuf.ts          # Isolated protobuf decoder
│   ├── types.ts             # Claude-specific types
│   ├── metrics-handler.ts   # Metrics processing
│   └── logs-handler.ts      # Logs processing
│
├── gemini/                   # Gemini CLI integration (JSON only)
│   ├── index.ts
│   ├── GEMINI.md
│   ├── parser.ts
│   ├── types.ts
│   ├── metrics-handler.ts
│   └── logs-handler.ts
│
├── codex/                    # Codex integration
│   ├── index.ts
│   ├── CODEX.md
│   ├── parser.ts
│   ├── protobuf.ts
│   ├── types.ts
│   └── logs-handler.ts
│
├── copilot/                  # GitHub Copilot integration
│   ├── index.ts
│   ├── COPILOT.md
│   ├── api-client.ts
│   └── types.ts
│
├── kiro/                     # Kiro integration
│   ├── index.ts
│   ├── KIRO.md
│   └── types.ts
│
├── cursor/                   # Cursor integration
│   ├── index.ts
│   ├── CURSOR.md
│   └── types.ts
│
└── github/                   # GitHub webhook utilities
    ├── index.ts
    ├── classifier.ts        # Commit/PR classification
    └── signature.ts         # Webhook signature verification
```

## Design Principles

### 1. Integration Isolation

Each integration is self-contained. Changes to one integration should NOT impact others.

- Each integration has its own directory with all necessary code
- Protobuf decoders are copied per integration (not shared)
- Types are defined per integration (not shared)
- Only generic utilities are shared

### 2. Shared Utilities

The `shared/` directory contains utilities that are safe to share:

| Utility | Purpose |
|---------|---------|
| `daily-aggregate.ts` | Single source of truth for `upsertDailyAggregate` |
| `otlp-primitives.ts` | Low-level OTLP parsing (no tool logic) |
| `auth.ts` | User authentication from requests |
| `pricing.ts` | Model pricing calculations |

### 3. Reliability Over DRY

When in doubt, favor reliability over code reuse:

- **Share**: Pure functions, database operations, authentication
- **Don't share**: Protocol handling, metric parsing, tool-specific logic

## API Endpoints

Each integration has its own API endpoints:

| Integration | Endpoints |
|-------------|-----------|
| Claude Code | `/api/v1/integrations/claude/metrics`, `/api/v1/integrations/claude/logs` |
| Gemini CLI | `/api/v1/integrations/gemini/metrics`, `/api/v1/integrations/gemini/logs` |
| Codex | `/api/v1/integrations/codex/logs` |
| Copilot | `/api/v1/integrations/copilot/sync` |
| Kiro | `/api/v1/integrations/kiro/ingest` |
| Cursor | `/api/v1/integrations/cursor/ingest` |

### Legacy OTLP Endpoints

The legacy endpoints still work but are deprecated:

- `/api/v1/otlp/v1/metrics` - Detects tool and routes to appropriate handler
- `/api/v1/otlp/v1/logs` - Detects tool and routes to appropriate handler

These endpoints log deprecation warnings and forward to the integration-specific handlers.

## Adding a New Integration

1. Create a new directory: `src/lib/integrations/{tool}/`
2. Create the integration module:
   - `index.ts` - Export integration config
   - `types.ts` - Define tool-specific types
   - `{tool}.md` - Document the integration
3. Create API route(s): `src/app/api/v1/integrations/{tool}/`
4. Update the legacy routers if the tool uses OTLP

## Related Files

- `src/lib/utils/date.ts` - Centralized date utilities
- `src/lib/settings/` - Settings service (including GitHub settings)
- `src/lib/roi/cost-config.ts` - Cost configuration service
- `src/lib/otlp/parser.ts` - Legacy parser (re-exports for backward compatibility)
