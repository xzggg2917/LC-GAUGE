"""
HPLC绿色化学评分服务模块
实现完整的0-100分制评分体系

评分体系架构（5层）：
Layer 0: 原始数据（试剂因子、P因子、质量数据）
Layer 1: 小因子归一化（300g公式）
Layer 2: 小因子加权合成（图8权重）← 雷达图展示层
Layer 3: 大因子合成（图3/4/5权重）
Layer 4: 阶段总分（Score₁和Score₂）
Layer 5: 最终总分（Score₃）
"""

from typing import Dict, List, Tuple, Optional
import math


# ============================================================================
# 权重配置常量（12种方案）
# ============================================================================

# 图8：最终汇总权重方案（4种）
FINAL_WEIGHTS = {
    "Standard": {"instrument": 0.6, "preparation": 0.4},
    "Complex_Prep": {"instrument": 0.3, "preparation": 0.7},
    "Direct_Online": {"instrument": 0.8, "preparation": 0.2},
    "Equal": {"instrument": 0.5, "preparation": 0.5}
}

# 图3：安全因子S权重方案（4种）
SAFETY_WEIGHTS = {
    "PBT_Balanced": {"S1": 0.25, "S2": 0.25, "S3": 0.25, "S4": 0.25},
    "Frontier_Focus": {"S1": 0.10, "S2": 0.60, "S3": 0.15, "S4": 0.15},
    "Personnel_Exposure": {"S1": 0.10, "S2": 0.20, "S3": 0.20, "S4": 0.50},
    "Material_Transport": {"S1": 0.50, "S2": 0.20, "S3": 0.20, "S4": 0.10}
}

# 图4：健康因子H权重方案（4种）
HEALTH_WEIGHTS = {
    "Occupational_Exposure": {"H1": 0.70, "H2": 0.30},
    "Operation_Protection": {"H1": 0.30, "H2": 0.70},
    "Strict_Compliance": {"H1": 0.90, "H2": 0.10},
    "Absolute_Balance": {"H1": 0.50, "H2": 0.50}
}

# 图5：环境因子E权重方案（4种）
ENVIRONMENT_WEIGHTS = {
    "PBT_Balanced": {"E1": 0.334, "E2": 0.333, "E3": 0.333},
    "Emission_Compliance": {"E1": 0.10, "E2": 0.80, "E3": 0.10},
    "Deep_Impact": {"E1": 0.10, "E2": 0.10, "E3": 0.80},
    "Degradation_Priority": {"E1": 0.70, "E2": 0.15, "E3": 0.15}
}

# 图6：仪器分析阶段权重方案（4种，6因子含P）
INSTRUMENT_STAGE_WEIGHTS = {
    "Balanced": {"S": 0.18, "H": 0.18, "E": 0.18, "R": 0.18, "D": 0.18, "P": 0.10},
    "Safety_First": {"S": 0.30, "H": 0.30, "E": 0.10, "R": 0.10, "D": 0.10, "P": 0.10},
    "Eco_Friendly": {"S": 0.10, "H": 0.10, "E": 0.30, "R": 0.25, "D": 0.15, "P": 0.10},
    "Energy_Efficient": {"S": 0.10, "H": 0.10, "E": 0.15, "R": 0.15, "D": 0.10, "P": 0.40}
}

# 图7：样品前处理阶段权重方案（4种，6因子含P）
# 注意：为了与仪器分析阶段保持一致，使用相同的方案名称
PREPARATION_STAGE_WEIGHTS = {
    "Balanced": {"S": 0.18, "H": 0.18, "E": 0.18, "R": 0.18, "D": 0.18, "P": 0.10},
    "Safety_First": {"S": 0.30, "H": 0.30, "E": 0.10, "R": 0.10, "D": 0.10, "P": 0.10},  # 与仪器分析相同
    "Eco_Friendly": {"S": 0.10, "H": 0.10, "E": 0.30, "R": 0.25, "D": 0.15, "P": 0.10},  # 与仪器分析相同
    "Energy_Efficient": {"S": 0.10, "H": 0.10, "E": 0.15, "R": 0.15, "D": 0.10, "P": 0.40}  # 与仪器分析相同
}


