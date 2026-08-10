# GitHub — 操作步驟（5 分鐘）

## 前置
- [ ] 已登入 GitHub 帳號 `sall911`
- [ ] PDF 白皮書檔案準備好（命名為 `BCI-Whitepaper-v1.0.pdf`）

## 步驟

### 1. 建立 Repo (2 分鐘)
1. 開 https://github.com/new
2. **Repository name**: `symcio-bci-methodology`
3. **Description**: 複製 `SUBMIT.md` 的 Description 區塊
4. **Public**
5. ☑ Add a README
6. ☑ Choose a license → `Creative Commons Zero v1.0 Universal`（之後手動換成 CC BY-NC-SA 4.0）
7. Create repository

### 2. 上傳檔案 (1 分鐘)
從 `_assets/` 把這些檔案拖到 repo:
- `BCI-Whitepaper-v1.0.pdf`
- `CITATION.cff` (從 `_assets/citation-formats.md` 取 CITATION.cff 段落)
- `LICENSE` (CC BY-NC-SA 4.0 全文，可從 https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt 下載)
- `CHANGELOG.md`

### 3. 設定 Topics (30 秒)
1. Repo 首頁右上角齒輪 ⚙️ (About 旁)
2. 貼入 Topics（見 SUBMIT.md）

### 4. 建立 Release v1.0 (1 分鐘)
1. 開 https://github.com/sall911/symcio-bci-methodology/releases/new
2. **Choose a tag** → 輸入 `v1.0` → Create new tag on publish
3. **Release title**: `BCI Methodology Whitepaper v1.0`
4. **Describe this release**: 複製 SUBMIT.md 的 Release notes
5. ☑ Set as the latest release
6. **Publish release**

> ⚠️ 在 publish release 之前，先做完 P0-zenodo 的「連結 GitHub」這一步！不然 Zenodo 抓不到。

### 5. 驗收
- [ ] Repo 公開可見
- [ ] Topics 有 12 個
- [ ] Release v1.0 已發布
- [ ] CITATION.cff 顯示「Cite this repository」按鈕在 repo 首頁

## 預估時間
總計 **5 分鐘**（不含等 Zenodo DOI 產生的 ~5 分鐘）
