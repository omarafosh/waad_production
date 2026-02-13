@echo off
echo [BUILD START] %date% %time% > build_output.txt
call mvn clean compile -DskipTests >> build_output.txt 2>&1
echo [BUILD END] %date% %time% >> build_output.txt
