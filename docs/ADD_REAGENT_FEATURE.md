# 添加试剂新功能说明

## 功能概述

在 Factors 页面新增了智能添加试剂功能，用户可以通过表单界面选择和填写试剂的各项参数，系统自动计算绿色化学评分。

## 主要特性

### 1. 表单式添加试剂
- 点击 **Add** 按钮打开模态窗口
- 提供友好的表单界面，无需直接编辑表格单元格
- 支持下拉选择和数值输入两种方式

### 2. 智能计算
系统根据用户输入的小因子自动计算大因子：

| 大因子 | 计算公式 |
|--------|----------|
| 安全分数 (S) | Release Potential + Fire/Explos + React/Decom + Acute Toxicity |
| 健康分数 (H) | Irritation + Chronic Toxicity |
| 环境分数 (E) | Persistency + Air Hazard + Water Hazard |

### 3. 实时预览
- 在表单底部实时显示计算结果
- 彩色标注不同分数类型：
  - 🔴 安全分数 (红色)
  - 🟠 健康分数 (橙色)
  - 🟢 环境分数 (绿色)

### 4. 自定义试剂标记
- 通过表单添加的试剂会自动标记为 `isCustom: true`
- 与预定义试剂区分开来

### 5. 智能重置功能
**Reset to Default** 按钮行为升级：
- ✅ 还原所有预定义试剂到初始状态
- ✅ **保留**用户添加的自定义试剂
- ✅ 重置前显示确认对话框，列出将保留的自定义试剂

## 表单字段说明

### 基本信息
- **试剂名称**: 必填，最少2个字符
- **密度 ρ (g/mL)**: 必填，范围 0-10

### 安全因子 (Safety Factors)
| 字段 | 选项 | 说明 |
|------|------|------|
| Release Potential | 低(0.0) / 中(0.5) / 高(1.0) | 基于沸点的挥发性 |
| Fire/Explosives | 无(0.0) / 中(0.5) / 高(1.0) | 可燃性和爆炸危险 |
| Reaction/Decomposition | 稳定(0.0) / 中等(0.5) / 不稳定(1.0) | 化学稳定性 |
| Acute Toxicity | 无毒(0.0) / 低毒(0.3) / 中毒(0.6) / 高毒(1.0) | 基于LD50 |

### 健康因子 (Health Factors)
| 字段 | 选项 | 说明 |
|------|------|------|
| Irritation | 无(0.0) / 轻微(0.5) / 强(1.0) | 刺激性/腐蚀性 |
| Chronic Toxicity | 无(0.0) / 低(0.3) / 中(0.6) / 高(1.0) | 致癌/致畸/致突变 |

### 环境因子 (Environment Factors)
| 字段 | 选项 | 说明 |
|------|------|------|
| Persistency | 易降解(0.0) / 可降解(0.3) / 难降解(0.6) / 持久性(1.0) | 降解时间 |
| Air Hazard | 低(0.0) / 中(0.5) / 高(1.0) | 大气污染 |
| Water Hazard | 低(0.0) / 中低(0.3) / 中高(0.6) / 高(1.0) | 水生毒性(LC50) |

### 其他因子
| 字段 | 选项 | 说明 |
|------|------|------|
| Recyclability (R) | 0-3 | 可回收性等级 |
| Disposal (D) | 0-3 | 处置难度 |
| Power (P) | 0-3 | 能耗等级(基于操作温度) |

## 使用流程

1. 在 Factors 页面点击 **Add** 按钮
2. 在弹出的模态窗口中填写试剂信息：
   - 输入试剂名称和密度
   - 选择各项安全、健康、环境因子
   - 观察底部自动计算的 S/H/E 分数
3. 点击 **添加** 按钮完成
4. 新试剂将出现在表格末尾

## 技术实现

### 文件结构
```
frontend/src/
├── components/
│   └── AddReagentModal.tsx      # 新增：添加试剂模态窗口组件
├── contexts/
│   └── AppContext.tsx            # 更新：ReagentFactor 添加 isCustom 字段
└── pages/
    └── FactorsPage.tsx           # 更新：集成模态窗口，修改重置逻辑
```

### 关键代码

#### 1. AddReagentModal 组件
- 使用 Ant Design Form 组件构建表单
- 使用 `onValuesChange` 监听表单变化
- 实时计算并显示大因子分数
- 提供详细的选项说明和提示

#### 2. FactorsPage 集成
```typescript
// 状态管理
const [isModalVisible, setIsModalVisible] = useState<boolean>(false)

// 打开模态窗口
const addReagent = () => {
  setIsModalVisible(true)
}

// 处理添加
const handleAddReagent = (newReagent: ReagentFactor) => {
  setReagents([...reagents, newReagent])
  setIsModalVisible(false)
  message.success(`试剂 "${newReagent.name}" 添加成功！`)
}
```

#### 3. 智能重置逻辑
```typescript
const resetToDefault = () => {
  // 过滤出自定义试剂
  const customReagents = reagents.filter(r => r.isCustom === true)
  
  // 合并预定义和自定义试剂
  const resetData = [...PREDEFINED_REAGENTS, ...customReagents]
  setReagents(resetData)
  
  message.success(`已还原预定义试剂数据，保留了 ${customReagents.length} 个自定义试剂`)
}
```

## 用户体验优化

### 1. 视觉反馈
- 🎨 使用图标区分不同因子类别（火焰、心形、地球）
- 📊 实时显示计算结果，直观展示数据变化
- 🎯 使用颜色编码区分安全/健康/环境分数

### 2. 数据验证
- ✅ 必填字段验证（试剂名称、密度）
- ✅ 数值范围限制（密度 0-10，精度 0.001）
- ✅ 字符长度验证（名称最少2个字符）

### 3. 操作提示
- 💡 每个字段都有 tooltip 说明
- 📝 选项带有详细描述（如 LD50 范围、降解时间）
- ✔️ 操作成功后显示消息提示

### 4. 数据保护
- 🛡️ 重置前确认对话框
- 📋 列出将保留的自定义试剂清单
- 🔒 自定义试剂不会被误删除

## 优势对比

| 特性 | 旧方案（直接编辑） | 新方案（表单添加） |
|------|------------------|------------------|
| 操作方式 | 点击单元格逐个输入 | 表单一次性填写 |
| 数据验证 | 基础验证 | 完整的字段验证 |
| 计算方式 | 手动输入 | 自动计算 |
| 用户体验 | 需要切换编辑模式 | 随时添加，无需编辑模式 |
| 错误率 | 较高（需手动计算） | 较低（自动计算） |
| 数据保护 | Reset会删除所有 | Reset保留自定义试剂 |

## 未来扩展

可以考虑的增强功能：
- [ ] 支持批量导入试剂（CSV/Excel）
- [ ] 试剂数据库搜索（从在线数据库查询）
- [ ] 试剂模板库（常用试剂快速添加）
- [ ] 自定义试剂的编辑和删除功能
- [ ] 导出自定义试剂列表
