# BrandOS AI Orchestrator

Imported from Replit (`brand-os-ai-orchestrator--sallhuang.replit.app`) on 2026-04-26.
**Status: not wired up yet** — see "Migration plan" below.

## What this is

Full-stack AI marketing orchestration prototype. The Replit deployment
demonstrated the core Symcio thesis (台灣品牌 AI 能見度指數) end-to-end:
30 listed Taiwan brands tracked across ChatGPT / Claude / Gemini, with
8 product surfaces (排行榜 / 品牌庫 / 監測事件 / 策略引擎 / 內容生成 /
通路整合 / 深度分析 / 系統設定).

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | pnpm workspace |
| Runtime | Node 24, TypeScript 5.9 |
| API | Express 5, esbuild bundle, pino logging |
| DB | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| API codegen | Orval (OpenAPI → React hooks + Zod schemas) |
| Frontend | React 19 + Vite + Tailwind + Radix UI + wouter |
| Charts / animation | Recharts, Framer Motion |

## Layout

```
apps/orchestrator/
├── lib/
│   ├── db/                  Drizzle schema + migrations
│   ├── api-spec/            OpenAPI source of truth
│   ├── api-zod/             Zod schemas (codegen target)
│   └── api-client-react/    React Query hooks (codegen target)
├── artifacts/
│   ├── api-server/          Express API
│   ├── brandos/             Vite + React dashboard (8 pages)
│   └── mockup-sandbox/      UI prototype playground
├── scripts/                 Workspace bootstrap utilities
├── pnpm-workspace.yaml      Workspace + catalog + supply-chain policy
└── tsconfig.base.json       Shared TS config
```

## Database schema (7 tables)

`brand` · `personas` · `brand_events` · `ai_decisions` ·
`generated_content` · `campaigns` · `integrations`

## Migration plan (path A: standalone)

1. **Now (this commit)**: code lives at `apps/orchestrator/`, isolated from
   `web/landing` and existing Supabase.
2. **Next**: stand up local dev — `pnpm install` at this directory, point
   `lib/db/` at a fresh PostgreSQL (Supabase project or Vercel Postgres),
   run `pnpm --filter @workspace/db push` to materialize schema.
3. **Deploy**: Vercel — `artifacts/brandos` as the web app, `artifacts/api-server`
   as a separate Vercel project (or split route handlers later).
4. **Domain**: target `orchestrator.symcio.tw` subdomain, not the main site.
5. **Later (deferred)**: evaluate merging `lib/api-zod` + `lib/api-client-react`
   into `web/landing`, and unifying the DB with Supabase tables in
   `database/schema.md`.

## Replit-specific bits removed

- `.replit`, `.replitignore`, `.agents/`, `attached_assets/`, `.config/`,
  `replit.md`, `*/.replit-artifact/` — all gone in this commit.
- **Still present** (need decision before clean dev): `@replit/vite-plugin-*`
  in `artifacts/brandos/package.json` devDeps, and the corresponding
  Vite config entries. They no-op outside Replit but pollute the install.

## Open decisions

- Drizzle schema vs Supabase `brands` / `brand_scores` etc. — duplicate
  fields exist; merge or keep parallel.
- Express 5 server lifetime — keep as standalone Vercel project, or migrate
  routes into `web/landing/app/api/`.
- `lib/api-spec` vs existing OpenAPI surfaces — single source of truth.

Decide before promoting to production deployment.
