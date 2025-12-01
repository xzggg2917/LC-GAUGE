# 桌面应用数据存储架构

## 🎯 问题解决

### 原问题
- 用户数据存储在浏览器的 **localStorage**
- 清除浏览器缓存会导致所有用户数据丢失
- 不适合桌面应用的使用场景

### 新方案
- 使用 **Electron 文件系统** 存储用户数据
- 数据保存在操作系统的用户目录中
- 即使清除浏览器缓存也不会丢失数据
- 自动适配 Web 开发环境和 Electron 桌面环境

---

## 📁 数据存储位置

### Electron 桌面应用（生产环境）

数据保存在系统的用户数据目录：

**Windows:**
```
C:\Users\<YourName>\AppData\Roaming\hplc-green-chemistry-app\
├── users.json          # 用户账号密码
└── app_data.json       # 应用数据（methods, factors, gradient等）
```

**macOS:**
```
~/Library/Application Support/hplc-green-chemistry-app/
├── users.json
└── app_data.json
```

**Linux:**
```
~/.config/hplc-green-chemistry-app/
├── users.json
└── app_data.json
```

### Web 开发环境（localhost）

开发时仍使用浏览器的 localStorage，方便调试。

---

## 🏗️ 技术架构

### 1. Electron 主进程 (main.js)

提供文件系统 API：
```javascript
// 读取用户数据
ipcMain.handle('fs:readUsers', async () => {
  const data = await fs.readFile(USERS_FILE, 'utf-8')
  return JSON.parse(data)
})

// 写入用户数据
ipcMain.handle('fs:writeUsers', async (event, users) => {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))
})
```

### 2. 预加载脚本 (preload.js)

暴露安全的 API 给渲染进程：
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  fs: {
    readUsers: () => ipcRenderer.invoke('fs:readUsers'),
    writeUsers: (users) => ipcRenderer.invoke('fs:writeUsers'),
    readAppData: (key) => ipcRenderer.invoke('fs:readAppData', key),
    writeAppData: (key, value) => ipcRenderer.invoke('fs:writeAppData', key, value),
  }
})
```

### 3. 存储适配器 (storage.ts)

统一的存储接口，自动检测环境：
```typescript
class UnifiedStorage {
  constructor() {
    if (isElectron()) {
      // 使用 Electron 文件系统
      this.storage = new ElectronStorage()
    } else {
      // 使用 localStorage（开发环境）
      this.storage = new LocalStorage()
    }
  }
}
```

### 4. 存储辅助工具 (StorageHelper)

便捷的数据操作函数：
```typescript
// 读取用户列表
const users = await StorageHelper.getUsers()

// 保存用户列表
await StorageHelper.setUsers(users)

// 获取当前登录用户
const currentUser = await StorageHelper.getCurrentUser()
```

---

## 📊 数据文件格式

### users.json
```json
[
  {
    "username": "zhw",
    "password": "zhw18746489614",
    "registeredAt": "2025-11-29T10:30:00.000Z"
  },
  {
    "username": "test",
    "password": "test123",
    "registeredAt": "2025-11-29T11:00:00.000Z"
  }
]
```

### app_data.json
```json
{
  "hplc_current_user": {
    "username": "zhw",
    "registeredAt": "2025-11-29T10:30:00.000Z"
  },
  "hplc_methods_raw": {
    "sampleCount": 5,
    "preTreatmentReagents": [...],
    "mobilePhaseA": [...],
    "mobilePhaseB": [...]
  },
  "hplc_factors_data": [...],
  "hplc_gradient_data": {...},
  "hplc_comparison_files": [...]
}
```

---

## 🔄 数据迁移

### 从 localStorage 迁移到文件系统

如果你在 Web 开发环境中已经有数据，第一次运行桌面应用时可以这样迁移：

**步骤1：导出 localStorage 数据**
```javascript
// 在浏览器控制台运行
const users = localStorage.getItem('hplc_users')
const methods = localStorage.getItem('hplc_methods_raw')
const factors = localStorage.getItem('hplc_factors_data')
const gradient = localStorage.getItem('hplc_gradient_data')