# ============================================================================
# Layer 0: 质量计算函数
# ============================================================================

def calculate_curve_integral_factor(curve_type: str) -> float:
    """
    计算不同曲线类型从0到1的积分系数
    
    对于曲线 y(t) = y0 + (y1-y0) * f(t/T)，积分 ∫[0→T] y(t) dt
    = y0*T + (y1-y0) * T * ∫[0→1] f(u) du
    
    返回 ∫[0→1] f(u) du 的值
    
    参数：
        curve_type: 曲线类型字符串
    
    返回：
        float: 积分系数（0-1之间）
    """
    # 线性曲线: f(u) = u, 积分 = 0.5
    if curve_type in ['linear', 'initial', None]:
        return 0.5
    
    # Pre-step: f(u) = 1, 积分 = 1
    elif curve_type == 'pre-step':
        return 1.0
    
    # Post-step: f(u) = 0, 积分 = 0
    elif curve_type == 'post-step':
        return 0.0
    
    # Convex curves: f(u) = 1 - (1-u)^n
    # ∫[0→1] [1 - (1-u)^n] du = 1 - 1/(n+1) = n/(n+1)
    elif curve_type == 'weak-convex':    # n=2
        return 2.0 / 3.0  # 0.6667
    elif curve_type == 'medium-convex':  # n=3
        return 3.0 / 4.0  # 0.75
    elif curve_type == 'strong-convex':  # n=4
        return 4.0 / 5.0  # 0.8
    elif curve_type == 'ultra-convex':   # n=6
        return 6.0 / 7.0  # 0.8571
    
    # Concave curves: f(u) = u^n
    # ∫[0→1] u^n du = 1/(n+1)
    elif curve_type == 'weak-concave':   # n=2
        return 1.0 / 3.0  # 0.3333
    elif curve_type == 'medium-concave': # n=3
        return 1.0 / 4.0  # 0.25
    elif curve_type == 'strong-concave': # n=4
        return 1.0 / 5.0  # 0.2
    elif curve_type == 'ultra-concave':  # n=6
        return 1.0 / 7.0  # 0.1429
    
    # 默认使用线性
    else:
        return 0.5


def calculate_gradient_integral(
    time_points: List[float],
    composition_data: Dict[str, List[float]],
    flow_rate: float,
    reagent_densities: Dict[str, float],
    curve_types: List[str] = None
) -> Dict[str, float]:
    """
    计算梯度洗脱流动相的总质量（支持11种曲线类型的精确积分）
    
    参数：
        time_points: 时间点列表（分钟），如 [0, 5, 15, 20]
        composition_data: 各试剂的组成百分比，如 {"MeOH": [10, 50, 95, 95], "H2O": [90, 50, 5, 5]}
        flow_rate: 流速（mL/min）
        reagent_densities: 试剂密度（g/mL），如 {"MeOH": 0.791, "H2O": 1.0}
        curve_types: 曲线类型列表，如 ['initial', 'linear', 'weak-convex', 'linear']
                     长度应为 len(time_points)，表示到达每个时间点时使用的曲线类型
    
    返回：
        Dict[str, float]: 各试剂的总质量（克），如 {"MeOH": 123.45, "H2O": 234.56}
    """
    reagent_masses = {}
    
    # 如果没有提供曲线类型，默认全部使用线性
    if curve_types is None:
        curve_types = ['linear'] * len(time_points)
    
    for reagent, percentages in composition_data.items():
        if reagent not in reagent_densities:
            raise ValueError(f"缺少试剂 {reagent} 的密度数据")
        
        density = reagent_densities[reagent]
        total_mass = 0.0
        
        # 对每个时间段进行积分
        for i in range(len(time_points) - 1):
            t1, t2 = time_points[i], time_points[i + 1]
            p1, p2 = percentages[i] / 100.0, percentages[i + 1] / 100.0  # 转换为小数
            
            # 获取该段的曲线类型（使用目标时间点的曲线类型）
            curve_type = curve_types[i + 1] if i + 1 < len(curve_types) else 'linear'
            
            # 计算该曲线的积分系数
            integral_factor = calculate_curve_integral_factor(curve_type)
            
            # 该时间段的时长
            dt = t2 - t1
            
            # 该时间段的体积（mL）
            volume_segment = flow_rate * dt
            
            # 该时间段该试剂的平均百分比（考虑曲线类型）
            # y(t) = p1 + (p2-p1) * f(t/T)
            # 积分 = p1*T + (p2-p1) * T * integral_factor
            # 平均值 = (p1*T + (p2-p1)*T*factor) / T = p1 + (p2-p1)*factor
            avg_percentage = p1 + (p2 - p1) * integral_factor
            
            # 该时间段该试剂的体积（mL）
            reagent_volume = volume_segment * avg_percentage
            
            # 该时间段该试剂的质量（g）
            reagent_mass = reagent_volume * density
            
            total_mass += reagent_mass
        
        reagent_masses[reagent] = total_mass
    
    return reagent_masses


