# AIVI — AI 能見度基線與追蹤（產品與後台設定 SSoT）

> 版本 v1 · 2026-08-30
> 相關文件：`docs/POSITIONING.md`（品類定位）、`docs/BCI_METHODOLOGY.md`（分數方法論）、
> `docs/GEO_AUDIT_QUEUE.md`（免費診斷佇列）

---

## 一、WHY：為什麼賣「量測」而不賣「優化」

Symcio 對同一客戶若同時做「評分」與「提高分數的執行」，等於裁判下場比賽——
報告的第三方公信力立刻歸零，後續要銜接的 ISO 10668 品牌估值、ESG 揭露引用也一併作廢。

因此產品邊界固定為：

| Symcio 做 | Symcio 不做 |
|---|---|
| 採樣、解析、計分、出報告 | 內容代寫、外部曝光操作、schema 代改 |
| 揭露方法論與樣本 | 對改善成效抽成（無 success fee 欄位，見 migration） |
| 指出「哪一題、哪一個引擎、輸給誰」 | 代客戶執行改善（交由客戶自做或執行夥伴承接） |

**對外產品命名一律不含「GEO 優化」字樣。** 內部既有的 `geo_audit.py`
是漏斗入口的免費單次診斷，命名沿用，但對外文案不用。

---

## 二、WHAT：產品階梯

```
AIVI Baseline（免費・示範版・非公開評等）
  → 90 天 POC（固定費）：每週採樣 × 多引擎 × 中英雙語鎖版 prompt bank，交 before/after
    → 月追蹤訂閱（固定費）：月報 + 六維度趨勢 + 引用來源清單
      → ISO 10668 品牌估值（AI 能見度作為品牌強度輸入之一）

改善執行 → 客戶自做，或轉介執行夥伴；Symcio 不接、不抽成。
```

賣點不是「單次分數」，而是**同一組鎖版題目的時序資料集**——競品無法回溯補做的資產。

| 階段 | 交付 | 週期 |
|---|---|---|
| Baseline | 一次採樣快照 + 3 個可行動缺口 | 3 個工作天 |
| POC 90 天 | 12 次週採樣、期初/期末對照、競品同框圖 | 90 天鎖版 |
| 月訂閱 | 月報 PDF、六維度趨勢、引用來源清單、10% 人工抽驗註記 | 每月 |

---

## 三、HOW：pipeline 現況（不必新開 repo）

本 repo 已具備所需骨架，**新增的只有訂閱層**：

| 元件 | 檔案 | 角色 |
|---|---|---|
| 免費單次診斷 | `scripts/geo_audit.py` + `.github/workflows/geo-audit.yml` | 漏斗入口（依產業出題） |
| 訂閱週期採樣 | `scripts/aivi_tracker.py` + `.github/workflows/aivi-weekly.yml` | 依品牌鎖版 prompt bank |
| 鎖版題庫 | `prompts/<slug>/<version>.<locale>.json` | 改題必須開新版 |
| 六維度計分 / 月報 | `scripts/aivi_score.py` + `.github/workflows/aivi-monthly.yml` | 權重來自 Secrets，月報 HTML |
| 品牌資本分數 | `scripts/bci_engine.py` + `.github/workflows/bci-daily.yml` | 權重來自 Secrets |
| 資料層 | `supabase/migrations/20260830000000_aivi_tracking.sql` | runs / responses / mentions / scores |

### 硬約束（已寫進 migration 與腳本，不是慣例）

1. `aivi_responses.sampled_via` 只允許 `api` / `serp_provider`——**不得爬消費者版 UI**（違反各引擎 ToS）。
   報告須註明「API 採樣，非消費者介面重現」。
2. `tracking_status` 為 `poc` / `subscription` 時，`aivi_tracker.py` 缺
   `CONSENT_REF` / `DPA_ID` 直接以 exit code 2 中止——**無授權不採樣他人品牌**。
