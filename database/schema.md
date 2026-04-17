# BrandOS Infrastructure — Master Database Schema
## schema.md v2.0 | Symcio × BrandOS
## Merged: BrandOS-Infrastructure + ai-infrastructure-protocol

---

## 概述（WHY）

本 schema 是 Symcio BrandOS Infrastructure 的完整資料架構，整合兩個原始設計：
- **BrandOS-Infrastructure**：品牌治理、ESG 合規、AI 知識資產管理（三層架構）
- **ai-infrastructure-protocol**：GEO 可見度追蹤、AI 回應評估、自動化流水線、商業化

合併後形成七大模組，覆蓋從品牌診斷到商業閉環的完整數據流。

資料庫技術棧：PostgreSQL（主要）/ SQLite（本機開發）

---

## 架構總覽（Seven Layers）

| Layer | 模組 | 功能 |
|-------|------|------|
| 1 | Brand Profiles | 品牌基礎資料、ESG 指標、評分 |
| 2 | GEO Visibility | AI 引擎可見度追蹤與評估 |
| 3 | ESG Intelligence | ESG 深度分析與事件追蹤 |
| 4 | AI Knowledge | 知識節點、跨 session 記憶、GEO 內容 |
| 5 | AI Training | 訓練數據管理與回饋迴路 |
| 6 | Automation | 自動化流水線與多代理任務 |
| 7 | Monetization | 訂單、Lead、BrandOS SaaS 訂閱 |

---

## Layer 1：Brand Profiles（品牌基礎資料）

### Table: brands

```sql
CREATE TABLE brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,           -- 品牌名稱
  name_en         VARCHAR(255),                    -- 英文名稱
  domain          VARCHAR(500),                    -- 官網域名
  industry        VARCHAR(100),                    -- 產業類別
  country         VARCHAR(100),                    -- 國家/地區
  market          VARCHAR(100),                    -- 主要市場（台灣/亞太/全球）
  company_size    VARCHAR(50),                     -- 規模（SME/Enterprise）
  website         VARCHAR(500),                    -- 官網完整 URL
  bloomberg_id    VARCHAR(100),                    -- Bloomberg 代碼（如有）
  esg_profile_id  UUID,                            -- FK → esg_profiles
  status          VARCHAR(50) DEFAULT 'active',    -- active / inactive / prospect
  onboarded_at    TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: brand_scores（Brand Score AI 七維評分）

```sql
CREATE TABLE brand_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  scored_at       TIMESTAMP DEFAULT NOW(),
  identity_score  DECIMAL(5,2),   -- 品牌識別（0-100）
  geo_score       DECIMAL(5,2),   -- GEO 優化指數（0-100）
  esg_score       DECIMAL(5,2),   -- ESG 合規指數（0-100）
  digital_score   DECIMAL(5,2),   -- 數位資產指數（0-100）
  narrative_score DECIMAL(5,2),   -- 品牌敘事指數（0-100）
  market_score    DECIMAL(5,2),   -- 市場定位指數（0-100）
  trust_score     DECIMAL(5,2),   -- 信任資產指數（0-100）
  total_score     DECIMAL(5,2),   -- 綜合 Brand Score
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Layer 2：GEO Visibility（AI 引擎可見度追蹤）

### Table: ai_queries（標準化測試 Prompt）

```sql
CREATE TABLE ai_queries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text      TEXT NOT NULL,                   -- 測試 prompt 內容
  category        VARCHAR(50),
  -- category 選項：
  -- top_companies / alternatives / problem / comparison
  industry        VARCHAR(100),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: ai_responses（AI 系統回應記錄）

```sql
CREATE TABLE ai_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id        UUID REFERENCES ai_queries(id) ON DELETE CASCADE,
  model           VARCHAR(50) NOT NULL,
  -- model 選項：claude / chatgpt / gemini / perplexity / others
  response_text   TEXT NOT NULL,
  raw_json        JSONB,                           -- 原始 API 回應
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: visibility_results（解析評估結果）

```sql
CREATE TABLE visibility_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  response_id     UUID REFERENCES ai_responses(id) ON DELETE CASCADE,
  mentioned       BOOLEAN NOT NULL DEFAULT FALSE,  -- 是否被提及
  rank_position   INTEGER,                         -- 排名（NULL = 未提及）
  sentiment       VARCHAR(20),
  -- sentiment 選項：positive / neutral / negative
  competitors     JSONB,                           -- 同時出現的競爭對手
  score           DECIMAL(5,2),                    -- GEO 可見度分數
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: visibility_reports（客戶最終報告）

```sql
CREATE TABLE visibility_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  score           DECIMAL(5,2),                    -- 綜合 GEO 分數
  summary         TEXT,
  recommendations TEXT,
  report_file_url VARCHAR(500),                    -- 報告 PDF URL
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Layer 3：ESG Intelligence（ESG 深度分析）