console.log('Users:', users)
console.log('Methods:', methods)
console.log('Factors:', factors)
console.log('Gradient:', gradient)
```

**步骤2：在桌面应用中重新注册并导入数据**
- 打开桌面应用
- 注册相同的账号
- 在 Methods/Factors/Gradient 页面重新配置数据

---

## ✅ 优势对比

| 特性 | localStorage | 文件系统存储 |
|------|--------------|--------------|
| **持久性** | ❌ 清除缓存会丢失 | ✅ 永久保存 |
| **跨浏览器** | ❌ 每个浏览器独立 | ✅ 全局统一 |
| **备份恢复** | ⚠️ 需手动操作 | ✅ 直接复制文件 |
| **容量限制** | ⚠️ 5-10MB | ✅ 无限制 |
| **访问权限** | ❌ 任何网站都能访问同域名数据 | ✅ 只有本应用能访问 |
| **数据可见性** | ❌ F12控制台可见 | ✅ 需要文件系统权限 |
| **适用场景** | 🌐 Web应用、临时数据 | 🖥️ 桌面应用、持久数据 |

---

## 🔒 安全性提升

### 1. 文件权限
- 数据文件只有当前用户有读写权限
- 其他用户无法访问

### 2. 进程隔离
- 渲染进程无法直接访问文件系统
- 必须通过 IPC 通信请求主进程操作

### 3. 上下文隔离
- 使用 `contextIsolation: true`
- 只暴露必要的 API

---

## 🛠️ 开发与调试

### 查看数据文件位置

在应用中运行：
```javascript
// 获取数据存储路径
const path = await (window as any).electronAPI.fs.getUserDataPath()
console.log('Data stored at:', path)
```

### 手动编辑数据文件

**Windows:**
```powershell
# 打开数据目录
explorer %APPDATA%\hplc-green-chemistry-app

# 编辑用户文件
notepad users.json
```

**macOS/Linux:**
```bash
# 打开数据目录
cd ~/Library/Application\ Support/hplc-green-chemistry-app
# 或
cd ~/.config/hplc-green-chemistry-app

# 编辑用户文件
nano users.json
```

### 清空所有数据

**方法1：通过应用界面**
- 打开调试面板
- 点击 "Clear All Data"

**方法2：手动删除文件**
```bash
# Windows
del /q "%APPDATA%\hplc-green-chemistry-app\*.*"

# macOS/Linux
rm ~/Library/Application\ Support/hplc-green-chemistry-app/*
```

---

## 📦 备份与恢复

### 自动备份功能

应用提供导出功能：
```typescript
// 导出用户数据
const result = await StorageHelper.exportBackup(users, 'users_backup.json')
// 文件保存到：C:\Users\<YourName>\Downloads\users_backup.json
```

### 手动备份

直接复制数据文件：
```bash
# 创建备份
cp users.json users.json.backup
cp app_data.json app_data.json.backup

# 恢复备份
cp users.json.backup users.json
cp app_data.json.backup app_data.json
```

### 云同步

可以使用云同步工具自动备份数据目录：
- OneDrive
- Dropbox
- Google Drive
- iCloud

---

## 🚀 部署说明

### 打包桌面应用

```bash
# 构建前端
cd frontend
npm run build

# 打包 Electron
npm run electron:build
```

### 首次安装后的数据初始化

1. 用户首次打开应用
2. 系统自动创建数据目录
3. 用户注册账号，创建 `users.json`
4. 配置数据后，创建 `app_data.json`

### 卸载应用时的数据保留

默认情况下，卸载应用**不会删除用户数据**。

如需完全清理：
```bash
# Windows
rmdir /s /q "%APPDATA%\hplc-green-chemistry-app"

# macOS
rm -rf ~/Library/Application\ Support/hplc-green-chemistry-app

# Linux
rm -rf ~/.config/hplc-green-chemistry-app
```

---

## 🐛 故障排查

### 问题1：找不到数据文件

**原因**：首次运行或文件被删除  
**解决**：重新注册账号，系统自动创建文件

### 问题2：数据读取失败

**原因**：JSON 文件格式错误  
**解决**：
1. 找到数据文件位置
2. 使用文本编辑器检查 JSON 格式
3. 或删除文件让系统重新创建

### 问题3：权限不足

**原因**：没有写入用户目录的权限  
**解决**：以管理员权限运行应用

---

## 📝 更新日志

### v1.1.0 (2025-11-29)
- ✅ 实现 Electron 文件系统存储
- ✅ 创建统一存储接口
- ✅ 添加自动环境检测
- ✅ 支持数据导出功能
- ✅ 更新 AuthContext 使用新存储
- ✅ 完善错误处理和日志

### v1.0.0
- 使用 localStorage 存储（已废弃）

---

## 👨‍💻 开发者注意事项

### 添加新的存储键

在 `storage.ts` 中添加：
```typescript
export const STORAGE_KEYS = {
  // ...现有键...
  NEW_KEY: 'hplc_new_data',
}
```

### 使用存储 API

```typescript
import { StorageHelper, STORAGE_KEYS } from '@/utils/storage'

// 读取
const data = await StorageHelper.getJSON(STORAGE_KEYS.NEW_KEY)

// 写入
await StorageHelper.setJSON(STORAGE_KEYS.NEW_KEY, newData)
```

---

**维护者**：HPLC Green Chemistry Analysis System Team  
**文档版本**：1.1.0  
**更新日期**：2025-11-29
