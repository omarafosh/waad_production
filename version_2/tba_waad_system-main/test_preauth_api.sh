#!/bin/bash

echo "========================================="
echo "🧪 اختبار API الموافقات المسبقة"
echo "========================================="
echo ""

# التحقق من أن Backend يعمل
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/login -X POST -H "Content-Type: application/json" -d '{}')
if [ "$HTTP_CODE" != "400" ] && [ "$HTTP_CODE" != "500" ]; then
    echo "❌ Backend غير متصل (HTTP: $HTTP_CODE). قم بتشغيله أولاً: ./start-backend.sh"
    exit 1
fi

echo "✅ Backend متصل"
echo ""

# Test 1: Get all pre-authorizations
echo "📊 Test 1: GET /api/pre-authorizations (الجدول الرئيسي)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "http://localhost:8080/api/pre-authorizations?page=0&size=5" \
  -H "Content-Type: application/json" || echo "{}")

# Check if response contains data
if echo "$RESPONSE" | grep -q "totalElements"; then
    TOTAL=$(echo "$RESPONSE" | grep -o '"totalElements":[0-9]*' | grep -o '[0-9]*')
    echo "✅ إجمالي السجلات: $TOTAL"
    
    # Count PENDING
    PENDING_COUNT=$(echo "$RESPONSE" | grep -o '"status":"PENDING"' | wc -l)
    echo "📌 عدد PENDING في النتائج: $PENDING_COUNT"
    
    # Show sample
    echo ""
    echo "عينة من البيانات:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE"
else
    echo "❌ فشل الاستدعاء أو لا توجد بيانات"
    echo "الاستجابة: $RESPONSE"
fi

echo ""
echo ""

# Test 2: Get pending inbox
echo "📥 Test 2: GET /api/pre-authorizations/inbox/pending (صندوق الوارد)"
echo "----------------------------------------"
RESPONSE2=$(curl -s -X GET "http://localhost:8080/api/pre-authorizations/inbox/pending?page=0&size=5" \
  -H "Content-Type: application/json" || echo "{}")

if echo "$RESPONSE2" | grep -q "totalElements"; then
    TOTAL2=$(echo "$RESPONSE2" | grep -o '"totalElements":[0-9]*' | grep -o '[0-9]*')
    echo "✅ إجمالي PENDING: $TOTAL2"
    
    echo ""
    echo "عينة من البيانات:"
    echo "$RESPONSE2" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE2"
else
    echo "❌ فشل الاستدعاء أو لا توجد بيانات"
    echo "الاستجابة: $RESPONSE2"
fi

echo ""
echo "========================================="
echo "✅ الاختبار اكتمل"
echo "========================================="
