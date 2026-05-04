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

## 3. Vercel Cold Start ~600ms — **#1 mitigation 已上線（2026-05-03）**

**背景**

`apps/orchestrator/` 部署在 Vercel Serverless Functions，cold start
約 600ms。對首次請求或低流量時段體感明顯。

**進度**：

- ✅ **Keep-warm cron**（已實裝）— `.github/workflows/keep-warm-orchestrator.yml`
  每 5 分鐘 ping 一次 `/api/healthz`，台灣活躍時段（06:00–22:59
  GMT+8）保溫，免費 tier 內運作。順帶當 uptime monitor — 若 endpoint
  5xx / 4xx，PR #53 的 Cron Failure Alert 會自動開 issue。
- ⬜ **Vercel Pro plan**（$20/月起）— Fluid Compute 能大幅降低 cold
  start，等月活上來再評估。
- ⬜ **搬 Railway / Fly.io**（$5/月起）— 常駐 instance，cold start
  消失，但要重寫部署 + DEPLOY.md。

**升級到付費方案的觸發訊號**：

- [ ] 客戶反映 dashboard 第一次開很慢（已聽到 ≥ 3 次）
- [ ] 日活 > 1K（cold start 機率變高）
- [ ] 上付費客戶（SLA 敏感度上升）
- [ ] Keep-warm cron 月用量逼近 GitHub Actions free tier 上限

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

## 6. `gpu-ai-workflow/` 去留 — **未決定**

**背景**

`gpu-ai-workflow/` 有完整 README + Dockerfile + Python 後端骨架，但
**0 部署、0 GitHub Actions、0 流量**。是 inactive 的 model inference
scaffold。

**結論：未決定，看 6 個月內是否接客戶用。**

- 若 6 個月內**不會**用 → 跟著 `private/archived/` 的 pattern 移過去
- 若**會**用 → 列入 backlog 補 CI/CD + DEPLOY 文件

擇日決定即可。

---

## 7. `apps/symcio-brand-audit/` Netlify URL 待釐清

**背景**

靜態 HTML 站（index/pricing/report）+ `netlify.toml`，**部署 URL 不明**
（需要看 Netlify dashboard）。功能可能與 orchestrator dashboard 重疊。

**待辦**：

- [ ] 查 Netlify dashboard 拿到實際 URL
- [ ] 評估是否仍在用 / 流量多少
- [ ] 決定保留獨立 OR 併進 orchestrator OR archive

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
