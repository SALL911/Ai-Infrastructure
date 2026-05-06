"""
品牌評分 API
提供品牌評分計算的 REST API 介面
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import asyncio

from src.scoring.brand_score_calculator import (
    brand_score_calculator, 
    BrandScoreResult, 
    ScoreCategory
)

logger = logging.getLogger(__name__)

# 創建路由器
scoring_router = APIRouter(prefix="/scoring", tags=["Brand Scoring"])


# Pydantic 模型
class BrandIdentityInput(BaseModel):
    """品牌身份輸入模型"""
    brand_id: str = Field(..., description="品牌 ID")
    did: Optional[str] = Field(None, description="去中心化身份識別符")
    credentials: List[Dict[str, Any]] = Field(default_factory=list, description="品牌憑證列表")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="品牌元資料")


class ESGInput(BaseModel):
    """ESG 輸入模型"""
    carbon_tracking: Dict[str, Any] = Field(default_factory=dict, description="碳追蹤資料")
    sustainability_metrics: Dict[str, Any] = Field(default_factory=dict, description="可持續性指標")
    social_impact: Dict[str, Any] = Field(default_factory=dict, description="社會影響")
    governance: Dict[str, Any] = Field(default_factory=dict, description="治理資料")


class CarbonInput(BaseModel):
    """碳排放輸入模型"""
    scope1_emissions: float = Field(0.0, description="範疇 1 排放量 (kg CO2e)")
    scope2_emissions: float = Field(0.0, description="範疇 2 排放量 (kg CO2e)")
    scope3_emissions: float = Field(0.0, description="範疇 3 排放量 (kg CO2e)")
    advertising_carbon: Dict[str, Any] = Field(default_factory=dict, description="廣告碳排放")
    reduction_targets: List[Dict[str, Any]] = Field(default_factory=list, description="減排目標")
    sustainability_metrics: Dict[str, Any] = Field(default_factory=dict, description="可持續性指標")


class TNFDInput(BaseModel):
    """TNFD 輸入模型"""
    biodiversity_assessment: Dict[str, Any] = Field(default_factory=dict, description="生物多樣性評估")
    deforestation_risk: Dict[str, Any] = Field(default_factory=dict, description="森林砍伐風險")
    ecosystem_services: Dict[str, Any] = Field(default_factory=dict, description="生態系統服務")
    nature_related_risks: Dict[str, Any] = Field(default_factory=dict, description="自然相關風險")


class BrandScoreRequest(BaseModel):
    """品牌評分請求模型"""
    brand: BrandIdentityInput = Field(..., description="品牌身份資料")
    esg: ESGInput = Field(..., description="ESG 資料")
    carbon: CarbonInput = Field(..., description="碳排放資料")
    tnfd: TNFDInput = Field(..., description="TNFD 資料")
    industry: Optional[str] = Field("technology", description="產業類別")
    scoring_options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="評分選項")


class BatchScoreRequest(BaseModel):
    """批次評分請求模型"""
    requests: List[BrandScoreRequest] = Field(..., description="品牌評分請求列表")
    parallel_processing: bool = Field(True, description="是否並行處理")


class ScoreResponse(BaseModel):
    """評分響應模型"""
    success: bool = Field(..., description="評分是否成功")
    brand_id: str = Field(..., description="品牌 ID")
    total_score: float = Field(..., description="總分")
    category: str = Field(..., description="評分類別")
    scoring_date: str = Field(..., description="評分日期")
    component_scores: Dict[str, Any] = Field(..., description="各維度評分")
    recommendations: List[str] = Field(..., description="改進建議")
    benchmark_comparison: Dict[str, float] = Field(..., description="基準比較")
    execution_time_ms: float = Field(..., description="執行時間 (毫秒)")


# API 端點
@scoring_router.post("/calculate", response_model=ScoreResponse)
async def calculate_brand_score(request: BrandScoreRequest):
    """
    計算品牌綜合評分
    
    整合品牌、ESG、碳排放和 TNFD 數據計算綜合評分。
    
    - **brand**: 品牌身份資料，包含 DID、憑證和元資料
    - **esg**: ESG 績效資料，包含環境、社會和治理指標
    - **carbon**: 碳排放資料，包含各範疇排放和減排目標
    - **tnfd**: TNFD 評估資料，包含生物多樣性和自然相關風險
    - **industry**: 產業類別，用於基準比較
    - **scoring_options**: 評分選項，可自定義權重和閾值
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"開始計算品牌評分: {request.brand.brand_id}")
        
        # 準備數據
        brand_data = request.brand.dict()
        esg_data = request.esg.dict()
        carbon_data = request.carbon.dict()
        tnfd_data = request.tnfd.dict()
        
        # 添加產業資訊
        brand_data['industry'] = request.industry
        
        # 計算評分
        result = brand_score_calculator.calculate_brand_score(
            brand_data, esg_data, carbon_data, tnfd_data
        )
        
        # 獲取評分摘要
        summary = brand_score_calculator.get_scoring_summary(result)
        
        # 計算執行時間
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        response = ScoreResponse(
            success=True,
            brand_id=result.brand_id,
            total_score=result.total_score,
            category=result.category.value,
            scoring_date=result.scoring_date.isoformat(),
            component_scores=summary['component_scores'],
            recommendations=result.recommendations,
            benchmark_comparison=result.benchmark_comparison,
            execution_time_ms=execution_time
        )
        
        logger.info(f"品牌評分計算完成: {result.brand_id} - {result.total_score}")
        return response
        
    except Exception as e:
        logger.error(f"品牌評分計算失敗: {e}")
        raise HTTPException(status_code=500, detail=f"評分計算失敗: {str(e)}")


