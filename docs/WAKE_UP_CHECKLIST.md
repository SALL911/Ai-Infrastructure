# 🌅 醒來清單 · Symcio BrandOS Deploy Path

> 睡前最後 commit：`800ece3` on branch `claude/setup-supabase-cicd-qx4LG`
> （加上接著做的頁面整合 + password reset 還會有一個 commit）
>
> 這份清單按「可立刻做 → 需要等」排序。照順序跑就能把整個 branch 上線。

---

## ⚡ 5 分鐘：先看 branch 狀態

```bash
cd ~/projects/BrandOS-Infrastructure   # 或你 local 的路徑
git fetch origin claude/setup-supabase-cicd-qx4LG
git checkout claude/setup-supabase-cicd-qx4LG
git log --oneline -15
```

應該看到 ~12 個 commits，從 `[init] 新增 Supabase 連線` 一路到最後的
`feat(auth): Supabase Auth + member dashboard` 等。

跑一下本地 dev server 確認能開：
```bash
cd web/landing
npm install
npm run dev
# 打開 http://localhost:3000
```

沒設 Supabase env 也可以開首頁；只是登入 / 診斷的儲存功能會 anon。

---

## ✅ 15 分鐘：開 draft PR

我沒授權 GitHub MCP 所以沒辦法幫你開 PR。你做：

1. 打開 https://github.com/SALL911/BrandOS-Infrastructure/compare/main...claude/setup-supabase-cicd-qx4LG
2. 右上「Create pull request」→ 改成 **Draft**
3. 標題：`feat: Symcio BrandOS Phase 1 — BCI + MVP + member system`
4. Body 複製 `docs/WAKE_UP_CHECKLIST.md` 一部分或直接寫「整合 BCI 引擎、MVP 官網、會員系統」

Draft PR 是為了：
- CI / preview deployment 可以看到
- 不急著 merge，先小批測試

---

## 🗄️ 30 分鐘：Supabase 資料庫 + Auth

> 完整版：`docs/SUPABASE_AUTH_SETUP.md`
>
> 如果你還沒建 Supabase project，先到 https://supabase.com/dashboard 建一個（Tokyo region）。

### Step 1 · 跑 migrations

```bash
# 方法 A（推薦）：Supabase CLI
supabase link --project-ref <你的 ref>
supabase db push

# 方法 B：Dashboard → SQL Editor 手動
# 依順序貼入以下檔案：
#   1. supabase/migrations/20260417000000_initial_schema.sql
#   2. supabase/migrations/20260421000000_geo_audit_queue.sql
#   3. supabase/migrations/20260422000000_bci_snapshots.sql
#   4. supabase/migrations/20260422000001_members_audit_history.sql
```

### Step 2 · Auth Providers

Dashboard → Authentication → Providers：

- **Email**：✅ Enable（預設就開）
  - `Confirm email` 建議 ON（防機器人）
- **Google**：需要 Google Cloud Console 建 OAuth client
  - console.cloud.google.com/apis/credentials → Create OAuth client ID → Web application
  - Authorized redirect URI：`https://<project-ref>.supabase.co/auth/v1/callback`
  - 拿到 Client ID + Secret → 回貼 Supabase Auth → Providers → Google

### Step 3 · URL Configuration

Authentication → URL Configuration：
- **Site URL**：`https://symcio.tw`（或你的暫時 Vercel URL）
- **Redirect URLs**：加入
  ```
  https://symcio.tw/auth/callback
  https://symcio-landing.vercel.app/auth/callback
  http://localhost:3000/auth/callback
  https://symcio.tw/reset-password
  http://localhost:3000/reset-password
  ```

---

## 🔐 15 分鐘：Vercel Env Vars

Vercel Dashboard → Project → Settings → Environment Variables
**Production + Preview 都要設**（環境勾兩個）。

完整清單參考 `web/landing/.env.example`。最小可跑：

