# n8n / Make.com 廣播自動化 · 設定文件

> 相關檔案：
> - `web/landing/app/api/publish/broadcast/route.ts` — Symcio 這邊的接口
> - `web/landing/lib/publish/utm.ts` — UTM builder
> - `automations/n8n/bci-daily-broadcast.json` — 每日 BCI 廣播
> - `automations/n8n/sdg1-news-digest.json` — 每週 SDG1 摘要
> - `automations/make/brand-valuation-scenario.md` — Make.com 等效設定

## 為什麼用 n8n / Make.com？

**Symcio 不內建 LinkedIn / X / Facebook / Instagram / Threads 的 OAuth 連接**。原因：
- 每個平台的 OAuth token 管理、refresh、rate limit 各自不同
- 企業帳號 vs 個人帳號的 API 限制差異大
- 這些整合最適合交給工作流工具（n8n / Make.com / Zapier）處理

Symcio 的角色：
1. **產內容**（BCI 數據、新聞摘要、SDG digest）
2. **組格式**（每個平台的文字長度、hashtag、UTM link）
3. **直發 Discord**（webhook 不需要 OAuth）

n8n / Make.com 的角色：
1. **呼叫 Symcio broadcast API** 拿到格式化內容
2. **OAuth 發到各平台**（LinkedIn / X / FB / IG / Threads）
3. **追蹤執行狀態、重試、錯誤通報**

## 一、Symcio broadcast API

### Endpoint

```
POST https://symcio.tw/api/publish/broadcast
Authorization: Bearer <BROADCAST_SECRET>
Content-Type: application/json
```

### Request body

```json
{
  "kind": "daily_brand_valuation",      // 標籤，用於 UTM campaign 預設
  "title": "Symcio BCI 每日更新 · 2026-04-22",
  "body_short": "≤ 280 字元(X 用)",
  "body_medium": "≤ 700 字元(LinkedIn/FB 用)",
  "body_long": "完整版(選配)",
  "link_path": "/about",                // 內部路徑或完整 URL
  "image_url": "https://...",           // 選配（IG 一定要）
  "tags": ["BCI", "品牌估值", "ESG"],
  "channels": ["discord", "linkedin", "x", "threads", "facebook", "instagram"],
  "campaign": "daily_bci_2026-04-22"    // UTM campaign；不填則 auto
}
```

### Response

```json
{
  "ok": true,
  "campaign": "daily_bci_2026-04-22",
  "results": {
    "discord": { "posted": true },
    "linkedin": {
      "ready": true,
      "text": "Symcio BCI 每日更新...\n\n#BCI #品牌估值 ...\n\n閱讀：https://symcio.tw/about?utm_source=linkedin&utm_medium=social&utm_campaign=daily_bci_2026-04-22&utm_content=daily_brand_valuation",
      "link": "https://symcio.tw/about?utm_source=linkedin&...",
      "image_url": null
    },
    "x": { "ready": true, "text": "...（already clamped to 280）", "link": "..." },
    "threads": { "ready": true, "text": "...（clamped to 500）", "link": "..." },
    "facebook": { "ready": true, "text": "...", "link": "..." },
    "instagram": { "ready": true, "text": "...（with hashtag block）", "link": "..." }
  }
}
```

## 二、環境變數

Vercel env：

```
BROADCAST_SECRET=<random 32-char string>
```

產生：`openssl rand -base64 32`。

這個 secret 只給 n8n / Make.com 用 — **不要**放進瀏覽器或 public repo。

## 三、n8n 自建（免費路徑）

### Docker 起 n8n

```bash
docker run -d --restart unless-stopped \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=<strong password> \
  -e N8N_HOST=localhost \
  -e WEBHOOK_URL=https://n8n.你的域名.com/ \
  n8nio/n8n
```

用 Cloudflare Tunnel 接通：
```bash
cloudflared tunnel --url http://localhost:5678
```

### 匯入 workflow

1. 打開 n8n UI（預設 `http://localhost:5678`）
2. 右上角 → Import from File
3. 選 `automations/n8n/bci-daily-broadcast.json`
4. **設 credentials**（在每個需要的 node 點進去）：
   - `linkedInOAuth2Api` → 連 LinkedIn Developer app
   - `twitterOAuth2Api` → 連 X Developer app
   - `facebookGraphApi` → 連 Facebook Pages
   - Custom credential `symcioBroadcast`（key: `secret`）= `BROADCAST_SECRET`
   - Custom credential `supabase`（key: `ref`）= 你的 Supabase project ref（SDG1 workflow 用）
5. **Activate**（workflow 右上角開關）

### 監控

- n8n Executions 頁面看每次執行狀態
- Failed runs → 點進去看哪個 node 紅了
- Settings → Notifications → Email / Slack on failure

