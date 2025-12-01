import React, { createContext, useContext, useState, ReactNode } from 'react'

// 预定义的试剂数据(用于新建文件时初始化)
export const PREDEFINED_REAGENTS: ReagentFactor[] = [
  { id: '1', name: 'Acetone', density: 0.791, releasePotential: 0.698, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.297, irritation: 0.625, chronicToxicity: 0.184, persistency: 0.126, airHazard: 0.184, waterHazard: 0.000, safetyScore: 1.995, healthScore: 0.809, envScore: 0.310, disposal: 2 },
  { id: '2', name: 'Acetonitrile', density: 0.786, releasePotential: 0.615, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.510, irritation: 0.625, chronicToxicity: 0.431, persistency: 0.341, airHazard: 0.431, waterHazard: 0.000, safetyScore: 2.724, healthScore: 1.056, envScore: 0.772, disposal: 2 },
  { id: '3', name: 'Chloroform', density: 1.483, releasePotential: 0.684, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.394, irritation: 0.625, chronicToxicity: 0.800, persistency: 0.457, airHazard: 0.800, waterHazard: 0.178, safetyScore: 1.077, healthScore: 1.425, envScore: 1.435, disposal: 2 },
  { id: '4', name: 'CO2', density: 0, releasePotential: 0, fireExplos: 0, reactDecom: 0, acuteToxicity: 0, irritation: 0, chronicToxicity: 0, persistency: 0, airHazard: 0, waterHazard: 0, safetyScore: 0, healthScore: 0, envScore: 0, disposal: 0 },
  { id: '5', name: 'Dichloromethane', density: 1.327, releasePotential: 0.753, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.265, irritation: 0.349, chronicToxicity: 0.289, persistency: 0.023, airHazard: 0.289, waterHazard: 0.031, safetyScore: 2.618, healthScore: 0.638, envScore: 0.343, disposal: 2 },
  { id: '6', name: 'Ethanol', density: 0.789, releasePotential: 0.580, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.292, irritation: 0.000, chronicToxicity: 0.204, persistency: 0.282, airHazard: 0.204, waterHazard: 0.000, safetyScore: 1.872, healthScore: 0.204, envScore: 0.485, disposal: 2 },
  { id: '7', name: 'Ethyl acetate', density: 0.902, releasePotential: 0.619, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.276, irritation: 0.625, chronicToxicity: 0.171, persistency: 0.026, airHazard: 0.171, waterHazard: 0.003, safetyScore: 1.895, healthScore: 0.796, envScore: 0.199, disposal: 2 },
  { id: '8', name: 'Heptane', density: 0.684, releasePotential: 0.557, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.368, irritation: 0.625, chronicToxicity: 0.159, persistency: 0.430, airHazard: 0.159, waterHazard: 0.500, safetyScore: 1.925, healthScore: 0.784, envScore: 1.089, disposal: 2 },
  { id: '9', name: 'Hexane (n)', density: 0.659, releasePotential: 0.661, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.343, irritation: 0.625, chronicToxicity: 0.349, persistency: 0.426, airHazard: 0.349, waterHazard: 0.325, safetyScore: 2.004, healthScore: 0.974, envScore: 1.100, disposal: 2 },
  { id: '10', name: 'Isooctane', density: 0.692, releasePotential: 0.630, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.330, chronicToxicity: 0.000, persistency: 0.680, airHazard: 0.000, waterHazard: 0.875, safetyScore: 1.630, healthScore: 0.330, envScore: 1.555, disposal: 2 },
  { id: '11', name: 'Isopropanol', density: 0.785, releasePotential: 0.556, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.318, irritation: 0.625, chronicToxicity: 0.260, persistency: 0.280, airHazard: 0.260, waterHazard: 0.000, safetyScore: 1.874, healthScore: 0.885, envScore: 0.540, disposal: 2 },
  { id: '12', name: 'Methanol', density: 0.791, releasePotential: 0.646, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.267, irritation: 0.113, chronicToxicity: 0.317, persistency: 0.000, airHazard: 0.317, waterHazard: 0.000, safetyScore: 1.912, healthScore: 0.430, envScore: 0.317, disposal: 2 },
  { id: '13', name: 'Sulfuric acid 96%', density: 1.84, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.956, irritation: 1.000, chronicToxicity: 1.000, persistency: 0.485, airHazard: 1.000, waterHazard: 0.500, safetyScore: 1.756, healthScore: 2.000, envScore: 1.985, disposal: 2 },
  { id: '14', name: 't-butyl methyl ether', density: 0.74, releasePotential: 0.720, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.220, chronicToxicity: 0.350, persistency: 0.710, airHazard: 0.350, waterHazard: 0.090, safetyScore: 1.720, healthScore: 0.570, envScore: 1.150, disposal: 2 },
  { id: '15', name: 'Tetrahydrofuran', density: 0.889, releasePotential: 0.667, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.298, irritation: 0.625, chronicToxicity: 0.365, persistency: 0.535, airHazard: 0.365, waterHazard: 0.000, safetyScore: 1.965, healthScore: 0.990, envScore: 0.900, disposal: 2 },
  { id: '16', name: 'Water', density: 0, releasePotential: 0, fireExplos: 0, reactDecom: 0, acuteToxicity: 0, irritation: 0, chronicToxicity: 0, persistency: 0, airHazard: 0, waterHazard: 0, safetyScore: 0, healthScore: 0, envScore: 0, disposal: 0 },
]

