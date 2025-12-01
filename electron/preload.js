const { contextBridge, ipcRenderer } = require('electron')

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 文件系统API
  fs: {
    // 用户管理
    readUsers: () => ipcRenderer.invoke('fs:readUsers'),
    writeUsers: (users) => ipcRenderer.invoke('fs:writeUsers', users),
    
    // 应用数据管理
    readAppData: (key) => ipcRenderer.invoke('fs:readAppData', key),
    writeAppData: (key, value) => ipcRenderer.invoke('fs:writeAppData', key, value),
    clearAppData: () => ipcRenderer.invoke('fs:clearAppData'),
    
    // 工具函数
    getUserDataPath: () => ipcRenderer.invoke('fs:getUserDataPath'),
    exportData: (filename, data) => ipcRenderer.invoke('fs:exportData', filename, data),
  }
})
