# LC GAUGE - 构建和发布脚本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  LC GAUGE - 构建和发布到 GitHub" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. 加载 .env 文件中的 Token
if (Test-Path ".env") {
    Write-Host "[1/5] 加载环境变量..." -ForegroundColor Yellow
    $envContent = Get-Content .env
    foreach ($line in $envContent) {
        if ($line -match "GH_TOKEN=(.+)") {
            $env:GH_TOKEN = $matches[1]
            Write-Host "✓ GH_TOKEN 已加载" -ForegroundColor Green
        }
    }
}
else {
    Write-Host "✗ 错误: .env 文件不存在" -ForegroundColor Red
    exit 1
}

# 2. 设置 Electron 镜像（使用国内镜像加速）
Write-Host "[2/5] 设置 Electron 镜像..." -ForegroundColor Yellow
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
Write-Host "✓ 使用淘宝镜像" -ForegroundColor Green
Write-Host ""

# 3. 清理旧文件
Write-Host "[3/5] 清理旧构建文件..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ 已清理 dist 目录" -ForegroundColor Green
}
Write-Host ""

# 4. 构建前端
Write-Host "[4/5] 构建前端..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端构建失败" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "✓ 前端构建成功" -ForegroundColor Green
Write-Host ""

# 5. 打包并发布到 GitHub
Write-Host "[5/5] 打包 Electron 并发布到 GitHub..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟，请耐心等待..." -ForegroundColor Cyan
Write-Host ""

npx electron-builder --win --publish always

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  ✓ 发布成功！" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "请访问 GitHub Releases 查看发布结果:" -ForegroundColor Cyan
    Write-Host "https://github.com/xzggg2917/LC-GAUGE/releases" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "  ✗ 发布失败" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "1. 网络连接是否正常" -ForegroundColor White
    Write-Host "2. GH_TOKEN 是否有效" -ForegroundColor White
    Write-Host "3. GitHub 仓库是否是公开的" -ForegroundColor White
    Write-Host ""
    exit 1
}
