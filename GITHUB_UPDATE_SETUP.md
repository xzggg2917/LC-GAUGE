# GitHub 自动更新详细配置教程

## 📚 目录
1. [创建 GitHub 仓库](#1-创建-github-仓库)
2. [生成 GitHub Token](#2-生成-github-token)
3. [配置项目](#3-配置项目)
4. [首次发布](#4-首次发布)
5. [测试自动更新](#5-测试自动更新)
6. [后续更新流程](#6-后续更新流程)

---

## 1. 创建 GitHub 仓库

### 步骤 1.1：登录 GitHub
1. 访问 https://github.com
2. 登录你的 GitHub 账号（如果没有账号，先注册一个）

### 步骤 1.2：创建新仓库
1. 点击右上角 **+** 号
2. 选择 **New repository**
3. 填写仓库信息：
   ```
   Repository name: lc-gauge
   Description: LC GAUGE - Greenness Assessment Unified Generalised Evaluator
   Visibility: ✅ Public (必须是公开仓库，私有仓库需要付费功能)
   ```
4. **不要**勾选任何初始化选项（README、.gitignore、license）
5. 点击 **Create repository**

### 步骤 1.3：记录仓库信息
创建成功后，你会看到仓库地址，格式如：
```
https://github.com/YOUR_USERNAME/lc-gauge
```

**记住你的 GitHub 用户名**（例如：如果地址是 `https://github.com/zhangsan/lc-gauge`，用户名就是 `zhangsan`）

---

## 2. 生成 GitHub Token

### 步骤 2.1：进入 Token 设置页面
1. 登录 GitHub
2. 点击右上角头像
3. 选择 **Settings**（设置）
4. 在左侧菜单最下方，找到 **Developer settings**
5. 点击 **Personal access tokens**
6. 选择 **Tokens (classic)**

或者直接访问：https://github.com/settings/tokens

### 步骤 2.2：生成新 Token
1. 点击 **Generate new token** 按钮
2. 选择 **Generate new token (classic)**
3. 填写 Token 信息：
   ```
   Note: LC GAUGE Auto-Update Token
   Expiration: No expiration (或选择 90 days、自定义)
   ```
4. 勾选权限：
   ```
   ✅ repo (勾选整个 repo，会自动勾选所有子项)
      ✅ repo:status
      ✅ repo_deployment
      ✅ public_repo
      ✅ repo:invite
      ✅ security_events
   ```
   **注意**：只需要勾选 `repo`，其他权限不需要

5. 滚动到页面底部，点击 **Generate token**

### 步骤 2.3：保存 Token
⚠️ **重要**：Token 只会显示一次！
1. 生成后会显示一长串字符（以 `ghp_` 开头）
2. **立即复制并保存**到安全的地方（记事本、密码管理器等）
3. 示例格式：`ghp_abcd1234efgh5678ijkl9012mnop3456qrst7890`

**如果关闭页面后忘记保存，需要重新生成新的 Token**

---

## 3. 配置项目

### 步骤 3.1：更新 package.json

打开 `d:\Projects\HPLC_improve\package.json`，找到这段代码：

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",  // 👈 改这里
  "repo": "lc-gauge",
  "releaseType": "release"
}
```

将 `YOUR_GITHUB_USERNAME` 替换为你的 GitHub 用户名。

**例如**：如果你的 GitHub 用户名是 `zhangsan`，改成：
```json
"publish": {
  "provider": "github",
  "owner": "zhangsan",
  "repo": "lc-gauge",
  "releaseType": "release"
}
```

保存文件。

### 步骤 3.2：设置 GitHub Token 环境变量

**方法 A：临时设置（推荐用于测试）**

打开 PowerShell（在项目目录），执行：
```powershell
$env:GH_TOKEN="ghp_你的Token"
```

**替换为你自己的 Token**，例如：
```powershell
$env:GH_TOKEN="ghp_abcd1234efgh5678ijkl9012mnop3456qrst7890"
```

⚠️ 注意：
- **必须在双引号内**
- **关闭 PowerShell 窗口后会失效**
- 每次打包前需要重新设置

**方法 B：永久设置（推荐用于长期使用）**

创建 `.env` 文件（注意文件名以点开头）：

1. 在项目根目录 `d:\Projects\HPLC_improve\` 创建文件 `.env`
2. 写入内容：
   ```
   GH_TOKEN=ghp_你的Token
   ```
3. 保存文件

然后安装 dotenv 支持：
```powershell
npm install --save-dev dotenv-cli
```

修改 `package.json` 的打包命令：
```json
"scripts": {
  "electron:build": "dotenv npm run frontend:build && electron-builder",
  ...
}
```

**方法 C：系统环境变量（最安全）**

1. 按 `Win + X`，选择"系统"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"用户变量"中点击"新建"
5. 变量名：`GH_TOKEN`
6. 变量值：`ghp_你的Token`
7. 确定保存
8. **重启 PowerShell 和 VS Code**

---

## 4. 首次发布

### 步骤 4.1：初始化 Git 仓库

在项目根目录打开 PowerShell：

```powershell
# 1. 初始化 Git
git init

# 2. 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/lc-gauge.git

# 3. 创建 .gitignore 文件（如果没有）
@"
node_modules/
dist/
.venv/
__pycache__/
*.pyc
.env
frontend/node_modules/
frontend/dist/
"@ | Out-File -FilePath .gitignore -Encoding utf8

# 4. 提交初始代码
git add .
git commit -m "Initial commit: LC GAUGE v1.0.0"

# 5. 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步骤 4.2：确认环境变量

在同一个 PowerShell 窗口检查 Token 是否设置成功：
```powershell
echo $env:GH_TOKEN
```

应该显示你的 Token（以 `ghp_` 开头）。如果显示空白，重新执行步骤 3.2。

### 步骤 4.3：打包并发布

```powershell
# 1. 构建前端
cd frontend
npm run build

# 2. 返回根目录打包
cd ..
npm run electron:build
```

**打包过程说明**：
1. 编译 TypeScript 和 React 代码
2. 打包 Electron 应用
3. 生成 Windows 安装程序
4. **自动上传到 GitHub Releases** ✨
5. 生成 `latest.yml` 文件（用于自动更新）

### 步骤 4.4：验证发布成功

1. 访问你的 GitHub 仓库
2. 点击右侧 **Releases** 标签
3. 应该能看到 **v1.0.0** 版本
4. 包含的文件：
   - `LC.GAUGE.Setup.1.0.0.exe`（安装程序）
   - `LC.GAUGE.1.0.0.exe`（便携版）
   - `latest.yml`（自动更新配置文件）

**如果没有看到 Release**：
- 检查 PowerShell 输出是否有错误
- 确认 `$env:GH_TOKEN` 已正确设置
- 确认 GitHub 仓库是公开的

---

## 5. 测试自动更新

### 步骤 5.1：安装当前版本

1. 从 `dist` 目录找到 `LC GAUGE Setup 1.0.0.exe`
2. 安装到电脑上
3. 运行应用，确保正常工作

### 步骤 5.2：发布新版本

1. **修改版本号**

编辑 `package.json`：
```json
{
  "name": "lc-gauge",
  "version": "1.0.1",  // 从 1.0.0 改为 1.0.1
  ...
}
```

2. **做一些小改动**（可选）

例如修改 About 页面的文字，方便识别版本。

3. **重新打包发布**
```powershell
# 确保 Token 已设置
$env:GH_TOKEN="ghp_你的Token"

# 打包
cd frontend
npm run build
cd ..
npm run electron:build
```

4. **验证 GitHub Releases**

访问 GitHub 仓库，应该看到新的 **v1.0.1** 版本。

### 步骤 5.3：测试自动更新

1. 打开之前安装的 **v1.0.0** 版本
2. 应用启动后会自动检测更新（后台进行）
3. 几秒钟后会弹窗提示：
   ```
   Update Available
   A new version is available. Downloading now...
   ```
4. 下载完成后会提示：
   ```
   Update Ready
   Update downloaded. The application will restart to install the update.
   [Restart] [Later]
   ```
5. 点击 **Restart** 自动安装更新
6. 应用重启后，检查版本号（在 About 页面）

---

## 6. 后续更新流程

每次发布新版本的标准流程：

### 6.1 更新版本号
```json
// package.json
"version": "1.0.2"  // 递增版本号
```

### 6.2 提交代码
```powershell
git add .
git commit -m "Release v1.0.2: 添加新功能"
git push origin main
```

### 6.3 设置 Token（如果使用临时方式）
```powershell
$env:GH_TOKEN="ghp_你的Token"
```

### 6.4 打包发布
```powershell
cd frontend
npm run build
cd ..
npm run electron:build
```

### 6.5 验证发布
- 检查 GitHub Releases 是否有新版本
- 确认文件已上传完整

---

## ❓ 常见问题

### Q1: 打包时提示 "GH_TOKEN is not set"

**原因**：环境变量未设置或已失效

**解决**：
```powershell
# 重新设置 Token
$env:GH_TOKEN="ghp_你的Token"

# 验证设置成功
echo $env:GH_TOKEN

# 然后重新打包
npm run electron:build
```

### Q2: 上传到 GitHub 失败，提示 401 Unauthorized

**原因**：Token 权限不足或已过期

**解决**：
1. 检查 Token 是否勾选了 `repo` 权限
2. 检查 Token 是否过期
3. 重新生成新的 Token

### Q3: 应用检测不到更新

**原因**：多种可能

**检查清单**：
- ✅ GitHub 仓库是否是 Public
- ✅ package.json 中的 owner 和 repo 是否正确
- ✅ GitHub Releases 中是否有 `latest.yml` 文件
- ✅ 新版本号是否大于当前版本
- ✅ 是否在生产环境运行（开发模式不会检查更新）

### Q4: 用户电脑提示"无法验证发布者"

**原因**：应用未签名

**解决方案**：
1. **临时方案**：用户点击"更多信息" → "仍要运行"
2. **长期方案**：购买代码签名证书
   - Windows: Comodo/DigiCert 证书（约 $200-500/年）
   - 证书到手后配置到 electron-builder

### Q5: Token 泄露了怎么办？

⚠️ **立即删除旧 Token**：
1. 访问 https://github.com/settings/tokens
2. 找到泄露的 Token
3. 点击 **Delete**
4. 生成新的 Token
5. 更新环境变量

---

## 🎯 快速命令参考

```powershell
# 设置 Token（每次打包前）
$env:GH_TOKEN="ghp_你的Token"

# 完整打包流程
cd frontend
npm run build
cd ..
npm run electron:build

# 验证 Token 是否设置
echo $env:GH_TOKEN

# 查看 Git 远程仓库
git remote -v

# 推送代码
git add .
git commit -m "更新说明"
git push origin main
```

---

## 📞 需要帮助？

如果配置过程中遇到问题：

1. **检查错误信息**：仔细阅读 PowerShell 输出的错误提示
2. **查看日志**：`dist` 目录下的 `.log` 文件
3. **对照清单**：重新检查每个步骤是否正确执行
4. **重新开始**：如果多次失败，删除 `.git` 目录重新初始化

---

## 🎉 总结

完成所有配置后，你的应用将支持：

✅ **自动检测更新**：启动时自动检查新版本  
✅ **后台下载**：静默下载更新包  
✅ **一键安装**：用户点击按钮即可更新  
✅ **无需重新下载**：小版本更新只下载差异文件  

**祝发布顺利！** 🚀

---

**LC GAUGE** - Greenness Assessment Unified Generalised Evaluator  
© 2025 Dalian University of Technology
