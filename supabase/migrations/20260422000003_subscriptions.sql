-- ============================================================
-- Stripe subscriptions — extend members + audit log
-- ============================================================
-- Pro 訂閱（NTD 9,000/月 或 100,000/年）對應的會員狀態追蹤。
-- Webhook 寫 subscription_events；members 反映當前狀態。
-- ============================================================

-- ---------- members 加 Stripe + 訂閱欄位 ----------
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(120),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS subscription_status    VARCHAR(40),
  -- subscription_status: active / trialing / past_due / canceled / incomplete / incomplete_expired / unpaid / paused
  ADD COLUMN IF NOT EXISTS subscription_price_id  VARCHAR(120),
  ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end   BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_members_stripe_customer
  ON members(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_subscription
  ON members(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN members.subscription_status IS 'Mirrors Stripe subscription.status. Refreshed via webhook.';
COMMENT ON COLUMN members.current_period_end IS 'When the current paid period ends; used by quota reset job.';

-- ---------- subscription_events 表（webhook audit log + 重發保護） ----------
CREATE TABLE IF NOT EXISTS subscription_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id   VARCHAR(120) UNIQUE NOT NULL,
  event_type        VARCHAR(80) NOT NULL,
  -- e.g. 'checkout.session.completed' / 'customer.subscription.updated'
  member_id         UUID REFERENCES members(id) ON DELETE SET NULL,
  stripe_customer_id    VARCHAR(120),
  stripe_subscription_id VARCHAR(120),
  status            VARCHAR(40),
  amount_total      INTEGER,
  currency          VARCHAR(10),
  raw_event         JSONB NOT NULL,
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subevents_member
  ON subscription_events(member_id, processed_at DESC) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subevents_type
  ON subscription_events(event_type, processed_at DESC);

COMMENT ON TABLE subscription_events IS 'Stripe webhook audit log. UNIQUE on stripe_event_id provides replay protection.';

-- ---------- RLS ----------
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
-- service_role only (no anon / member policy) — webhooks write, internal dashboards read

-- ---------- Quota helpers ----------
-- 每月 1 號 reset (audits_used_this_month, quota_reset_at)
-- 由 GitHub Actions cron 呼叫；不靠 trigger（避免每次 SELECT 都驗時間）
CREATE OR REPLACE FUNCTION reset_member_quotas()
RETURNS TABLE(reset_count INTEGER) AS $$
DECLARE
  c INTEGER;
BEGIN
  WITH updated AS (
    UPDATE members
    SET audits_used_this_month = 0,
        quota_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
    WHERE quota_reset_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO c FROM updated;
  RETURN QUERY SELECT c;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_member_quotas IS 'Reset audits_used_this_month for members past their reset date. Called by daily quota cron.';
