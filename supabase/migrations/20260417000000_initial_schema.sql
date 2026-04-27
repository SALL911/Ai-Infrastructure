-- BrandOS Infrastructure — Initial Schema Migration
-- Source: database/schema.md v2.0
-- Target: PostgreSQL (Supabase)
-- 七層架構：Brand Profiles / GEO Visibility / ESG Intelligence /
--           AI Knowledge / AI Training / Automation / Monetization

-- Required extensions (Supabase enables these by default, kept for portability)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- Layer 1: Brand Profiles（品牌基礎資料）
-- =========================================================

CREATE TABLE IF NOT EXISTS brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  domain          VARCHAR(500),
  industry        VARCHAR(100),
  country         VARCHAR(100),
  market          VARCHAR(100),
  company_size    VARCHAR(50),
  website         VARCHAR(500),
  bloomberg_id    VARCHAR(100),
  esg_profile_id  UUID,
  status          VARCHAR(50) DEFAULT 'active',
  onboarded_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 自我修復：若 brands 表已存在但欄位不全（例：線上手動透過 Studio 建立），
-- 補齊 schema.md 預期的欄位。對 fresh install 為 no-op。
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS name_en        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS domain         VARCHAR(500),
  ADD COLUMN IF NOT EXISTS industry       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS market         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_size   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website        VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bloomberg_id   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS esg_profile_id UUID,
  ADD COLUMN IF NOT EXISTS status         VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS onboarded_at   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS brand_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  scored_at       TIMESTAMPTZ DEFAULT NOW(),
  identity_score  DECIMAL(5,2),
  geo_score       DECIMAL(5,2),
  esg_score       DECIMAL(5,2),
  digital_score   DECIMAL(5,2),
  narrative_score DECIMAL(5,2),
  market_score    DECIMAL(5,2),
  trust_score     DECIMAL(5,2),
  total_score     DECIMAL(5,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Layer 2: GEO Visibility（AI 引擎可見度追蹤）
-- =========================================================

CREATE TABLE IF NOT EXISTS ai_queries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text      TEXT NOT NULL,
  category        VARCHAR(50),
  industry        VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id        UUID REFERENCES ai_queries(id) ON DELETE CASCADE,
  model           VARCHAR(50) NOT NULL,
  response_text   TEXT NOT NULL,
  raw_json        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visibility_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  response_id     UUID REFERENCES ai_responses(id) ON DELETE CASCADE,
  mentioned       BOOLEAN NOT NULL DEFAULT FALSE,
  rank_position   INTEGER,
  sentiment       VARCHAR(20),
  competitors     JSONB,
  score           DECIMAL(5,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 自我修復：visibility_results 在線上若以 partial schema 存在，補齊欄位
-- 讓後面的 CREATE INDEX ON visibility_results(brand_id, mentioned) 能成功。
-- FK 不在這裡硬補（CREATE TABLE 跳過時 FK 定義也帶過）；接受 brand_id 為純 UUID 欄位，
-- 由應用層保證一致性，避免 retrofit FK 對既有資料 validation 失敗。
ALTER TABLE visibility_results
  ADD COLUMN IF NOT EXISTS brand_id      UUID,
  ADD COLUMN IF NOT EXISTS response_id   UUID,
  ADD COLUMN IF NOT EXISTS mentioned     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rank_position INTEGER,
  ADD COLUMN IF NOT EXISTS sentiment     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS competitors   JSONB,
  ADD COLUMN IF NOT EXISTS score         DECIMAL(5,2);

CREATE TABLE IF NOT EXISTS visibility_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  score           DECIMAL(5,2),
  summary         TEXT,
  recommendations TEXT,
  report_file_url VARCHAR(500),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Layer 3: ESG Intelligence（ESG 深度分析）
-- =========================================================

CREATE TABLE IF NOT EXISTS esg_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID REFERENCES brands(id) ON DELETE CASCADE,
  report_year          INTEGER NOT NULL,
  carbon_emission      DECIMAL(15,2),
  energy_usage         DECIMAL(15,2),
  water_usage          DECIMAL(15,2),
  waste_reduction      DECIMAL(5,2),
  environmental_score  DECIMAL(5,2),
  employee_count       INTEGER,
  gender_ratio         DECIMAL(5,2),
  training_hours       DECIMAL(10,2),
  social_score         DECIMAL(5,2),
  board_independence   DECIMAL(5,2),
  esg_report_published BOOLEAN DEFAULT FALSE,
  governance_score     DECIMAL(5,2),
  tnfd_disclosure      JSONB,
  leap_stage           VARCHAR(50),
  data_sources         JSONB,
  last_updated         TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- brands.esg_profile_id 外鍵（循環引用，延後建立）
ALTER TABLE brands
  DROP CONSTRAINT IF EXISTS brands_esg_profile_id_fkey,
  ADD CONSTRAINT brands_esg_profile_id_fkey
    FOREIGN KEY (esg_profile_id) REFERENCES esg_profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS esg_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  type            VARCHAR(50),
  description     TEXT,
  impact_score    DECIMAL(5,2),
  source_url      VARCHAR(500),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Layer 4: AI Knowledge（知識資產累積）
-- =========================================================

CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  node_type       VARCHAR(100) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  insight         TEXT NOT NULL,
  action_items    JSONB,
  source          VARCHAR(255),
  tags            TEXT[],
  is_public       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_contexts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date    DATE NOT NULL,
  context_type    VARCHAR(100),
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  key_decisions   JSONB,
  next_actions    JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  content_type    VARCHAR(100),
  title           VARCHAR(500),
  content         TEXT NOT NULL,
  target_queries  TEXT[],
  platforms       TEXT[],
  performance     JSONB,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Layer 5: AI Training（AI 訓練與回饋）
-- =========================================================

CREATE TABLE IF NOT EXISTS training_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type      VARCHAR(50),
  content         TEXT NOT NULL,
  label           JSONB,
  quality_score   DECIMAL(5,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_loops (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID REFERENCES visibility_reports(id) ON DELETE SET NULL,
  user_feedback     TEXT,
  correction        TEXT,
  improvement_flag  BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Layer 6: Automation（自動化流水線）
-- =========================================================

CREATE TABLE IF NOT EXISTS workflow_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type   VARCHAR(50),
  status          VARCHAR(20) DEFAULT 'pending',
  triggered_by    VARCHAR(20),
  logs            JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
  agent           VARCHAR(50),
  task_type       VARCHAR(50),
  input           JSONB,
  output          JSONB,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Layer 7: Monetization（商業化閉環）
-- =========================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  plan            VARCHAR(50) NOT NULL,
  status          VARCHAR(50) DEFAULT 'active',
  started_at      TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ,
  mrr             DECIMAL(10,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  product         VARCHAR(50),
  price           DECIMAL(10,2),
  payment_status  VARCHAR(20) DEFAULT 'pending',
  delivery_status VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255),
  company         VARCHAR(255),
  email           VARCHAR(255),
  source          VARCHAR(50),
  status          VARCHAR(50) DEFAULT 'new',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  stage           INTEGER CHECK (stage BETWEEN 1 AND 8),
  status          VARCHAR(50) DEFAULT 'in_progress',
  deliverables    JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- Indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_brands_status    ON brands(status);
CREATE INDEX IF NOT EXISTS idx_brands_industry  ON brands(industry);
CREATE INDEX IF NOT EXISTS idx_brands_domain    ON brands(domain);

CREATE INDEX IF NOT EXISTS idx_visibility_results_brand
  ON visibility_results(brand_id);
CREATE INDEX IF NOT EXISTS idx_visibility_results_mentioned
  ON visibility_results(mentioned, rank_position);
CREATE INDEX IF NOT EXISTS idx_ai_responses_model
  ON ai_responses(model);

CREATE INDEX IF NOT EXISTS idx_esg_profiles_brand_year
  ON esg_profiles(brand_id, report_year);
CREATE INDEX IF NOT EXISTS idx_esg_events_type
  ON esg_events(brand_id, type);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type
  ON knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_tags
  ON knowledge_nodes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_geo_content_queries
  ON geo_content USING GIN(target_queries);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_status
  ON workflow_runs(status, workflow_type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
  ON agent_tasks(status, agent);

-- =========================================================
-- updated_at triggers（自動更新修改時間）
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'brands','knowledge_nodes','geo_content',
    'subscriptions','brand_projects'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

-- =========================================================
-- Row Level Security（預設啟用；細部 policy 留待後續 migration）
-- =========================================================

ALTER TABLE brands              ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE esg_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE esg_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_nodes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_contexts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_content         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_loops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_projects      ENABLE ROW LEVEL SECURITY;
