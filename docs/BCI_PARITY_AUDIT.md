# BCI Scoring Parity Audit

**Date:** 2026-05-03
**Scope:** `apps/symcio-brand-audit/js/scoring-v2.js` (canonical) vs.
`web/landing/lib/scoring.ts` (TypeScript port)
**Verdict:** 99% parity — 1 minor copy drift requires a product call.

---

## Why this audit exists

`apps/symcio-brand-audit/` is the static-HTML Netlify backup MVP per
`docs/PRODUCT_OVERVIEW.md`. `web/landing/lib/scoring.ts` is a hand-port
to TypeScript that drives the live Vercel site at `symcio.tw`. If the
two drift, customers seeing the audit report on the primary site get a
different recommendation than customers hitting the fallback. That's a
silent UX bug.

This audit is a one-time check after the 2026-05-03 monorepo audit
flagged the relationship in `docs/FUTURE_OPTIMIZATIONS.md`.

---

## Method

Read both files end-to-end, compared:

1. Constants tables (5 of them)
2. Hashing & PRNG functions
3. FBV / NCV / AIV layer formulas
4. BCI normalization weights
5. GEO check seed offsets and thresholds
6. Recommendation rules (5 conditions)
7. Tier classifier thresholds
8. Output shape

---

## Identical (no action needed)

| Surface | Detail |
|---------|--------|
| `INDUSTRY_BRAND_ROLE` | 11 industries × 1 multiplier — exact match |
| `INDUSTRY_LEAP` | 11 industries × 1 base score — exact match |
| `COMPETITORS` | 11 industries × 3 competitors × {name, score} — exact match |
| `REVENUE_MULT` | 6 brackets × 1 multiplier — exact match |
| `SIZE_MULT` | 4 brackets × 1 multiplier — exact match |
| `hashCode(str)` | `((hash << 5) - hash) + char`, abs at end — identical |
| `seededRandom(seed, min, max)` | `Math.sin(seed) * 10000` PRNG — identical |
| FBV formula | `(rev*40 + size*30 + role*20 + strength*0.1) * (strength/100)` — identical |
| NCV formula | `leapScore*0.6 + biocredit*0.02`, biocredit = `leap*revMult*10` — identical |
| AIV formula | weights `0.35 / 0.25 / 0.25 / 0.15` for ChatGPT / Perplexity / Google AI / Claude — identical |
| AIV seeds | offsets `+10 / +11 / +12 / +13` — identical |
| BCI normalization | α=0.5, β=0.25, γ=0.25; FBV×2.5, NCV×1.5, AIV×1 — identical |
| GEO checks | seeds `+20 / +21 / +22 / +23`, thresholds `>7 / >8 / >6 / >4` — identical |
| `bciTier` thresholds | 80 / 60 / 40 — identical, colours identical |

Bottom line: **the math, the data, the deterministic seeding, the
output structure all match exactly**. Same input on both sites yields
the same BCI score and sub-scores.

---

## Drift (1 case, copy-only)

**Trigger:** `NCV_norm < 30` recommendation, `action` field.

| Source | Text |
|--------|------|
| `apps/symcio-brand-audit/js/scoring-v2.js:155` | `'使用 npfbriefing.netlify.app 工具進行免費評估'` |
| `web/landing/lib/scoring.ts:320` | `"使用 TNFD LEAP 工具進行免費評估"` |

The **`title`, `desc`, `priority`** for this recommendation are
identical in both files. Only the `action` (the suggested next-step
text shown to the user) differs.

### Why this matters

A user with a low NCV score landing on:
- `symcio.tw` → told to "use TNFD LEAP tool"
- the Netlify backup → told to "use npfbriefing.netlify.app"

If `npfbriefing.netlify.app` is a real, live tool, customers on the
primary site are missing a useful pointer. If it's stale / dead, the
backup site is sending users to a broken link.

### Decision needed (product, not engineering)

Pick one direction and propagate:

**Option A — Promote the URL into the port** (port follows source)

```diff
- // web/landing/lib/scoring.ts:320
- action: "使用 TNFD LEAP 工具進行免費評估",
+ action: "使用 npfbriefing.netlify.app 工具進行免費評估",
```

Use this if `npfbriefing.netlify.app` is a real Symcio (or partner)
tool that should be discoverable from the audit report.

**Option B — Genericise the source** (source follows port)

```diff
- // apps/symcio-brand-audit/js/scoring-v2.js:155
- action: '使用 npfbriefing.netlify.app 工具進行免費評估'
+ action: '使用 TNFD LEAP 工具進行免費評估'
```

Use this if `npfbriefing.netlify.app` is dead, deprecated, or never
should have been hard-coded as a public-facing recommendation.

### Verification before deciding

Open https://npfbriefing.netlify.app in a browser:

- ✅ Live and on-message → Option A
- ❌ 404, parked, or not Symcio-affiliated → Option B
- 🤷 Live but a half-finished side project → Option B (don't send
  paying customers there)

---

## Going forward

The TypeScript port being a hand-maintained copy of the JS source is a
**structural drift risk**. Each time either file changes, parity has to
be re-verified manually.

Options to harden (not done in this audit, captured for future):

1. **Generate `scoring.ts` from `scoring-v2.js`** at build time (easy
   if formulas; harder if literal strings change).
2. **Move both onto a shared `lib/scoring/` package** in the pnpm
   workspace, imported by Next.js and consumed as `<script>` by the
   static site via a build step.
3. **Just delete one**: if the primary site is reliable enough, retire
   the Netlify backup MVP and remove the entire static-HTML codebase.
   This reduces surface area but loses the failover argument.

For now: keep both, re-run this parity audit any time `scoring-v2.js`
or `scoring.ts` is touched in a PR. The audit itself takes ~15 minutes
and prevents silent customer-facing bugs.
