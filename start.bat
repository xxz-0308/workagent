@echo off
cd /d "%~dp0"
if not exist "data\" mkdir data

REM Re-launch minimized if not already hidden
if not defined WORKAGENT_HIDDEN (
    set WORKAGENT_HIDDEN=1
    start "" /min "%~f0"
    exit /b
)

echo Starting WorkAgent...
echo Backend : http://localhost:3001
echo Frontend: http://localhost:5173

REM Start backend via PowerShell hidden
powershell -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'node_modules/tsx/dist/cli.mjs','server/index.ts' -WindowStyle Hidden"

REM Wait for backend
timeout /t 3 /nobreak >nul

REM Start frontend via PowerShell hidden
powershell -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'node_modules/vite/bin/vite.js','--port','5173' -WindowStyle Hidden"

REM Open browser
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

REM Self-close
exit