def calculate_prep_masses(
    reagent_volumes: Dict[str, float],
    reagent_densities: Dict[str, float]
) -> Dict[str, float]:
    """
    计算样品前处理试剂的质量
    
    参数：
        reagent_volumes: 试剂体积（mL），如 {"Acetone": 50.0, "Hexane": 30.0}
        reagent_densities: 试剂密度（g/mL），如 {"Acetone": 0.784, "Hexane": 0.655}
    
    返回：
        Dict[str, float]: 各试剂的质量（克）
    """
    reagent_masses = {}
    
    for reagent, volume in reagent_volumes.items():
        if reagent not in reagent_densities:
            raise ValueError(f"缺少试剂 {reagent} 的密度数据")
        
        density = reagent_densities[reagent]
        mass = volume * density
        reagent_masses[reagent] = mass
    
    return reagent_masses


# ============================================================================
# Layer 1: 小因子归一化（基于色谱类型的动态基准）
# ============================================================================

def normalize_sub_factor(
    reagent_masses: Dict[str, float],
    reagent_factors: Dict[str, float],
    sub_factor_name: str
) -> float:
    """
    计算单个小因子的归一化得分（0-100分）
    
    新公式：Score = min{45 × log₁₀(1 + 14 × Σ), 100}
    其中 Σ = Σ(m × F)
    
    参数：
        reagent_masses: 试剂质量（克），如 {"MeOH": 123.45, "H2O": 234.56}
        reagent_factors: 试剂的该小因子值（0.0-1.0），如 {"MeOH": 0.8, "H2O": 0.2}
        sub_factor_name: 小因子名称（用于错误提示）
    
    返回：
        float: 归一化后的小因子得分（0-100）
    """
    weighted_sum = 0.0
    
    for reagent, mass in reagent_masses.items():
        if reagent not in reagent_factors:
            raise ValueError(f"试剂 {reagent} 缺少 {sub_factor_name} 因子值")
        
        factor_value = reagent_factors[reagent]
        
        # 验证因子值范围
        if not (0 <= factor_value <= 1):
            raise ValueError(f"试剂 {reagent} 的 {sub_factor_name} 因子值 {factor_value} 超出范围 [0, 1]")
        
        weighted_sum += mass * factor_value
    
    # 使用新的归一化公式：Score = min{45 × log₁₀(1 + 14 × Σ), 100}
    if weighted_sum <= 0:
        score = 0.0
    else:
        score = min(100.0, 45.0 * math.log10(1 + 14 * weighted_sum))
    
    return score


def calculate_all_sub_factors(
    reagent_masses: Dict[str, float],
    reagent_factor_matrix: Dict[str, Dict[str, float]]
) -> Dict[str, float]:
    """
    计算所有9个小因子的归一化得分
    
    使用新公式：Score = min{45 × log₁₀(1 + 14 × Σ), 100}
    其中 Σ = Σ(m × F)
    
    参数：
        reagent_masses: 试剂质量（克）
        reagent_factor_matrix: 试剂因子矩阵，如：
            {
                "MeOH": {"S1": 0.8, "S2": 0.6, ..., "E3": 0.5},
                "H2O": {"S1": 0.2, "S2": 0.1, ..., "E3": 0.1}
            }
    
    返回：
        Dict[str, float]: 9个小因子的得分，如 {"S1": 85.3, "S2": 72.1, ..., "E3": 45.6}
    """
    sub_factor_names = ["S1", "S2", "S3", "S4", "H1", "H2", "E1", "E2", "E3"]
    sub_factor_scores = {}
    
    for sub_factor in sub_factor_names:
        # 提取所有试剂的该小因子值
        reagent_factors = {
            reagent: factors[sub_factor]
            for reagent, factors in reagent_factor_matrix.items()
        }
        
        # 计算归一化得分
        score = normalize_sub_factor(reagent_masses, reagent_factors, sub_factor)
        sub_factor_scores[sub_factor] = score
    
    return sub_factor_scores


