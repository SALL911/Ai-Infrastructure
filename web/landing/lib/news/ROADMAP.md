# /news 自動化管線 — ROADMAP

> Status as of 2026-05-18:Issue #1 已上線,seed fallback 啟用,每週一 09:00 (UTC+8) 排程設定完成,等候 Vercel env vars 啟動自動化。

---

## 目前狀態(L1 部分達成)

| 層次 | 狀態 | 說明 |
|---|---|---|
| RSS 抓取 (`lib/news/rss.ts`) | ✅ 程式碼完成 | 8 個來源:UN-SDG / IISD / TNFD / GRI / IFRS / CDP / Reuters 等 |
| Claude 摘要 (`lib/news/claude.ts`) | ✅ 程式碼完成 | SYSTEM_PROMPT 已寫好 BCI F·V·E 解讀方法論 |
| Supabase 入庫 (`news_items` 表) | ✅ Migration 完成 | `20260422000002_news_items.sql` |
| Discord 推播 (`lib/news/discord.ts`) | ✅ 程式碼完成 | Webhook URL 待設 |
| Vercel Cron (`vercel.json`) | ✅ 每週一 09:00 (UTC+8) | `0 1 * * 1` |
| `/news` 頁面 | ✅ Light theme + seed fallback | Supabase 空時 fallback 到 `lib/news/seed.ts` |
| `/news/[slug]` 詳情頁 | ✅ Light theme + seed fallback | 同上 |
| Issue #1 內容 | ✅ 5 篇精選(`lib/news/seed.ts`) | EU ESPR DPP / CSRD W2 / TNFD APAC / IFRS S2 / 金管會 2027 |

## 啟動自動化:Vercel env vars 待設

打開 Vercel Dashboard → symcio-landing → Settings → Environment Variables,新增:

| Env var | 用途 | 取得方式 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API 摘要 + BCI 視角 | https://console.anthropic.com → API Keys → Create Key |
| `SUPABASE_SERVICE_ROLE_KEY` | 服務端寫入 `news_items` | Supabase Dashboard → Project Settings → API → service_role secret(切勿放前端!) |
| `SUPABASE_URL` | Supabase 連線 | Supabase Dashboard → Project Settings → API → Project URL |
| `CRON_SECRET` | 手動觸發 `/api/cron/fetch-news?secret=...`(備援用) | 自行 random,如 `openssl rand -hex 32` |
| `DISCORD_NEWS_WEBHOOK_URL` | 推播至 #news 頻道(可選) | Discord channel → Edit Channel → Integrations → Webhooks |

設完後,週一 09:00 (UTC+8) 自動跑。要立即測試:

```bash
curl "https://www.symcio.tw/api/cron/fetch-news?secret=<CRON_SECRET>"
```

成功時回傳 JSON 含 `entries_new`, `inserted` 等統計。

## 切換完成判斷

當 Supabase `news_items` 有新資料(`created_at` 比 seed 還新),seed 自動隱形,不需要手動清除。

如果想保留 seed 作為「精選封面」永遠置頂,在 `app/news/page.tsx` 改成「先撈 seed,再合併 Supabase」即可(目前是「Supabase 空才用 seed」)。

---

## 編輯每週新一期(Pipeline 啟用前)

在 cron 啟用前,**每週日晚上手動更新 `lib/news/seed.ts`** 即可:

1. 複製上週的 5 個 item 結構
2. 改 slug、title_zh、summary_zh、bci_perspective、tags、source、source_url、published_at
3. 更新 `ISSUE_WEEK` 常數
4. commit + push,Vercel 自動部署

每期約 60–90 分鐘(若用 Claude 輔助寫 BCI 視角,可縮短到 30 分鐘)。

## 編輯每週新一期(Pipeline 啟用後)

完全不需要手動。週一 09:00 (UTC+8) Vercel 自動觸發,你只需:
- (可選)週一中午掃一眼 /news 確認品質
- (可選)若有特別重要的新聞或想補 BCI 觀點,在 Notion 編輯欄補一篇,push 進 seed.ts(會跟自動內容並存)

