# Symcio 對外內容索引

這個資料夾是所有對外發表內容的中央倉庫。發布流程與檔案位置一次看清。

---

## 發布準備狀態（即可複製貼上）

### 🟢 Ready — BCI 發布套件

**主文章（Medium，~2000 字繁中 + English summary）**
📄 `content/medium/bci-the-ai-era-brand-capital-index.md`

**LinkedIn 主貼文（中文 + English comment）**
📄 `content/linkedin/bci-launch-post.md`

發布順序：
1. Medium 先發 → 拿到 canonical URL
2. 編輯 LinkedIn 檔案，把 URL 填進主貼文底部「完整文章（Medium）」
3. LinkedIn 發中文版主貼文
4. 首條留言貼 English version
5. 每條留言用 Symcio audit 的實測數據回覆（轉換動能）

---

### 🟢 Ready — AI Brand Visibility 通用啟蒙套件

早期建立類別認知用，BCI 主軸外的「category education」。

**Medium**：`content/medium/ai-brand-visibility-the-new-seo.md`
**LinkedIn 成交貼**：`content/linkedin/day-6-close-post.md`
**Reddit Q&A**：`content/reddit/day-5-q-and-a.md`
**Twitter/X 串**：`content/x-twitter/day-4-threads.md`

---

### 🟢 Ready — 冷信 templates（6 個 persona）

**絕對不接批量自動化**（見 `content/cold-outreach/README.md` 的法律章節）。
每天最多 5–20 封人工個人化。

| 檔案 | 對象 |
|------|------|
| `01-interbrand-cmo.md` | InterBrand 100 CMO |
| `02-kantar-cmo.md` | Kantar BrandZ CMO |
| `03-agency-partner.md` | InterBrand / Landor / Wolff Olins 本身 |
| `04-investor-pe-vc.md` | 消費品 / 品牌資產 PE-VC |
| `05-esg-audit-firm.md` | Big 4 / SGS / DNV / MSCI ESG |
| `06-saas-peer.md` | Brandwatch / Similarweb / HubSpot / Salesforce |

每個 template 最後都有「勾選清單」和「個人化研究來源」。

---

## 快速發布指令

### Medium 發布流程

1. 開啟 `content/medium/bci-the-ai-era-brand-capital-index.md`
2. 複製 `---` 下方所有內容（跳過 YAML front matter）
3. 到 [Medium new story](https://medium.com/new-story)
4. 貼上（Medium 會自動解析 markdown heading / bold / italic / code blocks / tables）
5. **Title** 手動填：「BCI：AI 時代的品牌資產量化座標系」
6. **Tags**（Medium 限 5）：`AI`, `Branding`, `InterBrand`, `ESG`, `GEO`
7. Canonical URL（可選）：`https://symcio.tw/blog/bci-brand-capital-index`
8. Publish → Copy article link

### LinkedIn 發布流程（4 步）

1. 開啟 `content/linkedin/bci-launch-post.md`
2. 找到 `## 主貼文（中文，複製貼上）` 區塊
3. 把「（文章上線後補連結）」替換成剛拿到的 Medium URL
4. 複製該區塊內容，貼到 LinkedIn 撰寫框
5. 選「發佈給所有人」→ Post
6. 發完後：開啟「English version」區塊，複製貼為第一條留言

### 連續發文節奏（建議兩週）

| 日 | 動作 |
|---|------|
| Day 0 | Medium 上線 BCI 主文 |
| Day 0 (+2h) | LinkedIn BCI launch 主貼文 |
| Day 1 | Reddit r/marketing + r/ESG_investing 各一篇短版 |
| Day 2 | Twitter/X 5-tweet 串（用 day-4-threads.md 為基） |
| Day 3 | 第一輪冷信寄送（InterBrand 100 CMO × 10 封） |
| Day 4 | LinkedIn 第二貼（回應首日互動熱點）|
| Day 5 | Kantar + 消費品 CMO × 10 封 |
| Day 6 | Agency × 5 封 + LinkedIn 成交貼（day-6-close-post）|
| Day 7 | 總結貼：「第一週數據」+ 附自己跑過的品牌 audit 範例 |
| Day 8–14 | 每日 5–10 封個人化冷信（6 個 persona 輪流）|

---

## 自動化腳本

### 快速複製 Medium 正文到剪貼簿（macOS）

```bash
# 只複製 "---" 第二個分隔之後的內容
awk 'BEGIN{c=0} /^---/{c++; next} c>=2' content/medium/bci-the-ai-era-brand-capital-index.md | pbcopy

echo "已複製 Medium 正文到剪貼簿 — 直接到 Medium new story 貼上"
```

### 快速複製 LinkedIn 主貼文

```bash
# 擷取 "## 主貼文（中文" 到下一個 "##" 之間的內容
awk '/^## 主貼文（中文/,/^## English version/' content/linkedin/bci-launch-post.md \
  | head -n -1 \
  | tail -n +4 \
  | pbcopy

echo "已複製 LinkedIn 主貼文（中文）到剪貼簿"
```

### Symcio audit 跑對方品牌的數據當 hook

每封冷信寄之前，先跑：

```bash
BRAND_NAME="[對方品牌名]" \
BRAND_INDUSTRY="[對方產業]" \
GEMINI_API_KEY=你的 \
python scripts/geo_audit.py

# 產出在 reports/geo-audit/[brand]-[date].json
# 取 avg_score + mention_rate_pct 當冷信第一段 hook
```

---

## 指標追蹤（每週回顧）

- Medium：Views / Read Ratio / Follows / Applause
- LinkedIn：Impressions / Reactions / Comments / Profile views / Free-audit CTR
- Reddit：Upvote ratio / Awards / Comments
- 冷信：Open rate / Reply rate / Meeting-booked rate / Closed deals

所有指標寫進 `private/metrics/publishing-log.md`（此檔不進 repo）。

---

## 給未來自己的提醒

- 🔴 **絕不**群發冷信 — 網域信譽一次就毀
- 🔴 **絕不**宣稱 Bloomberg / InterBrand / Kantar 合作 — 全部 nominative fair use
- 🟢 每封冷信前花 10–15 分鐘個人化（本文、受件人 LinkedIn、近期新聞）
- 🟢 發文後 24 小時內主動回應**每一則留言**（名人效應雪球）
- 🟢 LinkedIn / Medium / Twitter 同一主題換三種寫法，不要原封轉貼
