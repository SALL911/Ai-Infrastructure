# 設計同步目錄

此目錄由 `.github/workflows/figma-sync.yml` + `scripts/figma_sync.py` 自動維護。

## 檔案

| 檔名 | 內容 |
|------|------|
| `figma-structure.json` | Figma 檔案節點樹快照（frames / components / pages） |
| `figma-frames.md` | 人類可讀的 frame 清單，附 deep link |
| `design-tokens.json` | 顏色 / 字體 / 效果 / 格線 tokens |
| `FIGMA_FILE.md` | Source Figma file 的 metadata（file key、URL） |

## 同步時機

- **自動**：每週一台北 10:00（cron）
- **手動**：Actions → Figma Sync → Run workflow，可覆寫 `file_key`

## 啟用步驟

詳見 `docs/FIGMA_SETUP.md`，核心三步：
1. 拿 Figma Personal Access Token
2. 拿 File key（URL 中 `/file/` 或 `/make/` 後的 22 字元）
3. 設 GitHub Secrets `FIGMA_TOKEN` + `FIGMA_FILE_KEY`

## 在 Claude Code 即時使用 Figma

若希望在本機開發時讓 Claude Code 直接讀 Figma 即時狀態（不只靠每週同步），
見 `docs/FIGMA_SETUP.md` §3「Claude Code + Figma Dev Mode MCP」。
