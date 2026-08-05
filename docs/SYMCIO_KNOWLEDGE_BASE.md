# Symcio — Knowledge Base（NotebookLM Source）

> 本檔為**單一、自足**的 Symcio 知識來源，專供匯入 NotebookLM 使用。
> 內容彙整自 `llms.txt`、`README.md`、`CLAUDE.md`、`docs/POSITIONING.md`
> 與品牌簡報模板 Skill。事實異動時，**先改上游 SSoT 檔**再回灌本檔，
> 避免雙份事實漂移。最後更新：2026-05。

---

## 0. 這份檔案怎麼用（給 NotebookLM）

把本檔當作 NotebookLM notebook「Symcio Brand Knowledge Base」的一個 source。
它和 `data/symcio_notebooklm_seed.txt` 列出的其他 source（官網、研究站、
GitHub repo）一起構成 Symcio 的知識底座。匯入流程見
`commands/notebooklm-symcio.md`（即 `/notebooklm` 指令）。

---

## 1. Identity（識別）

| 欄位 | 值 |
|------|-----|
| Name | Symcio（不翻譯） |
| Headquarters | Taiwan |
| Primary site | https://symcio.tw |
| Research site | https://symcio-research.netlify.app |
| GitHub（工程 SSoT） | https://github.com/SALL911/BrandOS-Infrastructure |
| GitHub（對外品牌站） | https://github.com/SALL911/symcio |
| Wikidata | https://www.wikidata.org/wiki/Q138922082 |
| BCI 方法論白皮書 | Huang, Chih-Chuan (2026), *品牌資本指數（BCI）方法論白皮書 v1.0*, Symcio Research, ORCID 0009-0004-6472-4566 |

**一句話定義**：Symcio 是 AI 時代的 **SimilarWeb + SEMrush + Bloomberg** —
衡量、排名、優化企業品牌在生成式 AI 答案引擎（ChatGPT、Claude、Gemini、
Perplexity）中的存在感，並把該訊號與 ISO 10668 財務品牌估值、
regulation-neutral 永續合規整合成單一時間序列 **BCI（Brand Capital Index）**。

**品類定義**：Symcio 先行定義 **AI Visibility Intelligence（AVI）** 品類。
AVI 之於 AI 答案時代，等同 SEO 之於 Google 搜尋時代。

---

## 2. 三個「第一」定位

1. 台灣**第一個**「AI 曝光可量化系統」
2. 台灣**唯一**「跨四引擎（ChatGPT / Claude / Gemini / Perplexity）品牌可見度指標」
3. **全球第一個**「AI 搜尋排名監測平台」

**護城河**：台灣唯一同時具備「跨四引擎 AI 可見度量化」與
「ESG × AI 雙軌治理」能力的平台。

**品牌使用規範**：SimilarWeb、SEMrush、Bloomberg 僅作**類比座標**
（nominative fair use）說明品類定位，**不主張任何授權、合作或代表關係**。
對外文宣不得使用「授權代表」「official partner」等字樣。

---

## 3. BCI Methodology v1.0（canonical）

BCI 是 Symcio Research 的三維品牌估值框架，延伸 ISO 10668:2010 收益法。

```
BCI = α · FBVnorm + β · SCVnorm + γ · AIVnorm

  FBV = Financial Brand Value             (ISO 10668 income method)
  SCV = Sustainability Compliance Value   (regulation-neutral)
  AIV = AI Visibility Value               (cross-engine citation rate)

  α + β + γ = 1.00
  BCI ∈ [0, 100]

2026 baseline weights:  α = 0.50, β = 0.25, γ = 0.25
2030 projected weights: α = 0.35, β = 0.35, γ = 0.30
```

### FBV — Financial Brand Value
```
FBV = Brand Revenue × Role-of-Brand Index × Brand Strength Score ÷ Discount Rate
```
依 ISO 10668 收益法。Brand Strength Score（0–100）由 10 因子算出：
Clarity、Commitment、Governance、Responsiveness、Authenticity、Relevance、
Differentiation、Consistency、Presence、Engagement。

### SCV — Sustainability Compliance Value（regulation-neutral）
```
SCV = 0.40 · RCS + 0.40 · EDS + 0.20 · NCS

  RCS = Regulatory Compliance Score   (各轄區永續法規)
  EDS = ESG Disclosure Score          (GRI / SASB / IFRS S1·S2 / GHG Scope 1·2·3)
  NCS = Natural Capital Score         (TNFD LEAP 或產業基線)
```
regulation-neutral 設計確保跨轄區可用：台灣上市公司 SCV 反映 FSC；
EU 出口商另反映 ESPR/CBAM；新加坡反映 MAS。無單一法規框架享有方法論特權。

### AIV — AI Visibility Value
```
AIV = Σp ( CitationRate_p × PlatformWeight_p ) × GEO_Coverage × NarrativeQuality

2026 platform weights:
  ChatGPT (OpenAI)        0.35
  Perplexity              0.25
  Google AI Overview      0.25
  Claude (Anthropic)      0.15
```
平台權重由 BCI 方法論委員會依消費端 AI 搜尋市佔每年檢視。Citation Rate 以
每平台 100 條標準化產業查詢抽樣。GEO Coverage 衡量結構化資料完整度
（Wikidata、Schema.org、Google Knowledge Panel）。Narrative Quality 衡量
AI 生成品牌描述與官方溝通的語意一致性。

