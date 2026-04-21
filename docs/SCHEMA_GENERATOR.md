# Schema + Wikidata 生成器 — 產品與遷移說明

## WHY

Symcio 原本有一個獨立部署在 `sall911.github.io/symcio/` 的策略用 GitHub Pages 網頁，用途是「填入品牌資料 → 自動生成 Schema + Wikidata」。問題：
- 頁面已長期沒有內容，流量與轉換歸零。
- 文案出現「整個流程零成本、零程式」——與 Symcio 專業 B2B 語氣衝突，且 CLAUDE.md 第六條明禁空洞詞彙。
- 該頁是孤兒：沒有接任何獲客管線（沒寫 Supabase `leads`、沒進 Notion、沒觸發 Free Scan）。

所以不是「改文案」而已，而是**把這個工具搬回 Symcio 主站**並接上現有的獲客獲客管線（lead → Supabase → Notion → Gmail → Free Scan），讓每一次有人用工具都變成一筆 lead。

## WHAT

- 新路由：**`/schema-generator`**（canonical URL：`https://symcio.tw/schema-generator`）
- 新元件：`web/landing/components/SchemaWikidataGenerator.tsx`（client，即時預覽）
- 新 lib：`web/landing/lib/schema/generator.ts`（純函式，無 I/O，可單測）
- 新 API：`web/landing/app/api/schema/route.ts`（server，寫 Supabase + Notion + Gmail）
- 首頁 Hero 新增 CTA 連向 `/schema-generator`
- `sitemap.xml` 加入新路徑

## HOW：資料流

```
使用者填表（品牌名稱 + email 必填）
        ↓
即時預覽（純 client，不 call API）
  ├─ schema.org JSON-LD
  └─ Wikidata QuickStatements v1
        ↓
點「寄給我 + 加入 Free Scan 排程」
        ↓
POST /api/schema
        ↓
  ┌─ Supabase `leads` INSERT（source='schema-generator'）
  ├─ Supabase `brands` UPSERT（status='prospect'）
  ├─ Composio → Notion 資料庫（品牌 CRM 草稿）
  └─ Composio → Gmail 寄 JSON-LD + QuickStatements 給使用者
        ↓
  （下一班 cron）`geo-audit.yml` 把這些新 brands 跑一輪四引擎曝光
        ↓
  24 小時內寄第二封：Free Scan 結果
```

## 與 9.3 獲客路線圖的對應

| 路線圖階段 | 本工具的角色 |
|-----------|------------|
| P0 Notion/GitHub/Supabase 同步 | 寫 `leads`、`brands` 兩張表，觸發現有 Notion sync |
| P1 GEO 每日 cron | schema-generator 送出的品牌會被下一班 geo-audit 自動掃描 |
| P1 Lead → HubSpot via Composio | `source='schema-generator'` 的 lead 被 Composio workflow 同步到 HubSpot |
| P2 Lead scoring | Lead scorer 可把「用過工具 + 拿到 Wikidata QID」視為高意圖訊號 |

## Schema 輸出設計決策

- `@type` 預設 `Organization`，允許升級為 `Corporation` / `LocalBusiness` / `NGO` 等 schema.org 標準類型。
- `slogan` 承載「AI 可見度宣告」——schema.org 沒給 AI 可見度專屬欄位，`slogan` 是最接近且驗證器接受的語意槽。
- `sameAs` 若有 Wikidata QID 會自動在最前面加 `https://www.wikidata.org/entity/Qxxx`，這是 Google KG 最重視的實體解析錨。
- QuickStatements 國家欄位（P17）留註解而非硬塞 ISO，因為 Wikidata 只認 Q item；直接塞字串會讓整個 batch 被拒。

## 遷移：舊的 `sall911.github.io/symcio/` 怎麼處理

此次 commit **不修**外部 `sall911/symcio` 倉庫（Claude Code 的 MCP scope 只限於 `sall911/brandos-infrastructure`）。請手動完成三件事：

1. 在 `sall911/symcio` 倉庫根目錄的 `index.html` 加 meta redirect：
   ```html
   <meta http-equiv="refresh" content="0; url=https://symcio.tw/schema-generator">
   <link rel="canonical" href="https://symcio.tw/schema-generator">
   ```
2. 把 repo description 改成「Moved to https://symcio.tw/schema-generator」。
3. （可選）把 `sall911/symcio` archive，避免未來意外 push 舊版。

## 部署

這份程式碼跟 `web/landing` 其他部分共用 Vercel project。push 到 `main`（或 preview 到 feature branch）即部署，毋需額外 workflow。

需要的環境變數（寫在 Vercel project settings，參考 `web/landing/.env.example`）：
- `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
- `COMPOSIO_API_KEY`、`COMPOSIO_USER_ID`
- `COMPOSIO_NOTION_LEAD_DB_ID`、`COMPOSIO_NOTION_CONNECTION_ID`
- `COMPOSIO_GMAIL_CONNECTION_ID`

任何一個沒設，API 會 degrade 而不爆——使用者仍能拿到即時預覽，後端寫入會記在 `warnings`。

## 本地測試

```bash
cd web/landing
npm install
npm run type-check
npm run dev
# 開 http://localhost:3000/schema-generator
```
