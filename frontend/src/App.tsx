import React, { useEffect, useRef } from 'react'
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
import PretreatmentAnalysisPage from './pages/PretreatmentAnalysisPage'
import InstrumentAnalysisPage from './pages/InstrumentAnalysisPage'
import MethodEvaluationPage from './pages/MethodEvaluationPage'
import TablePage from './pages/TablePage'
import AboutPage from './pages/AboutPage'
import HPLCGradientPage from './pages/HPLCGradientPage'
import LoginPage from './pages/LoginPage'
import ComparisonPage from './pages/ComparisonPage'
import VineBorder from './components/VineBorder'
import GaugeIcon from './components/GaugeIcon'
import { AppProvider, useAppContext } from './contexts/AppContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { StorageHelper, STORAGE_KEYS } from './utils/storage'
import { decryptData } from './utils/encryption'
import './App.css'

const { Header, Content, Footer, Sider } = Layout
const { Title } = Typography
const { confirm } = Modal

const AppContent: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, currentUser, logout } = useAuth()
  const {
    fileHandle,
    setFileHandle,
    currentFilePath,
    setCurrentFilePath,
    isDirty,
    setIsDirty,
    exportData,
    setAllData,
    isLoading
  } = useAppContext()
  
  // 🔧 DEBUG: AppContent渲染日志
  console.log('🔧 DEBUG: AppContent渲染中... location.pathname:', location.pathname, 'currentFilePath:', currentFilePath, 'isLoading:', isLoading)
  
  // � 应用启动时预加载Factors数据（确保首次使用时试剂库已就绪）
  useEffect(() => {
    const preloadFactorsData = async () => {
      try {
        const factors = await StorageHelper.getJSON(STORAGE_KEYS.FACTORS)
        if (!factors || factors.length === 0) {
          console.log('ℹ️ App启动：Factors数据为空，将在访问Factors页面时自动初始化')
        } else {
          console.log('✅ App启动：Factors数据已就绪 (', factors.length, '个试剂)')
        }
      } catch (error) {
        console.error('⚠️ App启动：预检查Factors数据失败:', error)
      }
    }
    preloadFactorsData()
  }, [])
  
  // �🔧 DEBUG: 监控路由变化
  useEffect(() => {
    console.log('🔧 DEBUG: 路由变化 -> location.pathname:', location.pathname)
    console.log('🔧 DEBUG: 当前 isLoading:', isLoading, 'currentFilePath:', currentFilePath)
  }, [location.pathname, isLoading, currentFilePath])

  // 使用ref来存储处理函数，避免Hooks规则问题
  const handleNewFileRef = useRef<(() => void) | null>(null)
  const handleOpenFileRef = useRef<(() => void) | null>(null)

  // 调试：监控isDirty变化
  useEffect(() => {
    console.log('🔔 isDirty状态变化:', isDirty, '文件:', currentFilePath)
  }, [isDirty, currentFilePath])

  // ⚠️ 路由状态在刷新后会重置到首页，这是正常行为
  // 用户可以通过导航栏重新进入需要的页面

  // 添加关闭浏览器前的保存提示
  // 注意: 数据已自动保存到 Electron 文件存储
  // 刷新页面(F5)不会丢失数据
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 检测是否为刷新操作
      // 注意: 浏览器限制下,无法完全准确区分刷新和关闭
      // 这里只在有未保存文件时提示
      if (currentFilePath && isDirty && currentFilePath !== 'Untitled Project.json') {
        // Only prompt for files that have been saved before (i.e., with a file path)
        // Untitled projects can be restored through refresh, so no prompt needed
        e.preventDefault()
        e.returnValue = 'File has not been saved to disk, closing window will lose changes. Leave anyway?'
        return 'File has not been saved to disk, closing window will lose changes. Leave anyway?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentFilePath, isDirty])

  // 路由守卫：如果没有打开文件，禁止访问操作页面
  useEffect(() => {
    // 等待初始数据加载完成
    if (isLoading) {
      console.log('⏳ 等待初始数据加载...')
      return
    }
    
    // Pages requiring a file to be opened
    const protectedPaths = ['/methods', '/factors', '/graph', '/graph/pretreatment', '/graph/instrument', '/graph/evaluation', '/table', '/hplc-gradient']
    
    // If currently on a protected path but no file is open, redirect to home page
    if (!currentFilePath && protectedPaths.includes(location.pathname)) {
      console.log('🚫 No file open, redirecting to home page')
      message.warning('Please create or open a file first')
      navigate('/', { replace: true })
    }
  }, [location.pathname, currentFilePath, navigate, isLoading])

  // 监听HomePage触发的文件操作事件 - 必须在所有条件判断之前声明
  useEffect(() => {
    console.log('🔧 设置文件操作事件监听器')
    const handleTriggerNewFile = () => {
      console.log('📢 收到触发New File事件')
      // 通过ref调用实际的处理函数
      if (handleNewFileRef.current) {
        handleNewFileRef.current()
      }
    }

    const handleTriggerOpenFile = () => {
      console.log('📢 收到触发Open File事件')
      // 通过ref调用实际的处理函数
      if (handleOpenFileRef.current) {
        handleOpenFileRef.current()
      }
    }

    window.addEventListener('triggerNewFile', handleTriggerNewFile)
    window.addEventListener('triggerOpenFile', handleTriggerOpenFile)

    return () => {
      window.removeEventListener('triggerNewFile', handleTriggerNewFile)
      window.removeEventListener('triggerOpenFile', handleTriggerOpenFile)
    }
  }, [])

  console.log('🎨 AppContent渲染 - isAuthenticated:', isAuthenticated)

  // 如果未登录，显示登录页面
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Create new file (memory mode)
  const handleNewFile = async () => {
    // Prompt to save if there's any open file (regardless of isDirty state)
    if (currentFilePath) {
      confirm({
        title: 'Create New File',
        icon: <ExclamationCircleOutlined />,
        content: isDirty 
          ? 'You have unsaved changes in the current file. Do you want to save before creating a new file?'
          : 'Do you want to save the current file before creating a new file?',
        okText: 'Save & New',
        cancelText: 'Cancel',
        okButtonProps: { danger: false },
        width: 480,
        centered: true,
        onOk: async () => {
          await handleSaveFile()
          createNewFile()
        },
        onCancel: () => {
          // Cancel 按钮：取消操作，不新建文件
          console.log('❌ User cancelled new file operation')
        },
        footer: (_, { OkBtn, CancelBtn }) => (
          <>
            <Button 
              onClick={() => {
                Modal.destroyAll()
                createNewFile()
              }}
            >
              Don't Save & New
            </Button>
            <CancelBtn />
            <OkBtn />
          </>
        ),
      })
    } else {
      createNewFile()
    }
  }

  // 更新ref，供事件监听器使用
  handleNewFileRef.current = handleNewFile

  const createNewFile = async () => {
    // Create empty data structure, add owner information
    const emptyData = {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      owner: currentUser?.username || 'unknown',  // Add owner
      createdAt: new Date().toISOString(),  // Add creation time
      methods: {
        sampleCount: null,
        preTreatmentReagents: [{ id: Date.now().toString(), name: '', volume: 0 }],
        mobilePhaseA: [{ id: Date.now().toString() + '1', name: '', percentage: 0 }],
        mobilePhaseB: [{ id: Date.now().toString() + '2', name: '', percentage: 0 }],
        // 🔥 初始化能耗数据为 0（让用户输入）
        instrumentEnergy: 0,
        pretreatmentEnergy: 0,
        // 🎯 初始化权重方案为默认值
        weightSchemes: {
          safetyScheme: 'PBT_Balanced',
          healthScheme: 'Absolute_Balance',
          environmentScheme: 'PBT_Balanced',
          instrumentStageScheme: 'Balanced',
          prepStageScheme: 'Balanced',
          finalScheme: 'Direct_Online',
          customWeights: {}
        }
      },
      // 🔥 Factors由全局配置管理，新文件为空
      factors: [],
      // Empty gradient array for new files, let HPLC Gradient page initialize
      gradient: []
    }
    
    // 🔥 不再初始化factors，使用全局Factors配置
    console.log('✅ App: Created new file (factors managed globally)')
    
    // 🔥 创建无效的 gradient 数据（流速为0），以便 MethodsPage 显示警告
    const invalidGradientData = {
      steps: [
        { stepNo: 0, time: 0.0, phaseA: 0, phaseB: 100, flowRate: 0, volume: 0, curve: 'initial' },
        { stepNo: 1, time: 0, phaseA: 0, phaseB: 100, flowRate: 0, volume: 0, curve: 'linear' }
      ],
      chartData: [],
      calculations: null,
      timestamp: new Date().toISOString(),
      isValid: false,
      invalidReason: 'New file - flow rates not configured'
    }
    StorageHelper.setJSON(STORAGE_KEYS.GRADIENT, invalidGradientData)
    console.log('✅ App: Created invalid gradient data for new file (will show warning in MethodsPage)')
    
    // 🔥 清空对比数据
    StorageHelper.setJSON('hplc_comparison_files', [])
    console.log('✅ App: Cleared comparison files from Electron storage')
    
    // 🔥 清空 methods storage,确保干净状态
    await StorageHelper.setJSON(STORAGE_KEYS.METHODS, emptyData.methods)
    console.log('✅ App: Cleared methods storage with empty data:', emptyData.methods)
    
    // Clear file handle, set to "Untitled" state
    setFileHandle(null)
    await setCurrentFilePath('Untitled Project.json')    // Load empty data
    await setAllData(emptyData)
    setIsDirty(false)
    
    // 🔥 Trigger event to notify other pages that factors data is ready
    setTimeout(() => {
      window.dispatchEvent(new Event('factorsDataUpdated'))
      console.log('📢 App: Triggered factorsDataUpdated event')
      window.dispatchEvent(new Event('newFileCreated'))
      console.log('📢 App: Triggered newFileCreated event')
    }, 50)
    
    // 导航到首页
    navigate('/')
    
    message.success(`New project created (Owner: ${currentUser?.username}), please save after editing`)
  }
  
  // 检查是否需要重新计算
  const checkIfNeedsRecalculation = async (): Promise<boolean> => {
    try {
      const gradientData = await StorageHelper.getJSON(STORAGE_KEYS.GRADIENT)
      
      // 如果gradient数据不存在，或只是数组（没有calculations），需要重新计算
      if (!gradientData) {
        console.log('  ℹ️ No gradient data, needs recalculation')
        return true
      }
      
      if (Array.isArray(gradientData)) {
        console.log('  ℹ️ Gradient is array (no calculations), needs recalculation')
        return true
      }
      
      if (typeof gradientData === 'object' && !('calculations' in gradientData)) {
        console.log('  ℹ️ Gradient object missing calculations, needs recalculation')
        return true
      }
      
      console.log('  ✅ Gradient data is complete')
      return false
    } catch (error) {
      console.error('Error checking gradient data:', error)
      return true // 出错时也触发重新计算
    }
  }
  
  // Open file
  const handleOpenFile = async () => {
    // Prompt to save if there's any open file (regardless of isDirty state)
    if (currentFilePath) {
      confirm({
        title: 'Open File',
        icon: <ExclamationCircleOutlined />,
        content: isDirty
          ? 'You have unsaved changes in the current file. Do you want to save before opening another file?'
          : 'Do you want to save the current file before opening another file?',
        okText: 'Save & Open',
        cancelText: 'Cancel',
        okButtonProps: { danger: false },
        width: 480,
        centered: true,
        onOk: async () => {
          await handleSaveFile()
          openFile()
        },
        onCancel: () => {
          // Cancel 按钮：取消操作，不打开文件
          console.log('❌ User cancelled open file operation')
        },
        footer: (_, { OkBtn, CancelBtn }) => (
          <>
            <Button 
              onClick={() => {
                Modal.destroyAll()
                openFile()
              }}
            >
              Don't Save & Open
            </Button>
            <CancelBtn />
            <OkBtn />
          </>
        ),
      })
    } else {
      openFile()
    }
  }

  // 更新ref，供事件监听器使用
  handleOpenFileRef.current = handleOpenFile

  const openFile = async () => {
    try {
      // 使用 Electron 的对话框选择文件
      const result = await (window as any).electronAPI.fs.showOpenDialog({
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })
      
      if (result.canceled) {
        console.log('❌ User cancelled file selection')
        return
      }
      
      const filePath = result.filePath
      const fileName = result.fileName
      console.log('📂 Selected file:', filePath)
      
      // 读取文件内容
      const readResult = await (window as any).electronAPI.fs.readFile(filePath)
      
      if (!readResult.success) {
        throw new Error(readResult.error || 'Failed to read file')
      }
      
      const content = readResult.content
      
      // Try parsing as encrypted data (check if object format)
      let parsedContent
      try {
        parsedContent = JSON.parse(content)
      } catch (e) {
        // If not JSON, may be pure encrypted string (old version)
        message.error('File format error, cannot parse')
        return
      }

      // Check if it's encrypted file format
      if (parsedContent.encrypted && parsedContent.data) {
        console.log('🔓 Detected old encrypted file, auto-decrypting...')
        
        try {
          // Try to decrypt old file (no password needed)
          const decryptedJson = decryptData(parsedContent.data, '')
          
          if (!decryptedJson) {
            throw new Error('Unable to decrypt file')
          }
          
          // Parse decrypted data
          const decryptedData = JSON.parse(decryptedJson)
          
          // Validate data format
          if (!decryptedData.version || !decryptedData.methods) {
            throw new Error('Invalid file format')
          }
          
          console.log('✅ 旧加密文件解密成功')
          
          // 加载数据
          await setAllData(decryptedData)
          setFileHandle(filePath as any)
          await setCurrentFilePath(fileName)
          setIsDirty(false)
          
          // 触发文件打开事件
          window.dispatchEvent(new Event('fileOpened'))
          console.log('📢 App: Triggered fileOpened event')
          
          // 检查是否需要重新计算（如果gradient数据不完整）
          const needsRecalculation = await checkIfNeedsRecalculation()
          if (needsRecalculation) {
            console.log('⚠️ Gradient data incomplete, will trigger auto-calculation')
            // 延迟触发，等待页面加载完成
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('autoCalculateScores', { detail: { silent: true } }))
            }, 500)
          }
          
          message.success(`File opened: ${fileName} (Old encrypted file auto-decrypted)`)
        } catch (error: any) {
          message.error('Failed to decrypt file: ' + error.message)
          console.error('Decryption failed:', error)
          return
        }
      } else {
        // Non-encrypted file, load directly
        console.log('📂 Opening non-encrypted file')
        
        // Validate data format
        if (!parsedContent.version || !parsedContent.methods) {
          throw new Error('Invalid file format')
        }
        
        // 直接加载数据
        await setAllData(parsedContent)
        setFileHandle(filePath as any)
        await setCurrentFilePath(fileName)
        setIsDirty(false)
        
        // 触发文件打开事件
        window.dispatchEvent(new Event('fileOpened'))
        console.log('📢 App: Triggered fileOpened event')
        
        // 检查是否需要重新计算（如果gradient数据不完整）
        const needsRecalculation = await checkIfNeedsRecalculation()
        if (needsRecalculation) {
          console.log('⚠️ Gradient data incomplete, will trigger auto-calculation')
          // 延迟触发，等待页面加载完成
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('autoCalculateScores', { detail: { silent: true } }))
          }, 500)
        }
        
        message.success(`File opened: ${fileName}`)
      }
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        message.error('Failed to open file: ' + error.message)
        console.error(error)
      }
    }
  }

  // 保存文件（不再加密，直接保存明文JSON）
  const handleSaveFile = async () => {
    console.log('💾 Starting file save, current isDirty:', isDirty)
    
    if (!currentUser?.username) {
      message.error('No user logged in, cannot save file')
      return
    }
    
    try {
      const dataToSave = await exportData()
      // Update lastModified timestamp
      dataToSave.lastModified = new Date().toISOString()
      
      // 将数据转换为JSON字符串（不加密，直接保存）
      const jsonString = JSON.stringify(dataToSave, null, 2)
      
      console.log('💾 保存文件（无加密）')
      
      if (!fileHandle) {
        console.log('📝 首次保存，弹出文件选择器')
        // 使用 Electron 的保存对话框
        const result = await (window as any).electronAPI.fs.showSaveDialog({
          defaultPath: currentFilePath || 'hplc_analysis.json',
          filters: [{ name: 'JSON Files', extensions: ['json'] }]
        })
        
        if (result.canceled) {
          console.log('❌ User cancelled save')
          return
        }
        
        const filePath = result.filePath
        const fileName = result.fileName
        
        // 写入文件（明文JSON）
        const writeResult = await (window as any).electronAPI.fs.writeFile(filePath, jsonString)
        
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to write file')
        }
        
        console.log('✅ 文件已保存')
        setFileHandle(filePath as any) // 保存文件路径
        await setCurrentFilePath(fileName)
        setIsDirty(false)
        
        message.success(`文件已保存: ${fileName}`)
      } else {
        console.log('💾 保存到现有文件:', currentFilePath)
        
        // 直接写入到已存在的文件（明文JSON）
        const writeResult = await (window as any).electronAPI.fs.writeFile(fileHandle as string, jsonString)
        
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to write file')
        }
        
        setIsDirty(false)
        message.success('文件保存成功')
      }
      console.log('✅ Save completed, current isDirty should be false')
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        message.error('Failed to save file')
        console.error('❌ Save failed:', error)
      }
    }
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
          key: 'graph-submenu',
          label: 'Graph',
          children: [
            {
              key: '/graph/pretreatment',
              label: <Link to="/graph/pretreatment">Pretreatment Analysis</Link>,
              disabled: !currentFilePath,
            },
            {
              key: '/graph/instrument',
              label: <Link to="/graph/instrument">Instrument Analysis</Link>,
              disabled: !currentFilePath,
            },
            {
              key: '/graph/evaluation',
              label: <Link to="/graph/evaluation">Method Evaluation</Link>,
              disabled: !currentFilePath,
            },
          ],
        },
        {
          key: '/table',
          label: <Link to="/table">Table</Link>,
          disabled: !currentFilePath,
        },
        {
          key: '/comparison',
          label: <Link to="/comparison">Comparison</Link>,
          disabled: false, // 对比功能独立，不需要当前打开文件
        },
      ],
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: <Link to="/about">About</Link>,
    },
  ]

  // User dropdown menu
  const handleLogout = () => {
    confirm({
      title: 'Confirm Logout',
      icon: <ExclamationCircleOutlined />,
      content: (currentFilePath && isDirty) ? 'You have unsaved changes, are you sure you want to logout?' : 'Are you sure you want to logout?',
      okText: 'Logout',
      cancelText: 'Cancel',
      onOk: async () => {
        // Clear file-related state
        setFileHandle(null)
        await setCurrentFilePath(null)
        setIsDirty(false)
        
        // Clear all data, restore to initial state
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
        await setAllData(emptyData)
        
        // Logout
        logout()
        message.success('Logged out successfully')
      }
    })
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontWeight: 500 }}>{currentUser?.username}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            Registered: {currentUser?.registeredAt ? new Date(currentUser.registeredAt).toLocaleDateString() : ''}
          </div>
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
      label: 'Logout',
      onClick: handleLogout
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={200}
        breakpoint={undefined}
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
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 16px',
          gap: '12px'
        }}>
          <GaugeIcon size={32} />
          <Title level={4} style={{ color: 'white', margin: 0, fontSize: '16px' }}>
            LC GAUGE
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
      <Layout className="site-layout" style={{ marginLeft: 200 }}>
        <Header style={{ 
          padding: '0 16px', 
          background: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          height: '64px',
          minHeight: '64px',
          gap: '16px',
          flexWrap: 'nowrap'
        }}>
          <Title level={3} style={{ 
            padding: 0, 
            margin: 0, 
            fontSize: '20px',
            whiteSpace: 'nowrap',
            flex: '0 0 auto'
          }}>
            LC GAUGE
          </Title>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flex: '1 1 auto',
            minWidth: 0,
            justifyContent: 'flex-end'
          }}>
            {currentFilePath && (
              <span style={{ 
                color: currentFilePath === 'Untitled Project.json' ? '#faad14' : '#666',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
                flex: '0 1 auto'
              }}>
                Current File: {currentFilePath}
                {currentFilePath === 'Untitled Project.json' && <span style={{ fontSize: 12, marginLeft: 8 }}>(Not saved yet)</span>}
              </span>
            )}
            {currentFilePath && isDirty && (
              <Button 
                type="link" 
                danger 
                icon={<SaveOutlined />}
                onClick={handleSaveFile}
                style={{ padding: 0, height: 'auto', fontSize: '14px', flexShrink: 0 }}
              >
                Unsaved
              </Button>
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" icon={<UserOutlined />} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {currentUser?.username}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0', overflow: 'initial', minWidth: 0 }}>
          <VineBorder>
            <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>
              {/* MethodsPage 始终挂载但隐藏，确保事件监听器始终活跃 */}
              <div style={{ display: location.pathname === '/methods' ? 'block' : 'none' }}>
                <MethodsPage />
              </div>
              
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/methods" element={null} />
                <Route path="/factors" element={<FactorsPage />} />
                <Route path="/graph" element={<GraphPage />} />
                <Route path="/graph/pretreatment" element={<PretreatmentAnalysisPage />} />
                <Route path="/graph/instrument" element={<InstrumentAnalysisPage />} />
                <Route path="/graph/evaluation" element={<MethodEvaluationPage />} />
                <Route path="/table" element={<TablePage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/hplc-gradient" element={<HPLCGradientPage />} />
              </Routes>
            </div>
          </VineBorder>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          {/* LC GAUGE ©2025 Dalian University of Technology */}
        </Footer>
      </Layout>
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
