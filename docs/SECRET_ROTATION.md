# Supabase Secret Rotation Runbook
## SECRET_ROTATION.md v1.0 | 2026-04-28

---

## WHY

2026-04-27/28 的事故：使用者 reset Supabase DB 密碼之後，
- ✅ 更新了 `SUPABASE_DB_URL`（給 4 條 psycopg workflow 用）
- ❌ 忘了更新 `SUPABASE_DB_PASSWORD`（給 supabase CLI workflow 用）

結果 PR #38 merge → `Supabase Deploy #10` red：
```
failed SASL auth (FATAL: password authentication failed for user "postgres")
```

兩個 secret 必須同步輪換，少一個 silent fail。

**修法（已落地，PR claude/unify-supabase-secret）**：`supabase-deploy.yml` 改成優先從 `SUPABASE_DB_URL` 抽密碼；`SUPABASE_DB_PASSWORD` 變成 legacy fallback。**之後密碼輪換只需要更新一個 secret。**

本文件記錄當前 secret 表 + rotation 步驟。

---

## WHAT — 當前 GitHub Secrets 全表

| Secret 名 | 型別 | 哪些 workflow 用 | reset 密碼時要動？ |
|----------|------|----------------|-----------------|
| **`SUPABASE_DB_URL`** | Transaction pooler URL（port 6543）| `brand-backfill` / `notion-to-supabase` / `lead-scorer` / `geo-publisher` / `supabase-deploy`（從這抽密碼）| ✅ **必動** |
| **`SUPABASE_DB_URL_SESSION`** | Session pooler URL（port 5432，相同 host 與密碼，只換埠號）| `orchestrator-db-init`（drizzle-kit migration 工具不能走 Transaction pooler，pgBouncer 不支援 prepared statements）| ✅ **必動**（v1.1 新增，2026-04-28）|
| `SUPABASE_DB_PASSWORD` | 純密碼字串 | `supabase-deploy`（legacy fallback，可留可刪）| ⚠️ 若 `SUPABASE_DB_URL` 已設則不必動；建議直接刪除 secret 避免雙來源混淆 |
| `SUPABASE_PROJECT_REF` | `friwpqphwumomernsouh` | `supabase-deploy` / `schema-snapshot` | ❌ 不變（不是密碼）|
| `SUPABASE_ACCESS_TOKEN` | personal access token | `supabase-deploy` / `schema-snapshot` | ❌ 不變（與 DB 密碼解耦，由 dashboard 另外管理）|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | 多個 workflow + Vercel runtime | ❌ 不變 |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT | 多個 workflow + Vercel runtime | ❌ 不變（JWT 由 JWT_SECRET 簽，與 DB 密碼解耦；但有獨立 rotation 流程，見下）|
| `SUPABASE_ANON_KEY` | JWT | Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ 不變 |

---

## HOW — DB 密碼 rotation 步驟（after PR claude/unify-supabase-secret merged）

### 1. Reset 密碼

Supabase Dashboard → Project Settings → Database → **Reset database password** → 複製新密碼

> ⚠️ 建議產純英數密碼（讓 Supabase 自動產一組，或自選 alphanumeric + `_-` only），避免 `@ : / # %` 等字元需要 URL-encode 的麻煩。

### 2. 拿新的 pooler URL

同頁面 → **Connection string** → **Transaction pooler** tab（port 6543，IPv4）→ Copy → 把 `[YOUR-PASSWORD]` 占位符換成步驟 1 的真實密碼。

最終形狀：
```
postgresql://postgres.friwpqphwumomernsouh:<NEW_PWD>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

### 3. 更新兩個 GitHub secret

#### 3a. `SUPABASE_DB_URL`（Transaction pooler，port 6543）

https://github.com/SALL911/BrandOS-Infrastructure/settings/secrets/actions/SUPABASE_DB_URL
→ Update secret → 貼整段 URL → Save

#### 3b. `SUPABASE_DB_URL_SESSION`（Session pooler，port 5432）

把上面的 URL 複製一份，**手動把 `:6543/postgres` 改成 `:5432/postgres`**（其餘完全相同——同 host、同 user、同密碼，只換埠號）。

https://github.com/SALL911/BrandOS-Infrastructure/settings/secrets/actions/SUPABASE_DB_URL_SESSION
→ Update secret → 貼修改後的 URL → Save

> 為什麼要兩個？Supabase 同一個 DB 有兩種連線模式：Transaction pooler 走 pgBouncer transaction mode（runtime 友善但不支援 prepared statements），Session pooler 走完整 Postgres protocol（migration 工具需要）。`drizzle-kit push` 會卡在 Transaction pooler 的 prepared statement 限制，必須走 Session。Runtime 用 Transaction，migration 用 Session。

### 4.（選配）刪掉 legacy secret

確認下一次 `Supabase Deploy` workflow 跑綠燈、step summary 顯示 `Password source: SUPABASE_DB_URL` 後，可以刪除：

https://github.com/SALL911/BrandOS-Infrastructure/settings/secrets/actions/SUPABASE_DB_PASSWORD
→ ⋯ → Delete

未來 rotation 就只會記得一個 secret，不會再踩雙來源不同步的雷。

### 5. Re-run failed workflow（如果有）

如果 reset 密碼當下有 workflow 在跑，會 SASL auth fail。回到 Actions 頁面，Re-run jobs 即可。

---

## 驗證

更新完跑一次 Supabase Deploy workflow_dispatch（confirm = `deploy`）→ 預期 ~25s 綠燈，step summary 顯示：

```
- Password source: `SUPABASE_DB_URL`
- Status: success
```

任一條 psycopg workflow（最快測：Brand Metadata Backfill, dry_run=true）也跑一次，預期 connect 成功不爆 SASL auth。

---

## Service role key / Anon key rotation（**不在本文件範圍**）

那兩個 JWT 由 Supabase JWT_SECRET 簽署，與 DB 密碼**完全解耦**。Rotation 流程：

Supabase Dashboard → Project Settings → API → JWT Settings → Reset secret

**這會讓所有現存 JWT 失效**（service_role / anon / 已登入使用者的 access token），影響範圍大過 DB 密碼 reset。需要單獨計劃，且更新後 Vercel + 所有 GitHub workflow 都要同步換 key。

> 目前**沒有理由 rotate JWT secret**，除非懷疑 service_role_key 外洩。

---

## 版本紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-04-28 | 初版 — 對應 supabase-deploy.yml 改成優先讀 SUPABASE_DB_URL 的 PR |
