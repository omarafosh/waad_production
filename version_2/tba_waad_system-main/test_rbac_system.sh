#!/bin/bash

###############################################################################
# 🧪 RBAC System Test Script
# Professional Permission-Based Access Control Testing
# 
# Version: 3.0
# Date: 2026-01-29
###############################################################################

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   🔐 RBAC System Comprehensive Test Suite                    ║"
echo "║   Professional Permission-Based Access Control                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Backend API URL
API_URL="${API_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

function login_user() {
    local username=$1
    local password=$2
    
    echo "🔑 Logging in as: $username"
    
    RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"identifier\": \"$username\", \"password\": \"$password\"}")
    
    # Extract token from response
    TOKEN=$(echo "$RESPONSE" | jq -r '.data.token // empty')
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
        echo "❌ Login failed for $username"
        echo "   Response: $(echo $RESPONSE | jq -r '.message // .errorCode')"
        return 1
    fi
    
    # Save token for subsequent requests
    echo "$TOKEN" > /tmp/auth_token.txt
    
    echo "✅ Login successful - Token: ${TOKEN:0:30}..."
    
    # Extract user data from response
    USER_DATA=$(echo "$RESPONSE" | jq -r '.data.user')
    USER_ROLES=$(echo "$USER_DATA" | jq -r '.roles[]' 2>/dev/null | tr '\n' ',')
    
    echo "   Roles: ${USER_ROLES:-N/A}"
    
    return 0
}

function test_api_access() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    
    # Read token from file
    TOKEN=$(cat /tmp/auth_token.txt 2>/dev/null || echo "")
    
    RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "$API_URL$endpoint" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$RESPONSE_CODE" == "$expected_status" ]; then
        test_result "PASS" "$description (Expected: $expected_status, Got: $RESPONSE_CODE)"
    else
        test_result "FAIL" "$description (Expected: $expected_status, Got: $RESPONSE_CODE)"
    fi
}

function test_menu_visibility() {
    local menu_id=$1
    local should_be_visible=$2
    local description=$3
    
    # This would require parsing frontend menu
    # For now, we check via API endpoints
    echo "   📋 Menu Test: $description"
}

###############################################################################
# Test Scenario 1: SUPER_ADMIN
###############################################################################

function test_super_admin() {
    print_header "🔓 Test Scenario 1: SUPER_ADMIN (Full Access)"
    
    login_user "admin" "Admin@123"
    
    test_api_access "/api/admin/users" "200" "SUPER_ADMIN can access user management"
    test_api_access "/api/admin/roles" "200" "SUPER_ADMIN can access role management"
    test_api_access "/api/members" "200" "SUPER_ADMIN can access members"
    test_api_access "/api/employers" "200" "SUPER_ADMIN can access employers"
    test_api_access "/api/providers" "200" "SUPER_ADMIN can access providers"
    test_api_access "/api/claims" "200" "SUPER_ADMIN can access claims"
    test_api_access "/api/pre-authorizations" "200" "SUPER_ADMIN can access pre-authorizations"
    
    rm -f cookies.txt
}

###############################################################################
# Test Scenario 2: PARTNER_MANAGER (Limited View)
###############################################################################

function test_partner_manager() {
    print_header "👔 Test Scenario 2: PARTNER_MANAGER (Read-Only View)"
    
    # Create test user if not exists
    echo "📝 Setting up PARTNER_MANAGER test user..."
    
    login_user "admin" "Admin@123"
    
    # Create PARTNER_MANAGER role if not exists
    curl -s -X POST "$API_URL/api/admin/roles" \
        -H "Content-Type: application/json" \
        -b cookies.txt \
        -d '{
            "name": "PARTNER_MANAGER",
            "description": "مدير الشريك - عرض فقط"
        }' > /dev/null
    
    # Assign permissions
    ROLE_ID=$(curl -s "$API_URL/api/admin/roles" -b cookies.txt | jq -r '.data[] | select(.name=="PARTNER_MANAGER") | .id')
    
    curl -s -X POST "$API_URL/api/admin/roles/$ROLE_ID/permissions" \
        -H "Content-Type: application/json" \
        -b cookies.txt \
        -d '{
            "permissionIds": ["VIEW_MEMBERS", "VIEW_VISITS", "VIEW_CLAIMS", "VIEW_REPORTS"]
        }' > /dev/null
    
    rm -f cookies.txt
    
    # Test with partner manager
    login_user "partner.manager" "Admin@123"
    
    # Should have access to:
    test_api_access "/api/members" "200" "PARTNER_MANAGER can view members"
    test_api_access "/api/visits" "200" "PARTNER_MANAGER can view visits"
    test_api_access "/api/claims" "200" "PARTNER_MANAGER can view claims"
    test_api_access "/api/reports/claims" "200" "PARTNER_MANAGER can view reports"
    
    # Should NOT have access to:
    test_api_access "/api/admin/users" "403" "PARTNER_MANAGER cannot access RBAC"
    test_api_access "/api/employers" "403" "PARTNER_MANAGER cannot manage employers"
    test_api_access "/api/providers" "403" "PARTNER_MANAGER cannot manage providers"
    test_api_access "/api/claims/settlement" "403" "PARTNER_MANAGER cannot access settlements"
    
    rm -f cookies.txt
}

