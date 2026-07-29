@echo off
chcp 65001 >nul
title WorkAgent 启动中...
color 0A

echo.
echo ╔══════════════════════════════════════╗
echo ║       WorkAgent 启动中...            ║
echo ╚══════════════════════════════════════╝
echo.

:: 切换到脚本所在目录
cd /d "%~dp0"

:: 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Node.js！请先安装 Node.js 20 或以上版本
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 安装依赖（如果 node_modules 不存在）
if not exist "node_modules\" (
    echo 📦 首次运行，正在安装依赖（可能需要几分钟）...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
)

:: 创建 data 目录
if not exist "data\" mkdir data

:: 启动后端（隐藏窗口，后台运行）
echo 🚀 启动后端服务 (http://localhost:3001)...
start "WorkAgent-Backend" /min cmd /c "node node_modules\.bin\tsx server/index.ts > .backend.log 2>&1"

:: 等待后端启动
timeout /t 2 /nobreak >nul

:: 启动前端（隐藏窗口，后台运行）
echo 🌐 启动前端服务 (http://localhost:5173)...
start "WorkAgent-Frontend" /min cmd /c "node node_modules\.bin\vite --port 5173 > .frontend.log 2>&1"

:: 等待前端启动
timeout /t 3 /nobreak >nul

echo.
echo ╔══════════════════════════════════════╗
echo ║        WorkAgent 已启动 ✅           ║
echo ╠══════════════════════════════════════╣
echo ║  前端:  http://localhost:5173         ║
echo ║  后端:  http://localhost:3001         ║
echo ╠══════════════════════════════════════╣
echo ║  停止服务: 双击 stop.bat             ║
echo ╚══════════════════════════════════════╝
echo.

:: 自动打开浏览器
start "" "http://localhost:5173"

echo 按任意键关闭此窗口（服务继续在后台运行）...
pause >nul
