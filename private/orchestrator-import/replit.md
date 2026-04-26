# Workspace

## Overview

BrandOS Infrastructure — an AI-driven marketing automation platform built as a full-stack pnpm monorepo. Includes a structured brand database, event-driven workflow engine, AI decision layer, content generation, integrations dashboard, and analytics with feedback loops.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Radix UI
- **Charts**: Recharts
- **Animations**: Framer Motion

## Artifacts

- `artifacts/brandos` — BrandOS frontend React app (preview path: `/`)
- `artifacts/api-server` — Express API server (preview path: `/api`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

Tables:
- `brand` — brand identity, voice, messaging framework, value propositions
- `personas` — customer personas with pain points, goals, channels, engagement scores
- `brand_events` — user behavior events (page visits, downloads, signups, purchases)
- `ai_decisions` — AI-selected strategies, messaging angles, channels, confidence scores
- `generated_content` — ad copy, emails, landing pages, scripts, social posts
- `campaigns` — campaigns with budget, impressions, clicks, conversions, CTR, CVR
- `integrations` — CRM, CDP, ad platform, email, analytics connections

## Pages

- `/` — Dashboard with real-time summary stats, recent decisions and content
- `/data-layer` — Brand voice config + customer persona management
- `/events` — Live event feed, event distribution charts, workflow simulator
- `/decisions` — AI decision list, trigger new decisions, confidence scores
- `/content` — Content library with generation form (ad copy, email, landing page, script, social)
- `/distribution` — Campaign management + integrations dashboard (CRM/CDP/Ad platforms)
- `/analytics` — CTR/CVR charts, campaign performance, feedback loop submission

## Key Feature: Workflow Simulation

Events page → select event type → Simulate Workflow → cascading animation:
Event → AI Decision → Content Generated → Campaign Activated

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