# ============================================================================
# Layer 2: 小因子加权合成（图8权重）
# ============================================================================

def merge_sub_factors(
    instrument_sub_scores: Dict[str, float],
    preparation_sub_scores: Dict[str, float],
    final_weight_scheme: str = "Standard"
) -> Dict[str, float]:
    """
    使用图8权重合成仪器和前处理的小因子得分（用于雷达图展示）
    
    公式：小因子_最终 = (仪器×W_Inst) + (前处理×W_Pre)
    
    参数：
        instrument_sub_scores: 仪器分析的9个小因子得分
        preparation_sub_scores: 样品前处理的9个小因子得分
        final_weight_scheme: 最终汇总权重方案（Standard/Complex_Prep/Direct_Online/Equal）
    
    返回：
        Dict[str, float]: 合成后的9个小因子得分（用于雷达图）
    """
    if final_weight_scheme not in FINAL_WEIGHTS:
        raise ValueError(f"未知的最终权重方案：{final_weight_scheme}")
    
    weights = FINAL_WEIGHTS[final_weight_scheme]
    w_inst = weights["instrument"]
    w_prep = weights["preparation"]
    
    merged_scores = {}
    sub_factor_names = ["S1", "S2", "S3", "S4", "H1", "H2", "E1", "E2", "E3"]
    
    for sub_factor in sub_factor_names:
        inst_score = instrument_sub_scores.get(sub_factor, 0.0)
        prep_score = preparation_sub_scores.get(sub_factor, 0.0)
        
        merged_score = (inst_score * w_inst) + (prep_score * w_prep)
        merged_scores[sub_factor] = merged_score
    
    return merged_scores


# ============================================================================
# Layer 3: 大因子合成（图3/4/5权重）
# ============================================================================

def calculate_major_factor(
    sub_factor_scores: Dict[str, float],
    major_factor_type: str,
    weight_scheme: str,
    custom_weights: Dict[str, float] = None  # 自定义权重
) -> float:
    """
    根据小因子得分计算大因子得分（S/H/E）
    
    参数：
        sub_factor_scores: 小因子得分字典
        major_factor_type: 大因子类型（"S"/"H"/"E"）
        weight_scheme: 权重方案名称
        custom_weights: 自定义权重（当weight_scheme为"Custom"时使用）
    
    返回：
        float: 大因子得分（0-100）
    """
    # 如果是Custom方案，使用自定义权重
    if weight_scheme == "Custom":
        if custom_weights is None:
            raise ValueError(f"Custom权重方案需要提供custom_weights参数")
        weights = custom_weights
        if major_factor_type == "S":
            sub_factors = ["S1", "S2", "S3", "S4"]
        elif major_factor_type == "H":
            sub_factors = ["H1", "H2"]
        elif major_factor_type == "E":
            sub_factors = ["E1", "E2", "E3"]
        else:
            raise ValueError(f"未知的大因子类型：{major_factor_type}")
    else:
        # 使用预定义权重方案
        if major_factor_type == "S":
            if weight_scheme not in SAFETY_WEIGHTS:
                raise ValueError(f"未知的安全因子权重方案：{weight_scheme}")
            weights = SAFETY_WEIGHTS[weight_scheme]
            sub_factors = ["S1", "S2", "S3", "S4"]
        
        elif major_factor_type == "H":
            if weight_scheme not in HEALTH_WEIGHTS:
                raise ValueError(f"未知的健康因子权重方案：{weight_scheme}")
            weights = HEALTH_WEIGHTS[weight_scheme]
            sub_factors = ["H1", "H2"]
        
        elif major_factor_type == "E":
            if weight_scheme not in ENVIRONMENT_WEIGHTS:
                raise ValueError(f"未知的环境因子权重方案：{weight_scheme}")
            weights = ENVIRONMENT_WEIGHTS[weight_scheme]
            sub_factors = ["E1", "E2", "E3"]
        
        else:
            raise ValueError(f"未知的大因子类型：{major_factor_type}")
    
    # 加权求和
    major_score = sum(
        sub_factor_scores.get(sub, 0.0) * weights[sub]
        for sub in sub_factors
    )
    
    return major_score


