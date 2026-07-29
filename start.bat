@echo off
title WorkAgent Starting...

cd /d "%~dp0"

echo.
echo  [WorkAgent] Starting services...
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Please install Node.js 20+
    echo  Download: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo  First run - installing dependencies, please wait...
    call npm install
    if errorlevel 1 (
        echo  ERROR: npm install failed. Check your network connection.
        pause
        exit /b 1
    )
)

if not exist "data\" mkdir data

echo  Starting backend on http://localhost:3001 ...
start "WorkAgent-Backend" /min cmd /c "node node_modules\.bin\tsx server/index.ts"

timeout /t 2 /nobreak >nul

echo  Starting frontend on http://localhost:5173 ...
start "WorkAgent-Frontend" /min cmd /c "node node_modules\.bin\vite --port 5173"

timeout /t 3 /nobreak >nul

echo.
echo  ================================
echo   WorkAgent is running!
echo   URL: http://localhost:5173
echo   To stop: double-click stop.bat
echo  ================================
echo.

start "" "http://localhost:5173"

echo  Press any key to close this window (services keep running)...
pause >nul