---

## L2 · Compliance Pre-Audit(下一個 Sprint)

> 你的 MCP 設計:零成本閉環 L2 名單捕獲層

**功能規格**:
- 路由:`/tools/compliance-audit`
- 輸入:公司名 + 品類(下拉)+ 主要市場(EU / US / APAC)+ Email
- 後端:Claude API → 依品類 × 市場輸出 1 頁 EPR/DPP/CSRD/ISSB 曝險評估
- 輸出:即時顯示 + PDF 寄到 Email + lead 寫入 Supabase `leads` 表(已存在)
- Lead capture:email + 公司 + 角色(CMO / 永續長 / IR / Other)

**工程估算**:
- 新表單組件:2 小時
- Claude prompt 設計(知識庫:EU ESPR / CSRD / ISSB / DPP):4 小時
- PDF 渲染(`@react-pdf/renderer` 或 html2pdf,沿用 AuditReport 模式):2 小時
- 寄信:已有 `lib/email/resend.ts`,1 小時整合
- `leads` 表 INSERT + Composio sync(已有 cron):0 小時
- **Total:約 1 個工作天**

**MVP 路徑**:
1. 用最簡 form 接 6 個欄位
2. Claude 1 個 prompt,輸出純文字 markdown
3. Markdown → 簡單 HTML PDF
4. 寫進 Supabase leads + Notion CRM(透過已有 Composio cron)

## L3 · Symcio Policy Node Membership(下下個 Sprint)

> 你的 MCP 設計:NTD 50k/季/品牌 · Y1 目標 10 家(NTD 200 萬)

**功能規格**:
- 路由:`/membership` 介紹頁 + `/membership/checkout`
- 訂閱層級:政策節點會員 NTD 50,000 / 季
- 交付項目:
  - 季度封閉式法規工作坊(會員 + 1 同事)
  - 每月 1 通 30 分鐘 1-on-1 法規情報電話
  - 每月一份政策應變備忘錄(專屬會員 portal)
- 後端:Stripe subscription(已有 `/api/checkout?mode=subscription` 模式)+ 新增 `pro_policy_quarterly` price_id
- Member portal:`/dashboard/policy-node`(auth-gated,沿用現有 middleware)
- 備忘錄交付:每月最後一週寄信 + 上傳 Supabase `policy_briefs` 表(新表)

**工程估算**:
- 介紹頁:2 小時
- Stripe price_id 設定:0.5 小時
- Member portal 頁面 + access control:4 小時
- `policy_briefs` schema migration:1 小時
- 寄信流程:1 小時
- **Total:約 1 個工作天**

**MVP 路徑**:
1. 純介紹頁 + Contact Sales(不用 Stripe 自助)
2. 拿到第 1 個簽約後再做 self-serve

---

## 風險與注意事項

1. **法律保守化**:每期 5 篇新聞的 BCI 視角避免「保證」、「必然」等詞,維持「觀察」、「Symcio 看到的趨勢」框架(已在 SYSTEM_PROMPT 體現)
2. **AI 摘要可能不準確**:Claude 出來的摘要會偶爾誇大、漏關鍵字。Pipeline 啟用後第 1–2 個月人工每週週一中午掃一次,有錯就改 seed 覆寫
3. **RSS 來源失效**:`lib/news/sources.ts` 每個 source 有 `enabled` flag,壞掉的可手動關
4. **Email 寄送量級**:若 L2/L3 啟用,寄信量會增加 — Resend 免費額度 100 封/天,超過要升級(USD 20/月起)

---

## Issue #1 ~ 後續路徑

| 期 | 日期 | 主題建議(每期 5 篇) |
|---|---|---|
| **Issue #01** ✅ | 2026-05-18 | EU ESPR DPP / CSRD W2 / TNFD APAC / IFRS S2 / 金管會 2027 |
| Issue #02 | 2026-05-25 | (cron 接手 OR 手動更新 seed) |
| Issue #03 | 2026-06-01 | |
| Issue #04 | 2026-06-08 | |

啟用 cron 後,Issue #02 起自動產生。
