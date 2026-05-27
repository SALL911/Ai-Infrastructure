---
title: "BCI：AI 時代的品牌資產量化座標系"
subtitle: "InterBrand 用了 38 年量化品牌價值。但它測不到 ChatGPT 裡你的品牌,也測不到 CSRD 後你的市場准入風險。"
author: Symcio Research
date: 2026-04-22
last_updated: 2026-05
platform: Medium
tags: [AI, Branding, InterBrand, ESG, CSRD, GEO, AVI, ISO10668, Symcio]
canonical: https://symcio-research.netlify.app/blog/bci-brand-capital-index
language: zh-TW
english_summary: true
---

# BCI：AI 時代的品牌資產量化座標系

> InterBrand 用了 38 年量化品牌價值。
> 但它測不到 ChatGPT 裡你的品牌,也測不到 CSRD 後你的市場准入風險。

2026 年,超過一半的 B2B 採購者在打開 Google 前已先問 AI。同一時間,歐盟 CSRD、ESPR、CBAM、台灣金管會的分階段 ESG 揭露要求,讓「合規準備度」變成市場准入的決定因素。**但 InterBrand、Brand Finance、Bloomberg 三家最權威的品牌與金融資料庫裡,完全沒有一個欄位叫「AI 曝光」,也沒有一個欄位叫「永續合規準備度」**。

不是他們落後。是**底層座標系換了**。

這篇文章介紹 Symcio Research 發表於 SSRN 的獨立研究論文 v1.0:**BCI（Brand Capital Index, 品牌資本指數）**——第一個同時納入 ISO 10668 所得法、永續法規合規、生成式 AI 引擎可見度的單一品牌資產時序。

---

## 一、傳統品牌估值的單維度局限

全球無形資產價值於 2024 年超過 74 兆美元,品牌價值佔其顯著且增長中的部分。然而,用於量化品牌價值的方法論——以 ISO 10668:2010 標準化,由 Interbrand 和 Brand Finance 等機構商業化實施——仍維持根本上的單維度:**衡量品牌對企業盈餘的財務貢獻**。

這個方法論的兩個盲點:

**第一,永續合規已成為市場准入的決定因素。** 因環境產品法規不合規而失去歐盟市場准入的品牌,遭受的是傳統財務分析在營收損失實際發生前無法捕捉的品牌價值減損。CSRD、ESPR、CBAM、TNFD——這些不是「ESG 加分項」,是「市場准入的最低門檻」。

**第二,生成式 AI 平台已成為消費者品牌發現的重要管道。** 2025 年主要市場已有超過 30% 的消費者透過 ChatGPT、Perplexity、Google AI Overview 而非傳統搜尋引擎進行產品研究。在 AI 生成的推薦中缺席的品牌面臨可衡量的品牌發現風險——目前沒有品牌估值方法論涵蓋此維度。

---

## 二、BCI 公式（公開、可獨立複製）

```
BCI = α · FBVnorm + β · SCVnorm + γ · AIVnorm

其中:
  FBV = Financial Brand Value             財務品牌價值（ISO 10668 所得法）
  SCV = Sustainability Compliance Value   永續合規價值（法規中立）
  AIV = AI Visibility Value               AI 可見度價值

  α + β + γ = 1.00
  BCI ∈ [0, 100]

2026 基準權重: α = 0.50, β = 0.25, γ = 0.25
2030 預估權重: α = 0.35, β = 0.35, γ = 0.30
```

三個子項皆經 min-max 標準化到 `[0, 100]`,最終 BCI ∈ `[0, 100]`。

### FBV · 財務品牌價值（ISO 10668 所得法）

```
FBV = 品牌營收 × 品牌角色指數 × 品牌強度評分 ÷ 折現率
```

品牌營收從企業總營收中分離品牌貢獻;品牌角色指數(0-1)衡量品牌在購買決策中的影響權重;品牌強度評分(0-100)由 10 個因子組成:清晰度、承諾度、治理、回應力、真實性、相關性、差異化、一致性、存在感、參與度。折現率反映品牌特定風險。

