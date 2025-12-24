import React, { useState, useEffect } from 'react'
import { Card, Typography, Alert, Row, Col, Statistic } from 'antd'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts'
import FanChart from '../components/FanChart'
import PolarBarChart from '../components/PolarBarChart'
import NestedPieChart from '../components/NestedPieChart'
import { getColorHex, getAverageColor, getColorRGBA } from '../utils/colorScale'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'

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

const MethodEvaluationPage: React.FC = () => {
  const [radarData, setRadarData] = useState<any[]>([])
  const [radarColor, setRadarColor] = useState<string>('#8884d8') // 雷达图颜色，基于平均分
  const [hasData, setHasData] = useState(false)
  const [totalScore, setTotalScore] = useState<number>(0)
  const [sampleCount, setSampleCount] = useState<number>(0)
  const [score1, setScore1] = useState<number>(0) // 仪器分析阶段
  const [score2, setScore2] = useState<number>(0) // 前处理阶段
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
    // 页面挂载时，直接加载已有数据
    calculateTotalScores()

    const handleDataUpdate = () => {
      console.log('MethodEvaluationPage: Data updated, recalculating...')
      calculateTotalScores()
    }
    
    const handleFactorsDataUpdated = () => {
      console.log('MethodEvaluationPage: Factors data updated, triggering backend recalculation')
      // Factors 数据变化，需要触发后端重新计算
      window.dispatchEvent(new CustomEvent('requestScoreRecalculation'))
    }
    
    const handleFileDataChanged = () => {
      console.log('MethodEvaluationPage: File data changed event received')
      calculateTotalScores()
    }
    
    const handleScoreDataUpdated = () => {
      console.log('MethodEvaluationPage: Score data updated event received')
      calculateTotalScores()
    }
    
    const handleMethodsDataUpdated = async () => {
      console.log('MethodEvaluationPage: Methods data updated, triggering recalculation')
      // Methods 数据变化时，请求重新计算
      window.dispatchEvent(new CustomEvent('requestScoreRecalculation'))
    }

    window.addEventListener('gradientDataUpdated', handleDataUpdate)
    window.addEventListener('factorsDataUpdated', handleFactorsDataUpdated)
    window.addEventListener('fileDataChanged', handleFileDataChanged)
    window.addEventListener('scoreDataUpdated', handleScoreDataUpdated)
    window.addEventListener('methodsDataUpdated', handleMethodsDataUpdated)

    return () => {
      window.removeEventListener('gradientDataUpdated', handleDataUpdate)
      window.removeEventListener('factorsDataUpdated', handleFactorsDataUpdated)
      window.removeEventListener('fileDataChanged', handleFileDataChanged)
      window.removeEventListener('scoreDataUpdated', handleScoreDataUpdated)
      window.removeEventListener('methodsDataUpdated', handleMethodsDataUpdated)
    }
  }, [])

  const renderCustomTick = (props: any) => {
    const { x, y, payload, index } = props
    // 9个小因子的位置分布（360度均匀分布）
    const angle = (index * 40) - 90 // 从上方开始，顺时针方向
    const radius = 35 // 标签距离中心的距离 - 增加以避免压线
    const radian = (angle * Math.PI) / 180
    const dx = Math.cos(radian) * radius
    const dy = Math.sin(radian) * radius
    
    return (
      <text
        x={x + dx}
        y={y + dy}
        textAnchor="middle"
        fill="#000"
        fontSize={14}
        fontWeight="900"
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

  const calculateTotalScores = async () => {
    try {
      // 优先使用新的评分系统数据
      const scoreResults = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)
      
      if (scoreResults) {
        // 使用新的0-100分制评分系统数据
        console.log('GraphPage: Using new scoring system data (0-100 scale)')
        
        // 从评分结果中提取小因子数据（用于雷达图）
        const mergedSubFactors = scoreResults.merged?.sub_factors || {}
        
        // 构建雷达图数据（9个小因子，0-100分制）
        // 收集所有小因子分数用于计算平均颜色
        const subFactorValues = [
          mergedSubFactors.S1 || 0,
          mergedSubFactors.S2 || 0,
          mergedSubFactors.S3 || 0,
          mergedSubFactors.S4 || 0,
          mergedSubFactors.H1 || 0,
          mergedSubFactors.H2 || 0,
          mergedSubFactors.E1 || 0,
          mergedSubFactors.E2 || 0,
          mergedSubFactors.E3 || 0
        ]
        
        const chartData = [
          {
            subject: 'Release',
            score: Number((mergedSubFactors.S1 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'Fire/Explos',
            score: Number((mergedSubFactors.S2 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'React/Decom',
            score: Number((mergedSubFactors.S3 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'Acute Tox',
            score: Number((mergedSubFactors.S4 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'Chronic Tox',
            score: Number((mergedSubFactors.H1 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'Irritation',
            score: Number((mergedSubFactors.H2 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'Persistency',
            score: Number((mergedSubFactors.E1 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'Emission',
            score: Number((mergedSubFactors.E2 || 0).toFixed(2)),
            fullMark: 100
          },
          {
            subject: 'Water Haz',
            score: Number((mergedSubFactors.E3 || 0).toFixed(2)),
            fullMark: 100
          }
        ]
        
        // 计算小因子平均分和对应颜色
        const radarColorData = getAverageColor(subFactorValues)
        console.log('GraphPage: Radar chart average color:', radarColorData)
        
        setRadarData(chartData)
        setRadarColor(radarColorData.color) // 设置雷达图颜色
        
        // 设置大因子得分（使用最终汇总权重方案的加权平均）
        const instMajor = scoreResults.instrument?.major_factors || { S: 0, H: 0, E: 0 }
        const prepMajor = scoreResults.preparation?.major_factors || { S: 0, H: 0, E: 0 }
        const additionalFactors = scoreResults.additional_factors || { 
          P: 0, 
          instrument_R: 0, 
          instrument_D: 0,
          pretreatment_R: 50, 
          pretreatment_D: 50 
        }
        
        // 从scoreResults获取使用的最终汇总权重方案
        const finalWeights = scoreResults.schemes?.final_scheme || 'Standard'
        const weightMap: Record<string, { instrument: number, preparation: number }> = {
          'Standard': { instrument: 0.6, preparation: 0.4 },
          'Complex_Prep': { instrument: 0.3, preparation: 0.7 },
          'Direct_Online': { instrument: 0.8, preparation: 0.2 },
          'Equal': { instrument: 0.5, preparation: 0.5 }
        }
        const weights = weightMap[finalWeights] || weightMap['Standard']
        console.log(`📊 MethodEvaluationPage: 使用权重方案 ${finalWeights} (仪器:${weights.instrument}, 前处理:${weights.preparation})`)
        
        // 所有大因子都使用最终汇总权重方案的加权平均
        const avgS = instMajor.S * weights.instrument + prepMajor.S * weights.preparation
        const avgH = instMajor.H * weights.instrument + prepMajor.H * weights.preparation
        const avgE = instMajor.E * weights.instrument + prepMajor.E * weights.preparation
        const avgR = (additionalFactors.instrument_R || 0) * weights.instrument + (additionalFactors.pretreatment_R || 0) * weights.preparation
        const avgD = (additionalFactors.instrument_D || 0) * weights.instrument + (additionalFactors.pretreatment_D || 0) * weights.preparation
        const instP = additionalFactors.instrument_P || 0
        const prepP = additionalFactors.pretreatment_P || 0
        const avgP = instP * weights.instrument + prepP * weights.preparation
        
        setMainFactorScores({
          S: avgS,  // 加权平均（使用最终汇总权重）
          H: avgH,  // 加权平均（使用最终汇总权重）
          E: avgE,  // 加权平均（使用最终汇总权重）
          R: avgR,  // 加权平均（使用最终汇总权重）
          D: avgD,  // 加权平均（使用最终汇总权重）
          P: avgP   // 加权平均（使用最终汇总权重）
        })
        
        // 设置总分（0-100分制）
        const finalScore = scoreResults.final?.score3 || 0
        setTotalScore(finalScore)
        
        // 设置阶段评分
        setScore1(scoreResults.instrument?.score1 || 0)
        setScore2(scoreResults.preparation?.score2 || 0)
        
        // 设置小因子得分（0-100分制）
        setSubFactorScores({
          releasePotential: mergedSubFactors.S1 || 0,
          fireExplos: mergedSubFactors.S2 || 0,
          reactDecom: mergedSubFactors.S3 || 0,
          acuteToxicity: mergedSubFactors.S4 || 0,
          irritation: mergedSubFactors.H2 || 0,
          chronicToxicity: mergedSubFactors.H1 || 0,
          persistency: mergedSubFactors.E1 || 0,
          airHazard: mergedSubFactors.E2 || 0,
          waterHazard: mergedSubFactors.E3 || 0
        })
        
        setHasData(true)
        return
      }
      
      // 回退到旧的计算逻辑（0-1分制）
      console.log('GraphPage: Falling back to legacy calculation (0-1 scale)')
      const factorsData = await StorageHelper.getJSON<ReagentFactor[]>(STORAGE_KEYS.FACTORS)
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)

      if (!factorsData || !gradientData || !methodsData) {
        console.log('Missing required data')
        setHasData(false)
        return
      }

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
      const P = await StorageHelper.getJSON<number>(STORAGE_KEYS.POWER_SCORE) || 0
      
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
    <div className="graph-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Title level={2}>Method Green Analytical Chemistry Evaluation</Title>

      {/* Stage Score Comparison */}
      {hasData && score1 > 0 && score2 > 0 && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card 
              style={{ 
                background: `linear-gradient(135deg, ${getColorHex(score1)}30, ${getColorHex(score1)}50)`,
                borderColor: getColorHex(score1)
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Instrument Analysis Stage</div>
                <div style={{ fontSize: 42, fontWeight: 'bold', color: getColorHex(score1) }}>
                  Score₁: {score1.toFixed(2)}
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12} xl={12}>
            <Card 
              style={{ 
                background: `linear-gradient(135deg, ${getColorHex(score2)}30, ${getColorHex(score2)}50)`,
                borderColor: getColorHex(score2)
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Sample Pretreatment Stage</div>
                <div style={{ fontSize: 42, fontWeight: 'bold', color: getColorHex(score2) }}>
                  Score₂: {score2.toFixed(2)}
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 6个大因子的分数卡片 */}
      {hasData && (
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} justify="space-around" style={{ textAlign: 'center' }}>
            <Col xs={12} sm={8} md={8} lg={4} xl={4}>
              <Statistic
                title="Safety (S)"
                value={mainFactorScores.S.toFixed(3)}
                valueStyle={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={12} sm={8} md={8} lg={4} xl={4}>
              <Statistic
                title="Health (H)"
                value={mainFactorScores.H.toFixed(3)}
                valueStyle={{ color: '#fa8c16', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={12} sm={8} md={8} lg={4} xl={4}>
              <Statistic
                title="Environment (E)"
                value={mainFactorScores.E.toFixed(3)}
                valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={12} sm={8} md={8} lg={4} xl={4}>
              <Statistic
                title="Regeneration (R)"
                value={mainFactorScores.R.toFixed(3)}
                valueStyle={{ color: '#f5222d', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={12} sm={8} md={8} lg={4} xl={4}>
              <Statistic
                title="Disposal (D)"
                value={mainFactorScores.D.toFixed(3)}
                valueStyle={{ color: '#722ed1', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={12} sm={8} md={8} lg={4} xl={4}>
              <Statistic
                title="Power (P)"
                value={mainFactorScores.P.toFixed(3)}
                valueStyle={{ color: '#eb2f96', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 总分卡片 - 使用新评分系统 */}
      {hasData && totalScore > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ 
            padding: '24px', 
            background: `linear-gradient(135deg, ${getColorHex(totalScore)} 0%, ${getColorHex(Math.min(totalScore + 15, 100))} 100%)`,
            borderRadius: 12,
            color: 'white',
            textAlign: 'center',
            boxShadow: `0 4px 16px ${getColorRGBA(totalScore, 0.3)}`,
            transition: 'all 0.3s ease'
          }}>
            <div style={{ fontSize: 16, opacity: 0.95, marginBottom: 8, fontWeight: 500 }}>
              Final Green Analytical Chemistry Score (Score₃)
            </div>
            <div style={{ fontSize: 52, fontWeight: 'bold', marginBottom: 12, textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              {totalScore.toFixed(2)}
            </div>
            <div style={{ 
              display: 'inline-block',
              padding: '4px 16px',
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500
            }}>
              {totalScore < 20 ? 'Excellent - Fully Compliant' :
               totalScore < 40 ? 'Good - Well Compliant' :
               totalScore < 60 ? 'Moderate - Acceptable' :
               totalScore < 80 ? 'Poor - Needs Improvement' :
               'Very Poor - Non-Compliant'}
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
            <Col xs={24} sm={24} md={24} lg={12} xl={12}>
              <Card title="Radar Chart Analysis" style={{ height: 'auto', minHeight: '500px' }}>
                <div style={{ width: '100%', height: '450px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 50, right:20, bottom: 30, left: 30 }}>
                      <PolarGrid stroke="#000" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={renderCustomTick}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        dataKey="score"
                        stroke={radarColor}
                        strokeWidth={3}
                        fill={radarColor}
                        fillOpacity={0.6}
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            {/* 右上：切向极坐标条形图 */}
            <Col xs={24} sm={24} md={24} lg={12} xl={12}>
              <Card title="Tangential Polar Bar Chart" style={{ height: 'auto', minHeight: '500px' }}>
                <div style={{ width: '100%', height: '450px' }}>
                  <PolarBarChart scores={mainFactorScores} />
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            {/* 第二行 */}
            {/* 左下：扇子图 */}
            <Col xs={24} sm={24} md={24} lg={12} xl={12}>
              <Card title="Fan Chart Visualization" style={{ height: 'auto', minHeight: '500px' }}>
                <div style={{ width: '100%', height: '450px' }}>
                  <FanChart scores={mainFactorScores} />
                </div>
              </Card>
            </Col>

            {/* 右下：嵌套环形图 - 内圈6个大因子，外圈9个小因子 */}
            <Col xs={24} sm={24} md={24} lg={12} xl={12}>
              <Card title="Nested Pie Chart - Main & Sub Factors" style={{ height: 'auto', minHeight: '500px' }}>
                <div style={{ width: '100%', height: '450px' }}>
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

export default MethodEvaluationPage
