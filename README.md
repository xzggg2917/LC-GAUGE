# HPLC绿色化学分析系统

一个集成HPLC数据分析与绿色化学评估的桌面应用程序，帮助化学分析工作者优化实验方案，减少环境影响。

## 🌟 主要功能

- **绿色化学评估**
  - 溶剂系统绿色评分计算
  - 基于9个小因子的精准评估（S1-S4安全、H1-H2健康、E1-E3环境）
  - 5层评分架构（0-100分制，越低越环保）
  - 支持11种梯度曲线类型（线性、凸凹曲线、阶跃等）
  - 支持5种色谱类型（UPLC/HPLC-UV/HPLC-MS/PrepHPLC/SFC）
  - 可回收性评估

- **色谱图分析**
  - 梯度程序编辑和可视化
  - 精确的质量计算（支持11种曲线的积分）
  - 多方法对比分析
  - 雷达图、极坐标图、扇形图多维度展示

- **数据管理**
  - HPLC分析记录管理
  - 历史数据查询
  - 评分趋势分析
  - 加密文件导入/导出

## 🏗️ 技术架构

### 后端
- **框架**: FastAPI (Python)
- **数据库**: SQLite (异步SQLAlchemy)
- **核心库**: NumPy, Pandas, SciPy
- **特性**: RESTful API, 异步处理, 数据持久化

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI库**: Ant Design 5
- **图表**: Recharts
- **状态管理**: Zustand
- **特性**: 响应式设计, 组件化开发

### 桌面应用
- **框架**: Electron
- **打包工具**: electron-builder
- **支持平台**: Windows, macOS, Linux
- **数据存储**: Electron 文件系统（永久保存，独立于浏览器）
- **特性**: 本地文件加密、密码保护、跨平台支持

## 💾 数据存储

### 存储机制
**本应用仅支持 Electron 桌面模式运行，不支持纯浏览器模式。**

用户数据保存在操作系统的应用数据目录：
- **Windows**: `C:\Users\<YourName>\AppData\Roaming\hplc-green-chemistry-app\`
- **macOS**: `~/Library/Application Support/hplc-green-chemistry-app/`
- **Linux**: `~/.config/hplc-green-chemistry-app/`

**数据文件**：
- `app_data.json` - 应用数据（methods, gradient, factors, scores）
- `users.json` - 用户账户信息（加密存储）
- `data/*.json` - 加密的方法文件

**优势**：
- ✅ 永久保存，不受浏览器影响
- ✅ 文件级加密，数据安全
- ✅ 可直接备份和恢复
- ✅ 更高的隔离性和稳定性

📖 详细文档：
- [桌面存储架构](./DESKTOP_STORAGE_ARCHITECTURE.md)
- [数据迁移指南](./MIGRATION_GUIDE.md)

## 📁 项目结构

```
HPLC_improve/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API路由
│   │   ├── core/           # 核心配置
│   │   ├── database/       # 数据库模型
│   │   ├── schemas/        # Pydantic模型
│   │   └── services/       # 业务逻辑
│   ├── data/               # 数据存储目录
│   ├── main.py             # 应用入口
│   └── requirements.txt    # Python依赖
│
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── App.tsx        # 主应用组件
│   │   └── main.tsx       # 入口文件
│   ├── package.json
│   └── vite.config.ts
│
├── electron/               # Electron配置
│   ├── main.js            # 主进程
│   └── preload.js         # 预加载脚本
│
├── docs/                   # 文档目录
├── build/                  # 构建资源
├── package.json           # 根package.json
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd HPLC_improve
```

2. **安装根依赖**
```bash
npm install
```

3. **安装后端依赖**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

4. **安装前端依赖**
```bash
cd frontend
npm install
cd ..
```

### 开发模式运行

#### 方式一：分别启动（推荐用于开发）

**终端1 - 启动后端**
```bash
cd backend
python main.py
```
后端服务将在 http://localhost:8000 启动

**终端2 - 启动前端**
```bash
cd frontend
npm run dev
```
Electron 桌面应用窗口将自动打开

#### 方式二：使用Electron启动
```bash
npm run electron:dev
```

### API文档

启动后端后，访问以下地址查看API文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📦 打包发布

### 1. 构建前端
```bash
cd frontend
npm run build
```

### 2. 打包后端（可选）
```bash
cd backend
pyinstaller --name=hplc-backend --onefile main.py
```

### 3. 构建Electron应用
```bash
npm run electron:build
```

打包后的应用将在 `dist/` 目录中生成。

### 打包输出

- **Windows**: `.exe` 安装程序和便携版
- **macOS**: `.dmg` 镜像文件
- **Linux**: `.AppImage` 和 `.deb` 包

## 🔧 配置说明

### 后端配置 (backend/.env)
```env
PROJECT_NAME=绿色化学分析系统
DEBUG=True
HOST=127.0.0.1
PORT=8000
DATABASE_URL=sqlite+aiosqlite:///./data/hplc_analysis.db
SECRET_KEY=your-secret-key-here
```

### 前端配置 (frontend/.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 📊 核心功能说明

### 绿色化学评分算法

基于以下因素计算：
- 溶剂危险性 (30%)
- 环境影响 (30%)
- 健康安全 (20%)
- 可回收性 (20%)

评分范围：0-100（100为最环保）

### Eco-Scale评估

参考Van Aken等人的方法（2006），考虑：
- 产率
- 反应时间
- 温度条件
- 溶剂用量

### 色谱图分析

- 自动峰识别
- 峰面积计算
- 主峰纯度分析
- 分辨率评估

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📝 许可证

本项目采用 MIT 许可证。

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件至：[your-email@example.com]

## 🙏 致谢

- FastAPI - 现代化的Python Web框架
- React - 用户界面库
- Ant Design - 企业级UI设计
- Electron - 跨平台桌面应用框架

---

**开发时间**: 2025年11月
**版本**: 1.0.0
