# Notion Sync 輸出目錄

此目錄由 `.github/workflows/notion-sync.yml` 自動寫入，請勿手動編輯。

- 來源：Notion database（ID 存於 GitHub Secret `NOTION_DATABASE_ID`）
- 同步時機：每日 09:00 (Asia/Taipei) 自動執行；可手動觸發
- 同步方向：**Notion → repo**（單向）

若需新增要同步的頁面，請在 Notion 該 database 新增 page，下一輪排程會自動拉下。
