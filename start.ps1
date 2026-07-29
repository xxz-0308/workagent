# WorkAgent 启动脚本
# 用法：在项目根目录执行 .\start.ps1

$HOST_DIR = $PSScriptRoot

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor DarkMagenta
Write-Host "║       WorkAgent 启动中...            ║" -ForegroundColor DarkMagenta
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor DarkMagenta
Write-Host ""

# 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未找到 Node.js，请先安装 Node.js >= 20" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green

# 检查依赖
if (-not (Test-Path "$HOST_DIR\node_modules")) {
    Write-Host "📦 正在安装依赖..." -ForegroundColor Yellow
    npm install --prefix $HOST_DIR
}

# 确保 data 目录存在
if (-not (Test-Path "$HOST_DIR\data")) {
    New-Item -ItemType Directory -Path "$HOST_DIR\data" | Out-Null
}

# 清理旧的 PID 文件
$pidFile = "$HOST_DIR\.workagent.pids"

Write-Host ""
Write-Host "🚀 启动后端服务 (http://localhost:3001)..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath "node" `
    -ArgumentList "$HOST_DIR\node_modules\.bin\tsx", "server/index.ts" `
    -WorkingDirectory $HOST_DIR `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$HOST_DIR\.backend.log" `
    -RedirectStandardError "$HOST_DIR\.backend.err"

Start-Sleep -Seconds 2

Write-Host "🌐 启动前端服务 (http://localhost:5173)..." -ForegroundColor Cyan
$frontendProcess = Start-Process -FilePath "node" `
    -ArgumentList "$HOST_DIR\node_modules\.bin\vite", "--port", "5173" `
    -WorkingDirectory $HOST_DIR `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$HOST_DIR\.frontend.log" `
    -RedirectStandardError "$HOST_DIR\.frontend.err"

# 保存 PID
"$($backendProcess.Id)`n$($frontendProcess.Id)" | Set-Content $pidFile

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        WorkAgent 已启动 ✅           ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  前端:  http://localhost:5173         ║" -ForegroundColor Green
Write-Host "║  后端:  http://localhost:3001         ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  停止:  .\stop.ps1                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# 打开浏览器
Start-Sleep -Seconds 1
Start-Process "http://localhost:5173"
