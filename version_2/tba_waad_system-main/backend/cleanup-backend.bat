@echo off
chcp 65001
REM ====================================================================
REM تنظيف مجلد Backend من الملفات الزائدة
REM ====================================================================

cd /d "%~dp0"

echo ========================================
echo تنظيف مجلد Backend
echo ========================================
echo.
echo سيتم حذف:
echo - 17 ملف توثيق قديم
echo - 19 ملف shell script
echo - ملفات اختبار وتقارير
echo.
pause

echo.
echo [1/4] حذف ملفات التوثيق القديمة...
del /Q BACKEND_README.md 2>nul
del /Q DOMAIN_MODEL_COMPLETION_REPORT.md 2>nul
del /Q MEMBERS_COMPLETION_REPORT.md 2>nul
del /Q MIGRATION_SCRIPTS_AUDIT_REPORT.md 2>nul
del /Q MODULAR_ARCHITECTURE.md 2>nul
del /Q OTP_PASSWORD_RESET_IMPLEMENTATION.md 2>nul
del /Q PHASE_B4_COMPLETION_REPORT.md 2>nul
del /Q PHASE_B4_SUMMARY.md 2>nul
del /Q QUICKSTART.md 2>nul
del /Q RBAC_IMPLEMENTATION.md 2>nul
del /Q RBAC_IMPLEMENTATION_COMPLETE.md 2>nul
del /Q RBAC_QUICKSTART.md 2>nul
del /Q README.md 2>nul
del /Q SWAGGER_OPENAPI_FIX_REPORT.md 2>nul
del /Q SWAGGER_QUICKSTART.md 2>nul
del /Q V11_FIXES_SUMMARY.md 2>nul
del /Q V8_2_FIXES_SUMMARY.md 2>nul
del /Q BUILD_SUCCESS_REPORT.txt 2>nul
echo تم ✓

echo.
echo [2/4] حذف Shell Scripts...
del /Q *.sh 2>nul
echo تم ✓

echo.
echo [3/4] حذف ملفات الاختبار...
del /Q test-*.http 2>nul
del /Q nohup.out 2>nul
del /Q package-lock.json 2>nul
echo تم ✓

echo.
echo [4/4] الملفات المتبقية...
echo ✓ pom.xml (ضروري)
echo ✓ lombok.config (ضروري)
echo ✓ .gitignore (ضروري)
echo ✓ src/ (الكود الأساسي)
echo ✓ database/ (قاعدة البيانات)
echo.

echo ========================================
echo تم التنظيف بنجاح! ✓
echo ========================================
pause
