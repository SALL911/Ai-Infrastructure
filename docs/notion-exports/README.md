# Notion 手動匯出目錄

此目錄用於**手動**從 Notion 匯出的 Markdown 檔案（非自動同步）。

## 與 `docs/notion-sync/` 的差別

| 目錄 | 來源 | 維護方式 |
|------|------|---------|
| `docs/notion-sync/` | Notion API 自動拉 | 機器產出，勿手編 |
| `docs/notion-exports/`（本目錄）| 人工從 Notion 匯出 | 可手動放入、修改 |

---

## 從 Notion 匯出步驟

1. 開啟要匯出的 Notion 頁面或 database
2. 右上角 **⋯** → **Export**
3. Format 選 **Markdown & CSV**
4. Include subpages：**是**（若有子頁面）
5. 下載得到 `.zip`

## 上傳到 repo 的兩種方式

### 方式 A：GitHub Desktop（推薦）
1. 把 `.zip` 解壓縮
2. 把所有 `.md` 檔案拖到本機 `docs/notion-exports/` 目錄
3. 開 GitHub Desktop → 看到新檔案 → 填 commit message → **Commit to main**（或建 PR 分支）→ **Push origin**

### 方式 B：GitHub 網頁直接上傳
1. 開 https://github.com/SALL911/BrandOS-Infrastructure/tree/main/docs/notion-exports
2. 右上 **Add file** → **Upload files**
3. 拖檔案進去 → 下方填 commit message → **Commit changes**

## 檔名規範

Notion 匯出會自動加亂數後綴（例：`Meeting 2026-04-17 a1b2c3d4.md`），
建議上傳前改成：`YYYY-MM-DD-slug.md`（例：`2026-04-17-meeting-notes.md`）
方便日後搜尋。

## 敏感資料檢查

依 CLAUDE.md 規定，上傳前請確認檔案**不含**：
- 客戶真實 ESG 數據或財務資料
- 個資（email、電話、身份證）
- API key、密碼
