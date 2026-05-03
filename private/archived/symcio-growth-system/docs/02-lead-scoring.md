# 📊 02 — Lead Scoring 自動評分

> 不是所有 Lead 都值得你花同樣時間跟進。這個模組把每筆 Lead 打成 0–100 分，自動分成 hot / warm / cold 三級。

**原始碼：** [src/modules/lead-capture/scorer.ts](../src/modules/lead-capture/scorer.ts)

---

## 一、評分公式

```
total = min(100, sourceScore + emailDomainScore + companyScore + completenessScore)
```

### 細項權重

| 項目 | 條件 | 加分 |
|------|------|------|
| **來源** | `referral` | +35 |
|  | `brand_ai_audit` | +30 |
|  | `linkedin` | +25 |
|  | `landing_page` | +20 |
|  | `website_form` | +15 |
|  | `line_community` | +10 |
|  | `other` | +5 |
| **Email 網域** | 商用網域（非免費、非拋棄式） | +25 |
|  | 免費信箱（gmail / yahoo / icloud...） | +5 |
|  | 拋棄式 | 直接拒絕（見模組 03） |
| **公司資訊** | 填了 company | +10 |
|  | 填了 jobTitle | +5 |
|  | 填了 websiteUrl（合法 URL） | +10 |
| **完整度** | 填了 phone | +5 |
|  | message 超過 20 字 | +10 |

---

## 二、分層

```ts
function scoreTier(total: number): 'hot' | 'warm' | 'cold' {
    if (total >= 70) return 'hot';
    if (total >= 40) return 'warm';
    return 'cold';
}
```

| 分層 | 分數 | 建議行動 |
|------|------|---------|
| 🔥 **Hot** | ≥ 70 | 24 小時內親自聯絡；HubSpot 標 `OPEN_DEAL` |
| 🌤 **Warm** | 40–69 | 3 天內寄個人化 email；HubSpot 標 `IN_PROGRESS` |
| ❄ **Cold** | < 40 | 進入 nurture 序列；HubSpot 標 `NEW` |

---

## 三、回傳結構

每筆 Lead 都附一份 `scoreBreakdown`：

```ts
{
  total: 80,
  sourceScore: 30,
  emailDomainScore: 25,
  companyScore: 15,
  completenessScore: 10,
  reasons: [
    "Source \"brand_ai_audit\" → +30",
    "Business email domain (acme.co) → +25",
    "Company provided → +10",
    "Job title provided → +5",
    "Detailed message (≥20 chars) → +10"
  ]
}
```

**為什麼保留 `reasons`：** 行銷同事要在 HubSpot 裡看到「這個人為什麼是 80 分」，不用去翻原始碼。

---

## 四、與 HubSpot 的對應

`scorer` 算完後，`hubspotClient` 會用分數決定 `hs_lead_status` 欄位：

```ts
private tierToHubSpotStatus(score: number): string {
  if (score >= 70) return 'OPEN_DEAL';
  if (score >= 40) return 'IN_PROGRESS';
  return 'NEW';
}
```

同時把分數寫到自訂欄位 `symcio_lead_score`（需先在 HubSpot 建這個 Contact property）。

---

## 五、常見分數範例

| 情境 | 輸入 | 分數 | 分層 |
|------|------|------|------|
| 朋友介紹 + 公司信箱 + 完整資料 | referral + CMO + message | **100** | 🔥 Hot |
| 轉介紹 + gmail + 零資料 | referral + eve@gmail.com | **40** | 🌤 Warm |
| 官網表單 + 公司信箱 | website_form + jane@acme.co | **40** | 🌤 Warm |
| Line 社群填單 + gmail | line_community + gmail | **15** | ❄ Cold |
| 拋棄式信箱 | mailinator.com | **拒絕** | — |

---

## 六、之後可以擴充的訊號（還沒做）

- ✅ 已做：來源、Email 網域、公司完整度
- ⏳ 可加：IP 地理位置（台灣 / 香港 +5）
- ⏳ 可加：訪問網站頁數（Pricing 頁 +15）
- ⏳ 可加：填表前在站上停留時間
- ⏳ 可加：LinkedIn 公司人數（> 50 人 +10）
- ⏳ 可加：message 的 AI 意圖分析（「立即購買」vs「隨便看看」）

---

## 七、單元測試

[tests/leadCapture.test.ts](../tests/leadCapture.test.ts) 涵蓋：

- `describe('scoreLead')` → 3 測試
  - business email + referral + full profile → **hot**
  - free email + low-value source → **cold**
  - 分數上限 100 不會爆表