3. 維度權重存 `aivi_config_weights`（RLS：僅 service_role）或 `BCI_WEIGHTS_JSON` Secret，
   **repo 內只有 loader，不得硬編碼**。
4. `prompt_sets.locked_until` 期間不得改題；改題開 `v2`，否則月對月趨勢失效。
5. `aivi_billing_plans` 只有 `fixed_fee`，刻意不設 success fee 欄位。

### 六維度定義（`scripts/aivi_score.py`）

| 維度 | 定義 | 計法 |
|---|---|---|
| presence 提及率 | 問到這個品類時，回答裡出現品牌的比例 | 命中數 / 有效樣本 |
| rank 排名 | 被列出時的名次 | 第 1 名 100 分，往後每名 −12；有提及但未入列記中性 50 |
| share 同框佔比 | 品牌與競品在同一題的出現比重 | 命中數 /（命中數 + 競品提及數）|
| sentiment 語氣 | 推薦 / 中性 / 保留 | positive 100、neutral 60、negative 0，對命中取平均 |
| citation 引用 | 回答引用的網址裡有沒有自家網域 | 引用自家網域的命中數 / 命中數 |
| consistency 一致性 | 跨引擎、跨語言講的是不是同一個你 | 100 −（引擎提及率落差 ×0.6 + 語言落差 ×0.4）|

零命中時 `consistency` 記 0，不記 100——全體一致地不存在不是一致性，
否則「完全隱形」的品牌會靠這一維度拿到分數。

綜合分 = Σ(權重 × 維度分) / Σ權重；等級門檻與權重同樣存在 config，不寫死在 repo。

---

## 四、後台設定清單（開賣前必做）

### 4.1 Supabase

```bash
supabase db push   # 套用 20260830000000_aivi_tracking.sql
```

| 物件 | 用途 | 開賣前必填 |
|---|---|---|
| `brands`（新增欄位） | `consent_ref`, `dpa_id`, `aliases`, `competitors`, `tracking_status` | 授權編號、DPA 編號 |
| `prompt_sets` | 每品牌鎖版題庫（含 `locked_until`） | 每客戶 40 題 × 中英 |
| `aivi_runs` / `aivi_responses` | 採樣批次與原始回覆（保留 24 個月） | — |
| `aivi_mentions` | 提及 / 排名 / 情感 / 引用 URL / 同框競品 | 每月 10% 人工抽驗填 `verified_by` |
| `aivi_scores_monthly` | 六維度 + 綜合分 + 等級（只記 `weights_version`） | — |
| `aivi_config_weights` | 維度權重（RLS 僅 service_role） | 上線前寫入 v1 |
| `aivi_billing_plans` | 方案與固定費 | 簽約後建立 |
| `v_aivi_billable_brands` | 授權齊備才視為可出報告的品牌 | 交付前查此 view |

### 4.2 GitHub Secrets（不落地 repo）

`GEMINI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`PERPLEXITY_API_KEY`、
`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`BCI_WEIGHTS_JSON`、
`AIVI_WEIGHTS_JSON`、`AIVI_CONSENT_REF`、`AIVI_DPA_ID`

`AIVI_WEIGHTS_JSON` 的格式：`python scripts/aivi_score.py --print-schema`，
或見 `private/aivi/weights_v1.example.json`（該檔數值為佔位值，非實際權重）。
未設定時計分會退回等權重並印 warning——**不得以該結果交付客戶**。

### 4.3 GitHub Variables（非機密參數）

`AIVI_BRAND_SLUG`、`AIVI_BRAND_NAME`、`AIVI_BRAND_DOMAIN`、`AIVI_BRAND_ALIASES`、
`AIVI_BRAND_ID`、`AIVI_TRACKING_STATUS`、`AIVI_PROMPT_VERSION`、`AIVI_PROMPT_LOCALES`、
`AIVI_BRAND_INDUSTRY`、`AIVI_WEIGHTS_VERSION`

### 4.4 Storage

月報 PDF bucket，檔名純 ASCII（`aivi-<slug>-<YYYYMM>.pdf`），走 signed URL。

