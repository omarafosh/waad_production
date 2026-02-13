@echo off
chcp 65001
REM ====================================================================
REM تنظيف مجلد Frontend من الملفات الزائدة
REM ====================================================================

cd /d "%~dp0"

echo ========================================
echo تنظيف مجلد Frontend
echo ========================================
echo.
echo سيتم حذف:
echo - 5 ملفات توثيق قديمة
echo - 2 ملف shell script
echo - مجلد scripts
echo.
pause

echo.
echo [1/3] حذف ملفات التوثيق القديمة...
del /Q EMPLOYERS_MODULE_COMPLETE.md 2>nul
del /Q PHASE_2_COMPLETION_SUMMARY.md 2>nul
del /Q PHASE_G_PROGRESS_REPORT.md 2>nul
del /Q PHASE_G_QUICKSTART.md 2>nul
del /Q REFACTOR_PROGRESS_REPORT.md 2>nul
echo تم ✓

echo.
echo [2/3] حذف Shell Scripts...
del /Q *.sh 2>nul
if exist "scripts" (
    rmdir /S /Q "scripts" 2>nul
)
echo تم ✓

echo.
echo [3/3] الملفات المتبقية...
echo ✓ package.json (ضروري)
echo ✓ package-lock.json (ضروري)
echo ✓ vite.config.mjs (ضروري)
echo ✓ index.html (ضروري)
echo ✓ .env (ضروري)
echo ✓ src/ (الكود الأساسي)
echo.

echo ========================================
echo تم التنظيف بنجاح! ✓
echo ========================================
pause
