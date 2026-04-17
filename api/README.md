# API Layer — BrandOS Infrastructure

## 用途

此目錄存放 BrandOS Infrastructure 的 API 規格、接口文件與端點定義。

## 規劃中的 API 模組

### GEO Visibility API
- `POST /api/v1/query` — 提交 AI 可見度測試 Prompt
- `GET /api/v1/visibility/{brand_id}` — 取得品牌 GEO 分數
- `GET /api/v1/reports/{brand_id}` — 取得最新可見度報告

### Brand Score API
- `GET /api/v1/brands/{id}/score` — 取得七維 Brand Score
- `POST /api/v1/brands/{id}/score/refresh` — 觸發重新評分

### ESG API
- `GET /api/v1/esg/{brand_id}` — 取得 ESG Profile
- `POST /api/v1/esg/{brand_id}/events` — 新增 ESG 事件

### Bloomberg Integration
- `GET /api/v1/bloomberg/{ticker}` — 取得 Bloomberg 品牌數據

## 技術棧
- Framework：FastAPI（Python）或 Next.js API Routes
- Auth：API Key + JWT
- Rate Limit：1000 req/day（Starter），無限制（Enterprise）

## 待完成
- [ ] OpenAPI spec (swagger.yaml)
- [ ] Authentication middleware
- [ ] Rate limiting logic
- [ ] Bloomberg data connector