# ============================================================================
# Layer 4: 阶段总分计算（Score₁和Score₂）
# ============================================================================

def calculate_score1(
    major_factors: Dict[str, float],
    p_factor: float,
    r_factor: float,
    d_factor: float,
    weight_scheme: str = "Balanced",
    custom_weights: Dict[str, float] = None  # 自定义权重
) -> float:
    """
    计算Score₁（仪器分析阶段，6因子含P）
    
    参数：
        major_factors: 大因子得分，如 {"S": 85.3, "H": 72.1, "E": 68.9}
        p_factor: P因子（性能因子，0-100分）
        r_factor: R因子（可回收性，0-100分，从0-1分制转换）
        d_factor: D因子（可降解性，0-100分，从0-1分制转换）
        weight_scheme: 权重方案（Balanced/Safety_Priority/Eco_Priority/Efficiency_Priority）
        custom_weights: 自定义权重（当weight_scheme为"Custom"时使用）
    
    返回：
        float: Score₁（0-100）
    """
    # 如果是Custom方案，使用自定义权重
    if weight_scheme == "Custom":
        if custom_weights is None:
            raise ValueError(f"Custom权重方案需要提供custom_weights参数")
        weights = custom_weights
    else:
        if weight_scheme not in INSTRUMENT_STAGE_WEIGHTS:
            raise ValueError(f"未知的仪器阶段权重方案：{weight_scheme}")
        weights = INSTRUMENT_STAGE_WEIGHTS[weight_scheme]
    
    score1 = (
        major_factors["S"] * weights["S"] +
        major_factors["H"] * weights["H"] +
        major_factors["E"] * weights["E"] +
        p_factor * weights["P"] +
        r_factor * weights["R"] +
        d_factor * weights["D"]
    )
    
    return score1


def calculate_score2(
    major_factors: Dict[str, float],
    r_factor: float,
    d_factor: float,
    p_factor: float = 0.0,
    weight_scheme: str = "Balanced",
    custom_weights: Dict[str, float] = None  # 自定义权重
) -> float:
    """
    计算Score₂（样品前处理阶段，6因子含P）
    
    参数：
        major_factors: 大因子得分，如 {"S": 78.5, "H": 81.2, "E": 75.6}
        r_factor: R因子（可回收性，0-100分）
        d_factor: D因子（可降解性，0-100分）
        p_factor: P因子（能耗，0-100分，默认为0）
        weight_scheme: 权重方案（Balanced/Operation_Protection/Circular_Economy/Environmental_Tower）
        custom_weights: 自定义权重（当weight_scheme为"Custom"时使用）
    
    返回：
        float: Score₂（0-100）
    """
    # 如果是Custom方案，使用自定义权重
    if weight_scheme == "Custom":
        if custom_weights is None:
            raise ValueError(f"Custom权重方案需要提供custom_weights参数")
        weights = custom_weights
    else:
        if weight_scheme not in PREPARATION_STAGE_WEIGHTS:
            raise ValueError(f"未知的前处理阶段权重方案：{weight_scheme}")
        weights = PREPARATION_STAGE_WEIGHTS[weight_scheme]
    
    score2 = (
        major_factors["S"] * weights["S"] +
        major_factors["H"] * weights["H"] +
        major_factors["E"] * weights["E"] +
        r_factor * weights["R"] +
        d_factor * weights["D"] +
        p_factor * weights["P"]
    )
    
    return score2


# ============================================================================
# Layer 5: 最终总分计算（Score₃）
# ============================================================================

