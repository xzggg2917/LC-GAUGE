import React, { useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Row, Col, message, Space, Typography, Divider, Alert } from 'antd'
import { ExperimentOutlined, FireOutlined, HeartOutlined, GlobalOutlined } from '@ant-design/icons'
import type { ReagentFactor } from '../contexts/AppContext'

const { Text } = Typography
const { Option } = Select

interface AddReagentModalProps {
  visible: boolean
  onCancel: () => void
  onOk: (reagent: ReagentFactor) => void
}

// Release Potential 第一步选项
const RP_STEP1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 溶解气体或高挥发性液体',
    description: '本质是气体溶于水，或极易挥发的液体'
  },
  { 
    value: 'B', 
    label: 'B. 固体无机盐或高沸点物质',
    description: '常温下为固体(离子化合物)，或沸点极高(>200°C)的难挥发液体'
  },
  { 
    value: 'C', 
    label: 'C. 挥发性有机/无机液体',
    description: '沸点在30°C ~ 200°C之间的液体'
  }
]

// Release Potential 第三步：化学结构分类
const RP_STEP3_OPTIONS = [
  { 
    value: -0.045, 
    label: 'A. 醇类 (Alcohols)',
    description: '分子中含有羟基(-OH)，且能形成氢键',
    correction: -0.045
  },
  { 
    value: 0.015, 
    label: 'B. 醚类 (Ethers)',
    description: '分子中含有醚键(-O-)',
    correction: 0.015
  },
  { 
    value: 0.075, 
    label: 'C. 高度支链化烷烃 (Branched Alkanes)',
    description: '烷烃且名称中带有"异(iso-)"、"叔(Tert-)"或结构高度分叉',
    correction: 0.075
  },
  { 
    value: 0, 
    label: 'D. 标准溶剂 (Standard)',
    description: '上述三类以外的其他挥发性液体',
    correction: 0
  }
]

// Fire/Explosives 第一阶段选项：快速筛选
const FE_STEP1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 完全惰性的无机物质',
    description: '本质上不可燃、不助燃、不氧化',
    result: 0.000
  },
  { 
    value: 'B', 
    label: 'B. 常见无机固体盐类',
    description: '非氧化性的常规盐类',
    result: 0.000,
    note: '注意：如果是氧化剂，请选择C'
  },
  { 
    value: 'C', 
    label: 'C. 有机物质（溶剂、试剂）或 可能具有氧化性的无机物',
    description: '需要进一步评估其氧化性和易燃性',
    continueToStep2: true
  }
]

// Fire/Explosives 第二阶段选项：氧化性风险评估 (Oxygen Source)
const FE_STEP2_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. R7 (May cause fire)',
    description: '可能引发火灾',
    result: 1.000
  },
  { 
    value: 'B', 
    label: 'B. R8 (Contact with combustible material may cause fire)',
    description: '与可燃物质接触可能引发火灾',
    result: 1.000
  },
  { 
    value: 'C', 
    label: 'C. R9 (Explosive when mixed with combustible material)',
    description: '与可燃物质混合时具有爆炸性',
    result: 1.000
  },
  { 
    value: 'D', 
    label: 'D. 以上都没有',
    description: '不具有显著氧化性风险',
    continueToStep3: true
  }
]

// Fire/Explosives 第三阶段选项：易燃性风险评估 (Fuel Hazard)
const FE_STEP3_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 闪点 < 21°C，或者 R-codes 包含 R11 (Highly Flammable)',
    description: '高度易燃',
    result: 1.000
  },
  { 
    value: 'B', 
    label: 'B. 闪点在 21°C ~ 60°C 之间，或者 R-codes 包含 R10 (Flammable)',
    description: '可燃',
    result: 0.500
  },
  { 
    value: 'C', 
    label: 'C. 闪点 > 60°C，或者被标记为"不易燃"',
    description: '低风险',
    result: 0.000
  },
  { 
    value: 'D', 
    label: 'D. 无闪点',
    description: '例如二氯甲烷、三氯乙酸，且未被标记为 R11',
    result: 0.000
  }
]

// Reaction/Decomposition 第一阶段选项：基础信息筛选
const RD_STEP1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 纯物质（纯溶剂、固体盐、浓酸/浓碱）',
    description: '需要进一步评估其反应性',
    continueToStep2: true
  },
  { 
    value: 'B', 
    label: 'B. 稀释的水溶液',
    description: '低浓度磷酸盐缓冲液、<5%的稀酸/稀碱调节剂',
    note: '提示：根据 HPLC-EAT 规则，如果是以水为主的稀缓冲液（非强氧化性），通常忽略其贡献',
    result: 0.000
  }
]

// Reaction/Decomposition 第三阶段选项：不兼容性与特殊风险
const RD_STEP3_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 白色菱形标记有 "W" (Water Reactive / 遇水反应)',
    description: '该物质与水接触会发生危险反应'
  },
  { 
    value: 'B', 
    label: 'B. 白色菱形标记有 "OX" (Oxidizer / 强氧化剂)',
    description: '该物质是强氧化剂'
  },
  { 
    value: 'C', 
    label: 'C. 该物质已知是高浓度强酸（如96%硫酸）或强碱，且具有强腐蚀性',
    description: '对应 R35/H314 等腐蚀性标识'
  },
  { 
    value: 'D', 
    label: 'D. 以上皆无',
    description: '不具有上述特殊风险'
  }
]

// Reaction/Decomposition 第四阶段选项：化学结构检查（针对有机物）
const RD_STEP4_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 是（包含不稳定基团）',
    description: '分子中含有硝基、叠氮基、过氧键、重氮基、炔基等',
    result: 0.600
  },
  { 
    value: 'B', 
    label: 'B. 否（普通醇、酮、酯、烷烃、腈类等）',
    description: '不含明显不稳定基团的常规有机溶剂',
    result: 0.000
  }
]

// Acute Toxicity 路径选项
const AT_PATH_OPTIONS = [
  { 
    value: 'A', 
    label: '[路径 A] 常用 HPLC 有机溶剂或挥发性酸碱',
    description: '液体、有明显的挥发性，能查到 IDLH (ppm) 数值'
  },
  { 
    value: 'B', 
    label: '[路径 B] HPLC 固体添加剂或无机盐',
    description: '固体粉末、不挥发，通常没有 IDLH 值，但有 LD50 值'
  }
]

// 常用 HPLC 溶剂的标准 IDLH 建议值
const COMMON_IDLH_VALUES = [
  { name: '甲醇 (Methanol)', value: 6000 },
  { name: '乙腈 (Acetonitrile)', value: 500, note: '注意：不要用 137' },
  { name: '四氢呋喃 (THF)', value: 2000 },
  { name: '丙酮 (Acetone)', value: 2500 },
  { name: '乙醇 (Ethanol)', value: 3300 },
  { name: '异丙醇 (IPA)', value: 2000 },
  { name: '正己烷 (Hexane)', value: 1100 },
  { name: '甲酸 (Formic Acid)', value: 30 },
  { name: '氨气 (Ammonia)', value: 300, note: '用于氨水浓度' }
]

// Irritation 问题1选项：严重腐蚀性
const IRR_Q1_OPTIONS = [
  { value: 'yes', label: '是 - 包含 R35 或 R34', result: 1.000 },
  { value: 'no', label: '否 - 不包含上述代码', continueToQ2: true }
]

// Irritation 问题2选项：明显刺激性
const IRR_Q2_OPTIONS = [
  { value: 'yes', label: '是 - 包含 R36/R37/R38/R41/R48 中的任一代码', result: 0.625 },
  { value: 'ethanol', label: '特例：该物质是乙醇 (Ethanol)', result: 0.000, note: '直接填 0' },
  { value: 'no', label: '否 - 不包含上述代码', continueToQ3: true }
]

// Irritation 问题3选项：pH判定
const IRR_Q3_PH_RANGES = [
  { 
    value: 'strong', 
    label: '强酸/强碱（pH < 2 或 pH > 11.5）', 
    description: '强腐蚀性',
    result: 1.000 
  },
  { 
    value: 'moderate', 
    label: '中强酸/中强碱（2 ≤ pH < 5 或 9 < pH ≤ 11.5）', 
    description: '中等刺激性',
    result: 0.625 
  },
  { 
    value: 'neutral', 
    label: '中性/弱酸弱碱（5 ≤ pH ≤ 9）', 
    description: '暂时计为 0，继续问题 4',
    continueToQ4: true 
  }
]

// Irritation 问题4选项：微量危害代码
const IRR_Q4_CODES = [
  { 
    code: 'R40', 
    label: 'R40（致癌可能性）', 
    value: 0.236 
  },
  { 
    code: 'R20series', 
    label: 'R20/21/22/23/24/25 系列（吸入/皮肤/吞咽有害或有毒）', 
    value: 0.113 
  },
  { 
    code: 'R50series', 
    label: 'R50/53（对水生环境有害）', 
    value: 0.110 
  }
]

// Chronic Toxicity Q1选项：物理状态
const CT_Q1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 固体 (Solid) 或 难挥发的盐类粉末',
    description: '系数 K = 0.2',
    factor: 0.2
  },
  { 
    value: 'B', 
    label: 'B. 液体 (Liquid) 或 气体 (Gas)',
    description: '系数 K = 1.0',
    factor: 1.0
  }
]

// Chronic Toxicity Q2选项：高危一票否决
const CT_Q2_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 强腐蚀性：R35 或 Skin Corr. 1A / H314（引起严重皮肤灼伤和眼损伤）',
    description: '常见于：浓硫酸、发烟硝酸、纯甲酸、三氯乙酸 TFA',
    result: 1.000
  },
  { 
    value: 'B', 
    label: 'B. 致癌/致突变性：R45, R46, R49 或 H350（可能致癌），且 IARC 分类为 1 或 2A/2B',
    description: '常见于：氯仿、苯',
    result: 0.800
  },
  { 
    value: 'C', 
    label: 'C. 以上都没有',
    description: '继续下一步',
    continueToQ3: true
  }
]

// Chronic Toxicity Q3选项：无毒豁免
const CT_Q3_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 简单的饱和烷烃 (Alkane)，且不含神经毒性',
    description: '如异辛烷、正己烷，但不包括正己烷',
    result: 0.000
  },
  { 
    value: 'B', 
    label: 'B. 无害的无机盐/缓冲盐',
    description: '如磷酸二氢钠、氯化钠，且无特定职业暴露限值 (TLV)',
    result: 0.000
  },
  { 
    value: 'C', 
    label: 'C. 不属于以上两类',
    description: '是有机溶剂、有毒气体或有明确 TLV 的物质',
    continueToQ4: true
  }
]

// Chronic Toxicity Q5选项：是否为醇类
const CT_Q5_OPTIONS = [
  { value: 'yes', label: 'A. 是 (Yes) - 是醇类且不是剧毒品', correction: 0.06 },
  { value: 'no', label: 'B. 否 (No) - 不是醇类', correction: 0 }
]

// Persistency (持久性) 的决策树选项
const PERSISTENCY_Q1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. 无机强酸', 
    description: '浓度 ≥ 90% 的强酸 (例如：96% 浓硫酸)',
    result: 0.485
  },
  { 
    value: 'B', 
    label: 'B. 其他无机物', 
    description: '例如：氨水、磷酸二氢钾、碳酸铵、盐酸、氢氧化钠',
    result: 0.000
  },
  { 
    value: 'C', 
    label: 'C. 有机物', 
    description: '例如：甲醇、乙腈、异辛烷、甲酸、醋酸、卤代烃'
  }
]

const PERSISTENCY_Q3_OPTIONS = [
  {
    value: 'A',
    label: 'A. 极快降解/低蓄积',
    description: 'Biodeg. Half-Life < 4.5天，或者 BCF < 1.6',
    result: 0.000
  },
  {
    value: 'B',
    label: 'B. 醇或类似性低蓄积',
    description: 'ReadyBiodeg = 0，且 Atmos. Hydroxylation Rate > 1.3e-13',
    result: 0.020
  },
  {
    value: 'C',
    label: 'C. 特殊代谢物质',
    description: 'Fish Biotrans. Half-Life < 0.17天',
    result: 0.130
  },
  {
    value: 'D',
    label: 'D. 以上都不满足',
    description: '请继续进入第四阶段核心计算'
  }
]

const PERSISTENCY_DATA_SOURCE_OPTIONS = [
  { value: 'Experimental', label: 'Experimental (实验数据)' },
  { value: 'Predicted', label: 'Predicted (预测数据)' }
]

const PERSISTENCY_READY_BIODEG_OPTIONS = [
  { value: 1, label: '1 (易降解)' },
  { value: 0, label: '0 (难降解)' }
]

const PERSISTENCY_CHEMICAL_TYPE_OPTIONS = [
  {
    value: '2a',
    label: '2a. 卤代烃类',
    description: '含氯/溴，且 BCF > 5.0'
  },
  {
    value: '2b',
    label: '2b. 醚类 或 支链烷烃',
    description: 'BCF < 5.0'
  }
]

const PERSISTENCY_OPTIONS = [
  { value: 0, label: '易降解 (0.0)', description: '< 7天完全降解' },
  { value: 0.3, label: '可降解 (0.3)', description: '7-30天降解' },
  { value: 0.6, label: '难降解 (0.6)', description: '30-180天降解' },
  { value: 1, label: '持久性 (1.0)', description: '> 180天' }
]

const AIR_HAZARD_OPTIONS = [
  { value: 0, label: '低 (0.0)', description: '对大气无害' },
  { value: 0.5, label: '中 (0.5)', description: 'VOCs/部分污染' },
  { value: 1, label: '高 (1.0)', description: '严重空气污染' }
]

const WATER_HAZARD_OPTIONS = [
  { value: 0, label: '低 (0.0)', description: '水生毒性低' },
  { value: 0.3, label: '中低 (0.3)', description: 'LC50 > 100 mg/L' },
  { value: 0.6, label: '中高 (0.6)', description: 'LC50 10-100 mg/L' },
  { value: 1, label: '高 (1.0)', description: 'LC50 < 10 mg/L' }
]

// Water Hazard (水体危害) 的决策树选项
const WH_Q1_OPTIONS = [
  {
    value: 'A',
    label: 'A. 强腐蚀性无机酸/碱',
    description: '具有强腐蚀性、迅速改变水体pH值的无机物',
    note: '注意：磷酸、甲酸、乙酸属于弱酸，不选此项',
    result: 0.500
  },
  {
    value: 'B',
    label: 'B. 普通无机盐/缓冲盐',
    description: '用于调节离子强度或弱酸碱性盐类',
    result: 0.000
  },
  {
    value: 'C',
    label: 'C. 有机溶剂/有机添加剂',
    description: '所有含碳的溶剂和改性剂'
  }
]

