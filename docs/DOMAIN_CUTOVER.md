# symcio.tw 網域切換：Lovable → Vercel Cutover 手冊

## 當前狀態（2026-04-21）

- **Vercel build**：✅ PR #9 合進 main（commit `7a65371`），`web/landing` 應該被 Vercel 自動 build
- **symcio.tw 指向**：❌ 疑似還指向 Lovable（使用者回報 `https://symcio.tw/schema-generator` 回 404）
- **影響**：`web/landing` 裡的所有路由（`/`、`/schema-generator`、`#scan` Free Scan、`/api/agent`、`/api/schema`、`/api/checkout`、Stripe webhook）**在 symcio.tw 都不可用**，只活在 Vercel 預覽網址（`xxxx.vercel.app`）

## WHY：這份文件的用途

`docs/DOMAIN_DEPLOY.md` 假設你從零開始（新買的域名）。這份針對**已被 Lovable 佔住域名**的情況，列切換時要特別注意的動作與回滾點。

## Pre-flight：切換前必做（30 分鐘）

### 1. 確認 Vercel 那邊真的能跑（Source of truth）

1. https://vercel.com/dashboard → 找 `symcio-landing`（或類似）project
2. Deployments → 最新一筆的 commit 是 `[schema-gen] /schema-generator ... (#9)`，狀態 **Ready**
3. 點 **Visit** 取得 `xxxx.vercel.app` URL
4. 在瀏覽器確認下面四個 URL 都活著：
   - `https://xxxx.vercel.app/` → Symcio 首頁
   - `https://xxxx.vercel.app/schema-generator` → Schema 生成器
   - `https://xxxx.vercel.app/api/agent`（POST 會回 400 Invalid body，GET 回 405 都算正常）
   - `https://xxxx.vercel.app/api/schema`（同上）
5. `scripts/smoke_schema_generator.sh` 可以批量跑這個檢查

**如果 vercel.app 也 404** → Vercel project Root Directory 沒設對，先回頭：
- Vercel Project → Settings → General → **Root Directory** 改為 `web/landing`
- 回 Deployments → 最新 deployment → **Redeploy**

### 2. 確認 Vercel 環境變數齊備

Project Settings → Environment Variables（Production 環境）：

