@echo off
title WorkAgent Launcher
cd /d "%~dp0"
if not exist "data\" mkdir data

echo.
echo  ====================================
echo    WorkAgent Services Starting...
echo  ====================================
echo.

start "WorkAgent-Backend" node node_modules/tsx/dist/cli.mjs server/index.ts
start "WorkAgent-Frontend" node node_modules/vite/bin/vite.js --port 5173

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
