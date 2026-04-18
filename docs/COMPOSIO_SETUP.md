# Composio 安裝與整合

## WHY

Composio 是 200+ 第三方 app 的統一 MCP / API 整合層（HubSpot、Gmail、Slack、Linear、Notion、Google Calendar 等），讓 AI 代理不用逐一串接各家 API 與 OAuth。

Symcio 用它來：
- 把 landing page 收到的 `leads` 自動同步到 HubSpot
- 收到新 lead 時發 Slack 通知
- $299 成交後透過 Resend 寄客戶報告 + 寫 Linear task
- 客戶 $12k 訂閱時自動建 Google Calendar 季度會議

## 一、在你本機 Mac / Terminal 安裝（一次性）

> **注意**：Claude Code 網頁沙箱被防火牆擋住 `composio.dev`，**無法**在雲端 session 安裝。必須在你自己的 Mac / Windows / Linux 終端機執行。

### 1.1 安裝 CLI

```bash
curl -fsSL https://composio.dev/install | bash
```

預設安裝到 `~/.composio/bin/composio`，把該路徑加入 `PATH`（安裝腳本會提示）。

驗證：
```bash
composio --version
```

### 1.2 登入（用你新產的 key）

```bash
composio login \
  --user-api-key "uak_你新的key" \
  --org "cchuan911_workspace"
```

憑證寫到 `~/.composio/config.json`，本機持久。

### 1.3 驗證已連接的 app

```bash
composio integrations list
composio actions list | head -30
```

## 二、與 Terminal Claude Code 整合

讓 Terminal 版的 Claude Code 能呼叫 Composio 工具。

### 2.1 編輯 MCP 設定

`~/.claude/settings.json` 或 `~/.claude.json`，新增：

```json
{
  "mcpServers": {
    "composio": {
      "command": "composio",
      "args": ["mcp"],
      "env": {
        "COMPOSIO_USER_ID": "在 composio dashboard → Settings → User ID 找"
      }
    }
  }
}
```

### 2.2 重啟 Claude Code

新 session 啟動時，你會看到多出一批 `mcp__composio__*` 工具。在對話中直接問「把今天的新 leads 寫到 HubSpot」它就會呼叫對應 action。

## 三、與 GitHub Actions 整合（Server-side 自動化）

Composio 也有 REST API，GitHub Actions 可以直接呼叫——**不需要安裝 CLI**。

### 3.1 設 GitHub Secret

https://github.com/SALL911/BrandOS-Infrastructure/settings/secrets/actions

| Secret | Value |
|--------|-------|
| `COMPOSIO_API_KEY` | 你在 composio.dev 的 user API key |

### 3.2 範例：`.github/workflows/composio-hubspot-sync.yml` 已建

每小時把 Supabase `leads` 表未同步的紀錄推到 HubSpot：
- 讀 Supabase `leads` where `notes` 不含 `hubspot_synced`
- 呼叫 Composio `HUBSPOT_CREATE_CONTACT` action
- 成功後在 `notes` 加 `hubspot_synced=<timestamp>`

詳見：`.github/workflows/composio-hubspot-sync.yml`
腳本：`scripts/composio_hubspot_sync.py`

## 四、安全規則

- ❌ **絕不** 把 `uak_...` key 寫進 repo 任何檔案
- ❌ **絕不** 把它貼進聊天介面（我現在會擔心你開兩個視窗共用）
- ✅ 只存在兩個地方：
  - 本機 `~/.composio/config.json`（CLI 用）
  - GitHub Secret `COMPOSIO_API_KEY`（Actions 用）

## 五、已曝光的 key（必讀）

以下兩組 key 因對話紀錄被雲端 Claude Code 看到，**必須作廢**：

```
uak_ziu6HxEEDllgLTFW1cM5  ← 已作廢
uak_mDnitihSJLZ4-jIiydJl  ← 請立刻作廢
```

處理：
1. Composio dashboard → Account → Personal Access Tokens
2. 把這兩組 **Revoke**
3. Generate 新一組
4. 新 key 只貼到本機 CLI + GitHub Secret，不貼回這個對話

## 六、可自動化清單（按 ROI 排序）

| 優先 | 自動化 | Composio app | 預估省時 |
|------|--------|--------------|---------|
| P0 | Lead → HubSpot Contact | HubSpot | 每 lead 省 3 分鐘 |
| P0 | 成交 → Resend 寄報告 | Gmail / Resend | 每單省 5 分鐘 |
| P1 | 新 $299 訂單 → Slack 通知 | Slack | 無人工 = 100% 可靠 |
| P1 | $12k 訂閱 → Google Calendar 季會議 | Google Calendar | 每季省 20 分鐘 |
| P2 | LinkedIn 發文 → X 轉貼 | LinkedIn + X | 每則省 5 分鐘 |
| P2 | Stripe 新訂單 → Linear task | Linear | 每單省 5 分鐘 |
| P3 | Free Scan 30 天未升級 → Gmail 自動跟催 | Gmail | 每 lead 省 10 分鐘 |

P0 的兩個已在本 repo 骨架完成，等你跑完本機 `composio login` + 設 GitHub Secret 即可啟用。

## 七、延伸閱讀

- Composio 官方文件：https://docs.composio.dev
- 本 repo Composio workflow：`.github/workflows/composio-hubspot-sync.yml`
- Hubspot 串接腳本：`scripts/composio_hubspot_sync.py`
- 已規劃：`.github/workflows/composio-send-audit-email.yml`（待接 Resend）
