@echo off
echo ===================================================
echo Member Module Cleanup Script (Consolidation)
echo ===================================================
echo.
echo This script will delete redundant and deprecated files 
echo following the module consolidation refactoring.
echo.
pause

set BASE_PATH=backend\src\main\java\com\waad\tba\modules\member

echo Deleting Controllers...
del /f "%BASE_PATH%\controller\UnifiedEligibilityController.java"
del /f "%BASE_PATH%\controller\UnifiedSearchController.java"

echo Deleting Services (Root Folder)...
del /f "%BASE_PATH%\service\UnifiedEligibilityService.java"
del /f "%BASE_PATH%\service\UnifiedSearchService.java"
del /f "%BASE_PATH%\service\NameSearchService.java"
del /f "%BASE_PATH%\service\MemberExcelImportService.java"
del /f "%BASE_PATH%\service\MemberImportPreviewService.java"
del /f "%BASE_PATH%\service\MemberImportProcessingService.java"
del /f "%BASE_PATH%\service\MemberImportMappingService.java"
del /f "%BASE_PATH%\service\BarcodeGeneratorService.java"
del /f "%BASE_PATH%\service\CardNumberGeneratorService.java"

echo Deleting Implementations...
del /f "%BASE_PATH%\service\impl\BarcodeGeneratorServiceImpl.java"
del /f "%BASE_PATH%\service\impl\CardNumberGeneratorServiceImpl.java"

echo.
echo ===================================================
echo Cleanup Complete!
echo Please run 'mvn clean compile' to verify the build.
echo ===================================================
pause