| Key | 來源 | 備註 |
|-----|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API 頁 | 公開 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase API 頁 · anon/public | 公開 |
| `SUPABASE_URL` | 同 above | server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API 頁 · service_role | **絕不公開**，server only |
| `NEXT_PUBLIC_SITE_URL` | `https://symcio.tw` 或 Vercel URL | 用於 OAuth redirect 組裝 |

**選配**（有的話功能才會動）：

| Key | 功能 | 沒設會怎樣 |
|-----|------|----------|
| `TYPEFORM_WEBHOOK_SECRET` | Typeform → Lead 收集 | Typeform 提交不會進 Supabase |
| `GH_DISPATCH_TOKEN` | 觸發 geo-audit.yml | Stripe / Typeform 提交後不會自動跑 audit |
| `GH_DISPATCH_REPO` | `SALL911/BrandOS-Infrastructure` | 同上 |
| `RESEND_API_KEY` | 寄報告 / 通知 | 付款後信不寄 |
| `STRIPE_SECRET_KEY` | 金流 | /pricing 的付款按鈕不動作 |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook 驗簽 | 付款完成事件收不到 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 前端 Stripe.js | checkout 啟動失敗 |
| `GEMINI_API_KEY` | GEO Audit 跑四引擎之一 | 該引擎分數 = 0 |

設完 → **Redeployments 分頁** → 最新那條 → **⋯ → Redeploy**。

---

## 🚀 10 分鐘：Vercel 部署

**第一次**：Import project from Git

1. https://vercel.com/new → Import Git Repository
2. 選 `SALL911/BrandOS-Infrastructure`
3. **Root Directory** = `web/landing` ← 超重要
4. Framework preset：Next.js（自動偵測）
5. Build command、Install command：都用預設
6. Environment Variables：先不填，之後在 Settings 加（上一節已列）
7. Deploy

**之後每次 push**：
- `main` → production（symcio.tw）
- 其他 branch → preview URL（PR 上會自動貼連結）

---

## 🌐 20 分鐘：symcio.tw 域名

**前提**：`symcio.tw` 在 Cloudflare 管理（如果不是，流程不同，跟我說）。

### Vercel 加 domain
Project → Settings → Domains → Add → `symcio.tw` + `www.symcio.tw`

### Cloudflare DNS

Cloudflare dashboard → `symcio.tw` → DNS → Records：

```
Type  Name   Content                    Proxy
A     @      76.76.21.21                🌫️ DNS only（灰色雲）
CNAME www    cname.vercel-dns.com       🌫️ DNS only
```

**關鍵**：**Cloudflare Proxy 要關閉**（橘色雲 → 灰色雲）。Vercel 自己發 SSL 跟做 CDN，不要雙層。

5–30 分鐘後 SSL 生效，就可以開 https://symcio.tw。

---

## 🧪 15 分鐘：煙霧測試

按順序打開驗證：

- [ ] `/` 首頁：Hero + 四大板塊 + BCI 公式 + 6 模組 + 社群 + 電子報
- [ ] `/audit` 填表送出 → 10 秒動畫 → 報告
  - [ ] BCI 圓環、雷達、四引擎、GEO 檢查、競品、建議都顯示
  - [ ] 下載 PDF 按鈕成功下載 A4 PDF
- [ ] `/pricing` 三級 + FAQPage Schema（View Source 看到 JSON-LD）
- [ ] `/faq/enterprise` + 其他 4 個 category 正常切換
- [ ] `/tools` 4 個工具卡片
- [ ] `/about` 有 BCI 區塊 + Typeform embed
- [ ] 右上「免費註冊」→ `/signup` → 用 test email 註冊
- [ ] 收到確認信，點連結 → 應導到 `/dashboard`
- [ ] Dashboard 顯示 plan=free、0 / 3 配額
- [ ] 跑一次 `/audit`，完成後頂端應該說「✓ 已儲存到你的 BCI 歷史」
- [ ] `/dashboard/history` 看得到剛剛那筆
- [ ] `/dashboard/settings` 顯示你的資料
- [ ] 右上「登出」→ 回到首頁，Nav 變成「登入 / 免費註冊」
- [ ] 再登入 → Google OAuth 按鈕 → 跳 Google → 回來進 dashboard
- [ ] `/forgot-password` 填 email → 看到「已寄送」訊息
- [ ] 信箱點重設連結 → `/reset-password` → 設新密碼 → 自動登入進 dashboard

