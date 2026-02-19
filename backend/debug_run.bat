echo [DEBUG START] %date% %time% > debug_output.txt
call mvn spring-boot:run -Dspring-boot.run.profiles=dev >> debug_output.txt 2>&1
echo [DEBUG END] %date% %time% >> debug_output.txt
