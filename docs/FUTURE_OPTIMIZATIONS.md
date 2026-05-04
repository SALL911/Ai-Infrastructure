# 後續優化與延後決策

這份文件記錄**已分析過、有結論、但暫時不執行**的工程決策，避免未來
的自己（或新加入的工程師、Claude session）重新踩相同思路。

每條決策都包含：背景、結論、什麼訊號出現時應該重新評估。

---

## 1. 後端遷移 Rust — **暫緩，不早於 18–24 個月**

**背景（2026-05-03 評估）**

當時討論：是否把 `apps/orchestrator/artifacts/api-server/` 從
TypeScript / Express 5 遷移到 Rust（axum / actix-web）。

**結論：不遷移。**

主要理由：

1. **TypeScript-first 共享型別會被砍掉** — 目前 `OpenAPI → Orval
   codegen → Zod schemas / React Query hooks / Drizzle schema` 是前
   後端共用一份 type 的核心優勢。換 Rust 等於砍 monorepo 的主動脈。
2. **Vercel 對 Rust 是邊緣支援** — 主流路線是編成 WASM，失去 Rust
   原生優勢；要 native Rust 通常要搬離 Vercel（Railway / Fly /
   AWS Lambda），剛搞定的單一 Vercel project 架構就拆掉。
3. **痛點不需要 Rust** — 這個 session 處理的所有 production blocker
   （`Emit skipped` / SPA rewrite / cold start / funnel 沒接通 /
   cron 沒監控）沒有一個是「TypeScript 太慢」造成的。
4. **Express 5 在現流量沒熱身** — 單機 ~30,000 req/sec 等級，目前
   流量趨近零，五年內遇不到 Node 撐不住的牆。
5. **遷移成本 ≈ 季度級 feature freeze** — 對 0–10 客戶階段致命。

**重新評估的觸發訊號**（**任一**符合就回頭看）：

- [ ] 月活 > 100K，Node 已優化過仍 CPU 飽和
- [ ] 出現具體 CPU-bound 熱點（向量運算 / image processing /
      ML inference）— 此時應寫 Rust microservice 而非整體遷移
- [ ] 雇到至少 2 名有 Rust production 經驗的工程師
- [ ] 月雲端帳單 > $5K，省 50% compute 是可量化價值
- [ ] 已達 PMF，技術選型可以從「快速 ship」切換到「長期維運」優先

**真的想動 Rust 的折衷路線**：保留 TS 主後端，把 BCI 計算引擎
（`scripts/bci_engine.py`）或 GEO 引擎平行查詢改寫成 Rust
microservice。屬「研究專案」性質，不阻擋 production roadmap。

---

## 2. 自架 VPS — **不需要**

**背景**

考慮是否租 VPS（DigitalOcean / Hetzner / Linode TPE）作為 orchestrator
或 cron 的 host。

**結論：現階段不需要。**

理由：

- 整個 stack 是 SaaS / serverless（Vercel / Supabase / Cloudflare /
  GitHub Actions / Typeform / Stripe / HubSpot / Notion / Composio /
  Resend）— 零維運成本是目前最大的優勢
- 月成本 < $30（幾乎全 free tier），沒省的空間
- 9 條 cron 都跑在 GitHub Actions，6 小時 timeout 涵蓋目前所有任務
- 沒有資料地理在地化合約義務

**該重新考慮的觸發訊號**：

- [ ] 月活 > 10K，Vercel 帳單 > $50 → 搬 Railway / Fly（PaaS，**還是不算 VPS**）
- [ ] 要跑 GPU 推論 / 自訓 LLM → 短期 GPU rental（Lambda Labs / RunPod），長期才考慮 VPS+GPU
- [ ] 客戶要求資料不出台灣 → 中華電信 / Linode TPE 機房
- [ ] 要跑常駐 long-running daemon（cron 不夠）→ 小 VPS $5/月
- [ ] 想自架 Postgres / Redis 取代 Supabase → 不建議，省的錢遠不抵維運時間

---

## 3. Vercel Cold Start ~600ms — **接受，先不處理**

**背景**

`apps/orchestrator/` 部署在 Vercel Serverless Functions，cold start
約 600ms。對首次請求或低流量時段體感明顯。

**結論：先接受，等真有客戶反饋再處理。**

可選方案（按成本由低到高）：

1. **Keep-warm cron**（免費）— 每 5 分鐘 ping `/api/healthz`，把
   instance 保溫。GitHub Actions 加一條 cron 即可。
2. **Vercel Pro plan**（$20/月起）— 有 "Fluid Compute"，能大幅降低
   cold start，且其他功能都升級。
3. **搬 Railway / Fly.io**（$5/月起）— 常駐 instance，cold start
   消失，但要重寫部署 + DEPLOY.md 大改，cron 也要重新規劃。

**觸發訊號**：

- [ ] 客戶反映 dashboard 第一次開很慢（已聽到 ≥ 3 次）
- [ ] 日活 > 1K（cold start 機率變高）
- [ ] 上付費客戶（SLA 敏感度上升）

---

## 4. Lead → Audit → Stripe Funnel — **60 天內接通**

**背景**

零件全部存在但中間黏合層沒寫：

