# Supabase 連線與 CI/CD 設定指南

## WHY：為什麼需要這份文件

BrandOS Infrastructure 的七層資料架構（見 `database/schema.md`）需落實為可版本化、可部署、可回復的正式 PostgreSQL 實例。Supabase 提供托管 Postgres + Row Level Security + 即時 API，是 Symcio 現階段最符合成本效益的選擇。

本文件記錄：
- Supabase 專案初始化流程
- Migration 與 CI/CD 自動化
- GitHub Actions 所需 Secrets 設定

---

## WHAT：交付內容

| 檔案 | 用途 |
|------|------|
| `supabase/migrations/20260417000000_initial_schema.sql` | 七層架構初始 DDL |
| `supabase/config.toml` | Supabase CLI 本機開發設定 |
| `supabase/seed.sql` | 本機測試用種子資料（禁止放真實客戶資料） |
| `.env.example` | 環境變數範本 |
| `.github/workflows/supabase-ci.yml` | PR / push 觸發：啟動 ephemeral Postgres 驗證 migration |
| `.github/workflows/supabase-deploy.yml` | 合併至 `main` 後，將 migration 推送至 Supabase |

---

## HOW：操作步驟

### 1. 建立 Supabase 專案

1. 登入 [supabase.com](https://supabase.com)，使用 Symcio / SALL911 帳號建立 organization。
2. 建立新 project，地區建議選 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`。
3. 記下：
   - `Project ref`（URL 中的 `xxxx.supabase.co` 的 `xxxx`）
   - `Database password`（建立時設定）
   - `anon key` 與 `service_role key`（Settings → API）

### 2. 本機開發環境

```bash
# 安裝 Supabase CLI（macOS）
brew install supabase/tap/supabase

# 複製環境變數範本
cp .env.example .env.local
# 編輯 .env.local 填入實際值

# 啟動本機 Supabase（Docker）
supabase start

# 套用 migration
supabase db reset
```

### 3. 綁定遠端專案

```bash
export SUPABASE_ACCESS_TOKEN=<personal-access-token>
supabase link --project-ref <project-ref>

# 將本地 migration 推送至遠端（首次部署）
supabase db push
```

### 4. 設定 GitHub Secrets

Repository → Settings → Secrets and variables → Actions，新增：

| Secret 名稱 | 取得方式 |
|-------------|---------|
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_PROJECT_REF`  | Project URL 中的 ref |
| `SUPABASE_DB_PASSWORD`  | 建立 project 時設定的密碼 |

另需在 Settings → Environments 建立 `production` environment，可加上 required reviewers 以在 deploy 前人工審核。

### 5. CI/CD 行為說明

**`supabase-ci.yml`**（PR 自動執行）
- 啟動 Postgres 15 service
- 依序套用 `supabase/migrations/*.sql`
- 驗證 19 張核心表格皆建立成功
- 掃描是否有誤提交的 `.env` 或 JWT token

**`supabase-deploy.yml`**（push 至 `main` 或手動觸發）
- 使用 Supabase CLI `db push` 推送 migration
- 綁定 `production` environment，受 required reviewers 保護
- 手動觸發需輸入 `deploy` 字串確認

---

## 新增 Migration 流程

```bash
# 1. 建立新 migration
supabase migration new add_new_table

# 2. 編輯產生的 SQL 檔案
# supabase/migrations/<timestamp>_add_new_table.sql

# 3. 本機驗證
supabase db reset

# 4. 開 PR → 等 supabase-ci 綠燈 → 合併 main
# 5. supabase-deploy 自動推送至正式環境
```

---

## 安全檢查清單

- [ ] `.env.local` 絕不進 Git（`.gitignore` 已排除）
- [ ] `service_role key` 僅用於 server-side，絕不暴露於前端
- [ ] 所有 table 預設啟用 RLS，逐表新增 policy 前不可對外開放 `anon` 存取
- [ ] 客戶真實 ESG / 財務數據僅存於正式 Supabase，不得出現在 `seed.sql` 或 repo
- [ ] Deploy workflow 綁定 `production` environment 並啟用 required reviewers

---

## 版本紀錄

| 版本 | 日期 | 變更說明 |
|------|------|---------|
| v1.0 | 2026-04-17 | 初始版本：初始 schema migration + GitHub Actions CI/CD |
