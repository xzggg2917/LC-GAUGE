# 测试后端是否正常工作

Write-Host "=== 测试后端连接 ===" -ForegroundColor Cyan

# 1. 检查后端是否运行
$backendProcess = Get-Process | Where-Object {$_.ProcessName -eq "python"} | Select-Object -First 1
if ($backendProcess) {
    Write-Host "✅ 后端进程运行中 (PID: $($backendProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ 后端未运行" -ForegroundColor Red
    Write-Host "请先启动后端：cd backend; python main.py" -ForegroundColor Yellow
    exit
}

# 2. 检查端口
$portCheck = netstat -ano | findstr ":8000.*LISTENING"
if ($portCheck) {
    Write-Host "✅ 端口 8000 正在监听" -ForegroundColor Green
} else {
    Write-Host "❌ 端口 8000 未监听" -ForegroundColor Red
    exit
}

# 3. 测试API连接
Write-Host "`n测试API端点..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/scoring/weight-schemes" -Method GET -TimeoutSec 5
    Write-Host "✅ API响应正常" -ForegroundColor Green
    Write-Host "返回数据:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 2
} catch {
    Write-Host "❌ API调用失败: $_" -ForegroundColor Red
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Cyan
