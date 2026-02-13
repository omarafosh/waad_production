@echo off
echo Running Lifecycle Integration Test... > lifecycle_test_output.txt
call mvn test -Dtest=LifecycleIntegrationTest >> lifecycle_test_output.txt 2>&1
echo Done. >> lifecycle_test_output.txt
