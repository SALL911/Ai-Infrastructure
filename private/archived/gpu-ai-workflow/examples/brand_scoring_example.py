"""
品牌評分計算範例
展示如何使用 calculate_brand_score 功能
"""

import json
import asyncio
from datetime import datetime
from typing import Dict, Any

# 導入評分計算器
from src.scoring.brand_score_calculator import brand_score_calculator
from src.api.scoring_api import BrandScoreRequest, BrandIdentityInput, ESGInput, CarbonInput, TNFDInput


def create_sample_brand_data() -> Dict[str, Any]:
    """創建樣本品牌數據"""
    return {
        "brand_id": "techcorp-001",
        "did": "did:brand:tw:techcorp-001",
        "credentials": [
            {
                "type": "brand_registration",
                "issuer": "did:brand:tw:registry-001",
                "issuanceDate": "2020-01-15T00:00:00Z"
            },
            {
                "type": "legal_entity",
                "issuer": "did:brand:tw:legal-registry",
                "issuanceDate": "2020-01-20T00:00:00Z"
            },
            {
                "type": "compliance_certificate",
                "issuer": "did:brand:tw:compliance-authority",
                "issuanceDate": "2023-06-01T00:00:00Z"
            }
        ],
        "metadata": {
            "name": "TechCorp",
            "industry": "technology",
            "country": "TW",
            "registration_date": "2020-01-15T00:00:00Z",
            "status": "active"
        }
    }


def create_sample_esg_data() -> Dict[str, Any]:
    """創建樣本 ESG 數據"""
    return {
        "carbon_tracking": {
            "scope1_emissions": 1000.5,
            "scope2_emissions": 2000.0,
            "scope3_emissions": 5000.0,
            "reduction_targets": [
                {
                    "target_year": 2030,
                    "reduction_percentage": 50.0,
                    "baseline_year": 2020,
                    "scope": "all"
                },
                {
                    "target_year": 2025,
                    "reduction_percentage": 25.0,
                    "baseline_year": 2020,
                    "scope": "scope1"
                }
            ]
        },
        "sustainability_metrics": {
            "energy_consumption": 100000,
            "water_usage": 5000,
            "waste_generated": 1000,
            "recycling_rate": 75.5,
            "renewable_energy_percentage": 60.0
        },
        "social_impact": {
            "employee_count": 500,
            "gender_diversity": 42.0,
            "community_investment": 100000,
            "training_hours": 40
        },
        "governance": {
            "board_independence": 85.0,
            "ethics_training_completion": 95.0,
            "compliance_incidents": 0,
            "audit_frequency": 4
        }
    }


def create_sample_carbon_data() -> Dict[str, Any]:
    """創建樣本碳排放數據"""
    return {
        "scope1_emissions": 1000.5,
        "scope2_emissions": 2000.0,
        "scope3_emissions": 5000.0,
        "advertising_carbon": {
            "platform": "meta",
            "campaign_name": "Spring Sale 2026",
            "impressions": 1000000,
            "device_type": "all",
            "region": "TW",
            "measurement_date": datetime.now().isoformat(),
            "energy_factor": 0.000001,
            "emission_factor": 0.5,
            "carbon_kg": 0.5
        },
        "reduction_targets": [
            {
                "target_year": 2030,
                "reduction_percentage": 50.0,
                "baseline_year": 2020,
                "scope": "all"
            }
        ],
        "sustainability_metrics": {
            "renewable_energy_percentage": 60.0
        }
    }


def create_sample_tnfd_data() -> Dict[str, Any]:
    """創建樣本 TNFD 數據"""
    return {
        "biodiversity_assessment": {
            "impact_level": "neutral",
            "assessment_date": "2026-01-15T00:00:00Z",
            "protected_species_count": 0,
            "habitat_preservation": 75.0
        },
        "deforestation_risk": {
            "risk_level": "low",
            "assessment_date": "2026-01-15T00:00:00Z",
            "forest_area_monitored": 1000,
            "deforestation_rate": 0.1
        },
        "ecosystem_services": {
            "protection_level": 70.0,
            "services_preserved": ["water_purification", "carbon_sequestration", "soil_conservation"],
            "investment_amount": 50000
        },
        "nature_related_risks": {
            "mitigation_level": 80.0,
            "risk_assessment_date": "2026-01-15T00:00:00Z",
            "identified_risks": ["climate_change", "biodiversity_loss"],
            "mitigation_strategies": ["renewable_energy", "habitat_restoration"]
        }
    }


