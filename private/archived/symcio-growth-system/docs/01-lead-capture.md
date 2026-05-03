# 🎯 01 — Lead Capture 主流程

> 把「表單送出」變成「合格 Lead + CRM 記錄 + 三個通知」的單一編排入口。

**原始碼：** [src/modules/lead-capture/capture.ts](../src/modules/lead-capture/capture.ts)

---

## 一、職責

`LeadCapture` 類別是這個模組唯一的對外介面。呼叫者只需要提供原始輸入資料，它負責：

1. **驗證** — 委派給 `validator.ts`
2. **評分** — 委派給 `scorer.ts`
3. **去重** — 本地 24 小時 email 快取
4. **CRM 同步** — 委派給 `hubspotClient.ts`
5. **通知** — 委派給 `notifications.ts`（平行發送）

---

## 二、公開 API

```ts
class LeadCapture {
  async captureLead(input: LeadInput): Promise<CaptureResult>
}
```

### `LeadInput`

```ts
{
  name: string;                // 必填
  email: string;               // 必填
  source: LeadSource;          // 必填（見下表）
  phone?: string;
  company?: string;
  jobTitle?: string;
  websiteUrl?: string;
  message?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}
```

### `LeadSource` 列舉

| 值 | 意義 | 基礎分數 |
|----|------|---------|
| `brand_ai_audit` | 從 AI 審計工具跳來 | +30 |
| `referral` | 朋友介紹 / 轉介 | +35 |
| `linkedin` | LinkedIn 私訊 / 貼文點進來 | +25 |
| `landing_page` | 行銷登陸頁 | +20 |
| `website_form` | 官網表單 | +15 |
| `line_community` | Line 社群內部填單 | +10 |
| `other` | 其他 | +5 |

### `CaptureResult`

```ts
{
  success: boolean;
  lead?: Lead;                 // 成功時有
  duplicate: boolean;          // 24h 內重複送同 email / HubSpot 已存在
  errors: string[];
  crmSynced: boolean;
  notificationsSent: {
    internalEmail: boolean;
    welcomeEmail: boolean;
    slack: boolean;
  };
}
```

---

## 三、完整流程圖

```
captureLead(input)
    │
    ▼
┌──────────────────┐
│ 1. validateLead  │── invalid ──→ return { success: false, errors }
└──────┬───────────┘
       │ valid
       ▼
┌──────────────────┐
│ 2. scoreLead     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 3. localDupCheck │── 24h 內同 email：duplicate=true
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 4. HubSpot upsert│── search → PATCH / POST
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 5. Notify All    │── Promise.all([internal, welcome, slack])
│    （若 !duplicate）│
└──────┬───────────┘
       ▼
  return CaptureResult
```

---

## 四、HTTP 端點

在 [src/api/routes.ts](../src/api/routes.ts) 中：

```ts
router.post('/capture-lead', async (req, res) => {
  const result = await leadCapture.captureLead(req.body);
  if (!result.success) return res.status(400).json(result);
  res.status(result.duplicate ? 200 : 201).json(result);
});
```

| 狀態碼 | 情境 |
|-------|------|
| 201 | 新 Lead 成功建立 |
| 200 | Lead 有效但重複（24h 內已登記） |
| 400 | 驗證失敗（看 `errors[]`） |
| 500 | 未預期錯誤 |

---

## 五、實戰範例

### 高分 B2B Lead

```bash
curl -X POST http://localhost:3000/api/capture-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dana Lee",
    "email": "dana@enterprise.co",
    "phone": "+886912345678",
    "company": "Enterprise Co",
    "jobTitle": "CMO",
    "websiteUrl": "https://enterprise.co",
    "source": "referral",
    "message": "我們想為旗下三個子品牌跑 BrandOS 審計。"
  }'
```

**回應：** `score: 100, tier: hot` → HubSpot 標 `OPEN_DEAL`，Slack 立即推播。

### 冷 Lead（免費信箱 + 無公司資訊）

```bash
curl -X POST http://localhost:3000/api/capture-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Eve",
    "email": "eve@gmail.com",
    "source": "other"
  }'
```

**回應：** `score: 10, tier: cold` → HubSpot 標 `NEW`，仍發歡迎信（含 Line 社群 CTA）。

### 拋棄式信箱拒絕

```bash
curl -X POST http://localhost:3000/api/capture-lead \
  -H "Content-Type: application/json" \
  -d '{"name":"x","email":"abc@mailinator.com","source":"other"}'
```

**回應：** `400` + `errors: ["Disposable email addresses are not accepted"]`

---

## 六、為什麼這樣設計

- **編排器薄、依賴注入少**：`LeadCapture` 只做流程，每個子模組都可以單獨測（見 `tests/leadCapture.test.ts`）。
- **HubSpot 失敗不阻斷通知**：即使 CRM 連不上，客戶還是會收到歡迎信。HubSpot 錯誤只寫入 console。
- **24h 本地去重是雙保險**：就算 HubSpot 查詢延遲，同一人連按兩下送出也不會重複通知。
- **通知平行**：`Promise.all` 同時打三個 channel，整體延遲取最慢那一個。
