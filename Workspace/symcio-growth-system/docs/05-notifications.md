# 📧 05 — Email + Slack/Discord 通知

> 一筆 Lead 進來，平行發三個通道：內部通知、客戶歡迎信、團隊頻道推播。

**原始碼：** [src/modules/lead-capture/notifications.ts](../src/modules/lead-capture/notifications.ts)

---

## 一、三個通道

| 通道 | 目的 | 收件人 | 觸發條件 |
|------|------|--------|----------|
| **Internal Email** | 讓你知道有新 Lead | `EMAIL_INTERNAL_RECIPIENT` | SMTP 有設 & 非重複 |
| **Welcome Email** | 對客戶第一次接觸 | Lead 的 email | SMTP 有設 & 非重複 |
| **Slack/Discord** | 團隊即時同步 | webhook URL | webhook 有設 & 非重複 |

**重複時不發通知：** `capture.ts` 判斷為 duplicate 時，整段 `notifyAll()` 被跳過，`notificationsSent` 全為 `false`。

---

## 二、平行發送

```ts
async notifyAll(lead: Lead): Promise<NotificationResult> {
  const [internalEmail, welcomeEmail, slack] = await Promise.all([
    this.sendInternalNotification(lead),
    this.sendWelcomeEmail(lead),
    this.sendSlackWebhook(lead),
  ]);
  return { internalEmail, welcomeEmail, slack };
}
```

整體延遲 = max(三者)，不是 sum。每個失敗都獨立 log + 回 `false`，不影響其他兩個。

---

## 三、Internal Email（給你自己）

### 收到的範例

```
From: Symcio <hello@symcio.com>
To: you@symcio.com
Subject: [Symcio][HOT] New Lead: Dana Lee (100)

New lead captured in Symcio Growth System

Name:       Dana Lee
Email:      dana@enterprise.co
Phone:      +886912345678
Company:    Enterprise Co
Job title:  CMO
Website:    https://enterprise.co
Source:     referral
Score:      100 (hot)
CRM ID:     12345678901

Message:
我們想為旗下三個子品牌跑 BrandOS 審計。

Score breakdown:
  - Source "referral" → +35
  - Business email domain (enterprise.co) → +25
  - Company provided → +10
  - Job title provided → +5
  - Company website provided → +10
  - Phone provided → +5
  - Detailed message (≥20 chars) → +10
```

**標題格式：** `[Symcio][TIER] New Lead: NAME (SCORE)` — 在信箱清單一眼看分層。

---

## 四、Welcome Email（給客戶）

### HTML 版（客戶會收到）

標題：**歡迎加入 Symcio BrandOS™ — 你的品牌基礎建設之旅**

主要元素：
- 品牌標題
- 感謝訊息
- **CTA 按鈕** → Line 社群「BrandOS™ 品牌基礎建設」

### CTA 連結

```
https://line.me/ti/g2/2lDm8tJ9RCtjWCX43i39JR_rC-13eJkwyWnCrQ
    ?utm_source=invitation
    &utm_medium=link_copy
    &utm_campaign=default
```

寫死在 [notifications.ts](../src/modules/lead-capture/notifications.ts) 最上方的 `LINE_COMMUNITY_URL` 常數。

### HTML 安全性

所有從 Lead 進來的變數（`lead.name`）都過 `escapeHtml()` 函式：

```ts
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

防止有人在姓名欄位塞 `<script>` 透過歡迎信打 XSS。

---

## 五、Slack / Discord Webhook

### 自動判斷格式

```ts
const isDiscord = Boolean(this.webhookConfig.discordUrl);
const payload = isDiscord
  ? { content: summary }          // Discord 格式
  : { text: summary, mrkdwn: true }; // Slack 格式
```

兩個 webhook 只填一個（或兩個都填 → Slack 優先）。

### 推播訊息範例

```
🔥 *New HOT Lead* — Dana Lee (100/100)
• Email: dana@enterprise.co
• Company: Enterprise Co
• Source: referral
• CRM: 12345678901
```

---

## 六、SMTP 設定

### Gmail（最簡單）

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASSWORD=<App Password，不是登入密碼>
EMAIL_FROM="Symcio <your@gmail.com>"
```

**重點：** Gmail 不能用一般密碼，要去 [Google Account → Security → App Passwords](https://myaccount.google.com/apppasswords) 生一組 16 位字元 app password。

### Resend（推薦給正式環境）

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxxxxx
EMAIL_FROM="Symcio <hello@yourdomain.com>"
```

Resend 免費 3,000 封/月，送達率比 Gmail 高，支援自訂發件域名。

### SendGrid / Mailgun

同樣的 SMTP 協議，換 host / port / credentials 即可。

---

## 七、取得 Slack Webhook

1. 開啟一個 Slack workspace（或用現有的）
2. 到 [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
3. 選 **Incoming Webhooks** → 開啟 → **Add New Webhook to Workspace**
4. 選頻道（建議 `#leads` 或 `#symcio-ops`）→ Allow
5. 複製 webhook URL → 貼到 `.env`:
   ```env
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000/B00000/xxxxxxxx
   ```

---

## 八、取得 Discord Webhook

1. Discord 裡某頻道 → 右鍵 → **Edit Channel** → **Integrations** → **Webhooks**
2. **New Webhook** → 命名「Symcio Leads」→ 複製 URL
3. 貼到 `.env`:
   ```env
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxxxxx/xxxxxxxx
   ```

---

## 九、公開 API

```ts
class NotificationService {
  constructor(emailConfig: EmailConfig, webhookConfig: WebhookConfig);
  notifyAll(lead: Lead): Promise<NotificationResult>;
}

type NotificationResult = {
  internalEmail: boolean;
  welcomeEmail: boolean;
  slack: boolean;    // 也涵蓋 Discord
};
```

---

## 十、進階（還沒做）

- ⏳ **Email 模板引擎** — 目前 HTML 寫死在 code。未來可抽到 Handlebars / MJML，行銷同事可改模板不動 code
- ⏳ **多語系** — 英文客戶寄英文歡迎信
- ⏳ **Drip sequence** — 新 Lead 進來後第 3 天、第 7 天自動寄追蹤信（需排程器如 BullMQ）
- ⏳ **SMS 通知（Twilio）** — Hot lead 直接 SMS 推你手機
- ⏳ **Email 開信率追蹤** — 用 Resend / SendGrid 的 webhook 回填 HubSpot
