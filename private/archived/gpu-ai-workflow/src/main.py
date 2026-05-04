"""
GPU AI 工作流主程式
整合所有模組提供統一的服務介面
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from datetime import datetime

# 導入自定義模組
from gpu_detection.hardware_detector import gpu_detector
from ai_models.model_loader import model_loader, ModelConfig
from workflow.workflow_engine import task_scheduler, workflow_engine, WorkflowStep

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 應用
app = FastAPI(
    title="GPU AI 工作流 API",
    description="GPU 加速 AI 工作流程服務",
    version="1.0.0"
)

# CORS 設置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 啟動排程器
task_scheduler.start_scheduler()


# Pydantic 模型
class GPUStatusResponse(BaseModel):
    gpu_available: bool
    gpu_count: int
    gpu_info: List[Dict[str, Any]]
    system_info: Dict[str, Any]


class ModelLoadRequest(BaseModel):
    model_name: str
    model_path: str
    model_type: str = "pytorch"
    device: str = "cuda"
    batch_size: int = 32
    precision: str = "fp32"
    optimize: bool = True
    custom_config: Dict[str, Any] = {}


class InferenceRequest(BaseModel):
    model_name: str
    input_data: List[Any]
    batch_size: Optional[int] = None


class WorkflowSubmitRequest(BaseModel):
    workflow_name: str
    steps: List[Dict[str, Any]]
    input_data: Dict[str, Any] = {}


class TaskSubmitRequest(BaseModel):
    task_name: str
    function_name: str
    args: List[Any] = []
    kwargs: Dict[str, Any] = {}
    priority: int = 0
    timeout: Optional[float] = None


# API 端點
@app.get("/", response_model=Dict[str, str])
async def root():
    """根端點"""
    return {
        "message": "GPU AI 工作流 API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/gpu/status", response_model=GPUStatusResponse)
async def get_gpu_status():
    """獲取 GPU 狀態"""
    try:
        # 偵測 GPU
        gpu_info = gpu_detector.detect_gpus()
        cuda_info = gpu_detector.check_cuda_availability()
        system_info = gpu_detector.get_system_info()
        
        return GPUStatusResponse(
            gpu_available=torch.cuda.is_available(),
            gpu_count=len(gpu_info),
            gpu_info=[gpu_detector._gpu_info_to_dict(info) for info in gpu_info],
            system_info=system_info
        )
        
    except Exception as e:
        logger.error(f"獲取 GPU 狀態失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu/memory/{gpu_id}")
async def get_gpu_memory(gpu_id: int):
    """獲取指定 GPU 記憶體資訊"""
    try:
        memory_info = gpu_detector.get_memory_info(gpu_id)
        return memory_info
    except Exception as e:
        logger.error(f"獲取 GPU {gpu_id} 記憶體資訊失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/models/load")
async def load_model(request: ModelLoadRequest):
    """載入 AI 模型"""
    try:
        config = ModelConfig(
            model_name=request.model_name,
            model_path=request.model_path,
            model_type=request.model_type,
            device=request.device,
            batch_size=request.batch_size,
            precision=request.precision,
            optimize=request.optimize,
            custom_config=request.custom_config
        )
        
        model = model_loader.load_model(config)
        model_info = model_loader.get_model_info(request.model_name)
        
        return {
            "message": f"模型 {request.model_name} 載入成功",
            "model_info": model_info
        }
        
    except Exception as e:
        logger.error(f"模型載入失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/models/unload/{model_name}")
async def unload_model(model_name: str):
    """卸載 AI 模型"""
    try:
        success = model_loader.unload_model(model_name)
        if success:
            return {"message": f"模型 {model_name} 卸載成功"}
        else:
            raise HTTPException(status_code=404, detail=f"模型 {model_name} 未載入")
            
    except Exception as e:
        logger.error(f"模型卸載失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models/list")
async def list_models():
    """列出已載入的模型"""
    try:
        models = model_loader.list_loaded_models()
        memory_usage = model_loader.get_memory_usage()
        
        return {
            "models": models,
            "memory_usage": memory_usage
        }
        
    except Exception as e:
        logger.error(f"列出模型失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/models/inference")
async def model_inference(request: InferenceRequest):
    """模型推理"""
    try:
        # 獲取模型
        if request.model_name not in model_loader.loaded_models:
            raise HTTPException(status_code=404, detail=f"模型 {request.model_name} 未載入")
        
        model = model_loader.loaded_models[request.model_name]
        
        # 執行推理
        import torch
        device = model_loader.device
        
        # 轉換輸入資料為 tensor
        if isinstance(request.input_data[0], list):
            # 批次處理
            input_tensor = torch.tensor(request.input_data, dtype=torch.float32, device=device)
        else:
            # 單個輸入
            input_tensor = torch.tensor([request.input_data], dtype=torch.float32, device=device)
        
        # 推理
        with torch.no_grad():
            outputs = model(input_tensor)
        
        # 轉換結果
        if hasattr(outputs, 'cpu'):
            results = outputs.cpu().numpy().tolist()
        else:
            results = outputs
        
        return {
            "model_name": request.model_name,
            "results": results,
            "input_shape": list(input_tensor.shape),
            "output_shape": list(outputs.shape) if hasattr(outputs, 'shape') else None
        }
        
    except Exception as e:
        logger.error(f"模型推理失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tasks/submit")
async def submit_task(request: TaskSubmitRequest):
    """提交任務"""
    try:
        # 這裡需要實現任務函數映射
        # 為了簡化，我們使用一個示例函數
        def example_task(*args, **kwargs):
            import time
            time.sleep(1)  # 模擬計算
            return {"result": "task completed", "args": args, "kwargs": kwargs}
        
        task_id = task_scheduler.submit_task(
            func=example_task,
            name=request.task_name,
            args=tuple(request.args),
            kwargs=request.kwargs,
            priority=request.priority,
            timeout=request.timeout
        )
        
        return {
            "task_id": task_id,
            "message": f"任務 {request.task_name} 已提交"
        }
        
    except Exception as e:
        logger.error(f"任務提交失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """獲取任務狀態"""
    try:
        status = task_scheduler.get_task_status(task_id)
        if not status:
            raise HTTPException(status_code=404, detail=f"任務 {task_id} 不存在")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取任務狀態失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """取消任務"""
    try:
        success = task_scheduler.cancel_task(task_id)
        if success:
            return {"message": f"任務 {task_id} 已取消"}
        else:
            raise HTTPException(status_code=404, detail=f"任務 {task_id} 不存在或無法取消")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取消任務失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tasks/queue/info")
async def get_queue_info():
    """獲取任務佇列資訊"""
    try:
        info = task_scheduler.get_queue_info()
        return info
        
    except Exception as e:
        logger.error(f"獲取佇列資訊失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/workflows/submit")
async def submit_workflow(request: WorkflowSubmitRequest):
    """提交工作流程"""
    try:
        # 轉換步驟為 WorkflowStep 物件
        steps = []
        for step_data in request.steps:
            # 這裡需要實現函數映射
            def example_step(*args, **kwargs):
                import time
                time.sleep(0.5)
                return {"step_result": "completed", "data": kwargs}
            
            step = WorkflowStep(
                step_id=step_data.get("step_id", f"step_{len(steps)}"),
                name=step_data.get("name", f"Step {len(steps)}"),
                task_func=example_step,
                args=tuple(step_data.get("args", [])),
                kwargs=step_data.get("kwargs", {}),
                depends_on=step_data.get("depends_on", []),
                timeout=step_data.get("timeout")
            )
            steps.append(step)
        
        workflow_id = workflow_engine.define_workflow(request.workflow_name, steps)
        
        # 在背景執行工作流程
        background_tasks = BackgroundTasks()
        background_tasks.add_task(
            workflow_engine.execute_workflow,
            workflow_id,
            request.input_data
        )
        
        return {
            "workflow_id": workflow_id,
            "message": f"工作流程 {request.workflow_name} 已提交"
        }
        
    except Exception as e:
        logger.error(f"工作流程提交失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/workflows/{workflow_id}/status")
async def get_workflow_status(workflow_id: str):
    """獲取工作流程狀態"""
    try:
        status = workflow_engine.monitor_workflow(workflow_id)
        if "error" in status:
            raise HTTPException(status_code=404, detail=status["error"])
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取工作流程狀態失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/workflows/list")
async def list_workflows():
    """列出所有工作流程"""
    try:
        workflows = workflow_engine.list_workflows()
        return {"workflows": workflows}
        
    except Exception as e:
        logger.error(f"列出工作流程失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """健康檢查"""
    try:
        # 檢查各個組件狀態
        gpu_available = gpu_detector.check_cuda_availability()["cuda_available"]
        scheduler_active = task_scheduler.scheduler_active
        
        return {
            "status": "healthy",
            "gpu_available": gpu_available,
            "scheduler_active": scheduler_active,
            "loaded_models": len(model_loader.loaded_models),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"健康檢查失敗: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.on_event("shutdown")
async def shutdown_event():
    """應用關閉事件"""
    logger.info("正在關閉應用...")
    
    # 停止排程器
    task_scheduler.stop_scheduler()
    
    # 清理所有模型
    model_loader.cleanup_all()
    
    # 清理 GPU 偵測器
    gpu_detector.cleanup()
    
    logger.info("應用已關閉")


if __name__ == "__main__":
    # 導入 torch 以檢查 CUDA
    import torch
    
    logger.info("啟動 GPU AI 工作流服務...")
    logger.info(f"CUDA 可用: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logger.info(f"GPU 數量: {torch.cuda.device_count()}")
        logger.info(f"當前 GPU: {torch.cuda.get_device_name()}")
    
    # 啟動服務
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
