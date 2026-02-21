@echo off
chcp 65001
REM ====================================================================
REM TBA-WAAD System - سكريبت تشغيل Frontend
REM ====================================================================

echo ========================================
echo تشغيل TBA-WAAD Frontend
echo ========================================
echo.

cd /d "%~dp0frontend"

echo [1/3] التحقق من Node.js...
call node --version
if errorlevel 1 (
    echo خطأ: Node.js غير مثبت!
    echo يرجى تثبيت Node.js من: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [2/3] تثبيت Dependencies (إذا لزم الأمر)...
if not exist "node_modules" (
    echo تثبيت packages...
    call npm install
    if errorlevel 1 (
        echo فشل تثبيت packages!
        pause
        exit /b 1
    )
) else (
    echo Dependencies مثبتة مسبقاً
)

echo.
echo [3/3] تشغيل Dev Server...
echo.
echo سيتم فتح المتصفح على: http://localhost:3000
echo.
call npm start

pause
