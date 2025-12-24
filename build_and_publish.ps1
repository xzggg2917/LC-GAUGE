# LC GAUGE - Build and Publish Script

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  LC GAUGE - Build and Publish" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Load .env file for Token
if (Test-Path ".env") {
    Write-Host "[1/5] Loading environment variables..." -ForegroundColor Yellow
    $envContent = Get-Content .env
    foreach ($line in $envContent) {
        if ($line -match "GH_TOKEN=(.+)") {
            $env:GH_TOKEN = $matches[1]
            Write-Host "OK GH_TOKEN loaded" -ForegroundColor Green
        }
    }
}
else {
    Write-Host "ERROR: .env file not found" -ForegroundColor Red
    exit 1
}

# 2. Set Electron mirror
Write-Host "[2/5] Setting Electron mirror..." -ForegroundColor Yellow
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
Write-Host "OK Using Taobao mirror" -ForegroundColor Green
Write-Host ""

# 3. Clean old files
Write-Host "[3/5] Cleaning old build files..." -ForegroundColor Yellow
if (Test-Path "dist-final") {
    Remove-Item -Path "dist-final" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "OK Cleaned dist-final directory" -ForegroundColor Green
}
Write-Host ""

# 4. Build frontend
Write-Host "[4/5] Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "OK Frontend build successful" -ForegroundColor Green
Write-Host ""

# 5. Package and publish to GitHub
Write-Host "[5/5] Packaging Electron and publishing to GitHub..." -ForegroundColor Yellow
Write-Host "This may take several minutes, please wait..." -ForegroundColor Cyan
Write-Host ""

# Set verbose output for debugging
$env:DEBUG = "electron-builder"

# Execute build and publish
npx electron-builder --win --publish always

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  SUCCESS - Published!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    
    # Show build artifacts
    Write-Host "Build artifacts:" -ForegroundColor Cyan
    Get-ChildItem "dist-final" -Filter "*.exe" | ForEach-Object {
        $sizeMB = [math]::Round($_.Length/1MB, 2)
        Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor White
    }
    
    # Check for latest.yml
    if (Test-Path "dist-final\latest.yml") {
        Write-Host "  - latest.yml (auto-update config) OK" -ForegroundColor Green
    }
    Write-Host ""
    
    Write-Host "Visit GitHub Releases:" -ForegroundColor Cyan
    Write-Host "https://github.com/xzggg2917/LC-GAUGE/releases" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "  FAILED - Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. Network connection" -ForegroundColor White
    Write-Host "2. GH_TOKEN is valid" -ForegroundColor White
    Write-Host "3. GitHub repository is public" -ForegroundColor White
    Write-Host "4. Sufficient disk space" -ForegroundColor White
    Write-Host ""
    
    # Show local build artifacts if any
    if (Test-Path "dist-final") {
        Write-Host "Local build artifacts:" -ForegroundColor Cyan
        Get-ChildItem "dist-final" -Filter "*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
            $sizeMB = [math]::Round($_.Length/1MB, 2)
            Write-Host "  OK $($_.Name) ($sizeMB MB)" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "Although publishing failed, local build is available." -ForegroundColor Yellow
        Write-Host "You can manually upload to GitHub Releases." -ForegroundColor Yellow
    }
    Write-Host ""
    exit 1
}
