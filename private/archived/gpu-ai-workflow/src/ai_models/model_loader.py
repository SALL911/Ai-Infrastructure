"""
AI 模型載入器
負責 AI 模型的載入、優化和記憶體管理
"""

import torch
import torch.nn as nn
from torch.nn import DataParallel
from typing import Dict, Any, Optional, Union
import gc
import logging
from pathlib import Path
import json
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import threading

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """模型配置資料類"""
    model_name: str
    model_path: str
    model_type: str  # "pytorch", "onnx", "tensorrt"
    device: str = "cuda"
    batch_size: int = 32
    precision: str = "fp32"  # "fp16", "fp32", "int8"
    optimize: bool = True
    custom_config: Dict[str, Any] = None


class AIModelLoader:
    """AI 模型載入器"""
    
    def __init__(self):
        self.loaded_models: Dict[str, nn.Module] = {}
        self.model_configs: Dict[str, ModelConfig] = {}
        self.device = None
        self._lock = threading.Lock()
        self._setup_device()
    
    def _setup_device(self):
        """設置運算設備"""
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            logger.info(f"使用 GPU 設備: {torch.cuda.get_device_name()}")
        else:
            self.device = torch.device("cpu")
            logger.warning("使用 CPU 設備 (GPU 不可用)")
    
    def load_model(self, model_config: ModelConfig) -> nn.Module:
        """載入 AI 模型到 GPU"""
        with self._lock:
            model_name = model_config.model_name
            
            # 檢查模型是否已載入
            if model_name in self.loaded_models:
                logger.info(f"模型 {model_name} 已載入")
                return self.loaded_models[model_name]
            
            try:
                logger.info(f"開始載入模型: {model_name}")
                
                # 根據模型類型載入
                if model_config.model_type == "pytorch":
                    model = self._load_pytorch_model(model_config)
                elif model_config.model_type == "onnx":
                    model = self._load_onnx_model(model_config)
                elif model_config.model_type == "tensorrt":
                    model = self._load_tensorrt_model(model_config)
                else:
                    raise ValueError(f"不支援的模型類型: {model_config.model_type}")
                
                # 移動到設備
                model = model.to(self.device)
                
                # 模型優化
                if model_config.optimize:
                    model = self._optimize_model(model, model_config)
                
                # 設置評估模式
                model.eval()
                
                # 儲存模型
                self.loaded_models[model_name] = model
                self.model_configs[model_name] = model_config
                
                logger.info(f"模型 {model_name} 載入成功")
                return model
                
            except Exception as e:
                logger.error(f"模型 {model_name} 載入失敗: {e}")
                raise
    
    def _load_pytorch_model(self, config: ModelConfig) -> nn.Module:
        """載入 PyTorch 模型"""
        model_path = Path(config.model_path)
        
        if not model_path.exists():
            raise FileNotFoundError(f"模型檔案不存在: {model_path}")
        
        # 載入模型
        if model_path.suffix == ".pt" or model_path.suffix == ".pth":
            model = torch.load(model_path, map_location=self.device)
        elif model_path.suffix == ".pkl":
            import pickle
            with open(model_path, "rb") as f:
                model = pickle.load(f)
        else:
            raise ValueError(f"不支援的檔案格式: {model_path.suffix}")
        
        return model
    
    def _load_onnx_model(self, config: ModelConfig):
        """載入 ONNX 模型"""
        import onnxruntime as ort
        
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        session = ort.InferenceSession(config.model_path, providers=providers)
        
        return session
    
    def _load_tensorrt_model(self, config: ModelConfig):
        """載入 TensorRT 模型"""
        import tensorrt as trt
        
        logger = trt.Logger(trt.Logger.WARNING)
        with open(config.model_path, "rb") as f, trt.Runtime(logger) as runtime:
            engine = runtime.deserialize_cuda_engine(f.read())
        
        return engine
    
    def _optimize_model(self, model: nn.Module, config: ModelConfig) -> nn.Module:
        """模型優化"""
        try:
            # 精度優化
            if config.precision == "fp16" and self.device.type == "cuda":
                model = model.half()
                logger.info("模型轉換為 FP16 精度")
            
            elif config.precision == "int8" and self.device.type == "cuda":
                # 動態量化
                model = torch.quantization.quantize_dynamic(
                    model, {nn.Linear}, dtype=torch.qint8
                )
                logger.info("模型進行 INT8 量化")
            
            # 編譯優化 (PyTorch 2.0+)
            if hasattr(torch, "compile"):
                try:
                    model = torch.compile(model)
                    logger.info("模型使用 torch.compile 優化")
                except Exception as e:
                    logger.warning(f"torch.compile 優化失敗: {e}")
            
            # 設置為推論模式
            for module in model.modules():
                if hasattr(module, "eval"):
                    module.eval()
            
            return model
            
        except Exception as e:
            logger.warning(f"模型優化失敗: {e}")
            return model
    
    def unload_model(self, model_name: str) -> bool:
        """卸載模型釋放記憶體"""
        with self._lock:
            if model_name not in self.loaded_models:
                logger.warning(f"模型 {model_name} 未載入")
                return False
            
            try:
                # 刪除模型
                model = self.loaded_models.pop(model_name)
                self.model_configs.pop(model_name, None)
                
                # 清理 GPU 記憶體
                if hasattr(model, "cpu"):
                    model.cpu()
                
                del model
                
                # 強制垃圾回收
                gc.collect()
                if self.device.type == "cuda":
                    torch.cuda.empty_cache()
                
                logger.info(f"模型 {model_name} 已卸載")
                return True
                
            except Exception as e:
                logger.error(f"模型 {model_name} 卸載失敗: {e}")
                return False
    
    def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """獲取模型資訊"""
        if model_name not in self.loaded_models:
            return None
        
        model = self.loaded_models[model_name]
        config = self.model_configs[model_name]
        
        # 計算模型參數數量
        total_params = 0
        if hasattr(model, "parameters"):
            total_params = sum(p.numel() for p in model.parameters())
        
        # 計算模型大小
        model_size = 0
        if hasattr(model, "state_dict"):
            model_size = sum(p.numel() * p.element_size() for p in model.parameters())
            model_size = model_size / (1024 * 1024)  # MB
        
        return {
            "model_name": model_name,
            "model_type": config.model_type,
            "device": str(self.device),
            "precision": config.precision,
            "batch_size": config.batch_size,
            "total_parameters": total_params,
            "model_size_mb": model_size,
            "optimized": config.optimize,
            "loaded": True
        }
    
    def list_loaded_models(self) -> Dict[str, Dict[str, Any]]:
        """列出所有已載入的模型"""
        return {
            name: self.get_model_info(name)
            for name in self.loaded_models.keys()
        }
    
    def optimize_batch_size(self, model_name: str, input_shape: tuple) -> int:
        """動態調整批次大小"""
        if model_name not in self.loaded_models:
            return 1
        
        model = self.loaded_models[model_name]
        config = self.model_configs[model_name]
        
        if self.device.type != "cuda":
            return config.batch_size
        
        try:
            # 測試不同批次大小
            max_batch_size = config.batch_size
            test_batch_sizes = [1, 2, 4, 8, 16, 32, 64, 128]
            
            for batch_size in test_batch_sizes:
                if batch_size > max_batch_size:
                    continue
                
                try:
                    # 創建測試輸入
                    test_input = torch.randn(
                        (batch_size,) + input_shape,
                        device=self.device
                    )
                    
                    # 測試推理
                    with torch.no_grad():
                        _ = model(test_input)
                    
                    max_batch_size = batch_size
                    
                except RuntimeError as e:
                    if "out of memory" in str(e):
                        break
                    else:
                        raise
            
            logger.info(f"模型 {model_name} 最佳批次大小: {max_batch_size}")
            return max_batch_size
            
        except Exception as e:
            logger.error(f"批次大小優化失敗: {e}")
            return config.batch_size
    
    def get_memory_usage(self) -> Dict[str, Any]:
        """獲取記憶體使用情況"""
        memory_info = {
            "loaded_models": len(self.loaded_models),
            "system_memory": {},
            "gpu_memory": {}
        }
        
        # 系統記憶體
        import psutil
        memory = psutil.virtual_memory()
        memory_info["system_memory"] = {
            "total_mb": memory.total // (1024 * 1024),
            "available_mb": memory.available // (1024 * 1024),
            "used_mb": memory.used // (1024 * 1024),
            "percent": memory.percent
        }
        
        # GPU 記憶體
        if self.device.type == "cuda":
            memory_info["gpu_memory"] = {
                "allocated_mb": torch.cuda.memory_allocated() // (1024 * 1024),
                "reserved_mb": torch.cuda.memory_reserved() // (1024 * 1024),
                "max_allocated_mb": torch.cuda.max_memory_allocated() // (1024 * 1024)
            }
        
        return memory_info
    
    def cleanup_all(self):
        """清理所有模型和記憶體"""
        with self._lock:
            model_names = list(self.loaded_models.keys())
            
            for model_name in model_names:
                self.unload_model(model_name)
            
            logger.info("所有模型已清理")
    
    def save_model_config(self, config_path: str):
        """儲存模型配置"""
        configs = {
            name: {
                "model_name": config.model_name,
                "model_path": config.model_path,
                "model_type": config.model_type,
                "device": config.device,
                "batch_size": config.batch_size,
                "precision": config.precision,
                "optimize": config.optimize,
                "custom_config": config.custom_config
            }
            for name, config in self.model_configs.items()
        }
        
        with open(config_path, "w") as f:
            json.dump(configs, f, indent=2)
        
        logger.info(f"模型配置已儲存到: {config_path}")
    
    def load_model_config(self, config_path: str) -> Dict[str, ModelConfig]:
        """載入模型配置"""
        with open(config_path, "r") as f:
            configs = json.load(f)
        
        for name, config_dict in configs.items():
            config = ModelConfig(**config_dict)
            self.model_configs[name] = config
        
        logger.info(f"模型配置已從 {config_path} 載入")
        return self.model_configs


# 全域實例
model_loader = AIModelLoader()
