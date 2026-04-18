# Symcio $299 AI Visibility Audit — 報告模板

## 交付承諾

- 交付時間：**付款後 24 小時內**
- 格式：PDF + Markdown（同內容雙格式）
- 檔名：`{brand}-ai-visibility-audit-{YYYYMMDD}.pdf`
- 交付方式：Resend email + Supabase `visibility_reports.report_file_url`

## 報告結構（10 頁）

### Cover（1 頁）

```
SYMCIO AI VISIBILITY AUDIT
{Brand Name}
Industry: {Industry}
Audit Date: {YYYY-MM-DD}
Prepared by: Symcio
Bloomberg Taiwan 授權代表
```

視覺：Bloomberg Terminal 風格（深 ink 底 + 亮黃強調），無圖示雜訊。

---

### Section 1 — Executive Summary（1 頁）

**Overall AI Visibility Score: XX/100**

- Mention Rate: XX% (across 20 prompts × 4 engines = 80 measurements)
- Average Rank Position (when mentioned): X.X
- Top-3 Share: XX%
- Sentiment Distribution: Positive XX% / Neutral XX% / Negative XX%

**Industry Benchmark（暫以 Symcio 內部累積基準）**
- 你在 {industry} 產業排在第 XX 百分位
- 前段班（Top 20%）平均分數：YY/100
- 你與前段班的差距：ZZ 分

**三句話結論**（人工撰寫）：
1. 你的品牌在 {best engine} 表現最好，在 {worst engine} 最差。
2. 最大的機會在 {pillar: Exposure/Ranking/Influence}。
3. 若 30 天內執行 Section 4 的 3 個建議，預估可提升 XX 分。

---

### Section 2 — Four-Engine Breakdown（2 頁）

每個引擎獨立一小節。

#### ChatGPT（OpenAI）
- 測試 prompts：20
- 提及次數：X / 20
- 平均排名：X.X
- 情感分佈：XX% positive / XX% neutral / XX% negative
- 競品同框（最常同時被提到）：Competitor A (XX%), B (XX%), C (XX%)
- 最佳表現 prompt：{prompt text}（被提及，排名 1st）
- 最差表現 prompt：{prompt text}（完全未提及）

[同樣格式重複：Claude / Gemini / Perplexity]

---

### Section 3 — Competitor Map（1 頁）

**Radar Chart**（雷達圖）
- 你 vs. 三大競品的五維對比：Exposure / Ranking / Influence / ChatGPT 覆蓋 / Gemini 覆蓋

**Head-to-Head**（表格）

| 品牌 | Mention Rate | Avg Rank | Top-3 Share | Sentiment Index |
|------|--------------|----------|-------------|-----------------|
| 你 | XX% | X.X | XX% | +0.XX |
| 競品 A | XX% | X.X | XX% | +0.XX |
| 競品 B | XX% | X.X | XX% | +0.XX |
| 競品 C | XX% | X.X | XX% | +0.XX |

**Narrative Analysis**
- 競品 A 被 AI 描述的關鍵詞（前 5）：...
- 你被 AI 描述的關鍵詞（前 5）：...
- 缺口：你沒有被描述但競品有的關鍵詞：...

---

### Section 4 — Three Priority Improvements（2 頁）

**每個建議固定結構：**

#### Improvement #1: {Title}
- **Why**（現況痛點）：AI 在回答 {specific prompt} 時會提到 {competitor} 但不提到你。
- **What**（要做什麼）：{具體動作，如「在官網 /about 加一段 case study 涵蓋 X 關鍵字」}
- **How**（執行步驟）：
  1. ...
  2. ...
  3. ...
- **Expected Impact**：預估可提升 AI Visibility Score {N} 分
- **Time to implement**：{X hours / X days}
- **Cost**：$0–$XX

[三個建議總和：預估 30 天內可提升 XX 分]

---

### Section 5 — Recommended Next Actions（1 頁）

**立即（本週）**
- [ ] 執行 Improvement #1
- [ ] 修正 {specific AI-engine context} 錯誤

