"""
Protocol 使用範例
展示如何使用結構化的 BrandOS AI Infrastructure Protocol
"""

import json
import asyncio
from datetime import datetime
from typing import Dict, Any

# 導入協議組件
from src.rules.rule_engine import RuleEngine, RuleCategory
from src.gpu_detection.hardware_detector import gpu_detector
from src.ai_models.model_loader import model_loader, ModelConfig


class ProtocolExample:
    """協議使用範例類"""
    
    def __init__(self):
        self.rule_engine = RuleEngine()
        self.rule_engine.load_rules_from_config('rules/protocol-rules.json')
    
    def example_brand_identity_creation(self) -> Dict[str, Any]:
        """品牌身份創建範例"""
        print("=== 品牌身份創建範例 ===")
        
        # 準備品牌身份資料
        brand_data = {
            "did": {
                "method": "did",
                "method_specific_id": "brand:tw:techcorp-001",
                "did": "did:brand:tw:techcorp-001"
            },
            "metadata": {
                "name": "TechCorp",
                "industry": "technology",
                "country": "TW",
                "registration_date": datetime.now().isoformat(),
                "status": "active"
            },
            "credentials": []
        }
        
        # 驗證品牌身份
        result = self.rule_engine.evaluate_rules(
            brand_data, 
            [RuleCategory.VALIDATION, RuleCategory.BUSINESS_LOGIC]
        )
        
        print(f"驗證結果: {'通過' if result.success else '失敗'}")
        print(f"總規則數: {result.total_rules}")
        print(f"通過規則: {result.passed_rules}")
        print(f"失敗規則: {result.failed_rules}")
        print(f"警告規則: {result.warning_rules}")
        
        if not result.success:
            print("失敗詳情:")
            for rule_result in result.results:
                if not rule_result.passed:
                    print(f"  - {rule_result.rule_id}: {rule_result.error_message}")
                    for action in rule_result.actions_taken:
                        print(f"    動作: {action['message']}")
        
        return brand_data
    
    def example_esg_carbon_reporting(self) -> Dict[str, Any]:
        """ESG 碳排放報告範例"""
        print("\n=== ESG 碳排放報告範例 ===")
        
        # 準備碳排放資料
        carbon_data = {
            "brand_did": "did:brand:tw:techcorp-001",
            "scope1_emissions": 1000.5,
            "scope2_emissions": 2000.0,
            "scope3_emissions": 5000.0,
            "measurement_period": "2026-Q1",
            "advertising_carbon": {
                "platform": "meta",
                "campaign_name": "Spring Sale 2026",
                "impressions": 1000000,
                "device_type": "all",
                "region": "TW",
                "measurement_date": datetime.now().isoformat()
            },
            "reduction_targets": [
                {
                    "target_year": 2030,
                    "reduction_percentage": 50.0,
                    "baseline_year": 2020,
                    "scope": "all"
                }
            ]
        }
        
        # 計算廣告碳排放
        advertising_carbon_rule = self.rule_engine.get_rule_by_id("ESG_AD_CARBON_001")
        if advertising_carbon_rule:
            # 使用規則中的計算公式
            impressions = carbon_data["advertising_carbon"]["impressions"]
            energy_factor = 0.000001  # Meta 的能源因子
            emission_factor = 0.5  # 全球平均排放因子
            carbon_kg = impressions * energy_factor * emission_factor
            
            carbon_data["advertising_carbon"]["energy_factor"] = energy_factor
            carbon_data["advertising_carbon"]["emission_factor"] = emission_factor
            carbon_data["advertising_carbon"]["carbon_kg"] = carbon_kg
            
            print(f"廣告碳排放計算:")
            print(f"  曝光次數: {impressions:,}")
            print(f"  能源因子: {energy_factor} kWh/impression")
            print(f"  排放因子: {emission_factor} kg CO2e/kWh")
            print(f"  碳排放量: {carbon_kg:.4f} kg CO2e")
        
        # 驗證 ESG 資料
        result = self.rule_engine.evaluate_rules(
            carbon_data,
            [RuleCategory.COMPLIANCE, RuleCategory.VALIDATION]
        )
        
        print(f"\nESG 資料驗證結果: {'通過' if result.success else '失敗'}")
        
        return carbon_data
    
    def example_ai_governance(self) -> Dict[str, Any]:
        """AI 治理範例"""
        print("\n=== AI 治理範例 ===")
        
        # 準備 AI 決策審計資料
        decision_data = {
            "decision_id": "decision-12345",
            "model_id": "model-abc-123",
            "model_version": "v1.2.0",
            "input_data_hash": "sha256:abc123def456...",
            "output_result": {
                "prediction": "positive",
                "confidence": 0.95
            },
            "confidence_score": 0.95,
            "timestamp": datetime.now().isoformat(),
            "explanation": "基於特徵 A、B、C 的分析結果"
        }
        
        # 準備模型問責資料
        model_data = {
            "model_id": "model-abc-123",
            "model_name": "Customer Churn Predictor",
            "purpose": "預測客戶流失風險",
            "training_data_summary": {
                "samples": 100000,
                "features": 50,
                "time_period": "2020-2023"
            },
            "performance_metrics": {
                "accuracy": 0.92,
                "precision": 0.89,
                "recall": 0.87
            },
            "bias_assessment": {
                "gender_bias": 0.05,
                "age_bias": 0.03
            },
            "fairness_metrics": {
                "demographic_parity": 0.85,
                "equal_opportunity": 0.88
            },
            "responsible_party": "Data Science Team",
            "review_date": datetime.now().isoformat()
        }
        
        # 驗證 AI 治理資料
        ai_data = {
            "decision": decision_data,
            "model": model_data
        }
        
        result = self.rule_engine.evaluate_rules(
            ai_data,
            [RuleCategory.COMPLIANCE, RuleCategory.VALIDATION]
        )
        
        print(f"AI 治理驗證結果: {'通過' if result.success else '失敗'}")
        
        return ai_data
    
    def example_gpu_acceleration(self) -> Dict[str, Any]:
        """GPU 加速範例"""
        print("\n=== GPU 加速範例 ===")
        
        # 偵測 GPU 狀態
        gpu_info = gpu_detector.detect_gpus()
        cuda_info = gpu_detector.check_cuda_availability()
        
        print(f"GPU 狀態:")
        print(f"  CUDA 可用: {cuda_info['cuda_available']}")
        print(f"  GPU 數量: {len(gpu_info)}")
        
        if gpu_info:
            for gpu in gpu_info:
                print(f"  GPU {gpu.gpu_id}: {gpu.name}")
                print(f"    記憶體: {gpu.memory_free}MB / {gpu.memory_total}MB")
                print(f"    利用率: {gpu.utilization}%")
                print(f"    溫度: {gpu.temperature}°C")
        
        # 準備 GPU 效能資料
        gpu_data = {
            "gpu_count": len(gpu_info),
            "gpu_info": [
                {
                    "gpu_id": gpu.gpu_id,
                    "name": gpu.name,
                    "memory_total": gpu.memory_total,
                    "memory_free": gpu.memory_free,
                    "utilization": gpu.utilization,
                    "temperature": gpu.temperature
                }
                for gpu in gpu_info
            ],
            "cuda_version": cuda_info.get("cuda_version", "unknown"),
            "performance_metrics": {
                "inference_time_ms": 10.5,
                "throughput_fps": 95.2,
                "gpu_utilization": 85.5,
                "memory_efficiency": 78.0
            }
        }
        
        # 驗證 GPU 加速規則
        result = self.rule_engine.evaluate_rules(
            gpu_data,
            [RuleCategory.PERFORMANCE, RuleCategory.VALIDATION]
        )
        
        print(f"\nGPU 加速驗證結果: {'通過' if result.success else '失敗'}")
        
        return gpu_data
    
    def example_verification(self) -> Dict[str, Any]:
        """驗證範例"""
        print("\n=== 驗證範例 ===")
        
        # 準備資料完整性驗證資料
        import hashlib
        
        data_to_verify = {
            "brand_did": "did:brand:tw:techcorp-001",
            "carbon_emissions": 5000,
            "timestamp": datetime.now().isoformat()
        }
        
        # 計算資料雜湊
        data_str = json.dumps(data_to_verify, sort_keys=True)
        data_hash = hashlib.sha256(data_str.encode()).hexdigest()
        
        verification_data = {
            "data": data_to_verify,
            "data_hash": data_hash,
            "hash_algorithm": "sha256",
            "timestamp": datetime.now().isoformat(),
            "signer": "did:brand:tw:techcorp-001",
            "signature": "0xsignature123..."  # 簡化的簽章
        }
        
        # 驗證資料完整性
        result = self.rule_engine.evaluate_rules(
            verification_data,
            [RuleCategory.VALIDATION, RuleCategory.SECURITY]
        )
        
        print(f"資料驗證結果: {'通過' if result.success else '失敗'}")
        print(f"資料雜湊: {data_hash}")
        
        return verification_data
    
    def example_end_to_end_workflow(self) -> Dict[str, Any]:
        """端到端工作流程範例"""
        print("\n=== 端到端工作流程範例 ===")
        
        # 1. 創建品牌身份
        print("步驟 1: 創建品牌身份")
        brand_data = self.example_brand_identity_creation()
        
        # 2. 報告 ESG 資料
        print("\n步驟 2: 報告 ESG 資料")
        esg_data = self.example_esg_carbon_reporting()
        
        # 3. 記錄 AI 決策
        print("\n步驟 3: 記錄 AI 決策")
        ai_data = self.example_ai_governance()
        
        # 4. GPU 加速處理
        print("\n步驟 4: GPU 加速處理")
        gpu_data = self.example_gpu_acceleration()
        
        # 5. 驗證資料完整性
        print("\n步驟 5: 驗證資料完整性")
        verification_data = self.example_verification()
        
        # 6. 綜合驗證
        print("\n步驟 6: 綜合驗證")
        complete_data = {
            "brand": brand_data,
            "esg": esg_data,
            "ai": ai_data,
            "gpu": gpu_data,
            "verification": verification_data
        }
        
        # 執行所有規則驗證
        result = self.rule_engine.evaluate_rules(complete_data)
        
        print(f"\n=== 最終驗證結果 ===")
        print(f"整體驗證: {'通過' if result.success else '失敗'}")
        print(f"總規則數: {result.total_rules}")
        print(f"通過規則: {result.passed_rules}")
        print(f"失敗規則: {result.failed_rules}")
        print(f"警告規則: {result.warning_rules}")
        print(f"執行時間: {result.execution_time_ms:.2f}ms")
        
        return complete_data
    
    def example_rule_engine_statistics(self):
        """規則引擎統計範例"""
        print("\n=== 規則引擎統計 ===")
        
        stats = self.rule_engine.get_statistics()
        
        print(f"總規則數: {stats['total_rules']}")
        print(f"快取啟用: {stats['cache_enabled']}")
        print(f"快取大小: {stats['cache_size']}")
        print(f"執行模式: {stats['execution_mode']}")
        
        print("\n規則類別統計:")
        for category, category_stats in stats['categories'].items():
            print(f"  {category}:")
            print(f"    總數: {category_stats['count']}")
            print(f"    錯誤級: {category_stats['error_count']}")
            print(f"    警告級: {category_stats['warning_count']}")
            print(f"    資訊級: {category_stats['info_count']}")


def main():
    """主函數"""
    print("BrandOS AI Infrastructure Protocol 使用範例")
    print("=" * 50)
    
    # 創建範例實例
    example = ProtocolExample()
    
    # 執行各種範例
    try:
        # 基本範例
        example.example_brand_identity_creation()
        example.example_esg_carbon_reporting()
        example.example_ai_governance()
        example.example_gpu_acceleration()
        example.example_verification()
        
        # 規則引擎統計
        example.example_rule_engine_statistics()
        
        # 端到端工作流程
        example.example_end_to_end_workflow()
        
        print("\n" + "=" * 50)
        print("所有範例執行完成！")
        
    except Exception as e:
        print(f"範例執行失敗: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
