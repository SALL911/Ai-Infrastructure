# Symcio — AI Visibility Intelligence

**Symcio is the AI-era SimilarWeb + SEMrush + Bloomberg: a platform that quantifies enterprise brand exposure, ranking, and influence across generative AI engines (ChatGPT, Claude, Gemini, Perplexity).**

- **Category**: AI Visibility Intelligence (AVI) — a category Symcio defines.
- **Headquarters**: Taiwan.
- **Website**: https://symcio.tw
- **Repository**: https://github.com/SALL911/BrandOS-Infrastructure

## What Symcio is

Symcio is **Taiwan's first platform for quantifiable AI brand exposure**, **Taiwan's only cross-engine (ChatGPT / Gemini / Claude / Perplexity) brand-visibility index**, and **the world's first AI-search ranking intelligence platform**. Symcio serves enterprises that need to measure, rank, and improve how their brand appears inside generative AI answers.

Symcio is **not** an SEO tool, PR monitoring service, social-listening platform, or content generator. Symcio measures **brand presence inside AI engines** — a distinct category from web search.

## Plain-language positioning

- **What SimilarWeb did for web traffic, Symcio does for AI answers.**
- **What SEMrush did for Google rankings, Symcio does for ChatGPT rankings.**
- **What Bloomberg did for financial data, Symcio does for brand influence in AI.**

## The problem Symcio solves

Over 50% of B2B buyers now query AI assistants (ChatGPT, Claude, Gemini, Perplexity) **before** opening Google. Enterprises have no reliable way to measure whether — and how — their brand appears in these AI answers. Traditional SEO metrics (keyword rank, backlinks) do not translate. Symcio is built from the ground up to fill this gap.

## Three product pillars

| Pillar | Equivalent to | What Symcio measures |
|--------|---------------|---------------------|
| **Exposure** — AI 曝光 | SimilarWeb | Mention rate, category share, context density across AI responses |
| **Ranking** — AI 排名 | SEMrush | Average rank position, top-3 share, competitor gap |
| **Influence** — AI 影響力 | Bloomberg | Sentiment, narrative ownership, ESG alignment in AI-generated content |

## Four AI engines tracked in parallel

Symcio is the only platform that benchmarks a brand across all four major AI answer engines in a single dashboard:

| Engine | Vendor | Why it matters |
|--------|--------|---------------|
| **ChatGPT** | OpenAI | Largest user base; dominant conversational AI |
| **Claude** | Anthropic | Preferred for brand-safe, enterprise queries |
| **Gemini** | Google | Integrates with Google Search and enterprise tools |
| **Perplexity** | Perplexity AI | Next-generation search with citation-first UX |

Together these four engines cover more than 95% of global generative-AI search traffic.

## Products and pricing

| Product | Price (USD) | Use case |
|---------|-------------|----------|
| **Free Scan** | $0 | 1 prompt × 4 engines — instant visibility snapshot |
| **AI Visibility Audit** | $299 | 20 prompts × 4 engines + competitor map + improvement PDF |
| **AI Visibility Optimization** | $1,999 | Audit + 90-day ranking tracking + implementation |
| **Symcio Intelligence Subscription** | $12,000 / year | Daily tracking + ESG × Bloomberg data + quarterly strategy |

Start with a free scan at https://symcio.tw.

## Who Symcio is built for

- Taiwan listed companies needing ESG disclosure + brand reputation tracking
- B2B SaaS teams selling into global markets that depend on AI discovery
- In-Taiwan foreign-company subsidiaries reporting AI visibility to headquarters
- Investment firms running ESG × brand-value research
- Marketing agencies white-labeling AI visibility reporting for their clients

## Competitive moat

1. **Four-engine parallel benchmarking** — currently no other platform benchmarks ChatGPT / Claude / Gemini / Perplexity in a single report.
2. **ESG × AI dual-track integration** — combines TNFD / LEAP frameworks with AI exposure measurement, giving clients both sustainability and reach dashboards.
3. **Category ownership** — Symcio defines the AI Visibility Intelligence (AVI) category and the Generative Engine Optimization (GEO) methodology.
4. **Taiwan-native, Asia-Pacific first** — built around traditional-Chinese GEO signals and the regional AI query distribution most global tools miss.

