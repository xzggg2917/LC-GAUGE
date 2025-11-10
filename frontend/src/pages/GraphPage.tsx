import React, { useState, useEffect } from 'react'
import { Card, Typography, Alert } from 'antd'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const { Title } = Typography

interface ReagentFactor {
  id: string
  name: string
  density: number
  safetyScore: number
  healthScore: number
  envScore: number
  recycleScore: number
  disposal: number
  power: number
}

const GraphPage: React.FC = () => {
  const [radarData, setRadarData] = useState<any[]>([])
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    calculateTotalScores()

    // 监听数据更新
    const handleDataUpdate = () => {
      console.log('🔔 GraphPage: 检测到数据更新，重新计算雷达图...')
      calculateTotalScores()
    }
    
    // 监听文件数据变更事件
    const handleFileDataChanged = () => {
      console.log('📢 GraphPage: 接收到 fileDataChanged 事件，立即重新计算')
      calculateTotalScores()
    }

    window.addEventListener('gradientDataUpdated', handleDataUpdate)
    window.addEventListener('factorsDataUpdated', handleDataUpdate)
    window.addEventListener('fileDataChanged', handleFileDataChanged)

    return () => {
      window.removeEventListener('gradientDataUpdated', handleDataUpdate)
      window.removeEventListener('factorsDataUpdated', handleDataUpdate)
      window.removeEventListener('fileDataChanged', handleFileDataChanged)
    }
  }, [])

  // 自定义雷达图标签渲染函数
  const renderCustomTick = (props: any) => {
    const { x, y, payload, index } = props
    const positions = [
      { dx: 0, dy: -25 },      // 安全性 (S) - 上方，远离数值
      { dx: 30, dy: -10 },     // 健康危害 (H) - 右上
      { dx: 35, dy: 10 },      // 环境影响 (E) - 右下  
      { dx: 0, dy: 18 },       // 可回收性 (R) - 下方，往上提避开图例
      { dx: -35, dy: 10 },     // 处置难度 (D) - 左下
      { dx: -30, dy: -10 }     // 耗能 (P) - 左上
    ]
    
    const pos = positions[index] || { dx: 0, dy: 0 }
    
    return (
      <text
        x={x + pos.dx}
        y={y + pos.dy}
        textAnchor="middle"
        fill="#666"
        fontSize={15}
        fontWeight="500"
      >
        {payload.value}
      </text>
    )
  }

  const calculateTotalScores = () => {
    try {
      // 加载数据
      const factorsDataStr = localStorage.getItem('hplc_factors_data')
      const gradientDataStr = localStorage.getItem('hplc_gradient_data')
      const methodsDataStr = localStorage.getItem('hplc_methods_raw')

      if (!factorsDataStr || !gradientDataStr || !methodsDataStr) {
        console.log('❌ 缺少必要数据')
        setHasData(false)
        return
      }

      const factorsData: ReagentFactor[] = JSON.parse(factorsDataStr)
      const gradientData = JSON.parse(gradientDataStr)
      const methodsData = JSON.parse(methodsDataStr)

      // 初始化总得分
      let totalScores = {
        S: 0,  // 安全性
        H: 0,  // 健康危害
        E: 0,  // 环境影响
        R: 0,  // 可回收性
        D: 0,  // 处置难度
        P: 0   // 耗能
      }

      // 1. 计算 Sample PreTreatment 的得分
      if (methodsData.preTreatmentReagents && Array.isArray(methodsData.preTreatmentReagents)) {
        methodsData.preTreatmentReagents.forEach((reagent: any) => {
          if (!reagent.name || reagent.volume <= 0) return

          const factor = factorsData.find(f => f.name === reagent.name)
          if (!factor) return

          const mass = reagent.volume * factor.density // 质量 = 体积 × 密度

          totalScores.S += mass * factor.safetyScore
          totalScores.H += mass * factor.healthScore
          totalScores.E += mass * factor.envScore
          totalScores.R += mass * factor.recycleScore
          totalScores.D += mass * factor.disposal
          totalScores.P += mass * factor.power
        })
      }

      // 2. 计算 Mobile Phase A 和 B 的得分（从梯度数据中获取）
      const calculations = gradientData.calculations
      if (calculations) {
        // Mobile Phase A
        if (calculations.mobilePhaseA?.components) {
          calculations.mobilePhaseA.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return

            const factor = factorsData.find(f => f.name === component.reagentName)
            if (!factor) return

            const mass = component.volume * factor.density

            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * factor.recycleScore
            totalScores.D += mass * factor.disposal
            totalScores.P += mass * factor.power
          })
        }

        // Mobile Phase B
        if (calculations.mobilePhaseB?.components) {
          calculations.mobilePhaseB.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return

            const factor = factorsData.find(f => f.name === component.reagentName)
            if (!factor) return

            const mass = component.volume * factor.density

            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * factor.recycleScore
            totalScores.D += mass * factor.disposal
            totalScores.P += mass * factor.power
          })
        }
      }

      // 3. 构建雷达图数据
      const chartData = [
        {
          subject: '安全性 (S)',
          score: Number(totalScores.S.toFixed(3)),
          fullMark: Math.max(totalScores.S * 1.2, 10)
        },
        {
          subject: '健康危害 (H)',
          score: Number(totalScores.H.toFixed(3)),
          fullMark: Math.max(totalScores.H * 1.2, 10)
        },
        {
          subject: '环境影响 (E)',
          score: Number(totalScores.E.toFixed(3)),
          fullMark: Math.max(totalScores.E * 1.2, 10)
        },
        {
          subject: '可回收性 (R)',
          score: Number(totalScores.R.toFixed(3)),
          fullMark: Math.max(totalScores.R * 1.2, 10)
        },
        {
          subject: '处置难度 (D)',
          score: Number(totalScores.D.toFixed(3)),
          fullMark: Math.max(totalScores.D * 1.2, 10)
        },
        {
          subject: '耗能 (P)',
          score: Number(totalScores.P.toFixed(3)),
          fullMark: Math.max(totalScores.P * 1.2, 10)
        }
      ]

      console.log('📊 雷达图数据:', chartData)
      setRadarData(chartData)
      setHasData(true)

    } catch (error) {
      console.error('❌ 计算雷达图数据失败:', error)
      setHasData(false)
    }
  }

  return (
    <div className="graph-page">
      <Title level={2}>绿色化学评估雷达图</Title>

      {!hasData ? (
        <Alert
          message="暂无数据"
          description="请先完成 Factors、Methods 和 HPLC Gradient 的配置，然后刷新此页面。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Card>
          <ResponsiveContainer width="100%" height={650}>
            <RadarChart data={radarData} margin={{ top: 80, right: 180, bottom: 100, left: 180 }}>
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={renderCustomTick}
              />
              <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
              <Radar
                name="综合得分"
                dataKey="score"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <Title level={4}>得分详情</Title>
            {radarData.map((item, index) => (
              <div key={index} style={{ marginBottom: 8 }}>
                <strong>{item.subject}:</strong> {item.score}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default GraphPage
