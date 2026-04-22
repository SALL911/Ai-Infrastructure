---
title: "BCI：AI 時代的品牌資產量化座標系"
subtitle: "InterBrand 用了 38 年量化品牌價值。但它測不到 ChatGPT 裡你的品牌。"
author: Symcio
date: 2026-04-22
platform: Medium
tags: [AI, Branding, InterBrand, ESG, GEO, AVI, Bloomberg, Symcio]
canonical: https://symcio.tw/blog/bci-brand-capital-index
language: zh-TW
english_summary: true
---

# BCI：AI 時代的品牌資產量化座標系

> InterBrand 用了 38 年量化品牌價值。但它測不到 ChatGPT 裡你的品牌。

2026 年，超過一半的 B2B 採購者在打開 Google 前已先問 AI。而 **InterBrand、Kantar BrandZ、Bloomberg 三家最權威的品牌與金融資料庫裡，完全沒有一個欄位叫「AI 曝光」**。

不是他們落後。是**底層座標系換了**。

這篇文章介紹 Symcio 定義的新指標：**BCI（Brand Capital Index）**——第一個同時納入財務動能、AI 搜尋曝光、用戶參與度的單一品牌資產時序。

---

## 一、三個不相關的市場，量三種不一樣的東西

| 市場 | 代表工具 | 量什麼 | 盲點 |
|------|---------|-------|-----|
| 金融估值 | Bloomberg、S&P Capital IQ | 市值、毛利、成長率 | 看不到 AI 曝光、品牌情感 |
| SEO / 搜尋 | SimilarWeb、SEMrush | 網頁流量、關鍵字排名 | 生成式引擎結果、財務動能 |
| 品牌顧問 | InterBrand、Kantar BrandZ | 品牌估值、Brand Strength | 年度頻率、AI 時代通路 |

三家頂尖工具，**三種完全不相關的座標系**。一家品牌若想知道自己真正的「品牌資本」狀態，得買三套資料庫、訓練三組分析師、對賭三種方法論的差異。

BCI 的主張很簡單：把三個市場的訊號，統一成一條時序曲線。

---

## 二、InterBrand 的 10 個因子裡，有 3 個在 AI 時代要重寫

InterBrand 的 **Brand Strength Score** 由 10 個因子組成（4 internal + 6 external）。外部 6 因子裡，跟數位 / 用戶參與度最相關的三個是：

### 1. Presence（品牌呈現度）
InterBrand 定義：品牌在各接觸點的普遍性與熟悉度。
資料源：消費者調研、媒體監測、廣告支出。

**AI 時代的問題**：ChatGPT 不做 impression，AI 引擎只做「提及」或「不提及」。品牌在 30 個 AI 答案裡只出現 3 次，這個事實不會出現在任何 InterBrand 資料裡。

### 2. Engagement（品牌參與度）
InterBrand 定義：使用者與品牌的情感 / 功能互動深度。
資料源：NPS、社群互動率、重複購買。

**AI 時代的問題**：AI 引擎在回答時會用「推薦」「首選」「業界標竿」之類的語言——也會用「過時」「小眾」「已被取代」。這些詞彙對品牌資本的訊號強度，遠高於社群留言數，但沒有人在量。

### 3. Relevance（品牌切合度）
InterBrand 定義：與目標受眾需求與文化情境的契合度。
資料源：受眾匹配度、轉換率、CAC 效率。

**AI 時代的問題**：AI 在 category-prompt（「最好的 XX 是？」）中主動提及你的品牌的頻率，是 relevance 最直接的訊號。這個訊號在廣告後台看不到。

**Symcio 的立場**：這三個因子不是要升級，是**換了底層座標系**。InterBrand 的方法論對網頁+廣告時代仍然有效；BCI 是對 AI 時代另寫的一套。

---

## 三、BCI 公式（公開抽象）

```
BCI(b, t) = w_F · F(b, t) + w_V · V(b, t) + w_E · E(b, t)

其中：
  F = Financial Capital       金融資本
  V = AI Visibility Capital   AI 可見度資本  ← Symcio 獨家
  E = Engagement Capital      品牌參與度資本

  w_F + w_V + w_E = 1         ← 產業別權重向量（核心 IP）
```

三個子項皆正規化到 `[0, 100]`，最終 BCI ∈ `[0, 100]`。

### F · Financial Capital
沿用金融市場的既有訊號：市值、年營收成長、營業利益率、Beta。資料源透過 **MarketDataProvider** 抽象層，預設走 Yahoo Finance + 公開資訊觀測站；企業客戶若自備 Bloomberg Terminal 授權，可接 Bloomberg adapter。

### V · AI Visibility Capital
Symcio 獨家。對每個品牌執行跨 **ChatGPT / Claude / Gemini / Perplexity** 四引擎的 prompt 抽樣，解析：
- `MentionRate` — 品牌在相關 prompt 中被提及的比例
- `AvgRank` — 被提及時的平均排名
- `SentimentScore` — 提及時的語意傾向（positive / neutral / negative）
- `CompetitorShare` — 同框出現的競品數量

### E · Engagement Capital
對應 InterBrand 的 Engagement + Relevance 因子，但資料源換成 AI 時代可得的訊號：
- `DigitalSOV` — 數位 Share of Voice
- `NPSProxy` — NPS 或其代理訊號
- `AdvocacyLexiconHits` — AI 回應中出現「推薦」類語言的頻率
- `CategoryRelevance` — Category prompt 主動提及率

