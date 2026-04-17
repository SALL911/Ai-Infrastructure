# 🔗 04 — HubSpot CRM 整合

> 把驗證完、打分完的 Lead 寫入 HubSpot Contacts，並自動做去重（update vs create）。

**原始碼：** [src/modules/lead-capture/hubspotClient.ts](../src/modules/lead-capture/hubspotClient.ts)

---

## 一、設計原則

1. **零額外依賴** — 用原生 `fetch`（Node 18+）打 HubSpot REST API，不用 `@hubspot/api-client` SDK（減少 package size）。
2. **Upsert 而非 Create** — 每筆都先 search，有就 PATCH、沒有就 POST，**不會產生重複 contact**。
3. **Graceful degrade** — 沒設 `HUBSPOT_ACCESS_TOKEN` 就整個停用，不噴錯、不阻斷通知流程。
4. **失敗不阻斷** — HubSpot 掛了，歡迎信和 Slack 通知照常發。

---

## 二、取得 HubSpot Private App Token

1. 登入 HubSpot → 右上角齒輪 **Settings**
2. 左側選單 **Integrations → Private Apps**
3. 點 **Create a private app**
4. **Basic info** 填名稱：`Symcio Lead Capture`
5. **Scopes** 勾：
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
6. 點 **Create app** → 複製 **Access token**（`pat-na1-xxxxxxxx`）
7. 貼到 `.env`：
   ```env
   HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx
   ```

---

## 三、自訂 Contact Properties（**必做**）

這個模組會寫入兩個**非預設**欄位。要先在 HubSpot 建好：

### 設定路徑
Settings → Properties → Contact properties → **Create property**

| Label | Internal name | Field type | 用途 |
|-------|---------------|------------|------|
| Symcio Lead Score | `symcio_lead_score` | Number | 0–100 分數 |
| Symcio Lead Source | `symcio_lead_source` | Single-line text | 來源標籤（brand_ai_audit 等） |

沒建這兩個欄位的話，PATCH / POST 會回 400 錯誤（property 不存在）。

---

## 四、流程

```
upsertContact(lead)
    │
    ▼
┌─────────────────────────────┐
│ findContactByEmail(email)   │  POST /crm/v3/objects/contacts/search
│                             │  filter: email EQ xxx@xxx.com
└──────┬──────────────────────┘
       │
    有 id  ?
   ┌───┴───┐
   │       │
  是       否
   │       │
   ▼       ▼
PATCH    POST
/id      /contacts
（更新） （新建）
   │       │
   └───┬───┘
       ▼
 { success, contactId, duplicate }
```

---

## 五、寫入的欄位對照

| Symcio Lead 欄位 | HubSpot property |
|-----------------|------------------|
| `name` → 拆 firstname / lastname | `firstname`, `lastname` |
| `email` | `email` |
| `phone` | `phone` |
| `company` | `company` |
| `jobTitle` | `jobtitle` |
| `websiteUrl` | `website` |
| `message` | `message` |
| `utm.source` | `hs_analytics_source` |
| `score` | `symcio_lead_score` ⚠️ 自訂 |
| `source` | `symcio_lead_source` ⚠️ 自訂 |
| 依分數 | `hs_lead_status`（OPEN_DEAL / IN_PROGRESS / NEW） |

---

## 六、公開 API

```ts
class HubSpotClient {
  constructor(token: string | undefined);
  isEnabled(): boolean;
  findContactByEmail(email: string): Promise<string | null>;
  upsertContact(lead: Lead): Promise<HubSpotSyncResult>;
}

type HubSpotSyncResult = {
  success: boolean;
  contactId?: string;
  duplicate: boolean;     // true 代表這是 update 而非 create
  error?: string;
};
```

---

## 七、錯誤處理

所有 HubSpot 呼叫都包在 try/catch，失敗時：

- 回傳 `{ success: false, error: "..." }`
- 主流程 `capture.ts` 收到後**不 throw**，只 `console.error`
- `CaptureResult.crmSynced = false`，其他流程繼續

**原因：** CRM 是「錦上添花」，核心是 Lead 捕獲本身；絕不能因為 HubSpot 掛了就讓客戶以為表單壞掉。

---

## 八、進階（還沒做）

- ⏳ **自動創建 Deal** — score ≥ 70 的 hot lead 自動在 HubSpot 建 Deal，進入 pipeline
- ⏳ **Company 物件關聯** — 從 email 網域查公司，做 Contact ↔ Company 關聯
- ⏳ **Engagement log** — 把 Symcio 寄出的歡迎信寫成 HubSpot Engagement（CRM 裡看得到溝通歷程）
- ⏳ **Retry with backoff** — HubSpot 偶爾 429 rate limit，加指數退避重試

---

## 九、手動測試

```bash
# 啟動 server
npm start

# 送一筆 lead
curl -X POST http://localhost:3000/api/capture-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@yourdomain.com",
    "source": "referral",
    "company": "Test Co"
  }'
```

**檢查：**
1. 回應 `crmSynced: true`
2. 登入 HubSpot → Contacts → 找到 "Test User" → 確認 `symcio_lead_score` 和 `symcio_lead_source` 已寫入
3. 再送一次同樣 email → 回應 `duplicate: true`，HubSpot 裡只有一筆（沒有第二筆）
