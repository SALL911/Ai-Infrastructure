# Symcio BrandOS · Landing & Product App

**Symcio BrandOS 官方網站 + 會員系統 + Brand AI Audit MVP。** Next.js 14 App Router + Tailwind + Supabase Auth + Chart.js + Stripe + Resend。

---

## 🚀 快速開始

```bash
cd web/landing
cp .env.example .env.local   # 至少填 4 個 Supabase keys
npm install
npm run dev
# 打開 http://localhost:3000
```

---

## 📋 頁面地圖

| Path | 內容 | Component |
|------|------|-----------|
| `/` | 首頁 · 4 板塊 + BCI 公式 + 6 模組 + 社群 + 電子報 | `app/page.tsx` |
| `/audit` | Brand AI Audit · 10 欄 2-step + 動畫 + 報告 + PDF | `app/audit/page.tsx` + `AuditForm` + `AuditReport` |
| `/pricing` | 三級方案 + FAQPage Schema | `app/pricing/page.tsx` |
| `/faq/[category]` | 動態 FAQ · 5 個受眾 × 10 Q&A | `app/faq/[category]/page.tsx` + `lib/faq-data.ts` |
| `/tools` | 工具索引 | `app/tools/page.tsx` |
| `/tools/brand-check` | Typeform 健檢 | `app/tools/brand-check/page.tsx` |
| `/tools/entity-builder` | GEO 實體建置器 | `app/tools/entity-builder/page.tsx` |
| `/schema-generator` | Schema.org + Wikidata 產生器 | `app/schema-generator/page.tsx` |
| `/about` | 關於 · 三個第一 · BCI 方法論 + Typeform | `app/about/page.tsx` |

### 登入 / 註冊

| Path | 內容 |
|------|------|
| `/login` | Email + Google OAuth |
| `/signup` | Email + Google OAuth |
| `/forgot-password` | Reset 密碼連結寄送 |
| `/reset-password` | 輸入新密碼 |
| `/auth/callback` | OAuth 交換 code |
| `/auth/logout` | 登出（GET/POST）|

### 會員 Dashboard（middleware-gated）

| Path | 內容 |
|------|------|
| `/dashboard` | Overview · 統計 + 最近 5 筆 + 快速操作 |
| `/dashboard/history` | 完整 BCI 歷史表格 |
| `/dashboard/settings` | 帳號資訊 |

### 付款

| Path | 內容 |
|------|------|
| `/checkout/success` | 付款成功 |
| `/checkout/cancel` | 取消 |

### API Routes

| Path | 功能 |
|------|------|
| `POST /api/scan` | Free Scan lead capture |
| `POST /api/checkout` | Stripe checkout session |
| `GET /api/bci/[brand]` | 公開 BCI 分數（只回 total）|
| `POST /api/agent` | AI agent（Vercel AI SDK）|
| `POST /api/schema` | Schema 產生器 |
| `POST /api/webhooks/stripe` | Stripe webhook（HMAC 驗簽）|
| `POST /api/webhooks/typeform` | Typeform webhook（HMAC 驗簽）|

---

## 🧪 測試

```bash
npm run type-check   # tsc --noEmit
npm run lint         # next lint
npm run build        # production build
```

最近確認狀態：**26 routes，build 綠，middleware 56 kB**。

---

## 🎨 設計系統

色彩、字型、間距、元件模式見 `docs/DESIGN_SYSTEM.md`（repo root 的 `/docs`）。

關鍵 tokens：
- `ink #0a0a0a` 主背景 · `accent #c8f55a` 品牌色
- `excellent #2dd4a0` / `good #378ADD` / `warning #fbbf24` / `danger #f87171`（BCI tier）
- Inter + DM Mono via Google Fonts
- Tailwind config：`tailwind.config.ts`

---

## 🔐 環境變數

完整清單見 `.env.example`。最小可跑：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

選配（功能才會動）：`STRIPE_*`、`RESEND_API_KEY`、`TYPEFORM_WEBHOOK_SECRET`、
`GH_DISPATCH_TOKEN`、`GEMINI_API_KEY` 等。

---

## 🚢 部署到 Vercel

1. https://vercel.com/new → Import `SALL911/BrandOS-Infrastructure`
2. **Root Directory** = `web/landing`（必改）
3. Framework preset：Next.js（自動）
4. Environment Variables：見 `.env.example`
5. Deploy

之後每次 push 自動 deploy（`main` → production；其他 branch → preview）。

完整步驟：`docs/WAKE_UP_CHECKLIST.md`。

---

## 🌐 接 symcio.tw

Vercel → Settings → Domains → Add `symcio.tw` + `www.symcio.tw`

Cloudflare DNS（**Proxy 關閉**，灰色雲）：
```
A     @      76.76.21.21            DNS only
CNAME www    cname.vercel-dns.com   DNS only
```

---

## 📚 延伸文件

- `docs/PRODUCT_OVERVIEW.md` — 完整產品地圖（6 層 × 所有檔案）
- `docs/DESIGN_SYSTEM.md` — 設計令牌與元件模式
- `docs/WAKE_UP_CHECKLIST.md` — 從 0 到上線的步驟
- `docs/SUPABASE_AUTH_SETUP.md` — Google OAuth 設定
- `docs/BCI_METHODOLOGY.md` — BCI 公式與產業權重
- `docs/STRIPE_SETUP.md` — 金流
- `docs/DOMAIN_DEPLOY.md` — 域名
- `docs/TYPEFORM_SETUP.md` — Free Scan pipeline

---

## 🧩 技術棧

| 層 | 工具 |
|----|------|
| Framework | Next.js 14.2 App Router + React 18 + TypeScript 5 strict |
| Styling | Tailwind 3.4 |
| Charts | Chart.js 4.5 + react-chartjs-2 5.3 |
| PDF | html2pdf.js 0.10 |
| Database | Supabase Postgres 15 + RLS |
| Auth | Supabase Auth + @supabase/ssr 0.10 |
| Payments | Stripe SDK v22 |
| Email | Resend REST |
| Analytics | GA4 G-QPB9W2885C + HubSpot |

---

## 🛡️ 合規

- Bloomberg / InterBrand / Kantar / SimilarWeb / SEMrush 僅作類比座標，不宣稱合作
- BCI 權重向量屬 Symcio 核心 IP，不進 repo、不暴露 API
- 冷信流程人工 1-to-1（見 `content/cold-outreach/README.md`）
- GDPR / CAN-SPAM / 台灣個資法 原則遵守
