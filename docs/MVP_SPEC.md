# BrandOS MVP — AI Visibility + Brand Score Service

## 一、MVP 定位（WHY）

**一句話**：讓企業主花 $299 USD 看見自家品牌在 ChatGPT、Claude、Gemini、Perplexity 上的可見度排名，並拿到一份可執行的改善建議。

**為什麼會付錢**：
- 傳統 SEO 已不夠——50% 以上的 B2B 買家先問 AI、再開 Google
- 多數企業**完全不知道**自己在 AI 搜尋的表現
- Symcio 是台灣第一家把這個服務產品化、並有 Bloomberg 授權代表背書的公司

## 二、服務產品化結構

| 產品 | 價格 | 交付物 | 交付時間 |
|------|------|--------|---------|
| **Free Scan**（引流） | $0 | 1 個查詢 × 4 AI 模型的可見度快照 | 即時（< 2 min）|
| **GEO Audit**（主推） | $299 USD | 20 個查詢 × 4 模型 + 競品對比 + 改善建議 PDF | 24 小時內 |
| **GEO Optimization**（升級）| $1,999 USD | Audit + 實作優化 + 3 個月追蹤 | 30 天 |
| **Brand Score AI**（年約）| $12,000/年 | 七維評分 + 每月報告 + 季度策略會議 | 訂閱制 |

## 三、使用者旅程（Happy Path）

```
[LinkedIn/部落格/Bloomberg] 看到案例
        ↓
[Landing Page] 輸入品牌名 + email 做 Free Scan
        ↓
[GitHub Actions] 30 秒內跑完 4 個 AI 查詢
        ↓
[Email] 寄免費報告（顯示低分，引誘升級）
        ↓
[Stripe Checkout] $299 升級 GEO Audit
        ↓
[GitHub Actions] 跑深度分析（20 prompt × 4 model）
        ↓
[Supabase] 產生 visibility_reports 記錄
        ↓
[Email] 寄完整 PDF + Calendly 預約連結
        ↓
[Calendly → demo call] 介紹 Optimization / Brand Score 訂閱
```

## 四、資料流對應 Schema

| 步驟 | 對應 Table | 寫入什麼 |
|------|-----------|---------|
| 1. Landing page 送表單 | `leads` | name, company, email, source='landing' |
| 2. 建立品牌檔 | `brands` | name, domain, industry, market |
| 3. 送 prompt 給 AI | `ai_queries` + `ai_responses` | 測試內容、模型回應 |
| 4. 解析提及狀況 | `visibility_results` | mentioned, rank_position, sentiment, score |
| 5. 產生報告 | `visibility_reports` | score, summary, recommendations, PDF URL |
| 6. 升級付費 | `orders` | product='audit', price=299, payment_status |
| 7. 訂閱年約 | `subscriptions` | plan='growth', mrr=1000 |
| 8. 客戶回饋 | `feedback_loops` | user_feedback, improvement_flag |

所有 table 已在 `supabase/migrations/20260417000000_initial_schema.sql` 建好。

## 五、技術組件清單

### 已完成（此 repo）
- [x] Supabase schema migration（19 tables）
- [x] CI/CD workflow（supabase-ci.yml, supabase-deploy.yml）
- [x] Notion 知識同步（notion-sync.yml）
- [x] GEO audit cron 骨架（geo-audit.yml, scripts/geo_audit.py）

### 待建（以優先序）

**P0 — 讓 MVP 能收錢**
- [ ] Landing page（Vercel + Next.js + Tailwind，一週內）
- [ ] Free scan API 端點（Vercel Serverless，呼叫 Supabase + Gemini）
- [ ] Email 寄報告（Resend template）
- [ ] Stripe Checkout 串接

**P1 — 提升轉換**
- [ ] 客戶 dashboard（Vercel + Supabase RLS）
- [ ] PDF 報告產生（react-pdf 或 Gotenberg）
- [ ] A/B 測試 landing copy（PostHog feature flag）

**P2 — 自動化運營**
- [ ] Lead scoring agent（Claude API 讀 leads → 評分 → 優先序）
- [ ] 自動跟催信序列（Resend + n8n 或 ConvertKit）
- [ ] LinkedIn 自動 outreach（手動 + Apollo.io enrich）

**P3 — 規模化**
- [ ] Brand Score API（七維評分）
- [ ] Bloomberg data 整合
- [ ] White-label dashboard for 代理商

## 六、GEO Audit 測試設計（核心技術細節）

### 標準測試 Prompt 分類

每個客戶針對其產業跑 20 個 prompt，分 4 類各 5 題：

| 類別 | 範例（Technology 產業） |
|------|------------------------|
| `top_companies` | 「台灣最好的 GEO 優化公司有哪些？」 |
| `alternatives` | 「Symcio 的替代方案是什麼？」 |
| `problem` | 「公司想改善 AI 搜尋可見度，應該找誰？」 |
| `comparison` | 「Symcio 跟 XX 公司誰比較適合 B2B？」 |

### 四個 AI 引擎並測

| 引擎 | 免費額度 | 成本 |
|------|---------|------|
| **Gemini 1.5 Pro** | 1M token/日 | $0 |
| **Claude Haiku** | Anthropic 試用 | ~$0.001/query |
| **GPT-4o-mini** | OpenAI 試用 | ~$0.001/query |
| **Perplexity Sonar** | $5 試用 | ~$0.005/query |

單次 Audit 成本：20 prompt × 4 engine × ~$0.003/query ≈ **$0.24**
定價 $299 → **毛利率 > 99.9%**（扣掉 Stripe 手續費 + 人工審核）

### 評分邏輯（寫入 `visibility_results`）

```
score = (mentioned ? 50 : 0)
      + (rank_position ? max(0, 50 - rank*5) : 0)
      + (sentiment == 'positive' ? 20 : sentiment == 'negative' ? -20 : 0)
competitors_count 用於後續 radar chart 比較
```

綜合報告分數（寫入 `visibility_reports`）：
- 20 個 query 的 `score` 平均
- 以百分位對照產業基準（前期先用 hardcode 基準，累積 50 個客戶後改 dynamic）

## 七、上線前必做的 10 件事（排序）

1. Supabase project 建立 + migration 推上
2. Google AI Studio 拿免費 Gemini API key
3. Landing page 上線（可用 Vercel + Tailwind template）
4. 定義 20 個 prompt（按產業分類），存 `docs/prompts/`
5. geo-audit.yml 跑通第一個客戶
6. Resend 寄出第一封報告信（給自己）
7. Stripe 開立帳號 + $299 product
8. 自己跑一次 Audit → 用自己 Symcio 品牌驗證流程
9. 寫 3 篇 Bloomberg 授權代表視角的 GEO 內容（LinkedIn）
10. 發佈 + 找前 10 個測試客戶（免費換案例）

## 八、KPI（第一個月目標）

| 指標 | 目標 |
|------|------|
| Free scan 使用者 | 100 |
| Email 開啟率 | > 40% |
| Free → $299 轉換率 | > 3%（= 3 筆收入 $897）|
| $299 → $1,999 upsell | > 20% |
| 首月營收 | $1,500 USD |
| 首月成本 | < $50 USD（都在免費額度內）|

## 九、延伸閱讀

- `docs/ARCHITECTURE.md` — 系統架構
- `docs/FREE_STACK.md` — 免費平台建議
- `docs/MORNING_CHECKLIST.md` — 執行檢查清單
- `database/schema.md` — 資料模型細節
