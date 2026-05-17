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

## 待辦:Notion 同步(下個 sprint)

**問題**:Vercel Hobby 方案最多 2 個 cron,目前已用完(daily fetch + weekly digest)。

**解法 3 選 1**:

### A. 升級 Vercel Pro(USD 20/月)
然後新增第 3 個 cron `/api/cron/notion-news-sync`,每日跑一次,把 `news_items WHERE notion_synced_at IS NULL` 寫進 Notion 資料庫。

### B. 內嵌進 fetch-news(零成本,推薦)
在 `app/api/cron/fetch-news/route.ts` 的 INSERT 成功後,立刻呼叫 Composio Notion `create_page` action,把新 item 同步進指定 Notion DB。失敗不影響主流程(graceful degrade)。

**實作步驟**(B 方案,~1 小時):
1. 在 Notion 建 "Symcio Newsletter Archive" 資料庫,欄位:標題(title)、URL、分類、發布日期、摘要、BCI 視角、SDG、Source
2. 複製該資料庫 ID(URL 後段 hex)
3. Vercel 新增 env `NOTION_NEWS_ARCHIVE_DB_ID`
4. 寫 `lib/news/notion-sync.ts`:
   ```ts
   import { executeAction } from "@/lib/agent/composio";
   export async function syncToNotion(item: NewsItem): Promise<void> {
     const dbId = process.env.NOTION_NEWS_ARCHIVE_DB_ID;
     if (!dbId) return; // graceful
     await executeAction("notion_create_page", {
       parent: { database_id: dbId },
       properties: { /* map fields */ },
     });
   }
   ```
5. 在 fetch-news 的 INSERT 成功後 `void syncToNotion(item).catch(() => {})`

### C. GitHub Actions cron(零成本)
在 `.github/workflows/notion-news-sync.yml` 新增每日 workflow,呼叫 supabase REST API 撈未同步的 news_items,經 Composio 寫進 Notion。和 Vercel cron 解耦。

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
