import React, { useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Row, Col, message, Space, Typography, Divider, Alert, Button, Upload } from 'antd'
import { ExperimentOutlined, FireOutlined, HeartOutlined, GlobalOutlined, LinkOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons'
import type { ReagentFactor } from '../contexts/AppContext'
import * as XLSX from 'xlsx'

const { Text, Link } = Typography
const { Option } = Select

interface AddReagentModalProps {
  visible: boolean
  onCancel: () => void
  onOk: (reagent: ReagentFactor) => void
  onBatchImport?: (reagents: ReagentFactor[]) => void
}

// Release Potential 第一步选项
const RP_STEP1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Dissolved Gas or Highly Volatile Liquid',
    description: 'Gas dissolved in water or extremely volatile liquid'
  },
  { 
    value: 'B', 
    label: 'B. Solid Inorganic Salt or High Boiling Point Substance',
    description: 'Solid at room temperature (ionic compound), or non-volatile liquid with very high boiling point (>200°C)'
  },
  { 
    value: 'C', 
    label: 'C. Volatile Organic/Inorganic Liquid',
    description: 'Liquid with boiling point between 30°C and 200°C'
  }
]

// Release Potential 第三步：化学结构分类
const RP_STEP3_OPTIONS = [
  { 
    value: -0.045, 
    label: 'A. Alcohols',
    description: 'Molecule contains hydroxyl group (-OH) and can form hydrogen bonds',
    correction: -0.045
  },
  { 
    value: 0.015, 
    label: 'B. Ethers',
    description: 'Molecule contains ether bond (-O-)',
    correction: 0.015
  },
  { 
    value: 0.075, 
    label: 'C. Highly Branched Alkanes',
    description: 'Alkanes with "iso-" or "Tert-" in name or highly branched structure',
    correction: 0.075
  },
  { 
    value: 0, 
    label: 'D. Standard Solvents',
    description: 'Other volatile liquids not in the above three categories',
    correction: 0
  }
]

// Fire/Explosives 第一阶段选项：快速筛选
const FE_STEP1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Completely Inert Inorganic Substance',
    description: 'Essentially non-flammable, non-oxidizing',
    result: 0.000
  },
  { 
    value: 'B', 
    label: 'B. Common Inorganic Solid Salt',
    description: 'Non-oxidizing regular salt',
    result: 0.000,
    note: 'Note: If oxidizer, select C'
  },
  { 
    value: 'C', 
    label: 'C. Organic Substance (Solvent, Reagent) or Potentially Oxidizing Inorganic',
    description: 'Requires further assessment of oxidizing and flammability properties',
    continueToStep2: true
  }
]

// Fire/Explosives 第二阶段选项：氧化性风险评估 (Oxygen Source)
const FE_STEP2_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. R7 (May cause fire)',
    description: 'May cause fire',
    result: 1.000
  },
  { 
    value: 'B', 
    label: 'B. R8 (Contact with combustible material may cause fire)',
    description: 'Contact with combustible material may cause fire',
    result: 1.000
  },
  { 
    value: 'C', 
    label: 'C. R9 (Explosive when mixed with combustible material)',
    description: 'Explosive when mixed with combustible material',
    result: 1.000
  },
  { 
    value: 'D', 
    label: 'D. None of the above',
    description: 'No significant oxidizing risk',
    continueToStep3: true
  }
]

// Fire/Explosives 第三阶段选项：易燃性风险评估 (Fuel Hazard)
const FE_STEP3_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Flash point < 21°C, or R-codes contain R11 (Highly Flammable)',
    description: 'Highly Flammable',
    result: 1.000
  },
  { 
    value: 'B', 
    label: 'B. Flash point 21°C ~ 60°C, or R-codes contain R10 (Flammable)',
    description: 'Flammable',
    result: 0.500
  },
  { 
    value: 'C', 
    label: 'C. Flash point > 60°C, or marked as "non-flammable"',
    description: 'Low Risk',
    result: 0.000
  },
  { 
    value: 'D', 
    label: 'D. No flash point',
    description: 'E.g., dichloromethane, trichloroacetic acid, not marked as R11',
    result: 0.000
  }
]

// Reaction/Decomposition 第一阶段选项：基础信息筛选
const RD_STEP1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Pure Substance (Pure solvent, solid salt, concentrated acid/base)',
    description: 'Requires further assessment of reactivity',
    continueToStep2: true
  },
  { 
    value: 'B', 
    label: 'B. Diluted Aqueous Solution',
    description: 'Low concentration phosphate buffer, <5% dilute acid/base modifier',
    note: 'Note: According to HPLC-EAT rules, water-based dilute buffer (non-strong oxidizing) usually ignored',
    result: 0.000
  }
]

// Reaction/Decomposition 第三阶段选项：不兼容性与特殊风险
const RD_STEP3_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. White diamond marked "W" (Water Reactive)',
    description: 'Substance reacts dangerously with water'
  },
  { 
    value: 'B', 
    label: 'B. White diamond marked "OX" (Oxidizer)',
    description: 'Substance is a strong oxidizer'
  },
  { 
    value: 'C', 
    label: 'C. Known to be high concentration strong acid (e.g., 96% sulfuric acid) or strong base with strong corrosivity',
    description: 'Corresponds to R35/H314 corrosivity marking'
  },
  { 
    value: 'D', 
    label: 'D. None of the above',
    description: 'Does not have the above special risks'
  }
]

// Reaction/Decomposition 第四阶段选项：化学结构检查（针对有机物）
const RD_STEP4_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Yes (Contains unstable groups)',
    description: 'Molecule contains nitro, azide, peroxide, diazo, alkyne, etc.',
    result: 0.600
  },
  { 
    value: 'B', 
    label: 'B. No (Common alcohols, ketones, esters, alkanes, nitriles, etc.)',
    description: 'Common organic solvents without obvious unstable groups',
    result: 0.000
  }
]

// Acute Toxicity 路径选项
const AT_PATH_OPTIONS = [
  { 
    value: 'A', 
    label: '[Path A] Common LC Organic Solvents or Volatile Acids/Bases',
    description: 'Liquid, with obvious volatility, IDLH (ppm) value available'
  },
  { 
    value: 'B', 
    label: '[Path B] LC Solid Additives or Inorganic Salts',
    description: 'Solid powder, non-volatile, usually no IDLH value but has LD50 value'
  }
]

// Standard IDLH recommended values for common LC solvents
const COMMON_IDLH_VALUES = [
  { name: 'Methanol', value: 6000 },
  { name: 'Acetonitrile', value: 500, note: 'Note: Do not use 137' },
  { name: 'Tetrahydrofuran (THF)', value: 2000 },
  { name: 'Acetone', value: 2500 },
  { name: 'Ethanol', value: 3300 },
  { name: 'Isopropanol (IPA)', value: 2000 },
  { name: 'n-Hexane', value: 1100 },
  { name: 'Formic Acid', value: 30 },
  { name: 'Ammonia', value: 300, note: 'For ammonia solution concentration' }
]

// Irritation 问题1选项：严重腐蚀性
const IRR_Q1_OPTIONS = [
  { value: 'yes', label: 'Yes - Contains R35 or R34', result: 1.000 },
  { value: 'no', label: 'No - Does not contain the above codes', continueToQ2: true }
]

// Irritation 问题2选项：明显刺激性
const IRR_Q2_OPTIONS = [
  { value: 'yes', label: 'Yes - Contains any of R36/R37/R41/R48', result: 0.625 },
  { value: 'ethanol', label: 'Special case: This substance is Ethanol', result: 0.000, note: 'Directly enter 0' },
  { value: 'no', label: 'No - Does not contain the above codes', continueToQ3: true }
]

// Irritation 问题3选项：pH判定
const IRR_Q3_PH_RANGES = [
  { 
    value: 'strong', 
    label: 'Strong acid/strong base (pH < 2 or pH > 11.5)', 
    description: 'Strong corrosivity',
    result: 1.000 
  },
  { 
    value: 'moderate', 
    label: 'Moderately strong acid/base (2 ≤ pH < 5 or 9 < pH ≤ 11.5)', 
    description: 'Moderate irritation',
    result: 0.625 
  },
  { 
    value: 'neutral', 
    label: 'Neutral/weak acid weak base (5 ≤ pH ≤ 9)', 
    description: 'Temporarily considered 0, continue to Question 4',
    continueToQ4: true 
  }
]

// Irritation 问题4选项：微量危害代码
const IRR_Q4_CODES = [
  { 
    code: 'R38', 
    label: 'R38 (skin irritation)', 
    value: 0.220 
  },
  { 
    code: 'R40', 
    label: 'R40 (possible carcinogenicity)', 
    value: 0.236 
  },
  { 
    code: 'R20series', 
    label: 'R20/21/22/23/24/25 series (harmful or toxic by inhalation/skin/ingestion)', 
    value: 0.113 
  },
  { 
    code: 'R50series', 
    label: 'R50/53 (harmful to aquatic environment)', 
    value: 0.110 
  }
]

// Chronic Toxicity Q1选项：物理状态
const CT_Q1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Solid or Low-volatility Salt Powder',
    description: 'Coefficient K = 0.2',
    factor: 0.2
  },
  { 
    value: 'B', 
    label: 'B. Liquid or Gas',
    description: 'Coefficient K = 1.0',
    factor: 1.0
  }
]

// Chronic Toxicity Q2选项：高危一票否决
const CT_Q2_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Highly Corrosive: R35 or Skin Corr. 1A / H314 (causes severe skin burns and eye damage)',
    description: 'Common: conc. sulfuric acid, fuming nitric acid, pure formic acid, TFA',
    result: 1.000
  },
  { 
    value: 'B', 
    label: 'B. Carcinogenic/Mutagenic: R45, R46, R49 or H350 (may cause cancer), IARC classification 1 or 2A/2B',
    description: 'Common: chloroform, benzene',
    result: 0.800
  },
  { 
    value: 'C', 
    label: 'C. None of the above',
    description: 'Continue to next step',
    continueToQ3: true
  }
]

// Chronic Toxicity Q3选项：无毒豁免
const CT_Q3_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Simple Saturated Alkane, Non-neurotoxic',
    description: 'E.g., isooctane, heptane (but not n-hexane)',
    result: 0.000
  },
  { 
    value: 'B', 
    label: 'B. Harmless Inorganic/Buffer Salt',
    description: 'E.g., sodium phosphate monobasic, NaCl, no TLV',
    result: 0.000
  },
  { 
    value: 'C', 
    label: 'C. Neither of the above',
    description: 'Organic solvent, toxic gas, or substance with defined TLV',
    continueToQ4: true
  }
]

// Chronic Toxicity Q5选项：是否为醇类
const CT_Q5_OPTIONS = [
  { value: 'yes', label: 'A. Yes - Is alcohol and not highly toxic', correction: 0.06 },
  { value: 'no', label: 'B. No - Not an alcohol', correction: 0 }
]

// Persistency (持久性) 的决策树选项
const PERSISTENCY_Q1_OPTIONS = [
  { 
    value: 'A', 
    label: 'A. Strong Inorganic Acid', 
    description: 'Concentrated inorganic strong acid (e.g., 96% H₂SO₄)',
    result: 0.485
  },
  { 
    value: 'B', 
    label: 'B. General Inorganic', 
    description: 'E.g., water, inorganic salts, bases',
    result: 0.000
  },
  { 
    value: 'C', 
    label: 'C. None of the Above (Organic Substances)', 
    description: 'All organic compounds'
  }
]

