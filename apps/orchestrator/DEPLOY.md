# BrandOS AI Orchestrator — first deploy runbook

Target: single Vercel project hosting both the static React SPA
(`artifacts/brandos`) and the Express API (`artifacts/api-server`)
behind one custom domain `orchestrator.symcio.tw`.

## Prereqs

- Vercel account with `symcio-os` team
- Cloudflare access for `symcio.tw` zone
- A PostgreSQL connection string (Supabase project recommended; pick a
  separate schema or a separate project from the main Symcio one to
  avoid table-name conflicts with `brands`, `personas`, etc.)
- `claude/import-orchestrator` branch merged or live as a deploy preview
  source

## 1. Provision the database

The `lib/db/` package owns 8 tables (`brand`, `personas`, `brand_events`,
`ai_decisions`, `generated_content`, `campaigns`, `integrations`,
`taiwan_brands`). Materialize them and seed the dashboard data once
before the first deploy:

```bash
cd apps/orchestrator
cp .env.example .env
# edit .env, set DATABASE_URL=postgres://...
pnpm install

# 1a. Push schema to the empty DB
pnpm --filter @workspace/db push

# 1b. Seed the 30 Taiwan listed brands (without this the dashboard
#     /api/rankings returns []; the SPA will render but be empty)
pnpm --filter @workspace/api-server run db:seed
```

`drizzle-kit push` is the safe path for first-run; it diff-applies the
TypeScript schema. For repeat environments, generate migrations and
run `migrate` instead — but that's stage 4.

The seed is idempotent (skips if `taiwan_brands` already has rows), so
re-running it on later schema changes is safe.

## 2. Create the Vercel project

1. https://vercel.com/new → Import Git Repository → `SALL911/BrandOS-Infrastructure`
2. Configure Project:
   - **Framework Preset**: `Other` (not Next.js — `vercel.json` controls everything)
   - **Root Directory**: `apps/orchestrator`
   - **Build / Install / Output**: leave blank, `vercel.json` overrides
3. Don't deploy yet — first set env vars (next step)

## 3. Environment variables

In Vercel → Project → Settings → Environment Variables, add for **all**
environments (Production, Preview, Development):

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgres://...` | from step 1 |
| `LOG_LEVEL` | `info` | `debug` for first deploy, switch back later |
| `NODE_ENV` | (leave Vercel default) | auto-set per env |

The frontend doesn't need `VITE_API_BASE_URL` because the SPA and API
share the same Vercel deployment — relative `/api/*` calls just work.

## 4. First deploy

Push any commit to `main` (or trigger manual deploy on
`claude/import-orchestrator`). Vercel runs:

```
pnpm install --frozen-lockfile --prefer-offline    # uses pnpm-lock.yaml
pnpm --filter @workspace/brandos run build          # vite build → dist/public/
# api/[...path].ts auto-detected, bundled with @vercel/node
```

The deploy URL will be `<project-name>-<hash>.vercel.app`. Smoke test:

```bash
curl https://<preview>.vercel.app/api/healthz
# returns: {"status":"ok"}
```

## 5. Custom domain

1. Vercel → Project → Settings → Domains → Add `orchestrator.symcio.tw`
2. Vercel will show required CNAME: `cname.vercel-dns.com`
3. Cloudflare → DNS → `symcio.tw` zone → Add record:
   - Type: `CNAME`
   - Name: `orchestrator`
   - Target: `cname.vercel-dns.com`
   - **Proxy: 🌫️ DNS only (grey cloud)** — needed for Vercel cert issuance
4. Wait for Vercel "Valid Configuration" + "Certificate Issued"
5. Once issued and stable, Cloudflare proxy → orange cloud (Full strict TLS)

## 6. Smoke test the live URL

```bash
curl -I https://orchestrator.symcio.tw
# 200, HTML

curl https://orchestrator.symcio.tw/api/healthz
# 200, {"status":"ok"}

# Hit a real DB-backed route once schema is pushed:
curl https://orchestrator.symcio.tw/api/rankings
```

Open the URL in a browser, click through 8 dashboard pages, watch
network tab for failed `/api/*` calls.

## 7. Replace the Replit URL

Once `orchestrator.symcio.tw` is verified working:

- Anywhere `brand-os-ai-orchestrator--sallhuang.replit.app` is referenced
  externally, swap to `https://orchestrator.symcio.tw`
- Replit project → Settings → Stop / Archive (don't delete until 1 month
  later, in case rollback)

## Known stage 3b items

- **Express on Vercel Functions has cold-start cost** (~600ms first
  request). If perceived latency matters, switch api-server to Railway
  or Fly with `pnpm --filter @workspace/api-server dev` as the start
  command.
- **No CI deploy gate yet** — every push to `main` deploys. Add a
  GitHub Actions step that runs `pnpm --filter @workspace/brandos run
  build` + `pnpm typecheck` before letting Vercel build, if false-deploy
  cost becomes a concern.
- **Drizzle migrations are not in CI** — `pnpm --filter @workspace/db
  push` runs locally only. For schema changes post-launch, generate
  migrations and run them via a Vercel build hook or GitHub Action.
