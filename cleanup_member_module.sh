#!/bin/bash

# Member Module Cleanup Script (Consolidation)
# Run from the project root

echo "==================================================="
echo "Member Module Cleanup Script (Consolidation)"
echo "==================================================="
echo

read -p "This will delete redundant files. Proceed? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

BASE_PATH="backend/src/main/java/com/waad/tba/modules/member"

echo "Deleting Controllers..."
rm -v "${BASE_PATH}/controller/UnifiedEligibilityController.java"
rm -v "${BASE_PATH}/controller/UnifiedSearchController.java"

echo "Deleting Services (Root Folder)..."
rm -v "${BASE_PATH}/service/UnifiedEligibilityService.java"
rm -v "${BASE_PATH}/service/UnifiedSearchService.java"
rm -v "${BASE_PATH}/service/NameSearchService.java"
rm -v "${BASE_PATH}/service/MemberExcelImportService.java"
rm -v "${BASE_PATH}/service/MemberImportPreviewService.java"
rm -v "${BASE_PATH}/service/MemberImportProcessingService.java"
rm -v "${BASE_PATH}/service/MemberImportMappingService.java"
rm -v "${BASE_PATH}/service/BarcodeGeneratorService.java"
rm -v "${BASE_PATH}/service/CardNumberGeneratorService.java"

echo "Deleting Implementations..."
rm -v "${BASE_PATH}/service/impl/BarcodeGeneratorServiceImpl.java"
rm -v "${BASE_PATH}/service/impl/CardNumberGeneratorServiceImpl.java"

echo
echo "==================================================="
echo "Cleanup Complete!"
echo "Please run 'mvn clean compile' to verify the build."
echo "==================================================="