def calculate_score3(
    score1: float,
    score2: float,
    weight_scheme: str = "Standard",
    custom_weights: Dict[str, float] = None  # 自定义权重
) -> float:
    """
    计算Score₃（最终绿色化学总分）
    
    公式：Score₃ = (Score₁ × W_Inst) + (Score₂ × W_Pre)
    
    参数：
        score1: 仪器分析阶段得分
        score2: 样品前处理阶段得分
        weight_scheme: 最终汇总权重方案（Standard/Complex_Prep/Direct_Online/Equal）
        custom_weights: 自定义权重（当weight_scheme为"Custom"时使用）
    
    返回：
        float: Score₃（0-100）
    """
    # 如果是Custom方案，使用自定义权重
    if weight_scheme == "Custom":
        if custom_weights is None:
            raise ValueError(f"Custom权重方案需要提供custom_weights参数")
        weights = custom_weights
    else:
        if weight_scheme not in FINAL_WEIGHTS:
            raise ValueError(f"未知的最终权重方案：{weight_scheme}")
        weights = FINAL_WEIGHTS[weight_scheme]
    
    score3 = (score1 * weights["instrument"]) + (score2 * weights["preparation"])
    
    return score3


# ============================================================================
# 完整评分流程封装
# ============================================================================

def calculate_full_scores(
    # 仪器分析数据
    instrument_time_points: List[float],
    instrument_composition: Dict[str, List[float]],
    instrument_flow_rate: float,
    instrument_densities: Dict[str, float],
    instrument_factor_matrix: Dict[str, Dict[str, float]],
    
    # 样品前处理数据
    prep_volumes: Dict[str, float],
    prep_densities: Dict[str, float],
    prep_factor_matrix: Dict[str, Dict[str, float]],
    
    # P/R/D因子（分阶段）
    p_factor: float,
    pretreatment_p_factor: float,  # 前处理阶段P因子 (0-100)
    instrument_r_factor: float,  # 仪器分析阶段R因子 (0-100)
    instrument_d_factor: float,  # 仪器分析阶段D因子 (0-100)
    pretreatment_r_factor: float,  # 前处理阶段R因子 (0-100)
    pretreatment_d_factor: float,  # 前处理阶段D因子 (0-100)
    
    # 可选参数（必须放在最后，都有默认值）
    instrument_curve_types: List[str] = None,  # 曲线类型
    safety_scheme: str = "PBT_Balanced",
    health_scheme: str = "Absolute_Balance",
    environment_scheme: str = "PBT_Balanced",
    instrument_stage_scheme: str = "Balanced",
    prep_stage_scheme: str = "Balanced",
    final_scheme: str = "Standard",
    custom_weights: Dict[str, Dict[str, float]] = None  # 自定义权重配置
) -> Dict:
    """
    执行完整的评分流程，返回所有层级的评分结果
    
    返回结构：
    {
        "instrument": {
            "masses": {...},
            "sub_factors": {...},
            "major_factors": {...},
            "score1": float
        },
        "preparation": {
            "masses": {...},
            "sub_factors": {...},
            "major_factors": {...},
            "score2": float
        },
        "merged": {
            "sub_factors": {...},  # 用于雷达图
        },
        "final": {
            "score3": float
        }
    }
    """
    # 打印接收到的P/R/D因子和权重方案
    print("\n" + "=" * 80)
    print("🎯 评分计算开始")
    print(f"🔬 仪器分析阶段:")
    print(f"   ⚡ P因子 (能耗): {p_factor:.2f}")
    print(f"   ♻️ R因子 (可回收性): {instrument_r_factor:.2f}")
    print(f"   🗑️ D因子 (可降解性): {instrument_d_factor:.2f}")
    print(f"🧪 前处理阶段:")
    print(f"   ⚡ P因子 (能耗): {pretreatment_p_factor:.2f}")
    print(f"   ♻️ R因子 (可回收性): {pretreatment_r_factor:.2f}")
    print(f"   🗑️ D因子 (可降解性): {pretreatment_d_factor:.2f}")
    print(f"📋 权重方案:")
    print(f"  - Safety: {safety_scheme}")
    print(f"  - Health: {health_scheme}")
    print(f"  - Environment: {environment_scheme}")
    print(f"  - Instrument Stage: {instrument_stage_scheme}")
    print(f"  - Prep Stage: {prep_stage_scheme}")
    print(f"  - Final: {final_scheme}")
    print(f"🎯 自定义权重 (custom_weights): {custom_weights}")
    print("=" * 80 + "\n")
    
    # ========== 仪器分析阶段 ==========
    
    # Layer 0: 计算质量
    inst_masses = calculate_gradient_integral(
        instrument_time_points,
        instrument_composition,
        instrument_flow_rate,
        instrument_densities,
        instrument_curve_types  # 传递曲线类型
    )
    
    print(f"🔍 仪器分析质量计算结果: {inst_masses}")
    
    # Layer 1: 小因子归一化（使用新公式）
    inst_sub_scores = calculate_all_sub_factors(inst_masses, instrument_factor_matrix)
    
    print(f"🔍 仪器分析小因子得分: {inst_sub_scores}")
    
    # Layer 3: 大因子合成
    inst_major_S = calculate_major_factor(
        inst_sub_scores, "S", safety_scheme, 
        custom_weights=custom_weights.get('safety') if custom_weights and safety_scheme == 'Custom' else None
    )
    inst_major_H = calculate_major_factor(
        inst_sub_scores, "H", health_scheme,
        custom_weights=custom_weights.get('health') if custom_weights and health_scheme == 'Custom' else None
    )
    inst_major_E = calculate_major_factor(
        inst_sub_scores, "E", environment_scheme,
        custom_weights=custom_weights.get('environment') if custom_weights and environment_scheme == 'Custom' else None
    )
    inst_major_factors = {"S": inst_major_S, "H": inst_major_H, "E": inst_major_E}
    
    print(f"🎯 仪器分析大因子得分: S={inst_major_S:.2f}, H={inst_major_H:.2f}, E={inst_major_E:.2f}")
    
    # Layer 4: Score₁（使用仪器分析阶段的R/D）
    score1 = calculate_score1(
        inst_major_factors,
        p_factor,
        instrument_r_factor,
        instrument_d_factor,
        instrument_stage_scheme,
        custom_weights=custom_weights.get('stage') if custom_weights and instrument_stage_scheme == 'Custom' else None
    )
    
    print(f"📊 仪器分析阶段 Score₁ = {score1:.2f} (使用权重方案: {instrument_stage_scheme})")
    
    # ========== 样品前处理阶段 ==========
    
    # Layer 0: 计算质量
    prep_masses = calculate_prep_masses(prep_volumes, prep_densities)
    
    print(f"🔍 前处理质量计算结果: {prep_masses}")
    
    # Layer 1: 小因子归一化（使用新公式）
    prep_sub_scores = calculate_all_sub_factors(prep_masses, prep_factor_matrix)
    
    print(f"🔍 前处理小因子得分: {prep_sub_scores}")
    
    # Layer 3: 大因子合成
    prep_major_S = calculate_major_factor(
        prep_sub_scores, "S", safety_scheme,
        custom_weights=custom_weights.get('safety') if custom_weights and safety_scheme == 'Custom' else None
    )
    prep_major_H = calculate_major_factor(
        prep_sub_scores, "H", health_scheme,
        custom_weights=custom_weights.get('health') if custom_weights and health_scheme == 'Custom' else None
    )
    prep_major_E = calculate_major_factor(
        prep_sub_scores, "E", environment_scheme,
        custom_weights=custom_weights.get('environment') if custom_weights and environment_scheme == 'Custom' else None
    )
    prep_major_factors = {"S": prep_major_S, "H": prep_major_H, "E": prep_major_E}
    
    print(f"🎯 前处理大因子得分: S={prep_major_S:.2f}, H={prep_major_H:.2f}, E={prep_major_E:.2f}")
    
    # Layer 4: Score₂（使用前处理阶段的R/D/P）
    score2 = calculate_score2(
        prep_major_factors,
        pretreatment_r_factor,
        pretreatment_d_factor,
        p_factor=pretreatment_p_factor,  # 使用传入的前处理阶段P因子
        weight_scheme=prep_stage_scheme,
        custom_weights=custom_weights.get('stage') if custom_weights and prep_stage_scheme == 'Custom' else None
    )
    
    print(f"📊 前处理阶段 Score₂ = {score2:.2f} (使用权重方案: {prep_stage_scheme})")
    
    # ========== Layer 2: 小因子加权合成（用于雷达图） ==========
    merged_sub_scores = merge_sub_factors(
        inst_sub_scores,
        prep_sub_scores,
        final_scheme
    )
    
    # ========== Layer 5: 最终总分 ==========
    score3 = calculate_score3(
        score1, score2, final_scheme,
        custom_weights=custom_weights.get('final') if custom_weights and final_scheme == 'Custom' else None
    )
    
    print(f"🏆 最终总分 Score₃ = {score3:.2f} (使用权重方案: {final_scheme})")
    print(f"   仪器阶段贡献: {score1:.2f}, 前处理阶段贡献: {score2:.2f}")
    print("=" * 80 + "\n")
    
    # 返回完整结果
    return {
        "instrument": {
            "masses": inst_masses,
            "sub_factors": inst_sub_scores,
            "major_factors": inst_major_factors,
            "score1": round(score1, 2)
        },
        "preparation": {
            "masses": prep_masses,
            "sub_factors": prep_sub_scores,
            "major_factors": prep_major_factors,
            "score2": round(score2, 2)
        },
        "merged": {
            "sub_factors": {k: round(v, 2) for k, v in merged_sub_scores.items()}
        },
        "final": {
            "score3": round(score3, 2)
        },
        "additional_factors": {
            "P": round(p_factor, 2),  # 能耗因子（兼容旧版，保留仪器分析P）
            "instrument_P": round(p_factor, 2),  # 仪器分析P因子
            "pretreatment_P": round(pretreatment_p_factor, 2),  # 前处理P因子
            "instrument_R": round(instrument_r_factor, 2),  # 仪器分析R因子
            "instrument_D": round(instrument_d_factor, 2),  # 仪器分析D因子
            "pretreatment_R": round(pretreatment_r_factor, 2),  # 前处理R因子
            "pretreatment_D": round(pretreatment_d_factor, 2)   # 前处理D因子
        },
        "schemes": {
            "safety_scheme": safety_scheme,
            "health_scheme": health_scheme,
            "environment_scheme": environment_scheme,
            "instrument_stage_scheme": instrument_stage_scheme,
            "prep_stage_scheme": prep_stage_scheme,
            "final_scheme": final_scheme
        }
    }


