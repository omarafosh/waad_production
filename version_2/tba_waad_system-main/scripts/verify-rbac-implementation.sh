#!/bin/bash

###############################################################################
# 🔍 RBAC Implementation Verification Script
# التحقق من تطبيق نظام RBAC في المشروع
#
# الاستخدام:
#   ./scripts/verify-rbac-implementation.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Print header
print_header() {
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo -e "${BLUE}$1${NC}"
    echo "════════════════════════════════════════════════════════════"
    echo ""
}

# Print check result
print_check() {
    local status=$1
    local message=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            ;;
    esac
}

# Check file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        print_check "PASS" "$description موجود"
        return 0
    else
        print_check "FAIL" "$description غير موجود: $file"
        return 1
    fi
}

# Check pattern in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if [ ! -f "$file" ]; then
        print_check "FAIL" "الملف غير موجود: $file"
        return 1
    fi
    
    if grep -q "$pattern" "$file"; then
        print_check "PASS" "$description"
        return 0
    else
        print_check "FAIL" "$description - النمط غير موجود: $pattern"
        return 1
    fi
}

# Count occurrences
count_pattern() {
    local file=$1
    local pattern=$2
    
    if [ ! -f "$file" ]; then
        echo "0"
        return
    fi
    
    grep -o "$pattern" "$file" | wc -l
}

###############################################################################
# Main Verification
###############################################################################

print_header "🚀 بدء التحقق من تطبيق RBAC"

# ============================================================================
# 1. التحقق من الملفات الأساسية
# ============================================================================

print_header "📁 التحقق من وجود الملفات الأساسية"

check_file "frontend/src/config/rbac.config.js" "ملف تكوين RBAC"
check_file "frontend/src/config/permissions.map.js" "خريطة الصلاحيات"
check_file "frontend/src/utils/ProtectedRoute.jsx" "مكون حماية المسارات"
check_file "frontend/src/store/rbacSlice.js" "RBAC Store"
check_file "frontend/src/menu-items/components.jsx" "المينيو الديناميكي"
check_file "frontend/src/tests/rbac-test-scenarios.js" "سيناريوهات الاختبار"
check_file "RBAC_DEVELOPER_GUIDE.md" "دليل المطور"

# ============================================================================
# 2. التحقق من تعريف الصلاحيات
# ============================================================================

print_header "🔑 التحقق من تعريف الصلاحيات"

PERMISSIONS_FILE="frontend/src/config/permissions.map.js"

if [ -f "$PERMISSIONS_FILE" ]; then
    # Count defined permissions
    PERMISSION_COUNT=$(grep -o "key: '[A-Z_]*'" "$PERMISSIONS_FILE" | wc -l)
    
    if [ "$PERMISSION_COUNT" -gt 20 ]; then
        print_check "PASS" "عدد الصلاحيات المعرّفة: $PERMISSION_COUNT"
    elif [ "$PERMISSION_COUNT" -gt 10 ]; then
        print_check "WARN" "عدد الصلاحيات المعرّفة قليل: $PERMISSION_COUNT (يُفضل أكثر من 20)"
    else
        print_check "FAIL" "عدد الصلاحيات المعرّفة قليل جداً: $PERMISSION_COUNT"
    fi
    
    # Check for essential permissions
    check_pattern "$PERMISSIONS_FILE" "VISITS_VIEW" "صلاحية عرض الزيارات معرّفة"
    check_pattern "$PERMISSIONS_FILE" "CLAIMS_VIEW" "صلاحية عرض المطالبات معرّفة"
    check_pattern "$PERMISSIONS_FILE" "PREAUTH_VIEW" "صلاحية عرض الموافقات معرّفة"
    check_pattern "$PERMISSIONS_FILE" "MEMBERS_VIEW" "صلاحية عرض المؤمن عليهم معرّفة"
else
    print_check "FAIL" "ملف الصلاحيات غير موجود"
fi

# ============================================================================
# 3. التحقق من تعريف الأدوار
# ============================================================================

print_header "👥 التحقق من تعريف الأدوار"

RBAC_CONFIG="frontend/src/config/rbac.config.js"

if [ -f "$RBAC_CONFIG" ]; then
    check_pattern "$RBAC_CONFIG" "SERVICE_PROVIDER" "دور مقدم الخدمة معرّف"
    check_pattern "$RBAC_CONFIG" "PARTNER_MANAGER" "دور مدير الشريك معرّف"
    check_pattern "$RBAC_CONFIG" "MEDICAL_REVIEWER" "دور المراجع الطبي معرّف"
    check_pattern "$RBAC_CONFIG" "ACCOUNTANT" "دور المحاسب معرّف"
    check_pattern "$RBAC_CONFIG" "SYSTEM_ADMIN" "دور مدير النظام معرّف"
