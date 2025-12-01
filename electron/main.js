const { app, BrowserWindow, ipcMain } = require('electron')
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

// 文件系统API - 应用数据管理（methods, factors, gradient等）
ipcMain.handle('fs:readAppData', async (event, key) => {
  try {
    const data = await fs.readFile(APP_DATA_FILE, 'utf-8')
    const allData = JSON.parse(data)
    return allData[key] || null
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw error
  }
})

ipcMain.handle('fs:writeAppData', async (event, key, value) => {
  try {
    let allData = {}
    try {
      const existing = await fs.readFile(APP_DATA_FILE, 'utf-8')
      allData = JSON.parse(existing)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    
    allData[key] = value
    await fs.writeFile(APP_DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('Write app data error:', error)
    return { success: false, error: error.message }
  }
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
