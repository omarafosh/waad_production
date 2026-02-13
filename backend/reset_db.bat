@echo off
echo ==========================================
echo TBA-WAAD Database Reset Tool
echo ==========================================
echo.
echo This script will DELETE the existing database 'tba_waad_system'
echo and create a fresh one.
echo.
echo WARNING: All data will be lost!
echo.
pause

set PGPASSWORD=12345
set PGUSER=postgres
set PGBIN=C:\Program Files\PostgreSQL\16\bin

echo.
echo [1/2] Dropping Database...
"%PGBIN%\psql.exe" -U %PGUSER% -h localhost -c "DROP DATABASE IF EXISTS tba_waad_system;"

echo.
echo [2/2] Creating Database...
"%PGBIN%\psql.exe" -U %PGUSER% -h localhost -c "CREATE DATABASE tba_waad_system;"

echo.
echo Done! You can now start the backend application.
echo.
pause