// 定义数据类型
export interface Reagent {
  id: string
  name: string
  percentage: number
}

export interface PreTreatmentReagent {
  id: string
  name: string
  volume: number
}

export interface ReagentFactor {
  id: string
  name: string
  density: number
  // Safety sub-factors
  releasePotential: number
  fireExplos: number
  reactDecom: number
  // Health sub-factors
  acuteToxicity: number
  irritation: number
  chronicToxicity: number
  // Environment sub-factors
  persistency: number
  airHazard: number
  waterHazard: number
  // Other factors
  regeneration?: number
  disposal: number
  // Custom reagent flag
  isCustom?: boolean
  // Main factors (aggregated scores)
  safetyScore: number
  healthScore: number
  envScore: number
}

export interface GradientStep {
  id: string
  stepNo: number
  time: number
  phaseA: number
  phaseB: number
  flowRate: number
  curve: string
}

export interface AppData {
  version: string
  lastModified: string
  owner?: string  // 文件所有者用户名
  createdAt?: string  // 创建时间
  methods: {
    sampleCount: number | null
    preTreatmentReagents: PreTreatmentReagent[]
    mobilePhaseA: Reagent[]
    mobilePhaseB: Reagent[]
    // Power Factor (P) calculation parameters
    instrumentType?: 'low' | 'standard' | 'high'  // 仪器平台类型
  }
  factors: ReagentFactor[]
  gradient: GradientStep[]
}

interface AppContextType {
  // 数据状态
  data: AppData
  updateMethodsData: (methodsData: AppData['methods']) => void
  updateFactorsData: (factorsData: ReagentFactor[]) => void
  updateGradientData: (gradientData: GradientStep[]) => void
  setAllData: (newData: AppData) => void
  
  // 文件状态
  fileHandle: any | null
  setFileHandle: (handle: any | null) => void
  currentFilePath: string | null
  setCurrentFilePath: (path: string | null) => void
  
  // 保存状态
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void
  
  // 导出当前完整数据
  exportData: () => AppData
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const getDefaultData = (): AppData => ({
  version: '1.0.0',
  lastModified: new Date().toISOString(),
  methods: {
    sampleCount: null,
    preTreatmentReagents: [{ id: Date.now().toString(), name: '', volume: 0 }],
    mobilePhaseA: [{ id: Date.now().toString() + '1', name: '', percentage: 0 }],
    mobilePhaseB: [{ id: Date.now().toString() + '2', name: '', percentage: 0 }],
    instrumentType: 'standard'
  },
  factors: [],
  gradient: []
})

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 初始化时直接从localStorage加载数据,避免数据丢失
  const [data, setData] = useState<AppData>(() => {
    console.log('🔄 AppContext初始化: 开始加载localStorage数据')
    try {
      const savedMethodsRaw = localStorage.getItem('hplc_methods_raw')
      const savedFactors = localStorage.getItem('hplc_factors_data')
      const savedGradient = localStorage.getItem('hplc_gradient_data')
      
      console.log('  - methods:', savedMethodsRaw ? '存在' : '不存在')
      console.log('  - factors:', savedFactors ? '存在' : '不存在')
      console.log('  - gradient:', savedGradient ? '存在' : '不存在')
      
      // 解析 gradient 数据，兼容两种格式：
      // 1. 数组格式（旧格式，只有 steps）
      // 2. 对象格式（新格式，包含 steps, chartData, calculations 等）
      let gradientSteps: GradientStep[] = []
      if (savedGradient) {
        const parsedGradient = JSON.parse(savedGradient)
        if (Array.isArray(parsedGradient)) {
          // 旧格式：直接是数组
          gradientSteps = parsedGradient
          console.log('  ℹ️ gradient 是数组格式（旧格式）')
        } else if (parsedGradient.steps && Array.isArray(parsedGradient.steps)) {
          // 新格式：包含 steps 字段的对象
          gradientSteps = parsedGradient.steps
          console.log('  ℹ️ gradient 是对象格式（新格式，包含 calculations）')
        }
      }
      
      const loadedData: AppData = {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        methods: savedMethodsRaw ? JSON.parse(savedMethodsRaw) : getDefaultData().methods,
        factors: savedFactors ? JSON.parse(savedFactors) : [],
        gradient: gradientSteps
      }
      
      console.log('✅ AppContext初始化: 数据加载完成，gradient steps 数量:', gradientSteps.length)
      return loadedData
    } catch (error) {
      console.error('❌ AppContext初始化: 加载数据失败:', error)
      return getDefaultData()
    }
  })
  
