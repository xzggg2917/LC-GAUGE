const { app, BrowserWindow, ipcMain, globalShortcut, dialog, Menu } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs').promises
const fsSync = require('fs')
const isDev = require('electron-is-dev')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')

let mainWindow
let backendProcess
let splashWindow
let progressWindow

// 创建启动画面
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
    }
  })
  
  // 创建简单的HTML启动画面
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          margin: 0 0 20px 0;
          font-size: 28px;
          font-weight: 600;
        }
        .spinner {
          width: 50px;
          height: 50px;
          margin: 20px auto;
          border: 4px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        p {
          margin: 10px 0;
          font-size: 14px;
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>LC GAUGE</h1>
        <div class="spinner"></div>
        <p>Starting application...</p>
        <p>Please wait</p>
      </div>
    </body>
    </html>
  `
  
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`)
}

// 创建更新进度窗口
function createProgressWindow() {
  progressWindow = new BrowserWindow({
    width: 450,
    height: 250,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  const progressHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: transparent;
        }
        .container {
          width: 100%;
          padding: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          color: white;
        }
        .title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          text-align: center;
        }
        .status {
          font-size: 14px;
          margin-bottom: 15px;
          text-align: center;
          opacity: 0.9;
        }
        .progress-container {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .progress-bar {
          height: 100%;
          background: white;
          border-radius: 4px;
          transition: width 0.3s ease;
          width: 0%;
        }
        .progress-text {
          font-size: 13px;
          text-align: center;
          opacity: 0.85;
        }
        .speed {
          font-size: 12px;
          text-align: center;
          margin-top: 8px;
          opacity: 0.75;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="title">🔄 Downloading Update</div>
        <div class="status" id="status">Preparing download...</div>
        <div class="progress-container">
          <div class="progress-bar" id="progress"></div>
        </div>
        <div class="progress-text" id="progressText">0%</div>
        <div class="speed" id="speed"></div>
      </div>
      <script>
        const { ipcRenderer } = require('electron')
        
        ipcRenderer.on('download-progress', (event, data) => {
          const percent = data.percent.toFixed(1)
          document.getElementById('progress').style.width = percent + '%'
          document.getElementById('progressText').innerHTML = percent + '%'
          document.getElementById('status').innerHTML = 'Downloading update...'
          
          const speedMB = (data.bytesPerSecond / 1024 / 1024).toFixed(2)
          const transferredMB = (data.transferred / 1024 / 1024).toFixed(1)
          const totalMB = (data.total / 1024 / 1024).toFixed(1)
          document.getElementById('speed').innerHTML = 
            transferredMB + ' MB / ' + totalMB + ' MB · ' + speedMB + ' MB/s'
        })
      </script>
    </body>
    </html>
  `

  progressWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(progressHTML)}`)
}

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
  })

  // 隐藏默认菜单栏
  Menu.setApplicationMenu(null)

  // 开发模式加载本地服务器，生产模式加载打包后的文件
  const startUrl = isDev
    ? 'http://localhost:5173'
    : url.pathToFileURL(path.join(__dirname, '..', 'frontend', 'dist', 'index.html')).href

  console.log('='.repeat(60))
  console.log('Loading URL:', startUrl)
  console.log('isDev:', isDev)
  console.log('__dirname:', __dirname)
  console.log('='.repeat(60))

  mainWindow.loadURL(startUrl)

  // 开发模式打开DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }
  
  // 监听渲染进程的控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`)
  })
  
  // 监听页面加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ 页面加载完成')
  })
  
  // 监听页面加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('❌ 页面加载失败:', errorCode, errorDescription)
  })

  // 开发模式打开DevTools（这行现在冗余了）
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  // 🔄 配置自动更新（仅在生产环境）
  if (!isDev) {
    // 配置自动更新选项
    autoUpdater.autoDownload = false  // 不自动下载，等用户确认
    autoUpdater.autoInstallOnAppQuit = true  // 退出时自动安装
    
    // 设置更新检查（延迟启动避免阻塞）
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Auto-update check failed:', err.message)
      })
    }, 3000)
    
    // 监听更新事件 - 发现新版本
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 ${info.version}，是否立即下载更新？\n\n当前版本：${app.getVersion()}\n最新版本：${info.version}`,
        buttons: ['立即下载', '稍后提醒'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // 用户点击"立即下载"，开始下载
          autoUpdater.downloadUpdate()
        }
      })
    })

    // 监听下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      // 创建进度窗口（如果还没创建）
      if (!progressWindow) {
        createProgressWindow()
      }
      // 发送进度数据到窗口
      if (progressWindow) {
        progressWindow.webContents.send('download-progress', progressObj)
      }
    })
    
    // 监听更新下载完成
    autoUpdater.on('update-downloaded', (info) => {
      // 关闭进度窗口
      if (progressWindow) {
        progressWindow.close()
        progressWindow = null
      }

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '更新已下载',
        message: `新版本 ${info.version} 已下载完成，是否立即重启安装？\n\n点击"立即安装"将重启应用并安装更新\n点击"稍后安装"将在下次启动时安装`,
        buttons: ['立即安装', '稍后安装'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // 立即退出并安装
          autoUpdater.quitAndInstall(false, true)
        }
      })
    })
    
    // 监听没有可用更新
    autoUpdater.on('update-not-available', (info) => {
      console.log('当前已是最新版本:', info.version)
    })

    // 监听更新错误
    autoUpdater.on('error', (err) => {
      if (progressWindow) {
        progressWindow.close()
        progressWindow = null
      }
      console.error('Update error:', err)
    })
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
    // Ctrl+Shift+I 或 F12 打开/关闭开发者工具
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      event.preventDefault()
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow.webContents.openDevTools()
      }
    }
  })
}

// 检查后端健康状态
async function checkBackendHealth(maxRetries = 30, delayMs = 1000) {
  const http = require('http')
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:8000/', (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve(true)
          } else {
            reject(new Error(`Unexpected status: ${res.statusCode}`))
          }
        })
        req.on('error', reject)
        req.setTimeout(1000, () => {
          req.destroy()
          reject(new Error('Timeout'))
        })
      })
      console.log(`✅ Backend service is ready (attempt ${i + 1}/${maxRetries})`)
      return true
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`⏳ Waiting for backend to start... (attempt ${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  console.error('❌ Backend service startup timeout')
  return false
}

async function startBackend() {
  // 在生产环境启动后端服务（如果存在）
  if (!isDev) {
    // 后端exe被解压到app.asar.unpacked目录
    const backendPath = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'backend',
      'dist',
      'hplc-backend.exe'
    )
    
    // 检查后端文件是否存在
    if (fsSync.existsSync(backendPath)) {
      console.log('🚀 Starting backend service:', backendPath)
      backendProcess = spawn(backendPath, [], {
        cwd: path.join(process.resourcesPath, 'app.asar.unpacked', 'backend'),
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
      
      console.log('✅ Backend process started, PID:', backendProcess.pid)
      
      // 等待后端服务完全启动
      const isHealthy = await checkBackendHealth()
      if (!isHealthy) {
        dialog.showErrorBox(
          'Backend Service Failed to Start',
          'Unable to start backend service, the application may not work properly.\nPlease check logs or contact technical support.'
        )
      }
      return isHealthy
    } else {
      console.log('⚠️ Backend service not found:', backendPath)
      console.log('Will use remote API (if configured)')
      return false
    }
  } else {
    console.log('Development mode: Please manually start backend service (python backend/main.py)')
    return true
  }
}

app.whenReady().then(async () => {
  // 显示启动画面
  createSplashWindow()
  
  // 先启动后端，等待其完全启动后再创建窗口
  await startBackend()
  
  // 关闭启动画面，显示主窗口
  createWindow()
  
  if (splashWindow) {
    splashWindow.close()
    splashWindow = null
  }

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