- ✅ Typeform `ZZYlfK7A` 表單 + webhook → `leads` table
- ✅ `geo-audit.yml` cron 跑 AI 引擎可見度測試
- ✅ Stripe webhook endpoint
- ✅ Resend 寄信能力
- ❌ **缺**：Typeform 提交完 → 觸發 audit → 完成後寄客製化 PDF/HTML 報告 → 報告底部嵌 Stripe checkout 按鈕

**結論：列為 60 天 P0，獨立 session 處理。**

實作切片建議（每片獨立可 ship）：

1. **Audit 完成事件 → Resend 寄報告** — geo-audit.yml 寫完
   `visibility_results` 後，新 workflow / api 抓 lead.email + Resend
   寄報告 HTML
2. **報告 HTML 加升級 CTA** — 報告底部嵌 Stripe Pricing Table 或
   `/pricing` 連結
3. **Stripe checkout 完成 → lead.status='paid'** — webhook 已存在，
   補 status 更新邏輯
4. **觀察轉換率** — 加 PostHog event 看 funnel 各段 drop-off

預估：每片 1–3 天，total 1–2 週。

---

## 5. 客戶私人 Dashboard — **60 天內 P1**

**背景**

目前 `orchestrator.symcio.tw` dashboard 是公開的全市場版（30 個台灣品
牌排行榜）。**沒有客戶登入、沒有「只看自己品牌」的視角。**

**結論：60 天內加 auth + scope filtering。**

需要做的：

- [ ] Supabase Auth 接通（`SUPABASE_AUTH_SETUP.md` 已存在 spec）
- [ ] orchestrator API 加 `requireAuth` middleware
- [ ] 路由加 `claimed_by` filter（`brands.claimed_by` 欄位已 schema 化）
- [ ] 前端加 `/dashboard/[brandId]` 路由
- [ ] Stripe subscription → 解鎖某些功能的權限邏輯（`subscriptions` table 已存在）

預估：2 週。

---

## 6. `gpu-ai-workflow/` — **已 archive（2026-05-03）**

**結論**：archive 進 `private/archived/gpu-ai-workflow/`。

確認原因：

- 0 部署、0 GitHub Actions、0 從 live code 的 import
- 三個互相競爭的子實作（`src/` Python + `backend/` Node + `brandos-backend/` Node），沒有任何一個被選為 canonical
- 真正在 production 跑的 scoring 邏輯在 `web/landing/lib/scoring.ts` 與 `scripts/bci_engine.py`，跟這份 scaffold 無關

未來真要做 GPU 推論：**不要復活這份**，而是選一個 runtime（Python OR Node，不要兩種）、一個 host（RunPod / Lambda Labs / Fly machines GPU tier），寫新的 microservice 對接 live `apps/orchestrator/` API。本資料夾可保留當 brand-scoring 數學的參考（見 `examples/brand_scoring_example.py`）。

詳見 `private/archived/README.md`。

---

## 7. `apps/symcio-brand-audit/` — **保留為 Netlify MVP 備援**

**結論**：不 archive、不 fold-in。它是有意的雙軌部署：

- **主**：`web/landing/`（Vercel 部署 → `symcio.tw`）— Next.js + Stripe + Supabase
- **備援**：`apps/symcio-brand-audit/`（Netlify 部署）— 純靜態 HTML + 客戶端 JS 計算 BCI，無 backend 依賴

證據：

- `docs/PRODUCT_OVERVIEW.md` 明文寫「🚀 Netlify 備援靜態版」「兩套 MVP 並存」
- `web/landing/lib/scoring.ts` 是 `apps/symcio-brand-audit/js/scoring-v2.js` 的 TypeScript port，所以**演算法 SSoT 在靜態版**，Vercel 主版是 port

設計意圖：當 Vercel / Supabase 任一掛掉，純靜態版仍能讓客戶完成基礎 BCI 自評。

**剩下的待辦（非阻塞）**：

- [ ] 查 Netlify dashboard 拿到實際 URL，記到 README 或 DEPLOY.md
- [ ] 確認兩版 BCI scoring 演算法版本對齊（避免 port 後 drift）

---

## 8. 第二批 stale branches 清理 — **5 月底再處理**

**背景**

GitHub branches 還有 ~23 條 `claude/*` 過期分支沒 merge 也沒 close
（如 `claude/notebooklm-research-pipeline`、`claude/posthog-ab-testing`
等）。每條可能還有未 merge 的有用 commit。

**結論：5 月底（PR #47/#48/#49/#50/#51 沉澱後）做一次 walkthrough**，
逐條看 diff 決定 merge / cherry-pick / 刪除。

GitHub repo 已開「Auto-delete head branches」，未來 merge 過的會自動
清掉，這批是歷史遺留。

---

## 9. AI 訓練層（Layer 5）+ ESG TNFD 資料 — **90 天 P3**

CLAUDE.md 七層 schema 中，L5 AI Training 與 L4 ESG/TNFD（深度資料）
目前是**空 schema 沒內容**。屬於商業化層的「護城河」訴求，但執行優先
級在 funnel 接通 + 第一批客戶之後。

預估：90 天 P3 規劃，視第一批客戶反饋決定優先順序。

---

## 文件維護

每次有新的「決策過、暫不執行」事項，就追加到這份文件。**不要**：

- 不要把純 todo / sprint-level 任務塞進來（那屬 Linear / Notion）
- 不要把已完成的事項留下歷史記錄（git log 已涵蓋）
- 不要重複 CLAUDE.md / DEPLOY.md / ARCHITECTURE.md 已說明的東西
