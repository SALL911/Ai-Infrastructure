# GPU AI 工作流專案

## 🚀 專案概述

GPU AI 工作流專案是一個基於 GPU 加速的 AI 模型推理和工作流程管理系統，專為 BrandOS AI Infrastructure Protocol 設計。本專案實現了 GPU 硬體偵測、AI 模型管理、工作流程自動化等核心功能。

## ✨ 主要功能

### 🔍 GPU 偵測與監控
- **硬體偵測**: 自動偵測 NVIDIA GPU 硬體
- **狀態監控**: 即時監控 GPU 利用率、記憶體使用、溫度
- **CUDA 檢查**: 驗證 CUDA 版本相容性
- **最佳 GPU 選擇**: 自動選擇最適合的 GPU 設備

### 🤖 AI 模型管理
- **模型載入**: 支援 PyTorch、ONNX、TensorRT 模型
- **記憶體優化**: 動態記憶體分配和清理
- **精度控制**: FP16/FP32/INT8 精度優化
- **批次處理**: 自動批次大小優化

### ⚡ 工作流程引擎
- **任務排程**: 多線程任務排程系統
- **工作流程**: 可定義的多步驟工作流程
- **依賴管理**: 任務依賴關係處理
- **錯誤處理**: 完整的錯誤重試機制

### 🌐 REST API
- **FastAPI 框架**: 高效能異步 API 服務
- **自動文檔**: Swagger/OpenAPI 文檔生成
- **認證安全**: JWT token 認證機制
- **監控端點**: 健康檢查和效能監控

## 🏗️ 系統架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI       │    │  Workflow       │    │  Model Loader   │
│   REST API      │◄──►│  Engine         │◄──►│  Manager        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Task          │    │  GPU            │    │  PyTorch/       │
│   Scheduler     │    │  Detector       │    │  CUDA           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 系統需求

### 硬體需求
- **GPU**: NVIDIA GPU (支援 CUDA)
- **記憶體**: 最少 8GB GPU 記憶體
- **儲存**: 最少 10GB 可用空間

### 軟體需求
- **Python**: 3.8+
- **CUDA**: 11.8+
- **驅動程式**: NVIDIA Driver 595.79+

## 🚀 快速開始

### 1. 環境設置
```bash
# 克隆專案
git clone <repository-url>
cd gpu-ai-workflow

# 創建虛擬環境
python -m venv gpu-ai-env
source gpu-ai-env/bin/activate  # Linux/Mac
gpu-ai-env\Scripts\activate     # Windows

# 安裝依賴
pip install -r requirements.txt
```

### 2. GPU 檢查
```bash
# 檢查 GPU 狀態
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
nvidia-smi
```

### 3. 啟動服務
```bash
# 啟動 API 服務
python src/main.py

# 或使用 uvicorn
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 測試 API
```bash
# 健康檢查
curl http://localhost:8000/health

# GPU 狀態
curl http://localhost:8000/gpu/status

# API 文檔
# 瀏覽器訪問 http://localhost:8000/docs
```

## 📖 使用指南

### GPU 狀態檢查
```python
from src.gpu_detection.hardware_detector import gpu_detector

# 偵測 GPU
gpu_info = gpu_detector.detect_gpus()
print(f"偵測到 {len(gpu_info)} 個 GPU")

# 檢查 CUDA
cuda_info = gpu_detector.check_cuda_availability()
print(f"CUDA 版本: {cuda_info['cuda_version']}")
```

### 模型載入與推理
```python
from src.ai_models.model_loader import model_loader, ModelConfig

# 載入模型
config = ModelConfig(
    model_name="my_model",
    model_path="path/to/model.pth",
    model_type="pytorch",
    precision="fp16",
    optimize=True
)

model = model_loader.load_model(config)

# 模型推理
import torch
input_data = torch.randn(1, 3, 224, 224).cuda()
with torch.no_grad():
    output = model(input_data)
```

### 工作流程執行
```python
from src.workflow.workflow_engine import workflow_engine, WorkflowStep

# 定義工作流程步驟
def preprocessing(data):
    # 資料預處理
    return processed_data

def inference(data):
    # AI 推理
    return result

def postprocessing(data):
    # 後處理
    return final_result

steps = [
    WorkflowStep("preprocess", "資料預處理", preprocessing),
    WorkflowStep("inference", "AI 推理", inference, depends_on=["preprocess"]),
    WorkflowStep("postprocess", "後處理", postprocessing, depends_on=["inference"])
]

