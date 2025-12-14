import React, { useState, useEffect } from 'react'
import { Card, Typography, Alert, Row, Col, Statistic } from 'antd'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts'
import FanChart from '../components/FanChart'
import PolarBarChart from '../components/PolarBarChart'
import NestedPieChart from '../components/NestedPieChart'
import { getColorHex, getAverageColor, getColorRGBA } from '../utils/colorScale'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'

const { Title } = Typography

const PretreatmentAnalysisPage: React.FC = () => {
  const [radarData, setRadarData] = useState<any[]>([])
  const [radarColor, setRadarColor] = useState<string>('#1890ff')
  const [hasData, setHasData] = useState(false)
  const [score2, setScore2] = useState<number>(0)
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
    loadPretreatmentData()

    const handleDataUpdate = () => {
      console.log('PretreatmentAnalysisPage: Data updated, reloading...')
      loadPretreatmentData()
    }

    window.addEventListener('scoreDataUpdated', handleDataUpdate)
    window.addEventListener('fileDataChanged', handleDataUpdate)

    return () => {
      window.removeEventListener('scoreDataUpdated', handleDataUpdate)
      window.removeEventListener('fileDataChanged', handleDataUpdate)
    }
  }, [])

  const loadPretreatmentData = async () => {
    try {
      const scoreResults = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)
      const methodsData = await StorageHelper.getJSON(STORAGE_KEYS.METHODS)

      if (!scoreResults || !scoreResults.preparation) {
        console.log('PretreatmentAnalysisPage: No pretreatment data available')
        setHasData(false)
        return
      }

      console.log('PretreatmentAnalysisPage: Loading pretreatment data', scoreResults.preparation)

      const prep = scoreResults.preparation
      const subFactors = prep.sub_factors || {}
      const prepMajor = prep.major_factors || { S: 0, H: 0, E: 0 }
      const additionalFactors = scoreResults.additional_factors || {}

      // 构建雷达图数据（9个小因子）
      const subFactorValues = [
        subFactors.S1 || 0,
        subFactors.S2 || 0,
        subFactors.S3 || 0,
        subFactors.S4 || 0,
        subFactors.H1 || 0,
        subFactors.H2 || 0,
        subFactors.E1 || 0,
        subFactors.E2 || 0,
        subFactors.E3 || 0
      ]

      const chartData = [
        { subject: 'Release', score: Number((subFactors.S1 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'Fire/Explos', score: Number((subFactors.S2 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'React/Decom', score: Number((subFactors.S3 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'Acute Tox', score: Number((subFactors.S4 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'Chronic Tox', score: Number((subFactors.H1 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'Irritation', score: Number((subFactors.H2 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'Persistency', score: Number((subFactors.E1 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'Emission', score: Number((subFactors.E2 || 0).toFixed(2)), fullMark: 100 },
        { subject: 'Water Haz', score: Number((subFactors.E3 || 0).toFixed(2)), fullMark: 100 }
      ]

      const radarColorData = getAverageColor(subFactorValues)
      setRadarData(chartData)
      setRadarColor(radarColorData.color)

      // 设置大因子（包括前处理阶段的P因子）
      setMainFactorScores({
        S: prepMajor.S || 0,
        H: prepMajor.H || 0,
        E: prepMajor.E || 0,
        R: additionalFactors.pretreatment_R || 0,
        D: additionalFactors.pretreatment_D || 0,
        P: additionalFactors.pretreatment_P || 0 // 前处理阶段的能耗因子
      })

      // 设置小因子
      setSubFactorScores({
        releasePotential: subFactors.S1 || 0,
        fireExplos: subFactors.S2 || 0,
        reactDecom: subFactors.S3 || 0,
        acuteToxicity: subFactors.S4 || 0,
        irritation: subFactors.H2 || 0,
        chronicToxicity: subFactors.H1 || 0,
        persistency: subFactors.E1 || 0,
        airHazard: subFactors.E2 || 0,
        waterHazard: subFactors.E3 || 0
      })

      setScore2(prep.score2 || 0)
      setHasData(true)
    } catch (error) {
      console.error('PretreatmentAnalysisPage: Error loading data:', error)
      setHasData(false)
    }
  }

  const renderCustomTick = (props: any) => {
    const { x, y, payload, index } = props
    const angle = (index * 40) - 90
    const radius = 30
    const radian = (angle * Math.PI) / 180
    const dx = Math.cos(radian) * radius
    const dy = Math.sin(radian) * radius
    
    return (
      <text
        x={x + dx}
        y={y + dy}
        fill="#666"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        {payload.value}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}>{`${payload[0].payload.subject}: ${payload[0].value.toFixed(2)} / 100`}</p>
        </div>
      )
    }
    return null
  }

  const getScoreLevel = (score: number): string => {
    if (score >= 80) return 'Excellent - Highly Compliant'
    if (score >= 60) return 'Good - Well Compliant'
    if (score >= 40) return 'Fair - Moderately Compliant'
    if (score >= 20) return 'Poor - Minimally Compliant'
    return 'Very Poor - Non-Compliant'
  }

  if (!hasData) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>样品前处理绿色度分析</Title>
        <Alert
          message="暂无数据"
          description="请在 Methods 页面完成配置并点击 Calculate 按钮进行评分计算"
          type="info"
          showIcon
          style={{ marginTop: 24 }}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Title level={2}>样品前处理绿色度分析 (Sample Pretreatment)</Title>
      
      {/* 总分卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ 
          padding: '24px', 
          background: `linear-gradient(135deg, ${getColorHex(score2)} 0%, ${getColorHex(Math.min(score2 + 15, 100))} 100%)`,
          borderRadius: 12,
          color: 'white',
          textAlign: 'center',
          boxShadow: `0 4px 16px ${getColorRGBA(score2, 0.3)}`
        }}>
          <div style={{ fontSize: 16, opacity: 0.95, marginBottom: 8 }}>
            样品前处理阶段绿色度评分 (Score₂)
          </div>
          <div style={{ fontSize: 52, fontWeight: 'bold', marginBottom: 12 }}>
            {score2.toFixed(2)}
          </div>
          <div style={{ 
            display: 'inline-block',
            padding: '4px 16px',
            background: 'rgba(255, 255, 255, 0.25)',
            borderRadius: 20,
            fontSize: 13
          }}>
            {getScoreLevel(score2)}
          </div>
        </div>
      </Card>

      {/* 大因子分数卡片 */}
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
            <div style={{ fontSize: 24, fontWeight: 'bold', color: getColorHex(mainFactorScores.S) }}>
              {mainFactorScores.S.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Health (H)</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: getColorHex(mainFactorScores.H) }}>
              {mainFactorScores.H.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Environment (E)</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: getColorHex(mainFactorScores.E) }}>
              {mainFactorScores.E.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Regeneration (R)</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: getColorHex(mainFactorScores.R) }}>
              {mainFactorScores.R.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Disposal (D)</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: getColorHex(mainFactorScores.D) }}>
              {mainFactorScores.D.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 500 }}>Power (P)</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: getColorHex(mainFactorScores.P) }}>
              {mainFactorScores.P.toFixed(2)}
            </div>
          </div>
        </div>
      </Card>

      {/* 四个图表：2行2列 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* 第一行 */}
        {/* 雷达图 */}
        <Col xs={24} xl={12}>
          <Card title="Radar Chart Analysis" style={{ height: '550px' }}>
            <div style={{ width: '100%', height: '500px' }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#d9d9d9" />
                  <PolarAngleAxis dataKey="subject" tick={renderCustomTick} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Radar
                    dataKey="score"
                    stroke={radarColor}
                    fill={radarColor}
                    fillOpacity={0.6}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* 切向极坐标条形图 */}
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
        {/* 扇形图 */}
        <Col xs={24} xl={12}>
          <Card title="Fan Chart Visualization" style={{ height: '550px' }}>
            <div style={{ width: '100%', height: '500px' }}>
              <FanChart scores={mainFactorScores} />
            </div>
          </Card>
        </Col>

        {/* 嵌套环形图 */}
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
    </div>
  )
}

export default PretreatmentAnalysisPage
