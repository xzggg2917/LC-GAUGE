"""
API路由模块
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.schemas import (
    GreenChemistryRequest,
    EcoScaleRequest,
    ChromatogramAnalysisRequest,
    ChromatogramAnalysisResponse,
    HPLCAnalysisCreate,
    HPLCAnalysisResponse,
    APIResponse,
    # 新增完整评分系统的模型
    FullScoreRequest,
    FullScoreResponse,
    WeightSchemesResponse,
    WeightDetailsResponse
)
from app.services.green_chemistry import analyzer
from app.services import scoring_service  # 导入评分服务
from app.database.connection import get_db
from app.database.models import HPLCAnalysis
from sqlalchemy import select

router = APIRouter()


@router.post("/green-chemistry/solvent-score", tags=["绿色化学"])
async def calculate_solvent_score(request: GreenChemistryRequest):
    """计算溶剂系统的绿色化学评分"""
    try:
        result = analyzer.calculate_solvent_score(
            solvent_a=request.solvent_a,
            solvent_b=request.solvent_b,
            ratio_a=request.ratio_a,
            volume_ml=request.volume_ml
        )
        return APIResponse(
            success=True,
            message="溶剂评分计算成功",
            data=result
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/green-chemistry/eco-scale", tags=["绿色化学"])
async def calculate_eco_scale(request: EcoScaleRequest):
    """计算Eco-Scale评分"""
    try:
        result = analyzer.calculate_eco_scale(
            yield_percentage=request.yield_percentage,
            reaction_time_hours=request.reaction_time_hours,
            temperature_celsius=request.temperature_celsius,
            solvent_volume_ml=request.solvent_volume_ml
        )
        return APIResponse(
            success=True,
            message="Eco-Scale评分计算成功",
            data=result
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/analysis/chromatogram", response_model=APIResponse, tags=["色谱分析"])
async def analyze_chromatogram(request: ChromatogramAnalysisRequest):
    """分析色谱图数据"""
    try:
        result = analyzer.analyze_chromatogram(
            retention_times=request.retention_times,
            peak_areas=request.peak_areas
        )
        return APIResponse(
            success=True,
            message="色谱图分析完成",
            data=result
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analysis/hplc", response_model=APIResponse, tags=["HPLC分析"])
async def create_hplc_analysis(
    analysis: HPLCAnalysisCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建新的HPLC分析记录"""
    try:
        # 计算绿色化学评分
        green_score_data = analyzer.calculate_solvent_score(
            solvent_a=analysis.solvent_a,
            solvent_b=analysis.solvent_b,
            ratio_a=0.5,
            volume_ml=analysis.flow_rate
        )
        
        # 创建数据库记录
        db_analysis = HPLCAnalysis(
            name=analysis.name,
            description=analysis.description,
            solvent_a=analysis.solvent_a,
            solvent_b=analysis.solvent_b,
            flow_rate=analysis.flow_rate,
            column_type=analysis.column_type,
            temperature=analysis.temperature,
            green_score=green_score_data["overall_green_score"]
        )
        
        db.add(db_analysis)
        await db.commit()
        await db.refresh(db_analysis)
        
        return APIResponse(
            success=True,
            message="HPLC分析创建成功",
            data={
                "id": db_analysis.id,
                "name": db_analysis.name,
                "green_score": db_analysis.green_score
            }
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/hplc", response_model=APIResponse, tags=["HPLC分析"])
async def list_hplc_analyses(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """获取HPLC分析列表"""
    try:
        stmt = select(HPLCAnalysis).offset(skip).limit(limit)
        result = await db.execute(stmt)
        analyses = result.scalars().all()
        
        return APIResponse(
            success=True,
            message="获取分析列表成功",
            data=[
                {
                    "id": a.id,
                    "name": a.name,
                    "description": a.description,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                    "green_score": a.green_score
                }
                for a in analyses
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/solvents/list", tags=["溶剂数据库"])
async def list_solvents():
    """获取支持的溶剂列表"""
    solvents = [
        {
            "name": name,
            "hazard_score": props.hazard_score,
            "environmental_impact": props.environmental_impact,
            "health_hazard": props.health_hazard,
            "recyclability": props.recyclability
        }
        for name, props in analyzer.solvent_db.items()
    ]
    return APIResponse(
        success=True,
        message="获取溶剂列表成功",
        data=solvents
    )


# ============================================================================
# 完整评分系统API端点
# ============================================================================

@router.post("/scoring/full-score", response_model=APIResponse, tags=["评分系统"])
async def calculate_full_score(request: FullScoreRequest):
    """
    计算完整的绿色化学评分（0-100分制）
    
    返回结构包含：
    - instrument: 仪器分析阶段结果（质量、小因子、大因子、Score₁）
    - preparation: 前处理阶段结果（质量、小因子、大因子、Score₂）
    - merged: 合成后的9个小因子（用于雷达图）
    - final: 最终总分Score₃
    - schemes: 使用的权重方案
    """
    try:
        # DEBUG: Print received data
        print("\n" + "=" * 80)
        print("[Backend] Received P/R/D factors:")
        print(f"  Instrument Stage:")
        print(f"    p_factor = {request.p_factor}")
        print(f"    instrument_r_factor = {request.instrument_r_factor}")
        print(f"    instrument_d_factor = {request.instrument_d_factor}")
        print(f"  Pretreatment Stage:")
        print(f"    pretreatment_p_factor = {request.pretreatment_p_factor}")
        print(f"    pretreatment_r_factor = {request.pretreatment_r_factor}")
        print(f"    pretreatment_d_factor = {request.pretreatment_d_factor}")
        print("=" * 80 + "\n")
        
        # 转换Pydantic模型为字典
        instrument_data = request.instrument
        prep_data = request.preparation
        
        # 转换factor_matrix的格式
        inst_factor_matrix = {
            reagent: factors.model_dump()
            for reagent, factors in instrument_data.factor_matrix.items()
        }
        
        prep_factor_matrix = {
            reagent: factors.model_dump()
            for reagent, factors in prep_data.factor_matrix.items()
        }
        
        # 🔍 调试：打印接收到的因子矩阵
        print("\n" + "=" * 80)
        print("🔍 后端接收到的数据：")
        print(f"📊 仪器分析阶段:")
        print(f"   P因子 (能耗): {request.p_factor}")
        print(f"   R因子 (可回收性): {request.instrument_r_factor}")
        print(f"   D因子 (可降解性): {request.instrument_d_factor}")
        print(f"📊 前处理阶段:")
        print(f"   P因子 (能耗): {request.pretreatment_p_factor}")
        print(f"   R因子 (可回收性): {request.pretreatment_r_factor}")
        print(f"   D因子 (可降解性): {request.pretreatment_d_factor}")
        print("📋 仪器分析试剂:")
        for reagent, factors in inst_factor_matrix.items():
            print(f"  {reagent}: S1={factors.get('S1'):.3f}, S2={factors.get('S2'):.3f}, S3={factors.get('S3'):.3f}, S4={factors.get('S4'):.3f}")
        print("📋 前处理试剂:")
        for reagent, factors in prep_factor_matrix.items():
            print(f"  {reagent}: S1={factors.get('S1'):.3f}, S2={factors.get('S2'):.3f}, S3={factors.get('S3'):.3f}, S4={factors.get('S4'):.3f}")
        print("=" * 80 + "\n")
        
        # 调用评分服务
        result = scoring_service.calculate_full_scores(
            # 仪器分析数据
            instrument_time_points=instrument_data.time_points,
            instrument_composition=instrument_data.composition,
            instrument_flow_rate=instrument_data.flow_rate,
            instrument_densities=instrument_data.densities,
            instrument_factor_matrix=inst_factor_matrix,
            instrument_curve_types=instrument_data.curve_types,  # 新增：曲线类型
            
            # 样品前处理数据
            prep_volumes=prep_data.volumes,
            prep_densities=prep_data.densities,
            prep_factor_matrix=prep_factor_matrix,
            
            # P/R/D因子（分阶段）
            p_factor=request.p_factor,
            pretreatment_p_factor=request.pretreatment_p_factor,
            instrument_r_factor=request.instrument_r_factor,
            instrument_d_factor=request.instrument_d_factor,
            pretreatment_r_factor=request.pretreatment_r_factor,
            pretreatment_d_factor=request.pretreatment_d_factor,
            
            # 权重方案
            safety_scheme=request.safety_scheme,
            health_scheme=request.health_scheme,
            environment_scheme=request.environment_scheme,
            instrument_stage_scheme=request.instrument_stage_scheme,
            prep_stage_scheme=request.prep_stage_scheme,
            final_scheme=request.final_scheme,
            
            # 自定义权重（如果提供）
            custom_weights=request.custom_weights
        )
        
        # 打印调试信息
        print("=" * 80)
        print("✅ 评分计算完成！")
        print(f"📊 仪器小因子得分: {result['instrument']['sub_factors']}")
        print(f"📊 前处理小因子得分: {result['preparation']['sub_factors']}")
        print(f"📊 合成小因子得分 (merged): {result['merged']['sub_factors']}")
        print(f"🎯 最终总分 (Score₃): {result['final']['score3']}")
        print(f"🔬 仪器阶段 (Score₁): {result['instrument']['score1']}")
        print(f"🧪 前处理阶段 (Score₂): {result['preparation']['score2']}")
        print("=" * 80)
        
        return APIResponse(
            success=True,
            message="完整评分计算成功",
            data=result
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"数据验证错误: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"评分计算失败: {str(e)}")


@router.get("/scoring/weight-schemes", response_model=APIResponse, tags=["评分系统"])
async def get_weight_schemes():
    """
    获取所有可用的权重方案列表（供前端下拉框使用）
    
    返回6个类别的权重方案：
    - safety: 安全因子权重方案（4种）
    - health: 健康因子权重方案（4种）
    - environment: 环境因子权重方案（4种）
    - instrument_stage: 仪器分析阶段权重方案（4种）
    - prep_stage: 前处理阶段权重方案（4种）
    - final: 最终汇总权重方案（4种）
    """
    try:
        schemes = scoring_service.get_available_schemes()
        return APIResponse(
            success=True,
            message="获取权重方案成功",
            data=schemes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取权重方案失败: {str(e)}")


@router.get("/scoring/weight-details/{category}/{scheme}", response_model=APIResponse, tags=["评分系统"])
async def get_weight_details(category: str, scheme: str):
    """
    获取指定权重方案的具体权重值（供前端展示）
    
    参数：
        category: 类别（safety/health/environment/instrument_stage/prep_stage/final）
        scheme: 方案名称
    
    返回：
        权重值字典，如 {"S1": 0.25, "S2": 0.25, "S3": 0.25, "S4": 0.25}
    """
    try:
        weights = scoring_service.get_scheme_weights(category, scheme)
        return APIResponse(
            success=True,
            message="获取权重详情成功",
            data={
                "category": category,
                "scheme": scheme,
                "weights": weights
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取权重详情失败: {str(e)}")

