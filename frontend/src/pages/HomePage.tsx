import React from 'react'
import { Card, Row, Col, Typography, Space, Empty } from 'antd'
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

  // 如果没有打开文件，显示引导界面
  if (!currentFilePath) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          imageStyle={{ height: 120 }}
          description={
            <Space direction="vertical" size="large" style={{ marginTop: 20 }}>
              <Title level={2}>欢迎使用HPLC绿色化学分析系统</Title>
              <Paragraph style={{ fontSize: 16, color: '#666', maxWidth: 600, margin: '0 auto' }}>
                在开始分析之前，请先创建一个新文件或打开现有文件
              </Paragraph>
            </Space>
          }
        >
          <Space size="large" style={{ marginTop: 32 }}>
            <Card
              hoverable
              style={{ width: 280, textAlign: 'center' }}
              bodyStyle={{ padding: '40px 24px' }}
            >
              <FileAddOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <Title level={4}>创建新文件</Title>
              <Paragraph style={{ color: '#666', marginBottom: 24 }}>
                开始一个新的HPLC分析项目
              </Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                请点击左侧菜单 File → New File
              </Text>
            </Card>

            <Card
              hoverable
              style={{ width: 280, textAlign: 'center' }}
              bodyStyle={{ padding: '40px 24px' }}
            >
              <FolderOpenOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4}>打开现有文件</Title>
              <Paragraph style={{ color: '#666', marginBottom: 24 }}>
                继续编辑之前保存的项目
              </Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                请点击左侧菜单 File → Open File
              </Text>
            </Card>
          </Space>

          <div style={{ marginTop: 60, maxWidth: 800, margin: '60px auto 0' }}>
            <Card title="系统功能介绍" bordered={false}>
              <Row gutter={24}>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <ExperimentOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    <Title level={5} style={{ marginTop: 16 }}>Methods</Title>
                    <Paragraph style={{ fontSize: 12, color: '#666' }}>
                      配置样品预处理和流动相参数
                    </Paragraph>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <SafetyOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                    <Title level={5} style={{ marginTop: 16 }}>Factors</Title>
                    <Paragraph style={{ fontSize: 12, color: '#666' }}>
                      管理试剂因子和绿色化学评分
                    </Paragraph>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <BarChartOutlined style={{ fontSize: 32, color: '#faad14' }} />
                    <Title level={5} style={{ marginTop: 16 }}>Results</Title>
                    <Paragraph style={{ fontSize: 12, color: '#666' }}>
                      查看图表和分析结果
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

  // 如果已打开文件，显示原来的统计界面
  return (
    <div>
      <Title level={2}>欢迎使用HPLC绿色化学分析系统</Title>
      <Paragraph>
        当前文件: <Text strong>{currentFilePath}</Text>
      </Paragraph>
      <Paragraph>
        本系统集成了高效液相色谱（HPLC）数据分析与绿色化学评估功能，
        帮助您优化实验方案，减少环境影响，提高实验效率。
      </Paragraph>

      <Row gutter={16} style={{ marginTop: 32 }}>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <ExperimentOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <Title level={5} style={{ marginTop: 16 }}>Methods</Title>
              <Paragraph style={{ fontSize: 12, color: '#666' }}>
                配置样品预处理和流动相参数
              </Paragraph>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <SafetyOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <Title level={5} style={{ marginTop: 16 }}>Factors</Title>
              <Paragraph style={{ fontSize: 12, color: '#666' }}>
                管理试剂因子和绿色化学评分
              </Paragraph>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <BarChartOutlined style={{ fontSize: 32, color: '#faad14' }} />
              <Title level={5} style={{ marginTop: 16 }}>Results</Title>
              <Paragraph style={{ fontSize: 12, color: '#666' }}>
                查看图表和分析结果
              </Paragraph>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="系统功能" bordered={false}>
            <Paragraph>
              <ul>
                <li>溶剂系统绿色化学评分</li>
                <li>Eco-Scale评估</li>
                <li>色谱图数据自动分析</li>
                <li>HPLC分析记录管理</li>
                <li>环境影响评估报告</li>
              </ul>
            </Paragraph>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="快速开始" bordered={false}>
            <Paragraph>
              <ol>
                <li>在左侧菜单"Data → Methods"中配置实验方法</li>
                <li>在"Data → Factors"中管理试剂因子</li>
                <li>在"Results"中查看分析结果和图表</li>
                <li>根据评分结果优化您的实验方案</li>
              </ol>
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default HomePage
