# symcio.tw 網域 × Cloudflare × Vercel 部署指南

## 一、確認你擁有 `symcio.tw`

若尚未買，推薦註冊商（支援 `.tw`）：
- **Gandi** — https://gandi.net （每年約 USD 30–40）
- **Namecheap** — 通常較便宜
- **Hinet / PChome 網路家庭** — 台灣本地

註冊完拿到兩樣東西：
1. 域名控制台（通常在註冊商處）
2. 預設 nameservers（準備要換成 Cloudflare 的）

## 二、接 Cloudflare（DNS + CDN + SSL）

### 2.1 加入 Cloudflare

1. 註冊 https://cloudflare.com（免費）
2. Dashboard → **Add a site** → 輸入 `symcio.tw`
3. 選 **Free** 方案
4. Cloudflare 會掃描現有 DNS（若有）→ **Continue**

### 2.2 改用 Cloudflare nameservers

Cloudflare 會給你兩組 nameservers，形如：
```
aragog.ns.cloudflare.com
bella.ns.cloudflare.com
```

回到域名註冊商控制台 → 把 nameservers 改成上面兩組 → 儲存。

DNS 傳播時間：**10 分鐘～ 48 小時**（台灣註冊商通常 30 分鐘內完成）。

### 2.3 驗證

Cloudflare 會在 nameservers 生效後發 email。Dashboard 的 site status 變 **Active**。

### 2.4 啟用關鍵設定

Cloudflare Dashboard → `symcio.tw` →
- **SSL/TLS** → Overview → 選 **Full (strict)**（Vercel 已提供有效證書）
- **Speed** → Optimization → 打開 **Auto Minify** (JS/CSS/HTML) + **Brotli**
- **Rules** → Page Rules → 新增：
  - URL: `http://symcio.tw/*`
  - Setting: **Always Use HTTPS**

## 三、部署 Vercel

### 3.1 Import repo

1. https://vercel.com/new → **Import Git Repository**
2. 選 `SALL911/BrandOS-Infrastructure`
3. **Configure Project**：
   - Framework Preset：**Next.js**
   - **Root Directory**：`web/landing`（點 Edit 改）
   - Build / Install / Output Commands：保留預設

### 3.2 環境變數

Project Settings → Environment Variables（Production + Preview 都勾）：

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |

Deploy → 等 1-2 分鐘 → 拿到 `xxxx.vercel.app` 預覽網址。

### 3.3 綁定 symcio.tw

**Vercel Dashboard → Project → Settings → Domains**

新增兩個 domain：
- `symcio.tw`（主要）
- `www.symcio.tw`（轉主要）

Vercel 會顯示需要的 DNS 記錄，例如：
```
Type: A     Name: @    Value: 76.76.21.21
Type: CNAME Name: www  Value: cname.vercel-dns.com
```

### 3.4 在 Cloudflare 加 DNS

Cloudflare Dashboard → `symcio.tw` → **DNS** → **Add record**：

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| A | `@` | `76.76.21.21`（Vercel 給的那個 IP） | **DNS only**（灰雲，重要！）|
| CNAME | `www` | `cname.vercel-dns.com` | **DNS only**（灰雲）|

> **關鍵**：Cloudflare proxy（橘雲）要**關掉**，改成灰雲 DNS-only，否則 Vercel 無法驗證 ownership 與核發憑證。等 Vercel 狀態變 Valid 後，可以再改回橘雲享受 CDN。

### 3.5 Vercel 驗證 + 自動 SSL

回 Vercel Domains 頁面 → 狀態從 **Invalid Configuration** 變 **Valid Configuration**（約 1–5 分鐘）。
Vercel 會自動申請 Let's Encrypt 憑證。瀏覽器打開 https://symcio.tw 應直接連線無警告。

### 3.6（可選）重新開啟 Cloudflare proxy

憑證核發成功後：
- Cloudflare → DNS → 把 A 與 CNAME 的雲從灰 → 橘
- Cloudflare SSL/TLS mode 確認為 **Full (strict)**

這樣你會有：
- Cloudflare 免費 CDN + DDoS 防護
- Vercel 原生 SSL + 邊緣快取
- 快取層疊起來，第一個請求 < 200ms，重複請求 < 50ms

## 四、驗證清單（每項都要過）

- [ ] `curl -I https://symcio.tw` 回 `200 OK`
- [ ] 瀏覽器 https://symcio.tw 顯示 landing page
- [ ] https://symcio.tw/llms.txt 可取回 AI 摘要
- [ ] https://symcio.tw/robots.txt 明確 allow AI crawlers
- [ ] https://symcio.tw/sitemap.xml 可取回
- [ ] 送出 Free Scan 表單 → 成功插入 Supabase `leads` 表
- [ ] https://symcio.tw 在 PageSpeed Insights 得分 > 90

## 五、後續監控

### 5.1 Uptime
- 使用 Vercel 內建 Analytics（免費）
- 或接 UptimeRobot 免費方案（5 分鐘間隔）

### 5.2 AI 爬取驗證（這最關鍵）

每週檢查一次：
```bash
# 看 AI 爬蟲是否真的抓了
curl -A "GPTBot/1.0" https://symcio.tw/ | head
curl -A "ClaudeBot" https://symcio.tw/llms.txt | head
```

Cloudflare Dashboard → Analytics → **Bot Analytics** 可看實際 bot hits（免費方案也有基本數據）。

### 5.3 自動部署

每次 push 到 `main`：
- Vercel 自動部署 production
- 你的改動在 1-2 分鐘內上線 symcio.tw

每次開 feature branch：
- Vercel 自動部署 preview，網址如 `brandos-git-{branch}-sall911.vercel.app`
- 可分享給客戶看新功能

## 六、除錯常見問題

### 問題：Vercel Domains 顯示 `Invalid Configuration`
- 確認 Cloudflare DNS 是灰雲（DNS-only）
- `dig symcio.tw A +short` 應該回 Vercel 給的 IP

### 問題：瀏覽器警告 NET::ERR_CERT_AUTHORITY_INVALID
- Vercel 還沒核發憑證，等 5-10 分鐘
- 或 Cloudflare SSL mode 不是 **Full (strict)**，改一下

### 問題：www.symcio.tw 無法 redirect 到 symcio.tw
- Vercel Domains → 把 `www.symcio.tw` 的 Redirect 設為 `symcio.tw`（Permanent 308）

### 問題：Cloudflare proxy 打開後變慢或錯誤
- SSL/TLS → 改 **Full (strict)**
- Rules → 關掉 `Rocket Loader`（可能干擾 Next.js hydration）

### 問題：API `/api/scan` 回 500
- Vercel → Functions → Logs 看 Supabase 連線錯誤
- 通常是 `SUPABASE_SERVICE_ROLE_KEY` 沒設或值錯

## 七、月費預估

| 服務 | 方案 | 月費 |
|------|------|------|
| Cloudflare | Free | $0 |
| Vercel | Hobby | $0（< 100 GB/月）|
| Supabase | Free | $0（< 500 MB DB）|
| 域名 `.tw` | - | ~$3（折合每月）|
| **總計** | | **~$3/月** |

流量破百萬後再升級 Pro 方案即可。

## 八、延伸閱讀

- `docs/MORNING_CHECKLIST.md` — 完整啟用流程
- `web/landing/README.md` — landing page 開發細節
- `docs/FREE_STACK.md` — 其他免費平台建議
