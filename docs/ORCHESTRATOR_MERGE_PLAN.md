# Orchestrator merge plan — PR #30 / #32 收尾

## WHY

PR #30（`claude/import-orchestrator`）把 Replit 上的 BrandOS AI Orchestrator monorepo
搬進 `apps/orchestrator/`，但維持 draft，PR 描述列了 4 個 merge 前未決項：

1. `@replit/vite-plugin-*` 仍在 devDeps
2. repo 根目錄 pnpm workspace 化 vs 讓 orchestrator 自帶 install boundary
3. 沒寫 `apps/orchestrator/.env.example`
4. 第一次部署目標未定（Vercel / Railway / Fly）

PR #32 是堆疊在 #30 之上的 setup runbook。本文件給出對 4 項的具體決策 + patch，
讓使用者可以複製貼上到 `claude/import-orchestrator` 分支收尾。

> **本 commit 不直接改 `apps/orchestrator/`**——那個目錄在 `claude/import-orchestrator`，
> 不在 `claude/continue-work-5KKNo`。directive 鎖死不准跨分支 push，待你授權再切過去執行。

---

## 1. 移除 `@replit/vite-plugin-*`

### Patch — `apps/orchestrator/artifacts/brandos/package.json`

```diff
 "devDependencies": {
-   "@replit/vite-plugin-cartographer": "^1.0.0",
-   "@replit/vite-plugin-dev-banner": "^1.0.0",
-   "@replit/vite-plugin-runtime-error-modal": "^1.0.0",
    ...
 }
```

### Patch — `apps/orchestrator/artifacts/brandos/vite.config.ts`（若存在）

砍掉相關 `import` 與 `plugins: [...]` 內的條目。對應 import 通常為：

```ts
import cartographer from "@replit/vite-plugin-cartographer";
import devBanner from "@replit/vite-plugin-dev-banner";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";
```

砍完跑 `pnpm install` 重生 lockfile。

---

## 2. pnpm workspace 決策：**保持 orchestrator 自帶 boundary**

### 兩種選擇對照

| | (a) repo root pnpm workspace | (b) orchestrator 自帶 boundary（**選此**）|
|---|---|---|
| 根目錄需新增 | `pnpm-workspace.yaml` + 根 `package.json` | 無 |
| 既有 `web/landing/` 影響 | 必須加進 workspace 或顯式排除 | 不影響 |
| Python 腳本（`scripts/`）影響 | 無 | 無 |
| corepack / pnpm 安裝範圍 | 全 repo | 只 `apps/orchestrator/` |
| Vercel / Railway 部署根目錄 | 較複雜（要設 `Root Directory: apps/orchestrator/...`）| 直接設 root 即可 |

### 理由

- repo 已是異質環境（Python + Next.js landing + 可能 orchestrator），統一 pnpm 不划算
- `web/landing/` 已是自己的 npm boundary（不是 pnpm），強迫 pnpm 化會破壞既有 deploy
- orchestrator 部署到獨立子網域（`orchestrator.symcio.tw`），install boundary 對應部署 root 較乾淨

### 動作

不做事。orchestrator 繼續用自己的 `pnpm-workspace.yaml`（已存在於 PR #30）。

---

## 3. `apps/orchestrator/.env.example`

### 建議內容

```bash
# BrandOS AI Orchestrator — Environment Variables Template
# Copy to .env at the directory you run `pnpm dev` from.

# ─── Server ───
NODE_ENV=development
PORT=3000
LOG_LEVEL=info  # debug | info | warn | error

# ─── Database（PostgreSQL via Drizzle ORM）───
# 本機開發：docker run --name brandos-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
DATABASE_URL=postgresql://postgres:dev@localhost:5432/brandos_orchestrator

# 生產：Railway / Fly / Supabase Postgres 連線字串（pooler URL，IPv4，port 6543 或 5432）
# DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres

# ─── Frontend（Vite）───
# 後端 API base URL；本機留空走 vite proxy；生產設絕對網址
VITE_API_BASE_URL=

# ─── 觀測（選配）───
# 接 BrandOS Infrastructure 的 GEO audit / lead scorer，需設下列 secrets：
# 預設留空 → orchestrator 不主動連這些；後續 agent 任務需要時開啟
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# GEMINI_API_KEY=
```

