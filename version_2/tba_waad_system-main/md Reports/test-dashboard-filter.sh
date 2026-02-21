#!/bin/bash
# Dashboard Employer Filter - API Testing Script
# ===============================================

echo "🧪 اختبار Dashboard Employer Filter APIs"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL
BASE_URL="http://localhost:8080/api/dashboard"

echo "📡 Testing Backend API..."
echo ""

# Test 1: Summary without filter
echo "${YELLOW}1️⃣  Testing /dashboard/summary (جميع الشركاء)${NC}"
RESPONSE=$(curl -s "${BASE_URL}/summary")
if [ -n "$RESPONSE" ]; then
    echo "   ✅ Response received"
    echo "$RESPONSE" | jq -r '.data | "   📊 Total Members: \(.totalMembers), Active: \(.activeMembers), Claims: \(.totalClaims)"' 2>/dev/null || echo "$RESPONSE"
else
    echo "   ${RED}❌ No response - Backend not running?${NC}"
fi
echo ""

# Test 2: Summary with filter
echo "${YELLOW}2️⃣  Testing /dashboard/summary?employerId=1 (شريك محدد)${NC}"
RESPONSE=$(curl -s "${BASE_URL}/summary?employerId=1")
if [ -n "$RESPONSE" ]; then
    echo "   ✅ Response received"
    echo "$RESPONSE" | jq -r '.data | "   📊 Total Members: \(.totalMembers), Active: \(.activeMembers), Claims: \(.totalClaims)"' 2>/dev/null || echo "$RESPONSE"
else
    echo "   ${RED}❌ No response${NC}"
fi
echo ""

# Test 3: Monthly trends without filter
echo "${YELLOW}3️⃣  Testing /dashboard/monthly-trends?months=3 (جميع الشركاء)${NC}"
RESPONSE=$(curl -s "${BASE_URL}/monthly-trends?months=3")
if [ -n "$RESPONSE" ]; then
    echo "   ✅ Response received"
    COUNT=$(echo "$RESPONSE" | jq -r '.data | length' 2>/dev/null)
    echo "   📈 Trends count: $COUNT"
else
    echo "   ${RED}❌ No response${NC}"
fi
echo ""

# Test 4: Monthly trends with filter
echo "${YELLOW}4️⃣  Testing /dashboard/monthly-trends?months=3&employerId=1 (شريك محدد)${NC}"
RESPONSE=$(curl -s "${BASE_URL}/monthly-trends?months=3&employerId=1")
if [ -n "$RESPONSE" ]; then
    echo "   ✅ Response received"
    COUNT=$(echo "$RESPONSE" | jq -r '.data | length' 2>/dev/null)
    echo "   📈 Trends count: $COUNT"
else
    echo "   ${RED}❌ No response${NC}"
fi
echo ""

echo "========================================"
echo "✅ Testing completed!"
echo ""
echo "📝 Notes:"
echo "   - If backend is not running: cd backend && mvn spring-boot:run"
echo "   - If no data: Check database has organizations with type=EMPLOYER"
echo "   - Frontend: http://localhost:3000/dashboard"
