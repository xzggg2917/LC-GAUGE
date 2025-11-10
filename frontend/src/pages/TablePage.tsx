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
  recycleScore: number
  disposal: number
  power: number
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
  P: number
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

          preTreatmentDetails.push({
            reagentName: reagent.name,
            volume: reagent.volume,
            density: factor.density,
            mass: mass,
            S: mass * factor.safetyScore,
            H: mass * factor.healthScore,
            E: mass * factor.envScore,
            R: mass * factor.recycleScore,
            D: mass * factor.disposal,
            P: mass * factor.power,
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

          phaseADetails.push({
            reagentName: component.reagentName,
            volume: component.volume,
            density: factor.density,
            mass: mass,
            S: mass * factor.safetyScore,
            H: mass * factor.healthScore,
            E: mass * factor.envScore,
            R: mass * factor.recycleScore,
            D: mass * factor.disposal,
            P: mass * factor.power,
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

          phaseBDetails.push({
            reagentName: component.reagentName,
            volume: component.volume,
            density: factor.density,
            mass: mass,
            S: mass * factor.safetyScore,
            H: mass * factor.healthScore,
            E: mass * factor.envScore,
            R: mass * factor.recycleScore,
            D: mass * factor.disposal,
            P: mass * factor.power,
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
        D: allDetails.reduce((sum, r) => sum + r.D, 0),
        P: allDetails.reduce((sum, r) => sum + r.P, 0)
      }

      setPreTreatmentData(preTreatmentDetails)
      setPhaseAData(phaseADetails)
      setPhaseBData(phaseBDetails)
      setTotalScores(totals)
      setHasData(true)

    } catch (error) {
      console.error('❌ 加载数据失败:', error)
      setHasData(false)
    }
  }

  // 试剂详情表格列定义
  const reagentColumns: ColumnsType<ReagentDetail> = [
    {
      title: '试剂名称',
      dataIndex: 'reagentName',
      key: 'reagentName',
      width: 150,
      fixed: 'left'
    },
    {
      title: '体积 (ml)',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: '密度 (g/ml)',
      dataIndex: 'density',
      key: 'density',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: '质量 (g)',
      dataIndex: 'mass',
      key: 'mass',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: '安全性 (S)',
      dataIndex: 'S',
      key: 'S',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: '健康危害 (H)',
      dataIndex: 'H',
      key: 'H',
      width: 120,
      render: (val) => val.toFixed(3)
    },
    {
      title: '环境影响 (E)',
      dataIndex: 'E',
      key: 'E',
      width: 120,
      render: (val) => val.toFixed(3)
    },
    {
      title: '可回收性 (R)',
      dataIndex: 'R',
      key: 'R',
      width: 120,
      render: (val) => val.toFixed(3)
    },
    {
      title: '处置难度 (D)',
      dataIndex: 'D',
      key: 'D',
      width: 120,
      render: (val) => val.toFixed(3)
    },
    {
      title: '耗能 (P)',
      dataIndex: 'P',
      key: 'P',
      width: 100,
      render: (val) => val.toFixed(3)
    }
  ]

  // 梯度步骤表格列定义
  const gradientStepsColumns: ColumnsType<any> = [
    {
      title: '步骤',
      dataIndex: 'stepNo',
      key: 'stepNo',
      width: 80
    },
    {
      title: '时间 (min)',
      dataIndex: 'time',
      key: 'time',
      width: 100
    },
    {
      title: 'Mobile Phase A (%)',
      dataIndex: 'mobilePhaseA',
      key: 'mobilePhaseA',
      width: 150
    },
    {
      title: 'Mobile Phase B (%)',
      dataIndex: 'mobilePhaseB',
      key: 'mobilePhaseB',
      width: 150
    },
    {
      title: '流速 (ml/min)',
      dataIndex: 'flowRate',
      key: 'flowRate',
      width: 120
    },
    {
      title: '体积 (ml)',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (val) => val.toFixed(3)
    },
    {
      title: '曲线类型',
      dataIndex: 'curve',
      key: 'curve',
      width: 100
    }
  ]

  return (
    <div className="table-page">
      <Title level={2}>综合数据报告</Title>

      {!hasData ? (
        <Alert
          message="暂无数据"
          description="请先完成 Factors、Methods 和 HPLC Gradient 的配置。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      ) : (
        <>
          {/* 基本信息总览 */}
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="样品数量" value={sampleCount} suffix="个" />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="总体积" 
                  value={totalScores?.totalVolume || 0} 
                  precision={3}
                  suffix="ml" 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="总质量" 
                  value={totalScores?.totalMass || 0} 
                  precision={3}
                  suffix="g" 
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="梯度总时间" 
                  value={gradientInfo?.totalTime || 0} 
                  suffix="min" 
                />
              </Col>
            </Row>
          </Card>

          {/* 总得分汇总 */}
          <Card title="绿色化学评估总得分" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic 
                  title="安全性 (S)" 
                  value={totalScores?.S || 0} 
                  precision={3}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="健康危害 (H)" 
                  value={totalScores?.H || 0} 
                  precision={3}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="环境影响 (E)" 
                  value={totalScores?.E || 0} 
                  precision={3}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="可回收性 (R)" 
                  value={totalScores?.R || 0} 
                  precision={3}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="处置难度 (D)" 
                  value={totalScores?.D || 0} 
                  precision={3}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
              <Col span={4}>
                <Statistic 
                  title="耗能 (P)" 
                  value={totalScores?.P || 0} 
                  precision={3}
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 详细数据表格 */}
          <Tabs defaultActiveKey="1">
            <TabPane tab="Sample PreTreatment 详情" key="1">
              <Table
                columns={reagentColumns}
                dataSource={preTreatmentData}
                rowKey={(record) => `${record.source}-${record.reagentName}`}
                pagination={false}
                scroll={{ x: 1200 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0}>小计</Table.Summary.Cell>
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
                      <Table.Summary.Cell index={9}>
                        {preTreatmentData.reduce((sum, r) => sum + r.P, 0).toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>

            <TabPane tab="Mobile Phase A 详情" key="2">
              <Card size="small" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="总体积">
                    {phaseAData.reduce((sum, r) => sum + r.volume, 0).toFixed(3)} ml
                  </Descriptions.Item>
                  <Descriptions.Item label="平均百分比">
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
                      <Table.Summary.Cell index={0}>小计</Table.Summary.Cell>
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
                      <Table.Summary.Cell index={9}>
                        {phaseAData.reduce((sum, r) => sum + r.P, 0).toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>

            <TabPane tab="Mobile Phase B 详情" key="3">
              <Card size="small" style={{ marginBottom: 16 }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="总体积">
                    {phaseBData.reduce((sum, r) => sum + r.volume, 0).toFixed(3)} ml
                  </Descriptions.Item>
                  <Descriptions.Item label="平均百分比">
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
                      <Table.Summary.Cell index={0}>小计</Table.Summary.Cell>
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
                      <Table.Summary.Cell index={9}>
                        {phaseBData.reduce((sum, r) => sum + r.P, 0).toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>

            <TabPane tab="梯度步骤信息" key="4">
              <Table
                columns={gradientStepsColumns}
                dataSource={gradientInfo?.steps || []}
                rowKey={(record) => `step-${record.stepNo}`}
                pagination={false}
              />
            </TabPane>

            <TabPane tab="汇总表" key="5">
              <Table
                columns={reagentColumns}
                dataSource={[...preTreatmentData, ...phaseAData, ...phaseBData]}
                rowKey={(record) => `${record.source}-${record.reagentName}`}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1200 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ backgroundColor: '#e6f7ff', fontWeight: 'bold', fontSize: 14 }}>
                      <Table.Summary.Cell index={0}>总计</Table.Summary.Cell>
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
                      <Table.Summary.Cell index={9}>
                        {totalScores?.P.toFixed(3)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </TabPane>
          </Tabs>

          {/* 计算公式说明 */}
          <Card title="计算公式说明" style={{ marginTop: 24 }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="质量计算">
                质量 (g) = 体积 (ml) × 密度 (g/ml)
              </Descriptions.Item>
              <Descriptions.Item label="得分计算">
                各项得分 = 质量 (g) × 对应因子值
              </Descriptions.Item>
              <Descriptions.Item label="Mobile Phase 体积计算">
                体积 = Σ(各段积分面积 × 流速 / 100)
                <br />
                积分面积 = 梯度曲线下面积（使用梯形法则计算）
              </Descriptions.Item>
              <Descriptions.Item label="试剂体积分配">
                试剂体积 = Mobile Phase 总体积 × 试剂百分比 / 100
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      )}
    </div>
  )
}

export default TablePage
