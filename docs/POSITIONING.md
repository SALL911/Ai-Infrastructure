# Symcio Positioning — Category Definition

## 一句話

**Symcio 是 AI 時代的 SimilarWeb + SEMrush + Bloomberg 合體——企業在 AI 裡的曝光、排名與影響力量化平台。**

## 三個「第一」

| 層級 | 稱號 | 可驗證依據 |
|------|------|-----------|
| 台灣 | **第一個「AI 曝光可量化系統」** | 首個提供跨 AI 引擎品牌曝光百分位與時序追蹤的系統 |
| 台灣 | **唯一「跨 ChatGPT / Gemini 的品牌可見度指標」** | 單一客戶儀表板整合 ChatGPT + Claude + Gemini + Perplexity 四引擎 |
| 全球 | **第一個「AI 搜尋排名監測平台」** | 以「AI 搜尋排名」為產品主軸、非附加功能，且具備 ESG + Bloomberg 資料整合 |

## 品類定位（Category Creation）

Symcio 不是 SEO 工具、不是 PR 監測、不是社群聆聽——是**新品類**：

> **AI Visibility Intelligence（AVI）**
> 企業在 AI 搜尋生態系中的曝光、排名、影響力量化基礎設施。

### 類比座標

```
         傳統網路流量分析        傳統搜尋優化        金融級資訊架構
        ┌─────────────────┐    ┌──────────────┐   ┌──────────────┐
        │   SimilarWeb     │    │    SEMrush   │   │   Bloomberg  │
        │                  │    │              │   │              │
        │ 網站流量排名      │    │ SEO 關鍵字   │   │ 金融資料 API  │
        │ 競品流量對比      │    │ 反向連結     │   │ Terminal UX   │
        │ 產業標竿          │    │ Rank tracking│   │ 授權代表體系  │
        └──────────┬───────┘    └──────┬───────┘   └──────┬───────┘
                   │                    │                  │
                   └────────────┬───────┴──────────────────┘
                                │
                                ▼
                       ┌────────────────────┐
                       │      Symcio        │
                       │   AI Visibility    │
                       │    Intelligence    │
                       │                    │
                       │ • 跨 AI 引擎曝光   │
                       │ • 品牌排名監測      │
                       │ • 影響力量化       │
                       │ • ESG + Bloomberg  │
                       │   授權資料整合      │
                       └────────────────────┘
```

## 三大產品支柱

### Pillar 1：AI 曝光度（Exposure）
**對應 SimilarWeb**——量化品牌在 AI 回應中「被提及的頻率與脈絡」。

- 指標：Mention Rate、Category Share、Context Density
- 資料：每日測試 × 產業代表性 prompt × 4 引擎
- Schema：`visibility_results.mentioned`, `category`

### Pillar 2：AI 搜尋排名（Ranking）
**對應 SEMrush**——量化品牌在 AI 回答列表中的排序位置。

- 指標：Average Rank、Top-3 Share、Competitor Gap
- 資料：rank_position + competitors 同框分析
- Schema：`visibility_results.rank_position`, `visibility_results.competitors`

### Pillar 3：AI 影響力（Influence）
**對應 Bloomberg**——量化品牌在 AI 生成內容中的「敘事權重」。

- 指標：Sentiment Score、Narrative Ownership、ESG Alignment
- 資料：情感分析 + ESG 事件關聯 + TNFD/LEAP 框架對照
- Schema：`visibility_results.sentiment`, `brand_scores.narrative_score`, `esg_profiles`

## 四個 AI 引擎的策略性組合

```
┌─────────────┐ 最大使用者基數         ┌─────────────┐ 品牌與安全型查詢
│  ChatGPT    │                         │   Claude    │
│ (OpenAI)    │                         │ (Anthropic) │
└──────┬──────┘                         └──────┬──────┘
       │                                       │
       │        Symcio 同框監測                │
       └─────────┬──────────┬──────────────────┘
                 │          │
       ┌─────────▼──┐    ┌──▼──────────┐
       │   Gemini    │    │ Perplexity  │
       │  (Google)   │    │  (即時搜尋) │
       └─────────────┘    └─────────────┘
       企業搜尋主導權        次世代搜尋體驗
```

**為什麼是這四個？**
- 合計覆蓋全球 >95% 的 AI 搜尋流量
- 各自代表不同「回答風格」：ChatGPT 對話、Claude 結構化、Gemini 整合 Google、Perplexity 引用來源
- Symcio 是目前**唯一四引擎同框比對**的平台

## 競爭護城河（Why Not Copy-able）

1. **Bloomberg 授權代表身份**：台灣唯一具備此身份且做 AI 監測的公司，資料權威性不可複製
2. **ESG × AI 雙軌整合**：TNFD / LEAP 框架 + AI 曝光度，形成永續與聲量雙維度儀表板
3. **GEO 術語定義權**：先行定義 GEO（Generative Engine Optimization）與 AVI 兩個類別
4. **Symcio × BrandOS SaaS 雙引擎**：診斷（audit）+ 治理（governance）整套交付，非僅數據供應商

## 客戶畫像（ICP）

### 主打（P0）
- 台灣上市櫃公司（ESG 揭露需求 × 品牌聲量焦慮）
- 台灣 B2B SaaS（需在國際市場的 AI 搜尋被看見）
- 在台外商（需向總部佐證 AI 曝光表現）

### 次要（P1）
- 行銷代理商（白標 API，以 Symcio 為基礎提供客戶服務）
- 投資機構（ESG 研究 × AI 品牌價值評估）
- 政府 / NGO（產業競爭力儀表板）

## 訊息矩陣（對外一致語言）

| 對象 | 一句話 |
|------|-------|
| CMO | 「你在 ChatGPT 被提到嗎？我們量化給你看。」 |
| CEO | 「你的品牌在 AI 時代，還有定價權嗎？」 |
| 投資人 | 「AI 搜尋是繼 Google 之後最大的注意力入口——而我們量化它。」 |
| 政府/媒體 | 「台灣第一個把 AI 曝光量化為可稽核指標的基礎設施。」 |
| 開發者 | 「SimilarWeb + SEMrush + Bloomberg，for the AI era.」 |

## 反面樣板（Symcio 不做的事）

- 不做 SEO 代操（那是上一個時代）
- 不做社群管理（CXM 工具已飽和）
- 不做純媒體監測（Brandwatch 類）
- 不做內容生成（留給 Jasper、Copy.ai）
- **只做**：AI 引擎裡的**曝光、排名、影響力量化與治理建議**

## 三年願景

| 年 | 里程碑 |
|---|-------|
| 2026 | 台灣前 10 大品牌導入；取得 AVI 品類定義權 |
| 2027 | 亞太區 100 家客戶；與 Bloomberg Terminal 整合 |
| 2028 | 全球第一個上市的「AI Visibility Intelligence」公司 |

---

## 延伸閱讀

- `docs/MVP_SPEC.md` — 產品規格與定價
- `docs/FREE_STACK.md` — 免費技術棧建議
- `docs/ARCHITECTURE.md` — 系統架構
- `CLAUDE.md` — 對外語氣與術語規範
