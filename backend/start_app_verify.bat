@echo off
setlocal enabledelayedexpansion

set PORT=8080
echo [INFO] Checking for process on port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    set PID=%%a
    if "!PID!" neq "" (
        echo [INFO] Killing process !PID!...
        taskkill /F /PID !PID! >nul 2>&1
    )
)

echo [INFO] Starting Spring Boot Application...
call mvn spring-boot:run > app_startup.log 2>&1
echo [INFO] Application terminated.
endlocal
