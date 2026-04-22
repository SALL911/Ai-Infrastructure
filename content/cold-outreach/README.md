# `content/cold-outreach/` — 1-to-1 個人化冷信 Template

> **這個目錄只存 Template 與流程，不存收件人名單、也不接任何批量寄信工具。**

---

## 法律框架（寄信前必讀）

### 為什麼不做批量自動化

- **GDPR**（EU 收件人）：違規單件最高 €20M 或 4% 年營收，2023 年 Meta 單筆 €1.2B
- **CAN-SPAM**（美國）：每封最高 $51,744（2024 調整後）；需真實 From / 物理地址 / 一鍵退訂
- **台灣個資法**：未取得當事人同意的蒐集 / 利用 / 寄發，最高 200 萬 NTD + 刑責
- **網域信譽**：大量發送一次，Gmail / Outlook 的 reputation scoring 會把 `symcio.tw` 打成 spam domain，未來**所有**email（包括合法交易信）都會進垃圾夾

### 合規的冷信 = 1-to-1 個人化

| 項目 | 合規做法 |
|------|---------|
| 收件人來源 | **僅限**該公司官網 / LinkedIn / 已公開 IR contact / conference 名片 |
| 寄件量 | **每日 ≤ 20 封**（Gmail 新發件人 reputation 上限）|
| 個人化程度 | 主旨 + 前 2 句必須提到對方**具體產品 / 近期新聞 / 文章**，不能是 mail-merge |
| 寄送管道 | **人工**用你的 Gmail / Outlook 寄（不接 SendGrid 批量 API）|
| 追蹤 | 不用 tracking pixel（容易被視為 spam signal）|
| 退訂 | 明確 reply-to 的 opt-out 指示（「如您不希望再收到，回覆 STOP」）|
| 物理地址 | 信尾放公司登記地址 |

### 不做的事（我拒絕寫的自動化）

- ❌ `scripts/mass_cold_email.py`（批量寄 InterBrand 100）
- ❌ 接 Resend / SendGrid 的 bulk send
- ❌ 抓 LinkedIn / 任何非官方公開來源的 email
- ❌ 冒用他人身份作為 reply-to

---

## Template 清單

每個 template 都是**起點**，實際寄出前必須：

1. 改掉 `[[個人化段落]]` — 根據你對對方的研究（近期產品發布、財報 call、LinkedIn 貼文）
2. 主旨改成**只針對這一位收件人**才成立的句子
3. 自己重讀一次，問自己：「如果我是對方，會不會按 spam？」

### 檔案結構

- `01-interbrand-cmo.md` — 針對 InterBrand 100 榜上品牌的 CMO / VP Brand / Chief Strategy Officer
- `02-kantar-cmo.md` — 針對 Kantar BrandZ 榜上品牌（含亞太重點）
- `03-agency-partner.md` — 針對品牌顧問公司（InterBrand, Kantar, Landor, Wolff Olins 本身）
- `04-investor-pe-vc.md` — 針對做 Consumer / Brand 投資的 PE / VC（Sequoia, KKR, L Catterton）

---

## 個人化研究工作量（每封 10–15 分鐘）

每封冷信**之前**，花 10–15 分鐘看：

| 來源 | 找什麼 |
|------|--------|
| 對方公司官網 → About / IR | 最新財報的品牌資產相關敘述、CMO 姓名 |
| LinkedIn（對方個人）| 最近 3 個月的貼文 / 轉發；特別注意 "AI"、"brand equity"、"digital" 關鍵字 |
| 對方公司的 AI 曝光實測 | 我用 Symcio 對該品牌跑一次 free audit，附件或連結放 audit 結果 |
| 最近 6 個月的媒體報導 | 有沒有 CMO / Brand 相關的新聞 |

這 10–15 分鐘的 ROI：回應率從 1–2% → 15–25%。

---

## 實務節奏

| 週期 | 量 | 累計 |
|------|---|------|
| 第 1 週 | 每日 5 封 | 25 封 |
| 第 2–4 週 | 每日 10 封 | 小計 ~225 封（InterBrand 100 + Kantar 100 + 重點 25）|
| 第 5+ 週 | 跟進未回信者 1 次（**僅一次**）| 持續 follow-up |

每封寄出後用 CRM（Notion / HubSpot）紀錄：
- 收件人、日期、是否回信、回信摘要
- 下次追蹤日（7 / 14 / 30 天）

---

## Symcio 獨家 hook

比起純寫「我們有 AI 可見度工具」，**附上對方品牌的實際 audit 結果**是最強的 hook：

```bash
# 寄信前跑一次，拿 avg_score / mention_rate 當 hook
BRAND_NAME="Nike" BRAND_INDUSTRY="consumer_goods" \
GEMINI_API_KEY=... python scripts/geo_audit.py
```

報告 JSON 裡的 `avg_score` + `mention_rate_pct` 寫進主旨或第一段，**對方就會想打開**。

「Nike 在 ChatGPT / Claude / Gemini / Perplexity 的平均提及率只有 35%」這樣的第一句，就是你贏過所有其他冷信寄件人的原因。
