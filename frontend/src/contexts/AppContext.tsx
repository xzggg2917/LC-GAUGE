import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { StorageHelper, STORAGE_KEYS, storage } from '../utils/storage'

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
  // Original data for custom reagents (for reset functionality)
  originalData?: Omit<ReagentFactor, 'originalData'>
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
    // Power Factor (P) calculation parameters (新能耗输入方式)
    instrumentEnergy?: number  // 仪器分析能耗 (kWh)
    pretreatmentEnergy?: number  // 前处理能耗 (kWh)
    // 权重方案
    weightSchemes?: {
      safetyScheme?: string
      healthScheme?: string
      environmentScheme?: string
      instrumentStageScheme?: string
      prepStageScheme?: string
      finalScheme?: string
    }
  }
  factors: ReagentFactor[]
  gradient: GradientStep[]
}

interface AppContextType {
  // 数据状态
  data: AppData
  isLoading: boolean  // 是否正在加载初始数据
  updateMethodsData: (methodsData: AppData['methods']) => void
  updateFactorsData: (factorsData: ReagentFactor[]) => void
  updateGradientData: (gradientData: GradientStep[]) => void
  setAllData: (newData: AppData) => Promise<void>  // 异步
  
  // 文件状态
  fileHandle: any | null
  setFileHandle: (handle: any | null) => void
  currentFilePath: string | null
  setCurrentFilePath: (path: string | null) => Promise<void>  // 改为异步
  
  // 保存状态
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void
  