const WH_Q2_OPTIONS = [
  {
    value: 'A',
    label: 'A. 极毒 (LC₅₀ ≤ 1)',
    result: 0.500
  },
  {
    value: 'B',
    label: 'B. 高毒 (1 < LC₅₀ ≤ 10)',
    result: 0.250
  },
  {
    value: 'C',
    label: 'C. 中毒 (10 < LC₅₀ ≤ 100)',
    result: 0.125
  },
  {
    value: 'D',
    label: 'D. 低毒/微毒 (LC₅₀ > 100)',
    result: 0.000
  }
]

const WH_Q3_1_OPTIONS = [
  {
    value: 'A',
    label: 'A. 易降解 (Readily Biodegradable) 或 易挥发 (Volatile)',
    description: 'MSDS显示"易生物降解"，或者像二氯甲烷这样易挥发的溶剂',
    penalty: 0.000
  },
  {
    value: 'B',
    label: 'B. 难降解 (Not Readily Biodegradable)',
    description: 'MSDS显示"非易生物降解"，且不易挥发',
    penalty: 0.125
  }
]

const WH_Q3_2_OPTIONS = [
  {
    value: 'A',
    label: 'A. 高积累 (BCF > 500 或 Log Kow > 4)',
    penalty: 0.250
  },
  {
    value: 'B',
    label: 'B. 中等积累 (100 < BCF ≤ 500 或 3 < Log Kow ≤ 4)',
    penalty: 0.075
  },
  {
    value: 'C',
    label: 'C. 低/无积累 (BCF < 100 或 Log Kow < 3)',
    penalty: 0.000
  }
]

const WH_Q4_K_OPTIONS = [
  {
    value: 6.0,
    label: '含卤素/难降解有机物',
    k: 6.0
  },
  {
    value: 0.7,
    label: '普通易降解有机物',
    k: 0.7
  },
  {
    value: 0,
    label: '超低毒溶剂 (LC50 > 1000)',
    k: 0
  }
]

const RECYCLE_OPTIONS = [
  { value: 0, label: '不可回收 (0)' },
  { value: 1, label: '部分可回收 (1)' },
  { value: 2, label: '易回收 (2)' },
  { value: 3, label: '完全可回收 (3)' }
]

const POWER_OPTIONS = [
  { value: 0, label: '无 (0)', description: '室温操作' },
  { value: 1, label: '低 (1)', description: '< 50°C' },
  { value: 2, label: '中 (2)', description: '50-100°C' },
  { value: 3, label: '高 (3)', description: '> 100°C' }
]

// Regeneration Factor (再生因子) 的选项 - 五级评分系统
const REGENERATION_OPTIONS = [
  {
    value: 0.0,
    label: '1. 自然本底级 (Natural)',
    description: '直接取自自然界，无需化学合成，仅需物理净化。',
    differentiation: '如水、乙醇（发酵）、甘油等'
  },
  {
    value: 0.25,
    label: '2. 绿色循环级 (Circular/Bio)',
    description: '生物基或工业副回收。属于低碳经济范畴，显著优于化石资源。',
    differentiation: '如生物乙醇、SFC用二氧化碳等'
  },
  {
    value: 0.5,
    label: '3. 简单合成级 (Simple Synthetic)',
    description: '结构简单的C-H-O化合物。虽源自化石，但合成路径较短，原子经济性高，毒性较低。',
    differentiation: '如甲醇、工业乙醇、异丙醇、丙酮、乙酸乙酯等'
  },
  {
    value: 0.75,
    label: '4. 复杂/高耗能级 (Complex/Energy Intensive)',
    description: '含氯/卤素/杂环化合物。合成路径较长，或属于石油化工中能耗较高的部分，或具有毒性。',
    differentiation: '如乙腈、四氢呋喃、二氯甲烷、正己烷、二甲甲酰胺等'
  },
  {
    value: 1.0,
    label: '5. 资源枯竭/稀缺级 (Depletion/Fine Chem)',
    description: '稀缺矿产或被精细化学品。涉及稀有元素（铂、镍、氟）开采，或合成步骤极为复杂的精细化学品。',
    differentiation: '如磷酸盐、TFA、离子对试剂等'
  }
]

// Disposal Factor (处置因子) 的选项 - 五级固有阻力评分系统
const DISPOSAL_OPTIONS = [
  { 
    value: 0.0, 
    label: 'L1: 自然回归级 (Natural Return)',
    description: '无需堆填，物质可直接回归自然环境，无需任何干预，无害且自然降解',
    criteria: '如：纯水、气态CO₂',
    color: '#52c41a'
  },
  { 
    value: 0.25, 
    label: 'L2: 低熵回收级 (Low-Entropy Recovery)',
    description: '极低能耗回收。沸点 < 80°C，非非沸，无需洗性，蒸馏回收的能耗低，且残渣风险可控',
    criteria: '如：乙醇、丙酮、乙酸乙酯',
    color: '#95de64'
  },
  { 
    value: 0.5, 
    label: 'L3: 标准工业级 (Standard Industrial)',
    description: '常规能耗回收。沸点 80 ~ 100°C，或存在较等离毒性/腐蚀共质。工业回收技术成熟，但能源成本较高',
    criteria: '如：甲醇、乙腈、正己烷',
    color: '#ffc53d'
  },
  { 
    value: 0.75, 
    label: 'L4: 高势垒阻碍级 (High Barrier)',
    description: '高能耗/高风险。沸点 > 100°C (能耗增加)，或含卤素 (需防腐设备)，或毒性过高/包装难 (需特殊安控)',
    criteria: '如：THF, DCM, DMF, DMSO, 氯水, 乙醇',
    color: '#ff9c6e'
  },
  { 
    value: 1.0, 
    label: 'L5: 不可逆摧毁级 (Irreversible Destruction)',
    description: '根本不可回收。含有不可再生固体 (导致级别)、持久性有机污染物 (POPs)，或需要焚烧进行焚烧性结构/或化',
    criteria: '如：磷酸盐, TFA, 离子对试剂',
    color: '#ff4d4f'
  }
]

// 处置百分比选项
const DISPOSAL_PERCENTAGE_OPTIONS = [
  { value: 0, label: 'A. 0% (完全废弃/外运焚烧) → P = 0', pValue: 0 },
  { value: 25, label: 'B. 25% (少量回收用于清洗) → P = 25', pValue: 25 },
  { value: 50, label: 'C. 50% (半数回收) → P = 50', pValue: 50 },
  { value: 75, label: 'D. 75% (大部分回收) → P = 75', pValue: 75 },
  { value: 100, label: 'E. 100% (完全闭环循环) → P = 100', pValue: 100 }
]

