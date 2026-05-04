# 📘 BrandOS Infrastructure — Symcio Growth System

> **AI 行銷 × 獲客 × 成交自動化系統**
> Repo: [github.com/SALL911/BrandOS-Infrastructure](https://github.com/SALL911/BrandOS-Infrastructure)

---

## 一、系統定位

Symcio BrandOS™ 品牌基礎建設的**自動化行銷主系統**。把「網站訪客 → 合格潛在客戶 → CRM 追蹤 → 社群接觸 → 品牌 AI 能見度審計」串成一條可執行的工作流。

目前狀態：**Lead Capture + CRM 模組完整可跑**（14/14 測試通過，API 已實測）；Brand AI Audit 為骨架。

---

## 二、架構概觀

```
┌─────────────────────────────────────────────────────────────┐
│                    Express API (port 3000)                   │
│                   /api/capture-lead (POST)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────▼─────────────┐
            │      LeadCapture          │
            │  （capture.ts — 主編排器）│
            └──┬─────┬─────┬─────┬──────┘
               │     │     │     │
        ┌──────▼──┐ ┌▼────┐ ┌▼─────┐ ┌▼───────────────┐
        │Validator│ │Scorer│ │HubSpot│ │ Notification   │
        │         │ │      │ │Client │ │  - Internal mail│
        │Email格式│ │0-100 │ │upsert │ │  - Welcome mail │
        │拋棄式黑 │ │三階  │ │去重   │ │  - Slack/Discord│
        │名單     │ │分層  │ │      │ │  (Line 社群 CTA)│
        └─────────┘ └──────┘ └───────┘ └─────────────────┘
```

---

## 三、模組導覽

| # | 模組 | 檔案 | 子頁 |
|---|------|------|------|
| 1 | **Lead Capture 主流程** | [capture.ts](../src/modules/lead-capture/capture.ts) | [01-lead-capture.md](01-lead-capture.md) |
| 2 | **Lead Scoring 評分** | [scorer.ts](../src/modules/lead-capture/scorer.ts) | [02-lead-scoring.md](02-lead-scoring.md) |
| 3 | **Email 驗證 / 去重** | [validator.ts](../src/modules/lead-capture/validator.ts) | [03-email-validation.md](03-email-validation.md) |
| 4 | **HubSpot CRM 整合** | [hubspotClient.ts](../src/modules/lead-capture/hubspotClient.ts) | [04-hubspot-crm.md](04-hubspot-crm.md) |
| 5 | **Email + Slack 通知** | [notifications.ts](../src/modules/lead-capture/notifications.ts) | [05-notifications.md](05-notifications.md) |
| 6 | **Brand AI Audit（骨架）** | [auditor.ts](../src/modules/brand-ai-audit/auditor.ts) | [06-brand-ai-audit.md](06-brand-ai-audit.md) |

---

## 四、快速啟動

### 前置
- Node.js ≥ 18（已測試 v24.15.0）
- HubSpot Private App Token（[申請教學](https://developers.hubspot.com/docs/api/private-apps)）
- SMTP 憑證（Gmail App Password / Resend / SendGrid 擇一）
- Slack 或 Discord Incoming Webhook URL（擇一或都填）

### 安裝

```bash
cd Workspace/symcio-growth-system
npm install
cp .env.example .env
# 編輯 .env 填入下方環境變數
npm test      # 應該看到 14 passed
npm start     # 伺服器啟動在 http://localhost:3000
```

### 環境變數

```env
# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@symcio.tw
SMTP_PASSWORD=app-password
EMAIL_FROM="Symcio <hello@symcio.tw>"
EMAIL_INTERNAL_RECIPIENT=you@symcio.tw

# Webhook（擇一）
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
```

---

## 五、最小可用示範

```bash
curl -X POST http://localhost:3000/api/capture-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@acme.co",
    "company": "Acme Corp",
    "jobTitle": "CMO",
    "source": "brand_ai_audit",
    "message": "I want to try BrandOS audit."
  }'
```

**回應（實測）：**

```json
{
  "success": true,
  "lead": {
    "id": "uuid...",
    "score": 80,
    "scoreBreakdown": {
      "total": 80,
      "reasons": [
        "Source \"brand_ai_audit\" → +30",
        "Business email domain (acme.co) → +25",
        "Company provided → +10",
        "Job title provided → +5",
        "Detailed message (≥20 chars) → +10"
      ]
    }
  },
  "duplicate": false,
  "crmSynced": true,
  "notificationsSent": {
    "internalEmail": true,
    "welcomeEmail": true,
    "slack": true
  }
}
```

---

## 六、一條 Lead 走進系統的完整旅程

```
1. POST /api/capture-lead          →  Express route
2. validateLead(input)             →  email 格式、黑名單、電話
3. scoreLead(input, validation)    →  算分 + 分 hot/warm/cold
4. hubspot.upsertContact(lead)     →  search → create/update（去重）
5. notifier.notifyAll(lead)        →  平行送三個通知
   ├─ Internal email  → 寄給你，標題含分數
   ├─ Welcome email   → 寄給客戶，CTA 按鈕 = BrandOS Line 社群
   └─ Slack/Discord   → 即時推 #leads 頻道
6. Response 201 / 400 / 500
```

---

## 七、下一步開發路線（建議）

- [ ] **前端 Lead 表單頁**（single-file HTML + Tailwind，可嵌 Symcio 官網）
- [ ] **Brand AI Audit 真實化**：串 OpenAI / Gemini / Perplexity API，查「Symcio / BrandOS™」在 AI 回應中的能見度
- [ ] **每週自動報告排程**：cron 或 GitHub Actions，每週一早上寄審計摘要給自己
- [ ] **競品能見度對比**：同一 query 跑 Symcio + 3 個競品，輸出對比圖表
- [ ] **Nurture 序列**：Lead 評分 < 40 時進入 5 封 drip email 序列
- [ ] **LINE Messaging API**：在 Line 社群自動問候新成員、推送新內容

---

## 八、測試覆蓋

| Suite | 項目 | 狀態 |
|-------|------|------|
| `tests/leadCapture.test.ts` | 9 個（validator / scorer / capture 整合） | ✅ |
| `tests/index.test.ts` | 5 個（原系統模組 smoke test） | ✅ |
| **合計** | **14** | **14/14 passed** |

```bash
npm test
```
