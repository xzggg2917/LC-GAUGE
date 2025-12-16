# HPLC绿色化学评分系统 - 计算规则与逻辑完整说明

## 目录
1. [系统概述](#系统概述)
2. [数据流程](#数据流程)
3. [试剂因子数据结构](#试剂因子数据结构)
4. [质量计算](#质量计算)
5. [小因子归一化](#小因子归一化)
6. [大因子合成](#大因子合成)
7. [P/R/D附加因子](#prd附加因子)
8. [阶段评分](#阶段评分)
9. [最终总分](#最终总分)
10. [权重方案](#权重方案)
11. [颜色分级系统](#颜色分级系统)
12. [数据持久化](#数据持久化)

---

## 系统概述

### 核心评分模型
本系统采用**五层评分架构**：

```
Layer 0: 质量计算 (Mass Calculation) - 支持11种梯度曲线
   ↓
Layer 1: 小因子归一化 (9个小因子，0-100分制) - 对数公式
   ↓
Layer 2: 小因子加权合成 (用于雷达图)
   ↓
Layer 3: 大因子合成 (S, H, E三个大因子)
   ↓
Layer 4: 阶段评分 (Score₁仪器, Score₂前处理)
   ↓
Layer 5: 最终总分 (Score₃)
```

### 评分维度
- **9个小因子**: S1, S2, S3, S4 (安全), H1, H2 (健康), E1, E2, E3 (环境)
- **3个大因子**: S (Safety), H (Health), E (Environment)
- **3个附加因子**: P (Power能耗), R (Regeneration可回收性), D (Disposal可降解性)

### 分数范围
- **所有因子**: 0-100分制
- **解释**: 分数越低越环保，分数越高越不环保

### 核心特性
- **11种梯度曲线类型**: 线性、凸曲线(4种)、凹曲线(4种)、阶跃(2种)
- **对数归一化公式**: Score = min{45 × log₁₀(1 + 14 × Σ), 100}
- **12种权重方案**: 灵活适配不同实验场景

---

## 数据流程

### 1. 用户输入数据
```
Factors页面 → 试剂因子库
   ↓
HPLC Gradient页面 → 梯度程序配置
   ↓
Methods页面 → 方法配置（前处理 + 仪器类型）
   ↓
点击"Calculate Score"
```

### 2. 前端计算流程
```typescript
// 1. 读取梯度数据
localStorage.getItem('hplc_gradient_data')

// 2. 读取因子数据
localStorage.getItem('hplc_factors_data')

// 3. 计算P因子（能耗）
P = calculatePowerScore()

// 4. 计算R和D因子（归一化）
{R, D} = calculateRDFactors()

// 5. 构建请求数据
requestData = {
  instrument: {...},
  preparation: {...},
  p_factor: P,
  r_factor: R,
  d_factor: D,
  chromatography_type: "HPLC_UV",
  ...权重方案
}

// 6. 发送到后端API
POST /api/v1/scoring/full-score
```

### 3. 后端计算流程
```python
# 1. 接收数据并验证 (Pydantic)
request: FullScoreRequest

# 2. 计算仪器分析质量
inst_masses = calculate_gradient_integral(...)

# 3. 计算前处理质量
prep_masses = calculate_prep_masses(...)

# 4. 归一化小因子
inst_sub_scores = calculate_all_sub_factors(inst_masses, ...)
prep_sub_scores = calculate_all_sub_factors(prep_masses, ...)

# 5. 合成大因子
inst_major = {S, H, E}
prep_major = {S, H, E}

# 6. 计算阶段评分
score1 = calculate_score1(inst_major, P, R, D, ...)
score2 = calculate_score2(prep_major, R, D, ...)

# 7. 计算最终总分
score3 = calculate_score3(score1, score2, ...)

# 8. 返回结果
return {instrument, preparation, merged, final, additional_factors, schemes}
```

---

## 试剂因子数据结构

### 因子字段定义（Factors页面）

```typescript
interface ReagentFactor {
  id: string
  name: string                  // 试剂名称
  density: number              // 密度 (g/mL)
  
  // 9个小因子 (0-1范围)
  releasePotential: number     // S1: Release Potential (释放潜力)
  fireExplos: number          // S2: Fire/Explosives (火灾/爆炸)
  reactDecom: number          // S3: Reaction/Decomposition (反应/分解)
  acuteToxicity: number       // S4: Acute Toxicity (急性毒性)
  chronicToxicity: number     // H1: Chronic Toxicity (慢性毒性)
  irritation: number          // H2: Irritation (刺激性)
  persistency: number         // E1: Persistency (持久性)
  airHazard: number           // E2: Air Hazard (空气危害)
  waterHazard: number         // E3: Water Hazard (水危害)
  
  // 预计算的大因子（用于快速显示，不参与实际计算）
  safetyScore: number         // S因子总和
  healthScore: number         // H因子总和
  envScore: number            // E因子总和
  
  // 附加因子
  regeneration: number        // R因子: 可回收性 (0-1范围)
  disposal: number            // D因子: 可降解性 (0-2范围，历史遗留)
}
```

### 重要说明
1. **密度为0的特殊试剂**：
   - `CO2`: 所有因子为0
   - `Water`: 所有因子为0
   - 这些试剂会出现在图表中，但贡献值为0

2. **disposal字段的特殊性**：
   - 原始值域：0-2
   - 在计算中**直接使用原值**，不做除以2的转换
   - 示例：disposal=2表示难以处理，disposal=0表示易于处理

---

## 质量计算

### 1. 仪器分析阶段质量计算（梯度积分）

**函数**: `calculate_gradient_integral()`

**输入**:
- `time_points`: 时间点数组 [t₀, t₁, t₂, ...] (分钟)
- `composition`: 各试剂在每个时间点的百分比
  ```python
  {
    "MeOH": [50.0, 60.0, 80.0],
    "H2O": [50.0, 40.0, 20.0]
  }
  ```
- `flow_rate`: 流速 (mL/min)
- `densities`: 试剂密度字典
- `curve_types`: 曲线类型 ["linear", "step", ...]

**计算步骤**（支持曲线积分）:

```python
# 对每个试剂单独计算
for reagent in reagents:
    total_volume = 0
    
    # 对每个时间段进行积分
    for i in range(len(time_points) - 1):
        t_start = time_points[i]
        t_end = time_points[i + 1]
        dt = t_end - t_start  # 时间段长度（分钟）
        
        # 获取起始和结束时的百分比
        c_start = composition[reagent][i] / 100
        c_end = composition[reagent][i + 1] / 100
        
        # 获取该段的曲线类型并计算积分系数
        curve_type = curve_types[i + 1]
        integral_factor = calculate_curve_integral_factor(curve_type)
        
        # 根据曲线类型计算平均浓度（精确积分）
        # y(t) = c_start + (c_end - c_start) × f(t/T)
        # 平均值 = c_start + (c_end - c_start) × integral_factor
        if curve_type == "step":
            c_avg = c_start  # 阶跃：使用起始值
        elif curve_type == "linear":
            c_avg = (c_start + c_end) / 2  # 线性：取平均（factor=0.5）
        else:  # curve_6 到 curve_11（非线性曲线）
            c_avg = c_start + (c_end - c_start) * integral_factor
        
        # 计算该时间段的体积
        segment_volume = flow_rate * dt * c_avg
        total_volume += segment_volume
    
    # 体积转换为质量
    mass = total_volume * densities[reagent]
    masses[reagent] = mass  # 单位：克(g)
```

**曲线积分系数表**（支持11种曲线类型）:

| 曲线类型 | 英文名称 | 积分系数 | 数学表达 | 曲线形状 |
|---------|---------|---------|---------|----------|
| linear/initial | Linear | 0.5000 | f(u) = u | 直线 |
| pre-step | Pre-step | 1.0000 | f(u) = 1 | 预先跃阶 |
| post-step | Post-step | 0.0000 | f(u) = 0 | 后跃阶 |
| weak-convex | Weak Convex | 0.6667 | f(u) = 1-(1-u)² | 弱凸曲线 |
| medium-convex | Medium Convex | 0.7500 | f(u) = 1-(1-u)³ | 中凸曲线 |
| strong-convex | Strong Convex | 0.8000 | f(u) = 1-(1-u)⁴ | 强凸曲线 |
| ultra-convex | Ultra Convex | 0.8571 | f(u) = 1-(1-u)⁶ | 超凸曲线 |
| weak-concave | Weak Concave | 0.3333 | f(u) = u² | 弱凹曲线 |
| medium-concave | Medium Concave | 0.2500 | f(u) = u³ | 中凹曲线 |
| strong-concave | Strong Concave | 0.2000 | f(u) = u⁴ | 强凹曲线 |
| ultra-concave | Ultra Concave | 0.1429 | f(u) = u⁶ | 超凹曲线 |

**积分公式推导**:
- 凸曲线：∫[0→1] [1-(1-u)ⁿ] du = n/(n+1)
- 凹曲线：∫[0→1] uⁿ du = 1/(n+1)

**示例**:
```
试剂: MeOH
时间: [0, 10, 20] 分钟
浓度: [50%, 60%, 80%]
流速: 1.0 mL/min
密度: 0.791 g/mL
曲线: ["linear", "linear"]

段1 (0-10分钟):
  c_avg = (50% + 60%) / 2 = 55%
  volume = 1.0 × 10 × 0.55 = 5.5 mL

段2 (10-20分钟):
  c_avg = (60% + 80%) / 2 = 70%
  volume = 1.0 × 10 × 0.70 = 7.0 mL

总体积 = 5.5 + 7.0 = 12.5 mL
质量 = 12.5 × 0.791 = 9.888 g
```

### 2. 样品前处理阶段质量计算

**函数**: `calculate_prep_masses()`

**输入**:
- `volumes`: 试剂体积字典 (mL)
- `densities`: 试剂密度字典 (g/mL)

**重要说明**:
- 前端（MethodsPage）直接输入**单个样品的体积**
- **不再需要乘以样品数量**
- 后端直接使用输入的体积计算质量

**计算公式**:
```python
for reagent, volume in volumes.items():
    mass = volume × densities[reagent]
    masses[reagent] = mass  # 单位：克(g)
```

**示例**:
```
前端输入:
  试剂: ACN
  体积: 15.0 mL（单个样品的总用量）
  
后端计算:
  密度: 0.786 g/mL
  质量 = 15.0 × 0.786 = 11.79 g
```

---

## 小因子归一化

### 函数: `normalize_sub_factor()`

### 归一化公式
```
Score_sub = min{45 × log₁₀(1 + 14 × Σ), 100}
其中 Σ = Σ(mᵢ × fₛᵤᵦ)
```

**参数说明**:
- `mᵢ`: 第i个试剂的质量 (克)
- `fₛᵤᵦ`: 该试剂的小因子值 (0-1范围)
- `Σ`: 加权和（质量×因子）
- `45`: 对数函数系数
- `14`: 内部缩放系数
- `100`: 上限，防止分数超过100

### 计算步骤

**Step 1**: 计算加权和 Σ
```python
weighted_sum = 0
for reagent, mass in reagent_masses.items():
    factor_value = reagent_factors[reagent]  # 0-1范围
    weighted_sum += mass × factor_value
```

**Step 2**: 使用对数公式归一化到0-100分制
```python
if weighted_sum <= 0:
    score = 0.0
else:
    score = min(100.0, 45.0 * math.log10(1 + 14 * weighted_sum))
```

### 示例计算

**场景**: 计算S1因子

```
试剂数据:
  MeOH: 质量=50.0g, S1因子=0.646
  H2O:  质量=30.0g, S1因子=0.0

计算过程:
Step 1: 计算加权和 Σ
weighted_sum = 50.0×0.646 + 30.0×0.0
             = 32.3 + 0
             = 32.3

Step 2: 应用对数公式
score = 45.0 × log₁₀(1 + 14 × 32.3)
      = 45.0 × log₁₀(1 + 452.2)
      = 45.0 × log₁₀(453.2)
      = 45.0 × 2.6563
      = 119.53
      = min(100, 119.53)
      = 100.0

最终得分: 100.0分 (已达上限)
```

### 9个小因子的完整计算

```python
sub_factor_names = ["S1", "S2", "S3", "S4", "H1", "H2", "E1", "E2", "E3"]

for sub_factor in sub_factor_names:
    # 提取所有试剂的该小因子值
    reagent_factors = {}
    for reagent in reagents:
        reagent_factors[reagent] = factor_matrix[reagent][sub_factor]
    
    # 调用归一化函数
    score = normalize_sub_factor(
        reagent_masses,
        reagent_factors,
        sub_factor,
        baseline_mass
    )
    
    sub_scores[sub_factor] = score
```

**输出示例**:
```python
{
    "S1": 71.78,
    "S2": 85.23,
    "S3": 12.45,
    "S4": 45.67,
    "H1": 34.89,
    "H2": 23.45,
    "E1": 56.78,
    "E2": 67.89,
    "E3": 12.34
}
```

---

## 大因子合成

### 函数: `calculate_major_factor()`

### 合成公式
```
Score_major = Σ(Sub_scoreᵢ × weightᵢ)
```

### 权重方案示例

**安全因子 (S) - PBT均衡方案**:
```python
{
    "S1": 0.25,  # Release Potential
    "S2": 0.25,  # Fire/Explosives
    "S3": 0.25,  # Reaction/Decomposition
    "S4": 0.25   # Acute Toxicity
}
```

**健康因子 (H) - 绝对均衡方案**:
```python
{
    "H1": 0.50,  # Chronic Toxicity
    "H2": 0.50   # Irritation
}
```

**环境因子 (E) - PBT均衡方案**:
```python
{
    "E1": 0.334,  # Persistency
    "E2": 0.333,  # Air Hazard
    "E3": 0.333   # Water Hazard
}
```

### 计算示例

**计算安全大因子S**:
```
小因子得分:
  S1 = 71.78
  S2 = 85.23
  S3 = 12.45
  S4 = 45.67

权重 (PBT均衡):
  w_S1 = 0.25
  w_S2 = 0.25
  w_S3 = 0.25
  w_S4 = 0.25

计算:
S = 71.78×0.25 + 85.23×0.25 + 12.45×0.25 + 45.67×0.25
  = 17.945 + 21.308 + 3.113 + 11.418
  = 53.78分
```

---

## P/R/D附加因子

### P因子（Power - 能耗）

**计算位置**: 前端 `MethodsPage.tsx`

**函数**: `calculatePowerScore()`

#### 步骤1: 确定仪器功率
```typescript
const powerMap = {
  'low': 0.5,      // 低功率仪器
  'standard': 1.0, // 标准功率仪器
  'high': 2.0      // 高功率仪器
}
const P_inst = powerMap[instrumentType]  // kW
```

#### 步骤2: 获取运行时间
```typescript
const gradientData = JSON.parse(localStorage.getItem('hplc_gradient_data'))
const T_run = gradientData.calculations.totalTime  // 分钟
```

#### 步骤3: 计算能耗
```typescript
const E_sample = P_inst × T_run / 60  // kWh (千瓦时)
```

#### 步骤4: 映射到0-100分
```typescript
if (E_sample <= 0.1) {
  P_score = 0        // 能耗很低，0分（最环保）
} else if (E_sample >= 1.5) {
  P_score = 100      // 能耗很高，100分（最不环保）
} else {
  // 线性映射
  P_score = ((E_sample - 0.1) / 1.4) × 100
}
```

#### 示例计算
```
仪器类型: standard (1.0 kW)
运行时间: 30 分钟

E_sample = 1.0 × 30 / 60 = 0.5 kWh

因为 0.1 < 0.5 < 1.5:
P_score = ((0.5 - 0.1) / 1.4) × 100
        = (0.4 / 1.4) × 100
        = 28.57分
```

### R因子（Regeneration - 可回收性）

**计算位置**: 前端 `MethodsPage.tsx`

**函数**: `calculateRDFactors()`

#### 归一化公式
```typescript
R = min(100, (Σ(mᵢ × regenerationᵢ) / baseline_mass) × 100)
```

#### 计算步骤

**Step 1**: 获取基准质量
```typescript
const baselineMassMap = {
  'UPLC': 4.0,
  'HPLC_UV': 45.0,
  'HPLC_MS': 10.0,
  'PrepHPLC': 250.0,
  'SFC': 4.0
}
const baseline_mass = baselineMassMap[chromatographyType]
```

**Step 2**: 累加仪器分析阶段的R值
```typescript
let r_weighted_sum = 0

// Mobile Phase A
mobilePhaseA.components.forEach(component => {
  const mass = component.volume × factor.density
  r_weighted_sum += mass × (factor.regeneration || 0)
})

// Mobile Phase B
mobilePhaseB.components.forEach(component => {
  const mass = component.volume × factor.density
  r_weighted_sum += mass × (factor.regeneration || 0)
})
```

**Step 3**: 累加前处理阶段的R值
```typescript
preTreatmentReagents.forEach(reagent => {
  // 注意：volume是单个样品的体积，直接使用
  const volume = reagent.volume
  const mass = volume × factor.density
  r_weighted_sum += mass × (factor.regeneration || 0)
})
```

**Step 4**: 归一化
```typescript
const r_factor = Math.min(100, (r_weighted_sum / baseline_mass) × 100)
```

#### 示例计算
```
色谱类型: HPLC_UV (baseline_mass = 45.0g)

仪器分析:
  MeOH: 50g × 0 (regeneration) = 0
  ACN:  30g × 0 (regeneration) = 0

前处理:
  MeOH: 10g × 0 (regeneration) = 0

r_weighted_sum = 0
r_factor = (0 / 45.0) × 100 = 0分

说明: 当前所有试剂的regeneration因子都是0，
     所以R因子得分为0（表示完全不可回收）
```

**现实情况**：
```
当前所有试剂的regeneration = 0
→ R因子 = 0分 (表示完全不可回收)
```

**说明**：这是当前数据库的初始设定值，未来会根据实际试剂的可回收性更新更准确的数据。用户也可以在Factors页面手动修改。

### D因子（Disposal - 可降解性）

**计算位置**: 前端 `MethodsPage.tsx`

**函数**: `calculateRDFactors()`

#### 归一化公式
```typescript
D = min(100, (Σ(mᵢ × disposalᵢ) / baseline_mass) × 100)
```

#### 重要说明
- **disposal字段值域**: 0-2（不是0-1）
- **计算时直接使用原值**，不做除以2的转换

**说明**：当前数据库中大多数有机溶剂的disposal值为2，未来会根据实际的处理难度和环境影响更新更精确的数据。

#### 计算步骤（与R因子相同）

**Step 1-3**: 累加所有试剂的D值
```typescript
let d_weighted_sum = 0

// 仪器分析阶段
mobilePhase.components.forEach(component => {
  const mass = component.volume × factor.density
  d_weighted_sum += mass × factor.disposal  // 直接使用disposal原值
})

// 前处理阶段
preTreatmentReagents.forEach(reagent => {
  // 注意：volume是单个样品的体积，直接使用
  const volume = reagent.volume
  const mass = volume × factor.density
  d_weighted_sum += mass × factor.disposal  // 直接使用disposal原值
})
```

**Step 4**: 归一化
```typescript
const d_factor = Math.min(100, (d_weighted_sum / baseline_mass) × 100)
```

#### 示例计算
```
色谱类型: HPLC_UV (baseline_mass = 45.0g)

试剂数据:
  MeOH: 质量=50g, disposal=2
  H2O:  质量=30g, disposal=0

d_weighted_sum = 50×2 + 30×0
               = 100 + 0
               = 100

d_factor = (100 / 45.0) × 100
         = 222.22
         = min(100, 222.22)
         = 100分

说明: D因子达到上限100分，表示这些试剂
     的处理难度很高（不环保）
```

---

## 阶段评分

### Score₁（仪器分析阶段）

**函数**: `calculate_score1()`

#### 公式
```
Score₁ = S×wₛ + H×wₕ + E×wₑ + P×wₚ + R×wᵣ + D×wᵤ
```

#### 默认权重（Balanced均衡方案）
```python
{
    "S": 0.18,  # 安全因子 18%
    "H": 0.18,  # 健康因子 18%
    "E": 0.18,  # 环境因子 18%
    "R": 0.18,  # 可回收性 18%
    "D": 0.18,  # 可降解性 18%
    "P": 0.10   # 能耗因子 10%
}
```

#### 示例计算
```
大因子得分:
  S = 53.78
  H = 29.17
  E = 45.67

附加因子:
  P = 28.57
  R = 0.00
  D = 100.00

权重（Balanced）:
  wₛ=0.18, wₕ=0.18, wₑ=0.18, wₚ=0.18, wᵣ=0.18, wₛ=0.10

计算:
Score₁ = 53.78×0.18 + 29.17×0.18 + 45.67×0.18 +
         0.00×0.18 + 100.00×0.18 + 28.57×0.10
       = 9.68 + 5.25 + 8.22 + 0.00 + 18.00 + 2.86
       = 44.01分
```

### Score₂（样品前处理阶段）

**函数**: `calculate_score2()`

#### 公式
```
Score₂ = S×wₛ + H×wₕ + E×wₑ + R×wᵣ + D×wᵤ + P×wₚ
```

**注意**: 前处理阶段现在也包含P因子，但默认情况下可设为0。

#### 默认权重（Balanced均衡方案）
```python
{
    "S": 0.18,  # 安全因子 18%
    "H": 0.18,  # 健康因子 18%
    "E": 0.18,  # 环境因子 18%
    "R": 0.18,  # 可回收性 18%
    "D": 0.18,  # 可降解性 18%
    "P": 0.10   # 能耗因子 10%
}
```

#### 示例计算
```
大因子得分:
  S = 45.23
  H = 32.45
  E = 56.78

附加因子:
  R = 0.00
  D = 100.00
  P = 0.00  # 前处理阶段默认为0

权重（Balanced）:
  wₛ=0.18, wₕ=0.18, wₑ=0.18, wᵣ=0.18, wᵤ=0.18, wₚ=0.10

计算:
Score₂ = 45.23×0.18 + 32.45×0.18 + 56.78×0.18 +
         0.00×0.18 + 100.00×0.18 + 0.00×0.10
       = 8.14 + 5.84 + 10.22 + 0.00 + 18.00 + 0.00
       = 42.20分
```

---

## 最终总分

### Score₃（最终总分）

**函数**: `calculate_score3()`

#### 公式
```
Score₃ = Score₁ × w_inst + Score₂ × w_prep
```

#### 默认权重（Standard标准方案）
```python
{
    "instrument": 0.60,  # 仪器分析阶段 60%
    "preparation": 0.40  # 样品前处理阶段 40%
}
```

#### 示例计算
```
阶段得分:
  Score₁ = 39.30（仪器分析）
  Score₂ = 46.90（前处理）

权重（Standard）:
  w_inst = 0.60
  w_prep = 0.40

计算:
Score₃ = 39.30×0.60 + 46.90×0.40
       = 23.58 + 18.76
       = 42.34分
```

### 最终分数解读
- **0-20分**: 优秀（深绿色）- 非常环保
- **20-40分**: 良好（浅绿色）- 较环保
- **40-60分**: 中等（黄色）- 一般
- **60-80分**: 较差（橙色）- 不太环保
- **80-100分**: 很差（深红色）- 非常不环保

---

## 权重方案

### 方案类别

系统提供6类权重方案，用户可灵活选择：

1. **安全因子权重** (4种方案)
2. **健康因子权重** (4种方案)
3. **环境因子权重** (4种方案)
4. **仪器分析阶段权重** (3种方案)
5. **前处理阶段权重** (3种方案)
6. **最终汇总权重** (3种方案)

### 1. 安全因子权重方案

#### PBT均衡 (PBT_Balanced) - 默认
```python
{"S1": 0.25, "S2": 0.25, "S3": 0.25, "S4": 0.25}
```
四个子因子平均分配

#### 边界关注 (Frontier_Focus)
```python
{"S1": 0.15, "S2": 0.40, "S3": 0.15, "S4": 0.30}
```
强调火灾/爆炸(S2)和急性毒性(S4)

#### 环保优先 (Green_Priority)
```python
{"S1": 0.35, "S2": 0.20, "S3": 0.25, "S4": 0.20}
```
强调释放潜力(S1)

#### 反应关注 (Reaction_Concerned)
```python
{"S1": 0.20, "S2": 0.25, "S3": 0.40, "S4": 0.15}
```
强调反应/分解(S3)

### 2. 健康因子权重方案

#### 绝对均衡 (Absolute_Balance) - 默认
```python
{"H1": 0.50, "H2": 0.50}
```

#### 职业暴露关注 (Occupational_Exposure)
```python
{"H1": 0.30, "H2": 0.70}
```
强调刺激性(H2)

#### 长期健康 (Long_Term_Health)
```python
{"H1": 0.70, "H2": 0.30}
```
强调慢性毒性(H1)

#### 急性保护 (Acute_Protection)
```python
{"H1": 0.40, "H2": 0.60}
```

### 3. 环境因子权重方案

#### PBT均衡 (PBT_Balanced) - 默认
```python
{"E1": 0.334, "E2": 0.333, "E3": 0.333}
```

#### 水资源保护 (Water_Protection)
```python
{"E1": 0.20, "E2": 0.30, "E3": 0.50}
```
强调水危害(E3)

#### 大气保护 (Atmosphere_Protection)
```python
{"E1": 0.25, "E2": 0.50, "E3": 0.25}
```
强调空气危害(E2)

#### 持久性关注 (Persistence_Concerned)
```python
{"E1": 0.50, "E2": 0.25, "E3": 0.25}
```
强调持久性(E1)

### 4. 仪器分析阶段权重方案

#### 均衡 (Balanced) - 默认
```python
{"S": 0.15, "H": 0.15, "E": 0.15, "P": 0.35, "R": 0.10, "D": 0.10}
```
强调能耗(P)

#### SHE优先 (SHE_Priority)
```python
{"S": 0.20, "H": 0.20, "E": 0.20, "P": 0.25, "R": 0.075, "D": 0.075}
```
平衡传统三因子(SHE)

#### 节能优先 (Energy_Saving)
```python
{"S": 0.10, "H": 0.10, "E": 0.10, "P": 0.50, "R": 0.10, "D": 0.10}
```
最大化能耗权重

### 5. 前处理阶段权重方案

#### 均衡 (Balanced) - 默认
```python
{"S": 0.20, "H": 0.20, "E": 0.20, "R": 0.20, "D": 0.20}
```

#### SHE优先 (SHE_Priority)
```python
{"S": 0.25, "H": 0.25, "E": 0.25, "R": 0.125, "D": 0.125}
```

#### 废物处置优先 (Waste_Disposal_Priority)
```python
{"S": 0.15, "H": 0.15, "E": 0.15, "R": 0.25, "D": 0.30}
```
强调可回收性和可降解性

### 6. 最终汇总权重方案

#### 标准 (Standard) - 默认
```python
{"instrument": 0.60, "preparation": 0.40}
```

#### 仪器优先 (Instrument_Dominant)
```python
{"instrument": 0.75, "preparation": 0.25}
```

#### 前处理优先 (Preparation_Dominant)
```python
{"instrument": 0.40, "preparation": 0.60}
```

---

## 颜色分级系统

### 分数到颜色的映射

**原则**: 分数越低越环保（绿色），分数越高越不环保（红色）

### 颜色分级表

| 分数范围 | 等级 | 颜色 | HEX代码 | 说明 |
|---------|------|------|---------|------|
| 0-20 | 优秀 | 深绿色 | `#2e7d32` | 非常环保 |
| 20-40 | 良好 | 浅绿色 | `#81c784` | 较环保 |
| 40-60 | 中等 | 黄色 | `#ffd54f` | 一般 |
| 60-80 | 较差 | 橙色 | `#ff9800` | 不太环保 |
| 80-100 | 很差 | 深红色 | `#d32f2f` | 非常不环保 |

### 颜色应用位置

1. **Methods页面**:
   - 总分卡片背景色
   - 小因子得分标签

2. **Graph页面**:
   - 总分卡片
   - 雷达图线条颜色（平均值）
   - 扇形图扇区颜色
   - 极坐标图条形颜色
   - 嵌套饼图颜色

3. **Comparison页面**:
   - 方法对比卡片边框

### 颜色计算函数

**函数**: `getColorHex(score: number): string`

```typescript
const COLOR_BREAKPOINTS = [
  { score: 0,   color: '#2e7d32' },  // 深绿
  { score: 20,  color: '#81c784' },  // 浅绿
  { score: 40,  color: '#ffd54f' },  // 黄
  { score: 60,  color: '#ff9800' },  // 橙
  { score: 80,  color: '#d32f2f' }   // 深红
]

function getColorHex(score: number): string {
  if (score <= 0) return COLOR_BREAKPOINTS[0].color
  if (score >= 100) return COLOR_BREAKPOINTS[4].color
  
  // 线性插值
  for (let i = 0; i < COLOR_BREAKPOINTS.length - 1; i++) {
    const start = COLOR_BREAKPOINTS[i]
    const end = COLOR_BREAKPOINTS[i + 1]
    
    if (score >= start.score && score <= end.score) {
      const ratio = (score - start.score) / (end.score - start.score)
      return interpolateColor(start.color, end.color, ratio)
    }
  }
}
```

---

## 数据持久化

### 存储机制

系统使用**双重持久化策略**：

1. **localStorage** (浏览器本地存储)
2. **文件系统** (Electron文件保存/加载)

### 1. localStorage存储

#### 存储的数据键

| 键名 | 内容 | 用途 |
|------|------|------|
| `hplc_factors_data` | 试剂因子库 | Factors页面 |
| `hplc_gradient_data` | 梯度程序配置 | HPLC Gradient页面 |
| `hplc_methods_data` | 方法配置 | Methods页面 |
| `hplc_score_results` | 评分结果 | 所有页面 |
| `hplc_factors_version` | 因子数据版本号 | 数据更新检测 |

#### 数据结构

**hplc_score_results** (评分结果):
```typescript
{
  timestamp: "2025-12-03T10:15:30.123Z",
  instrument: {
    masses: {...},
    sub_factors: {...},
    major_factors: {...},
    score1: 39.30
  },
  preparation: {
    masses: {...},
    sub_factors: {...},
    major_factors: {...},
    score2: 46.90
  },
  merged: {
    sub_factors: {...}  // 用于雷达图
  },
  final: {
    score3: 42.34
  },
  additional_factors: {
    P: 28.57,
    R: 0.00,
    D: 100.00
  },
  schemes: {
    safety: "PBT_Balanced",
    health: "Absolute_Balance",
    ...
  }
}
```

### 2. 文件系统存储

#### 保存流程

```typescript
// 1. 用户点击"Save"
exportData() {
  const allData = {
    factors: factorsData,
    gradient: gradientData,
    methods: methodsData,
    scoreResults: scoreResults,  // 包含评分结果
    version: "1.0",
    savedAt: new Date().toISOString()
  }
  
  // 2. 加密数据
  const encrypted = encryptData(JSON.stringify(allData))
  
  // 3. 调用Electron API保存文件
  window.electronAPI.saveFile(encrypted)
}
```

#### 加载流程

```typescript
// 1. 用户点击"Open"并选择文件
window.electronAPI.openFile()

// 2. 读取并解密
const encrypted = fs.readFileSync(filePath)
const decrypted = decryptData(encrypted)
const allData = JSON.parse(decrypted)

// 3. 恢复到各个状态
setFactorsData(allData.factors)
setGradientData(allData.gradient)
setMethodsData(allData.methods)

// 4. 恢复评分结果到localStorage
localStorage.setItem('hplc_score_results', JSON.stringify(allData.scoreResults))

// 5. 触发页面刷新
window.dispatchEvent(new Event('fileDataChanged'))
```

### 3. 数据同步机制

#### Context全局状态管理

```typescript
// AppContext.tsx
interface AppContextType {
  data: {
    factors: ReagentFactor[]
    gradient: GradientData
    methods: MethodsData
  }
  updateFactorsData: (data) => void
  updateGradientData: (data) => void
  updateMethodsData: (data) => void
  exportData: () => object
  setAllData: (data) => void
  isDirty: boolean
  setIsDirty: (dirty) => void
}
```

#### 自动保存机制

```typescript
// 各页面的useEffect
useEffect(() => {
  // 监听数据变化
  localStorage.setItem('hplc_xxx_data', JSON.stringify(localData))
  
  // 更新Context
  updateXxxData(localData)
  
  // 标记为已修改
  setIsDirty(true)
}, [localData])
```

#### 跨页面数据同步

```typescript
// 发送事件
window.dispatchEvent(new Event('factorsDataUpdated'))

// 接收事件
useEffect(() => {
  const handleUpdate = () => {
    const data = localStorage.getItem('hplc_factors_data')
    setLocalData(JSON.parse(data))
  }
  
  window.addEventListener('factorsDataUpdated', handleUpdate)
  return () => window.removeEventListener('factorsDataUpdated', handleUpdate)
}, [])
```

---

## 完整计算示例

### 场景设置

**色谱类型**: HPLC_UV  
**仪器类型**: standard (1.0 kW)  
**样品数**: 1

**梯度程序**:
```
时间: [0, 10, 20] 分钟
流速: 1.0 mL/min
Mobile Phase A: 50% MeOH, 50% H2O
Mobile Phase B: 80% MeOH, 20% H2O
梯度: 0min→100%A, 10min→50%A, 20min→0%A (全部线性)
曲线: ["linear", "linear"]
```

**前处理**（单个样品）:
```
ACN: 5.0 mL
```

**试剂因子**:
```
MeOH:
  density: 0.791
  S1: 0.646, S2: 1.0, S3: 0.0, S4: 0.267
  H1: 0.317, H2: 0.113
  E1: 0.0, E2: 0.317, E3: 0.0
  regeneration: 0, disposal: 2

H2O:
  density: 1.0
  所有因子: 0
  regeneration: 0, disposal: 0

ACN:
  density: 0.786
  S1: 0.615, S2: 1.0, S3: 0.6, S4: 0.510
  H1: 0.431, H2: 0.625
  E1: 0.341, E2: 0.431, E3: 0.0
  regeneration: 0, disposal: 2
```

### Step 1: 质量计算

#### 仪器分析 - MeOH
```
段1 (0-10min, 100%A → 50%A):
  MeOH在A中: 50%
  流速: 1.0 mL/min
  平均浓度: (100%×50% + 50%×50%) / 2 = 37.5%
  体积: 1.0 × 10 × 0.375 = 3.75 mL

段2 (10-20min, 50%A → 0%A):
  平均浓度: (50%×50% + 0%×50%) / 2 = 12.5%
  体积: 1.0 × 10 × 0.125 = 1.25 mL

总体积: 3.75 + 1.25 = 5.0 mL
质量: 5.0 × 0.791 = 3.955 g
```

#### 仪器分析 - H2O
```
类似计算...
总体积: 7.5 mL
质量: 7.5 × 1.0 = 7.5 g
```

#### 前处理 - ACN
```
体积: 5.0 mL × 1样品 = 5.0 mL
质量: 5.0 × 0.786 = 3.93 g
```

### Step 2: 小因子归一化

#### 仪器分析 - S1因子
```
baseline_mass = 45.0 g (HPLC_UV)

weighted_sum = 3.955×0.646 + 7.5×0.0
             = 2.555 + 0
             = 2.555

S1 = (2.555 / 45.0) × 100
   = 5.68分
```

#### 前处理 - S1因子
```
weighted_sum = 3.93×0.615 = 2.417

S1 = (2.417 / 45.0) × 100
   = 5.37分
```

### Step 3: 大因子合成

#### 仪器分析 - S因子
```
小因子 (假设计算完所有):
  S1 = 5.68
  S2 = 8.81
  S3 = 0.00
  S4 = 2.36

权重 (PBT均衡):
  0.25, 0.25, 0.25, 0.25

S = 5.68×0.25 + 8.81×0.25 + 0.00×0.25 + 2.36×0.25
  = 1.42 + 2.20 + 0.00 + 0.59
  = 4.21分
```

### Step 4: P/R/D因子计算

#### P因子
```
P_inst = 1.0 kW
T_run = 20 min
E_sample = 1.0 × 20 / 60 = 0.333 kWh

因为 0.1 < 0.333 < 1.5:
P = ((0.333 - 0.1) / 1.4) × 100
  = 16.64分
```

#### R因子
```
仪器: 3.955×0 + 7.5×0 = 0
前处理: 3.93×0 = 0

r_weighted_sum = 0
R = (0 / 45.0) × 100 = 0.00分
```

#### D因子
```
仪器: 3.955×2 + 7.5×0 = 7.91
前处理: 3.93×2 = 7.86

d_weighted_sum = 15.77
D = (15.77 / 45.0) × 100
  = 35.04分
```

### Step 5: 阶段评分

#### Score₁
```
S = 4.21, H = 3.17, E = 2.35
P = 16.64, R = 0.00, D = 35.04

权重 (Balanced):
0.15, 0.15, 0.15, 0.35, 0.10, 0.10

Score₁ = 4.21×0.15 + 3.17×0.15 + 2.35×0.15 +
         16.64×0.35 + 0.00×0.10 + 35.04×0.10
       = 0.63 + 0.48 + 0.35 + 5.82 + 0.00 + 3.50
       = 10.78分
```

#### Score₂
```
S = 5.89, H = 4.32, E = 2.98
R = 0.00, D = 35.04

权重 (Balanced):
0.20, 0.20, 0.20, 0.20, 0.20

Score₂ = 5.89×0.20 + 4.32×0.20 + 2.98×0.20 +
         0.00×0.20 + 35.04×0.20
       = 1.18 + 0.86 + 0.60 + 0.00 + 7.01
       = 9.65分
```

### Step 6: 最终总分

```
Score₁ = 10.78
Score₂ = 9.65

权重 (Standard):
w_inst = 0.60
w_prep = 0.40

Score₃ = 10.78×0.60 + 9.65×0.40
       = 6.47 + 3.86
       = 10.33分

颜色等级: 0-20分 → 深绿色 (#2e7d32) → 优秀（非常环保）
```

---

## 常见问题 (FAQ)

### Q1: 为什么分数越低越好？
**A**: 这是绿色化学评分的约定，分数代表"不环保程度"，分数越高表示危害越大。0分是理想状态（完全环保），100分是最差状态。

### Q2: disposal字段为什么是0-2范围？
**A**: 这是历史数据设计遗留。disposal=0表示易于处理（如水），disposal=2表示难以处理。计算时直接使用原值，不做转换。**注意**：这些数值是初始设定，未来会根据实际情况更新更准确的数据。

### Q3: regeneration全部为0是否正常？
**A**: 是的。当前因子库中所有试剂的regeneration都设置为0，表示这些试剂当前被认为不可回收。**说明**：这是初始数据库设定，未来会更新更准确的可回收性数据。用户也可以在Factors页面根据实际情况手动修改。

### Q4: P因子为什么有时是0？
**A**: 当运行时间为0或能耗E_sample ≤ 0.1 kWh时，P因子为0。检查HPLC Gradient页面的totalTime是否正确计算。

### Q5: 如何修改权重方案？
**A**: 在Methods页面的"评分配置"区域，点击各个下拉框可以选择不同的权重方案。修改后需要重新点击"计算完整评分"。

### Q6: 评分结果如何保存？
**A**: 有两种方式：
   1. 自动保存到localStorage（刷新页面后仍存在）
   2. 点击"Save"按钮保存为加密文件（可以备份和分享）

### Q7: 不同色谱类型的baseline_mass如何影响评分？
**A**: baseline_mass越小，相同质量的试剂得分越高。例如UPLC (4g) 比HPLC_UV (45g) 的基准更严格，使用相同试剂UPLC的评分会更高（更不环保）。

### Q11: 梯度程序中的曲线如何计算？
**A**: 系统实现了**11种曲线类型**的精确积分计算：
- **3种基础曲线**: linear(线性, 0.5)、pre-step(预先跃阶, 1.0)、post-step(后跃阶, 0.0)
- **4种凸曲线**: weak/medium/strong/ultra-convex，积分系数从0.6667到0.8571
- **4种凹曲线**: weak/medium/strong/ultra-concave，积分系数从0.3333到0.1429

每种曲线都有精确的数学积分公式，确保试剂用量计算的准确性。凸曲线使公式 f(u)=1-(1-u)ⁿ，凹曲线使用 f(u)=uⁿ，其中n取2、3、4、6。

### Q12: 样品前处理的体积如何输入？
**A**: 在Methods页面的"样品前处理"区域直接输入单个样品所需的试剂体积（单位：mL）。系统不再需要输入样品数量，直接使用输入的体积进行计算。这简化了操作流程，用户输入的就是实际使用的体积。

### Q8: 如何理解小因子、大因子和附加因子的关系？
**A**: 
- **小因子** (S1-S4, H1-H2, E1-E3): 试剂的固有属性，通过归一化计算得分
- **大因子** (S, H, E): 由对应的小因子加权平均得到
- **附加因子** (P, R, D): 独立计算，不通过小因子合成
- **阶段评分**: 大因子 + 附加因子的加权和
- **最终总分**: 两个阶段评分的加权和

### Q9: 为什么Methods页面显示的R/D分数和Graph页面不一致？
**A**: 检查是否点击了"Calculate Score"按钮重新计算。评分结果需要手动触发计算，修改因子或方法后不会自动更新。

### Q10: 如何解读雷达图的颜色？
**A**: 雷达图线条颜色由9个小因子的平均分决定：
```
平均分 = (S1+S2+S3+S4+H1+H2+E1+E2+E3) / 9
颜色 = getColorHex(平均分)
```
颜色越绿表示整体越环保，越红表示越不环保。

---

## 技术栈总结

### 前端技术
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5
- **图表库**: Recharts
- **路由**: React Router v6
- **状态管理**: Context API
- **构建工具**: Vite
- **加密**: CryptoJS (AES-256)

### 后端技术
- **框架**: FastAPI (Python)
- **验证**: Pydantic v2
- **数据库**: SQLite + SQLAlchemy
- **服务器**: Uvicorn (ASGI)
- **API**: RESTful

### 桌面应用
- **框架**: Electron
- **IPC通信**: contextBridge
- **文件操作**: Node.js fs模块

### 数据存储
- **浏览器**: localStorage
- **文件**: 加密JSON文件
- **数据库**: SQLite (可选，用于历史记录)

---

## 版本历史

### v1.0.0 (2025-12-03)
- ✅ 完成五层评分架构
- ✅ 实现P/R/D附加因子计算
- ✅ 统一0-100分制
- ✅ 删除0-1制遗留转换
- ✅ 修复disposal直接使用原值
- ✅ 完善颜色分级系统
- ✅ 实现数据持久化
- ✅ 添加详细计算日志

---

## 贡献者

本文档基于与用户的详细讨论和调试过程整理而成。

**最后更新**: 2025年12月3日

---

**文档结束**