# ============================================================================
# 工具函数
# ============================================================================

def get_available_schemes() -> Dict[str, List[str]]:
    """
    获取所有可用的权重方案列表（供前端下拉框使用）
    
    返回：
    {
        "safety": ["PBT_Balanced", "Frontier_Focus", ...],
        "health": ["Occupational_Exposure", ...],
        ...
    }
    """
    return {
        "safety": list(SAFETY_WEIGHTS.keys()),
        "health": list(HEALTH_WEIGHTS.keys()),
        "environment": list(ENVIRONMENT_WEIGHTS.keys()),
        "instrument_stage": list(INSTRUMENT_STAGE_WEIGHTS.keys()),
        "prep_stage": list(PREPARATION_STAGE_WEIGHTS.keys()),
        "final": list(FINAL_WEIGHTS.keys())
    }


def get_scheme_weights(category: str, scheme: str) -> Dict:
    """
    获取指定权重方案的具体权重值（供前端展示）
    
    参数：
        category: 类别（safety/health/environment/instrument_stage/prep_stage/final）
        scheme: 方案名称
    
    返回：
        Dict: 权重值字典
    """
    weight_maps = {
        "safety": SAFETY_WEIGHTS,
        "health": HEALTH_WEIGHTS,
        "environment": ENVIRONMENT_WEIGHTS,
        "instrument_stage": INSTRUMENT_STAGE_WEIGHTS,
        "prep_stage": PREPARATION_STAGE_WEIGHTS,
        "final": FINAL_WEIGHTS
    }
    
    if category not in weight_maps:
        raise ValueError(f"未知的权重类别：{category}")
    
    weight_dict = weight_maps[category]
    
    if scheme not in weight_dict:
        raise ValueError(f"类别 {category} 中未找到方案：{scheme}")
    
    return weight_dict[scheme]
