# Schema 一致性稽核 — symcio-brandos
## SCHEMA_AUDIT.md v1.3 | 2026-04-27

---

## WHY

對照 `database/schema.md` 與線上 Supabase project `symcio-brandos` 的 Table Editor 實際狀態，找出落差並列出修復動作。

線上觀察日期：2026-04-27（僅依據 Table Editor 列表，未連 DB 實際 introspection）。

---

## 觀察結果

### 線上可見的表（5 張）

| Table | 來源 | 備註 |
|-------|------|------|
| `brands` | repo migration 20260417000000 | 已存在；74 筆台灣公司資料 |
| `leads` | repo migration 20260417000000 | 已存在 |
| `visibility_results` | repo migration 20260417000000 | 已存在 |
| `brand_rating_history` | **線上獨有**，repo 無對應 migration | 需反向匯出進 repo |
| `profiles` | **線上獨有**，repo 無對應 migration | 需反向匯出進 repo（疑似手動建立的 auth profile 表）|

### Repo 已定義但線上沒看到的表（推測缺漏）

依 `supabase/migrations/*.sql` 應存在但 Table Editor 未顯示：

**Layer 1**
- `brand_scores`

**Layer 2**
- `ai_queries`、`ai_responses`、`visibility_reports`

**Layer 3（ESG）**
- `esg_profiles`、`esg_events`

**Layer 4（AI Knowledge — CLAUDE.md 第三層核心）**
- `knowledge_nodes`
- `memory_contexts`
- `geo_content`

**Layer 5**
- `training_data`、`feedback_loops`

**Layer 6**
- `workflow_runs`、`agent_tasks`

**Layer 7**
- `subscriptions`、`orders`、`brand_projects`

**後續 migration 加入**
- `bci_snapshots`、`engagement_signals`（20260422000000）
- `members`、`audit_history`（20260422000001）
- `news_items`（20260422000002）
- `subscription_events`（20260422000003）

---

## 根因推論

線上只有 5 張表，意味著 `supabase/migrations/20260417000000_initial_schema.sql` 與後續 migration **從未成功推送至 `symcio-brandos` project**。可能原因：

1. `SUPABASE_PROJECT_REF` GitHub secret 指向其他 project（不是 `symcio-brandos`）
2. `supabase-deploy.yml` workflow 未曾觸發成功（檢查 Actions 紀錄）
3. 線上的 `brands / leads / visibility_results` 是手動透過 Studio 建立，欄位未必與 `database/schema.md` 一致

`brand_rating_history` 與 `profiles` 是線上獨有，必須先用 `supabase db pull` 取回線上 DDL 才能進 repo。

---

## 動作清單

### A. 確認 GitHub secret 指向正確 project

線上 project URL：`https://supabase.com/dashboard/project/friwpqphwumomernsouh`

→ `SUPABASE_PROJECT_REF` 應為 `friwpqphwumomernsouh`。

```bash
gh secret list --repo SALL911/BrandOS-Infrastructure | grep SUPABASE
```

若 ref 不對，到 GitHub Settings → Secrets and variables → Actions 更新。

### B. 反向匯出線上現況進 repo（task 3）

跑 `scripts/db/dump-schema.sh`：

```bash
export SUPABASE_ACCESS_TOKEN=<personal-access-token>
export SUPABASE_DB_PASSWORD=<db-password>
export SUPABASE_PROJECT_REF=friwpqphwumomernsouh
./scripts/db/dump-schema.sh
```

產物：`supabase/snapshots/<timestamp>_live_schema.sql`，可用於 diff 與後續 reconcile migration。

### C. 把 repo migration 推上去（task 2）

確認 secret 後，手動觸發 deploy workflow：

```bash
gh workflow run supabase-deploy.yml --repo SALL911/BrandOS-Infrastructure -f confirm=deploy
```

或本機跑 `scripts/db/apply-migrations.sh`（非 production 路徑，需謹慎）。

跑完後，預期線上應出現完整 25+ 張表。

### D. 處理線上獨有表

`brand_rating_history` 與 `profiles` dump 出來後，加入新的 migration：

```
supabase/migrations/<timestamp>_adopt_live_only_tables.sql
```

