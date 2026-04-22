---
audience: InterBrand Best Global Brands 100 / 品牌方 CMO / VP Brand
goal: 引發一次 30 分鐘 discovery call
send_limit: 每日 ≤ 20 封（人工）
---

# Template 01 — InterBrand 100 CMO 冷信

> **使用前必讀**：這是起點。每封都要客製化 `[[個人化段落]]` 與主旨。

---

## 版本 A — 中文（寄台灣 / 華語圈 CMO）

**主旨**：`[[品牌名]]` 在 4 個 AI 引擎的提及率 — `[[百分比]]`

---

您好 `[[CMO 全名]]`，

我是 Symcio（全識）的創辦人 `[[你的名字]]`。我注意到 `[[品牌名]]` 在 InterBrand Best Global Brands 的排名 `[[名次]]`，但我們上週對 `[[品牌名]]` 跑了一次跨 ChatGPT / Claude / Gemini / Perplexity 的可見度測試——

**平均提及率：`[[實際測得的數字]]`**
**被推薦為產業首選的比例：`[[數字]]`**

`[[個人化段落 — 寫一句對方產品 / 近期發表 / 貼文的觀察，證明這不是群發]]`

Symcio 是台灣第一個 AI 曝光可量化系統，方法論開源（github.com/SALL911/BrandOS-Infrastructure）。我們跨四引擎每日量化品牌在生成式 AI 裡的提及、排名、情感，補上 InterBrand Brand Strength Score 在 AI 時代未覆蓋的維度。

請問您下週二或週四有 30 分鐘，我把 `[[品牌名]]` 的完整 audit 報告寄給您並做個 walk-through？

感謝您的時間。

Best,
`[[你的名字]]`
Symcio / 全識股份有限公司
`[[你的 email]]` · `[[你的 LinkedIn]]`
`[[公司登記地址]]`

附：方法論白皮書 · docs/BCI_METHODOLOGY.md
如不希望再收到，直接回覆 "STOP" 即可。

---

## 版本 B — English (global CMO)

**Subject**：Your brand's AI visibility rate is `[[percentage]]` — we measured it

---

Hi `[[First Name]]`,

Your brand ranks `[[#]]` on InterBrand Best Global Brands. Last week we ran it across ChatGPT, Claude, Gemini, and Perplexity for mention rate and ranking position:

- **Mention rate**: `[[X]]%` (industry avg: `[[Y]]%`)
- **Top-3 recommendation share**: `[[X]]%`
- **Dominant sentiment**: `[[positive/neutral]]`

`[[Personalization paragraph — one specific observation about their recent product launch, earnings call mention of brand strategy, or LinkedIn post. Makes it obvious this isn't mail-merge.]]`

Symcio is a Taiwan-based platform measuring brand visibility inside generative AI engines — the axis InterBrand's Brand Strength Score doesn't cover. Our methodology is open-source (github.com/SALL911/BrandOS-Infrastructure).

Would you have 30 minutes next Tuesday or Thursday for me to walk you through the full `[[Brand]]` report?

Best,
`[[Your Name]]`
Founder, Symcio
`[[email]]` · `[[LinkedIn]]`
`[[Company registered address]]`

P.S. If you'd prefer not to hear from us, just reply "STOP".

---

## 個人化段落的 3 個來源（10 分鐘找 1 條）

### 1. LinkedIn 貼文觀察
打開對方 LinkedIn → 最近 3 個月的貼文或轉發。找**他親自發的內容**（不是按讚）。
範例：
> 「看到您 3 月 `[[貼文主題]]` 的貼文提到 AI 對 `[[品牌]]` 新一代搜尋的挑戰——這正是我寫這封信的原因。」

### 2. 最近財報 / 法說會對品牌的敘述
Google：`"[Brand name]" earnings call brand strategy 2025`
範例：
> 「在最近一次財報 call 裡，您提到下半年要加重 `[[X]]` 的品牌投入。我們的 AI audit 發現這個主題在 ChatGPT 的 top-of-funnel prompt 裡 `[[品牌]]` 的曝光不到 20%——可能是一個即時可改善的缺口。」

### 3. Symcio audit 的實測數字
每封寄出前先跑一次：
```bash
BRAND_NAME="[[Brand]]" BRAND_INDUSTRY="[[industry]]" \
GEMINI_API_KEY=... python scripts/geo_audit.py
```
然後把 `avg_score` / `mention_rate_pct` / 意外發現當 hook。

---

## 回信後的 Sales Motion

| 他們回 | 你下一步 |
|--------|---------|
| ✅「好奇，請 send report」 | 48 hr 內寄 PDF + 附 30 分鐘 call 三個可選時段 |
| 🔶「把資料發我團隊看看」 | 寄 report + 問能否介紹到 digital / brand measurement team |
| ❌「不感興趣」 | 回「謝謝」，CRM 標記「Nurture / 6 個月後再試」 |
| ⚠️ 沒回信（7 天後）| 一次 follow-up：更短、加一則新數據（例：本週 Symcio 又測到什麼）|
| ⚠️ 沒回信（14 天後）| 停止。CRM 標記「Cold / 12 個月後可重啟」 |

絕不寄第二次 follow-up。

---

## 勾選清單（寄出前）

- [ ] 主旨只針對這一位收件人成立
- [ ] 第一段有具體數字（不是「我們覺得很厲害」）
- [ ] 有 `[[個人化段落]]`（證明研究過對方）
- [ ] 最後一段只問一件小事（30 分鐘 call、不是 demo）
- [ ] 簽名區有：公司登記地址 + LinkedIn + 退訂方式
- [ ] 今天還沒寄超過 20 封
- [ ] CRM 已登記
