# 起床後照做清單（排序過的最小路徑）

預估總時間：**約 45 分鐘**。按順序做完，BrandOS 就能自動跑。

---

## 🔐 Step 0：安全收尾（5 分鐘）

因為昨晚 Notion token 在對話中曝光，先重設。

- [ ] 開 https://www.notion.so/profile/integrations → 點你的 integration
- [ ] 點 **Reset secret** → 複製新 token（新的 `ntn_...` 字串）
- [ ] 在 https://github.com/SALL911/BrandOS-Infrastructure/settings/secrets/actions 更新 `NOTION_API_KEY` 為新 token

---

## 🗄️ Step 1：Supabase 建 project（10 分鐘）

- [ ] 開 https://supabase.com → 註冊 / 登入
- [ ] **New project**
  - Name：`brandos-infrastructure`
  - DB Password：**生成強密碼並記錄**
  - Region：**Northeast Asia (Tokyo)**（延遲最低）
- [ ] 建立後等約 2 分鐘完成 provisioning
- [ ] 到 **Project Settings → API** 抄：
  - `Project URL`
  - `anon public` key
  - `service_role` key（敏感，只在 server-side）
- [ ] 到 **Project Settings → General** 抄 `Reference ID`

### 設這些 GitHub Secrets

https://github.com/SALL911/BrandOS-Infrastructure/settings/secrets/actions

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...`（anon public）|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`（service_role）|
| `SUPABASE_PROJECT_REF` | Reference ID |
| `SUPABASE_DB_PASSWORD` | 剛才生的 DB password |
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account → **Access Tokens** → Generate |

### 建 production environment

- [ ] 到 https://github.com/SALL911/BrandOS-Infrastructure/settings/environments
- [ ] **New environment** → Name：`production` → **Configure**
- [ ] 可選加 Required reviewers（自己）

### 觸發首次 migration 部署

- [ ] 開 https://github.com/SALL911/BrandOS-Infrastructure/actions/workflows/supabase-deploy.yml
- [ ] **Run workflow** → Branch `main` → confirm 欄位輸入 `deploy` → **Run**
- [ ] 等約 1 分鐘，看到綠燈 = 19 張 table 已建好

---

## 🤖 Step 2：Google AI Studio 拿免費 Gemini API key（3 分鐘）

- [ ] 開 https://aistudio.google.com
- [ ] 用 Google 帳號登入
- [ ] 左側 **Get API key** → **Create API key** → **Create API key in new project**
- [ ] 複製 key（`AIza...` 開頭）
- [ ] 在 GitHub Secrets 新增 `GEMINI_API_KEY`

> 免費額度：1M token/日、60 RPM，MVP 前 3 個月完全夠用。

---

## 📝 Step 3：啟用 Notion 同步（5 分鐘）

- [ ] 到任一要同步的 Notion 頁面 → 右上 **⋯ → 連線** → 加入你的 integration
- [ ] 確認 GitHub Secret `NOTION_API_KEY` 已設（Step 0 的新 token）
- [ ] 開 https://github.com/SALL911/BrandOS-Infrastructure/actions/workflows/notion-sync.yml
- [ ] **Run workflow** → `dry_run=true` → **Run** → 看 log 確認抓到頁面
- [ ] 成功後再跑一次 `dry_run=false` → 自動開 draft PR → 合併進 main

---

## 🎨 Step 4：啟用 Figma 同步（5 分鐘）

詳細步驟見 `docs/FIGMA_SETUP.md`，快速版：

- [ ] Figma Settings → Security → **Generate personal access token**（勾 File content: Read）
- [ ] 在 GitHub Secrets 新增：
  - `FIGMA_TOKEN` = `figd_xxx`
  - `FIGMA_FILE_KEY` = `AkUJholqQlnBUw6kOnOQMk`（BrandOS™ 檔案）
- [ ] 開 https://github.com/SALL911/BrandOS-Infrastructure/actions/workflows/figma-sync.yml
- [ ] **Run workflow** → Branch `main` → **Run**
- [ ] 等約 20 秒 → 自動開 draft PR → 合併

---

## 🛰️ Step 5：跑第一次 GEO Audit（5 分鐘）

- [ ] 開 https://github.com/SALL911/BrandOS-Infrastructure/actions/workflows/geo-audit.yml
- [ ] **Run workflow** → 填：
  - `brand_name`：`Symcio`
  - `brand_domain`：（你的 Symcio 官網域名）
  - `brand_industry`：`technology`
- [ ] **Run**
- [ ] 等 2-3 分鐘 → 會產生 `reports/geo-audit/symcio-YYYYMMDD.json`
- [ ] 看 avg_score（第一次跑通常在 20-40 分，這就是你的**基準線**）

---

## 🌐 Step 6（選）：註冊其他免費平台

依 `docs/FREE_STACK.md` 的 P0+P1 清單，至少註冊：

- [ ] **Vercel**（https://vercel.com）→ GitHub 登入，授權 BrandOS-Infrastructure repo
- [ ] **Resend**（https://resend.com）→ 驗證 email，建 API key，存 Secret `RESEND_API_KEY`
- [ ] **Tally**（https://tally.so）→ 建第一個 lead 表單
- [ ] **Cloudflare**（https://cloudflare.com）→ 若你有 symcio.tw 域名，轉到 Cloudflare DNS

---

## ✅ 完成驗證

全做完後，下列 workflows 在 `main` 應該都是綠燈：

- https://github.com/SALL911/BrandOS-Infrastructure/actions

預期看到：
| Workflow | Status |
|----------|--------|
| Supabase CI | ✅ |
| Supabase Deploy | ✅（至少一次綠燈）|
| Notion Sync | ✅（首次 PR 已合併）|
| Figma Sync | ✅（首次 PR 已合併）|
| GEO Audit | ✅（第一份報告產出）|

---

## 🔥 卡住了怎麼辦

找我：直接在這個 Claude Code 會話貼錯誤訊息或 workflow log。

真的完全卡住：**先跳過該步**，把能做的先做完，留著問題等我幫忙 debug。

---

## 📚 快速索引

| 問題 | 看這份 |
|------|-------|
| 系統整體怎麼運作？| `docs/ARCHITECTURE.md` |
| 還有哪些免費平台？| `docs/FREE_STACK.md` |
| MVP 要怎麼賺錢？| `docs/MVP_SPEC.md` |
| Supabase 怎麼用？| `docs/supabase-setup.md` |
| Figma 怎麼同步？| `docs/FIGMA_SETUP.md` |
| 七工具分工原則？| `CLAUDE.md` §9 |
