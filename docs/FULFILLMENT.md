# Paid Audit 自動交付流程

$299 付款 → 24 小時內客戶收到真實四引擎 audit 報告。這份文件說明整條自動化管線。

## 完整資料流

```
使用者在 landing 點 $299 按鈕
  → /api/checkout 建 Stripe Checkout Session
  → 導到 Stripe 主機付款頁
  → 付款成功
  → Stripe 發 webhook → POST /api/webhooks/stripe
      │
      ├─① Supabase: INSERT orders (paid/pending)
      ├─② Supabase: UPDATE leads SET status='converted'
      ├─③ GitHub repository_dispatch event_type='paid-audit'
      │    └─→ .github/workflows/geo-audit.yml 觸發
      │        └─→ scripts/geo_audit.py 跑 4 引擎 × 20 prompt
      │            └─→ 寫 Supabase visibility_results（未來加寄 PDF）
      │
      └─④ Resend: 寄確認信「audit 進行中，24h 內交件」
```

三條 side effect（②③④）任一失敗都不擋主流程——只加入 `warnings[]` 讓 Stripe webhook 仍回 200（避免 Stripe 誤判失敗去重試）。

## 新增的檔案

| 檔 | 用途 |
|---|------|
| `web/landing/lib/github/dispatch.ts` | GitHub API 呼叫 wrapper（純 fetch，無 SDK）|
| `web/landing/lib/email/resend.ts` | Resend API 呼叫 + 確認信 HTML template |
| `.github/workflows/geo-audit.yml` | 新增 `repository_dispatch: types: [paid-audit]` trigger |

## 需要加的 Vercel 環境變數

| Key | Value | 取得 |
|-----|-------|------|
| `GH_DISPATCH_TOKEN` | GitHub PAT（需 `repo` scope）| https://github.com/settings/tokens → Generate new token (classic) → 勾 `repo` |
| `GH_DISPATCH_REPO` | `SALL911/BrandOS-Infrastructure` | 寫死 |
| `RESEND_API_KEY` | `re_xxx` | https://resend.com → API Keys → Create |
| `RESEND_FROM_ADDRESS` | 已驗證的寄件 email，預設 `Symcio <hello@symcio.tw>` | Resend → Domains |

**若三個都不設**：webhook 仍運作（只寫 Supabase orders），只是沒自動跑 audit、沒寄信，全由 `warnings[]` 提示。

## Resend 設定（15 分鐘）

1. 註冊：https://resend.com（免費 100 emails/日）
2. Domains → **Add Domain** → 輸入 `symcio.tw`
3. Resend 給三組 DNS 記錄（SPF / DKIM / DMARC）→ 到 Cloudflare DNS 加進去
4. 等 5-15 分鐘驗證成功 → Status 變 `Verified`
5. **API Keys** → **Create API Key** → name `symcio-prod` → 複製 `re_...`
6. 設到 Vercel env `RESEND_API_KEY`
7. 設 `RESEND_FROM_ADDRESS=Symcio <hello@symcio.tw>`（或你驗證過的任何 address）

## GitHub Personal Access Token 設定（2 分鐘）

1. https://github.com/settings/tokens → **Generate new token (classic)**
2. Note：`symcio-dispatch`
3. Expiration：90 天（到期再生）
4. Scope 只勾 **`repo`** 一項（能 dispatch 就夠；不要給 admin）
5. Generate → 複製 `ghp_...`
6. 設到 Vercel env `GH_DISPATCH_TOKEN`
7. 設 `GH_DISPATCH_REPO=SALL911/BrandOS-Infrastructure`

## 端到端驗證（Stripe Test 模式）

1. 確認所有 env 都設好
2. Vercel redeploy
3. 用 Stripe 測試卡 `4242 4242 4242 4242` 走一次完整 flow（可從 landing 點 "$299 現在下單"）
4. 預期現象：
   - **立刻**：Supabase `orders` 有一筆 `paid`；Supabase `leads` 對應 email 變 `converted`
   - **約 10 秒內**：GitHub Actions 頁 看到 `GEO Audit` workflow 被 `repository_dispatch` 觸發
   - **約 30 秒內**：你的 email 收到 Symcio 確認信
   - **約 2-3 分鐘內**：`GEO Audit` workflow 綠燈，`reports/geo-audit/` 多一個檔案

## 常見問題

**webhook 回 200 但 audit 沒跑**
→ 看 Stripe Dashboard → Webhooks → 該次 event → Response body 的 `warnings[]`：
- `dispatch: dispatch-not-configured` → `GH_DISPATCH_TOKEN` / `GH_DISPATCH_REPO` 沒設
- `dispatch: github HTTP 401` → PAT 過期或 scope 不夠
- `dispatch: github HTTP 422` → event_type 拼錯（workflow YAML 要是 `paid-audit`）

**audit 跑了但沒寄報告**
→ 這版還沒自動寄報告（Phase 2）。交付報告需要你本人去看 `reports/geo-audit/symcio-<date>.json` 產生 PDF 並手動寄——或等我下一輪做 Phase 2。

**客戶沒收到確認信**
→ `warnings[]` 有 `resend: xxx`
- `resend-not-configured` → `RESEND_API_KEY` 沒設
- `resend HTTP 403` → `from` address 沒驗證（必須用 Resend Verified Domain 的 address）
- 檢查 Resend Dashboard → Logs 看實際狀況

## 下一階段（Phase 2）未做

| 優先 | 未做 | 擋什麼 |
|------|------|-------|
| 🔴 P0 | audit 跑完後自動產 HTML/PDF 報告 | 現在仍需人工交付 |
| 🔴 P0 | 報告自動寄到客戶 email | 同上 |
| 🟡 P1 | 退款處理（`charge.refunded`）| 目前退款後 orders 不會自動更新 |
| 🟡 P1 | Slack 通知成交 | 目前成交只有 email，沒 team alert |
| 🟢 P2 | 失敗付款跟催（`payment_intent.payment_failed`）| cold lead 流失 |
| 🟢 P2 | 訂閱制（Stripe Subscriptions）| $12k/年方案未接 |

Phase 2 的程式碼位置都已 TODO 標好，加回去各需 30-60 行。

## 安全

- `GH_DISPATCH_TOKEN` 是 PAT，**只能** `repo` scope，**不要**給 admin
- `RESEND_API_KEY` 只能在 Vercel Serverless function 用（已是 `runtime: "nodejs"`）
- Webhook signature verification 已強制要求 `STRIPE_WEBHOOK_SECRET`，無簽章回 400
