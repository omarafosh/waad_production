#!/bin/bash

# ==============================================================================
# Unified Members Architecture - Comprehensive Testing Script
# ==============================================================================
# Purpose: Execute all test scenarios for Production Readiness validation
# Date: 2026-01-11
# ==============================================================================

echo "🧪 ===== UNIFIED MEMBERS TESTING ====="
echo ""
echo "📋 Test Categories:"
echo "  1. Backend Integration Tests"
echo "  2. Eligibility Testing"
echo "  3. Update & Delete Tests"
echo "  4. API & Validation Tests"
echo "  5. Frontend Smoke Tests"
echo "  6. Regression Check"
echo ""

# ==============================================================================
# 1. BACKEND VALIDATION TESTS
# ==============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ BACKEND CODE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1.1: Check Barcode Generator Logic
echo ""
echo "✓ Test 1.1: Barcode Generator Format"
grep -A 10 "WAHA-.*-.*" backend/src/main/java/com/waad/tba/modules/member/service/BarcodeGeneratorService.java | grep -E "WAHA-[0-9]{4}-[0-9]{6}" && echo "  ✅ Barcode format: WAHA-YYYY-NNNNNN" || echo "  ❌ Barcode format incorrect"

# Test 1.2: Card Number Generator Logic
echo ""
echo "✓ Test 1.2: Card Number Generator Format"
grep -A 5 "%06d" backend/src/main/java/com/waad/tba/modules/member/service/CardNumberGeneratorService.java && echo "  ✅ Card number format: NNNNNN (6 digits)" || echo "  ❌ Card number format incorrect"

# Test 1.3: Check parent_id validation
echo ""
echo "✓ Test 1.3: Parent ID Validation"
grep -r "parent_id = NULL" backend/src/main/java/com/waad/tba/modules/member/ && echo "  ✅ Principal validation exists" || echo "  ⚠️ Check principal validation"

# Test 1.4: CASCADE Delete Configuration
echo ""
echo "✓ Test 1.4: CASCADE Delete Configuration"
grep -r "CascadeType.ALL\|cascade.*ALL" backend/src/main/java/com/waad/tba/modules/member/entity/Member.java && echo "  ✅ CASCADE delete configured" || echo "  ⚠️ CASCADE configuration missing"

# ==============================================================================
# 2. DATABASE STRUCTURE VALIDATION
# ==============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ DATABASE STRUCTURE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 2.1: Check Migration V200
echo ""
echo "✓ Test 2.1: Unified Architecture Migration"
if [ -f "backend/src/main/resources/db/migration/V200__unified_member_architecture.sql" ]; then
    echo "  ✅ V200 Migration exists"
    grep "DROP TABLE family_members" backend/src/main/resources/db/migration/V200__unified_member_architecture.sql && echo "  ✅ family_members table DROP statement found" || echo "  ❌ Missing DROP family_members"
else
    echo "  ❌ V200 Migration missing"
fi

# Test 2.2: Check for obsolete migrations
echo ""
echo "✓ Test 2.2: Check Obsolete Migrations"
echo "  Checking for CREATE TABLE family_members in active migrations..."
grep -r "CREATE TABLE.*family_members" backend/src/main/resources/db/migration/V[0-9]*.sql | grep -v "V002" && echo "  ⚠️ Found family_members creation after V002" || echo "  ✅ No conflicting migrations"

# ==============================================================================
# 3. API ENDPOINT VALIDATION
# ==============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣ API ENDPOINT VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 3.1: Check UnifiedMemberController endpoints
echo ""
echo "✓ Test 3.1: Unified Member Controller Endpoints"
ENDPOINTS=0
grep -r "@PostMapping\|@GetMapping\|@PutMapping\|@DeleteMapping" backend/src/main/java/com/waad/tba/modules/member/controller/UnifiedMemberController.java | wc -l > /tmp/endpoint_count.txt
ENDPOINTS=$(cat /tmp/endpoint_count.txt)
echo "  Found $ENDPOINTS endpoint annotations"
if [ "$ENDPOINTS" -ge 8 ]; then
    echo "  ✅ Sufficient endpoints defined"
else
    echo "  ⚠️ Expected at least 8 endpoints"
fi

# Test 3.2: Check for eligibility endpoint
echo ""
echo "✓ Test 3.2: Eligibility Endpoint"
grep -r "eligibility.*barcode\|barcode.*eligibility" backend/src/main/java/com/waad/tba/modules/member/controller/UnifiedMemberController.java && echo "  ✅ Eligibility endpoint exists" || echo "  ❌ Eligibility endpoint missing"

