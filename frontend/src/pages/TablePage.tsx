import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Descriptions, Alert, Tabs, Statistic, Row, Col } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography
const { TabPane } = Tabs

interface ReagentFactor {
  id: string
  name: string
  density: number
  safetyScore: number
  healthScore: number
  envScore: number
  regeneration?: number
  recycleScore: number
  disposal: number
}

interface ReagentDetail {
  reagentName: string
  volume: number
  density: number
  mass: number
  S: number
  H: number
  E: number
  R: number
  D: number
  source: string
}

const TablePage: React.FC = () => {
  const [hasData, setHasData] = useState(false)
  const [sampleCount, setSampleCount] = useState(0)
  const [preTreatmentData, setPreTreatmentData] = useState<ReagentDetail[]>([])
  const [phaseAData, setPhaseAData] = useState<ReagentDetail[]>([])
  const [phaseBData, setPhaseBData] = useState<ReagentDetail[]>([])
  const [gradientInfo, setGradientInfo] = useState<any>(null)
  const [totalScores, setTotalScores] = useState<any>(null)

  useEffect(() => {
    loadAllData()

    // 监听数据更新
    const handleDataUpdate = () => {
      console.log('🔔 TablePage: 检测到数据更新，重新加载表格...')
      loadAllData()
    }
    
    // 监听文件数据变更事件
    const handleFileDataChanged = () => {
      console.log('📢 TablePage: 接收到 fileDataChanged 事件，立即重新加载')
      loadAllData()
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

  const loadAllData = () => {
    try {
      // 加载所有数据源
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

      // 保存基本信息
      setSampleCount(methodsData.sampleCount || 0)
      setGradientInfo({
        totalVolume: gradientData.calculations?.totalVolume || 0,
        totalTime: gradientData.calculations?.totalTime || 0,
        steps: gradientData.steps || []
      })

      // 处理 Sample PreTreatment 数据
      const preTreatmentDetails: ReagentDetail[] = []
      if (methodsData.preTreatmentReagents && Array.isArray(methodsData.preTreatmentReagents)) {
        methodsData.preTreatmentReagents.forEach((reagent: any) => {
          if (!reagent.name || reagent.volume <= 0) return

          const factor = factorsData.find(f => f.name === reagent.name)
          if (!factor) return

          const mass = reagent.volume * factor.density
          const S = mass * factor.safetyScore
          const H = mass * factor.healthScore
          const E = mass * factor.envScore
          const R = mass * (factor.regeneration || 0)
          const D = mass * factor.disposal

          preTreatmentDetails.push({
            reagentName: reagent.name,
            volume: reagent.volume,
            density: factor.density,
            mass: mass,
            S: S,
            H: H,
            E: E,
            R: R,
            D: D,
            source: 'Sample PreTreatment'
          })
        })
      }

      // 处理 Mobile Phase A 数据
      const phaseADetails: ReagentDetail[] = []
      if (gradientData.calculations?.mobilePhaseA?.components) {
        gradientData.calculations.mobilePhaseA.components.forEach((component: any) => {
          if (!component.reagentName || component.volume <= 0) return

          const factor = factorsData.find(f => f.name === component.reagentName)
          if (!factor) return

          const mass = component.volume * factor.density
          const S = mass * factor.safetyScore
          const H = mass * factor.healthScore
          const E = mass * factor.envScore
          const R = mass * (factor.regeneration || 0)
          const D = mass * factor.disposal

          phaseADetails.push({
            reagentName: component.reagentName,
            volume: component.volume,
            density: factor.density,
            mass: mass,
            S: S,
            H: H,
            E: E,
            R: R,
            D: D,
            source: 'Mobile Phase A'
          })
        })
      }

      // 处理 Mobile Phase B 数据
      const phaseBDetails: ReagentDetail[] = []
      if (gradientData.calculations?.mobilePhaseB?.components) {
        gradientData.calculations.mobilePhaseB.components.forEach((component: any) => {
          if (!component.reagentName || component.volume <= 0) return

          const factor = factorsData.find(f => f.name === component.reagentName)
          if (!factor) return

          const mass = component.volume * factor.density
          const S = mass * factor.safetyScore
          const H = mass * factor.healthScore
          const E = mass * factor.envScore
          const R = mass * (factor.regeneration || 0)
          const D = mass * factor.disposal

          phaseBDetails.push({
            reagentName: component.reagentName,
            volume: component.volume,
            density: factor.density,
            mass: mass,
            S: S,
            H: H,
            E: E,
            R: R,
            D: D,
            source: 'Mobile Phase B'
          })
        })
      }

      // 计算总得分
      const allDetails = [...preTreatmentDetails, ...phaseADetails, ...phaseBDetails]
      const totals = {
        totalVolume: allDetails.reduce((sum, r) => sum + r.volume, 0),
        totalMass: allDetails.reduce((sum, r) => sum + r.mass, 0),
        S: allDetails.reduce((sum, r) => sum + r.S, 0),
        H: allDetails.reduce((sum, r) => sum + r.H, 0),
        E: allDetails.reduce((sum, r) => sum + r.E, 0),
        R: allDetails.reduce((sum, r) => sum + r.R, 0),
        D: allDetails.reduce((sum, r) => sum + r.D, 0)
      }
      
      // 从 Methods 页面获取 P 值
      const pScoreStr = localStorage.getItem('hplc_power_score')
      const P = pScoreStr ? parseFloat(pScoreStr) : 0
      
      // 计算总分：((S+H+E+R+D) + P) / sampleCount
      // 注意：S/H/E/R/D 已经是与质量相乘后的总和，P是方法级别的因子不乘质量
      const totalSum = totals.S + totals.H + totals.E + totals.R + totals.D + P
      const totalScore = sampleCount > 0 ? totalSum / sampleCount : 0

      setPreTreatmentData(preTreatmentDetails)
      setPhaseAData(phaseADetails)
      setPhaseBData(phaseBDetails)
      setTotalScores({ ...totals, totalScore })
      setHasData(true)

    } catch (error) {
      console.error('❌ 加载数据失败:', error)
      setHasData(false)
    }
  }

  // Reagent detail table column definitions
  const reagentColumns: ColumnsType<ReagentDetail> = [
    {
      title: 'Reagent Name',
      dataIndex: 'reagentName',
      key: 'reagentName',
      width: 150,
      fixed: 'left'
    },
    {
      title: 'Volume (ml)',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Density (g/ml)',
      dataIndex: 'density',
      key: 'density',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Mass (g)',
      dataIndex: 'mass',
      key: 'mass',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Safety (S)',
      dataIndex: 'S',
      key: 'S',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Health Hazard (H)',
      dataIndex: 'H',
      key: 'H',
      width: 120,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Environmental Impact (E)',
      dataIndex: 'E',
      key: 'E',
      width: 120,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Recyclability (R)',
      dataIndex: 'R',
      key: 'R',
      width: 120,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Disposal Difficulty (D)',
      dataIndex: 'D',
      key: 'D',
      width: 120,
      render: (val) => val.toFixed(3)
    }
  ]

  // Gradient step table column definitions
  const gradientStepsColumns: ColumnsType<any> = [
    {
      title: 'Step',
      dataIndex: 'stepNo',
      key: 'stepNo',
      width: 80
    },
    {
      title: 'Time (min)',
      dataIndex: 'time',
      key: 'time',
      width: 100
    },
    {
      title: 'Mobile Phase A (%)',
      dataIndex: 'phaseA',
      key: 'phaseA',
      width: 150
    },
    {
      title: 'Mobile Phase B (%)',
      dataIndex: 'phaseB',
      key: 'phaseB',
      width: 150
    },
    {
      title: 'Flow Rate (ml/min)',
      dataIndex: 'flowRate',
      key: 'flowRate',
      width: 120
    },
    {
      title: 'Volume (ml)',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'Curve Type',
      dataIndex: 'curve',
      key: 'curve',
      width: 100
    }
  ]

  return (
    <div className="table-page">
      <Title level={2}>Comprehensive Data Report</Title>

      {!hasData ? (
        <Alert
          message="No Data Available"
          description="Please complete Factors, Methods, and HPLC Gradient configuration first."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      ) : (
        <>
          {/* Basic Information Overview */}
          <Card title="Basic Information" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="Sample Count" value={sampleCount} />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Total Volume" 
                  value={totalScores?.totalVolume || 0} 
                  precision={3}
                  suffix="ml" 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Total Mass" 
                  value={totalScores?.totalMass || 0} 
                  precision={3}
                  suffix="g" 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="Total Gradient Time" 
                  value={gradientInfo?.totalTime || 0} 
                  suffix="min" 
                />
              </Col>
            </Row>
          </Card>

          {/* Total Score Summary */}
          <Card title="Green Chemistry Assessment Total Scores" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic 
                  title="Safety (S)" 
                  value={totalScores?.S || 0} 
                  precision={3}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="Health Hazard (H)" 
                  value={totalScores?.H || 0} 
                  precision={3}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="Environmental Impact (E)" 
                  value={totalScores?.E || 0} 
                  precision={3}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="Regeneration (R)" 
                  value={totalScores?.R || 0} 
                  precision={3}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="Disposal (D)" 
                  value={totalScores?.D || 0} 
                  precision={3}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="Power (P)" 
                  value={(localStorage.getItem('hplc_power_score') ? parseFloat(localStorage.getItem('hplc_power_score')!) : 0).toFixed(3)} 
                  precision={3}
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Detailed Data Tables */}
          <Tabs defaultActiveKey="1">
            <TabPane tab="Sample PreTreatment Details" key="1">
              <Table
                columns={reagentColumns}
                dataSource={preTreatmentData}
                rowKey={(record) => `${record.source}-${record.reagentName}`}
                pagination={false}
                scroll={{ x: 1200 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0}>Subtotal</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        {preTreatmentData.reduce((sum, r) => sum + r.volume, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        {preTreatmentData.reduce((sum, r) => sum + r.mass, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        {preTreatmentData.reduce((sum, r) => sum + r.S, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        {preTreatmentData.reduce((sum, r) => sum + r.H, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        {preTreatmentData.reduce((sum, r) => sum + r.E, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        {preTreatmentData.reduce((sum, r) => sum + r.R, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8}>
                        {preTreatmentData.reduce((sum, r) => sum + r.D, 0).toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>

            <TabPane tab="Mobile Phase A Details" key="2">
              <Card size="small" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Total Volume">
                    {phaseAData.reduce((sum, r) => sum + r.volume, 0).toFixed(3)} ml
                  </Descriptions.Item>
                  <Descriptions.Item label="Average Percentage">
                    {gradientInfo?.totalVolume > 0 
                      ? ((phaseAData.reduce((sum, r) => sum + r.volume, 0) / gradientInfo.totalVolume) * 100).toFixed(2)
                      : 0} %
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              <Table
                columns={reagentColumns}
                dataSource={phaseAData}
                rowKey={(record) => `${record.source}-${record.reagentName}`}
                pagination={false}
                scroll={{ x: 1200 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0}>Subtotal</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        {phaseAData.reduce((sum, r) => sum + r.volume, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        {phaseAData.reduce((sum, r) => sum + r.mass, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        {phaseAData.reduce((sum, r) => sum + r.S, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        {phaseAData.reduce((sum, r) => sum + r.H, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        {phaseAData.reduce((sum, r) => sum + r.E, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        {phaseAData.reduce((sum, r) => sum + r.R, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8}>
                        {phaseAData.reduce((sum, r) => sum + r.D, 0).toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>

            <TabPane tab="Mobile Phase B Details" key="3">
              <Card size="small" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Total Volume">
                    {phaseBData.reduce((sum, r) => sum + r.volume, 0).toFixed(3)} ml
                  </Descriptions.Item>
                  <Descriptions.Item label="Average Percentage">
                    {gradientInfo?.totalVolume > 0 
                      ? ((phaseBData.reduce((sum, r) => sum + r.volume, 0) / gradientInfo.totalVolume) * 100).toFixed(2)
                      : 0} %
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              <Table
                columns={reagentColumns}
                dataSource={phaseBData}
                rowKey={(record) => `${record.source}-${record.reagentName}`}
                pagination={false}
                scroll={{ x: 1200 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0}>Subtotal</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        {phaseBData.reduce((sum, r) => sum + r.volume, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        {phaseBData.reduce((sum, r) => sum + r.mass, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        {phaseBData.reduce((sum, r) => sum + r.S, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        {phaseBData.reduce((sum, r) => sum + r.H, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        {phaseBData.reduce((sum, r) => sum + r.E, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        {phaseBData.reduce((sum, r) => sum + r.R, 0).toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8}>
                        {phaseBData.reduce((sum, r) => sum + r.D, 0).toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>

            <TabPane tab="Gradient Step Information" key="4">
              <Table
                columns={gradientStepsColumns}
                dataSource={gradientInfo?.steps || []}
                rowKey={(record) => `step-${record.stepNo}`}
                pagination={false}
              />
            </TabPane>

            <TabPane tab="Summary Table" key="5">
              <Table
                columns={reagentColumns}
                dataSource={[...preTreatmentData, ...phaseAData, ...phaseBData]}
                rowKey={(record) => `${record.source}-${record.reagentName}`}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1200 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#e6f7ff', fontWeight: 'bold', fontSize: 14 }}>
                      <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        {totalScores?.totalVolume.toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        {totalScores?.totalMass.toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        {totalScores?.S.toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        {totalScores?.H.toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        {totalScores?.E.toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        {totalScores?.R.toFixed(3)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8}>
                        {totalScores?.D.toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>
          </Tabs>

          {/* Calculation Formula Explanation */}
          <Card title="Calculation Formula Explanation" style={{ marginTop: 24 }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Mass Calculation">
                Mass (g) = Volume (ml) × Density (g/ml)
              </Descriptions.Item>
              <Descriptions.Item label="Score Calculation">
                Score for each metric = Mass (g) × Corresponding factor value
              </Descriptions.Item>
              <Descriptions.Item label="Mobile Phase Volume Calculation">
                Volume = Σ(Integral area of each segment × Flow rate / 100)
                <br />
                Integral area = Area under gradient curve (calculated using trapezoidal rule)
              </Descriptions.Item>
              <Descriptions.Item label="Reagent Volume Distribution">
                Reagent volume = Total Mobile Phase volume × Reagent percentage / 100
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      )}
    </div>
  )
}

export default TablePage
