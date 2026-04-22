# AUTH + Member Dashboard — 架構提案

> **狀態：提案，尚未實作。** 先看過、挑方向，再開工。

---

## 一、使用者旅程目標

你要的終局是：

```
訪客登入 → 會員儀表板 → 可以
   1. 看自己的 BCI + GEO audit 時序
   2. 新增競品 tracking
   3. 設定自動化規則（分數掉 / 競品超過 → 通知）
   4. 看每日 AI 行銷建議（AI agent 生成）
   5. 匯出報告給內部同事
   6. 接 Slack / Email / HubSpot
```

這個等級的產品 = **10–15 個新檔案 + 2 週開發**。先確認方向，才開工。

---

## 二、三種實作路徑（選一）

| 選項 | 技術 | 工作量 | 優缺 |
|------|------|-------|------|
| **A. Supabase Auth + 自建 dashboard** | Supabase Auth（內建 magic link + OAuth）+ Next.js `/app/(auth)` 路由群 | 中（~10 檔案）| 全部自己擁有；客製化空間大；無第三方依賴 |
| **B. Clerk.com + 自建 dashboard** | Clerk Auth + Next.js | 中偏少（~8 檔案）| 有現成 UI；但每月 > 10k MAU 收費；多一個 vendor |
| **C. Stytch / Auth0** | Stytch + Next.js | 中 | 企業級功能；學習曲線較陡 |

**推薦 A**。原因：
- 你已經在 Supabase 了，不用再加 vendor
- Supabase Auth 的 RLS（Row Level Security）可以讓 `bci_snapshots` / `visibility_results` 的「這筆資料只有這個會員看得到」邏輯在 DB 層解決
- 成本：免費 up to 50,000 MAU
- Magic link + Google OAuth 內建

---

## 三、Dashboard 資訊架構（A 方案）

```
/app/
├── (marketing)/           ← 現有公開頁（沿用）
│   ├── page.tsx           ← homepage
│   ├── about/
│   ├── pricing/
│   └── tools/
├── (auth)/                ← 登入相關，無 chrome
│   ├── login/
│   └── callback/          ← Supabase OAuth callback
└── (member)/              ← 會員區（middleware 擋未登入）
    ├── layout.tsx         ← 含側邊欄 + session check
    ├── page.tsx           ← Overview
    ├── brands/
    │   ├── page.tsx       ← 已追蹤品牌清單
    │   └── [id]/
    │       ├── page.tsx   ← 單品牌總覽（BCI + GEO）
    │       ├── bci/
    │       ├── visibility/
    │       └── competitors/
    ├── alerts/            ← 通知規則設定
    ├── integrations/      ← Slack / HubSpot / Email webhook
    ├── reports/           ← 匯出 / 分享
    └── settings/
```

---

## 四、資料庫 Schema（延伸現有）

### 新增 `members` 表
```sql
CREATE TABLE members (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    VARCHAR(255),
  role            VARCHAR(50) DEFAULT 'member',
  -- role: owner / admin / member / viewer
  plan            VARCHAR(50) DEFAULT 'free',
  -- plan: free / pro / enterprise
  monthly_audit_quota INTEGER DEFAULT 3,
  audits_used_this_month INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 新增 `tracked_brands` 表（誰追蹤誰）
```sql
CREATE TABLE tracked_brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id) ON DELETE CASCADE,
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  relationship    VARCHAR(50) DEFAULT 'own',
  -- relationship: own（自家）/ competitor / watchlist
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, brand_id)
);
```

### RLS 範例（核心安全邏輯）
```sql
-- bci_snapshots 只能看到自己追蹤品牌的資料
CREATE POLICY bci_member_read ON bci_snapshots
  FOR SELECT USING (
    brand_id IN (
      SELECT brand_id FROM tracked_brands WHERE member_id = auth.uid()
    )
  );

-- visibility_results 同理
CREATE POLICY viz_member_read ON visibility_results
  FOR SELECT USING (
    brand_id IN (
      SELECT brand_id FROM tracked_brands WHERE member_id = auth.uid()
    )
  );
```

---

## 五、AI 行銷 Agent 層

會員 dashboard 的核心差異化：**每日自動產生可執行的 AI 行銷建議**。

```
┌─────────────────────────────────────────┐
│ Daily AI Marketing Agent (new workflow) │
│                                          │
│ 1. Read member's tracked_brands          │
│ 2. Read last 7 days of BCI + visibility │
│ 3. Identify                              │
│    - Rising competitors                  │
│    - Dropping mention rate               │
│    - Sentiment shifts                    │
│ 4. LLM → generate 3 actionable outputs: │
│    a) LinkedIn post draft                │
│    b) GEO content brief                  │
│    c) Suggested A/B test                 │
│ 5. Email / Slack push                    │
└─────────────────────────────────────────┘
```

新增 `marketing_suggestions` 表：
```sql
CREATE TABLE marketing_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id),
  brand_id        UUID REFERENCES brands(id),
  suggestion_type VARCHAR(50),
  -- type: linkedin_post / content_brief / ab_test / alert
  title           VARCHAR(500),
  body            TEXT,
  trigger_signal  JSONB,
  status          VARCHAR(20) DEFAULT 'pending',
  -- status: pending / reviewed / published / dismissed
  generated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

對應 workflow：`.github/workflows/marketing-agent-daily.yml`，讀 BCI + visibility → 呼叫 Gemini 生成 → 寫 DB → 推 email/Slack。

---

## 六、訂閱 / 付費對應

| Plan | 月費 | Audit 次數 | Tracked Brands | AI 建議頻率 |
|------|-----|-----------|---------------|------------|
| Free | 0 | 3 | 1（自家）+ 2（競品）| 週報 |
| Pro | NTD 10,000 | 30 | 10 | 每日 |
| Enterprise | NTD 25–50 萬 / 年 | 無限 | 無限 | 即時 + API |

Stripe 產品對應（已有 `audit` / `optimization`，新增 `subscription_pro`）。

---

## 七、開工先後順序（推薦）

如果你說做，建議分 4 個 PR：

1. **PR #1（1–2 天）**：Supabase Auth + `(auth)` 路由 + middleware + `members` 表 + RLS policies
2. **PR #2（2–3 天）**：`(member)` layout + Overview page + tracked_brands CRUD
3. **PR #3（2–3 天）**：BCI / visibility 視覺化（Recharts）+ 競品對比
4. **PR #4（3–4 天）**：Marketing Agent workflow + `marketing_suggestions` + email push

總工作量：**約 2 週**。

---

## 八、技術決策要你拍板（下一輪開工前確認）

1. **Auth provider**：A / B / C？（我推 A）
2. **OAuth providers**：Google + Email magic link？還要 LinkedIn OAuth？
3. **訂閱 billing**：Stripe Subscription（recurring）還是 one-time 產品 upgrade？
4. **AI 建議用哪個模型**：Gemini（免費額度多）/ Claude Sonnet 4.7（品質最好）/ OpenAI GPT-5？
5. **Dashboard UI library**：shadcn/ui（推薦，不鎖定）/ Tremor / 自寫？
6. **Alert 通路**：Email + Slack 足夠？還是要 LINE / Discord / Telegram？
7. **多語言**：zh-TW 先上，en-US 後上？還是同步？

回這 7 題，我進下一輪開 PR #1。
