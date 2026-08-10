# Wikidata — 操作步驟（30 分鐘）

## 前置
- [ ] Zenodo DOI 已確定
- [ ] SSRN URL 已確定（可選）
- [ ] Wikimedia 帳號（如沒有，先註冊：https://www.wikidata.org/w/index.php?title=Special:CreateAccount）

## 步驟

### 1. 登入 QuickStatements (2 分鐘)
- 開 https://quickstatements.toolforge.org/
- 用 Wikimedia 帳號 OAuth 登入

### 2. 執行指令 A（建作者 item, 5 分鐘）
1. **New batch** → 選 V1 format
2. 貼 SUBMIT.md 指令 A
3. **Import** → **Run**
4. 等執行完成（會在頁面顯示新的 Q-id）
5. **記下 Q_AUTHOR_ID**

### 3. 執行指令 B（建白皮書 item, 8 分鐘）
1. 把 SUBMIT.md 指令 B 中的:
   - `Q_AUTHOR_ID` → 替換為實際 Q-id
   - `10.5281/ZENODO.XXXXXXXX` → 替換為實際 DOI
2. New batch → 貼 → Run
3. **記下 Q_BCI_PAPER_ID**

### 4. 執行指令 C（建 BCI 概念 item, 5 分鐘）
1. 同上替換 `Q_AUTHOR_ID` 和 `Q_BCI_PAPER_ID`
2. Run
3. **記下 Q_BCI_CONCEPT_ID**

### 5. 執行指令 D（更新 Symcio item, 3 分鐘）
1. 把指令 D 中的 Q-id 全部換掉
2. Run

### 6. 手動補連結 (5 分鐘)
- 開 Q_BCI_PAPER_ID → 加 "sitelinks" 到 ResearchGate / SSRN / Zenodo 等實際 URL
- 開 Q_BCI_CONCEPT_ID → 加 "external identifiers"

### 7. 加 Statement References (2 分鐘)
每個重要 statement 應該加 reference (避免被 Wikidata 編輯者刪除):
- DOI → reference URL: https://doi.org/...
- Author → reference URL: ORCID page

## 注意事項
- Wikidata 是公共平台，所有編輯都留下歷史紀錄
- 不要寫商業推銷語氣，用客觀描述
- 第一次提交可能會被其他編輯者 review，正常現象

## 驗收
- [ ] 三個新 item 都活著（沒被秒刪）
- [ ] Symcio item 顯示 "notable work"
- [ ] Google 搜尋作者名字，Knowledge Graph 可能 1-2 週後出現

**預估**: 30 分鐘