else
    print_check "FAIL" "ملف تكوين RBAC غير موجود"
fi

# ============================================================================
# 4. التحقق من المينيو الديناميكي
# ============================================================================

print_header "📋 التحقق من المينيو الديناميكي"

MENU_FILE="frontend/src/menu-items/components.jsx"

if [ -f "$MENU_FILE" ]; then
    # Check for permission-based filtering
    check_pattern "$MENU_FILE" "hasPermission" "المينيو يستخدم hasPermission"
    check_pattern "$MENU_FILE" "permission:" "المينيو يحتوي على خاصية permission"
    
    # Count menu items with permissions
    ITEMS_WITH_PERMISSION=$(grep -o "permission: '[A-Z_]*'" "$MENU_FILE" | wc -l)
    TOTAL_MENU_ITEMS=$(grep -o "type: 'item'" "$MENU_FILE" | wc -l)
    
    if [ "$TOTAL_MENU_ITEMS" -gt 0 ]; then
        PERCENTAGE=$((ITEMS_WITH_PERMISSION * 100 / TOTAL_MENU_ITEMS))
        
        if [ "$PERCENTAGE" -ge 80 ]; then
            print_check "PASS" "$ITEMS_WITH_PERMISSION من $TOTAL_MENU_ITEMS عنصر محمي بصلاحية ($PERCENTAGE%)"
        elif [ "$PERCENTAGE" -ge 50 ]; then
            print_check "WARN" "فقط $ITEMS_WITH_PERMISSION من $TOTAL_MENU_ITEMS عنصر محمي بصلاحية ($PERCENTAGE%)"
        else
            print_check "FAIL" "عدد قليل من العناصر محمية: $ITEMS_WITH_PERMISSION من $TOTAL_MENU_ITEMS ($PERCENTAGE%)"
        fi
    fi
    
    # Check for hardcoded role checks (anti-pattern)
    HARDCODED_ROLES=$(grep -o "role === " "$MENU_FILE" | wc -l)
    if [ "$HARDCODED_ROLES" -eq 0 ]; then
        print_check "PASS" "لا توجد فحوصات hardcoded للأدوار"
    else
        print_check "FAIL" "توجد $HARDCODED_ROLES فحوصات hardcoded للأدوار (يجب استخدام permissions)"
    fi
else
    print_check "FAIL" "ملف المينيو غير موجود"
fi

# ============================================================================
# 5. التحقق من حماية المسارات
# ============================================================================

print_header "🛡️ التحقق من حماية المسارات"

PROTECTED_ROUTE="frontend/src/utils/ProtectedRoute.jsx"

if [ -f "$PROTECTED_ROUTE" ]; then
    check_pattern "$PROTECTED_ROUTE" "requiredPermission" "ProtectedRoute يدعم requiredPermission"
    check_pattern "$PROTECTED_ROUTE" "hasPermission" "ProtectedRoute يستخدم hasPermission"
    check_pattern "$PROTECTED_ROUTE" "Navigate" "ProtectedRoute يقوم بـ redirect"
else
    print_check "FAIL" "مكون ProtectedRoute غير موجود"
fi

# Check route files for ProtectedRoute usage
ROUTES_DIR="frontend/src/routes"
if [ -d "$ROUTES_DIR" ]; then
    PROTECTED_ROUTES=$(find "$ROUTES_DIR" -name "*.jsx" -o -name "*.js" | xargs grep -l "ProtectedRoute" | wc -l)
    
    if [ "$PROTECTED_ROUTES" -gt 0 ]; then
        print_check "PASS" "ProtectedRoute مستخدم في $PROTECTED_ROUTES ملف"
    else
        print_check "WARN" "ProtectedRoute غير مستخدم في ملفات المسارات"
    fi
fi

# ============================================================================
# 6. التحقق من RBAC Store
# ============================================================================

print_header "🗄️ التحقق من RBAC Store"

RBAC_STORE="frontend/src/store/rbacSlice.js"

if [ -f "$RBAC_STORE" ]; then
    check_pattern "$RBAC_STORE" "hasPermission" "Store يوفر hasPermission"
    check_pattern "$RBAC_STORE" "hasAnyPermission" "Store يوفر hasAnyPermission"
    check_pattern "$RBAC_STORE" "hasAllPermissions" "Store يوفر hasAllPermissions"
    check_pattern "$RBAC_STORE" "permissions" "Store يخزن permissions"
