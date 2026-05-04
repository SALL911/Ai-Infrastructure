"""
GPU 硬體偵測模組
負責偵測和監控 GPU 硬體狀態
"""

import torch
import nvidia_ml_py3 as nvml
import psutil
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class GPUInfo:
    """GPU 資訊資料類"""
    gpu_id: int
    name: str
    memory_total: int  # MB
    memory_free: int   # MB
    memory_used: int   # MB
    utilization: float # 0-100%
    temperature: float # Celsius
    power_usage: float # Watts
    driver_version: str
    cuda_version: str


class GPUHardwareDetector:
    """GPU 硬體偵測器"""
    
    def __init__(self):
        self.gpu_count = 0
        self.gpu_info: List[GPUInfo] = []
        self.nvml_initialized = False
        self._initialize_nvml()
    
    def _initialize_nvml(self) -> bool:
        """初始化 NVML 函式庫"""
        try:
            nvml.nvmlInit()
            self.nvml_initialized = True
            logger.info("NVML 初始化成功")
            return True
        except nvml.NVMLError as e:
            logger.error(f"NVML 初始化失敗: {e}")
            return False
    
    def detect_gpus(self) -> List[GPUInfo]:
        """偵測可用 GPU 硬體"""
        self.gpu_info.clear()
        
        # 檢查 CUDA 可用性
        if not torch.cuda.is_available():
            logger.warning("CUDA 不可用")
            return self.gpu_info
        
        self.gpu_count = torch.cuda.device_count()
        logger.info(f"偵測到 {self.gpu_count} 個 GPU")
        
        for gpu_id in range(self.gpu_count):
            gpu_info = self._get_gpu_info(gpu_id)
            if gpu_info:
                self.gpu_info.append(gpu_info)
        
        return self.gpu_info
    
    def _get_gpu_info(self, gpu_id: int) -> Optional[GPUInfo]:
        """獲取單個 GPU 的詳細資訊"""
        try:
            # PyTorch 資訊
            device_props = torch.cuda.get_device_properties(gpu_id)
            name = device_props.name
            memory_total = device_props.total_memory // (1024 * 1024)  # Convert to MB
            
            # NVML 資訊 (如果可用)
            memory_free = memory_total
            memory_used = 0
            utilization = 0.0
            temperature = 0.0
            power_usage = 0.0
            
            if self.nvml_initialized:
                try:
                    handle = nvml.nvmlDeviceGetHandleByIndex(gpu_id)
                    
                    # 記憶體資訊
                    mem_info = nvml.nvmlDeviceGetMemoryInfo(handle)
                    memory_total = mem_info.total // (1024 * 1024)
                    memory_free = mem_info.free // (1024 * 1024)
                    memory_used = mem_info.used // (1024 * 1024)
                    
                    # 利用率
                    util_rates = nvml.nvmlDeviceGetUtilizationRates(handle)
                    utilization = util_rates.gpu
                    
                    # 溫度
                    temperature = nvml.nvmlDeviceGetTemperature(
                        handle, nvml.NVML_TEMPERATURE_GPU
                    )
                    
                    # 功耗
                    try:
                        power_usage = nvml.nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert to Watts
                    except nvml.NVMLError:
                        power_usage = 0.0
                        
                except nvml.NVMLError as e:
                    logger.warning(f"GPU {gpu_id} NVML 資訊獲取失敗: {e}")
            
            # 驅動版本
            driver_version = "Unknown"
            cuda_version = f"{torch.version.cuda}"
            
            return GPUInfo(
                gpu_id=gpu_id,
                name=name,
                memory_total=memory_total,
                memory_free=memory_free,
                memory_used=memory_used,
                utilization=utilization,
                temperature=temperature,
                power_usage=power_usage,
                driver_version=driver_version,
                cuda_version=cuda_version
            )
            
        except Exception as e:
            logger.error(f"獲取 GPU {gpu_id} 資訊失敗: {e}")
            return None
    
    def check_cuda_availability(self) -> Dict[str, any]:
        """檢查 CUDA 可用性"""
        result = {
            "cuda_available": torch.cuda.is_available(),
            "cuda_version": torch.version.cuda,
            "torch_version": torch.__version__,
            "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "current_device": torch.cuda.current_device() if torch.cuda.is_available() else None
        }
        
        if torch.cuda.is_available():
            result["cuda_arch_list"] = torch.cuda.get_arch_list()
            result["cuda_device_capability"] = torch.cuda.get_device_capability()
        
        return result
    
    def get_memory_info(self, gpu_id: int) -> Dict[str, int]:
        """獲取 GPU 記憶體資訊"""
        if not torch.cuda.is_available() or gpu_id >= torch.cuda.device_count():
            return {"error": "GPU 不可用"}
        
        try:
            # PyTorch 記憶體資訊
            memory_allocated = torch.cuda.memory_allocated(gpu_id) // (1024 * 1024)
            memory_reserved = torch.cuda.memory_reserved(gpu_id) // (1024 * 1024)
            
            # 總記憶體
            total_memory = torch.cuda.get_device_properties(gpu_id).total_memory // (1024 * 1024)
            free_memory = total_memory - memory_allocated
            
            return {
                "total_memory_mb": total_memory,
                "allocated_memory_mb": memory_allocated,
                "reserved_memory_mb": memory_reserved,
                "free_memory_mb": free_memory,
                "utilization_percent": (memory_allocated / total_memory) * 100
            }
            
        except Exception as e:
            logger.error(f"獲取 GPU {gpu_id} 記憶體資訊失敗: {e}")
            return {"error": str(e)}
    
    def get_system_info(self) -> Dict[str, any]:
        """獲取系統資訊"""
        return {
            "cpu_count": psutil.cpu_count(),
            "cpu_percent": psutil.cpu_percent(),
            "memory_total": psutil.virtual_memory().total // (1024 * 1024),  # MB
            "memory_available": psutil.virtual_memory().available // (1024 * 1024),  # MB
            "memory_percent": psutil.virtual_memory().percent,
            "gpu_info": [self._gpu_info_to_dict(info) for info in self.gpu_info]
        }
    
    def _gpu_info_to_dict(self, gpu_info: GPUInfo) -> Dict:
        """轉換 GPUInfo 為字典"""
        return {
            "gpu_id": gpu_info.gpu_id,
            "name": gpu_info.name,
            "memory_total_mb": gpu_info.memory_total,
            "memory_free_mb": gpu_info.memory_free,
            "memory_used_mb": gpu_info.memory_used,
            "utilization_percent": gpu_info.utilization,
            "temperature_celsius": gpu_info.temperature,
            "power_usage_watts": gpu_info.power_usage,
            "driver_version": gpu_info.driver_version,
            "cuda_version": gpu_info.cuda_version
        }
    
    def is_gpu_available(self, gpu_id: int = 0) -> bool:
        """檢查指定 GPU 是否可用"""
        if not torch.cuda.is_available():
            return False
        
        if gpu_id >= torch.cuda.device_count():
            return False
        
        try:
            torch.cuda.empty_cache()
            test_tensor = torch.tensor([1.0], device=f"cuda:{gpu_id}")
            del test_tensor
            torch.cuda.empty_cache()
            return True
        except Exception as e:
            logger.error(f"GPU {gpu_id} 不可用: {e}")
            return False
    
    def get_optimal_gpu(self) -> Optional[int]:
        """獲取最適合使用的 GPU ID"""
        if not self.gpu_info:
            self.detect_gpus()
        
        if not self.gpu_info:
            return None
        
        # 選擇記憶體最多且利用率最低的 GPU
        best_gpu = max(self.gpu_info, key=lambda x: (x.memory_free, 100 - x.utilization))
        return best_gpu.gpu_id
    
    def cleanup(self):
        """清理資源"""
        if self.nvml_initialized:
            try:
                nvml.nvmlShutdown()
                self.nvml_initialized = False
                logger.info("NVML 已關閉")
            except nvml.NVMLError as e:
                logger.error(f"NVML 關閉失敗: {e}")


# 全域實例
gpu_detector = GPUHardwareDetector()
