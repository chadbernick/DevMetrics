# Gemini Context: Developer Metrics Dashboard

This `GEMINI.md` file provides essential context and instructions for working with the **Developer Metrics Dashboard** project.

## Project Overview

**Developer Metrics Dashboard** is a Next.js 16 application designed to track, measure, and visualize AI-assisted development productivity. It aggregates data from various AI coding tools (Claude Code, Kiro, Codex, GitHub Copilot, Cursor) to calculate ROI and monitor team performance.

### Key Features
*   **Multi-Tool Tracking**: Supports major AI coding assistants.
*   **OpenTelemetry (OTLP) Ingestion**: Native support for receiving metrics/logs from tools like Claude Code.
*   **ROI Calculation**: Dynamic calculation of hours saved based on code volume and complexity.
*   **GitHub Integration**: Webhooks for tracking commits and PRs.
*   **Configurable Dashboard**: Drag-and-drop widgets and customizable metrics.

## Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Database**: SQLite (via `better-sqlite3`)
*   **ORM**: Drizzle ORM
*   **Styling**: Tailwind CSS
*   **Charts**: Recharts
*   **Icons**: Lucide React

## Development Workflow

### Prerequisites
*   Node.js 18+
*   npm or yarn

### Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the development server at `http://localhost:3000`. |
| `npm run build` | Build the application for production. |
| `npm run lint` | Run ESLint. |
| `npm run db:push` | Push schema changes to the SQLite database. |
| `npm run db:studio` | Open Drizzle Studio to inspect/edit the database GUI. |
| `npm run db:seed` | Seed the database with sample data. |
| `npm run db:generate` | Generate database migrations. |

### Database Management
The project uses **Drizzle ORM** with **SQLite**.
*   **Schema**: Defined in `src/lib/db/schema.ts`.
*   **Migrations**: Managed via `drizzle-kit`.
*   **Data Location**: By default, the database file is at `./data/dashboard.db`.

## Architecture & Data Flow

### 1. Ingestion Strategies (Vertical Slices)
To ensure resilience and reduce blast radius, we employ a "Vertical Slice" architecture for integrations. Each tool has its own dedicated API endpoint and isolated logic.

*   **Gemini CLI**:
    *   **Protocol**: HTTP/JSON (via OpenTelemetry)
    *   **Endpoint**: `/api/v1/integrations/gemini`
    *   **Logic**: `src/app/api/v1/integrations/gemini/route.ts`
*   **Claude Code**:
    *   **Protocol**: HTTP/Protobuf (via OpenTelemetry)
    *   **Endpoint**: `/api/v1/integrations/claude`
    *   **Logic**: `src/app/api/v1/integrations/claude/route.ts` (Planned)
*   **Generic OTLP**:
    *   **Endpoint**: `/api/v1/otlp/v1/metrics` (Legacy/Fallback)

### 2. Processing
*   Incoming data is validated and normalized into a standard schema.
*   **Raw Tables**: `sessions`, `tokenUsage`, `toolCalls`.
*   **Daily Aggregates**: Metrics are pre-computed into `dailyAggregates` for efficient dashboard querying.

### 3. Visualization
*   The frontend (`src/app/page.tsx`) queries aggregated data to render charts and widgets.

### Key Database Tables (`src/lib/db/schema.ts`)
*   `sessions`: Tracks AI tool sessions.
*   `tokenUsage`: Detailed token consumption (input, output, cache).
*   `dailyAggregates`: Pre-calculated daily stats per user.
*   `toolCalls`: Tracks individual tool executions and success rates.
*   `codeMetrics`: Lines of code added/modified/deleted.
*   `modelPricing`: Configuration for cost calculations.

## Integrations

### Gemini CLI
*   **Status**: Active
*   **Documentation**: `docs/integrations/gemini.md` (to be created)
*   **Env Vars**: `GEMINI_TELEMETRY_ENABLED`, `GEMINI_TELEMETRY_OTLP_ENDPOINT`
*   **Key Metrics**: Session count, Token usage, Tool calls.

## Directory Structure

*   `src/app/api/v1/`: API route handlers (Ingest, Dashboard, OTLP).
*   `src/components/`: React components (Charts, Dashboard widgets).
*   `src/lib/db/`: Database schema and connection logic.
*   `src/lib/otlp/`: OpenTelemetry parsing and type definitions.
*   `scripts/`: Utility scripts (seeding, backups).

## Conventions

*   **Path Aliases**: Use `@/` to reference `src/` (e.g., `import { db } from "@/lib/db"`).
*   **API Responses**: Standardized JSON format with `success`, `error`, and `code` fields.
*   **Styling**: Use Tailwind utility classes. Follow the existing color palette (`var(--accent-cyan)`, etc.).
*   **Component Structure**: Separate Server Components (data fetching) from Client Components (interactivity).
