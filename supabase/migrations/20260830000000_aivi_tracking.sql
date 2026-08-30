-- ============================================================
-- AIVI Tracking — 可販售的「AI 能見度基線與追蹤」訂閱資料層
-- ============================================================
-- 對應文件：docs/AIVI-PRODUCT.md
-- 對應 pipeline：.github/workflows/aivi-weekly.yml → scripts/aivi_tracker.py
--
-- 設計原則（紅線）：
--   1. 裁判不下場：本資料層只存「量測值」，不存優化執行紀錄、不存成效抽成欄位。
--   2. 無簽約不採樣：brands.consent_ref / dpa_id 皆非空才視為可計費品牌
--      （見 v_aivi_billable_brands）。
--   3. 權重不落地：維度權重存 aivi_config_weights（RLS：僅 service_role），
--      repo 內只有 loader，不硬編碼。
--   4. 趨勢可比：prompt bank 版本化並鎖版（prompt_sets.locked_until），
--      改題必須開新版，否則月對月趨勢失效。
--   5. 方法論揭露：responses 記錄 engine + model_version + sampled_via
--      （api / serp_provider），報告須註明「API 採樣，非消費者介面重現」。
-- ============================================================

-- ---------- brands：合約與實體收斂欄位 ----------
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS consent_ref     VARCHAR(200),   -- 客戶授權書編號（無此值不得採樣）
  ADD COLUMN IF NOT EXISTS dpa_id          VARCHAR(200),   -- 資料處理協議編號
  ADD COLUMN IF NOT EXISTS aliases         TEXT[] DEFAULT '{}',  -- 別名（含英文、舊名、常見誤植）
  ADD COLUMN IF NOT EXISTS competitors     TEXT[] DEFAULT '{}',  -- 同框競品清單
  ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(30) DEFAULT 'prospect';
  -- prospect（未簽約）/ baseline（免費示範版）/ poc（90 天）/ subscription（月追蹤）/ paused

COMMENT ON COLUMN brands.consent_ref IS '客戶書面授權編號；NULL 表示僅能跑公開資訊示範版，不得出具具名報告';
COMMENT ON COLUMN brands.dpa_id      IS '資料處理協議（DPA）編號；歐盟客戶必填';

-- ---------- prompt_sets：版本化 prompt bank ----------
CREATE TABLE IF NOT EXISTS prompt_sets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID REFERENCES brands(id) ON DELETE CASCADE,
  version       VARCHAR(20)  NOT NULL,             -- 'v1' / 'v2'…，改題開新版
  locale        VARCHAR(10)  NOT NULL,             -- 'zh-TW' / 'en'
  prompts       JSONB        NOT NULL,             -- [{ id, intent, text }]
  intent_mix    JSONB,                             -- { brand: 8, category: 12, comparison: 12, purchase: 8 }
  locked_until  DATE,                              -- 鎖版到期日（POC 期間 90 天內不得改題）
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, version, locale)
);

CREATE INDEX IF NOT EXISTS idx_prompt_sets_brand ON prompt_sets(brand_id, locale);

-- ---------- aivi_runs：每次採樣批次 ----------
CREATE TABLE IF NOT EXISTS aivi_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  prompt_set_id   UUID REFERENCES prompt_sets(id) ON DELETE SET NULL,
  run_type        VARCHAR(20) NOT NULL DEFAULT 'weekly',  -- baseline / weekly / adhoc
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  engines         TEXT[] DEFAULT '{}',
  prompt_count    INTEGER,
  status          VARCHAR(20) DEFAULT 'running',          -- running / completed / failed
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_aivi_runs_brand_time ON aivi_runs(brand_id, started_at DESC);

