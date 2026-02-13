@echo off
echo Running verification test for V9019...
call mvn test -Dtest=RefreshTokenServiceTest > test_out_verification_v9019.txt 2>&1
echo Done.
