-- ============================================================
-- News items — daily ESG / SDG / BCI feed pipeline
-- ============================================================
-- 對應 pipeline：Vercel cron → /api/cron/fetch-news
--   1. 讀 lib/news/sources.ts 中的 RSS feeds
--   2. Claude API 生成摘要 + BCI 觀點
--   3. INSERT news_items
--   4. POST 到 Discord webhook
-- ============================================================

CREATE TABLE IF NOT EXISTS news_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 來源
  source            VARCHAR(100) NOT NULL,
  -- 'un-sdg' / 'tnfd' / 'gri' / 'cdp' / 'ifrs' / 'reuters-sustainable' / ...
  source_url        VARCHAR(500) NOT NULL,
  source_title      VARCHAR(500) NOT NULL,
  source_author     VARCHAR(200),
  published_at      TIMESTAMPTZ,

  -- 主題分類
  category          VARCHAR(50) NOT NULL DEFAULT 'esg',
  -- 'esg' / 'sdg1' / 'sdg2' / ... / 'sdg17' / 'tnfd' / 'brand-valuation'
  sdg_number        SMALLINT,
  -- SDG 編號（1–17），選填

  -- AI 生成內容
  slug              VARCHAR(200) NOT NULL UNIQUE,
  title_zh          VARCHAR(500) NOT NULL,
  summary_zh        TEXT NOT NULL,
  -- 150 字內的事實摘要
  bci_perspective   TEXT,
  -- Symcio 視角 — 這則新聞對 BCI / 品牌資本的影響（200 字內）
  tags              TEXT[],
  -- 如 ['SDG1','poverty','TNFD','IFRS S2']
  language          VARCHAR(10) NOT NULL DEFAULT 'zh-TW',

  -- AI 執行 metadata
  ai_model          VARCHAR(100),
  -- e.g., 'claude-haiku-4-5-20251001'
  ai_tokens_in      INTEGER,
  ai_tokens_out     INTEGER,
  ai_cost_usd       DECIMAL(10, 6),

  -- 分發狀態
  status            VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- draft / published / failed / suppressed
  published_to      TEXT[] DEFAULT '{}',
  -- 已推送的通路 ['website','discord','linkedin',...]

  -- 原始 payload（debug / 重發）
  raw_entry         JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_published
  ON news_items(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category
  ON news_items(category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sdg
  ON news_items(sdg_number, published_at DESC) WHERE sdg_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_news_source_url
  ON news_items(source_url);

COMMENT ON TABLE news_items IS 'AI-curated ESG / SDG / brand-valuation news feed. Populated by /api/cron/fetch-news.';
COMMENT ON COLUMN news_items.bci_perspective IS 'Symcio BCI perspective on the news — its impact on brand capital.';
COMMENT ON COLUMN news_items.published_to IS 'Distribution channels already pushed to (website/discord/linkedin/...).';

-- updated_at trigger
DROP TRIGGER IF EXISTS news_items_updated_at ON news_items;
CREATE TRIGGER news_items_updated_at
  BEFORE UPDATE ON news_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- RLS: public read for published, service_role writes ----------
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS news_public_read ON news_items;
CREATE POLICY news_public_read ON news_items
  FOR SELECT
  USING (status = 'published');
