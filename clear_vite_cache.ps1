# 清理 Vite 缓存并重启应用

Write-Host "🧹 清理 Vite 缓存..." -ForegroundColor Yellow

# 删除 node_modules/.vite 缓存
$viteCachePath = "frontend/node_modules/.vite"
if (Test-Path $viteCachePath) {
    Remove-Item -Path $viteCachePath -Recurse -Force
    Write-Host "✅ 已删除 $viteCachePath" -ForegroundColor Green
} else {
    Write-Host "ℹ️ $viteCachePath 不存在" -ForegroundColor Gray
}

# 删除 frontend/.vite 缓存
$frontendViteCache = "frontend/.vite"
if (Test-Path $frontendViteCache) {
    Remove-Item -Path $frontendViteCache -Recurse -Force
    Write-Host "✅ 已删除 $frontendViteCache" -ForegroundColor Green
} else {
    Write-Host "ℹ️ $frontendViteCache 不存在" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 缓存已清理，现在请运行：npm run electron:dev" -ForegroundColor Cyan
