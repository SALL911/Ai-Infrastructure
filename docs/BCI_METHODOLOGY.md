# BCI Methodology — Brand Capital Index

> Symcio 的核心可量化指標,整合財務品牌價值、永續合規價值與 AI 可見度價值為單一時序指標。
>
> **正式方法論依據:** Huang, Chih-Chuan (2026), *品牌資本指數（BCI）方法論白皮書 v1.0*, Symcio Research. ORCID: 0009-0004-6472-4566.
>
> 本文件為 Symcio 對外公開的方法論文件,內容對齊上述獨立研究論文 v1.0。

---

## 一、為什麼需要 BCI

傳統品牌估值方法論——以 ISO 10668:2010 標準化,由 Interbrand 與 Brand Finance 等機構商業實施——仍維持單維度:衡量品牌對企業盈餘的財務貢獻。但全球經濟有兩個結構性轉變,已創造出現有框架無法捕捉的品牌價值維度:

1. **永續合規已成為市場准入的決定因素** — 強制性永續法規(歐盟 CSRD、ESPR、CBAM、台灣金管會分階段 ESG 揭露要求 2025-2029、日本強制性 TCFD 報告、TNFD)直接影響品牌在關鍵市場的運營能力。因環境產品法規不合規而失去歐盟市場准入的品牌,遭受的是傳統財務分析在營收損失實際發生前無法捕捉的品牌價值減損。
2. **生成式 AI 平台已成為消費者品牌發現的重要管道** — 2025 年主要市場已有超過 30% 的消費者透過 AI 驅動平台(ChatGPT、Perplexity、Google AI Overview)而非傳統搜尋引擎進行產品研究。在 AI 推薦中缺席的品牌面臨可衡量的品牌發現風險。

BCI 把上述三個維度整合為單一時序指標,建立在 ISO 10668、ISO 20671 國際標準之上,設計為全球適用、法規中立、開放方法論。

---

## 二、BCI 公式

```
BCI = α · FBVnorm + β · SCVnorm + γ · AIVnorm

其中:
  FBV = Financial Brand Value             財務品牌價值（ISO 10668 所得法）
  SCV = Sustainability Compliance Value   永續合規價值（法規中立）
  AIV = AI Visibility Value               AI 可見度價值（跨引擎引用率）

  α + β + γ = 1.00
  BCI ∈ [0, 100]
```

三個子項皆經 min-max 標準化到 `[0, 100]`,最終 BCI ∈ `[0, 100]`。

---

## 三、三層架構

### 3.1 第一層:財務品牌價值（FBV）

```
FBV = 品牌營收 × 品牌角色指數 × 品牌強度評分 ÷ 折現率
```

依循 ISO 10668 所得法方法論:

- **品牌營收** — 從企業總營收中分離品牌貢獻
- **品牌角色指數**(0–1) — 衡量品牌在購買決策中的影響權重,以產業為基準
- **品牌強度評分**(0–100) — 由 10 個因子計算:清晰度、承諾度、治理、回應力、真實性、相關性、差異化、一致性、存在感、參與度
- **折現率** — 反映品牌特定風險,由產業 WACC 依品牌強度反向調整

### 3.2 第二層:永續合規價值（SCV）

```
SCV = w₁ · RCS + w₂ · EDS + w₃ · NCS

  w₁ = 0.40  RCS — Regulatory Compliance Score
  w₂ = 0.40  EDS — ESG Disclosure Score
  w₃ = 0.20  NCS — Natural Capital Score
```

SCV 衡量品牌在適用永續法規框架下的合規準備度,設計為**法規中立**——子指標衡量的是合規成果,而非對任何特定專有框架的依附。

| 子指標 | 權重 | 定義 | 資料來源 |
|--------|------|------|---------|
| **RCS** 法規合規分數 | 0.40 | 目標市場永續法規合規準備度。衡量產品環境資料完整度、供應鏈可追溯性、碳報告準備度、市場准入風險評估。適用法規因司法管轄區而異。 | 公開法規申報、企業永續報告、供應鏈稽核資料 |
| **EDS** ESG 揭露分數 | 0.40 | ESG 揭露品質與完整度。衡量 GRI 標準覆蓋率、SASB 產業指標完整度、IFRS S1/S2 對齊度、GHG Protocol Scope 1/2/3 報告品質、第三方確信等級。 | 公開 ESG 報告、台灣公開資訊觀測站等法規申報、ESG 資料平台 |
| **NCS** 自然資本分數 | 0.20 | 品牌自然相關依賴度、衝擊度及管理評估。已進行 TNFD LEAP 評估者以實際資料計分;未進行者以產業基準估算。 | TNFD 報告、ENCORE 資料庫、產業級自然資本依賴度估算 |