  const [fileHandle, setFileHandle] = useState<any | null>(null)
  const [currentFilePath, setCurrentFilePathState] = useState<string | null>(() => {
    // 从localStorage恢复currentFilePath
    const saved = localStorage.getItem('currentFilePath')
    console.log('🔄 AppContext初始化: 恢复currentFilePath:', saved)
    return saved
  })
  const [isDirty, setIsDirty] = useState(false)

  // 包装setCurrentFilePath,同时保存到localStorage
  const setCurrentFilePath = (path: string | null) => {
    console.log('💾 AppContext: 设置currentFilePath:', path)
    setCurrentFilePathState(path)
    if (path) {
      localStorage.setItem('currentFilePath', path)
    } else {
      localStorage.removeItem('currentFilePath')
    }
  }

  const updateMethodsData = (methodsData: AppData['methods']) => {
    setData(prev => {
      // 比较数据是否真的变化了（不包括lastModified）
      const dataChanged = JSON.stringify(prev.methods) !== JSON.stringify(methodsData)
      
      if (!dataChanged) {
        console.log('⏭️ AppContext: methods数据未变化，跳过更新')
        return prev // 返回旧状态，不触发更新
      }
      
      console.log('🔄 AppContext: methods数据变化，更新Context')
      return {
        ...prev,
        methods: methodsData,
        lastModified: new Date().toISOString()
      }
    })
    
    // 同步到localStorage
    localStorage.setItem('hplc_methods_raw', JSON.stringify(methodsData))
  }

  const updateFactorsData = (factorsData: ReagentFactor[]) => {
    setData(prev => {
      // 比较数据是否真的变化了
      const dataChanged = JSON.stringify(prev.factors) !== JSON.stringify(factorsData)
      
      if (!dataChanged) {
        console.log('⏭️ AppContext: factors数据未变化，跳过更新')
        return prev
      }
      
      console.log('🔄 AppContext: factors数据变化，更新Context')
      return {
        ...prev,
        factors: factorsData,
        lastModified: new Date().toISOString()
      }
    })
    
    // 同步到localStorage
    localStorage.setItem('hplc_factors_data', JSON.stringify(factorsData))
  }

  const updateGradientData = (gradientData: GradientStep[]) => {
    setData(prev => {
      // 比较数据是否真的变化了
      const dataChanged = JSON.stringify(prev.gradient) !== JSON.stringify(gradientData)
      
      if (!dataChanged) {
        console.log('⏭️ AppContext: gradient数据未变化，跳过更新')
        return prev
      }
      
      console.log('🔄 AppContext: gradient数据变化，更新Context')
      return {
        ...prev,
        gradient: gradientData,
        lastModified: new Date().toISOString()
      }
    })
    
    // ❌ 不在这里同步到 localStorage！
    // 原因：这里只有 steps 数组，会覆盖包含 calculations 的完整 gradientData
    // 只有在 HPLCGradientPage 点击 Confirm 时才应该保存完整的 gradientData
    // localStorage.setItem('hplc_gradient_data', JSON.stringify(gradientData))
    console.log('ℹ️ AppContext: gradient Context已更新，但不自动保存到localStorage（避免覆盖calculations）')
  }

