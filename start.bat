@echo off
title WorkAgent
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
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
)

if not exist "data\" mkdir data

echo  Starting backend  (http://localhost:3001) ...
start "WorkAgent-Backend" /d "%~dp0" cmd /k "npx tsx server/index.ts"

timeout /t 2 /nobreak >nul

echo  Starting frontend (http://localhost:5173) ...
start "WorkAgent-Frontend" /d "%~dp0" cmd /k "npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ================================
echo   WorkAgent is running!
echo   http://localhost:5173
echo   To stop: double-click stop.bat
echo  ================================
echo.

start "" "http://localhost:5173"

echo  You can close this window. Services keep running in those 2 windows.
timeout /t 3 /nobreak >nul