讓未來 migration 能視這兩張表為已知狀態。

### E. 對齊文件命名

CLAUDE.md 與 `rules/esg-tnfd-protocol.md` 將 ESG 表稱為 `esg_metrics`，但 schema 實作為 `esg_profiles`。已在本 PR 一併修正。

---

## 命名差異彙整

| 文件用詞 | Schema 實作 | 處理 |
|---------|------------|------|
| `esg_metrics`（CLAUDE.md L57, L73; rules/esg-tnfd-protocol.md L39, L48）| `esg_profiles` | 文件改為 `esg_profiles`，schema 不動 |

理由：`esg_profiles` 已在 production migration 落地，且結構為「年度快照」（report_year 欄位），語意上較接近 profile 而非 metric。改文件成本低、改 schema 成本高。

---

## RLS 政策

由 `supabase/migrations/20260427000001_rls_policies.sql` 實作，姿態：

| 表 | 對 anon/authenticated | 機制 |
|----|---------------------|------|
| `knowledge_nodes` | 讀取 `is_public = TRUE` | `knowledge_nodes_public_read` policy |
| `geo_content` | 讀取 `published_at IS NOT NULL` | `geo_content_public_read` policy |
| `visibility_reports` | 全部讀取（PDF 仍走 storage signed URL） | `visibility_reports_public_read` policy |
| `members` / `audit_history` | 讀寫自家 row | 由 20260422000001 處理 |
| `news_items` | 讀取 `status = 'published'` | 由 20260422000002 處理 |
| 其餘表（含補上 RLS 的 `ai_queries`、`ai_responses`） | 完全拒絕 | RLS enabled + 無 policy = service_role only |

`COMMENT ON TABLE` 標註 `RLS: service_role only` 讓 Studio 上一目了然。

---

## 資料補齊（industry / domain）

線上 `brands` 共 74 筆，多數 `domain=NULL`、`industry='default'`。處理流程：

| Stage | 自動化程度 | 工具 |
|-------|----------|------|
| 1. domain 補值 | 完全自動（`primary_email` 取 after-@） | `scripts/db/backfill_brand_metadata.py --stage domain` |
| 2. industry 補值 | 半自動（讀 `data/brand_industry_mapping.csv`） | `scripts/db/backfill_brand_metadata.py --stage industry` |

**資料準備**：

`data/brand_industry_mapping.csv` 已預填可從公開資訊辨識的 21 個 domain → industry。其餘 ~53 筆 domain 需人工補：

```bash
# 1. 先跑 domain stage 把 brands.domain 填好
SUPABASE_DB_URL=postgresql://... \
  python scripts/db/backfill_brand_metadata.py --stage domain --dry-run

# 2. 列出仍 industry='default' 的 domain，補進 CSV
SUPABASE_DB_URL=postgresql://... \
  python scripts/db/backfill_brand_metadata.py --stage industry --dry-run

# 3. 確認後拿掉 --dry-run 寫入
```

**安全機制**：
- 兩階段都在 `WHERE` 加 `domain IS NULL` / `industry IN ('default','')` 條件，**不覆蓋已有真值**
- `--dry-run` 預設可印前 10 筆 preview
- 不依賴 `service_role`；用 `SUPABASE_DB_URL`（postgres user）即可

---

## 部署事件紀錄（2026-04-27）

### 階段一：補 secret + 修 partial schema（PR #33-#35）

線上 `symcio-brandos` deploy 從 Apr 17 起 8 次 run 全紅。根因依序揭露：

1. **三個 secret 缺漏**（PR #33 後發現）—— `SUPABASE_PROJECT_REF` / `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` 從未設定，`supabase link` 立刻失敗。
2. **partial schema 撞 FK**（PR #34）—— 線上 `brands` 是 Studio 手動建的 6 欄位 partial schema。`CREATE TABLE IF NOT EXISTS` 偵測到表已存在直接跳過 → `esg_profile_id` 欄位從未建立 → 後面 ADD CONSTRAINT FK 找不到欄位。fix：在 brands / visibility_results 的 CREATE TABLE 後加 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 自我修復區塊；對 fresh install 為 no-op。
3. **backfill 缺 runtime**（PR #35）—— 改用 `workflow_dispatch` workflow 跑 `backfill_brand_metadata.py`，不要求人本機裝 psycopg。

