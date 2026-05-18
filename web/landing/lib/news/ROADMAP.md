# /news 自動化管線 — ROADMAP

> Status as of 2026-05-18:架構完整(每日 cron + 週一 cron + 訂閱 + 寄信),Issue #1 seed 上線,等候 Vercel env vars 啟動完整自動化。

---

## 三層管線(Daily / Weekly / Subscribe)

```
┌────────────────────────────────────────────────────────────┐
│ DAILY 09:00 (UTC+8) · /api/cron/fetch-news                 │
│  RSS 8 來源 → Claude 摘要 + BCI 視角 → news_items INSERT   │
│  → Discord webhook(可選)                                  │
│  → /news 即時可見                                          │
└────────────────────────────────────────────────────────────┘
           ↓ (一週累積 ~50 則)
┌────────────────────────────────────────────────────────────┐
│ MONDAY 09:00 (UTC+8) · /api/cron/weekly-digest             │
│  Query 7 天 news_items → 整理成週報文章                    │
│  → 寫進 news_items(category='weekly-digest',slug=digest-XX)│
│  → Query newsletter_subscribers WHERE status='active'      │
│  → Resend 寄信(每人單獨一封,記 newsletter_deliveries)    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ SUBSCRIBE · POST /api/newsletter/subscribe                 │
│  訪客在 /news 頁面 NewsletterSubscribe 元件填 email        │
│  → upsert newsletter_subscribers (status='active')         │
│  → fire-and-forget 寄歡迎信                                │
└────────────────────────────────────────────────────────────┘
```

## 檔案清單

| 檔案 | 用途 |
|---|---|
| `vercel.json` | 2 個 cron 排程 |
| `lib/news/sources.ts` | 8 個 RSS 來源(UN-SDG / TNFD / GRI / IFRS / CDP / Reuters...) |
| `lib/news/rss.ts` | RSS 抓取 + 解析 + dedupe |
| `lib/news/claude.ts` | Claude API 摘要 + BCI 視角 |
| `lib/news/discord.ts` | Discord webhook 推播 |
| `lib/news/seed.ts` | Issue #1 fallback 內容(5 篇) |
| `app/api/cron/fetch-news/route.ts` | 每日 cron 端點 |
| `app/api/cron/weekly-digest/route.ts` | 每週一 cron 端點 |
| `app/api/newsletter/subscribe/route.ts` | 訂閱 endpoint |
| `app/news/page.tsx` | /news 列表頁(seed fallback + subscribe form) |
| `app/news/[slug]/page.tsx` | /news 詳情頁 |
| `components/NewsletterSubscribe.tsx` | 訂閱表單元件 |
| `supabase/migrations/20260422000002_news_items.sql` | news_items 表 |
| `supabase/migrations/20260518000000_newsletter.sql` | newsletter_subscribers + newsletter_deliveries 表 |

## 啟動自動化:Vercel env vars

打開 Vercel Dashboard → symcio-landing → Settings → Environment Variables,新增:

| Env var | 用途 | 取得方式 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API 摘要 + BCI 視角 | https://console.anthropic.com → API Keys |
| `SUPABASE_URL` | Supabase 連線 | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 服務端寫入 news_items / subscribers | Supabase Dashboard → Settings → API → service_role(切勿放前端!) |
| `CRON_SECRET` | 手動測試 cron 用 | 自行 random:`openssl rand -hex 32` |
| `RESEND_API_KEY` | 訂閱者寄信 | https://resend.com → API Keys |
| `NEWSLETTER_FROM` | 寄件人 email | 你 Resend 已驗證的 domain,如 `newsletter@symcio.tw` |
| `DISCORD_NEWS_WEBHOOK_URL` | Discord 推播(可選) | Discord channel → Edit → Integrations → Webhooks |

設完後跑 migration:
```bash
# 在你的 BrandOS-Infrastructure repo 根目錄
supabase db push
# 或在 Supabase Dashboard → SQL Editor 貼 20260518000000_newsletter.sql 內容執行
```

立即測試 daily cron:
```bash
curl "https://www.symcio.tw/api/cron/fetch-news?secret=<CRON_SECRET>"
# 預期回傳 JSON 含 entries_new / inserted / total_tokens_in 等
```