else
    print_check "FAIL" "RBAC Store غير موجود"
fi

# ============================================================================
# 7. التحقق من ملفات الاختبار
# ============================================================================

print_header "🧪 التحقق من ملفات الاختبار"

TEST_FILE="frontend/src/tests/rbac-test-scenarios.js"

if [ -f "$TEST_FILE" ]; then
    check_pattern "$TEST_FILE" "testServiceProvider" "اختبار مقدم الخدمة موجود"
    check_pattern "$TEST_FILE" "testPartnerManager" "اختبار مدير الشريك موجود"
    check_pattern "$TEST_FILE" "testMedicalReviewer" "اختبار المراجع الطبي موجود"
    check_pattern "$TEST_FILE" "testAccountant" "اختبار المحاسب موجود"
    check_pattern "$TEST_FILE" "runAllRBACTests" "دالة تشغيل جميع الاختبارات موجودة"
else
    print_check "FAIL" "ملف سيناريوهات الاختبار غير موجود"
fi

# ============================================================================
# 8. التحقق من التوثيق
# ============================================================================

print_header "📚 التحقق من التوثيق"

check_file "RBAC_DEVELOPER_GUIDE.md" "دليل المطور"

GUIDE_FILE="RBAC_DEVELOPER_GUIDE.md"
if [ -f "$GUIDE_FILE" ]; then
    check_pattern "$GUIDE_FILE" "Single Source of Truth" "يوثق مبدأ Single Source of Truth"
    check_pattern "$GUIDE_FILE" "ProtectedRoute" "يوثق استخدام ProtectedRoute"
    check_pattern "$GUIDE_FILE" "الأخطاء الشائعة" "يوثق الأخطاء الشائعة"
fi

# ============================================================================
# 9. فحص Anti-Patterns
# ============================================================================

print_header "⚠️ فحص الأنماط السيئة (Anti-Patterns)"

# Check for hardcoded roles in components
COMPONENTS_DIR="frontend/src"
if [ -d "$COMPONENTS_DIR" ]; then
    ROLE_HARDCODE=$(find "$COMPONENTS_DIR" -name "*.jsx" -o -name "*.js" | xargs grep -l "user\.role ===" 2>/dev/null | wc -l)
    
    if [ "$ROLE_HARDCODE" -eq 0 ]; then
        print_check "PASS" "لا توجد فحوصات hardcoded للأدوار في المكونات"
    else
        print_check "WARN" "توجد $ROLE_HARDCODE ملف يحتوي على فحوصات hardcoded للأدوار"
    fi
fi

# Check for CSS-only hiding (should use conditional rendering)
if [ -d "$COMPONENTS_DIR" ]; then
    CSS_HIDING=$(find "$COMPONENTS_DIR" -name "*.jsx" | xargs grep -l "display.*none.*role" 2>/dev/null | wc -l)
    
    if [ "$CSS_HIDING" -eq 0 ]; then
        print_check "PASS" "لا توجد إخفاء عناصر بـ CSS فقط"
    else
        print_check "WARN" "توجد $CSS_HIDING ملف قد يستخدم CSS hiding (يجب استخدام conditional rendering)"
    fi
fi

# ============================================================================
# Final Summary
# ============================================================================

print_header "📊 ملخص النتائج"

echo ""
echo "إجمالي الفحوصات: $TOTAL_CHECKS"
echo -e "${GREEN}✓ نجح: $PASSED_CHECKS${NC}"
echo -e "${YELLOW}⚠ تحذير: $WARNING_CHECKS${NC}"
echo -e "${RED}✗ فشل: $FAILED_CHECKS${NC}"
echo ""

# Calculate success rate
if [ "$TOTAL_CHECKS" -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    echo "نسبة النجاح: $SUCCESS_RATE%"
    echo ""
    
    if [ "$SUCCESS_RATE" -ge 90 ]; then
        echo -e "${GREEN}🎉 ممتاز! النظام مطبق بشكل احترافي${NC}"
        exit 0
    elif [ "$SUCCESS_RATE" -ge 70 ]; then
        echo -e "${YELLOW}⚠️ جيد، لكن يحتاج بعض التحسينات${NC}"
        exit 0
    else
        echo -e "${RED}❌ يحتاج إلى عمل كبير لإكمال التطبيق${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ لم يتم إجراء أي فحوصات${NC}"
    exit 1
fi
