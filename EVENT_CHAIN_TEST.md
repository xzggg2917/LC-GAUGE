# 测试事件链路

请按照以下步骤测试：

## 1. 启动后端
打开新终端，运行：
```powershell
cd backend
python main.py
```

应该看到：
```
INFO:     Started server process
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## 2. 启动前端
```powershell
npm run electron:dev
```

## 3. 打开浏览器 DevTools
按 F12 打开控制台

## 4. 测试步骤

### 测试 A：在 MethodsPage 修改数据

1. 打开 MethodsPage
2. 修改任意数据（例如：修改仪器能耗）
3. 观察控制台输出，应该看到：

```
🔄 MethodsPage: 本地数据变化，同步到Context并标记dirty
🔔 MethodsPage: 触发 methodsDataUpdated 事件
```

**如果没有看到上述日志** → 说明数据变化未被正确检测

### 测试 B：切换到 GraphPage

1. 切换到 GraphPage
2. 观察控制台输出，应该看到：

```
📢 GraphPage: 收到 methodsDataUpdated 事件
📤 GraphPage: 发送 requestScoreRecalculation 请求
⏳ GraphPage: 等待 scoreDataUpdated 事件触发更新
```

**如果没有看到** → 说明 GraphPage 未监听到事件

### 测试 C：MethodsPage 响应重新计算请求

应该在控制台看到：

```
📊 MethodsPage: 收到重新计算评分请求
📊 MethodsPage: 立即调用 calculateFullScoreAPI
📊 发送评分请求: {...}
```

**如果没有看到** → 说明 MethodsPage 未监听 requestScoreRecalculation 事件

### 测试 D：后端计算完成

应该看到：

```
✅ 评分计算成功！
💾 MethodsPage: 评分结果已保存到 SCORE_RESULTS
🔔 MethodsPage: 触发 scoreDataUpdated 事件
```

**如果没有看到** → 说明后端API调用失败

### 测试 E：GraphPage 刷新显示

应该看到：

```
✅ GraphPage: 收到 scoreDataUpdated 事件，开始刷新数据
🔍 GraphPage: 开始 calculateTotalScores
✅ GraphPage: 找到 scoreResults，使用新评分系统数据
📊 GraphPage: Score₃ = XX.XX
```

**如果没有看到** → 说明 GraphPage 未收到 scoreDataUpdated 事件

## 完整事件链路

```
MethodsPage 数据变化
  ↓ 🔔 methodsDataUpdated
GraphPage 监听到事件
  ↓ 📤 requestScoreRecalculation
MethodsPage 收到请求
  ↓ 调用后端 API
后端计算完成
  ↓ 保存 SCORE_RESULTS
  ↓ 🔔 scoreDataUpdated
GraphPage 收到事件
  ↓ calculateTotalScores()
  ↓ ✅ 显示更新
```

## 常见问题

### 问题1：数据修改后没有触发事件
**原因**：`lastLocalData.current === currentLocalDataStr` 判断为相同
**解决**：检查数据是否真的变化了

### 问题2：事件触发了但没有响应
**原因**：事件监听器未正确注册
**解决**：检查 useEffect 的依赖项

### 问题3：后端 API 调用失败
**原因**：后端未启动或数据格式错误
**解决**：
1. 检查后端是否运行：`netstat -ano | findstr :8000`
2. 查看后端控制台错误信息

### 问题4：只更新一次
**原因**：事件监听器被多次注册/注销
**解决**：检查 useEffect 返回的 cleanup 函数

## 调试命令

### 手动触发事件（在浏览器控制台）
```javascript
// 手动触发 methodsDataUpdated
window.dispatchEvent(new CustomEvent('methodsDataUpdated'))

// 手动触发 requestScoreRecalculation
window.dispatchEvent(new CustomEvent('requestScoreRecalculation'))

// 手动触发 scoreDataUpdated
window.dispatchEvent(new CustomEvent('scoreDataUpdated'))
```

### 检查事件监听器
```javascript
// 查看 window 上的事件监听器
getEventListeners(window)
```
