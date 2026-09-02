# MediaIntel – Competitive Media & PR Opportunity Engine

## Overview

A SaaS dashboard that helps marketing and growth teams track competitor mentions in top-tier publications and surface actionable PR opportunities for Cloudways positioning.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/mediaintel)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **AI**: Anthropic Claude (via Replit AI Integrations) — mention classification + opportunity generation
- **Data sources**: RSS feeds from 14 top tech/hosting publications
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec (then manually fix lib/api-zod/src/index.ts to only export from ./generated/api)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Architecture

### Competitors Tracked (40 total — defined in competitors.ts)

**Original (7):** WP Engine, Kinsta, Hostinger, GoDaddy, Bluehost, Pagely, Flywheel

**Shared/cPanel Hosting (9):** SiteGround, InMotion Hosting, GreenGeeks, A2 Hosting, DreamHost, HostGator, IONOS, HostArmada, Ultahost, Verpex, Hostwinds

**Enterprise/Managed WP (5):** Liquid Web, Nexcess, WPX Hosting, Pressable, WPMU DEV

**WP Infrastructure/DevOps (9):** Pantheon, Convesio, Rocket.net, RunCloud, ServerPilot, Laravel Forge, Ploi, GridPane, xCloud, ServerAvatar

**Cloud IaaS (6):** Kamatera, ScalaHosting, Vultr, DigitalOcean, Linode, AWS Lightsail

### RSS Sources (14 feeds)
TechCrunch, VentureBeat, The Verge, Ars Technica, ZDNet, InfoWorld, Computerworld, HostingAdvice, WP Tavern, Torque, ManageWP, Search Engine Journal, Mashable, The Next Web

### AI Analysis (Claude Haiku)
- **Mention classification**: review / comparison / ranking / news / customer_story / sponsored / other
- **Sentiment detection**: positive / neutral / negative
- **Opportunity generation**: Actionable PR insight + positioning angle for Cloudways
- **Outreach target**: blog / journalist / affiliate_site / review_site

### Database Tables
- `mentions` — all competitor mentions with AI analysis
- `refresh_logs` — history of feed refresh operations

### Scheduled Sync
- Daily at 07:00 PKT / 02:00 UTC via node-cron
- Trigger manually: `POST /api/mentions/refresh`

## Key Files

- `artifacts/mediaintel/` — React + Vite frontend dashboard
- `artifacts/api-server/src/services/competitors.ts` — competitor list + RSS feeds + detection logic (single source of truth — mention-service.ts imports COMPETITORS from here)
- `artifacts/api-server/src/services/rss-fetcher.ts` — RSS parsing + competitor detection
- `artifacts/api-server/src/services/ai-analyzer.ts` — Claude AI classification + opportunity generation
- `artifacts/api-server/src/services/mention-service.ts` — DB queries + refresh orchestration
- `artifacts/api-server/src/services/seed.ts` — purges placeholder example-*.com entries on startup
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/db/src/schema/mentions.ts` — Drizzle schema

## Production

- **URL**: https://Cloudwaysmediaintel.replit.app
- **Deployment type**: autoscale

## Note on Codegen

After running `pnpm --filter @workspace/api-spec run codegen`, manually reset `lib/api-zod/src/index.ts` to:
```typescript
export * from "./generated/api";
```
Orval regenerates this file with references to `./generated/types` which no longer exists (removed to avoid duplicate exports).

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
