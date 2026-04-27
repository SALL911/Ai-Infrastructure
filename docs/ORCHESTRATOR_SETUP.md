# BrandOS AI Orchestrator — 本機開發環境設定

對應 repo 路徑：`apps/orchestrator/`
對應分支：`claude/import-orchestrator`（程式碼來源）/ `claude/setup-orchestrator-env-ZdRJK`（本文件）
相關文件：`apps/orchestrator/README.md`（架構）/ `apps/orchestrator/DEPLOY.md`（Vercel 部署）

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

### 3.1 安裝 Node + pnpm

```bash
# 1. 從 https://nodejs.org 裝 LTS
node -v   # 應印出 v20.x 或 v24.x

# 2. 啟用 pnpm（Node 18+ 內建 corepack）
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v   # 應印出 9.x 或 10.x
```

**Windows 特別注意**：請用 PowerShell（不是 CMD），且電腦上要有 Git for Windows 提供的 `sh`。安裝 Git for Windows 後，預設會把 `C:\Program Files\Git\usr\bin` 加進 PATH，`sh` 就會可用。可用 `where.exe sh` 驗證。

### 3.2 取得 Supabase Postgres 連線字串

1. 進入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 建立新 project（建議命名 `symcio-orchestrator`，避免和主 Symcio project 混用）
3. Project Settings → Database → Connection string → 選 **URI** 模式
4. 複製格式為 `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres` 的字串

**安全規範**（CLAUDE.md 第八節）：這條字串視同密碼，不可寫進 repo、不可貼到 commit message、不可貼到 PR 描述。只能放 `.env`（gitignored）或 GitHub Secrets。

### 3.3 Clone 與分支切換

```bash
# Linux / macOS
git clone https://github.com/SALL911/BrandOS-Infrastructure.git
cd BrandOS-Infrastructure
git checkout claude/import-orchestrator   # 或已 merge 後的 main
```

```powershell
# Windows PowerShell
git clone https://github.com/SALL911/BrandOS-Infrastructure.git
Set-Location BrandOS-Infrastructure
git checkout claude/import-orchestrator
```

### 3.4 設定 `.env`

```bash
# Linux / macOS
cd apps/orchestrator
cp .env.example .env
${EDITOR:-vi} .env
```

```powershell
# Windows PowerShell（cp 在 PowerShell 是 Copy-Item 的別名，但跨平台可讀性較差，建議直接用 Copy-Item）
Set-Location apps\orchestrator
Copy-Item .env.example .env
notepad .env
```

把 `DATABASE_URL=postgres://user:password@host:5432/orchestrator` 那行替換成 3.2 取得的真實字串。其他變數（`PORT` / `LOG_LEVEL` / `NODE_ENV`）保留預設即可。

### 3.5 安裝套件

```bash
# 必須在 apps/orchestrator/ 目錄下執行（pnpm-workspace.yaml 在這裡）
pnpm install
```

第一次執行約 30-60 秒。完成後會建立 `node_modules/` 與 hoisted 的 workspace symlink。

如果看到 `Use pnpm instead` 錯誤，代表你不小心用了 npm 或 yarn——`preinstall` 腳本擋下了。改用 `pnpm install`。

### 3.6 推送 schema 到 Supabase

```bash
pnpm --filter @workspace/db push
```

`drizzle-kit push` 會讀 `lib/db/src/schema/*.ts`，diff 出差異後直接套到 `DATABASE_URL` 指向的資料庫。8 張表會被建立：
`brand` · `personas` · `brand_events` · `ai_decisions` · `generated_content` · `campaigns` · `integrations` · `taiwan_brands`

**驗證**：到 Supabase Dashboard → Table Editor，應看得到上述 8 張表。

### 3.7 Seed 30 個台股品牌

```bash
pnpm --filter @workspace/api-server run db:seed
```

這支腳本是 idempotent 的——`taiwan_brands` 已有資料就跳過，所以可以重複執行。Seed 完之後 `/api/rankings` 才會回非空陣列，dashboard 排行榜頁才會渲染資料。

### 3.8 啟動 dev server

```bash
# Terminal A：啟動 API server（Express on :3000）
pnpm --filter @workspace/api-server dev

# Terminal B：啟動前端 dashboard（Vite on :5173）
pnpm --filter @workspace/brandos dev
```

打開 http://localhost:5173 ，應看到 8 頁 dashboard。網路面板不應有 4xx / 5xx 的 `/api/*` 呼叫。

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
