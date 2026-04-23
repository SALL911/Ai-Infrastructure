# Meta Ads Manager × Symcio A/B Experiment 建置手冊

## 為什麼是這份文件

Claude Code 無法登入你的 Meta Business Manager（需要你的憑證 + 信用卡），也**不該**登入。這份把你要在 Meta Ads Manager 手動做的步驟全部列清楚，**UTM 參數跟 PostHog 的 5 個實驗 flag 完全對齊**，貼到 Meta 的 URL 參數欄位就能直接跑。

## 三層結構（要分清楚）

Meta 廣告是三層：**Campaign → Ad Set → Ad**。

- **Campaign（行銷活動）**：決定目標（名單型 / 轉換型 / 品牌知名度）與預算 cap
- **Ad Set（廣告組）**：決定受眾、投放位置、排程
- **Ad（廣告）**：決定素材（圖片、影片、文案）

**一個 Campaign 下建多個 Ad Set = 不同受眾分組；同一 Ad Set 建多個 Ad = 素材 A/B**。

## 推薦設定（配合 5 個 PostHog 實驗）

我們要測 5 個 flag，但不是每個都適合用 Meta 測（有些是站內體驗差異）。拆分如下：

| PostHog Flag | 適合 Meta 測嗎 | Meta 端怎麼做 |
|--------------|---------------|----------------|
| `hero_headline` | ✅ 高適配 | Ad 層測不同素材文案，UTM `utm_content=hero-ai` vs `hero-esg` |
| `primary_cta` | ✅ 中適配 | Ad 層測 CTA 按鈕（「了解更多」 vs 「註冊」），UTM `utm_content=cta-scan` vs `cta-demo` |
| `web3_prominence` | ⚠️ 用 Ad Set 受眾分 | 一個 Ad Set 鎖 Web3 受眾、另一個 Ad Set 鎖傳統 ICP；UTM `utm_content=aud-web3` vs `aud-b2b` |
| `pricing_display` | ❌ 站內體驗差異 | 不在 Meta 測；用 PostHog 原生 flag 50/50 分流 |
| `primary_narrative` | ✅ 高適配 | Ad 層測素材敘事主軸，UTM `utm_content=narr-ai` vs `narr-esg` |

## UTM 標準命名約定

**所有 Symcio 廣告 URL 都照這個格式**，避免日後資料分析混亂：

```
https://symcio.tw/audit?
  utm_source=facebook          ← 平台（固定）
  &utm_medium=paid-social       ← cpc / paid-social / paid-search 三種
  &utm_campaign=brandos-q2-b2b ← yyyy-quarter-segment，你自己想得起來
  &utm_content=hero-ai         ← 素材變體識別碼（對齊 PostHog flag variant）
  &utm_term=esg-reporting       ← 關鍵字 / 關鍵概念（選填）
```

**utm_content 命名規則**（重要）：

| PostHog 實驗 | Variant A 的 utm_content | Variant B 的 utm_content |
|-------------|-------------------------|-------------------------|
| hero_headline | `hero-ai` | `hero-esg` |
| primary_cta | `cta-scan` | `cta-demo` |
| web3_prominence | `aud-web3` | `aud-b2b` |
| primary_narrative | `narr-ai` | `narr-esg` |

這樣 Supabase query 就能跨維度切片：
```sql
SELECT utm_content, COUNT(*) FROM leads GROUP BY utm_content;
```

## 逐步操作（第一支 A/B 實驗）

### Step 0：先確認

- 你 Facebook Business Manager 已經有 Page + Ad Account + 信用卡 billing（這些不補這份文件教；Meta 官方支援窗口最清楚）
- Meta Pixel 已裝在 symcio.tw（layout.tsx 可以看 GA4 script，若沒 Meta Pixel 的話先補；Meta → Events Manager 建 Pixel → 拿到代碼塞進 layout head）

### Step 1：建 Campaign

Ads Manager → **+ Create** → 選目標：
- **Leads**（名單型廣告）若要 FB 原生 lead form
- **Traffic**（流量廣告）若要導到 symcio.tw/audit 用站內表單 — **推薦這個，lead 進我們自家 pipeline，UTM 才有用**

填：
- Campaign name：`brandos-q2-b2b`（= 你的 `utm_campaign`）
- Budget：建議每日 $10–30（NT$300–1000）測 7 天看顯著性
- **A/B Test：開**（Meta 自己會幫你做 50/50 分流 + 顯著性計算）

### Step 2：建第一組 Ad Set（變體 A）

- Ad Set name：`aud-b2b-hero-ai`
- 受眾：
  - Locations：Taiwan
  - Age：30–55
  - Detailed targeting：`Business decision makers` / `ESG professionals` / `CEO` / `CMO`
- Placements：Automatic
- Schedule：7 天

### Step 3：建 Ad（變體 A）

- Ad name：`hero-ai-cta-scan`
- Identity：你的 Facebook Page
- Format：Single image / Single video
- Primary text 範例：
  > 你在 Google 排第一，但 AI 完全沒提到你。Symcio 量化品牌在 ChatGPT / Claude / Gemini / Perplexity 的曝光、排名、影響力。3 分鐘免費 AI 健檢 →
