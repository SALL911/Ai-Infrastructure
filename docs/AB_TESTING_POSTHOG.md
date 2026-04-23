# A/B Testing with PostHog — Symcio Landing

## WHY

先前狀態：site 已接 GA4（`G-QPB9W2885C`）與 HubSpot（`245975397`），但**沒有 A/B 測試基礎設施**。如果要實驗不同敘事對不同受眾的轉換（台灣上市櫃 ICP vs B2B SaaS vs Web3 品牌），至少需要：
- Feature flag 分流引擎
- 變體曝光事件 + 轉換事件統計
- 顯著性計算

評估 VWO / AB Tasty / Google Optimize（已 sunset 2023-09）/ PostHog，結論 **PostHog**：
- 1M events / 月 **免費** — MVP 階段跑 10 個實驗不會花錢
- A/B + feature flags + 產品分析 + session replay 一站式
- SDK 對 Next.js App Router 支援好
- 原始碼公開，未來可自架

VWO 免費 plan 50k MTU 對小站勉強夠但只做 A/B；AB Tasty 沒免費 plan。

## 架構

```
Browser
  │
  ├─ layout.tsx
  │   ├─ Script(GA4 gtag)          ← 保留既有，不動
  │   ├─ Script(HubSpot tracker)   ← 保留既有，不動
  │   └─ PostHogProvider
  │         ├─ ensurePostHog()     ← posthog-js 初始化
  │         └─ pageview tracking   ← App Router client-nav 補跡
  │
  ├─ 任一元件/頁使用：
  │   <Experiment name="primary_cta">
  │     {(variant) => variant === "book_demo" ? <DemoCTA/> : <ScanCTA/>}
  │   </Experiment>
  │
  └─ 曝光事件雙送：
      ├─ posthog.capture("$feature_flag_called", ...)
      └─ gtag("event", "experiment_impression", ...)
          → GA4 Explore 可分群
```

**設計原則**：
- PostHog 缺 env var 時**自動 fallback 到預設變體**，不影響既有 UX
- 實驗 key / 變體列表集中在 `lib/posthog/experiments.ts`（TS 常數）
- GA4 bridge 確保行銷團隊既有儀表板也看得到

## 設定一次性步驟

### 1. 註冊 PostHog

1. https://posthog.com/signup → 用 GitHub 登入
2. 建立 Project，region 選 **US**（EU 也可，但之後要固定）
3. Settings → Project → Project API Key 複製 `phc_xxxxxxxx`

### 2. 寫進 Vercel env

Vercel Project → Settings → Environment Variables → Production 加兩項：

```
NEXT_PUBLIC_POSTHOG_KEY   = phc_xxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST  = https://us.i.posthog.com
```

用 `NEXT_PUBLIC_` 前綴才能在 browser 讀到。這兩個 key 是**公開可見**的，不是機密。

### 3. Redeploy

Vercel Deployments → 最新一筆 → Redeploy → env 生效。

### 4. 在 PostHog 後台建 Feature Flags

先建 5 個 multivariate flag，key 與 `lib/posthog/experiments.ts` 的 `EXPERIMENTS[x].key` 一致：

| Flag key | Variants | 預設分流 |
|----------|----------|---------|
| `hero_headline` | `ai_visibility`, `esg_ai_dual` | 50% / 50% |
| `primary_cta` | `free_scan`, `book_demo` | 50% / 50% |
| `web3_prominence` | `hidden`, `visible` | 70% / 30% |
| `pricing_display` | `all_tiers`, `progressive` | 50% / 50% |
| `primary_narrative` | `ai_first`, `esg_first` | 50% / 50% |

每個 flag 必須選 **Experiment feature flag** 類型（不是 boolean），才會自動計算顯著性。

## 怎麼在程式碼裡用

### 最小範例：兩變體 CTA

```tsx
import { Experiment } from "@/components/Experiment";
import { trackConversion } from "@/lib/posthog/client";

export function HeroCTA() {
  return (
    <Experiment name="primary_cta">
      {(variant) => (
        <a
          href={variant === "book_demo" ? "/demo" : "/audit"}
          onClick={() => trackConversion("primary_cta_click", { cta: variant })}
          className="..."
        >
          {variant === "book_demo" ? "預約 15 分鐘 demo" : "免費掃描我的品牌"}
        </a>
      )}
    </Experiment>
  );
}
```

**規則**：
1. `name` 必須是 `EXPERIMENTS` 的 key（TS 會 autocomplete）
2. children 是 render-prop，接收 variant 字串
3. 每個重要 click 呼叫 `trackConversion(...)` 送轉換事件（PostHog + GA4 雙送）

### 進階：多個實驗交叉