完成後 deploy run #9 綠燈 23s，Table Editor 從 5 張表 → 25+ 張，`brands` 從 6 欄 → 22+ 欄。

### 階段二：補 industry 分類

`data/brand_industry_mapping.csv` 從 21 筆擴充到 67 筆（依公司名稱 + email domain 推論）。
未補的剩 ~7 筆，多為命名隱晦（如「凱鍶 / 漢穎 / 群悅 / 羅賓斯」），需人工查詢確認。

### 階段三：DB 密碼 reset 後的下游影響盤點

`supabase-deploy` run #9 在 DB 密碼 reset 之前以舊密碼成功推完 migration（已成歷史，不需重跑）。reset 之後盤點所有靠 DB 密碼連線的下游服務：

| 服務 | 連線方式 | 是否受影響 | 動作 |
|------|---------|-----------|------|
| GitHub workflow `supabase-deploy.yml` | `SUPABASE_DB_PASSWORD` secret | ✅ 已用新密碼覆蓋（必要）| 下次 run 才會驗證 |
| GitHub workflow `brand-backfill.yml`（PR #37）| `SUPABASE_DB_URL` secret（pooler）| ✅ 由 PR #37 改成讀整段 pooler URL；只要 secret 是新密碼版就過 | 同上 |
| 其他 GitHub workflows | `SUPABASE_SERVICE_ROLE_KEY`（JWT）| ❌ 不受影響 | 不動 |
| Vercel `web/landing` production | 僅 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_*`（全為 JWT）| ❌ 不受影響 | 不動 |

**Vercel 端結論**：grep `web/landing/{lib,app,vercel.json}` 全域只用 4 個 Supabase env，皆為 JWT key，與 `postgres` user 密碼完全解耦（JWT 由獨立的 `JWT_SECRET` 簽署）。DB 密碼 reset 對 Vercel 部署零影響，**無動作必要**。

**驗證指令**（若仍想 double-check Vercel 端有沒有藏著手動加的 DB 連線變數）：

```bash
cd web/landing && vercel env ls production | grep -iE 'DB_URL|POSTGRES|DB_PASSWORD'
```

預期輸出為空。若真撈到值，再用 `scripts/vercel_env_push.sh` 用 pooler URL（IPv4，port 6543）覆蓋——這是 PR #37 踩過的同一個雷，不要用 `db.<ref>.supabase.co`（IPv6 only）。

---

## 驗收標準

| # | 動作 | 狀態 |
|---|------|------|
| 1 | secret ref 指向 `symcio-brandos` | ✅ 完成（`friwpqphwumomernsouh`）|
| 2 | repo migration 已推上線 | ✅ 完成（deploy run #9 綠燈，Table Editor 25+ 張表）|
| 3 | 線上獨有表進 repo | ⏳ 待跑 `dump-schema.sh` 把 `brand_rating_history` / `profiles` 收進 repo |
| 4 | 命名對齊 | ✅ 完成（`esg_metrics` → `esg_profiles`）|
| 5 | RLS 明確化 | ✅ 完成（migration 20260427000001 推上線）|
| 6 | brand metadata 補齊 | ⏳ 待人工觸發 brand-backfill workflow |
| 7 | Vercel env 同步新 DB 密碼 | ✅ 不適用 — `web/landing` 只用 JWT key（service_role / anon），DB 密碼 reset 對 Vercel 端零影響 |

---

## 版本紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-04-27 | 初版 — 對照 Table Editor 截圖完成 gap 分析 |
| v1.1 | 2026-04-27 | 新增 RLS 政策章節與 brand metadata 補齊 runbook（migration 20260427000001 + backfill_brand_metadata.py） |
| v1.2 | 2026-04-27 | 部署事件紀錄；CSV 擴充至 67 筆；驗收狀態更新 |
| v1.3 | 2026-04-27 | 階段三：DB 密碼 reset 下游影響盤點；Vercel 端 grep 後確認無 DB 密碼依賴，驗收 #7 ✅ 結案 |