**法規中立設計**確保 BCI 跨司法管轄區的適用性:台灣上市櫃公司的 SCV 反映金管會要求;出口歐盟的製造商的 SCV 額外反映 ESPR 和 CBAM 準備度;新加坡企業的 SCV 反映 MAS 永續報告指引。沒有任何單一法規框架在評分方法論中被特殊對待。

### 3.3 第三層:AI 可見度價值（AIV）

```
AIV = Σp ( 引用率p × 平台權重p ) × GEO 覆蓋率 × 敘事品質
```

| 變數 | 定義 | 範圍 |
|------|------|------|
| **引用率(CR)** | 品牌在 AI 平台 p 對 100 個標準化產業查詢的回答中被提及的頻率 | 0 – 100 |
| **平台權重(PW)** | AI 平台的消費者搜尋行為市場份額權重。當前值:ChatGPT 0.35、Perplexity 0.25、Google AI Overview 0.25、Claude 0.15。每年審查。 | 總和 = 1.00 |
| **GEO 覆蓋率(GC)** | 品牌結構化資料基礎設施的完整度:Wikidata 實體、Schema.org 標記、Google Knowledge Panel | 0 – 100 |
| **敘事品質(NQ)** | AI 生成的品牌描述相對於品牌官方溝通的準確度與正面性,以語意相似度分析評估 | 0 – 100 |

### 3.4 權重校準

| 係數 | 2026 基準值 | 2030 預估 | 校準邏輯 |
|------|-----------|----------|---------|
| α（FBV）| 0.50 | 0.35 | 財務價值在目前市場共識中仍為主導,但隨永續與 AI 維度重要性增加而下降 |
| β（SCV）| 0.25 | 0.35 | 永續合規日益決定市場准入;法規範圍跨司法管轄區持續擴大 |
| γ（AIV）| 0.25 | 0.30 | AI 搜尋滲透率年增 30%+;預計 2030 年超過 50% 消費者搜尋量 |

權重由 BCI 方法論委員會每年審查,基於實證指標:法規採用率、消費者 AI 搜尋滲透資料、各維度與後續品牌財務表現的觀察相關性。

> **校準工具與流程**:從資料集產出 / 驗證權重數值的程序、grid search 與 Spearman rank correlation 門檻見 [`private/bci/CALIBRATION.md`](../private/bci/CALIBRATION.md);配套腳本 [`scripts/bci_calibrate.py`](../scripts/bci_calibrate.py)(stdlib-only,本地 + CI 可跑)。產業別校準的實際數值為 Symcio 企業版 IP,但校準**程序**本身公開可審。

---

## 四、初步結果（v1.0）

以 30 家台灣上市櫃公司為樣本,涵蓋 10 個產業,初步模擬結果:

- BCI 分數範圍:22–95(平均 58.3,標準差 19.7)
- FBV 與 AIV 相關:中度(r = 0.62)— 相關但獨立維度
- FBV 與 SCV 相關:弱(r = 0.31)— 確認財務表現與永續合規立場的獨立性
- 三因子模型比單一 FBV 多解釋約 15-20% 的後續 6 個月營收變動

> 以上結果為初步模擬;使用實際評估資料的實證驗證將於 v2.0 進行。

---

## 五、治理架構

- **方法論委員會** — 三個獨立席位:財務估值委員(CVA/ASA 或同等資格)、永續科學委員(環境法規與合規專業)、AI 資料科學委員(NLP/ML 研究專業)。每季召開方法論審查會議,審查報告對外公開。
- **開放方法論** — BCI 公式、權重參數和標準化基準完整公開。任何第三方均可使用公開的方法論和公開資料源獨立複製 BCI 計算。
- **版本控制** — 所有方法論變更均記錄變更理由與生效日期。歷史 BCI 分數保留其計算時使用的方法論版本。

---

## 六、資料層架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Symcio BCI Engine                         │
│                 (scripts/bci_engine.py)                      │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ FBV · 財務   │   │ SCV · 永續   │   │ AIV · AI     │
│  Provider    │   │ Compliance   │   │  Visibility  │
│ (abstract)   │   │  Provider    │   │  (Symcio)    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
 ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
 │ Adapters:   │   │ Adapters:    │   │ geo-audit   │
 │ - yfinance  │   │ - MOPS TW    │   │  .yml →     │
 │ - mops_tw   │   │ - GRI/SASB   │   │  visibility_│
 │ - bloomberg │   │ - TNFD/CBAM  │   │  results    │
 │   (stub,    │   │ - 永續報告   │   │  4-engine   │
 │    需自備   │   │              │   │  sampling   │
 │    Terminal)│   │              │   │             │
 └─────────────┘   └──────────────┘   └─────────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
                  ┌───────────────┐
                  │ Supabase      │
                  │ bci_snapshots │  ← 每日寫入
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ /api/bci/:id  │  ← 只出 total_bci + updated_at
                  └───────────────┘
