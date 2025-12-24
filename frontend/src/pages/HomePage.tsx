import React from 'react'
import { Card, Row, Col, Typography, Space, Empty, Button } from 'antd'
import {
  FileAddOutlined,
  FolderOpenOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { useAppContext } from '../contexts/AppContext'

const { Title, Paragraph, Text } = Typography

const HomePage: React.FC = () => {
  const { currentFilePath } = useAppContext()

  console.log('🏠 HomePage Render - currentFilePath:', currentFilePath)

  // 触发文件操作的函数
  const handleNewFileClick = () => {
    window.dispatchEvent(new CustomEvent('triggerNewFile'))
  }

  const handleOpenFileClick = () => {
    window.dispatchEvent(new CustomEvent('triggerOpenFile'))
  }

  // 如果没有打开文件，显示欢迎页面
  if (!currentFilePath) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          imageStyle={{ height: 120 }}
          description={
            <Space direction="vertical" size="large" style={{ marginTop: 20 }}>
              <Title level={2}>Welcome to LC GAUGE</Title>
              <Paragraph style={{ fontSize: 16, color: '#666', maxWidth: 600, margin: '0 auto' }}>
                Comprehensive green chemistry assessment for all liquid chromatography techniques (HPLC/UHPLC/SFC).
                Please create a new file or open an existing file to begin.
              </Paragraph>
            </Space>
          }
        >
          <Space size="large" style={{ marginTop: 32 }}>
            <Card
              hoverable
              style={{ width: 280, textAlign: 'center', cursor: 'pointer' }}
              styles={{ body: { padding: '40px 24px' } }}
              onClick={handleNewFileClick}
            >
              <FileAddOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <Title level={4}>Create New File</Title>
              <Paragraph style={{ color: '#666', marginBottom: 24 }}>
                Start a new HPLC analysis project
              </Paragraph>
              <Button type="primary" size="large">
                New File
              </Button>
            </Card>

            <Card
              hoverable
              style={{ width: 280, textAlign: 'center', cursor: 'pointer' }}
              styles={{ body: { padding: '40px 24px' } }}
              onClick={handleOpenFileClick}
            >
              <FolderOpenOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4}>Open Existing File</Title>
              <Paragraph style={{ color: '#666', marginBottom: 24 }}>
                Continue editing a previously saved project
              </Paragraph>
              <Button type="primary" size="large" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
                Open File
              </Button>
            </Card>
          </Space>

          <div style={{ marginTop: 60, maxWidth: 800, margin: '60px auto 0' }}>
            <Card title="System Features" bordered={false}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <ExperimentOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    <Title level={5} style={{ marginTop: 16 }}>Methods</Title>
                    <Paragraph style={{ fontSize: 12, color: '#666' }}>
                      Configure sample pretreatment and mobile phase parameters
                    </Paragraph>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <SafetyOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                    <Title level={5} style={{ marginTop: 16 }}>Factors</Title>
                    <Paragraph style={{ fontSize: 12, color: '#666' }}>
                      Manage reagent factors and green chemistry scores
                    </Paragraph>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <BarChartOutlined style={{ fontSize: 32, color: '#faad14' }} />
                    <Title level={5} style={{ marginTop: 16 }}>Results</Title>
                    <Paragraph style={{ fontSize: 12, color: '#666' }}>
                      View charts and analysis results
                    </Paragraph>
                  </div>
                </Col>
              </Row>
            </Card>
          </div>
        </Empty>
      </div>
    )
  }

  // 如果已打开文件，显示项目介绍页面
  return (
    <div>
      <Title level={2}>Welcome to LC GAUGE</Title>
      <Paragraph style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        Current File: <Text strong>{currentFilePath}</Text>
      </Paragraph>
      <Paragraph>
        This system integrates Liquid Chromatography (LC) data analysis with green chemistry assessment,
        supporting HPLC, UHPLC, SFC and other LC techniques to help you optimize experimental protocols,
        reduce environmental impact, and improve experimental efficiency.
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 32 }}>
        <Col xs={24} sm={24} md={8} lg={8} xl={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <ExperimentOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <Title level={5} style={{ marginTop: 16 }}>Methods</Title>
              <Paragraph style={{ fontSize: 12, color: '#666' }}>
                Configure sample pretreatment and mobile phase parameters
              </Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8} lg={8} xl={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <SafetyOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <Title level={5} style={{ marginTop: 16 }}>Factors</Title>
              <Paragraph style={{ fontSize: 12, color: '#666' }}>
                Manage reagent factors and green chemistry scores
              </Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8} lg={8} xl={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <BarChartOutlined style={{ fontSize: 32, color: '#faad14' }} />
              <Title level={5} style={{ marginTop: 16 }}>Results</Title>
              <Paragraph style={{ fontSize: 12, color: '#666' }}>
                View charts and analysis results
              </Paragraph>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={24} md={12} lg={12} xl={12}>
          <Card title="System Features" bordered={false}>
            <Paragraph>
              <ul>
                <li>Solvent System Green Chemistry Scoring</li>
                <li>Eco-Scale Assessment</li>
                <li>Automated Chromatogram Data Analysis</li>
                <li>HPLC Analysis Record Management</li>
                <li>Environmental Impact Assessment Reports</li>
              </ul>
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12} lg={12} xl={12}>
          <Card title="Quick Start" bordered={false}>
            <Paragraph>
              <ol>
                <li>Configure experimental methods in "Data → Methods"</li>
                <li>Manage reagent factors in "Data → Factors"</li>
                <li>View analysis results and charts in "Results"</li>
                <li>Optimize your experimental protocols based on scores</li>
              </ol>
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default HomePage
