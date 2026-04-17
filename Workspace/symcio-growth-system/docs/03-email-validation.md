# ✅ 03 — Email 驗證 / 去重

> 在 Lead 進入 CRM 之前把「明顯垃圾」過濾掉，省下未來手動清單時間。

**原始碼：** [src/modules/lead-capture/validator.ts](../src/modules/lead-capture/validator.ts)

---

## 一、檢查項目

| 檢查 | 規則 | 失敗結果 |
|------|------|---------|
| **姓名** | `name.trim().length >= 2` | 400 錯誤 |
| **Email 必填** | 不可空 | 400 錯誤 |
| **Email 格式** | `^[^\s@]+@[^\s@]+\.[^\s@]+$` | 400 錯誤 |
| **拋棄式黑名單** | 13 個常見域名 | 400 錯誤 |
| **電話格式** | `^[+\d\s\-()]{6,20}$`（選填但若填就要合法） | 400 錯誤 |

---

## 二、拋棄式信箱黑名單

目前內建 13 個最常見的域名：

```
mailinator.com
guerrillamail.com
tempmail.com
10minutemail.com
trashmail.com
throwawaymail.com
yopmail.com
sharklasers.com
getnada.com
dispostable.com
maildrop.cc
mintemail.com
fakeinbox.com
```

### 如何擴充

`src/modules/lead-capture/validator.ts` 最上方有 `DISPOSABLE_DOMAINS` set，加新域名直接 push 進去即可。

**進階替代方案：** 串 [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) 或 [Kickbox API](https://kickbox.com/) 拿到即時更新的完整清單（> 3000 個域名），但會增加一次 HTTP 呼叫。

---

## 三、商用 vs 免費信箱識別

```ts
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.com.tw',
  'hotmail.com', 'outlook.com', 'icloud.com',
  'qq.com', '163.com', 'protonmail.com',
  'live.com', 'msn.com'
]);

isBusinessEmail = emailDomain && !isDisposable && !isFreeProvider
```

**為什麼區分：** 商用信箱（`@acme.co`）在 Lead Scoring 中 +25 分，免費信箱（`@gmail.com`）只 +5 分。B2B 場景裡公司信箱是「有決策權」的訊號。

---

## 四、`ValidationResult` 型別

```ts
{
  valid: boolean;              // 整體結果
  errors: string[];            // 所有錯誤訊息（使用者可讀）
  normalizedEmail: string;     // 去空白 + 全小寫
  emailDomain: string;
  isDisposable: boolean;
  isFreeProvider: boolean;
  isBusinessEmail: boolean;
}
```

後續 `scorer.ts` 會直接讀這個結果，不重複解析 email。

---

## 五、去重策略

### 第一層：本地 24 小時快取（capture.ts）

```ts
private isRecentDuplicate(email: string): boolean {
  const ts = this.recentEmails.get(email);
  if (!ts) return false;
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}
```

**目的：** 擋掉同一人短時間內連按兩次送出，避免重複寄歡迎信。

**限制：** 只在單一伺服器 process 內有效，重啟就清空。跨多台 server 需要換成 Redis。

### 第二層：HubSpot search → upsert

```ts
const existingId = await this.findContactByEmail(lead.email);
if (existingId) {
  // PATCH 既有 contact（更新而非新增）
  return { success: true, contactId: existingId, duplicate: true };
}
// POST 新 contact
```

**目的：** 跨時間的真實去重。HubSpot 是單一事實來源。

### 兩層協作

```
本地快取（快、短期）→ 擋重複 click
HubSpot search（慢、永久）→ 擋重複客戶
任一命中 → duplicate=true → 不發通知
```

---

## 六、正規化

所有 email 都會經過：

```ts
email.trim().toLowerCase()
```

**原因：**
- `  Alice@Acme.Co  ` 和 `alice@acme.co` 視為同一人
- HubSpot / 多數 email 服務本身就把 local part 當 case-insensitive（雖然 RFC 允許 case-sensitive，但實務上沒人這樣部署）

---

## 七、單元測試

[tests/leadCapture.test.ts](../tests/leadCapture.test.ts) 中 `describe('validateLead')` 涵蓋：

1. 正常 B2B lead 通過、`isBusinessEmail = true`
2. Mailinator 拋棄式信箱被拒
3. 短姓名 + 格式錯 email 同時被拒（多重錯誤）
4. Gmail 識別為 `isFreeProvider = true`，整體 valid = true
