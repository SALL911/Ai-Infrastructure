# 版控審查提交工作流

## 🔄 Git 分支策略

### 分支架構
```
main                 # 生產環境穩定版本
├── develop         # 開發環境整合版本
├── feature/gpu-detection    # 功能開發分支
├── feature/model-loader    # 功能開發分支
├── feature/workflow-engine # 功能開發分支
├── hotfix/critical-bug      # 緊急修復分支
└── release/v1.0.0          # 發布準備分支
```

### 分支命名規範
- **feature/***: 新功能開發
- **bugfix/***: 一般錯誤修復
- **hotfix/***: 緊急生產問題修復
- **release/***: 發布準備分支
- **docs/***: 文檔更新

## 📋 提交規範

### Commit Message 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 類型
- **feat**: 新功能
- **fix**: 錯誤修復
- **docs**: 文檔更新
- **style**: 程式碼格式化
- **refactor**: 程式碼重構
- **test**: 測試相關
- **chore**: 建構過程或輔助工具的變動
- **perf**: 效能優化
- **ci**: CI 配置檔案和腳本的變動

#### Scope 範圍
- **gpu**: GPU 偵測相關
- **model**: AI 模型相關
- **workflow**: 工作流程相關
- **api**: API 介面相關
- **test**: 測試相關
- **docs**: 文檔相關

### Commit Message 範例
```
feat(gpu): 新增 GPU 記憶體監控功能

- 實現即時 GPU 記憶體使用追蹤
- 添加記憶體洩漏檢測機制
- 優化記憶體分配策略

Closes #123
```

```
fix(model): 修復模型載入時的記憶體洩漏問題

- 確保模型卸載時完全清理 GPU 記憶體
- 添加 torch.cuda.empty_cache() 調用
- 改進錯誤處理機制

Fixes #124
```

## 🔍 Pull Request 流程

### PR 前檢查清單
- [ ] **功能完成**: 所有功能已實現並測試
- [ ] **程式碼品質**: 通過所有 linting 檢查
- [ ] **測試覆蓋**: 單元測試覆蓋率 >90%
- [ ] **文檔更新**: 相關文檔已更新
- [ ] **效能測試**: 效能基準測試通過
- [ ] **安全檢查**: 通過安全掃描

### PR 模板
```markdown
## 📝 變更描述
簡要描述此 PR 的主要變更內容

## 🎯 變更類型
- [ ] 新功能 (feature)
- [ ] 錯誤修復 (bugfix)
- [ ] 重構 (refactor)
- [ ] 文檔更新 (docs)
- [ ] 效能優化 (perf)
- [ ] 測試 (test)

## 🧪 測試
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] 手動測試完成
- [ ] 效能測試通過

## 📋 檢查清單
- [ ] 我的程式碼遵循此專案的程式碼規範
- [ ] 我已經執行自我程式碼審查
- [ ] 我已經添加必要的註解
- [ ] 我已經更新相關文檔
- [ ] 我的變更產生新的警告
- [ ] 我已經添加測試證明我的修復有效或我的功能可以運作
- [ ] 新的和現有的單元測試通過我的變更
- [ ] 任何相依的變更已經合併和發布

## 🔗 相關 Issue
Closes #123, #124

## 📸 截圖 (如適用)
如果適用，添加截圖來解釋您的變更

## 📊 效能影響
- **GPU 利用率**: 85% → 90%
- **記憶體使用**: 6GB → 5.5GB
- **推理速度**: 8ms → 6ms
```

## 🚀 發布流程

### 版本號規範
遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/) 規範：
- **MAJOR.MINOR.PATCH**
- **1.0.0**: 主要版本 (不相容的 API 變更)
- **0.1.0**: 次要版本 (向後相容的功能新增)
- **0.0.1**: 修補版本 (向後相容的錯誤修復)

### 發布步驟
1. **準備發布分支**
```bash
git checkout -b release/v1.0.0 develop
```

2. **更新版本資訊**
```bash
# 更新版本號
echo "1.0.0" > VERSION

# 更新 CHANGELOG
git add CHANGELOG.md
git commit -m "chore: 更新 CHANGELOG for v1.0.0"
```

3. **執行完整測試**
```bash
pytest --cov=src
black --check src/
flake8 src/
bandit -r src/
```

4. **合併到 main**
```bash
git checkout main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
```

5. **合併回 develop**
```bash
git checkout develop
git merge --no-ff main
```

6. **推送遠端**
```bash
git push origin main
git push origin develop
git push origin v1.0.0
```

## 🛠️ Git 配置

### 全域配置
```bash
# 設置使用者資訊
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 設置編輯器
git config --global core.editor "code --wait"

# 設置預設分支名稱
git config --global init.defaultBranch main

# 設置合併策略
git config --global merge.ff only

# 設置 pull 策略
git config --global pull.rebase true
```

### 專案配置
```bash
# .gitattributes
*.py text eol=lf
*.md text eol=lf
*.yml text eol=lf
*.json text eol=lf

# .gitignore
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
.env
.DS_Store
*.egg-info/
dist/
build/
.coverage
htmlcov/
.pytest_cache/
.mypy_cache/
```

## 🔄 工作流程範例

### 功能開發流程
```bash
# 1. 從 develop 創建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/gpu-monitoring

# 2. 開發功能
# ... 編寫程式碼 ...

# 3. 提交變更
git add .
git commit -m "feat(gpu): 新增 GPU 監控模組

- 實現即時 GPU 狀態監控
- 添加效能指標收集
- 支援多 GPU 環境

Closes #125"

# 4. 推送分支
git push origin feature/gpu-monitoring

# 5. 創建 Pull Request
# 在 GitHub/GitLab 創建 PR 到 develop 分支

# 6. 程式碼審查
# 等待審查和修改

# 7. 合併到 develop
# 審查通過後合併
```

### 緊急修復流程
```bash
# 1. 從 main 創建 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/memory-leak-fix

# 2. 修復問題
# ... 修復程式碼 ...

# 3. 提交修復
git add .
git commit -m "fix(gpu): 修復記憶體洩漏問題

- 確保模型卸載時完全清理 GPU 記憶體
- 添加記憶體使用追蹤

Fixes #126"

# 4. 推送分支
git push origin hotfix/memory-leak-fix

# 5. 合併到 main 和 develop
git checkout main
git merge --no-ff hotfix/memory-leak-fix
git tag -a v1.0.1 -m "Hotfix v1.0.1"

git checkout develop
git merge --no-ff main

# 6. 推送變更
git push origin main
git push origin develop
git push origin v1.0.1
```

## 📊 品質門檻

### 自動檢查
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, 3.10]

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v3
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Lint with flake8
      run: |
        flake8 src/ --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 src/ --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics
    
    - name: Type check with mypy
      run: mypy src/
    
    - name: Security check with bandit
      run: bandit -r src/
    
    - name: Test with pytest
      run: |
        pytest --cov=src --cov-report=xml --cov-report=html
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
```

### 合併門檻
- **測試覆蓋率**: >90%
- **Linting**: 無錯誤
- **型別檢查**: 無錯誤
- **安全掃描**: 無高危漏洞
- **程式碼審查**: 至少 1 人審查通過
- **效能測試**: 符合基準要求

## 📝 變更日誌

### CHANGELOG.md 格式
```markdown
# 變更日誌

本文檔記錄專案所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
並且本專案遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [未發布]

### 新增
- GPU 記憶體監控功能
- 模型批次大小自動優化

### 修復
- 修復模型載入時的記憶體洩漏
- 改進錯誤處理機制

### 變更
- 重構工作流程引擎
- 更新依賴套件版本

## [1.0.0] - 2026-03-29

### 新增
- GPU 硬體偵測系統
- AI 模型載入器
- 工作流程引擎
- FastAPI 服務介面

### 修復
- 初始版本無已知問題

## [0.1.0] - 2026-03-22

### 新增
- 專案初始化
- 基礎架構設計
```

## 🔍 監控和報告

### Git 統計
```bash
# 提交統計
git shortlog -sn

# 作者統計
git log --pretty=format:"%an" | sort | uniq -c | sort -nr

# 檔案變更統計
git log --name-only --pretty=format: | sort | uniq -c | sort -nr

# 每日提交統計
git log --pretty=format:"%ad" --date=short | sort | uniq -c
```

### 品質報告
- **每週**: 程式碼覆蓋率報告
- **每月**: 技術債務報告
- **每季**: 品質趨勢分析

## 🎯 最佳實踐

### 提交頻率
- **小而頻繁**: 每個功能點獨立提交
- **邏輯完整**: 每次提交都是邏輯完整的單元
- **測試驅動**: 先寫測試再寫實現

### 分支管理
- **短生命週期**: 功能分支生命週期 < 2 週
- **定期同步**: 定期從上游分支同步
- **及時清理**: 合併後及時刪除分支

### 程式碼審查
- **及時審查**: 提交後 24 小時內審查
- **建設性回饋**: 提供具體改進建議
- **學習心態**: 將審查視為學習機會