立即測試 weekly digest:
```bash
curl "https://www.symcio.tw/api/cron/weekly-digest?secret=<CRON_SECRET>"
# 預期回傳 JSON 含 items_in_window / digest_inserted / emails_sent 等
```

---

## Notion 同步(✅ 已實作 2026-05-18)

**Notion 資料庫**:「Symcio Newsletter Archive」
- URL: https://www.notion.so/f63835c3386943deab6a94f1d44e7df1
- ID: `f63835c3-3869-43de-ab6a-94f1d44e7df1`
- 父頁面:BrandOS™
- 欄位:標題、URL、分類、來源、SDG、發布日期、摘要、BCI 視角、標籤、Slug、同步時間

**同步邏輯**:`lib/news/notion-sync.ts`(直接呼叫 Notion API,不依賴 Composio)
- 在 `/api/cron/fetch-news` 每筆 news_items INSERT 成功後 fire-and-forget 呼叫
- 在 `/api/cron/weekly-digest` 週報 INSERT 成功後同步一份(分類=weekly-digest)
- 沒設 env vars → no-op,不影響 cron 主流程

**啟用 Notion 同步**(一次性 setup):
1. 前往 https://www.notion.so/my-integrations → 新建 Internal Integration → 複製 token(`secret_xxx`)
2. 開啟「Symcio Newsletter Archive」資料庫 → 右上 ⋯ → **Connections** → 加入剛剛建的 integration
3. Vercel env vars:
   ```
   NOTION_TOKEN              = secret_xxx
   NOTION_NEWS_ARCHIVE_DB_ID = f63835c3-3869-43de-ab6a-94f1d44e7df1   (預設值,可省略)
   ```
4. 完成。下次 cron 跑時自動同步。

**驗證**:
```bash
curl "https://www.symcio.tw/api/cron/fetch-news?secret=<CRON_SECRET>"
# 回傳 JSON,errors 沒有 notion-sync 字串 = 同步成功
# 打開 Notion DB 應看到新頁面
```

**建議:先做 B**(零成本、最少新增的程式碼)。

---

## 編輯每週新一期(三種模式)

### 模式 1 · 完全自動化(env vars 都設好)
不需要動。週一 09:00 自動跑,你只要週一中午掃一眼 /news 確認品質。

### 模式 2 · 半自動(只設 ANTHROPIC + SUPABASE)
每日 cron 自動抓 + 摘要,/news 持續有新內容。週一 cron 自動產生週報文章,但**沒寄信**(因為 RESEND 沒設)。可手動測:`curl .../api/cron/weekly-digest?secret=...`

### 模式 3 · 全手動(pipeline 都沒設)
每週日晚上手動編 `lib/news/seed.ts`:
1. 複製上週的 5 個 item 結構
2. 改 slug / title / summary / bci_perspective / tags / source / published_at
3. 更新 `ISSUE_WEEK` 常數
4. commit + push,Vercel 自動部署

每期約 60–90 分鐘(用 Claude 輔助寫 BCI 視角可降到 30 分鐘)。

---

## 社群 Fanout(✅ 已實作 2026-05-18)

**架構**:不新增 Vercel cron(已用滿 2 個),fanout 內嵌於 `/api/cron/weekly-digest` 末段。

**支援平台**:

| 平台 | 模式 | env 需求 | 成本 |
|---|---|---|---|
| Discord | 即時 per-item(已存在於 fetch-news) | `DISCORD_NEWS_WEBHOOK_URL` | 免費 |
| Telegram channel | 每週一週報自動 post | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHANNEL_ID` | 免費 |
| LinkedIn(草稿信) | 每週一寄草稿到你信箱,手動 copy-paste | `LINKEDIN_DRAFT_RECIPIENT` | 免費 |

**啟用 Telegram**:
1. 在 Telegram 跟 `@BotFather` 對話 → `/newbot` → 拿 token
2. 開一個 public channel(例如 `@symcio_esg`)
3. 把 bot 加入 channel 並設為 Admin(post messages 權限)
4. Vercel env:
   ```
   TELEGRAM_BOT_TOKEN     = 123456:ABC-DEF...
   TELEGRAM_CHANNEL_ID    = @symcio_esg
   ```

**啟用 LinkedIn 草稿信**:
```
LINKEDIN_DRAFT_RECIPIENT = sall@symcio.tw
```
週一 cron 跑完會寄一封 [LinkedIn Draft] 給你,內含 copy-paste-ready 貼文。

**檔案**:
- `lib/social/audience-prompts.ts` — 各平台 tone/length/hashtag 規則 + 渲染函數
- `lib/social/telegram.ts` — Bot API 直接呼叫
- `lib/social/linkedin-draft.ts` — Resend 寄信
- `app/api/cron/weekly-digest/route.ts` 末段 — fanout 整合

## Web3 社群平台(下個 sprint 候選)

依優先序:

| 平台 | 為什麼適合 Symcio | 整合方式 | 估時 |
|---|---|---|---|
| **Farcaster (Warpcast)** | Web3 最活躍社群,可發 Frame 互動內容(訪客在 Frame 內訂閱 /news) | Neynar API 免費 tier | 半天 |
| **Mirror.xyz** | Web3 thought leadership,文章可 mint NFT(L3 會員制 collectible) | OAuth + 寫合約呼叫 | 1 天 |
| **Telegram channel** | 橋接 Web3 + ESG 投資人,亞洲/中東強 | 已實作(見上) | 0 |
| **(可選) Paragraph.xyz** | Web3 原生 newsletter,token-gated 訂閱對接 L3 | 跟 Mirror 類似 | 1 天 |

建議啟動順序:
1. **先設 Telegram + LinkedIn(已就緒)** — 0 成本,啟動 0 開發
2. **Farcaster 第一個 Web3 整合**(因為比 Mirror 簡單,API 免費 + 活躍度最高)
3. **Mirror.xyz** 用 weekly-digest 同步 mint 文章 NFT,作為 L3 會員專屬 collectible

## L2 · Compliance Pre-Audit(下下個 Sprint)

> 你的 MCP 設計 L2 名單捕獲層

**功能規格**:
- 路由:`/tools/compliance-audit`
- 輸入:公司名 + 品類 + 主要市場 + Email
- 後端:Claude API → 依品類 × 市場輸出 1 頁 EPR/DPP/CSRD/ISSB 曝險評估
- 輸出:即時顯示 + PDF 寄到 Email + lead 寫入 leads 表
- Lead capture:email + 公司 + 角色

**估算:1 個工作天**

**MVP 路徑**:
1. 用最簡 form 接 6 個欄位
2. Claude 1 個 prompt,輸出純文字 markdown
3. Markdown → 簡單 HTML PDF
4. 寫進 leads 表 + Notion CRM(透過已有 Composio cron)

## L3 · Symcio Policy Node Membership(下下下個 Sprint)

> 你的 MCP 設計 L3 付費鎖定層 · NTD 50k/季/品牌

**功能規格**:
- 路由:`/membership` 介紹頁
- 訂閱:Stripe `pro_policy_quarterly` price_id
- 交付:季度封閉式法規工作坊 + 月 1 通 1-on-1 + 月 1 份政策備忘錄
- Member portal:`/dashboard/policy-node`(auth-gated)

**估算:1 個工作天**

**MVP 路徑**:
1. 純介紹頁 + Contact Sales(不用 self-serve)
2. 第 1 個簽約後再做 self-serve checkout

---

## 風險與注意事項

1. **法律保守化**:BCI 視角避免「保證」、「必然」等詞,維持「觀察」、「Symcio 看到的趨勢」框架(已在 SYSTEM_PROMPT 體現)
2. **AI 摘要可能不準確**:第 1–2 個月人工每週一中午掃一次,有錯就改 seed 覆寫
3. **RSS 來源失效**:每個 source 有 `enabled` flag,壞掉可手動關
4. **Email 寄送量**:Resend 免費額度 100 封/天 + 3,000 封/月。超過要升級
5. **Vercel cron 上限**:Hobby 方案 2 個,已用滿 — 加新 cron 需升 Pro 或改 GitHub Actions
6. **歡迎信 + 週報寄信**:都需要 Resend domain 驗證,別忘了到 resend.com → Domains 加 symcio.tw 並加 DKIM/SPF DNS

---

## Issue 排程

| 期 | 日期 | 來源 |
|---|---|---|
| **Issue #01** ✅ | 2026-05-18 | 編輯團隊精選 seed |
| Issue #02 | 2026-05-25 | cron 接手(若 env vars 設好)/ 手動更新 seed |
| Issue #03 | 2026-06-01 | |
| ... | | |

啟用 cron 後,Issue #02 起完全自動。
