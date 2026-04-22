# `private/bci/inputs/` — BCI Calibration CSV Inputs

> **此目錄的 `*.csv` 不進 repo**（根 `.gitignore` 已排除）。

---

## 你要做的事

1. 到以下公開來源**手動**下載 / 複製最新年度排名（**不要用 scraper**——違反 ToS）
2. 存為 CSV 放這裡
3. 跑 `python scripts/collect_fixtures.py --source ...`

---

## 推薦資料源

| 來源 | URL | 取得方式 | 檔名建議 |
|------|-----|---------|---------|
| InterBrand Best Global Brands 100 | https://interbrand.com/best-global-brands/ | 開網頁 → 手動複製到 Google Sheet → 下載 CSV | `interbrand_2025.csv` |
| Kantar BrandZ Top 100 | https://www.kantar.com/campaigns/brandz | 下載官方 PDF → 手動整理 CSV | `kantar_2025.csv` |
| Forbes World's Most Valuable Brands | https://www.forbes.com/the-worlds-most-valuable-brands/ | 開網頁 → 手動複製 | `forbes_2025.csv` |
| 台股市值（台灣品牌用）| https://www.twse.com.tw/ | TWSE 月報 → 下載 Excel | `twse_marketcap_2025.csv` |
| 自有 LTV / ACV | 你的 CRM 匯出 | HubSpot / Salesforce 匯出 CSV | `internal_ltv_2025.csv` |

---

## CSV 格式（彈性 — script 會自動偵測欄位）

**最少要有 2 欄**：
- `brand_name`（或 `brand` / `company` / `品牌`）
- `value`（或 `brand_value` / `score` / `bss`）

**選配**：
- `ticker`（股票代號）
- `rank`（該來源排名）
- `industry`（產業類別，做產業過濾用）

### 範例（InterBrand 風格）：

```csv
rank,brand_name,value_usd_b,industry
1,Apple,516.9,Technology
2,Microsoft,340.4,Technology
3,Amazon,308.9,Technology
4,Google,333.4,Technology
...
```

### 範例（Kantar 風格）：

```csv
rank,brand,brand_value,sector
1,Apple,1015.0,Technology & Telecoms
2,Google,753.5,Technology & Telecoms
...
```

Script 會把這兩個 source 的 value 分別正規化到 0–100，再**交集合併**（at least 2 sources）。

---

## 例：跑 fixture 收集

```bash
python scripts/collect_fixtures.py \
  --source interbrand=private/bci/inputs/interbrand_2025.csv \
  --source kantar=private/bci/inputs/kantar_2025.csv \
  --source forbes=private/bci/inputs/forbes_2025.csv \
  --industry technology \
  --output private/bci/fixtures_v1.json \
  --low-confidence-output private/bci/fixtures_v1_singlesource.json
```

產出：
- `fixtures_v1.json` → 出現在 ≥2 source 的品牌（可信度高，進 calibration）
- `fixtures_v1_singlesource.json` → 只在 1 source 的品牌（人工審核）

下一步：
```bash
python scripts/bci_calibrate.py --fixtures private/bci/fixtures_v1.json ...
```

---

## 法律邊界

- ✅ 你手動下載 / 手動輸入排名資料到 CSV — 合理使用（research / internal analysis）
- ❌ 寫爬蟲自動抓 interbrand.com / kantar.com — 違反 ToS
- ❌ 把合併後的 fixture 當成新資料集對外散佈 — 衍生作品侵權
- ✅ 把 fixture 當內部 BCI 校準的 ground truth — 合理使用

這個邊界寫進 `scripts/collect_fixtures.py` 的 module docstring。
