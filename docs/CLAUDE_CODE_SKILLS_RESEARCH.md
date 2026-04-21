# Claude Code Skills 研究 Pipeline（YouTube → NotebookLM）

## WHY

市面上「Claude Code skills 深度用法」的最新知識主要存在 YouTube，且迭代很快。手動逐支看耗時，跨影片交叉比對更難。這條 pipeline 做的事：

```
curated YouTube 清單
        │
        ├─ yt-dlp 抓 metadata + 英文字幕
        │
        └─ notebooklm-py CLI
              ├─ 建/開同名 notebook
              ├─ 把每支 YouTube URL 丟進去當 source
              ├─ 用固定 prompt 問 NotebookLM 跨來源萃取
              └─ generate mind map + infographic，下載回本機
                      │
                      ▼
              outputs/notebooklm-research/
                  └─ report.md（所有產物索引）
```

產出即你自己的 **Claude Code skills 知識圖譜**，每季重跑一次更新。

## 為什麼用這兩個 repo

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — YouTube 端的 de-facto CLI，字幕+metadata 不下載影片本體
- [notebooklm-py](https://github.com/teng-lin/notebooklm-py) — NotebookLM 的非官方 CLI / SDK。**是第三方 browser automation**，用你自己的 Google 帳號 session（無官方 API），請評估風險後再用

## 風險與限制（務必先看）

| 風險 | 說明 | 緩解 |
|------|------|------|
| 非官方 NotebookLM API | Google UI 一變可能斷 | pin 函式庫版本；失敗就升級 |
| Google 帳號自動化 | 頻繁呼叫有機會被判可疑活動 | 用測試 Google 帳號，不要用主要帳號；低頻跑 |
| Playwright 需要桌面環境 | headless server 無法互動登入 | 只在本機 Windows / Mac 跑 |
| YouTube auto-caption 會 rate-limit | 有影片抓不到字幕 | pipeline 會跳過，靠 NotebookLM 從標題/描述擷取 |
| Infographic 樣式不是「手繪藍圖」 | NotebookLM 產的是自家風格 | 把 `analysis.md` 餵給其他圖像工具重製 |

若這些讓你不放心 → 跳到最底「替代方案」段。

## 一次性設定

**Python 3.10 ~ 3.14。** 在 BrandOS-Infrastructure repo 根目錄：

```bash
python -m pip install -U yt-dlp
python -m pip install -U "notebooklm-py[browser]"
python -m playwright install chromium
notebooklm login
```

`notebooklm login` 會開瀏覽器，登入你的 Google 帳號（建議用測試帳號，不用你主要 Gmail），登完後 session 存在本機 `~/.notebooklm/`，之後 CLI 都用這個。

## 跑 pipeline

```bash
python scripts/notebooklm_research.py \
    --seed data/claude_code_skills_seed.txt \
    --notebook "Claude Code Skills Landscape 2026" \
    --out outputs/notebooklm-research
```

預估時間：10 支影片 × 約 1 分鐘 = **10–15 分鐘**。 mind map / infographic 產出是 NotebookLM 非同步 job，CLI 會 `--wait`。

### 重跑

- 新增影片 → 編輯 `data/claude_code_skills_seed.txt` 加一行 URL，重跑即可（已抓過的會跳過）
- 換分析角度 → 編輯 `scripts/notebooklm_research.py` 裡的 `ANALYSIS_PROMPT`，刪掉 `outputs/notebooklm-research/notebooklm/analysis.md` 重跑
- 每季更新 → 把舊 outputs 檔案 tar 起來 archive，清空 `outputs/notebooklm-research/`，重跑

## 輸出

```
outputs/notebooklm-research/
  ├─ report.md                       # 入口：索引 + 注意事項
  ├─ youtube/
  │    ├─ KjEFy5wjFQg.info.json      # yt-dlp metadata per video
  │    └─ KjEFy5wjFQg.en.vtt         # 英文字幕（若抓到）
  └─ notebooklm/
       ├─ analysis.md                # 結構化 Markdown 報告（**主要產出**）
       ├─ mind-map.png
       ├─ infographic.png
       └─ raw-response.json
```

**主要產出是 `analysis.md`**。圖片是加分項。

## `analysis.md` 的五段結構

NotebookLM 被要求按下列順序輸出（prompt 內容在 `scripts/notebooklm_research.py` 的 `ANALYSIS_PROMPT`）：

1. 最有價值的 10 個 Claude Code skills，排序：實用性 × 覆蓋度
2. 影片間的共識 vs 分歧
3. 新手 / 進階 / 團隊 三種使用情境的 skill 組合
4. 被多數影片忽略但實際關鍵的盲點
5. 0 → 100 的學習路徑

每段每句要求引用來源。

## 初始種子清單（2026-04-21 curated）

10 支，見 `data/claude_code_skills_seed.txt`。選擇邏輯：

- **直球**：標題含「Claude Code Skills / Claude Skills」（5 支）
- **工作流**：skills 怎麼組合使用（4 支）
- **脈絡**：作為對照的整體教學（1 支）

跑完若發現哪支品質低 → 在 seed 檔刪掉那行，下次重跑就乾淨了。

## 替代方案：不用 notebooklm-py

若不想引入第三方 NotebookLM 自動化，以下路徑同樣能達到 70% 效果：

1. `python scripts/notebooklm_research.py --seed ... --out ...` **跑到第 1 步 yt-dlp 完成就停**（自己改 script，或手動只跑 yt-dlp 部分）
2. 打開 NotebookLM 網頁，New Notebook，手動把清單裡 10 個 URL 一個一個貼進 Source
3. 把 `scripts/notebooklm_research.py` 裡 `ANALYSIS_PROMPT` 整段複製，貼進 NotebookLM 的 chat
4. NotebookLM 網頁介面下面有 **Mind Map** 與 **Infographic** 按鈕，手動點生成
5. 下載 PNG，手動放進 `outputs/notebooklm-research/notebooklm/`

這條路 15 分鐘內手動完成，沒有「自動化」但也**沒有非官方 library 的風險**。對我自己第一次跑，建議先走這條驗證產出值不值得再自動化。

## Follow-up：連進 BrandOS 的 knowledge_nodes

`analysis.md` 產出來之後，依 CLAUDE.md §四-3（AI Knowledge layer）把它轉成 `knowledge_nodes` 節點：

```
節點類型：[GEO策略]（Claude Code skills 是內部 AI 工作流的 GEO 實踐）
關聯品牌：[Symcio]
核心洞察：[從 analysis.md §1 top-10 挑 2-3 條]
行動建議：[從 analysis.md §3 「團隊」情境的 skill 組合]
建立日期：YYYY-MM-DD
```

這樣每次重跑 pipeline，知識資產會跨 session 累積，而不是重複造輪子。