@scoring_router.post("/calculate-batch")
async def calculate_batch_scores(request: BatchScoreRequest):
    """
    批次計算品牌評分
    
    支援同時計算多個品牌的評分，可選擇並行處理以提高效率。
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"開始批次計算品牌評分: {len(request.requests)} 個品牌")
        
        if request.parallel_processing:
            # 並行處理
            tasks = []
            for score_request in request.requests:
                task = asyncio.create_task(
                    _calculate_single_score_async(score_request)
                )
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
        else:
            # 串行處理
            results = []
            for score_request in request.requests:
                result = await _calculate_single_score_async(score_request)
                results.append(result)
        
        # 處理結果
        successful_results = []
        failed_results = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failed_results.append({
                    "index": i,
                    "brand_id": request.requests[i].brand.brand_id,
                    "error": str(result)
                })
            else:
                successful_results.append(result)
        
        # 計算執行時間
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        response = {
            "success": True,
            "total_requests": len(request.requests),
            "successful_count": len(successful_results),
            "failed_count": len(failed_results),
            "results": successful_results,
            "errors": failed_results,
            "execution_time_ms": execution_time,
            "parallel_processing": request.parallel_processing
        }
        
        logger.info(f"批次評分計算完成: {len(successful_results)} 成功, {len(failed_results)} 失敗")
        return response
        
    except Exception as e:
        logger.error(f"批次評分計算失敗: {e}")
        raise HTTPException(status_code=500, detail=f"批次評分計算失敗: {str(e)}")


@scoring_router.get("/benchmark/{industry}")
async def get_industry_benchmark(industry: str):
    """
    獲取產業基準資料
    
    返回指定產業的平均評分基準，用於比較分析。
    """
    try:
        if industry not in brand_score_calculator.benchmarks:
            raise HTTPException(status_code=404, detail=f"產業 '{industry}' 的基準資料不存在")
        
        benchmark = brand_score_calculator.benchmarks[industry]
        
        return {
            "industry": industry,
            "benchmark_scores": benchmark,
            "overall_average": sum(benchmark.values()) / len(benchmark),
            "last_updated": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取產業基準失敗: {e}")
        raise HTTPException(status_code=500, detail=f"獲取基準資料失敗: {str(e)}")


@scoring_router.get("/categories")
async def get_scoring_categories():
    """
    獲取評分類別定義
    
    返回所有評分類別的定義和對應的分數範圍。
    """
    categories = {
        "excellent": {
            "name": "優秀",
            "score_range": [80, 100],
            "description": "品牌在各維度表現優異，是行業領先者"
        },
        "good": {
            "name": "良好",
            "score_range": [60, 79],
            "description": "品牌表現良好，有明確的改進空間"
        },
        "average": {
            "name": "平均",
            "score_range": [40, 59],
            "description": "品牌表現一般，需要重點改進"
        },
        "poor": {
            "name": "較差",
            "score_range": [20, 39],
            "description": "品牌表現較差，需要立即採取行動"
        },
        "critical": {
            "name": "危急",
            "score_range": [0, 19],
            "description": "品牌處於危急狀態，需要全面改革"
        }
    }
    
    return {
        "categories": categories,
        "total_categories": len(categories)
    }


@scoring_router.get("/weights")
async def get_scoring_weights():
    """
    獲取評分權重配置
    
    返回各評分維度的權重配置。
    """
    weights = {
        "brand_identity": {
            "weight": brand_score_calculator.weights[brand_score_calculator.ScoringWeight.BRAND_IDENTITY],
            "description": "品牌身份權重"
        },
        "esg_performance": {
            "weight": brand_score_calculator.weights[brand_score_calculator.ScoringWeight.ESG_PERFORMANCE],
            "description": "ESG 績效權重"
        },
        "carbon_footprint": {
            "weight": brand_score_calculator.weights[brand_score_calculator.ScoringWeight.CARBON_FOOTPRINT],
            "description": "碳足跡權重"
        },
        "tnfd_assessment": {
            "weight": brand_score_calculator.weights[brand_score_calculator.ScoringWeight.TNFD_ASSESSMENT],
            "description": "TNFD 評估權重"
        }
    }
    
    total_weight = sum(w["weight"] for w in weights.values())
    
    return {
        "weights": weights,
        "total_weight": total_weight,
        "last_updated": datetime.now().isoformat()
    }


@scoring_router.get("/history/{brand_id}")
async def get_brand_score_history(brand_id: str, limit: int = 10):
    """
    獲取品牌評分歷史
    
    返回指定品牌的歷史評分記錄，用於趨勢分析。
    """
    try:
        # 這裡應該從資料庫獲取歷史記錄
        # 簡化實現，返回模擬數據
        history = [
            {
                "scoring_date": "2026-03-01T00:00:00Z",
                "total_score": 72.5,
                "category": "good",
                "component_scores": {
                    "brand_identity": 78.0,
                    "esg": 70.0,
                    "carbon_footprint": 68.0,
                    "tnfd": 74.0
                }
            },
            {
                "scoring_date": "2026-02-01T00:00:00Z",
                "total_score": 70.2,
                "category": "good",
                "component_scores": {
                    "brand_identity": 76.0,
                    "esg": 68.0,
                    "carbon_footprint": 65.0,
                    "tnfd": 72.0
                }
            }
        ]
        
        return {
            "brand_id": brand_id,
            "history": history[:limit],
            "total_records": len(history),
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"獲取品牌評分歷史失敗: {e}")
        raise HTTPException(status_code=500, detail=f"獲取歷史記錄失敗: {str(e)}")


@scoring_router.post("/compare")
async def compare_brands(brand_ids: List[str]):
    """
    比較多個品牌的評分
    
    返回多個品牌的評分比較結果。
    """
    try:
        if len(brand_ids) < 2:
            raise HTTPException(status_code=400, detail="至少需要提供 2 個品牌 ID 進行比較")
        
        if len(brand_ids) > 10:
            raise HTTPException(status_code=400, detail="最多只能比較 10 個品牌")
        
        # 這裡應該從資料庫獲取品牌評分數據
        # 簡化實現，返回模擬比較結果
        comparison = {
            "comparison_date": datetime.now().isoformat(),
            "brands": []
        }
        
        for brand_id in brand_ids:
            # 模擬品牌評分數據
            brand_score = {
                "brand_id": brand_id,
                "total_score": 75.0 + (hash(brand_id) % 20),
                "category": "good",
                "component_scores": {
                    "brand_identity": 78.0,
                    "esg": 72.0,
                    "carbon_footprint": 74.0,
                    "tnfd": 76.0
                },
                "rank": 0  # 將在下面設置
            }
            comparison["brands"].append(brand_score)
        
        # 排序並設置排名
        comparison["brands"].sort(key=lambda x: x["total_score"], reverse=True)
        for i, brand in enumerate(comparison["brands"]):
            brand["rank"] = i + 1
        
        # 添加統計信息
        scores = [brand["total_score"] for brand in comparison["brands"]]
        comparison["statistics"] = {
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "average_score": sum(scores) / len(scores),
            "score_range": max(scores) - min(scores)
        }
        
        return comparison
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"品牌比較失敗: {e}")
        raise HTTPException(status_code=500, detail=f"品牌比較失敗: {str(e)}")


# 輔助函數
async def _calculate_single_score_async(request: BrandScoreRequest) -> Dict[str, Any]:
    """異步計算單個品牌評分"""
    try:
        # 準備數據
        brand_data = request.brand.dict()
        esg_data = request.esg.dict()
        carbon_data = request.carbon.dict()
        tnfd_data = request.tnfd.dict()
        
        # 添加產業資訊
        brand_data['industry'] = request.industry
        
        # 計算評分
        result = brand_score_calculator.calculate_brand_score(
            brand_data, esg_data, carbon_data, tnfd_data
        )
        
        # 獲取評分摘要
        summary = brand_score_calculator.get_scoring_summary(result)
        
        return {
            "success": True,
            "brand_id": result.brand_id,
            "total_score": result.total_score,
            "category": result.category.value,
            "scoring_date": result.scoring_date.isoformat(),
            "component_scores": summary['component_scores'],
            "recommendations": result.recommendations,
            "benchmark_comparison": result.benchmark_comparison
        }
        
    except Exception as e:
        return {
            "success": False,
            "brand_id": request.brand.brand_id,
            "error": str(e)
        }
