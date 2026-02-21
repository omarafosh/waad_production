@echo off
taskkill /F /IM java.exe /T
timeout /t 2
rmdir /s /q "target"
del /f /q "src\main\resources\db\migration\V12__create_system_admin_tables.sql"
del /f /q "src\main\resources\db\migration\V13__Fix_Approval_Requests.sql"
move /y "src\main\resources\db\migration\V13__consolidated_fixes.sql" "src\main\resources\db\migration\V13_2__consolidated_fixes.sql"
echo DONE
