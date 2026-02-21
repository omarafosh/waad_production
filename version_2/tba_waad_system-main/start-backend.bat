@echo off
echo Setting console code page to UTF-8...
chcp 65001

echo Setting JAVA_TOOL_OPTIONS to force UTF-8 file encoding...
set JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8

echo Starting Backend...
cd backend
call mvn spring-boot:run
pause