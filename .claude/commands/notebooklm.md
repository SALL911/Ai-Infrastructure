---
description: 把 Symcio 知識來源同步進 NotebookLM（官網 + 研究站 + repo 內 SSoT 檔）
argument-hint: "[notebook 名稱，預設 'Symcio Brand Knowledge Base'] [可選：要問的問題]"
allowed-tools: Bash(python scripts/notebooklm_sync.py:*), Read
---

# /notebooklm — 同步 Symcio 到 NotebookLM

把 `data/symcio_notebooklm_seed.txt` 列出的所有 source（Symcio 官網、研究站、
GitHub repo、以及 repo 內的 `docs/SYMCIO_KNOWLEDGE_BASE.md` 等 SSoT 檔）
冪等地灌進一個 NotebookLM notebook，讓 Symcio 品牌知識能跨 session 持續累積。

## 前置（使用者本機一次性，沙箱/CI 無法跑）

NotebookLM **沒有官方 API**。本指令底層走第三方 unofficial `notebooklm-py`
CLI — 是 browser automation，登入**你自己的 Google 帳號**（建議用測試帳號）。
只能在有桌面的本機（Mac / Windows）執行。

```bash
python -m pip install -U "notebooklm-py[browser]"
python -m playwright install chromium
notebooklm login        # 開瀏覽器登入 Google；session 存在本機 ~/.notebooklm/
```

風險與替代方案（手動貼 source）見 `docs/CLAUDE_CODE_SKILLS_RESEARCH.md`。

## 執行

參數 `$ARGUMENTS`：第 1 段為 notebook 名稱（含空白請用引號；省略則用預設），
其後若還有文字，視為要丟給 NotebookLM 的問題。

1. 先確認本機已 `notebooklm login`（跑 `notebooklm list` 不報錯即可）。
2. 跑同步腳本：

   ```bash
   # 只同步來源：
   python scripts/notebooklm_sync.py \
       --seed data/symcio_notebooklm_seed.txt \
       --notebook "Symcio Brand Knowledge Base"

   # 同步並問一題（存到 outputs/notebooklm-symcio/answer.md）：
   python scripts/notebooklm_sync.py \
       --seed data/symcio_notebooklm_seed.txt \
       --notebook "Symcio Brand Knowledge Base" \
       --ask "用繁中總結 Symcio 的 BCI 方法論與三個第一定位，每點引用來源。" \
       --out outputs/notebooklm-symcio
   ```

3. 回報：同步了幾個 source、notebook 名稱；若有 `--ask`，附上 `answer.md` 摘要。

## 新增 / 更新來源

- 加一個 source → 編輯 `data/symcio_notebooklm_seed.txt` 加一行（網址或
  repo 相對路徑），重跑本指令。NotebookLM 對重複 URL 會去重。
- Symcio 事實有變 → **先改上游 SSoT**（`llms.txt` / `README.md` /
  `docs/POSITIONING.md`），再回灌 `docs/SYMCIO_KNOWLEDGE_BASE.md`，最後重跑同步。

## 相關檔案

| 檔案 | 角色 |
|------|------|
| `data/symcio_notebooklm_seed.txt` | source 清單（網址 + 本機檔案） |
| `docs/SYMCIO_KNOWLEDGE_BASE.md` | 彙整版知識底座（主 source） |
| `scripts/notebooklm_sync.py` | 通用同步器（URL + 檔案） |
| `scripts/notebooklm_research.py` | YouTube 專用 pipeline（既有，另一用途） |
