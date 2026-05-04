# private/archived/

Past code that's no longer wired into the live stack but kept here in
case we want to reference or revive parts of it. Anything in this
folder should be considered **NOT a source of truth** — production
behaviour comes from `apps/`, `web/`, `lib/`, `scripts/`, `supabase/`
and the workflow files under `.github/`.

## Why archive instead of delete?

Git history would preserve it either way, but moving it to a clearly
labeled folder:

- Stops `grep`, `find`, and editor "go to definition" from surfacing
  obsolete code as if it were live.
- Tells future readers (or future Claude sessions) that the code is
  intentional dead weight, not "I forgot about this".
- Keeps it one `git mv` away from being revived if a buried module
  turns out to be useful.

## Current contents

### `symcio-growth-system/`

Standalone Express 4.19 app (its own `package.json` / `package-lock.json`,
**not** in the pnpm workspace). Modules: lead capture, scoring, email
validation, HubSpot CRM, notifications.

**Why archived (2026-05-03):** every module has a live equivalent in the
production stack:

| growth-system module | live equivalent |
|----------------------|-----------------|
| Lead capture | `web/landing/app/api/webhooks/typeform/route.ts` |
| Lead scoring | `.github/workflows/lead-scorer.yml` |
| HubSpot CRM | `.github/workflows/composio-hubspot-sync.yml` |
| Email validation / notifications | Resend integration in `web/landing/lib/email/` |
| Brand AI Audit (skeleton) | `apps/orchestrator/artifacts/api-server/` (live, deployed) |

Nothing in the wider repo imports from `symcio-growth-system/`, so the
move has no runtime effect.
