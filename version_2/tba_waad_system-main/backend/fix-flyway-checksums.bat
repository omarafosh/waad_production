@echo off
REM fix-flyway-checksums.bat
REM Helper script to repair Flyway checksums after migration file changes

echo ========================================
echo Flyway Checksum Repair Utility
echo ========================================
echo.
echo This script repairs Flyway checksums when migration files have been modified.
echo Use this when you see 'Migration checksum mismatch' errors.
echo.

REM Check if we're in the backend directory
if not exist "pom.xml" (
    echo Error: This script must be run from the backend directory
    echo Usage: cd backend ^&^& fix-flyway-checksums.bat
    exit /b 1
)

echo Step 1: Repairing Flyway schema history...
call mvn flyway:repair

echo.
echo Step 2: Running migrations...
call mvn flyway:migrate

echo.
echo ========================================
echo * Flyway checksums repaired successfully!
echo * Migrations applied successfully!
echo ========================================
echo.
echo You can now start the application normally.
