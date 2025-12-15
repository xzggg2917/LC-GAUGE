# 实时更新功能诊断脚本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " 实时更新功能诊断工具" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查后端进程
Write-Host "1. 检查后端进程..." -ForegroundColor Yellow
$pythonProcesses = Get-Process -Name python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "   ✅ 找到 $($pythonProcesses.Count) 个Python进程" -ForegroundColor Green
    $pythonProcesses | Select-Object Id, ProcessName, Path | Format-Table
} else {
    Write-Host "   ❌ 未找到Python进程，请启动后端服务!" -ForegroundColor Red
    Write-Host "      运行: python backend/main.py" -ForegroundColor Yellow
}
Write-Host ""

# 2. 检查端口8000
Write-Host "2. 检查端口 8000..." -ForegroundColor Yellow
$port8000 = netstat -ano | Select-String ":8000"
if ($port8000) {
    Write-Host "   ✅ 端口 8000 正在监听" -ForegroundColor Green
    $port8000 | ForEach-Object { Write-Host "      $_" }
} else {
    Write-Host "   ❌ 端口 8000 未监听，后端可能未启动!" -ForegroundColor Red
}
Write-Host ""

# 3. 测试后端API
Write-Host "3. 测试后端API响应..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/scoring/weight-schemes" -Method Get -TimeoutSec 5
    if ($response.success) {
        Write-Host "   ✅ 后端API响应正常" -ForegroundColor Green
        Write-Host "      可用的权重方案:" -ForegroundColor Cyan
        $response.data.PSObject.Properties | ForEach-Object {
            Write-Host "        - $($_.Name): $($_.Value.Count) 个方案" -ForegroundColor White
        }
    } else {
        Write-Host "   ⚠️ API响应但返回失败: $($response.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ 无法连接到后端API" -ForegroundColor Red
    Write-Host "      错误: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 4. 检查应用数据文件
Write-Host "4. 检查应用数据文件..." -ForegroundColor Yellow
$appDataPath = "$env:APPDATA\hplc-green-chemistry-app\app_data.json"
if (Test-Path $appDataPath) {
    $fileSize = (Get-Item $appDataPath).Length
    Write-Host "   ✅ 找到应用数据文件" -ForegroundColor Green
    Write-Host "      路径: $appDataPath" -ForegroundColor Cyan
    Write-Host "      大小: $fileSize 字节" -ForegroundColor Cyan
    
    # 读取并解析JSON
    try {
        $appData = Get-Content $appDataPath -Raw | ConvertFrom-Json
        
        # 检查关键数据
        $hasGradient = $null -ne $appData.hplc_gradient
        $hasFactors = ($null -ne $appData.hplc_factors_data) -and ($appData.hplc_factors_data.Count -gt 0)
        $hasMethods = $null -ne $appData.hplc_methods_raw
        $hasScores = $null -ne $appData.hplc_score_results
        
        Write-Host "      数据完整性检查:" -ForegroundColor Cyan
        if ($hasGradient) {
            Write-Host "        ✅ 梯度数据 (hplc_gradient)" -ForegroundColor Green
        } else {
            Write-Host "        ❌ 缺少梯度数据 - 请在 HPLC Gradient 页面配置!" -ForegroundColor Red
        }
        
        if ($hasFactors) {
            Write-Host "        ✅ 因子数据 (hplc_factors_data) - $($appData.hplc_factors_data.Count) 条记录" -ForegroundColor Green
        } else {
            Write-Host "        ❌ 缺少因子数据 - 请在 Factors 页面导入!" -ForegroundColor Red
        }
        
        if ($hasMethods) {
            Write-Host "        ✅ 方法数据 (hplc_methods_raw)" -ForegroundColor Green
            if ($appData.hplc_methods_raw.preTreatmentReagents) {
                Write-Host "           前处理试剂: $($appData.hplc_methods_raw.preTreatmentReagents.Count) 个" -ForegroundColor White
            }
            if ($appData.hplc_methods_raw.mobilePhaseA) {
                Write-Host "           流动相A: $($appData.hplc_methods_raw.mobilePhaseA.Count) 个试剂" -ForegroundColor White
            }
            if ($appData.hplc_methods_raw.mobilePhaseB) {
                Write-Host "           流动相B: $($appData.hplc_methods_raw.mobilePhaseB.Count) 个试剂" -ForegroundColor White
            }
            Write-Host "           仪器能耗: $($appData.hplc_methods_raw.instrumentEnergy) kWh" -ForegroundColor White
            Write-Host "           前处理能耗: $($appData.hplc_methods_raw.pretreatmentEnergy) kWh" -ForegroundColor White
        } else {
            Write-Host "        ⚠️ 方法数据为空" -ForegroundColor Yellow
        }
        
        if ($hasScores) {
            Write-Host "        ✅ 评分结果 (hplc_score_results)" -ForegroundColor Green
            if ($appData.hplc_score_results.final) {
                Write-Host "           Score₃: $($appData.hplc_score_results.final.score3)" -ForegroundColor White
            }
        } else {
            Write-Host "        ⚠️ 暂无评分结果 - 首次计算后会生成" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "      实时更新必要条件:" -ForegroundColor Cyan
        if ($hasGradient -and $hasFactors) {
            Write-Host "        ✅✅✅ 所有必要数据完整，实时更新应该工作!" -ForegroundColor Green
        } else {
            Write-Host "        ❌ 缺少必要数据，实时更新不会触发" -ForegroundColor Red
            if (-not $hasGradient) {
                Write-Host "           → 请先在 HPLC Gradient 页面配置梯度程序" -ForegroundColor Yellow
            }
            if (-not $hasFactors) {
                Write-Host "           → 请先在 Factors 页面导入因子数据(Excel)" -ForegroundColor Yellow
            }
        }
        
    } catch {
        Write-Host "      ⚠️ 无法解析数据文件: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️ 未找到应用数据文件(首次运行正常)" -ForegroundColor Yellow
    Write-Host "      预期路径: $appDataPath" -ForegroundColor Cyan
}
Write-Host ""

# 5. 检查前端进程
Write-Host "5. 检查前端进程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ 找到 $($nodeProcesses.Count) 个Node.js进程 (Electron/Vite)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ 未找到Node.js进程" -ForegroundColor Yellow
    Write-Host "      如果应用未启动，运行: npm run electron:dev" -ForegroundColor Cyan
}
Write-Host ""

# 最终评估
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " 诊断结果汇总" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$allGood = $true

if (-not $pythonProcesses) {
    Write-Host "❌ 后端未运行" -ForegroundColor Red
    $allGood = $false
}

if (-not $port8000) {
    Write-Host "❌ 后端端口未监听" -ForegroundColor Red
    $allGood = $false
}

if ($allGood) {
    Write-Host "✅ 所有系统组件正常运行" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 可以开始测试实时更新功能了!" -ForegroundColor Green
    Write-Host ""
    Write-Host "测试步骤:" -ForegroundColor Cyan
    Write-Host "  1. 打开 Methods 页面" -ForegroundColor White
    Write-Host "  2. 打开 Electron DevTools (F12 或 Ctrl+Shift+I)" -ForegroundColor White
    Write-Host "  3. 修改任意数值(如 Instrument Energy)" -ForegroundColor White
    Write-Host "  4. 等待 1-2 秒，观察 DevTools Console 输出" -ForegroundColor White
    Write-Host "  5. 切换到 Graph 或其他Results页面" -ForegroundColor White
    Write-Host "  6. 验证数据是否更新" -ForegroundColor White
    Write-Host ""
    Write-Host "详细测试指南: 查看 REALTIME_UPDATE_TEST.md" -ForegroundColor Yellow
} else {
    Write-Host "⚠️ 发现问题，请先修复上述错误" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
