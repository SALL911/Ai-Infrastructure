# BrandOS AI Orchestrator

Imported from Replit (`brand-os-ai-orchestrator--sallhuang.replit.app`) on 2026-04-26.
**Status: deployed on Vercel** — see `DEPLOY.md` and `vercel.json`.

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

## Database schema (8 tables)

`brand` · `personas` · `brand_events` · `ai_decisions` ·
`generated_content` · `campaigns` · `integrations` · `taiwan_brands`

`taiwan_brands` is the dashboard data source (30 listed brands with
score / week_change / industry segments). Seed via `pnpm --filter
@workspace/api-server run db:seed`.

## Migration plan (path A: standalone)

1. **Now (this commit)**: code lives at `apps/orchestrator/`, isolated from
   `web/landing` and existing Supabase.
2. **Next**: stand up local dev — `pnpm install` at this directory, point
   `lib/db/` at a fresh PostgreSQL (Supabase project or Vercel Postgres),
   run `pnpm --filter @workspace/db push` to materialize schema.
3. **Deploy**: single Vercel project — SPA from `artifacts/brandos/dist/public`,
   API consolidated under `api/[...path].mjs`. See `DEPLOY.md`.
4. **Domain**: target `orchestrator.symcio.tw` subdomain, not the main site.
5. **Later (deferred)**: evaluate merging `lib/api-zod` + `lib/api-client-react`
   into `web/landing`, and unifying the DB with Supabase tables in
   `database/schema.md`.

## Replit-specific bits removed

- `.replit`, `.replitignore`, `.agents/`, `attached_assets/`, `.config/`,
  `replit.md`, `*/.replit-artifact/` — gone.
- `@replit/vite-plugin-*` (cartographer / dev-banner / runtime-error-modal)
  — removed from `artifacts/brandos/package.json` devDeps and the corresponding
  Vite config entries. `pnpm install` is now Replit-free.

## Deploy target — single Vercel project

Confirmed via `vercel.json` at `apps/orchestrator/vercel.json`:
- Static React SPA from `artifacts/brandos/dist/public`
- Serverless API at `api/[...path].mjs` (consolidates the Express 5 routes)
- Custom domain: `orchestrator.symcio.tw`

See `DEPLOY.md` for the first-deploy runbook (DB provisioning, seed,
Vercel project link, domain).

## Open decisions（仍未定，但不阻塞首次部署）

- Drizzle schema vs Supabase `brands` / `brand_scores` etc. — duplicate
  fields exist; merge or keep parallel after first deploy is healthy.
- `lib/api-spec` vs existing OpenAPI surfaces — single source of truth.
