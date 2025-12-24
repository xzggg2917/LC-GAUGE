import React, { useState, useEffect } from 'react'
import { Modal, Form, InputNumber, Typography, Row, Col, Space, Alert, Divider } from 'antd'
import { WarningOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface CustomWeightModalProps {
  visible: boolean
  onCancel: () => void
  onConfirm: (weights: Record<string, number>) => void
  type: 'safety' | 'health' | 'environment' | 'stage' | 'final'
  initialValues?: Record<string, number>
}

// 权重配置定义
const WEIGHT_CONFIGS = {
  safety: {
    title: 'Custom Safety Factor (S) Weights',
    factors: [
      { key: 'S1', label: 'S1 - Release Potential', tooltip: 'Volatility based on boiling point' },
      { key: 'S2', label: 'S2 - Fire/Explosion', tooltip: 'Flammability and explosion hazard' },
      { key: 'S3', label: 'S3 - Reaction/Decomposition', tooltip: 'Chemical stability' },
      { key: 'S4', label: 'S4 - Acute Toxicity', tooltip: 'Based on LD50 values' }
    ],
    defaultWeights: { S1: 0.25, S2: 0.25, S3: 0.25, S4: 0.25 }
  },
  health: {
    title: 'Custom Health Factor (H) Weights',
    factors: [
      { key: 'H1', label: 'H1 - Chronic Toxicity', tooltip: 'Carcinogenic, teratogenic, mutagenic effects' },
      { key: 'H2', label: 'H2 - Irritation', tooltip: 'Irritation and corrosiveness' }
    ],
    defaultWeights: { H1: 0.50, H2: 0.50 }
  },
  environment: {
    title: 'Custom Environmental Factor (E) Weights',
    factors: [
      { key: 'E1', label: 'E1 - Persistence', tooltip: 'Degradation time' },
      { key: 'E2', label: 'E2 - Air Hazard', tooltip: 'Atmospheric pollution potential' },
      { key: 'E3', label: 'E3 - Water Hazard', tooltip: 'Aquatic toxicity (LC50)' }
    ],
    defaultWeights: { E1: 0.334, E2: 0.333, E3: 0.333 }
  },
  stage: {
    title: 'Custom Stage Weights (6 Factors)',
    factors: [
      { key: 'S', label: 'S - Safety Factor', tooltip: 'Comprehensive safety score' },
      { key: 'H', label: 'H - Health Factor', tooltip: 'Comprehensive health score' },
      { key: 'E', label: 'E - Environment Factor', tooltip: 'Comprehensive environmental score' },
      { key: 'R', label: 'R - Recyclability', tooltip: 'Recyclability level (0-3)' },
      { key: 'D', label: 'D - Disposal', tooltip: 'Disposal difficulty (0-3)' },
      { key: 'P', label: 'P - Power', tooltip: 'Energy consumption level' }
    ],
    defaultWeights: { S: 0.18, H: 0.18, E: 0.18, R: 0.18, D: 0.18, P: 0.10 }
  },
  final: {
    title: 'Custom Final Summary Weights',
    factors: [
      { key: 'instrument', label: 'Instrument Analysis', tooltip: 'Weight for instrument analysis stage' },
      { key: 'preparation', label: 'Sample Preparation', tooltip: 'Weight for sample preparation stage' }
    ],
    defaultWeights: { instrument: 0.6, preparation: 0.4 }
  }
}

const CustomWeightModal: React.FC<CustomWeightModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  type,
  initialValues
}) => {
  const [form] = Form.useForm()
  const [totalWeight, setTotalWeight] = useState<number>(1.0)
  const config = WEIGHT_CONFIGS[type]

  useEffect(() => {
    if (visible) {
      // 使用初始值或默认值
      const values = initialValues || config.defaultWeights
      form.setFieldsValue(values)
      calculateTotal(values)
    }
  }, [visible, initialValues, type])

  const calculateTotal = (values?: Record<string, number>) => {
    const formValues = values || form.getFieldsValue()
    const sum = Object.values(formValues).reduce((acc: number, val) => {
      return acc + (Number(val) || 0)
    }, 0) as number
    setTotalWeight(sum)
  }

  const handleValuesChange = () => {
    calculateTotal()
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      const sum = Object.values(values).reduce((acc: number, val) => {
        return acc + (Number(val) || 0)
      }, 0) as number
      
      // 检查总和是否等于1（允许0.001的误差）
      if (Math.abs(sum - 1.0) > 0.001) {
        Modal.error({
          title: 'Invalid Weights',
          content: `The sum of all weights must equal 1.000, but current sum is ${sum.toFixed(3)}. Please adjust the values.`
        })
        return
      }
      
      onConfirm(values)
    })
  }

  const isValidTotal = Math.abs(totalWeight - 1.0) <= 0.001

  return (
    <Modal
      title={<Title level={4} style={{ margin: 0 }}>{config.title}</Title>}
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      width={700}
      okText="Apply Custom Weights"
      cancelText="Cancel"
      okButtonProps={{
        disabled: !isValidTotal
      }}
    >
      <Alert
        message="Weight Configuration"
        description="Enter custom weights for each factor. The sum of all weights must equal 1.000."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        {config.factors.map((factor, index) => (
          <Form.Item
            key={factor.key}
            label={
              <Space>
                <Text strong>{factor.label}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>({factor.tooltip})</Text>
              </Space>
            }
            name={factor.key}
            rules={[
              { required: true, message: `Please enter ${factor.label}` },
              { 
                type: 'number', 
                min: 0, 
                max: 1, 
                message: 'Weight must be between 0 and 1' 
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={1}
              step={0.01}
              precision={3}
              placeholder="Enter weight (0-1)"
            />
          </Form.Item>
        ))}
      </Form>

      <Divider />

      <Row justify="space-between" align="middle">
        <Col>
          <Text strong style={{ fontSize: 16 }}>Total Weight:</Text>
        </Col>
        <Col>
          <Space size="large">
            <Text 
              strong 
              style={{ 
                fontSize: 18, 
                color: isValidTotal ? '#52c41a' : '#ff4d4f' 
              }}
            >
              {totalWeight.toFixed(3)}
            </Text>
            {!isValidTotal && (
              <Text type="danger">
                <WarningOutlined /> Must equal 1.000
              </Text>
            )}
            {isValidTotal && (
              <Text type="success">
                ✓ Valid
              </Text>
            )}
          </Space>
        </Col>
      </Row>

      <Alert
        message="Note"
        description="Custom weights will be saved with the current file only. Opening a new file or different saved file will use their own weight configurations."
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Modal>
  )
}

export default CustomWeightModal
