@echo off
set PGPASSWORD=12345
set PGUSER=postgres
set PGBIN=C:\Program Files\PostgreSQL\16\bin

echo [DEBUG] Checking account_transactions.created_by type...
"%PGBIN%\psql.exe" -U %PGUSER% -h localhost -d tba_waad_system -t -c "SELECT data_type FROM information_schema.columns WHERE table_name = 'account_transactions' AND column_name = 'created_by';"

echo.
echo [DEBUG] Checking Flyway Schema History...
"%PGBIN%\psql.exe" -U %PGUSER% -h localhost -d tba_waad_system -c "select version, description, success from flyway_schema_history order by version desc limit 5;"
