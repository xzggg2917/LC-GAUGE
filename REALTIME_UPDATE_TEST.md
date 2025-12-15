# 实时更新功能测试指南

## 修改内容

### 1. MethodsPage 自动计算逻辑优化
- **问题**: 初始化标志被多个useEffect共享,导致跳过逻辑失效
- **修复**: 添加专用的 `isAutoCalcInitialized` ref 用于自动计算useEffect
- **效果**: 确保只在初始挂载时跳过一次,之后所有数据变化都能触发自动计算

### 2. 增强日志系统
- 在自动计算useEffect中添加了大量日志,显示:
  - 何时触发
  - 所有依赖项的值
  - 是否跳过(初始挂载)
  - 防抖计时器触发
  - 数据检查结果
  - 是否调用API

- 在API调用处添加日志:
  - 调用开始
  - 请求数据大小
  - 调用成功
  - 保存结果
  - 触发事件

- 在GraphPage添加日志:
  - 事件接收
  - 数据读取
  - 分数显示

### 3. 事件流程简化
- **原来**: GraphPage接收 methodsDataUpdated → 发送 requestScoreRecalculation → MethodsPage响应 → 计算 → 触发 scoreDataUpdated
- **现在**: MethodsPage数据变化 → 自动计算(1秒后) → 触发 scoreDataUpdated → GraphPage刷新
- **优势**: 减少不必要的事件传递,降低复杂度

## 测试步骤

### 前置条件
1. ✅ 后端已启动(localhost:8000)
2. ✅ 已配置梯度程序(HPLC Gradient page)
3. ✅ 已配置因子数据(Factors page)
4. ✅ 已有试剂数据(Methods page)

### 测试流程

#### 测试 1: 修改能耗值
1. 打开 **Methods** 页面
2. 打开 Electron DevTools (F12 或 Ctrl+Shift+I)
3. 修改 **Instrument Energy (kWh)** 的值(例如从0改为10)
4. **观察 DevTools Console 输出**,应该看到:
   ```
   📌📌📌 自动计算useEffect触发 📌📌📌
     - 仪器能耗: 10 kWh
   ✅ 非初始挂载，继续执行自动计算逻辑
   ⏰⏰⏰ 防抖计时器触发，准备检查数据并计算...
   📊 检查必要数据: { hasGradient: true, hasFactors: true, ... }
   ✅✅✅ 数据完整，立即触发评分计算 ✅✅✅
   🚀 开始执行 calculateFullScoreAPI, silent: true
   🌐🌐🌐 正在调用后端API: /api/v1/scoring/full-score
   ✅✅✅ 后端API响应成功！
   🔔 MethodsPage: 触发 scoreDataUpdated 事件
   ```

5. 切换到 **Graph** 页面
6. **观察 DevTools Console 输出**,应该看到:
   ```
   ✅✅✅ GraphPage: 收到 scoreDataUpdated 事件，立即刷新显示
   🔍🔍🔍 GraphPage: 开始 calculateTotalScores
   📊 GraphPage: Score₃ = [新的分数]
   ```

7. **验证**: 图表和分数是否更新为新的值

#### 测试 2: 修改前处理能耗
1. 在 **Methods** 页面修改 **Pretreatment Energy (kWh)**
2. 等待1秒
3. 观察 DevTools Console,应该看到类似的日志输出
4. 切换到 **Method Evaluation** 页面
5. 验证数据是否更新

#### 测试 3: 修改试剂配比
1. 在 **Methods** 页面修改 **Mobile Phase A** 的试剂百分比
2. 等待1秒
3. 观察 DevTools Console 日志
4. 切换到 **Pretreatment Analysis** 或 **Instrument Analysis** 页面
5. 验证数据是否更新

#### 测试 4: 修改权重方案
1. 在 **Methods** 页面修改 **Safety Weighting Scheme** 下拉选择
2. 等待1秒
3. 观察 DevTools Console 日志
4. 切换到任意Results页面
5. 验证评分是否根据新权重方案更新

## 预期行为

### ✅ 成功标志
- DevTools Console 中看到完整的日志链条(从触发→计算→保存→事件→刷新)
- 1-2秒内完成自动计算
- Results页面显示最新数据
- 无错误消息
- 无"No Data Available"闪烁

### ❌ 失败标志
- DevTools Console 中只看到"📌📌📌 自动计算useEffect触发"但没有后续日志
- 看到"❌❌❌ 跳过自动计算 - 缺少必要数据"
- 看到API错误消息
- Results页面数据不更新
- 页面白屏或卡死

## 故障排查

### 如果自动计算没有触发
**症状**: 修改数据后，DevTools Console 只显示"📌📌📌 自动计算useEffect触发"，然后立即"🧹 清理防抖计时器"

**原因**: 可能是组件重新渲染导致useEffect被清理

**解决**: 检查是否有其他useEffect在同时更新状态

### 如果提示"缺少必要数据"
**症状**: DevTools Console 显示"❌❌❌ 跳过自动计算 - 缺少必要数据"

**原因**: gradientData 或 factors 为空

**解决**: 
1. 检查 HPLC Gradient 页面是否已配置梯度程序
2. 检查 Factors 页面是否已导入因子数据

### 如果API调用失败
**症状**: DevTools Console 显示"❌ 后端API调用失败" 或类似错误

**原因**: 后端未启动或端口不对

**解决**:
1. 检查后端进程: `Get-Process -Name python`
2. 检查端口: `netstat -ano | Select-String ":8000"`
3. 重启后端: `python backend/main.py`

### 如果Results页面不更新
**症状**: API调用成功，事件也触发了，但Results页面显示旧数据

**原因**: Results页面没有正确监听事件或读取数据

**解决**: 
1. 检查Results页面的 DevTools Console,应该看到"✅✅✅ [PageName]: 收到 scoreDataUpdated 事件"
2. 如果看不到,说明事件监听器有问题
3. 重新加载应用

## 调试清单

在报告问题前,请完成以下检查:

- [ ] 后端正在运行(端口8000)
- [ ] 已配置梯度程序
- [ ] 已导入因子数据
- [ ] DevTools Console 无红色错误
- [ ] 已等待1-2秒(防抖延迟)
- [ ] 已切换到Results页面查看
- [ ] 已尝试重新加载应用

## 日志收集

如果问题仍然存在,请提供以下信息:

1. **修改的数据**: 例如"Instrument Energy从0改为10"
2. **DevTools Console 完整日志**: 从修改数据到切换页面的全部输出
3. **预期结果**: 应该看到什么
4. **实际结果**: 实际看到了什么
5. **后端日志**: backend终端的输出
