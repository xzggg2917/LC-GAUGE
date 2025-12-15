const { app, BrowserWindow, ipcMain, globalShortcut, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises
const isDev = require('electron-is-dev')
const { spawn } = require('child_process')

let mainWindow
let backendProcess

// 获取用户数据存储目录
const USER_DATA_PATH = app.getPath('userData')
const USERS_FILE = path.join(USER_DATA_PATH, 'users.json')
const APP_DATA_FILE = path.join(USER_DATA_PATH, 'app_data.json')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../build/icon.png'),
  })

  // 开发模式加载本地服务器，生产模式加载打包后的文件
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`

  mainWindow.loadURL(startUrl)

  // 开发模式打开DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 注册刷新快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl+R 或 F5 刷新
    if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      event.preventDefault()
      mainWindow.webContents.reload()
    }
    // Ctrl+Shift+R 强制刷新（清除缓存）
    if (input.control && input.shift && input.key.toLowerCase() === 'r') {
      event.preventDefault()
      mainWindow.webContents.reloadIgnoringCache()
    }
  })
}

function startBackend() {
  // 在生产环境启动后端服务
  if (!isDev) {
    const backendPath = path.join(
      process.resourcesPath,
      'backend',
      'dist',
      'hplc-backend.exe'
    )
    
    backendProcess = spawn(backendPath, [], {
      cwd: path.join(process.resourcesPath, 'backend'),
    })

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`)
    })

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`)
    })

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`)
    })
  } else {
    console.log('开发模式：请手动启动后端服务 (python backend/main.py)')
  }
}

app.whenReady().then(() => {
  startBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
})

// IPC通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// 文件系统API - 用户数据管理
ipcMain.handle('fs:readUsers', async () => {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回空数组
      return []
    }
    throw error
  }
})

ipcMain.handle('fs:writeUsers', async (event, users) => {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('Write users error:', error)
    return { success: false, error: error.message }
  }
})

// 写入队列，防止并发写入导致数据丢失
let writeQueue = Promise.resolve()

// 文件系统API - 应用数据管理（methods, factors, gradient等）
ipcMain.handle('fs:readAppData', async (event, key) => {
  try {
    const data = await fs.readFile(APP_DATA_FILE, 'utf-8')
    
    // 容错处理：如果文件为空或只有空白字符，返回空对象
    if (!data || data.trim() === '') {
      console.log(`⚠️ APP_DATA_FILE is empty, returning null for key: ${key}`)
      return null
    }
    
    let allData
    try {
      allData = JSON.parse(data)
    } catch (parseError) {
      console.error(`❌ JSON parse error for key ${key}:`, parseError.message)
      console.log(`📄 Corrupted data (first 200 chars):`, data.substring(0, 200))
      
      // 数据损坏，尝试恢复或返回 null
      return null
    }
    
    return allData[key] || null
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw error
  }
})

ipcMain.handle('fs:writeAppData', async (event, key, value) => {
  // 使用队列确保写入操作串行执行，避免并发覆盖
  return writeQueue = writeQueue.then(async () => {
    try {
      let allData = {}
      try {
        const existing = await fs.readFile(APP_DATA_FILE, 'utf-8')
        // 容错：如果文件为空，使用空对象
        if (existing && existing.trim() !== '') {
          allData = JSON.parse(existing)
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`⚠️ Read existing data error: ${error.message}, using empty object`)
          allData = {}
        }
      }
      
      allData[key] = value
      const jsonString = JSON.stringify(allData, null, 2)
      
      // 验证生成的 JSON 是否有效
      try {
        JSON.parse(jsonString)
      } catch (verifyError) {
        console.error(`❌ Generated invalid JSON for key ${key}:`, verifyError)
        throw new Error('Generated invalid JSON')
      }
      
      await fs.writeFile(APP_DATA_FILE, jsonString, 'utf-8')
      console.log(`✅ writeAppData成功: ${key}, 数据大小: ${JSON.stringify(value).length}字节`)
      return { success: true }
    } catch (error) {
      console.error('Write app data error:', error)
      return { success: false, error: error.message }
    }
  })
})

ipcMain.handle('fs:clearAppData', async () => {
  try {
    await fs.unlink(APP_DATA_FILE)
    return { success: true }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true }
    }
    return { success: false, error: error.message }
  }
})

ipcMain.handle('fs:getUserDataPath', () => {
  return USER_DATA_PATH
})

ipcMain.handle('fs:exportData', async (event, filename, data) => {
  try {
    const exportPath = path.join(app.getPath('downloads'), filename)
    await fs.writeFile(exportPath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, path: exportPath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 文件对话框 - 打开文件
ipcMain.handle('dialog:showOpen', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'JSON Files', extensions: ['json'] }],
    ...options
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }
  
  return { 
    canceled: false, 
    filePath: result.filePaths[0],
    fileName: path.basename(result.filePaths[0])
  }
})

// 文件对话框 - 保存文件
ipcMain.handle('dialog:showSave', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: options?.filters || [{ name: 'JSON Files', extensions: ['json'] }],
    defaultPath: options?.defaultPath || 'hplc_analysis.json',
    ...options
  })
  
  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }
  
  return { 
    canceled: false, 
    filePath: result.filePath,
    fileName: path.basename(result.filePath)
  }
})

// 读取文件内容
ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 写入文件内容
ipcMain.handle('file:write', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
