# Make.com Scenario — Symcio Daily Brand Valuation Broadcast

> 等效於 `automations/n8n/bci-daily-broadcast.json`，但跑在 Make.com。
> 若你用 Make 而非 n8n，照這份藍圖建立 scenario。

## Scenario 圖

```
[Schedule]      每日 09:00 台北（UTC 01:00）
     ↓
[HTTP GET]      https://symcio.tw/api/bci/Symcio
     ↓
[Set Variable]  建構 broadcast payload（kind/title/body/channels）
     ↓
[HTTP POST]     https://symcio.tw/api/publish/broadcast
                headers: Authorization: Bearer {{BROADCAST_SECRET}}
     ↓ (result.results.linkedin.text / .x.text / .facebook.text)
     ├─→ [LinkedIn: Create Share]    (使用 result.linkedin.text)
     ├─→ [X/Twitter: Create Tweet]   (使用 result.x.text)
     ├─→ [Facebook Page: Create Post](使用 result.facebook.text)
     └─→ [Threads: Create Post]      (使用 result.threads.text)
```

## 詳細步驟

### 1. Trigger — Schedule

Make → Create a new scenario → Add module → **Tools → Sleep** 旁邊的 Schedule trigger。

- Run on：`Every day`
- At：`01:00 UTC`（= 台北 09:00）

### 2. HTTP · Make a request — 取得當日 BCI

- URL：`https://symcio.tw/api/bci/Symcio`
- Method：`GET`
- Parse response：`Yes`
- 把輸出的 `total_bci` / `updated_at` 拉進後續步驟的變數

（若 `Symcio` 這個品牌在 Supabase `brands` 表還沒建立，這步會回 404。先手動建一筆。）

### 3. Tools · Set multiple variables — 組 payload

建立以下變數（全部字串）：

| 變數 | 值 |
|------|---|
| `title` | `{{formatDate(now; "YYYY-MM-DD")}} · Symcio BCI 每日更新` |
| `body_short` | `Symcio Brand Capital Index 今日 {{2.total_bci}}/100。依循 ISO 10668 + TNFD + 跨四引擎 AI 可見度。` |
| `body_medium` | `{{body_short}}\n\n三軸拆解：Financial · Visibility · Engagement。公式公開、權重閉源。` |
| `payload_json` | 見下方完整 JSON |

`payload_json` 完整內容：
```json
{
  "kind": "daily_brand_valuation",
  "title": "{{title}}",
  "body_short": "{{body_short}}",
  "body_medium": "{{body_medium}}",
  "link_path": "/about",
  "tags": ["BCI", "品牌估值", "ESG", "AI可見度"],
  "channels": ["discord", "linkedin", "x", "threads", "facebook", "instagram"],
  "campaign": "daily_bci_{{formatDate(now; 'YYYY-MM-DD')}}"
}
```

### 4. HTTP · Make a request — 呼叫 broadcast API

- URL：`https://symcio.tw/api/publish/broadcast`
- Method：`POST`
- Headers：
  - `Authorization`: `Bearer {{BROADCAST_SECRET}}`（把 `BROADCAST_SECRET` 先存在 Make 的 **Data Store** 或 **Connection**）
  - `Content-Type`: `application/json`
- Request content：`{{payload_json}}`
- Parse response：`Yes`

回傳結構：
```json
{
  "ok": true,
  "campaign": "daily_bci_2026-04-22",
  "results": {
    "discord": { "posted": true },
    "linkedin": { "ready": true, "text": "...", "link": "..." },
    "x":        { "ready": true, "text": "...", "link": "..." },
    "threads":  { "ready": true, "text": "...", "link": "..." },
    "facebook": { "ready": true, "text": "...", "link": "..." },
    "instagram":{ "ready": true, "text": "...", "link": "..." }
  }
}
```

`discord` 已自動發。其餘 channel 需 Make 這邊分別發。

### 5. LinkedIn · Create a Share

- Person / Organization：Symcio LinkedIn page
- Content text：`{{4.results.linkedin.text}}`
- Link：`{{4.results.linkedin.link}}`

### 6. X / Twitter · Create a Tweet

- Text：`{{4.results.x.text}}`（280 字內，broadcast API 已做 clamp）

### 7. Facebook Pages · Create a Post

- Page：Symcio
- Message：`{{4.results.facebook.text}}`
- Link：`{{4.results.facebook.link}}`

### 8. Threads · Create a Post（若 Make 有 connector）

- Text：`{{4.results.threads.text}}`

### 9. Instagram（受限制）

Instagram Business API 只支援「發圖 / 影片」為主。**純文字發不了**。做法：

- 設計一張以 `title` 為主視覺的圖（用 Bannerbear / Canva / Placid 都行）
- Caption 用 `{{4.results.instagram.text}}`（已包含 tags）
- Make Instagram Business 模組會吃圖 URL + caption

## 錯誤處理

在每個發送 step 右鍵 → **Add error handler** → **Ignore** 或 **Resume**。
任一平台失敗，不要擋住其他平台。

把錯誤累積寄 email 到 `info@symcio.tw` 做每週 review。

## 費用

- Make.com Core 方案 10,000 ops/月 = $9/月
- 每天 1 scenario × 9 步驟 = 9 ops × 30 日 = 270 ops/月
- 綽綽有餘，同時可以同時跑 SDG1、BCI、Newsletter 等多個 scenario

## 為什麼不用 Zapier

- Zapier 的 webhook 傳輸量對 JSON payload 有限制（text-based，不好帶結構化）
- Make.com 更貼合資料加工（module-to-module variable passing）
- Zapier 每一個 step 都算 task，成本快速上升
- n8n 自建更便宜但需要 server — Make.com 是中庸選擇

## 替代：全部用 n8n

若不想另外付 Make.com 費用，完整用 n8n：
- `automations/n8n/bci-daily-broadcast.json` — 每日 BCI 廣播
- `automations/n8n/sdg1-news-digest.json` — 每週 SDG1 摘要
- 自建 n8n（Docker + Cloudflare Tunnel）完全免費
- 詳見 `docs/N8N_MAKE_AUTOMATION.md`
