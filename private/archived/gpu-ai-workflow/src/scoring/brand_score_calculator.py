"""
品牌評分計算器
整合品牌、ESG、碳排放和 TNFD 數據計算綜合品牌評分
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class ScoringWeight(Enum):
    """評分權重配置"""
    BRAND_IDENTITY = 0.25      # 品牌身份權重
    ESG_PERFORMANCE = 0.30     # ESG 績效權重
    CARBON_FOOTPRINT = 0.25     # 碳足跡權重
    TNFD_ASSESSMENT = 0.20      # TNFD 評估權重


class ScoreCategory(Enum):
    """評分類別"""
    EXCELLENT = "excellent"     # 優秀 (80-100)
    GOOD = "good"              # 良好 (60-79)
    AVERAGE = "average"        # 平均 (40-59)
    POOR = "poor"              # 較差 (20-39)
    CRITICAL = "critical"      # 危急 (0-19)


@dataclass
class BrandIdentityScore:
    """品牌身份評分"""
    did_verification: float = 0.0      # DID 驗證分數 (0-100)
    credential_completeness: float = 0.0  # 憑證完整性 (0-100)
    brand_consistency: float = 0.0     # 品牌一致性 (0-100)
    reputation_score: float = 0.0       # 聲譽分數 (0-100)
    total_score: float = 0.0            # 總分 (0-100)


@dataclass
class ESGScore:
    """ESG 評分"""
    environmental_score: float = 0.0   # 環境評分 (0-100)
    social_score: float = 0.0          # 社會評分 (0-100)
    governance_score: float = 0.0       # 治理評分 (0-100)
    sustainability_metrics: float = 0.0  # 可持續性指標 (0-100)
    total_score: float = 0.0            # 總分 (0-100)


@dataclass
class CarbonFootprintScore:
    """碳足跡評分"""
    emission_reduction: float = 0.0     # 減排成效 (0-100)
    carbon_efficiency: float = 0.0       # 碳效率 (0-100)
    renewable_energy: float = 0.0        # 可再生能源 (0-100)
    carbon_neutral_progress: float = 0.0  # 碳中和進度 (0-100)
    total_score: float = 0.0            # 總分 (0-100)


@dataclass
class TNFDScore:
    """TNFD 評分"""
    biodiversity_impact: float = 0.0     # 生物多樣性影響 (0-100)
    deforestation_risk: float = 0.0      # 森林砍伐風險 (0-100)
    ecosystem_services: float = 0.0       # 生態系統服務 (0-100)
    nature_related_risks: float = 0.0     # 自然相關風險 (0-100)
    total_score: float = 0.0            # 總分 (0-100)


@dataclass
class BrandScoreResult:
    """品牌評分結果"""
    brand_id: str
    total_score: float
    category: ScoreCategory
    brand_identity: BrandIdentityScore
    esg_score: ESGScore
    carbon_footprint: CarbonFootprintScore
    tnfd_score: TNFDScore
    scoring_date: datetime
    recommendations: List[str]
    benchmark_comparison: Dict[str, float]


class BrandScoreCalculator:
    """品牌評分計算器"""
    
    def __init__(self):
        self.weights = {
            ScoringWeight.BRAND_IDENTITY: 0.25,
            ScoringWeight.ESG_PERFORMANCE: 0.30,
            ScoringWeight.CARBON_FOOTPRINT: 0.25,
            ScoringWeight.TNFD_ASSESSMENT: 0.20
        }
        
        # 基準數據 (行業平均)
        self.benchmarks = {
            "technology": {
                "brand_identity": 75.0,
                "esg": 68.0,
                "carbon": 72.0,
                "tnfd": 65.0
            },
            "retail": {
                "brand_identity": 70.0,
                "esg": 62.0,
                "carbon": 68.0,
                "tnfd": 60.0
            },
            "finance": {
                "brand_identity": 80.0,
                "esg": 75.0,
                "carbon": 70.0,
                "tnfd": 58.0
            },
            "manufacturing": {
                "brand_identity": 65.0,
                "esg": 60.0,
                "carbon": 55.0,
                "tnfd": 52.0
            }
        }
    
    def calculate_brand_score(self, 
                           brand_data: Dict[str, Any],
                           esg_data: Dict[str, Any],
                           carbon_data: Dict[str, Any],
                           tnfd_data: Dict[str, Any]) -> BrandScoreResult:
        """
        計算品牌綜合評分
        
        Args:
            brand_data: 品牌身份數據
            esg_data: ESG 數據
            carbon_data: 碳排放數據
            tnfd_data: TNFD 數據
            
        Returns:
            BrandScoreResult: 品牌評分結果
        """
        logger.info(f"開始計算品牌評分: {brand_data.get('brand_id', 'unknown')}")
        
        # 計算各維度評分
        brand_identity_score = self._calculate_brand_identity_score(brand_data)
        esg_score = self._calculate_esg_score(esg_data)
        carbon_score = self._calculate_carbon_footprint_score(carbon_data)
        tnfd_score = self._calculate_tnfd_score(tnfd_data)
        
        # 計算加權總分
        total_score = (
            brand_identity_score.total_score * self.weights[ScoringWeight.BRAND_IDENTITY] +
            esg_score.total_score * self.weights[ScoringWeight.ESG_PERFORMANCE] +
            carbon_score.total_score * self.weights[ScoringWeight.CARBON_FOOTPRINT] +
            tnfd_score.total_score * self.weights[ScoringWeight.TNFD_ASSESSMENT]
        )
        
        # 確定評分類別
        category = self._get_score_category(total_score)
        
        # 生成建議
        recommendations = self._generate_recommendations(
            brand_identity_score, esg_score, carbon_score, tnfd_score
        )
        
        # 基準比較
        benchmark_comparison = self._get_benchmark_comparison(
            brand_data.get('industry', 'technology'),
            brand_identity_score.total_score,
            esg_score.total_score,
            carbon_score.total_score,
            tnfd_score.total_score
        )
        
        result = BrandScoreResult(
            brand_id=brand_data.get('brand_id', ''),
            total_score=round(total_score, 2),
            category=category,
            brand_identity=brand_identity_score,
            esg_score=esg_score,
            carbon_footprint=carbon_score,
            tnfd_score=tnfd_score,
            scoring_date=datetime.now(),
            recommendations=recommendations,
            benchmark_comparison=benchmark_comparison
        )
        
        logger.info(f"品牌評分計算完成: {result.brand_id} - {result.total_score}")
        return result
    
    def _calculate_brand_identity_score(self, brand_data: Dict[str, Any]) -> BrandIdentityScore:
        """計算品牌身份評分"""
        
        # DID 驗證評分
        did_score = 0.0
        if brand_data.get('did'):
            did_score = 100.0  # 有效 DID 給满分
        
        # 憑證完整性評分
        credential_score = 0.0
        credentials = brand_data.get('credentials', [])
        if credentials:
            # 根據憑證類型和數量評分
            required_creds = ['brand_registration', 'legal_entity', 'compliance_certificate']
            found_creds = sum(1 for cred in credentials if cred.get('type') in required_creds)
            credential_score = (found_creds / len(required_creds)) * 100
        
        # 品牌一致性評分
        consistency_score = 0.0
        metadata = brand_data.get('metadata', {})
        if all(key in metadata for key in ['name', 'industry', 'country']):
            consistency_score = 100.0
        
        # 聲譽評分 (基於歷史記錄和第三方評估)
        reputation_score = self._calculate_reputation_score(brand_data)
        
        total_score = (did_score + credential_score + consistency_score + reputation_score) / 4
        
        return BrandIdentityScore(
            did_verification=did_score,
            credential_completeness=credential_score,
            brand_consistency=consistency_score,
            reputation_score=reputation_score,
            total_score=total_score
        )
    
    def _calculate_esg_score(self, esg_data: Dict[str, Any]) -> ESGScore:
        """計算 ESG 評分"""
        
        # 環境評分
        env_score = 0.0
        if 'carbon_tracking' in esg_data:
            carbon = esg_data['carbon_tracking']
            # 基於減排目標和實際減排評分
            reduction_targets = carbon.get('reduction_targets', [])
            if reduction_targets:
                # 簡化計算：有減排目標給基礎分
                env_score += 40.0
                # 根據目標雄心程度加分
                for target in reduction_targets:
                    if target.get('reduction_percentage', 0) >= 50:
                        env_score += 20.0
                    elif target.get('reduction_percentage', 0) >= 30:
                        env_score += 10.0
        
        # 可持續性指標評分
        sustainability_score = 0.0
        if 'sustainability_metrics' in esg_data:
            metrics = esg_data['sustainability_metrics']
            renewable_pct = metrics.get('renewable_energy_percentage', 0)
            recycling_rate = metrics.get('recycling_rate', 0)
            
            # 可再生能源使用率評分
            sustainability_score += min(renewable_pct, 100) * 0.5
            # 回收率評分
            sustainability_score += min(recycling_rate, 100) * 0.5
        
        # 社會評分
        social_score = 0.0
        if 'social_impact' in esg_data:
            social = esg_data['social_impact']
            # 基於員工數量和多樣性評分
            employee_count = social.get('employee_count', 0)
            gender_diversity = social.get('gender_diversity', 0)
            
            if employee_count > 0:
                social_score += 30.0  # 有員工記錄給基礎分
            
            if gender_diversity >= 40:
                social_score += 40.0  # 性別多樣性達標
            elif gender_diversity >= 30:
                social_score += 25.0
            elif gender_diversity >= 20:
                social_score += 10.0
        
        # 治理評分
        governance_score = 0.0
        if 'governance' in esg_data:
            governance = esg_data['governance']
            board_independence = governance.get('board_independence', 0)
            ethics_training = governance.get('ethics_training_completion', 0)
            
            # 董事會獨立性評分
            governance_score += min(board_independence, 100) * 0.6
            # 道德培訓完成率評分
            governance_score += min(ethics_training, 100) * 0.4
        
        total_score = (env_score + sustainability_score + social_score + governance_score) / 4
        
        return ESGScore(
            environmental_score=env_score,
            social_score=social_score,
            governance_score=governance_score,
            sustainability_metrics=sustainability_score,
            total_score=total_score
        )
    
    def _calculate_carbon_footprint_score(self, carbon_data: Dict[str, Any]) -> CarbonFootprintScore:
        """計算碳足跡評分"""
        
        # 減排成效評分
        reduction_score = 0.0
        if 'reduction_targets' in carbon_data:
            targets = carbon_data['reduction_targets']
            for target in targets:
                reduction_pct = target.get('reduction_percentage', 0)
                if reduction_pct >= 50:
                    reduction_score = 100.0
                elif reduction_pct >= 30:
                    reduction_score = 80.0
                elif reduction_pct >= 20:
                    reduction_score = 60.0
                elif reduction_pct >= 10:
                    reduction_score = 40.0
                else:
                    reduction_score = 20.0
                break  # 使用最雄心的目標
        
        # 碳效率評分 (基於廣告碳排放)
        efficiency_score = 0.0
        if 'advertising_carbon' in carbon_data:
            ad_carbon = carbon_data['advertising_carbon']
            impressions = ad_carbon.get('impressions', 0)
            carbon_kg = ad_carbon.get('carbon_kg', 0)
            
            if impressions > 0 and carbon_kg > 0:
                # 計算每百萬次曝光的碳排放
                carbon_per_million = (carbon_kg / impressions) * 1000000
                
                if carbon_per_million <= 0.5:
                    efficiency_score = 100.0
                elif carbon_per_million <= 1.0:
                    efficiency_score = 80.0
                elif carbon_per_million <= 2.0:
                    efficiency_score = 60.0
                elif carbon_per_million <= 5.0:
                    efficiency_score = 40.0
                else:
                    efficiency_score = 20.0
        
        # 可再生能源評分
        renewable_score = 0.0
        if 'sustainability_metrics' in carbon_data:
            renewable_pct = carbon_data['sustainability_metrics'].get('renewable_energy_percentage', 0)
            renewable_score = min(renewable_pct, 100)
        
        # 碳中和進度評分
        neutral_score = 0.0
        total_emissions = (
            carbon_data.get('scope1_emissions', 0) +
            carbon_data.get('scope2_emissions', 0) +
            carbon_data.get('scope3_emissions', 0)
        )
        
        if total_emissions > 0:
            # 基於減排趨勢評分
            if reduction_score >= 80:
                neutral_score = 80.0
            elif reduction_score >= 60:
                neutral_score = 60.0
            elif reduction_score >= 40:
                neutral_score = 40.0
            else:
                neutral_score = 20.0
        
        total_score = (reduction_score + efficiency_score + renewable_score + neutral_score) / 4
        
        return CarbonFootprintScore(
            emission_reduction=reduction_score,
            carbon_efficiency=efficiency_score,
            renewable_energy=renewable_score,
            carbon_neutral_progress=neutral_score,
            total_score=total_score
        )
    
    def _calculate_tnfd_score(self, tnfd_data: Dict[str, Any]) -> TNFDScore:
        """計算 TNFD 評分"""
        
        # 生物多樣性影響評分
        biodiversity_score = 0.0
        if 'biodiversity_assessment' in tnfd_data:
            assessment = tnfd_data['biodiversity_assessment']
            impact_level = assessment.get('impact_level', 'unknown')
            
            if impact_level == 'positive':
                biodiversity_score = 100.0
            elif impact_level == 'neutral':
                biodiversity_score = 70.0
            elif impact_level == 'low_negative':
                biodiversity_score = 40.0
            elif impact_level == 'moderate_negative':
                biodiversity_score = 20.0
            else:
                biodiversity_score = 0.0
        
        # 森林砍伐風險評分
        deforestation_score = 0.0
        if 'deforestation_risk' in tnfd_data:
            risk = tnfd_data['deforestation_risk']
            risk_level = risk.get('risk_level', 'unknown')
            
            if risk_level == 'very_low':
                deforestation_score = 100.0
            elif risk_level == 'low':
                deforestation_score = 80.0
            elif risk_level == 'medium':
                deforestation_score = 60.0
            elif risk_level == 'high':
                deforestation_score = 30.0
            else:
                deforestation_score = 0.0
        
        # 生態系統服務評分
        ecosystem_score = 0.0
        if 'ecosystem_services' in tnfd_data:
            services = tnfd_data['ecosystem_services']
            protection_level = services.get('protection_level', 0)
            ecosystem_score = min(protection_level, 100)
        
        # 自然相關風險評分
        nature_risk_score = 0.0
        if 'nature_related_risks' in tnfd_data:
            risks = tnfd_data['nature_related_risks']
            mitigation_level = risks.get('mitigation_level', 0)
            nature_risk_score = min(mitigation_level, 100)
        
        total_score = (biodiversity_score + deforestation_score + ecosystem_score + nature_risk_score) / 4
        
        return TNFDScore(
            biodiversity_impact=biodiversity_score,
            deforestation_risk=deforestation_score,
            ecosystem_services=ecosystem_score,
            nature_related_risks=nature_risk_score,
            total_score=total_score
        )
    
    def _calculate_reputation_score(self, brand_data: Dict[str, Any]) -> float:
        """計算聲譽評分"""
        # 簡化實現：基於品牌年齡和完整性
        metadata = brand_data.get('metadata', {})
        registration_date = metadata.get('registration_date')
        
        if registration_date:
            try:
                reg_date = datetime.fromisoformat(registration_date.replace('Z', '+00:00'))
                days_since_registration = (datetime.now() - reg_date).days
                
                # 基於註冊時間給分
                if days_since_registration >= 365 * 5:  # 5年以上
                    return 80.0
                elif days_since_registration >= 365 * 2:  # 2年以上
                    return 60.0
                elif days_since_registration >= 365:  # 1年以上
                    return 40.0
                else:
                    return 20.0
            except:
                pass
        
        return 50.0  # 預設分數
    
    def _get_score_category(self, score: float) -> ScoreCategory:
        """根據分數確定評分類別"""
        if score >= 80:
            return ScoreCategory.EXCELLENT
        elif score >= 60:
            return ScoreCategory.GOOD
        elif score >= 40:
            return ScoreCategory.AVERAGE
        elif score >= 20:
            return ScoreCategory.POOR
        else:
            return ScoreCategory.CRITICAL
    
    def _generate_recommendations(self, 
                                brand_identity: BrandIdentityScore,
                                esg: ESGScore,
                                carbon: CarbonFootprintScore,
                                tnfd: TNFDScore) -> List[str]:
        """生成改進建議"""
        recommendations = []
        
        # 品牌身份建議
        if brand_identity.did_verification < 100:
            recommendations.append("完善 DID 驗證，確保品牌身份的可信度")
        
        if brand_identity.credential_completeness < 80:
            recommendations.append("補充必要的品牌憑證，提高完整性")
        
        # ESG 建議
        if esg.environmental_score < 60:
            recommendations.append("加強環境管理，設定更具雄心的減排目標")
        
        if esg.social_score < 60:
            recommendations.append("提升社會責任表現，改善員工多樣性和福利")
        
        if esg.governance_score < 60:
            recommendations.append("完善公司治理結構，提高董事會獨立性")
        
        # 碳足跡建議
        if carbon.emission_reduction < 60:
            recommendations.append("制定更積極的碳減排策略和時間表")
        
        if carbon.carbon_efficiency < 60:
            recommendations.append("優化廣告投放策略，降低單位曝光的碳排放")
        
        if carbon.renewable_energy < 60:
            recommendations.append("增加可再生能源使用比例")
        
        # TNFD 建議
        if tnfd.biodiversity_impact < 60:
            recommendations.append("評估並改善對生物多樣性的影響")
        
        if tnfd.deforestation_risk < 60:
            recommendations.append("加強森林保護措施，降低森林砍伐風險")
        
        return recommendations
    
    def _get_benchmark_comparison(self, 
                                industry: str,
                                brand_score: float,
                                esg_score: float,
                                carbon_score: float,
                                tnfd_score: float) -> Dict[str, float]:
        """獲取基準比較"""
        benchmark = self.benchmarks.get(industry, self.benchmarks['technology'])
        
        return {
            "brand_identity_vs_benchmark": brand_score - benchmark['brand_identity'],
            "esg_vs_benchmark": esg_score - benchmark['esg'],
            "carbon_vs_benchmark": carbon_score - benchmark['carbon'],
            "tnfd_vs_benchmark": tnfd_score - benchmark['tnfd'],
            "overall_vs_benchmark": (
                brand_score + esg_score + carbon_score + tnfd_score
            ) / 4 - sum(benchmark.values()) / 4
        }
    
    def get_scoring_summary(self, result: BrandScoreResult) -> Dict[str, Any]:
        """獲取評分摘要"""
        return {
            "brand_id": result.brand_id,
            "total_score": result.total_score,
            "category": result.category.value,
            "scoring_date": result.scoring_date.isoformat(),
            "component_scores": {
                "brand_identity": {
                    "score": result.brand_identity.total_score,
                    "weight": self.weights[ScoringWeight.BRAND_IDENTITY],
                    "weighted_score": result.brand_identity.total_score * self.weights[ScoringWeight.BRAND_IDENTITY]
                },
                "esg": {
                    "score": result.esg_score.total_score,
                    "weight": self.weights[ScoringWeight.ESG_PERFORMANCE],
                    "weighted_score": result.esg_score.total_score * self.weights[ScoringWeight.ESG_PERFORMANCE]
                },
                "carbon_footprint": {
                    "score": result.carbon_footprint.total_score,
                    "weight": self.weights[ScoringWeight.CARBON_FOOTPRINT],
                    "weighted_score": result.carbon_footprint.total_score * self.weights[ScoringWeight.CARBON_FOOTPRINT]
                },
                "tnfd": {
                    "score": result.tnfd_score.total_score,
                    "weight": self.weights[ScoringWeight.TNFD_ASSESSMENT],
                    "weighted_score": result.tnfd_score.total_score * self.weights[ScoringWeight.TNFD_ASSESSMENT]
                }
            },
            "recommendations": result.recommendations,
            "benchmark_comparison": result.benchmark_comparison
        }


# 全域實例
brand_score_calculator = BrandScoreCalculator()
