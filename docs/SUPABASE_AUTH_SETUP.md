# Supabase Auth + 會員系統設定（PR #1）

> 對應檔案：`supabase/migrations/20260422000001_members_audit_history.sql` +
> `web/landing/lib/supabase/*` + `web/landing/app/(auth)/*` +
> `web/landing/app/dashboard/*` + `web/landing/app/auth/*`

---

## 一、資料庫 migration

```bash
# 方法 A：Supabase CLI
supabase db push

# 方法 B：直接在 Supabase Studio → SQL Editor 貼上內容執行
#        supabase/migrations/20260422000001_members_audit_history.sql
```

建立的東西：
- `public.members` 表（延伸 `auth.users`，存 display_name / plan / quota）
- `public.audit_history` 表（BCI 時序紀錄，append-only）
- `on_auth_user_created` trigger — 新註冊自動建 members 一筆
- RLS：會員只能讀寫自己的資料（service_role bypass）

---

## 二、Supabase 啟用 Email + Password

Supabase Dashboard → **Authentication → Providers → Email**

- ✅ **Enable Email provider**（通常預設啟用）
- ✅ **Confirm email**：強烈建議開（防機器人註冊；初期測試可關）
- Password min length：8（`LoginForm.tsx` 也有前端檢查）

**Email templates**（可選，但建議客製）：
- Authentication → Email Templates → Confirm Signup
- 把 subject 改成「確認你的 Symcio BrandOS 註冊」
- Body 加入 `{{ .ConfirmationURL }}` 點擊連結後導到 `/auth/callback`

---

## 三、啟用 Google OAuth

### Step 1：Google Cloud Console 建 OAuth Client

1. 到 https://console.cloud.google.com/apis/credentials
2. 選你的專案（沒有就建一個）
3. **+ CREATE CREDENTIALS → OAuth client ID**
4. Application type：**Web application**
5. Name：`Symcio BrandOS Auth`
6. **Authorized JavaScript origins**：
   ```
   https://symcio.tw
   https://symcio-landing.vercel.app
   http://localhost:3000
   ```
7. **Authorized redirect URIs**：
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   （把 `<your-project-ref>` 換成你的 Supabase project reference）
8. 點 **Create**，複製 **Client ID** + **Client Secret**

### Step 2：Supabase Dashboard 貼上

Authentication → **Providers → Google**：
- ✅ **Enable Sign in with Google**
- Client ID（for OAuth）：剛複製的
- Client Secret（for OAuth）：剛複製的
- Skip nonce check：關（預設）
- Save

### Step 3：Site URL + Redirect URLs

Authentication → **URL Configuration**：

- **Site URL**：`https://symcio.tw`
- **Redirect URLs**（加入所有環境）：
  ```
  https://symcio.tw/auth/callback
  https://symcio-landing.vercel.app/auth/callback
  http://localhost:3000/auth/callback
  ```

---

## 四、Vercel 環境變數

Vercel Dashboard → Settings → Environment Variables，**Production + Preview 都要設**：

| Key | Value | 備註 |
|-----|-------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | 公開（瀏覽器端也讀）|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase API → anon/public key | 公開 |
| `SUPABASE_URL` | 同 above（server 端 envelope 用）| 保留相容 |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | **不公開**；只給 API routes |

設完 → **Redeploy**（env 改動不自動生效）。

本地開發：複製 `.env.example` → `.env.local`，填上同樣 4 個 key。

---

## 五、測試清單

**本地 `npm run dev` 跑起來後**：

1. 訪 `http://localhost:3000` → 右上角應該有「登入 / 免費註冊」
2. 按「免費註冊」→ 填 Email + 8+ 字元密碼 → 看到「註冊成功，查看信箱」訊息
3. 打開信箱點確認連結 → 應該導到 `/dashboard`
4. Dashboard 首頁顯示「還沒有診斷紀錄」
5. 到 `/audit` 跑一次 BCI → 報告頂端應該顯示「✓ 已儲存到你的 BCI 歷史」
6. 回 `/dashboard` → 統計數字更新；「最近 5 筆」顯示剛跑的紀錄
7. `/dashboard/history` → 顯示完整歷史表格
8. 按右上角「登出」→ 回到首頁，CTA 回到「登入 / 免費註冊」

**Google OAuth 測試**：

1. 未登入狀態按「使用 Google 登入」
2. 瀏覽器跳轉到 Google 同意畫面
3. 選帳號 → 瀏覽器回到 `<your-app>/auth/callback?code=...`
4. 自動導到 `/dashboard`
5. `members` 表應該有一筆新紀錄（avatar_url 從 Google profile 來）

---

## 六、除錯

### 「missing NEXT_PUBLIC_SUPABASE_URL」
Vercel env 沒設，或設了沒 redeploy。

### Google OAuth 「invalid_request」
Google Cloud Console 的 Authorized redirect URIs 沒包含
`https://<project-ref>.supabase.co/auth/v1/callback`。

### 註冊成功但 members 表沒資料
`on_auth_user_created` trigger 沒跑到。檢查：
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
若沒有，重跑 migration。

### `/dashboard` 沒跳到 login
middleware.ts 的 matcher 沒生效；確認檔案在 `web/landing/middleware.ts`（不是 app/middleware.ts），且 `NEXT_PUBLIC_SUPABASE_*` env 已設。

### BCI 報告儲存失敗
`audit_history` RLS policy 擋下。檢查：
- 使用者已登入（`supabase.auth.getUser()` 非 null）
- Insert 的 `member_id` 等於 `auth.uid()`（policy 的 WITH CHECK）

---

## 七、下一輪（PR #2 可選範圍）

- [ ] 忘記密碼 / Reset password 流程
- [ ] Email 變更 + 重新驗證
- [ ] 刪除帳號（含 cascade delete audit_history）
- [ ] 方案升級流程（Stripe subscription + plan 欄位切換）
- [ ] Quota reset cron（每月 1 日歸零 `audits_used_this_month`）
- [ ] 2FA / TOTP 支援
- [ ] SSO / SAML（Enterprise）