###############################################################################
# Test Scenario 3: MEDICAL_REVIEWER
###############################################################################

function test_medical_reviewer() {
    print_header "🩺 Test Scenario 3: MEDICAL_REVIEWER (Review Only)"
    
    login_user "admin" "Admin@123"
    
    # Create MEDICAL_REVIEWER role
    curl -s -X POST "$API_URL/api/admin/roles" \
        -H "Content-Type: application/json" \
        -b cookies.txt \
        -d '{
            "name": "MEDICAL_REVIEWER",
            "description": "المراجع الطبي - مراجعة المطالبات فقط"
        }' > /dev/null
    
    ROLE_ID=$(curl -s "$API_URL/api/admin/roles" -b cookies.txt | jq -r '.data[] | select(.name=="MEDICAL_REVIEWER") | .id')
    
    curl -s -X POST "$API_URL/api/admin/roles/$ROLE_ID/permissions" \
        -H "Content-Type: application/json" \
        -b cookies.txt \
        -d '{
            "permissionIds": [
                "VIEW_CLAIMS", "APPROVE_CLAIMS", "REJECT_CLAIMS",
                "VIEW_PRE_AUTH", "APPROVE_PRE_AUTH", "REJECT_PRE_AUTH",
                "VIEW_MEDICAL_SERVICES", "VIEW_REPORTS"
            ]
        }' > /dev/null
    
    rm -f cookies.txt
    
    login_user "medical.reviewer" "Admin@123"
    
    # Should have access to:
    test_api_access "/api/claims" "200" "MEDICAL_REVIEWER can view claims"
    test_api_access "/api/pre-authorizations" "200" "MEDICAL_REVIEWER can view pre-auth"
    test_api_access "/api/medical-services" "200" "MEDICAL_REVIEWER can view medical services"
    
    # Should NOT have access to:
    test_api_access "/api/members" "403" "MEDICAL_REVIEWER cannot access members"
    test_api_access "/api/visits" "403" "MEDICAL_REVIEWER cannot access visits"
    test_api_access "/api/employers" "403" "MEDICAL_REVIEWER cannot access employers"
    test_api_access "/api/claims/settlement" "403" "MEDICAL_REVIEWER cannot access settlements"
    test_api_access "/api/admin/users" "403" "MEDICAL_REVIEWER cannot access RBAC"
    
    rm -f cookies.txt
}

###############################################################################
# Test Scenario 4: ACCOUNTANT
###############################################################################

function test_accountant() {
    print_header "💰 Test Scenario 4: ACCOUNTANT (Financial Only)"
    
    login_user "admin" "Admin@123"
    
    # Create ACCOUNTANT role
    curl -s -X POST "$API_URL/api/admin/roles" \
        -H "Content-Type: application/json" \
        -b cookies.txt \
        -d '{
            "name": "ACCOUNTANT",
            "description": "المحاسب - التسويات والتقارير المالية"
        }' > /dev/null
    
    ROLE_ID=$(curl -s "$API_URL/api/admin/roles" -b cookies.txt | jq -r '.data[] | select(.name=="ACCOUNTANT") | .id')
    
    curl -s -X POST "$API_URL/api/admin/roles/$ROLE_ID/permissions" \
        -H "Content-Type: application/json" \
        -b cookies.txt \
        -d '{
            "permissionIds": [
                "VIEW_CLAIMS", "SETTLE_CLAIMS",
                "VIEW_PROVIDERS", "VIEW_PROVIDER_CONTRACTS",
                "VIEW_EMPLOYERS",
                "VIEW_REPORTS", "MANAGE_REPORTS"
            ]
        }' > /dev/null
    
    rm -f cookies.txt
    
    login_user "accountant" "Admin@123"
    
    # Should have access to:
    test_api_access "/api/claims" "200" "ACCOUNTANT can view claims"
    test_api_access "/api/claims/settlement" "200" "ACCOUNTANT can access settlements"
    test_api_access "/api/providers" "200" "ACCOUNTANT can view providers"
    test_api_access "/api/employers" "200" "ACCOUNTANT can view employers"
    test_api_access "/api/reports/financial" "200" "ACCOUNTANT can view financial reports"
    
    # Should NOT have access to:
    test_api_access "/api/members" "403" "ACCOUNTANT cannot access members"
    test_api_access "/api/visits" "403" "ACCOUNTANT cannot access visits"
    test_api_access "/api/pre-authorizations" "403" "ACCOUNTANT cannot access pre-auth"
    test_api_access "/api/admin/users" "403" "ACCOUNTANT cannot access RBAC"
    
    rm -f cookies.txt
}

