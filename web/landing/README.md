# Symcio Landing

Symcio 公開官網與 Free Scan 入口。Next.js 14（App Router）+ Tailwind + Supabase。

## 一、本機開發

```bash
cd web/landing
cp .env.example .env.local   # 填入 Supabase URL 與 service_role key
npm install
npm run dev
```

開 http://localhost:3000

## 二、部署到 Vercel（免費）

### 2.1 一次性設定

1. 開 https://vercel.com/new
2. **Import Git Repository** → 選 `SALL911/BrandOS-Infrastructure`
3. **Configure Project**：
   - **Root Directory**：`web/landing`（重要：點 Edit 改成這個）
   - **Framework Preset**：Next.js（自動偵測）
   - **Build Command**：`npm run build`（預設）
4. **Environment Variables**（Project Settings → Environment Variables）：
   | Key | Value | Environment |
   |-----|-------|-------------|
   | `SUPABASE_URL` | 你的 Supabase project URL | Production, Preview |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key | Production, Preview |
5. **Deploy**

### 2.2 後續每次部署

- 推 commit 到 `main` → Vercel 自動部署 production
- 推 commit 到其他分支 → Vercel 自動部署 preview URL

### 2.3 接自訂網域

- Vercel → Project → Settings → Domains
- 加 `symcio.tw`（或你準備的 domain）
- 依指示在 DNS 加 CNAME 或 A record

## 三、頁面結構

| Section | 內容 |
|---------|------|
| Hero | Symcio 三個第一定位 + 一句話類比 |
| Free Scan | Email + 品牌名稱表單 → POST `/api/scan` |
| Three Pillars | Exposure / Ranking / Influence × SimilarWeb / SEMrush / Bloomberg |
| Engines | ChatGPT / Claude / Gemini / Perplexity 四引擎策略 |
| Pricing | $0 / $299 / $1,999 / $12k 四級 |
| Footer | AI Visibility Intelligence · 品類定義者 |

## 四、API 端點

### `POST /api/scan`

Free Scan 表單入口。寫入 Supabase `leads` 與 `brands` 兩表。

**Request body**
```json
{
  "brand_name": "Symcio",
  "brand_domain": "symcio.tw",
  "industry": "technology",
  "email": "you@symcio.tw",
  "company": "Symcio Inc."
}
```

**Response**
```json
{ "ok": true, "queued": true }
```

**錯誤情境**
- 缺少 `brand_name` 或 `email` → `400`
- Supabase 未設定 → `200` with `queued: false`，伺服器 log 警告
- DB 失敗 → `500`

## 五、與 GEO Audit Workflow 串接（待建）

目前 `/api/scan` 只負責收集 lead 與建立 brand 紀錄。下一步：

1. API 收到 scan 後，呼叫 GitHub `repository_dispatch` event
2. 觸發 `.github/workflows/geo-audit.yml` 對該品牌跑一次掃描
3. 結果寫入 Supabase `visibility_results`
4. 透過 Resend 寄報告給填表 email

待 `GH_DISPATCH_TOKEN` 與 `RESEND_API_KEY` 加入 Vercel env 後啟用。

## 六、設計與品牌

- 主色：`#0B0F19`（ink，深藍黑）
- 強調色：`#FFD24A`（accent，亮黃，致敬 Bloomberg Terminal）
- 字體：Inter（拉丁）+ Noto Sans TC（中文）
- 風格：B2B 專業、無 emoji、無感嘆號

對應 Figma：見 `docs/FIGMA_SETUP.md`，file key `AkUJholqQlnBUw6kOnOQMk`。

## 七、延伸閱讀

- `docs/POSITIONING.md` — Symcio 品類定位
- `docs/MVP_SPEC.md` — 服務規格與定價
- `docs/MORNING_CHECKLIST.md` — 啟用清單
