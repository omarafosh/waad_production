@echo off
echo [DEBUG START] %DATE% %TIME% > debug_output.txt
call mvn clean spring-boot:run >> debug_output.txt 2>&1
