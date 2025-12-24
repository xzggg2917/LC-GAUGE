import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { Card, Typography, Button, InputNumber, Select, Row, Col, message } from 'antd'
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppContext } from '../contexts/AppContext'
import type { GradientStep } from '../contexts/AppContext'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'
import './HPLCGradientPage.css'

const { Title } = Typography
const { Option } = Select

// Curve type definitions
const CURVE_TYPES = [
  { value: 'initial', label: 'Initial', color: '#999999' },
  { value: 'pre-step', label: '1. Pre-step Curve', color: '#1890ff' },
  { value: 'weak-convex', label: '2. Weak Convex', color: '#f5222d' },
  { value: 'medium-convex', label: '3. Medium Convex', color: '#f5222d' },
  { value: 'strong-convex', label: '4. Strong Convex', color: '#f5222d' },
  { value: 'ultra-convex', label: '5. Ultra Convex', color: '#f5222d' },
  { value: 'linear', label: '6. Linear', color: '#52c41a' },
  { value: 'weak-concave', label: '7. Weak Concave', color: '#722ed1' },
  { value: 'medium-concave', label: '8. Medium Concave', color: '#722ed1' },
  { value: 'strong-concave', label: '9. Strong Concave', color: '#722ed1' },
  { value: 'ultra-concave', label: '10. Ultra Concave', color: '#722ed1' },
  { value: 'post-step', label: '11. Post-step Curve', color: '#fa8c16' },
]

// 曲线计算函数
const calculateCurvePoint = (
  curveType: string,
  t: number,
  t0: number,
  t1: number,
  y0: number,
  y1: number
): number => {
  if (t <= t0) return y0
  if (t >= t1) return y1
  
  const T = t1 - t0
  const relativeT = t - t0
  const ratio = relativeT / T
  
  switch (curveType) {
    case 'initial':
      return y0  // Initial状态保持初始值
    case 'pre-step':
      return y1
    case 'weak-convex':
      return y1 - (y1 - y0) * Math.pow(1 - ratio, 2)
    case 'medium-convex':
      return y1 - (y1 - y0) * Math.pow(1 - ratio, 3)
    case 'strong-convex':
      return y1 - (y1 - y0) * Math.pow(1 - ratio, 4)
    case 'ultra-convex':
      return y1 - (y1 - y0) * Math.pow(1 - ratio, 6)
    case 'linear':
      return y0 + (y1 - y0) * ratio
    case 'weak-concave':
      return y0 + (y1 - y0) * Math.pow(ratio, 2)
    case 'medium-concave':
      return y0 + (y1 - y0) * Math.pow(ratio, 3)
    case 'strong-concave':
      return y0 + (y1 - y0) * Math.pow(ratio, 4)
    case 'ultra-concave':
      return y0 + (y1 - y0) * Math.pow(ratio, 6)
    case 'post-step':
      return y0
    default:
      return y0 + (y1 - y0) * ratio
  }
}

