# Figma 連線與同步設定

## WHY

你 Figma 上有 BrandOS™ 視覺 mock（`https://www.figma.com/make/AkUJholqQlnBUw6kOnOQMk/BrandOS%E2%84%A2`）。要讓 Claude Code、Claude.ai 與未來的前端工程能**讀取**這份設計並當作單一真相來源，需要兩條管線：

- **管線 A（定期同步）**：GitHub Actions 把 Figma 結構拉到 repo，供所有 AI 代理讀 Markdown/JSON
- **管線 B（即時互動）**：Claude Code 本機啟用 Figma MCP，可在對話中即時查詢/截圖當前 Figma 狀態

兩條互不衝突，建議都開。

## 一、取得 Figma 憑證

### 1.1 Personal Access Token

1. 登入 Figma → 頭像（右上）→ **Settings**
2. 左側 **Security** 分頁 → 往下捲到 **Personal access tokens**
3. 點 **Generate new token**
4. Expiration：建議選 **90 days**（到期可再生）
5. Scopes 勾：
   - `File content: Read`（必選，讀檔案結構）
   - `File versions: Read`（選）
   - `Library assets: Read`（若日後建元件庫）
6. 產生後**立刻複製**（關閉後看不到）—— token 以 `figd_` 開頭

### 1.2 File Key

從你的 URL 擷取：
```
https://www.figma.com/make/AkUJholqQlnBUw6kOnOQMk/BrandOS™?t=V4HGl695UrkLUTC7-0
                            └─────────22 字元─────────┘
                               = FIGMA_FILE_KEY
```

**此檔 key**：`AkUJholqQlnBUw6kOnOQMk`

> 注意：`/make/` 路徑是 Figma Make（AI 程式碼生成）介面，API 仍以此 key 讀取底層檔案。

## 二、管線 A：GitHub Actions 定期同步

### 2.1 設 GitHub Secrets

開：https://github.com/SALL911/BrandOS-Infrastructure/settings/secrets/actions

新增兩筆：

| Secret Name | Value |
|-------------|-------|
| `FIGMA_TOKEN` | `figd_xxxxxxxxxx...` |
| `FIGMA_FILE_KEY` | `AkUJholqQlnBUw6kOnOQMk` |

### 2.2 觸發首次同步

開：https://github.com/SALL911/BrandOS-Infrastructure/actions/workflows/figma-sync.yml

→ **Run workflow** → Branch 選 `main` → **Run**

預期約 20 秒內完成，若有變動會開 draft PR `figma-sync/YYYYMMDD`，包含：
- `docs/design/figma-structure.json`
- `docs/design/figma-frames.md`
- `docs/design/design-tokens.json`
- `docs/design/FIGMA_FILE.md`

### 2.3 後續排程

預設：每週一台北 10:00 自動跑一次。改頻率編輯 `.github/workflows/figma-sync.yml` 的 cron 欄位。

## 三、管線 B：Claude Code + Figma Dev Mode MCP

此管線讓你在 **Claude Code 本機 session** 直接問「這個 frame 的 CSS 是什麼」「第二個 section 的配色是什麼」。

### 3.1 前提

- 你有 Figma Dev Mode 存取（免費帳號有限；Professional/Organization 全開）
- 使用 Claude Code CLI（VS Code、Windsurf、Cursor 等載入 Claude Code 的 IDE 皆可）

### 3.2 設定（未來啟用時照做）

1. Figma Desktop App → 左下頭像 → **Preferences** → 啟用 **Enable Dev Mode MCP**
2. 本機 Claude Code 設定檔（`~/.claude/settings.json`）新增：
   ```json
   {
     "mcp": {
       "servers": {
         "figma-dev-mode": {
           "type": "http",
           "url": "http://127.0.0.1:3845/mcp"
         }
       }
     }
   }
   ```
3. 重啟 Claude Code
4. 在 Claude Code 對話：「請讀 Figma 當前選取的 frame，列出所有 text styles」

### 3.3 兩管線的分工

| 情境 | 用管線 A（Actions）| 用管線 B（MCP）|
|------|-------------------|----------------|
| AI 代理讀設計當背景知識 | ✓ | ✗ |
| 前端同學拿 design tokens | ✓ | ✗ |
| 本機寫程式即時對照 Figma | ✗ | ✓ |
| Claude.ai（雲端）讀設計 | ✓（透過 GitHub MCP）| ✗（MCP 本機才能用）|
| CI/CD 自動驗證視覺一致性 | ✓ | ✗ |

## 四、除錯

### 同步失敗：`403 Forbidden`
- Token 過期：重新產生，更新 Secret
- Scope 不足：確認有勾 `File content: Read`

### 同步失敗：`404 Not Found`
- File key 錯：確認 URL 中 `/file/` 或 `/make/` 後 22 字元
- 或檔案被從共用移除：確認你的帳號仍有該檔存取權

### `design-tokens.json` 是空物件
- 代表 Figma 檔中沒定義 **Styles**（只有 local colors/text，未升級為可重用 style）
- 解法：在 Figma 選色塊 → 右側 **Fill** → 點 **Styles** → **+** 存為 style。重跑即可抓到。

### PR 沒開
- 表示沒有 diff，Figma 從上次同步以來沒改動，正常現象
- 強制重跑：手動 workflow_dispatch（即使沒變動也會執行）

## 五、延伸閱讀

- `scripts/figma_sync.py` — 同步腳本（純 stdlib，零依賴）
- `.github/workflows/figma-sync.yml` — 自動化 workflow
- `docs/design/README.md` — 輸出目錄說明
- `docs/ARCHITECTURE.md` — 全系統角色分工