###############################################################################
# Test Scenario 5: PROVIDER
###############################################################################

function test_provider() {
    print_header "🏥 Test Scenario 5: PROVIDER (Visit-Centric Only)"
    
    login_user "provider.user" "Admin@123"
    
    # Should have access to:
    test_api_access "/api/members/search" "200" "PROVIDER can search members (eligibility)"
    test_api_access "/api/visits" "200" "PROVIDER can manage visits"
    
    # Should NOT have access to:
    test_api_access "/api/members" "403" "PROVIDER cannot list all members"
    test_api_access "/api/employers" "403" "PROVIDER cannot access employers"
    test_api_access "/api/providers" "403" "PROVIDER cannot access provider management"
    test_api_access "/api/claims/settlement" "403" "PROVIDER cannot access settlements"
    test_api_access "/api/admin/users" "403" "PROVIDER cannot access RBAC"
    test_api_access "/api/reports" "403" "PROVIDER cannot access reports"
    
    rm -f cookies.txt
}

###############################################################################
# Frontend Menu Tests
###############################################################################

function test_frontend_menu() {
    print_header "📋 Frontend Menu Visibility Tests"
    
    echo "ℹ️  These tests require manual verification in the browser:"
    echo ""
    echo "1. Open browser to: $FRONTEND_URL"
    echo "2. Login with each user type"
    echo "3. Verify menu visibility matches documentation"
    echo ""
    echo "Expected Menu for each role:"
    echo ""
    echo "PARTNER_MANAGER:"
    echo "  ✅ لوحة المعلومات"
    echo "  ✅ المؤمن عليهم (قراءة فقط)"
    echo "  ✅ الزيارات (قراءة فقط)"
    echo "  ✅ المطالبات (قراءة فقط)"
    echo "  ✅ التقارير"
    echo "  ❌ الشركاء، مقدمو الخدمة، RBAC، الإعدادات"
    echo ""
    echo "MEDICAL_REVIEWER:"
    echo "  ✅ لوحة المعلومات"
    echo "  ✅ وارد المطالبات"
    echo "  ✅ وارد الموافقات المسبقة"
    echo "  ✅ لوحة الموافقات الموحدة"
    echo "  ✅ التقارير"
    echo "  ❌ المؤمن عليهم، الزيارات، الشركاء، التسويات، RBAC"
    echo ""
    echo "ACCOUNTANT:"
    echo "  ✅ لوحة المعلومات"
    echo "  ✅ صندوق التسويات المالية"
    echo "  ✅ مقدمو الخدمة (للاطلاع)"
    echo "  ✅ الشركاء (للفوترة)"
    echo "  ✅ التقارير المالية"
    echo "  ❌ وارد المطالبات، المراجعة الطبية، المؤمن عليهم، الزيارات"
    echo ""
}

###############################################################################
# Database Verification
###############################################################################

function verify_database() {
    print_header "🗄️  Database Verification"
    
    echo "📊 Checking permissions in database..."
    
    # This requires database access
    # For demonstration, we assume PostgreSQL
    
    if command -v psql &> /dev/null; then
        echo "✅ PostgreSQL client found"
        
        # Check if permissions exist
        PERM_COUNT=$(psql -U postgres -d tba_waad_system -t -c "SELECT COUNT(*) FROM permissions;" 2>/dev/null | xargs)
        
        if [ ! -z "$PERM_COUNT" ]; then
            echo "✅ Found $PERM_COUNT permissions in database"
            
            # List all permissions
            echo ""
            echo "📋 All Permissions:"
            psql -U postgres -d tba_waad_system -c "SELECT name, description FROM permissions ORDER BY name;" 2>/dev/null
        else
            echo "⚠️  Could not query database (check credentials)"
        fi
    else
        echo "⚠️  PostgreSQL client not found - skipping database verification"
    fi
}

###############################################################################
# Main Execution
###############################################################################

function main() {
    echo "🚀 Starting RBAC Test Suite..."
    echo "   Backend: $API_URL"
    echo "   Frontend: $FRONTEND_URL"
    echo ""
    
    # Run all tests
    test_super_admin
    test_partner_manager
    test_medical_reviewer
    test_accountant
    test_provider
    test_frontend_menu
    verify_database
    
    # Print summary
    print_header "📊 Test Summary"
    echo ""
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅ ALL TESTS PASSED! 🎉               ║${NC}"
        echo -e "${GREEN}║  System is ready for production       ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "${RED}╔════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ❌ SOME TESTS FAILED                  ║${NC}"
        echo -e "${RED}║  Please review and fix issues          ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════╝${NC}"
        exit 1
    fi
}

# Run main function
main