# 執行工作流程
workflow_id = workflow_engine.define_workflow("my_workflow", steps)
result = await workflow_engine.execute_workflow(workflow_id, input_data)
```

## 🔧 API 文檔

### 主要端點

| 端點 | 方法 | 描述 |
|------|------|------|
| `/gpu/status` | GET | 獲取 GPU 狀態 |
| `/gpu/memory/{gpu_id}` | GET | 獲取 GPU 記憶體資訊 |
| `/models/load` | POST | 載入 AI 模型 |
| `/models/unload/{model_name}` | DELETE | 卸載 AI 模型 |
| `/models/list` | GET | 列出已載入模型 |
| `/models/inference` | POST | 模型推理 |
| `/tasks/submit` | POST | 提交任務 |
| `/tasks/{task_id}/status` | GET | 獲取任務狀態 |
| `/workflows/submit` | POST | 提交工作流程 |
| `/workflows/{workflow_id}/status` | GET | 獲取工作流程狀態 |
| `/health` | GET | 健康檢查 |

### 詳細文檔
訪問 `http://localhost:8000/docs` 查看完整的 API 文檔。

## 🧪 測試

### 執行測試
```bash
# 執行所有測試
pytest

# 執行測試並生成覆蓋率報告
pytest --cov=src --cov-report=html

# 執行特定測試
pytest tests/test_gpu_detection.py

# 執行效能測試
pytest tests/performance/
```

### 測試覆蓋率
目標測試覆蓋率 >90%，覆蓋率報告生成在 `htmlcov/` 目錄。

## 📊 效能基準

### GPU 效能指標
- **GPU 利用率**: 目標 >80%
- **記憶體效率**: 目標 >70%
- **推理速度**: 5-10x CPU 加速

### 系統效能
- **API 回應時間**: <100ms
- **任務排程延遲**: <1s
- **工作流程執行**: 線性時間複雜度

## 🔧 開發指南

### 程式碼規範
```bash
# 程式碼格式化
black src/

# 匯入排序
isort src/

# Linting 檢查
flake8 src/

# 型別檢查
mypy src/

# 安全檢查
bandit -r src/
```

### 提交規範
遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：
```
feat(gpu): 新增 GPU 監控功能
fix(model): 修復模型載入錯誤
docs(api): 更新 API 文檔
```

### 分支策略
- `main`: 生產環境穩定版本
- `develop`: 開發環境整合版本
- `feature/*`: 功能開發分支
- `hotfix/*`: 緊急修復分支

## 🐳 Docker 部署

### 建置映像
```bash
# 建置 Docker 映像
docker build -t gpu-ai-workflow .

# 運行容器
docker run --gpus all -p 8000:8000 gpu-ai-workflow
```

### Docker Compose
```bash
# 使用 Docker Compose
docker-compose up -d
```

## 📈 監控

### 效能監控
- **Prometheus**: 指標收集
- **Grafana**: 視覺化儀表板
- **日誌**: 結構化日誌輸出

### 健康檢查
```bash
# 健康檢查端點
curl http://localhost:8000/health

# 詳細狀態
curl http://localhost:8000/gpu/status
```

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'feat: 新增新功能'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 創建 Pull Request

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。

## 🆘 支援

### 問題回報
如果您遇到問題，請在 [GitHub Issues](../../issues) 回報。

### 常見問題

**Q: GPU 偵測失敗怎麼辦？**
A: 請檢查 NVIDIA 驅動程式和 CUDA 安裝是否正確。

**Q: 模型載入失敗？**
A: 請確認模型檔案路徑和格式是否正確。

**Q: 記憶體不足錯誤？**
A: 請嘗試減少批次大小或使用 FP16 精度。

## 🗺️ 路線圖

### v1.1 (預計 2026 Q2)
- [ ] 支援更多 AI 框架 (TensorFlow, JAX)
- [ ] 分散式訓練支援
- [ ] Web UI 介面

### v1.2 (預計 2026 Q3)
- [ ] Kubernetes 原生支援
- [ ] 自動擴展功能
- [ ] 高級監控告警

### v2.0 (預計 2026 Q4)
- [ ] 邊緣計算支援
- [ ] 聯邦學習功能
- [ ] 企業級安全功能

## 📞 聯絡方式

- **專案維護者**: [Your Name]
- **Email**: [your.email@example.com]
- **Discord**: [伺服器邀請連結]

---

⭐ 如果這個專案對您有幫助，請給我們一個 Star！
