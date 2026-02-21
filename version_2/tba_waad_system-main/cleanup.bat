@echo off
REM ====================================================================
REM TBA-WAAD System - تنظيف الملفات الزائدة
REM ====================================================================
REM هذا السكريبت يحذف:
REM - جميع التقارير القديمة (100+ ملف)
REM - ملفات Docker
REM - ملفات PostgreSQL
REM - مجلد report
REM ====================================================================

echo ========================================
echo تنظيف مشروع TBA-WAAD
echo ========================================
echo.
echo سيتم حذف:
echo - 100+ ملف تقرير قديم
echo - ملفات Docker
echo - ملفات PostgreSQL
echo - مجلد report
echo.
echo هل أنت متأكد؟ (اضغط أي زر للمتابعة أو Ctrl+C للإلغاء)
pause

cd /d "%~dp0"

echo.
echo [1/5] حذف التقارير القديمة...
del /Q *REPORT*.md 2>nul
del /Q *PHASE*.md 2>nul
del /Q COMPREHENSIVE*.md 2>nul
del /Q DOCUMENTATION_INDEX.md 2>nul
del /Q QUICKSTART_GUIDE.md 2>nul
del /Q QUICK_START.md 2>nul
del /Q TBA_ARCHITECTURE*.md 2>nul
del /Q *IMPLEMENTATION*.md 2>nul
del /Q *QUICKSTART*.md 2>nul
del /Q *SUMMARY*.md 2>nul
del /Q *COMPLETION*.md 2>nul
del /Q *PROGRESS*.md 2>nul
del /Q *MODULE*.md 2>nul
del /Q *GUIDE*.md 2>nul
del /Q *TEST*.md 2>nul
del /Q *FIX*.md 2>nul
del /Q *SYNC*.md 2>nul
del /Q *CLEANUP*.md 2>nul
del /Q *MODERNIZATION*.md 2>nul
del /Q *MIGRATION*.md 2>nul
del /Q *HARDENING*.md 2>nul
del /Q *ROUTING*.md 2>nul
del /Q *NORMALIZATION*.md 2>nul
del /Q *VERIFICATION*.md 2>nul
del /Q *ANALYSIS*.md 2>nul
del /Q *INTEGRATION*.md 2>nul
del /Q *SWEEP*.md 2>nul
del /Q *FOUNDATION*.md 2>nul
del /Q *MENU*.md 2>nul
del /Q *DEFENSE*.md 2>nul
del /Q *SECURITY*.md 2>nul
del /Q *ADMINISTRATION*.md 2>nul
del /Q *SETTINGS*.md 2>nul
del /Q *FLOW*.md 2>nul
del /Q *NETWORK*.md 2>nul
del /Q *APPROVALS*.md 2>nul
del /Q *POLICIES*.md 2>nul
del /Q *CONTRACT*.md 2>nul
del /Q *PREAUTH*.md 2>nul
del /Q *PROVIDERS*.md 2>nul
del /Q *VISITS*.md 2>nul
del /Q *MEMBERS*.md 2>nul
del /Q *EMPLOYERS*.md 2>nul
del /Q *CLAIMS*.md 2>nul
del /Q *BENEFIT*.md 2>nul
del /Q *INSURANCE*.md 2>nul
del /Q *REVIEWER*.md 2>nul
del /Q *MEDICAL*.md 2>nul
del /Q *CATEGORIES*.md 2>nul
del /Q *SERVICES*.md 2>nul
del /Q *PACKAGES*.md 2>nul
del /Q *DASHBOARD*.md 2>nul
del /Q *BACKEND*.md 2>nul
del /Q *FRONTEND*.md 2>nul
del /Q *FULLSTACK*.md 2>nul
del /Q *EMPLOYER*.md 2>nul
del /Q *MEMBER*.md 2>nul
del /Q *CLAIM*.md 2>nul
del /Q *COMPANY*.md 2>nul
del /Q *ARCHITECTURE*.md 2>nul
del /Q *ENTITY*.md 2>nul
del /Q *UNIFICATION*.md 2>nul
del /Q *STATUS*.md 2>nul
del /Q *RBAC*.md 2>nul
del /Q *AUTH*.md 2>nul
del /Q *ENTERPRISE*.md 2>nul
del /Q *CSRF*.md 2>nul
del /Q *SESSION*.md 2>nul
del /Q *SMOKE*.md 2>nul
del /Q *SYSTEM*.md 2>nul
del /Q *UI*.md 2>nul
del /Q *DETAILED*.md 2>nul
del /Q *AMBIGUOUS*.md 2>nul
del /Q *MAPPING*.md 2>nul
del /Q *RESOLUTION*.md 2>nul
del /Q *REPAIR*.md 2>nul
del /Q *DIAGNOSIS*.md 2>nul
del /Q *AUDIT*.md 2>nul
del /Q *TECHNICAL*.md 2>nul
del /Q *COMPLETE*.md 2>nul
del /Q *OFFICIAL*.md 2>nul
del /Q *ENTITIES*.md 2>nul
del /Q *README*.md 2>nul
del /Q *MULTI*.md 2>nul
del /Q *DATA*.md 2>nul
del /Q *ACCESS*.md 2>nul
del /Q *CONTROL*.md 2>nul
del /Q *PERMISSION*.md 2>nul
del /Q *FILTERING*.md 2>nul
del /Q *LOG*.md 2>nul
del /Q *FEATURE*.md 2>nul
del /Q *TOGGLES*.md 2>nul
del /Q *RECOVERY*.md 2>nul
del /Q *NAVIGATION*.md 2>nul
del /Q *I18N*.md 2>nul
del /Q *SAFE*.md 2>nul
del /Q *CLEAN*.md 2>nul
del /Q *CRUD*.md 2>nul
del /Q *API*.md 2>nul
del /Q *SERVICE*.md 2>nul
del /Q *DOMAIN*.md 2>nul
del /Q *TPA*.md 2>nul
del /Q *SUPER*.md 2>nul
del /Q *PHASE1*.md 2>nul
del /Q *PHASE2*.md 2>nul
del /Q *OLD*.md 2>nul
del /Q *FINAL*.md 2>nul
del /Q *SUCCESS*.md 2>nul
del /Q *MANTIS*.md 2>nul

echo تم حذف التقارير القديمة ✓

echo.
echo [2/5] حذف ملفات Docker...
del /Q docker-compose.yml 2>nul
del /Q docker-compose-mysql.yml 2>nul
echo تم حذف ملفات Docker ✓

echo.
echo [3/5] حذف ملفات PostgreSQL...
del /Q setup_database.sql 2>nul
del /Q start-backend.bat 2>nul
if exist "backend\database\seed_rbac_postgresql.sql" (
    del /Q "backend\database\seed_rbac_postgresql.sql" 2>nul
)
echo تم حذف ملفات PostgreSQL ✓

echo.
echo [4/5] حذف مجلد report...
if exist "report" (
    rmdir /S /Q "report" 2>nul
)
echo تم حذف مجلد report ✓

echo.
echo [5/5] حذف ملفات اختبار...
del /Q test-*.sh 2>nul
echo تم حذف ملفات الاختبار ✓

echo.
echo ========================================
echo تم التنظيف بنجاح! ✓
echo ========================================
echo.
echo الملفات المتبقية:
echo - start-backend-mysql.bat (تشغيل Backend)
echo - start-frontend.bat (تشغيل Frontend)
echo - setup_database_mysql.sql (إعداد قاعدة البيانات)
echo - INSTALLATION_GUIDE_AR.md (دليل التثبيت)
echo - backend/ (كود Backend)
echo - frontend/ (كود Frontend)
echo.
pause
