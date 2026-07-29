@echo off
chcp 65001 >nul
title WorkAgent 停止服务
color 0C

echo.
echo ⏹  正在停止 WorkAgent 所有服务...
echo.

:: 终止所有相关进程
taskkill /fi "WindowTitle eq WorkAgent-Backend*" /f >nul 2>&1
taskkill /fi "WindowTitle eq WorkAgent-Frontend*" /f >nul 2>&1

:: 清理占用 3001 和 5173 端口的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do (
    taskkill /pid %%a /f >nul 2>&1
)

:: 清理日志
if exist ".backend.log" del /f ".backend.log" >nul 2>&1
if exist ".backend.err" del /f ".backend.err" >nul 2>&1
if exist ".frontend.log" del /f ".frontend.log" >nul 2>&1
if exist ".frontend.err" del /f ".frontend.err" >nul 2>&1

echo ✅ WorkAgent 已完全停止！
echo.
timeout /t 2 /nobreak >nul
