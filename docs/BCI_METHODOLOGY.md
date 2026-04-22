# BCI Methodology — Brand Capital Index

> Symcio 的核心可量化指標。**公式抽象與結構公開；權重向量為 IP，不在本文件公開。**

---

## 一、為什麼需要 BCI

三個原本不相關的市場，各自有自己的量化工具：

| 市場 | 代表工具 | 量的是什麼 | 看不到什麼 |
|------|---------|----------|----------|
| 金融估值 | Bloomberg / S&P CapIQ | 市值、毛利、成長率 | AI 搜尋曝光、品牌情感 |
| SEO / 搜尋 | SimilarWeb / SEMrush | 網頁流量、關鍵字排名 | 生成式引擎結果、財務動能 |
| 品牌顧問 | InterBrand / Kantar BrandZ | 品牌估值、Brand Strength | 高頻資料、AI 時代通路 |

> **BCI（Brand Capital Index）把三個市場統一成單一時序指標**，是第一個**同時**納入「生成式 AI 引擎曝光」的品牌資產量化方法。

---

## 二、公式（公開抽象）

```
BCI(b, t) = w_F · F(b, t) + w_V · V(b, t) + w_E · E(b, t)

其中：
  F = Financial Capital         金融資本 ∈ [0, 100]
  V = AI Visibility Capital     AI 可見度資本 ∈ [0, 100]
  E = Engagement Capital        品牌參與度資本 ∈ [0, 100]

  w_F + w_V + w_E = 1           （產業別權重向量，IP 核心）
```

三個子項皆經 min-max 或產業 z-score 正規化到 `[0, 100]`，最終 BCI ∈ `[0, 100]`。

### 子項公式

**F（Financial Capital）** — 對應 InterBrand「Economic Profit」維度
```
F = norm( a1·log(MarketCap) + a2·RevenueGrowth + a3·OperatingMargin + a4·(1/Beta) )
```
資料源：抽象 `MarketDataProvider`（見 §五）。

**V（AI Visibility Capital）** — Symcio 獨家，四引擎同框
```
V = b1·MentionRate + b2·(1 / AvgRank) + b3·SentimentScore + b4·CompetitorShare
```
資料源：`visibility_results` 表（ChatGPT / Claude / Gemini / Perplexity 四引擎）。

**E（Engagement Capital）** — 對應 InterBrand「Engagement + Relevance」維度
```
E = c1·DigitalSOV + c2·NPSProxy + c3·AdvocacyLexiconHits + c4·CategoryRelevance
```
資料源：`engagement_signals` 表（社群互動、NPS 表單、AI 回應詞彙分析）。

> 係數 `a*`、`b*`、`c*` 與頂層權重 `w_F/w_V/w_E` 皆屬核心 IP，不在本文件公開。生產環境透過 GitHub Secrets 注入 `BCI_WEIGHTS_JSON`，本地測試以 `private/bci/weights_dev.json` 覆寫。

---

## 三、與 InterBrand 的對照

InterBrand Brand Strength Score 包含 10 個因子（4 internal + 6 external）。BCI 在數位與 AI 維度對三個因子做了**同名重新定義**：

| InterBrand 原定義 | 網頁 / 廣告時代代理 | Symcio BCI 在 AI 時代的重新定義 |
|------------------|-------------------|-------------------------------|
| **Presence** 品牌呈現度 | SOV、媒體曝光、熟悉度 | 跨 4 AI 引擎 `mentioned` × `rank_position`（納入 V） |
| **Engagement** 品牌參與度 | NPS、社群互動 | AI 回應 `sentiment` + `advocacy_lexicon_hits`（納入 V + E） |
| **Relevance** 品牌切合度 | 轉換率、CAC 效率 | Category prompt 中主動提及品牌的頻率（納入 E） |

> **Symcio 的差異化論述**：InterBrand 的 Presence / Engagement / Relevance 是網頁 + 廣告時代產物，取樣管道是消費者調研。Symcio BCI 的三個同名維度是生成式 AI 時代產物，取樣管道是 LLM 推論層。**不是升級，是換了底層座標系。**

註：`Brand Strength Score`、`Role of Brand` 為 Interbrand Corp. 商標。BCI 為 Symcio 獨立定義，不宣稱授權、合作或代表關係。

---

## 四、產業別權重結構（值不公開）

權重向量依產業區分，預設 6 類：

- `technology` — SaaS / 平台 / 硬體
- `finance` — 金融科技 / 投信 / 銀行
- `consumer_goods` — 快消 / 零售 / 餐飲
- `professional_services` — 顧問 / 律師 / 會計
- `manufacturing` — 製造 / 供應鏈
- `default` — 其他 / 跨產業

原則（**方向公開，數值保密**）：
- Technology / 消費品：`w_V` 佔比最高（AI 是主要曝光管道）
- Finance / Professional：`w_F` 佔比最高（信用與財務動能主導）
- Manufacturing：`w_E` 與 `w_F` 接近（B2B 長週期）

產業判定來源：`brands.industry` → 預設 `technology`。

---