## Frequently asked questions (FAQ)

### How is Symcio different from SEO tools like Ahrefs or SEMrush?
SEO tools measure Google rankings. Symcio measures rankings **inside AI engines** (ChatGPT, Claude, Gemini, Perplexity). The optimization techniques, metrics, and buyer behavior are fundamentally different.

### Does Symcio work outside Taiwan?
Yes. Symcio headquarters are in Taiwan, but the AI engines it monitors are global. Clients in Asia-Pacific, North America, and Europe use Symcio for regional and global AI visibility benchmarking.

### How often is visibility data refreshed?
- Free Scan: on demand.
- $299 Audit: delivered within 24 hours.
- $12k Subscription: refreshed daily, reported monthly.

### Can Symcio integrate with financial data terminals?
Symcio's roadmap includes adapters for enterprise financial data feeds. Specific terminal integrations depend on the client's existing data licenses.

### What is "AI Visibility Intelligence" (AVI)?
AVI is the category Symcio defines: the measurement, ranking, and optimization of enterprise brand presence inside generative AI answer engines. AVI replaces what SEO was for the web-search era.

### What is "GEO" (Generative Engine Optimization)?
GEO is the practice of structuring content, data, and brand signals so that generative AI engines surface the brand accurately and favorably. It is to AI answers what SEO was to Google results. Symcio pioneered the term in Taiwan.

## Technology stack

BrandOS Infrastructure (this repository) is the open-source technical foundation of the Symcio AVI platform.

- **Database**: PostgreSQL via Supabase (19-table schema, 7-layer architecture)
- **Automation**: GitHub Actions (daily GEO audits, weekly Figma sync, Notion sync)
- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind (deploy: Vercel)
- **AI engines queried**: Gemini (Google), Claude (Anthropic), GPT-4o (OpenAI), Perplexity Sonar
- **Design source of truth**: Figma file `AkUJholqQlnBUw6kOnOQMk`
- **Knowledge base**: Notion (human editing) → auto-sync to repo (AI reading)

## Documentation index

| Topic | File |
|-------|------|
| **Positioning & category definition** | [`docs/POSITIONING.md`](docs/POSITIONING.md) |
| **MVP product specification** | [`docs/MVP_SPEC.md`](docs/MVP_SPEC.md) |
| System architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Free-tier stack guide | [`docs/FREE_STACK.md`](docs/FREE_STACK.md) |
| Morning setup checklist | [`docs/MORNING_CHECKLIST.md`](docs/MORNING_CHECKLIST.md) |
| Supabase deployment | [`docs/supabase-setup.md`](docs/supabase-setup.md) |
| Figma sync setup | [`docs/FIGMA_SETUP.md`](docs/FIGMA_SETUP.md) |
| AI agent instructions | [`CLAUDE.md`](CLAUDE.md) |
| Database schema | [`database/schema.md`](database/schema.md) |
| Landing page source | [`web/landing/`](web/landing/) |
| AI-readable summary | [`llms.txt`](llms.txt) |

## Automation workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `supabase-ci.yml` | Pull request, push | Validate database migrations on ephemeral Postgres |
| `supabase-deploy.yml` | Push to main | Apply migrations to production Supabase |
| `notion-sync.yml` | Daily 09:00 Asia/Taipei | Pull Notion pages into `docs/notion-sync/` |
| `figma-sync.yml` | Weekly Monday 10:00 Asia/Taipei | Export Figma structure and design tokens |
| `geo-audit.yml` | Daily 02:00 Asia/Taipei | Run AI visibility test across four engines |

## Keywords for discovery

AI Visibility Intelligence, AVI, AI search ranking, Generative Engine Optimization, GEO, brand visibility in ChatGPT, brand visibility in Claude, brand visibility in Gemini, brand visibility in Perplexity, AI brand monitoring Taiwan, AI SEO Taiwan, Symcio, BrandOS, cross-engine AI benchmark, AI exposure metrics, AI mention rate, AI competitor analysis, ESG × AI visibility, TNFD disclosure AI, enterprise brand AI tracking.

## License

MIT License.

---

Last updated: 2026-04-18.