同一個 user 可以同時參與多個實驗，只要不同 flag key 即可：

```tsx
<Experiment name="primary_narrative">
  {(narrative) => (
    <Experiment name="primary_cta">
      {(cta) => <Hero narrative={narrative} cta={cta} />}
    </Experiment>
  )}
</Experiment>
```

## 目標受眾分群（在 PostHog 後台設）

PostHog 的 flag 可以按屬性切分流比例，不一定要 50/50。典型 Symcio 情境：

| 實驗 | 分群邏輯（在 PostHog Flag 設） |
|------|---------------------------|
| `web3_prominence` | referrer `includes mirror.xyz/paragraph/mirror.xyz` → 強制 `visible` |
| `primary_cta` | `$browser` = `Safari` 且 `$geoip_country_code` = `TW` → `book_demo`（台灣企業主多用 Mac）|
| `primary_narrative` | UTM source = `linkedin` → `esg_first`（投資人社群）|
| `pricing_display` | 已登入 Supabase 且 `status=prospect` → `progressive` |

分群條件用 PostHog Person Properties、URL params、cookie 屬性組合都可以。

## 量測結果

PostHog → Experiments → 選實驗：
- **Impressions per variant**
- **Conversion rate per variant**（定義你的 primary conversion event）
- **Statistical significance**（自動算，≥95% 才建議 ship winner）
- **Secondary metrics**（pageview depth、bounce rate 等自動抓）

**建議停留時間**：每個實驗至少 14 天或 1000+ 曝光/變體，先到者為準。

## 與既有 GA4 / HubSpot 的關係

- **GA4**：行銷團隊主儀表板。PostHog 每個實驗曝光會送 `experiment_impression` 事件到 GA4，轉換事件也雙送（PostHog → GA4）。
- **HubSpot**：CRM 層面，lead 進來之後追蹤。不受 PostHog 影響，但可把 PostHog person_id 寫進 HubSpot contact property，串起 lead 的 prelogin 行為。
- **三者不重複計數**：轉換事件有三個接收端，各自獨立；不用擔心 GA4 事件數被 PostHog 吃掉。

## 部署後驗證

1. 打開 https://symcio.tw/ 開 DevTools Network
2. 應該看到：
   - `i.posthog.com/decide/?...` 回 200
   - `i.posthog.com/e/?...` 回 200（曝光事件）
   - `google-analytics.com/g/collect?...` 回 2xx（既有 GA4）
3. PostHog dashboard → Live events → 看到 `$pageview` 進來
4. 若 env var 沒設 → Console 看到 `[posthog] NEXT_PUBLIC_POSTHOG_KEY not set; experiments use defaults.`，頁面正常運作

## 失敗模式

| 症狀 | 原因 | 對策 |
|------|------|------|
| 頁面一片空白 | PostHog 擋了 render（不該發生） | 檢查 `PostHogProvider` 是 `<Suspense>` 包著 |
| 實驗永遠拿預設值 | env var 沒設 / flag 未在 PostHog 後台建 | 檢查 env + PostHog 後台 flag key 相符 |
| 變體閃爍（先 A 後 B） | flag 載入前先 render 預設 | 已知 trade-off；若 conversions 發生在首屏下方影響極小 |
| GA4 沒收到 `experiment_impression` | layout.tsx 的 gtag script 沒載入 | 確認 GA4 script 在 PostHogProvider 前載入 |
| 同一 user 被分到兩個變體 | cookie 被清 / 跨裝置 | PostHog 支援 user identify 後續整合，MVP 階段接受 |

## Follow-up（不在本 PR）

1. **PostHog + HubSpot identify 整合**：lead 送出 email 時呼叫 `posthog.identify(email)`，把 prelogin session 串到 HubSpot contact
2. **Server-side feature flags**：首屏不閃爍需要 SSR 讀 flag，用 `posthog-node` + cookie persistent ID
3. **Lead scoring feeds back to PostHog**：SSR 時把 `status=hot/warm/cold` 寫進 person property，做 targeting
4. **Session replay**：PostHog 有內建 session recording，用於診斷 schema-generator 的放棄率

## 相關檔案

- `web/landing/lib/posthog/client.ts` — posthog-js 初始化 + GA4 bridge
- `web/landing/lib/posthog/experiments.ts` — 5 個實驗定義（single source of truth）
- `web/landing/components/PostHogProvider.tsx` — layout provider（含 App Router pageview）
- `web/landing/components/Experiment.tsx` — render-prop 元件
- `web/landing/app/layout.tsx` — 已包 `<PostHogProvider>{children}</PostHogProvider>`
- `web/landing/.env.vercel.local.example` — 加了 `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`
