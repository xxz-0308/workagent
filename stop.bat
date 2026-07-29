@echo off
title WorkAgent Stopping...

echo.
echo  [WorkAgent] Stopping all services...
echo.

taskkill /fi "WindowTitle eq WorkAgent-Backend*" /f >nul 2>&1
taskkill /fi "WindowTitle eq WorkAgent-Frontend*" /f >nul 2>&1

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do (
    if not "%%a"=="0" taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
    if not "%%a"=="0" taskkill /pid %%a /f >nul 2>&1
)

echo  WorkAgent stopped successfully.
echo.
timeout /t 2 /nobreak >nul
