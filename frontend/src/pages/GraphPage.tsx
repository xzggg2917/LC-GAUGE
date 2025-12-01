import React, { useState, useEffect } from 'react'
import { Card, Typography, Alert, Row, Col } from 'antd'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts'
import FanChart from '../components/FanChart'
import PolarBarChart from '../components/PolarBarChart'
import NestedPieChart from '../components/NestedPieChart'

const { Title } = Typography

interface ReagentFactor {
  id: string
  name: string
  density: number
  // Sub-factors
  releasePotential: number
  fireExplos: number
  reactDecom: number
  acuteToxicity: number
  irritation: number
  chronicToxicity: number
  persistency: number
  airHazard: number
  waterHazard: number
  // Main factors (aggregated scores)
  safetyScore: number
  healthScore: number
  envScore: number
  regeneration?: number
  disposal: number
}

const GraphPage: React.FC = () => {
  const [radarData, setRadarData] = useState<any[]>([])
  const [hasData, setHasData] = useState(false)
  const [totalScore, setTotalScore] = useState<number>(0)
  const [sampleCount, setSampleCount] = useState<number>(0)
  const [mainFactorScores, setMainFactorScores] = useState({
    S: 0,
    H: 0,
    E: 0,
    R: 0,
    D: 0,
    P: 0
  })
  const [subFactorScores, setSubFactorScores] = useState({
    releasePotential: 0,
    fireExplos: 0,
    reactDecom: 0,
    acuteToxicity: 0,
    irritation: 0,
    chronicToxicity: 0,
    persistency: 0,
    airHazard: 0,
    waterHazard: 0
  })

  useEffect(() => {
    calculateTotalScores()

    const handleDataUpdate = () => {
      console.log('GraphPage: Data updated, recalculating...')
      calculateTotalScores()
    }
    
    const handleFileDataChanged = () => {
      console.log('GraphPage: File data changed event received')
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

  const renderCustomTick = (props: any) => {
    const { x, y, payload, index } = props
    // 9个小因子的位置分布（360度均匀分布）
    const angle = (index * 40) - 90 // 从上方开始，顺时针方向
    const radius = 30 // 标签距离中心的距离 - 进一步减小以更贴近图表
    const radian = (angle * Math.PI) / 180
    const dx = Math.cos(radian) * radius
    const dy = Math.sin(radian) * radius
    
    return (
      <text
        x={x + dx}
        y={y + dy}
        textAnchor="middle"
        fill="#666"
        fontSize={12}
        fontWeight="700"
      >
        {payload.value}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: 8 }}>
            {data.subject}
          </p>
          <p style={{ margin: 0, color: '#1890ff' }}>
            Score: <strong>{data.score}</strong>
          </p>
        </div>
      )
    }
    return null
  }

  const calculateTotalScores = () => {
    try {
      const factorsDataStr = localStorage.getItem('hplc_factors_data')
      const gradientDataStr = localStorage.getItem('hplc_gradient_data')
      const methodsDataStr = localStorage.getItem('hplc_methods_raw')

      if (!factorsDataStr || !gradientDataStr || !methodsDataStr) {
        console.log('Missing required data')
        setHasData(false)
        return
      }

      const factorsData: ReagentFactor[] = JSON.parse(factorsDataStr)
      const gradientData = JSON.parse(gradientDataStr)
      const methodsData = JSON.parse(methodsDataStr)

      const sampleCountValue = methodsData.sampleCount || 0
      setSampleCount(sampleCountValue)

      const totalScores = {
        S: 0,
        H: 0,
        E: 0,
        R: 0,
        D: 0,
        P: 0,
        // Sub-factors for radar chart
        releasePotential: 0,
        fireExplos: 0,
        reactDecom: 0,
        acuteToxicity: 0,
        irritation: 0,
        chronicToxicity: 0,
        persistency: 0,
        airHazard: 0,
        waterHazard: 0
      }

      if (methodsData.preTreatmentReagents && Array.isArray(methodsData.preTreatmentReagents)) {
        methodsData.preTreatmentReagents.forEach((reagent: any) => {
          if (!reagent.name || reagent.volume <= 0) return

          const factor = factorsData.find(f => f.name === reagent.name)
          if (!factor) return

          const mass = reagent.volume * factor.density

          totalScores.S += mass * factor.safetyScore
          totalScores.H += mass * factor.healthScore
          totalScores.E += mass * factor.envScore
          totalScores.R += mass * (factor.regeneration || 0)
          totalScores.D += mass * factor.disposal
          
          // Sub-factors
          totalScores.releasePotential += mass * (factor.releasePotential || 0)
          totalScores.fireExplos += mass * (factor.fireExplos || 0)
          totalScores.reactDecom += mass * (factor.reactDecom || 0)
          totalScores.acuteToxicity += mass * (factor.acuteToxicity || 0)
          totalScores.irritation += mass * (factor.irritation || 0)
          totalScores.chronicToxicity += mass * (factor.chronicToxicity || 0)
          totalScores.persistency += mass * (factor.persistency || 0)
          totalScores.airHazard += mass * (factor.airHazard || 0)
          totalScores.waterHazard += mass * (factor.waterHazard || 0)
        })
      }

      const calculations = gradientData.calculations
      if (calculations) {
        if (calculations.mobilePhaseA?.components) {
          calculations.mobilePhaseA.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return

            const factor = factorsData.find(f => f.name === component.reagentName)
            if (!factor) return

            const mass = component.volume * factor.density

            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * (factor.regeneration || 0)
            totalScores.D += mass * factor.disposal
            // P is method-level, not reagent-level
            
            // Sub-factors
            totalScores.releasePotential += mass * (factor.releasePotential || 0)
            totalScores.fireExplos += mass * (factor.fireExplos || 0)
            totalScores.reactDecom += mass * (factor.reactDecom || 0)
            totalScores.acuteToxicity += mass * (factor.acuteToxicity || 0)
            totalScores.irritation += mass * (factor.irritation || 0)
            totalScores.chronicToxicity += mass * (factor.chronicToxicity || 0)
            totalScores.persistency += mass * (factor.persistency || 0)
            totalScores.airHazard += mass * (factor.airHazard || 0)
            totalScores.waterHazard += mass * (factor.waterHazard || 0)
          })
        }

        if (calculations.mobilePhaseB?.components) {
          calculations.mobilePhaseB.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return

            const factor = factorsData.find(f => f.name === component.reagentName)
            if (!factor) return

            const mass = component.volume * factor.density

            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * (factor.regeneration || 0)
            totalScores.D += mass * factor.disposal
            // P is method-level, not reagent-level
            
            // Sub-factors
            totalScores.releasePotential += mass * (factor.releasePotential || 0)
            totalScores.fireExplos += mass * (factor.fireExplos || 0)
            totalScores.reactDecom += mass * (factor.reactDecom || 0)
            totalScores.acuteToxicity += mass * (factor.acuteToxicity || 0)
            totalScores.irritation += mass * (factor.irritation || 0)
            totalScores.chronicToxicity += mass * (factor.chronicToxicity || 0)
            totalScores.persistency += mass * (factor.persistency || 0)
            totalScores.airHazard += mass * (factor.airHazard || 0)
            totalScores.waterHazard += mass * (factor.waterHazard || 0)
          })
        }
      }

      // 从 Methods 页面获取 P 值
      const pScoreStr = localStorage.getItem('hplc_power_score')
      const P = pScoreStr ? parseFloat(pScoreStr) : 0
      
      const sumOfAllScores = totalScores.S + totalScores.H + totalScores.E + totalScores.R + totalScores.D + P
      const calculatedTotalScore = sampleCountValue > 0 ? sumOfAllScores / sampleCountValue : 0
      setTotalScore(calculatedTotalScore)
      
      // 保存大因子数据供 FanChart 和 PolarBarChart 使用
      setMainFactorScores({
        S: totalScores.S,
        H: totalScores.H,
        E: totalScores.E,
        R: totalScores.R,
        D: totalScores.D,
        P: P
      })

      // 保存小因子数据供 NestedPieChart 使用
      setSubFactorScores({
        releasePotential: totalScores.releasePotential,
        fireExplos: totalScores.fireExplos,
        reactDecom: totalScores.reactDecom,
        acuteToxicity: totalScores.acuteToxicity,
        irritation: totalScores.irritation,
        chronicToxicity: totalScores.chronicToxicity,
        persistency: totalScores.persistency,
        airHazard: totalScores.airHazard,
        waterHazard: totalScores.waterHazard
      })

      // 雷达图显示9个小因子
      const chartData = [
        {
          subject: 'Release potential',
          score: Number(totalScores.releasePotential.toFixed(3)),
          fullMark: Math.max(totalScores.releasePotential * 1.2, 10)
        },
        {
          subject: 'Fire/Explos.',
          score: Number(totalScores.fireExplos.toFixed(3)),
          fullMark: Math.max(totalScores.fireExplos * 1.2, 10)
        },
        {
          subject: 'React./Decom.',
          score: Number(totalScores.reactDecom.toFixed(3)),
          fullMark: Math.max(totalScores.reactDecom * 1.2, 10)
        },
        {
          subject: 'Acute toxicity',
          score: Number(totalScores.acuteToxicity.toFixed(3)),
          fullMark: Math.max(totalScores.acuteToxicity * 1.2, 10)
        },
        {
          subject: 'Irritation',
          score: Number(totalScores.irritation.toFixed(3)),
          fullMark: Math.max(totalScores.irritation * 1.2, 10)
        },
        {
          subject: 'Chronic toxicity',
          score: Number(totalScores.chronicToxicity.toFixed(3)),
          fullMark: Math.max(totalScores.chronicToxicity * 1.2, 10)
        },
        {
          subject: 'Persis-tency',
          score: Number(totalScores.persistency.toFixed(3)),
          fullMark: Math.max(totalScores.persistency * 1.2, 10)
        },
        {
          subject: 'Air Hazard',
          score: Number(totalScores.airHazard.toFixed(3)),
          fullMark: Math.max(totalScores.airHazard * 1.2, 10)
        },
        {
          subject: 'Water Hazard',
          score: Number(totalScores.waterHazard.toFixed(3)),
          fullMark: Math.max(totalScores.waterHazard * 1.2, 10)
        }
      ]

      console.log('Radar chart data:', chartData)
      console.log('Total score:', calculatedTotalScore.toFixed(3), 'Sample count:', sampleCountValue)
      setRadarData(chartData)
      setHasData(true)

    } catch (error) {
      console.error('Failed to calculate radar chart data:', error)
      setHasData(false)
    }
  }

  return (
    <div className="graph-page">
      <Title level={2}>Green Chemistry Assessment Scores</Title>

      {/* 6个大因子的分数卡片 */}
      {hasData && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-around', 
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Safety (S)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{mainFactorScores.S.toFixed(3)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Health (H)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{mainFactorScores.H.toFixed(3)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Environment (E)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{mainFactorScores.E.toFixed(3)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Regeneration (R)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>{mainFactorScores.R.toFixed(3)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Disposal (D)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>{mainFactorScores.D.toFixed(3)}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Power (P)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#eb2f96' }}>
                {(localStorage.getItem('hplc_power_score') ? parseFloat(localStorage.getItem('hplc_power_score')!) : 0).toFixed(3)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 总分卡片 */}
      {hasData && sampleCount > 0 && totalScore > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 8 }}>Overall Total Score</div>
            <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 8 }}>{totalScore.toFixed(3)}</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Formula: ((S + H + E + R + D) + P) / Sample Count ({sampleCount})
            </div>
          </div>
        </Card>
      )}

      {!hasData ? (
        <Alert
          message="No Data Available"
          description="Please complete Factors, Methods, and HPLC Gradient configuration, then refresh this page."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      ) : (
        <>
          {/* 四等分布局：2行2列 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* 第一行 */}
            {/* 左上：雷达图 */}
            <Col xs={24} xl={12}>
              <Card title="Radar Chart Analysis" style={{ height: '550px' }}>
                <div style={{ width: '100%', height: '500px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 50, right:20, bottom: 30, left: 30 }}>
                      <PolarGrid />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={renderCustomTick}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
                      <Radar
                        dataKey="score"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            {/* 右上：切向极坐标条形图 */}
            <Col xs={24} xl={12}>
              <Card title="Tangential Polar Bar Chart" style={{ height: '550px' }}>
                <div style={{ width: '100%', height: '500px' }}>
                  <PolarBarChart scores={mainFactorScores} />
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            {/* 第二行 */}
            {/* 左下：扇子图 */}
            <Col xs={24} xl={12}>
              <Card title="Fan Chart Visualization" style={{ height: '550px' }}>
                <div style={{ width: '100%', height: '500px' }}>
                  <FanChart scores={mainFactorScores} />
                </div>
              </Card>
            </Col>

            {/* 右下：嵌套环形图 - 内圈6个大因子，外圈9个小因子 */}
            <Col xs={24} xl={12}>
              <Card title="Nested Pie Chart - Main & Sub Factors" style={{ height: '550px' }}>
                <div style={{ width: '100%', height: '500px' }}>
                  <NestedPieChart 
                    mainFactors={mainFactorScores}
                    subFactors={subFactorScores}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default GraphPage
