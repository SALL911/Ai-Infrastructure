# GEO Audit Queue — 履約「24 小時內 Free Scan」承諾的後端迴路

## WHY

先前狀態：使用者在 `symcio.tw/schema-generator` 或 `/#scan` 提交品牌後，landing 文案承諾「24 小時內回傳四引擎曝光快照」。但實際上——**DB 寫完就沉默**，沒有任何機制去執行 scan、沒有寄第二封信。承諾跳票是最傷信任的 bug。

這條 pipeline 補上缺口：

```
 /api/schema
 /api/scan       ──POST──▶  Supabase.brands
     │                          └─ status='prospect'
     │                          └─ primary_email='xxx@y.com'
     │                          └─ first_scan_sent_at=NULL
     │
 （等最多 1 小時）
     │
 cron hourly（.github/workflows/geo-audit-queue.yml）
     │
 scripts/geo_audit_queue.py
     ├─ 撈 prospects WHERE last_scanned_at IS NULL OR > 7 天前
     ├─ 每個品牌 × 四引擎 × 1 產業 prompt
     ├─ 寫 visibility_results (brand_id, engine, score, competitors...)
     ├─ 更新 brands.last_scanned_at
     └─ IF first_scan_sent_at IS NULL:
          ├─ 組 HTML 報告
          ├─ 透過 Composio Gmail 寄到 primary_email
          └─ 標 first_scan_sent_at = now()
```

**延遲保證**：最壞情況 59 分鐘。絕對不會超過 1 小時。

## 跟既有 `geo-audit.yml` 的差異

| | `geo-audit.yml`（已存在）| `geo-audit-queue.yml`（本 PR 新增）|
|---|-------|-------|
| 目的 | Symcio 自家品牌每日 benchmark | 客戶 prospect 履約 |
| 頻率 | 每日 02:00 TW | 每小時整點 |
| 掃誰 | 固定單一 brand（預設 Symcio）| `brands.status='prospect'` 所有 |
| 輸出 | 寫 `reports/*.json` + 開 PR | 寫 DB `visibility_results` + 寄 email |
| 寄信 | ✗ | ✓（第一次掃完）|

兩個 workflow 互不干擾，即使同時跑也不會撞 DB（不同 brand）。

## 需要的 GitHub Secrets

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY                  # 免費、最關鍵
ANTHROPIC_API_KEY               # 選，有 trial credit
OPENAI_API_KEY                  # 選，有 trial credit
PERPLEXITY_API_KEY              # 選，有 trial credit
COMPOSIO_API_KEY                # 選，缺則 email 降級 log（scan 仍完成）
COMPOSIO_USER_ID
COMPOSIO_GMAIL_CONNECTION_ID
```

**最低可運行組合**：Supabase 兩個 + `GEMINI_API_KEY`。沒 Composio 的話 scan 正常做，只是使用者不會收到 email，等下次補完 secrets 會補寄。

## 部署

### 1. 套 migration

PR 合併後 push 到 main 自動觸發 `supabase-deploy.yml`，跑 `supabase db push` 套用 `20260421000000_geo_audit_queue.sql`。

或手動跑：
```bash
supabase db push
```

### 2. 設 GitHub Secrets

```bash
# 用 gh CLI 一鍵
gh secret set GEMINI_API_KEY --body "AIza..."
gh secret set COMPOSIO_API_KEY --body "composio_..."
gh secret set COMPOSIO_USER_ID --body "sall911-default"
gh secret set COMPOSIO_GMAIL_CONNECTION_ID --body "ca_..."
```

或在 GitHub UI → Settings → Secrets and variables → Actions 一個個加。

### 3. 首次手動觸發（dry run）

Actions tab → GEO Audit Queue (prospects) → Run workflow → 勾 `dry_run: true`。

檢查 log：
- `Active engines: gemini, ...` 確認 key 吃進去
- `Prospects to scan: N` 確認 queue 撈得到資料
- `composite=... mention_rate=...%` 確認 AI 引擎能回應
- `(dry-run) skipping DB insert + email` 確認沒真的寫

沒問題 → 再跑一次 `dry_run: false` 真正寄信。

### 4. 之後每小時自己跑

Cron 生效後不需人工介入。監控點：
- Supabase Studio → `brands` 表，看 `last_scanned_at` 是不是每小時推進
- Supabase Studio → `visibility_results` 表，看 row 數增加
- 使用者信箱收到 `[Symcio] XXX 的 Free Scan 結果` 主旨的信

## 成本估算（免費額度內）

- Gemini free tier：60 RPM / 1M tokens 日 → **每小時最多 60 次 API call**
- 設定：10 brands × 4 engines × 1 prompt = 40 calls/hour，在額度內
- 即使只有 Gemini（沒 Claude/OpenAI/Perplexity），scan 仍完成，只是結果降級成一引擎觀點
- Composio Gmail：免費方案 100 emails/天夠用到百位數 lead/天

月費：**$0**，直到 Supabase DB 超過 500 MB 或 Gemini 額度爆表（兩者在 lead 量 <1000/日 前都不會發生）。

## 失敗模式與對策

| 症狀 | 原因 | 對策 |
|------|------|------|
| Queue 一直撈到同一批，重複掃 | `last_scanned_at` 更新失敗 | 檢查 Supabase service role key 是否有 `brands` PATCH 權限 |
| 所有 brand 都沒人收到 email | Composio 三個 secret 中一個缺 | Actions log 會印 `Composio 未設，email 降級為 log only`，補齊 |
| AI 引擎全死 | 全部 API key 未設或過期 | script return exit code 2，Actions 狀態變紅，alert 進 GitHub email |
| 某家 AI 引擎 rate-limit | Gemini 一分鐘 60 call 爆 | 調小 `QUEUE_BATCH_SIZE` 或降頻 cron |
| 寄信寄給自己測試都沒收到 | Composio Gmail connection ID 錯 / 需要重新 authorize | Composio dashboard 看該 connection status |

## 下一步（不在本 PR 內）

1. **/api/agent 也補 primary_email**（現在只有 /api/schema 跟 /api/scan 補）
2. **公開的掃描結果頁** `/s/{brand_slug}` 讓品牌主能 share 他的 scan
3. **Lead scoring**：把「有 schema-generator + 有收到掃描 email + 有點進 $299 pricing」標成 `hot` 同步 HubSpot
4. **Re-engagement**：3 天沒點 upgrade → 自動寄第二封 nudge

## 相關檔案

- 本 runbook：`docs/GEO_AUDIT_QUEUE.md`
- Queue script：`scripts/geo_audit_queue.py`
- Cron workflow：`.github/workflows/geo-audit-queue.yml`
- Schema 更動：`supabase/migrations/20260421000000_geo_audit_queue.sql`
- Web 端補欄位：`web/landing/app/api/schema/route.ts`、`web/landing/app/api/scan/route.ts`