**30 天內**
- [ ] 執行 Improvement #2 + #3
- [ ] 重新掃描一次（included in $299 price，30 天內 free rescan）

**90 天**
- [ ] 考慮升級 **$1,999 Optimization** 方案：
  - Symcio 團隊直接協助實作
  - 90 天排名追蹤
  - 每週進度報告

**長期（若適合）**
- [ ] **$12,000 / 年 Symcio Intelligence Subscription**：
  - 每日自動追蹤
  - ESG × Bloomberg 資料疊加
  - 季策略會議

---

### Section 6 — Methodology（1 頁）

**測試 prompt 庫**：我們從 `geo-audit-prompts.json` 依你所屬產業抽 20 題，分四類：
- `top_companies`（5 題）：「best ... in ...」
- `alternatives`（5 題）：「alternatives to ...」
- `problem`（5 題）：「how do I ...」
- `comparison`（5 題）：「X vs Y」

**AI 引擎版本**（測試當下）：
- ChatGPT: GPT-4o-mini (API)
- Claude: claude-haiku-4-5
- Gemini: gemini-1.5-flash
- Perplexity: sonar

**評分公式**（公開於 GitHub repo）：
```
score = (mentioned ? 50 : 0)
      + (rank ? max(0, 50 - rank*5) : 0)
      + (positive ? 20 : negative ? -20 : 0)
```

**資料存放**：
- 原始 AI 回應：Supabase `ai_responses`
- 解析結果：Supabase `visibility_results`
- 你的唯一報告編號：{report_id}

可重現性：你可以在 GitHub repo 依本報告 ID 驗證所有原始資料（保密欄位以 SHA-256 hash 替代）。

---

### Section 7 — About Symcio（半頁）

Symcio 是 AI Visibility Intelligence (AVI) 平台 —— AI 時代的 SimilarWeb + SEMrush + Bloomberg。我們是 Bloomberg 台灣授權代表，專注量化企業在 AI 引擎裡的曝光、排名與影響力。

- 網站：symcio.tw
- 開源方法論：github.com/SALL911/BrandOS-Infrastructure
- 客戶支援：support@symcio.tw
- 企業方案：sales@symcio.tw

---

### Section 8 — Follow-up Offer（半頁）

> 這份報告是 **Phase 1：診斷**。
>
> Phase 2（實作）與 Phase 3（治理）可選：
>
> - **$1,999 AI Visibility Optimization**：我們團隊直接協助你執行本報告的三個改善建議，並做 90 天追蹤。
> - **$12,000 / 年 Symcio Intelligence**：每日追蹤、月報、季策略會議、ESG × Bloomberg 資料疊加。
>
> 預約 15 分鐘 Google Meet 討論你的數字：
> [Calendly link]
>
> 或直接升級：
> [Stripe Checkout link]

---

## 生成自動化（待建）

`scripts/generate_audit_report.py`（skeleton 待建）：
1. 讀 Supabase `visibility_results` 依 report_id 聚合
2. 使用 Claude API 撰寫 Section 1 的「三句話結論」與 Section 4 的建議
3. 產生 Markdown
4. 用 Gotenberg 或 `markdown-pdf` 轉 PDF
5. 上傳到 Supabase Storage，取得 URL
6. 透過 Resend 寄信
7. 更新 `visibility_reports.report_file_url`

## 人工驗收清單

每份報告交付前 Symcio 團隊要審：
- [ ] 三句話結論符合事實（不過度承諾）
- [ ] 三個改善建議可執行（不是空話）
- [ ] 競品名稱拼寫正確
- [ ] 排版無錯字
- [ ] PDF 檔名正確（{brand}-ai-visibility-audit-{YYYYMMDD}.pdf）
- [ ] email 收件人正確

## 第一批客戶特別流程

前 10 筆 $299 訂單由創辦人親自交付 + 30 分鐘 Google Meet 解讀報告。
目的：蒐集 testimonial + 改善產品 + 轉 $1,999 升級。
