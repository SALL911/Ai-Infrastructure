-- UTM + Ad click ID 歸因追蹤
-- 每一個 lead 來源精準可回推到哪支廣告 / 哪個 content 變體 / 哪個 referrer。
-- AuditForm 以前沒寫 DB → 接下來也會補 /api/audit-leads 路由，落到同一張 leads 表。
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS utm_source        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_content       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_term          VARCHAR(200),
  ADD COLUMN IF NOT EXISTS referrer          VARCHAR(500),
  ADD COLUMN IF NOT EXISTS first_landing_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS first_touch_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fbclid            VARCHAR(200),              -- Meta ad click ID
  ADD COLUMN IF NOT EXISTS gclid             VARCHAR(200),              -- Google ad click ID
  ADD COLUMN IF NOT EXISTS li_fat_id         VARCHAR(200);              -- LinkedIn ad click ID

-- 查「某廣告帶了多少 lead、品質如何」O(1)
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign
  ON leads(utm_source, utm_campaign)
  WHERE utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_fbclid
  ON leads(fbclid)
  WHERE fbclid IS NOT NULL;
