import React, { useState } from 'react'
import { Modal, Form, Input, message } from 'antd'

interface PasswordConfirmModalProps {
  visible: boolean
  username: string
  onConfirm: (password: string) => void
  onCancel: () => void
}

/**
 * 密码确认对话框
 * 用于在保存加密文件前确认用户密码
 */
const PasswordConfirmModal: React.FC<PasswordConfirmModalProps> = ({
  visible,
  username,
  onConfirm,
  onCancel
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleOk = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      
      // 验证密码是否正确
      const usersData = localStorage.getItem('hplc_users')
      if (!usersData) {
        message.error('用户数据不存在')
        return
      }

      const users = JSON.parse(usersData)
      const user = users.find((u: any) => u.username === username && u.password === values.password)

      if (!user) {
        message.error('密码错误，请重试')
        form.setFields([
          {
            name: 'password',
            errors: ['密码错误']
          }
        ])
        return
      }

      // 密码正确，返回密码
      form.resetFields()
      onConfirm(values.password)
    } catch (error) {
      console.error('密码验证失败:', error)
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
      title="确认密码以保存文件"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
      maskClosable={false}
    >
      <p>为了保护您的数据安全，文件将使用密码加密保存。</p>
      <p>当前用户：<strong>{username}</strong></p>
      <Form form={form} layout="vertical">
        <Form.Item
          label="请输入您的密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' }
          ]}
        >
          <Input.Password placeholder="输入密码以加密文件" autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default PasswordConfirmModal