- Headline：`量化你的品牌 AI 可見度`
- CTA button：`Learn More`
- **Website URL**（**最關鍵**）：
  ```
  https://symcio.tw/audit?utm_source=facebook&utm_medium=paid-social&utm_campaign=brandos-q2-b2b&utm_content=hero-ai
  ```

### Step 4：複製 Ad 做變體 B

右鍵你剛建好的 Ad → **Duplicate** → 改：
- Ad name：`hero-esg-cta-scan`
- Primary text 換 ESG 敘事：
  > 台灣第一個整合 TNFD × AI 可見度的 ESG 治理平台。一次搞定永續揭露與品牌聲量監測，3 分鐘免費健檢 →
- Website URL：**只改 `utm_content=hero-esg`**，其他保留
  ```
  https://symcio.tw/audit?utm_source=facebook&utm_medium=paid-social&utm_campaign=brandos-q2-b2b&utm_content=hero-esg
  ```

### Step 5：Publish

Review & Publish。Meta 審核通常 15 分鐘 ~ 24 小時。

### Step 6：等 7 天看數據

**Meta 端看：**
- Campaign → A/B Test tab：Meta 自己跑顯著性
- Ads Manager → Columns → Customize → 加「Link Clicks」「Cost per Link Click」「CPM」

**Symcio 後台看**（這才是你該看的）：
```sql
SELECT 
  utm_content,
  COUNT(*) AS leads,
  COUNT(*) FILTER (WHERE source = 'audit-form') AS audit_completed,
  COUNT(DISTINCT company) AS unique_companies
FROM leads
WHERE utm_campaign = 'brandos-q2-b2b'
GROUP BY utm_content
ORDER BY leads DESC;
```

**PostHog 看**：
- Insights → Funnel → Breakdown by `utm_content`
- 比較 `hero-ai` vs `hero-esg` 從 `$pageview` 到 `form_submit` 的漏斗形狀

## 受眾分群（web3_prominence 實驗）

這個實驗在 Meta 端走 Ad Set 受眾，不走 Ad 素材：

**Ad Set 1 — Web3 受眾**
- Detailed targeting：`Cryptocurrency` / `Blockchain` / `NFT` / `Ethereum`
- Ad 的 URL：`?utm_content=aud-web3`

**Ad Set 2 — 傳統 B2B 受眾**
- Detailed targeting：`Business decision makers` / `ESG professionals`  
- Ad 的 URL：`?utm_content=aud-b2b`

PostHog 後台 feature flag `web3_prominence` 設條件：
```
IF utm_content = 'aud-web3' THEN variant = 'visible'
ELSE variant = 'hidden'
```

## 預算建議

MVP 階段（測試 2 個實驗，每實驗 2 變體）：

| 項目 | 金額 |
|------|------|
| 每日預算 per Ad Set | NT$300 |
| Ad Set 數量 | 4（2 campaign × 2 audience）|
| 每日總支出 | NT$1,200 |
| 測試期 | 7 天 |
| **總預算** | **NT$8,400（約 US$270）** |

低於這個金額 Meta 的 A/B 顯著性會跑不出來。高於這個沒意義（MVP 階段）。

若預算更緊 → 先只跑 1 個 campaign × 2 個 ads（NT$2,100 / 週）測 `hero_headline` 單一實驗。

## 常見踩雷

| 雷 | 後果 | 避免 |
|---|------|------|
| URL 沒帶 UTM | Supabase / PostHog 都不知道誰從廣告來 | 每次建 Ad **必檢查** URL 參數 |
| `utm_content` 各 Ad 一樣 | A/B 看不出差異 | 每個變體唯一名稱（如上表）|
| 忘開 Campaign 層的 A/B Test toggle | 自己算顯著性很痛苦 | 建 campaign 第一畫面就勾 |
| Ad Set 預算分太散 | 每組都跑不出顯著性 | 每 Ad Set 至少 NT$200/日 × 7 天 |
| Meta Pixel 沒裝 | 只有站內歸因，FB 那邊是黑盒 | Events Manager → 建 Pixel → 塞進 `layout.tsx` |

## Meta Pixel 裝法（若還沒）

1. business.facebook.com → Events Manager → **Connect data source** → Web → 建新 Pixel，命名 `symcio-main`
2. Meta 會給一段 script，複製
3. 在本 repo 的 `web/landing/app/layout.tsx` 的 `<head>` 區塊新增（放 GA4 script 下面）：

```tsx
<Script id="meta-pixel" strategy="afterInteractive">
  {`
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '你的 Pixel ID');
    fbq('track', 'PageView');
  `}
</Script>
```

開新 PR 處理這塊；不在 UTM PR 範圍內。

## 流程總結

```
1. 廣告人員在 Meta Ads Manager 照 Step 1–5 建廣告
2. 使用者點 FB 廣告 → symcio.tw/audit?utm_*=...
3. UtmCapture.tsx 寫 sessionStorage（本 PR 已做）
4. 使用者填 AuditForm → POST /api/audit-leads（含 UTM，本 PR 已做）
5. leads 表寫入 → brands 表 UPSERT
6. geo-audit-queue（每小時）掃新 brand → 寄 Free Scan email
7. Supabase / PostHog 數據回流 → 決定哪個 Ad 留、哪個關
```

整條鏈路現在可以閉環。
