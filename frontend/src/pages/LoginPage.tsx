import React, { useState } from 'react'
import { Card, Form, Input, Button, Tabs, message, Space, Typography } from 'antd'
import { UserOutlined, LockOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

const { Title, Paragraph, Text } = Typography

const LoginPage: React.FC = () => {
  const { login, register } = useAuth()
  const [activeTab, setActiveTab] = useState('login')
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: any) => {
    setLoading(true)
    try {
      const result = await login(values.username, values.password)
      if (result.success) {
        message.success(result.message)
      } else {
        message.error(result.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: any) => {
    setLoading(true)
    try {
      const result = await register(values.username, values.password)
      if (result.success) {
        message.success(result.message)
        registerForm.resetFields()
        setActiveTab('login')
      } else {
        message.error(result.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo和系统介绍区域 */}
        <div className="logo-section">
          <div className="logo-wrapper">
            <ExperimentOutlined className="logo-icon" />
            <Title level={1} className="system-title">
              HPLC绿色化学分析系统
            </Title>
            <Title level={4} className="system-subtitle">
              High Performance Liquid Chromatography Green Chemistry Analysis System
            </Title>
          </div>
          
          <div className="system-description">
            <Paragraph className="description-text">
              <Text strong>专业的HPLC绿色化学评估平台</Text>
            </Paragraph>
            <Space direction="vertical" size="small" className="features-list">
              <Text>🧪 全面的试剂安全性评估</Text>
              <Text>📊 多维度绿色化学指标分析</Text>
              <Text>📈 直观的数据可视化展示</Text>
              <Text>💾 完整的实验数据管理</Text>
              <Text>🌱 支持环境友好型方法优化</Text>
            </Space>
          </div>
        </div>

        {/* 登录/注册表单区域 */}
        <div className="form-section">
          <Card className="auth-card">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab} 
              centered
              items={[
                {
                  key: 'login',
                  label: '登录',
                  children: (
                    <Form
                      form={loginForm}
                      onFinish={handleLogin}
                      layout="vertical"
                      size="large"
                    >
                      <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="用户名"
                        />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="密码"
                        />
                      </Form.Item>

                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          size="large"
                        >
                          登录
                        </Button>
                      </Form.Item>

                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                          还没有账号？
                          <Button type="link" onClick={() => setActiveTab('register')}>
                            立即注册
                          </Button>
                        </Text>
                      </div>
                    </Form>
                  )
                },
                {
                  key: 'register',
                  label: '注册',
                  children: (
                    <Form
                      form={registerForm}
                      onFinish={handleRegister}
                      layout="vertical"
                      size="large"
                    >
                      <Form.Item
                        name="username"
                        rules={[
                          { required: true, message: '请输入用户名' },
                          { min: 3, message: '用户名至少3个字符' },
                          { max: 20, message: '用户名最多20个字符' }
                        ]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="用户名（3-20个字符）"
                        />
                      </Form.Item>


                      <Form.Item
                        name="password"
                        rules={[
                          { required: true, message: '请输入密码' },
                          { min: 6, message: '密码至少6个字符' }
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="密码（至少6个字符）"
                        />
                      </Form.Item>

                      <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                          { required: true, message: '请确认密码' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('password') === value) {
                                return Promise.resolve()
                              }
                              return Promise.reject(new Error('两次输入的密码不一致'))
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="确认密码"
                        />
                      </Form.Item>

                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          size="large"
                        >
                          注册
                        </Button>
                      </Form.Item>

                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                          已有账号？
                          <Button type="link" onClick={() => setActiveTab('login')}>
                            立即登录
                          </Button>
                        </Text>
                      </div>
                    </Form>
                  )
                }
              ]}
            />
          </Card>

          <div className="footer-text">
            <Text type="secondary">
              © 2025 HPLC绿色化学分析系统 | 专业、安全、环保
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
