# BrandOS Free Stack — 免費平台建議清單

## WHY

MVP 階段的每一分錢都該花在獲客與內容上，基礎設施盡量不付錢。此清單是針對 Symcio × BrandOS 的 AI Visibility + Brand Score 服務場景，實際驗證過「免費額度能撐到月營收 $10k USD 以上」的平台組合。

## 建議啟用順序（P0 最先，P3 可延後）

### P0：核心基礎（立刻註冊）

| # | 平台 | 用途 | 免費額度 | 註冊 URL |
|---|------|------|---------|---------|
| 1 | **GitHub** | Repo、Actions、Secrets | Public repo 無限；Private 2000 min Actions/月 | ✓ 已有 |
| 2 | **Supabase** | PostgreSQL + Auth + Storage | 500 MB DB / 2 GB bandwidth / 50k MAU | https://supabase.com |
| 3 | **Notion** | 人類協作、知識管理 | Free plan 無限 block（個人用） | ✓ 已有 |
| 4 | **Cloudflare** | DNS + CDN + Workers（邊緣函式） | Workers 100k request/日 | https://cloudflare.com |

### P1：MVP 展示層（下週完成）

| # | 平台 | 用途 | 免費額度 | 註冊 URL |
|---|------|------|---------|---------|
| 5 | **Vercel** | Next.js 靜態網站 + Serverless API | 100 GB bandwidth/月 / 6k build min | https://vercel.com |
| 6 | **Resend** | 交易信（報告寄送、歡迎信） | 100 emails/日 / 3000/月 | https://resend.com |
| 7 | **Tally** | 免費表單（lead 蒐集） | 無限表單、無限回應 | https://tally.so |
| 8 | **Calendly** | demo 預約 | 1 event type, 無限次數 | https://calendly.com |
| 9 | **PostHog Cloud** | 產品分析 + 錄影 + feature flags | 1M events/月 | https://posthog.com |
| 10 | **Plausible（選）** | 隱私友善網站分析 | 無免費但開源可自架 | 或用 Cloudflare Analytics（免費） |

### P2：AI 與內容產能（本月內）

| # | 平台 | 用途 | 免費額度 |
|---|------|------|---------|
| 11 | **Anthropic API** | Claude 模型（GEO 測試 + lead scoring） | $5 試用額度 / Claude.ai Pro 有 API credit |
| 12 | **OpenAI API** | GPT-4 / GPT-5（GEO 測試） | $5 試用 |
| 13 | **Google AI Studio** | Gemini API | **完全免費** 60 RPM / 1M tokens 日 |
| 14 | **Perplexity API** | Perplexity 測試 | $5 試用 |
| 15 | **Hugging Face** | 開源模型備援 | Inference API 免費額度 |

### P3：獲客與 CRM（營收進來後再升級）

| # | 平台 | 用途 | 免費額度 |
|---|------|------|---------|
| 16 | **LinkedIn Sales Navigator Trial** | B2B 潛在客戶挖掘 | 1 個月試用 |
| 17 | **Hunter.io** | Email 驗證 / 找對口 | 25 searches/月 |
| 18 | **Apollo.io** | 聯絡資料資料庫 | 50 credits/月 |
| 19 | **HubSpot CRM** | 正式 CRM（之後 Supabase 自建可退場） | 免費 CRM 無限聯絡人 |
| 20 | **Stripe** | 收款（月費制）| 無月費，只收手續費 |
| 21 | **Loom** | demo 錄影 | 25 videos, 5 min each |
| 22 | **Canva** | 視覺設計 | 免費版夠用 |
| 23 | **ConvertKit** | Newsletter | 1000 subscriber 免費 |
| 24 | **Buffer** | 社群排程 | 3 channels, 10 posts/channel |

## 強烈推薦：Google AI Studio（完全免費）

Gemini API 是目前**唯一完全免費**的前沿模型 API（60 請求/分鐘、1M tokens/日）。用於 GEO 可見度測試，**完全能撐住 MVP 前三個月**。

- 申請：https://aistudio.google.com → Get API key
- 用途：`scripts/geo_audit.py` 測 Gemini 可見度免成本

## 部署架構：零成本起步

```
Landing Page
└─ Vercel（free）
      ↓
Signup / Lead Form
└─ Tally → Webhook → Supabase `leads`
      ↓
Email 自動化
└─ Resend（100/day）
      ↓
GEO Audit Cron
└─ GitHub Actions（free）
      ↓  呼叫免費 Gemini API
Supabase `visibility_results`
      ↓
客戶 Dashboard
└─ Vercel + Supabase RLS（free）
      ↓
付款
└─ Stripe（% 抽成，無月費）
```

**總月費：$0**（直到 Supabase DB 超過 500MB 或 Vercel 超過 100GB）

## 不推薦的（避免踩坑）

| 平台 | 理由 |
|------|------|
| Firebase | 超過免費額度後費用難預估，且 lock-in 深 |
| AWS Free Tier | 12 個月後會突然爆金額；學習曲線陡 |
| Heroku | 已無免費方案 |
| Zapier | 免費 100 tasks/月很快用完；改用 n8n 自架 |
| MongoDB Atlas | 若不需要 document DB，Supabase Postgres 更適合 |

## 啟用順序建議

**今晚睡前不用動**——這份清單是給你早上起來照做用。

**明天早上**（依序）：
1. ☐ 先 Supabase 建 project（P0 #2，關鍵路徑）
2. ☐ 再 Google AI Studio 拿 Gemini API key（免費、最關鍵）
3. ☐ 再 Vercel 連 GitHub repo（P1 #5）
4. ☐ 再 Resend + Tally（P1 #6, #7）

**這週內**：
5. ☐ Cloudflare 接管網域（如果有域名）
6. ☐ PostHog 裝追蹤
7. ☐ Stripe 開立帳號（審核要幾天）

## 補充：Manus 定位

Manus 是 AI 代理平台（類似 Claude Code）。它在此架構中的角色與 Claude Code 相同——**開發/部署代理**，透過 git 讀寫 repo。若要並行使用，建議：

- Manus 處理**內容生成類**任務（GEO 文案、社群貼文）→ 寫入 `docs/drafts/` 後開 PR
- Claude Code 處理**系統層**任務（schema migration、workflow debug）
- 以 PR 分隔責任，避免撞車