const PERSISTENCY_Q2_OPTIONS = [
  {
    value: 'A',
    label: 'A. Extremely Low Bioaccumulation: BCF (Bioconcentration Factor) < 1.6',
    description: 'Very low bioaccumulation potential',
    result: 0.000
  },
  {
    value: 'B',
    label: 'B. Readily Biodegradable Organics: Biodegradation Half-Life (t₁/₂) < 4.5 days',
    description: 'Rapidly biodegradable',
    result: 0.026
  },
  {
    value: 'C',
    label: 'C. High Volatility Halogenated: RB = 0 (Not Readily Biodeg.) and kOH > 1.3 × 10⁻¹³',
    description: 'Persistent but volatile halogenated compounds',
    result: 0.023
  },
  {
    value: 'D',
    label: 'D. Rapid Metabolism Ketones: Ketone structure and Fish Biotransformation Half-Life < 0.17 days',
    description: 'Ketones with rapid biotransformation',
    result: 0.126
  },
  {
    value: 'E',
    label: 'E. None of the Above',
    description: 'Proceed to next step'
  }
]

const PERSISTENCY_Q3_OPTIONS = [
  {
    value: 'A',
    label: 'A. Alcohols: Contains hydroxyl group (-OH) with non-toxic or low molecular weight',
    description: 'E.g., ethanol, isopropanol, methanol',
    result: 0.282
  },
  {
    value: 'B',
    label: 'B. Halogenated: Contains Cl, Br, F in organic molecules',
    description: 'E.g., chloroform, dichloromethane'
  },
  {
    value: 'C',
    label: 'C. Ethers: Contains ether bond (C-O-C) structure',
    description: 'E.g., THF, MTBE'
  },
  {
    value: 'D',
    label: 'D. General Organics: Alkanes, esters, nitriles not covered above',
    description: 'E.g., acetonitrile, ethyl acetate, hexane'
  }
]

const PERSISTENCY_DATA_SOURCE_OPTIONS = [
  { value: 'Experimental', label: 'Experimental (Experimental Data)' },
  { value: 'Predicted', label: 'Predicted (Predicted Data)' }
]

const PERSISTENCY_READY_BIODEG_OPTIONS = [
  { value: 1, label: '1 (Readily Biodegradable)' },
  { value: 0, label: '0 (Not Readily Biodegradable)' }
]

const PERSISTENCY_Q6_OPTIONS = [
  {
    value: 'A',
    label: 'A. Yes: Meets RB = 0 (Not Readily Biodeg.) or BCF > 200 (High Accumulation)',
    description: 'Persistent or bioaccumulative'
  },
  {
    value: 'B',
    label: 'B. No: Readily Biodegradable (RB = 1) and Low Accumulation',
    description: 'Neither persistent nor bioaccumulative'
  }
]

const PERSISTENCY_OPTIONS = [
  { value: 0, label: 'Readily Biodegradable (0.0)', description: '< 7 days complete degradation' },
  { value: 0.3, label: 'Biodegradable (0.3)', description: '7-30 days degradation' },
  { value: 0.6, label: 'Persistent (0.6)', description: '30-180 days degradation' },
  { value: 1, label: 'Very Persistent (1.0)', description: '> 180 days' }
]

const AIR_HAZARD_OPTIONS = [
  { value: 0, label: 'Low (0.0)', description: 'No harm to atmosphere' },
  { value: 0.5, label: 'Medium (0.5)', description: 'VOCs/Partial pollution' },
  { value: 1, label: 'High (1.0)', description: 'Severe air pollution' }
]

const WATER_HAZARD_OPTIONS = [
  { value: 0, label: 'Low (0.0)', description: 'Low aquatic toxicity' },
  { value: 0.3, label: 'Low-Medium (0.3)', description: 'LC50 > 100 mg/L' },
  { value: 0.6, label: 'Medium-High (0.6)', description: 'LC50 10-100 mg/L' },
  { value: 1, label: 'High (1.0)', description: 'LC50 < 10 mg/L' }
]

// Water Hazard (水体危害) 的决策树选项
const WH_Q1_OPTIONS = [
  {
    value: 'A',
    label: 'A. Strongly Corrosive Inorganic Acid/Base',
    description: 'Strongly corrosive inorganic that rapidly changes water pH',
    note: 'Note: phosphoric acid, formic acid, acetic acid are weak acids, do not select',
    result: 0.500
  },
  {
    value: 'B',
    label: 'B. Common Inorganic/Buffer Salt',
    description: 'For adjusting ionic strength or weak acid/base salts',
    result: 0.000
  },
  {
    value: 'C',
    label: 'C. Organic Solvent/Additive',
    description: 'All carbon-containing solvents and modifiers'
  }
]

const WH_Q2_OPTIONS = [
  {
    value: 'A',
    label: 'A. Extremely Toxic (LC₅₀ ≤ 1)',
    result: 0.500
  },
  {
    value: 'B',
    label: 'B. Highly Toxic (1 < LC₅₀ ≤ 10)',
    result: 0.250
  },
  {
    value: 'C',
    label: 'C. Moderately Toxic (10 < LC₅₀ ≤ 100)',
    result: 0.125
  },
  {
    value: 'D',
    label: 'D. Low/Slight Toxicity (LC₅₀ > 100)',
    result: 0.000
  }
]

const WH_Q3_1_OPTIONS = [
  {
    value: 'A',
    label: 'A. Readily Biodegradable or Volatile',
    description: 'MSDS shows "readily biodegradable" or volatile solvents like dichloromethane',
    penalty: 0.000
  },
  {
    value: 'B',
    label: 'B. Not Readily Biodegradable',
    description: 'MSDS shows "not readily biodegradable" and not volatile',
    penalty: 0.125
  }
]

const WH_Q3_2_OPTIONS = [
  {
    value: 'A',
    label: 'A. High Accumulation (BCF > 500 or Log Kow > 4)',
    penalty: 0.250
  },
  {
    value: 'B',
    label: 'B. Moderate Accumulation (100 < BCF ≤ 500 or 3 < Log Kow ≤ 4)',
    penalty: 0.075
  },
  {
    value: 'C',
    label: 'C. Low/No Accumulation (BCF < 100 or Log Kow < 3)',
    penalty: 0.000
  }
]

const WH_Q4_K_OPTIONS = [
  {
    value: 6.0,
    label: 'Halogenated/Persistent Organics',
    k: 6.0
  },
  {
    value: 0.7,
    label: 'Common Biodegradable Organics',
    k: 0.7
  },
  {
    value: 0,
    label: 'Very Low Toxicity Solvent (LC50 > 1000)',
    k: 0
  }
]

const RECYCLE_OPTIONS = [
  { value: 0, label: 'Non-recyclable (0)' },
  { value: 1, label: 'Partially Recyclable (1)' },
  { value: 2, label: 'Easily Recyclable (2)' },
  { value: 3, label: 'Fully Recyclable (3)' }
]

const POWER_OPTIONS = [
  { value: 0, label: 'None (0)', description: 'Room temperature operation' },
  { value: 1, label: 'Low (1)', description: '< 50°C' },
  { value: 2, label: 'Medium (2)', description: '50-100°C' },
  { value: 3, label: 'High (3)', description: '> 100°C' }
]

// Regeneration Factor (再生因子) 的选项 - 五级评分系统
const REGENERATION_OPTIONS = [
  {
    value: 0.0,
    label: '1. Natural Level',
    description: 'Directly obtained from nature, no chemical synthesis, only physical purification.',
    differentiation: 'E.g., water, ethanol (fermented), glycerol'
  },
  {
    value: 0.25,
    label: '2. Green Circular Level (Circular/Bio)',
    description: 'Bio-based or industrial byproduct. Low-carbon economy, significantly better than fossil resources.',
    differentiation: 'E.g., bioethanol, CO₂ for SFC'
  },
  {
    value: 0.5,
    label: '3. Simple Synthetic Level',
    description: 'Simple C-H-O compounds. Fossil-derived but short synthesis path, high atom economy, low toxicity.',
    differentiation: 'E.g., methanol, industrial ethanol, isopropanol, acetone, ethyl acetate'
  },
  {
    value: 0.75,
    label: '4. Complex/Energy Intensive',
    description: 'Chlorinated/halogenated/heterocyclic. Longer synthesis path, high energy petrochemical, or toxic.',
    differentiation: 'E.g., acetonitrile, THF, dichloromethane, n-hexane, DMF'
  },
  {
    value: 1.0,
    label: '5. Depletion/Fine Chem',
    description: 'Scarce mineral or fine chemicals. Involves rare elements (Pt, Ni, F) extraction, or extremely complex synthesis steps.',
    differentiation: 'E.g., phosphates, TFA, ion-pair reagents'
  }
]

// Disposal Factor (处置因子) 的选项 - 五级固有阻力评分系统
const DISPOSAL_OPTIONS = [
  { 
    value: 0.0, 
    label: 'L1: Natural Return',
    description: 'No landfill required. Can return to nature directly with no intervention, harmless and naturally degradable',
    criteria: 'E.g.: pure water, gaseous CO₂',
    color: '#52c41a'
  },
  { 
    value: 0.25, 
    label: 'L2: Low-Entropy Recovery',
    description: 'Very low energy recovery. BP < 80°C, non-halogen, low toxicity, low distillation energy, controlled residue risk',
    criteria: 'E.g.: ethanol, acetone, ethyl acetate',
    color: '#95de64'
  },
  { 
    value: 0.5, 
    label: 'L3: Standard Industrial',
    description: 'Standard energy recovery. BP 80 ~ 100°C, or moderate toxicity/corrosion. Mature industrial recovery but higher cost',
    criteria: 'E.g.: methanol, acetonitrile, n-hexane',
    color: '#ffc53d'
  },
  { 
    value: 0.75, 
    label: 'L4: High Barrier',
    description: 'High energy/high risk. BP > 100°C (more energy), or halogenated (needs corrosion-resistant equipment), or highly toxic/hard to package',
    criteria: 'E.g.: THF, DCM, DMF, DMSO, chlorinated water, ethanol',
    color: '#ff9c6e'
  },
  { 
    value: 1.0, 
    label: 'L5: Irreversible Destruction',
    description: 'Fundamentally unrecoverable. Contains non-renewable solid (causes scaling), POPs, or requires incineration',
    criteria: 'E.g.: phosphates, TFA, ion-pair reagents',
    color: '#ff4d4f'
  }
]

// 处置百分比选项
const DISPOSAL_PERCENTAGE_OPTIONS = [
  { value: 0, label: 'A. 0% (Complete Disposal/Incineration) → P = 0', pValue: 0 },
  { value: 25, label: 'B. 25% (Minor Recovery for Cleaning) → P = 25', pValue: 25 },
  { value: 50, label: 'C. 50% (Half Recovery) → P = 50', pValue: 50 },
  { value: 75, label: 'D. 75% (Majority Recovery) → P = 75', pValue: 75 },
  { value: 100, label: 'E. 100% (Complete Closed Loop) → P = 100', pValue: 100 }
]