-- ---------- aivi_responses：原始回覆（保留 24 個月） ----------
CREATE TABLE IF NOT EXISTS aivi_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID REFERENCES aivi_runs(id) ON DELETE CASCADE,
  prompt_id       VARCHAR(50),                    -- 對應 prompt_sets.prompts[].id
  prompt_text     TEXT NOT NULL,
  locale          VARCHAR(10),
  engine          VARCHAR(30) NOT NULL,           -- openai / gemini / claude / perplexity / google_aio
  model_version   VARCHAR(100),                   -- 方法論揭露必要欄位
  sampled_via     VARCHAR(30) DEFAULT 'api',      -- api / serp_provider（不得為 consumer_ui）
  response_text   TEXT,
  latency_ms      INTEGER,
  error           TEXT,
  sampled_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aivi_responses_run ON aivi_responses(run_id);

-- 禁止把消費者版 UI 爬取結果寫進來（違反各引擎 ToS）
ALTER TABLE aivi_responses DROP CONSTRAINT IF EXISTS aivi_responses_sampled_via_chk;
ALTER TABLE aivi_responses ADD CONSTRAINT aivi_responses_sampled_via_chk
  CHECK (sampled_via IN ('api', 'serp_provider'));

-- ---------- aivi_mentions：解析結果（10% 人工抽驗） ----------
CREATE TABLE IF NOT EXISTS aivi_mentions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id     UUID REFERENCES aivi_responses(id) ON DELETE CASCADE,
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  mentioned       BOOLEAN NOT NULL DEFAULT FALSE,
  rank_position   SMALLINT,                       -- 在清單中的名次；未入列為 NULL
  sentiment       VARCHAR(20),                    -- positive / neutral / negative
  cited_urls      TEXT[] DEFAULT '{}',            -- AI 回覆引用的來源（月報「引用來源清單」）
  competitors     TEXT[] DEFAULT '{}',            -- 同框出現的競品
  verified_by     VARCHAR(100),                   -- 人工抽驗者；NULL = 未抽驗
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aivi_mentions_brand ON aivi_mentions(brand_id, created_at DESC);

-- ---------- aivi_scores_monthly：月度六維度分數 ----------
CREATE TABLE IF NOT EXISTS aivi_scores_monthly (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID REFERENCES brands(id) ON DELETE CASCADE,
  period           DATE NOT NULL,                 -- 該月第一天
  dimensions       JSONB NOT NULL,                -- { presence, rank, share, sentiment, citation, consistency }
  composite_score  DECIMAL(5,2),
  grade            VARCHAR(5),
  weights_version  VARCHAR(20) NOT NULL,          -- 只記版本號，不記權重本身
  prompt_version   VARCHAR(20),
  sample_size      INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, period)
);

-- ---------- aivi_config_weights：維度權重（IP，僅 service_role 可讀） ----------
CREATE TABLE IF NOT EXISTS aivi_config_weights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version      VARCHAR(20) NOT NULL,
  industry     VARCHAR(100) NOT NULL DEFAULT 'default',
  weights      JSONB NOT NULL,
  effective_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (version, industry)
);

-- ---------- billing_plans：固定費，無 success fee ----------
CREATE TABLE IF NOT EXISTS aivi_billing_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID REFERENCES brands(id) ON DELETE CASCADE,
  plan          VARCHAR(30) NOT NULL,             -- baseline / poc_90d / monthly_subscription
  fixed_fee     DECIMAL(12,2) NOT NULL,           -- 固定費；刻意不設 success_fee 欄位（中立性）
  currency      VARCHAR(10) NOT NULL DEFAULT 'TWD',
  starts_on     DATE NOT NULL,
  ends_on       DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 可計費品牌 view：無授權即不得出報告 ----------
CREATE OR REPLACE VIEW v_aivi_billable_brands AS
SELECT id, name, name_en, domain, industry, aliases, competitors, tracking_status
FROM brands
WHERE consent_ref IS NOT NULL
  AND dpa_id IS NOT NULL
  AND tracking_status IN ('poc', 'subscription');

-- ---------- RLS：預設 deny，權重表永不對外 ----------
ALTER TABLE prompt_sets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aivi_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE aivi_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE aivi_mentions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aivi_scores_monthly  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aivi_config_weights  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aivi_billing_plans   ENABLE ROW LEVEL SECURITY;

-- 無任何 policy = 僅 service_role 可存取（含 aivi_config_weights，維度權重不外流）