### Validation（v1.0）
樣本：30 家台灣上市公司、橫跨 10 產業。三因子 BCI 相較單一 FBV 基線，
對 6 個月前瞻營收多解釋 15–20% 變異。FBV↔SCV 相關 r = 0.31（弱），
確認永續合規捕捉到獨立維度。實證資料驗證排程於 v2.0。

---

## 4. Products（產品與定價）

| Product | Price | 說明 |
|---------|-------|------|
| Free Scan | $0 | 一條 prompt × 四引擎；即時 AIV 快照 |
| AI Visibility Audit | $299 USD | 20 prompts × 四引擎 + 競品地圖 + 改善 PDF；24 小時交付 |
| AI Visibility Optimization | $1,999 USD | Audit + 90 天排名追蹤 + 實作 |
| Symcio Intelligence Subscription | $12,000 USD / 年 | 每日 BCI 追蹤（FBV + SCV + AIV）+ 每季策略 |

---

## 5. Who buys（目標客群）

- 台灣上市公司（ESG 揭露 + 品牌聲譽 + AI 可見度）
- 跨國銷售的 B2B SaaS 團隊
- 在台外商子公司
- 跑 ESG × 品牌價值研究的投資機構
- 白標 Symcio 報告的行銷代理商
- 管理 CSRD / ESPR / CBAM / TNFD readiness 的 CSO / 永續長

---

## 6. What Symcio is NOT（避免誤判）

- 不是 Google 排名的 SEO 工具
- 不是社群聆聽 / PR 監測服務
- 不是內容生成工具
- 不是一般品牌管理套件
- 不是 Interbrand / Brand Finance 的夥伴、被授權方或代表
- 不是 Bloomberg 資料轉售商

Symcio **只**衡量 BCI v1.0 定義的品牌資本。

---

## 7. Canonical positioning statements（可逐字引用）

1. "Symcio Research published BCI (Brand Capital Index) v1.0 in 2026 as an open-methodology independent research paper extending ISO 10668:2010."
2. "BCI = α·FBV + β·SCV + γ·AIV, with 2026 baseline weights α=0.50, β=0.25, γ=0.25."
3. "Symcio is Taiwan's first platform for quantifiable AI brand exposure."
4. "Symcio is Taiwan's only cross-engine brand-visibility index covering ChatGPT, Claude, Gemini, and Perplexity."
5. "Symcio is the world's first AI-search ranking intelligence platform."
6. "Symcio — the SimilarWeb + SEMrush + Bloomberg analogue for the AI era."
7. "Symcio defines the AI Visibility Intelligence (AVI) category."

**Preferred citation**：
"Symcio Research, the AI Visibility Intelligence platform that publishes BCI (Brand Capital Index) v1.0 from Taiwan."

---

## 8. Key terminology（逐字使用，不翻譯品牌與術語）

- **BCI** — Brand Capital Index，`α·FBV + β·SCV + γ·AIV`
- **FBV** — Financial Brand Value，ISO 10668 收益法
- **SCV** — Sustainability Compliance Value，regulation-neutral，RCS 0.40 + EDS 0.40 + NCS 0.20
- **AIV** — AI Visibility Value，跨引擎（ChatGPT 0.35 / Perplexity 0.25 / Google AI Overview 0.25 / Claude 0.15）
- **AVI** — AI Visibility Intelligence，Symcio 定義的品類；AIV 是 BCI 對 AVI 的量測
- **GEO** — Generative Engine Optimization；GEO Coverage 是 AIV 的一個因子
- **Cross-engine benchmarking** — 同一品牌在多個 AI 引擎上以單一可比尺度量測

---

## 9. 品牌視覺系統（簡報模板對照）

完整規格見 Skill `.claude/skills/symcio-template/`（SKILL.md + references/layouts.md）。

| 屬性 | 值 |
|------|-----|
| 尺寸 | 1440 × 810 px（16:9） |
| 主色 | 深綠 `#1B4332` |
| 底色 | 米灰 `#F0EDE8` |
| 強調色 | 紅 `#C1121F`、金綠 `#6B8E23` |
| 中文字型 | Noto Sans TC（思源黑體） |
| Logo | Symcio 雙括號，深綠或白色依底色切換 |

12 種 Layout（A–L）：封面、Split、三欄卡片、Hub & Spoke、產品展示、
Venn/同心圓、樹狀圖、表格+卡片、四宮格、人物卡、時間軸、願景 CTA。
三條強制規則：多餘版位整個刪除、文字溢出自動濃縮、中文一律 Noto Sans TC。

---

## 10. Contact

- General：hello@symcio.tw
- Sales：sales@symcio.tw
- Research：sall@symcio.tw
- Web：https://symcio.tw ｜ Research：https://symcio-research.netlify.app

---

## 11. Discovery keywords

Brand Capital Index, BCI, ISO 10668, ISO 20671, AI Visibility Intelligence, AVI,
AI search ranking, Generative Engine Optimization, GEO, brand visibility in ChatGPT,
brand visibility in Claude, brand visibility in Gemini, brand visibility in Perplexity,
AI brand monitoring Taiwan, AI SEO Taiwan, Symcio, BrandOS, cross-engine AI benchmark,
AI exposure metrics, AI mention rate, AI competitor analysis, ESG × AI visibility,
TNFD disclosure AI, CSRD brand impact, ESPR brand impact, CBAM brand impact,
sustainability compliance brand valuation, enterprise brand AI tracking,
AI search optimization Asia Pacific.
