# BCI Calibration Protocol v1.0

> **屬性：** 內部文件。程序可公開討論，實際數值是核心 IP。
> **所在位置：** `private/bci/CALIBRATION.md`（此目錄的 `.gitignore` 僅排除 `weights_*.json` 與 `fixtures_*.json`，程序文件本身可 tracked）
> **對應工具：** `scripts/bci_calibrate.py`

---

## 一、為什麼需要 Calibration

BCI 公式本身很容易寫：
```
BCI = w_F · F + w_V · V + w_E · E
```

**難的是決定 `(w_F, w_V, w_E)` 與 12 個子係數的實際值。**

這些值若隨便給（例如每個都 1/3），BCI 與品牌真實價值的相關性會很低，指標失去意義。若靠直覺給，會受產業偏見污染，且無法在新產業、新週期下更新。

Calibration = **把「品牌動能」的領域知識，轉成一組可驗證、可版本化的數值。**

---

## 二、三種可行方法

| 方法 | 數據需求 | 優點 | 缺點 |
|------|---------|------|------|
| A. 回歸擬合（Regression fit）| N ≥ 30 品牌 × 已知 ground truth | 客觀、可自動化 | 需要可信 ground truth |
| B. 德爾菲法（Expert panel）| 5–10 位產業專家 | 無需大數據 | 主觀；可能受偏見 |
| C. 混合（Hybrid, 推薦）| A + B | 數據打底、專家調校 | 兩倍工作量 |

**Symcio 採用 C — 每季一次**。本文件描述完整流程。

---

## 三、Ground Truth 的取得

Ground truth = 對每個品牌，**我們相信它「真正的品牌資本」有多強**的一個數值。

### 可用來源（按可信度排序）

| 來源 | 公開性 | 更新頻率 | 備註 |
|------|-------|---------|------|
| InterBrand Best Global Brands 100 | ✅ 公開 | 年 | Brand Strength Score（0-100）或 Brand Value（USD）|
| Kantar BrandZ Top 100 | ✅ 公開 | 年 | Brand Value（USD）|
| Forbes World's Most Valuable Brands | ✅ 公開 | 年 | Brand Value |
| 自有客戶簽約 LTV | ❌ 私有 | 任意 | 銷售轉換 proxy（B2B 最準）|
| 分析師估值模型 | ❌ 付費 | 季 | CapIQ / FactSet |
| 市值變化（12M forward） | ✅ 公開 | 日 | Lagging signal，但客觀 |

**推薦組合**：
- Technology / 消費品：InterBrand + Kantar 交集
- Finance：Kantar + 市值變化
- 台灣 B2B：自有 LTV + 台股市值
- Manufacturing：Forbes + 12M forward revenue

### 最小資料要求
- 每個產業至少 **N = 30** 個品牌
- 每個品牌至少 **6 個月** 的 F / V / E 歷史
- Ground truth 至少 2 個獨立來源（避免單點偏見）

---

## 四、Calibration 流程（五步驟）

### Step 1：收集資料集

建立 `private/bci/fixtures_v{N}.json`（不進 repo）：

```json
{
  "industry": "technology",
  "collected_at": "2026-04-22",
  "brands": [
    {
      "brand_name": "Apple",
      "ticker": "AAPL",
      "f_last": 89.2,
      "v_last": 76.3,
      "e_last": 72.1,
      "ground_truth": {
        "interbrand_bss": 87.5,
        "kantar_value_usd_b": 516.9,
        "normalized": 92.3
      }
    },
    ...
  ]
}
```

`normalized` = 把 ground_truth 正規化到 `[0, 100]`（min-max 於該產業內）。

### Step 2：執行 `bci_calibrate.py`

```bash
python scripts/bci_calibrate.py \
  --fixtures private/bci/fixtures_v1.json \
  --grid-step 0.05 \
  --min-weight 0.10 \
  --output private/bci/weights_v2_proposal.json
```

腳本會：
1. 讀取 fixture 裡的 `f_last / v_last / e_last` 與 `normalized`
2. 在 3-simplex 上做 grid search（所有滿足 `w_F + w_V + w_E = 1, w_* >= min_weight` 的點）
3. 計算每個點的 **Spearman rank correlation**（與 ground truth 的排序一致度）
4. 輸出最佳組合 + top 10 替代方案 + fit quality metrics

### Step 3：專家面板檢視

把 top 10 方案交給 3–5 位產業專家，他們盲評：
- 每組權重下，排名前 10 的品牌是否「看起來合理」
- 每組權重在該產業的**故事線**是否成立（例 `w_V = 0.5` 在 FMCG → 不合理）

專家意見以多數決收斂成 2–3 組候選。

### Step 4：Holdout 驗證

從資料集隨機抽 20% 作為 holdout（Step 1 時預留）：
- 用候選權重重算 BCI
- 計算 Spearman / Kendall tau 於 holdout 上
- 穩定性測試：把 holdout 分三塊，三塊間差異 < 0.1 才算穩定

### Step 5：版本化與部署

選中方案存 `private/bci/weights_v{N+1}.json`（**檔名必須遞增**，舊版保留）。

更新流程：
1. 把 `weights_v{N+1}.json` 全內容複製到 GitHub Secret `BCI_WEIGHTS_JSON`
2. GitHub Variable `BCI_WEIGHTS_VERSION` 改成 `v{N+1}`
3. 跑一次 `DRY_RUN=true` workflow 看分佈
4. 分佈 OK → 讓正式 cron 跑
5. `bci_snapshots.weights_version` 欄位會自動記下這次用的是 `v{N+1}`
6. Rollback：把 `BCI_WEIGHTS_VERSION` 改回 `v{N}` 即可

