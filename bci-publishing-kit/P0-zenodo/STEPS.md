# Zenodo — 操作步驟（15 分鐘）

## 推薦路徑：GitHub 整合（自動化）

### 1. 註冊 + 連結 GitHub (3 分鐘)
1. 開 https://zenodo.org/signup/
2. 點 "Sign in with GitHub"
3. 授權 Zenodo 讀取你的 repos
4. 連結 ORCID: https://zenodo.org/account/settings/linkedaccounts/

### 2. 啟用 Repo 同步 (1 分鐘)
1. 開 https://zenodo.org/account/settings/github/
2. 找到 `sall911/symcio-bci-methodology`
3. 把開關切到 **ON**

### 3. 觸發 DOI（從 GitHub 發 Release）
> 這一步在 P0-github/STEPS.md 第 4 步執行
1. 到 https://github.com/sall911/symcio-bci-methodology/releases/new
2. Tag = `v1.0` → Publish release
3. 等 3-5 分鐘，Zenodo 自動抓取

### 4. 補完 Metadata (8 分鐘)
1. 回到 https://zenodo.org/me/uploads → 找到剛建立的 record
2. 點 "Edit"
3. **逐欄複製貼上** `SUBMIT.md` 的內容（Title / Description / Keywords / Authors / License）
4. 把 Upload type 從預設改成 `Publication → Working paper`
5. 加 Related identifier: GitHub repo URL → `is supplemented by`
6. **Publish**（按下後 DOI 永久不可改）

### 5. 取得 DOI + 寫回所有檔案 (3 分鐘)
1. 複製 DOI（畫面右側，格式如 `10.5281/zenodo.12345678`）
2. 跑下方一鍵更新指令（從 `_scripts/update-doi.sh`）:
   ```bash
   bash _scripts/update-doi.sh 10.5281/zenodo.12345678
   ```
3. 推到 GitHub:
   ```bash
   git add . && git commit -m "Add Zenodo DOI" && git push
   ```

## 驗收
- [ ] Zenodo 頁面顯示 DOI
- [ ] DOI 可解析: 開 https://doi.org/10.5281/zenodo.XXXXXXXX
- [ ] GitHub README 顯示 DOI badge
- [ ] CITATION.cff 包含 DOI

## 預估時間
總計 **15 分鐘**（不含等 Zenodo webhook 的 3-5 分鐘）
