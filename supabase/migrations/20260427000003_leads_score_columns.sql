-- Add score columns to leads for rule-based lead scoring (P2 roadmap).
--
-- WHY:
--   現況 leads 表沒有 score 欄位，業務用 status 與 notes 自由欄位粗略判斷優先級。
--   為了支援自動化 prioritization（誰先打、誰先寄），加 score（0-100）+ score_breakdown
--   （JSONB 解釋每條規則加多少分）+ scored_at（最近一次計算時間）。
--
-- WHAT:
--   - score INTEGER 0-100，clamped；越高表示越值得優先處理
--   - score_breakdown JSONB，shape：{"rule_name": <int_points>, ...}
--   - scored_at TIMESTAMPTZ，每次 lead_scorer.py 跑完更新
--
-- HOW:
--   `scripts/lead_scorer.py` 讀 leads + 可選 join brands.domain，計算後 UPDATE。
--   排程：`.github/workflows/lead-scorer.yml` 每日跑（在 composio-hubspot-sync 之前）。

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS score           INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS scored_at       TIMESTAMPTZ;

ALTER TABLE leads
  ADD CONSTRAINT leads_score_range CHECK (score BETWEEN 0 AND 100) NOT VALID;

ALTER TABLE leads VALIDATE CONSTRAINT leads_score_range;

CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_scored_at ON leads(scored_at DESC);

COMMENT ON COLUMN leads.score IS
  '0-100 lead score. Computed by scripts/lead_scorer.py. Higher = higher priority.';
COMMENT ON COLUMN leads.score_breakdown IS
  'JSONB explaining each rule contribution. Shape: {"rule_name": points}.';
