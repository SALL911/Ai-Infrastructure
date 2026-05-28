# Beehiiv 整合設計 — 雙軌電子報架構

> **Status**: 設計確認；RSS feed endpoint 已建（見 Phase C），其餘待實作
> **Author**: 2026-05-28 規劃 session
> **依賴**：`?dry_run=1` 預覽模式（PR #68 已 merge）、`newsletter_subscribers` 表（已建）、Notion Archive DB（已建）

---

## ⚠️ 重要：Beehiiv API 方案門檻（2026-05 查證）

| Beehiiv API | 方案門檻 | 我們能用嗎 |
|---|---|---|
| **Subscriptions API**（加/查/更新訂閱者、enroll automation） | 一般付費方案 | ✅ 能 |
| **Send API / Create Post**（程式化建 post + 寄送） | **Enterprise 限定 + Beta 需申請** | ❌ 14 天試用版不能 |

**結論**：不能用 Create Post API 程式化寄送 digest。改用 Beehiiv 原生的 **RSS-to-Email automation**——我們 expose 一個 digest RSS feed，Beehiiv 定時 poll、自動把新項目變成寄出的 post。任何付費方案都支援，且兩端解耦更乾淨。

來源：beehiiv 官方 — [Send API 說明](https://www.beehiiv.com/support/article/29286794539671-how-to-access-the-beehiiv-send-api)（Enterprise beta）、[Create Post 文件](https://developers.beehiiv.com/api-reference/posts/create)

---

## 為什麼是雙軌（Beehiiv + Resend），不是換掉

| 工具 | 漏斗位置 | 負責任務 |
|---|---|---|
| **Beehiiv** | Top of Funnel（養客／擴張） | 每週 ESG×SDG 週報廣播、SEO 部落格頁、推薦網絡（Recommendations）、推薦計畫（Referral）、開信／點擊統計、退訂法規處理 |
| **Resend** | Bottom of Funnel（系統／成交） | 訂閱歡迎信、Compliance Audit 結果寄送、Demo 預約確認、付費發票、客服 1-對-1 |

Beehiiv 的免費被動流量（其他電子報互相推薦）與 SEO post 頁是純 API 拿不到的成長飛輪；Resend 的觸發式低延遲與完全自訂 HTML 是 SaaS 平台拿不到的彈性。**互補不衝突**。

---

## 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│ SSoT = Supabase newsletter_subscribers (永遠擁有資料)             │
│         ↕ 雙向 sync (webhook + reconcile cron)                   │
│ Beehiiv subscriptions = 行銷層鏡像                                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
   訂閱表單              週一 digest             轉換漏斗
   /news 填 email      cron 跑完之後           CTA 帶去
        │                     │                     │
        ↓                     ↓                     ↓
   ① Supabase upsert     ① news_items archive   /tools/compliance-audit
   ② async push          ② Notion 同步 (既有)    (L2 已建好)
      Beehiiv            ③ 更新 /news/rss.xml       │
      Subscriptions API     (digest feed)           ↓
                            │                    Lead → Resend 寄
                            ↓                     transactional 報告
                       Beehiiv RSS automation          ↓
                       定時 poll → 自動建 post     報告底 CTA →
                       → 寄送 (或建 draft 審)      預約顧問 / 升級付費
```

---

## 4 個設計決策（已拍板）

| 題目 | 決策 | 理由 |
|---|---|---|
| **訂閱者 SSoT** | Supabase（Beehiiv 當鏡像） | Beehiiv 試用結束/漲價/倒閉都能搬家；反向會被綁住 |
| **digest 怎麼進 Beehiiv** | 透過 **RSS feed**（`/news/rss.xml`），Beehiiv RSS automation poll | Send API 是 Enterprise beta，用不了；RSS 任何方案都行且解耦 |
| **digest 內容誰組** | Symcio code 組（已有 `renderDigestHtml`），feed 吐 `content:encoded` | 自動化邏輯留 repo；Beehiiv 只負責寄送＋分眾 |
| **送出前審核** | Beehiiv RSS automation 可設「自動寄」或「建 draft 等審」 | 初期設 draft 審核，穩定後切自動寄 |
| **既有訂閱者遷移** | 一次性 backfill script（Subscriptions API） | 跑一次就好，未來新訂閱者走 /subscribe 自動雙寫 |

---

## 轉換漏斗（CTA 鏈路，已存在於 repo）

```
週報信件 (Beehiiv 寄)
  └→ 點 BCI 視角連結
       └→ 落地 /news/digest-2026wXX (web archive)
            └→ 頁面 CTA「2 分鐘 AI 評估,涵蓋 ESPR/DPP/CSRD/IFRS S1S2/TNFD」
                 └→ /tools/compliance-audit (app/api/compliance-audit/route.ts)
                      └→ 拿到 lead + 評估結果
                           └→ 寄完整報告 (Resend transactional)
                                └→ 報告底 CTA → 預約顧問 / 升級付費
```

**Beehiiv 養客 → Compliance Audit 抓 intent → Resend 寄報告 → 預約成交。**

---

## 實作 Phase（總計 ~4 小時開發）

### Phase A：Beehiiv Subscriptions API wrapper（30 分）
- 新檔：`lib/email/beehiiv.ts`
- Functions（只做 Subscriptions API，不碰 Create Post）:
  - `upsertSubscription(email, attrs)` — POST /v2/publications/{id}/subscriptions
  - `removeSubscription(email)` — PATCH status=inactive
  - `getSubscription(email)` — GET by email（reconcile 用）
- Env vars: `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`
- 連線測試 endpoint：`GET /api/admin/beehiiv-ping`（dev only）
- graceful：缺 env → `{ ok:false, skipped:true }`（同 notion-sync 模式）

### Phase B：訂閱雙寫（30 分）
- 修：`app/api/newsletter/subscribe/route.ts`
- 流程：Supabase upsert 成功 → fire-and-forget `beehiiv.upsertSubscription()`
- 失敗 graceful：Beehiiv 失敗不影響使用者體驗（已寫進 Supabase 是真實已訂閱）

### Phase C：digest RSS feed ✅ 已建（`app/news/rss.xml/route.ts`）
- 輸出 slug 前綴 `digest-` 的 weekly digest 成 RSS 2.0
- `content:encoded` 帶 summary + BCI 視角，Beehiiv RSS automation 直接吃
- graceful：Supabase 沒設 / 沒 digest → 合法空 feed
- **Beehiiv 端一次性設定**（你做，非 code）：
  1. Beehiiv → Automations → 新增 RSS automation
  2. Feed URL 填 `https://www.symcio.tw/news/rss.xml`
  3. 設 poll 頻率（每週一次即可）+ 選「建 draft 等審」或「自動寄」
  4. 套用 email 模板

### Phase C2：關掉 weekly-digest 的 Resend 廣播（10 分）
- 改：`app/api/cron/weekly-digest/route.ts`
- digest 改由 Beehiiv RSS 寄，所以**移除 per-subscriber Resend loop**（避免雙重寄送）
- 保留：news_items archive、Notion sync、social fanout
- 加 env flag `DIGEST_SENDER=beehiiv|resend`，預設 beehiiv 時跳過 Resend loop（保留 fallback 彈性）

### Phase D：既有訂閱者 backfill（30 分）
- 新檔：`scripts/migrate-subscribers-to-beehiiv.mjs`
- Query `newsletter_subscribers WHERE status='active'`
- 批次 POST 到 Beehiiv（rate limit aware）
- Idempotent：重跑安全（Beehiiv 那邊 upsert）

### Phase E：Beehiiv webhook → Supabase 退訂同步（1 小時）
- 新檔：`app/api/webhooks/beehiiv/route.ts`
- 驗 Beehiiv signature（HMAC）
- 處理事件：`subscription.unsubscribed` / `subscription.bounced` / `subscription.complained`
- 對應 `newsletter_subscribers.status = 'unsubscribed' / 'bounced' / 'complained'`

### Phase F：保留 Resend 做 transactional（不用動）
- `lib/email/resend.ts` 留著
- 訂閱歡迎信、Compliance Audit 報告、Demo 預約確認繼續走 Resend

---

## 開始 Phase A 前你需要準備的東西

```
Beehiiv Dashboard → Settings → API:
  BEEHIIV_API_KEY        = (Beehiiv 給的 token)
  BEEHIIV_PUBLICATION_ID = (URL 裡那串,如 pub_xxx)

Beehiiv Dashboard → Settings → Webhooks (Phase E 需要):
  BEEHIIV_WEBHOOK_SECRET = (建 webhook 時 Beehiiv 給的 signing secret)
```

也需要把這些設進 Vercel env vars，scope 勾 Production + Preview。

---

## 不在這個整合裡（避免 scope 蔓延）

- ❌ 砍掉 Resend：保留給 transactional
- ❌ 把 /news 頁改成 iframe Beehiiv：失去 SEO + 設計掌控
- ❌ 訂閱表單改用 Beehiiv embed：失去 Supabase SSoT + UI 一致性
- ❌ 把 Notion archive 拿掉：Notion 是人類協作層，Beehiiv 是行銷層，兩者不重疊
- ❌ Beehiiv referral / recommendation 設定：那是 Beehiiv 後台操作，不需要 code

---

## 開工前 checklist

- [ ] Beehiiv 14 天試用期確認到期日（不要試用期內把所有訂閱者導過去然後沒升級）
- [ ] 拿到 `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID`
- [ ] 確認 Resend / Supabase / Anthropic env vars 已先設好（前置條件）
- [ ] 確認原本 `?dry_run=1` 已驗證可跑（PR #68 已 merge，dry-run 真實跑過一次）
- [ ] DNS：Beehiiv sender domain 驗證（若用 `newsletter@symcio.tw` 寄信，需要在 Beehiiv 加 DNS records）
