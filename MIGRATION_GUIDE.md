# localStorage 到文件系统数据迁移指南

## 📋 迁移概述

本指南帮助你将现有的浏览器 localStorage 数据迁移到 Electron 桌面应用的文件系统存储中。

---

## 🎯 为什么要迁移？

### localStorage 的问题
- ❌ 清除浏览器缓存会导致数据丢失
- ❌ 每个浏览器的数据独立，无法共享
- ❌ 容量限制（通常 5-10MB）
- ❌ 安全性较低，容易被其他脚本访问

### 文件系统存储的优势
- ✅ 数据永久保存，不受浏览器影响
- ✅ 可以直接备份和恢复文件
- ✅ 容量几乎无限制
- ✅ 更高的安全性和隔离性

---

## 🚀 快速迁移步骤

### 方案 1：自动导出导入（推荐）

#### 步骤 1：在浏览器中导出数据

1. 打开开发环境 (http://localhost:5173)
2. 按 F12 打开控制台
3. 运行以下脚本：

```javascript
// 导出所有 HPLC 数据
const exportHPLCData = () => {
  const data = {
    users: localStorage.getItem('hplc_users'),
    currentUser: localStorage.getItem('hplc_current_user'),
    methods: localStorage.getItem('hplc_methods_raw'),
    factors: localStorage.getItem('hplc_factors_data'),
    gradient: localStorage.getItem('hplc_gradient_data'),
    comparison: localStorage.getItem('hplc_comparison_files'),
    factorsVersion: localStorage.getItem('hplc_factors_version'),
  }
  
  // 下载为 JSON 文件
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hplc_data_backup_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  console.log('✅ 数据已导出')
  return data
}

exportHPLCData()
```

#### 步骤 2：在桌面应用中导入数据

> **注意**：桌面应用版本正在开发中，临时方案是在桌面应用中重新注册相同的账号和数据。

---

### 方案 2：手动迁移（详细步骤）

#### 步骤 1：查看当前 localStorage 数据

```javascript
// 在浏览器控制台运行
console.log('=== HPLC 数据概览 ===')
console.log('用户数据:', localStorage.getItem('hplc_users'))
console.log('当前登录:', localStorage.getItem('hplc_current_user'))
console.log('Methods:', localStorage.getItem('hplc_methods_raw'))
console.log('Factors:', localStorage.getItem('hplc_factors_data'))
console.log('Gradient:', localStorage.getItem('hplc_gradient_data'))
```

#### 步骤 2：保存用户账号信息

```javascript
// 复制输出结果到文本文件
const users = localStorage.getItem('hplc_users')
console.log('用户列表（复制下面内容）:')
console.log(users)
```

示例输出：
```json
[{"username":"zhw","password":"zhw18746489614","registeredAt":"2025-11-29T10:30:00.000Z"}]
```

#### 步骤 3：在桌面应用中重新注册

1. 打开桌面应用
2. 根据导出的用户信息重新注册
3. 使用相同的用户名和密码

#### 步骤 4：验证迁移结果

1. 登录桌面应用
2. 检查数据目录：
   ```bash
   # Windows
   explorer %APPDATA%\hplc-green-chemistry-app
   
   # macOS
   open ~/Library/Application\ Support/hplc-green-chemistry-app
   ```
3. 确认 `users.json` 文件已创建

---

## 📦 批量用户迁移

如果有多个用户账号需要迁移：

### 导出脚本
```javascript
// 导出所有用户
const users = JSON.parse(localStorage.getItem('hplc_users') || '[]')
console.table(users)

// 生成导入脚本
console.log('\n=== 复制以下命令到桌面应用控制台 ===\n')
users.forEach(user => {
  console.log(`// 注册用户: ${user.username}`)
  console.log(`await registerUser('${user.username}', '${user.password}')`)
})
```

### 在桌面应用中批量导入
```javascript
// 在桌面应用的浏览器控制台运行
const registerUser = async (username, password) => {
  try {
    const users = await window.electronAPI.fs.readUsers()
    
    // 检查用户是否已存在
    if (users.some(u => u.username === username)) {
      console.log(`⚠️ 用户 ${username} 已存在`)
      return
    }
    
    users.push({
      username,
      password,
      registeredAt: new Date().toISOString()
    })
    
    await window.electronAPI.fs.writeUsers(users)
    console.log(`✅ 用户 ${username} 注册成功`)
  } catch (error) {
    console.error(`❌ 注册失败:`, error)
  }
}

// 批量注册（根据导出脚本生成的命令）
await registerUser('zhw', 'zhw18746489614')
await registerUser('test', 'test123')
```

---

## 🔄 应用数据迁移

### Methods 数据迁移

```javascript
// 1. 在浏览器中导出
const methodsData = localStorage.getItem('hplc_methods_raw')
console.log('Methods 数据:', methodsData)

// 2. 在桌面应用中导入
await window.electronAPI.fs.writeAppData('hplc_methods_raw', JSON.parse(methodsData))
console.log('✅ Methods 数据已导入')
```

### Factors 数据迁移

```javascript
// 1. 导出
const factorsData = localStorage.getItem('hplc_factors_data')
console.log('Factors 数据:', factorsData)