  // 导出当前完整数据
  exportData: () => Promise<AppData>  // 异步
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
    instrumentEnergy: 0,
    pretreatmentEnergy: 0,
    weightSchemes: {
      safetyScheme: 'PBT_Balanced',
      healthScheme: 'Absolute_Balance',
      environmentScheme: 'PBT_Balanced',
      instrumentStageScheme: 'Balanced',
      prepStageScheme: 'Balanced',
      finalScheme: 'Direct_Online'
    }
  },
  factors: [],
  gradient: []
})

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 初始化为默认数据，稍后异步加载
  const [data, setData] = useState<AppData>(getDefaultData())
  const [isLoading, setIsLoading] = useState(true)
  
  const [fileHandle, setFileHandle] = useState<any | null>(null)
  const [currentFilePath, setCurrentFilePathState] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // 异步加载初始数据
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🔄 AppContext: 异步加载初始数据')
      try {
        const savedMethods = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)
        const savedFactors = await StorageHelper.getJSON<ReagentFactor[]>(STORAGE_KEYS.FACTORS)
        const savedGradient = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
        const savedFilePath = await storage.getItem('currentFilePath')
        
        console.log('  - methods:', savedMethods ? '存在' : '不存在')
        console.log('  - savedMethods详情:', savedMethods)
        console.log('  - savedMethods.preTreatmentReagents:', savedMethods?.preTreatmentReagents)
        console.log('  - factors:', savedFactors ? '存在' : '不存在')
        console.log('  - gradient:', savedGradient ? '存在' : '不存在')
        console.log('  - currentFilePath:', savedFilePath)
        
        // 解析 gradient 数据
        let gradientSteps: GradientStep[] = []
        if (savedGradient) {
          if (Array.isArray(savedGradient)) {
            gradientSteps = savedGradient
            console.log('  ℹ️ gradient 是数组格式')
          } else if (savedGradient.steps && Array.isArray(savedGradient.steps)) {
            gradientSteps = savedGradient.steps
            console.log('  ℹ️ gradient 是对象格式（包含 calculations）')
          }
        }
        
        setData({
          version: '1.0.0',
          lastModified: new Date().toISOString(),
          methods: {
            ...getDefaultData().methods,
            ...(savedMethods || {}),
            // 确保新字段有默认值
            instrumentEnergy: savedMethods?.instrumentEnergy ?? 0,
            pretreatmentEnergy: savedMethods?.pretreatmentEnergy ?? 0
          },
          factors: savedFactors || [],
          gradient: gradientSteps
        })
        
        console.log('✅ AppContext初始化完成，加载的数据:')
        console.log('  - preTreatmentReagents:', savedMethods?.preTreatmentReagents?.length, '个')
        console.log('  - preTreatmentReagents详情:', savedMethods?.preTreatmentReagents)
        console.log('  - mobilePhaseA:', savedMethods?.mobilePhaseA?.length, '个')
        console.log('  - mobilePhaseA详情:', savedMethods?.mobilePhaseA)
        console.log('  - mobilePhaseB:', savedMethods?.mobilePhaseB?.length, '个')
        console.log('  - mobilePhaseB详情:', savedMethods?.mobilePhaseB)
        console.log('  - factors:', savedFactors?.length, '个')
        console.log('  - gradient steps:', gradientSteps.length, '个')
        console.log('  - savedFilePath原始值:', savedFilePath)
        
        if (savedFilePath) {
          // savedFilePath 是 JSON 字符串，需要解析
          try {
            const parsedPath = JSON.parse(savedFilePath)
            console.log('  - parsedPath:', parsedPath)
            setCurrentFilePathState(parsedPath)
          } catch {
            // 兼容旧格式（直接是字符串）
            console.log('  - 使用原始字符串格式')
            setCurrentFilePathState(savedFilePath)
          }
        } else {
          console.log('  ⚠️ savedFilePath为null，不设置currentFilePath')
        }
        
        console.log('✅ AppContext: 初始数据加载完成')
      } catch (error) {
        console.error('❌ AppContext: 加载初始数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadInitialData()
  }, [])

  // 包装setCurrentFilePath,同时保存到存储
  const setCurrentFilePath = async (path: string | null) => {
    console.log('💾 AppContext: 设置currentFilePath:', path)
    setCurrentFilePathState(path)
    if (path) {
      // 将字符串转为 JSON 格式再存储（ElectronStorage.setItem 会执行 JSON.parse）
      await storage.setItem('currentFilePath', JSON.stringify(path))
    } else {
      await storage.removeItem('currentFilePath')
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
    
    // 同步到存储
    StorageHelper.setJSON(STORAGE_KEYS.METHODS, methodsData)
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
    
    // 同步到存储
    StorageHelper.setJSON(STORAGE_KEYS.FACTORS, factorsData)
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
        gradient: JSON.parse(JSON.stringify(gradientData)), // ✅ 深拷贝避免引用共享
        lastModified: new Date().toISOString()
      }
    })
    
    // ❌ 不在这里同步到 localStorage！
    // 原因：这里只有 steps 数组，会覆盖包含 calculations 的完整 gradientData
    // 只有在 HPLCGradientPage 点击 Confirm 时才应该保存完整的 gradientData
    // localStorage.setItem('hplc_gradient_data', JSON.stringify(gradientData))
    console.log('ℹ️ AppContext: gradient Context已更新，但不自动保存到localStorage（避免覆盖calculations）')
  }

  const setAllData = async (newData: AppData) => {
    console.log('📂 setAllData 被调用')
    console.log('  - methods.preTreatmentReagents:', newData.methods.preTreatmentReagents)
    console.log('  - methods.mobilePhaseA:', newData.methods.mobilePhaseA)
    console.log('  - methods.mobilePhaseB:', newData.methods.mobilePhaseB)
    console.log('  - gradient类型:', Array.isArray(newData.gradient) ? '数组' : '对象')
    
    // 🔥 Factors是全局配置，从存储读取，不从文件加载
    const savedFactors = await StorageHelper.getJSON<ReagentFactor[]>(STORAGE_KEYS.FACTORS)
    let factorsToUse: ReagentFactor[]
    if (savedFactors && savedFactors.length > 0) {
      factorsToUse = savedFactors
      console.log('  📝 使用全局factors配置（', factorsToUse.length, '个试剂）')
    } else {
      // 首次使用时，factors为空，需要用户在Factors页面手动添加
      factorsToUse = []
      console.log('  ⚠️ Factors配置为空，请在Factors页面添加试剂')
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
    
    // 同步到存储（⚠️ 注意：factors不保存，保持全局独立）
    console.log('  💾 准备保存methods到存储:')
    console.log('    - preTreatmentReagents:', newData.methods.preTreatmentReagents?.length, '个')
    console.log('    - preTreatmentReagents详情:', newData.methods.preTreatmentReagents)
    console.log('    - mobilePhaseA:', newData.methods.mobilePhaseA?.length, '个')
    console.log('    - mobilePhaseB:', newData.methods.mobilePhaseB?.length, '个')
    await StorageHelper.setJSON(STORAGE_KEYS.METHODS, newData.methods)
    console.log('  ✅ 已更新methods到存储')
    console.log('  ℹ️ Factors保持全局配置不变（', factorsToUse.length, '个试剂）')
    
    // gradient数据需要特殊处理
    if (Array.isArray(newData.gradient)) {
      if (newData.gradient.length === 0) {
        // 如果是空数组（新建文件），清除存储中的gradient数据
        console.log('  🗑️ 清除存储中的gradient数据（新建文件）')
        await storage.removeItem(STORAGE_KEYS.GRADIENT)
      } else {
        // 如果是非空数组，直接存储（但这不包含calculations，柱状图会是空的）
        console.log('  ⚠️ 警告：存储的是gradient数组，不包含calculations数据')
        await StorageHelper.setJSON(STORAGE_KEYS.GRADIENT, newData.gradient)
      }
    } else {
      // 如果是完整对象（包含计算结果），存储完整对象供Methods页面使用
      console.log('  ✅ 存储完整gradient对象，包含calculations数据')
      await StorageHelper.setJSON(STORAGE_KEYS.GRADIENT, newData.gradient)
    }
    
    console.log('✅ setAllData 完成，已更新 Context 和 Electron storage')
    
    // 恢复评分结果（如果文件中包含）
    if ((newData as any).scoreResults) {
      console.log('  📊 恢复评分结果数据')
      await StorageHelper.setJSON(STORAGE_KEYS.SCORE_RESULTS, (newData as any).scoreResults)
    } else {
      console.log('  ℹ️ 文件中不包含评分结果，清除旧的评分结果')
      await storage.removeItem(STORAGE_KEYS.SCORE_RESULTS)
    }
    
    // 触发全局事件，通知所有页面数据已更新（用于强制刷新）
    window.dispatchEvent(new CustomEvent('fileDataChanged', { 
      detail: { 
        timestamp: Date.now(),
        hasGradientData: !Array.isArray(newData.gradient) || newData.gradient.length > 0
      } 
    }))
    console.log('📢 触发 fileDataChanged 事件')
  }

  const exportData = async (): Promise<AppData> => {
    // 尝试从存储获取完整的gradient数据（包含calculations）
    let gradientDataToSave: any = data.gradient
    try {
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      if (gradientData) {
        // 如果存储中有完整的计算结果对象，使用它
        if (gradientData && typeof gradientData === 'object' && 'calculations' in gradientData) {
          console.log('📦 exportData: 使用存储中的完整gradient数据（包含calculations）')
          gradientDataToSave = gradientData
        } else if (Array.isArray(gradientData) && gradientData.length > 0) {
          console.log('📦 exportData: 存储中只有gradient数组')
          gradientDataToSave = gradientData
        }
      }
    } catch (error) {
      console.error('读取存储gradient数据失败:', error)
    }
    
    // 获取评分结果（如果存在）
    let scoreResultsToSave: any = null
    try {
      scoreResultsToSave = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)
      if (scoreResultsToSave) {
        console.log('📦 exportData: 包含评分结果数据')
      }
    } catch (error) {
      console.error('读取存储评分结果失败:', error)
    }
    
    // ⚠️ 注意：不导出factors，因为factors是全局通用配置
    // 每个方法文件只保存methods和gradient数据
    return {
      ...data,
      factors: [], // 不保存factors到文件
      gradient: gradientDataToSave as any,
      scoreResults: scoreResultsToSave, // 添加评分结果
      lastModified: new Date().toISOString()
    }
  }

  return (
    <AppContext.Provider
      value={{
        data,
        isLoading,
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