  const setAllData = (newData: AppData) => {
    console.log('📂 setAllData 被调用')
    console.log('  - methods.mobilePhaseA:', newData.methods.mobilePhaseA)
    console.log('  - methods.mobilePhaseB:', newData.methods.mobilePhaseB)
    console.log('  - gradient类型:', Array.isArray(newData.gradient) ? '数组' : '对象')
    
    // 🔥 如果factors为空数组（新建文件），使用预定义试剂列表
    let factorsToUse = newData.factors
    if (!factorsToUse || factorsToUse.length === 0) {
      console.log('  📝 检测到空factors，使用预定义试剂列表')
      factorsToUse = [...PREDEFINED_REAGENTS]
    }
    
    // 如果是对象，打印其结构
    if (newData.gradient && typeof newData.gradient === 'object' && !Array.isArray(newData.gradient)) {
      console.log('  - gradient对象键:', Object.keys(newData.gradient))
      console.log('  - 是否有calculations:', 'calculations' in newData.gradient)
      if ('calculations' in newData.gradient) {
        const calcs = (newData.gradient as any).calculations
        console.log('  - calculations.mobilePhaseA:', calcs?.mobilePhaseA?.components?.length, '个组分')
        console.log('  - calculations.mobilePhaseB:', calcs?.mobilePhaseB?.components?.length, '个组分')
      }
    }
    
    // 处理gradient数据：如果是完整计算结果对象，只提取steps数组
    let gradientSteps: GradientStep[] = []
    if (Array.isArray(newData.gradient)) {
      gradientSteps = newData.gradient
      console.log('  - gradient是数组，包含', gradientSteps.length, '个步骤')
    } else if (newData.gradient && typeof newData.gradient === 'object' && 'steps' in newData.gradient) {
      // 如果gradient是包含steps的对象（旧文件格式），提取steps数组
      gradientSteps = (newData.gradient as any).steps || []
      console.log('  - 从gradient对象中提取了', gradientSteps.length, '个steps')
    }
    
    const processedData = {
      ...newData,
      factors: factorsToUse,
      gradient: gradientSteps
    }
    
    setData(processedData)
    
    // 同步到localStorage
    localStorage.setItem('hplc_methods_raw', JSON.stringify(newData.methods))
    localStorage.setItem('hplc_factors_data', JSON.stringify(factorsToUse))
    console.log('  ✅ 已写入factors到localStorage，包含', factorsToUse.length, '个试剂')
    
    // gradient数据需要特殊处理
    if (Array.isArray(newData.gradient)) {
      if (newData.gradient.length === 0) {
        // 如果是空数组（新建文件），清除localStorage中的gradient数据
        console.log('  🗑️ 清除localStorage中的gradient数据（新建文件）')
        localStorage.removeItem('hplc_gradient_data')
      } else {
        // 如果是非空数组，直接存储（但这不包含calculations，柱状图会是空的）
        console.log('  ⚠️ 警告：存储的是gradient数组，不包含calculations数据')
        localStorage.setItem('hplc_gradient_data', JSON.stringify(newData.gradient))
      }
    } else {
      // 如果是完整对象（包含计算结果），存储完整对象供Methods页面使用
      console.log('  ✅ 存储完整gradient对象，包含calculations数据')
      localStorage.setItem('hplc_gradient_data', JSON.stringify(newData.gradient))
    }
    
    console.log('✅ setAllData 完成，已更新Context和localStorage')
    
    // 触发全局事件，通知所有页面数据已更新（用于强制刷新）
    window.dispatchEvent(new CustomEvent('fileDataChanged', { 
      detail: { 
        timestamp: Date.now(),
        hasGradientData: !Array.isArray(newData.gradient) || newData.gradient.length > 0
      } 
    }))
    console.log('📢 触发 fileDataChanged 事件')
  }

  const exportData = (): AppData => {
    // 尝试从localStorage获取完整的gradient数据（包含calculations）
    let gradientDataToSave: any = data.gradient
    try {
      const gradientDataStr = localStorage.getItem('hplc_gradient_data')
      if (gradientDataStr) {
        const gradientData = JSON.parse(gradientDataStr)
        // 如果localStorage中有完整的计算结果对象，使用它
        if (gradientData && typeof gradientData === 'object' && 'calculations' in gradientData) {
          console.log('📦 exportData: 使用localStorage中的完整gradient数据（包含calculations）')
          gradientDataToSave = gradientData
        } else if (Array.isArray(gradientData) && gradientData.length > 0) {
          console.log('📦 exportData: localStorage中只有gradient数组')
          gradientDataToSave = gradientData
        }
      }
    } catch (error) {
      console.error('读取localStorage gradient数据失败:', error)
    }
    
    return {
      ...data,
      gradient: gradientDataToSave as any,
      lastModified: new Date().toISOString()
    }
  }

  return (
    <AppContext.Provider
      value={{
        data,
        updateMethodsData,
        updateFactorsData,
        updateGradientData,
        setAllData,
        fileHandle,
        setFileHandle,
        currentFilePath,
        setCurrentFilePath,
        isDirty,
        setIsDirty,
        exportData
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
