-- SMS 行銷基礎設施 — Mitake 為主要 gateway，未來可擴充 Chunghwa / Twilio
-- 設計原則：
--   1. opt-in 必須明確（consent_at + consent_source），這是 個資法 §20 的底線
--   2. opt-out 一鍵即時生效（opt_out_at 非 NULL 就永遠不再寄）
--   3. 每位訂閱者有唯一 opt_out_token，塞在 SMS 裡的退訂連結
--   4. 每一則發送留軌跡（sms_deliveries），便於異議處理與法遵稽核

-- ============================================================
-- 訂閱者名單
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             VARCHAR(20) NOT NULL,                 -- E.164 格式：+886912345678
  brand_id          UUID REFERENCES brands(id) ON DELETE SET NULL,
  consent_at        TIMESTAMPTZ,                          -- OTP 驗證成功的當下
  consent_source    VARCHAR(50),                          -- 'landing' / 'audit-form' / 'tool-brand-check' / ...
  consent_ip        VARCHAR(64),                          -- 個資法要求可追溯來源 IP
  opt_out_at        TIMESTAMPTZ,                          -- NULL = 仍在收
  opt_out_token     VARCHAR(32) NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  verification_code VARCHAR(16),                          -- 尚未驗證時的 OTP
  verification_expires_at TIMESTAMPTZ,
  segment_tags      JSONB DEFAULT '[]'::jsonb,            -- ['web3', 'esg', 'sports-sponsor'] 等
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_subscribers_phone ON sms_subscribers(phone);
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_active
  ON sms_subscribers(opt_out_at)
  WHERE opt_out_at IS NULL AND consent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_tags
  ON sms_subscribers USING GIN (segment_tags);
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_token ON sms_subscribers(opt_out_token);

-- ============================================================
-- Campaign 模板
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  message_template TEXT NOT NULL,                         -- 含 {brand} {opt_out_url} 等 placeholder
  segment_filter   JSONB NOT NULL DEFAULT '{}'::jsonb,    -- {"tags":["web3"],"industry":"saas"}
  provider         VARCHAR(50) NOT NULL DEFAULT 'mitake', -- 'mitake' / 'chunghwa' / 'twilio'
  scheduled_at     TIMESTAMPTZ,                           -- NULL = 立即
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ,
  planned_count    INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  delivered_count  INTEGER DEFAULT 0,
  failed_count     INTEGER DEFAULT 0,
  created_by       VARCHAR(100),                          -- email 或 username，手動記錄
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status
  ON sms_campaigns(started_at, finished_at);

-- ============================================================
-- 發送紀錄（每訂閱者 × 每 campaign 一筆）
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  subscriber_id    UUID NOT NULL REFERENCES sms_subscribers(id) ON DELETE CASCADE,
  phone            VARCHAR(20) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued / sent / delivered / failed / bounced
  provider_msg_id  VARCHAR(100),
  error_code       VARCHAR(50),
  error_message    TEXT,
  sent_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_deliveries_campaign
  ON sms_deliveries(campaign_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_deliveries_campaign_sub
  ON sms_deliveries(campaign_id, subscriber_id);

-- ============================================================
-- updated_at trigger for sms_subscribers
-- ============================================================
CREATE OR REPLACE FUNCTION _sms_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sms_subscribers_updated_at ON sms_subscribers;
CREATE TRIGGER trg_sms_subscribers_updated_at
  BEFORE UPDATE ON sms_subscribers
  FOR EACH ROW EXECUTE FUNCTION _sms_set_updated_at();

-- ============================================================
-- RLS：service_role 才能寫（其他都禁）
-- ============================================================
ALTER TABLE sms_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_deliveries  ENABLE ROW LEVEL SECURITY;
