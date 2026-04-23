# UTM + 廣告 click ID 歸因追蹤

## WHY

廣告花錢如果分不出「哪支廣告帶哪種 lead」，所有 A/B 測試都是空的。本 PR 把 UTM / fbclid / gclid / referrer **落到每個 lead 的 row**，讓你從 Supabase 一查就知道：

```sql
SELECT utm_campaign, utm_content, COUNT(*) 
FROM leads 
WHERE utm_source = 'facebook' 
GROUP BY utm_campaign, utm_content
ORDER BY COUNT(*) DESC;
```

## 歸因鏈

```
FB 廣告連結（含 ?utm_source=facebook&utm_campaign=xxx&fbclid=xxx）
      │
 使用者點進 symcio.tw
      │
 lib/utm/capture.ts — 第一觸點寫 sessionStorage（此 session 內不覆寫 = first-touch）
 components/UtmCapture.tsx — 同時 posthog.people.set(...) 做 lifetime 歸因
      │
 使用者填表單
      │
 前端 submit 夾帶 attribution → POST /api/schema｜/api/scan｜/api/agent｜/api/audit-leads
      │
 後端 Zod 驗 attribution → 寫入 leads.utm_* / fbclid / gclid
```

## 策略決策

| 問題 | 決策 | 為何 |
|------|------|-----|
| First-touch vs last-touch | **first-touch** | 廣告 attribution 看的是「誰把客戶從市場拉進來」，last-touch 偏向直接品牌來源 |
| 存哪裡 | **sessionStorage** | cookie 3rd-party 被擋趨勢明顯；sessionStorage 夠用（lead 會在同 session 完成）|
| 前端或後端解析 | **前端** | 省 server call，也讓 sessionStorage 跨頁保留 |
| 後端信任前端資料？ | **部分信任** | attribution 沒安全敏感（不影響 ACL），但 Zod 驗長度上限防濫用 |

## 新增欄位（leads 表）

| 欄位 | 用途 |
|------|------|
| `utm_source` | 流量來源，例如 `facebook` / `google` / `linkedin` |
| `utm_medium` | 媒介，例如 `cpc` / `social` / `email` |
| `utm_campaign` | 行銷活動名，例如 `brandos-q2-b2b` |
| `utm_content` | 素材變體，例如 `hero-ai` / `hero-esg` — **A/B 差異鍵** |
| `utm_term` | 關鍵字（Google Ads 用） |
| `referrer` | 瀏覽器 document.referrer |
| `first_landing_url` | 使用者第一次進站的完整 URL |
| `first_touch_at` | 第一次進站時間 |
| `fbclid` | Meta/Facebook 廣告點擊 ID（跨裝置歸因）|
| `gclid` | Google Ads 點擊 ID |
| `li_fat_id` | LinkedIn 廣告點擊 ID |

## AuditForm 的大修

原本 `AuditForm.tsx` 純前端算 BCI 顯示報告，**沒寫任何 lead**——人家填完表就完全消失在你的視野。這次順便補上：

- 新路由 `POST /api/audit-leads`：接收 form + BCI 結果 + UTM
- `AuditForm.tsx` 在 `setResult(r)` 之後 `fetch(..., { keepalive: true })` 非同步打，失敗不影響 UI
- 自動 UPSERT 到 `brands` 表（`status=prospect`）→ 下班 `geo-audit-queue.yml` 會自動掃他

以前漏掉的轉換現在全抓到。

## PostHog 整合

`UtmCapture.tsx` 除了寫 sessionStorage，同時呼叫 `posthog.people.set(attribution)` → 所有 UTM 變成 person property：

- PostHog Insights 可以用 `utm_campaign = 'brandos-q2-b2b'` 建 cohort
- 5 個 A/B 實驗的 flag 可以設「只對 utm_source=facebook 的使用者」跑（例如 `web3_prominence` 對 `utm_source=paradigm`）
- 轉換漏斗可按 UTM 切片

## 用法示例

### 1. Supabase query：找這季最能帶高意圖 lead 的廣告變體

```sql
SELECT 
  utm_campaign,
  utm_content,
  COUNT(*) AS leads,
  COUNT(*) FILTER (WHERE source = 'schema-generator') AS schema_users,
  COUNT(*) FILTER (WHERE source = 'audit-form') AS audit_users
FROM leads
WHERE utm_source = 'facebook'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY utm_campaign, utm_content
ORDER BY leads DESC;
```

### 2. PostHog funnel by UTM

PostHog → Insights → Funnels → Steps:
1. `$pageview` where `path = /audit`
2. `form_submit` (already sent by AuditForm via gtag; PostHog 也自動捕)
3. `primary_cta_click` (由 `trackConversion` 送)

Breakdown by `utm_campaign` → 可看不同廣告的 conversion funnel 形狀差異。

### 3. HubSpot sync（follow-up）

若要 sync 到 HubSpot Contact：
- `utm_source` → `hs_analytics_source`
- `utm_campaign` → `hs_analytics_first_campaign`
- 透過既有 `composio-hubspot-sync.yml` 跑（需補 composio mapping）

## 失敗模式

| 症狀 | 原因 | 對策 |
|------|------|------|
| leads 表 utm 全 null | 使用者直接打網址進站，沒 UTM | 正常，organic 就是這樣 |
| 同一 session 兩次送表 utm 不同 | 使用者開新 tab 從不同廣告再進站 | sessionStorage 是 tab-scoped，這行為正確（兩個 tab 視為兩個歸因）|
| fbclid 有但 utm_source 沒 | Facebook 自動帶 fbclid 但廣告人員沒設 UTM | Meta Ads Manager 建廣告時勾「URL 參數」一次性設好 |
| leads 寫入 utm_* 欄位不存在 | migration 沒跑 | 確認 `supabase-deploy.yml` 跑過 |

## 相關檔案

- `supabase/migrations/20260424000000_leads_utm_attribution.sql`
- `web/landing/lib/utm/capture.ts`
- `web/landing/components/UtmCapture.tsx`（layout 掛 1 次）
- `web/landing/app/api/audit-leads/route.ts`（新）
- `web/landing/app/api/{schema,scan,agent}/route.ts`（改）
- `web/landing/components/{AuditForm,FreeScanForm,SchemaWikidataGenerator}.tsx`（改）

## Follow-up

1. HubSpot Contact 屬性 mapping（UTM → hs_analytics_*）
2. `sms_subscribers.consent_source` 也加 UTM，追蹤哪支廣告最會帶 SMS 訂閱
3. LinkedIn Insight Tag（類似 FB pixel）整合
