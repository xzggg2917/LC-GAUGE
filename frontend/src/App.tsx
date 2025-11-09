import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Typography, message, Modal, Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  FileOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import HomePage from './pages/HomePage'
import MethodsPage from './pages/MethodsPage'
import FactorsPage from './pages/FactorsPage'
import GraphPage from './pages/GraphPage'
import TablePage from './pages/TablePage'
import AboutPage from './pages/AboutPage'
import HPLCGradientPage from './pages/HPLCGradientPage'
import LoginPage from './pages/LoginPage'
import VineBorder from './components/VineBorder'
import PasswordVerifyModal from './components/PasswordVerifyModal'
import PasswordConfirmModal from './components/PasswordConfirmModal'
import { AppProvider, useAppContext } from './contexts/AppContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { encryptData, decryptData } from './utils/encryption'
import './App.css'

const { Header, Content, Footer, Sider } = Layout
const { Title } = Typography
const { confirm } = Modal

const AppContent: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, currentUser, logout, verifyUser } = useAuth()
  const {
    fileHandle,
    setFileHandle,
    currentFilePath,
    setCurrentFilePath,
    isDirty,
    setIsDirty,
    exportData,
    setAllData
  } = useAppContext()

  // 密码验证模态框状态（用于打开其他用户的文件）
  const [verifyModalVisible, setVerifyModalVisible] = useState(false)
  const [pendingFileData, setPendingFileData] = useState<any>(null)
  const [pendingFileHandle, setPendingFileHandle] = useState<any>(null)

  // 密码确认模态框状态（用于保存加密文件）
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [pendingSaveData, setPendingSaveData] = useState<any>(null)

  // 调试：监控isDirty变化
  useEffect(() => {
    console.log('🔔 isDirty状态变化:', isDirty, '文件:', currentFilePath)
  }, [isDirty, currentFilePath])

  // 添加关闭前保存提示 - 必须在条件判断之前调用
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 只有在已打开文件且有未保存更改时才提示
      if (currentFilePath && isDirty) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentFilePath, isDirty])

  // 路由守卫：如果没有打开文件，禁止访问操作页面
  useEffect(() => {
    // 需要文件才能访问的页面
    const protectedPaths = ['/methods', '/factors', '/graph', '/table', '/hplc-gradient']
    
    // 如果当前在受保护的路径，但没有打开文件，则重定向到首页
    if (!currentFilePath && protectedPaths.includes(location.pathname)) {
      console.log('🚫 未打开文件，重定向到首页')
      message.warning('请先创建或打开一个文件')
      navigate('/', { replace: true })
    }
  }, [location.pathname, currentFilePath, navigate])

  // 如果未登录，显示登录页面
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // 创建新文件（内存模式）
  const handleNewFile = async () => {
    // 只有在已打开文件且有未保存更改时，才提示保存
    if (currentFilePath && isDirty) {
      confirm({
        title: '未保存的更改',
        icon: <ExclamationCircleOutlined />,
        content: '当前有未保存的更改，是否先保存？',
        okText: '保存',
        cancelText: '不保存',
        onOk: async () => {
          await handleSaveFile()
          createNewFile()
        },
        onCancel: () => {
          createNewFile()
        }
      })
    } else {
      createNewFile()
    }
  }

  const createNewFile = () => {
    // 创建空数据结构，添加所有者信息
    const emptyData = {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      owner: currentUser?.username || 'unknown',  // 添加所有者
      createdAt: new Date().toISOString(),  // 添加创建时间
      methods: {
        sampleCount: null,
        preTreatmentReagents: [{ id: Date.now().toString(), name: '', volume: 0 }],
        mobilePhaseA: [{ id: Date.now().toString() + '1', name: '', percentage: 0 }],
        mobilePhaseB: [{ id: Date.now().toString() + '2', name: '', percentage: 0 }]
      },
      factors: [],
      gradient: []
    }
    
    // 清空文件句柄，设置为"未命名"状态
    setFileHandle(null)
    setCurrentFilePath('未命名项目.json')
    
    // 加载空数据
    setAllData(emptyData)
    setIsDirty(false)
    
    message.success(`新项目已创建（所有者：${currentUser?.username}），请在编辑后点击保存`)
  }
  // 打开文件
  const handleOpenFile = async () => {
    // 只有在已打开文件且有未保存更改时，才提示保存
    if (currentFilePath && isDirty) {
      confirm({
        title: '未保存的更改',
        icon: <ExclamationCircleOutlined />,
        content: '当前有未保存的更改，是否先保存？',
        okText: '保存',
        cancelText: '不保存',
        onOk: async () => {
          await handleSaveFile()
          openFile()
        },
        onCancel: () => {
          openFile()
        }
      })
    } else {
      openFile()
    }
  }

  const openFile = async () => {
    try {
      // 使用File System Access API打开文件
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          },
        ],
        multiple: false,
      })
      
      const file = await handle.getFile()
      const content = await file.text()
      
      // 尝试解析为加密数据（检查是否为对象格式）
      let parsedContent
      try {
        parsedContent = JSON.parse(content)
      } catch (e) {
        // 如果不是JSON，可能是纯加密字符串（旧版本）
        message.error('文件格式错误，无法解析')
        return
      }

      // 检查是否为加密数据
      if (parsedContent.encrypted && parsedContent.data) {
        console.log('🔐 检测到加密文件，需要密码解密')
        
        // 尝试获取文件所有者信息（从加密元数据中）
        const fileOwner = parsedContent.owner || 'unknown'
        
        // 检查是否为当前用户的文件
        if (fileOwner === currentUser?.username) {
          console.log('✅ 这是当前用户的文件，弹出密码确认框')
          // 是当前用户的文件，直接让用户输入密码解密
          setPendingFileData(parsedContent)
          setPendingFileHandle(handle)
          setVerifyModalVisible(true)
        } else {
          console.log('⚠️ 这是其他用户的文件，需要验证原所有者密码')
          // 是其他用户的文件，需要验证原所有者的密码
          setPendingFileData(parsedContent)
          setPendingFileHandle(handle)
          setVerifyModalVisible(true)
        }
      } else {
        // 未加密的旧文件格式，直接加载
        console.log('📂 打开未加密的旧格式文件')
        
        // 验证数据格式
        if (!parsedContent.version || !parsedContent.methods) {
          throw new Error('文件格式不正确')
        }
        
        // 直接加载数据
        setAllData(parsedContent)
        setFileHandle(handle)
        setCurrentFilePath(handle.name)
        setIsDirty(false)
        
        message.warning(`文件已打开: ${handle.name}（未加密文件，建议重新保存以加密）`)
      }
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        message.error('打开文件失败: ' + error.message)
        console.error(error)
      }
    }
  }

  // 验证密码后打开文件
  const handleVerifyPassword = async (username: string, password: string): Promise<boolean> => {
    if (!pendingFileData || !pendingFileHandle) {
      message.error('没有待打开的文件')
      return false
    }

    try {
      // 验证用户密码
      const isValid = await verifyUser(username, password)
      
      if (!isValid) {
        message.error('密码错误，无法打开文件')
        return false
      }

      // 密码正确，解密数据
      console.log('🔓 密码验证成功，开始解密数据...')
      const decryptedJson = decryptData(pendingFileData.data, password)
      
      if (!decryptedJson) {
        message.error('解密失败，密码可能不正确或文件已损坏')
        return false
      }

      // 解析解密后的JSON字符串
      const decryptedData = JSON.parse(decryptedJson)

      // 验证解密后的数据格式
      if (!decryptedData.version || !decryptedData.methods) {
        throw new Error('文件格式不正确')
      }

      // 加载解密后的数据
      setAllData(decryptedData)
      setFileHandle(pendingFileHandle)
      setCurrentFilePath(pendingFileHandle.name)
      setIsDirty(false)

      // 清理临时数据
      setPendingFileData(null)
      setPendingFileHandle(null)
      setVerifyModalVisible(false)

      message.success(`文件已解密并打开: ${pendingFileHandle.name}`)
      return true
    } catch (error: any) {
      message.error('解密文件失败: ' + error.message)
      console.error('❌ 解密失败:', error)
      return false
    }
  }

  // 取消密码验证
  const handleCancelVerify = () => {
    setVerifyModalVisible(false)
    setPendingFileData(null)
    setPendingFileHandle(null)
    message.info('已取消打开文件')
  }

  // 保存文件
  const handleSaveFile = async () => {
    console.log('💾 开始保存文件，当前isDirty:', isDirty)
    
    try {
      const dataToSave = exportData()
      // 更新 lastModified 时间戳
      dataToSave.lastModified = new Date().toISOString()
      
      // 弹出密码确认对话框，等待用户输入密码
      setPendingSaveData(dataToSave)
      setConfirmModalVisible(true)
      
    } catch (error: any) {
      message.error('准备保存文件失败')
      console.error('❌ 准备保存失败:', error)
    }
  }

  // 确认密码后执行实际保存
  const handleConfirmPassword = async (password: string) => {
    setConfirmModalVisible(false)
    
    if (!pendingSaveData) {
      message.error('没有待保存的数据')
      return
    }

    try {
      // 将数据转换为JSON字符串
      const jsonString = JSON.stringify(pendingSaveData, null, 2)
      
      // 使用密码加密数据
      console.log('🔐 使用密码加密数据...')
      const encryptedString = encryptData(jsonString, password)
      
      // 创建加密文件格式
      const encryptedFileContent = JSON.stringify({
        encrypted: true,
        owner: currentUser?.username,
        version: '1.0.0',
        data: encryptedString
      }, null, 2)
      
      if (!fileHandle) {
        console.log('📝 首次保存，弹出文件选择器')
        // 如果没有文件句柄，使用showSaveFilePicker
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: currentFilePath || 'hplc_analysis.json',
          types: [
            {
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            },
          ],
        })
        
        const writable = await handle.createWritable()
        await writable.write(encryptedFileContent)
        await writable.close()
        
        console.log('✅ 加密文件已写入，设置fileHandle和currentFilePath')
        setFileHandle(handle)
        setCurrentFilePath(handle.name)
        
        // 保存成功后，只清除dirty标记，不更新Context数据（避免循环）
        console.log('🧹 清除isDirty标记')
        setIsDirty(false)
        setPendingSaveData(null)
        
        message.success(`文件已加密保存: ${handle.name}`)
      } else {
        console.log('💾 保存到现有文件:', currentFilePath)
        // 直接保存到原文件
        const writable = await fileHandle.createWritable()
        await writable.write(encryptedFileContent)
        await writable.close()
        
        // 保存成功后，只清除dirty标记，不更新Context数据（避免循环）
        console.log('🧹 清除isDirty标记')
        setIsDirty(false)
        setPendingSaveData(null)
        
        message.success('文件已加密保存')
      }
      console.log('✅ 保存完成，当前isDirty应该为false')
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        message.error('保存文件失败')
        console.error('❌ 保存失败:', error)
      }
      setPendingSaveData(null)
    }
  }

  // 取消密码确认
  const handleCancelPasswordConfirm = () => {
    setConfirmModalVisible(false)
    setPendingSaveData(null)
    message.info('已取消保存')
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'file',
      icon: <FileOutlined />,
      label: 'File',
      children: [
        {
          key: 'new-file',
          label: 'New File',
          onClick: handleNewFile,
        },
        {
          key: 'open-file',
          label: 'Open File',
          onClick: handleOpenFile,
        },
      ],
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: 'Data',
      disabled: !currentFilePath, // 没有打开文件时禁用
      children: [
        {
          key: '/methods',
          label: <Link to="/methods">Methods</Link>,
          disabled: !currentFilePath,
        },
        {
          key: '/factors',
          label: <Link to="/factors">Factors</Link>,
          disabled: !currentFilePath,
        },
      ],
    },
    {
      key: 'results',
      icon: <LineChartOutlined />,
      label: 'Results',
      disabled: !currentFilePath, // 没有打开文件时禁用
      children: [
        {
          key: '/graph',
          label: <Link to="/graph">Graph</Link>,
          disabled: !currentFilePath,
        },
        {
          key: '/table',
          label: <Link to="/table">Table</Link>,
          disabled: !currentFilePath,
        },
      ],
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: <Link to="/about">About</Link>,
    },
  ]

  // 用户下拉菜单
  const handleLogout = () => {
    confirm({
      title: '确认退出',
      icon: <ExclamationCircleOutlined />,
      content: (currentFilePath && isDirty) ? '您有未保存的更改，确定要退出吗？' : '确定要退出登录吗？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => {
        // 清理文件相关状态
        setFileHandle(null)
        setCurrentFilePath(null)
        setIsDirty(false)
        
        // 清理所有数据，恢复到初始状态
        const emptyData = {
          version: '1.0.0',
          lastModified: new Date().toISOString(),
          methods: {
            sampleCount: null,
            preTreatmentReagents: [{ id: Date.now().toString(), name: '', volume: 0 }],
            mobilePhaseA: [{ id: Date.now().toString() + '1', name: '', percentage: 0 }],
            mobilePhaseB: [{ id: Date.now().toString() + '2', name: '', percentage: 0 }]
          },
          factors: [],
          gradient: []
        }
        setAllData(emptyData)
        
        // 退出登录
        logout()
        message.success('已退出登录')
      }
    })
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontWeight: 500 }}>{currentUser?.username}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{currentUser?.email}</div>
        </div>
      ),
      disabled: true
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            HPLC分析
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="custom-menu"
          expandIcon={null}
          triggerSubMenuAction="hover"
        />
      </Sider>
      <Layout style={{ marginLeft: 200 }}>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={3} style={{ padding: '0 24px', margin: 0 }}>
            HPLC绿色化学分析系统
          </Title>
          <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {currentFilePath && (
              <span style={{ color: currentFilePath === '未命名项目.json' ? '#faad14' : '#666' }}>
                当前文件: {currentFilePath}
                {currentFilePath === '未命名项目.json' && <span style={{ fontSize: 12, marginLeft: 8 }}>(尚未保存)</span>}
              </span>
            )}
            {currentFilePath && isDirty && (
              <Button 
                type="link" 
                danger 
                icon={<SaveOutlined />}
                onClick={handleSaveFile}
                style={{ padding: 0, height: 'auto', fontSize: '14px' }}
              >
                未保存
              </Button>
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" icon={<UserOutlined />} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentUser?.username}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
          <VineBorder>
            <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/methods" element={<MethodsPage />} />
                <Route path="/factors" element={<FactorsPage />} />
                <Route path="/graph" element={<GraphPage />} />
                <Route path="/table" element={<TablePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/hplc-gradient" element={<HPLCGradientPage />} />
              </Routes>
            </div>
          </VineBorder>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          HPLC绿色化学分析系统 ©2025 Created with React + FastAPI
        </Footer>
      </Layout>

      {/* 密码验证模态框 - 用于打开其他用户的文件 */}
      <PasswordVerifyModal
        visible={verifyModalVisible}
        ownerUsername={pendingFileData?.owner || 'unknown'}
        onVerify={handleVerifyPassword}
        onCancel={handleCancelVerify}
      />

      {/* 密码确认模态框 - 用于保存加密文件 */}
      <PasswordConfirmModal
        visible={confirmModalVisible}
        username={currentUser?.username || 'unknown'}
        onConfirm={handleConfirmPassword}
        onCancel={handleCancelPasswordConfirm}
      />
    </Layout>
  )
}

// 主App组件，包装AuthProvider和AppProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}

export default App
