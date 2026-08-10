# BCI 白皮書 — 全平台發表包

> **作者**: 黃智詮 Chih-Chuan Huang
> **ORCID**: [0009-0004-6472-4566](https://orcid.org/0009-0004-6472-4566)
> **機構**: Symcio Co., Ltd. (台北)
> **白皮書**: Brand Capital Index (BCI) Methodology Whitepaper v1.0
> **發布日期**: 2026-04-01
> **語言**: 繁體中文（主要）+ 英文（國際版）
> **授權**: CC BY-NC-SA 4.0

---

## 使用方法

1. 每個 `Px-平台名/` 資料夾包含三個檔案:
   - `LINK.md` — 平台直達連結（註冊 / 提交 / 設定頁）
   - `SUBMIT.md` — 預填內容（標題、摘要、關鍵字、引用格式，可直接複製貼上）
   - `STEPS.md` — 操作步驟（含截圖位置、欄位對應、預估時間）

2. 推薦執行順序: **P0 → P1 → P2 → P3**（已照優先級排序，資料夾名稱有 `P0/P1/P2/P3` 前綴）

3. `_scripts/open-all-links.sh` — 一鍵在預設瀏覽器開啟所有提交頁面（macOS / Linux）

4. `_assets/` — 共用素材（中英文摘要、關鍵字、引用格式、JEL codes、author bio）

---

## 平台總覽（按優先級 + 目的 + 直達連結）

### 🔴 P0 — 本週必完成（學術根基）

| # | 平台 | 目的 | 直達連結 | 預估時間 |
|---|------|------|----------|----------|
| 1 | **GitHub** | 著作權時間戳 + 版控 | https://github.com/sall911/symcio-bci-methodology | 5 分鐘 |
| 2 | **Zenodo** | 取得正式 DOI（學術身份證號）→ 所有平台的單一引用來源 | https://zenodo.org/account/settings/github/ | 15 分鐘 |
| 3 | **SSRN** | 學術預印本伺服器 → Google Scholar 自動索引（Finance/Marketing/ESG 領域研究者必到） | https://hq.ssrn.com/submission.cfm | 30 分鐘 |

### 🟡 P1 — 第二週（學術社群 + 產業觸及）

| # | 平台 | 目的 | 直達連結 | 預估時間 |
|---|------|------|----------|----------|
| 4 | **ResearchGate** | 學術社群曝光 + 引用追蹤 + 研究者網絡 | https://www.researchgate.net/signup | 15 分鐘 |
| 5 | **ORCID** | 統一學術身份 → 自動匯集所有平台發表 | https://orcid.org/0009-0004-6472-4566 | 10 分鐘 |
| 6 | **LinkedIn Article** | 產業受眾 + 通路夥伴觸及 + B2B 決策者 | https://www.linkedin.com/article/new/ | 20 分鐘 |
| 7 | **Medium** | 國際 SEO + 英文受眾 + AI 引擎索引（ChatGPT/Perplexity 常爬 Medium） | https://medium.com/new-story | 15 分鐘 |

### 🟢 P2 — 第三週（開放科學 + 長期管道）

| # | 平台 | 目的 | 直達連結 | 預估時間 |
|---|------|------|----------|----------|
| 8 | **OSF** | 開放科學存檔 + 備用 DOI + 數據集託管 | https://osf.io/dashboard/ | 15 分鐘 |
| 9 | **Academia.edu** | 學術長尾搜尋 + 教授圈曝光 | https://www.academia.edu/upload | 15 分鐘 |
| 10 | **Substack** | 電子報訂閱 + 長期內容管道 + 讀者經營 | https://substack.com/signup | 20 分鐘 |
| 11 | **Wikidata** | 結構化資料 + AI 知識圖譜（Google/LLM 結構化來源） | https://www.wikidata.org/wiki/Q138922082 | 30 分鐘 |

### 🔵 P3 — 第四週（補完 + 視覺化 + 在地）

| # | 平台 | 目的 | 直達連結 | 預估時間 |
|---|------|------|----------|----------|
| 12 | **arXiv (q-fin.GN)** | 量化金融預印本（需 endorsement，先跳過亦可） | https://arxiv.org/submit | 30 分鐘 |
| 13 | **Google Scholar Profile** | 自動索引匯集 + 引用追蹤 + h-index | https://scholar.google.com/citations?hl=en | 10 分鐘 |
| 14 | **華藝線上圖書館 (Airiti)** | 台灣中文學術資料庫 → 台灣學者與政策圈 | https://www.airitilibrary.com/ | 30 分鐘 |
| 15 | **Speaker Deck** | 簡報版視覺化 + SEO + AI 索引 | https://speakerdeck.com/signup | 20 分鐘 |

---

## 跨平台引用鏈（單一引用聚合）

```
GitHub Repo (時間戳)
    ↓ 觸發 Zenodo webhook
Zenodo DOI ← ✨ 所有引用的根節點
    ↓ 寫入 README + CITATION.cff
SSRN (學術) ─── Google Scholar 自動索引 ─── Google Scholar Profile
    ↓
ResearchGate / OSF / Academia.edu (學術社群)
    ↓ Author 欄位填寫
ORCID ← 匯集所有平台 publications
    ↓
LinkedIn / Medium / Substack (產業 + 國際 + 長期)
    ↓
Wikidata (AI 知識圖譜)
    ↓
Speaker Deck (視覺化長尾)
```

**設計邏輯**: 每個平台的「References / Citation」欄位都填同一個 Zenodo DOI，30 天後形成引用聚合效應 → 任何人搜尋 "Brand Capital Index" 都會找到單一來源。

---

## 30 天驗收 checklist

第 30 天執行 AI 索引驗證查詢：

```
ChatGPT  : "What is the Brand Capital Index (BCI) methodology?"
Perplexity : "Brand Capital Index Huang 2026 ISO 10668 three-dimensional"
Gemini   : "BCI Symcio brand valuation framework AI visibility"
Claude   : "Brand Capital Index whitepaper Symcio"
```

驗收標準: 至少 2 個 AI 引擎能正確引述 BCI 三維框架（FBV + SCV + AIV）並提及作者或 DOI。
