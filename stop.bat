@echo off
cd /d "%~dp0"
echo Stopping WorkAgent...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do (
    if not "%%a"=="0" taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
    if not "%%a"=="0" taskkill /pid %%a /f >nul 2>&1
)

if exist ".backend.log" del /f ".backend.log" >nul 2>&1
if exist ".frontend.log" del /f ".frontend.log" >nul 2>&1
if exist ".backend.pid" del /f ".backend.pid" >nul 2>&1
if exist ".frontend.pid" del /f ".frontend.pid" >nul 2>&1

echo WorkAgent stopped.
timeout /t 2 /nobreak >nul
exit
