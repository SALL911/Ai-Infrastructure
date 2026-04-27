# BrandOS AI Orchestrator — 本機開發環境設定

- 對應 repo 路徑：`apps/orchestrator/`
- 對應分支：`claude/import-orchestrator`（程式碼來源）/ `claude/setup-orchestrator-env-ZdRJK`（本文件）
- 相關文件：`apps/orchestrator/README.md`（架構）/ `apps/orchestrator/DEPLOY.md`（Vercel 部署）

---

## 一、為什麼需要這份文件（WHY）

`apps/orchestrator/` 從 Replit 搬進 repo 後，第一次 clone 下來的人會卡在三個地方：

1. `pnpm-workspace.yaml` 不在 repo 根目錄，而在 `apps/orchestrator/`，從根目錄跑 `pnpm install` 找不到 workspace
2. `package.json` 的 `preinstall` 用 `sh -c`，Windows native PowerShell（沒裝 Git Bash）會直接報錯
3. `DATABASE_URL` 必須是真的可連線的 Postgres，第一次跑 `pnpm --filter @workspace/db push` 才不會 hang

`README.md` 給的是「what is this」，`DEPLOY.md` 給的是「Vercel 上線流程」。本文件補上「**第一次 clone 到能在本機跑起來**」這段空白。

---

## 二、需要準備什麼（WHAT）

| 項目 | 版本 / 來源 | 用途 |
|------|------------|------|
| Node.js | LTS（≥ 20，建議 24） | 跑 pnpm / Vite / Express |
| pnpm | 透過 corepack 啟用 | workspace 套件管理 |
| Git | 任何近期版本 | clone repo |
| Postgres 連線字串 | Supabase 專案（建議獨立 project，避免和 Symcio 主資料庫表名衝突）| Drizzle schema push 目標 |
| Git Bash（Windows 限定） | Git for Windows 內建 | 提供 `sh`，給 `preinstall` 用 |

不需要：Docker、本機 Postgres（Supabase 雲端就夠了）、Vercel CLI（部署前才要）。

---

## 三、設定步驟（HOW）

# 第一次跑，先裝 pnpm（只要做一次）
corepack enable
corepack prepare pnpm@latest --activate

# 切到你 clone 下來的 repo（路徑換成你電腦上實際的）
Set-Location C:\path\to\BrandOS-Infrastructure

# 拉最新 + 切到有 orchestrator 程式碼的分支
git fetch origin
git checkout claude/setup-orchestrator-env-ZdRJK
git pull

# 進到 orchestrator 子目錄
Set-Location apps\orchestrator

# 設 .env
Copy-Item .env.example .env
notepad .env
# ↑ 在 notepad 裡把 DATABASE_URL=postgres://... 那行替換成 Supabase 真實字串，存檔關掉

# 裝套件 + 建表 + seed
pnpm install
pnpm --filter @workspace/db push
pnpm --filter @workspace/api-server run db:seed

---

## 四、常見錯誤對照表

| 錯誤訊息 | 根因 | 修正 |
|---------|------|------|
| `cp: 找不到 '.env.example' 路徑` | 沒有先 `cd apps/orchestrator` | 進到正確目錄再執行 |
| `pnpm: 無法辨識 'pnpm' 詞彙` | 沒裝 pnpm（或 corepack 沒 enable）| 跑 `corepack enable && corepack prepare pnpm@latest --activate` |
| `Use pnpm instead` | 用了 npm 或 yarn | 改用 `pnpm install` |
| `sh: command not found`（Windows）| Git for Windows 沒裝或不在 PATH | 重灌 Git for Windows，勾選 "Use Git from the Windows Command Prompt" |
| `pnpm install` 找不到 workspace | 在 repo 根目錄執行 | 必須在 `apps/orchestrator/` 執行 |
| `pnpm --filter @workspace/db push` 連線失敗 | `DATABASE_URL` 拼錯或 Supabase project 還沒 provision 完成 | 拿 `psql "$DATABASE_URL"` 先驗證連線 |
| `relation "taiwan_brands" does not exist` | 跳過了 3.6，直接跑 seed | 先 `pnpm --filter @workspace/db push` 再 seed |
| Dashboard 排行榜空白 | 跳過了 3.7 seed | 跑 `pnpm --filter @workspace/api-server run db:seed` |

---

## 五、與其他文件的對應

| 文件 | 範圍 |
|------|------|
| `apps/orchestrator/README.md` | 程式架構、stack、目錄結構、migration plan |
| `apps/orchestrator/DEPLOY.md` | Vercel 部署、`orchestrator.symcio.tw` 網域接線 |
| **本文件** | **第一次 clone 到本機 dev server 跑起來** |
| `database/schema.md` | Symcio 主資料庫 schema（與 orchestrator 平行，不重疊）|

---

## 六、安全與資料邊界

依 CLAUDE.md 第六、八節：

- 不得把 `DATABASE_URL` 或任何 Supabase service role key 提交進 repo
- 不得把不同客戶的 ESG 數據塞進 orchestrator 的 `taiwan_brands`（這張表只放 30 檔上市公司公開資料）
- 不得在 Supabase Studio 手動改 schema——必須走 `lib/db/src/schema/*.ts` + `pnpm --filter @workspace/db push` migration
