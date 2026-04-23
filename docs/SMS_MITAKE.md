# Symcio SMS Marketing — 三竹簡訊 Mitake + 個資法合規

## WHY

台灣的 AI 可見度監測報告若能用 SMS 推送，能在客戶「最有收件率的通道」觸及他們（email open rate ~20%，SMS 97%）。但 SMS 行銷在台灣嚴格受 **個人資料保護法 §20**、**行動電話號碼行銷自律規範** 與 **通訊傳播安全管理條例** 管制：明確 opt-in、可追溯 IP、每則含退訂鍵、訊息可識別寄件人、資料保存與刪除期。

這條 pipeline 從頭設計為「不踩線」並能實際送出。

## 架構

```
╭─────────────────────────────────────────────────────────────╮
│ 使用者在 Symcio 表單（landing / audit form）留手機號碼      │
│   → POST /api/sms/subscribe                                  │
│       ├─ 正規化為 +886 開頭                                  │
│       ├─ 寫 sms_subscribers（consent_at 尚為 NULL）         │
│       ├─ 產 6 位 OTP                                         │
│       └─ 透過 Mitake 發「驗證碼」SMS                          │
│                                                              │
│ 使用者輸入 OTP                                                │
│   → POST /api/sms/verify                                     │
│       └─ 驗過 → 寫入 consent_at + consent_ip                │
│                                                              │
│ 行銷團隊後台新增 sms_campaigns 行                             │
│   （透過 Supabase Studio 或之後做 /admin UI）                │
│                                                              │
│ 人工觸發 .github/workflows/sms-campaign.yml                  │
│   → scripts/sms_send_campaign.py                             │
│       ├─ 撈 due campaign                                     │
│       ├─ 依 segment_filter 展開 sms_subscribers（只撈       │
│       │   consent_at IS NOT NULL AND opt_out_at IS NULL）   │
│       ├─ 渲染訊息 template（塞 {opt_out_url}）              │
│       ├─ 呼叫 Mitake HTTP API（一則一則送）                 │
│       └─ 寫 sms_deliveries 軌跡                              │
│                                                              │
│ 使用者收到簡訊點退訂連結                                       │
│   → GET /u/<opt_out_token>                                   │
│       └─ 更新 sms_subscribers.opt_out_at = now()            │
╰─────────────────────────────────────────────────────────────╯
```

## 個資法合規對照

| 法規要求 | 本設計實作 |
|---------|-----------|
| §19 §20：明確告知蒐集目的 | subscribe form 旁註明「Symcio 會以 SMS 寄送 AI 品牌可見度報告與產品更新」|
| §20.3：提供退訂 | 每則 SMS 強制尾綴 `退訂:symcio.tw/u/xxxx`（script 會檢查）|
| §27：蒐集時記錄來源 | `sms_subscribers.consent_source` / `consent_ip` |
| §41：資料安全維護 | Supabase RLS 開啟 + service_role 才能寫 |
| §11：刪除權 | opt_out_at 寫入後 script 永遠略過；90 天後 cron 可自動 anonymize（follow-up）|
| §29：賠償 | Delivery 軌跡保存 2 年，異議可查 |

同時遵守 NCC 的**行銷訊息自律規範**：訊息開頭必含識別碼 `[Symcio]` 或發送人名稱。

## Mitake 企業申請

### 準備資料
- 公司名稱 + 統編
- 用途說明（我寫給你用的範本在 CLAUDE.md 對話）
- 聯絡人電話 / email
- 預估每月發送量（影響計費方案）

### 申請步驟
1. **寄信** `service@mitake.com.tw`（主旨：`HTTP API 企業簡訊 開戶申請`）
2. Mitake 回信附表單 → 填寫回傳 + 公司登記影本
3. 審核約 1–3 個工作日
4. 開戶後 Mitake 寄帳密 + 後台網址
5. 儲值（最低 3000 點，每則 NT$0.7–1.2 依量）

### 技術細節
- 企業 API endpoint：`https://smsapi.mitake.com.tw/api/mtk/SmSend`
- 認證：query param 的 username/password
- 若 Mitake **鎖 IP 白名單** 且 Vercel 動態 IP 不符 → 兩選一：
  - 要求 Mitake 改帳密認證（講清楚 Vercel 架構他們通常會答應）
  - 走 GitHub Actions 發送（本 repo 的 `sms-campaign.yml`，GH ranges 可加白）

### 秘密注入
```
# Vercel Project → Settings → Environment Variables
MITAKE_USERNAME=<mitake給的帳號>
MITAKE_PASSWORD=<mitake給的密碼>

# GitHub Repo → Settings → Secrets and variables → Actions
MITAKE_USERNAME=<同上>
MITAKE_PASSWORD=<同上>
```

