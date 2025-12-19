import React, { useState } from 'react'
import { Card, Form, Input, Button, Tabs, message, Space, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import GaugeIcon from '../components/GaugeIcon'
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
            <GaugeIcon className="logo-icon" size={150} />
            <Title level={1} className="system-title">
              LC Green Chemistry Analysis System
            </Title>
            <Title level={4} className="system-subtitle">
              Comprehensive LC Method Assessment & Environmental Impact Evaluation
            </Title>
          </div>
          
          <div className="system-description">
            <Paragraph className="description-text">
              <Text strong>Professional LC Green Chemistry Assessment Platform</Text>
            </Paragraph>
            <Space direction="vertical" size="small" className="features-list">
              <Text>🧪 Full-Process Assessment: Sample Preparation to Final Analysis</Text>
              <Text>📊 Comprehensive Evaluation: Pretreatment, Instrumentation & Overall Impact</Text>
              <Text>📈 Multi-dimensional Green Chemistry Metrics & Data Visualization</Text>
              <Text>💾 Complete Experimental Data Management & Method Comparison</Text>
              <Text>🌱 Eco-friendly Method Optimization Across All LC Techniques</Text>
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
                  label: 'Login',
                  children: (
                    <Form
                      form={loginForm}
                      onFinish={handleLogin}
                      layout="vertical"
                      size="large"
                    >
                      <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'Please enter username' }]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="Username"
                        />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Please enter password' }]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Password"
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
                          Login
                        </Button>
                      </Form.Item>

                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                          Don't have an account?
                          <Button type="link" onClick={() => setActiveTab('register')}>
                            Sign up now
                          </Button>
                        </Text>
                      </div>
                    </Form>
                  )
                },
                {
                  key: 'register',
                  label: 'Register',
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
                          { required: true, message: 'Please enter username' },
                          { min: 3, message: 'Username must be at least 3 characters' },
                          { max: 20, message: 'Username must be at most 20 characters' }
                        ]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="Username (3-20 characters)"
                        />
                      </Form.Item>


                      <Form.Item
                        name="password"
                        rules={[
                          { required: true, message: 'Please enter password' },
                          { min: 6, message: 'Password must be at least 6 characters' }
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Password (min. 6 characters)"
                        />
                      </Form.Item>

                      <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                          { required: true, message: 'Please confirm password' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('password') === value) {
                                return Promise.resolve()
                              }
                              return Promise.reject(new Error('Passwords do not match'))
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Confirm Password"
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
                          Register
                        </Button>
                      </Form.Item>

                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                          Already have an account?
                          <Button type="link" onClick={() => setActiveTab('login')}>
                            Login now
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
              © 2025 LC Green Chemistry Analysis System | Professional, Secure, Eco-friendly
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
