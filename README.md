# Developer Metrics Dashboard

A Next.js application for tracking AI-assisted development productivity across multiple tools (Claude Code, Gemini CLI, Codex, Copilot, Cursor, Kiro). Measures ROI, integrates with GitHub via webhooks, and visualizes metrics.

## Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- Git (for version control features)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd developer_dashboard
npm install
```

### 2. Database Setup (First Run)

Run the setup command to initialize the database and create your admin user:

```bash
npm run db:setup
```

This will:
- Create the SQLite database in `./data/dashboard.db`
- Push the schema to the database
- Prompt you to create an initial admin user (name, email, password)
- Seed model pricing configurations

Example output:
```
========================================
   Initial Admin User Setup
========================================

Admin Name: John Smith
Admin Email: john@example.com
Admin Password: ********
Confirm Password: ********

Admin user "John Smith" created successfully.

Seeding required configuration data...
  Created model pricing configuration
  Created default cost configuration

========================================
   Setup Complete!
========================================
```

### 3. Start the Development Server

```bash
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000).

### 4. Log In

Navigate to [http://localhost:3000/login](http://localhost:3000/login) and sign in with the admin credentials you created during setup.

## Production Deployment

### Environment Variables

Create a `.env.local` file for production settings:

```bash
# Database path (optional, defaults to ./data/dashboard.db)
DATABASE_PATH=/path/to/your/dashboard.db

# Base URL for the application
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# GitHub Webhook Secret (optional, for GitHub integration)
GITHUB_WEBHOOK_SECRET=your-secret-here
```

### Build and Start

```bash
npm run build
npm start
```

The production server runs on port 3000 by default.

### Docker Deployment (Optional)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Integrating AI Development Tools

### Claude Code

Configure Claude Code to send telemetry to your dashboard:

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000/api/v1/otlp/<YOUR-USER-ID>
```

Replace `<YOUR-USER-ID>` with your user ID from the dashboard (visible in Settings > Profile).

### Gemini CLI

Configure Gemini CLI in `~/.gemini/settings.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpProtocol": "http",
    "otlpEndpoint": "http://localhost:3000/api/v1/integrations/gemini?user=<YOUR-USER-ID>"
  }
}
```

Or via environment variables:

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:3000/api/v1/integrations/gemini?user=<YOUR-USER-ID>
```

### GitHub Webhooks

To track commits and pull requests from GitHub:

1. Go to your GitHub repository's Settings > Webhooks
2. Add a new webhook:
   - **Payload URL**: `https://your-domain.com/api/v1/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Generate a secret and add it to your `.env.local` as `GITHUB_WEBHOOK_SECRET`
   - **Events**: Select "Pushes" and "Pull requests"
3. In the dashboard, go to Settings > Integrations and configure the GitHub username mapping

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Initial setup with admin user creation |
| `npm run db:seed` | Clear mock data (preserves real users) |
| `npm run db:seed -- --sample` | Clear mock data and generate sample data |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run db:migrate` | Run database migrations |
| `npm run db:backup` | Create a database backup |

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
developer_dashboard/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/v1/            # API routes
│   │   ├── settings/          # Settings pages
│   │   └── ...
│   ├── components/            # React components
│   ├── lib/
│   │   ├── db/               # Database schema and connection
│   │   ├── integrations/     # AI tool integrations
│   │   ├── ingest/           # Event ingestion handlers
│   │   └── utils/            # Utility functions
│   └── ...
├── scripts/                   # Database and utility scripts
├── data/                      # SQLite database (created on setup)
└── ...
```

## API Endpoints

### Telemetry Ingestion

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `/api/v1/otlp/v1/metrics` | OTLP | Generic metrics ingestion |
| `/api/v1/otlp/v1/logs` | OTLP | Generic logs ingestion |
| `/api/v1/integrations/claude/metrics` | OTLP | Claude Code metrics |
| `/api/v1/integrations/claude/logs` | OTLP | Claude Code logs |
| `/api/v1/integrations/gemini/metrics` | JSON | Gemini CLI metrics |
| `/api/v1/integrations/gemini/logs` | JSON | Gemini CLI logs |
| `/api/v1/ingest` | JSON | Manual event ingestion |

### Dashboard & Configuration

| Endpoint | Description |
|----------|-------------|
| `/api/v1/dashboard` | Dashboard data aggregation |
| `/api/v1/users` | User management |
| `/api/v1/api-keys` | API key management |
| `/api/v1/roi` | ROI calculations |

## Troubleshooting

### Database Issues

If you encounter database errors, try:

```bash
# Backup existing data
npm run db:backup

# Re-push schema
npm run db:push
```

### Port Already in Use

If port 3000 is in use:

```bash
# Use a different port
PORT=3001 npm run dev
```

### Clear All Data and Start Fresh

```bash
# Remove database
rm -rf data/

# Run setup again
npm run db:setup
```

## License

MIT