### SCV · 永續合規價值（法規中立設計）

```
SCV = 0.40 · RCS + 0.40 · EDS + 0.20 · NCS

  RCS = 法規合規分數 — 目標市場永續法規合規準備度
  EDS = ESG 揭露分數 — GRI / SASB / IFRS S1·S2 / GHG Scope 1·2·3 覆蓋
  NCS = 自然資本分數 — TNFD LEAP 或產業基準估算
```

台灣上市櫃公司的 SCV 反映金管會要求;出口歐盟的製造商的 SCV 額外反映 ESPR 和 CBAM 準備度;新加坡企業的 SCV 反映 MAS 永續報告指引。**沒有任何單一法規框架在評分方法論中被特殊對待**——這是 BCI 跨司法管轄區可適用性的核心設計。

### AIV · AI 可見度價值

```
AIV = Σp ( 引用率p × 平台權重p ) × GEO 覆蓋率 × 敘事品質

平台權重 (2026):
  ChatGPT 0.35 + Perplexity 0.25 + Google AI Overview 0.25 + Claude 0.15
```

對每個品牌執行 100 個標準化產業查詢,跨四引擎抽樣,計算引用率;乘以品牌結構化資料完整度(Wikidata、Schema.org、Google Knowledge Panel)與 AI 生成描述的敘事品質。

---

## 三、為什麼是這三個維度

InterBrand 的 Brand Strength Score 由 10 個因子組成(4 internal + 6 external),這份框架對網頁 + 廣告時代仍然有效。BCI v1.0 沒有重新發明這 10 個因子——**它們進入了 FBV 的「品牌強度評分」項**。

BCI 真正新增的兩個維度:

1. **SCV** 對應的是 InterBrand / Brand Finance 模型完全沒有的欄位:**強制性永續法規的合規準備度**。在 CSRD / ESPR / CBAM / TNFD 的世界裡,合規不合規不再是「ESG 評等加減分」,而是「能否賣進歐盟」「能否拿到銀行授信」「能否簽 B2B 大客戶」。
2. **AIV** 對應的是 SimilarWeb / SEMrush 完全沒有的欄位:**生成式 AI 引擎裡的品牌曝光**。當 30% 的消費者已經從 ChatGPT、Perplexity 取代 Google,「在 AI 答案裡缺席」就是可量化的品牌價值減損。

**Symcio Research 的主張**:BCI 不是要取代 ISO 10668。BCI **延伸** ISO 10668——把單維度的財務估值框架擴展為三維,涵蓋兩個 ISO 10668:2010 制定當年還不存在的市場現實(永續法規 × 生成式 AI)。

---

## 四、初步驗證結果

以 30 家台灣上市櫃公司為樣本,涵蓋 10 個產業,初步模擬結果:

- BCI 分數範圍:22–95(平均 58.3,標準差 19.7)
- FBV 與 AIV 相關:中度(r = 0.62)— 相關但獨立維度
- FBV 與 SCV 相關:弱(r = 0.31)— 確認財務表現與永續合規立場的獨立性
- 三因子模型比單一 FBV 多解釋約 15–20% 的後續 6 個月營收變動

> 以上為初步模擬;使用實際評估資料的實證驗證將於 v2.0 進行。

---

## 五、與既有方法論的邊界

Symcio Research 對 Interbrand、Brand Finance、Bloomberg 的立場:

- **致敬**:這三家是品牌量化 / 金融量化的巨人。我們不假裝在重新發明火。
- **不合作**:BCI 是 Symcio 獨立定義的指標,與 Interbrand 的 Brand Strength Score、Brand Finance 的 Brand Strength Index、Bloomberg 的任何專屬指標均無授權、合作或代表關係。
- **不抄欄位**:BCI 的 FBV / SCV / AIV 三維是 Symcio Research 重新設計的資料模型,與上述三家的內部欄位結構不重疊。
- **互補而非取代**:企業若已訂 Interbrand 年度報告、Bloomberg Terminal,BCI 是**補上 ISO 10668 框架外缺失的兩個維度**,不是要取代。