```

### 資料源 — FBV 層

| Adapter | 授權 | 預設啟用 | 備註 |
|---------|------|----------|------|
| `yfinance_adapter` | Yahoo Finance(非官方,研究用途)| ✅ | 全球主要市場;延遲 15 分鐘 |
| `mops_tw_adapter` | 公開資訊觀測站(公開資料)| ✅ | 台股 TWSE / TPEX |
| `alphavantage_adapter` | Alpha Vantage Free(500 req/day)| 選配 | 需 `ALPHAVANTAGE_API_KEY` |
| `bloomberg_stub` | **客戶自備 Terminal 訂閱** | ❌ | 見下 |

### 資料源 — SCV 層（法規中立）

| 區域 | 資料來源 | 涵蓋範圍 |
|------|----------|---------|
| 台灣 | 公開資訊觀測站、金管會 ESG 揭露平台 | 上市櫃公司分階段 ESG 揭露(2025-2029)|
| 歐盟 | EFRAG ESRS 申報、CBAM 申報、ESPR DPP | CSRD、CBAM、ESPR 合規準備度 |
| 全球 | GRI、SASB、IFRS S1/S2、TNFD LEAP、GHG Protocol Scope 1/2/3 | 自願性與強制性永續揭露對齊度 |

### 資料源 — AIV 層

跨 **ChatGPT(OpenAI)、Perplexity、Google AI Overview、Claude(Anthropic)** 四引擎,每日對 100 個標準化產業查詢執行 prompt 抽樣,寫入 `visibility_results` 表。平台權重每年審查一次,反映消費者搜尋行為市場份額變化。

### Bloomberg adapter 的立場

**Symcio 不代理、不轉售、不散佈 Bloomberg 資料。** `scripts/providers/bloomberg_stub.py` 是介面契約樣本,預設 raise `NotImplementedError`。啟用條件:客戶本身擁有 Bloomberg Terminal 訂閱、自備 `blpapi` Python binding、自行承擔 Bloomberg DEALM 授權合規責任。Symcio 僅提供 adapter interface;不提供、不打包、不散佈 Bloomberg 資料。

---

## 七、寫入流程

1. `.github/workflows/bci-daily.yml` 每日台北 03:00 執行
2. 對每一筆 `brands.status='active'` 的品牌:
   - 讀 `visibility_results` 最近 24 小時 → 計算 AIV
   - 透過 `MarketDataProvider` 取得財務指標 → 計算 FBV
   - 讀公開永續申報資料 → 計算 SCV
   - 取年度生效權重(α / β / γ)
   - 輸出 `{FBV, SCV, AIV, total_bci, weights_version, ...}` → INSERT `bci_snapshots`
3. `GET /api/bci/:brand_id` 只回傳 `total_bci + updated_at`(不暴露子項或產業別校準參數)

---

## 八、限制與未來研究

主要限制:
1. AIV 指標為新創指標,尚未經獨立學術同行審查
2. 權重參數基於專家判斷設定,實證優化計畫於 v2.0 進行
3. 初始驗證樣本限於台灣,通用性需要跨國驗證
4. SCV 子指標權重可能需要因司法管轄區而異的校準
5. 自然資本分數對多數未進行實體級 TNFD 評估的企業依賴產業級估算

未來研究方向:
- 使用多年面板資料的實證權重優化
- 以 Interbrand Global 100 品牌的跨國驗證
- 標準化 AIV 測量協議的開發
- BCI 作為銀行授信風險預測因子的探索
- SCV 改善與後續 FBV 變動之間的因果機制研究

---

## 九、不做什麼（明確邊界）

- ❌ 不做股價預測或投資建議(BCI 是品牌資產量化,不是 alpha 模型)
- ❌ 不代理 Bloomberg 資料
- ❌ 不宣稱與 Interbrand、Brand Finance、Kantar、Bloomberg 合作
- ❌ API 不暴露子項分數與產業別校準參數
- ❌ 不對任何單一法規框架(CSRD、CBAM、TNFD 等)賦予方法論特殊地位

---

## 十、公開版 vs 企業版

Symcio 的承諾是「**公式開源、產業校準閉源、資料分層**」:

| 項目 | 公開版（免費）| 企業版（付費）|
|------|--------------|--------------|
| BCI 公式與權重(α/β/γ、w₁/w₂/w₃、平台權重)| ✅ 完整公開 | ✅ 完整公開 |
| 產業別校準參數(以產業為單位的微調)| ❌ 僅 schema,值 = 中性 | ✅ 產業別實際校準 |
| 資料更新頻率 | 每日(03:00 Taipei cron)| 每日 + 即時 webhook(15 min p95)|
| AI 引擎覆蓋 | 4(ChatGPT / Perplexity / Google AI Overview / Claude)| 4 + 客戶自建(企業內部 LLM)|
| FBV 資料源 | Yahoo Finance + MOPS TW | 上述 + 客戶自備 Bloomberg Terminal |
| SCV 資料源 | 公開永續申報 | 上述 + 客戶內部合規檔案 |
| 歷史時序深度 | 最近 90 天 | 完整歷史 + 時序 API |
| 產業別 benchmark | ❌ | ✅ 同產業 percentile |
| 自訂權重(客戶定義)| ❌ | ✅ 可覆寫產業預設 |
| 競品同框分析 | ❌ | ✅ 最多 5 個競品 parallel tracking |
| API 回傳欄位 | `total_bci + updated_at` | 子項分數 + raw metrics + 衍生指標 |
| SLA | Best effort | 99.5% uptime |
| 資料匯出 | ❌ | ✅ CSV / Parquet / webhook |
| White-label 嵌入 | ❌ | ✅(Enterprise 方案)|

公開版的取得方式:
- API:`GET https://symcio.tw/api/bci/{brand_id_or_name}` — 品牌若已被 Symcio 追蹤,回 `{ok, brand, total_bci, industry_key, snapshot_date, updated_at}`
- 自行部署:`scripts/bci_engine.py` 可在自己的 Supabase + GitHub Actions 上跑;權重以 v1.0 預設值或 `BCI_WEIGHTS_JSON` env 自填

