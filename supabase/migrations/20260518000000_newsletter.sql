-- ============================================================
-- Newsletter subscribers + delivery log
-- ============================================================
-- Used by:
--   POST /api/newsletter/subscribe       — visitors subscribe via /news form
--   GET  /api/cron/weekly-digest         — Monday cron sends digest to actives
-- ============================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) NOT NULL UNIQUE,
  display_name      VARCHAR(120),
  language          VARCHAR(10) NOT NULL DEFAULT 'zh-TW',
  status            VARCHAR(20) NOT NULL DEFAULT 'active',
  -- active / unsubscribed / bounced / complained
  source            VARCHAR(40) NOT NULL DEFAULT 'website',
  -- website / typeform / discord / referral / import
  subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at   TIMESTAMPTZ,
  -- Optional UTM attribution captured at subscribe time
  attribution       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subs_status
  ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_email
  ON newsletter_subscribers(email);

COMMENT ON TABLE newsletter_subscribers IS
  'ESG×SDG weekly digest mailing list. Re-subscription updates status back to active.';

-- ---------- Delivery log (one row per (subscriber, digest)) ----------
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id     UUID REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  digest_slug       VARCHAR(200) NOT NULL,
  -- Matches news_items.slug for the digest (e.g., 'digest-2026w20')
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            VARCHAR(20) NOT NULL,
  -- sent / failed / bounced / opened / clicked
  resend_id         VARCHAR(120),
  error             TEXT,
  UNIQUE (subscriber_id, digest_slug)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_deliv_digest
  ON newsletter_deliveries(digest_slug, sent_at DESC);

COMMENT ON TABLE newsletter_deliveries IS
  'Per-subscriber weekly digest send log. UNIQUE constraint prevents duplicate sends if cron re-fires.';

-- ---------- RLS ----------
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_deliveries ENABLE ROW LEVEL SECURITY;

-- Default: deny all from client. Service role bypass.
-- Subscribe endpoint uses service role; portal (if added) can add scoped policy.