---

## 六、治理與透明度

**方法論委員會** — 三個獨立席位:財務估值委員(CVA/ASA 或同等資格)、永續科學委員(環境法規與合規專業)、AI 資料科學委員(NLP/ML 研究專業)。每季召開方法論審查會議,審查報告對外公開。

**開放方法論** — BCI 公式、權重參數和標準化基準完整公開。任何第三方均可使用公開的方法論和公開資料源獨立複製 BCI 計算。

**版本控制** — 所有方法論變更均記錄變更理由與生效日期。歷史 BCI 分數保留其計算時使用的方法論版本。

---

## 七、開發者資訊

- 方法論技術文件:[docs/BCI_METHODOLOGY.md](https://github.com/SALL911/BrandOS-Infrastructure/blob/main/docs/BCI_METHODOLOGY.md)
- 引擎原始碼:[scripts/bci_engine.py](https://github.com/SALL911/BrandOS-Infrastructure/blob/main/scripts/bci_engine.py)
- Provider 抽象層:[scripts/providers/](https://github.com/SALL911/BrandOS-Infrastructure/tree/main/scripts/providers)
- SQL schema:[supabase/migrations/](https://github.com/SALL911/BrandOS-Infrastructure/tree/main/supabase/migrations)
- SSRN 獨立研究論文:Huang, Chih-Chuan (2026), *品牌資本指數（BCI）方法論白皮書 v1.0*

---

## English Summary

**BCI (Brand Capital Index)** is a three-dimensional brand-valuation framework that extends the ISO 10668:2010 income-method approach to cover two market dimensions that did not exist when the standard was drafted: (1) mandatory sustainability-regulation compliance readiness, and (2) generative-AI-engine visibility.

Formula: `BCI = α·FBV + β·SCV + γ·AIV`, with `α + β + γ = 1`. 2026 baseline weights: `α = 0.50, β = 0.25, γ = 0.25`. 2030 projection: `α = 0.35, β = 0.35, γ = 0.30`.

- **FBV** — Financial Brand Value, computed via ISO 10668 income method: Brand Revenue × Role-of-Brand Index × Brand Strength Score ÷ Discount Rate.
- **SCV** — Sustainability Compliance Value, weighted `0.40 · RCS + 0.40 · EDS + 0.20 · NCS` (Regulatory Compliance / ESG Disclosure / Natural Capital). **Regulation-neutral by design**: measures compliance outcomes rather than adherence to any specific framework, ensuring cross-jurisdictional applicability (EU CSRD/ESPR/CBAM, Taiwan FSC, Japan TCFD, Singapore MAS, etc.).
- **AIV** — AI Visibility Value across ChatGPT (0.35), Perplexity (0.25), Google AI Overview (0.25), Claude (0.15), multiplied by GEO infrastructure completeness and narrative quality.

Validation: 30 Taiwan-listed companies, 10 industries, simulated three-factor model explains 15–20% additional variance in 6-month forward revenue vs. single-FBV baseline. FBV ↔ SCV correlation r = 0.31 (weak), confirming sustainability compliance captures an independent dimension.

BCI is independently defined by Symcio Research. Interbrand / Brand Finance / Bloomberg are referenced as nominative fair-use analogues only — no partnership, authorized-representative, or redistribution claim.

Open methodology: [github.com/SALL911/BrandOS-Infrastructure](https://github.com/SALL911/BrandOS-Infrastructure) · Public API: `GET https://symcio.tw/api/bci/{brand}`.

---

*Symcio Research 發表的 BCI 方法論論文以開放方法論形式發布;任何第三方均可使用公開的參數和公開資料源獨立複製計算。本文章旨在學術討論,不構成投資建議。*
