import React, { useState, useEffect } from 'react'
import { Card, Typography, Alert, Row, Col, Statistic } from 'antd'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts'
import FanChart from '../components/FanChart'
import PolarBarChart from '../components/PolarBarChart'
import NestedPieChart from '../components/NestedPieChart'
import { getColorHex, getAverageColor, getColorRGBA } from '../utils/colorScale'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'

const { Title } = Typography

const InstrumentAnalysisPage: React.FC = () => {
  const [radarData, setRadarData] = useState<any[]>([])
  const [radarColor, setRadarColor] = useState<string>('#52c41a')
  const [hasData, setHasData] = useState(false)
  const [score1, setScore1] = useState<number>(0)
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
   
    loadInstrumentData()

    const handleDataUpdate = () => {
      console.log('InstrumentAnalysisPage: Data updated, reloading...')
      loadInstrumentData()
    }
    
    const handleMethodsDataUpdated = async () => {
      console.log('InstrumentAnalysisPage: Methods data updated, triggering recalculation')
      window.dispatchEvent(new CustomEvent('requestScoreRecalculation'))
    }

    window.addEventListener('scoreDataUpdated', handleDataUpdate)
    window.addEventListener('fileDataChanged', handleDataUpdate)
    window.addEventListener('methodsDataUpdated', handleMethodsDataUpdated)

    return () => {
      window.removeEventListener('scoreDataUpdated', handleDataUpdate)
      window.removeEventListener('fileDataChanged', handleDataUpdate)
      window.removeEventListener('methodsDataUpdated', handleMethodsDataUpdated)
    }
  }, [])

  const loadInstrumentData = async () => {
    try {
      const scoreResults = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)

      if (!scoreResults || !scoreResults.instrument) {
        console.log('InstrumentAnalysisPage: No instrument data available')
        setHasData(false)
        return
      }

      console.log('InstrumentAnalysisPage: Loading instrument data', scoreResults.instrument)

      const inst = scoreResults.instrument
      const subFactors = inst.sub_factors || {}
      const instMajor = inst.major_factors || { S: 0, H: 0, E: 0 }
      const additionalFactors = scoreResults.additional_factors || {}

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

     
      setMainFactorScores({
        S: instMajor.S || 0,
        H: instMajor.H || 0,
        E: instMajor.E || 0,
        R: additionalFactors.instrument_R || 0,
        D: additionalFactors.instrument_D || 0,
        P: additionalFactors.P || 0
      })

   
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

      setScore1(inst.score1 || 0)
      setHasData(true)
    } catch (error) {
      console.error('InstrumentAnalysisPage: Error loading data:', error)
      setHasData(false)
    }
  }

  const renderCustomTick = (props: any) => {
    const { x, y, payload, index } = props
    const angle = (index * 40) - 90
    const radius = 35
    const radian = (angle * Math.PI) / 180
    const dx = Math.cos(radian) * radius
    const dy = Math.sin(radian) * radius
    
    return (
      <text
        x={x + dx}
        y={y + dy}
        fill="#000"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight="900"
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
    if (score < 20) return 'Excellent - Fully Compliant'
    if (score < 40) return 'Good - Well Compliant'
    if (score < 60) return 'Fair - Moderately Compliant'
    if (score < 80) return 'Poor - Needs Improvement'
    return 'Very Poor - Non-Compliant'
  }

  if (!hasData) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>Instrument Analysis Green Analytical Chemistry Assessment</Title>
        <Alert
          message="No Data Available"
          description="Please complete the configuration on the Methods page and click the Calculate button to perform scoring"
          type="info"
          showIcon
          style={{ marginTop: 24 }}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Title level={2}>Instrument Analysis Green Analytical Chemistry Assessment</Title>
      
      {/* Total Score Card */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ 
          padding: '24px', 
          background: `linear-gradient(135deg, ${getColorHex(score1)} 0%, ${getColorHex(Math.min(score1 + 15, 100))} 100%)`,
          borderRadius: 12,
          color: 'white',
          textAlign: 'center',
          boxShadow: `0 4px 16px ${getColorRGBA(score1, 0.3)}`
        }}>
          <div style={{ fontSize: 16, opacity: 0.95, marginBottom: 8 }}>
            Instrument Analysis Stage Green Analytical Chemistry Score (Score₂)
          </div>
          <div style={{ fontSize: 52, fontWeight: 'bold', marginBottom: 12 }}>
            {score1.toFixed(2)}
          </div>
          <div style={{ 
            display: 'inline-block',
            padding: '4px 16px',
            background: 'rgba(255, 255, 255, 0.25)',
            borderRadius: 20,
            fontSize: 13
          }}>
            {getScoreLevel(score1)}
          </div>
        </div>
      </Card>

      {/* �����ӷ�����Ƭ */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} justify="space-around">
          <Col xs={12} sm={8} md={8} lg={4} xl={4} style={{ textAlign: 'center' }}>
            <Statistic
              title="Safety (S)"
              value={mainFactorScores.S.toFixed(2)}
              valueStyle={{ color: getColorHex(mainFactorScores.S), fontSize: '20px', fontWeight: 'bold' }}
            />
          </Col>
          <Col xs={12} sm={8} md={8} lg={4} xl={4} style={{ textAlign: 'center' }}>
            <Statistic
              title="Health (H)"
              value={mainFactorScores.H.toFixed(2)}
              valueStyle={{ color: getColorHex(mainFactorScores.H), fontSize: '20px', fontWeight: 'bold' }}
            />
          </Col>
          <Col xs={12} sm={8} md={8} lg={4} xl={4} style={{ textAlign: 'center' }}>
            <Statistic
              title="Environment (E)"
              value={mainFactorScores.E.toFixed(2)}
              valueStyle={{ color: getColorHex(mainFactorScores.E), fontSize: '20px', fontWeight: 'bold' }}
            />
          </Col>
          <Col xs={12} sm={8} md={8} lg={4} xl={4} style={{ textAlign: 'center' }}>
            <Statistic
              title="Regeneration (R)"
              value={mainFactorScores.R.toFixed(2)}
              valueStyle={{ color: getColorHex(mainFactorScores.R), fontSize: '20px', fontWeight: 'bold' }}
            />
          </Col>
          <Col xs={12} sm={8} md={8} lg={4} xl={4} style={{ textAlign: 'center' }}>
            <Statistic
              title="Disposal (D)"
              value={mainFactorScores.D.toFixed(2)}
              valueStyle={{ color: getColorHex(mainFactorScores.D), fontSize: '20px', fontWeight: 'bold' }}
            />
          </Col>
          <Col xs={12} sm={8} md={8} lg={4} xl={4} style={{ textAlign: 'center' }}>
            <Statistic
              title="Power (P)"
              value={mainFactorScores.P.toFixed(2)}
              valueStyle={{ color: getColorHex(mainFactorScores.P), fontSize: '20px', fontWeight: 'bold' }}
            />
          </Col>
        </Row>
      </Card>

      {/* �ĸ�ͼ����2��2�� */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* ��һ�� */}
        {/* �״�ͼ */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12}>
          <Card title="Radar Chart Analysis" style={{ height: 'auto', minHeight: '350px' }}>
            <div style={{ width: '100%', height: '450px', minHeight: '350px' }}>
              <ResponsiveContainer>
                <RadarChart data={radarData} margin={{ top: 50, right:20, bottom: 30, left: 30 }}>
                  <PolarGrid stroke="#000" />
                  <PolarAngleAxis dataKey="subject" tick={renderCustomTick} />
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

        {/* ������������ͼ */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12}>
          <Card title="Tangential Polar Bar Chart" style={{ height: 'auto', minHeight: '350px' }}>
            <div style={{ width: '100%', height: '450px', minHeight: '350px' }}>
              <PolarBarChart scores={mainFactorScores} />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* �ڶ��� */}
        {/* ����ͼ */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12}>
          <Card title="Fan Chart Visualization" style={{ height: 'auto', minHeight: '350px' }}>
            <div style={{ width: '100%', height: '450px', minHeight: '350px' }}>
              <FanChart scores={mainFactorScores} />
            </div>
          </Card>
        </Col>

        {/* Ƕ�׻���ͼ */}
        <Col xs={24} sm={24} md={24} lg={12} xl={12}>
          <Card title="Nested Pie Chart - Main & Sub Factors" style={{ height: 'auto', minHeight: '350px' }}>
            <div style={{ width: '100%', height: '450px', minHeight: '350px' }}>
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

export default InstrumentAnalysisPage
