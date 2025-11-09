import React, { useState } from 'react'
import { Modal, Form, Input, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'

interface PasswordVerifyModalProps {
  visible: boolean
  ownerUsername: string
  onVerify: (username: string, password: string) => Promise<boolean>
  onCancel: () => void
}

const PasswordVerifyModal: React.FC<PasswordVerifyModalProps> = ({
  visible,
  ownerUsername,
  onVerify,
  onCancel
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      const success = await onVerify(values.username, values.password)
      
      if (success) {
        message.success('验证成功')
        form.resetFields()
      } else {
        message.error('用户名或密码错误')
      }
    } catch (error) {
      console.error('验证失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="文件访问验证"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="验证"
      cancelText="取消"
      maskClosable={false}
    >
      <div style={{ marginBottom: 16 }}>
        <p>此文件属于用户: <strong>{ownerUsername}</strong></p>
        <p style={{ color: '#ff4d4f' }}>请输入该用户的账号密码以访问此文件</p>
      </div>
      
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
          initialValue={ownerUsername}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="用户名"
            disabled
          />
        </Form.Item>
        
        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入该用户的密码"
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default PasswordVerifyModal