def example_single_brand_scoring():
    """單一品牌評分範例"""
    print("=" * 60)
    print("單一品牌評分範例")
    print("=" * 60)
    
    # 創建樣本數據
    brand_data = create_sample_brand_data()
    esg_data = create_sample_esg_data()
    carbon_data = create_sample_carbon_data()
    tnfd_data = create_sample_tnfd_data()
    
    print(f"品牌 ID: {brand_data['brand_id']}")
    print(f"產業: {brand_data['metadata']['industry']}")
    print(f"國家: {brand_data['metadata']['country']}")
    print()
    
    # 計算評分
    result = brand_score_calculator.calculate_brand_score(
        brand_data, esg_data, carbon_data, tnfd_data
    )
    
    # 顯示結果
    print("📊 評分結果")
    print("-" * 40)
    print(f"總分: {result.total_score:.2f}")
    print(f"評級: {result.category.value}")
    print(f"評分日期: {result.scoring_date.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 顯示各維度評分
    print("📈 各維度評分")
    print("-" * 40)
    print(f"品牌身份: {result.brand_identity.total_score:.2f}")
    print(f"  - DID 驗證: {result.brand_identity.did_verification:.2f}")
    print(f"  - 憑證完整性: {result.brand_identity.credential_completeness:.2f}")
    print(f"  - 品牌一致性: {result.brand_identity.brand_consistency:.2f}")
    print(f"  - 聲譽評分: {result.brand_identity.reputation_score:.2f}")
    print()
    
    print(f"ESG 績效: {result.esg_score.total_score:.2f}")
    print(f"  - 環境評分: {result.esg_score.environmental_score:.2f}")
    print(f"  - 社會評分: {result.esg_score.social_score:.2f}")
    print(f"  - 治理評分: {result.esg_score.governance_score:.2f}")
    print(f"  - 可持續性指標: {result.esg_score.sustainability_metrics:.2f}")
    print()
    
    print(f"碳足跡: {result.carbon_footprint.total_score:.2f}")
    print(f"  - 減排成效: {result.carbon_footprint.emission_reduction:.2f}")
    print(f"  - 碳效率: {result.carbon_footprint.carbon_efficiency:.2f}")
    print(f"  - 可再生能源: {result.carbon_footprint.renewable_energy:.2f}")
    print(f"  - 碳中和進度: {result.carbon_footprint.carbon_neutral_progress:.2f}")
    print()
    
    print(f"TNFD 評估: {result.tnfd_score.total_score:.2f}")
    print(f"  - 生物多樣性影響: {result.tnfd_score.biodiversity_impact:.2f}")
    print(f"  - 森林砍伐風險: {result.tnfd_score.deforestation_risk:.2f}")
    print(f"  - 生態系統服務: {result.tnfd_score.ecosystem_services:.2f}")
    print(f"  - 自然相關風險: {result.tnfd_score.nature_related_risks:.2f}")
    print()
    
    # 顯示基準比較
    print("🏆 基準比較")
    print("-" * 40)
    for metric, diff in result.benchmark_comparison.items():
        status = "↑" if diff > 0 else "↓" if diff < 0 else "="
        print(f"{metric}: {diff:+.2f} {status}")
    print()
    
    # 顯示建議
    print("💡 改進建議")
    print("-" * 40)
    for i, recommendation in enumerate(result.recommendations, 1):
        print(f"{i}. {recommendation}")
    print()
    
    return result


def example_batch_scoring():
    """批次評分範例"""
    print("=" * 60)
    print("批次評分範例")
    print("=" * 60)
    
    # 創建多個品牌的數據
    brands_data = [
        {
            "brand_id": "techcorp-001",
            "industry": "technology",
            "name": "TechCorp"
        },
        {
            "brand_id": "greenretail-002",
            "industry": "retail",
            "name": "GreenRetail"
        },
        {
            "brand_id": "financehub-003",
            "industry": "finance",
            "name": "FinanceHub"
        }
    ]
    
    results = []
    
    for brand_info in brands_data:
        print(f"正在計算 {brand_info['name']} ({brand_info['brand_id']}) 的評分...")
        
        # 使用基礎樣本數據，根據產業調整
        brand_data = create_sample_brand_data()
        brand_data['brand_id'] = brand_info['brand_id']
        brand_data['metadata']['industry'] = brand_info['industry']
        brand_data['metadata']['name'] = brand_info['name']
        
        esg_data = create_sample_esg_data()
        carbon_data = create_sample_carbon_data()
        tnfd_data = create_sample_tnfd_data()
        
        # 根據產業調整數據
        if brand_info['industry'] == 'retail':
            esg_data['social_impact']['employee_count'] = 1000
            esg_data['social_impact']['gender_diversity'] = 65.0
            carbon_data['scope3_emissions'] = 8000.0
        elif brand_info['industry'] == 'finance':
            esg_data['governance']['board_independence'] = 90.0
            esg_data['governance']['ethics_training_completion'] = 100.0
            carbon_data['scope1_emissions'] = 500.0
        
        result = brand_score_calculator.calculate_brand_score(
            brand_data, esg_data, carbon_data, tnfd_data
        )
        
        results.append({
            "brand_info": brand_info,
            "result": result
        })
    
    # 顯示比較結果
    print("\n📊 批次評分結果")
    print("-" * 60)
    print(f"{'排名':<4} {'品牌':<15} {'產業':<12} {'總分':<8} {'評級':<10}")
    print("-" * 60)
    
    # 按總分排序
    results.sort(key=lambda x: x['result'].total_score, reverse=True)
    
    for rank, item in enumerate(results, 1):
        brand_info = item['brand_info']
        result = item['result']
        print(f"{rank:<4} {brand_info['name']:<15} {brand_info['industry']:<12} "
              f"{result.total_score:<8.2f} {result.category.value:<10}")
    
    print()
    
    # 顯示統計信息
    scores = [item['result'].total_score for item in results]
    print("📈 統計信息")
    print("-" * 30)
    print(f"最高分: {max(scores):.2f}")
    print(f"最低分: {min(scores):.2f}")
    print(f"平均分: {sum(scores) / len(scores):.2f}")
    print(f"分數範圍: {max(scores) - min(scores):.2f}")
    print()
    
    return results


def example_industry_benchmark():
    """產業基準範例"""
    print("=" * 60)
    print("產業基準分析")
    print("=" * 60)
    
    # 獲取所有產業基準
    industries = list(brand_score_calculator.benchmarks.keys())
    
    print("🏭 產業基準比較")
    print("-" * 50)
    print(f"{'產業':<15} {'品牌身份':<10} {'ESG':<8} {'碳足跡':<10} {'TNFD':<8} {'平均':<8}")
    print("-" * 50)
    
    for industry in industries:
        benchmark = brand_score_calculator.benchmarks[industry]
        avg = sum(benchmark.values()) / len(benchmark)
        print(f"{industry:<15} {benchmark['brand_identity']:<10.1f} "
              f"{benchmark['esg']:<8.1f} {benchmark['carbon']:<10.1f} "
              f"{benchmark['tnfd']:<8.1f} {avg:<8.1f}")
    
    print()
    
    # 創建一個品牌並與基準比較
    brand_data = create_sample_brand_data()
    esg_data = create_sample_esg_data()
    carbon_data = create_sample_carbon_data()
    tnfd_data = create_sample_tnfd_data()
    
    result = brand_score_calculator.calculate_brand_score(
        brand_data, esg_data, carbon_data, tnfd_data
    )
    
    print(f"🎯 {brand_data['metadata']['name']} vs 產業基準比較")
    print("-" * 50)
    print(f"品牌身份: {result.brand_identity.total_score:.2f} "
          f"({result.benchmark_comparison['brand_identity_vs_benchmark']:+.2f})")
    print(f"ESG 績效: {result.esg_score.total_score:.2f} "
          f"({result.benchmark_comparison['esg_vs_benchmark']:+.2f})")
    print(f"碳足跡: {result.carbon_footprint.total_score:.2f} "
          f"({result.benchmark_comparison['carbon_vs_benchmark']:+.2f})")
    print(f"TNFD 評估: {result.tnfd_score.total_score:.2f} "
          f"({result.benchmark_comparison['tnfd_vs_benchmark']:+.2f})")
    print(f"整體表現: {result.total_score:.2f} "
          f"({result.benchmark_comparison['overall_vs_benchmark']:+.2f})")
    print()


def example_scoring_trends():
    """評分趨勢範例"""
    print("=" * 60)
    print("評分趨勢分析")
    print("=" * 60)
    
    # 模擬歷史數據
    brand_data = create_sample_brand_data()
    esg_data = create_sample_esg_data()
    carbon_data = create_sample_carbon_data()
    tnfd_data = create_sample_tnfd_data()
    
    # 創建不同時間點的數據
    time_periods = [
        {"date": "2024-Q1", "improvement": 0.8},
        {"date": "2024-Q2", "improvement": 0.85},
        {"date": "2024-Q3", "improvement": 0.9},
        {"date": "2024-Q4", "improvement": 0.95},
        {"date": "2025-Q1", "improvement": 1.0}
    ]
    
    print("📈 歷史評分趨勢")
    print("-" * 40)
    print(f"{'時間':<10} {'總分':<8} {'品牌身份':<10} {'ESG':<8} {'碳足跡':<10} {'TNFD':<8}")
    print("-" * 40)
    
    for period in time_periods:
        # 調整數據模擬改進
        adjusted_esg = esg_data.copy()
        adjusted_esg['sustainability_metrics']['renewable_energy_percentage'] *= period['improvement']
        adjusted_esg['social_impact']['gender_diversity'] *= period['improvement']
        
        adjusted_carbon = carbon_data.copy()
        adjusted_carbon['renewable_energy_percentage'] = 60.0 * period['improvement']
        
        result = brand_score_calculator.calculate_brand_score(
            brand_data, adjusted_esg, adjusted_carbon, tnfd_data
        )
        
        print(f"{period['date']:<10} {result.total_score:<8.2f} "
              f"{result.brand_identity.total_score:<10.2f} {result.esg_score.total_score:<8.2f} "
              f"{result.carbon_footprint.total_score:<10.2f} {result.tnfd_score.total_score:<8.2f}")
    
    print()


def main():
    """主函數"""
    print("BrandOS 品牌評分計算範例")
    print("=" * 60)
    
    try:
        # 執行各種範例
        example_single_brand_scoring()
        example_batch_scoring()
        example_industry_benchmark()
        example_scoring_trends()
        
        print("=" * 60)
        print("所有範例執行完成！")
        print("\n📋 使用說明:")
        print("1. 單一品牌評分: 計算一個品牌的綜合評分")
        print("2. 批次評分: 同時計算多個品牌的評分並比較")
        print("3. 產業基準: 與行業平均水準比較")
        print("4. 趨勢分析: 分析評分的歷史變化趨勢")
        print("\n🎯 評分維度:")
        print("- 品牌身份 (25%): DID 驗驗證、憑證完整性、品牌一致性")
        print("- ESG 績效 (30%): 環境、社會、治理、可持續性")
        print("- 碳足跡 (25%): 減排成效、碳效率、可再生能源")
        print("- TNFD 評估 (20%): 生物多樣性、森林風險、生態系統")
        
    except Exception as e:
        print(f"範例執行失敗: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
