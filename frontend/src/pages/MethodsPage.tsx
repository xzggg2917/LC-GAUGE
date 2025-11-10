import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Card, Typography, InputNumber, Select, Button, Row, Col, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppContext } from '../contexts/AppContext'
import type { Reagent, PreTreatmentReagent, ReagentFactor } from '../contexts/AppContext'
import './MethodsPage.css'

const { Title } = Typography
const { Option } = Select

const MethodsPage: React.FC = () => {
  const navigate = useNavigate()
  const { data, updateMethodsData, setIsDirty } = useAppContext()
  
  // 使用Context中的数据初始化本地状态
  const [sampleCount, setSampleCount] = useState<number | null>(data.methods.sampleCount)
  const [sampleCountError, setSampleCountError] = useState<string>('')
  const [preTreatmentReagents, setPreTreatmentReagents] = useState<PreTreatmentReagent[]>(data.methods.preTreatmentReagents)
  const [mobilePhaseA, setMobilePhaseA] = useState<Reagent[]>(data.methods.mobilePhaseA)
  const [mobilePhaseB, setMobilePhaseB] = useState<Reagent[]>(data.methods.mobilePhaseB)

  // 从 Factors 页面加载试剂列表
  const [availableReagents, setAvailableReagents] = useState<string[]>([])
  const [factorsData, setFactorsData] = useState<ReagentFactor[]>([])
  
  // 图表纵坐标范围控制 (null = 自动)
  const [preTreatmentYMax, setPreTreatmentYMax] = useState<number | null>(null)
  const [phaseAYMax, setPhaseAYMax] = useState<number | null>(null)
  const [phaseBYMax, setPhaseBYMax] = useState<number | null>(null)

  // 强制刷新图表的状态
  const [chartRefreshKey, setChartRefreshKey] = useState(0)

  // 使用 useMemo 缓存 filterOption 函数，避免每次渲染都创建新函数
  const selectFilterOption = React.useMemo(
    () => (input: string, option: any) => {
      const children = String(option?.children || '')
      return children.toLowerCase().includes(input.toLowerCase())
    },
    []
  )

  useEffect(() => {
    // 加载 Factors 数据
    const loadFactorsData = () => {
      console.log('🔄 MethodsPage: 开始加载factors数据')
      try {
        const factorsDataStr = localStorage.getItem('hplc_factors_data')
        console.log('  - localStorage中的factors:', factorsDataStr ? `存在(${factorsDataStr.length}字符)` : '不存在')
        if (factorsDataStr) {
          const factors = JSON.parse(factorsDataStr)
          console.log(`  - 解析出${factors.length}个试剂`)
          setFactorsData(factors)
          
          // 提取试剂名称，去重并排序，确保数组稳定
          const reagentNames = Array.from(
            new Set(factors.map((f: any) => f.name).filter((n: string) => n && n.trim()))
          ).sort()
          
          console.log(`  - 提取出${reagentNames.length}个试剂名称:`, reagentNames.slice(0, 3))
          
          // 只有在试剂列表真正改变时才更新
          setAvailableReagents(prev => {
            if (JSON.stringify(prev) === JSON.stringify(reagentNames)) {
              console.log('  - 试剂列表未变化，跳过更新')
              return prev // 返回旧引用，避免触发重渲染
            }
            console.log('  - 更新试剂列表')
            return reagentNames as string[]
          })
        } else {
          console.log('  ⚠️ localStorage中没有factors数据，清空试剂列表')
          setFactorsData([])
          setAvailableReagents([])
        }
      } catch (error) {
        console.error('❌ 加载 Factors 数据失败:', error)
      }
    }

    loadFactorsData()

    // 监听 HPLC Gradient 数据更新
    const handleGradientDataUpdated = () => {
      console.log('🔔 检测到 HPLC Gradient 数据更新，刷新图表...')
      const gradientDataStr = localStorage.getItem('hplc_gradient_data')
      console.log('📊 Gradient 数据:', gradientDataStr ? '存在' : '不存在')
      if (gradientDataStr) {
        try {
          const data = JSON.parse(gradientDataStr)
          console.log('✅ Gradient 数据解析成功:', data.calculations)
        } catch (e) {
          console.error('❌ Gradient 数据解析失败:', e)
        }
      }
      setChartRefreshKey(prev => prev + 1) // 强制刷新图表
    }
    
    // 检查打开文件时gradient数据是否包含calculations
    const checkGradientDataOnLoad = () => {
      const gradientDataStr = localStorage.getItem('hplc_gradient_data')
      if (gradientDataStr) {
        try {
          const gradientData = JSON.parse(gradientDataStr)
          // 如果gradient是数组或没有calculations，提示用户需要重新计算
          if (Array.isArray(gradientData) || !gradientData.calculations) {
            console.warn('⚠️ 打开的文件缺少gradient calculations数据')
            message.warning('此文件缺少梯度计算数据，请前往 HPLC Gradient Prg 页面点击"确定"按钮重新计算', 5)
          }
        } catch (e) {
          console.error('检查gradient数据失败:', e)
        }
      }
    }
    
    // 延迟检查，等待文件数据加载完成
    const checkTimer = setTimeout(checkGradientDataOnLoad, 500)
    
    // 监听文件数据变更事件（打开文件、新建文件时触发）
    const handleFileDataChanged = (e: Event) => {
      const customEvent = e as CustomEvent
      console.log('📢 MethodsPage: 接收到 fileDataChanged 事件', customEvent.detail)
      
      // 立即刷新图表
      setChartRefreshKey(prev => prev + 1)
      
      // 延迟重新加载factors数据（等待FactorsPage初始化预定义数据）
      setTimeout(() => {
        console.log('🔄 MethodsPage: 延迟加载factors数据')
        loadFactorsData()
      }, 100)
      
      console.log('🔄 MethodsPage: 已强制刷新页面数据')
    }

    // 自定义事件监听(同页面内的更新)
    window.addEventListener('factorsDataUpdated', loadFactorsData as EventListener)
    window.addEventListener('gradientDataUpdated', handleGradientDataUpdated)
    window.addEventListener('fileDataChanged', handleFileDataChanged)

    return () => {
      clearTimeout(checkTimer)
      window.removeEventListener('factorsDataUpdated', loadFactorsData as EventListener)
      window.removeEventListener('gradientDataUpdated', handleGradientDataUpdated)
      window.removeEventListener('fileDataChanged', handleFileDataChanged)
    }
  }, [])

  // 监听Context数据变化，立即更新本地状态（使用useLayoutEffect确保同步更新）
  const lastSyncedData = React.useRef<string>('')
  
  useLayoutEffect(() => {
    const currentDataStr = JSON.stringify(data.methods)
    
    // 如果数据没有变化，跳过更新
    if (lastSyncedData.current === currentDataStr) {
      console.log('⏭️ MethodsPage: Context数据未变化，跳过更新')
      return
    }
    
    console.log('🔄 MethodsPage: Context数据变化，立即更新本地状态')
    lastSyncedData.current = currentDataStr
    
    // 立即更新所有状态
    setSampleCount(data.methods.sampleCount)
    setPreTreatmentReagents(data.methods.preTreatmentReagents)
    setMobilePhaseA(data.methods.mobilePhaseA)
    setMobilePhaseB(data.methods.mobilePhaseB)
    
    // 立即刷新图表（特别是在新建文件或打开文件时）
    console.log('🔄 立即刷新图表')
    setChartRefreshKey(prev => prev + 1)
  }, [data.methods])

  // 自动保存数据到 Context 和 localStorage (每次状态变化时)
  // 使用 ref 来避免初始化时触发 dirty
  const isInitialMount = React.useRef(true)
  const lastLocalData = React.useRef<string>('')
  
  useEffect(() => {
    const dataToSave = {
      sampleCount,
      preTreatmentReagents,
      mobilePhaseA,
      mobilePhaseB
    }
    
    const currentLocalDataStr = JSON.stringify(dataToSave)
    
    // 保存到 localStorage
    localStorage.setItem('hplc_methods_raw', currentLocalDataStr)
    
    // 跳过初始挂载时的更新
    if (isInitialMount.current) {
      console.log('⏭️ MethodsPage: 跳过初始挂载时的更新')
      isInitialMount.current = false
      lastLocalData.current = currentLocalDataStr
      return
    }
    
    // 如果本地数据没有变化（可能是从Context同步来的），跳过更新
    if (lastLocalData.current === currentLocalDataStr) {
      console.log('⏭️ MethodsPage: 本地数据未变化，跳过Context更新')
      return
    }
    
    console.log('🔄 MethodsPage: 本地数据变化，同步到Context并标记dirty')
    lastLocalData.current = currentLocalDataStr
    
    // 同步到Context并标记为脏数据
    updateMethodsData(dataToSave)
    setIsDirty(true)
  }, [sampleCount, preTreatmentReagents, mobilePhaseA, mobilePhaseB, updateMethodsData, setIsDirty])

  // 处理样品数变化
  const handleSampleCountChange = (value: number | null) => {
    setSampleCount(value)
    if (value === null || value <= 0 || !Number.isInteger(value)) {
      setSampleCountError('请输入正整数')
    } else {
      setSampleCountError('')
    }
  }

  // 添加试剂
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

  // 删除最后一行试剂
  const deleteLastReagent = (type: 'preTreatment' | 'phaseA' | 'phaseB') => {
    if (type === 'preTreatment') {
      if (preTreatmentReagents.length <= 1) {
        message.warning('至少保留一个试剂')
        return
      }
      setPreTreatmentReagents(preTreatmentReagents.slice(0, -1))
    } else if (type === 'phaseA') {
      if (mobilePhaseA.length <= 1) {
        message.warning('至少保留一个试剂')
        return
      }
      setMobilePhaseA(mobilePhaseA.slice(0, -1))
    } else {
      if (mobilePhaseB.length <= 1) {
        message.warning('至少保留一个试剂')
        return
      }
      setMobilePhaseB(mobilePhaseB.slice(0, -1))
    }
  }

  // 更新试剂 - 使用useCallback缓存函数，避免每次渲染创建新函数
  const updateReagent = useCallback((
    type: 'preTreatment' | 'phaseA' | 'phaseB',
    id: string,
    field: 'name' | 'percentage' | 'volume',
    value: string | number
  ) => {
    console.log(`🔧 更新试剂 - type: ${type}, id: ${id}, field: ${field}, value:`, value)
    
    if (type === 'preTreatment') {
      setPreTreatmentReagents(prev => prev.map(r => 
        r.id === id ? { ...r, [field]: value } : r
      ))
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
  const recalculateGradientCalculations = (phaseA: Reagent[], phaseB: Reagent[]) => {
    try {
      const gradientDataStr = localStorage.getItem('hplc_gradient_data')
      if (!gradientDataStr) {
        console.log('⏭️ 没有gradient数据，跳过重新计算')
        return
      }
      
      const gradientData = JSON.parse(gradientDataStr)
      if (!gradientData.calculations) {
        console.log('⏭️ gradient数据没有calculations，跳过重新计算')
        return
      }
      
      console.log('🔄 重新计算gradient calculations...')
      
      // 获取原有的体积数据
      const totalVolumeA = gradientData.calculations.mobilePhaseA?.volume || 0
      const totalVolumeB = gradientData.calculations.mobilePhaseB?.volume || 0
      
      // 重新计算 Mobile Phase A 的组分
      const totalPercentageA = phaseA.reduce((sum, r) => sum + (r.percentage || 0), 0)
      const newComponentsA = phaseA
        .filter(r => r.name && r.name.trim())
        .map(r => ({
          reagentName: r.name,
          percentage: r.percentage,
          ratio: totalPercentageA > 0 ? r.percentage / totalPercentageA : 0,
          volume: totalPercentageA > 0 ? (totalVolumeA * r.percentage / totalPercentageA) : 0
        }))
      
      // 重新计算 Mobile Phase B 的组分
      const totalPercentageB = phaseB.reduce((sum, r) => sum + (r.percentage || 0), 0)
      const newComponentsB = phaseB
        .filter(r => r.name && r.name.trim())
        .map(r => ({
          reagentName: r.name,
          percentage: r.percentage,
          ratio: totalPercentageB > 0 ? r.percentage / totalPercentageB : 0,
          volume: totalPercentageB > 0 ? (totalVolumeB * r.percentage / totalPercentageB) : 0
        }))
      
      // 更新calculations中的组分信息
      gradientData.calculations.mobilePhaseA.components = newComponentsA
      gradientData.calculations.mobilePhaseB.components = newComponentsB
      
      // 重新计算所有试剂的总体积
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
      
      // 保存更新后的gradient数据
      localStorage.setItem('hplc_gradient_data', JSON.stringify(gradientData))
      console.log('✅ 已更新gradient calculations')
      
      // 刷新图表
      setChartRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('❌ 重新计算gradient calculations失败:', error)
    }
  }

  // 计算百分比总和(仅用于 Mobile Phase A/B)
  const calculateTotal = (reagents: Reagent[]): number => {
    return reagents.reduce((sum, r) => sum + (r.percentage || 0), 0)
  }

  // 计算体积总和(仅用于 Sample PreTreatment)
  const calculateTotalVolume = (reagents: PreTreatmentReagent[]): number => {
    return reagents.reduce((sum, r) => sum + (r.volume || 0), 0)
  }

  // 验证百分比总和
  const validatePercentage = (reagents: Reagent[]): boolean => {
    const total = calculateTotal(reagents)
    return Math.abs(total - 100) < 0.01 // 允许浮点误差
  }

  // 获取百分比显示样式
  const getPercentageStyle = (total: number) => {
    const isValid = Math.abs(total - 100) < 0.01
    return {
      color: isValid ? '#52c41a' : '#ff4d4f',
      fontWeight: 500,
      fontSize: 14
    }
  }

  // 计算柱状图数据 - Sample PreTreatment
  const calculatePreTreatmentChartData = () => {
    const chartData: any[] = []
    
    preTreatmentReagents.forEach(reagent => {
      if (!reagent.name || reagent.volume <= 0) return
      
      const factor = factorsData.find(f => f.name === reagent.name)
      if (!factor) return
      
      const mass = reagent.volume * factor.density // 质量 = 体积 × 密度
      
      chartData.push({
        reagent: reagent.name,
        S: Number((mass * factor.safetyScore).toFixed(3)),
        H: Number((mass * factor.healthScore).toFixed(3)),
        E: Number((mass * factor.envScore).toFixed(3)),
        R: Number((mass * factor.recycleScore).toFixed(3)),
        D: Number((mass * factor.disposal).toFixed(3)),
        P: Number((mass * factor.power).toFixed(3))
      })
    })
    
    return chartData
  }

  // 计算柱状图数据 - Mobile Phase (需要 HPLC Gradient 数据)
  const calculatePhaseChartData = (phaseType: 'A' | 'B') => {
    const chartData: any[] = []
    
    try {
      const gradientDataStr = localStorage.getItem('hplc_gradient_data')
      console.log(`📊 计算 Mobile Phase ${phaseType} 图表数据`)
      console.log('  - localStorage中的gradient数据:', gradientDataStr ? '存在' : '不存在')
      
      if (!gradientDataStr) {
        console.log('  ❌ 没有gradient数据')
        return chartData
      }
      
      const gradientData = JSON.parse(gradientDataStr)
      console.log('  - gradient数据类型:', Array.isArray(gradientData) ? '数组' : '对象')
      console.log('  - gradient对象键:', Object.keys(gradientData))
      console.log('  - 是否有calculations:', 'calculations' in gradientData)
      
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
        
        chartData.push({
          reagent: component.reagentName,
          S: Number((mass * factor.safetyScore).toFixed(3)),
          H: Number((mass * factor.healthScore).toFixed(3)),
          E: Number((mass * factor.envScore).toFixed(3)),
          R: Number((mass * factor.recycleScore).toFixed(3)),
          D: Number((mass * factor.disposal).toFixed(3)),
          P: Number((mass * factor.power).toFixed(3))
        })
      })
      
      console.log(`  ✅ 生成了 ${chartData.length} 个柱状图数据点`)
    } catch (error) {
      console.error('❌ 计算 Mobile Phase 图表数据失败:', error)
    }

    return chartData
  }

  // 使用 useMemo 缓存图表数据，当 chartRefreshKey 或 factorsData 变化时重新计算
  const phaseAChartData = React.useMemo(() => {
    console.log('🔄 重新计算 Phase A 图表数据, refreshKey:', chartRefreshKey)
    const data = calculatePhaseChartData('A')
    console.log('📈 Phase A 图表数据:', data)
    return data
  }, [factorsData, chartRefreshKey])
  
  const phaseBChartData = React.useMemo(() => {
    console.log('🔄 重新计算 Phase B 图表数据, refreshKey:', chartRefreshKey)
    const data = calculatePhaseChartData('B')
    console.log('📈 Phase B 图表数据:', data)
    return data
  }, [factorsData, chartRefreshKey])  // 确认提交
  const handleConfirm = () => {
    // 验证样品数
    if (!sampleCount || sampleCount <= 0 || !Number.isInteger(sampleCount)) {
      message.error('请输入有效的处理样品数（正整数）')
      setSampleCountError('请输入正整数')
      return
    }

    // 验证试剂名称
    const allReagents = [...preTreatmentReagents, ...mobilePhaseA, ...mobilePhaseB]
    if (allReagents.some(r => !r.name)) {
      message.error('请选择所有试剂')
      return
    }

    // 验证 Sample PreTreatment 的体积
    const hasInvalidVolume = preTreatmentReagents.some(r => r.volume < 0)
    if (hasInvalidVolume) {
      message.error('Sample PreTreatment 的体积不能为负')
      return
    }

    // 验证 Mobile Phase 百分比
    if (!validatePercentage(mobilePhaseA)) {
      message.error('Mobile Phase A 的百分比总和必须为 100%')
      return
    }
    if (!validatePercentage(mobilePhaseB)) {
      message.error('Mobile Phase B 的百分比总和必须为 100%')
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

    // 保存到 localStorage（供后续模块使用）
    localStorage.setItem('hplc_methods_data', JSON.stringify(methodsData))
    
    // 同时保存原始数据（便于编辑）
    localStorage.setItem('hplc_methods_raw', JSON.stringify({
      sampleCount,
      preTreatmentReagents,
      mobilePhaseA,
      mobilePhaseB
    }))

    message.success('数据已保存，跳转到 HPLC Gradient Prg')
    
    // 触发自定义事件，通知其他组件数据已更新
    window.dispatchEvent(new CustomEvent('methodsDataUpdated', { detail: methodsData }))
    
    // 跳转到下一页
    navigate('/hplc-gradient')
  }

  // 渲染 Sample PreTreatment 试剂组(使用体积)
  const renderPreTreatmentGroup = () => {
    const totalVolume = calculateTotalVolume(preTreatmentReagents)
    
    return (
      <div className="reagent-section">
        <Title level={4}>Sample PreTreatment</Title>
        {preTreatmentReagents.map((reagent) => (
          <Row gutter={8} key={reagent.id} style={{ marginBottom: 12 }}>
            <Col span={15}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择试剂"
                value={reagent.name || null}
                onChange={(value) => updateReagent('preTreatment', reagent.id, 'name', value)}
                showSearch
                allowClear
                filterOption={selectFilterOption}
                notFoundContent="未找到试剂"
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
          总体积: {totalVolume.toFixed(1)} ml
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
                style={{ width: '100%' }}
                placeholder="选择试剂"
                value={reagent.name || null}
                onChange={(value) => updateReagent(type, reagent.id, 'name', value)}
                showSearch
                allowClear
                filterOption={selectFilterOption}
                notFoundContent="未找到试剂"
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
          当前总计: {total.toFixed(1)}%
          {Math.abs(total - 100) >= 0.01 && (
            <span style={{ marginLeft: 8, fontSize: 12 }}>
              (必须为 100%)
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="methods-page">
      <Title level={2}>Methods</Title>

      {/* 输入处理样品数 */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <span style={{ fontSize: 16, fontWeight: 500 }}>输入处理样品数：</span>
          </Col>
          <Col>
            <InputNumber
              min={1}
              step={1}
              placeholder="Basic usage"
              value={sampleCount}
              onChange={handleSampleCountChange}
              style={{ width: 200 }}
              precision={0}
            />
          </Col>
          {sampleCountError && (
            <Col>
              <span style={{ color: '#ff4d4f', fontSize: 14 }}>{sampleCountError}</span>
            </Col>
          )}
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
                const chartData = calculatePreTreatmentChartData()
                if (chartData.length === 0) {
                  return (
                    <div style={{ height: 300, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                      请输入试剂名称和体积后查看图表
                    </div>
                  )
                }
                
                const needsScroll = chartData.length > 2  // 改为超过2个才滚动
                const chartWidth = needsScroll ? chartData.length * 200 : '100%'  // 每个试剂200px宽
                
                // 计算自动最大值
                const autoMax = Math.max(...chartData.flatMap(d => [d.S, d.H, d.E, d.R, d.D, d.P]))
                const currentMax = preTreatmentYMax !== null ? preTreatmentYMax : autoMax
                
                return (
                  <div className="chart-container">
                    {/* Y轴控制区 */}
                    <div className="y-axis-control">
                      <span>Y轴范围: 0 - {currentMax.toFixed(2)}</span>
                      <input
                        type="range"
                        className="y-axis-slider"
                        min="0.01"
                        max={Math.max(autoMax * 2, 1)}
                        step="0.01"
                        value={currentMax}
                        onChange={(e) => setPreTreatmentYMax(parseFloat(e.target.value))}
                        title="拖动调整Y轴范围"
                      />
                      <button className="y-axis-reset-btn" onClick={() => setPreTreatmentYMax(null)}>
                        自动
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
                              <Tooltip 
                                contentStyle={{ fontSize: 12 }}
                                formatter={(value: any) => value.toFixed(4)}
                              />
                              <Bar dataKey="S" fill="#8884d8" name="安全性 (S)" />
                              <Bar dataKey="H" fill="#82ca9d" name="健康危害 (H)" />
                              <Bar dataKey="E" fill="#ffc658" name="环境影响 (E)" />
                              <Bar dataKey="R" fill="#ff8042" name="可回收性 (R)" />
                              <Bar dataKey="D" fill="#a4de6c" name="处置难度 (D)" />
                              <Bar dataKey="P" fill="#d0ed57" name="耗能 (P)" />
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
                        安全性 (S)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#82ca9d', display: 'inline-block', borderRadius: 2 }}></span>
                        健康危害 (H)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ffc658', display: 'inline-block', borderRadius: 2 }}></span>
                        环境影响 (E)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ff8042', display: 'inline-block', borderRadius: 2 }}></span>
                        可回收性 (R)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#a4de6c', display: 'inline-block', borderRadius: 2 }}></span>
                        处置难度 (D)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#d0ed57', display: 'inline-block', borderRadius: 2 }}></span>
                        耗能 (P)
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
            {renderReagentGroup('Mobile Phase A', mobilePhaseA, 'phaseA')}
            <div className="vine-divider vine-middle"></div>
            <div className="chart-placeholder">
              {/* Mobile Phase A 柱状图 - 需要 HPLC Gradient 数据 */}
              {(() => {
                const chartData = phaseAChartData
                if (chartData.length === 0) {
                  return (
                    <div style={{ height: 300, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', padding: 20, textAlign: 'center' }}>
                      请先完成 HPLC Gradient 设置<br/>计算梯度曲线后此处将显示图表
                    </div>
                  )
                }
                
                const needsScroll = chartData.length > 2  // 改为超过2个才滚动
                const chartWidth = needsScroll ? chartData.length * 200 : '100%'  // 每个试剂200px宽
                
                // 计算自动最大值
                const autoMax = Math.max(...chartData.flatMap(d => [d.S, d.H, d.E, d.R, d.D, d.P]))
                const currentMax = phaseAYMax !== null ? phaseAYMax : autoMax
                
                return (
                  <div className="chart-container">
                    {/* Y轴控制区 */}
                    <div className="y-axis-control">
                      <span>Y轴范围: 0 - {currentMax.toFixed(2)}</span>
                      <input
                        type="range"
                        className="y-axis-slider"
                        min="0.01"
                        max={Math.max(autoMax * 2, 1)}
                        step="0.01"
                        value={currentMax}
                        onChange={(e) => setPhaseAYMax(parseFloat(e.target.value))}
                        title="拖动调整Y轴范围"
                      />
                      <button className="y-axis-reset-btn" onClick={() => setPhaseAYMax(null)}>
                        自动
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
                              <Tooltip 
                                contentStyle={{ fontSize: 12 }}
                                formatter={(value: any) => value.toFixed(4)}
                              />
                              <Bar dataKey="S" fill="#8884d8" name="安全性 (S)" />
                              <Bar dataKey="H" fill="#82ca9d" name="健康危害 (H)" />
                              <Bar dataKey="E" fill="#ffc658" name="环境影响 (E)" />
                              <Bar dataKey="R" fill="#ff8042" name="可回收性 (R)" />
                              <Bar dataKey="D" fill="#a4de6c" name="处置难度 (D)" />
                              <Bar dataKey="P" fill="#d0ed57" name="耗能 (P)" />
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
                        安全性 (S)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#82ca9d', display: 'inline-block', borderRadius: 2 }}></span>
                        健康危害 (H)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ffc658', display: 'inline-block', borderRadius: 2 }}></span>
                        环境影响 (E)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ff8042', display: 'inline-block', borderRadius: 2 }}></span>
                        可回收性 (R)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#a4de6c', display: 'inline-block', borderRadius: 2 }}></span>
                        处置难度 (D)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#d0ed57', display: 'inline-block', borderRadius: 2 }}></span>
                        耗能 (P)
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
                if (chartData.length === 0) {
                  return (
                    <div style={{ height: 300, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', padding: 20, textAlign: 'center' }}>
                      请先完成 HPLC Gradient 设置<br/>计算梯度曲线后此处将显示图表
                    </div>
                  )
                }
                
                const needsScroll = chartData.length > 2  // 改为超过2个才滚动
                const chartWidth = needsScroll ? chartData.length * 200 : '100%'  // 每个试剂200px宽
                
                // 计算自动最大值
                const autoMax = Math.max(...chartData.flatMap(d => [d.S, d.H, d.E, d.R, d.D, d.P]))
                const currentMax = phaseBYMax !== null ? phaseBYMax : autoMax
                
                return (
                  <div className="chart-container">
                    {/* Y轴控制区 */}
                    <div className="y-axis-control">
                      <span>Y轴范围: 0 - {currentMax.toFixed(2)}</span>
                      <input
                        type="range"
                        className="y-axis-slider"
                        min="0.01"
                        max={Math.max(autoMax * 2, 1)}
                        step="0.01"
                        value={currentMax}
                        onChange={(e) => setPhaseBYMax(parseFloat(e.target.value))}
                        title="拖动调整Y轴范围"
                      />
                      <button className="y-axis-reset-btn" onClick={() => setPhaseBYMax(null)}>
                        自动
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
                              <Tooltip 
                                contentStyle={{ fontSize: 12 }}
                                formatter={(value: any) => value.toFixed(4)}
                              />
                              <Bar dataKey="S" fill="#8884d8" name="安全性 (S)" />
                              <Bar dataKey="H" fill="#82ca9d" name="健康危害 (H)" />
                              <Bar dataKey="E" fill="#ffc658" name="环境影响 (E)" />
                              <Bar dataKey="R" fill="#ff8042" name="可回收性 (R)" />
                              <Bar dataKey="D" fill="#a4de6c" name="处置难度 (D)" />
                              <Bar dataKey="P" fill="#d0ed57" name="耗能 (P)" />
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
                        安全性 (S)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#82ca9d', display: 'inline-block', borderRadius: 2 }}></span>
                        健康危害 (H)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ffc658', display: 'inline-block', borderRadius: 2 }}></span>
                        环境影响 (E)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#ff8042', display: 'inline-block', borderRadius: 2 }}></span>
                        可回收性 (R)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#a4de6c', display: 'inline-block', borderRadius: 2 }}></span>
                        处置难度 (D)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, background: '#d0ed57', display: 'inline-block', borderRadius: 2 }}></span>
                        耗能 (P)
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
          确定
        </Button>
      </div>
    </div>
  )
}

export default MethodsPage
