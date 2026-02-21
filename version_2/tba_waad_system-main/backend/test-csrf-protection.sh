#!/bin/bash
# =====================================================
# CSRF Protection Verification Script
# =====================================================
# Purpose: Verify SameSite=Strict cookie is properly configured
# Phase 1 - Critical Fix C4: CSRF Protection
# Date: 2026-02-10
#
# USAGE:
#   chmod +x test-csrf-protection.sh
#   ./test-csrf-protection.sh
#
# EXPECTED RESULTS:
#   ✅ Set-Cookie header contains: SameSite=Strict
#   ✅ Set-Cookie header contains: HttpOnly
#   ✅ Session cookie name is: JSESSIONID
#
# If any check fails, review CookieConfig.java configuration
# =====================================================

echo "🔍 CSRF Protection Verification (SameSite=Strict Cookie Test)"
echo "=============================================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:8080}"
LOGIN_ENDPOINT="$API_URL/api/v1/auth/login"

echo "📍 Testing endpoint: $LOGIN_ENDPOINT"
echo ""

# Step 1: Attempt login to trigger session cookie creation
echo "Step 1: Sending login request to trigger session cookie..."
echo ""

RESPONSE=$(curl -v -X POST "$LOGIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"wrong-password"}' \
  2>&1)

# Extract Set-Cookie header
SET_COOKIE=$(echo "$RESPONSE" | grep -i "Set-Cookie: JSESSIONID" | head -1)

if [ -z "$SET_COOKIE" ]; then
    echo "❌ FAILED: No JSESSIONID cookie found in response"
    echo ""
    echo "This might mean:"
    echo "  1. Backend server is not running"
    echo "  2. Login endpoint path is incorrect"
    echo "  3. Session management is disabled"
    echo ""
    echo "Response headers:"
    echo "$RESPONSE" | grep -i "^< " | head -20
    exit 1
fi

echo "✅ Session cookie found!"
echo ""
echo "📋 Cookie details:"
echo "$SET_COOKIE"
echo ""

# Step 2: Verify SameSite=Strict
echo "Step 2: Checking SameSite attribute..."
if echo "$SET_COOKIE" | grep -qi "SameSite=Strict"; then
    echo "✅ PASS: SameSite=Strict is set"
else
    echo "❌ FAIL: SameSite=Strict is NOT set"
    echo "   Current value: $(echo "$SET_COOKIE" | grep -o 'SameSite=[^;]*')"
    echo "   Expected: SameSite=Strict"
fi
echo ""

# Step 3: Verify HttpOnly
echo "Step 3: Checking HttpOnly attribute..."
if echo "$SET_COOKIE" | grep -qi "HttpOnly"; then
    echo "✅ PASS: HttpOnly is set (XSS protection)"
else
    echo "❌ FAIL: HttpOnly is NOT set"
    echo "   Cookie is vulnerable to XSS attacks!"
fi
echo ""

# Step 4: Verify cookie name
echo "Step 4: Checking cookie name..."
if echo "$SET_COOKIE" | grep -qi "JSESSIONID"; then
    echo "✅ PASS: Cookie name is JSESSIONID"
else
    echo "⚠️  WARNING: Cookie name is not JSESSIONID"
    echo "   Actual name: $(echo "$SET_COOKIE" | grep -o '^Set-Cookie: [^=]*' | cut -d' ' -f2)"
fi
echo ""

# Step 5: Check Secure flag (production only)
echo "Step 5: Checking Secure attribute (HTTPS-only)..."
if echo "$SET_COOKIE" | grep -qi "; Secure"; then
    echo "✅ PASS: Secure flag is set (HTTPS-only)"
    echo "   This is REQUIRED for production (SESSION_COOKIE_SECURE=true)"
else
    echo "⚠️  INFO: Secure flag is NOT set"
    echo "   This is OK for local development (HTTP)"
    echo "   PRODUCTION: Must set SESSION_COOKIE_SECURE=true"
fi
echo ""

# Step 6: Check Max-Age
echo "Step 6: Checking Max-Age (session timeout)..."
MAX_AGE=$(echo "$SET_COOKIE" | grep -o 'Max-Age=[0-9]*' | cut -d= -f2)
if [ -n "$MAX_AGE" ]; then
    MINUTES=$((MAX_AGE / 60))
    echo "✅ PASS: Max-Age is set to $MAX_AGE seconds ($MINUTES minutes)"
    if [ "$MAX_AGE" -eq 1800 ]; then
        echo "   Matches expected 30 minutes (1800 seconds)"
    else
        echo "   Expected: 1800 seconds (30 minutes)"
        echo "   Actual: $MAX_AGE seconds ($MINUTES minutes)"
    fi
else
    echo "⚠️  WARNING: Max-Age not set (cookie may persist until browser closes)"
fi
echo ""

# Summary
echo "=============================================================="
echo "📊 VERIFICATION SUMMARY"
echo "=============================================================="
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

if echo "$SET_COOKIE" | grep -qi "SameSite=Strict"; then
    echo "✅ SameSite=Strict: PASS"
    ((CHECKS_PASSED++))
else
    echo "❌ SameSite=Strict: FAIL"
    ((CHECKS_FAILED++))
fi

if echo "$SET_COOKIE" | grep -qi "HttpOnly"; then
    echo "✅ HttpOnly: PASS"
    ((CHECKS_PASSED++))
else
    echo "❌ HttpOnly: FAIL"
    ((CHECKS_FAILED++))
fi

if echo "$SET_COOKIE" | grep -qi "JSESSIONID"; then
    echo "✅ Cookie Name: PASS"
    ((CHECKS_PASSED++))
else
    echo "❌ Cookie Name: FAIL"
    ((CHECKS_FAILED++))
fi

echo ""
echo "Checks Passed: $CHECKS_PASSED"
echo "Checks Failed: $CHECKS_FAILED"
echo ""

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo "🎉 SUCCESS: CSRF protection is properly configured!"
    echo ""
    echo "Next steps:"
    echo "  1. Run integration tests (concurrent request simulation)"
    echo "  2. Test cross-site form POST attack (should fail)"
    echo "  3. Verify production deployment with Secure=true"
    exit 0
else
    echo "⚠️  FAILED: Cookie configuration needs attention"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check CookieConfig.java is loaded (debug logs)"
    echo "  2. Verify Spring Boot version >= 3.0 (supports DefaultCookieSerializerCustomizer)"
    echo "  3. Check application.yml session.cookie settings"
    echo "  4. Restart backend server and try again"
    exit 1
fi