全部打勾就 **production-ready**。

---

## 📢 內容發布（隨時可做，不卡技術）

```bash
bash scripts/prepare_content.sh
# 輸出在 outputs/publish/：
#   medium-bci.md       ← 複製整個貼到 Medium
#   linkedin-bci-zh.txt ← LinkedIn 主貼文
#   linkedin-bci-en.txt ← 第一條留言
```

發布順序看 `content/README.md` 的 2 週 cadence。

---

## 🧠 BCI Calibration（獨立路徑，可延後）

```bash
# 1. 手動下載 InterBrand 100 + Kantar 100 的排名 CSV
#    放到 private/bci/inputs/
#    格式：private/bci/inputs/README.md

# 2. 合併成 fixture
python scripts/collect_fixtures.py \
  --source interbrand=private/bci/inputs/interbrand_2025.csv \
  --source kantar=private/bci/inputs/kantar_2025.csv \
  --industry technology \
  --output private/bci/fixtures_v1.json

# 3. 手動補每個品牌的 f_last / v_last / e_last（跑 bci_engine 或手填）

# 4. 跑校準
python scripts/bci_calibrate.py \
  --fixtures private/bci/fixtures_v1.json \
  --output private/bci/weights_v1.json

# 5. 把 weights_v1.json 內容貼到 GitHub Secret `BCI_WEIGHTS_JSON`
# 6. Repo → Settings → Variables → BCI_WEIGHTS_VERSION = v1
```

完成後 `.github/workflows/bci-daily.yml` 每日 03:00 會跑。

---

## 🛑 如果遇到問題

| 症狀 | 可能原因 | 解法 |
|------|---------|------|
| Vercel build 失敗 `Module not found: @supabase/ssr` | npm install 模式不對 | 已加 `web/landing/.npmrc` = `legacy-peer-deps=true`；若還是不行，升級 `@supabase/supabase-js` 到 2.48+ |
| `/dashboard` 一直跳 `/login` | Cookie domain 不對、SUPABASE_URL 配置錯 | F12 → Application → Cookies 看有沒有 `sb-<ref>-auth-token`；沒有表示 session 沒建立 |
| 註冊後 `members` 表沒資料 | trigger 沒跑 | Supabase SQL Editor 跑 `SELECT * FROM pg_trigger WHERE tgname='on_auth_user_created'`；沒有重跑 migration |
| Google 登入跳 `invalid_request` | Google Cloud Console redirect URI 沒加 `https://<ref>.supabase.co/auth/v1/callback` | 加上去，等 5 分鐘生效 |
| PDF 下載失敗 | 瀏覽器阻擋 / html2pdf CDN 載入失敗 | F12 console 看錯誤；通常是 CDN 被企業網擋 |

---

## 📬 我還能接著幫你做的（下輪）

- [ ] BCI weight 計算：把 InterBrand 100 公開排名資料（Wikipedia 維護的表）用腳本直接抓成初版 CSV，省你手動下載
- [ ] Reset password 已做；忘記 email / 改 email 還沒
- [ ] 刪除帳號流程（含 cascade delete audit_history）
- [ ] Quota reset cron：每月 1 號自動歸零 `audits_used_this_month`
- [ ] Stripe subscription webhook 處理 plan 升級（Pro / Enterprise）
- [ ] 雙語化 `/en` 路由（之前延後的那個）
- [ ] 會員 Dashboard 的「AI 行銷建議」cron（每日依最近 BCI 變化生成 3 條 LinkedIn 貼文草稿）

---

祝早安 ☕。