### Table: esg_profiles

```sql
CREATE TABLE esg_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID REFERENCES brands(id) ON DELETE CASCADE,
  report_year          INTEGER NOT NULL,
  -- E: 環境指標
  carbon_emission      DECIMAL(15,2),              -- 碳排放量（tCO2e）
  energy_usage         DECIMAL(15,2),              -- 能源使用量（MWh）
  water_usage          DECIMAL(15,2),              -- 用水量（m3）
  waste_reduction      DECIMAL(5,2),               -- 廢棄物減量（%）
  environmental_score  DECIMAL(5,2),               -- 環境分數（0-100）
  -- S: 社會指標
  employee_count       INTEGER,
  gender_ratio         DECIMAL(5,2),               -- 女性員工比例（%）
  training_hours       DECIMAL(10,2),
  social_score         DECIMAL(5,2),               -- 社會分數（0-100）
  -- G: 治理指標
  board_independence   DECIMAL(5,2),               -- 獨立董事比例（%）
  esg_report_published BOOLEAN DEFAULT FALSE,
  governance_score     DECIMAL(5,2),               -- 治理分數（0-100）
  -- TNFD / LEAP 框架
  tnfd_disclosure      JSONB,                      -- TNFD 揭露數據
  leap_stage           VARCHAR(50),                -- LEAP 框架階段
  data_sources         JSONB,                      -- 數據來源清單
  last_updated         TIMESTAMP DEFAULT NOW(),
  created_at           TIMESTAMP DEFAULT NOW()
);
```

### Table: esg_events（ESG 事件追蹤）

```sql
CREATE TABLE esg_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  type            VARCHAR(50),
  -- type 選項：carbon / labor / governance / compliance
  description     TEXT,
  impact_score    DECIMAL(5,2),                    -- 影響分數（正負）
  source_url      VARCHAR(500),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Layer 4：AI Knowledge（知識資產累積）

### Table: knowledge_nodes（核心知識節點）

```sql
CREATE TABLE knowledge_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  node_type       VARCHAR(100) NOT NULL,
  -- node_type：brand_analysis / geo_strategy / esg_compliance
  --            business_model / market_insight / ip_asset
  title           VARCHAR(500) NOT NULL,
  insight         TEXT NOT NULL,                   -- 核心洞察（2-3句）
  action_items    JSONB,
  source          VARCHAR(255),
  tags            TEXT[],
  is_public       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: memory_contexts（跨 session 情境記錄）

```sql
CREATE TABLE memory_contexts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date    DATE NOT NULL,
  context_type    VARCHAR(100),
  -- context_type：daily_briefing / project_summary / decision_log
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  key_decisions   JSONB,
  next_actions    JSONB,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: geo_content（GEO 內容資產）

```sql
CREATE TABLE geo_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  content_type    VARCHAR(100),
  -- content_type：answer_engine / structured_data / knowledge_graph
  title           VARCHAR(500),
  content         TEXT NOT NULL,
  target_queries  TEXT[],
  platforms       TEXT[],
  -- platforms：ChatGPT / Perplexity / Gemini / Claude
  performance     JSONB,
  published_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Layer 5：AI Training（AI 訓練與回饋）

### Table: training_data

```sql
CREATE TABLE training_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type      VARCHAR(50),
  -- input_type：query / response / report
  content         TEXT NOT NULL,
  label           JSONB,                           -- 標籤與分類
  quality_score   DECIMAL(5,2),                   -- 資料品質分數
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: feedback_loops（效能改善回饋）

```sql
CREATE TABLE feedback_loops (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID REFERENCES visibility_reports(id) ON DELETE SET NULL,
  user_feedback     TEXT,
  correction        TEXT,
  improvement_flag  BOOLEAN DEFAULT FALSE,         -- 是否需要模型改善
  created_at        TIMESTAMP DEFAULT NOW()
);
```

---

## Layer 6：Automation（自動化流水線）

### Table: workflow_runs（自動化執行記錄）

```sql
CREATE TABLE workflow_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type   VARCHAR(50),
  -- workflow_type：audit / report_generation / optimization
  status          VARCHAR(20) DEFAULT 'pending',
  -- status：pending / running / completed / failed
  triggered_by    VARCHAR(20),
  -- triggered_by：manual / api / schedule
  logs            JSONB,
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: agent_tasks（多代理任務協作）

```sql
CREATE TABLE agent_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
  agent           VARCHAR(50),
  -- agent：claude / windsurf / cursor / script / manus
  task_type       VARCHAR(50),
  -- task_type：analysis / generation / execution / review
  input           JSONB,
  output          JSONB,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Layer 7：Monetization（商業化閉環）

### Table: subscriptions（BrandOS SaaS 訂閱）

```sql
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  plan            VARCHAR(50) NOT NULL,
  -- plan：starter / growth / enterprise
  status          VARCHAR(50) DEFAULT 'active',
  started_at      TIMESTAMP NOT NULL,
  expires_at      TIMESTAMP,
  mrr             DECIMAL(10,2),                   -- 月經常性收入（USD）
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: orders（專案訂單）