企業版聯絡:`info@symcio.tw`

---

## 十一、參考文獻

1. Huang, Chih-Chuan (2026). *品牌資本指數（BCI）方法論白皮書 v1.0*. Symcio Research. ORCID: 0009-0004-6472-4566.
2. ISO. (2010). ISO 10668:2010 — Brand Valuation: Requirements for Monetary Brand Valuation.
3. ISO. (2019). ISO 20671:2019 — Brand Evaluation: Principles and Fundamentals.
4. European Parliament and Council. (2022). Directive (EU) 2022/2464 — Corporate Sustainability Reporting Directive (CSRD).
5. European Parliament and Council. (2024). Regulation (EU) 2024/1781 — Ecodesign for Sustainable Products Regulation (ESPR).
6. European Parliament and Council. (2023). Regulation (EU) 2023/956 — Carbon Border Adjustment Mechanism (CBAM).
7. TNFD. (2023). Recommendations of the Taskforce on Nature-related Financial Disclosures.
8. IFRS Foundation. (2023). IFRS S1/S2 Sustainability-related Financial Disclosures.
9. GRI. (2021). GRI Universal Standards.
10. SASB. (2018). SASB Conceptual Framework.
11. GHG Protocol. (2004). Corporate Accounting and Reporting Standard.
12. Interbrand. (2024). Best Global Brands 2024: Methodology.
13. Brand Finance. (2024). Global 500 2024: Methodology.

---

## 十二、版本

- **v1.0**(2026-04)— 對齊 Symcio Research SSRN 獨立研究論文 v1.0:三維 FBV / SCV / AIV、2026 基準權重 α=0.50 β=0.25 γ=0.25、SCV 三子指標權重(0.40 / 0.40 / 0.20)、AIV 跨四引擎平台權重(0.35 / 0.25 / 0.25 / 0.15)、FBV 採 ISO 10668 所得法。
- **v0.x**(2026-04 前)— 早期 F / V / E 三維模型(Financial Capital / AI Visibility / Engagement),已由 v1.0 取代;歷史 BCI 分數保留舊方法論版本標記於 `bci_snapshots.weights_version`。

---

> **法律免責聲明:** 本方法論文件旨在學術討論與技術揭露,不構成投資建議。BCI 為 Symcio 獨立定義的觀察性指標,與 Interbrand 的 Brand Strength Score、Brand Finance 的 Brand Strength Index、Bloomberg 的任何專屬指標、Kantar BrandZ 的任何指標均無授權、合作或代表關係。Interbrand 的 Brand Strength Score、Role of Brand 為 Interbrand Corp. 商標,本文件以技術指稱(nominative fair use)方式引用,不主張任何授權、合作、代表或背書關係。
