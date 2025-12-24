import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Card, Typography, InputNumber, Select, Button, Row, Col, message, Tooltip, Divider, Spin, Statistic } from 'antd'
import { PlusOutlined, DeleteOutlined, QuestionCircleOutlined, TrophyOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { useAppContext } from '../contexts/AppContext'
import api from '../services/api'
import type { Reagent, PreTreatmentReagent, ReagentFactor } from '../contexts/AppContext'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'
import CustomWeightModal from '../components/CustomWeightModal'
import './MethodsPage.css'

const { Title } = Typography
const { Option } = Select

const MethodsPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { data, updateMethodsData, setIsDirty } = useAppContext()
  
  // 使用空数组初始化，完全从storage加载（不依赖Context，避免引用共享）
  const [sampleCount, setSampleCount] = useState<number | null>(null)
  const [sampleCountError, setSampleCountError] = useState<string>('')
  const [preTreatmentReagents, setPreTreatmentReagents] = useState<PreTreatmentReagent[]>([])
  const [mobilePhaseA, setMobilePhaseA] = useState<Reagent[]>([])
  const [mobilePhaseB, setMobilePhaseB] = useState<Reagent[]>([])
  
  // Power Factor (P) calculation states
  const [instrumentEnergy, setInstrumentEnergy] = useState<number>(data.methods.instrumentEnergy || 0)  // 仪器分析能耗 (kWh)
  const [pretreatmentEnergy, setPretreatmentEnergy] = useState<number>(data.methods.pretreatmentEnergy || 0)  // 前处理能耗 (kWh)

  // 权重方案选择状态 - 从 Context 初始化
  const [safetyScheme, setSafetyScheme] = useState<string>(data.methods.weightSchemes?.safetyScheme || 'PBT_Balanced')
  const [healthScheme, setHealthScheme] = useState<string>(data.methods.weightSchemes?.healthScheme || 'Absolute_Balance')
  const [environmentScheme, setEnvironmentScheme] = useState<string>(data.methods.weightSchemes?.environmentScheme || 'PBT_Balanced')
  const [stageScheme, setStageScheme] = useState<string>(data.methods.weightSchemes?.instrumentStageScheme || 'Balanced')
  const [finalScheme, setFinalScheme] = useState<string>(data.methods.weightSchemes?.finalScheme || 'Direct_Online')
  
  // 自定义权重状态
  const [customWeights, setCustomWeights] = useState<any>(() => {
    const initial = data.methods.weightSchemes?.customWeights || {};
    console.log('🎯 [Init] customWeights初始值:', initial);
    console.log('🎯 [Init] data.methods.weightSchemes:', data.methods.weightSchemes);
    return initial;
  })
  const [customWeightModalVisible, setCustomWeightModalVisible] = useState<boolean>(false)
  const [customWeightType, setCustomWeightType] = useState<'safety' | 'health' | 'environment' | 'stage' | 'final'>('safety')

  // 评分结果状态（新增）
  const [scoreResults, setScoreResults] = useState<any>(null)

  const [isCalculatingScore, setIsCalculatingScore] = useState<boolean>(false)
  const [availableSchemes, setAvailableSchemes] = useState<any>(null)

  // 从 Factors 页面加载试剂列表
  const [availableReagents, setAvailableReagents] = useState<string[]>([])
  const [factorsData, setFactorsData] = useState<ReagentFactor[]>([])
  const [forceRenderKey, setForceRenderKey] = useState(0)  // 强制刷新用
  
  // 梯度计算数据状态（用于UI显示）
  const [gradientCalculations, setGradientCalculations] = useState<any>(null)
  
  // 数据加载状态标记（避免加载中清空图表）
  const [isDataLoading, setIsDataLoading] = useState(true)
  
  // 图表纵坐标范围控制 (null = 自动)
  const [preTreatmentYMax, setPreTreatmentYMax] = useState<number | null>(null)
  const [phaseAYMax, setPhaseAYMax] = useState<number | null>(null)
  const [phaseBYMax, setPhaseBYMax] = useState<number | null>(null)
  
  // 图表数据缓存（使用state而非useMemo，因为计算是异步的）
  const [phaseAChartData, setPhaseAChartData] = useState<any>([])
  const [phaseBChartData, setPhaseBChartData] = useState<any>([])

  // 使用 useMemo 缓存 filterOption 函数，避免每次渲染都创建新函数
  const selectFilterOption = React.useMemo(
    () => (input: string, option: any) => {
      const children = String(option?.children || '')
      return children.toLowerCase().includes(input.toLowerCase())
    },
    []
  )

  // 页面每次显示时都重新加载数据（解决从其他页面返回时图表消失的问题）
  const pageVisibleCount = React.useRef(0)
  const hasInitialLoad = React.useRef(false)
  
  useEffect(() => {
    pageVisibleCount.current += 1
    const currentCount = pageVisibleCount.current
    console.log(`👁️ MethodsPage 第 ${currentCount} 次显示`)
    
    // 加载 Factors 数据（定义在useEffect顶层，确保所有地方都能访问）
    const loadFactorsData = async () => {
      console.log('🔄 MethodsPage: 开始加载factors数据')
      try {
        const factors = await StorageHelper.getJSON<any[]>(STORAGE_KEYS.FACTORS)
        console.log('  - 存储中的factors:', factors ? `存在(${factors.length}个)` : '不存在')
        if (factors && factors.length > 0) {
          console.log(`  - 解析出${factors.length}个试剂`)
          console.log('  - 第一个试剂样例:', factors[0])
          setFactorsData(factors)
          
          // 提取试剂名称，去重并排序，确保数组稳定
          const reagentNames = Array.from(
            new Set(factors.map((f: any) => f.name).filter((n: string) => n && n.trim()))
          ).sort()
          
          console.log(`  - 提取出${reagentNames.length}个试剂名称:`, reagentNames.slice(0, 5))
          console.log('  - 完整试剂列表:', reagentNames)
          
          // 直接更新，不做比较（避免初始化时的问题）
          console.log('  ✅ 更新availableReagents状态')
          setAvailableReagents(reagentNames as string[])
          
          // 强制触发重新渲染
          setTimeout(() => {
            setForceRenderKey(prev => prev + 1)
            console.log('  🔄 触发强制刷新')
          }, 100)
          
          // 🔥 试剂库更新后，尝试自动重新计算评分（但要先检查数据完整性）
          setTimeout(async () => {
            try {
              // 检查是否有基本的配置数据
              const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)
              const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
              
              const hasValidConfig = (
                methodsData &&
                gradientData &&
                gradientData.calculations &&
                (methodsData.mobilePhaseA?.length > 0 || methodsData.mobilePhaseB?.length > 0 || methodsData.preTreatmentReagents?.length > 0)
              )
              
              if (hasValidConfig) {
                console.log('🎯 试剂库更新后自动重新计算评分（数据完整）')
                calculateFullScoreAPI({ silent: true }).catch(err => {
                  console.warn('⚠️ 自动重新计算评分失败（已忽略）:', err)
                })
              } else {
                console.log('ℹ️ 跳过自动评分计算（配置数据不完整）')
              }
            } catch (err) {
              console.warn('⚠️ 检查配置数据失败:', err)
            }
          }, 800)
          
        } else {
          console.log('  ⚠️ 存储中没有factors数据，清空试剂列表')
          setFactorsData([])
          setAvailableReagents([])
        }
      } catch (error) {
        console.error('❌ 加载 Factors 数据失败:', error)
      }
    }

    // 加载评分结果（定义在useEffect顶层）
    const loadScoreResults = async () => {
      console.log('🔄 MethodsPage: 开始加载评分结果')
      try {
        const results = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)
        if (results) {
          console.log('✅ 评分结果加载成功:', results)
          setScoreResults(results)
        } else {
          console.log('  ℹ️ 存储中没有评分结果')
        }
      } catch (error) {
        console.error('❌ 加载评分结果失败:', error)
      }
    }
    
    // 只在首次加载时执行完整的数据加载
    if (!hasInitialLoad.current) {
      console.log('🔄 首次加载，执行完整数据加载')
      hasInitialLoad.current = true

    // 统一加载所有数据，确保数据完整性
    const loadAllData = async () => {
      setIsDataLoading(true)
      console.log('🔄 开始加载所有数据...')
      
      // 先加载 factors
      await loadFactorsData()
      
      // 加载 Methods 数据（包括权重方案、能耗、Mobile Phase等）
      const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)
      console.log('📋 [loadAllData] 加载到的Methods数据:', methodsData)
      console.log('📋 [loadAllData] weightSchemes:', methodsData?.weightSchemes)
      console.log('📋 [loadAllData] customWeights from storage:', methodsData?.weightSchemes?.customWeights)
      
      // ✅ 先加载所有现有数据到state（确保数据不丢失）
      if (methodsData) {
        // 加载权重方案
        if (methodsData.weightSchemes) {
          console.log('✅ [loadAllData] 恢复权重方案:', methodsData.weightSchemes)
          setSafetyScheme(methodsData.weightSchemes.safetyScheme || 'PBT_Balanced')
          setHealthScheme(methodsData.weightSchemes.healthScheme || 'Absolute_Balance')
          setEnvironmentScheme(methodsData.weightSchemes.environmentScheme || 'PBT_Balanced')
          setStageScheme(methodsData.weightSchemes.instrumentStageScheme || 'Balanced')
          setFinalScheme(methodsData.weightSchemes.finalScheme || 'Direct_Online')
          
          // 恢复自定义权重
          const restoredCustomWeights = methodsData.weightSchemes.customWeights || {};
          console.log('✅ [loadAllData] 即将设置customWeights到state:', restoredCustomWeights);
          setCustomWeights(restoredCustomWeights);
          console.log('✅ [loadAllData] customWeights已设置完成');
        } else {
          console.log('⚠️ [loadAllData] weightSchemes不存在，设置默认值');
          setSafetyScheme('PBT_Balanced')
          setHealthScheme('Absolute_Balance')
          setEnvironmentScheme('PBT_Balanced')
          setStageScheme('Balanced')
          setFinalScheme('Direct_Online')
          setCustomWeights({})
        }
      } else {
        console.log('⚠️ [loadAllData] methodsData不存在，设置默认值');
        setCustomWeights({})
      }
      
      // ⚠️ 能耗数据不在此处加载，由独立的useEffect管理（避免被刷新覆盖）
      
      if (methodsData) {
        // ⚠️ 关键：加载已有的Mobile Phase A/B到state（创建深拷贝）
        if (methodsData.mobilePhaseA && methodsData.mobilePhaseA.length > 0) {
          console.log('✅ 恢复Mobile Phase A:', methodsData.mobilePhaseA)
          setMobilePhaseA(methodsData.mobilePhaseA.map((r, index) => ({ 
            ...r,
            id: r.id || `phaseA_${Date.now()}_${index}` // 确保每个试剂都有唯一 id
          })))
        }
        if (methodsData.mobilePhaseB && methodsData.mobilePhaseB.length > 0) {
          console.log('✅ 恢复Mobile Phase B:', methodsData.mobilePhaseB)
          setMobilePhaseB(methodsData.mobilePhaseB.map((r, index) => ({ 
            ...r,
            id: r.id || `phaseB_${Date.now()}_${index}` // 确保每个试剂都有唯一 id
          })))
        }
        
        // 加载前处理试剂（创建完全独立的深拷贝）
        if (methodsData.preTreatmentReagents && methodsData.preTreatmentReagents.length > 0) {
          console.log('✅ 恢复前处理试剂:', methodsData.preTreatmentReagents)
          // 创建完全独立的副本，每个对象都是新的，确保有 id
          const reagentsCopy = methodsData.preTreatmentReagents.map((r, index) => ({
            id: r.id || `pretreatment_${Date.now()}_${index}`, // 确保每个试剂都有唯一 id
            name: r.name,
            volume: Number(r.volume)
          }))
          console.log('✅ 创建的独立副本:', reagentsCopy)
          setPreTreatmentReagents(reagentsCopy)
        } else {
          // 没有数据时初始化一个空试剂
          console.log('⚠️ 没有前处理试剂数据，创建默认空试剂')
          setPreTreatmentReagents([{ id: Date.now().toString(), name: '', volume: 0 }])
        }
        
        // 加载样品数量
        if (methodsData.sampleCount !== undefined && methodsData.sampleCount !== null) {
          console.log('✅ 恢复样品数量:', methodsData.sampleCount)
          setSampleCount(methodsData.sampleCount)
        }
      }
      
      // 再加载 gradient（依赖 factors）
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      if (gradientData?.calculations) {
        setGradientCalculations(gradientData.calculations)
        console.log('✅ 初始加载gradient数据成功')
        
        let needsSave = false
        let updatedMethodsData = { ...methodsData }
        
        // 🔧 只在storage中的mobilePhaseA/B为空时，才从gradient calculations自动填充
        // （注意：这里检查的是methodsData，不是state）
        if ((!methodsData?.mobilePhaseA || methodsData.mobilePhaseA.length === 0) && 
            gradientData.calculations.mobilePhaseA?.components?.length > 0) {
          console.log('🔄 storage中的mobilePhaseA为空，从gradient自动同步')
          const phaseAReagents = gradientData.calculations.mobilePhaseA.components.map((c: any, index: number) => ({
            id: `phaseA_${Date.now()}_${index}`, // 添加唯一 id
            name: c.reagentName,
            percentage: c.percentage || 100
          }))
          setMobilePhaseA(phaseAReagents)
          updatedMethodsData.mobilePhaseA = phaseAReagents
          needsSave = true
          console.log('  ✅ 已同步Mobile Phase A:', phaseAReagents)
        }
        
        if ((!methodsData?.mobilePhaseB || methodsData.mobilePhaseB.length === 0) && 
            gradientData.calculations.mobilePhaseB?.components?.length > 0) {
          console.log('🔄 storage中的mobilePhaseB为空，从gradient自动同步')
          const phaseBReagents = gradientData.calculations.mobilePhaseB.components.map((c: any, index: number) => ({
            id: `phaseB_${Date.now()}_${index}`, // 添加唯一 id
            name: c.reagentName,
            percentage: c.percentage || 100
          }))
          setMobilePhaseB(phaseBReagents)
          updatedMethodsData.mobilePhaseB = phaseBReagents
          needsSave = true
          console.log('  ✅ 已同步Mobile Phase B:', phaseBReagents)
        }
        
        // 🔧 同步Sample PreTreatment数据
        if ((!methodsData?.preTreatmentReagents || methodsData.preTreatmentReagents.length === 0) && 
            gradientData.calculations.samplePreTreatment?.components?.length > 0) {
          console.log('🔄 storage中的preTreatmentReagents为空，从gradient自动同步')
          const preTreatmentReagents = gradientData.calculations.samplePreTreatment.components.map((c: any, index: number) => ({
            id: `pretreatment_${Date.now()}_${index}`, // 添加唯一 id
            name: c.reagentName,
            volume: c.volume || 0
          }))
          setPreTreatmentReagents(preTreatmentReagents)
          updatedMethodsData.preTreatmentReagents = preTreatmentReagents
          needsSave = true
          console.log('  ✅ 已同步Sample PreTreatment:', preTreatmentReagents)
        }
        
        // 🔧 同步样品数量
        if ((!methodsData?.sampleCount || methodsData.sampleCount === 0) && 
            gradientData.calculations.sampleCount) {
          console.log('🔄 storage中的sampleCount为空，从gradient自动同步')
          setSampleCount(gradientData.calculations.sampleCount)
          updatedMethodsData.sampleCount = gradientData.calculations.sampleCount
          needsSave = true
          console.log('  ✅ 已同步Sample Count:', gradientData.calculations.sampleCount)
        }
        
        // 💾 如果有数据被同步，立即保存到storage
        if (needsSave) {
          console.log('💾 保存同步的数据到storage')
          // ⚠️ 保留原有能耗数据（从gradient同步不会覆盖能耗）
          if (methodsData?.instrumentEnergy !== undefined) {
            updatedMethodsData.instrumentEnergy = methodsData.instrumentEnergy
          }
          if (methodsData?.pretreatmentEnergy !== undefined) {
            updatedMethodsData.pretreatmentEnergy = methodsData.pretreatmentEnergy
          }
          
          // 保留权重方案
          if (!updatedMethodsData.weightSchemes) {
            updatedMethodsData.weightSchemes = {
              safetyScheme: 'PBT_Balanced',
              healthScheme: 'Absolute_Balance',
              environmentScheme: 'PBT_Balanced',
              instrumentStageScheme: 'Balanced',
              prepStageScheme: 'Balanced',
              finalScheme: 'Direct_Online'
            }
          }
          await StorageHelper.setJSON(STORAGE_KEYS.METHODS, updatedMethodsData)
          console.log('  ✅ 已保存同步后的数据')
        }
      } else {
        console.log('⚠️ gradient数据不完整')
        setGradientCalculations(null)
      }
      
      // 加载评分结果，并尝试从中恢复能耗数据
      await loadScoreResults()
      
      // 🔧 如果能耗为0，尝试从score_results反推
      const scoreResults = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)
      if (scoreResults && (!methodsData?.instrumentEnergy || methodsData.instrumentEnergy === 0)) {
        // 注意：无法从P因子反推精确的能耗值，因为P因子是评分结果
        // 但我们可以检查是否之前有保存的能耗数据
        console.log('ℹ️ 能耗数据为0，用户需要手动输入')
      }
      
      // 数据加载完成
      setIsDataLoading(false)
      console.log('✅ 所有数据加载完成')
    }
    
      loadAllData()
    } else {
      // 非首次加载，验证数据完整性并恢复权重方案
      console.log('🔄 后续访问，验证数据完整性并恢复权重方案')
      const verifyData = async () => {
        // 恢复权重方案（每次都要加载）
        const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)
        console.log('📋 [verifyData] 读取到的Methods数据:', methodsData)
        console.log('📋 [verifyData] weightSchemes:', methodsData?.weightSchemes)
        console.log('📋 [verifyData] customWeights from storage:', methodsData?.weightSchemes?.customWeights)
        
        if (methodsData?.weightSchemes) {
          console.log('✅ [verifyData] 恢复权重方案:', methodsData.weightSchemes)
          setSafetyScheme(methodsData.weightSchemes.safetyScheme || 'PBT_Balanced')
          setHealthScheme(methodsData.weightSchemes.healthScheme || 'Absolute_Balance')
          setEnvironmentScheme(methodsData.weightSchemes.environmentScheme || 'PBT_Balanced')
          setStageScheme(methodsData.weightSchemes.instrumentStageScheme || 'Balanced')
          setFinalScheme(methodsData.weightSchemes.finalScheme || 'Direct_Online')
          
          // 恢复自定义权重
          const restoredCustomWeights = methodsData.weightSchemes.customWeights || {};
          console.log('✅ [verifyData] 即将设置customWeights到state:', restoredCustomWeights);
          setCustomWeights(restoredCustomWeights);
          console.log('✅ [verifyData] customWeights已设置完成');
        } else {
          console.log('⚠️ [verifyData] weightSchemes不存在，设置默认值');
          setSafetyScheme('PBT_Balanced')
          setHealthScheme('Absolute_Balance')
          setEnvironmentScheme('PBT_Balanced')
          setStageScheme('Balanced')
          setFinalScheme('Direct_Online')
          setCustomWeights({})
        }
        
        const factors = await StorageHelper.getJSON<any[]>(STORAGE_KEYS.FACTORS)
        const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
        
        // 只有数据真的不存在时才重新加载
        if (!factors || factors.length === 0 || !gradientData?.calculations) {
          console.log('⚠️ 数据缺失，重新加载')
          hasInitialLoad.current = false // 重置标记，下次完整加载
          // 触发重新渲染，让上面的逻辑重新执行
          setForceRenderKey(prev => prev + 1)
        } else {
          console.log('✓ 数据完整，无需重新加载')
        }
      }
      verifyData()
    }

    // 监听 HPLC Gradient 数据更新
    const handleGradientDataUpdated = async () => {
      console.log('🔔 检测到 HPLC Gradient 数据更新，刷新图表...')
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      console.log('📊 Gradient 数据:', gradientData ? '存在' : '不存在')
      if (gradientData) {
        console.log('✅ Gradient 数据加载成功:', gradientData.calculations)
        setGradientCalculations(gradientData.calculations || null) // 更新state
        
        // 🎯 梯度数据更新后，自动重新计算评分
        console.log('🎯 MethodsPage: 梯度数据变化，自动重新计算评分')
        calculateFullScoreAPI({ silent: true }).catch(err => {
          console.warn('⚠️ 梯度数据更新后自动计算评分失败:', err)
        })
      }
    }
    
    // 检查打开文件时gradient数据是否包含calculations
    const checkGradientDataOnLoad = async () => {
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      if (gradientData) {
        // 设置gradient计算数据供UI使用
        setGradientCalculations(gradientData.calculations || null)
        
        // 如果gradient是数组或没有calculations，提示用户需要重新计算
        if (Array.isArray(gradientData) || !gradientData.calculations) {
          console.warn('⚠️ 打开的文件缺少gradient calculations数据')
          message.warning('This file is missing gradient calculation data. Please go to Time Gradient Curve page and click "Confirm" to recalculate', 5)
        }
      }
    }
    
    // 延迟检查，等待文件数据加载完成
    const checkTimer = setTimeout(checkGradientDataOnLoad, 500)
    
    // 监听文件数据变更事件（打开文件、新建文件时触发）
    const handleFileDataChanged = async (e: Event) => {
      const customEvent = e as CustomEvent
      console.log('📢 MethodsPage: 接收到 fileDataChanged 事件', customEvent.detail)
      
      // 🎯 恢复权重方案和自定义权重（防止文件污染）
      const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)
      console.log('📋 [文件切换] 读取到的Methods数据:', methodsData)
      console.log('📋 [文件切换] weightSchemes:', methodsData?.weightSchemes)
      console.log('📋 [文件切换] customWeights from storage:', methodsData?.weightSchemes?.customWeights)
      
      if (methodsData?.weightSchemes) {
        console.log('✅ [文件切换] 恢复权重方案:', methodsData.weightSchemes)
        setSafetyScheme(methodsData.weightSchemes.safetyScheme || 'PBT_Balanced')
        setHealthScheme(methodsData.weightSchemes.healthScheme || 'Absolute_Balance')
        setEnvironmentScheme(methodsData.weightSchemes.environmentScheme || 'PBT_Balanced')
        setStageScheme(methodsData.weightSchemes.instrumentStageScheme || 'Balanced')
        setFinalScheme(methodsData.weightSchemes.finalScheme || 'Direct_Online')
        
        // 恢复自定义权重
        const restoredCustomWeights = methodsData.weightSchemes.customWeights || {};
        console.log('✅ [文件切换] 即将设置customWeights到state:', restoredCustomWeights);
        setCustomWeights(restoredCustomWeights);
        console.log('✅ [文件切换] customWeights已设置完成');
      } else {
        // 如果是新文件，重置为默认值
        console.log('ℹ️ [文件切换] 新文件或没有weightSchemes，重置为默认权重方案')
        setSafetyScheme('PBT_Balanced')
        setHealthScheme('Absolute_Balance')
        setEnvironmentScheme('PBT_Balanced')
        setStageScheme('Balanced')
        setFinalScheme('Direct_Online')
        setCustomWeights({})
        console.log('✅ [文件切换] 已重置为默认值');
      }
      
      // 延迟重新加载factors数据（等待FactorsPage初始化预定义数据）
      setTimeout(() => {
        console.log('🔄 MethodsPage: 延迟加载factors数据')
        loadFactorsData()
        loadScoreResults() // 同时重新加载评分结果
      }, 100)
      
      // 🔄 文件切换时不自动计算评分（因为loadFactorsData已经包含了智能计算逻辑）
      console.log('ℹ️ 文件切换完成，等待用户手动触发评分计算')
      
      console.log('🔄 MethodsPage: 已强制刷新页面数据')
    }
    
    // 监听评分数据更新事件
    const handleScoreDataUpdated = () => {
      console.log('📢 MethodsPage: 检测到评分数据更新')
      loadScoreResults()
    }
    
    // 自定义事件监听(同页面内的更新)
    window.addEventListener('factorsDataUpdated', loadFactorsData as EventListener)
    window.addEventListener('gradientDataUpdated', handleGradientDataUpdated)
    window.addEventListener('fileDataChanged', handleFileDataChanged)
    window.addEventListener('scoreDataUpdated', handleScoreDataUpdated)

    return () => {
      clearTimeout(checkTimer)
      window.removeEventListener('factorsDataUpdated', loadFactorsData as EventListener)
      window.removeEventListener('gradientDataUpdated', handleGradientDataUpdated)
      window.removeEventListener('fileDataChanged', handleFileDataChanged)
      window.removeEventListener('scoreDataUpdated', handleScoreDataUpdated)
    }
  }, [location.pathname]) // 添加 location.pathname 依赖，每次导航到此页面都重新加载

  // ========== 能耗数据独立管理 ==========
  // 能耗数据完全独立，不受其他数据刷新影响
  useEffect(() => {
    const loadEnergyData = async () => {
      const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)
      if (methodsData) {
        const instEnergy = methodsData.instrumentEnergy ?? 0
        const prepEnergy = methodsData.pretreatmentEnergy ?? 0
        console.log('🔋 独立加载能耗数据:', { instrumentEnergy: instEnergy, pretreatmentEnergy: prepEnergy })
        setInstrumentEnergy(instEnergy)
        setPretreatmentEnergy(prepEnergy)
      }
    }
    loadEnergyData()
  }, []) // 只在组件挂载时加载一次，不受其他数据影响

  // 能耗数据变化时单独保存（不触发其他数据的保存）
  useEffect(() => {
    const saveEnergyData = async () => {
      const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS) || {}
      methodsData.instrumentEnergy = instrumentEnergy
      methodsData.pretreatmentEnergy = pretreatmentEnergy
      await StorageHelper.setJSON(STORAGE_KEYS.METHODS, methodsData)
      console.log('🔋 能耗数据已保存:', { instrumentEnergy, pretreatmentEnergy })
    }
    // 使用防抖避免频繁保存
    const timer = setTimeout(saveEnergyData, 300)
    return () => clearTimeout(timer)
  }, [instrumentEnergy, pretreatmentEnergy])
  // ========== 能耗数据独立管理结束 ==========

  // 监听Context数据变化，更新本地状态（只更新必要的字段）
  const lastSyncedData = React.useRef<string>('')
  
  useEffect(() => {
    const currentDataStr = JSON.stringify({
      sampleCount: data.methods.sampleCount,
      preTreatmentReagents: data.methods.preTreatmentReagents,
      mobilePhaseA: data.methods.mobilePhaseA,
      mobilePhaseB: data.methods.mobilePhaseB,
      instrumentEnergy: data.methods.instrumentEnergy,
      pretreatmentEnergy: data.methods.pretreatmentEnergy
    })
    
    // 如果数据没有变化，跳过更新
    if (lastSyncedData.current === currentDataStr) {
      return
    }
    
    console.log('🔄 MethodsPage: Context数据变化，更新本地状态')
    lastSyncedData.current = currentDataStr
    
    // 🔥 设置标志，表示正在从Context同步（避免触发自动保存）
    isSyncingFromContext.current = true
    
    // 更新所有相关数据
    setSampleCount(data.methods.sampleCount)
    setPreTreatmentReagents(data.methods.preTreatmentReagents)
    setMobilePhaseA(data.methods.mobilePhaseA)
    setMobilePhaseB(data.methods.mobilePhaseB)
    
    // ✅ 能耗数据：总是同步Context数据到本地state（确保数据一致性）
    // 注意：能耗数据的真实来源是loadAllData()从storage加载，这里只是保持Context同步
    if (data.methods.instrumentEnergy !== undefined) {
      setInstrumentEnergy(data.methods.instrumentEnergy)
    }
    if (data.methods.pretreatmentEnergy !== undefined) {
      setPretreatmentEnergy(data.methods.pretreatmentEnergy)
    }
    
    // 🔥 重置标志（在下一个事件循环中，确保状态更新已完成）
    setTimeout(() => {
      isSyncingFromContext.current = false
    }, 0)
  }, [data.methods.sampleCount, data.methods.preTreatmentReagents, data.methods.mobilePhaseA, data.methods.mobilePhaseB, data.methods.instrumentEnergy, data.methods.pretreatmentEnergy])

  // 监听 availableReagents 变化
  useEffect(() => {
    console.log('👀 availableReagents 状态变化:', availableReagents.length, availableReagents)
  }, [availableReagents])

  // 自动保存数据到 Context 和存储（每次状态变化时）
  // 使用 ref 来避免初始化时触发 dirty
  const isInitialMount = React.useRef(true)
  const isAutoCalcInitialized = React.useRef(false)  // 专门用于自动计算的初始化标志
  const lastLocalData = React.useRef<string>('')
  const isSyncingFromContext = React.useRef(false)  // 🔥 新增：标记是否正在从Context同步
  
  useEffect(() => {
    // 🔥 如果正在从Context同步，跳过自动保存（避免循环）
    if (isSyncingFromContext.current) {
      console.log('⏭️ MethodsPage: 正在从Context同步，跳过自动保存')
      return
    }
    
    // 🔥 首次挂载时跳过保存，避免覆盖刚从Context加载的数据
    if (isInitialMount.current) {
      isInitialMount.current = false
      console.log('⏭️ MethodsPage: 首次挂载，跳过自动保存')
      // 初始化lastLocalData，以便后续能正确检测变化
      const initialDataStr = JSON.stringify({
        sampleCount,
        preTreatmentReagents,
        mobilePhaseA,
        mobilePhaseB,
        instrumentEnergy,
        pretreatmentEnergy
      })
      lastLocalData.current = initialDataStr
      return
    }
    
    const saveData = async () => {
      // 过滤掉空的试剂条目（名称为空或体积为0）
      const validPreTreatmentReagents = preTreatmentReagents.filter(r => r.name && r.name.trim() && r.volume > 0)
      const validMobilePhaseA = mobilePhaseA.filter(r => r.name && r.name.trim() && r.percentage > 0)
      const validMobilePhaseB = mobilePhaseB.filter(r => r.name && r.name.trim() && r.percentage > 0)
      
      const dataToSave = {
        sampleCount,
        preTreatmentReagents: validPreTreatmentReagents,
        mobilePhaseA: validMobilePhaseA,
        mobilePhaseB: validMobilePhaseB,
        instrumentEnergy: instrumentEnergy || 0,
        pretreatmentEnergy: pretreatmentEnergy || 0,
        // 保存权重方案（stageScheme同时保存到两个字段以兼容前后处理）
        weightSchemes: {
          safetyScheme,
          healthScheme,
          environmentScheme,
          instrumentStageScheme: stageScheme,
          prepStageScheme: stageScheme,
          finalScheme,
          customWeights: customWeights  // 🎯 保留自定义权重
        }
      }
      
      const currentLocalDataStr = JSON.stringify(dataToSave)
      
      // 保存到存储
      await StorageHelper.setJSON(STORAGE_KEYS.METHODS, dataToSave)
      
      // Skip update on initial mount
      if (isInitialMount.current) {
        console.log('⏭️ MethodsPage: 跳过初始挂载时的更新')
        isInitialMount.current = false
        lastLocalData.current = currentLocalDataStr
        return
      }
      
      // Skip update if local data unchanged (may be synced from Context)
      if (lastLocalData.current === currentLocalDataStr) {
        console.log('⏭️ MethodsPage: 本地数据未变化，跳过Context更新')
        return
      }
      
      console.log('🔄 MethodsPage: 本地数据变化，同步到Context并标记dirty')
      lastLocalData.current = currentLocalDataStr
      
      // Sync to Context and mark as dirty
      updateMethodsData(dataToSave)
      setIsDirty(true)
      
      // Trigger event to notify other pages (like TablePage)
      console.log('🔔 MethodsPage: 触发 methodsDataUpdated 事件')
      console.log('📋 变化的数据:', {
        sampleCount: dataToSave.sampleCount,
        前处理试剂数: dataToSave.preTreatmentReagents.length,
        流动相A试剂数: dataToSave.mobilePhaseA.length,
        流动相B试剂数: dataToSave.mobilePhaseB.length,
        仪器能耗: dataToSave.instrumentEnergy,
        前处理能耗: dataToSave.pretreatmentEnergy
      })
      window.dispatchEvent(new CustomEvent('methodsDataUpdated', { detail: dataToSave }))
    }
    
    saveData()
  }, [sampleCount, preTreatmentReagents, mobilePhaseA, mobilePhaseB, instrumentEnergy, pretreatmentEnergy, 
      safetyScheme, healthScheme, environmentScheme, stageScheme, finalScheme, 
      updateMethodsData, setIsDirty])

  // Handle sample count changes
  const handleSampleCountChange = (value: number | null) => {
    setSampleCount(value)
    if (value === null || value <= 0 || !Number.isInteger(value)) {
      setSampleCountError('Please enter a positive integer')
    } else {
      setSampleCountError('')
    }
  }

  // Add reagent
  const addReagent = (type: 'preTreatment' | 'phaseA' | 'phaseB') => {
    if (type === 'preTreatment') {
      const newReagent: PreTreatmentReagent = { id: Date.now().toString(), name: '', volume: 0 }
      setPreTreatmentReagents([...preTreatmentReagents, newReagent])
    } else {
      const newReagent: Reagent = { id: Date.now().toString(), name: '', percentage: 0 }
      if (type === 'phaseA') {
        setMobilePhaseA([...mobilePhaseA, newReagent])
      } else {
        setMobilePhaseB([...mobilePhaseB, newReagent])
      }
    }
  }

  // Delete last reagent
  const deleteLastReagent = (type: 'preTreatment' | 'phaseA' | 'phaseB') => {
    if (type === 'preTreatment') {
      if (preTreatmentReagents.length <= 1) {
        message.warning('Keep at least one reagent')
        return
      }
      setPreTreatmentReagents(preTreatmentReagents.slice(0, -1))
    } else if (type === 'phaseA') {
      if (mobilePhaseA.length <= 1) {
        message.warning('Keep at least one reagent')
        return
      }
      setMobilePhaseA(mobilePhaseA.slice(0, -1))
    } else {
      if (mobilePhaseB.length <= 1) {
        message.warning('Keep at least one reagent')
        return
      }
      setMobilePhaseB(mobilePhaseB.slice(0, -1))
    }
  }

  // Update reagent - use useCallback to cache function, avoid creating new function on each render
  const updateReagent = useCallback((
    type: 'preTreatment' | 'phaseA' | 'phaseB',
    id: string,
    field: 'name' | 'percentage' | 'volume',
    value: string | number
  ) => {
    console.log(`🔧 更新试剂 - type: ${type}, id: ${id}, field: ${field}, value:`, value)
    
    if (type === 'preTreatment') {
      setPreTreatmentReagents(prev => {
        console.log('📋 更新前的数组:', prev.map(r => `id:${r.id}, name:${r.name}, volume:${r.volume}`))
        const updated = prev.map(r => {
          if (r.id === id) {
            const newReagent = { ...r, [field]: value }
            console.log(`✅ 更新试剂 ${id}:`, newReagent)
            return newReagent
          }
          console.log(`⏭️ 跳过试剂 ${r.id}`)
          return r
        })
        console.log('📋 更新后的数组:', updated.map(r => `id:${r.id}, name:${r.name}, volume:${r.volume}`))
        return updated
      })
    } else if (type === 'phaseA') {
      setMobilePhaseA(prev => {
        const updated = prev.map(r => 
          r.id === id ? { ...r, [field]: value } : r
        )
        // 🔥 试剂改变时重新计算gradient calculations
        recalculateGradientCalculations(updated, mobilePhaseB)
        return updated
      })
    } else if (type === 'phaseB') {
      setMobilePhaseB(prev => {
        const updated = prev.map(r => 
          r.id === id ? { ...r, [field]: value } : r
        )
        // 🔥 试剂改变时重新计算gradient calculations
        recalculateGradientCalculations(mobilePhaseA, updated)
        return updated
      })
    }
  }, [mobilePhaseA, mobilePhaseB])
  
  // 🔥 重新计算gradient的calculations（当试剂配置改变时）
  const recalculateGradientCalculations = async (phaseA: Reagent[], phaseB: Reagent[]) => {
    try {
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      if (!gradientData) {
        console.log('⏭️ 没有gradient数据，跳过重新计算')
        return
      }
      if (!gradientData.calculations) {
        console.log('⏭️ gradient数据没有calculations，跳过重新计算')
        return
      }
      
      console.log('🔄 重新计算gradient calculations...')
      
      // Get original volume data
      const totalVolumeA = gradientData.calculations.mobilePhaseA?.volume || 0
      const totalVolumeB = gradientData.calculations.mobilePhaseB?.volume || 0
      
      // Recalculate Mobile Phase A components
      const totalPercentageA = phaseA.reduce((sum, r) => sum + (r.percentage || 0), 0)
      const newComponentsA = phaseA
        .filter(r => r.name && r.name.trim())
        .map(r => ({
          reagentName: r.name,
          percentage: r.percentage,
          ratio: totalPercentageA > 0 ? r.percentage / totalPercentageA : 0,
          volume: totalPercentageA > 0 ? (totalVolumeA * r.percentage / totalPercentageA) : 0
        }))
      
      // Recalculate Mobile Phase B components
      const totalPercentageB = phaseB.reduce((sum, r) => sum + (r.percentage || 0), 0)
      const newComponentsB = phaseB
        .filter(r => r.name && r.name.trim())
        .map(r => ({
          reagentName: r.name,
          percentage: r.percentage,
          ratio: totalPercentageB > 0 ? r.percentage / totalPercentageB : 0,
          volume: totalPercentageB > 0 ? (totalVolumeB * r.percentage / totalPercentageB) : 0
        }))
      
      // Update component info in calculations
      gradientData.calculations.mobilePhaseA.components = newComponentsA
      gradientData.calculations.mobilePhaseB.components = newComponentsB
      
      // Recalculate total volume of all reagents
      const allReagentVolumes: { [key: string]: number } = {}
      
      newComponentsA.forEach((c: any) => {
        if (allReagentVolumes[c.reagentName]) {
          allReagentVolumes[c.reagentName] += c.volume
        } else {
          allReagentVolumes[c.reagentName] = c.volume
        }
      })
      
      newComponentsB.forEach((c: any) => {
        if (allReagentVolumes[c.reagentName]) {
          allReagentVolumes[c.reagentName] += c.volume
        } else {
          allReagentVolumes[c.reagentName] = c.volume
        }
      })
      
      gradientData.calculations.allReagentVolumes = allReagentVolumes
      
      // Save updated gradient data
      await StorageHelper.setJSON(STORAGE_KEYS.GRADIENT, gradientData)
      console.log('✅ 已更新gradient calculations')
    } catch (error) {
      console.error('❌ 重新计算gradient calculations失败:', error)
    }
  }

  // Calculate percentage sum (for Mobile Phase A/B only)
  const calculateTotal = (reagents: Reagent[]): number => {
    return reagents.reduce((sum, r) => sum + (r.percentage || 0), 0)
  }

  // Calculate volume sum (for Sample PreTreatment only)
  const calculateTotalVolume = (reagents: PreTreatmentReagent[]): number => {
    return reagents.reduce((sum, r) => sum + (r.volume || 0), 0)
  }

  // Validate percentage sum
  const validatePercentage = (reagents: Reagent[]): boolean => {
    const total = calculateTotal(reagents)
    return Math.abs(total - 100) < 0.01 // 允许浮点误差
  }

  // Get percentage display style
  const getPercentageStyle = (total: number) => {
    const isValid = Math.abs(total - 100) < 0.01
    return {
      color: isValid ? '#52c41a' : '#ff4d4f',
      fontWeight: 500,
      fontSize: 14
    }
  }

  // 计算柱状图数据 - Sample PreTreatment（需要乘以样品数）
  // 使用 useMemo 缓存柱状图数据 - Sample PreTreatment
  const preTreatmentChartData = React.useMemo(() => {
    console.log('🔄 计算 PreTreatment 图表数据')
    const chartData: any[] = []
    const currentSampleCount = sampleCount || 1
    
    // 如果factorsData未加载，返回空数组
    if (!factorsData || factorsData.length === 0) {
      console.log('  ⚠️ factorsData 未加载，跳过图表计算')
      return chartData
    }
    
    preTreatmentReagents.forEach(reagent => {
      if (!reagent.name || reagent.volume <= 0) return
      
      const factor = factorsData.find(f => f.name === reagent.name)
      if (!factor) {
        console.log(`  ⚠️ 找不到试剂 ${reagent.name} 的factor数据`)
        return
      }
      
      const totalVolume = reagent.volume * currentSampleCount
      const mass = totalVolume * factor.density
      
      chartData.push({
        reagent: reagent.name,
        S: Number((mass * factor.safetyScore).toFixed(3)),
        H: Number((mass * factor.healthScore).toFixed(3)),
        E: Number((mass * factor.envScore).toFixed(3)),
        R: Number((mass * (factor.regeneration || 0)).toFixed(3)),
        D: Number((mass * factor.disposal).toFixed(3)),
        P: 0
      })
    })
    
    console.log(`  ✅ 生成了 ${chartData.length} 个数据点`)
    return chartData
  }, [preTreatmentReagents, sampleCount, factorsData])

  // 原来的calculatePreTreatmentChartData函数删除，由useMemo替代

  // 计算柱状图数据 - Mobile Phase (需要 HPLC Gradient 数据)
  const calculatePhaseChartData = async (phaseType: 'A' | 'B') => {
    const chartData: any[] = []
    
    try {
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      console.log(`📊 计算 Mobile Phase ${phaseType} 图表数据`)
      console.log('  - 存储中的gradient数据:', gradientData ? '存在' : '不存在')
      
      if (!gradientData) {
        console.log('  ❌ 没有gradient数据')
        return chartData
      }
      console.log('  - gradient数据类型:', Array.isArray(gradientData) ? '数组' : '对象')
      console.log('  - gradient对象键:', Object.keys(gradientData))
      console.log('  - 是否有calculations:', 'calculations' in gradientData)
      console.log('  - isValid标记:', gradientData.isValid)
      console.log('  - invalidReason:', gradientData.invalidReason)
      
      // 🔥 检查数据是否被标记为无效（所有流速为0）
      if (gradientData.isValid === false || gradientData.calculations === null) {
        console.log('  ⚠️ Gradient数据无效（流速为0），返回特殊标记')
        return 'INVALID_FLOW_RATE' as any // 特殊标记
      }
      
      const phaseKey = phaseType === 'A' ? 'mobilePhaseA' : 'mobilePhaseB'
      const phaseData = gradientData.calculations?.[phaseKey]
      
      console.log(`  - ${phaseKey} 数据:`, phaseData)
      console.log(`  - ${phaseKey} components:`, phaseData?.components)
      
      if (!phaseData || !phaseData.components) {
        console.log(`  ❌ 没有 ${phaseKey} 的 components 数据`)
        return chartData
      }
      
      phaseData.components.forEach((component: any) => {
        if (!component.reagentName || component.volume <= 0) return
        
        const factor = factorsData.find(f => f.name === component.reagentName)
        if (!factor) {
          console.log(`  ⚠️ 找不到试剂 ${component.reagentName} 的factor数据`)
          return
        }
        
        const mass = component.volume * factor.density // 质量 = 体积 × 密度
        
        // Note: For reagents with density=0 (like CO2, Water), all scores will be 0
        // They will appear in the chart but with no visible bars
        chartData.push({
          reagent: component.reagentName,
          S: Number((mass * factor.safetyScore).toFixed(3)),
          H: Number((mass * factor.healthScore).toFixed(3)),
          E: Number((mass * factor.envScore).toFixed(3)),
          R: Number((mass * (factor.regeneration || 0)).toFixed(3)),
          D: Number((mass * factor.disposal).toFixed(3)),
          P: 0  // P is a method-level factor, not reagent property
        })
      })
      
      console.log(`  ✅ 生成了 ${chartData.length} 个柱状图数据点`)
    } catch (error) {
      console.error('❌ 计算 Mobile Phase 图表数据失败:', error)
    }

    return chartData
  }

  // 使用 useEffect 计算图表数据（因为是异步操作）
  useEffect(() => {
    const loadPhaseAChartData = async () => {
      console.log('🔄 重新计算 Phase A 图表数据')
      console.log('  - factorsData.length:', factorsData.length)
      console.log('  - gradientCalculations:', gradientCalculations ? '存在' : '不存在')
      console.log('  - isDataLoading:', isDataLoading)
      
      // 如果正在加载，不做任何操作（保持现有图表）
      if (isDataLoading) {
        console.log('  ⏳ 数据加载中，保持现有图表')
        return
      }
      
      // 数据加载完成但不完整，才清空图表
      if (factorsData.length === 0 || !gradientCalculations) {
        console.log('  ⚠️ 数据不完整，清空 Phase A 图表')
        setPhaseAChartData([])
        return
      }
      
      const data = await calculatePhaseChartData('A')
      console.log('📈 Phase A 图表数据:', data)
      setPhaseAChartData(data)
    }
    
    loadPhaseAChartData()
  }, [factorsData, gradientCalculations, isDataLoading])
  
  useEffect(() => {
    const loadPhaseBChartData = async () => {
      console.log('🔄 重新计算 Phase B 图表数据')
      console.log('  - factorsData.length:', factorsData.length)
      console.log('  - gradientCalculations:', gradientCalculations ? '存在' : '不存在')
      console.log('  - isDataLoading:', isDataLoading)
      
      // 如果正在加载，不做任何操作（保持现有图表）
      if (isDataLoading) {
        console.log('  ⏳ 数据加载中，保持现有图表')
        return
      }
      
      // 数据加载完成但不完整，才清空图表
      if (factorsData.length === 0 || !gradientCalculations) {
        console.log('  ⚠️ 数据不完整，清空 Phase B 图表')
        setPhaseBChartData([])
        return
      }
      
      const data = await calculatePhaseChartData('B')
      console.log('📈 Phase B 图表数据:', data)
      setPhaseBChartData(data)
    }
    
    loadPhaseBChartData()
  }, [factorsData, gradientCalculations, isDataLoading])
  
  // Calculate Power Factor (P) score
  // 计算P因子（使用用户输入的能耗值）
  const calculatePowerScore = (energy_kwh: number): number => {
    // 新公式: 
    // 如果 E < 1.5 kWh: P = 100 × (E/1.5)^0.235
    // 如果 E ≥ 1.5 kWh: P = 100
    
    if (energy_kwh <= 0) {
      return 0
    }
    
    if (energy_kwh >= 1.5) {
      return 100
    }
    
    // 使用幂函数公式
    const p_score = 100 * Math.pow(energy_kwh / 1.5, 0.235)
    
    console.log(`⚡ P因子计算: E=${energy_kwh.toFixed(4)} kWh, P=${p_score.toFixed(2)}`)
    
    return p_score
  }

  // Calculate R (Regeneration) and D (Disposal) factors using normalization
  const calculateRDFactors = async (): Promise<{ instrument_r: number, instrument_d: number, pretreatment_r: number, pretreatment_d: number }> => {
    try {
      // Get factor data
      const factors = await StorageHelper.getJSON<any[]>(STORAGE_KEYS.FACTORS)
      if (!factors) return { 
        instrument_r: 0, 
        instrument_d: 0,
        pretreatment_r: 0,
        pretreatment_d: 0
      }

      // 阶段1：仪器分析试剂（流动相）
      let instrument_r_sum = 0
      let instrument_d_sum = 0

      console.log('🔍 开始计算仪器分析R/D因子...')

      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      if (gradientData) {
        const calculations = gradientData.calculations
        
        if (calculations) {
          // Mobile Phase A
          if (calculations.mobilePhaseA?.components) {
            console.log('  流动相A:', calculations.mobilePhaseA.components)
            calculations.mobilePhaseA.components.forEach((component: any) => {
              const factor = factors.find((f: any) => f.name === component.reagentName)
              if (factor) {
                const mass = component.volume * factor.density
                const r_contribution = mass * (factor.regeneration || 0)
                const d_contribution = mass * factor.disposal
                console.log(`    ${component.reagentName}: volume=${component.volume}ml, mass=${mass.toFixed(4)}g, R=${factor.regeneration}, D=${factor.disposal}`)
                console.log(`      → R贡献=${r_contribution.toFixed(6)}, D贡献=${d_contribution.toFixed(6)}`)
                instrument_r_sum += r_contribution
                instrument_d_sum += d_contribution
              }
            })
          }

          // Mobile Phase B
          if (calculations.mobilePhaseB?.components) {
            console.log('  流动相B:', calculations.mobilePhaseB.components)
            calculations.mobilePhaseB.components.forEach((component: any) => {
              const factor = factors.find((f: any) => f.name === component.reagentName)
              if (factor) {
                const mass = component.volume * factor.density
                const r_contribution = mass * (factor.regeneration || 0)
                const d_contribution = mass * factor.disposal
                console.log(`    ${component.reagentName}: volume=${component.volume}ml, mass=${mass.toFixed(4)}g, R=${factor.regeneration}, D=${factor.disposal}`)
                console.log(`      → R贡献=${r_contribution.toFixed(6)}, D贡献=${d_contribution.toFixed(6)}`)
                instrument_r_sum += r_contribution
                instrument_d_sum += d_contribution
              }
            })
          }
        }
      }
      
      console.log(`  仪器分析累加结果: R_sum=${instrument_r_sum.toFixed(6)}, D_sum=${instrument_d_sum.toFixed(6)}`)

      // 阶段2：前处理试剂
      let pretreatment_r_sum = 0
      let pretreatment_d_sum = 0

      preTreatmentReagents.forEach(reagent => {
        if (!reagent.name || reagent.volume <= 0) return
        
        const factor = factors.find((f: any) => f.name === reagent.name)
        if (factor) {
          const totalVolume = reagent.volume * (sampleCount || 1)
          const mass = totalVolume * factor.density
          pretreatment_r_sum += mass * (factor.regeneration || 0)
          pretreatment_d_sum += mass * factor.disposal
        }
      })

      // 分别归一化两个阶段（使用新公式）
      // 新公式: Score = min{45 × log₁₀(1 + 14 × Σ), 100}
      const instrument_r = instrument_r_sum > 0 ? Math.min(100, 45.0 * Math.log10(1 + 14 * instrument_r_sum)) : 0
      const instrument_d = instrument_d_sum > 0 ? Math.min(100, 45.0 * Math.log10(1 + 14 * instrument_d_sum)) : 0
      const pretreatment_r = pretreatment_r_sum > 0 ? Math.min(100, 45.0 * Math.log10(1 + 14 * pretreatment_r_sum)) : 0
      const pretreatment_d = pretreatment_d_sum > 0 ? Math.min(100, 45.0 * Math.log10(1 + 14 * pretreatment_d_sum)) : 0

      console.log('📊 R/D因子计算结果（分阶段）:', {
        仪器分析: {
          r_weighted_sum: instrument_r_sum.toFixed(3),
          d_weighted_sum: instrument_d_sum.toFixed(3),
          r_factor: instrument_r.toFixed(2),
          d_factor: instrument_d.toFixed(2)
        },
        前处理: {
          r_weighted_sum: pretreatment_r_sum.toFixed(3),
          d_weighted_sum: pretreatment_d_sum.toFixed(3),
          r_factor: pretreatment_r.toFixed(2),
          d_factor: pretreatment_d.toFixed(2)
        }
      })

      return { 
        instrument_r, 
        instrument_d,
        pretreatment_r,
        pretreatment_d
      }
    } catch (error) {
      console.error('Error calculating R/D factors:', error)
      return { 
        instrument_r: 0, 
        instrument_d: 0,
        pretreatment_r: 0,
        pretreatment_d: 0
      }
    }
  }

  // 计算完整评分（调用后端API）
  const calculateFullScoreAPI = async (options?: { silent?: boolean; overrides?: any }) => {
    const silent = options?.silent || false
    const overrides = options?.overrides || {}
    setIsCalculatingScore(true)
    
    console.log('🚀 开始执行 calculateFullScoreAPI, silent:', silent, 'overrides:', overrides)
    
    try {
      // 1. 获取梯度数据
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      if (!gradientData) {
        if (!silent) message.error('Please configure gradient program in HPLC Gradient page first')
        setIsCalculatingScore(false)
        return
      }
      
      console.log('✅ 梯度数据加载成功:', gradientData)
      
      // 2. 获取因子数据
      const factors = await StorageHelper.getJSON<any[]>(STORAGE_KEYS.FACTORS)
      if (!factors) {
        if (!silent) message.error('Please configure reagent factors in Factors page first')
        setIsCalculatingScore(false)
        return
      }
      
      console.log('✅ 因子数据加载成功:', factors.length, '个试剂')
      
      // 辅助函数：清理数字数据
      const cleanNumber = (value: any, defaultValue: number = 0): number => {
        const num = parseFloat(String(value))
        if (isNaN(num) || !isFinite(num)) {
          return defaultValue
        }
        return num
      }
      
      // 辅助函数：清理数字数组
      const cleanNumberArray = (arr: any[]): number[] => {
        return arr.map(v => cleanNumber(v, 0))
      }
      
      // 3. 构建试剂因子矩阵（映射字段名到后端期望的格式）
      const buildFactorMatrix = (reagentNames: string[]) => {
        const matrix: any = {}
        reagentNames.forEach(name => {
          const factor = factors.find((f: any) => f.name === name)
          if (factor) {
            // 映射前端字段名到后端字段名
            matrix[name] = {
              S1: cleanNumber(factor.releasePotential, 0),     // Release Potential
              S2: cleanNumber(factor.fireExplos, 0),            // Fire/Explosives
              S3: cleanNumber(factor.reactDecom, 0),            // Reaction/Decomposition
              S4: cleanNumber(factor.acuteToxicity, 0),         // Acute Toxicity
              H1: cleanNumber(factor.chronicToxicity, 0),       // Chronic Toxicity
              H2: cleanNumber(factor.irritation, 0),            // Irritation
              E1: cleanNumber(factor.persistency, 0),           // Persistency
              E2: cleanNumber(factor.airHazard, 0),             // Air Hazard (Emission)
              E3: cleanNumber(factor.waterHazard, 0)            // Water Hazard
            }
            
          } else {
            throw new Error(`找不到试剂 "${name}" 的因子数据，请先在 Factors 页面导入该试剂的数据`)
          }
        })
        return matrix
      }

      // 4. 获取试剂密度数据（从因子数据中）
      const getDensities = (reagentNames: string[]) => {
        const densities: any = {}
        reagentNames.forEach(name => {
          const factor = factors.find((f: any) => f.name === name)
          if (factor && factor.density) {
            densities[name] = factor.density
          } else {
            // 默认密度（水）
            densities[name] = 1.0
          }
        })
        return densities
      }

      // 5. 构建仪器分析数据
      console.log('📋 Mobile Phase 数据:')
      console.log('  - mobilePhaseA:', mobilePhaseA)
      console.log('  - mobilePhaseB:', mobilePhaseB)
      
      const instrumentReagents = [
        ...mobilePhaseA.map(r => r.name),
        ...mobilePhaseB.map(r => r.name)
      ].filter((name, index, self) => name && self.indexOf(name) === index)
      
      console.log('  - 提取的试剂列表:', instrumentReagents)
      
      // 验证梯度数据结构
      if (!gradientData.steps || !Array.isArray(gradientData.steps)) {
        message.error('Gradient data format error: missing steps array')
        setIsCalculatingScore(false)
        return
      }
      
      console.log('✅ 梯度步骤数量:', gradientData.steps.length)

      const instrumentComposition: any = {}
      
      console.log('🔄 开始构建 composition，试剂数量:', instrumentReagents.length)
      
      instrumentReagents.forEach(reagent => {
        console.log(`\n📌 处理试剂: ${reagent}`)
        
        const percentages = gradientData.steps.map((step: any, index: number) => {
          // 计算该试剂在每个步骤的百分比
          // 注意：字段名是 phaseA 和 phaseB，不是 compositionA 和 compositionB
          const phaseAPercent = cleanNumber(step.phaseA, 0) / 100
          const phaseBPercent = cleanNumber(step.phaseB, 0) / 100
          
          const reagentInA = mobilePhaseA.find(r => r.name === reagent)
          const reagentInB = mobilePhaseB.find(r => r.name === reagent)
          
          const percentInA = reagentInA ? (cleanNumber(reagentInA.percentage, 0) / 100) : 0
          const percentInB = reagentInB ? (cleanNumber(reagentInB.percentage, 0) / 100) : 0
          
          const result = (phaseAPercent * percentInA + phaseBPercent * percentInB) * 100
          
          console.log(`🔍 步骤${index} - ${reagent}:`, {
            step: step,
            phaseA: step.phaseA,
            phaseB: step.phaseB,
            phaseAPercent,
            phaseBPercent,
            reagentInA,
            reagentInB,
            percentInA,
            percentInB,
            计算结果: result
          })
          
          return cleanNumber(result, 0)
        })
        
        // 确保数组中所有值都是有效数字
        instrumentComposition[reagent] = cleanNumberArray(percentages)
        console.log(`  ✅ ${reagent} composition 完成:`, instrumentComposition[reagent])
      })
      
      console.log('📊 最终 composition 对象:', instrumentComposition)
      console.log('📊 composition keys 数量:', Object.keys(instrumentComposition).length)

      // 验证时间点数据
      const timePoints = cleanNumberArray(gradientData.steps.map((s: any) => s.time))
      
      // 提取曲线类型数据
      const curveTypes = gradientData.steps.map((s: any) => s.curve || 'linear')

      const instrumentData = {
        time_points: timePoints,
        composition: instrumentComposition,
        flow_rate: cleanNumber(gradientData.flowRate, 1.0),
        densities: getDensities(instrumentReagents),
        factor_matrix: buildFactorMatrix(instrumentReagents),
        curve_types: curveTypes  // 新增：发送曲线类型
      }
      
      console.log('📦 构建的 instrumentData:')
      console.log('  - time_points:', instrumentData.time_points)
      console.log('  - composition keys:', Object.keys(instrumentData.composition))
      console.log('  - composition:', instrumentData.composition)
      console.log('  - flow_rate:', instrumentData.flow_rate)
      console.log('  - densities:', instrumentData.densities)
      console.log('  - curve_types:', instrumentData.curve_types)

      // 验证仪器数据
      console.log('📋 仪器分析数据验证:', {
        reagents: instrumentReagents,
        timePoints: timePoints,
        composition: instrumentComposition,
        flowRate: instrumentData.flow_rate
      })

      // 6. 构建前处理数据
      const prepReagents = preTreatmentReagents.map(r => r.name).filter(Boolean)
      
      console.log('📋 前处理试剂验证:', {
        原始数据: preTreatmentReagents,
        提取的试剂名: prepReagents,
        试剂数量: prepReagents.length
      })
      
      // 如果没有前处理试剂，使用空对象
      const prepVolumes: any = {}
      const prepDensities: any = {}
      const prepFactorMatrix: any = {}
      
      if (prepReagents.length > 0) {
        console.log('  ✅ 有前处理试剂，开始构建数据...')
        preTreatmentReagents.forEach(r => {
          if (r.name) {
            const volume = cleanNumber(r.volume, 0)
            prepVolumes[r.name] = volume
            console.log(`  📌 前处理试剂: ${r.name}, 原始体积: ${r.volume}, 清理后: ${volume} ml`)
          }
        })
        
        Object.assign(prepDensities, getDensities(prepReagents))
        Object.assign(prepFactorMatrix, buildFactorMatrix(prepReagents))
        
        console.log('  ✅ 前处理体积:', prepVolumes)
        console.log('  ✅ 前处理密度:', prepDensities)
        console.log('  ✅ 前处理因子矩阵:', prepFactorMatrix)
      } else {
        console.log('  ⚠️ 没有前处理试剂，使用Water作为占位符')
        // 如果没有前处理试剂，创建一个虚拟试剂避免空数据错误
        prepVolumes['Water'] = 0.001  // 使用极小值
        prepDensities['Water'] = 1.0
        const waterFactor = factors.find((f: any) => f.name === 'Water')
        if (waterFactor) {
          prepFactorMatrix['Water'] = {
            S1: waterFactor.releasePotential || 0,
            S2: waterFactor.fireExplos || 0,
            S3: waterFactor.reactDecom || 0,
            S4: waterFactor.acuteToxicity || 0,
            H1: waterFactor.chronicToxicity || 0,
            H2: waterFactor.irritation || 0,
            E1: waterFactor.persistency || 0,
            E2: waterFactor.airHazard || 0,
            E3: waterFactor.waterHazard || 0
          }
        } else {
          // 如果找不到Water，使用全0因子
          prepFactorMatrix['Water'] = {
            S1: 0, S2: 0, S3: 0, S4: 0,
            H1: 0, H2: 0,
            E1: 0, E2: 0, E3: 0
          }
        }
      }

      const prepData = {
        volumes: prepVolumes,
        densities: prepDensities,
        factor_matrix: prepFactorMatrix
      }

      // 验证前处理数据
      console.log('📋 前处理数据验证:', {
        reagents: prepReagents,
        volumes: prepVolumes,
        densities: prepDensities
      })

      // 7. 计算P因子（分阶段，使用用户输入的能耗）
      const instrument_p_factor = cleanNumber(calculatePowerScore(instrumentEnergy), 0)
      const pretreatment_p_factor = cleanNumber(calculatePowerScore(pretreatmentEnergy), 0)

      // 8. 计算R和D因子（分阶段）
      const rdFactors = await calculateRDFactors()
      const instrument_r = cleanNumber(rdFactors.instrument_r, 0)
      const instrument_d = cleanNumber(rdFactors.instrument_d, 0)
      const pretreatment_r = cleanNumber(rdFactors.pretreatment_r, 0)
      const pretreatment_d = cleanNumber(rdFactors.pretreatment_d, 0)

      console.log('🎯 P/R/D因子计算结果（分阶段）:')
      console.log('  仪器分析: P=' + instrument_p_factor + ', R=' + instrument_r + ', D=' + instrument_d)
      console.log('  前处理: P=' + pretreatment_p_factor + ', R=' + pretreatment_r + ', D=' + pretreatment_d)

      // 9. 构建完整请求
      const requestData = {
        instrument: instrumentData,
        preparation: prepData,
        p_factor: instrument_p_factor,  // 仪器分析P因子
        pretreatment_p_factor: pretreatment_p_factor,  // 前处理P因子
        instrument_r_factor: Number(instrument_r),  // 确保是数字类型
        instrument_d_factor: Number(instrument_d),  // 确保是数字类型
        pretreatment_r_factor: Number(pretreatment_r),  // 确保是数字类型
        pretreatment_d_factor: Number(pretreatment_d),  // 确保是数字类型
        safety_scheme: overrides.safetyScheme || safetyScheme,
        health_scheme: overrides.healthScheme || healthScheme,
        environment_scheme: overrides.environmentScheme || environmentScheme,
        instrument_stage_scheme: overrides.stageScheme || stageScheme,
        prep_stage_scheme: overrides.stageScheme || stageScheme,
        final_scheme: overrides.finalScheme || finalScheme,
        custom_weights: overrides.customWeights || customWeights
      }

      // 打印请求数据（使用字符串拼接避免对象展开问题）
      console.log('📊 发送评分请求:')
      console.log('  - instrument_r_factor:', requestData.instrument_r_factor)
      console.log('  - instrument_d_factor:', requestData.instrument_d_factor)
      console.log('  - pretreatment_r_factor:', requestData.pretreatment_r_factor)
      console.log('  - pretreatment_d_factor:', requestData.pretreatment_d_factor)
      
      // 详细的数据验证和调试
      console.log('🔍 数据验证开始:')
      console.log('  - time_points 长度:', instrumentData.time_points.length)
      console.log('  - composition keys:', Object.keys(instrumentData.composition))
      console.log('  - composition 样例:', instrumentData.composition)
      
      // 验证 composition 中的值
      const compositionValues = Object.values(instrumentData.composition)
      console.log('  - composition values 数量:', compositionValues.length)
      
      let hasNaN = false
      Object.entries(instrumentData.composition).forEach(([key, arr]: [string, any]) => {
        if (arr.some((val: any) => isNaN(val) || !isFinite(val))) {
          console.error(`    ❌ ${key} 包含无效值:`, arr)
          hasNaN = true
        } else {
          console.log(`    ✅ ${key} 数据正常:`, arr)
        }
      })
      
      // 最终数据验证
      const hasInvalidData = (
        !instrumentData.time_points.length ||
        Object.keys(instrumentData.composition).length === 0 ||
        hasNaN
      )
      
      if (hasInvalidData) {
        // 提供友好的检查提示
        let warningMsg = 'Please check: '
        const checks = []
        if (!instrumentData.time_points.length) {
          checks.push('HPLC Gradient configuration')
        }
        if (Object.keys(instrumentData.composition).length === 0) {
          checks.push('Mobile Phase A/B reagent setup')
        }
        if (hasNaN) {
          checks.push('numeric values (found invalid data)')
        }
        warningMsg += checks.join(', ')
        
        if (!silent) message.warning(warningMsg)
        console.error('❌ 数据验证失败')
        console.error('❌ 数据验证失败')
        console.error('  详细信息:', {
          hasTimePoints: !!instrumentData.time_points.length,
          hasComposition: Object.keys(instrumentData.composition).length > 0,
          hasNaN: hasNaN
        })
        setIsCalculatingScore(false)
        return
      }
      
      console.log('✅ 数据验证通过')

      // 10. 调用后端API
      console.log('🌐 调用后端API: /api/v1/scoring/full-score')
      console.log('📦 请求数据:', JSON.stringify(requestData, null, 2))
      const response = await api.calculateFullScore(requestData)
      
      if (response.data.success) {
        setScoreResults(response.data.data)
        if (!silent) message.success('Scoring calculation completed successfully!')
        
        // 详细日志输出
        console.log('✅ 评分计算成功！完整结果:', response.data.data)
        console.log('📊 小因子得分 (merged.sub_factors):', response.data.data.merged.sub_factors)
        console.log('🎯 最终总分 (Score₃):', response.data.data.final.score3)
        console.log('🔬 仪器阶段 (Score₁):', response.data.data.instrument.score1)
        console.log('🧪 前处理阶段 (Score₂):', response.data.data.preparation.score2)
        
        // 保存评分结果到StorageHelper
        await StorageHelper.setJSON(STORAGE_KEYS.SCORE_RESULTS, response.data.data)
        console.log('💾 MethodsPage: 评分结果已保存到 SCORE_RESULTS')
        
        // 触发GraphPage更新
        console.log('🔔 MethodsPage: 触发 scoreDataUpdated 事件')
        window.dispatchEvent(new CustomEvent('scoreDataUpdated'))
      } else {
        if (!silent) message.error('Scoring calculation failed: ' + response.data.message)
      }
    } catch (error: any) {
      console.error('评分计算错误:', error)
      console.error('错误详情:', error.response?.data)
      
      // 更好的错误信息显示
      let errorMessage = '评分计算失败'
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage += ': ' + error.response.data.detail
        } else if (Array.isArray(error.response.data.detail)) {
          // Pydantic validation errors
          const errors = error.response.data.detail.map((e: any) => 
            `${e.loc.join('.')}: ${e.msg}`
          ).join('; ')
          errorMessage += ': ' + errors
        } else {
          errorMessage += ': ' + JSON.stringify(error.response.data.detail)
        }
      } else if (error.message) {
        errorMessage += ': ' + error.message
      }
      
      if (!silent) message.error(errorMessage, 8) // 显示8秒
    } finally {
      setIsCalculatingScore(false)
    }
  }

  // 自动计算评分（数据变化时触发）
  useEffect(() => {
    // Skip on initial mount
    if (!isAutoCalcInitialized.current) {
      console.log('⏭️ 自动计算: 跳过初始挂载')
      isAutoCalcInitialized.current = true
      return
    }
    
    // ⚠️ 如果数据正在加载中，跳过自动计算（等数据加载完成后再触发）
    if (isDataLoading) {
      console.log('⏭️ 自动计算: 数据加载中，跳过')
      return
    }
    
    console.log('🔄 自动计算: 数据已变化，准备计算评分')
    
    // 立即执行自动计算
    ;(async () => {
      // 检查必要数据
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      const factors = await StorageHelper.getJSON<any[]>(STORAGE_KEYS.FACTORS)
      
      if (gradientData && factors && factors.length > 0) {
        console.log('✅ 自动计算: 数据完整，开始调用后端API')
        try {
          await calculateFullScoreAPI({ silent: true })
          console.log('✅ 自动计算: 评分计算完成')
        } catch (error) {
          console.error('❌ 自动计算失败:', error)
        }
      } else {
        console.log('⚠️ 自动计算: 跳过（缺少梯度或因子数据）')
      }
    })()
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // 监听所有可能影响评分的数据
    safetyScheme,
    healthScheme,
    environmentScheme,
    stageScheme,
    finalScheme,
    mobilePhaseA,
    mobilePhaseB,
    preTreatmentReagents,
    sampleCount,
    gradientCalculations,
    instrumentEnergy,
    pretreatmentEnergy
  ])

  // 监听Storage变化事件（当Factors页面更新数据时触发）
  useEffect(() => {
    const handleStorageChange = async (event: CustomEvent) => {
      if (event.detail?.key === STORAGE_KEYS.FACTORS) {
        console.log('📦 检测到Factors数据更新，重新加载并自动计算...')
        
        // 重新加载factors数据
        try {
          const factors = await StorageHelper.getJSON<any[]>(STORAGE_KEYS.FACTORS)
          if (factors && factors.length > 0) {
            setFactorsData(factors)
            
            // 提取试剂名称
            const reagentNames = Array.from(
              new Set(factors.map((f: any) => f.name).filter((n: string) => n && n.trim()))
            ).sort()
            setAvailableReagents(reagentNames as string[])
            
            // 延迟触发自动计算，确保状态已更新
            setTimeout(() => {
              calculateFullScoreAPI()
            }, 500)
          }
        } catch (error) {
          console.error('❌ 重新加载Factors数据失败:', error)
        }
      }
    }
    
    // 监听来自 Results 页面的重新计算请求
    const handleRecalculationRequest = () => {
      console.log('📊 MethodsPage: 收到重新计算评分请求')
      // 直接调用函数
      calculateFullScoreAPI({ silent: true })
    }

    window.addEventListener('storageUpdated' as any, handleStorageChange)
    window.addEventListener('requestScoreRecalculation' as any, handleRecalculationRequest)
    
    return () => {
      window.removeEventListener('storageUpdated' as any, handleStorageChange)
      window.removeEventListener('requestScoreRecalculation' as any, handleRecalculationRequest)
    }
  }, [])
  
  // 确认提交
  const handleConfirm = async () => {
    // 验证试剂名称
    const allReagents = [...preTreatmentReagents, ...mobilePhaseA, ...mobilePhaseB]
    if (allReagents.some(r => !r.name)) {
      message.error('Please select all reagents')
      return
    }

    // Validate Sample PreTreatment volumes
    const hasInvalidVolume = preTreatmentReagents.some(r => r.volume < 0)
    if (hasInvalidVolume) {
      message.error('Sample PreTreatment volumes cannot be negative')
      return
    }

    // Validate Mobile Phase percentages
    if (!validatePercentage(mobilePhaseA)) {
      message.error('Mobile Phase A percentage sum must be 100%')
      return
    }
    if (!validatePercentage(mobilePhaseB)) {
      message.error('Mobile Phase B percentage sum must be 100%')
      return
    }

    // 准备后续计算所需的数据结构
    const methodsData = {
      // 基础信息
      sampleCount: sampleCount,
      timestamp: new Date().toISOString(),
      
      // Sample PreTreatment 数据（直接使用体积，用于后续计算）
      preTreatment: {
        reagents: preTreatmentReagents.map(r => ({
          reagentName: r.name,
          volume: r.volume  // 体积(ml)
        })),
        totalVolume: calculateTotalVolume(preTreatmentReagents)
      },
      
      // Mobile Phase A 数据（用于后续计算）
      mobilePhaseA: {
        reagents: mobilePhaseA.map(r => ({
          reagentName: r.name,
          percentage: r.percentage,
          ratio: r.percentage / 100
        })),
        totalPercentage: calculateTotal(mobilePhaseA)
      },
      
      // Mobile Phase B 数据（用于后续计算）
      mobilePhaseB: {
        reagents: mobilePhaseB.map(r => ({
          reagentName: r.name,
          percentage: r.percentage,
          ratio: r.percentage / 100
        })),
        totalPercentage: calculateTotal(mobilePhaseB)
      },
      
      // 计算参数（预留给后续使用）
      calculationParams: {
        preTreatmentVolume: 0, // 将在后续计算中填充
        phaseAVolume: 0,
        phaseBVolume: 0,
        totalVolume: 0,
        gradientSteps: [] // 梯度步骤
      }
    }

    // 过滤掉空的试剂条目
    const validPreTreatmentReagents = preTreatmentReagents.filter(r => r.name && r.name.trim() && r.volume > 0)
    const validMobilePhaseA = mobilePhaseA.filter(r => r.name && r.name.trim() && r.percentage > 0)
    const validMobilePhaseB = mobilePhaseB.filter(r => r.name && r.name.trim() && r.percentage > 0)
    
    // 🎯 读取现有数据，保留weightSchemes和customWeights
    const existingData = await StorageHelper.getJSON<any>(STORAGE_KEYS.METHODS) || {}
    
    // 保存到StorageHelper（供后续模块使用）
    await StorageHelper.setJSON(STORAGE_KEYS.METHODS, {
      ...existingData,
      sampleCount,
      preTreatmentReagents: validPreTreatmentReagents,
      mobilePhaseA: validMobilePhaseA,
      mobilePhaseB: validMobilePhaseB,
      instrumentEnergy,
      pretreatmentEnergy,
      // 🎯 保留权重方案和自定义权重
      weightSchemes: {
        ...existingData.weightSchemes,
        safetyScheme,
        healthScheme,
        environmentScheme,
        instrumentStageScheme: stageScheme,
        prepStageScheme: stageScheme,
        finalScheme,
        customWeights: customWeights
      }
    })

    // 更新 Context
    updateMethodsData({
      sampleCount,
      preTreatmentReagents: validPreTreatmentReagents,
      mobilePhaseA: validMobilePhaseA,
      mobilePhaseB: validMobilePhaseB,
      instrumentEnergy,
      pretreatmentEnergy
    })
    setIsDirty(true)

    message.success('Data saved, navigating to HPLC Gradient Program')
    
    // 触发自定义事件，通知其他组件数据已更新
    window.dispatchEvent(new CustomEvent('methodsDataUpdated', { detail: {
      sampleCount,
      preTreatmentReagents: validPreTreatmentReagents,
      mobilePhaseA: validMobilePhaseA,
      mobilePhaseB: validMobilePhaseB,
      instrumentEnergy,
      pretreatmentEnergy
    } }))
    
    // 跳转到下一页
    navigate('/hplc-gradient')
  }

  // 渲染 Sample PreTreatment 试剂组(使用体积)
  const renderPreTreatmentGroup = () => {
    const totalVolume = calculateTotalVolume(preTreatmentReagents)
    
    console.log('🎨 renderPreTreatmentGroup - availableReagents:', availableReagents.length, availableReagents)
    
    return (
      <div className="reagent-section">
        <Title level={4}>Sample PreTreatment</Title>
        {preTreatmentReagents.map((reagent) => (
          <Row gutter={8} key={reagent.id} style={{ marginBottom: 12 }}>
            <Col span={15}>
              <Select
                key={`pretreatment-select-${reagent.id}`}
                style={{ width: '100%' }}
                placeholder="Select reagent"
                value={reagent.name || null}
                onChange={(value) => updateReagent('preTreatment', reagent.id, 'name', value)}
                showSearch
                allowClear
                filterOption={selectFilterOption}
                notFoundContent={`No reagent found (available: ${availableReagents.length})`}
                optionFilterProp="children"
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              >
                {availableReagents.map((name) => (
                  <Option key={name} value={name}>{name}</Option>
                ))}
              </Select>
            </Col>
            <Col span={9}>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.1}
                placeholder="0.0"
                value={reagent.volume}
                onChange={(value) => updateReagent('preTreatment', reagent.id, 'volume', value || 0)}
                addonAfter="ml"
              />
            </Col>
          </Row>
        ))}
        
        <Row gutter={8} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Button
              type="dashed"
              onClick={() => addReagent('preTreatment')}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Add
            </Button>
          </Col>
          <Col span={12}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteLastReagent('preTreatment')}
              disabled={preTreatmentReagents.length <= 1}
              style={{ width: '100%' }}
            >
              Delete
            </Button>
          </Col>
        </Row>
        
        <div style={{ marginTop: 12, color: '#52c41a', fontWeight: 500, fontSize: 14 }}>
          Total Volume: {totalVolume.toFixed(1)} ml
        </div>
      </div>
    )
  }

  // 渲染 Mobile Phase 试剂组(使用百分比)
  const renderReagentGroup = (
    title: string,
    reagents: Reagent[],
    type: 'phaseA' | 'phaseB'
  ) => {
    const total = calculateTotal(reagents)
    
    return (
      <div className="reagent-section">
        <Title level={4}>{title}</Title>
        {reagents.map((reagent) => (
          <Row gutter={8} key={reagent.id} style={{ marginBottom: 12 }}>
            <Col span={15}>
              <Select
                key={`${type}-select-${reagent.id}`}
                style={{ width: '100%' }}
                placeholder="Select reagent"
                value={reagent.name || null}
                onChange={(value) => updateReagent(type, reagent.id, 'name', value)}
                showSearch
                allowClear
                filterOption={selectFilterOption}
                notFoundContent="No reagent found"
                optionFilterProp="children"
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              >
                {availableReagents.map((name) => (
                  <Option key={name} value={name}>{name}</Option>
                ))}
              </Select>
            </Col>
            <Col span={9}>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                step={0.1}
                placeholder="0.0"
                value={reagent.percentage}
                onChange={(value) => updateReagent(type, reagent.id, 'percentage', value || 0)}
                addonAfter="%"
              />
            </Col>
          </Row>
        ))}
        
        <Row gutter={8} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Button
              type="dashed"
              onClick={() => addReagent(type)}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Add
            </Button>
          </Col>
          <Col span={12}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteLastReagent(type)}
              disabled={reagents.length <= 1}
              style={{ width: '100%' }}
            >
              Delete
            </Button>
          </Col>
        </Row>
        
        <div style={{ marginTop: 12, ...getPercentageStyle(total) }}>
          Current Total: {total.toFixed(1)}%
          {Math.abs(total - 100) >= 0.01 && (
            <span style={{ marginLeft: 8, fontSize: 12 }}>
              (Must be 100%)
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="methods-page">
      <Title level={2}>Methods</Title>

      {/* 绿色化学评分系统配置 */}
      <Card 
        title={
          <span>
            <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
            Green Chemistry Scoring System Configuration (0-100 Scale)
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        {/* 能耗配置 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Instrument Analysis Energy (kWh) <Tooltip title="P Factor Formula: When E<1.5, P=100×(E/1.5)^0.235; When E≥1.5, P=100"><QuestionCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} /></Tooltip></div>
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={4} value={instrumentEnergy} onChange={(value) => setInstrumentEnergy(value || 0)} placeholder="Instrument Energy" />
            <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>Current P Factor Score: {calculatePowerScore(instrumentEnergy).toFixed(2)}</div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Pretreatment Energy (kWh) <Tooltip title="Same P Factor Formula as above"><QuestionCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} /></Tooltip></div>
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={4} value={pretreatmentEnergy} onChange={(value) => setPretreatmentEnergy(value || 0)} placeholder="Pretreatment Energy" />
            <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>Current P Factor Score: {calculatePowerScore(pretreatmentEnergy).toFixed(2)}</div>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* 权重方案配置 - 竖向布局确保内容完整显示 */}
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
              Safety Factor (S) Weight Scheme <Tooltip title="S1-Release Potential, S2-Fire/Explosion, S3-Reaction/Decomposition, S4-Acute Toxicity"><QuestionCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} /></Tooltip>
              {safetyScheme === 'Custom' && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    setCustomWeightType('safety');
                    setCustomWeightModalVisible(true);
                  }}
                  style={{ padding: 0, marginLeft: 8, height: 'auto' }}
                >
                  ✏️ Edit
                </Button>
              )}
            </div>
            <Select style={{ width: '100%', marginBottom: 12 }} value={safetyScheme} onChange={(value) => { 
              console.log('⚖️ 安全因子权重方案变化:', safetyScheme, '->', value); 
              if (value === 'Custom') {
                setCustomWeightType('safety');
                setCustomWeightModalVisible(true);
                return;
              }
              setSafetyScheme(value); 
              calculateFullScoreAPI({ silent: true, overrides: { safetyScheme: value } });
              window.dispatchEvent(new CustomEvent('weightSchemeUpdated', { detail: { type: 'safety', scheme: value } }));
            }}>
              <Option value="PBT_Balanced">PBT Balanced (S1:0.25/S2:0.25/S3:0.25/S4:0.25)</Option>
              <Option value="Frontier_Focus">Frontier Focus (S1:0.10/S2:0.60/S3:0.15/S4:0.15)</Option>
              <Option value="Personnel_Exposure">Personnel Exposure (S1:0.10/S2:0.20/S3:0.20/S4:0.50)</Option>
              <Option value="Material_Transport">Material Transport (S1:0.50/S2:0.20/S3:0.20/S4:0.10)</Option>
              <Option value="Custom" style={{ color: '#1890ff', fontWeight: 'bold' }}>
                {customWeights.safety ? `🎯 Custom (S1:${customWeights.safety.S1?.toFixed(2)}/S2:${customWeights.safety.S2?.toFixed(2)}/S3:${customWeights.safety.S3?.toFixed(2)}/S4:${customWeights.safety.S4?.toFixed(2)})` : '🎯 Custom...'}
              </Option>
            </Select>
          </Col>

          <Col span={8}>
            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
              Health Factor (H) Weight Scheme <Tooltip title="H1-Chronic Toxicity, H2-Irritation"><QuestionCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} /></Tooltip>
              {healthScheme === 'Custom' && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    setCustomWeightType('health');
                    setCustomWeightModalVisible(true);
                  }}
                  style={{ padding: 0, marginLeft: 8, height: 'auto' }}
                >
                  ✏️ Edit
                </Button>
              )}
            </div>
            <Select style={{ width: '100%', marginBottom: 12 }} value={healthScheme} onChange={(value) => { 
              console.log('⚖️ Health Factor权重方案变化:', healthScheme, '->', value); 
              if (value === 'Custom') {
                setCustomWeightType('health');
                setCustomWeightModalVisible(true);
                return;
              }
              setHealthScheme(value); 
              calculateFullScoreAPI({ silent: true, overrides: { healthScheme: value } });
              window.dispatchEvent(new CustomEvent('weightSchemeUpdated', { detail: { type: 'health', scheme: value } }));
            }}>
              <Option value="Occupational_Exposure">Occupational Exposure (H1:0.70/H2:0.30)</Option>
              <Option value="Operation_Protection">Operation Protection (H1:0.30/H2:0.70)</Option>
              <Option value="Strict_Compliance">Strict Compliance (H1:0.90/H2:0.10)</Option>
              <Option value="Absolute_Balance">Absolute Balance (H1:0.50/H2:0.50)</Option>
              <Option value="Custom" style={{ color: '#1890ff', fontWeight: 'bold' }}>
                {customWeights.health ? `🎯 Custom (H1:${customWeights.health.H1?.toFixed(2)}/H2:${customWeights.health.H2?.toFixed(2)})` : '🎯 Custom...'}
              </Option>
            </Select>

            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
              Environmental Factor (E) Weight Scheme <Tooltip title="E1-Persistence, E2-Emissions, E3-Aquatic Hazards"><QuestionCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} /></Tooltip>
              {environmentScheme === 'Custom' && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    setCustomWeightType('environment');
                    setCustomWeightModalVisible(true);
                  }}
                  style={{ padding: 0, marginLeft: 8, height: 'auto' }}
                >
                  ✏️ Edit
                </Button>
              )}
            </div>
            <Select style={{ width: '100%', marginBottom: 12 }} value={environmentScheme} onChange={(value) => { 
              console.log('⚖️ Environmental Factor权重方案变化:', environmentScheme, '->', value); 
              if (value === 'Custom') {
                setCustomWeightType('environment');
                setCustomWeightModalVisible(true);
                return;
              }
              setEnvironmentScheme(value); 
              calculateFullScoreAPI({ silent: true, overrides: { environmentScheme: value } });
              window.dispatchEvent(new CustomEvent('weightSchemeUpdated', { detail: { type: 'environment', scheme: value } }));
            }}>
              <Option value="PBT_Balanced">PBT Balanced (E1:0.334/E2:0.333/E3:0.333)</Option>
              <Option value="Emission_Compliance">Emission Compliance (E1:0.10/E2:0.80/E3:0.10)</Option>
              <Option value="Deep_Impact">Deep Impact (E1:0.10/E2:0.10/E3:0.80)</Option>
              <Option value="Degradation_Priority">Degradation Priority (E1:0.70/E2:0.15/E3:0.15)</Option>
              <Option value="Custom" style={{ color: '#1890ff', fontWeight: 'bold' }}>
                {customWeights.environment ? `🎯 Custom (E1:${customWeights.environment.E1?.toFixed(2)}/E2:${customWeights.environment.E2?.toFixed(2)}/E3:${customWeights.environment.E3?.toFixed(2)})` : '🎯 Custom...'}
              </Option>
            </Select>
          </Col>

          <Col span={8}>
            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
              Stage Weight Scheme (6 Factors) <Tooltip title="Unified weight scheme for both Instrument and Sample Prep stages. Contains 6 factors: S/H/E/R/D/P"><QuestionCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} /></Tooltip>
              {stageScheme === 'Custom' && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    setCustomWeightType('stage');
                    setCustomWeightModalVisible(true);
                  }}
                  style={{ padding: 0, marginLeft: 8, height: 'auto' }}
                >
                  ✏️ Edit
                </Button>
              )}
            </div>
            <Select style={{ width: '100%', marginBottom: 12 }} value={stageScheme} onChange={(value) => { 
              console.log('⚖️ Stage权重方案变化:', stageScheme, '->', value); 
              if (value === 'Custom') {
                setCustomWeightType('stage');
                setCustomWeightModalVisible(true);
                return;
              }
              setStageScheme(value); 
              calculateFullScoreAPI({ silent: true, overrides: { stageScheme: value } });
              window.dispatchEvent(new CustomEvent('weightSchemeUpdated', { detail: { type: 'stage', scheme: value } }));
            }}>
              <Option value="Balanced">Balanced (S:0.18 H:0.18 E:0.18 R:0.18 D:0.18 P:0.10)</Option>
              <Option value="Safety_First">Safety First (S:0.30 H:0.30 E:0.10 R:0.10 D:0.10 P:0.10)</Option>
              <Option value="Eco_Friendly">Eco-Friendly (S:0.10 H:0.10 E:0.30 P:0.10 R:0.25 D:0.15)</Option>
              <Option value="Energy_Efficient">Energy Efficient (S:0.10 H:0.10 E:0.15 P:0.40 R:0.15 D:0.10)</Option>
              <Option value="Custom" style={{ color: '#1890ff', fontWeight: 'bold' }}>
                {customWeights.stage ? `🎯 Custom (S:${customWeights.stage.S?.toFixed(2)} H:${customWeights.stage.H?.toFixed(2)} E:${customWeights.stage.E?.toFixed(2)} R:${customWeights.stage.R?.toFixed(2)} D:${customWeights.stage.D?.toFixed(2)} P:${customWeights.stage.P?.toFixed(2)})` : '🎯 Custom...'}
              </Option>
            </Select>

            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>
              Final Summary Weight Scheme <Tooltip title="Weight allocation between Instrument Analysis and Sample Preparation"><QuestionCircleOutlined style={{ marginLeft: 4, color: '#1890ff' }} /></Tooltip>
              {finalScheme === 'Custom' && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => {
                    setCustomWeightType('final');
                    setCustomWeightModalVisible(true);
                  }}
                  style={{ padding: 0, marginLeft: 8, height: 'auto' }}
                >
                  ✏️ Edit
                </Button>
              )}
            </div>
            <Select style={{ width: '100%' }} value={finalScheme} onChange={(value) => { 
              console.log('⚖️ 最终汇总权重方案变化:', finalScheme, '->', value); 
              if (value === 'Custom') {
                setCustomWeightType('final');
                setCustomWeightModalVisible(true);
                return;
              }
              setFinalScheme(value); 
              calculateFullScoreAPI({ silent: true, overrides: { finalScheme: value } });
              window.dispatchEvent(new CustomEvent('weightSchemeUpdated', { detail: { type: 'final', scheme: value } }));
            }}>
              <Option value="Direct_Online">Direct Injection (Instrument:0.8 Prep:0.2)</Option>
              <Option value="Standard">Standard (Instrument:0.6 Prep:0.4)</Option>
              <Option value="Equal">Equal Weight (Instrument:0.5 Prep:0.5)</Option>
              <Option value="Complex_Prep">Complex Prep (Instrument:0.3 Prep:0.7)</Option>
              <Option value="Custom" style={{ color: '#1890ff', fontWeight: 'bold' }}>
                {customWeights.final ? `🎯 Custom (Inst:${customWeights.final.instrument?.toFixed(2)} Prep:${customWeights.final.preparation?.toFixed(2)})` : '🎯 Custom...'}
              </Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 三个试剂部分 */}
      <Row gutter={16} style={{ marginLeft: 0, marginRight: 0 }}>
        <Col span={8}>
          <Card className="phase-card">
            {renderPreTreatmentGroup()}
            <div className="vine-divider vine-left"></div>
            <div className="chart-placeholder">
              {/* Sample PreTreatment 柱状图 */}
              {(() => {
                const chartData = preTreatmentChartData
                if (chartData.length === 0) {
                  return (
                    <div style={{ height: 300, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                      Please enter reagent name and volume to view chart
                    </div>
                  )
                }
                
                const needsScroll = chartData.length > 2  // 改为超过2个才滚动
                const chartWidth = needsScroll ? chartData.length * 200 : '100%'  // 每个试剂200px宽
                
                // 计算自动最大值
                const autoMax = Math.max(...chartData.flatMap(d => [d.S, d.H, d.E, d.R, d.D]))
                const currentMax = preTreatmentYMax !== null ? preTreatmentYMax : autoMax
                
                return (
                  <div className="chart-container">
                    {/* Y轴控制区 */}
                    <div className="y-axis-control">
                      <span>Y-axis Range: 0 - {currentMax.toFixed(2)}</span>
                      <input
                        type="range"
                        className="y-axis-slider"
                        min="0.01"
                        max={Math.max(autoMax * 2, 1)}
                        step="0.01"
                        value={currentMax}
                        onChange={(e) => setPreTreatmentYMax(parseFloat(e.target.value))}
                        title="Drag to adjust Y-axis range"
                      />
                      <button className="y-axis-reset-btn" onClick={() => setPreTreatmentYMax(null)}>
                        Auto
                      </button>
                    </div>
                    
                    {/* 图表区域 - 使用flex布局分离Y轴和柱状图 */}
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      {/* 固定的Y轴区域 */}
                      <div style={{ 
                        width: 60, 
                        flexShrink: 0,
                        position: 'relative',
                        paddingTop: 20,
                        paddingBottom: 5
                      }}>
                        {/* Y轴刻度 */}
                        <div style={{ 
                          height: 240,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          paddingRight: 8,
                          fontSize: 10,
                          color: '#666'
                        }}>
                          <span>{currentMax.toFixed(1)}</span>
                          <span>{(currentMax * 0.75).toFixed(1)}</span>
                          <span>{(currentMax * 0.5).toFixed(1)}</span>
                          <span>{(currentMax * 0.25).toFixed(1)}</span>
                          <span>0</span>
                        </div>
                        {/* Y轴标签 */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%) rotate(-90deg)',
                          fontSize: 12,
                          color: '#666',
                          whiteSpace: 'nowrap'
                        }}>
                          Score
                        </div>
                      </div>
                      
                      {/* 可滚动的柱状图和X轴标签区域 */}
                      <div style={{ 
                        flex: 1,
                        overflowX: needsScroll ? 'auto' : 'hidden',
                        overflowY: 'hidden'
                      }} className="chart-scroll-area">
                        <div style={{ width: needsScroll ? chartWidth : '100%', minWidth: '100%' }}>
                          {/* 图表主体 - 隐藏Y轴 */}
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="reagent" hide />
                              <YAxis hide domain={[0, currentMax]} allowDataOverflow={true} type="number" />
                              <RechartsTooltip 
                                contentStyle={{ fontSize: 12 }}
                                formatter={(value: any) => value.toFixed(4)}
                              />
                              <Bar dataKey="S" fill="#8884d8" name="Safety (S)" />
                              <Bar dataKey="H" fill="#82ca9d" name="Health Hazard (H)" />
                              <Bar dataKey="E" fill="#ffc658" name="Environmental Impact (E)" />
                              <Bar dataKey="R" fill="#ff8042" name="Recyclability (R)" />
                              <Bar dataKey="D" fill="#a4de6c" name="Disposal Difficulty (D)" />
                            </BarChart>
                          </ResponsiveContainer>
                          
                          {/* X轴标签 - 和图表一起滚动 */}
                          <div style={{ 
                            display: 'flex',
                            height: 70,
                            alignItems: 'flex-start',
                            paddingTop: 8,
                            borderTop: '1px solid #e0e0e0'
                          }}>
                            {chartData.map((item, index) => (
                              <div
                                key={index}
                                style={{
                                  width: needsScroll ? 200 : `${100 / chartData.length}%`,
                                  textAlign: 'center',
                                  fontSize: 13,
                                  color: '#666',
                                  transform: 'rotate(-30deg)',
                                  transformOrigin: 'center top',
                                  whiteSpace: 'nowrap',
                                  marginTop: 20
                                }}
                              >
                                {item.reagent}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 固定Legend */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: 16, 
                      fontSize: 10,
                      paddingTop: 12,
                      marginTop: 8,
                      borderTop: '1px solid #f0f0f0'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#8884d8', display: 'inline-block', borderRadius: 2 }}></span>
                        Safety (S)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#82ca9d', display: 'inline-block', borderRadius: 2 }}></span>
                        Health Hazard (H)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ffc658', display: 'inline-block', borderRadius: 2 }}></span>
                        Environmental Impact (E)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ff8042', display: 'inline-block', borderRadius: 2 }}></span>
                        Recyclability (R)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#a4de6c', display: 'inline-block', borderRadius: 2 }}></span>
                        Disposal Difficulty (D)
                      </span>
                    </div>
                    {/* Note for zero-impact reagents */}
                    {chartData.some(d => d.S === 0 && d.H === 0 && d.E === 0 && d.R === 0 && d.D === 0) && (
                      <div style={{ 
                        fontSize: 11, 
                        color: '#999', 
                        textAlign: 'center', 
                        marginTop: 8,
                        fontStyle: 'italic'
                      }}>
                        Note: Reagents with zero environmental impact (e.g., CO2, Water) appear on X-axis but have no visible bars
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card className="phase-card">
            {renderReagentGroup('Mobile Phase A', mobilePhaseA, 'phaseA')}
            <div className="vine-divider vine-middle"></div>
            <div className="chart-placeholder">
              {/* Mobile Phase A 柱状图 - 需要 HPLC Gradient 数据 */}
              {(() => {
                const chartData = phaseAChartData
                
                // 🔥 检查是否是无效流速标记
                if (chartData === 'INVALID_FLOW_RATE') {
                  return (
                    <div style={{ 
                      height: 300, 
                      background: 'linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%)', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#ff4d4f',
                      padding: 20, 
                      textAlign: 'center',
                      border: '2px dashed #ff7875',
                      borderRadius: 8
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                        All Flow Rates are Zero!
                      </div>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                        Cannot calculate volume when all flow rates are 0 ml/min
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        Please go to <strong>Time Gradient Curve</strong> page<br/>
                        and set at least one step with flow rate &gt; 0
                      </div>
                    </div>
                  )
                }
                
                if (chartData.length === 0) {
                  return (
                    <div style={{ height: 300, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', padding: 20, textAlign: 'center' }}>
                      Please complete HPLC Gradient setup first<br/>Chart will be displayed after gradient calculation
                    </div>
                  )
                }
                
                const needsScroll = chartData.length > 2  // 改为超过2个才滚动
                const chartWidth = needsScroll ? chartData.length * 200 : '100%'  // 每个试剂200px宽
                
                // 计算自动最大值
                const autoMax = Math.max(...chartData.flatMap(d => [d.S, d.H, d.E, d.R, d.D]))
                const currentMax = phaseAYMax !== null ? phaseAYMax : autoMax
                
                return (
                  <div className="chart-container">
                    {/* Y轴控制区 */}
                    <div className="y-axis-control">
                      <span>Y-axis Range: 0 - {currentMax.toFixed(2)}</span>
                      <input
                        type="range"
                        className="y-axis-slider"
                        min="0.01"
                        max={Math.max(autoMax * 2, 1)}
                        step="0.01"
                        value={currentMax}
                        onChange={(e) => setPhaseAYMax(parseFloat(e.target.value))}
                        title="Drag to adjust Y-axis range"
                      />
                      <button className="y-axis-reset-btn" onClick={() => setPhaseAYMax(null)}>
                        Auto
                      </button>
                    </div>
                    
                    {/* 图表区域 - 使用flex布局分离Y轴和柱状图 */}
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      {/* 固定的Y轴区域 */}
                      <div style={{ 
                        width: 60, 
                        flexShrink: 0,
                        position: 'relative',
                        paddingTop: 20,
                        paddingBottom: 5
                      }}>
                        {/* Y轴刻度 */}
                        <div style={{ 
                          height: 240,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          paddingRight: 8,
                          fontSize: 10,
                          color: '#666'
                        }}>
                          <span>{currentMax.toFixed(1)}</span>
                          <span>{(currentMax * 0.75).toFixed(1)}</span>
                          <span>{(currentMax * 0.5).toFixed(1)}</span>
                          <span>{(currentMax * 0.25).toFixed(1)}</span>
                          <span>0</span>
                        </div>
                        {/* Y轴标签 */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%) rotate(-90deg)',
                          fontSize: 12,
                          color: '#666',
                          whiteSpace: 'nowrap'
                        }}>
                          Score
                        </div>
                      </div>
                      
                      {/* 可滚动的柱状图和X轴标签区域 */}
                      <div style={{ 
                        flex: 1,
                        overflowX: needsScroll ? 'auto' : 'hidden',
                        overflowY: 'hidden'
                      }} className="chart-scroll-area">
                        <div style={{ width: needsScroll ? chartWidth : '100%', minWidth: '100%' }}>
                          {/* 图表主体 - 隐藏Y轴 */}
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="reagent" hide />
                              <YAxis hide domain={[0, currentMax]} allowDataOverflow={true} type="number" />
                              <RechartsTooltip 
                                contentStyle={{ fontSize: 12 }}
                                formatter={(value: any) => value.toFixed(4)}
                              />
                              <Bar dataKey="S" fill="#8884d8" name="Safety (S)" />
                              <Bar dataKey="H" fill="#82ca9d" name="Health Hazard (H)" />
                              <Bar dataKey="E" fill="#ffc658" name="Environmental Impact (E)" />
                              <Bar dataKey="R" fill="#ff8042" name="Recyclability (R)" />
                              <Bar dataKey="D" fill="#a4de6c" name="Disposal Difficulty (D)" />
                            </BarChart>
                          </ResponsiveContainer>
                          
                          {/* X轴标签 - 和图表一起滚动 */}
                          <div style={{ 
                            display: 'flex',
                            height: 70,
                            alignItems: 'flex-start',
                            paddingTop: 8,
                            borderTop: '1px solid #e0e0e0'
                          }}>
                            {chartData.map((item, index) => (
                              <div
                                key={index}
                                style={{
                                  width: needsScroll ? 200 : `${100 / chartData.length}%`,
                                  textAlign: 'center',
                                  fontSize: 13,
                                  color: '#666',
                                  transform: 'rotate(-30deg)',
                                  transformOrigin: 'center top',
                                  whiteSpace: 'nowrap',
                                  marginTop: 20
                                }}
                              >
                                {item.reagent}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 固定Legend */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: 16, 
                      fontSize: 10,
                      paddingTop: 12,
                      marginTop: 8,
                      borderTop: '1px solid #f0f0f0'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#8884d8', display: 'inline-block', borderRadius: 2 }}></span>
                        Safety (S)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#82ca9d', display: 'inline-block', borderRadius: 2 }}></span>
                        Health Hazard (H)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ffc658', display: 'inline-block', borderRadius: 2 }}></span>
                        Environmental Impact (E)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ff8042', display: 'inline-block', borderRadius: 2 }}></span>
                        Recyclability (R)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#a4de6c', display: 'inline-block', borderRadius: 2 }}></span>
                        Disposal Difficulty (D)
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card className="phase-card">
            {renderReagentGroup('Mobile Phase B', mobilePhaseB, 'phaseB')}
            <div className="vine-divider vine-right"></div>
            <div className="chart-placeholder">
              {/* Mobile Phase B 柱状图 - 需要 HPLC Gradient 数据 */}
              {(() => {
                const chartData = phaseBChartData
                
                // 🔥 检查是否是无效流速标记
                if (chartData === 'INVALID_FLOW_RATE') {
                  return (
                    <div style={{ 
                      height: 300, 
                      background: 'linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%)', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#ff4d4f',
                      padding: 20, 
                      textAlign: 'center',
                      border: '2px dashed #ff7875',
                      borderRadius: 8
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                        All Flow Rates are Zero!
                      </div>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                        Cannot calculate volume when all flow rates are 0 ml/min
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        Please go to <strong>Time Gradient Curve</strong> page<br/>
                        and set at least one step with flow rate &gt; 0
                      </div>
                    </div>
                  )
                }
                
                if (chartData.length === 0) {
                  return (
                    <div style={{ height: 300, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', padding: 20, textAlign: 'center' }}>
                      Please complete HPLC Gradient setup first<br/>Chart will be displayed after gradient calculation
                    </div>
                  )
                }
                
                const needsScroll = chartData.length > 2  // 改为超过2个才滚动
                const chartWidth = needsScroll ? chartData.length * 200 : '100%'  // 每个试剂200px宽
                
                // 计算自动最大值
                const autoMax = Math.max(...chartData.flatMap(d => [d.S, d.H, d.E, d.R, d.D]))
                const currentMax = phaseBYMax !== null ? phaseBYMax : autoMax
                
                return (
                  <div className="chart-container">
                    {/* Y轴控制区 */}
                    <div className="y-axis-control">
                      <span>Y-axis Range: 0 - {currentMax.toFixed(2)}</span>
                      <input
                        type="range"
                        className="y-axis-slider"
                        min="0.01"
                        max={Math.max(autoMax * 2, 1)}
                        step="0.01"
                        value={currentMax}
                        onChange={(e) => setPhaseBYMax(parseFloat(e.target.value))}
                        title="Drag to adjust Y-axis range"
                      />
                      <button className="y-axis-reset-btn" onClick={() => setPhaseBYMax(null)}>
                        Auto
                      </button>
                    </div>
                    
                    {/* 图表区域 - 使用flex布局分离Y轴和柱状图 */}
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      {/* 固定的Y轴区域 */}
                      <div style={{ 
                        width: 60, 
                        flexShrink: 0,
                        position: 'relative',
                        paddingTop: 20,
                        paddingBottom: 5
                      }}>
                        {/* Y轴刻度 */}
                        <div style={{ 
                          height: 240,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          paddingRight: 8,
                          fontSize: 10,
                          color: '#666'
                        }}>
                          <span>{currentMax.toFixed(1)}</span>
                          <span>{(currentMax * 0.75).toFixed(1)}</span>
                          <span>{(currentMax * 0.5).toFixed(1)}</span>
                          <span>{(currentMax * 0.25).toFixed(1)}</span>
                          <span>0</span>
                        </div>
                        {/* Y轴标签 */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%) rotate(-90deg)',
                          fontSize: 12,
                          color: '#666',
                          whiteSpace: 'nowrap'
                        }}>
                          Score
                        </div>
                      </div>
                      
                      {/* 可滚动的柱状图和X轴标签区域 */}
                      <div style={{ 
                        flex: 1,
                        overflowX: needsScroll ? 'auto' : 'hidden',
                        overflowY: 'hidden'
                      }} className="chart-scroll-area">
                        <div style={{ width: needsScroll ? chartWidth : '100%', minWidth: '100%' }}>
                          {/* 图表主体 - 隐藏Y轴 */}
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="reagent" hide />
                              <YAxis hide domain={[0, currentMax]} allowDataOverflow={true} type="number" />
                              <RechartsTooltip 
                                contentStyle={{ fontSize: 12 }}
                                formatter={(value: any) => value.toFixed(4)}
                              />
                              <Bar dataKey="S" fill="#8884d8" name="Safety (S)" />
                              <Bar dataKey="H" fill="#82ca9d" name="Health Hazard (H)" />
                              <Bar dataKey="E" fill="#ffc658" name="Environmental Impact (E)" />
                              <Bar dataKey="R" fill="#ff8042" name="Recyclability (R)" />
                              <Bar dataKey="D" fill="#a4de6c" name="Disposal Difficulty (D)" />
                            </BarChart>
                          </ResponsiveContainer>
                          
                          {/* X轴标签 - 和图表一起滚动 */}
                          <div style={{ 
                            display: 'flex',
                            height: 70,
                            alignItems: 'flex-start',
                            paddingTop: 8,
                            borderTop: '1px solid #e0e0e0'
                          }}>
                            {chartData.map((item, index) => (
                              <div
                                key={index}
                                style={{
                                  width: needsScroll ? 200 : `${100 / chartData.length}%`,
                                  textAlign: 'center',
                                  fontSize: 13,
                                  color: '#666',
                                  transform: 'rotate(-30deg)',
                                  transformOrigin: 'center top',
                                  whiteSpace: 'nowrap',
                                  marginTop: 20
                                }}
                              >
                                {item.reagent}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 固定Legend */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: 16, 
                      fontSize: 10,
                      paddingTop: 12,
                      marginTop: 8,
                      borderTop: '1px solid #f0f0f0'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#8884d8', display: 'inline-block', borderRadius: 2 }}></span>
                        Safety (S)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#82ca9d', display: 'inline-block', borderRadius: 2 }}></span>
                        Health Hazard (H)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ffc658', display: 'inline-block', borderRadius: 2 }}></span>
                        Environmental Impact (E)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ff8042', display: 'inline-block', borderRadius: 2 }}></span>
                        Recyclability (R)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#a4de6c', display: 'inline-block', borderRadius: 2 }}></span>
                        Disposal Difficulty (D)
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </Card>
        </Col>
      </Row>

          {/* 确认按钮 */}
      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Button type="primary" size="large" onClick={handleConfirm}>
          Confirm
        </Button>
      </div>

      {/* Custom Weight Modal */}
      <CustomWeightModal
        visible={customWeightModalVisible}
        type={customWeightType}
        initialValues={customWeights[customWeightType]}
        onCancel={() => {
          setCustomWeightModalVisible(false);
        }}
        onConfirm={async (weights) => {
          console.log('🎯 [Custom Weights] 开始保存自定义权重:', weights);
          
          // 更新自定义权重
          const newCustomWeights = {
            ...customWeights,
            [customWeightType]: weights
          };
          console.log('🎯 [Custom Weights] 新的customWeights对象:', newCustomWeights);
          setCustomWeights(newCustomWeights);
          
          // 更新对应的scheme为Custom
          let newScheme = '';
          switch (customWeightType) {
            case 'safety':
              setSafetyScheme('Custom');
              newScheme = 'safetyScheme';
              break;
            case 'health':
              setHealthScheme('Custom');
              newScheme = 'healthScheme';
              break;
            case 'environment':
              setEnvironmentScheme('Custom');
              newScheme = 'environmentScheme';
              break;
            case 'stage':
              setStageScheme('Custom');
              newScheme = 'instrumentStageScheme';
              break;
            case 'final':
              setFinalScheme('Custom');
              newScheme = 'finalScheme';
              break;
          }
          
          console.log(`🎯 [Custom Weights] 更新scheme字段: ${newScheme} = Custom`);
          
          // 🎯 立即保存到storage，防止刷新丢失
          try {
            console.log('🎯 [Custom Weights] 读取当前METHODS数据...');
            const currentMethodsData = await StorageHelper.getJSON<any>(STORAGE_KEYS.METHODS) || {};
            console.log('🎯 [Custom Weights] 当前METHODS数据:', currentMethodsData);
            
            const updatedWeightSchemes = {
              ...currentMethodsData.weightSchemes,
              [newScheme]: 'Custom',
              customWeights: newCustomWeights
            };
            console.log('🎯 [Custom Weights] 更新后的weightSchemes:', updatedWeightSchemes);
            
            const dataToSave = {
              ...currentMethodsData,
              weightSchemes: updatedWeightSchemes
            };
            console.log('🎯 [Custom Weights] 准备保存的完整数据:', dataToSave);
            
            await StorageHelper.setJSON(STORAGE_KEYS.METHODS, dataToSave);
            console.log('✅ [Custom Weights] Custom weights已保存到storage!');
            
            // 验证保存是否成功
            const verifyData = await StorageHelper.getJSON<any>(STORAGE_KEYS.METHODS);
            console.log('🔍 [Custom Weights] 验证保存结果:', verifyData?.weightSchemes?.customWeights);
            
          } catch (error) {
            console.error('❌ [Custom Weights] 保存失败:', error);
            message.error('Failed to save custom weights!');
          }
          
          setCustomWeightModalVisible(false);
          
          // 重新计算评分
          calculateFullScoreAPI({ 
            silent: true, 
            overrides: { 
              [`${customWeightType}Scheme`]: 'Custom',
              customWeights: newCustomWeights
            } 
          });
          
          message.success(`Custom ${customWeightType} weights applied successfully!`);
        }}
      />
    </div>
  )
}

export default MethodsPage
