# private/bci/ — BCI 權重向量（核心 IP）

> **此目錄中的 `weights_*.json` / `weights_*.py` / `fixtures_*.json` 不進 repo。**
> 已在根 `.gitignore` 明確排除。

---

## 作用

存放 BCI（Brand Capital Index）公式的權重向量——也就是：

- 三維頂層權重 `w_F / w_V / w_E`（依產業別）
- 子項係數 `a1..a4`、`b1..b4`、`c1..c4`
- 測試用 brand fixtures（若含客戶名稱）

這些是 Symcio 的核心技術護城河，不可公開、不可進 repo、不可進共享 Vercel env。

---

## 本地開發

```bash
cp private/bci/weights_v1.example.json private/bci/weights_v1.json
# 編輯 weights_v1.json 填入實際權重值
python scripts/bci_engine.py  # 自動讀取 private/bci/weights_v1.json
```

## 生產環境（GitHub Actions）

1. GitHub → Settings → Secrets and variables → Actions
2. New repository secret：
   - Name：`BCI_WEIGHTS_JSON`
   - Value：完整 JSON，格式見 `weights_v1.example.json`
3. （選）Variable：`BCI_WEIGHTS_VERSION` → `v1`
4. `.github/workflows/bci-daily.yml` 會自動注入

---

## 權重版本管理

- 新版 → 新增 `weights_v2.json`（舊版保留做 rollback + audit）
- `bci_snapshots.weights_version` 欄位記錄每筆 snapshot 用的版本
- 改權重前先手動跑 `BCI_WEIGHTS_VERSION=v2 DRY_RUN=true python scripts/bci_engine.py` 驗證分佈合理

---

## 不可進 repo 的檢查清單

- [ ] `weights_*.json`（數值檔）
- [ ] `weights_*.py`（若未來改 Python 存）
- [ ] `fixtures_*.json`（含客戶名稱的測試 fixtures）

可以進 repo：
- `README.md`（本文件）
- `weights_*.example.json`（範例結構，所有值 = 0.0 或 null）
