# 每日 ESG × SDG 新聞自動化管線 · 設定文件

> 相關檔案：
> - `supabase/migrations/20260422000002_news_items.sql`
> - `web/landing/lib/news/{sources,rss,claude,discord}.ts`
> - `web/landing/app/api/cron/fetch-news/route.ts`
> - `web/landing/app/news/page.tsx` + `app/news/[slug]/page.tsx`
> - `web/landing/vercel.json` — cron schedule

## 管線概觀

```
Vercel Cron（每日 09:00 TPE）
    ↓
/api/cron/fetch-news
    ↓
┌──────────────────────┐
│ for each RSS source  │
│  fetchRss() → entries │
└────────┬─────────────┘
         ↓ (each entry)
  dedupe against news_items.source_url (last 14 days)
         ↓
  summarizeNews() → Claude Opus 4.7 + output_config.format JSON schema
         ↓
  INSERT news_items (status='published')
         ↓
  postToDiscord() → Discord webhook
         ↓
  update news_items.published_to = ['website', 'discord']
```

## 一、Supabase migration

```bash
supabase db push
# 或 SQL Editor 貼：supabase/migrations/20260422000002_news_items.sql
```

建立的東西：
- `news_items` 表（時序、RLS 公開讀 status='published'）
- `idx_news_published` / `idx_news_sdg` / `idx_news_source_url` 索引
- `updated_at` trigger

## 二、Claude API 設定

1. 到 https://console.anthropic.com 建立 API key
2. Vercel → Settings → Environment Variables 加：

```
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-opus-4-7   # 選配，預設就是這個；省錢可改 claude-haiku-4-5-20251001
```

### 成本估算（每日 cron）

- 每次 cron 讀 8 個 RSS 來源 × 最多 5 則/來源 = **最多 40 items**
- 每則：系統提示 ~4K token（cached 後 ~$0.0005/次）+ 使用者 ~1K token + 輸出 ~400 token
- Claude Opus 4.7 定價：input $5/M、output $25/M、cache read $0.5/M
- **首次：** 40 × (5K × $5/M + 400 × $25/M) ≈ **$1.40/天**
- **cache 熱後（所有後續）：** 40 × (1K × $5/M + 4K × $0.5/M + 400 × $25/M) ≈ **$0.68/天**
- 月：**~$20/月**

若成本要更低：`ANTHROPIC_MODEL=claude-haiku-4-5-20251001`（降 5 倍，月 <$5）

## 三、Discord webhook

1. Discord server → 你想發新聞的頻道（例如 `#news`）
2. 頻道設定 → Integrations → Webhooks → New Webhook
3. 命名「Symcio News Bot」，複製 Webhook URL
4. Vercel env：

```
DISCORD_NEWS_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<token>
```

## 四、Cron secret（保護 endpoint）

Vercel 的 Cron 平台會自動帶 `x-vercel-cron: 1` header，所以**正式 cron 不需要** secret。但手動測試 / 外部呼叫需要：

```
CRON_SECRET=<random 32-char string>
```

產生：`openssl rand -base64 32`

## 五、Vercel cron schedule

已寫進 `web/landing/vercel.json`：

```json
"crons": [
  {
    "path": "/api/cron/fetch-news",
    "schedule": "0 1 * * *"
  }
]
```

`0 1 * * *` = 每日 UTC 01:00 = **台北 09:00**。

**Vercel Pro 方案才有 cron。**Hobby 方案沒有 cron — 可以用外部 cron（cron-job.org、EasyCron）打 `/api/cron/fetch-news?secret=...`。

## 六、手動測試

```bash
# 用 secret
curl https://symcio.tw/api/cron/fetch-news?secret=$CRON_SECRET

# 或在 headers
curl -H "authorization: Bearer $CRON_SECRET" \
  https://symcio.tw/api/cron/fetch-news
```

預期回應：
```json
{
  "ok": true,
  "stats": {
    "sources_tried": 8,
    "entries_seen": 120,
    "entries_new": 15,
    "summarized": 15,
    "inserted": 15,
    "posted_to_discord": 15,
    "cache_hits": 14,
    "total_tokens_in": 62000,
    "total_tokens_out": 6300,
    "errors": []
  }
}
```

## 七、加新聞來源

編輯 `web/landing/lib/news/sources.ts`：

```ts
{
  id: "your-id",                // 英數字，檔案/URL/slug 用
  label: "可讀名稱",
  url: "https://example.com/feed.rss",
  category: "esg" | "sdg" | "tnfd" | "brand-valuation" | "climate",
  sdg_number: 13,               // 選配
  language: "en",
  max_items_per_run: 5,
  enabled: true,
},
```

Commit + push → Vercel 自動 redeploy → 下次 cron 就會包進去。

## 八、查看結果

- 網站：https://symcio.tw/news
- SDG1 過濾：https://symcio.tw/news?sdg=1
- TNFD 過濾：https://symcio.tw/news?category=tnfd
- Discord：#news 頻道（你剛剛設的 webhook 對應）

## 九、關閉某個來源 / 移除新聞

```sql
-- 下架一則
UPDATE news_items SET status='suppressed' WHERE slug='...';

-- 暫停某個來源（改 sources.ts 的 enabled:false，redeploy）
```

## 十、除錯

### 「Vercel cron 沒跑」
- 檢查 Vercel → Project → Deployments → 最新 production deployment → Crons 分頁
- 若顯示「No cron jobs」：Hobby 方案不支援，升級 Pro 或用外部 cron
- 若顯示有但沒執行：看 deployment logs

### 「news_items 空的」
- 手動 curl `/api/cron/fetch-news?secret=...`，看回應的 `stats.errors`
- RSS 404 → feed URL 改了，更新 sources.ts
- Claude 400 → ANTHROPIC_API_KEY 錯、超過用量、或 model 名稱錯

### 「Discord 沒收到」
- 檢查 `DISCORD_NEWS_WEBHOOK_URL` env 有設、redeploy
- webhook URL 被刪：Discord 頻道 → Integrations → 重建

### 「一直夾重複的新聞」
- `news_items.source_url` 是 unique 鍵，但 dedupe 只看最近 14 天
- 若新聞被人工移除但 URL 還在，下次 cron 會認為已見過不重發
- 要強制重抓：`DELETE FROM news_items WHERE source_url = '...'`

## 十一、停用整個管線

兩種方式：

1. **暫停 Vercel cron**（保留 code）：編輯 `vercel.json` 移除 `crons` 陣列、redeploy
2. **移除 code**：`git rm` 相關檔案；`news_items` 表可保留或 drop

## 十二、法律 / 來源授權

所有來源 RSS 都是**該機構主動提供的公開 feed**，本管線：
- 不抓原文全文（只用 `description` 摘要欄位送 Claude）
- 產出的內容是 Symcio 自己的摘要 + 評論（合理使用）
- 每篇都保留 `source_url` 和 `source_title` 原文連結
- Discord embed + 網站都顯著標示來源 + 原文連結

若要新增付費 / 受限來源，需先取得授權。