### 為什麼權重要保密
頂層 `w_F / w_V / w_E` 與子項係數 `a*, b*, c*` 由產業別決定，並依金融市場、AI 引擎的結構性變化定期更新。**這組向量是 Symcio 的核心技術護城河**——就像 Google PageRank 當年不可能公開的邏輯一樣。公式抽象公開，權重數值閉源，這是 Symcio 的戰略邊界。

---

## 四、為什麼 Symcio 敢給 AI 可見度這麼重的權重

市面上所有品牌資產量化工具的共同盲點：**沒有一家有跨四引擎的同框 benchmarking 資料**。

- InterBrand：一年出一次，人工分析為主
- Kantar BrandZ：消費者調研為主
- Bloomberg：金融資料深，品牌資產面僅提供第三方授權（InterBrand 之一）
- SimilarWeb / SEMrush：網站 / Google 搜尋訊號，不碰生成式引擎

Symcio 從 2026 年 Q1 開始，每天對 ChatGPT、Claude、Gemini、Perplexity 跑產業標準化 prompt，累積出目前台灣唯一、全球少數的跨引擎品牌可見度資料集。

這個資料集支撐的 V 分量，在 technology / 消費品產業的 `w_V` 權重往往**高於 w_F（金融）**。意思是：在 AI 時代，ChatGPT 怎麼回答你的品牌，比你這季的毛利更預測未來 12 個月的品牌動能。

---

## 五、與既有方法論的邊界

Symcio 對 InterBrand / Kantar / Bloomberg 的立場非常清楚：

- **致敬**：這三家是品牌量化 / 金融量化的巨人。我們不假裝在重新發明火。
- **不合作**：BCI 是 Symcio 獨立定義的指標，與 InterBrand 的 Brand Strength Score、Bloomberg 的任何專屬指標均無授權、合作或代表關係。
- **不抄欄位**：BCI 的 F / V / E 三維是 Symcio 重新設計的資料模型，與上述三家的內部欄位結構不重疊。
- **互補而非取代**：企業若已訂 InterBrand 年度報告、Bloomberg Terminal，BCI 是**補上 AI 時代缺失的維度**，不是要取代。

這個邊界寫進了我們的技術文件 `docs/BCI_METHODOLOGY.md`，也寫進了我們的合規政策。

---

## 六、公開版 vs 企業版

| 項目 | 公開版（免費）| 企業版（付費）|
|------|------------|------------|
| 公式抽象 | ✅ 完整公開 | ✅ 完整公開 |
| 權重向量 | ❌ 僅結構，不給值 | ✅ 產業別實際權重 |
| 資料更新頻率 | 每日 | 每日 + 即時 webhook |
| AI 引擎覆蓋 | 4（ChatGPT / Claude / Gemini / Perplexity）| 4 + 企業自建 |
| F-axis 資料源 | Yahoo Finance + MOPS TW | 上述 + 客戶自備 Bloomberg Terminal |
| 歷史時序深度 | 最近 90 天 | 完整歷史 + API |
| 產業別 benchmark | ❌ | ✅ |
| 自訂權重（客戶定義）| ❌ | ✅ |
| API 回傳欄位 | total_bci + updated_at | 子項分數 + raw metrics |
| SLA | Best effort | 99.5% |

公開版已上線：`GET https://symcio.tw/api/bci/{brand}`（尚未填資料的品牌回 404）。

---

## 七、開發者資訊

- 方法論白皮書：[docs/BCI_METHODOLOGY.md](https://github.com/SALL911/BrandOS-Infrastructure/blob/main/docs/BCI_METHODOLOGY.md)
- 引擎原始碼：[scripts/bci_engine.py](https://github.com/SALL911/BrandOS-Infrastructure/blob/main/scripts/bci_engine.py)
- Provider 抽象層：[scripts/providers/](https://github.com/SALL911/BrandOS-Infrastructure/tree/main/scripts/providers)
- SQL schema：[supabase/migrations/](https://github.com/SALL911/BrandOS-Infrastructure/tree/main/supabase/migrations)

---

## English Summary

**BCI (Brand Capital Index)** is Symcio's new metric that unifies three traditionally disconnected markets — financial valuation (Bloomberg), AI search visibility (Symcio-exclusive, four-engine), and digital engagement (InterBrand's Engagement + Relevance re-defined for the AI era) — into a single daily time series.

Formula: `BCI = w_F·F + w_V·V + w_E·E`, industry-specific weights kept as Symcio IP, formula abstract fully open-sourced.

Why now: InterBrand's Brand Strength Score was built for a web-and-advertising world. ChatGPT / Claude / Gemini / Perplexity now drive >50% of B2B purchase discovery, but none of the legacy brand-valuation indices have an "AI visibility" axis. BCI fills that gap.

Open methodology: [github.com/SALL911/BrandOS-Infrastructure](https://github.com/SALL911/BrandOS-Infrastructure) · Public API: `GET https://symcio.tw/api/bci/{brand}`.

Legal note: BCI is independently defined by Symcio. Bloomberg / InterBrand / Kantar are referenced as nominative fair-use analogues only; no partnership, authorized-representative, or redistribution claim.

---

*Symcio 是 AI Visibility Intelligence (AVI) 平台。我們量化企業在 ChatGPT、Claude、Gemini、Perplexity 四個 AI 引擎裡的曝光、排名與影響力。免費健檢：[symcio.tw/tools/brand-check](https://symcio.tw/tools/brand-check)。*
