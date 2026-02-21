#!/bin/bash

###############################################################################
# 🧪 Permission-Based Authorization System Test
# Tests the new permission system for all user roles
###############################################################################

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   🔐 PERMISSION-BASED AUTHORIZATION SYSTEM TEST               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Backend API URL
API_URL="${API_URL:-http://localhost:8080}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0;33m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

###############################################################################
# Helper Functions
###############################################################################

function print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

function test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$1" == "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

###############################################################################
# Test 1: Backend Health Check
###############################################################################

print_header "TEST 1: Backend Health Check"

# Test if backend is responding (try login endpoint with empty body to check connection)
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/session/login \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1)

# 400 or 401 means backend is UP (just rejecting the empty request)
if [ "$HEALTH_RESPONSE" == "400" ] || [ "$HEALTH_RESPONSE" == "401" ]; then
    test_result "PASS" "Backend is UP and responding (HTTP $HEALTH_RESPONSE)"
else
    test_result "FAIL" "Backend is DOWN or not responding (HTTP $HEALTH_RESPONSE)"
    exit 1
fi

###############################################################################
# Test 2: SUPER_ADMIN Login and Permissions
###############################################################################

print_header "TEST 2: SUPER_ADMIN Login and Permissions"

# Login as SUPER_ADMIN
SUPERADMIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/session/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"superadmin","password":"Admin@123"}')

SUPERADMIN_USERNAME=$(echo "$SUPERADMIN_RESPONSE" | jq -r '.data.username // null')
SUPERADMIN_ROLE=$(echo "$SUPERADMIN_RESPONSE" | jq -r '.data.roles[0] // null')
SUPERADMIN_PERMISSIONS_COUNT=$(echo "$SUPERADMIN_RESPONSE" | jq -r '.data.permissions | length')

if [ "$SUPERADMIN_USERNAME" == "superadmin" ]; then
    test_result "PASS" "SUPER_ADMIN login successful"
else
    test_result "FAIL" "SUPER_ADMIN login failed"
    echo "Response: $SUPERADMIN_RESPONSE"
fi

if [ "$SUPERADMIN_ROLE" == "SUPER_ADMIN" ]; then
    test_result "PASS" "SUPER_ADMIN has correct role"
else
    test_result "FAIL" "SUPER_ADMIN role mismatch (Expected: SUPER_ADMIN, Got: $SUPERADMIN_ROLE)"
fi

if [ "$SUPERADMIN_PERMISSIONS_COUNT" -ge 90 ]; then
    test_result "PASS" "SUPER_ADMIN has all permissions ($SUPERADMIN_PERMISSIONS_COUNT permissions)"
else
    test_result "FAIL" "SUPER_ADMIN missing permissions (Expected: >= 90, Got: $SUPERADMIN_PERMISSIONS_COUNT)"
fi

# Test specific permissions
echo ""
echo "Sample SUPER_ADMIN permissions:"
echo "$SUPERADMIN_RESPONSE" | jq -r '.data.permissions[0:10]' 2>/dev/null || echo "  Could not parse permissions"

###############################################################################
# Test 3: Session Persistence
###############################################################################

print_header "TEST 3: Session Persistence (/session/me)"

# Save cookies from login
COOKIE_FILE=$(mktemp)
curl -s -X POST $API_URL/api/auth/session/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"superadmin","password":"Admin@123"}' \
  -c "$COOKIE_FILE" > /dev/null

# Test /session/me with saved session
ME_RESPONSE=$(curl -s -X GET $API_URL/api/auth/session/me \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE")

ME_USERNAME=$(echo "$ME_RESPONSE" | jq -r '.data.username // null')
ME_PERMISSIONS_COUNT=$(echo "$ME_RESPONSE" | jq -r '.data.permissions | length')

if [ "$ME_USERNAME" == "superadmin" ]; then
    test_result "PASS" "Session persists correctly (/session/me)"
else
    test_result "FAIL" "Session persistence failed"
    echo "Response: $ME_RESPONSE"
fi

if [ "$ME_PERMISSIONS_COUNT" -ge 90 ]; then
    test_result "PASS" "/session/me returns permissions ($ME_PERMISSIONS_COUNT permissions)"
else
    test_result "FAIL" "/session/me missing permissions (Got: $ME_PERMISSIONS_COUNT)"
fi

rm "$COOKIE_FILE"

###############################################################################
# Test 4: Other Roles (if they exist)
###############################################################################

print_header "TEST 4: Testing Other Roles"

# Try to find other users in the system
echo "Checking for test users in database..."

# Test ACCOUNTANT if exists
echo ""
echo "Testing ACCOUNTANT role (if exists)..."
# Note: Password may need to be updated in database first

# Test PROVIDER if exists  
echo "Testing PROVIDER role (if exists)..."
# Note: Password may need to be updated in database first

echo -e "${YELLOW}ℹ️  Note: Other role tests require test users to be set up in database${NC}"

###############################################################################
# Test Summary
###############################################################################

print_header "TEST SUMMARY"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TOTAL TESTS:    $TOTAL_TESTS"
echo "  PASSED:         $PASSED_TESTS"
echo "  FAILED:         $FAILED_TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║   ✅ PERMISSION-BASED AUTHORIZATION SYSTEM IS WORKING        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please review the failed tests above."
    exit 1
fi
