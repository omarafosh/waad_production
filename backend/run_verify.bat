@echo off
echo Running verification test...
call mvn test -Dtest=RefreshTokenServiceTest > test_out_ver.txt 2>&1
echo Done.
