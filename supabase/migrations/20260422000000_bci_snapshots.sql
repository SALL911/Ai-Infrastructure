-- ============================================================
-- BCI (Brand Capital Index) — snapshot & engagement signal tables
-- ============================================================
-- 對應文件：docs/BCI_METHODOLOGY.md v1.0
--
-- 設計原則：
--   1. bci_snapshots 是每日不可變時序；同一 brand 同一 day 可多筆
--      （例：weights 改版後重算），以 weights_version 區分。
--   2. 權重向量本身不存 DB，只存 weights_version 字串（= private/bci/weights_*.json 的版本）。
--   3. 子項分數 F/V/E 存入（內部分析用），但 /api/bci 只暴露 total_bci。
--   4. engagement_signals 是高頻原子事件，bci_engine.py 做 7 天 rolling 聚合。
-- ============================================================

-- ---------- bci_snapshots ----------
CREATE TABLE IF NOT EXISTS bci_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- 子項（內部使用；API 不暴露）
  f_financial       DECIMAL(5,2),   -- 0-100
  v_visibility      DECIMAL(5,2),   -- 0-100
  e_engagement      DECIMAL(5,2),   -- 0-100

  -- 綜合指標（API 公開）
  total_bci         DECIMAL(5,2) NOT NULL,  -- 0-100

  -- IP 追蹤：指向 private/bci/weights_v{n}.json
  weights_version   VARCHAR(32) NOT NULL DEFAULT 'v1',
  industry_key      VARCHAR(50) NOT NULL DEFAULT 'default',

  -- 來源追蹤（透明度 + debug）
  f_source          VARCHAR(50),    -- yfinance / alphavantage / mops_tw / bloomberg
  v_sample_size     INTEGER,        -- V 計算用到幾筆 visibility_results
  e_sample_size     INTEGER,        -- E 計算用到幾筆 engagement_signals

  -- 原始子指標快照（debug / audit；非公開）
  raw_metrics       JSONB,

  snapshot_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bci_total_range CHECK (total_bci >= 0 AND total_bci <= 100),
  CONSTRAINT bci_f_range     CHECK (f_financial  IS NULL OR (f_financial  BETWEEN 0 AND 100)),
  CONSTRAINT bci_v_range     CHECK (v_visibility IS NULL OR (v_visibility BETWEEN 0 AND 100)),
  CONSTRAINT bci_e_range     CHECK (e_engagement IS NULL OR (e_engagement BETWEEN 0 AND 100))
);

CREATE INDEX IF NOT EXISTS idx_bci_brand_date
  ON bci_snapshots(brand_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_bci_weights_version
  ON bci_snapshots(weights_version);

COMMENT ON TABLE  bci_snapshots IS 'Brand Capital Index daily snapshot. Public API exposes total_bci only.';
COMMENT ON COLUMN bci_snapshots.weights_version IS 'Points to private/bci/weights_v{n}.json; not the weight values themselves.';

-- ---------- engagement_signals ----------
-- E 分量的原子事件。bci_engine.py 做 7 天 rolling 聚合。
CREATE TABLE IF NOT EXISTS engagement_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  signal_type       VARCHAR(50) NOT NULL,
  -- signal_type 選項：
  --   digital_sov          / 數位 Share of Voice（GA4 / 搜尋量）
  --   nps_response         / NPS 表單回覆
  --   advocacy_lexicon     / AI 回應中出現的推薦用語命中
  --   category_relevance   / category prompt 主動提及
  --   social_interaction   / 社群平台互動（讚/留言/分享）

  -- 值的語意由 signal_type 決定；normalize 責任在 bci_engine.py
  value             DECIMAL(12,4),
  weight            DECIMAL(5,2) DEFAULT 1.0,

  -- 原始資料（選填；供 audit）
  raw_payload       JSONB,

  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_brand_type_time
  ON engagement_signals(brand_id, signal_type, occurred_at DESC);

COMMENT ON TABLE engagement_signals IS 'Atomic engagement events; aggregated by bci_engine.py over 7-day rolling window.';

-- ---------- RLS（預設全關；Service Role 走 bypass）----------
ALTER TABLE bci_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_signals  ENABLE ROW LEVEL SECURITY;

-- 只允許 service_role 寫入（bci_engine 跑在 GitHub Actions）
-- 公開 API（/api/bci/:brand）走 service_role + server-side filter，不需要 anon policy