## 四、Make.com 託管路徑（付費）

詳見 `automations/make/brand-valuation-scenario.md`。

重點：
- Make.com Core $9/月 → 10,000 ops（我們每月用量 <500）
- 圖形化 scenario，不寫 code
- LinkedIn / X / FB / IG / Threads 內建 connector
- 企業 SSO、版本控制、error handling 都 built-in

## 五、OAuth 連接各平台

### LinkedIn

1. https://www.linkedin.com/developers/apps → Create app
2. App name：Symcio / 全識
3. Verify company page
4. Products → 啟用「Share on LinkedIn」+「Sign In with LinkedIn using OpenID Connect」
5. Auth tab → OAuth 2.0 redirect URL：加 `https://app.n8n.cloud/rest/oauth2-credential/callback`（或你 self-host 的 n8n URL）
6. 到 n8n → Credentials → LinkedIn OAuth2 API → 貼 Client ID + Secret → Connect → 授權

### X（Twitter）

1. https://developer.twitter.com/portal → Create project & app
2. 方案 Free 只能讀；**寫要 Basic $100/月**（X 從 2023 開始收費）
3. App → Settings → User authentication settings：
   - OAuth 2.0 on
   - Type of App：Web App
   - Callback URI：n8n callback URL
   - Permissions：Read and write
4. Keys and tokens → OAuth 2.0 Client ID + Secret
5. n8n → Credentials → Twitter OAuth2 API → 連接

### Facebook Pages

1. https://developers.facebook.com/apps → Create app
2. Use case：Other → Business
3. Products → Facebook Login → Settings → 加 n8n callback URL
4. Permissions and Features → request `pages_manage_posts` + `pages_read_engagement`（需要 App Review）
5. n8n → Credentials → Facebook Graph API

### Instagram Business

**要綁 Facebook Page**：IG Business 帳號必須連一個 FB Page 才能 API 發文。

1. FB Business Manager → 連結 IG Business 帳號到 FB Page
2. 跟 FB Pages 用同一個 Developer app，加 permission `instagram_content_publish`
3. 需要先上傳圖 URL 再 publish — **IG 不接受純文字**
4. n8n → Facebook Graph API credential 共用（Instagram Graph API 是 FB API 一部分）

### Threads

Meta Threads API GA 中。當前路徑：
- Threads 帳號連結到 FB Developer app
- 需要 `threads_content_publish` permission
- n8n 尚無官方 Threads node — 用 HTTP Request node 打 Graph API

替代：先手動發 Threads，等 n8n 官方 connector 成熟。

## 六、UTM 追蹤

所有 broadcast link 自動帶：

```
utm_source={channel}       # linkedin / x / discord / ...
utm_medium={social|news|email}
utm_campaign={campaign}    # 預設 {kind}_{YYYY-MM-DD}
utm_content={kind}         # 選配
```

在 GA4：
- Acquisition → Traffic acquisition
- 按 `utm_source` 切分 → 看各平台貢獻的 session / conversion
- Campaign 維度 → 每日 / 每週 digest 的效果對比

## 七、範例：新聞觸發即時廣播

不只每日 cron — 也可以在新聞抓下來後立刻廣播到 Discord：

這個流程**已經在 `/api/cron/fetch-news` 內建**（每一則 news_items 自動推 Discord）。

若想擴大到 LinkedIn / X：n8n 加一個 Webhook trigger，讓 Supabase 在 `news_items` INSERT 時打 webhook，n8n 取新記錄 → 呼叫 `/api/publish/broadcast` → 分發。

Supabase webhook 設定：
1. Database → Webhooks → Create a new hook
2. Trigger：`news_items` INSERT
3. URL：你的 n8n webhook URL
4. HTTP headers 帶 auth
5. Payload：row data

n8n 這邊：
1. Webhook trigger 接收
2. 解析 row → 組 broadcast payload
3. POST 到 `/api/publish/broadcast`
4. 分發到各平台

## 八、錯誤處理

Broadcast API 設計上**一個平台失敗不影響其他**（每個 channel 獨立）。

回傳 `results.channel.error` 讓你知道哪個掛了。

在 n8n / Make：
- 每個發送 node 後加 error handler
- 失敗寄 email 或 Slack alert
- 每週 review 一次失敗率

## 九、合規提醒

- **絕不用這個管線做冷信群發**（見 `content/cold-outreach/README.md` 的法律章節）
- Discord / LinkedIn / X 等平台本身有自家 API 使用條款，遵守
- UTM 參數是**你**的 GA4 屬性，不會被第三方追蹤
- 若 EU 用戶會看到你的內容，符合 GDPR 最低門檻即可（無個資蒐集）
