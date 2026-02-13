@echo off
echo Running verification test for V9018...
call mvn test -Dtest=RefreshTokenServiceTest > test_out_verification_v9018.txt 2>&1
echo Done.
