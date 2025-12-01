/**
 * 统一存储接口 - 自动适配 Electron 和 Web 环境
 * 
 * Electron 环境：使用本地文件系统存储（持久化，不受浏览器影响）
 * Web 环境：使用 localStorage（开发调试用）
 */

// 检查是否在 Electron 环境中
const isElectron = () => {
  return !!(window as any).electronAPI
}

// 存储键名常量
export const STORAGE_KEYS = {
  USERS: 'hplc_users',
  CURRENT_USER: 'hplc_current_user',
  METHODS: 'hplc_methods_raw',
  FACTORS: 'hplc_factors_data',
  GRADIENT: 'hplc_gradient_data',
  COMPARISON: 'hplc_comparison_files',
  FACTORS_VERSION: 'hplc_factors_version',
} as const

// Electron 文件系统存储
class ElectronStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      if (key === STORAGE_KEYS.USERS) {
        const users = await (window as any).electronAPI.fs.readUsers()
        return users.length > 0 ? JSON.stringify(users) : null
      } else {
        const data = await (window as any).electronAPI.fs.readAppData(key)
        return data ? JSON.stringify(data) : null
      }
    } catch (error) {
      console.error('ElectronStorage getItem error:', error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const data = JSON.parse(value)
      
      if (key === STORAGE_KEYS.USERS) {
        await (window as any).electronAPI.fs.writeUsers(data)
      } else {
        await (window as any).electronAPI.fs.writeAppData(key, data)
      }
    } catch (error) {
      console.error('ElectronStorage setItem error:', error)
      throw error
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.setItem(key, 'null')
  }

  async clear(): Promise<void> {
    try {
      await (window as any).electronAPI.fs.clearAppData()
      await (window as any).electronAPI.fs.writeUsers([])
    } catch (error) {
      console.error('ElectronStorage clear error:', error)
    }
  }

  async getUserDataPath(): Promise<string> {
    try {
      return await (window as any).electronAPI.fs.getUserDataPath()
    } catch (error) {
      return 'Unknown'
    }
  }

  async exportData(filename: string, data: any): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      return await (window as any).electronAPI.fs.exportData(filename, data)
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// localStorage 存储（Web环境）
class LocalStorage {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    localStorage.clear()
  }

  async getUserDataPath(): Promise<string> {
    return 'Browser localStorage (temporary)'
  }

  async exportData(filename: string, data: any): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      return { success: true, path: `Downloaded: ${filename}` }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// 统一存储接口
class UnifiedStorage {
  private storage: ElectronStorage | LocalStorage

  constructor() {
    if (isElectron()) {
      console.log('🖥️ Using Electron File System Storage')
      this.storage = new ElectronStorage()
    } else {
      console.log('🌐 Using Browser localStorage (development mode)')
      this.storage = new LocalStorage()
    }
  }

  async getItem(key: string): Promise<string | null> {
    return this.storage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.storage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    return this.storage.removeItem(key)
  }

  async clear(): Promise<void> {
    return this.storage.clear()
  }

  async getUserDataPath(): Promise<string> {
    return this.storage.getUserDataPath()
  }

  async exportData(filename: string, data: any): Promise<{ success: boolean; path?: string; error?: string }> {
    return this.storage.exportData(filename, data)
  }

  isElectron(): boolean {
    return isElectron()
  }
}

// 导出单例
export const storage = new UnifiedStorage()

// 便捷的数据操作函数
export const StorageHelper = {
  // 读取 JSON 数据
  async getJSON<T = any>(key: string): Promise<T | null> {
    const data = await storage.getItem(key)
    if (!data) return null
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error(`Failed to parse JSON for key: ${key}`, error)
      return null
    }
  },

  // 写入 JSON 数据
  async setJSON(key: string, value: any): Promise<void> {
    await storage.setItem(key, JSON.stringify(value))
  },

  // 获取用户列表
  async getUsers(): Promise<any[]> {
    return (await this.getJSON(STORAGE_KEYS.USERS)) || []
  },

  // 保存用户列表
  async setUsers(users: any[]): Promise<void> {
    await this.setJSON(STORAGE_KEYS.USERS, users)
  },

  // 获取当前用户
  async getCurrentUser(): Promise<any | null> {
    return await this.getJSON(STORAGE_KEYS.CURRENT_USER)
  },

  // 保存当前用户
  async setCurrentUser(user: any): Promise<void> {
    await this.setJSON(STORAGE_KEYS.CURRENT_USER, user)
  },

  // 清除当前用户
  async clearCurrentUser(): Promise<void> {
    await storage.removeItem(STORAGE_KEYS.CURRENT_USER)
  },

  // 导出备份
  async exportBackup(data: any, filename: string): Promise<{ success: boolean; path?: string; error?: string }> {
    return await storage.exportData(filename, data)
  },

  // 获取存储位置信息
  async getStorageInfo(): Promise<string> {
    const path = await storage.getUserDataPath()
    const isElectron = storage.isElectron()
    
    if (isElectron) {
      return `File System Storage:\n${path}\nFiles: users.json, app_data.json`
    } else {
      return `Browser localStorage (cleared when cache is cleared)`
    }
  }
}