---

## 五、新客戶 onboarding 流程（簽約 → 第一份報告）

1. 簽 MSA + DPA → 取得 `consent_ref` / `dpa_id`
2. `INSERT brands`（含 `aliases`、`competitors`、`tracking_status='poc'`）
3. 產出 40 題 × 中英 prompt bank，`INSERT prompt_sets`，`locked_until = 今天 + 90 天`
4. 手動觸發 `aivi-weekly.yml`（`run_type=baseline`）跑期初基線
5. 抽驗 10% mentions，填 `verified_by`
6. 交期初報告（含方法論揭露段）
7. 排程自動每週採樣（`aivi-weekly.yml`）；每月 1 日 `aivi-monthly.yml` 對上個月計分並產月報 HTML
8. 第 90 天出 before/after，轉月訂閱或結案

---

## 六、對外定位設定流程（各平台一致化）

1. **定位聲明鎖版**：對象 → 提供什麼（量測值）→ 不做什麼（行銷執行、成效抽成）→ 為何可信（公開方法論、固定費）。一版中英，全平台逐字複製。
2. **實體收斂**：正式名、別名、統編、法人、創辦人姓名拼法全平台一致，`sameAs` 互指
   （Wikidata / LinkedIn / GitHub / 研究平台 DOI）。這是消除與 Symbio、SYM 等撞名的唯一方法。
3. **訊息分層**：一般受眾一句話 ／ B2B 一段話 ／ 工程對接一頁 spec。
4. **發布前紅線檢核**：合作一律寫「洽談中」、不提碳權與代幣、不用「授權代表 / official partner」。
5. **自我量測**：每月用自家 AIVI 量 Symcio，報告標「示範版・自評」，公開趨勢當案例。

### 平台矩陣

| 平台 | 台灣 | 美國 | 歐盟 | 作用 |
|---|---|---|---|---|
| 官網（schema + llms.txt） | ◎ | ◎ | ◎ | AI 讀取源頭 |
| LinkedIn 公司頁 + 創辦人 | ◎ | ◎ | ◎ | B2B 必備；歐盟階段唯一渠道 |
| Wikidata / Crunchbase | ◎ | ◎ | ◎ | 實體錨點、消除撞名 |
| 研究平台（SSRN / Zenodo） | ◎ | ◎ | ◎ | 第三方權威引用 |
| GitHub org | ○ | ◎ | ◎ | 工程可信度（只放公開版 schema，不放權重） |
| Google Business / Bing Places | ◎ | ○ | — | Gemini / Copilot 讀取 |
| LINE OA | ◎ | — | — | 台灣 SME 溫熱名單 |
| YouTube | ○ | ○ | ○ | 方法論解說長尾 |
| Meta（FB / IG） | △ | △ | ✕ | B2B 弱；歐盟不開廣告、不收表單 |

**歐盟注意**：無歐盟據點卻對歐盟行銷會觸發 GDPR Art.27 代表人義務。
歐盟階段先只做 LinkedIn，不開 Meta 廣告、不收歐盟 lead 表單。

---

## 七、取得第一個付費品牌的最短路徑

1. **先修自己**：官網實體層（Organization schema `sameAs` + `llms.txt` + 產品頁）
   ——賣可見度的公司自己不可見，第一通電話就破功。
2. **Case Zero 自評**：跑 `aivi-weekly.yml`（`run_type=baseline`）量 Symcio 自己，
   公開趨勢當案例，成本為零。
3. **10 家名單，不群發**：從已有互動的節點挑 10 家（外銷製造、上市櫃 ESG 揭露、代理商）。
4. **先送後談**：每家先跑 Baseline，信件只放三張圖——提及率、輸給誰、缺哪一題。
5. **只賣 POC**：第一單目標不是年約，是 90 天固定費 POC；有一家願意具名，
   後面的名單成本降一個量級。

進度追蹤：`leads` 表 + `scripts/lead_scorer.py`；外聯信走既有 draft-only 流程（不自動寄出）。
