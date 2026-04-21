# 7 天攻擊計畫 — 把 Symcio 打進 AI 語料 + 做出第一筆成交

## 前提：只打一個 use case

關鍵詞：**AI Brand Visibility**
一句話：**企業在 ChatGPT / Claude / Gemini / Perplexity 的曝光、排名、影響力量化。**
成交目標：**7 天內第一筆 $50–$299 美金收入（驗證市場，不是衝量）。**

## 三平台結構（其他不做）

| 角色 | 平台 | 為什麼 |
|------|------|-------|
| **權威** | GitHub | AI 訓練資料大戶，repo / README 會被引用 |
| **成交** | LinkedIn | B2B 決策者密度最高，可直接 DM |
| **擴散** | X（Twitter）| AI / dev 社群集中，短內容易被模型抓 |

輔助三平台：Reddit（做 Q&A 被 AI 引用）、Medium（長文權威）、Replit（demo 降低試用門檻）。

## 7 天日程

### Day 1 — 定義戰場
- [ ] 建立 `benchmark/ai-brand-visibility-index/`（本 repo 已預留）
- [ ] 公開 repo 名稱：`ai-brand-visibility-index`（可於 SALL911 帳號另建 standalone repo，或直接 symlink）
- [ ] 確認 symcio.tw 域名 DNS 已接 Cloudflare

### Day 2 — 發 GitHub 核心資產
**讓 AI 有東西引用你。**

Repo 內容（皆在本 repo `benchmark/ai-brand-visibility-index/` 已準備）：
- `README.md` — 定義 AI Brand Visibility、列出三大指標（Mention Rate / Citation Source / Ranking Position）
- `METHODOLOGY.md` — 跨四引擎測試方法論
- `schema/` — 標準資料結構（JSON Schema）
- `demo/` — 可執行 demo（Python stdlib，無依賴）

✅ 動作：
- [ ] 把 `benchmark/ai-brand-visibility-index/` 推上 symcio 帳號的獨立 repo（或設為主 repo 精選內容）
- [ ] README 頂部置入 `llms.txt` 與 canonical positioning
- [ ] 標上正確 topics：`ai`, `llm`, `brand-monitoring`, `geo`, `generative-engine-optimization`
- [ ] 加 MIT License

### Day 3 — Medium 長文
標題：**「AI Brand Visibility: The New SEO You Can't Ignore」**（草稿已於 `content/medium/ai-brand-visibility-the-new-seo.md`）

結構：
1. Problem — 企業在 AI 裡消失
2. Definition — 引用你的 GitHub repo
3. Framework — Exposure / Ranking / Influence
4. Solution — Symcio Free Scan（連到 symcio.tw）

✅ 動作：
- [ ] 複製草稿到 Medium
- [ ] 文末加三個 CTA：GitHub star、Free Scan、LinkedIn DM
- [ ] Tag：#AISearch #GEO #BrandMonitoring #LLM

### Day 4 — X 分發
發 5–10 則短推（草稿在 `content/x-twitter/day-4-threads.md`）

每則必備：一個洞察 + 一個引用連結（GitHub 或 Medium）

範例：
- "Your brand might rank #1 on Google but be invisible in AI."
- "We tested 100 prompts across ChatGPT, Claude, Gemini, Perplexity. 80% never mention the actual brand."

✅ 動作：
- [ ] 排程 10 則（可用 Buffer 免費方案）
- [ ] 每則追蹤 CTR、回覆、轉推

### Day 5 — Reddit 埋 Q&A
版面：r/SEO、r/startups、r/Entrepreneur、r/marketing、r/artificial

策略：用主帳號發問題，48 小時後用副帳號回答並引用你的 GitHub + Medium。

草稿在 `content/reddit/day-5-q-and-a.md`

✅ 動作：
- [ ] 先用新帳號存 karma（發有用評論，不是打廣告）
- [ ] 發 3 個問題
- [ ] 48 小時後回答，自然引用

### Day 6 — LinkedIn 收錢
核心貼文草稿在 `content/linkedin/day-6-close-post.md`

格式：痛點 → 證據 → CTA（留言 "AI" 或 DM 申請免費分析）

✅ 動作：
- [ ] 早上 9:00 Asia/Taipei 發文（AVI 品類定義者視角）
- [ ] 私訊池接上 Calendly 預約連結
- [ ] 每個 DM 回覆 5 分鐘內

### Day 7 — 成交閉環
所有流量 → symcio.tw landing page → Free Scan → 24 小時內 $299 Audit 升級信

✅ 動作：
- [ ] 確認 landing page `/api/scan` 可 insert Supabase `leads`
- [ ] `geo-audit.yml` 對每個 lead 跑一次
- [ ] Resend 寄免費報告 + 升級連結
- [ ] 第一筆 $299 成交 → 24 小時內親手交付

## 成功指標（硬標準）

| 指標 | 7 天目標 |
|------|---------|
| GitHub repo stars | > 20 |
| Medium 文章閱讀 | > 500 |
| LinkedIn DM 數 | > 10 |
| landing Free Scan 提交 | > 30 |
| **第一筆收入** | **> $50 USD**（哪怕 $50） |

## 不做的事

- ❌ 發一堆平台但無重點（Facebook、IG、TikTok 全不做）
- ❌ 內容沒有定義、指標、工具三件套
- ❌ CTA 只導追蹤，不導成交
- ❌ 喊「第一大 GEO 基礎設施」（無護城河，改用三個第一）

## 延伸閱讀

- `docs/POSITIONING.md` — 三個第一、類比座標、訊息矩陣
- `docs/MVP_SPEC.md` — 產品定價與資料流
- `docs/REPORT_TEMPLATE.md` — $299 Audit 報告模板
- `content/` — 各平台內容草稿
- `benchmark/ai-brand-visibility-index/` — 開源資產