```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  product         VARCHAR(50),
  -- product：audit / optimization / esg_report / geo_strategy
  price           DECIMAL(10,2),
  payment_status  VARCHAR(20) DEFAULT 'pending',
  -- payment_status：pending / paid / failed
  delivery_status VARCHAR(20) DEFAULT 'pending',
  -- delivery_status：pending / in_progress / delivered
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: leads（銷售線索）

```sql
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255),
  company         VARCHAR(255),
  email           VARCHAR(255),
  source          VARCHAR(50),
  -- source：linkedin / inbound / referral / bloomberg / event
  status          VARCHAR(50) DEFAULT 'new',
  -- status：new / contacted / qualified / converted / lost
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table: brand_projects（BrandOS 八階段進度追蹤）

```sql
CREATE TABLE brand_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  stage           INTEGER CHECK (stage BETWEEN 1 AND 8),
  -- Stage 1: 品牌診斷 Brand Audit
  -- Stage 2: 品牌定位 Brand Positioning
  -- Stage 3: 視覺識別 Visual Identity
  -- Stage 4: 敘事系統 Narrative System
  -- Stage 5: GEO 優化 GEO Optimization
  -- Stage 6: ESG 整合 ESG Integration
  -- Stage 7: 數位資產 Digital Assets
  -- Stage 8: 品牌治理 Brand Governance
  status          VARCHAR(50) DEFAULT 'in_progress',
  deliverables    JSONB,
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 系統關聯圖

```
brands (1) ──────────────────── (N) brand_scores
brands (1) ──────────────────── (1) esg_profiles
brands (1) ──────────────────── (N) visibility_results
brands (1) ──────────────────── (N) brand_projects
brands (1) ──────────────────── (N) subscriptions
brands (1) ──────────────────── (N) knowledge_nodes
brands (1) ──────────────────── (N) geo_content

ai_queries (1) ─────────────── (N) ai_responses
ai_responses (1) ───────────── (1) visibility_results
visibility_results (N) ─────── (1) visibility_reports (aggregated)
visibility_reports (1) ─────── (N) feedback_loops

workflow_runs (1) ──────────── (N) agent_tasks
```

---

## 索引建議

```sql
-- Brand 查詢優化
CREATE INDEX idx_brands_status ON brands(status);
CREATE INDEX idx_brands_industry ON brands(industry);
CREATE INDEX idx_brands_domain ON brands(domain);

-- GEO Visibility 查詢優化
CREATE INDEX idx_visibility_results_brand ON visibility_results(brand_id);
CREATE INDEX idx_visibility_results_mentioned ON visibility_results(mentioned, rank_position);
CREATE INDEX idx_ai_responses_model ON ai_responses(model);

-- ESG 查詢優化
CREATE INDEX idx_esg_profiles_brand_year ON esg_profiles(brand_id, report_year);
CREATE INDEX idx_esg_events_type ON esg_events(brand_id, type);

-- Knowledge 全文搜尋
CREATE INDEX idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_tags ON knowledge_nodes USING GIN(tags);
CREATE INDEX idx_geo_content_queries ON geo_content USING GIN(target_queries);

-- Automation 監控
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status, workflow_type);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status, agent);
```

---

## 設計原則（Design Principles）

1. 所有模組保持可獨立擴展（Keep schemas modular and extensible）
2. 所有輸出必須可追溯到輸入（All outputs must be traceable to inputs）
3. 每個模組必須支援自動化（Every module must support automation）
4. 數據必須可重用於 AI 訓練（Data must be reusable for AI training）
5. 商業化是一級模組，不是附加功能（Monetization is a first-class layer）
6. 敏感客戶資料不進 repo，用環境變數管理

---

## 未來擴展（Future Extensions）

- Real-time AI monitoring API（即時 AI 監控 API）
- Brand ranking index — global（全球品牌排名指數）
- ESG + AI combined scoring system（ESG × GEO 綜合評分）
- Autonomous optimization agents（自主優化代理）
- Bloomberg data feed integration（Bloomberg 數據接口整合）
- TNFD Nature-positive certification tracking（TNFD 自然正向認證追蹤）

---

## 版本紀錄

| 版本 | 日期 | 變更說明 |
|------|------|----------|
| v1.0 | 2026-04-17 | 初始版本，建立三層架構 |
| v2.0 | 2026-04-17 | Merge ai-infrastructure-protocol：新增 GEO Visibility、ESG Events、AI Training、Automation、Monetization 四層，形成完整七層架構 |
