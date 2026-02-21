@echo off
chcp 65001
REM ====================================================================
REM TBA-WAAD System - سكريبت تشغيل صفحة الهبوط
REM ====================================================================

echo ========================================
echo تشغيل TBA-WAAD Landing Page
echo ========================================
echo.

cd /d "%~dp0landing-page"

echo [1/2] التحقق من Node.js...
call node --version
if errorlevel 1 (
    echo خطأ: Node.js غير مثبت!
    echo يرجى تثبيت Node.js من: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [2/2] تشغيل خادم صفحة الهبوط...
echo.
echo سيتم فتح المتصفح على: http://localhost:3030
echo.
echo اضغط Ctrl+C لإيقاف الخادم
echo.

REM تشغيل serve على المنفذ 3030
call npx -y serve . -p 3030

pause
