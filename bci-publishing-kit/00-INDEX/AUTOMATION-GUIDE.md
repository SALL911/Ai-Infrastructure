# 自動化推播指南 — 30 天執行手冊

## 為什麼這些步驟「不全自動」？

學術 + 社群平台幾乎都要**人工帳號授權**（reCAPTCHA、Email 驗證、ORCID OAuth、編輯審核）。
**真正自動化的部分**: metadata 預填、DOI 更新、跨平台連結同步、進度追蹤。

這個 kit 把所有「人類必須做的決策步驟」壓到最小化，把所有「可重複的內容生成」做完。

---

## 一鍵指令對照

```bash
cd bci-publishing-kit/_scripts

# 一鍵開啟某優先級的所有平台
bash open-all-links.sh P0     # 開 3 個分頁
bash open-all-links.sh P1     # 開 4 個分頁
bash open-all-links.sh P2     # 開 4 個分頁
bash open-all-links.sh P3     # 開 4 個分頁
bash open-all-links.sh all    # 開全部 15 個

# Zenodo DOI 拿到後，一鍵寫回所有檔案
bash update-doi.sh 10.5281/zenodo.12345678

# SSRN 通過後
bash update-ssrn.sh https://ssrn.com/abstract=1234567

# 追蹤完成進度
bash progress-checklist.sh
```

---

## 30 天執行排程

### Week 1 — 學術根基（P0）

| Day | 動作 | 時間 |
|-----|------|------|
| Day 1 | `open-all-links.sh P0` → 完成 GitHub repo + 上傳檔案 + 設定 Topics | 30 min |
| Day 1 | 連結 Zenodo ↔ GitHub | 5 min |
| Day 1 | 在 GitHub 發 Release v1.0 → 觸發 Zenodo webhook | 5 min |
| Day 2 | 拿到 Zenodo DOI → `update-doi.sh <DOI>` → commit 推回 GitHub | 10 min |
| Day 3 | SSRN 投稿（用 P0-ssrn/SUBMIT.md 預填內容） | 30 min |
| Day 5-7 | 等 SSRN 審核通過 → `update-ssrn.sh <URL>` | - |

### Week 2 — 學術社群 + 產業（P1）

| Day | 動作 | 時間 |
|-----|------|------|
| Day 8 | `open-all-links.sh P1` → ResearchGate 上傳 | 15 min |
| Day 8 | ORCID Works → 連結 Zenodo + SSRN | 10 min |
| Day 9 | LinkedIn Article + Post（Asia/Taipei 09:00 週三） | 20 min |
| Day 9 | LinkedIn 留言 + 私訊互動（前 1 小時最關鍵） | 60 min |
| Day 10 | Medium 文章發布 + 投稿 Publication | 15 min |

### Week 3 — 開放科學 + 長期管道（P2）

| Day | 動作 | 時間 |
|-----|------|------|
| Day 15 | `open-all-links.sh P2` → OSF Project | 15 min |
| Day 15 | Academia.edu 上傳 | 15 min |
| Day 17 | Substack 建立 + 第一期發布 | 20 min |
| Day 19 | Wikidata QuickStatements 三批指令 | 30 min |

### Week 4 — 補完 + 驗收（P3）

| Day | 動作 | 時間 |
|-----|------|------|
| Day 22 | Speaker Deck 簡報上傳（先用 PowerPoint 做 15 頁） | 20 min |
| Day 23 | Google Scholar Profile 建立 + 手動加文章 | 10 min |
| Day 24 | Airiti 寄信詢問 | 30 min |
| Day 25 | arXiv 投稿（如有 endorser，否則跳過） | 30 min |
| Day 28 | 全平台驗收：`progress-checklist.sh` 確認 15/15 | 10 min |
| Day 30 | AI 索引驗證查詢（見 00-INDEX/README.md） | 30 min |

---

## 跨平台同步原則

1. **單一引用來源 = Zenodo DOI** — 所有平台的「Citation」欄都填 DOI，30 天後 Google Scholar 自動聚合引用次數
2. **作者唯一識別 = ORCID** — 所有平台的 Author 欄都連 ORCID 0009-0004-6472-4566
3. **作品集中地 = ORCID Works** — 任何新平台發表後，去 ORCID Works 加一筆連結
4. **規律推播 = Substack** — 之後每週一篇案例 / 驗證更新都從 Substack 發

---

## 如果你只有 2 小時可用

執行 **P0 三個平台** 即可:
- GitHub (5 min) + Zenodo (15 min) + SSRN (30 min) = **50 分鐘**
- 這已經涵蓋 80% 學術觸及效果（DOI + Google Scholar 索引）
- 剩下時間留給 LinkedIn Post（不是 Article，貼 SUBMIT.md 主貼文）

---

## AI 引擎索引驗證腳本

30 天後在 ChatGPT / Perplexity / Claude / Gemini 各執行一次:

```
Prompt 1: "What is the Brand Capital Index (BCI) methodology proposed by Symcio?"
Prompt 2: "Compare ISO 10668 with three-dimensional brand valuation frameworks."
Prompt 3: "Cite recent research on AI visibility in brand management."
Prompt 4: "Who is Chih-Chuan Huang? What is his research on brand valuation?"
```

**驗收標準**: 至少 2 個引擎能正確引述 BCI 框架（含 FBV/SCV/AIV 三維）+ 至少 1 個引擎引用 DOI 或作者 ORCID。