Vercel 端給 `/api/sms/subscribe` 發 OTP 用；GitHub Actions 端給 campaign 批次發送用。

## 使用流程

### 1. 套 migration
PR 合併後 `supabase-deploy.yml` 自動套 `20260423000000_sms_pipeline.sql`，多三張表：`sms_subscribers` / `sms_campaigns` / `sms_deliveries`。

### 2. 訂閱者成長（OTP 驗證流程）
使用者在 landing 或 audit form 的 phone 欄位填完 → 觸發 `/api/sms/subscribe` → 收到驗證碼 → `/api/sms/verify` 確認 → 正式加入名單。

前端 UI 還沒做完整流程（可由 `components/FreeScanForm.tsx` 或新元件包起來）。API 先就緒，MVP 階段可以先用 Supabase Studio 手動標 `consent_at` + 自己拉名單測試。

### 3. 建 Campaign
進 Supabase Studio → `sms_campaigns` 新增一筆：
- `name`：`2026-Q2 Web3 segment nudge`
- `message_template`：
  ```
  [Symcio] {brand} 最新四引擎曝光快照已更新，
  立即查看：https://symcio.tw/r/{phone_tail}
  退訂:{opt_out_url}
  ```
- `segment_filter`：`{"tags": ["web3"]}`
- `provider`：`mitake`
- `scheduled_at`：排程時間（或留 NULL 立即跑）

### 4. 發送
GitHub → Actions → **SMS Campaign Dispatch** → Run workflow：
- `campaign_id`：上面那筆的 UUID
- `dry_run`：**true**（**強烈建議第一次設 true**，看名單沒問題再真送）

Dry run 會列出所有目標 phone 與最終訊息內容，不呼叫 Mitake、不寫 `sms_deliveries`。

驗完 → Run workflow 再一次，`dry_run: false`。

## 訊息長度限制

Mitake 單則上限：
- 中文：70 字（UTF-8 encoding=UTF8）
- 英文：160 字

超過會自動切多則、計多則點數。範本設計時把 `opt_out_url`（約 30 字）預留空間。

## 監控

- **Supabase Studio** → `sms_deliveries` 按 status 分組看成功率
- **Supabase Studio** → `sms_campaigns` 看 sent_count / failed_count / finished_at
- **Mitake 後台** 看帳戶剩餘點數（低於 100 點發 email 通知自己）

## 失敗模式

| 症狀 | 原因 | 對策 |
|------|------|------|
| `/api/sms/subscribe` 500 | MITAKE env 未設 | Vercel 加 env 重 deploy |
| statuscode=e | IP 白名單 | 跟 Mitake 要求改帳密或走 GitHub Actions |
| statuscode=v | 點數歸零 | Mitake 後台儲值 |
| statuscode=p | 門號在黑名單 | `sms_subscribers.opt_out_at` 寫入避免重試 |
| 大量 statuscode=a | 帳密錯 | 重新從 Mitake 後台複製，注意不要含空白 |
| OTP 一直對不上 | 手機 SMS 延遲 | verification_expires_at 設 10 分鐘 |

## 完全替代方案（若 Mitake 開戶太久）

Fallback gateway 程式碼骨架已設計成可抽換：`lib/sms/mitake.ts` → 未來可加 `lib/sms/chunghwa.ts` / `lib/sms/twilio.ts`，`sms_campaigns.provider` 欄位切換。

- **[中華電信 HiNet 網際簡訊](https://hiair.hinet.net/)**：你有 HiNet 企業合約可加掛
- **[SMS-GET](https://www.sms-get.com/)**：最快開戶，試用額度大
- **[Twilio](https://twilio.com)**：國際備援，台灣送達率略低於本地 gateway

## Follow-up（不在本 PR）

1. `components/SmsSubscribeForm.tsx` — 端到端 UI（phone input → OTP → confirm）
2. Admin `/admin/sms` 頁：新增 campaign / 查狀態的 web UI
3. 自動 anonymize：opt-out 90 天後 cron 把 phone hash 化
4. Delivery webhook：接 Mitake delivery report callback（需 `response` param 指向 callback URL）
5. 廣告素材 A/B：campaign 可綁 PostHog experiment，追蹤轉換

## 相關檔案

- `supabase/migrations/20260423000000_sms_pipeline.sql` — 3 張表
- `web/landing/lib/sms/mitake.ts` — Mitake REST client
- `web/landing/app/api/sms/subscribe/route.ts` — OTP 發送
- `web/landing/app/api/sms/verify/route.ts` — OTP 驗證
- `web/landing/app/u/[token]/page.tsx` — opt-out 一鍵頁
- `scripts/sms_send_campaign.py` — 批次發送 driver
- `.github/workflows/sms-campaign.yml` — 人工觸發 workflow