const HPLCGradientPage: React.FC = () => {
  const navigate = useNavigate()
  const { data, updateGradientData, setIsDirty } = useAppContext()
  
  // 使用Context中的数据初始化
  const [gradientSteps, setGradientSteps] = useState<GradientStep[]>(() => {
    // 如果Context中有数据就使用，否则返回默认的两行
    if (data.gradient.length > 0) {
      // ✅ 深拷贝避免引用共享
      const steps = JSON.parse(JSON.stringify(data.gradient))
      
      // ✅ 确保每个 step 都有唯一的 id（兼容旧数据）
      const timestamp = Date.now()
      steps.forEach((step: GradientStep, index: number) => {
        if (!step.id || step.id === 'undefined') {
          step.id = `${timestamp}-step${index}-${Math.random().toString(36).substr(2, 9)}`
          console.warn(`⚠️ Step ${step.stepNo} 缺少 id，已生成: ${step.id}`)
        }
      })
      
      console.log('🔍 初始化 gradientSteps (from Context):', steps.map(s => ({ stepNo: s.stepNo, id: s.id })))
      return steps
    }
    // 默认两行：第一行为Initial状态，第二行为空
    const timestamp = Date.now()
    const defaultSteps = [
      { id: `${timestamp}-init`, stepNo: 0, time: 0.0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'initial' },
      { id: `${timestamp}-step1`, stepNo: 1, time: 0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'linear' }
    ]
    console.log('🔍 初始化 gradientSteps (default):', defaultSteps.map(s => ({ stepNo: s.stepNo, id: s.id })))
    return defaultSteps
  })

  // 监听Context数据变化，立即同步更新
  const lastSyncedGradient = React.useRef<string>('')
  const hasInitialized = React.useRef(false)
  
  useLayoutEffect(() => {
    const currentGradientStr = JSON.stringify(data.gradient)
    
    // 如果数据没有变化，跳过更新
    if (lastSyncedGradient.current === currentGradientStr) {
      return
    }
    
    lastSyncedGradient.current = currentGradientStr
    
    if (data.gradient.length === 0 && !hasInitialized.current) {
      // 只在第一次遇到空数据时初始化（两行）
      hasInitialized.current = true
      console.log('🔄 HPLCGradientPage: 检测到空数据，初始化默认两行')
      const timestamp = Date.now()
      const defaultSteps = [
        { id: `${timestamp}-init`, stepNo: 0, time: 0.0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'initial' },
        { id: `${timestamp}-step1`, stepNo: 1, time: 0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'linear' }
      ]
      setGradientSteps(defaultSteps)
      // 立即同步到Context，避免其他页面读取到空数据
      // ✅ 深拷贝避免引用共享
      updateGradientData(JSON.parse(JSON.stringify(defaultSteps)))
    } else if (data.gradient.length > 0) {
      // 有数据时直接使用
      hasInitialized.current = true
      console.log('🔄 HPLCGradientPage: 立即同步Context数据')
      // ✅ 深拷贝避免引用共享
      const steps = JSON.parse(JSON.stringify(data.gradient))
      
      // ✅ 确保每个 step 都有唯一的 id（兼容旧数据）
      const timestamp = Date.now()
      steps.forEach((step: GradientStep, index: number) => {
        if (!step.id || step.id === 'undefined') {
          step.id = `${timestamp}-sync${index}-${Math.random().toString(36).substr(2, 9)}`
          console.warn(`⚠️ Step ${step.stepNo} 缺少 id，已生成: ${step.id}`)
        }
      })
      
      setGradientSteps(steps)
    }
  }, [data.gradient, updateGradientData])

  // 自动保存数据到文件（保存 steps，不覆盖 calculations）
  const isInitialMount = React.useRef(true)
  const lastLocalData = React.useRef<string>('')
  const recalculateTimer = React.useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    const currentLocalDataStr = JSON.stringify(gradientSteps)
    
    // 跳过初始挂载时的更新
    if (isInitialMount.current) {
      isInitialMount.current = false
      lastLocalData.current = currentLocalDataStr
      return
    }
    
    // 如果本地数据没有变化（可能是从Context同步来的），跳过更新
    if (lastLocalData.current === currentLocalDataStr) {
      return
    }
    
    lastLocalData.current = currentLocalDataStr
    
    // ✅ 自动保存 steps 到文件（保留原有的 calculations）
    const saveSteps = async () => {
      try {
        // 先读取现有的完整数据
        const existingData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT) || {}
        
        // 只更新 steps 部分，保留 calculations 和其他数据
        const updatedData = {
          ...existingData,
          steps: gradientSteps.map(step => ({
            id: step.id,
            stepNo: step.stepNo,
            time: step.time,
            phaseA: step.phaseA,
            phaseB: step.phaseB,
            flowRate: step.flowRate,
            curve: step.curve
          })),
          timestamp: new Date().toISOString()
        }
        
        await StorageHelper.setJSON(STORAGE_KEYS.GRADIENT, updatedData)
        console.log('💾 自动保存 steps 到文件（保留 calculations）')
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }
    
    saveSteps()
    updateGradientData(JSON.parse(JSON.stringify(gradientSteps)))
    setIsDirty(true)
    
    // 🎯 防抖：梯度数据变化1.5秒后，静默重新计算并触发评分更新
    if (recalculateTimer.current) {
      clearTimeout(recalculateTimer.current)
    }
    recalculateTimer.current = setTimeout(async () => {
      console.log('🔄 梯度数据变化，1.5秒后静默重新计算')
      
      // 静默验证：检查数据是否有效
      const hasInvalidData = gradientSteps.some(step => 
        step.time < 0 || step.phaseA < 0 || step.phaseA > 100 || step.flowRate < 0
      )
      
      if (hasInvalidData) {
        console.log('⚠️ 数据无效（负数或超出范围），跳过自动计算')
        return
      }
      
      // 检查时间递增
      for (let i = 1; i < gradientSteps.length; i++) {
        if (gradientSteps[i].time < gradientSteps[i - 1].time) {
          console.log('⚠️ 时间顺序无效，跳过自动计算')
          return
        }
      }
      
      // 检查是否有有效时间
      const totalTime = Math.max(...gradientSteps.map(s => s.time))
      if (totalTime === 0) {
        console.log('⚠️ 总时间为0，跳过自动计算')
        return
      }
      
      // 数据有效，静默执行handleConfirm（不会显示错误消息）
      console.log('✅ 数据有效，触发静默重新计算')
      await handleConfirm()
    }, 1500) // 1.5秒防抖，给用户足够输入时间
    
    return () => {
      if (recalculateTimer.current) {
        clearTimeout(recalculateTimer.current)
      }
    }
  }, [gradientSteps, updateGradientData, setIsDirty])
  
  // 监听文件数据变更事件
  useEffect(() => {
    const handleFileDataChanged = () => {
      console.log('📢 HPLCGradientPage: 接收到 fileDataChanged 事件')
      // hasInitialized标记会在useLayoutEffect中处理数据更新
      // 这里只需要重置标记，让下次Context变化时能正确处理
      hasInitialized.current = false
      console.log('🔄 HPLCGradientPage: 已重置初始化标记')
    }
    
    window.addEventListener('fileDataChanged', handleFileDataChanged)
    return () => {
      window.removeEventListener('fileDataChanged', handleFileDataChanged)
    }
  }, [])

  // 添加新步骤
  const addStep = () => {
    const newStep: GradientStep = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ✅ 确保唯一性
      stepNo: gradientSteps.length,
      time: 0,
  phaseA: 0,
        phaseB: 100,
      flowRate: 0,
      curve: 'linear'
    }
    console.log('➕ Adding new step:', newStep)
    setGradientSteps([...gradientSteps, newStep])
  }

  // Delete last step
  const deleteLastStep = () => {
    if (gradientSteps.length <= 2) {
      message.warning('At least two steps must be kept (Initial + one step)')
      return
    }
    setGradientSteps(gradientSteps.slice(0, -1))
  }

  // 更新步骤数据
  const updateStep = (id: string, field: keyof GradientStep, value: any) => {
    setGradientSteps(prevSteps => {
      console.log(`🔧 updateStep: id="${id}", field=${field}, value=${value}`)
      console.log('📋 All step IDs:', prevSteps.map(s => `Step ${s.stepNo}: id="${s.id}"`))
      
      const newSteps = prevSteps.map(step => {
        if (step.id === id) {
          console.log(`✅ ID MATCHED! Updating step ${step.stepNo}`)
          // 如果修改的是 phaseA，自动更新 phaseB 保持互补关系
          if (field === 'phaseA') {
            return { ...step, phaseA: value, phaseB: 100 - value }
          }
          return { ...step, [field]: value }
        }
        return step
      })
      
      return newSteps
    })
  }

  // 生成图表数据
  const generateChartData = () => {
    if (gradientSteps.length === 0) return []
    
    const chartData: any[] = []
    const totalTime = Math.max(...gradientSteps.map(s => s.time))
    
    // 如果只有一个步骤且时间为0，显示该步骤的初始状态
    if (totalTime === 0) {
      const step = gradientSteps[0]
      chartData.push({
        key: 'chart-point-0',
        time: '0.00',
        'Mobile Phase A (%)': step.phaseA,
        'Mobile Phase B (%)': step.phaseB
      })
      // 添加一个时间点以便显示折线
      chartData.push({
        key: 'chart-point-1',
        time: '10.00',
        'Mobile Phase A (%)': step.phaseA,
        'Mobile Phase B (%)': step.phaseB
      })
      return chartData
    }
    
    // 为每个时间点生成数据
    const points = 1000
    for (let i = 0; i <= points; i++) {
      const currentTime = (totalTime * i) / points
      
  let phaseA = 0
      
      if (currentTime <= gradientSteps[0].time) {
        // 在第一个步骤之前或之内,从0到第一个步骤
  phaseA = calculateCurvePoint(
          gradientSteps[0].curve,
          currentTime,
          0,
          gradientSteps[0].time,
          0,
          gradientSteps[0].phaseA
        )
      } else {
        // 找到当前时间所在的区间
        let segmentIndex = 0
        for (let j = 0; j < gradientSteps.length - 1; j++) {
          if (currentTime >= gradientSteps[j].time && currentTime <= gradientSteps[j + 1].time) {
            segmentIndex = j
            break
          }
        }
        
        const step1 = gradientSteps[segmentIndex]
        const step2 = gradientSteps[segmentIndex + 1]
        
        // 使用 step2 的曲线类型,表示从 step1 到 step2 的过渡曲线
  phaseA = calculateCurvePoint(
          step2.curve,
          currentTime,
          step1.time,
          step2.time,
          step1.phaseA,
          step2.phaseA
        )
      }
      
  const phaseB = 100 - phaseA
      
      chartData.push({
        key: `chart-point-${i}`,
        time: currentTime.toFixed(2),
  'Mobile Phase A (%)': parseFloat(phaseA.toFixed(2)),
  'Mobile Phase B (%)': parseFloat(phaseB.toFixed(2))
      })
    }
    
    return chartData
  }

  // 计算体积
  const calculateVolume = (time: number, flowRate: number): number => {
    return time * flowRate
  }

  // 计算每个组分的体积
  const calculateComponentVolumes = async (chartData: any[]) => {
    if (chartData.length === 0 || gradientSteps.length === 0) return null

    console.log(`🔍 开始计算体积，共 ${gradientSteps.length} 个步骤`)
    console.log(`📈 图表数据点数: ${chartData.length}`)
    
    // 对每个梯度步骤分别计算体积
    let totalVolumeA = 0
    let totalVolumeB = 0
    let totalVolume = 0
    
    // 遍历每个梯度步骤
    for (let i = 0; i < gradientSteps.length; i++) {
      const step = gradientSteps[i]
      const flowRate = step.flowRate || 0
      
      // 找到该步骤对应的时间范围
      const startTime = i === 0 ? 0 : gradientSteps[i - 1].time
      const endTime = step.time
      
      console.log(`\n📍 步骤 ${i + 1}/${gradientSteps.length}:`)
      console.log(`  时间范围: ${startTime} - ${endTime} min`)
      console.log(`  流速: ${flowRate} ml/min`)
      
      // 筛选出该时间段的图表数据
      const segmentData = chartData.filter(d => {
        const t = parseFloat(d.time)
        return t >= startTime && t <= endTime
      })
      
      console.log(`  该段数据点数: ${segmentData.length}`)
      
      if (segmentData.length < 2) {
        console.log(`  ⚠️ 数据点不足，跳过`)
        continue
      }
      
      // 计算该段的积分面积
      let integralA = 0
      let integralB = 0
      
      for (let j = 1; j < segmentData.length; j++) {
        const t1 = parseFloat(segmentData[j - 1].time)
        const t2 = parseFloat(segmentData[j].time)
        const yA1 = segmentData[j - 1]['Mobile Phase A (%)']
        const yA2 = segmentData[j]['Mobile Phase A (%)']
        const yB1 = segmentData[j - 1]['Mobile Phase B (%)']
        const yB2 = segmentData[j]['Mobile Phase B (%)']
        
        // 梯形面积 = (y1 + y2) / 2 * (t2 - t1)
        integralA += ((yA1 + yA2) / 2) * (t2 - t1)
        integralB += ((yB1 + yB2) / 2) * (t2 - t1)
      }
      
      // 该段的体积 = 积分面积 × 流速 / 100
      // (积分单位是 %·min, 除以100转换为小数, 乘以流速ml/min得到ml)
      const segmentVolumeA = integralA * flowRate / 100
      const segmentVolumeB = integralB * flowRate / 100
      const segmentVolume = (endTime - startTime) * flowRate
      
      totalVolumeA += segmentVolumeA
      totalVolumeB += segmentVolumeB
      totalVolume += segmentVolume
      
      console.log(`  ✅ 积分A: ${integralA.toFixed(2)} %·min → 体积A: ${segmentVolumeA.toFixed(3)} ml`)
      console.log(`  ✅ 积分B: ${integralB.toFixed(2)} %·min → 体积B: ${segmentVolumeB.toFixed(3)} ml`)
      console.log(`  📦 该段总体积: ${segmentVolume.toFixed(3)} ml`)
    }

    const totalTime = gradientSteps[gradientSteps.length - 1].time
    
    // 平均百分比(用于显示)
    const avgPercentageA = totalVolume > 0 ? (totalVolumeA / totalVolume) * 100 : 0
    const avgPercentageB = totalVolume > 0 ? (totalVolumeB / totalVolume) * 100 : 0

    console.log(`📊 总计算结果:`)
    console.log(`  总体积: ${totalVolume.toFixed(3)}ml`)
    console.log(`  Phase A 体积: ${totalVolumeA.toFixed(3)}ml (${avgPercentageA.toFixed(2)}%)`)
    console.log(`  Phase B 体积: ${totalVolumeB.toFixed(3)}ml (${avgPercentageB.toFixed(2)}%)`)

    // 从 Methods 页面获取组分信息
    const methodsDataRaw = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)
    console.log('📋 读取Methods数据:', methodsDataRaw ? '存在' : '不存在')
    
    let componentVolumes: any = {
      totalVolume,
      totalTime,
      mobilePhaseA: {
        volume: totalVolumeA,
        averagePercentage: avgPercentageA,
        components: []
      },
      mobilePhaseB: {
        volume: totalVolumeB,
        averagePercentage: avgPercentageB,
        components: []
      },
      samplePreTreatment: {
        components: []
      }
    }

    if (methodsDataRaw) {
      const methods = methodsDataRaw
      console.log('📋 Methods数据解析成功:', {
        hasMobilePhaseA: !!methods.mobilePhaseA,
        mobilePhaseALength: methods.mobilePhaseA?.length,
        hasMobilePhaseB: !!methods.mobilePhaseB,
        mobilePhaseBLength: methods.mobilePhaseB?.length,
        mobilePhaseA: methods.mobilePhaseA,
        mobilePhaseB: methods.mobilePhaseB
      })
      
      // 计算 Mobile Phase A 中各试剂的体积
      if (methods.mobilePhaseA && Array.isArray(methods.mobilePhaseA)) {
        console.log('  ✅ 开始计算Mobile Phase A组分')
        console.log('    - 原始mobilePhaseA:', methods.mobilePhaseA)
        const totalPercentage = methods.mobilePhaseA.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0)
        console.log('    - totalPercentage:', totalPercentage)
        console.log('    - totalVolumeA:', totalVolumeA)
        
        // 先过滤
        const filtered = methods.mobilePhaseA.filter((r: any) => {
          const valid = r.name && r.name.trim() && r.percentage > 0
          console.log(`    - 检查试剂: ${r.name}, percentage: ${r.percentage}, valid: ${valid}`)
          return valid
        })
        console.log('    - 过滤后数量:', filtered.length)
        
        componentVolumes.mobilePhaseA.components = filtered.map((r: any) => {
          const comp = {
            reagentName: r.name,
            percentage: r.percentage,
            ratio: totalPercentage > 0 ? r.percentage / totalPercentage : 0,
            volume: totalPercentage > 0 ? (totalVolumeA * r.percentage / totalPercentage) : 0
          }
          console.log('    - 生成组分:', comp)
          return comp
        })
        console.log('  ✅ Mobile Phase A组分数:', componentVolumes.mobilePhaseA.components.length)
      } else {
        console.log('  ⚠️ Methods没有mobilePhaseA或不是数组')
      }

      // 计算 Mobile Phase B 中各试剂的体积
      if (methods.mobilePhaseB && Array.isArray(methods.mobilePhaseB)) {
        console.log('  ✅ 开始计算Mobile Phase B组分')
        console.log('    - 原始mobilePhaseB:', methods.mobilePhaseB)
        const totalPercentage = methods.mobilePhaseB.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0)
        console.log('    - totalPercentage:', totalPercentage)
        console.log('    - totalVolumeB:', totalVolumeB)
        
        // 先过滤
        const filtered = methods.mobilePhaseB.filter((r: any) => {
          const valid = r.name && r.name.trim() && r.percentage > 0
          console.log(`    - 检查试剂: ${r.name}, percentage: ${r.percentage}, valid: ${valid}`)
          return valid
        })
        console.log('    - 过滤后数量:', filtered.length)
        
        componentVolumes.mobilePhaseB.components = filtered.map((r: any) => {
          const comp = {
            reagentName: r.name,
            percentage: r.percentage,
            ratio: totalPercentage > 0 ? r.percentage / totalPercentage : 0,
            volume: totalPercentage > 0 ? (totalVolumeB * r.percentage / totalPercentage) : 0
          }
          console.log('    - 生成组分:', comp)
          return comp
        })
        console.log('  ✅ Mobile Phase B组分数:', componentVolumes.mobilePhaseB.components.length)
      } else {
        console.log('  ⚠️ Methods没有mobilePhaseB或不是数组')
      }

      // Sample PreTreatment 的信息(使用直接输入的体积)
      if (methods.preTreatmentReagents && Array.isArray(methods.preTreatmentReagents)) {
        componentVolumes.samplePreTreatment.components = methods.preTreatmentReagents
          .filter((r: any) => r.name && r.name.trim())
          .map((r: any) => ({
            reagentName: r.name,
            volume: r.volume || 0
          }))
      }

      // 保存样品数
      if (methods.sampleCount) {
        componentVolumes.sampleCount = methods.sampleCount
      }
    } else {
      console.log('⚠️ Electron storage 中没有 hplc_methods_raw 数据')
    }

    console.log('📊 最终componentVolumes:', {
      totalVolume: componentVolumes.totalVolume,
      mobilePhaseAVolume: componentVolumes.mobilePhaseA.volume,
      mobilePhaseAComponents: componentVolumes.mobilePhaseA.components.length,
      mobilePhaseBVolume: componentVolumes.mobilePhaseB.volume,
      mobilePhaseBComponents: componentVolumes.mobilePhaseB.components.length
    })

    // 计算所有试剂的总体积(用于绿色化学评估)
    const allReagentVolumes: { [key: string]: number } = {}
    
    // 汇总 Mobile Phase A 的试剂
    componentVolumes.mobilePhaseA.components.forEach((c: any) => {
      if (allReagentVolumes[c.reagentName]) {
        allReagentVolumes[c.reagentName] += c.volume
      } else {
        allReagentVolumes[c.reagentName] = c.volume
      }
    })

    // 汇总 Mobile Phase B 的试剂
    componentVolumes.mobilePhaseB.components.forEach((c: any) => {
      if (allReagentVolumes[c.reagentName]) {
        allReagentVolumes[c.reagentName] += c.volume
      } else {
        allReagentVolumes[c.reagentName] = c.volume
      }
    })

    componentVolumes.allReagentVolumes = allReagentVolumes

    return componentVolumes
  }

  // 确认保存
  const handleConfirm = async () => {
    console.log('🚀 HPLC Gradient 确认保存开始')
    
    // Validate data
    const hasInvalidData = gradientSteps.some(step => 
      step.time < 0 || step.phaseA < 0 || step.phaseA > 100 || step.flowRate < 0
    )
    
    if (hasInvalidData) {
      message.error('Please check input data: Time and flow rate cannot be negative, Mobile Phase A must be between 0-100%')
      return
    }

    // Validate time progression
    for (let i = 1; i < gradientSteps.length; i++) {
      if (gradientSteps[i].time < gradientSteps[i - 1].time) {
        message.error(`Time at step ${i} must be greater than or equal to step ${i - 1}`)
        return
      }
    }
    
    // Validate for valid gradient data (at least one step with time>0)
    const totalTime = Math.max(...gradientSteps.map(s => s.time))
    if (totalTime === 0) {
      message.warning('⚠️ Please enter at least one step with valid time (>0)\nHint: Step 1 Time cannot be 0, recommend setting to 10.0 or other positive number')
      return
    }
    
    // Check for valid flow rate
    const zeroFlowRateSteps = gradientSteps.filter(s => s.flowRate === 0).map(s => s.stepNo)
    const allFlowRatesZero = zeroFlowRateSteps.length === gradientSteps.length
    
    if (allFlowRatesZero) {
      // ⚠️ 所有流速都是0，保存数据但标记为无效（清除 calculations）
      message.warning('⚠️ All steps have flow rate of 0, cannot calculate volume!\nData saved but calculations are cleared.', 5)
      
      const gradientData = {
        flowRate: 0, // 全局流速为0
        steps: gradientSteps.map(step => ({
          id: step.id, // ✅ 保存 id
          stepNo: step.stepNo,
          time: step.time,
          phaseA: step.phaseA,
          phaseB: 100 - step.phaseA,
          flowRate: step.flowRate,
          volume: 0,
          curve: step.curve
        })),
        chartData: [],
        calculations: null, // 🔥 标记为无效
        timestamp: new Date().toISOString(),
        isValid: false, // 🔥 添加无效标记
        invalidReason: 'All flow rates are zero'
      }
      
      await StorageHelper.setJSON(STORAGE_KEYS.GRADIENT, gradientData)
      console.log('💾 保存无效数据到StorageHelper（所有流速为0）')
      
      // 🔥 触发事件通知 MethodsPage 数据已更新（虽然是无效的）
      window.dispatchEvent(new Event('gradientDataUpdated'))
      console.log('📢 已触发 gradientDataUpdated 事件（无效数据）')
      
      // 导航到 Methods 页面让用户看到警告
      message.info('Navigating to Methods page...', 2)
      setTimeout(() => {
        navigate('/methods')
      }, 2000)
      
      return
    }
    
    // If some steps have zero flow rate, give warning but allow continuation
    if (zeroFlowRateSteps.length > 0) {
      message.warning(`⚠️ Steps ${zeroFlowRateSteps.join(', ')} have flow rate of 0, these steps will not produce volume`)
    }

    console.log('📊 开始计算组分体积，chartData点数:', chartData.length)
    console.log('📋 gradientSteps:', gradientSteps)
    
    // chartData 已由 useMemo 在组件作用域中定义
    const componentVolumes = await calculateComponentVolumes(chartData)
    
    console.log('✅ componentVolumes计算完成:', componentVolumes)

    // 计算平均流速（用于后端评分计算）
    // 使用加权平均：每段的流速乘以该段时间，然后除以总时间
    const gradientTotalTime = gradientSteps[gradientSteps.length - 1].time - gradientSteps[0].time
    let weightedFlowRateSum = 0
    for (let i = 0; i < gradientSteps.length - 1; i++) {
      const dt = gradientSteps[i + 1].time - gradientSteps[i].time
      const flowRate = gradientSteps[i + 1].flowRate || 0
      weightedFlowRateSum += flowRate * dt
    }
    const avgFlowRate = gradientTotalTime > 0 ? weightedFlowRateSum / gradientTotalTime : 0
    console.log(`📊 计算平均流速: ${avgFlowRate} ml/min (总时间: ${gradientTotalTime} min)`)

    const gradientData = {
      // 全局流速（用于后端评分计算）
      flowRate: avgFlowRate,
      
      // 基础步骤数据
      steps: gradientSteps.map(step => ({
        id: step.id, // ✅ 保存 id
        stepNo: step.stepNo,
        time: step.time,
  phaseA: step.phaseA,
  phaseB: 100 - step.phaseA,
        flowRate: step.flowRate,
        volume: calculateVolume(step.time, step.flowRate),
        curve: step.curve
      })),
      
      // 图表数据
      chartData: chartData,
      
      // 计算结果(用于后续绿色化学分析)
      calculations: componentVolumes,
      
      // 时间戳
      timestamp: new Date().toISOString(),
      
      // 详细计算说明
      calculationNotes: {
        description: '梯度程序计算结果',
        formulas: {
          totalVolume: '总体积 = 总时间 × 平均流速',
          avgPercentage: '平均百分比 = 曲线积分面积 / 总时间',
          phaseVolume: '流动相体积 = 总体积 × 平均百分比 / 100',
          reagentVolume: '试剂体积 = 流动相体积 × 试剂在流动相中的比例'
        }
      }
    }

    await StorageHelper.setJSON(STORAGE_KEYS.GRADIENT, gradientData)
    console.log('💾 保存到StorageHelper完成')
    console.log('📦 保存的gradientData结构:', {
      hasSteps: !!gradientData.steps,
      stepsLength: gradientData.steps?.length,
      hasChartData: !!gradientData.chartData,
      chartDataLength: gradientData.chartData?.length,
      hasCalculations: !!gradientData.calculations,
      hasMobilePhaseA: !!gradientData.calculations?.mobilePhaseA,
      hasMobilePhaseB: !!gradientData.calculations?.mobilePhaseB,
      mobilePhaseAComponents: gradientData.calculations?.mobilePhaseA?.components?.length,
      mobilePhaseBComponents: gradientData.calculations?.mobilePhaseB?.components?.length
    })
    
    // 触发自定义事件通知其他页面数据已更新
    window.dispatchEvent(new Event('gradientDataUpdated'))
    console.log('📢 已触发 gradientDataUpdated 事件')
    
    // 打印计算结果到控制台(调试用)
    console.log('=== HPLC Gradient 计算结果 ===')
    console.log('总体积:', componentVolumes?.totalVolume, 'ml')
    console.log('总时间:', componentVolumes?.totalTime, 's')
    console.log('Mobile Phase A 平均百分比:', componentVolumes?.mobilePhaseA.averagePercentage.toFixed(2), '%')
    console.log('Mobile Phase A 体积:', componentVolumes?.mobilePhaseA.volume.toFixed(3), 'ml')
    console.log('Mobile Phase B 平均百分比:', componentVolumes?.mobilePhaseB.averagePercentage.toFixed(2), '%')
    console.log('Mobile Phase B Volume:', componentVolumes?.mobilePhaseB.volume.toFixed(3), 'ml')
    console.log('All Reagent Volumes:', componentVolumes?.allReagentVolumes)
    console.log('Mobile Phase A Components:', componentVolumes?.mobilePhaseA.components)
    console.log('Mobile Phase B Components:', componentVolumes?.mobilePhaseB.components)
    
    message.success('Gradient program saved, all calculation data prepared')
  }

  // 使用 useMemo 确保 curve 改变时图表会更新
  const chartData = useMemo(() => generateChartData(), [gradientSteps])

  return (
    <div className="hplc-gradient-page">
      <Title level={2}>Time Gradient Curve</Title>

      {/* 梯度步骤表格 */}
      <Card style={{ marginBottom: 24 }}>
        <div className="gradient-table">
          <table>
            <thead>
              <tr>
                <th>Step No</th>
                <th>Time</th>
                <th>Mobile Phase A (%)</th>
                <th>Mobile Phase B (%)</th>
                <th>Flow rate (ml/min)</th>
                <th>Curve</th>
              </tr>
            </thead>
            <tbody>
              {gradientSteps.map((step) => (
                <tr key={step.id}>
                  <td>{step.stepNo}</td>
                  <td>
                    {step.stepNo === 0 ? (
                      // Step 0 的 Time 显示 "Initial"，灰色不可编辑
                      <div style={{ 
                        padding: '4px 11px', 
                        color: '#999', 
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        Initial
                      </div>
                    ) : (
                      <InputNumber
                        min={0}
                        step={0.1}
                        precision={1}
                        value={step.time}
                        onChange={(value) => updateStep(step.id, 'time', value || 0)}
                        style={{ width: '100%' }}
                      />
                    )}
                  </td>
                  <td>
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={1}
                      value={step.phaseA}
                      onChange={(value) => updateStep(step.id, 'phaseA', value || 0)}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    {/* Mobile Phase B 自动计算，只读显示 */}
                    <div style={{ 
                      padding: '4px 11px', 
                      color: '#1890ff', 
                      backgroundColor: '#e6f7ff',
                      border: '1px solid #91d5ff',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontWeight: 500
                    }}>
                      {(100 - step.phaseA).toFixed(1)}
                    </div>
                  </td>
                  <td>
                    <InputNumber
                      min={0}
                      step={0.01}
                      value={step.flowRate}
                      onChange={(value) => updateStep(step.id, 'flowRate', value || 0)}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td>
                    {step.stepNo === 0 ? (
                      // Step 0 的 Curve 显示 "Initial"，灰色不可编辑
                      <div style={{ 
                        padding: '4px 11px', 
                        color: '#999', 
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        textAlign: 'center'
                      }}>
                        Initial
                      </div>
                    ) : (
                      <Select
                        value={step.curve}
                        onChange={(value) => updateStep(step.id, 'curve', value)}
                        style={{ width: '100%' }}
                      >
                        {CURVE_TYPES.filter(c => c.value !== 'initial').map(curve => (
                          <Option key={curve.value} value={curve.value}>
                            {curve.label}
                          </Option>
                        ))}
                      </Select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addStep}
              style={{ width: '100%' }}
            >
              Add
            </Button>
          </Col>
          <Col span={12}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={deleteLastStep}
              disabled={gradientSteps.length <= 1}
              style={{ width: '100%' }}
            >
              Delete
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Gradient Curve Chart */}
      <Card title="Gradient Curve Preview">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 't/s', position: 'insideBottomRight', offset: -5, style: { fontWeight: 'bold', fill: '#000' } }}
              tick={{ fontWeight: 'bold', fill: '#000' }}
            />
            <YAxis 
              label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', fill: '#000' } }}
              domain={[0, 100]}
              tick={{ fontWeight: 'bold', fill: '#000' }}
            />
            <Tooltip />
            <Legend />
            <Line 
              type="basis" 
              dataKey="Mobile Phase A (%)" 
              stroke="#1890ff" 
              dot={false}
              strokeWidth={2}
              animationDuration={2500}
              animationEasing="ease-in-out"
              animationBegin={0}
            />
            <Line 
              type="basis" 
              dataKey="Mobile Phase B (%)" 
              stroke="#52c41a" 
              dot={false}
              strokeWidth={2}
              animationDuration={2500}
              animationEasing="ease-in-out"
              animationBegin={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 确认按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/methods')}
          size="large"
        >
          Back to Methods
        </Button>
        <Button type="primary" size="large" onClick={handleConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  )
}

export default HPLCGradientPage
