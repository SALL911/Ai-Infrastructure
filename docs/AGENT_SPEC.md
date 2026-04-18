# Symcio Agent — Vercel AI SDK × Composio

最小可賣版本。一句話：**使用者輸入品牌名 → agent 產報告 → 寄到使用者信箱 → 同時存 Notion。**

## 資料流

```
 landing form (FreeScanForm)
     │   POST /api/agent { brand_name, email, ... }
     ▼
 ┌──────────────────────────────────────────────┐
 │  /api/agent (web/landing/app/api/agent)      │
 │                                              │
 │  1. generateFakeReport(brand_name)           │  ← lib/agent/fake-data.ts
 │  2. enrichSummary(report) via Gemini         │  ← lib/agent/summary.ts
 │     （GEMINI_API_KEY 無 → 跳過）             │
 │  3. Supabase.insert(leads)                   │
 │  4. Composio → NOTION_INSERT_ROW_DATABASE    │  ← lib/agent/composio.ts
 │  5. Composio → GMAIL_SEND_EMAIL (HTML)       │
 │                                              │
 │  return { ok, report, delivery, warnings }   │
 └──────────────────────────────────────────────┘
```

任一 3/4/5 失敗都不會擋回應——`warnings[]` 告訴你哪個沒接通。

## 為什麼用假資料

1. **速度**：Free Scan 要秒回，不能讓使用者等四引擎跑完（真跑 30s+）
2. **成本**：真掃描在 GitHub Actions `geo-audit.yml` 每日跑，付費客戶才觸發
3. **可展示**：fake 資料對同一 brand 輸出一致（hash seed），demo / 截圖重複可用
4. **易驗證**：`curl` 打 `/api/agent` 立刻看完整 payload，不依賴外部服務

真掃描的升級路徑已備好：把 `generateFakeReport(...)` 換成 `scripts/geo_audit.py` 的 JSON 輸出即可。

## 檔案結構

```
web/landing/
├── app/api/
│   ├── agent/route.ts         ← 新：主 agent
│   └── scan/route.ts          ← 舊：純 lead 存 Supabase（保留備援）
├── lib/agent/
│   ├── fake-data.ts           ← 確定性假資料產生器
│   ├── summary.ts             ← Vercel AI SDK × Gemini 2 句摘要
│   ├── email-template.ts      ← HTML 信件（Bloomberg Terminal 風）
│   └── composio.ts            ← Composio v3 REST wrapper
└── components/FreeScanForm.tsx ← 改打 /api/agent
```

## 部署環境變數（Vercel Project Settings）

### 必要
| Key | 來源 | 用途 |
|-----|------|------|
| `SUPABASE_URL` | Supabase API 頁 | leads 表寫入 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API 頁 | 同上 |

### 啟用 Composio 自動化（雙方都要，否則 warnings 會出現）
| Key | 來源 |
|-----|------|
| `COMPOSIO_API_KEY` | composio.dev → Settings → Personal API Tokens |
| `COMPOSIO_USER_ID` | composio.dev → Settings → User ID |
| `COMPOSIO_GMAIL_CONNECTION_ID` | composio.dev → Integrations → Gmail → Connection ID（若多個連線必填）|
| `COMPOSIO_NOTION_CONNECTION_ID` | 同上 |
| `COMPOSIO_NOTION_LEAD_DB_ID` | 你的 Notion lead database ID（32 字元）|

### 啟用 AI 摘要（選）
| Key | 來源 |
|-----|------|
| `GEMINI_API_KEY` | aistudio.google.com（免費）|

沒設也沒差——會 fallback 到確定性模板摘要。

## Notion Lead Database Schema

在你的 Notion workspace 建 database，含以下欄位（必須精確命名）：

| Property | Type |
|----------|------|
| Brand | Title |
| Email | Email |
| Company | Rich text |
| Industry | Select（選項：technology / finance / consumer_goods / default）|
| Composite Score | Number |
| Source | Select |
| Status | Select（選項：New / Contacted / Qualified / Lost）|

把這個 database 授權給 Composio Notion integration，然後複製 database ID 到 `COMPOSIO_NOTION_LEAD_DB_ID`。

## 測試（本機 / 部署後）

```bash
# 沒 Composio / Supabase 也能跑，會 degrade 成純 JSON 回應
curl -X POST https://symcio.tw/api/agent \
  -H "Content-Type: application/json" \
  -d '{"brand_name":"Nike","email":"you@test.com","industry":"consumer_goods"}' | jq
```

預期回應：
```json
{
  "ok": true,
  "report": { "brand": "Nike", "composite_score": 46, "band": "Emerging", ... },
  "delivery": { "supabase": true, "notion": true, "gmail": true },
  "warnings": []
}
```

若某個整合沒接：`delivery.X=false` + `warnings[]` 內有訊息，但整體 `ok=true`。

## 升級到真資料（Phase 2）

1. 在 `/api/agent` 後面加 `queue_real_scan(brand)`：把 brand 塞進 Supabase `visibility_queue` 表
2. `.github/workflows/geo-audit.yml` 改成每 10 分鐘掃描該 queue，逐筆跑真正四引擎測試
3. 跑完寫 `visibility_results` + 寄第二封 email（升級版 $299 預覽）

## 升級到全自動 agent（Phase 3）

把 `/api/agent` 改為 Vercel AI SDK 的 full agent pattern：

```ts
const result = await generateText({
  model: google('gemini-1.5-pro'),
  tools: {
    run_ai_visibility_scan: tool({ ... }),
    send_report_email: tool({ ... }),
    save_to_notion: tool({ ... }),
    schedule_follow_up: tool({ ... }),
  },
  prompt: `Process new Free Scan lead: ${JSON.stringify(payload)}`,
  maxSteps: 10,
});
```

好處：邏輯分支（hot lead 立刻寄、cold lead 排隊、重複 email 去重）用自然語言規則描述，不再寫 if/else。
代價：非確定性、除錯難、成本上來。

先賣錢、再升級。
