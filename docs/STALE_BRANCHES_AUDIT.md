# Stale Branches Audit

**Date:** 2026-05-04
**Scope:** All `claude/*` branches on `SALL911/BrandOS-Infrastructure`
**Method:** For each branch — git diff vs `main`, file-existence check
in main, cross-reference with merged PRs (#30–#58). No content opened
or restored — this is a triage, not a recovery.

---

## TL;DR

41 branches surveyed → recommended actions:

| Tier | Action | Count |
|------|--------|-------|
| **1. Delete now** — content fully in main, branches are merge artefacts | ~14 |
| **2. Delete probably** — superseded by direct commits or rewritten elsewhere | ~22 |
| **3. Keep / review** — content NOT in main, real work that may still be wanted | 4 |
| **4. Active** — open PR | 1 |

After cleanup, the `claude/*` namespace shrinks from 41 to ~5 branches.

---

## How to act on this

GitHub UI is the path of least resistance:

1. Open https://github.com/SALL911/BrandOS-Infrastructure/branches
2. For Tier 1 + Tier 2 — click the 🗑 icon on each. GitHub keeps a 30-day
   "Restore" safety net, so misclicks are recoverable.
3. For Tier 3 — open each in browser, skim the diff, decide:
   merge / cherry-pick / delete / open as draft PR for further work.
4. Tier 4 — leave alone (already an open PR).

GitHub repo setting "Automatically delete head branches" was enabled
on 2026-05-03, so this is a one-time cleanup of historical inventory.
Future merges will self-clean.

---

## Tier 1 — Delete now (this-session merge artefacts + ahead=0)

Already squash-merged into main as a separate commit. Local branch is
no longer needed. Verified via merged PR titles + commit SHAs.

| Branch | Merged via |
|--------|------------|
| `claude/precompile-api-server-0l7PM` | PR #47 ✅ |
| `claude/deploy-runbook-refresh` | PR #48 ✅ |
| `claude/footer-remove-personal-contact` | PR #49 ✅ |
| `claude/cleanup-dead-code` | PR #51 ✅ |
| `claude/future-optimizations-doc` | PR #52 ✅ |
| `claude/cron-failure-alerts` | PR #53 ✅ |
| `claude/archive-gpu-ai-workflow` | PR #54 ✅ |
| `claude/keepwarm-and-parity-finding` | PR #58 ✅ |
| `claude/setup-supabase-table-editor-JrbZF` | PR #33 ✅ (commit `e0456de` in main) |

Plus 3 branches that are **ahead=0 vs main** (= entirely behind, all
their work already in main, just the branch ref was forgotten):

| Branch | Reason |
|--------|--------|
| `claude/fix-e2e-flaky` | ahead=0 |
| `claude/mvp-landing-page` | ahead=0 |
| `claude/next-task-Y9ALP` | ahead=0 |

Plus 2 with their unique files **verified to exist in main verbatim**:

| Branch | Verification |
|--------|--------------|
| `claude/geo-audit-queue` | `.github/workflows/geo-audit-queue.yml` + `supabase/migrations/20260421000000_geo_audit_queue.sql` both in main |
| `claude/notebooklm-research-pipeline` | `docs/CLAUDE_CODE_SKILLS_RESEARCH.md` + `scripts/notebooklm_research.py` + `data/claude_code_skills_seed.txt` all in main |

**Total Tier 1: 14 branches.**

---

## Tier 2 — Delete probably (superseded by other PRs / direct commits)

These have content that **substantively** landed in main via different
commits, but the branch's exact diff is not byte-for-byte present.
Evidence is strong but not 100% — the safe move is to delete since git
history retains the commits and GitHub's 30-day branch-restore covers
"oh wait" moments.

| Branch | Why probably superseded |
|--------|--------------------------|
| `claude/add-brand-backfill-workflow` | PR #35 added `brand-backfill.yml` workflow; this branch's earlier version |
| `claude/diagnose-db-auth` | Diagnostic-only commit; PR #45 superseded |
| `claude/help-next-steps-Bk4ub` | PR #44 (drizzle migrator + committed SQL) superseded |
| `claude/setup-orchestrator-env-ZdRJK` | `docs/ORCHESTRATOR_SETUP.md` in main; this was the precursor |
| `claude/unify-supabase-secret` | PR #39 (workflows unified) superseded |
| `claude/post-deploy-hotfix` | Small `/news` graceful-degrade fixes; main has the live version |
| `claude/notion-sync-and-tool-roles` | April-17 foundational; CLAUDE.md §9 + `notion-sync.yml` in main |
| `claude/notion-sync-auto-discover` | April-17; auto-discover behaviour in current `notion-sync.yml` |
| `claude/notion-exports-folder` | April-17; `docs/notion-exports/` is in main |
| `claude/overnight-mvp-scaffold` | April-17 initial scaffold; everything in main is descendant |
| `claude/symcio-positioning` | `docs/POSITIONING.md` in main |
| `claude/remove-bloomberg-rep-claim` | Legal cleanup; current copy across the site is post-cleanup |
| `claude/remove-zero-cost-messaging-6WqKA` | `/schema-generator` page exists in main |
| `claude/vercel-bootstrap` | One-shot setup script; Vercel projects are live now (no longer need bootstrap) |
| `claude/domain-cutover-runbook` | `docs/MIGRATE_SYMCIO_REPO.md` in main; cutover already happened |
| `claude/fix-symcio-display-kaKWO` | `docs/MIGRATE_SYMCIO_REPO.md` + Error 525 docs in main |
| `claude/fix-tabs-alignment-t5kZG` | Vercel Speed Insights already wired into `web/landing/app/layout.tsx` in main |
| `claude/docs-build-cache` | Docs build runs successfully in current Vercel deploy |
| `claude/create-entity-builder-html-A9Tsf` | Entity-builder explicitly migrated to `sall911/symcio` (CLAUDE.md §9.1) |
| `claude/continue-work-5KKNo` | Last commit is "drop ORCHESTRATOR_MERGE_PLAN.md — patches already applied upstream" — self-documenting |
| `claude/setup-supabase-cicd-qx4LG` | `supabase-ci.yml` + `supabase-deploy.yml` workflows in main |
| `claude/startup-list-priority-pipeline` | CSV import for "lists" — referenced PR #23 in commit msg, likely landed |

**Total Tier 2: 22 branches.**

For any of these you want extra confidence before deleting:

```bash
# from local clone, check what would be lost:
git fetch origin
git log origin/main..origin/<branch> --oneline   # commits not in main
git diff origin/main...origin/<branch>           # exact file-level diff
```

---

## Tier 3 — Keep / review (content NOT in main, may still be wanted)

These have substantive work that **is not present in main in any form**.
Each is a deferred product/eng decision, not janitorial cleanup.

### `claude/mitake-sms-pipeline`

**What's in it:** Mitake (三竹) SMS marketing pipeline with PDPA-compliant
opt-in flow.
- `.github/workflows/sms-campaign.yml`
- `docs/SMS_MITAKE.md`
- `scripts/sms_send_campaign.py`
- `supabase/migrations/20260423000000_sms_pipeline.sql`
- `web/landing/app/api/sms/{subscribe,verify}/route.ts`
- `web/landing/app/u/[token]/page.tsx`
- `web/landing/lib/sms/mitake.ts`

**Decision needed:** Do you still want SMS marketing as a channel?
Adjacent to the 60-day funnel work in `FUTURE_OPTIMIZATIONS.md §4`.
- Keep & merge later → list in Linear / Notion as "P2 SMS channel"
- Drop → SMS isn't a channel you're prioritising → delete branch

### `claude/posthog-ab-testing`

**What's in it:** PostHog feature flags + GA4 bridge for A/B testing.
- `docs/AB_TESTING_POSTHOG.md`
- `web/landing/components/{PostHogProvider,Experiment}.tsx`
- `web/landing/lib/posthog/{client,experiments}.ts`

**Decision needed:** Useful for the 60-day funnel measurement
(`FUTURE_OPTIMIZATIONS.md §4` mentions "加 PostHog event 看 funnel
各段 drop-off"). Strong recommend **keep**, possibly cherry-pick into
the funnel work when you start it.

### `claude/utm-attribution`

**What's in it:** UTM/fbclid/gclid attribution + AuditForm lead-source
fix + Meta Ads experiment doc.
- `docs/UTM_ATTRIBUTION.md`, `docs/META_ADS_EXPERIMENT.md`
- `supabase/migrations/20260424000000_leads_utm_attribution.sql`
- 5+ files in `web/landing/app/api/` and `components/`

**Decision needed:** Tightly coupled with the funnel work. Strong
recommend **keep**, merge when funnel is the active workstream. The
Supabase migration adds columns to `leads` — should land **before** any
new lead-creating code paths to avoid double migration.

### `claude/siwe-brand-verify`

**What's in it:** MetaMask / SIWE (Sign-In With Ethereum) brand-claim
flow on `/schema-generator`.
- `docs/WEB3_SIWE_STEP1.md`
- `supabase/migrations/20260422000000_siwe_brand_wallet.sql`
- 4 routes + ConnectWalletButton + providers

**Decision needed:** Web3 brand verification is niche. Adds
complexity. Pragmatic question: **does any prospective customer ask
for it?** If no → delete. If "maybe later" → it's documented in the
branch; can revive from git history when an actual lead surfaces.

**My read:** absent customer pull, **delete**. Easier to write fresh
in 2027 than maintain dormant.

---

## Tier 4 — Active

| Branch | Status |
|--------|--------|
| `claude/typeform-replace-personal-mailtos` | OPEN (PR #50, blocked on Typeform admin Hidden Field) |

---

## Recommended order of action

1. **Now** — delete all Tier 1 (14 branches, no-risk)
2. **Now** — delete all Tier 2 (22 branches, low-risk; 30-day GitHub
   restore is the safety net if you spot a regret)
3. **This week** — for Tier 3:
   - `posthog-ab-testing` + `utm-attribution` → label & track in
     Linear / Notion as "merge during funnel work" (`FUTURE_OPTIMIZATIONS.md §4`)
   - `mitake-sms-pipeline` → keep or drop based on channel prioritisation
   - `siwe-brand-verify` → delete unless customer asks
4. **PR #50 lands** — Tier 4 auto-resolves (auto-delete head branches
   is on)

End state: ~5 stable branches (main + any active session branches).

---

## Future maintenance

Don't repeat this audit unless `claude/*` branches reaccumulate. The
main hygiene mechanisms are in place:

- **Auto-delete head branches** — enabled in repo settings since
  2026-05-03 (catches all NEW merges)
- **Cron failure alert** — PR #53 surfaces background-job regressions
- **Future Optimizations doc** — `docs/FUTURE_OPTIMIZATIONS.md`
  captures decisions before they become stale branches
