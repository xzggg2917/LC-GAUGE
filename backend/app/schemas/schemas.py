"""
Pydantic数据模型
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class HPLCAnalysisCreate(BaseModel):
    """创建HPLC分析请求"""
    name: str = Field(..., description="分析名称")
    description: Optional[str] = Field(None, description="分析描述")
    solvent_a: str = Field(..., description="溶剂A")
    solvent_b: str = Field(..., description="溶剂B")
    flow_rate: float = Field(..., description="流速(mL/min)")
    column_type: str = Field(..., description="色谱柱类型")
    temperature: float = Field(..., description="温度(℃)")


class HPLCAnalysisResponse(BaseModel):
    """HPLC分析响应"""
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    solvent_a: str
    solvent_b: str
    flow_rate: float
    column_type: str
    temperature: float
    green_score: Optional[float]
    eco_scale_score: Optional[float]
    
    class Config:
        from_attributes = True


class GreenChemistryRequest(BaseModel):
    """绿色化学评估请求"""
    solvent_a: str = Field(..., description="溶剂A名称")
    solvent_b: str = Field(..., description="溶剂B名称")
    ratio_a: float = Field(0.5, description="溶剂A比例", ge=0, le=1)
    volume_ml: float = Field(1.0, description="总体积(mL)", gt=0)


class EcoScaleRequest(BaseModel):
    """Eco-Scale评估请求"""
    yield_percentage: float = Field(..., description="产率百分比", ge=0, le=100)
    reaction_time_hours: float = Field(..., description="反应时间(小时)", gt=0)
    temperature_celsius: float = Field(..., description="温度(℃)")
    solvent_volume_ml: float = Field(..., description="溶剂体积(mL)", gt=0)


class ChromatogramAnalysisRequest(BaseModel):
    """色谱图分析请求"""
    retention_times: List[float] = Field(..., description="保留时间列表")
    peak_areas: List[float] = Field(..., description="峰面积列表")


class ChromatogramAnalysisResponse(BaseModel):
    """色谱图分析响应"""
    num_peaks: int
    main_peak_retention_time: float
    main_peak_area: float
    total_area: float
    purity_percentage: float
    average_resolution: float
    peaks: List[Dict[str, float]]


class APIResponse(BaseModel):
    """通用API响应"""
    success: bool
    message: str
    data: Optional[Any] = None


# ============================================================================
# 完整评分系统的Pydantic模型
# ============================================================================

class ReagentFactors(BaseModel):
    """试剂因子数据"""
    S1: float = Field(..., ge=0, le=1, description="S1-释放潜力")
    S2: float = Field(..., ge=0, le=1, description="S2-火灾/爆炸")
    S3: float = Field(..., ge=0, le=1, description="S3-反应/分解")
    S4: float = Field(..., ge=0, le=1, description="S4-急性毒性")
    H1: float = Field(..., ge=0, le=1, description="H1-慢性毒性")
    H2: float = Field(..., ge=0, le=1, description="H2-刺激性")
    E1: float = Field(..., ge=0, le=1, description="E1-持久性")
    E2: float = Field(..., ge=0, le=1, description="E2-排放")
    E3: float = Field(..., ge=0, le=1, description="E3-水体危害")


class InstrumentAnalysisData(BaseModel):
    """仪器分析阶段数据"""
    time_points: List[float] = Field(..., description="梯度时间点(分钟)")
    composition: Dict[str, List[float]] = Field(..., description="试剂组成百分比")
    flow_rate: float = Field(..., gt=0, description="流速(mL/min)")
    densities: Dict[str, float] = Field(..., description="试剂密度(g/mL)")
    factor_matrix: Dict[str, ReagentFactors] = Field(..., description="试剂因子矩阵")
    curve_types: List[str] = Field(default=None, description="曲线类型列表(可选，默认为linear)")


class PreparationData(BaseModel):
    """样品前处理阶段数据"""
    volumes: Dict[str, float] = Field(..., description="试剂体积(mL)")
    densities: Dict[str, float] = Field(..., description="试剂密度(g/mL)")
    factor_matrix: Dict[str, ReagentFactors] = Field(..., description="试剂因子矩阵")


class FullScoreRequest(BaseModel):
    """完整评分请求"""
    instrument: InstrumentAnalysisData = Field(..., description="仪器分析数据")
    preparation: PreparationData = Field(..., description="样品前处理数据")
    p_factor: float = Field(..., ge=0, description="仪器分析P因子-能耗(0-100)")
    pretreatment_p_factor: float = Field(0.0, ge=0, description="前处理P因子-能耗(0-100)")
    
    # R/D因子分阶段
    instrument_r_factor: float = Field(..., ge=0, description="仪器分析阶段R因子(0-100)")
    instrument_d_factor: float = Field(..., ge=0, description="仪器分析阶段D因子(0-100)")
    pretreatment_r_factor: float = Field(..., ge=0, description="前处理阶段R因子(0-100)")
    pretreatment_d_factor: float = Field(..., ge=0, description="前处理阶段D因子(0-100)")
    
    # 权重方案选择
    safety_scheme: str = Field("PBT_Balanced", description="安全因子权重方案")
    health_scheme: str = Field("Absolute_Balance", description="健康因子权重方案")
    environment_scheme: str = Field("PBT_Balanced", description="环境因子权重方案")
    instrument_stage_scheme: str = Field("Balanced", description="仪器分析阶段权重方案")
    prep_stage_scheme: str = Field("Balanced", description="前处理阶段权重方案")
    final_scheme: str = Field("Standard", description="最终汇总权重方案")
    
    # 自定义权重（可选，当方案为Custom时使用）
    custom_weights: Optional[Dict[str, Dict[str, float]]] = Field(None, description="自定义权重配置")


class FullScoreResponse(BaseModel):
    """完整评分响应"""
    instrument: Dict[str, Any] = Field(..., description="仪器分析阶段结果")
    preparation: Dict[str, Any] = Field(..., description="前处理阶段结果")
    merged: Dict[str, Any] = Field(..., description="合成后的小因子(雷达图用)")
    final: Dict[str, Any] = Field(..., description="最终总分")
    schemes: Dict[str, str] = Field(..., description="使用的权重方案")


class WeightSchemesResponse(BaseModel):
    """权重方案列表响应"""
    safety: List[str]
    health: List[str]
    environment: List[str]
    instrument_stage: List[str]
    prep_stage: List[str]
    final: List[str]


class WeightDetailsResponse(BaseModel):
    """权重详情响应"""
    category: str
    scheme: str
    weights: Dict[str, float]
