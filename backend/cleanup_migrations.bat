@echo off
cd /d "d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration"
del "V900116__create_lifecycle_logs.sql"
del "V9005__create_lifecycle_logs.sql"
ren "V9005__coverage_priority_config.sql" "V9034__coverage_priority_config.sql"
dir > d:\Backend\cleanup_verify.txt