### 動作

把以上內容存為 `apps/orchestrator/.env.example`，commit 進 `claude/import-orchestrator`。

---

## 4. 第一次部署目標：**Railway**

### 候選對照

| 平台 | Node.js + Express | React static | Postgres | 月費（小流量）| 一鍵部署複雜度 |
|------|-------------------|--------------|----------|-------------|---------------|
| **Railway** ✅ | ✅ 原生 | ✅ | ✅ 自帶 | ~$5 | ⭐ 最低 |
| Fly.io | ✅ | ✅ | ✅ 自帶 | ~$0-5 | ⭐⭐⭐ Dockerfile 需自己寫 |
| Render | ✅ | ✅ | ✅（separate） | ~$7+$7 | ⭐⭐ |
| Vercel | ⚠️ Express → serverless function 改寫 | ✅ | ❌ 要外接 | $0 起 | ⭐⭐⭐⭐ 改寫成本 |

### 推薦：Railway

- Express 不用改寫成 serverless（Vercel 路線會逼你動 routing）
- Postgres 直接 add-on，免額外 Supabase 設定
- 自動 detect monorepo，pnpm `--filter` 直接跑
- `orchestrator.symcio.tw` CNAME 到 Railway 提供的 domain，TLS 自動

### 部署步驟（merge 後執行）

```bash
# 1. Railway CLI
brew install railwayapp/cli/railway   # macOS
railway login

# 2. 在 apps/orchestrator/ 內 init
cd apps/orchestrator
railway init   # 選 Empty Project

# 3. 加 Postgres
railway add postgres

# 4. 設 env（從 .env 推上去）
railway vars set NODE_ENV=production
railway vars set LOG_LEVEL=info
# DATABASE_URL 由 add postgres 自動注入

# 5. 部署
railway up

# 6. 開 domain
railway domain   # 拿到 *.up.railway.app

# 7. Cloudflare DNS 加 CNAME
# orchestrator.symcio.tw → <railway-domain>
```

成本預期：第一個月免費 $5 credit；之後 $5/mo + 流量。

---

## 收尾 checklist

merge 前在 `claude/import-orchestrator` 分支跑：

- [ ] §1 patch package.json + vite.config.ts，`pnpm install` 重生 lockfile
- [ ] §3 commit `apps/orchestrator/.env.example`
- [ ] PR #30 描述把這 4 項打勾，draft → ready for review
- [ ] merge #30 → main
- [ ] merge #32（setup runbook，已堆疊在 #30 上）→ main
- [ ] 跟著 §4 部署 Railway，confirm `https://orchestrator.symcio.tw` 健康
- [ ] CLAUDE.md §9.1 工具分工表加 row：`apps/orchestrator/` 部署於 Railway

---

## 風險

- **Replit metadata 殘留**：PR #30 描述說已砍掉 `.replit` / `.replitignore` / `.agents/` / `attached_assets/` / `.config/` / `replit.md`。merge 前最後 sweep：
  ```bash
  cd apps/orchestrator && find . -name '.replit*' -o -name 'replit.md' -o -name '.config' -o -name '.agents' 2>/dev/null
  ```
- **package.json secret leak**：PR #30 提到 `.config/replit/.semgrep/semgrep_rules.json` 含 Slack webhook pattern 已移除。merge 前掃：
  ```bash
  cd apps/orchestrator && grep -rE "hooks\.slack\.com|Bearer [A-Za-z0-9-]{20,}" --include="*.json" --include="*.md"
  ```
- **DB schema 衝突**：orchestrator 自帶 7 張表（`brand` / `personas` / `brand_events` / `ai_decisions` / `generated_content` / `campaigns` / `integrations`）。其中 `brand`（單數）跟 `BrandOS-Infrastructure` 的 `brands`（複數）只差一個 s，**不會撞**，但日後合併語意要思考。
