# BrandOS Infrastructure — System Architecture

## 一、設計哲學（WHY）

BrandOS Infrastructure 的目標是讓 Symcio 團隊與 AI 代理（Claude、Claude Code、Manus、Windsurf、Cursor 等）能在**同一個知識座標系**協作，而不是每個工具各自維護一份資料。

核心原則：
1. **單一真相來源（SSoT）**：GitHub repo + Supabase = 所有資料的正式出處
2. **人類編輯一處、AI 讀取多處**：人類在 Notion 編輯，AI 從 repo / Supabase 讀
3. **可追溯、可回滾**：所有改動都有 git history 或 migration 紀錄
4. **商業化是一級模組**：MVP 從第一天就能產生營收

## 二、「主機」的定義（WHAT）

本專案沒有單一實體主機。「主機」= **GitHub repo（程式碼/文件）+ Supabase（動態資料）** 兩層組合。

| 層 | 位置 | 存放內容 |
|----|------|----------|
| L0 不落地 | GitHub Secrets / Supabase Vault | API keys, DB password |
| L1 程式碼與文件 | GitHub `SALL911/BrandOS-Infrastructure` | schema, migration, workflow, docs |
| L2 結構化資料 | Supabase (PostgreSQL) | brands, leads, knowledge_nodes, geo_content |
| L3 人類協作草稿 | Notion | brief, 會議紀錄, CRM 草稿 |
| L4 機器代理 | Claude Code / Manus / Windsurf | 讀 L1+L2，寫 L1（透過 PR） |
| L5 展示層 | Vercel / Cloudflare Pages（待建） | 官網、客戶 dashboard |

## 三、七工具 + 展示層資料流

```
                        ┌──────────────────┐
                        │   Notion         │ L3 人類編輯
                        │  (BrandOS Claude) │
                        └────────┬─────────┘
                                 │ Internal Integration
                                 │ + cron (notion-sync.yml)
                                 ▼
┌────────────┐          ┌──────────────────┐          ┌─────────────┐
│  VS Code   │─ git ──▶│                  │◀── read ─│  claude.ai  │
│  Windsurf  │         │  GitHub Repo     │          │  + Notion   │
│  Manus     │─ git ──▶│  (SSoT, L1)      │          │    MCP      │
│  GitHub    │         │                  │          └─────────────┘
│  Desktop   │         └────────┬─────────┘
└────────────┘                  │ GitHub Actions
                                │ (supabase-deploy.yml)
                                ▼
┌────────────┐          ┌──────────────────┐          ┌─────────────┐
│ Claude     │─ write ─▶│   Supabase       │◀── read ─│  MVP Web   │
│  Code      │          │   (PostgreSQL,   │          │   App (L5)  │
│            │─ read ──▶│    L2)           │─ serve ─▶│  Vercel    │
└────────────┘          └──────────────────┘          └─────────────┘
                                 ▲
                                 │ REST / Edge Function
                                 │
                        ┌────────┴─────────┐
                        │  Leads / Orders  │  客戶填表進入
                        │  Landing Page    │
                        └──────────────────┘
```

## 四、七大模組對應 MVP 服務

| Schema 層 | 模組 | MVP 用途 |
|-----------|------|---------|
| Layer 1 | Brand Profiles | 客戶基本資料收集表單 |
| Layer 2 | GEO Visibility | **核心賣點**：每日測試客戶品牌在 AI 搜尋的可見度 |
| Layer 3 | ESG Intelligence | 加值服務（Phase 2） |
| Layer 4 | AI Knowledge | 內部 Symcio 知識庫 |
| Layer 5 | AI Training | 累積訓練資料（長期護城河） |
| Layer 6 | Automation | GEO audit / lead scoring cron |
| Layer 7 | Monetization | **收錢**：orders, subscriptions, leads |

## 五、自動化代理分工

| 代理 | 優先級 | 觸發 | 產出 |
|------|-------|------|------|
| `notion-sync.yml` | P0 | 每日 09:00 TW | Notion → `docs/notion-sync/` 的 PR |
| `geo-audit.yml` | P1 | 每日 02:00 TW | 測 AI 引擎可見度 → `visibility_results` |
| `lead-scorer` | P2 | 新 lead 進入觸發 | 讀 `leads` → Claude API 評分 → 更新 |
| `publisher` | P3 | 手動觸發 | 審核後 `geo_content` → 發布到 LinkedIn / 部落格 |

## 六、安全邊界

- **L0 絕不進 repo**：所有 API keys、DB password 走 GitHub Secrets / Supabase Vault
- **RLS 預設啟用**：Supabase 所有 table 預設啟用 Row Level Security
- **敏感欄位不得放 seed.sql**：真實客戶 ESG / 財務數據只進正式 Supabase
- **Notion → repo 單向**：不允許任何反向寫入，避免人類編輯被機器覆蓋

## 七、延伸閱讀

- `docs/FREE_STACK.md` — 免費平台推薦與優先順序
- `docs/MVP_SPEC.md` — AI Visibility + Brand Score MVP 服務規格
- `docs/MORNING_CHECKLIST.md` — 啟用檢查清單（含待辦）
- `docs/supabase-setup.md` — Supabase 連線與部署細節
- `database/schema.md` — 完整七層 schema 設計
- `CLAUDE.md` — AI 協作指令與工具分工規範
