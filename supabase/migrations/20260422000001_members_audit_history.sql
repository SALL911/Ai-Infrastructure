-- ============================================================
-- Members + Audit History — PR #1 of member system
-- ============================================================
-- 依循 docs/AUTH_MEMBER_SPEC.md 設計。
-- 每個 auth.users 對應一筆 members；audit_history 是 BCI audit 的時序紀錄。
-- RLS: 會員僅能讀寫自己的資料；service_role 走 bypass。
-- ============================================================

-- ---------- 0. members（延伸 auth.users） ----------
CREATE TABLE IF NOT EXISTS members (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 VARCHAR(255),
  display_name          VARCHAR(120),
  company_name          VARCHAR(255),
  title                 VARCHAR(120),
  avatar_url            VARCHAR(500),
  locale                VARCHAR(10) DEFAULT 'zh-TW',
  plan                  VARCHAR(50) DEFAULT 'free',
  -- plan: free / pro / enterprise
  monthly_audit_quota   INTEGER DEFAULT 3,
  audits_used_this_month INTEGER DEFAULT 0,
  quota_reset_at        TIMESTAMPTZ DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_plan ON members(plan);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

COMMENT ON TABLE members IS 'Member profile extension of auth.users. Insert on first auth via trigger below.';

-- ---------- 1. audit_history（BCI 評分歷史） ----------
CREATE TABLE IF NOT EXISTS audit_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- 輸入快照
  brand_name_zh     VARCHAR(255) NOT NULL,
  brand_name_en     VARCHAR(255),
  website           VARCHAR(500),
  industry          VARCHAR(50) NOT NULL,
  description       TEXT,
  company_size      VARCHAR(20),
  revenue           VARCHAR(50),

  -- 計算結果
  bci_total         SMALLINT NOT NULL,
  fbv_score         SMALLINT,
  ncv_score         SMALLINT,
  aiv_score         SMALLINT,
  chatgpt_score     SMALLINT,
  perplexity_score  SMALLINT,
  google_ai_score   SMALLINT,
  claude_score      SMALLINT,
  tier              VARCHAR(20) NOT NULL,
  -- tier: excellent / good / warning / danger

  geo_score         SMALLINT,
  geo_checks        JSONB,
  competitors       JSONB,
  recommendations   JSONB,

  -- 完整結果快照（供未來重新渲染）
  raw_result        JSONB,

  source            VARCHAR(50) DEFAULT 'web-audit',
  -- source: web-audit / api / paid-audit / free-scan-typeform

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bci_total_range CHECK (bci_total BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_audit_history_member_created
  ON audit_history(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_history_brand
  ON audit_history(member_id, brand_name_zh);

COMMENT ON TABLE audit_history IS 'BCI audit snapshots per member. Append-only time-series.';

-- ---------- 2. Auto-provision members row on signup ----------
-- When Supabase auth.users row is inserted, create matching members row.
CREATE OR REPLACE FUNCTION public.handle_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_member();

-- ---------- 3. updated_at auto bump ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_updated_at ON members;
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- 4. RLS ----------
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;

-- members: read/update own row only
DROP POLICY IF EXISTS members_self_read   ON members;
DROP POLICY IF EXISTS members_self_update ON members;

CREATE POLICY members_self_read ON members
  FOR SELECT USING (id = auth.uid());

CREATE POLICY members_self_update ON members
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- audit_history: read/insert own rows only; no update/delete from client
DROP POLICY IF EXISTS audit_self_read   ON audit_history;
DROP POLICY IF EXISTS audit_self_insert ON audit_history;

CREATE POLICY audit_self_read ON audit_history
  FOR SELECT USING (member_id = auth.uid());

CREATE POLICY audit_self_insert ON audit_history
  FOR INSERT WITH CHECK (member_id = auth.uid());