| 必要 | Key | 缺的後果 |
|-----|-----|---------|
| ✅ | `SUPABASE_URL` | Lead 不寫入 Supabase |
| ✅ | `SUPABASE_SERVICE_ROLE_KEY` | 同上 |
| ⚠️ | `COMPOSIO_API_KEY` | Notion / Gmail 管線 degrade（UI 不爆） |
| ⚠️ | `COMPOSIO_USER_ID` | 同上 |
| ⚠️ | `COMPOSIO_NOTION_LEAD_DB_ID` | Notion 不寫入 |
| ⚠️ | `COMPOSIO_NOTION_CONNECTION_ID` | 同上 |
| ⚠️ | `COMPOSIO_GMAIL_CONNECTION_ID` | 使用者收不到 JSON-LD / QuickStatements email |
| ⚠️ | `STRIPE_SECRET_KEY` | `/api/checkout` 與 `/api/webhooks/stripe` 失效 |
| ⚠️ | `STRIPE_WEBHOOK_SECRET` | 同上 |
| 選 | `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 摘要 degrade（fallback 到 template） |

任何 ⚠️ 缺的服務只是 degrade，不會讓 API 500。Supabase 兩個必要的缺的話 lead 完全抓不到，要優先補。

### 3. 備份 Lovable 目前服務的內容

1. Lovable dashboard → 那個綁 symcio.tw 的 project
2. 如果有值得保留的文案 / 設計 / 圖片 → 先截圖或 export
3. 確認 Lovable 的 publish 狀態（若它是 redirect 就沒內容要備份；若它實際 serve 一份 landing 就要）

## Cutover：DNS 切換（5 分鐘動作 + 5–30 分鐘 propagation）

### 1. 在 Vercel 先加 domain（Vercel 拿到 DNS 之前就要註冊）

Vercel Project → Settings → **Domains** → Add：
- `symcio.tw`
- `www.symcio.tw`

Vercel 會說目前 Invalid Configuration 並給你需要的 DNS 記錄。常見是：
```
A      @    76.76.21.21
CNAME  www  cname.vercel-dns.com
```

### 2. 找到目前 DNS 管理在哪

用 https://dnschecker.org 查 `symcio.tw` 的 NS record（Name Servers）：
- `*.cloudflare.com` → Cloudflare 管，去 Cloudflare Dashboard
- `*.registrar-servers.com` → Namecheap
- `*.gandi.net` → Gandi
- `*.pchome.com.tw` / `*.hinet.net` → 台灣註冊商原生 DNS

### 3. 在 DNS 管理端執行切換

**先刪**：任何指向 Lovable 的 A / CNAME / ALIAS 記錄（通常名稱 `@` 或 `www`）。
**再加**：Vercel 給的那兩條記錄。

**若是 Cloudflare**：
- 兩條記錄的 Proxy status 一定要**灰雲（DNS only）**，不然 Vercel 拿不到 Let's Encrypt 憑證
- 等 Vercel Domains 頁面狀態變 **Valid**（1–30 分鐘）之後，才能改成橘雲享 CDN

### 4. 等 propagation + 驗證

5–30 分鐘後：
```bash
scripts/smoke_schema_generator.sh https://symcio.tw
```

或手動開：
- https://symcio.tw/ → Symcio Next.js 首頁（不是 Lovable）
- https://symcio.tw/schema-generator → Schema 生成器
- https://symcio.tw/llms.txt → 純文字 llms.txt 內容
- https://symcio.tw/sitemap.xml → 有 `/schema-generator` 條目

### 5. Stripe webhook 重新校準

Stripe Dashboard → Developers → Webhooks → 原有的 endpoint `https://symcio.tw/api/webhooks/stripe`：
- 如果先前指向 Lovable 一直 4xx，recent deliveries 會很多紅色
- 切完 DNS 後點 **Send test webhook** 確認 2xx
- 若 webhook secret 換過 → 重新 copy signing secret 到 Vercel env var `STRIPE_WEBHOOK_SECRET`

## Rollback：切壞了怎麼辦

切完如果 symcio.tw 打不開（TLS 錯誤 / Invalid Configuration 超過 30 分鐘）：

1. DNS 端把 Vercel 的 A/CNAME 記錄暫時**改回**指向 Lovable（記錄備份好）
2. Vercel Domains 頁面的 `symcio.tw` **不要**移除，保留 registration，下次再試
3. 常見錯誤：
   - Cloudflare 橘雲沒關 → Vercel 拿不到憑證，關成灰雲即可
   - A 記錄 IP 抄錯 → 從 Vercel Domains 頁面重抄
   - TTL 太長卡住舊解析 → 喝口水等 30 分鐘

## Post-cutover：收尾

### 1. Lovable 那邊

- 把那個綁 symcio.tw 的 project → Domain settings 解除綁定
- 若 Lovable 已無用途 → 暫停 / archive（確保未來不會有憑證衝突）

### 2. 更新 README

把本文件頂部那段「當前狀態」改成：「✅ symcio.tw 已接 Vercel，PR #9 的 `/schema-generator` 正式上線」。

### 3. 觸發一次 GEO audit

`/api/schema` 送出的新品牌會寫進 `brands` 表 `status=prospect`。這時候手動觸發一次 `.github/workflows/geo-audit.yml`（workflow_dispatch）可以讓第一批 early user 真的收到 24 小時內那封 Free Scan email（不然得等下一班 cron）。

---

## 附：為什麼不能用 Lovable 當主站

Lovable 專長是快速原型與簡單 landing，不適合：
- Server-side routes（`/api/agent`、`/api/schema`、`/api/webhooks/stripe`）— Lovable 沒提供
- Supabase service-role key 伺服器端操作 — Lovable 現成設計以 client 為主
- 結構化 sitemap + llms.txt + Schema 的 SEO/GEO 操作 — 較難精細控制

所以架構決定是：**Lovable 做 idea 驗證 / 靜態行銷頁，Vercel 跑 Symcio 正式站**。這次 cutover 把兩者權責分清楚。