## 五、資料層架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Symcio BCI Engine                         │
│                 (scripts/bci_engine.py)                      │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ F · Financial│   │ V · AI Vis.  │   │ E · Engagement│
│   Provider   │   │  (Symcio)    │   │   Provider    │
│  (abstract)  │   │              │   │  (abstract)   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
 ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
 │ Adapters:   │   │ geo-audit.yml│   │ Adapters:   │
 │ - yfinance  │   │ → visibility_│   │ - GA4       │
 │ - alphavant │   │   results    │   │ - social API│
 │ - mops_tw   │   │ (已有)        │   │ - NPS form  │
 │ - bloomberg │   │              │   │             │
 │   (stub,    │   │              │   │             │
 │    需自備   │   │              │   │             │
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

### MarketDataProvider 抽象契約

```python
class MarketDataProvider(Protocol):
    def get_market_cap(self, ticker: str) -> float | None: ...
    def get_revenue_growth(self, ticker: str) -> float | None: ...
    def get_operating_margin(self, ticker: str) -> float | None: ...
    def get_beta(self, ticker: str) -> float | None: ...
```

實作（`scripts/providers/`）：

| Adapter | 授權 | 預設啟用 | 備註 |
|---------|------|---------|------|
| `yfinance_adapter` | Yahoo Finance（非官方，研究用途）| ✅ | 全球主要市場；延遲 15 分鐘 |
| `mops_tw_adapter` | 公開資訊觀測站（公開資料）| ✅ | 台股 TWSE / TPEX |
| `alphavantage_adapter` | Alpha Vantage Free（500 req/day）| 選配 | 需 `ALPHAVANTAGE_API_KEY` |
| `bloomberg_stub` | **客戶自備 Terminal 訂閱** | ❌ | 見下 |

### Bloomberg adapter 的立場

**Symcio 不代理、不轉售、不散佈 Bloomberg 資料。**

`scripts/providers/bloomberg_stub.py` 是一個**介面契約樣本**，預設 raise `NotImplementedError`。啟用條件：

1. 客戶本身擁有 Bloomberg Terminal 訂閱
2. 客戶自備 `blpapi` Python binding 與網路連線到 Terminal Desktop
3. 客戶自行承擔 Bloomberg DEALM 授權合規責任
4. Symcio 僅提供 adapter interface；不提供、不打包、不散佈 Bloomberg 資料

此設計讓企業客戶可以**接上自己的資料源**，Schema 與 `yfinance` 對齊（`market_cap` → `CUR_MKT_CAP` 等），零改動換源。

---

## 六、寫入流程

1. `.github/workflows/bci-daily.yml` 每日台北 03:00 執行
2. 對每一筆 `brands.status='active'` 的品牌：
   - 讀 `visibility_results` 最近 24 小時 → 計算 V
   - 透過 `MarketDataProvider` 取得金融指標 → 計算 F
   - 讀 `engagement_signals` 最近 7 天滾動 → 計算 E
   - 取 `brands.industry` → 選對應產業權重向量
   - 輸出 `{F, V, E, total_bci, weights_version, ...}` → INSERT `bci_snapshots`
3. `GET /api/bci/:brand_id` 只回傳 `total_bci + updated_at`（不暴露子項或權重）

---

## 七、變更管理

- 權重向量變更 → `private/bci/weights_v{n}.json` 新版本 + GitHub Secret 更新 + `bci_snapshots.weights_version` 欄位標記
- 公式變更 → 本文件升版（v1 → v2），保留歷史版本
- 資料源變更 → 更新 `§五` 表格，不改公式

---

## 八、不做什麼（明確邊界）

- ❌ 不做股價預測 / 投資建議（BCI 是品牌資產量化，不是 alpha 模型）
- ❌ 不代理 Bloomberg 資料
- ❌ 不宣稱與 InterBrand / Kantar / Bloomberg 合作
- ❌ API 不暴露子項分數與權重向量

---

## 九、公開版 vs 企業版

Symcio 的承諾是「公式開源、權重閉源、資料分層」。具體對照：

| 項目 | 公開版（免費）| 企業版（付費 / 聯絡 info@symcio.tw）|
|------|------------|----------------------------------|
| 公式抽象 | ✅ 本文件完整公開 | ✅ 本文件完整公開 |
| 權重向量（`w_*`、`a*`、`b*`、`c*`）| ❌ 僅 schema，值 = 0.0 | ✅ 產業別實際權重 |
| 資料更新頻率 | 每日（03:00 Taipei cron）| 每日 + 即時 webhook（15 min p95）|
| AI 引擎覆蓋 | 4（ChatGPT / Claude / Gemini / Perplexity）| 4 + 客戶自建（企業內部 LLM）|
| F-axis 資料源 | Yahoo Finance + MOPS TW | 上述 + 客戶自備 Bloomberg Terminal（stub 可 plug-in）|
| 歷史時序深度 | 最近 90 天 | 完整歷史 + 時序 API |
| 產業別 benchmark | ❌ | ✅ 同產業 percentile |
| 自訂權重（客戶定義）| ❌ | ✅ 可覆寫產業預設 |
| 競品同框分析 | ❌ | ✅ 最多 5 個競品 parallel tracking |
| API 回傳欄位 | `total_bci + updated_at` | 子項分數 + raw metrics + 衍生指標 |
| SLA | Best effort | 99.5% uptime |
| 資料匯出 | ❌ | ✅ CSV / Parquet / webhook |
| White-label 嵌入 | ❌ | ✅（Enterprise 方案）|

公開版的取得方式：
- API：`GET https://symcio.tw/api/bci/{brand_id_or_name}` — 品牌若已被 Symcio 追蹤，回 `{ok, brand, total_bci, industry_key, snapshot_date, updated_at}`
- 自行部署：`scripts/bci_engine.py` 可在自己的 Supabase + GitHub Actions 上跑；權重用 `BCI_WEIGHTS_JSON` env 自己填（預設會 warning 並用中性權重）

企業版聯絡：`info@symcio.tw`

---

## 十、版本

- v1.0（2026-04）初版 — F/V/E 三維 + 6 產業權重；公開版 / 企業版分層定義
