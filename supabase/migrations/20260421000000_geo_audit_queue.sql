-- GEO audit queue — 支援多品牌自動掃描與「24 小時內 Free Scan」email 承諾
-- 新增：
--   brands.last_scanned_at      最近一次 GEO audit 完成時間
--   brands.first_scan_sent_at   首次 Free Scan email 已寄出時間（非 NULL 代表已履約）
--   brands.primary_email        首次提交的聯絡 email（email 寄送目標）
--   visibility_results.engine   denormalize 方便報告（chatgpt / claude / gemini / perplexity）
--   visibility_results.query_text / category / response_excerpt   直接存於此表，MVP 先不走 ai_responses 正規化鏈
-- 以及一個 queue 選取索引。

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS last_scanned_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_scan_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS primary_email      VARCHAR(254);

ALTER TABLE visibility_results
  ADD COLUMN IF NOT EXISTS engine           VARCHAR(50),
  ADD COLUMN IF NOT EXISTS query_text       TEXT,
  ADD COLUMN IF NOT EXISTS category         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS response_excerpt TEXT;

-- 讓 queue 撈「等掃」的 prospect 成為常數時間
CREATE INDEX IF NOT EXISTS idx_brands_prospect_queue
  ON brands(status, last_scanned_at)
  WHERE status = 'prospect';

CREATE INDEX IF NOT EXISTS idx_visibility_results_engine
  ON visibility_results(brand_id, engine);
