import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'

interface User {
  username: string
  registeredAt: string
}

interface AuthContextType {
  isAuthenticated: boolean
  currentUser: User | null
  currentPassword: string | null // 添加当前用户密码（明文，仅在会话中保存）
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  verifyUser: (username: string, password: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 初始化时直接从存储读取,避免闪现登录页面
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentPassword, setCurrentPassword] = useState<string | null>(null) // 当前用户密码（明文，仅在会话中保存）
  const [isInitialized, setIsInitialized] = useState(false)

  // 异步初始化用户状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. 检查是否需要创建默认管理员账号
        const users = await StorageHelper.getUsers()
        if (!users || users.length === 0) {
          console.log('🔧 首次运行，创建默认管理员账号 (admin/admin)')
          const defaultAdmin = {
            username: 'admin',
            password: 'admin',
            registeredAt: new Date().toISOString()
          }
          await StorageHelper.setUsers([defaultAdmin])
          console.log('✅ 默认管理员账号已创建')
        }
        
        // 2. 恢复已登录用户
        const savedUser = await StorageHelper.getCurrentUser()
        if (savedUser) {
          setCurrentUser(savedUser)
          setIsAuthenticated(true)
          console.log('🔒 User restored from storage:', savedUser.username)
        }
      } catch (error) {
        console.error('Failed to restore user:', error)
      } finally {
        setIsInitialized(true)
      }
    }
    
    initAuth()
  }, [])

  console.log('🔒 AuthProvider 渲染 - isAuthenticated:', isAuthenticated, 'currentUser:', currentUser)

  const register = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 获取已注册用户列表
      const users = await StorageHelper.getUsers()
      
      console.log('📝 Register - Current users count:', users.length)

      // 检查用户名是否已存在
      if (users.some((u: any) => u.username === username)) {
        return { success: false, message: '用户名已存在' }
      }

      // 创建新用户（实际应用中应该加密密码）
      const newUser = {
        username,
        password, // 注意：生产环境中应该使用加密
        registeredAt: new Date().toISOString()
      }

      users.push(newUser)
      await StorageHelper.setUsers(users)

      return { success: true, message: 'Registration successful! Please login' }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, message: 'Registration failed, please try again' }
    }
  }

  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 获取用户列表
      const users = await StorageHelper.getUsers()
      console.log('🔍 Login - Users data:', users)
      
      if (!users || users.length === 0) {
        console.log('❌ No users data found in storage')
        return { success: false, message: 'User does not exist. Please register first.' }
      }

      const user = users.find((u: any) => u.username === username && u.password === password)
      console.log('👥 Login - Total users:', users.length)
      console.log('🔑 Login - Attempting login for:', username)

      if (!user) {
        // 检查用户名是否存在
        const usernameExists = users.some((u: any) => u.username === username)
        if (usernameExists) {
          console.log('❌ User exists but password incorrect')
          return { success: false, message: 'Incorrect password' }
        } else {
          console.log('❌ User does not exist')
          return { success: false, message: 'User does not exist. Please register first.' }
        }
      }

      // 保存登录状态
      const currentUser: User = {
        username: user.username,
        registeredAt: user.registeredAt
      }

      setCurrentUser(currentUser)
      setIsAuthenticated(true)
      setCurrentPassword(password) // 保存密码用于文件加密
      await StorageHelper.setCurrentUser(currentUser)

      return { success: true, message: 'Login successful' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Login failed, please try again' }
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    setCurrentPassword(null) // 清除密码
    
    // 清理用户登录信息
    StorageHelper.clearCurrentUser()
    
    // 清理所有应用数据（可选：如果希望退出时保留数据，可以注释掉下面这些）
    // 注意：使用文件存储后，这些数据不会因为清除浏览器缓存而丢失
  }

  // 验证用户密码（用于文件访问权限验证）
  const verifyUser = async (username: string, password: string): Promise<boolean> => {
    try {
      const users = await StorageHelper.getUsers()
      if (!users || users.length === 0) {
        return false
      }

      const user = users.find((u: any) => u.username === username && u.password === password)
      return !!user
    } catch (error) {
      console.error('验证用户失败:', error)
      return false
    }
  }

  // 在初始化完成前显示加载状态
  if (!isInitialized) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        currentPassword,
        login,
        register,
        logout,
        verifyUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
