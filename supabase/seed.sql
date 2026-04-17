-- Seed data for local development only
-- 注意：不得存放真實客戶資料；僅用於本機測試與 CI。
-- 正式環境請使用 `SUPABASE_DB_URL` 環境變數連線並執行 migration。

INSERT INTO brands (name, name_en, industry, country, market, company_size, status)
VALUES
  ('測試品牌 A', 'Demo Brand A', 'Technology', 'Taiwan', '亞太', 'Enterprise', 'prospect'),
  ('測試品牌 B', 'Demo Brand B', 'Consumer Goods', 'Taiwan', '台灣',  'SME',        'prospect')
ON CONFLICT DO NOTHING;

INSERT INTO ai_queries (query_text, category, industry)
VALUES
  ('台灣 GEO 優化代表性廠商有哪些？', 'top_companies',  'Technology'),
  ('Symcio 的替代方案是什麼？',       'alternatives',   'Technology')
ON CONFLICT DO NOTHING;