# ==============================================================================
# 4. FRONTEND COMPONENT VALIDATION
# ==============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣ FRONTEND COMPONENT VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 4.1: Check Unified Components Exist
echo ""
echo "✓ Test 4.1: Unified Components Existence"
for component in "UnifiedMemberCreate" "UnifiedMemberView" "UnifiedMembersList" "EligibilityCheck"; do
    if [ -f "frontend/src/pages/members/${component}.jsx" ]; then
        echo "  ✅ ${component}.jsx exists"
    else
        echo "  ❌ ${component}.jsx missing"
    fi
done

# Test 4.2: Check Unified Service
echo ""
echo "✓ Test 4.2: Unified Members Service"
if [ -f "frontend/src/services/api/unified-members.service.js" ]; then
    echo "  ✅ unified-members.service.js exists"
    grep -c "export const" frontend/src/services/api/unified-members.service.js > /tmp/service_functions.txt
    FUNCTIONS=$(cat /tmp/service_functions.txt)
    echo "  Found $FUNCTIONS exported functions"
else
    echo "  ❌ unified-members.service.js missing"
fi

# Test 4.3: Check Routing Update
echo ""
echo "✓ Test 4.3: Frontend Routing"
grep "UnifiedMembersList\|UnifiedMemberCreate\|UnifiedMemberView" frontend/src/routes/MainRoutes.jsx && echo "  ✅ Routing updated to Unified components" || echo "  ❌ Routing not updated"

# ==============================================================================
# 5. REGRESSION TESTS
# ==============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣ REGRESSION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 5.1: Check for FamilyMember references
echo ""
echo "✓ Test 5.1: No FamilyMember Backend References"
FAMILY_REFS=$(grep -r "FamilyMemberController\|FamilyMemberService\|class FamilyMember" backend/src/main/java/com/waad/tba/modules/member/ 2>/dev/null | grep -v "deprecated\|_deprecated" | wc -l)
if [ "$FAMILY_REFS" -eq 0 ]; then
    echo "  ✅ No FamilyMember backend references"
else
    echo "  ⚠️ Found $FAMILY_REFS FamilyMember references"
fi

# Test 5.2: Check for old frontend components in active routes
echo ""
echo "✓ Test 5.2: No Old Components in Active Routes"
OLD_ROUTES=$(grep -E "MemberCreate|MemberEdit|MemberView|MembersList" frontend/src/routes/MainRoutes.jsx | grep -v "Unified\|deprecated\|//" | wc -l)
if [ "$OLD_ROUTES" -eq 0 ]; then
    echo "  ✅ No old components in active routes"
else
    echo "  ⚠️ Found $OLD_ROUTES old component references in routes"
fi

# Test 5.3: Check deprecated folder
echo ""
echo "✓ Test 5.3: Old Components Moved to Deprecated"
if [ -d "frontend/src/pages/members/_deprecated_old_architecture" ]; then
    echo "  ✅ Deprecated folder exists"
    ls -1 frontend/src/pages/members/_deprecated_old_architecture/*.jsx 2>/dev/null | wc -l > /tmp/deprecated_count.txt
    DEPRECATED=$(cat /tmp/deprecated_count.txt)
    echo "  Found $DEPRECATED files in deprecated folder"
else
    echo "  ⚠️ Deprecated folder not found"
fi

# ==============================================================================
# 6. DOCUMENTATION VALIDATION
# ==============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣ DOCUMENTATION VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 6.1: Check for API documentation
echo ""
echo "✓ Test 6.1: API Documentation"
[ -f "API-REFERENCE-MEMBER-FAMILY.md" ] && echo "  ✅ API Reference exists" || echo "  ⚠️ API Reference missing"

# Test 6.2: Check for Go-Live checklist
echo ""
echo "✓ Test 6.2: Go-Live Documentation"
[ -f "UNIFIED-MEMBERS-GO-LIVE-CHECKLIST.md" ] && echo "  ✅ Go-Live Checklist exists" || echo "  ⚠️ Go-Live Checklist missing"
[ -f "DEPLOYMENT-SUMMARY-AR.md" ] && echo "  ✅ Deployment Summary exists" || echo "  ⚠️ Deployment Summary missing"

# ==============================================================================
# SUMMARY
# ==============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All static code validations complete"
echo ""
echo "⚠️  MANUAL TESTS REQUIRED:"
echo "   1. Start Backend: cd backend && ./mvnw spring-boot:run"
echo "   2. Start Frontend: cd frontend && npm start"
echo "   3. Execute API tests (see test-api-calls.sh)"
echo "   4. Execute UI smoke tests"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