const AddReagentModal: React.FC<AddReagentModalProps> = ({ visible, onCancel, onOk, onBatchImport }) => {
  // 添加输入模式状态：'select' 或 'manual'
  const [inputMode, setInputMode] = useState<'select' | 'manual'>('select')
  
  // 只在 Modal 可见时创建 form 实例，避免警告
  const [form] = Form.useForm()
  
  // 重置 form 当 Modal 打开时
  React.useEffect(() => {
    if (visible) {
      form.resetFields()
    }
  }, [visible, form])
  
  const [calculatedScores, setCalculatedScores] = useState({
    safetyScore: 0,
    healthScore: 0,
    envScore: 0
  })
  
  // Excel 批量导入处理
  const handleExcelUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        if (jsonData.length < 2) {
          message.error('Excel file is empty or invalid')
          return
        }
        
        // 解析表头（第一行）
        const headers = jsonData[0].map((h: string) => h?.toString().trim().toLowerCase())
        
        // 查找列索引
        const getColIndex = (names: string[]) => {
          for (const name of names) {
            const idx = headers.findIndex(h => h && h.includes(name))
            if (idx !== -1) return idx
          }
          return -1
        }
        
        const colMap = {
          name: getColIndex(['name', 'substance', 'reagent', '试剂', '物质']),
          density: getColIndex(['density', 'ρ', '密度']),
          releasePotential: getColIndex(['release', 'potential', '释放']),
          fireExplos: getColIndex(['fire', 'explos', '火灾', '爆炸']),
          reactDecom: getColIndex(['react', 'decom', '反应', '分解']),
          acuteToxicity: getColIndex(['acute', 'toxicity', '急性', '毒性']),
          irritation: getColIndex(['irritation', '刺激']),
          chronicToxicity: getColIndex(['chronic', '慢性']),
          persistency: getColIndex(['persistency', '持久']),
          airHazard: getColIndex(['air', 'hazard', '空气']),
          waterHazard: getColIndex(['water', 'hazard', '水']),
          regeneration: getColIndex(['regeneration', '再生']),
          disposal: getColIndex(['disposal', '处置'])
        }
        
        // 检查必需列
        if (colMap.name === -1) {
          message.error('Excel must contain "Name" column')
          return
        }
        
        // 解析数据行
        const reagents: ReagentFactor[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue
          
          const name = row[colMap.name]?.toString().trim()
          if (!name) continue
          
          const parseNum = (idx: number, defaultVal: number = 0): number => {
            if (idx === -1) return defaultVal
            const val = row[idx]
            const num = typeof val === 'number' ? val : parseFloat(val?.toString() || '0')
            return isNaN(num) ? defaultVal : num
          }
          
          const reagent: ReagentFactor = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name,
            density: parseNum(colMap.density),
            releasePotential: parseNum(colMap.releasePotential),
            fireExplos: parseNum(colMap.fireExplos),
            reactDecom: parseNum(colMap.reactDecom),
            acuteToxicity: parseNum(colMap.acuteToxicity),
            irritation: parseNum(colMap.irritation),
            chronicToxicity: parseNum(colMap.chronicToxicity),
            persistency: parseNum(colMap.persistency),
            airHazard: parseNum(colMap.airHazard),
            waterHazard: parseNum(colMap.waterHazard),
            safetyScore: 0,
            healthScore: 0,
            envScore: 0,
            regeneration: parseNum(colMap.regeneration),
            disposal: parseNum(colMap.disposal)
          }
          
          // 自动计算 S、H、E
          reagent.safetyScore = Number((
            reagent.releasePotential +
            reagent.fireExplos +
            reagent.reactDecom +
            reagent.acuteToxicity
          ).toFixed(3))
          
          reagent.healthScore = Number((
            reagent.irritation +
            reagent.chronicToxicity
          ).toFixed(3))
          
          reagent.envScore = Number((
            reagent.persistency +
            reagent.airHazard +
            reagent.waterHazard
          ).toFixed(3))
          
          reagents.push(reagent)
        }
        
        if (reagents.length === 0) {
          message.error('No valid data found in Excel')
          return
        }
        
        // 批量导入
        if (onBatchImport) {
          onBatchImport(reagents)
          message.success(`Successfully imported ${reagents.length} reagents`)
          onCancel()
        }
      } catch (error) {
        console.error('Excel parsing error:', error)
        message.error('Failed to parse Excel file: ' + (error as Error).message)
      }
    }
    reader.readAsBinaryString(file)
    return false // 阻止自动上传
  }
  
  // Release Potential 的状态
  const [rpStep1, setRpStep1] = useState<string>('') // A/B/C
  const [rpCalculatedValue, setRpCalculatedValue] = useState<number>(0)
  
  // Fire/Explosives 的状态
  const [feStep1, setFeStep1] = useState<string>('') // A/B/C
  const [feStep2, setFeStep2] = useState<string>('') // A/B/C/D
  const [feStep3, setFeStep3] = useState<string>('') // A/B/C/D (易燃性评估)
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
  const [persQ2, setPersQ2] = useState<string>('') // A/B/C/D/E (快速筛选)
  const [persQ3, setPersQ3] = useState<string>('') // A/B/C/D (结构分类)
  const [persReadyBiodeg, setPersReadyBiodeg] = useState<number | undefined>(undefined) // 0/1 (保留，但不用于计算)
  const [persQ6, setPersQ6] = useState<string>('') // A/B (难降解/高累积)
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
      // Index = 1.74 - 0.53 × log₁₀(LD50)
      const acuteValue = 1.74 - 0.53 * Math.log10(ld50)
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
      if (q4Codes.includes('R38')) total += 0.220
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
      // 二氯甲烷特例 (Dichloromethane / DCM exception)
      if (substanceName && (
        substanceName.toLowerCase().includes('二氯甲烷') ||
        substanceName.toLowerCase().includes('dichloromethane') ||
        substanceName.toLowerCase().includes('dcm')
      )) {
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
    q2?: string,
    q3?: string,
    biodegHalfLife?: number,
    dataSource?: string,
    q6?: string
  ): number => {
    // 第一阶段：物质身份确认
    if (q1 === 'A') {
      // 浓无机强酸
      return 0.485
    }
    if (q1 === 'B') {
      // 一般无机物
      return 0.000
    }
    
    // 第二阶段：快速路径筛选
    if (q2 === 'A') {
      // 极低生物累积
      return 0.000
    }
    if (q2 === 'B') {
      // 易降解有机物
      return 0.026
    }
    if (q2 === 'C') {
      // 高挥发性低累积
      return 0.023
    }
    if (q2 === 'D') {
      // 快速代谢酮类
      return 0.126
    }
    
    // 第三阶段：结构分类
    if (q3 === 'A') {
      // 醇类
      return 0.282
    }
    
    // 第四/五阶段：数据采集与核心计算
    if ((q3 === 'B' || q3 === 'C' || q3 === 'D') && biodegHalfLife !== undefined && biodegHalfLife > 0) {
      const t = biodegHalfLife
      let result = 0
      
      if (q3 === 'B') {
        // 卤代烃 (Halogenated)
        // I_per = 0.32 × log10(t)
        result = 0.32 * Math.log10(t)
      } else if (q3 === 'C') {
        // 醚类 (Ethers)
        // I_per = 0.45 × log10(t) + 0.18 + 结构修正
        result = 0.45 * Math.log10(t) + 0.18
        // 结构修正：如果Q6选了A（难降解），加0.14
        if (q6 === 'A') {
          result += 0.14
        }
      } else if (q3 === 'D') {
        // 通用有机物 (General Organics)
        // I_per = 0.45 × log10(t) + 结构修正 - 数据修正
        result = 0.45 * Math.log10(t)
        // 结构修正：如果Q6选了A（难降解/高累积），加0.05
        if (q6 === 'A') {
          result += 0.05
        }
        // 数据修正：如果Q5选了B（预测值），减0.05
        if (dataSource === 'Predicted') {
          result -= 0.05
        }
      }
      
      return Number(result.toFixed(3))
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
      // 新规则：判断是否是难降解
      // 如果是难降解（q3_1 === 'B'），则计算修正值 Corr = 6 / LC50
      // S4 = Corr（不是 Sum + Corr，因为最后total会加上s1+s2+s3）
      if (q3_1 === 'B') {
        if (lc50 !== undefined && lc50 > 0) {
          s4 = 6.0 / lc50  // 只存储Corr
        } else {
          s4 = 0
        }
      } else {
        // 如果不是难降解，S4 = 0
        s4 = 0
      }
    } else {
      // 情形B：Sum = 0，需要计算微量残差
      if (lc50 !== undefined && lc50 > 0 && kValue !== undefined) {
        s4 = kValue / lc50
      }
    }
    
    const total = s1 + s2 + s3 + s4  // total = sum + s4 = sum + corr
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
        setFeStep3(changedValues.feStep3) // 更新feStep3状态
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
      // 选择C时，不清空，等待后续Q2选择
    }
    
    // Q2快速路径筛选
    if (allValues.persQ1 === 'C' && changedValues.persQ2 !== undefined) {
      setPersQ2(changedValues.persQ2)
      // 如果选择了A/B/C/D，立即计算
      if (changedValues.persQ2 === 'A' || changedValues.persQ2 === 'B' || changedValues.persQ2 === 'C' || changedValues.persQ2 === 'D') {
        const pers = calculatePersistency('C', changedValues.persQ2)
        setPersCalculatedValue(pers)
        form.setFieldsValue({ persistency: pers })
      }
      // 选择E时，清空计算结果，等待Q3
      if (changedValues.persQ2 === 'E') {
        setPersCalculatedValue(0)
        form.setFieldsValue({ persistency: 0 })
      }
    }
    
    // Q3结构分类
    if (allValues.persQ1 === 'C' && allValues.persQ2 === 'E' && changedValues.persQ3 !== undefined) {
      setPersQ3(changedValues.persQ3)
      // 如果选择了A（醇类），立即计算
      if (changedValues.persQ3 === 'A') {
        const pers = calculatePersistency('C', 'E', 'A')
        setPersCalculatedValue(pers)
        form.setFieldsValue({ persistency: pers })
      }
      // 选择B/C/D时，尝试立即计算（如果已有数据）
      if (changedValues.persQ3 === 'B' || changedValues.persQ3 === 'C' || changedValues.persQ3 === 'D') {
        const biodegHalfLife = allValues.persBiodegHalfLife
        const dataSource = allValues.persDataSource
        const q6 = allValues.persQ6
        
        if (biodegHalfLife !== undefined && biodegHalfLife > 0) {
          // 对于卤代烃（B），不需要Q6
          if (changedValues.persQ3 === 'B') {
            const pers = calculatePersistency('C', 'E', 'B', biodegHalfLife, dataSource)
            setPersCalculatedValue(pers)
            form.setFieldsValue({ persistency: pers })
          }
          // 对于醚类（C）和通用有机物（D），如果有Q6数据就计算
          else if ((changedValues.persQ3 === 'C' || changedValues.persQ3 === 'D') && q6) {
            const pers = calculatePersistency('C', 'E', changedValues.persQ3, biodegHalfLife, dataSource, q6)
            setPersCalculatedValue(pers)
            form.setFieldsValue({ persistency: pers })
          }
        }
      }
    }
    
    // Q4/Q5数据采集的变化（监听所有相关字段）
    if (allValues.persQ1 === 'C' && allValues.persQ2 === 'E' && (allValues.persQ3 === 'B' || allValues.persQ3 === 'C' || allValues.persQ3 === 'D')) {
      const needsCalculation = 
        changedValues.persBiodegHalfLife !== undefined ||
        changedValues.persDataSource !== undefined ||
        changedValues.persQ6 !== undefined
        
      if (needsCalculation) {
        const biodegHalfLife = allValues.persBiodegHalfLife
        const dataSource = allValues.persDataSource
        const q3 = allValues.persQ3
        const q6 = allValues.persQ6
        
        if (biodegHalfLife !== undefined && biodegHalfLife > 0) {
          // 卤代烃（B）不需要Q6
          if (q3 === 'B') {
            const pers = calculatePersistency('C', 'E', 'B', biodegHalfLife, dataSource)
            setPersCalculatedValue(pers)
            form.setFieldsValue({ persistency: pers })
          }
          // 醚类（C）和通用有机物（D）需要Q6
          else if ((q3 === 'C' || q3 === 'D') && q6) {
            const pers = calculatePersistency('C', 'E', q3, biodegHalfLife, dataSource, q6)
            setPersCalculatedValue(pers)
            form.setFieldsValue({ persistency: pers })
          }
        }
      }
      
      if (changedValues.persQ6 !== undefined) {
        setPersQ6(changedValues.persQ6)
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
      message.success('Reagent added successfully!')
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setInputMode('select') // 重置输入模式
    setCalculatedScores({ safetyScore: 0, healthScore: 0, envScore: 0 })
    setRpStep1('')
    setRpCalculatedValue(0)
    setFeStep1('')
    setFeStep2('')
    setFeStep3('') // 添加feStep3的重置
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
    setPersQ2('')
    setPersQ3('')
    setPersReadyBiodeg(undefined)
    setPersQ6('')
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
          <span>Add New Reagent</span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={1000}
      okText="Add"
      cancelText="Cancel"
      destroyOnHidden
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '20px 24px' } }}
    >
      {visible && (
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
          persQ2: undefined,
          persQ3: undefined,
          persBiodegHalfLife: undefined,
          persDataSource: undefined,
          persReadyBiodeg: undefined,
          persBcf: undefined,
          persAtmosRate: undefined,
          persFishHalfLife: undefined,
          persQ6: undefined,
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
        {/* 输入模式选择 + Excel 导入 */}
        <Alert
          message="📝 Please Select Input Method"
          description={
            <div>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Button
                  type={inputMode === 'select' ? 'primary' : 'default'}
                  size="large"
                  icon={<ExperimentOutlined />}
                  onClick={() => setInputMode('select')}
                  style={{ width: '100%', height: 'auto', padding: '12px 16px', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Guided Mode (Recommended)</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Determine factor values step by step through decision tree, automatic calculation
                    </div>
                  </div>
                </Button>
                <Button
                  type={inputMode === 'manual' ? 'primary' : 'default'}
                  size="large"
                  icon={<EditOutlined />}
                  onClick={() => setInputMode('manual')}
                  style={{ width: '100%', height: 'auto', padding: '12px 16px', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Manual Input Mode</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Directly input all known factor values, suitable for complete data
                    </div>
                  </div>
                </Button>
                
                {/* Excel 批量导入 */}
                <Upload
                  accept=".xlsx,.xls"
                  beforeUpload={handleExcelUpload}
                  showUploadList={false}
                  disabled={!onBatchImport}
                >
                  <Button
                    size="large"
                    icon={<UploadOutlined />}
                    style={{ width: '100%', height: 'auto', padding: '12px 16px', textAlign: 'left' }}
                    disabled={!onBatchImport}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📊 Batch Import from Excel</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        Import multiple reagents at once from Excel file (.xlsx/.xls)
                      </div>
                    </div>
                  </Button>
                </Upload>
              </Space>
            </div>
          }
          type="info"
          style={{ marginBottom: 24 }}
        />
        
        {/* 基本信息 */}
        <Divider orientation="left" style={{ fontSize: 15, fontWeight: 'bold', color: '#262626', marginTop: 0, marginBottom: 16 }}>Basic Information</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Reagent Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter reagent name' },
                { min: 2, message: 'Reagent name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="e.g., Methanol, Ethanol" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Density ρ (g/mL)"
              name="density"
              rules={[{ required: true, message: 'Please enter density value' }]}
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

        {inputMode === 'manual' ? (
          // 手动输入模式：直接输入所有因子值
          <>
            {/* 安全因子 - 手动输入 */}
            <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#ff4d4f', borderTopWidth: 2 }}>
              <Space size={8}>
                <FireOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                <span>Safety Factors</span>
              </Space>
            </Divider>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="Release Potential" name="releasePotential">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Fire/Explos." name="fireExplos">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="React./Decom." name="reactDecom">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Acute Toxicity" name="acuteToxicity">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
            </Row>

            {/* 健康因子 - 手动输入 */}
            <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#52c41a', borderTopWidth: 2 }}>
              <Space size={8}>
                <HeartOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <span>Health Factors</span>
              </Space>
            </Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Irritation" name="irritation">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Chronic Toxicity" name="chronicToxicity">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
            </Row>

            {/* 环境因子 - 手动输入 */}
            <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#1890ff', borderTopWidth: 2 }}>
              <Space size={8}>
                <GlobalOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                <span>Environment Factors</span>
              </Space>
            </Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Persistency" name="persistency">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Air Hazard" name="airHazard">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Water Hazard" name="waterHazard">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.001} precision={3} />
                </Form.Item>
              </Col>
            </Row>

            {/* 再生与处置因子 - 手动输入 */}
            <Divider orientation="left" style={{ fontSize: 15, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16 }}>
              Regeneration & Disposal Factors
            </Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Regeneration" name="regeneration" tooltip="Value between 0-1, indicating regeneration difficulty">
                  <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.01} precision={2} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Disposal" name="disposal" tooltip="Value between 0-2, indicating disposal difficulty">
                  <InputNumber style={{ width: '100%' }} min={0} max={2} step={0.01} precision={2} />
                </Form.Item>
              </Col>
            </Row>
          </>
        ) : (
          // 智能引导模式：原有的决策树UI
          <>

        {/* 安全因子 */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#ff4d4f', borderTopWidth: 2 }}>
          <Space size={8}>
            <FireOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            <span>Safety Factors</span>
          </Space>
        </Divider>
        
        {/* Release Potential 决策树 */}
        <div style={{ marginBottom: 16, background: '#fff1f0', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #ff4d4f' }}>
          <Text strong style={{ fontSize: 15, color: '#cf1322' }}>
            📊 Release Potential Assessment
          </Text>
        </div>
        
        {/* Step 1: Substance Classification */}
        <Form.Item
          label={<Text strong>Step 1: Substance Classification</Text>}
          name="rpStep1"
          rules={[{ required: true, message: 'Please select substance classification' }]}
          tooltip={
            <div style={{ maxWidth: 400 }}>
              <div style={{ marginBottom: 8 }}>Select based on physical state and properties at room temperature and pressure:</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A.</strong> Gas dissolved in water or extremely volatile liquid</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B.</strong> Solid at room temperature (ionic compound), or non-volatile liquid with very high boiling point (&gt;200°C)</div>
              <div style={{ fontSize: 11 }}><strong>C.</strong> Liquid with boiling point between 30°C and 200°C</div>
            </div>
          }
        >
          <Select 
            placeholder="Please determine the physical state and properties at room temperature and pressure"
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
              label={
                <div>
                  <Text strong>Step 2: Data Entry - Boiling Point</Text>
                  <Link 
                    href="https://www.chemicalbook.com" 
                    target="_blank" 
                    style={{ marginLeft: 12, fontSize: 12 }}
                  >
                    <LinkOutlined /> Query Boiling Point Database (ChemicalBook)
                  </Link>
                </div>
              }
              name="rpTbp"
              rules={[
                { required: true, message: 'Please enter standard boiling point' },
                { type: 'number', min: 30, max: 200, message: 'Boiling point should be between 30-200°C' }
              ]}
              tooltip="Please query the standard boiling point (Tbp) of the substance and enter it here. Reference database: ChemicalBook"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., Methanol boiling point is 64.7"
                addonAfter="°C"
                step={0.1}
                precision={1}
              />
            </Form.Item>

            {/* Step 3: Structural Feature Correction */}
            <Form.Item
              label={<Text strong>Step 3: Structural Feature Correction</Text>}
              name="rpStructure"
              rules={[{ required: true, message: 'Please select chemical structure classification' }]}
              tooltip={
                <div style={{ maxWidth: 400 }}>
                  <div style={{ marginBottom: 8 }}>Determine which chemical structure category the substance belongs to:</div>
                  <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A. Alcohols:</strong> Molecule contains hydroxyl group (-OH) and can form hydrogen bonds</div>
                  <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B. Ethers:</strong> Molecule contains ether bond (-O-)</div>
                  <div style={{ fontSize: 11, marginBottom: 6 }}><strong>C. Highly Branched Alkanes:</strong> Name contains "iso-" or "Tert-", or highly branched structure</div>
                  <div style={{ fontSize: 11 }}><strong>D. Standard Solvents:</strong> Other volatile liquids not in the above three categories</div>
                </div>
              }
            >
              <Select placeholder="Please determine which chemical structure category the substance belongs to">
                {RP_STEP3_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value} title={opt.description}>
                    {opt.label} (Correction: {opt.correction > 0 ? '+' : ''}{opt.correction})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {/* Release Potential 计算结果显示 */}
        {rpStep1 && (
          <Alert
            message="Release Potential Calculation Result"
            description={
              <div>
                {rpStep1 === 'A' && (
                  <Text>
                    【Result A】Dissolved Gas/Highly Volatile Liquid → Release Potential = <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>1.0</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Basis: High mobility risk, reference Figure 2a "Gas dissolved but releasable" category)
                    </Text>
                  </Text>
                )}
                {rpStep1 === 'B' && (
                  <Text>
                    【Result B】Solid/Non-volatile Substance → Release Potential = <Text strong style={{ color: '#52c41a', fontSize: 16 }}>0.0001</Text> (≈ 0)
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Basis: Extremely low mobility, reference Figure 2a "Solid" or high boiling point liquid category)
                    </Text>
                  </Text>
                )}
                {rpStep1 === 'C' && rpCalculatedValue > 0 && (
                  <Text>
                    【Result C】Volatile Liquid → Release Potential = <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{rpCalculatedValue.toFixed(4)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Calculation formula: RP = 0.885 - (0.00333 × {form.getFieldValue('rpTbp')}°C) + {form.getFieldValue('rpStructure')} = {rpCalculatedValue.toFixed(4)}
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
            🔥 Flammability/Explosiveness Assessment
          </Text>
        </div>
        
        {/* Stage 1: Quick Screening */}
        <Form.Item
          label={<Text strong>Stage 1: Quick Screening (Exclude Absolutely Safe Substances)</Text>}
          name="feStep1"
          rules={[{ required: true, message: 'Please select substance classification' }]}
          tooltip={
            <div style={{ maxWidth: 400 }}>
              <div style={{ marginBottom: 8 }}>First determine if the substance poses no safety threat:</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A.</strong> Essentially non-flammable, non-oxidizing</div>
              <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B.</strong> Non-oxidizing regular salt (⚠️ If oxidizer, select C)</div>
              <div style={{ fontSize: 11 }}><strong>C.</strong> Requires further assessment of oxidizing and flammability properties</div>
            </div>
          }
        >
          <Select 
            placeholder="Please determine which type the substance belongs to"
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
            label={<Text strong>Stage 2: Oxidizing Risk Assessment (Oxygen Source)</Text>}
            name="feStep2"
            rules={[{ required: true, message: 'Please select if there are oxidizing risk codes' }]}
            tooltip={
              <div style={{ maxWidth: 400 }}>
                <div style={{ marginBottom: 8 }}>Substance that can provide oxygen to support combustion (R7, R8, R9) is considered high risk even if not flammable itself:</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A/B/C:</strong> Has R7/R8/R9 marking, may cause fire or explosion</div>
                <div style={{ fontSize: 11 }}><strong>D:</strong> None of the above, no significant oxidizing risk</div>
              </div>
            }
          >
            <Select 
              placeholder="Check if R-codes (hazard codes) or GHS classification contains any of the following?"
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
            label={
              <div>
                <Text strong>Stage 3: Flammability Risk Assessment (Fuel Hazard)</Text>
                <Link 
                  href="http://www.basechem.org" 
                  target="_blank" 
                  style={{ marginLeft: 12, fontSize: 12 }}
                >
                  <LinkOutlined /> Query Flash Point/R Phrases (BaseChemOrg)
                </Link>
              </div>
            }
            name="feStep3"
            rules={[{ required: true, message: 'Please select flash point situation' }]}
            tooltip={
              <div style={{ maxWidth: 400 }}>
                <div style={{ marginBottom: 8 }}>Most critical step for organic solvents, based on flash point or regulatory classification (default process temperature is room temperature 25°C):</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>A:</strong> Flash point &lt; 21°C, or R11 - Highly flammable</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>B:</strong> Flash point 21-60°C, or R10 - Flammable</div>
                <div style={{ fontSize: 11, marginBottom: 6 }}><strong>C:</strong> Flash point &gt; 60°C - Low risk</div>
                <div style={{ fontSize: 11 }}><strong>D:</strong> No flash point, and not marked as R11</div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#1890ff' }}>💡 Reference database: BaseChemOrg (flash point, R phrases, heat of combustion)</div>
              </div>
            }
          >
            <Select placeholder="Please select based on flash point or flammability marking">
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
            message="Fire/Explosives Calculation Result"
            description={
              <div>
                {(feStep1 === 'A' || feStep1 === 'B') && (
                  <Text>
                    【Result】Completely inert/non-oxidizing salts → Fire/Explos. Index = <Text strong style={{ color: '#52c41a', fontSize: 16 }}>0.000</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Reason: No combustion or oxidation risk, no further evaluation needed)
                    </Text>
                  </Text>
                )}
                {feStep1 === 'C' && (feStep2 === 'A' || feStep2 === 'B' || feStep2 === 'C') && (
                  <Text>
                    【Result】Has oxidizing risk (R7/R8/R9) → Fire/Explos. Index = <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>1.000</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Reason: High oxidizing power, may cause fire or explosion)
                    </Text>
                  </Text>
                )}
                {feStep1 === 'C' && feStep2 === 'D' && feStep3 && (
                  <Text>
                    【Result】Flammability Evaluation → Fire/Explos. Index = <Text strong style={{ color: feCalculatedValue === 1 ? '#ff4d4f' : feCalculatedValue === 0.5 ? '#fa8c16' : '#52c41a', fontSize: 16 }}>{feCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {feCalculatedValue === 1.000 && '(Reason: Highly flammable, flash point < 21°C or marked as R11)'}
                      {feCalculatedValue === 0.500 && '(Reason: Moderate risk, flash point 21-60°C or marked as R10)'}
                      {feCalculatedValue === 0.000 && '(Reason: Low risk, flash point > 60°C or no flash point and not marked)'}
                    </Text>
                  </Text>
                )}
                {feStep1 === 'C' && feStep2 === 'D' && !feStep3 && (
                  <Text type="secondary">
                    ⏳ Please complete Stage 3: Flammability Risk Evaluation
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
            ⚗️ Reaction/Decomposition Evaluation
          </Text>
        </div>
        
        {/* 第一阶段：基础信息筛选 */}
        <Form.Item
          label={<Text strong>Stage 1: Basic Information & Quick Screening</Text>}
          name="rdStep1"
          rules={[{ required: true, message: 'Please select substance form' }]}
          tooltip="First determine the form of this substance in the process"
        >
          <Select 
            placeholder="What is the form of this substance in the process?"
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
                  label={
                    <div>
                      <Text>Yellow Diamond (Instability/Reactivity) Number</Text>
                      <Link 
                        href="https://cameochemicals.noaa.gov/search/simple" 
                        target="_blank" 
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        <LinkOutlined /> NFPA Database (CAMEO)
                      </Link>
                    </div>
                  }
                  name="rdNfpaYellow"
                  rules={[{ required: true, message: 'Please fill in the yellow diamond number' }]}
                  tooltip="Stage 2: Find NFPA 704 Data (Core Step) - Search substance English name in CAMEO Chemicals database to find NFPA 704 diamond label. Yellow diamond represents reactivity/instability, value range 0-4"
                >
                  <Select 
                    placeholder="Please select 0-4"
                    onChange={(value) => setRdNfpaYellow(value)}
                  >
                    <Option value={0}>0 - Stable</Option>
                    <Option value={1}>1 - Usually stable, but may be unstable at high T/P</Option>
                    <Option value={2}>2 - Violent chemical change, but won't explode</Option>
                    <Option value={3}>3 - May explode, but requires strong detonation source</Option>
                    <Option value={4}>4 - May explode at room temperature</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text>White Diamond (Special Hazard) - Any Marking?</Text>}
                  name="rdNfpaWhite"
                  tooltip='NFPA 704 white diamond represents special hazards, common markings: W (Water Reactive), OX (Oxidizer)'
                >
                  <Select 
                    placeholder="Please select"
                    onChange={(value) => setRdNfpaWhite(value)}
                    allowClear
                  >
                    <Option value="None">No marking</Option>
                    <Option value="W">W - Water Reactive</Option>
                    <Option value="OX">OX - Oxidizer</Option>
                    <Option value="Other">Other marking</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 第三阶段：不兼容性与特殊风险判定 */}
            <Form.Item
              label={<Text strong>Stage 3: Incompatibility & Special Risk Assessment</Text>}
              name="rdStep3"
              tooltip="Based on Q2 result or substance characteristics, determine if there are special risks (multiple choice)"
            >
              <Select
                mode="multiple"
                placeholder="Does this substance meet any of the following descriptions? (Multiple choice, select D if none)"
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
                label={<Text strong>Stage 4: Chemical Structure Check (For Organics)</Text>}
                name="rdStep4"
                tooltip="If NFPA data not found, please check molecular structure"
              >
                <Select placeholder="(For organics only) Does this substance contain unstable groups?">
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
            message="Reaction/Decomposition Calculation Result"
            description={
              <div>
                {rdStep1 === 'B' && (
                  <Text>
                    【Result】Diluted aqueous solution (non-strongly oxidizing) → React./Decom. = <Text strong style={{ color: '#52c41a', fontSize: 16 }}>0.000</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Reason: HPLC-EAT rules, water-based dilute buffers typically ignore their contribution)
                    </Text>
                  </Text>
                )}
                {rdStep1 === 'A' && rdCalculatedValue >= 0 && (
                  <Text>
                    【Stage 5: Calculation Result】Pure substance evaluation → React./Decom. = <Text strong style={{ 
                      color: rdCalculatedValue >= 0.800 ? '#ff4d4f' : rdCalculatedValue >= 0.600 ? '#fa8c16' : '#52c41a', 
                      fontSize: 16 
                    }}>{rdCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {rdCalculatedValue === 0.800 && rdStep3 && (rdStep3.includes('A') || rdStep3.includes('B') || rdStep3.includes('C')) && 
                        '(Reason: Highest priority - incompatibility, with W/OX marking or strong acid/base)'}
                      {rdCalculatedValue === 0.800 && rdNfpaYellow !== undefined && rdNfpaYellow >= 2 && 
                        '(Reason: Second highest priority - NFPA yellow number ≥ 2, side reaction risk)'}
                      {rdCalculatedValue === 0.600 && 
                        '(Reason: Medium priority - NFPA yellow number = 1, or contains unstable groups)'}
                      {rdCalculatedValue === 0.000 && 
                        '(Reason: Low risk - NFPA yellow number = 0, or absolutely stable structure)'}
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
            ☠️ Acute Toxicity Evaluation
          </Text>
        </div>
        
        {/* 第一阶段：路径选择 */}
        <Form.Item
          label={<Text strong>Stage 1: Substance Classification & Path Selection</Text>}
          name="atPath"
          rules={[{ required: true, message: 'Please select calculation path' }]}
          tooltip="Different substances use different toxicity data sources"
        >
          <Select 
            placeholder="Which category does this substance belong to?"
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
                  label={
                    <div>
                      <Text>[Fill-in 1] Find or Enter IDLH (ppm)</Text>
                      <Link 
                        href="https://www.cdc.gov/niosh/idlh/intridl4.html" 
                        target="_blank" 
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        <LinkOutlined /> IDLH Database (NIOSH)
                      </Link>
                    </div>
                  }
                  name="atIdlh"
                  rules={[{ required: true, message: 'Please enter IDLH value' }]}
                  tooltip="【Path A】Calculate acute toxicity of volatile substances (based on IDLH) - Applicable to: methanol, acetonitrile, THF and other organic solvents. Reference: NIOSH IDLH Database"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Example: IDLH of methanol is 6000"
                    addonAfter="ppm"
                    min={0}
                    step={100}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text>Substance Molecular Weight (MW)</Text>}
                  name="atMw"
                  rules={[{ required: true, message: 'Please enter molecular weight' }]}
                  tooltip="Molecular weight of the substance, used for concentration conversion"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Example: MW of methanol is 32.04"
                    addonAfter="g/mol"
                    min={0}
                    step={0.01}
                    precision={2}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ background: '#f0f5ff', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13 }}>Standard IDLH Values for Common HPLC Substances:</Text>
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
              label={<Text>[Fill-in 1] Enter LD50 Data</Text>}
              name="atLd50"
              rules={[{ required: true, message: 'Please enter LD50 value' }]}
              tooltip="[Path B] Calculate acute toxicity of solid inorganics (based on LD50) - Applicable to: phosphates, ammonium acetate and other solid additives. Please find the rat oral LD50 (Oral Rat LD50), data source: MSDS or Sigma-Aldrich website"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Example: LD50 of sodium dihydrogen phosphate is about 8290"
                addonAfter="mg/kg"
                min={0}
                step={10}
              />
            </Form.Item>

            <Alert
              message="Quick Judgment Rules (No calculator needed)"
              description={
                <div>
                  <Text>• If LD50 ≥ 2000 (e.g. phosphates) → Directly fill <Text strong style={{ color: '#52c41a' }}>0.000</Text></Text>
                  <br />
                  <Text>• If LD50 ≤ 20 (highly toxic) → Directly fill <Text strong style={{ color: '#ff4d4f' }}>1.000</Text></Text>
                  <br />
                  <Text>• Only when LD50 is between 20 ~ 2000, use formula to calculate</Text>
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
            message="Acute Toxicity Calculation Result"
            description={
              <div>
                {atPath === 'A' && (
                  <Text>
                    【Result】Volatile substance (IDLH path) → Acute Toxicity = <Text strong style={{ 
                      color: atCalculatedValue >= 0.8 ? '#ff4d4f' : atCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                      fontSize: 16 
                    }}>{atCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Calculation Formula: C = ({form.getFieldValue('atIdlh')} × {form.getFieldValue('atMw')}) / 24.45 = {((form.getFieldValue('atIdlh') || 0) * (form.getFieldValue('atMw') || 0) / 24.45).toFixed(2)} mg/m³
                      <br />
                      Acute Value = 1.24 - 0.25 × log₁₀({((form.getFieldValue('atIdlh') || 0) * (form.getFieldValue('atMw') || 0) / 24.45).toFixed(2)}) = {atCalculatedValue.toFixed(3)}
                    </Text>
                  </Text>
                )}
                {atPath === 'B' && (
                  <Text>
                    【Result】Solid inorganic substance (LD50 path) → Acute Toxicity = <Text strong style={{ 
                      color: atCalculatedValue >= 0.8 ? '#ff4d4f' : atCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                      fontSize: 16 
                    }}>{atCalculatedValue.toFixed(3)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {form.getFieldValue('atLd50') >= 2000 && 'Quick check: LD50 ≥ 2000 (e.g., phosphates) → 0.000'}
                      {form.getFieldValue('atLd50') <= 20 && 'Quick Assessment: LD50 ≤ 20 (highly toxic) → 1.000'}
                      {form.getFieldValue('atLd50') > 20 && form.getFieldValue('atLd50') < 2000 && 
                        `Calculation Formula: Acute Value = 1.65 - 0.5 × log₁₀(${form.getFieldValue('atLd50')}) = ${atCalculatedValue.toFixed(3)}`
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
            <span>Health Factors</span>
          </Space>
        </Divider>

        {/* Irritation 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#fff7e6', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #ff7a45' }}>
          <Text strong style={{ fontSize: 15, color: '#d4380d' }}>
            🔬 Irritation Evaluation
          </Text>
        </div>

        {/* 问题 1：严重腐蚀性 */}
        <Form.Item
          label={
            <div>
              <Text strong>Question 1: Any severe corrosive codes?</Text>
              <Link 
                href="http://www.basechem.org" 
                target="_blank" 
                style={{ marginLeft: 8, fontSize: 12 }}
              >
                <LinkOutlined /> R-codes Database (BaseChemOrg)
              </Link>
            </div>
          }
          name="irrQ1"
          rules={[{ required: true, message: 'Please select' }]}
          tooltip="Stage 1: R-codes Quick Determination - Check R-codes (Risk codes) on the substance MSDS or label. Check if the substance contains R35 (Causes severe burns) or R34 (Causes burns). Reference database: BaseChemOrg"
        >
          <Select 
            placeholder="Does this substance contain R35 (Causes severe burns) or R34 (Causes burns)?"
            onChange={(value) => setIrrQ1(value)}
          >
            {IRR_Q1_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>
                <Text strong>{opt.label}</Text>
                {opt.result !== undefined && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    → Result: {opt.result.toFixed(3)}
                  </Text>
                )}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 问题 2：明显刺激性（仅当Q1选no时显示） */}
        {irrQ1 === 'no' && (
          <Form.Item
            label={<Text strong>Question 2: Any obvious irritation or severe damage codes?</Text>}
            name="irrQ2"
            rules={[{ required: true, message: 'Please select' }]}
            tooltip="Check if it contains R36/R37/R41/R48"
          >
            <Select 
              placeholder="Does this substance contain any of the following codes: R36/R37/R41/R48?"
              onChange={(value) => setIrrQ2(value)}
            >
              {IRR_Q2_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>
                  <Text strong>{opt.label}</Text>
                  {opt.result !== undefined && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      → Result: {opt.result.toFixed(3)}
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
              <Text strong style={{ fontSize: 14 }}>Stage 2: pH Procedure for Inorganic/Non-coded Substances</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Applicable to buffers, salts (such as monosodium phosphate, ammonium carbonate, etc.) that do not have the above R codes
              </Text>
            </div>

            <Form.Item
              label={<Text strong>Question 3: Measure or query substance pH value at process conditions (assume 1M concentration)</Text>}
              name="irrQ3Ph"
              rules={[{ required: true, message: 'Please select pH range' }]}
              tooltip="Select the corresponding range based on substance pH value"
            >
              <Select 
                placeholder="Which range does the substance pH value fall into?"
                onChange={(value) => setIrrQ3Ph(value)}
              >
                {IRR_Q3_PH_RANGES.map(opt => (
                  <Option 
                    key={opt.value} 
                    value={opt.value}
                    title={opt.description}
                  >
                    {opt.label} {opt.result !== undefined && `(Result: ${opt.result.toFixed(3)})`}
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
              <Text strong style={{ fontSize: 14 }}>Stage 3: Cumulative Minor Hazards (Backup Calculation)</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                This substance has no strong corrosion/irritation R codes and relatively mild pH. We need to calculate its potential minor hazards.
              </Text>
            </div>

            <Form.Item
              label={<Text strong>Question 4: Cumulative Calculation (Initial score = 0)</Text>}
              name="irrQ4Codes"
              tooltip="Check if it contains the following specific codes, multiple choice"
            >
              <Select
                mode="multiple"
                placeholder="Please check if it contains the following specific codes, and add corresponding values (multiple choice, none if not applicable)"
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
              message="Calculation Formula"
              description={
                <Text>
                  Irritation = 0 + (R38 score) + (R40 score) + (R20 series score) + (R50 series score)
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Note: If none of the above applies and pH is neutral, the result is 0
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
            message="Irritation Calculation Result"
            description={
              <div>
                <Text>
                  【Final Result】Irritation = <Text strong style={{ 
                    color: irrCalculatedValue >= 1.0 ? '#ff4d4f' : irrCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{irrCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {irrQ1 === 'yes' && '(Reason: Figure 3a - Corrosive C grade, R34/R35, Physical Value = 1)'}
                    {irrQ2 === 'yes' && '(Reason: Figure 3a - Irritant Xi grade, R36/37/38, Index Value ≈ 0.625)'}
                    {irrQ2 === 'ethanol' && '(Reason: Ethanol special case, directly set to 0)'}
                    {irrQ3Ph === 'strong' && '(Reason: Figure 3a - pH < 2 or > 11.5, highest risk)'}
                    {irrQ3Ph === 'moderate' && '(Reason: Figure 3a - pH moderate range, moderate risk)'}
                    {irrQ3Ph === 'neutral' && irrCalculatedValue > 0 && 
                      `(Reason: Trace hazard accumulation, total ${irrQ4Codes?.length || 0} codes selected)`
                    }
                    {irrQ3Ph === 'neutral' && irrCalculatedValue === 0 && 
                      '(Reason: Neutral pH and no specific hazard codes, result is 0)'}
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
            ⚠️ Chronic Toxicity Evaluation
          </Text>
        </div>

        {/* 第一步：物理状态 */}
        <Form.Item
          label={<Text strong>Step 1: Physical State</Text>}
          name="ctQ1State"
          rules={[{ required: true, message: 'Please select physical state' }]}
          tooltip="What is the physical state of this substance at normal temperature and pressure?"
        >
          <Select 
            placeholder="What is the physical state of this substance at normal temperature and pressure?"
            onChange={(value) => setCtQ1State(value)}
          >
            {CT_Q1_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二步：高危一票否决 */}
        <Form.Item
          label={<Text strong>Step 2: High Hazard Veto Check</Text>}
          name="ctQ2"
          rules={[{ required: true, message: 'Please select' }]}
          tooltip='Check "Hazard Statements" or R-codes/H-codes in MSDS'
        >
          <Select 
            placeholder='Check MSDS "Hazard Statements" or R-codes/H-codes for the following content'
            onChange={(value) => setCtQ2(value)}
          >
            {CT_Q2_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={opt.description}
              >
                {opt.label} {opt.result !== undefined && `(Result: ${opt.result.toFixed(3)})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第三步：无毒豁免（仅当Q2选C时显示） */}
        {ctQ2 === 'C' && (
          <Form.Item
            label={<Text strong>Step 3: Non-toxic Exemption</Text>}
            name="ctQ3"
            rules={[{ required: true, message: 'Please select' }]}
            tooltip='Does this substance belong to the following "low toxicity/non-toxic" categories?'
          >
            <Select 
              placeholder='Does the substance belong to the following "Low/Non-toxic" categories?'
              onChange={(value) => setCtQ3(value)}
            >
              {CT_Q3_OPTIONS.map(opt => (
                <Option 
                  key={opt.value} 
                  value={opt.value}
                  title={opt.description}
                >
                  {opt.label} {opt.result !== undefined && `(Result: ${opt.result.toFixed(3)})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 第四步：数据采集与核心计算（仅当Q2选C且Q3选C时显示） */}
        {ctQ2 === 'C' && ctQ3 === 'C' && (
          <>
            <Form.Item
              label={<Text>Substance Name (optional, for dichloromethane special case)</Text>}
              name="ctSubstanceName"
              tooltip="Step 4: Data Collection & Core Calculation - If no result obtained, please substitute the following data into the formula. If it's dichloromethane, please fill in, system will use special value 0.290"
            >
              <Input placeholder="Example: Dichloromethane" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={
                    <div>
                      <Text strong>Q4. [Fill-in] ACGIH TLV-TWA Value</Text>
                      <Link 
                        href="https://pubchem.ncbi.nlm.nih.gov" 
                        target="_blank" 
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        <LinkOutlined /> TLV Database (PubChem)
                      </Link>
                    </div>
                  }
                  name="ctTlv"
                  rules={[{ required: true, message: 'Please enter TLV value' }]}
                  tooltip="Must use mg/m³ as unit. If it's ppm, please convert based on molecular weight. Reference database: PubChem"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Please look up TLV-TWA value"
                    addonAfter="mg/m³"
                    min={0}
                    step={1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>Q5. [Select] Is it an alcohol?</Text>}
                  name="ctQ5Alcohol"
                  rules={[{ required: true, message: 'Please select' }]}
                  tooltip='Is this substance an "Alcohol (-OH)" and not highly toxic? Criteria: Name contains "alcohol", such as ethanol, isopropanol, but excludes methanol'
                >
                  <Select placeholder="Is it an alcohol (-OH) and not highly toxic?">
                    {CT_Q5_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        <Text strong>{opt.label}</Text>
                        {opt.correction > 0 && (
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            (Correction: +{opt.correction})
                          </Text>
                        )}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Alert
              message="Final Calculation Formula"
              description={
                <div>
                  <Text strong>1. Calculate Base Score:</Text>
                  <br />
                  <Text code>Base = 0.80 - 0.20 × log₁₀(TLV value)</Text>
                  <Text type="secondary"> (Note: If result &lt; 0, take 0)</Text>
                  <br /><br />
                  <Text strong>2. Alcohol Correction:</Text>
                  <br />
                  <Text>If Q5 selected A (is alcohol) -&gt; Base score + 0.06</Text>
                  <br /><br />
                  <Text strong>3. DCM Exception:</Text>
                  <br />
                  <Text>If it's dichloromethane, directly use 0.290, ignore above formula</Text>
                  <br /><br />
                  <Text strong>4. Final State Correction:</Text>
                  <br />
                  <Text code>Final value = (Corrected base score) × (K coefficient from Q1)</Text>
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
            message="Chronic Toxicity Calculation Result"
            description={
              <div>
                <Text>
                  【Final Result】Chronic Toxicity = <Text strong style={{ 
                    color: ctCalculatedValue >= 0.8 ? '#ff4d4f' : ctCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{ctCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ctQ2 === 'A' && '(Reason: Highly corrosive R35/H314, veto = 1.000)'}
                    {ctQ2 === 'B' && '(Reason: Carcinogenic/Mutagenic R45/R46/R49/H350, veto = 0.800)'}
                    {ctQ3 === 'A' && '(Reason: Simple saturated alkane, non-toxic exemption = 0.000)'}
                    {ctQ3 === 'B' && '(Reason: Harmless inorganic salt/buffer salt, non-toxic exemption = 0.000)'}
                    {ctQ2 === 'C' && ctQ3 === 'C' && ctCalculatedValue > 0 && 
                      `(Reason: Core calculation, physical state coefficient K = ${ctQ1State === 'A' ? '0.2' : '1.0'})`
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
            <span>Environment Factors</span>
          </Space>
        </Divider>

        {/* Persistency 决策树 */}
        <div style={{ marginBottom: 16, marginTop: 24, background: '#f6ffed', padding: '10px 16px', borderRadius: '6px', borderLeft: '4px solid #52c41a' }}>
          <Text strong style={{ fontSize: 15, color: '#389e0d' }}>
            🌱 Persistency Evaluation
          </Text>
        </div>

        {/* 第一步：无机物筛查 (Q1) */}
        <Form.Item
          label={<Text strong>Q1: Inorganic Substance Check</Text>}
          name="persQ1"
          rules={[{ required: true, message: 'Please select chemical property' }]}
          tooltip="Does this substance belong to the following inorganic categories?"
        >
          <Select 
            placeholder="Select substance category"
            onChange={(value) => setPersQ1(value)}
          >
            {PERSISTENCY_Q1_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={opt.description}
              >
                {opt.label} {opt.result !== undefined && `(Final: ${opt.result.toFixed(3)})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二步：快速路径筛选 (Q2) - 仅当Q1选C时显示 */}
        {persQ1 === 'C' && (
          <>
            <Alert
              message="💡 Data Collection Tip"
              description={
                <div style={{ fontSize: 12 }}>
                  <Text>Before answering Q2, please check the <Button 
                    type="link" 
                    size="small"
                    icon={<LinkOutlined />}
                    href="https://comptox.epa.gov/dashboard/" 
                    target="_blank"
                    style={{ padding: 0 }}
                  >CompTox Database</Button> to extract relevant environmental data (BCF, biodeg half-life, kOH, fish biotransformation, etc.)</Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              label={<Text strong>Q2: Fast Track Filter</Text>}
              name="persQ2"
              rules={[{ required: true, message: 'Please select' }]}
              tooltip="Does this organic substance meet any of the following rapid clearance or special metabolism conditions?"
            >
              <Select 
                placeholder="Does it meet any fast track conditions?"
                onChange={(value) => setPersQ2(value)}
              >
                {PERSISTENCY_Q2_OPTIONS.map(opt => (
                  <Option 
                    key={opt.value} 
                    value={opt.value}
                    title={opt.description}
                  >
                    {opt.label} {opt.result !== undefined && `(Final: ${opt.result.toFixed(3)})`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {/* 第三步：通用结构分类 (Q3) - 仅当Q2选E时显示 */}
        {persQ1 === 'C' && persQ2 === 'E' && (
          <Form.Item
            label={<Text strong>Q3: Structure Classification</Text>}
            name="persQ3"
            rules={[{ required: true, message: 'Please select structure type' }]}
            tooltip="Based on chemical structure, which category does this substance belong to?"
          >
            <Select 
              placeholder="Select structure category"
              onChange={(value) => setPersQ3(value)}
            >
              {PERSISTENCY_Q3_OPTIONS.map(opt => (
                <Option 
                  key={opt.value} 
                  value={opt.value}
                  title={opt.description}
                >
                  {opt.label} {opt.result !== undefined && `(Final: ${opt.result.toFixed(3)})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 第四步：数据采集 (Q4 & Q5) - 仅当Q3选B/C/D时显示 */}
        {persQ1 === 'C' && persQ2 === 'E' && (persQ3 === 'B' || persQ3 === 'C' || persQ3 === 'D') && (
          <>
            <div style={{ background: '#e6f7ff', padding: '16px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                📊 Q4 & Q5: Data Collection
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>Q4: Biodegradation Half-Life</Text>}
                  name="persBiodegHalfLife"
                  rules={[{ required: true, message: 'Please enter biodegradation half-life' }]}
                  tooltip="Biodegradation half-life (days), denoted as t"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter days (e.g., 10.5)"
                    addonAfter="days"
                    min={0}
                    step={0.1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>Q5: Data Source</Text>}
                  name="persDataSource"
                  rules={[{ required: true, message: 'Please select data source' }]}
                  tooltip="Is the half-life data from experimental measurement or software prediction?"
                >
                  <Select placeholder="Select data source">
                    {PERSISTENCY_DATA_SOURCE_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Q3选了C (醚类) 或 D (通用有机物) 时，显示Q6 */}
            {(persQ3 === 'C' || persQ3 === 'D') && (
              <Form.Item
                label={<Text strong>Q6: Difficult Degradation / High Accumulation Check</Text>}
                name="persQ6"
                rules={[{ required: true, message: 'Please select' }]}
                tooltip="Does this substance have difficult degradation (RB = 0) or high accumulation (BCF > 200) characteristics?"
              >
                <Select placeholder="Does it have difficult degradation or high accumulation?">
                  {PERSISTENCY_Q6_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value} title={opt.description}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {/* 显示计算公式说明 */}
            {persQ3 === 'B' && (
              <Alert
                message="📐 Halogenated Hydrocarbon Calculation"
                description={
                  <div>
                    <Text strong>Formula:</Text> <Text code>Persistency = 0.32 × log₁₀(t)</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Typical examples: chloroform, dichloromethane)
                    </Text>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {persQ3 === 'C' && (
              <Alert
                message="📐 Ether Calculation"
                description={
                  <div>
                    <Text strong>Base Formula:</Text> <Text code>Persistency = 0.45 × log₁₀(t) + 0.18</Text>
                    <br />
                    <Text strong>Structure Correction:</Text> If Q6 = A (difficult degradation/high accumulation), add <Text code>+0.14</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Typical examples: THF, MTBE)
                    </Text>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {persQ3 === 'D' && (
              <Alert
                message="📐 General Organic Calculation"
                description={
                  <div>
                    <Text strong>Base Formula:</Text> <Text code>Persistency = 0.45 × log₁₀(t)</Text>
                    <br />
                    <Text strong>Structure Correction:</Text> If Q6 = A (difficult degradation/high accumulation), add <Text code>+0.05</Text>
                    <br />
                    <Text strong>Data Correction:</Text> If Q5 = B (Predicted), subtract <Text code>-0.05</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      (Typical examples: alkanes, esters, nitriles, acetonitrile, n-hexane)
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

        {/* Persistency 计算结果显示 */}
        {persQ1 && persCalculatedValue >= 0 && (
          <Alert
            message="Persistency Calculation Result"
            description={
              <div>
                <Text>
                  【Final Result】Persistency = <Text strong style={{ 
                    color: persCalculatedValue >= 0.6 ? '#ff4d4f' : persCalculatedValue >= 0.3 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{persCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {persQ1 === 'A' && '(Reason: Strong inorganic acid, fixed value = 0.485)'}
                    {persQ1 === 'B' && '(Reason: General inorganic substance, fixed value = 0.000)'}
                    {persQ2 === 'A' && '(Reason: Extremely low bioaccumulation (BCF < 1.6), fixed value = 0.000)'}
                    {persQ2 === 'B' && '(Reason: Readily biodegradable organic (t1/2 < 4.5 days), fixed value = 0.026)'}
                    {persQ2 === 'C' && '(Reason: High volatility low accumulation (RB=0, kOH>1.3e-13), fixed value = 0.023)'}
                    {persQ2 === 'D' && '(Reason: Fast metabolism ketone (fish biotrans. < 0.17 days), fixed value = 0.126)'}
                    {persQ3 === 'A' && '(Reason: Alcohol with low molecular weight, fixed value = 0.282)'}
                    {persQ3 === 'B' && '(Reason: Halogenated hydrocarbon calculated formula)'}
                    {persQ3 === 'C' && '(Reason: Ether calculated formula)'}
                    {persQ3 === 'D' && '(Reason: General organic calculated formula)'}
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
          <Col span={24}>
            <Alert
              message={
                <span>
                  Air Hazard 
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    (Air Hazard score equals Chronic Toxicity)
                  </Text>
                </span>
              }
              description={
                <div>
                  <Text strong style={{ fontSize: 16, color: ctCalculatedValue >= 0.8 ? '#ff4d4f' : ctCalculatedValue >= 0.5 ? '#fa8c16' : '#52c41a' }}>
                    {ctCalculatedValue >= 0 ? ctCalculatedValue.toFixed(3) : 'To be calculated'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    (Automatically synced from Chronic Toxicity)
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
            💧 Water Hazard Evaluation
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Logic Core: Base Score + Penalty + Trace Residuals
          </Text>
        </div>

        {/* 第一步：物质类别初筛 */}
        <Form.Item
          label={<Text strong>Step 1: Initial Substance Category Screening (Baseline Qualitative, denoted as S1)</Text>}
          name="whQ1"
          rules={[{ required: true, message: 'Please select substance category' }]}
          tooltip="Which of the following categories does this substance belong to?"
        >
          <Select 
            placeholder="Please determine which category your substance belongs to? (Single choice)"
            onChange={(value) => setWhQ1(value)}
          >
            {WH_Q1_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value} title={opt.description + (opt.note ? ` 💡 ${opt.note}` : '')}>
                {opt.label} {opt.result !== undefined && `(Result: S1 = ${opt.result.toFixed(3)})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 第二步：急性毒性评分（仅当Q1选C时显示） */}
        {whQ1 === 'C' && (
          <>
            <Form.Item
              label={
                <div>
                  <Text strong>Q2. LC50 Range Determination</Text>
                  <div style={{ marginTop: 4 }}>
                    <Link 
                      href="https://comptox.epa.gov/dashboard/" 
                      target="_blank" 
                      style={{ fontSize: 12, marginRight: 12 }}
                    >
                      <LinkOutlined /> CompTox Database
                    </Link>
                    <Text type="secondary" style={{ fontSize: 11 }}>(If no data available, search through literature)</Text>
                  </div>
                </div>
              }
              name="whQ2"
              rules={[{ required: true, message: 'Please select LC50 range' }]}
              tooltip="Stage 2: Acute Toxicity Score - Find the substance's 96-hour fish LC50 (mg/L). Reference: CompTox Dashboard, if no data available, search through literature. Select the corresponding range based on 96h fish LC50 value"
            >
              <Select 
                placeholder="Please select the corresponding range based on LC50 value (Single choice)"
                onChange={(value) => setWhQ2(value)}
              >
                {WH_Q2_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value} title={`Stage 2 Score S2 = ${opt.result.toFixed(3)}`}>
                    {opt.label} (Score: {opt.result.toFixed(3)})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 第三步：环境归趋"罚分" */}
            <div style={{ background: '#fffbe6', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>Step 3: Environmental Fate Penalty</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                This step includes two penalty items. Please evaluate and accumulate separately.
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>3.1 Persistency Penalty (Single choice)</Text>}
                  name="whQ3_1"
                  rules={[{ required: true, message: 'Please select' }]}
                  tooltip="Does the substance persist in water for a long time?"
                >
                  <Select 
                    placeholder="Will this substance persist in water for a long time?"
                    onChange={(value) => setWhQ3_1(value)}
                  >
                    {WH_Q3_1_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value} title={opt.description}>
                        {opt.label} (Penalty: {opt.penalty.toFixed(3)})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<Text strong>3.2 Bioaccumulation Penalty (Single choice)</Text>}
                  name="whQ3_2"
                  rules={[{ required: true, message: 'Please select' }]}
                  tooltip="Does the substance bioaccumulate in organisms? (Query BCF or Log Kow)"
                >
                  <Select 
                    placeholder="Will it bioaccumulate in organisms?"
                    onChange={(value) => setWhQ3_2(value)}
                  >
                    {WH_Q3_2_OPTIONS.map(opt => (
                      <Option key={opt.value} value={opt.value} title={`Penalty: ${opt.penalty.toFixed(3)}`}>
                        {opt.label} (Penalty: {opt.penalty.toFixed(3)})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 第四步：微量残差计算 */}
            <div style={{ background: '#f6ffed', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>Step 4: Trace Residuals Calculation</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Calculate current total Sum = S1 + S2 + S3<br />
                &bull; Case A: If Sum &gt; 0 -&gt; S4 = 0 (No correction needed, proceed to final calculation)<br />
                &bull; Case B: If Sum = 0 -&gt; Input LC50 and K value to calculate trace residuals: S4 = K / LC₅₀
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label={<Text>LC50 Value (for trace residuals)</Text>}
                  name="whLc50"
                  tooltip="Enter the complete LC50 value (mg/L) for Scenario B trace residual calculation"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter LC50 value"
                    addonAfter="mg/L"
                    min={0}
                    step={1}
                    precision={2}
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  label={<Text>K Value Selection (for trace residuals)</Text>}
                  name="whKValue"
                  tooltip="Only select K value when Sum=0"
                >
                  <Select placeholder="Select K value type">
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
              message="💡 K Value Selection Tips"
              description={
                <div style={{ fontSize: 12 }}>
                  <Text>1. Halogenated/Persistent Organics (e.g., dichloromethane, chloroform): <Text strong>K = 6.0</Text></Text><br />
                  <Text>2. Common Biodegradable Organics (e.g., methanol, ethyl acetate, triethylamine): <Text strong>K = 0.7</Text></Text><br />
                  <Text>3. Very Low Toxicity Solvents (LC50 &gt; 1000, e.g., methanol, acetonitrile, acetone): <Text strong>K = 0</Text> (Negligible)</Text>
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
            message="Water Hazard Calculation Result"
            description={
              <div>
                <Text>
                  【Final Result】Water Hazard = <Text strong style={{ 
                    color: whCalculatedValue >= 0.6 ? '#ff4d4f' : whCalculatedValue >= 0.3 ? '#fa8c16' : '#52c41a', 
                    fontSize: 16 
                  }}>{whCalculatedValue.toFixed(3)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {whQ1 === 'A' && '(Reason: Highly corrosive inorganic acid/base, fixed value S1 = 0.500)'}
                    {whQ1 === 'B' && '(Reason: Common inorganic salt/buffer salt, fixed value = 0.000)'}
                    {whQ1 === 'C' && '(Reason: Base score + Acute toxicity + Environmental penalty + Trace residuals)'}
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
          ♻️ Regeneration Factor (Rᵢ)
        </Divider>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            The 5-Tier Formula & Rules | Core Formula: Rᵢ = 0.25 × (L_res - 1)
          </Text>
        </div>

        <Form.Item
          label={<Text strong>Please select the source and synthesis property category of this substance (L_res = 1, 2, 3, 4, 5)</Text>}
          name="regeneration"
          rules={[{ required: true, message: 'Please select source and synthesis property' }]}
          tooltip="Based on the substance's chemical properties, source, and synthesis complexity, select the corresponding L_res level (1-5), the system will automatically calculate R value"
        >
          <Select 
            placeholder="Please select the corresponding level based on substance source and synthesis complexity"
            onChange={(value) => setRegenerationValue(value)}
          >
            {REGENERATION_OPTIONS.map(opt => (
              <Option 
                key={opt.value} 
                value={opt.value}
                title={`${opt.description} | Applicable: ${opt.differentiation}`}
              >
                {opt.label} (R = {opt.value.toFixed(2)})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Regeneration Factor 结果显示 */}
        {regenerationValue !== undefined && (
          <Alert
            message="Regeneration Factor Result"
            description={
              <div>
                <Text>
                  【Final Score】Rᵢ = <Text strong style={{ 
                    color: regenerationValue === 0 ? '#52c41a' : 
                           regenerationValue <= 0.5 ? '#52c41a' : 
                           regenerationValue <= 0.75 ? '#fa8c16' : '#ff4d4f', 
                    fontSize: 16 
                  }}>{regenerationValue.toFixed(2)}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {regenerationValue === 0 && '(Level 1: Natural Background - No chemical synthesis needed)'}
                    {regenerationValue === 0.25 && '(Level 2: Green Recycling - Bio-based or industrial waste recovery)'}
                    {regenerationValue === 0.5 && '(Level 3: Simple Synthesis - C-H-O simple organics)'}
                    {regenerationValue === 0.75 && '(Level 4: Complex/Energy Intensive - Halogenated/heterocyclic compounds)'}
                    {regenerationValue === 1.0 && '(Level 5: Depletion/Scarcity - Scarce minerals or fine chemicals)'}
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
          🗑️ Disposal Considerations Factor (Dᵢ)
        </Divider>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            The Advanced Formula with Disposal Percentage | Core Formula: Dᵢ = D_int × [1 - (P_disp/100% × ξ_eff)]
          </Text>
        </div>

        {/* 题目一：物质废弃属性 (D_int) */}
        <Form.Item
          label={<Text strong>Question 1: Substance Disposal Property (D_int, Intrinsic Disposal Resistance)</Text>}
          name="disposalDint"
          rules={[{ required: true, message: 'Please select substance disposal property' }]}
          tooltip="Based on the substance's inherent difficulty of disposal, using 5-level high resistance values (0.00 - 1.00)"
        >
          <Select 
            placeholder="Please select the physicochemical properties and disposal difficulty of this reagent after degradation"
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
          label={<Text strong>Question 2: Disposal Percentage (P_disp, Effective Disposal/Recovery Percentage)</Text>}
          name="disposalPercentage"
          rules={[{ required: true, message: 'Please select disposal percentage' }]}
          tooltip="Percentage of this waste liquid that undergoes 'resource recovery' or 'neutralization/reduction' in the laboratory (0% ~ 100%)"
        >
          <Select 
            placeholder="What percentage of this type of waste liquid has undergone compliant recovery/resource recycling in the lab? (Note: Simple outsourced incineration should be filled as 0%)"
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
            message="Disposal Considerations Factor Result"
            description={
              <div>
                <Text>
                  【Final Score】Dᵢ = <Text strong style={{ 
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
                    {disposalDint === 0 && 'Substance: Natural Return | '}
                    {disposalDint === 0.25 && 'Substance: Low-Entropy Recovery | '}
                    {disposalDint === 0.5 && 'Substance: Standard Industrial | '}
                    {disposalDint === 0.75 && 'Substance: High Barrier | '}
                    {disposalDint === 1.0 && 'Substance: Irreversible Destruction | '}
                    {disposalPercentage === 0 && 'Complete Disposal/Incineration'}
                    {disposalPercentage === 25 && 'Minor Recovery for Cleaning'}
                    {disposalPercentage === 50 && 'Half Recovery'}
                    {disposalPercentage === 75 && 'Majority Recovery'}
                    {disposalPercentage === 100 && 'Complete Closed Loop'}
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

          </>
        )}
        {/* 智能引导模式条件渲染结束 */}

        {/* 显示小因子计算结果 - 仅在智能引导模式下显示 */}
        {inputMode === 'select' && (
        <>
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 24, marginBottom: 16, borderTopColor: '#1890ff', borderTopWidth: 2 }}>📋 Subfactor Calculation Results</Divider>
        
        <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
            <FireOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
            Safety Factor Subfactor Scores
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
            Health Factor Subfactor Scores
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
            Environment Factor Subfactor Scores
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
        </>
        )}
        {/* 小因子计算结果显示结束 */}

        {/* 计算结果显示 - 两种模式都显示 */}
        <Divider style={{ fontSize: 16, fontWeight: 'bold', color: '#262626', marginTop: 20, marginBottom: 16, borderTopColor: '#52c41a', borderTopWidth: 2 }}>🎯 Accumulated Factor Results</Divider>
        <div style={{ 
          background: '#f6f8fa', 
          padding: '12px 16px', 
          borderRadius: '8px',
          border: '1px solid #e8e8e8',
          marginBottom: 16
        }}>
          <Row gutter={12} justify="space-between">
            <Col span={4}>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px 8px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #ffa39e',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Text strong style={{ fontSize: 13 }}>Safety Score (S)</Text>
                <div style={{ fontSize: 24, color: '#ff4d4f', fontWeight: 'bold', margin: '8px 0' }}>
                  {calculatedScores.safetyScore.toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Sum of 4 subfactors
                </Text>
              </div>
            </Col>
            <Col span={4}>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px 8px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #ffbb96',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Text strong style={{ fontSize: 13 }}>Health Score (H)</Text>
                <div style={{ fontSize: 24, color: '#ff7a45', fontWeight: 'bold', margin: '8px 0' }}>
                  {calculatedScores.healthScore.toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Sum of 2 subfactors
                </Text>
              </div>
            </Col>
            <Col span={4}>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px 8px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #95de64',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Text strong style={{ fontSize: 13 }}>Environmental Score (E)</Text>
                <div style={{ fontSize: 24, color: '#52c41a', fontWeight: 'bold', margin: '8px 0' }}>
                  {calculatedScores.envScore.toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Sum of 3 subfactors
                </Text>
              </div>
            </Col>
            <Col span={5}>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px 8px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #b37feb',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Text strong style={{ fontSize: 13 }}>Regeneration Factor (R)</Text>
                <div style={{ fontSize: 24, color: '#722ed1', fontWeight: 'bold', margin: '8px 0' }}>
                  {(form.getFieldValue('regeneration') || 0).toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Source Property
                </Text>
              </div>
            </Col>
            <Col span={5}>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px 8px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #ff9c6e',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Text strong style={{ fontSize: 13 }}>Disposal Factor (D)</Text>
                <div style={{ fontSize: 24, color: '#fa541c', fontWeight: 'bold', margin: '8px 0' }}>
                  {(form.getFieldValue('disposal') || 0).toFixed(3)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Disposal Property
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </Form>
      )}
    </Modal>
  )
}

export default AddReagentModal
