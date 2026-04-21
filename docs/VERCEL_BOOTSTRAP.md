# Vercel 第一次 Bootstrap（本地 CLI 路線）

## 背景

2026-04-21 狀態：Vercel account `cchuan911-3120s-projects` 還**沒有任何 project**，所以 `symcio.tw` 過去一段時間都只是 Lovable 的頁面。Next.js landing（`web/landing/`）必須先建立 Vercel project 才能活。

這份文件搭配三份資產使用：
- `scripts/vercel_bootstrap.sh` — 從零安裝 CLI、登入、link、第一次 production deploy
- `scripts/vercel_env_push.sh` — 把 `.env.vercel.local` 的變數批次推到 production
- `web/landing/.env.vercel.local.example` — 環境變數範本

## 步驟

### 1. 從任一位置 pull 最新 main

```bash
cd <your-local-brandos-infrastructure>
git fetch origin && git checkout main && git pull --ff-only
```

### 2. 跑 bootstrap（5–10 分鐘，含等 build）

```bash
bash scripts/vercel_bootstrap.sh
```

會依序做：
1. 如果缺 `vercel` CLI → `npm i -g vercel@latest`
2. 若沒登入 → 執行 `vercel login`，**會開瀏覽器**，挑 GitHub 登入（和 owner 帳號同一個）
3. 執行 `vercel link`，互動式回答：
   - `Set up and deploy` → **y**
   - `Which scope?` → 選 **cchuan911-3120s-projects**
   - `Link to existing project?` → **N**（新建）
   - `Project name?` → **symcio-landing**（建議用這個名字）
   - `In which directory is your code located?` → **./**（目前在 `web/landing`，所以 `./` 就是對的）
   - 其他問題（build command / output dir / dev command）→ **全部 Enter**，Next.js 14 自動偵測
4. 跑 `vercel --prod --yes` 第一次 production deploy
5. 印出 deploy URL，通常形式 `https://symcio-landing-xxxx.vercel.app`

### 3. 先對 preview URL 跑 smoke test

```bash
bash scripts/smoke_schema_generator.sh https://symcio-landing-xxxx.vercel.app
```

**預期：**
- 靜態頁（`/`、`/schema-generator`、`/sitemap.xml`、`/llms.txt`）→ 200
- API routes（空 body POST）→ 400（routes 活著，只是 schema 驗證擋住）
- sitemap 內含 `/schema-generator`

如果 `/` 200 但 `/api/schema` 404 → Vercel 偵測 root directory 偵測錯了，進 Settings → General → Root Directory，改成 `web/landing`，Save → 回 Deployments → Redeploy。

### 4. 填環境變數 + 推上 Vercel

```bash
cp web/landing/.env.vercel.local.example web/landing/.env.vercel.local
# 用任何編輯器打開，填入真實的 Supabase / Composio / Stripe keys
bash scripts/vercel_env_push.sh web/landing/.env.vercel.local
```

`vercel_env_push.sh` 會對每個 key 先 `vercel env rm` 再 `add` 所以可重跑。跑完後：

```bash
cd web/landing && vercel --prod --yes
```

重跑 deploy 讓環境變數生效。

### 5. 驗 API 真實動作

在瀏覽器開 `https://symcio-landing-xxxx.vercel.app/schema-generator`：
- 品牌名稱填 `Test Brand`、email 填你自己的
- 送出 → 應該看到「已收到」
- Supabase Studio → `leads` 表應有一筆 `source=schema-generator`
- Notion 指定的 database 應有一筆 row
- 信箱應該收到 `[Symcio] Test Brand 的 Schema + Wikidata 已產出`

缺哪一個就補對應的 env var，再 `vercel env_push.sh` 一次。

### 6. 切 DNS（照 `docs/DOMAIN_CUTOVER.md`）

全部綠燈後：
- Vercel Dashboard → project → Settings → Domains → Add `symcio.tw`、`www.symcio.tw`
- 在 Lovable / DNS 管理端解掉舊記錄、加 Vercel 給的 A + CNAME
- 等 propagate → 跑 `bash scripts/smoke_schema_generator.sh https://symcio.tw` 全綠
- Lovable 那邊解綁域名（避免日後憑證衝突）

## 改用 Web UI 的替代路徑

不想用 CLI 也可以：Vercel Dashboard → **Add New...** → **Project** → Import Git Repo → 選 `SALL911/BrandOS-Infrastructure`：
- Framework Preset：Next.js
- **Root Directory**：`web/landing`（必須手動改，預設是 repo 根）
- Environment Variables：從 `.env.vercel.local.example` 對著填
- Deploy

差別只在 CLI 可以把環境變數一口氣推上去，Web UI 要每個 copy-paste。

## 清理

`.vercel/` 資料夾（`web/landing/.vercel/`）是 CLI link 產生的本地設定，已被 `.gitignore` 擋住，不會進 repo。但請**不要手動刪**，否則下次 deploy 會當成新 project 建另一個。