// 2. 导入
await window.electronAPI.fs.writeAppData('hplc_factors_data', JSON.parse(factorsData))
console.log('✅ Factors 数据已导入')
```

### Gradient 数据迁移

```javascript
// 1. 导出
const gradientData = localStorage.getItem('hplc_gradient_data')
console.log('Gradient 数据:', gradientData)

// 2. 导入
await window.electronAPI.fs.writeAppData('hplc_gradient_data', JSON.parse(gradientData))
console.log('✅ Gradient 数据已导入')
```

---

## 🛠️ 完整自动化迁移脚本

### 在桌面应用控制台运行

```javascript
// 完整迁移函数
const migrateFromLocalStorage = async (backupData) => {
  try {
    console.log('🔄 开始迁移数据...')
    
    // 1. 迁移用户数据
    if (backupData.users) {
      const users = JSON.parse(backupData.users)
      await window.electronAPI.fs.writeUsers(users)
      console.log(`✅ 已迁移 ${users.length} 个用户`)
    }
    
    // 2. 迁移当前用户
    if (backupData.currentUser) {
      const currentUser = JSON.parse(backupData.currentUser)
      await window.electronAPI.fs.writeAppData('hplc_current_user', currentUser)
      console.log('✅ 已迁移当前登录用户')
    }
    
    // 3. 迁移 Methods 数据
    if (backupData.methods) {
      const methods = JSON.parse(backupData.methods)
      await window.electronAPI.fs.writeAppData('hplc_methods_raw', methods)
      console.log('✅ 已迁移 Methods 数据')
    }
    
    // 4. 迁移 Factors 数据
    if (backupData.factors) {
      const factors = JSON.parse(backupData.factors)
      await window.electronAPI.fs.writeAppData('hplc_factors_data', factors)
      console.log('✅ 已迁移 Factors 数据')
    }
    
    // 5. 迁移 Gradient 数据
    if (backupData.gradient) {
      const gradient = JSON.parse(backupData.gradient)
      await window.electronAPI.fs.writeAppData('hplc_gradient_data', gradient)
      console.log('✅ 已迁移 Gradient 数据')
    }
    
    // 6. 迁移 Comparison 数据
    if (backupData.comparison) {
      const comparison = JSON.parse(backupData.comparison)
      await window.electronAPI.fs.writeAppData('hplc_comparison_files', comparison)
      console.log('✅ 已迁移 Comparison 数据')
    }
    
    console.log('🎉 所有数据迁移完成！')
    console.log('📁 数据位置:', await window.electronAPI.fs.getUserDataPath())
    
  } catch (error) {
    console.error('❌ 迁移失败:', error)
  }
}

// 使用方法：
// 1. 先在浏览器中运行 exportHPLCData() 导出数据
// 2. 复制输出的 JSON 对象
// 3. 在桌面应用中运行：
//    await migrateFromLocalStorage({ ...粘贴导出的数据... })
```

---

## ✅ 验证迁移结果

### 检查文件是否创建

```bash
# Windows
dir %APPDATA%\hplc-green-chemistry-app

# macOS/Linux
ls -la ~/Library/Application\ Support/hplc-green-chemistry-app
```

应该看到：
```
users.json       # 用户账号数据
app_data.json    # 应用配置数据
```

### 检查数据完整性

在桌面应用控制台运行：
```javascript
// 检查用户数据
const users = await window.electronAPI.fs.readUsers()
console.log('用户数量:', users.length)
console.table(users)

// 检查应用数据
const methods = await window.electronAPI.fs.readAppData('hplc_methods_raw')
console.log('Methods 数据:', methods)

const factors = await window.electronAPI.fs.readAppData('hplc_factors_data')
console.log('Factors 数量:', factors ? factors.length : 0)
```

---

## 🔒 安全注意事项

### 1. 密码可见性

⚠️ **重要**：导出的 JSON 文件包含明文密码！

**安全建议**：
- 导出后立即删除备份文件，或妥善保管
- 不要将备份文件上传到公共位置
- 生产环境应使用密码加密

### 2. 数据备份

迁移前务必备份：
```javascript
// 完整备份
const fullBackup = {}
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  fullBackup[key] = localStorage.getItem(key)
}

// 下载备份
const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'localStorage_full_backup.json'
a.click()
```

---

## 🐛 常见问题

### Q1：迁移后无法登录？

**原因**：用户数据未正确迁移  
**解决**：
1. 检查 `users.json` 是否存在
2. 验证文件内容格式是否正确
3. 重新运行迁移脚本

### Q2：数据迁移后页面显示为空？

**原因**：应用数据未迁移或格式错误  
**解决**：
1. 在控制台检查各个数据键
2. 确认 JSON 格式正确
3. 逐个迁移数据项

### Q3：找不到数据文件？

**原因**：应用未正确初始化  
**解决**：
1. 确认应用已完全启动
2. 运行一次注册操作触发文件创建
3. 检查用户数据目录权限

---

## 📞 获取帮助

如果迁移过程中遇到问题：

1. 查看控制台错误信息
2. 检查数据文件格式
3. 联系技术支持

---

**文档版本**：1.0.0  
**更新日期**：2025-11-29  
**维护者**：HPLC Green Chemistry Analysis System Team
