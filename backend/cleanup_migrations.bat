@echo off
set "MIGRATION_DIR=src\main\resources\db\migration"
echo Cleaning up migrations in %MIGRATION_DIR%...

if exist "%MIGRATION_DIR%\V12__create_system_admin_tables.sql" (
    echo Deleting V12 redundant file...
    del /f /q "%MIGRATION_DIR%\V12__create_system_admin_tables.sql"
)

if exist "%MIGRATION_DIR%\V13__Fix_Approval_Requests.sql" (
    echo Deleting V13 redundant file...
    del /f /q "%MIGRATION_DIR%\V13__Fix_Approval_Requests.sql"
)

if exist "%MIGRATION_DIR%\V13__consolidated_fixes.sql" (
    echo Renaming V13 consolidated fixes...
    ren "%MIGRATION_DIR%\V13__consolidated_fixes.sql" "V13_2__consolidated_fixes.sql"
)

echo Cleanup complete.
dir "%MIGRATION_DIR%\V1*"
