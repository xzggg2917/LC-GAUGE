import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { Card, Typography, Button, InputNumber, Select, Row, Col, message } from 'antd'
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppContext } from '../contexts/AppContext'
import type { GradientStep } from '../contexts/AppContext'
import './HPLCGradientPage.css'

const { Title } = Typography
const { Option } = Select

// 曲线类型定义
const CURVE_TYPES = [
  { value: 'initial', label: 'Initial', color: '#999999' },  // Initial状态，仅用于第一行
  { value: 'pre-step', label: '1. 预先骤曲线 (Pre-step)', color: '#1890ff' },
  { value: 'weak-convex', label: '2. 弱凸曲线 (Weak Convex)', color: '#f5222d' },
  { value: 'medium-convex', label: '3. 中凸曲线 (Medium Convex)', color: '#f5222d' },
  { value: 'strong-convex', label: '4. 强凸曲线 (Strong Convex)', color: '#f5222d' },
  { value: 'ultra-convex', label: '5. 超凸曲线 (Ultra Convex)', color: '#f5222d' },
  { value: 'linear', label: '6. 线性曲线 (Linear)', color: '#52c41a' },
  { value: 'weak-concave', label: '7. 弱凹曲线 (Weak Concave)', color: '#722ed1' },
  { value: 'medium-concave', label: '8. 中凹曲线 (Medium Concave)', color: '#722ed1' },
  { value: 'strong-concave', label: '9. 强凹曲线 (Strong Concave)', color: '#722ed1' },
  { value: 'ultra-concave', label: '10. 超凹曲线 (Ultra Concave)', color: '#722ed1' },
  { value: 'post-step', label: '11. 后步骤曲线 (Post-step)', color: '#fa8c16' },
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
      return data.gradient
    }
    // 默认两行：第一行为Initial状态，第二行为空
    return [
      { id: Date.now().toString(), stepNo: 0, time: 0.0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'initial' },
      { id: (Date.now() + 1).toString(), stepNo: 1, time: 0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'linear' }
    ]
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
      const defaultSteps = [
        { id: Date.now().toString(), stepNo: 0, time: 0.0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'initial' },
        { id: (Date.now() + 1).toString(), stepNo: 1, time: 0, phaseA: 0, phaseB: 100, flowRate: 0, curve: 'linear' }
      ]
      setGradientSteps(defaultSteps)
      // 立即同步到Context，避免其他页面读取到空数据
      updateGradientData(defaultSteps)
    } else if (data.gradient.length > 0) {
      // 有数据时直接使用
      hasInitialized.current = true
      console.log('🔄 HPLCGradientPage: 立即同步Context数据')
      setGradientSteps(data.gradient)
    }
  }, [data.gradient, updateGradientData])

  // 自动保存数据到 Context 和 localStorage
  // 使用 ref 来避免初始化时触发 dirty 和避免循环更新
  const isInitialMount = React.useRef(true)
  const lastLocalData = React.useRef<string>('')
  
  useEffect(() => {
    const currentLocalDataStr = JSON.stringify(gradientSteps)
    
    localStorage.setItem('hplc_gradient_data', currentLocalDataStr)
    
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
    updateGradientData(gradientSteps)
    setIsDirty(true)
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
      id: Date.now().toString(),
      stepNo: gradientSteps.length,
      time: 0,
  phaseA: 0,
        phaseB: 100,
      flowRate: 0,
      curve: 'linear'
    }
    setGradientSteps([...gradientSteps, newStep])
  }

  // 删除最后一步
  const deleteLastStep = () => {
    if (gradientSteps.length <= 2) {
      message.warning('至少保留两个步骤（Initial + 一个步骤）')
      return
    }
    setGradientSteps(gradientSteps.slice(0, -1))
  }

  // 更新步骤数据
  const updateStep = (id: string, field: keyof GradientStep, value: any) => {
    setGradientSteps(gradientSteps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ))
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
        time: '0.00',
        'Mobile Phase A (%)': step.phaseA,
        'Mobile Phase B (%)': step.phaseB
      })
      // 添加一个时间点以便显示折线
      chartData.push({
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
  const calculateComponentVolumes = (chartData: any[]) => {
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
    const methodsData = localStorage.getItem('hplc_methods_raw')
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

    if (methodsData) {
      const methods = JSON.parse(methodsData)
      
      // 计算 Mobile Phase A 中各试剂的体积
      if (methods.mobilePhaseA && Array.isArray(methods.mobilePhaseA)) {
        const totalPercentage = methods.mobilePhaseA.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0)
        componentVolumes.mobilePhaseA.components = methods.mobilePhaseA
          .filter((r: any) => r.name && r.name.trim())
          .map((r: any) => ({
            reagentName: r.name,
            percentage: r.percentage,
            ratio: totalPercentage > 0 ? r.percentage / totalPercentage : 0,
            volume: totalPercentage > 0 ? (totalVolumeA * r.percentage / totalPercentage) : 0
          }))
      }

      // 计算 Mobile Phase B 中各试剂的体积
      if (methods.mobilePhaseB && Array.isArray(methods.mobilePhaseB)) {
        const totalPercentage = methods.mobilePhaseB.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0)
        componentVolumes.mobilePhaseB.components = methods.mobilePhaseB
          .filter((r: any) => r.name && r.name.trim())
          .map((r: any) => ({
            reagentName: r.name,
            percentage: r.percentage,
            ratio: totalPercentage > 0 ? r.percentage / totalPercentage : 0,
            volume: totalPercentage > 0 ? (totalVolumeB * r.percentage / totalPercentage) : 0
          }))
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
    }

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
  const handleConfirm = () => {
    // 验证数据
    const hasInvalidData = gradientSteps.some(step => 
  step.time < 0 || step.phaseA < 0 || step.phaseA > 100 || step.flowRate < 0
    )
    
    if (hasInvalidData) {
      message.error('请检查输入数据：时间和流速不能为负，Mobile Phase A 必须在 0-100% 之间')
      return
    }

    // 验证时间递增
    for (let i = 1; i < gradientSteps.length; i++) {
      if (gradientSteps[i].time < gradientSteps[i - 1].time) {
        message.error(`步骤 ${i} 的时间必须大于等于步骤 ${i - 1} 的时间`)
        return
      }
    }
    
    // 验证是否有有效的梯度数据（至少一个步骤的时间>0）
    const totalTime = Math.max(...gradientSteps.map(s => s.time))
    if (totalTime === 0) {
      message.warning('请至少输入一个步骤的有效时间（大于0）')
      return
    }

    // chartData 已由 useMemo 在组件作用域中定义
    const componentVolumes = calculateComponentVolumes(chartData)

    const gradientData = {
      // 基础步骤数据
      steps: gradientSteps.map(step => ({
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

    localStorage.setItem('hplc_gradient_data', JSON.stringify(gradientData))
    
    // 触发自定义事件通知其他页面数据已更新
    window.dispatchEvent(new Event('gradientDataUpdated'))
    
    // 打印计算结果到控制台(调试用)
    console.log('=== HPLC Gradient 计算结果 ===')
    console.log('总体积:', componentVolumes?.totalVolume, 'ml')
    console.log('总时间:', componentVolumes?.totalTime, 's')
    console.log('Mobile Phase A 平均百分比:', componentVolumes?.mobilePhaseA.averagePercentage.toFixed(2), '%')
    console.log('Mobile Phase A 体积:', componentVolumes?.mobilePhaseA.volume.toFixed(3), 'ml')
    console.log('Mobile Phase B 平均百分比:', componentVolumes?.mobilePhaseB.averagePercentage.toFixed(2), '%')
    console.log('Mobile Phase B 体积:', componentVolumes?.mobilePhaseB.volume.toFixed(3), 'ml')
    console.log('各试剂总体积:', componentVolumes?.allReagentVolumes)
    console.log('Mobile Phase A 组分:', componentVolumes?.mobilePhaseA.components)
    console.log('Mobile Phase B 组分:', componentVolumes?.mobilePhaseB.components)
    
    message.success('梯度程序已保存，所有计算数据已准备完成')
  }

  // 使用 useMemo 确保 curve 改变时图表会更新
  const chartData = useMemo(() => generateChartData(), [gradientSteps])

  return (
    <div className="hplc-gradient-page">
      <Title level={2}>HPLC Gradient Prg</Title>

      {/* 梯度步骤表格 */}
      <Card style={{ marginBottom: 24 }}>
        <div className="gradient-table">
          <table>
            <thead>
              <tr>
                <th>Step No</th>
                <th>Time</th>
                <th>Mobile Phase A (%)</th>
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
                    <InputNumber
                      min={0}
                      step={0.01}
                      precision={2}
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

      {/* 梯度曲线图 */}
      <Card title="梯度曲线预览">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 't/s', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              label={{ value: '%', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Mobile Phase A (%)" 
              stroke="#1890ff" 
              dot={false}
              strokeWidth={2}
            />
            {/* B曲线已隐藏，不再展示给用户 */}
            {/* <Line 
              type="monotone" 
              dataKey="Mobile Phase B (%)" 
              stroke="#52c41a" 
              dot={false}
              strokeWidth={2}
            /> */}
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
          返回 Methods
        </Button>
        <Button type="primary" size="large" onClick={handleConfirm}>
          确定
        </Button>
      </div>
    </div>
  )
}

export default HPLCGradientPage
