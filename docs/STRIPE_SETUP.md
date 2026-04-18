# Stripe Checkout 設定（$299 AI Visibility Audit）

一次性設定 20 分鐘，之後每筆成交自動寫進 Supabase `orders`。

## 資料流

```
 landing pricing section
     │  點 "現在下單"
     ▼
 GET /api/checkout?product=audit&brand=...
     │  建立 Stripe Checkout Session
     │  303 redirect
     ▼
 Stripe Hosted Checkout（symcio.tw 用戶看到 Stripe 的付款頁）
     │
     │  付款完成
     ▼
 Stripe 送 webhook → POST /api/webhooks/stripe
     │  驗證簽章
     │  寫入 Supabase orders (payment_status='paid', delivery_status='pending')
     │  把對應 lead status 更新為 'converted'
     │
     │  同時 redirect 使用者到
     ▼
 /checkout/success （感謝頁）
```

## 一、建立 Stripe 帳號 + 產品

### 1.1 註冊

https://dashboard.stripe.com/register — 免月費，只收手續費（台灣 2.9% + NT$10/單）。

### 1.2 啟用台灣帳戶

- 身份驗證：個人或公司皆可
- 銀行帳戶：台灣本地帳號（TWD 或美金專戶）
- 審核時間：通常 1-3 天

### 1.3 建立產品（兩個）

Dashboard → **Products** → **+ Add product**

**Product 1：AI Visibility Audit**
- Name：`AI Visibility Audit`
- Description：`20 prompts × 4 AI engines + competitor map + improvement PDF. Delivered within 24 hours.`
- Price：**$299.00 USD** · One-time
- 建立後複製 **Price ID**（`price_xxx...`）

**Product 2：AI Visibility Optimization**
- Name：`AI Visibility Optimization`
- Price：**$1,999.00 USD** · One-time
- 複製 **Price ID**

> 不建立 Price 也能動（code 會 fallback 用 `price_data` 動態建價），但建議建立以便 Stripe Dashboard 能看到每個產品的獨立分析。

## 二、設定 Webhook

### 2.1 取得 endpoint URL

部署後你的 webhook URL 是：
```
https://symcio.tw/api/webhooks/stripe
```

測試期間可用 Stripe CLI 把 local endpoint 轉發（見 §四）。

### 2.2 新增 Webhook endpoint

Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**

- Endpoint URL：`https://symcio.tw/api/webhooks/stripe`
- Events to send：勾選
  - `checkout.session.completed`
- Save → 複製頂部顯示的 **Signing secret**（`whsec_...`）

## 三、設 Vercel 環境變數

Project Settings → Environment Variables（Production + Preview 都勾）：

| Key | Value | 來源 |
|-----|-------|------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Dashboard → Developers → API keys（正式）|
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | §2.2 的 Signing secret |
| `STRIPE_AUDIT_PRICE_ID` | `price_...` | §1.3 Product 1 |
| `STRIPE_OPTIMIZATION_PRICE_ID` | `price_...` | §1.3 Product 2 |
| `NEXT_PUBLIC_SITE_URL` | `https://symcio.tw` | 寫死 |

設完 redeploy。

## 四、本機測試（部署前驗）

### 4.1 裝 Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe
stripe login    # 瀏覽器確認
```

### 4.2 把 Stripe webhook 轉到本機

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
# 會印出 "Ready! Your webhook signing secret is whsec_xxxx"
# 把這個 secret 暫時用 export STRIPE_WEBHOOK_SECRET=whsec_xxxx 餵給 local dev
```

### 4.3 觸發測試事件

```bash
# 方式 A：用 Stripe 測試卡手動走完 checkout flow
open http://localhost:3000/api/checkout?product=audit

# 方式 B：CLI 直接 fire event
stripe trigger checkout.session.completed
```

驗收：Supabase `orders` 表應該有一筆 `payment_status='paid'` 的紀錄。

### 4.4 測試用信用卡號

| 卡 | 號碼 | 結果 |
|----|------|------|
| 成功 | `4242 4242 4242 4242` | 付款成功 |
| 拒付 | `4000 0000 0000 0002` | card_declined |
| 需 3DS | `4000 0027 6000 3184` | authentication_required |

到期日：任何未來日期；CVC：任意 3 碼；郵遞：任意 5 碼。

## 五、上線切換（Test → Live）

1. Dashboard 右上角 **View test data** 切回 Live
2. 重做 §1.3（Live 的 Price ID 與 Test 不同）
3. 重做 §2.2（Live webhook signing secret 也不同）
4. Vercel env 全部換成 Live key
5. Redeploy

建議至少測 3 筆真實小額（你自己買一單、退你自己、再買一次）確認 webhook 確實寫進 Supabase 後才公開。

## 六、Supabase orders 表欄位（已於 migration 建好）

```sql
-- supabase/migrations/20260417000000_initial_schema.sql Layer 7
orders (
  id              UUID PK
  brand_id        UUID FK → brands.id
  product         VARCHAR(50)     -- 'audit' | 'optimization' | 'esg_report' | 'geo_strategy'
  price           DECIMAL(10,2)   -- USD
  payment_status  VARCHAR(20)     -- 'pending' | 'paid' | 'failed'
  delivery_status VARCHAR(20)     -- 'pending' | 'in_progress' | 'delivered'
  created_at      TIMESTAMPTZ
)
```

Webhook 只寫 `payment_status='paid'`，`delivery_status` 保留 `'pending'`——代表 Symcio 團隊還要完成交付。完成後手動或透過未來 workflow 改成 `'delivered'`。

## 七、後續可選自動化

| 優先 | 功能 | 做法 |
|------|------|------|
| P1 | 成交 → Slack 通知 | webhook handler 內加 Composio SLACK_SENDMESSAGE |
| P1 | 成交 → 自動跑真 audit | webhook handler → GitHub repository_dispatch 觸發 `geo-audit.yml` |
| P2 | 退款處理 | 新增 `charge.refunded` event handler |
| P2 | 失敗付款跟催 | `payment_intent.payment_failed` → Composio Gmail 寄重試連結 |
| P3 | 訂閱制 $12k/年 | Stripe Subscriptions + `invoice.payment_succeeded` |

目前程式碼已經 TODO 標記好這些 hook 點，加回去只需 10-30 行。

## 八、安全注意

- ❌ 絕不把 `sk_live_...` 寫進 repo
- ❌ 絕不在前端 code 用 `STRIPE_SECRET_KEY`（只能在 API route 用）
- ✅ 前端需要的只有 `STRIPE_PUBLISHABLE_KEY`（`pk_live_...`），目前我們走 Checkout Session 不需要前端 SDK，所以連 publishable key 都不用設
- ✅ Webhook 一定要驗 signature（已實作於 `app/api/webhooks/stripe/route.ts`）

## 九、除錯

| 狀況 | 可能原因 | 解法 |
|------|---------|------|
| `/api/checkout` 回 503 | `STRIPE_SECRET_KEY` 沒設 | Vercel env 補上，redeploy |
| Webhook 500 | Supabase service_role key 未設 | 補上 `SUPABASE_SERVICE_ROLE_KEY` |
| Webhook 400 signature-verification-failed | Webhook secret 錯 | 重新在 Dashboard 複製 `whsec_...` |
| 成交後 orders 表無紀錄 | Webhook 沒收到 | Dashboard → Webhooks → 該 endpoint → Recent events 看 delivery log |
| Checkout page 跑 localhost:3000 | `NEXT_PUBLIC_SITE_URL` 沒設或仍是 dev | Vercel env 改 `https://symcio.tw` |