---

## 五、合理初始範圍（非最終值，只是 sanity 邊界）

> 這些是**可公開的邊界約束**，實際值要靠 calibration。

| 產業 | w_F 範圍 | w_V 範圍 | w_E 範圍 | 邏輯 |
|------|--------|--------|--------|------|
| technology | 0.25–0.40 | 0.35–0.50 | 0.15–0.30 | AI 是主要曝光通道 |
| finance | 0.40–0.55 | 0.15–0.30 | 0.20–0.35 | 信用 / 財務動能主導 |
| consumer_goods | 0.20–0.35 | 0.35–0.50 | 0.20–0.35 | AI 推薦 + 社群參與並重 |
| professional_services | 0.30–0.45 | 0.25–0.40 | 0.20–0.35 | 關係 + 信用 + AI 認知 |
| manufacturing | 0.35–0.50 | 0.20–0.35 | 0.20–0.35 | B2B 長週期 |
| default | 0.30–0.40 | 0.30–0.40 | 0.25–0.35 | 中性 |

- 硬邊界：任何 `w_*` < 0.10 表示該維度被排除，需有強理由
- 約束：`w_F + w_V + w_E = 1`（calibration script 強制）

---

## 六、Validation Metrics

每次 calibration 產出時必須報告：

| Metric | 意義 | 門檻 |
|--------|-----|------|
| Spearman ρ（training）| 訓練集排名一致度 | ≥ 0.70 |
| Spearman ρ（holdout）| 泛化能力 | ≥ 0.60 |
| Kendall τ（holdout）| 一致度（穩健版）| ≥ 0.45 |
| Top-10 overlap | 預測前 10 與真實前 10 交集 | ≥ 6 |
| Distribution σ | 預測值標準差 | 15–30（避免全擠中間）|
| 穩定性 Δ | 三個 holdout 子集間最大差異 | ≤ 0.10 |

若任何一個門檻未達，**不能進生產**——回 Step 1 加資料或重新設計 ground truth。

---

## 七、常見 Calibration 失敗模式

### 1. 選擇偏差（Selection bias）
只挑「現在做得好」的品牌當訓練集 → 權重會過度強調現狀訊號，失去預測力。

**解法**：訓練集刻意納入 20–30% 「過去 12 個月下滑」的品牌。

### 2. Ground truth 單點故障
只用 InterBrand → 權重會過度擬合 InterBrand 的方法論偏好。

**解法**：至少兩個獨立來源的加權平均。

### 3. 過度擬合（Overfit）
N 太小、grid 太密、專家太少 → holdout 分數遠低於 training。

**解法**：N ≥ 30，grid step ≥ 0.05，holdout 分佈檢查。

### 4. 產業混用
把技術與金融品牌丟同一鍋 → 一組權重兩頭都不貼合。

**解法**：嚴格 per-industry calibration；跨產業用 `default` 即可。

### 5. 時序漂移（Concept drift）
金融市場結構改變（例 2008、2020）→ 舊權重失效。

**解法**：每季重跑 calibration；重大事件時手動觸發。

---

## 八、更新節奏

| 週期 | 動作 |
|------|------|
| 每季 | 全產業重跑 calibration（標準流程）|
| 每月 | holdout 監控，Spearman 跌破 0.55 觸發緊急重跑 |
| 事件驅動 | 新增產業 / 新接大客戶 / 市場結構性變化 → 手動 |
| 年度 | 重新檢視產業分類（是否需增減產業 key）|

---

## 九、Audit Trail

每次 calibration 寫入 `private/bci/calibration_log.md`（此檔不進 repo）：

```markdown
## v2 — 2026-07-15

- Trigger: quarterly
- Dataset: 187 brands across 6 industries, 6-month F/V/E history
- Ground truth sources: InterBrand 2025 + Kantar BrandZ 2025 + 12M forward cap change
- Holdout size: 38 brands (20%)
- Result:
  - Spearman ρ (training): 0.78
  - Spearman ρ (holdout): 0.71
  - Top-10 overlap: 7
  - Stability Δ: 0.06
- Expert panel: 4 reviewers (3 branding consultants + 1 PE analyst)
- Approved by: [name]
- Deployed: 2026-07-20 03:00 Taipei
- Rollback plan: revert `BCI_WEIGHTS_VERSION=v1`
```

---

## 十、Calibration 結果的保密邊界

| 可對外 | 不可對外 |
|--------|---------|
| 本程序文件（§一–§十）| 實際權重數值 |
| Spearman ρ 質化範圍（"高於 0.7"）| Spearman ρ 精確數字 |
| 「technology 產業 w_V 最高」| 「technology 產業 w_V = 0.42」 |
| 更新頻率（每季）| 上次更新日期 |
| Ground truth **類型**（InterBrand / 市值）| 實際使用的是哪幾家、權重如何 |

對外 / Pitch deck 的表述方式參考 `content/medium/bci-the-ai-era-brand-capital-index.md` §六 與 `docs/BCI_METHODOLOGY.md` §四。

---

## 版本

- v1.0（2026-04）初版 — 混合法（回歸 + 德爾菲）+ Spearman 驗證 + 季度節奏