const AddReagentModal: React.FC<AddReagentModalProps> = ({ visible, onCancel, onOk }) => {
  const [form] = Form.useForm()
  const [calculatedScores, setCalculatedScores] = useState({
    safetyScore: 0,
    healthScore: 0,
    envScore: 0
  })
  
  // Release Potential 的状态
  const [rpStep1, setRpStep1] = useState<string>('') // A/B/C
  const [rpCalculatedValue, setRpCalculatedValue] = useState<number>(0)
  
  // Fire/Explosives 的状态
  const [feStep1, setFeStep1] = useState<string>('') // A/B/C
  const [feStep2, setFeStep2] = useState<string>('') // A/B/C/D
  const [feCalculatedValue, setFeCalculatedValue] = useState<number>(0)
  
  // Reaction/Decomposition 的状态
  const [rdStep1, setRdStep1] = useState<string>('') // A/B
  const [rdNfpaYellow, setRdNfpaYellow] = useState<number | undefined>(undefined) // 0-4
  const [rdNfpaWhite, setRdNfpaWhite] = useState<string>('') // 无/W/OX等
  const [rdStep3, setRdStep3] = useState<string[]>([]) // A/B/C/D多选
  const [rdCalculatedValue, setRdCalculatedValue] = useState<number>(0)
  
  // Acute Toxicity 的状态
  const [atPath, setAtPath] = useState<string>('') // A/B
  const [atCalculatedValue, setAtCalculatedValue] = useState<number>(0)
  
  // Irritation 的状态
  const [irrQ1, setIrrQ1] = useState<string>('') // yes/no
  const [irrQ2, setIrrQ2] = useState<string>('') // yes/ethanol/no
  const [irrQ3Ph, setIrrQ3Ph] = useState<string>('') // strong/moderate/neutral
  const [irrQ4Codes, setIrrQ4Codes] = useState<string[]>([]) // R40/R20series/R50series
  const [irrCalculatedValue, setIrrCalculatedValue] = useState<number>(0)
  
  // Chronic Toxicity 的状态
  const [ctQ1State, setCtQ1State] = useState<string>('') // A/B (物理状态)
  const [ctQ2, setCtQ2] = useState<string>('') // A/B/C
  const [ctQ3, setCtQ3] = useState<string>('') // A/B/C
  const [ctCalculatedValue, setCtCalculatedValue] = useState<number>(0)
  
  // Persistency 的状态
  const [persQ1, setPersQ1] = useState<string>('') // A/B/C (物质身份)
  const [persQ3, setPersQ3] = useState<string>('') // A/B/C/D (快速通道)
  const [persReadyBiodeg, setPersReadyBiodeg] = useState<number | undefined>(undefined) // 0/1
  const [persChemicalType, setPersChemicalType] = useState<string>('') // 2a/2b
  const [persCalculatedValue, setPersCalculatedValue] = useState<number>(0)
  
  // Water Hazard 的状态
  const [whQ1, setWhQ1] = useState<string>('') // A/B/C (物质类别)
  const [whQ2, setWhQ2] = useState<string>('') // A/B/C/D (急性毒性)
  const [whQ3_1, setWhQ3_1] = useState<string>('') // A/B (持久性罚分)
  const [whQ3_2, setWhQ3_2] = useState<string>('') // A/B/C (生物累积罚分)
  const [whCalculatedValue, setWhCalculatedValue] = useState<number>(0)
  
  // Regeneration Factor 的状态
  const [regenerationValue, setRegenerationValue] = useState<number | undefined>(undefined)

  // Disposal Factor 的状态
  const [disposalDint, setDisposalDint] = useState<number | undefined>(undefined) // D_int 固有阻力
  const [disposalPercentage, setDisposalPercentage] = useState<number | undefined>(undefined) // P_disp 处置百分比
  const [disposalValue, setDisposalValue] = useState<number | undefined>(undefined) // 最终D值

  // 计算 Release Potential
  const calculateReleasePotential = (step1: string, tbp?: number, correction?: number): number => {
    if (step1 === 'A') {
      // 溶解气体/高挥发性液体
      return 1.0
    } else if (step1 === 'B') {
      // 固体/难挥发
      return 0.0001
    } else if (step1 === 'C' && tbp !== undefined && correction !== undefined) {
      // 挥发性液体计算：RP = 0.885 - (0.00333 × Tbp) + 修正系数
      const rp = 0.885 - (0.00333 * tbp) + correction
      // 如果计算结果小于0，则取0
      return Math.max(0, Number(rp.toFixed(4)))
    }
    return 0
  }

  // 计算 Fire/Explosives
  const calculateFireExplos = (step1: string, step2?: string, step3?: string): number => {
    // 第一阶段：快速筛选
    if (step1 === 'A' || step1 === 'B') {
      return 0.000
    }
    
    // 第二阶段：氧化性风险评估
    if (step1 === 'C') {
      if (step2 === 'A' || step2 === 'B' || step2 === 'C') {
        // R7/R8/R9 任一存在，高氧化性风险
        return 1.000
      }
      
      // 第三阶段：易燃性风险评估
      if (step2 === 'D' && step3) {
        const option = FE_STEP3_OPTIONS.find(opt => opt.value === step3)
        return option?.result ?? 0
      }
    }
    
    return 0
  }

  // 计算 Reaction/Decomposition
  const calculateReactDecom = (
    step1: string, 
    nfpaYellow?: number, 
    nfpaWhite?: string,
    step3Selections?: string[],
    step4?: string
  ): number => {
    // 第一阶段：如果是稀释水溶液，直接返回0
    if (step1 === 'B') {
      return 0.000
    }
    
    // 优先级1：不兼容性检查（最高）
    if (step3Selections && step3Selections.length > 0) {
      // 如果选了 A（W标记）、B（OX标记）、C（强酸强碱）
      if (step3Selections.some(s => s === 'A' || s === 'B' || s === 'C')) {
        return 0.800
      }
    }
    
    // 优先级2：NFPA黄色数字判定
    if (nfpaYellow !== undefined) {
      if (nfpaYellow >= 2) {
        return 0.800
      } else if (nfpaYellow === 1) {
        return 0.600
      } else if (nfpaYellow === 0) {
        return 0.000
      }
    }
    
    // 优先级3：化学结构检查（针对有机物）
    if (step4) {
      const option = RD_STEP4_OPTIONS.find(opt => opt.value === step4)
      return option?.result ?? 0
    }
    
    return 0
  }

  // 计算 Acute Toxicity
  const calculateAcuteToxicity = (path: string, idlh?: number, mw?: number, ld50?: number): number => {
    if (path === 'A' && idlh !== undefined && mw !== undefined) {
      // 路径 A：使用 IDLH 和分子量
      // C = (IDLH × MW) / 24.45
      const C = (idlh * mw) / 24.45
      // Acute Value = 1.24 - 0.25 × log₁₀(C)
      const acuteValue = 1.24 - 0.25 * Math.log10(C)
      // 修正断裂规则
      if (acuteValue < 0) return 0.000
      if (acuteValue >= 1) return 1.000
      return Number(acuteValue.toFixed(3))
    } else if (path === 'B' && ld50 !== undefined) {
      // 路径 B：使用 LD50
      // 快速判断规则
      if (ld50 >= 2000) return 0.000
      if (ld50 <= 20) return 1.000
      // Acute Value = 1.65 - 0.5 × log₁₀(LD50)
      const acuteValue = 1.65 - 0.5 * Math.log10(ld50)
      // 修正断裂规则
      if (acuteValue < 0) return 0.000
      if (acuteValue >= 1) return 1.000
      return Number(acuteValue.toFixed(3))
    }
    return 0
  }

  // 计算 Irritation
  const calculateIrritation = (q1: string, q2?: string, q3Ph?: string, q4Codes?: string[]): number => {
    // 问题 1：严重腐蚀性
    if (q1 === 'yes') {
      return 1.000
    }
    
    // 问题 2：明显刺激性
    if (q2 === 'yes') {
      return 0.625
    }
    if (q2 === 'ethanol') {
      return 0.000
    }
    
    // 问题 3：pH 判定
    if (q3Ph === 'strong') {
      return 1.000
    }
    if (q3Ph === 'moderate') {
      return 0.625
    }
    
    // 问题 4：微量危害累加
    if (q3Ph === 'neutral' && q4Codes && q4Codes.length > 0) {
      let total = 0
      if (q4Codes.includes('R40')) total += 0.236
      if (q4Codes.includes('R20series')) total += 0.113
      if (q4Codes.includes('R50series')) total += 0.110
      return Number(total.toFixed(3))
    }
    
    return 0
  }

  // 计算 Chronic Toxicity
  const calculateChronicToxicity = (
    q1State: string, 
    q2: string, 
    q3?: string, 
    tlv?: number, 
    q5Alcohol?: string,
    substanceName?: string
  ): number => {
    // 第二步：高危一票否决
    if (q2 === 'A') {
      return 1.000
    }
    if (q2 === 'B') {
      return 0.800
    }
    
    // 第三步：无毒豁免
    if (q3 === 'A' || q3 === 'B') {
      return 0.000
    }
    
    // 第四步：核心计算
    if (q3 === 'C' && tlv !== undefined) {
      // 二氯甲烷特例
      if (substanceName && substanceName.toLowerCase().includes('二氯甲烷')) {
        const stateFactor = q1State === 'A' ? 0.2 : 1.0
        return Number((0.290 * stateFactor).toFixed(3))
      }
      
      // 1. 计算基础分
      let base = 0.80 - 0.20 * Math.log10(tlv)
      if (base < 0) base = 0
      
      // 2. 醇类修正
      if (q5Alcohol === 'yes') {
        base += 0.06
      }
      
      // 4. 物理状态修正
      const stateFactor = q1State === 'A' ? 0.2 : 1.0
      const finalValue = base * stateFactor
      
      return Number(finalValue.toFixed(3))
    }
    
    return 0
  }

  // 计算 Persistency
  const calculatePersistency = (
    q1: string,
    q3?: string,
    biodegHalfLife?: number,
    dataSource?: string,
    readyBiodeg?: number,
    bcf?: number,
    atmosRate?: number,
    fishHalfLife?: number,
    chemicalType?: string
  ): number => {
    // 第一阶段：物质身份确认
    if (q1 === 'A') {
      // 无机强酸
      return 0.485
    }
    if (q1 === 'B') {
      // 其他无机物
      return 0.000
    }
    
    // 第三阶段：快速通道
    if (q3 === 'A') {
      // 极快降解/低蓄积
      return 0.000
    }
    if (q3 === 'B') {
      // 醇或类似性低蓄积
      return 0.020
    }
    if (q3 === 'C') {
      // 特殊代谢物质
      return 0.130
    }
    
    // 第四阶段：核心计算
    if (q3 === 'D' && biodegHalfLife !== undefined && readyBiodeg !== undefined) {
      const t = biodegHalfLife
      
      if (readyBiodeg === 1) {
        // 路径1: 易降解
        let result = 0.45 * Math.log10(t)
        // Predicted数据修正
        if (dataSource === 'Predicted') {
          result -= 0.03
        }
        return Number(result.toFixed(3))
      } else if (readyBiodeg === 0) {
        // 路径2: 难降解，需要判断化学类型
        if (chemicalType === '2a') {
          // 2a. 卤代烃类
          const result = 0.32 * Math.log10(t)
          return Number(result.toFixed(3))
        } else if (chemicalType === '2b') {
          // 2b. 醚类或支链烷烃
          const result = 0.45 * Math.log10(t) + 0.32
          return Number(result.toFixed(3))
        }
      }
    }
    
    return 0
  }

  // 计算 Water Hazard
  const calculateWaterHazard = (
    q1: string,
    q2?: string,
    q3_1?: string,
    q3_2?: string,
    lc50?: number,
    kValue?: number
  ): number => {
    // 第一步：物质类别初筛
    if (q1 === 'A') {
      // 强腐蚀性无机酸/碱
      return 0.500
    }
    if (q1 === 'B') {
      // 普通无机盐/缓冲盐
      return 0.000
    }
    
    // 第二步：急性毒性评分
    let s1 = 0.000 // Q1为C时，S1=0
    let s2 = 0.000
    let s3 = 0.000
    let s4 = 0.000
    
    if (q2 === 'A') {
      s2 = 0.500
    } else if (q2 === 'B') {
      s2 = 0.250
    } else if (q2 === 'C') {
      s2 = 0.125
    } else if (q2 === 'D') {
      s2 = 0.000
    }
    
    // 第三步：环境归趋罚分
    // 3.1 持久性罚分
    let penalty_31 = 0.000
    if (q3_1 === 'A') {
      penalty_31 = 0.000
    } else if (q3_1 === 'B') {
      penalty_31 = 0.125
    }
    
    // 3.2 生物累积罚分
    let penalty_32 = 0.000
    if (q3_2 === 'A') {
      penalty_32 = 0.250
    } else if (q3_2 === 'B') {
      penalty_32 = 0.075
    } else if (q3_2 === 'C') {
      penalty_32 = 0.000
    }
    
    s3 = penalty_31 + penalty_32
    
    // 第四步：微量残差计算
    const sum = s1 + s2 + s3
    
    if (sum > 0) {
      // 情形A：Sum > 0
      s4 = 0
    } else {
      // 情形B：Sum = 0，需要计算微量残差
      if (lc50 !== undefined && lc50 > 0 && kValue !== undefined) {
        s4 = kValue / lc50
      }
    }
    
    const total = s1 + s2 + s3 + s4
    return Number(total.toFixed(3))
  }

  // 监听表单值变化，实时计算大因子
  const handleValuesChange = (changedValues: any, allValues: any) => {
    // 处理 Release Potential 的变化
    if (changedValues.rpStep1 !== undefined) {
      setRpStep1(changedValues.rpStep1)
      // 如果选择了A或B，立即计算并设置
      if (changedValues.rpStep1 === 'A' || changedValues.rpStep1 === 'B') {
        const rp = calculateReleasePotential(changedValues.rpStep1)
        setRpCalculatedValue(rp)
        form.setFieldsValue({ releasePotential: rp })
      } else if (changedValues.rpStep1 === 'C') {
        // 选择C时，清空之前的计算结果
        setRpCalculatedValue(0)
        form.setFieldsValue({ releasePotential: 0 })
      }
    }
    
    // 如果是C选项，监听沸点或结构分类的变化
    if (allValues.rpStep1 === 'C') {
      if (changedValues.rpTbp !== undefined || changedValues.rpStructure !== undefined) {
        const tbp = allValues.rpTbp
        const correction = allValues.rpStructure
        if (tbp !== undefined && correction !== undefined) {
          const rp = calculateReleasePotential('C', tbp, correction)
          setRpCalculatedValue(rp)
          form.setFieldsValue({ releasePotential: rp })
        }
      }
    }
    
    // 处理 Fire/Explosives 的变化
    if (changedValues.feStep1 !== undefined) {
      setFeStep1(changedValues.feStep1)
      // 如果选择了A或B，立即计算并设置
      if (changedValues.feStep1 === 'A' || changedValues.feStep1 === 'B') {
        const fe = calculateFireExplos(changedValues.feStep1)
        setFeCalculatedValue(fe)
        form.setFieldsValue({ fireExplos: fe })
      } else if (changedValues.feStep1 === 'C') {
        // 选择C时，清空之前的计算结果
        setFeCalculatedValue(0)
        form.setFieldsValue({ fireExplos: 0 })
      }
    }
    
    // 如果是C选项，监听第二阶段和第三阶段的变化
    if (allValues.feStep1 === 'C') {
      if (changedValues.feStep2 !== undefined) {
        setFeStep2(changedValues.feStep2)
        // 如果选择了A/B/C（氧化性风险），立即计算
        if (changedValues.feStep2 === 'A' || changedValues.feStep2 === 'B' || changedValues.feStep2 === 'C') {
          const fe = calculateFireExplos('C', changedValues.feStep2)
          setFeCalculatedValue(fe)
          form.setFieldsValue({ fireExplos: fe })
        } else if (changedValues.feStep2 === 'D') {
          // 选择D时，清空之前的计算结果，等待第三阶段
          setFeCalculatedValue(0)
          form.setFieldsValue({ fireExplos: 0 })
        }
      }
      
      // 第三阶段：易燃性评估
      if (allValues.feStep2 === 'D' && changedValues.feStep3 !== undefined) {
        const fe = calculateFireExplos('C', 'D', changedValues.feStep3)
        setFeCalculatedValue(fe)
        form.setFieldsValue({ fireExplos: fe })
      }
    }
    
    // 处理 Reaction/Decomposition 的变化
    if (changedValues.rdStep1 !== undefined) {
      setRdStep1(changedValues.rdStep1)
      // 如果选择了B（稀释水溶液），立即计算并设置
      if (changedValues.rdStep1 === 'B') {
        const rd = calculateReactDecom('B')
        setRdCalculatedValue(rd)
        form.setFieldsValue({ reactDecom: rd })
      } else if (changedValues.rdStep1 === 'A') {
        // 选择A时，清空之前的计算结果
        setRdCalculatedValue(0)
        form.setFieldsValue({ reactDecom: 0 })
      }
    }
    
    // 监听 NFPA 数据变化
    if (allValues.rdStep1 === 'A') {
      if (changedValues.rdNfpaYellow !== undefined) {
        setRdNfpaYellow(changedValues.rdNfpaYellow)
      }
      if (changedValues.rdNfpaWhite !== undefined) {
        setRdNfpaWhite(changedValues.rdNfpaWhite)
      }
      if (changedValues.rdStep3 !== undefined) {
        setRdStep3(changedValues.rdStep3)
      }
      
      // 计算结果
      const nfpaY = allValues.rdNfpaYellow
      const nfpaW = allValues.rdNfpaWhite
      const step3 = allValues.rdStep3 || []
      const step4 = allValues.rdStep4
      
      // 如果有足够信息，尝试计算
      if (nfpaY !== undefined || step3.length > 0 || step4) {
        const rd = calculateReactDecom('A', nfpaY, nfpaW, step3, step4)
        setRdCalculatedValue(rd)
        form.setFieldsValue({ reactDecom: rd })
      }
    }
    
    // 处理 Acute Toxicity 的变化
    if (changedValues.atPath !== undefined) {
      setAtPath(changedValues.atPath)
      // 切换路径时清空之前的计算结果
      setAtCalculatedValue(0)
      form.setFieldsValue({ acuteToxicity: 0 })
    }
    
    // 路径 A：IDLH 计算
    if (allValues.atPath === 'A') {
      if (changedValues.atIdlh !== undefined || changedValues.atMw !== undefined) {
        const idlh = allValues.atIdlh
        const mw = allValues.atMw
        if (idlh !== undefined && mw !== undefined && mw > 0) {
          const at = calculateAcuteToxicity('A', idlh, mw)
          setAtCalculatedValue(at)
          form.setFieldsValue({ acuteToxicity: at })
        }
      }
    }
    
    // 路径 B：LD50 计算
    if (allValues.atPath === 'B') {
      if (changedValues.atLd50 !== undefined) {
        const ld50 = allValues.atLd50
        if (ld50 !== undefined && ld50 > 0) {
          const at = calculateAcuteToxicity('B', undefined, undefined, ld50)
          setAtCalculatedValue(at)
          form.setFieldsValue({ acuteToxicity: at })
        }
      }
    }
    
    // 处理 Irritation 的变化
    if (changedValues.irrQ1 !== undefined) {
      setIrrQ1(changedValues.irrQ1)
      // 如果问题1选择了yes，立即计算
      if (changedValues.irrQ1 === 'yes') {
        const irr = calculateIrritation('yes')
        setIrrCalculatedValue(irr)
        form.setFieldsValue({ irritation: irr })
      } else {
        // 选择no时，清空之前的计算结果
        setIrrCalculatedValue(0)
        form.setFieldsValue({ irritation: 0 })
      }
    }
    
    // 问题2的变化
    if (allValues.irrQ1 === 'no' && changedValues.irrQ2 !== undefined) {
      setIrrQ2(changedValues.irrQ2)
      if (changedValues.irrQ2 === 'yes' || changedValues.irrQ2 === 'ethanol') {
        const irr = calculateIrritation('no', changedValues.irrQ2)
        setIrrCalculatedValue(irr)
        form.setFieldsValue({ irritation: irr })
      } else {
        // 选择no时，清空之前的计算结果
        setIrrCalculatedValue(0)
        form.setFieldsValue({ irritation: 0 })
      }
    }
    
    // 问题3的变化
    if (allValues.irrQ1 === 'no' && allValues.irrQ2 === 'no' && changedValues.irrQ3Ph !== undefined) {
      setIrrQ3Ph(changedValues.irrQ3Ph)
      const irr = calculateIrritation('no', 'no', changedValues.irrQ3Ph)
      setIrrCalculatedValue(irr)
      form.setFieldsValue({ irritation: irr })
    }
    
    // 问题4的变化
    if (allValues.irrQ1 === 'no' && allValues.irrQ2 === 'no' && allValues.irrQ3Ph === 'neutral') {
      if (changedValues.irrQ4Codes !== undefined) {
        setIrrQ4Codes(changedValues.irrQ4Codes)
        const irr = calculateIrritation('no', 'no', 'neutral', changedValues.irrQ4Codes)
        setIrrCalculatedValue(irr)
        form.setFieldsValue({ irritation: irr })
      }
    }
    
    // 处理 Chronic Toxicity 的变化
    if (changedValues.ctQ1State !== undefined) {
      setCtQ1State(changedValues.ctQ1State)
    }
    
    if (changedValues.ctQ2 !== undefined) {
      setCtQ2(changedValues.ctQ2)
      // 如果选择了A或B，立即计算
      if (changedValues.ctQ2 === 'A' || changedValues.ctQ2 === 'B') {
        const ct = calculateChronicToxicity(allValues.ctQ1State || '', changedValues.ctQ2)
        setCtCalculatedValue(ct)
        form.setFieldsValue({ 
          chronicToxicity: ct,
          airHazard: ct  // Air Hazard 直接同步 Chronic Toxicity 的值
        })
      } else {
        // 选择C时，清空之前的计算结果
        setCtCalculatedValue(0)
        form.setFieldsValue({ 
          chronicToxicity: 0,
          airHazard: 0
        })
      }
    }
    
    if (allValues.ctQ2 === 'C' && changedValues.ctQ3 !== undefined) {
      setCtQ3(changedValues.ctQ3)
      // 如果选择了A或B，立即计算
      if (changedValues.ctQ3 === 'A' || changedValues.ctQ3 === 'B') {
        const ct = calculateChronicToxicity(allValues.ctQ1State || '', 'C', changedValues.ctQ3)
        setCtCalculatedValue(ct)
        form.setFieldsValue({ 
          chronicToxicity: ct,
          airHazard: ct  // Air Hazard 直接同步 Chronic Toxicity 的值
        })
      } else {
        // 选择C时，清空之前的计算结果
        setCtCalculatedValue(0)
        form.setFieldsValue({ 
          chronicToxicity: 0,
          airHazard: 0
        })
      }
    }
    
    // 核心计算（Q3选C时）
    if (allValues.ctQ2 === 'C' && allValues.ctQ3 === 'C') {
      if (changedValues.ctTlv !== undefined || changedValues.ctQ5Alcohol !== undefined || changedValues.ctSubstanceName !== undefined) {
        const tlv = allValues.ctTlv
        const q5Alcohol = allValues.ctQ5Alcohol
        const substanceName = allValues.ctSubstanceName
        const q1State = allValues.ctQ1State
        
        if (tlv !== undefined && tlv > 0 && q1State) {
          const ct = calculateChronicToxicity(q1State, 'C', 'C', tlv, q5Alcohol, substanceName)
          setCtCalculatedValue(ct)
          form.setFieldsValue({ 
            chronicToxicity: ct,
            airHazard: ct  // Air Hazard 直接同步 Chronic Toxicity 的值
          })
        }
      }
    }
    
    // 处理 Persistency 的变化
    if (changedValues.persQ1 !== undefined) {
      setPersQ1(changedValues.persQ1)
      // 如果选择了A或B，立即计算
      if (changedValues.persQ1 === 'A' || changedValues.persQ1 === 'B') {
        const pers = calculatePersistency(changedValues.persQ1)
        setPersCalculatedValue(pers)
        form.setFieldsValue({ persistency: pers })
      }
      // 选择C时，不清空，等待后续Q3选择
    }
    
    // Q3快速通道
    if (allValues.persQ1 === 'C' && changedValues.persQ3 !== undefined) {
      setPersQ3(changedValues.persQ3)
      // 如果选择了A/B/C，立即计算
      if (changedValues.persQ3 === 'A' || changedValues.persQ3 === 'B' || changedValues.persQ3 === 'C') {
        const pers = calculatePersistency('C', changedValues.persQ3)
        setPersCalculatedValue(pers)
        form.setFieldsValue({ persistency: pers })
      }
      // 选择D时，尝试立即计算（如果已有数据）
      if (changedValues.persQ3 === 'D') {
        const biodegHalfLife = allValues.persBiodegHalfLife
        const dataSource = allValues.persDataSource
        const readyBiodeg = allValues.persReadyBiodeg
        const chemicalType = allValues.persChemicalType
        
        if (biodegHalfLife !== undefined && biodegHalfLife > 0 && readyBiodeg !== undefined) {
          if (readyBiodeg === 0) {
            if (chemicalType) {
              const pers = calculatePersistency(
                'C', 'D', biodegHalfLife, dataSource, readyBiodeg, 
                undefined, undefined, undefined, chemicalType
              )
              setPersCalculatedValue(pers)
              form.setFieldsValue({ persistency: pers })
            }
          } else {
            const pers = calculatePersistency(
              'C', 'D', biodegHalfLife, dataSource, readyBiodeg
            )
            setPersCalculatedValue(pers)
            form.setFieldsValue({ persistency: pers })
          }
        }
      }
    }
    
    // Q3选D时的核心计算（监听所有相关字段的变化）
    if (allValues.persQ1 === 'C' && allValues.persQ3 === 'D') {
      const needsCalculation = 
        changedValues.persBiodegHalfLife !== undefined ||
        changedValues.persDataSource !== undefined ||
        changedValues.persReadyBiodeg !== undefined ||
        changedValues.persChemicalType !== undefined ||
        changedValues.persQ3 !== undefined  // Q3刚选D时也要尝试计算
        
      if (needsCalculation) {
        const biodegHalfLife = allValues.persBiodegHalfLife
        const dataSource = allValues.persDataSource
        const readyBiodeg = allValues.persReadyBiodeg
        const chemicalType = allValues.persChemicalType
        
        if (biodegHalfLife !== undefined && biodegHalfLife > 0 && readyBiodeg !== undefined) {
          // 如果是难降解(0)，必须选择化学类型才能计算
          if (readyBiodeg === 0) {
            if (chemicalType) {
              const pers = calculatePersistency(
                'C', 'D', biodegHalfLife, dataSource, readyBiodeg, 
                undefined, undefined, undefined, chemicalType
              )
              setPersCalculatedValue(pers)
              form.setFieldsValue({ persistency: pers })
            }
          } else {
            // 易降解(1)直接计算
            const pers = calculatePersistency(
              'C', 'D', biodegHalfLife, dataSource, readyBiodeg
            )
            setPersCalculatedValue(pers)
            form.setFieldsValue({ persistency: pers })
          }
        }
      }
      
      // 处理ReadyBiodeg变化，显示/隐藏化学类型选择
      if (changedValues.persReadyBiodeg !== undefined) {
        setPersReadyBiodeg(changedValues.persReadyBiodeg)
        // 如果切换到易降解(1)，清空化学类型
        if (changedValues.persReadyBiodeg === 1) {
          form.setFieldsValue({ persChemicalType: undefined })
          setPersChemicalType('')
        }
      }
      
      if (changedValues.persChemicalType !== undefined) {
        setPersChemicalType(changedValues.persChemicalType)
      }
    }
    
    // 处理 Water Hazard 的变化
    if (changedValues.whQ1 !== undefined) {
      setWhQ1(changedValues.whQ1)
      // 如果选择了A或B，立即计算
      if (changedValues.whQ1 === 'A' || changedValues.whQ1 === 'B') {
        const wh = calculateWaterHazard(changedValues.whQ1)
        setWhCalculatedValue(wh)
        form.setFieldsValue({ waterHazard: wh })
      } else {
        // 选择C时，清空之前的计算结果
        setWhCalculatedValue(0)
        form.setFieldsValue({ waterHazard: 0 })
      }
    }
    
    // Q2急性毒性变化
    if (allValues.whQ1 === 'C' && changedValues.whQ2 !== undefined) {
      setWhQ2(changedValues.whQ2)
      // 任何Q2选择都触发计算（如果有Q3数据）
      const q3_1 = allValues.whQ3_1
      const q3_2 = allValues.whQ3_2
      const lc50 = allValues.whLc50
      const kValue = allValues.whKValue
      
      const wh = calculateWaterHazard('C', changedValues.whQ2, q3_1, q3_2, lc50, kValue)
      setWhCalculatedValue(wh)
      form.setFieldsValue({ waterHazard: wh })
    }
    
    // Q3持久性罚分变化
    if (allValues.whQ1 === 'C' && changedValues.whQ3_1 !== undefined) {
      setWhQ3_1(changedValues.whQ3_1)
      const q2 = allValues.whQ2
      const q3_2 = allValues.whQ3_2
      const lc50 = allValues.whLc50
      const kValue = allValues.whKValue
      
      const wh = calculateWaterHazard('C', q2, changedValues.whQ3_1, q3_2, lc50, kValue)
      setWhCalculatedValue(wh)
      form.setFieldsValue({ waterHazard: wh })
    }
    
    // Q3生物累积罚分变化
    if (allValues.whQ1 === 'C' && changedValues.whQ3_2 !== undefined) {
      setWhQ3_2(changedValues.whQ3_2)
      const q2 = allValues.whQ2
      const q3_1 = allValues.whQ3_1
      const lc50 = allValues.whLc50
      const kValue = allValues.whKValue
      
      const wh = calculateWaterHazard('C', q2, q3_1, changedValues.whQ3_2, lc50, kValue)
      setWhCalculatedValue(wh)
      form.setFieldsValue({ waterHazard: wh })
    }
    
    // Q4微量残差计算（LC50或K值变化）
    if (allValues.whQ1 === 'C') {
      if (changedValues.whLc50 !== undefined || changedValues.whKValue !== undefined) {
        const q2 = allValues.whQ2
        const q3_1 = allValues.whQ3_1
        const q3_2 = allValues.whQ3_2
        const lc50 = allValues.whLc50
        const kValue = allValues.whKValue
        
        const wh = calculateWaterHazard('C', q2, q3_1, q3_2, lc50, kValue)
        setWhCalculatedValue(wh)
        form.setFieldsValue({ waterHazard: wh })
      }
    }
    
    // 处理 Regeneration Factor 的变化
    if (changedValues.regeneration !== undefined) {
      setRegenerationValue(changedValues.regeneration)
    }

    // 处理 Disposal Factor 的变化
    if (changedValues.disposalDint !== undefined || changedValues.disposalPercentage !== undefined) {
      const dint = changedValues.disposalDint ?? allValues.disposalDint ?? 0
      const pDisp = changedValues.disposalPercentage ?? allValues.disposalPercentage ?? 0
      
      setDisposalDint(dint)
      setDisposalPercentage(pDisp)
      
      // 计算公式: D_i = D_int × [1 - (P_disp/100% × ξ_eff)]
      // 其中 ξ_eff = 0.8 (热力学效率折扣)
      const xiEff = 0.8
      const finalD = dint * (1 - (pDisp / 100) * xiEff)
      
      setDisposalValue(finalD)
      form.setFieldsValue({ disposal: finalD })
    }
    
    // 计算安全因子 S = Release Potential + Fire/Explos + React/Decom + Acute Toxicity
    const safetyScore = 
      (allValues.releasePotential || 0) + 
      (allValues.fireExplos || 0) + 
      (allValues.reactDecom || 0) + 
      (allValues.acuteToxicity || 0)
    
    // 计算健康因子 H = Irritation + Chronic Toxicity
    const healthScore = 
      (allValues.irritation || 0) + 
      (allValues.chronicToxicity || 0)
    
    // 计算环境因子 E = Persistency + Air Hazard + Water Hazard
    const envScore = 
      (allValues.persistency || 0) + 
      (allValues.airHazard || 0) + 
      (allValues.waterHazard || 0)
    
    setCalculatedScores({
      safetyScore: Number(safetyScore.toFixed(3)),
      healthScore: Number(healthScore.toFixed(3)),
      envScore: Number(envScore.toFixed(3))
    })
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      
      // 构建完整的试剂数据
      const newReagent: ReagentFactor = {
        id: Date.now().toString(),
        name: values.name,
        density: values.density || 0,
        releasePotential: values.releasePotential || 0,
        fireExplos: values.fireExplos || 0,
        reactDecom: values.reactDecom || 0,
        acuteToxicity: values.acuteToxicity || 0,
        irritation: values.irritation || 0,
        chronicToxicity: values.chronicToxicity || 0,
        persistency: values.persistency || 0,
        airHazard: values.airHazard || 0,
        waterHazard: values.waterHazard || 0,
        safetyScore: calculatedScores.safetyScore,
        healthScore: calculatedScores.healthScore,
        envScore: calculatedScores.envScore,
        regeneration: values.regeneration || 0,
        disposal: values.disposal || 0,
        isCustom: true // 标记为用户自定义试剂
      }
      
      onOk(newReagent)
      form.resetFields()
      setCalculatedScores({ safetyScore: 0, healthScore: 0, envScore: 0 })
      message.success('试剂添加成功！')
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setCalculatedScores({ safetyScore: 0, healthScore: 0, envScore: 0 })
    setRpStep1('')
    setRpCalculatedValue(0)
    setFeStep1('')
    setFeStep2('')
    setFeCalculatedValue(0)
    setRdStep1('')
    setRdNfpaYellow(undefined)
    setRdNfpaWhite('')
    setRdStep3([])
    setRdCalculatedValue(0)
    setAtPath('')
    setAtCalculatedValue(0)
    setIrrQ1('')
    setIrrQ2('')
    setIrrQ3Ph('')
    setIrrQ4Codes([])
    setIrrCalculatedValue(0)
    setCtQ1State('')
    setCtQ2('')
    setCtQ3('')
    setCtCalculatedValue(0)
    setPersQ1('')
    setPersQ3('')
    setPersReadyBiodeg(undefined)
    setPersChemicalType('')
    setPersCalculatedValue(0)
    setWhQ1('')
    setWhQ2('')
    setWhQ3_1('')
    setWhQ3_2('')
    setWhCalculatedValue(0)
    setRegenerationValue(undefined)
    setDisposalDint(undefined)
    setDisposalPercentage(undefined)
    setDisposalValue(undefined)
    onCancel()
  }

  return (
    <Modal
      title={
        <Space>
          <ExperimentOutlined style={{ color: '#1890ff' }} />
          <span>添加新试剂</span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={1000}
      okText="添加"
      cancelText="取消"
      destroyOnClose
      bodyStyle={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px 24px' }}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{
          density: 0,
          rpStep1: undefined,
          rpTbp: undefined,
          rpStructure: undefined,
          feStep1: undefined,
          feStep2: undefined,
          feFlashPoint: undefined,
          rdStep1: undefined,
          rdNfpaYellow: undefined,
          rdNfpaWhite: undefined,
          rdStep3: [],
          atPath: undefined,
          atIdlh: undefined,
          atLd50: undefined,
          irrQ1: undefined,
          irrQ2: undefined,
          irrQ3Ph: undefined,
          irrQ4Codes: [],
          ctQ1State: undefined,
          ctQ2: undefined,
          ctQ3: undefined,
          ctTlv: undefined,
          ctQ5Alcohol: undefined,
          ctSubstanceName: undefined,
          persQ1: undefined,
          persQ3: undefined,
          persBiodegHalfLife: undefined,
          persDataSource: undefined,
          persReadyBiodeg: undefined,
          persBcf: undefined,
          persAtmosRate: undefined,
          persFishHalfLife: undefined,
          persChemicalType: undefined,
          whQ1: undefined,
          whQ2: undefined,
          whQ3_1: undefined,
          whQ3_2: undefined,
          whLc50: undefined,
          whKValue: undefined,
          regeneration: undefined,
          disposalDint: undefined,
          disposalPercentage: undefined,
          disposal: 0,
          releasePotential: 0,
          fireExplos: 0,
          reactDecom: 0,
          acuteToxicity: 0,
          irritation: 0,
          chronicToxicity: 0,
          persistency: 0,
          airHazard: 0,
          waterHazard: 0
        }}
      >
        {/* 基本信息 */}
        <Divider orientation="left" style={{ fontSize: 15, fontWeight: 'bold', color: '#262626', marginTop: 0, marginBottom: 16 }}>基本信息</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="试剂名称"
              name="name"
              rules={[
                { required: true, message: '请输入试剂名称' },
                { min: 2, message: '试剂名称至少2个字符' }
              ]}
            >
              <Input placeholder="例如: Methanol, Ethanol" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="密度 ρ (g/mL)"
              name="density"
              rules={[{ required: true, message: '请输入密度值' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={10}
                step={0.001}
                precision={3}
                placeholder="0.789"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 安全因子 */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#ff4d4f', borderTopWidth: 2 }}>
          <Space size={8}>
            <FireOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            <span>安全因子 (Safety Factors)</span>
          </Space>
        </Divider>
        
        {/* Release Potential 决策树 */}
        <div style={{ marginBottom: 16, background: '#fff1f0', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #ff4d4f' }}>
          <Text strong style={{ fontSize: 15, color: '#cf1322' }}>
            📊 释放潜力 (Release Potential) 评估
          </Text>
        </div>
        
        {/* 第一步：物质类别 */}
        <Form.Item
          label={<Text strong>第一步：物质类别初筛</Text>}
          name="rpStep1"
          rules={[{ required: true, message: '请选择物质类别' }]}
          tooltip={
            <div style={{ maxWidth: 400 }}>
              <div style={{ marginBottom: 8 }}>请根据物质在常温常压下的物理形态及属性选择：</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A.</strong> 本质是气体溶于水，或极易挥发的液体</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B.</strong> 常温下为固体(离子化合物)，或沸点极高(&gt;200°C)的难挥发液体</div>
              <div style={{ fontSize: 11 }}><strong>C.</strong> 沸点在30°C ~ 200°C之间的液体</div>
            </div>
          }
        >
          <Select 
            placeholder="请判断该物质在常温常压下的物理形态及属性"
            onChange={(value) => setRpStep1(value)}
          >
            {RP_STEP1_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value} title={opt.description}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二步：沸点输入 (仅C选项显示) */}
        {rpStep1 === 'C' && (
          <>
            <Form.Item
              label={<Text strong>第二步：数据录入 - 物质沸点</Text>}
              name="rpTbp"
              rules={[
                { required: true, message: '请输入物质的标准沸点' },
                { type: 'number', min: 30, max: 200, message: '沸点应在30-200°C之间' }
              ]}
              tooltip="请查询该物质的标准沸点(Tbp)，并填入此处"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="例如：甲醇的沸点为 64.7"
                addonAfter="°C"
                step={0.1}
                precision={1}
              />
            </Form.Item>

            {/* 第三步：结构特征修正 */}
            <Form.Item
              label={<Text strong>第三步：结构特征修正</Text>}
              name="rpStructure"
              rules={[{ required: true, message: '请选择化学结构分类' }]}
              tooltip={
                <div style={{ maxWidth: 400 }}>
                  <div style={{ marginBottom: 8 }}>请判断该物质的化学结构属于哪一类：</div>
                  <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A. 醇类：</strong>分子中含有羟基(-OH)，且能形成氢键</div>
                  <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B. 醚类：</strong>分子中含有醚键(-O-)</div>
                  <div style={{ fontSize: 11, marginBottom: 6 }}><strong>C. 高度支链化烷烃：</strong>名称中带有"异"或"叔"，或结构高度分叉</div>
                  <div style={{ fontSize: 11 }}><strong>D. 标准溶剂：</strong>上述三类以外的其他挥发性液体</div>
                </div>
              }
            >
              <Select placeholder="请判断该物质的化学结构属于哪一类">
                {RP_STEP3_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value} title={opt.description}>
                    {opt.label} (修正: {opt.correction > 0 ? '+' : ''}{opt.correction})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {/* Release Potential 计算结果显示 */}
        {rpStep1 && (
          <Alert
            message="Release Potential 计算结果"
            description={
              <div>
                {rpStep1 === 'A' && (
                  <Text>
                    【结果A】溶解气体/高挥发性液体 → Release Potential = <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>1.0</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (依据：高流动性风险，参考文献 Figure 2a 中 "Gas dissolved but releasable" 类别)
                    </Text>
                  </Text>
                )}
                {rpStep1 === 'B' && (
                  <Text>
                    【结果B】固体/难挥发物质 → Release Potential = <Text strong style={{ color: '#52c41a', fontSize: 16 }}>0.0001</Text> (≈ 0)
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (依据：极低流动性，参考文献 Figure 2a 中 "Solid" 或高沸点液体类别)
                    </Text>
                  </Text>
                )}
                {rpStep1 === 'C' && rpCalculatedValue > 0 && (
                  <Text>
                    【结果C】挥发性液体 → Release Potential = <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{rpCalculatedValue.toFixed(4)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      计算公式：RP = 0.885 - (0.00333 × {form.getFieldValue('rpTbp')}°C) + {form.getFieldValue('rpStructure')} = {rpCalculatedValue.toFixed(4)}
                    </Text>
                  </Text>
                )}
              </div>
            }
            type={rpStep1 === 'A' ? 'error' : rpStep1 === 'B' ? 'success' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 releasePotential 值 */}
        <Form.Item name="releasePotential" hidden>
          <InputNumber />
        </Form.Item>

        {/* Fire/Explosives 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#fff1f0', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #ff4d4f' }}>
          <Text strong style={{ fontSize: 15, color: '#cf1322' }}>
            🔥 火灾/爆炸 (Fire/Explosives) 评估
          </Text>
        </div>
        
        {/* 第一阶段：快速筛选 */}
        <Form.Item
          label={<Text strong>第一阶段：快速筛选（排除绝对安全物质）</Text>}
          name="feStep1"
          rules={[{ required: true, message: '请选择物质类别' }]}
          tooltip={
            <div style={{ maxWidth: 400 }}>
              <div style={{ marginBottom: 8 }}>首先判断该物质是否对安全无威胁：</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A.</strong> 本质上不可燃、不助燃、不氧化</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B.</strong> 非氧化性的常规盐类（⚠️ 如果是氧化剂，请选择C）</div>
              <div style={{ fontSize: 11 }}><strong>C.</strong> 需要进一步评估其氧化性和易燃性</div>
            </div>
          }
        >
          <Select 
            placeholder="请判断该物质属于以下哪种类型"
            onChange={(value) => setFeStep1(value)}
          >
            {FE_STEP1_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value} 
                title={opt.description + (opt.note ? ` (⚠️ ${opt.note})` : '')}
              >
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二阶段：氧化性风险评估 (仅C选项显示) */}
        {feStep1 === 'C' && (
          <Form.Item
            label={<Text strong>第二阶段：氧化性风险评估 (Oxygen Source)</Text>}
            name="feStep2"
            rules={[{ required: true, message: '请选择是否有氧化性风险代码' }]}
            tooltip={
              <div style={{ maxWidth: 400 }}>
                <div style={{ marginBottom: 8 }}>物质如果能提供氧气助燃（R7, R8, R9），即使自身不燃烧也被视为高风险：</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A/B/C：</strong>具有R7/R8/R9标识，可能引发火灾或爆炸</div>
                <div style={{ fontSize: 11 }}><strong>D：</strong>上述都没有，不具有显著氧化性风险</div>
              </div>
            }
          >
            <Select 
              placeholder="查看该物质的 R-codes (危险代码) 或 GHS 分类，是否包含以下任意一项？"
              onChange={(value) => setFeStep2(value)}
            >
              {FE_STEP2_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value} title={opt.description}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 第三阶段：易燃性风险评估 (仅当feStep2为D时显示) */}
        {feStep1 === 'C' && feStep2 === 'D' && (
          <Form.Item
            label={<Text strong>第三阶段：易燃性风险评估 (Fuel Hazard)</Text>}
            name="feStep3"
            rules={[{ required: true, message: '请选择闪点情况' }]}
            tooltip={
              <div style={{ maxWidth: 400 }}>
                <div style={{ marginBottom: 8 }}>这是针对有机溶剂最关键的步骤，基于闪点或法规分类（默认工艺温度为室温 25°C）：</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A：</strong>闪点 &lt; 21°C，或 R11 - 高度易燃</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B：</strong>闪点 21-60°C，或 R10 - 可燃</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>C：</strong>闪点 &gt; 60°C - 低风险</div>
                <div style={{ fontSize: 11 }}><strong>D：</strong>无闪点，且未被标记为 R11</div>
              </div>
            }
          >
            <Select placeholder="请根据闪点或易燃标识选择">
              {FE_STEP3_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value} title={opt.description}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Fire/Explosives 计算结果显示 */}
        {feStep1 && (
          <Alert
            message="Fire/Explosives 计算结果"
            description={
              <div>
                {(feStep1 === 'A' || feStep1 === 'B') && (
                  <Text>
                    【结果】完全惰性/非氧化性盐类 → Fire/Explos. Index = <Text strong style={{ color: '#52c41a', fontSize: 16 }}>0.000</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (依据：无燃烧或助燃风险，不需要进一步评估)
                    </Text>
                  </Text>
                )}
                {feStep1 === 'C' && (feStep2 === 'A' || feStep2 === 'B' || feStep2 === 'C') && (
                  <Text>
                    【结果】具有氧化性风险 (R7/R8/R9) → Fire/Explos. Index = <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>1.000</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (依据：高氧化性，可能引发火灾或爆炸)
                    </Text>
                  </Text>
                )}
                {feStep1 === 'C' && feStep2 === 'D' && feCalculatedValue > 0 && (
                  <Text>
                    【结果】易燃性评估 → Fire/Explos. Index = <Text strong style={{ color: feCalculatedValue === 1 ? '#ff4d4f' : feCalculatedValue === 0.5 ? '#fa8c16' : '#52c41a', fontSize: 16 }}>{feCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {feCalculatedValue === 1.000 && '(依据：高度易燃，闪点 < 21°C 或标记为 R11)'}
                      {feCalculatedValue === 0.500 && '(依据：中等风险，闪点 21-60°C 或标记为 R10)'}
                      {feCalculatedValue === 0.000 && '(依据：低风险，闪点 > 60°C 或无闪点且未标记)'}
                    </Text>
                  </Text>
                )}
              </div>
            }
            type={feCalculatedValue >= 1 ? 'error' : feCalculatedValue > 0 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 fireExplos 值 */}
        <Form.Item name="fireExplos" hidden>
          <InputNumber />
        </Form.Item>

        {/* Reaction/Decomposition 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#fff7e6', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #fa8c16' }}>
          <Text strong style={{ fontSize: 15, color: '#d46b08' }}>
            ⚗️ 反应/分解 (Reaction/Decomposition) 评估
          </Text>
        </div>
        
        {/* 第一阶段：基础信息筛选 */}
        <Form.Item
          label={<Text strong>第一阶段：基础信息与快速筛选</Text>}
          name="rdStep1"
          rules={[{ required: true, message: '请选择物质形式' }]}
          tooltip="首先判断该物质在工艺中的存在形式"
        >
          <Select 
            placeholder="该物质在工艺中的存在形式是什么？"
            onChange={(value) => setRdStep1(value)}
          >
            {RD_STEP1_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={opt.description + (opt.note ? ` 💡 ${opt.note}` : '')}
              >
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二阶段：查找 NFPA 704 数据 (仅A选项显示) */}
        {rdStep1 === 'A' && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text>黄色菱形 (Instability/Reactivity) 的数字</Text>}
                  name="rdNfpaYellow"
                  rules={[{ required: true, message: '请填写黄色菱形的数字' }]}
                  tooltip="第二阶段：查找 NFPA 704 数据（核心步骤）- 请在 Google 或化学品数据库（如 ChemicalBook, Cameo Chemicals）中搜索'物质英文名 + NFPA 704'，找到菱形标签。NFPA 704 黄色菱形代表反应性/不稳定性，数值范围 0-4"
                >
                  <Select 
                    placeholder="请选择 0-4"
                    onChange={(value) => setRdNfpaYellow(value)}
                  >
                    <Option value={0}>0 - 稳定</Option>
                    <Option value={1}>1 - 通常稳定，但在高温高压下可能不稳定</Option>
                    <Option value={2}>2 - 剧烈化学变化，但不会爆炸</Option>
                    <Option value={3}>3 - 可能爆炸，但需要强起爆源</Option>
                    <Option value={4}>4 - 室温下可能爆炸</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text>白色菱形 (Special Hazard) 是否有标识</Text>}
                  name="rdNfpaWhite"
                  tooltip='NFPA 704 白色菱形代表特殊危险，常见标识：W（遇水反应）、OX（氧化剂）'
                >
                  <Select 
                    placeholder="请选择"
                    onChange={(value) => setRdNfpaWhite(value)}
                    allowClear
                  >
                    <Option value="无">无标识</Option>
                    <Option value="W">W - 遇水反应 (Water Reactive)</Option>
                    <Option value="OX">OX - 氧化剂 (Oxidizer)</Option>
                    <Option value="其他">其他标识</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 第三阶段：不兼容性与特殊风险判定 */}
            <Form.Item
              label={<Text strong>第三阶段：不兼容性与特殊风险判定</Text>}
              name="rdStep3"
              tooltip="基于 Q2 的结果或物质特性，判断是否有特殊风险（可多选）"
            >
              <Select
                mode="multiple"
                placeholder="该物质是否符合以下任一描述？（可多选，若无请选D）"
                onChange={(value) => setRdStep3(value)}
              >
                {RD_STEP3_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value} title={opt.description}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 第四阶段：化学结构检查（针对有机物，当NFPA数据不明确时） */}
            {(rdNfpaYellow === undefined || rdNfpaYellow === 0) && (!rdStep3 || rdStep3.includes('D') || rdStep3.length === 0) && (
              <Form.Item
                label={<Text strong>第四阶段：化学结构检查（针对有机物）</Text>}
                name="rdStep4"
                tooltip="如果找不到 NFPA 数据，请检查分子结构"
              >
                <Select placeholder="(仅针对有机物) 该物质是否包含不稳定基团？">
                  {RD_STEP4_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value} title={opt.description}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </>
        )}

        {/* Reaction/Decomposition 计算结果显示 */}
        {rdStep1 && (
          <Alert
            message="Reaction/Decomposition 计算结果"
            description={
              <div>
                {rdStep1 === 'B' && (
                  <Text>
                    【结果】稀释水溶液（非强氧化性） → React./Decom. = <Text strong style={{ color: '#52c41a', fontSize: 16 }}>0.000</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (依据：HPLC-EAT 规则，以水为主的稀缓冲液通常忽略其贡献)
                    </Text>
                  </Text>
                )}
                {rdStep1 === 'A' && rdCalculatedValue >= 0 && (
                  <Text>
                    【第五阶段：计算结果】纯物质评估 → React./Decom. = <Text strong style={{ 
                      color: rdCalculatedValue >= 0.800 ? '#ff4d4f' : rdCalculatedValue >= 0.600 ? '#fa8c16' : '#52c41a', 
                      fontSize: 16 
                    }}>{rdCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {rdCalculatedValue === 0.800 && rdStep3 && (rdStep3.includes('A') || rdStep3.includes('B') || rdStep3.includes('C')) && 
                        '(依据：最高优先级 - 不兼容性，有 W/OX 标记或强酸强碱)'}
                      {rdCalculatedValue === 0.800 && rdNfpaYellow !== undefined && rdNfpaYellow >= 2 && 
                        '(依据：次高优先级 - NFPA 黄色数字 ≥ 2，副反应风险)'}
                      {rdCalculatedValue === 0.600 && 
                        '(依据：中等优先级 - NFPA 黄色数字 = 1，或含不稳定基团)'}
                      {rdCalculatedValue === 0.000 && 
                        '(依据：低风险 - NFPA 黄色数字 = 0，或绝对稳定结构)'}
                    </Text>
                  </Text>
                )}
              </div>
            }
            type={rdCalculatedValue >= 0.800 ? 'error' : rdCalculatedValue >= 0.600 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 reactDecom 值 */}
        <Form.Item name="reactDecom" hidden>
          <InputNumber />
        </Form.Item>

        {/* Acute Toxicity 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#f9f0ff', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #722ed1' }}>
          <Text strong style={{ fontSize: 15, color: '#531dab' }}>
            ☠️ 急性毒性 (Acute Toxicity) 评估
          </Text>
        </div>
        
        {/* 第一阶段：路径选择 */}
        <Form.Item
          label={<Text strong>第一阶段：物质分类与路径选择</Text>}
          name="atPath"
          rules={[{ required: true, message: '请选择计算路径' }]}
          tooltip="不同的物质使用不同的毒性数据源"
        >
          <Select 
            placeholder="该物质属于以下哪一类？"
            onChange={(value) => setAtPath(value)}
          >
            {AT_PATH_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* 路径 A：IDLH 计算 */}
        {atPath === 'A' && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text>【填空 1】查找或输入 IDLH (ppm)</Text>}
                  name="atIdlh"
                  rules={[{ required: true, message: '请输入 IDLH 值' }]}
                  tooltip="【路径 A】计算挥发性物质急性毒性（基于 IDLH）- 适用于：甲醇、乙腈、THF 等有机溶剂。请查看下方的常用溶剂标准值，或查询 NIOSH 数据库"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="例如：甲醇的 IDLH 为 6000"
                    addonAfter="ppm"
                    min={0}
                    step={100}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text>物质分子量 (MW)</Text>}
                  name="atMw"
                  rules={[{ required: true, message: '请输入分子量' }]}
                  tooltip="物质的分子量，用于浓度换算"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="例如：甲醇的 MW 为 32.04"
                    addonAfter="g/mol"
                    min={0}
                    step={0.01}
                    precision={2}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ background: '#f0f5ff', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13 }}>HPLC 常用物质标准 IDLH 建议值：</Text>
              <div style={{ marginTop: 8 }}>
                {COMMON_IDLH_VALUES.map((item, index) => (
                  <div key={index} style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>
                      • {item.name}: 填 <Text strong style={{ color: '#1890ff' }}>{item.value}</Text>
                      {item.note && <Text type="secondary" style={{ fontSize: 11 }}> ({item.note})</Text>}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 路径 B：LD50 计算 */}
        {atPath === 'B' && (
          <>
            <Form.Item
              label={<Text>【填空 1】输入 LD50 数据</Text>}
              name="atLd50"
              rules={[{ required: true, message: '请输入 LD50 值' }]}
              tooltip="【路径 B】计算固体无机物急性毒性（基于 LD50）- 适用于：磷酸盐、乙酸铵等固体添加剂。请查找该物质的大鼠经口 LD50 (Oral Rat LD50)，数据来源：MSDS 或 Sigma-Aldrich 官网"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="例如：磷酸二氢钠的 LD50 约为 8290"
                addonAfter="mg/kg"
                min={0}
                step={10}
              />
            </Form.Item>

            <Alert
              message="快速判断规则（无需计算器）"
              description={
                <div>
                  <Text>• 如果 LD50 ≥ 2000（如磷酸盐）→ 直接填 <Text strong style={{ color: '#52c41a' }}>0.000</Text></Text>
                  <br />
                  <Text>• 如果 LD50 ≤ 20（剧毒）→ 直接填 <Text strong style={{ color: '#ff4d4f' }}>1.000</Text></Text>
                  <br />
                  <Text>• 只有在 20 ~ 2000 之间才需要用公式计算</Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {/* Acute Toxicity 计算结果显示 */}
        {atPath && atCalculatedValue >= 0 && (
          <Alert
            message="Acute Toxicity 计算结果"
            description={
              <div>
                {atPath === 'A' && (
                  <Text>
                    【结果】挥发性物质（IDLH 路径） → Acute Toxicity = <Text strong style={{ 
                      color: atCalculatedValue >= 0.8 ? '#ff4d4f' : atCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                      fontSize: 16 
                    }}>{atCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      计算公式：C = ({form.getFieldValue('atIdlh')} × {form.getFieldValue('atMw')}) / 24.45 = {((form.getFieldValue('atIdlh') || 0) * (form.getFieldValue('atMw') || 0) / 24.45).toFixed(2)} mg/m³
                      <br />
                      Acute Value = 1.24 - 0.25 × log₁₀({((form.getFieldValue('atIdlh') || 0) * (form.getFieldValue('atMw') || 0) / 24.45).toFixed(2)}) = {atCalculatedValue.toFixed(3)}
                    </Text>
                  </Text>
                )}
                {atPath === 'B' && (
                  <Text>
                    【结果】固体无机物（LD50 路径） → Acute Toxicity = <Text strong style={{ 
                      color: atCalculatedValue >= 0.8 ? '#ff4d4f' : atCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                      fontSize: 16 
                    }}>{atCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {form.getFieldValue('atLd50') >= 2000 && '快速判断：LD50 ≥ 2000 (如磷酸盐) → 0.000'}
                      {form.getFieldValue('atLd50') <= 20 && '快速判断：LD50 ≤ 20 (剧毒) → 1.000'}
                      {form.getFieldValue('atLd50') > 20 && form.getFieldValue('atLd50') < 2000 && 
                        `计算公式：Acute Value = 1.65 - 0.5 × log₁₀(${form.getFieldValue('atLd50')}) = ${atCalculatedValue.toFixed(3)}`
                      }
                    </Text>
                  </Text>
                )}
              </div>
            }
            type={atCalculatedValue >= 0.8 ? 'error' : atCalculatedValue >= 0.5 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 acuteToxicity 值 */}
        <Form.Item name="acuteToxicity" hidden>
          <InputNumber />
        </Form.Item>

        {/* 健康因子 */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#ff7a45', borderTopWidth: 2 }}>
          <Space size={8}>
            <HeartOutlined style={{ color: '#ff7a45', fontSize: 18 }} />
            <span>健康因子 (Health Factors)</span>
          </Space>
        </Divider>

        {/* Irritation 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#fff7e6', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #ff7a45' }}>
          <Text strong style={{ fontSize: 15, color: '#d4380d' }}>
            🔬 刺激性 (Irritation) 评估
          </Text>
        </div>

        {/* 问题 1：严重腐蚀性 */}
        <Form.Item
          label={<Text strong>问题 1：是否存在严重腐蚀性代码？</Text>}
          name="irrQ1"
          rules={[{ required: true, message: '请选择' }]}
          tooltip="第一阶段：R-codes 快速判定（适用于绝大多数化学品）- 请查看物质的 MSDS 或标签上的 R-codes（风险代码），并回答下列问题。一旦在某个问题中得到'最终结果'，请停止计算。检查该物质是否包含 R35（引起严重灼伤）或 R34（引起灼伤）"
        >
          <Select 
            placeholder="该物质是否包含 R35（引起严重灼伤）或 R34（引起灼伤）？"
            onChange={(value) => setIrrQ1(value)}
          >
            {IRR_Q1_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>
                <Text strong>{opt.label}</Text>
                {opt.result !== undefined && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    → 结果: {opt.result.toFixed(3)}
                  </Text>
                )}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 问题 2：明显刺激性（仅当Q1选no时显示） */}
        {irrQ1 === 'no' && (
          <Form.Item
            label={<Text strong>问题 2：是否存在明显刺激性或严重损害代码？</Text>}
            name="irrQ2"
            rules={[{ required: true, message: '请选择' }]}
            tooltip="检查是否包含 R36/R37/R38/R41/R48"
          >
            <Select 
              placeholder="该物质是否包含以下任一代码：R36/R37/R38/R41/R48？"
              onChange={(value) => setIrrQ2(value)}
            >
              {IRR_Q2_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  <Text strong>{opt.label}</Text>
                  {opt.result !== undefined && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      → 结果: {opt.result.toFixed(3)}
                    </Text>
                  )}
                  {opt.note && (
                    <Text type="warning" style={{ marginLeft: 8, fontSize: 11 }}>
                      ({opt.note})
                    </Text>
                  )}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 第二阶段：pH判定（仅当Q1和Q2都选no时显示） */}
        {irrQ1 === 'no' && irrQ2 === 'no' && (
          <>
            <div style={{ background: '#f0f5ff', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>第二阶段：无机物/无代码物质的 pH 程序</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                适用于缓冲液、盐类（如磷酸二氢钠、碳酸铵等）没有上述 R 代码的物质
              </Text>
            </div>

            <Form.Item
              label={<Text strong>问题 3：测量或查询物质在工艺条件（假设 1M 浓度）下的 pH 值</Text>}
              name="irrQ3Ph"
              rules={[{ required: true, message: '请选择 pH 范围' }]}
              tooltip="根据物质的 pH 值选择对应区间"
            >
              <Select 
                placeholder="该物质的 pH 值属于哪个范围？"
                onChange={(value) => setIrrQ3Ph(value)}
              >
                {IRR_Q3_PH_RANGES.map(opt => (
                  <Option 
                    key={opt.value} 
                    value={opt.value}
                    title={opt.description}
                  >
                    {opt.label} {opt.result !== undefined && `(结果: ${opt.result.toFixed(3)})`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {/* 第三阶段：微量危害累加（仅当前面都选择了neutral时显示） */}
        {irrQ1 === 'no' && irrQ2 === 'no' && irrQ3Ph === 'neutral' && (
          <>
            <div style={{ background: '#e6fffb', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>第三阶段：微量危害累加（兜底计算）</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                该物质既无强腐蚀/刺激 R 代码，pH 值也相对温和。我们需要计算它可能存在的微弱潜在危害。
              </Text>
            </div>

            <Form.Item
              label={<Text strong>问题 4：累加计算（初始分数为 0）</Text>}
              name="irrQ4Codes"
              tooltip="检查是否含有以下特定代码，可多选"
            >
              <Select
                mode="multiple"
                placeholder="请检查是否含有以下特定代码，并将对应数值相加（可多选，无则不选）"
                onChange={(value) => setIrrQ4Codes(value)}
              >
                {IRR_Q4_CODES.map(opt => (
                  <Option key={opt.code} value={opt.code}>
                    <div>
                      <Text strong>{opt.label}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        (+ {opt.value.toFixed(3)})
                      </Text>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Alert
              message="计算公式"
              description={
                <Text>
                  Irritation = 0 + (R40得分) + (R20系列得分) + (R50系列得分)
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    注意：如果以上都没有，且 pH 为中性，则结果为 0
                  </Text>
                </Text>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {/* Irritation 计算结果显示 */}
        {irrQ1 && irrCalculatedValue >= 0 && (
          <Alert
            message="Irritation 计算结果"
            description={
              <div>
                <Text>
                  【最终结果】Irritation = <Text strong style={{ 
                    color: irrCalculatedValue >= 1.0 ? '#ff4d4f' : irrCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{irrCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {irrQ1 === 'yes' && '(依据：Figure 3a - 腐蚀性 C级，R34/R35，Physical Value = 1)'}
                    {irrQ2 === 'yes' && '(依据：Figure 3a - 刺激性 Xi级，R36/37/38，Index Value ≈ 0.625)'}
                    {irrQ2 === 'ethanol' && '(依据：乙醇特例，直接填 0)'}
                    {irrQ3Ph === 'strong' && '(依据：Figure 3a - pH < 2 或 > 11.5，最高风险)'}
                    {irrQ3Ph === 'moderate' && '(依据：Figure 3a - pH 中等范围，中等风险)'}
                    {irrQ3Ph === 'neutral' && irrCalculatedValue > 0 && 
                      `(依据：微量危害累加，共选中 ${irrQ4Codes?.length || 0} 项代码)`
                    }
                    {irrQ3Ph === 'neutral' && irrCalculatedValue === 0 && 
                      '(依据：pH 中性且无特定危害代码，结果为 0)'}
                  </Text>
                </Text>
              </div>
            }
            type={irrCalculatedValue >= 1.0 ? 'error' : irrCalculatedValue >= 0.5 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 irritation 值 */}
        <Form.Item name="irritation" hidden>
          <InputNumber />
        </Form.Item>

        {/* Chronic Toxicity 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#fff1f0', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #f5222d' }}>
          <Text strong style={{ fontSize: 15, color: '#a8071a' }}>
            ⚠️ 慢性毒性 (Chronic Toxicity) 评估
          </Text>
        </div>

        {/* 第一步：物理状态 */}
        <Form.Item
          label={<Text strong>第一步：物理状态 (Physical State)</Text>}
          name="ctQ1State"
          rules={[{ required: true, message: '请选择物理状态' }]}
          tooltip="该物质在常温常压下的物理状态是什么？"
        >
          <Select 
            placeholder="该物质在常温常压下的物理状态是什么？"
            onChange={(value) => setCtQ1State(value)}
          >
            {CT_Q1_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二步：高危一票否决 */}
        <Form.Item
          label={<Text strong>第二步：高危一票否决 (High Hazard Check)</Text>}
          name="ctQ2"
          rules={[{ required: true, message: '请选择' }]}
          tooltip='检查 MSDS 中的"危险性标述"或 R-codes/H-codes'
        >
          <Select 
            placeholder='检查 MSDS 中的"危险性标述"或 R-codes/H-codes，是否包含以下内容？'
            onChange={(value) => setCtQ2(value)}
          >
            {CT_Q2_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={opt.description}
              >
                {opt.label} {opt.result !== undefined && `(结果: ${opt.result.toFixed(3)})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第三步：无毒豁免（仅当Q2选C时显示） */}
        {ctQ2 === 'C' && (
          <Form.Item
            label={<Text strong>第三步：无毒豁免 (Safety Exemption)</Text>}
            name="ctQ3"
            rules={[{ required: true, message: '请选择' }]}
            tooltip='该物质是否属于以下"低毒/无毒"类别？'
          >
            <Select 
              placeholder='该物质是否属于以下"低毒/无毒"类别？'
              onChange={(value) => setCtQ3(value)}
            >
              {CT_Q3_OPTIONS.map(opt => (
                <Option 
                  key={opt.value} 
                  value={opt.value}
                  title={opt.description}
                >
                  {opt.label} {opt.result !== undefined && `(结果: ${opt.result.toFixed(3)})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 第四步：数据采集与核心计算（仅当Q2选C且Q3选C时显示） */}
        {ctQ2 === 'C' && ctQ3 === 'C' && (
          <>
            <Form.Item
              label={<Text>物质名称（可选，用于二氯甲烷特例判断）</Text>}
              name="ctSubstanceName"
              tooltip="第四步：数据采集与核心计算 (Core Calculation) - 如果没有得出结果，请将以下数据代入公式计算。如果是二氯甲烷，请填写，系统将使用特殊值 0.290"
            >
              <Input placeholder="例如：二氯甲烷" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>Q4. [填空] ACGIH TLV-TWA 值</Text>}
                  name="ctTlv"
                  rules={[{ required: true, message: '请输入 TLV 值' }]}
                  tooltip="必须使用 mg/m³ 为单位。如果是 ppm，请根据分子量换算"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请查找 TLV-TWA 值"
                    addonAfter="mg/m³"
                    min={0}
                    step={1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>Q5. [选择] 是否为醇类？</Text>}
                  name="ctQ5Alcohol"
                  rules={[{ required: true, message: '请选择' }]}
                  tooltip='该物质是否为"醇类 (Alcohol, -OH)"且不是剧毒品？判别标准：名字里带"醇"，如乙醇、异丙醇，但不包含甲醇'
                >
                  <Select placeholder="是否为醇类（-OH）且不是剧毒品？">
                    {CT_Q5_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        <Text strong>{opt.label}</Text>
                        {opt.correction > 0 && (
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            (修正: +{opt.correction})
                          </Text>
                        )}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Alert
              message="最终计算公式"
              description={
                <div>
                  <Text strong>1. 计算基础分 (Base Score):</Text>
                  <br />
                  <Text code>Base = 0.80 - 0.20 × log₁₀(TLV 数值)</Text>
                  <Text type="secondary"> (注：如果结果小于 0，取 0)</Text>
                  <br /><br />
                  <Text strong>2. 醇类修正 (Alcohol Correction):</Text>
                  <br />
                  <Text>如果 Q5 选了 A (是醇类) → 基础分 + 0.06</Text>
                  <br /><br />
                  <Text strong>3. 二氯甲烷特例 (DCM Exception):</Text>
                  <br />
                  <Text>如果是二氯甲烷，直接取值 0.290，忽略上述公式</Text>
                  <br /><br />
                  <Text strong>4. 物理状态修正 (Final State Correction):</Text>
                  <br />
                  <Text code>最终数值 = (修正后的基础分) × (Q1 的系数 K)</Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {/* Chronic Toxicity 计算结果显示 */}
        {ctQ1State && ctQ2 && ctCalculatedValue >= 0 && (
          <Alert
            message="Chronic Toxicity 计算结果"
            description={
              <div>
                <Text>
                  【最终结果】Chronic Toxicity = <Text strong style={{ 
                    color: ctCalculatedValue >= 0.8 ? '#ff4d4f' : ctCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{ctCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ctQ2 === 'A' && '(依据：强腐蚀性 R35/H314，一票否决 = 1.000)'}
                    {ctQ2 === 'B' && '(依据：致癌/致突变性 R45/R46/R49/H350，一票否决 = 0.800)'}
                    {ctQ3 === 'A' && '(依据：简单的饱和烷烃，无毒豁免 = 0.000)'}
                    {ctQ3 === 'B' && '(依据：无害的无机盐/缓冲盐，无毒豁免 = 0.000)'}
                    {ctQ2 === 'C' && ctQ3 === 'C' && ctCalculatedValue > 0 && 
                      `(依据：核心计算，物理状态系数 K = ${ctQ1State === 'A' ? '0.2' : '1.0'})`
                    }
                  </Text>
                </Text>
              </div>
            }
            type={ctCalculatedValue >= 0.8 ? 'error' : ctCalculatedValue >= 0.5 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 chronicToxicity 值 */}
        <Form.Item name="chronicToxicity" hidden>
          <InputNumber />
        </Form.Item>

        {/* 环境因子 */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#52c41a', borderTopWidth: 2 }}>
          <Space size={8}>
            <GlobalOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            <span>环境因子 (Environment Factors)</span>
          </Space>
        </Divider>

        {/* Persistency 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#f6ffed', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #52c41a' }}>
          <Text strong style={{ fontSize: 15, color: '#389e0d' }}>
            🌱 持久性 (Persistency) 评估
          </Text>
        </div>

        {/* 第一阶段：物质身份确认 */}
        <Form.Item
          label={<Text strong>第一阶段：物质身份确认</Text>}
          name="persQ1"
          rules={[{ required: true, message: '请选择化学属性' }]}
          tooltip="该物质的化学属性是什么？"
        >
          <Select 
            placeholder="该物质的化学属性是什么？（单选）"
            onChange={(value) => setPersQ1(value)}
          >
            {PERSISTENCY_Q1_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={opt.description}
              >
                {opt.label} {opt.result !== undefined && `(结果: ${opt.result.toFixed(3)})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二阶段：数据提取（仅当Q1选C时显示） */}
        {persQ1 === 'C' && (
          <>
            <div style={{ background: '#e6f7ff', padding: '16px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                📊 第二阶段：数据提取 (请查看 CompTox 数据库)
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                请打开 CompTox 网站查找该物质的 "Env. Fate/Transport" 页面，
                提取以下5个数据（若无数据填 N/A 或留空）:
              </Text>
            </div>

            <Alert
              message="💡 数据提取提示"
              description={
                <div style={{ fontSize: 12 }}>
                  <Text strong>CompTox 网站链接:</Text> <Text code>https://comptox.epa.gov/dashboard</Text>
                  <br />
                  <Text>在网站中搜索物质名称，然后点击 "Env. Fate/Transport" 标签页</Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>Q2.1 Biodeg. Half-Life (Days) 生物降解半衰期</Text>}
                  name="persBiodegHalfLife"
                  tooltip="生物降解半衰期（天），记为 t"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入天数 (例如: 4.5)"
                    addonAfter="天"
                    min={0}
                    step={0.1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text>数据来源 (Experimental 或 Predicted)</Text>}
                  name="persDataSource"
                  tooltip="数据来源是实验值还是预测值？Predicted预测值需要修正-0.03"
                >
                  <Select placeholder="选择数据来源">
                    {PERSISTENCY_DATA_SOURCE_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label={<Text strong>Q2.2 ReadyBiodeg 易降解性</Text>}
                  name="persReadyBiodeg"
                  tooltip="0 = 难降解，1 = 易降解"
                >
                  <Select 
                    placeholder="选择 0 或 1"
                    onChange={(value) => setPersReadyBiodeg(value)}
                  >
                    {PERSISTENCY_READY_BIODEG_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={<Text strong>Q2.3 BCF 生物富集因子</Text>}
                  name="persBcf"
                  tooltip="Bioconcentration Factor (BCF) - 生物富集因子"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入数值"
                    min={0}
                    step={0.1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={<Text strong>Q2.4 Atmos. Hydroxylation Rate</Text>}
                  name="persAtmosRate"
                  tooltip="大气羟基化速率 (例如 1.4e-13)"
                >
                  <Input placeholder="例如: 1.4e-13" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>Q2.5 Fish Biotrans. Half-Life</Text>}
                  name="persFishHalfLife"
                  tooltip="鱼体内生物转化半衰期（天）"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入天数"
                    addonAfter="天"
                    min={0}
                    step={0.01}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Alert
                  message="填写完成后，请继续第三阶段的选择"
                  type="success"
                  showIcon
                  style={{ marginTop: 30 }}
                />
              </Col>
            </Row>
          </>
        )}

        {/* 第三阶段：特殊物质快速通道（仅当Q1选C且填写了Q2数据后显示） */}
        {persQ1 === 'C' && (
          <Form.Item
            label={<Text strong>第三阶段：特殊物质快速通道 ("Fast Track")</Text>}
            name="persQ3"
            rules={[{ required: true, message: '请选择' }]}
            tooltip="该物质是否满足以下任意快速判定条件？"
          >
            <Select 
              placeholder="该物质是否满足以下任意条件？（单选）"
              onChange={(value) => setPersQ3(value)}
            >
              {PERSISTENCY_Q3_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value} title={opt.description}>
                  {opt.label} {opt.result !== undefined && `(结果: ${opt.result.toFixed(3)})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 第四阶段：核心计算（仅当Q1选C且Q3选D时显示） */}
        {persQ1 === 'C' && persQ3 === 'D' && (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label={<Text strong>Q2.1 Biodeg. Half-Life</Text>}
                  name="persBiodegHalfLife"
                  rules={[{ required: true, message: '请输入半衰期' }]}
                  tooltip="🧮 第四阶段：核心计算公式 (适用于多数有机溶剂) - 如正己烷、乙醇、乙腈、MTBE、异辛烷、氯仿等。生物降解半衰期（天），记为 t"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入天数"
                    addonAfter="天"
                    min={0}
                    step={0.1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={<Text strong>数据来源</Text>}
                  name="persDataSource"
                  tooltip="数据来源是实验值还是预测值？Predicted预测值需要修正"
                >
                  <Select placeholder="选择数据来源">
                    {PERSISTENCY_DATA_SOURCE_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={<Text strong>Q2.2 ReadyBiodeg</Text>}
                  name="persReadyBiodeg"
                  rules={[{ required: true, message: '请选择' }]}
                  tooltip="0 = 难降解，1 = 易降解"
                >
                  <Select 
                    placeholder="选择 0 或 1"
                    onChange={(value) => setPersReadyBiodeg(value)}
                  >
                    {PERSISTENCY_READY_BIODEG_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 路径1: ReadyBiodeg = 1 (易降解) */}
            {persReadyBiodeg === 1 && (
              <Alert
                message="✅ 路径1: 易降解物质 (ReadyBiodeg = 1)"
                description={
                  <div>
                    <Text strong>计算公式:</Text>
                    <br />
                    <Text code>Persistency = 0.45 × log₁₀(t)</Text>
                    <br /><br />
                    <Text strong>修正项:</Text>
                    <br />
                    <Text>• 如果数据来源是 <Text code>Predicted</Text> (预测值)，结果需要 <Text strong>减去 0.03</Text></Text>
                    <br />
                    <Text>• 如果是 <Text code>Experimental</Text> (实验值)，则不减</Text>
                    <br /><br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (典型例子: 乙醇、乙腈、正己烷、丙酮)
                    </Text>
                  </div>
                }
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* 路径2: ReadyBiodeg = 0 (难降解) - 需要判断化学类型 */}
            {persReadyBiodeg === 0 && (
              <>
                <Alert
                  message="⚠️ 路径2: 难降解物质 (ReadyBiodeg = 0)"
                  description={
                    <div>
                      <Text strong>需要判断物质的化学结构类型:</Text>
                      <br />
                      <Text>• 2a. 卤代烃类 (含氯/溴，且 BCF &gt; 5.0)</Text>
                      <br />
                      <Text>• 2b. 醚类 或 支链烷烃 (BCF &lt; 5.0)</Text>
                    </div>
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label={<Text strong>Q2.3 BCF 值</Text>}
                      name="persBcf"
                      tooltip="生物富集因子 (Bioconcentration Factor)，用于判断化学类型"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="输入 BCF 数值"
                        min={0}
                        step={0.1}
                        precision={2}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={<Text strong>化学结构类型</Text>}
                      name="persChemicalType"
                      rules={[{ required: true, message: '难降解物质必须选择化学类型' }]}
                      tooltip="根据BCF值和化学结构判断"
                    >
                      <Select 
                        placeholder="选择化学类型"
                        onChange={(value) => setPersChemicalType(value)}
                      >
                        {PERSISTENCY_CHEMICAL_TYPE_OPTIONS.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {persChemicalType === '2a' && (
                  <Alert
                    message="路径2a: 卤代烃类 (含氯/溴，BCF &gt; 5.0)"
                    description={
                      <div>
                        <Text strong>计算公式:</Text>
                        <br />
                        <Text code>Persistency = 0.32 × log₁₀(t)</Text>
                        <br /><br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          (典型例子: 氯仿)
                        </Text>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                {persChemicalType === '2b' && (
                  <Alert
                    message="路径2b: 醚类 或 支链烷烃 (BCF &lt; 5.0)"
                    description={
                      <div>
                        <Text strong>计算公式:</Text>
                        <br />
                        <Text code>Persistency = 0.45 × log₁₀(t) + 0.32</Text>
                        <br /><br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          (典型例子: MTBE, 异辛烷)
                        </Text>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Persistency 计算结果显示 */}
        {persQ1 && persCalculatedValue >= 0 && (
          <Alert
            message="Persistency 计算结果"
            description={
              <div>
                <Text>
                  【最终结果】Persistency = <Text strong style={{ 
                    color: persCalculatedValue >= 0.6 ? '#ff4d4f' : persCalculatedValue >= 0.3 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{persCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {persQ1 === 'A' && '(依据：无机强酸，固定值 = 0.485)'}
                    {persQ1 === 'B' && '(依据：其他无机物，固定值 = 0.000)'}
                    {persQ3 === 'A' && '(依据：极快降解/低蓄积，固定值 = 0.000)'}
                    {persQ3 === 'B' && '(依据：醇或类似性低蓄积，固定值 = 0.020)'}
                    {persQ3 === 'C' && '(依据：特殊代谢物质，固定值 = 0.130)'}
                    {persQ3 === 'D' && persReadyBiodeg === 1 && '(依据：易降解公式计算)'}
                    {persQ3 === 'D' && persReadyBiodeg === 0 && persChemicalType === '2a' && '(依据：卤代烃类公式计算)'}
                    {persQ3 === 'D' && persReadyBiodeg === 0 && persChemicalType === '2b' && '(依据：醚类/支链烷烃公式计算)'}
                  </Text>
                </Text>
              </div>
            }
            type={persCalculatedValue >= 0.6 ? 'error' : persCalculatedValue >= 0.3 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 persistency 值 */}
        <Form.Item name="persistency" hidden>
          <InputNumber />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Alert
              message="大气危害 (Air Hazard)"
              description={
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Air Hazard 的分数等于 Chronic Toxicity
                  </Text>
                  <br />
                  <Text strong style={{ fontSize: 16, color: ctCalculatedValue >= 0.8 ? '#ff4d4f' : ctCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a' }}>
                    {ctCalculatedValue >= 0 ? ctCalculatedValue.toFixed(3) : '待计算'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    (自动同步自 Chronic Toxicity)
                  </Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 30 }}
            />
            {/* 隐藏字段：存储 airHazard 值 */}
            <Form.Item name="airHazard" hidden>
              <InputNumber />
            </Form.Item>
          </Col>
          <Col span={8}></Col>
        </Row>

        {/* Water Hazard 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#e6f7ff', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #1890ff' }}>
          <Text strong style={{ fontSize: 15, color: '#0050b3' }}>
            💧 水体危害 (Water Hazard) 评估
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            逻辑核心：基础分 + 罚分 + 微量残差
          </Text>
        </div>

        {/* 第一步：物质类别初筛 */}
        <Form.Item
          label={<Text strong>第一步：物质类别初筛（基础定性，记为S1）</Text>}
          name="whQ1"
          rules={[{ required: true, message: '请选择物质类别' }]}
          tooltip="该物质属于以下哪一类？"
        >
          <Select 
            placeholder="请判断您的物质属于以下哪一类？（单选）"
            onChange={(value) => setWhQ1(value)}
          >
            {WH_Q1_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value} title={opt.description + (opt.note ? ` 💡 ${opt.note}` : '')}>
                {opt.label} {opt.result !== undefined && `(结果: S1 = ${opt.result.toFixed(3)})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二步：急性毒性评分（仅当Q1选C时显示） */}
        {whQ1 === 'C' && (
          <>
            <Form.Item
              label={<Text strong>Q2. LC50 范围判断</Text>}
              name="whQ2"
              rules={[{ required: true, message: '请选择LC50范围' }]}
              tooltip="第二步：急性毒性评分 (Toxicity Score) - 请查找物质的 96小时鱼类 LC50 (mg/L)。若数据难找，取平均值；若无鱼类数据，可用 EC50 代替。根据96h鱼类LC50值选择对应范围"
            >
              <Select 
                placeholder="请根据LC50值选择对应范围（单选）"
                onChange={(value) => setWhQ2(value)}
              >
                {WH_Q2_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    <div>
                      <Text strong>{opt.label}</Text>
                      <br />
                      <br />
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        → 第二步得分 S2 = {opt.result.toFixed(3)}
                      </Text>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 第三步：环境归趋"罚分" */}
            <div style={{ background: '#fffbe6', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>第三步：环境归趋"罚分" (Fate Penalty)</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                此步骤包含两个"罚分项"，请分别判断并累加
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>3.1 持久性罚分（单选）</Text>}
                  name="whQ3_1"
                  rules={[{ required: true, message: '请选择' }]}
                  tooltip="物质是否会在水中长期存在？"
                >
                  <Select 
                    placeholder="物质是否会在水中长期存在？"
                    onChange={(value) => setWhQ3_1(value)}
                  >
                    {WH_Q3_1_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value} title={opt.description}>
                        {opt.label} (罚分: {opt.penalty.toFixed(3)})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>3.2 生物累积罚分（单选）</Text>}
                  name="whQ3_2"
                  rules={[{ required: true, message: '请选择' }]}
                  tooltip="物质是否会在生物体内富集？（查询 BCF 或 Log Kow）"
                >
                  <Select 
                    placeholder="是否会在生物体内富集？"
                    onChange={(value) => setWhQ3_2(value)}
                  >
                    {WH_Q3_2_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        <div>
                          <Text strong>{opt.label}</Text>
                          <br />
                          <br />
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
                            → 罚分: {opt.penalty.toFixed(3)}
                          </Text>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 第四步：微量残差计算 */}
            <div style={{ background: '#f6ffed', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>第四步：微量残差计算 (Residuals)</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                计算当前总分 Sum = S1 + S2 + S3<br />
                • 情形A: 如果 Sum &gt; 0 → S4 = 0（无需修正，直接结算）<br />
                • 情形B: 如果 Sum = 0 → 需要输入LC50和K值计算微量残差: S4 = K / LC₅₀
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label={<Text>LC50 数值（用于微量残差）</Text>}
                  name="whLc50"
                  tooltip="输入完整的LC50数值（mg/L），用于情形B的微量残差计算"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入 LC50 值"
                    addonAfter="mg/L"
                    min={0}
                    step={1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  label={<Text>K值选择（用于微量残差）</Text>}
                  name="whKValue"
                  tooltip="仅当Sum=0时需要选择K值"
                >
                  <Select placeholder="选择K值类型">
                    {WH_Q4_K_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        <div>
                          <Text strong>K = {opt.k}</Text> - <Text>{opt.label}</Text>
                          <br />
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Alert
              message="💡 K值选择提示"
              description={
                <div style={{ fontSize: 12 }}>
                  <Text>1. 含卤素/难降解有机物（如二氯甲烷、氯仿）：<Text strong>K = 6.0</Text></Text><br />
                  <Text>2. 普通易降解有机物（如甲醇、乙酸乙酯、三乙胺）：<Text strong>K = 0.7</Text></Text><br />
                  <Text>3. 超低毒溶剂（LC50 &gt; 1000，如甲醇、乙腈、丙酮）：<Text strong>K = 0</Text>（忽略不计）</Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {/* Water Hazard 计算结果显示 */}
        {whQ1 && whCalculatedValue >= 0 && (
          <Alert
            message="Water Hazard 计算结果"
            description={
              <div>
                <Text>
                  【最终结果】Water Hazard = <Text strong style={{ 
                    color: whCalculatedValue >= 0.6 ? '#ff4d4f' : whCalculatedValue >= 0.3 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{whCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {whQ1 === 'A' && '(依据：强腐蚀性无机酸/碱，固定值 S1 = 0.500)'}
                    {whQ1 === 'B' && '(依据：普通无机盐/缓冲盐，固定值 = 0.000)'}
                    {whQ1 === 'C' && '(依据：基础分 + 急性毒性 + 环境罚分 + 微量残差)'}
                  </Text>
                </Text>
              </div>
            }
            type={whCalculatedValue >= 0.6 ? 'error' : whCalculatedValue >= 0.3 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 waterHazard 值 */}
        <Form.Item name="waterHazard" hidden>
          <InputNumber />
        </Form.Item>

        {/* Regeneration Factor */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 32, marginBottom: 16, borderTopColor: '#722ed1', borderTopWidth: 2 }}>
          ♻️ 再生属性评级 (Regeneration Factor, Rᵢ)
        </Divider>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            五级R值评分公式与规则 (The 5-Tier Formula & Rules) | 核心公式: Rᵢ = 0.25 × (L_res - 1)
          </Text>
        </div>

        <Form.Item
          label={<Text strong>请选择该物质的来源与合成属性类别 (L_res = 1, 2, 3, 4, 5)</Text>}
          name="regeneration"
          rules={[{ required: true, message: '请选择来源与合成属性' }]}
          tooltip="根据物质的化学性质、来源和合成复杂度，选择对应的L_res等级（1-5），系统将自动计算R值"
        >
          <Select 
            placeholder="请根据物质的来源和合成复杂度选择对应等级"
            onChange={(value) => setRegenerationValue(value)}
          >
            {REGENERATION_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={`${opt.description} | 适用: ${opt.differentiation}`}
              >
                {opt.label} (R = {opt.value.toFixed(2)})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Regeneration Factor 结果显示 */}
        {regenerationValue !== undefined && (
          <Alert
            message="再生属性评级结果 (Regeneration Factor Result)"
            description={
              <div>
                <Text>
                  【最终得分】Rᵢ = <Text strong style={{ 
                    color: regenerationValue === 0 ? '#52c41a' : 
                           regenerationValue <= 0.5 ? '#52c41a' : 
                           regenerationValue <= 0.75 ? '#fa8c16' : '#ff4d4f', 
                    fontSize: 16 
                  }}>{regenerationValue.toFixed(2)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {regenerationValue === 0 && '(等级1：自然本底级 - 无需化学合成)'}
                    {regenerationValue === 0.25 && '(等级2：绿色循环级 - 生物基或工业副回收)'}
                    {regenerationValue === 0.5 && '(等级3：简单合成级 - C-H-O简单有机物)'}
                    {regenerationValue === 0.75 && '(等级4：复杂/高耗能级 - 含卤素/杂环化合物)'}
                    {regenerationValue === 1.0 && '(等级5：资源枯竭/稀缺级 - 稀缺矿产或精细化学品)'}
                  </Text>
                </Text>
              </div>
            }
            type={regenerationValue <= 0.25 ? 'success' : 
                  regenerationValue <= 0.5 ? 'info' :
                  regenerationValue <= 0.75 ? 'warning' : 'error'}
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Disposal Factor (处置因子 D) */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 32, marginBottom: 16, borderTopColor: '#fa541c', borderTopWidth: 2 }}>
          🗑️ 处置考量因子 (Disposal Considerations Factor, Dᵢ)
        </Divider>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            引入处置百分比的高级算法公式 (The Advanced Formula with Disposal Percentage) | 核心公式: Dᵢ = D_int × [1 - (P_disp/100% × ξ_eff)]
          </Text>
        </div>

        {/* 题目一：物质废弃属性 (D_int) */}
        <Form.Item
          label={<Text strong>题目一：物质废弃属性 (D_int, Intrinsic Disposal Resistance)</Text>}
          name="disposalDint"
          rules={[{ required: true, message: '请选择物质废弃属性' }]}
          tooltip="基于物质本身的难处理性质，采用5级高阻力值(0.00 - 1.00)"
        >
          <Select 
            placeholder="请选择该试剂降解后的物理化学属性与处置难度"
            onChange={(value) => {
              setDisposalDint(value)
              form.setFieldsValue({ disposalDint: value })
            }}
          >
            {DISPOSAL_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={`${opt.description} | ${opt.criteria}`}
              >
                {opt.label} (D_int = {opt.value.toFixed(2)})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 题目二：处置百分比 (P_disp) */}
        <Form.Item
          label={<Text strong>题目二：处置百分比 (P_disp, Effective Disposal/Recovery Percentage)</Text>}
          name="disposalPercentage"
          rules={[{ required: true, message: '请选择处置百分比' }]}
          tooltip="实验室对该废液的'资源化回收'或'中和还原'的百分比 (0% ~ 100%)"
        >
          <Select 
            placeholder="实验室对该类废液进行了合规回收/资源化回收的比例是多少？（注：单纯的外运焚烧请填0%）"
            onChange={(value) => {
              setDisposalPercentage(value)
              form.setFieldsValue({ disposalPercentage: value })
            }}
          >
            {DISPOSAL_PERCENTAGE_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Disposal Factor 结果显示 */}
        {disposalValue !== undefined && (
          <Alert
            message="处置考量因子计算结果 (Disposal Considerations Factor Result)"
            description={
              <div>
                <Text>
                  【最终得分】Dᵢ = <Text strong style={{ 
                    color: disposalValue === 0 ? '#52c41a' : 
                           disposalValue <= 0.25 ? '#95de64' :
                           disposalValue <= 0.5 ? '#ffc53d' : 
                           disposalValue <= 0.75 ? '#ff9c6e' : '#ff4d4f', 
                    fontSize: 16 
                  }}>{disposalValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (D_int = {disposalDint?.toFixed(2)}, P_disp = {disposalPercentage}%, ξ_eff = 0.8)
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                    {disposalDint === 0 && '物质属性：自然回归级 | '}
                    {disposalDint === 0.25 && '物质属性：低熵回收级 | '}
                    {disposalDint === 0.5 && '物质属性：标准工业级 | '}
                    {disposalDint === 0.75 && '物质属性：高势垒阻碍级 | '}
                    {disposalDint === 1.0 && '物质属性：不可逆摧毁级 | '}
                    {disposalPercentage === 0 && '完全废弃/外运焚烧'}
                    {disposalPercentage === 25 && '少量回收用于清洗'}
                    {disposalPercentage === 50 && '半数回收'}
                    {disposalPercentage === 75 && '大部分回收'}
                    {disposalPercentage === 100 && '完全闭环循环'}
                  </Text>
                </Text>
              </div>
            }
            type={disposalValue === 0 ? 'success' : 
                  disposalValue <= 0.3 ? 'info' :
                  disposalValue <= 0.6 ? 'warning' : 'error'}
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* 隐藏字段：存储最终计算的 disposal 值 */}
        <Form.Item name="disposal" hidden>
          <InputNumber />
        </Form.Item>

        {/* 显示小因子计算结果 */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#1890ff', borderTopWidth: 2 }}>📋 小因子计算结果</Divider>
        
        <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
            <FireOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
            安全因子 (Safety) 各小因子得分
          </Text>
          <Row gutter={[8, 8]}>
            <Col span={6}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Release Potential</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff', marginTop: 2 }}>
                  {form.getFieldValue('releasePotential')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Fire/Explosives</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff', marginTop: 2 }}>
                  {form.getFieldValue('fireExplos')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Reaction/Decomp.</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff', marginTop: 2 }}>
                  {form.getFieldValue('reactDecom')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Acute Toxicity</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff', marginTop: 2 }}>
                  {form.getFieldValue('acuteToxicity')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <div style={{ background: '#f6ffed', padding: '12px', borderRadius: '8px', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
            <HeartOutlined style={{ color: '#52c41a', marginRight: 6 }} />
            健康因子 (Health) 各小因子得分
          </Text>
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Irritation</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a', marginTop: 2 }}>
                  {form.getFieldValue('irritation')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Chronic Toxicity</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a', marginTop: 2 }}>
                  {form.getFieldValue('chronicToxicity')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <div style={{ background: '#e6f7ff', padding: '12px', borderRadius: '8px', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
            <GlobalOutlined style={{ color: '#1890ff', marginRight: 6 }} />
            环境因子 (Environment) 各小因子得分
          </Text>
          <Row gutter={[8, 8]}>
            <Col span={8}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Persistency</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#13c2c2', marginTop: 2 }}>
                  {form.getFieldValue('persistency')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Air Hazard</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#13c2c2', marginTop: 2 }}>
                  {form.getFieldValue('airHazard')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Water Hazard</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#13c2c2', marginTop: 2 }}>
                  {form.getFieldValue('waterHazard')?.toFixed(4) || '0.0000'}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* 计算结果显示 */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 20, marginBottom: 16, borderTopColor: '#52c41a', borderTopWidth: 2 }}>🎯 大因子自动累加结果</Divider>
        <div style={{ 
          background: '#f6f8fa', 
          padding: '12px 16px', 
          borderRadius: '8px',
          border: '1px solid #e8e8e8',
          marginBottom: 16
        }}>
          <Row gutter={16} justify="center">
            <Col flex="1" style={{ minWidth: 0, maxWidth: 180 }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #ffa39e' }}>
                <Text strong style={{ fontSize: 14 }}>安全分数 (S)</Text>
                <div style={{ fontSize: 22, color: '#ff4d4f', fontWeight: 'bold', marginTop: 4 }}>
                  {calculatedScores.safetyScore.toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  4个子因子之和
                </Text>
              </div>
            </Col>
            <Col flex="1" style={{ minWidth: 0, maxWidth: 180 }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #ffbb96' }}>
                <Text strong style={{ fontSize: 14 }}>健康分数 (H)</Text>
                <div style={{ fontSize: 22, color: '#ff7a45', fontWeight: 'bold', marginTop: 4 }}>
                  {calculatedScores.healthScore.toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  2个子因子之和
                </Text>
              </div>
            </Col>
            <Col flex="1" style={{ minWidth: 0, maxWidth: 180 }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #95de64' }}>
                <Text strong style={{ fontSize: 14 }}>环境分数 (E)</Text>
                <div style={{ fontSize: 22, color: '#52c41a', fontWeight: 'bold', marginTop: 4 }}>
                  {calculatedScores.envScore.toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  3个子因子之和
                </Text>
              </div>
            </Col>
            <Col flex="1" style={{ minWidth: 0, maxWidth: 180 }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #b37feb' }}>
                <Text strong style={{ fontSize: 14 }}>再生因子 (R)</Text>
                <div style={{ fontSize: 22, color: '#722ed1', fontWeight: 'bold', marginTop: 4 }}>
                  {(form.getFieldValue('regeneration') || 0).toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  来源属性
                </Text>
              </div>
            </Col>
            <Col flex="1" style={{ minWidth: 0, maxWidth: 180 }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #ff9c6e' }}>
                <Text strong style={{ fontSize: 14 }}>废弃因子 (D)</Text>
                <div style={{ fontSize: 22, color: '#fa541c', fontWeight: 'bold', marginTop: 4 }}>
                  {(form.getFieldValue('disposal') || 0).toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  废弃处置特性
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </Form>
    </Modal>
  )
}

export default AddReagentModal
