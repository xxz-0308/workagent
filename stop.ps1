# WorkAgent 停止脚本
# 用法：在项目根目录执行 .\stop.ps1

$pidFile = "$PSScriptRoot\.workagent.pids"

Write-Host ""
Write-Host "⏹  正在停止 WorkAgent..." -ForegroundColor Yellow

if (Test-Path $pidFile) {
    $pids = Get-Content $pidFile
    foreach ($pid in $pids) {
        $pid = $pid.Trim()
        if ($pid -ne "") {
            try {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-Process -Id $pid -Force
                    Write-Host "✅ 已终止进程 PID $pid ($($proc.ProcessName))" -ForegroundColor Green
                }
            } catch {
                # 进程已不存在，忽略
            }
        }
    }
    Remove-Item $pidFile -Force
} else {
    Write-Host "⚠️  未找到运行记录，尝试强制清理端口..." -ForegroundColor Yellow
}

# 清理 3001 和 5173 端口上的残留进程
foreach ($port in @(3001, 5173)) {
    $procs = netstat -ano | Select-String ":$port " | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique
    foreach ($p in $procs) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            try {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "✅ 清理端口 $port 上的进程 PID $p" -ForegroundColor Green
            } catch {}
        }
    }
}

# 清理日志
foreach ($log in @(".backend.log", ".backend.err", ".frontend.log", ".frontend.err")) {
    $f = "$PSScriptRoot\$log"
    if (Test-Path $f) { Remove-Item $f -Force }
}

Write-Host ""
Write-Host "✅ WorkAgent 已完全停止" -ForegroundColor Green
Write-Host ""
