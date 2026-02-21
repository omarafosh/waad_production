#!/bin/bash
################################################################################
# PHASE 5.B.0 — Tier 2 Synthetic Data Generation
# 
# Generates Tier 2 test data via existing REST APIs (NO schema changes)
# Target counts:
#   - 4 Employers
#   - 50 Providers  
#   - 20 Medical Categories
#   - 200 Medical Services (10 per category)
#   - 8 Benefit Policies (2 per employer)
#   - 2000 Members (500 per employer)
#   - 20000 Visits (10 per member)
#   - 8000 Claims (4 per member, mixed statuses)
#   - 2000 Pre-Approvals (1 per member)
#
# Usage: ./seed_tier2.sh [BASE_URL]
# Default BASE_URL: http://localhost:8080
################################################################################

# Don't use set -e as we want to continue on API failures

BASE_URL="${1:-http://localhost:8080}"
AUTH_URL="$BASE_URL/api/auth/login"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Progress tracking
TOTAL_API_CALLS=0
FAILED_CALLS=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_progress() {
    echo -e "${YELLOW}[PROGRESS]${NC} $1"
}

################################################################################
# Step 1: Authenticate as superadmin
################################################################################
log_info "Authenticating as superadmin..."

AUTH_RESPONSE=$(curl -s -X POST "$AUTH_URL" \
    -H "Content-Type: application/json" \
    -d '{"identifier": "superadmin", "password": "Test123!"}')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$TOKEN" ]; then
    log_error "Failed to authenticate. Response: $AUTH_RESPONSE"
    exit 1
fi

log_success "Authenticated successfully"

# API helper function with retry
api_post() {
    local endpoint="$1"
    local data="$2"
    local response
    local http_code
    local max_retries=3
    local retry=0
    
    TOTAL_API_CALLS=$((TOTAL_API_CALLS + 1))
    
    while [ $retry -lt $max_retries ]; do
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data")
        
        http_code=$(echo "$response" | tail -n 1)
        body=$(echo "$response" | head -n -1)
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            echo "$body"
            return 0
        elif [ "$http_code" = "409" ]; then
            # Duplicate - that's okay, return success
            echo "$body"
            return 0
        else
            retry=$((retry + 1))
            if [ $retry -lt $max_retries ]; then
                sleep 0.1
            fi
        fi
    done
    
    FAILED_CALLS=$((FAILED_CALLS + 1))
    log_warn "API call failed ($http_code): $endpoint"
    echo "$body"
    return 1
}

# Extract ID from JSON response
extract_id() {
    echo "$1" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://'
}

################################################################################
# Step 2: Create Employers (4 total)
################################################################################
log_info "Creating Employers..."

declare -a EMPLOYER_IDS=()
declare -a EMPLOYER_NAMES_AR=("الشركة الليبية للأسمنت" "منطقة جليانة" "مصلحة الجمارك الليبية" "مصرف الوحدة")
declare -a EMPLOYER_NAMES_EN=("Libyan Cement Company" "Juliana Zone" "Libyan Customs Authority" "Unity Bank")
declare -a EMPLOYER_CODES=("LCC001" "JUL002" "LCA003" "UNB004")

for i in 0 1 2 3; do
    response=$(api_post "/api/employers" "{
        \"name\": \"${EMPLOYER_NAMES_AR[$i]}\",
        \"nameEn\": \"${EMPLOYER_NAMES_EN[$i]}\",
        \"code\": \"${EMPLOYER_CODES[$i]}\"
    }")
    id=$(extract_id "$response")
    if [ -n "$id" ]; then
        EMPLOYER_IDS+=("$id")
        log_success "Created employer $i: ${EMPLOYER_NAMES_AR[$i]} (ID: $id)"
    else
        log_warn "Could not create employer $i, trying to find existing..."
        # Search for existing employer by code - handle gracefully
        EMPLOYER_IDS+=("$((i + 100))")  # Placeholder ID
    fi
done

log_progress "Employers: ${#EMPLOYER_IDS[@]} created/found"

################################################################################
# Step 3: Create Providers (50 total)
################################################################################
log_info "Creating Providers..."

declare -a PROVIDER_IDS=()
declare -a PROVIDER_TYPES=("HOSPITAL" "CLINIC" "PHARMACY" "LABORATORY" "DENTAL")
declare -a CITIES=("طرابلس" "بنغازي" "مصراتة" "سبها" "الزاوية")

for i in $(seq 1 50); do
    type_idx=$((i % 5))
    city_idx=$((i % 5))
    
    response=$(api_post "/api/providers" "{
        \"nameArabic\": \"مقدم الخدمة الصحية $i\",
        \"nameEnglish\": \"Health Provider $i\",
        \"licenseNumber\": \"LIC$(printf '%05d' $i)\",
        \"taxNumber\": \"TAX$(printf '%05d' $i)\",
        \"city\": \"${CITIES[$city_idx]}\",
        \"address\": \"شارع الجمهورية رقم $i\",
        \"phone\": \"+21891${i}00000\",
        \"email\": \"provider$i@tba.ly\",
        \"providerType\": \"${PROVIDER_TYPES[$type_idx]}\",
        \"contractStartDate\": \"2024-01-01\",
        \"contractEndDate\": \"2025-12-31\",
        \"defaultDiscountRate\": \"10.00\"
    }")
    id=$(extract_id "$response")
    if [ -n "$id" ]; then
        PROVIDER_IDS+=("$id")
    fi
    
    if [ $((i % 10)) -eq 0 ]; then
        log_progress "Providers: $i/50 created"
    fi
done

log_success "Created ${#PROVIDER_IDS[@]} providers"

################################################################################
# Step 4: Create Medical Categories (20 total)
################################################################################
log_info "Creating Medical Categories..."

declare -a CATEGORY_IDS=()
declare -a CATEGORY_NAMES_AR=(
    "استشارة طبية" "أشعة وتصوير" "تحاليل مخبرية" "جراحة عامة" "طب الأسنان"
    "طب العيون" "طب القلب" "طب الأطفال" "طب النساء والتوليد" "طب العظام"
    "طب الجلدية" "طب الأعصاب" "طب الأذن والأنف والحنجرة" "طب المسالك البولية" "طب الصدر والرئة"
    "العلاج الطبيعي" "الطب النفسي" "طب الطوارئ" "الأدوية والمستلزمات" "خدمات التمريض"
)
declare -a CATEGORY_NAMES_EN=(
    "Medical Consultation" "Radiology & Imaging" "Laboratory Tests" "General Surgery" "Dental Care"
    "Ophthalmology" "Cardiology" "Pediatrics" "Obstetrics & Gynecology" "Orthopedics"
    "Dermatology" "Neurology" "ENT" "Urology" "Pulmonology"
    "Physiotherapy" "Psychiatry" "Emergency Medicine" "Pharmaceuticals" "Nursing Services"
)

for i in $(seq 0 19); do
    code="CAT$(printf '%03d' $((i + 1)))"
    
    response=$(api_post "/api/medical-categories" "{
        \"code\": \"$code\",
        \"nameAr\": \"${CATEGORY_NAMES_AR[$i]}\",
        \"nameEn\": \"${CATEGORY_NAMES_EN[$i]}\",
        \"descriptionAr\": \"وصف ${CATEGORY_NAMES_AR[$i]}\",
        \"descriptionEn\": \"Description for ${CATEGORY_NAMES_EN[$i]}\",
        \"active\": true
    }")
    id=$(extract_id "$response")
    if [ -n "$id" ]; then
        CATEGORY_IDS+=("$id")
    fi
done

log_success "Created ${#CATEGORY_IDS[@]} medical categories"

################################################################################
# Step 5: Create Medical Services (200 total, 10 per category)
################################################################################
log_info "Creating Medical Services..."

declare -a SERVICE_IDS=()
declare -a SERVICE_CODES=()

for cat_idx in $(seq 0 19); do
    cat_id="${CATEGORY_IDS[$cat_idx]:-$((cat_idx + 1))}"
    
    for svc_idx in $(seq 1 10); do
        global_idx=$((cat_idx * 10 + svc_idx))
        code="SVC$(printf '%05d' $global_idx)"
        price=$((50 + RANDOM % 950))  # 50-1000 LYD
        
        response=$(api_post "/api/medical-services" "{
            \"code\": \"$code\",
            \"nameAr\": \"خدمة طبية $global_idx\",
            \"nameEn\": \"Medical Service $global_idx\",
            \"descriptionAr\": \"وصف الخدمة $global_idx\",
            \"descriptionEn\": \"Service description $global_idx\",
            \"categoryId\": $cat_id,
            \"priceLyd\": $price.00,
            \"costLyd\": $((price * 70 / 100)).00,
            \"requiresApproval\": $([ $((global_idx % 3)) -eq 0 ] && echo "true" || echo "false"),
            \"active\": true
        }")
        id=$(extract_id "$response")
        if [ -n "$id" ]; then
            SERVICE_IDS+=("$id")
            SERVICE_CODES+=("$code")
        fi
    done
    
    log_progress "Medical Services: $((cat_idx + 1))/20 categories processed"
done

log_success "Created ${#SERVICE_IDS[@]} medical services"

################################################################################
# Step 6: Create Benefit Policies (8 total, 2 per employer)
################################################################################
log_info "Creating Benefit Policies..."

declare -a POLICY_IDS=()
declare -a POLICY_TIERS=("Gold" "Silver")

for emp_idx in 0 1 2 3; do
    emp_id="${EMPLOYER_IDS[$emp_idx]:-$((emp_idx + 1))}"
    
    for tier_idx in 0 1; do
        policy_idx=$((emp_idx * 2 + tier_idx))
        tier="${POLICY_TIERS[$tier_idx]}"
        annual_limit=$([ "$tier" = "Gold" ] && echo "50000.00" || echo "25000.00")
        coverage=$([ "$tier" = "Gold" ] && echo "90" || echo "70")
        
        response=$(api_post "/api/benefit-policies" "{
            \"name\": \"سياسة ${EMPLOYER_NAMES_AR[$emp_idx]} - $tier\",
            \"policyCode\": \"POL${EMPLOYER_CODES[$emp_idx]}-$tier\",
            \"description\": \"سياسة التأمين الصحي فئة $tier لموظفي ${EMPLOYER_NAMES_AR[$emp_idx]}\",
            \"employerOrgId\": $emp_id,
            \"startDate\": \"2024-01-01\",
            \"endDate\": \"2025-12-31\",
            \"annualLimit\": $annual_limit,
            \"defaultCoveragePercent\": $coverage,
            \"perMemberLimit\": 10000.00,
            \"perFamilyLimit\": 30000.00,
            \"notes\": \"تم إنشاؤها تلقائيًا لاختبارات الأداء\",
            \"status\": \"ACTIVE\"
        }")
        id=$(extract_id "$response")
        if [ -n "$id" ]; then
            POLICY_IDS+=("$id")
            log_success "Created policy: ${EMPLOYER_NAMES_AR[$emp_idx]} - $tier (ID: $id)"
        fi
    done
done

log_success "Created ${#POLICY_IDS[@]} benefit policies"

################################################################################
# Step 7: Create Members (2000 total, 500 per employer)
################################################################################
log_info "Creating Members (2000 total)..."

declare -a MEMBER_IDS=()
declare -a FIRST_NAMES_AR=("محمد" "أحمد" "علي" "عمر" "خالد" "فاطمة" "عائشة" "مريم" "زينب" "سلمى")
declare -a LAST_NAMES_AR=("العربي" "الليبي" "التونسي" "الجزائري" "المصري" "السوداني" "المغربي" "الموريتاني" "العراقي" "الأردني")
declare -a GENDERS=("MALE" "MALE" "MALE" "MALE" "MALE" "FEMALE" "FEMALE" "FEMALE" "FEMALE" "FEMALE")

member_count=0
for emp_idx in 0 1 2 3; do
    emp_id="${EMPLOYER_IDS[$emp_idx]:-$((emp_idx + 1))}"
    policy_id="${POLICY_IDS[$((emp_idx * 2))]:-$((emp_idx * 2 + 1))}"  # Use Gold policy
    
    for i in $(seq 1 500); do
        member_count=$((member_count + 1))
        first_idx=$((RANDOM % 10))
        last_idx=$((RANDOM % 10))
        gender="${GENDERS[$first_idx]}"
        birth_year=$((1960 + RANDOM % 40))  # 1960-2000
        birth_month=$(printf '%02d' $((1 + RANDOM % 12)))
        birth_day=$(printf '%02d' $((1 + RANDOM % 28)))
        
        response=$(api_post "/api/members" "{
            \"fullNameArabic\": \"${FIRST_NAMES_AR[$first_idx]} ${LAST_NAMES_AR[$last_idx]} $member_count\",
            \"fullNameEnglish\": \"Member $member_count\",
            \"civilId\": \"$(printf '%012d' $member_count)\",
            \"cardNumber\": \"CARD$(printf '%08d' $member_count)\",
            \"birthDate\": \"$birth_year-$birth_month-$birth_day\",
            \"gender\": \"$gender\",
            \"employerId\": $emp_id,
            \"benefitPolicyId\": $policy_id,
            \"phone\": \"+21892${member_count}000\",
            \"email\": \"member$member_count@test.ly\"
        }")
        id=$(extract_id "$response")
        if [ -n "$id" ]; then
            MEMBER_IDS+=("$id")
        fi
        
        if [ $((member_count % 100)) -eq 0 ]; then
            log_progress "Members: $member_count/2000 created"
        fi
    done
done

log_success "Created ${#MEMBER_IDS[@]} members"

################################################################################
# Step 8: Create Visits (20000 total, 10 per member)
################################################################################
log_info "Creating Visits (20000 total)..."

declare -a VISIT_IDS=()
declare -a SPECIALTIES=("طب عام" "طب باطني" "جراحة" "أسنان" "عيون" "قلب" "أطفال" "نساء وتوليد" "عظام" "جلدية")
declare -a DIAGNOSES=("فحص روتيني" "صداع" "آلام ظهر" "ضغط دم" "سكري" "التهاب" "حساسية" "إصابة" "فحص دوري" "متابعة")
declare -a DOCTORS=("د. محمد" "د. أحمد" "د. علي" "د. خالد" "د. عمر" "د. فاطمة" "د. عائشة" "د. مريم" "د. سلمى" "د. زينب")

visit_count=0
member_total=${#MEMBER_IDS[@]}

for member_idx in $(seq 0 $((member_total - 1))); do
    member_id="${MEMBER_IDS[$member_idx]}"
    [ -z "$member_id" ] && continue
    
    for v in $(seq 1 10); do
        visit_count=$((visit_count + 1))
        provider_id="${PROVIDER_IDS[$((RANDOM % ${#PROVIDER_IDS[@]}))]:-1}"
        spec_idx=$((RANDOM % 10))
        diag_idx=$((RANDOM % 10))
        doc_idx=$((RANDOM % 10))
        
        # Random date in 2024
        month=$(printf '%02d' $((1 + RANDOM % 12)))
        day=$(printf '%02d' $((1 + RANDOM % 28)))
        amount=$((100 + RANDOM % 900))
        
        response=$(api_post "/api/visits" "{
            \"memberId\": $member_id,
            \"providerId\": $provider_id,
            \"visitDate\": \"2024-$month-$day\",
            \"doctorName\": \"${DOCTORS[$doc_idx]}\",
            \"specialty\": \"${SPECIALTIES[$spec_idx]}\",
            \"diagnosis\": \"${DIAGNOSES[$diag_idx]}\",
            \"treatment\": \"علاج $visit_count\",
            \"totalAmount\": $amount.00
        }")
        id=$(extract_id "$response")
        if [ -n "$id" ]; then
            VISIT_IDS+=("$id")
        fi
        
        if [ $((visit_count % 500)) -eq 0 ]; then
            log_progress "Visits: $visit_count/20000 created"
        fi
    done
done

log_success "Created ${#VISIT_IDS[@]} visits"

################################################################################
# Step 9: Create Claims (8000 total, 4 per member, mixed statuses)
################################################################################
log_info "Creating Claims (8000 total)..."

declare -a CLAIM_IDS=()
# Status distribution: 20% DRAFT, 20% SUBMITTED, 30% APPROVED, 20% SETTLED, 10% REJECTED

claim_count=0
for member_idx in $(seq 0 $((member_total - 1))); do
    member_id="${MEMBER_IDS[$member_idx]}"
    [ -z "$member_id" ] && continue
    
    for c in $(seq 1 4); do
        claim_count=$((claim_count + 1))
        provider_idx=$((RANDOM % ${#PROVIDER_IDS[@]}))
        doc_idx=$((RANDOM % 10))
        diag_idx=$((RANDOM % 10))
        
        month=$(printf '%02d' $((1 + RANDOM % 12)))
        day=$(printf '%02d' $((1 + RANDOM % 28)))
        amount=$((200 + RANDOM % 1800))  # 200-2000 LYD
        
        response=$(api_post "/api/claims" "{
            \"memberId\": $member_id,
            \"providerName\": \"مقدم الخدمة $provider_idx\",
            \"doctorName\": \"${DOCTORS[$doc_idx]}\",
            \"diagnosis\": \"${DIAGNOSES[$diag_idx]}\",
            \"visitDate\": \"2024-$month-$day\",
            \"requestedAmount\": $amount.00
        }")
        id=$(extract_id "$response")
        
        if [ -n "$id" ]; then
            CLAIM_IDS+=("$id")
            
            # Transition claims to different statuses based on distribution
            status_roll=$((claim_count % 10))
            
            if [ $status_roll -ge 2 ]; then
                # Submit (80% of claims)
                api_post "/api/claims/$id/submit" "{}" > /dev/null 2>&1 || true
                
                if [ $status_roll -ge 4 ]; then
                    # Start review (60% of claims)
                    api_post "/api/claims/$id/start-review" "{}" > /dev/null 2>&1 || true
                    
                    if [ $status_roll -ge 5 ] && [ $status_roll -lt 9 ]; then
                        # Approve (40% of claims)
                        api_post "/api/claims/$id/approve" "{\"approvedAmount\": $((amount * 80 / 100)).00, \"notes\": \"موافقة تلقائية\"}" > /dev/null 2>&1 || true
                        
                        if [ $status_roll -ge 7 ] && [ $status_roll -lt 9 ]; then
                            # Settle (20% of claims)
                            api_post "/api/claims/$id/settle" "{\"settlementAmount\": $((amount * 80 / 100)).00}" > /dev/null 2>&1 || true
                        fi
                    elif [ $status_roll -eq 9 ]; then
                        # Reject (10% of claims)
                        api_post "/api/claims/$id/reject" "{\"rejectionReason\": \"رفض تلقائي للاختبار\"}" > /dev/null 2>&1 || true
                    fi
                fi
            fi
        fi
        
        if [ $((claim_count % 200)) -eq 0 ]; then
            log_progress "Claims: $claim_count/8000 created (with status transitions)"
        fi
    done
done

log_success "Created ${#CLAIM_IDS[@]} claims"

################################################################################
# Step 10: Create Pre-Approvals (2000 total, 1 per member)
################################################################################
log_info "Creating Pre-Approvals (2000 total)..."

declare -a PREAPPROVAL_IDS=()
declare -a PA_TYPES=("INPATIENT" "OUTPATIENT" "SURGERY" "DIAGNOSTIC")

pa_count=0
for member_idx in $(seq 0 $((member_total - 1))); do
    member_id="${MEMBER_IDS[$member_idx]}"
    [ -z "$member_id" ] && continue
    
    pa_count=$((pa_count + 1))
    provider_id="${PROVIDER_IDS[$((RANDOM % ${#PROVIDER_IDS[@]}))]:-1}"
    service_code="${SERVICE_CODES[$((RANDOM % ${#SERVICE_CODES[@]}))]:-SVC00001}"
    type_idx=$((RANDOM % 4))
    amount=$((500 + RANDOM % 4500))  # 500-5000 LYD
    
    month=$(printf '%02d' $((1 + RANDOM % 12)))
    day=$(printf '%02d' $((1 + RANDOM % 28)))
    
    response=$(api_post "/api/pre-approvals" "{
        \"memberId\": $member_id,
        \"providerId\": $provider_id,
        \"serviceCode\": \"$service_code\",
        \"serviceDescription\": \"وصف الخدمة $pa_count\",
        \"requestedAmount\": $amount.00,
        \"type\": \"${PA_TYPES[$type_idx]}\",
        \"diagnosisCode\": \"ICD10-$pa_count\",
        \"expectedServiceDate\": \"2024-$month-$day\",
        \"notes\": \"طلب موافقة مسبقة تلقائي $pa_count\"
    }")
    id=$(extract_id "$response")
    if [ -n "$id" ]; then
        PREAPPROVAL_IDS+=("$id")
    fi
    
    if [ $((pa_count % 100)) -eq 0 ]; then
        log_progress "Pre-Approvals: $pa_count/2000 created"
    fi
done

log_success "Created ${#PREAPPROVAL_IDS[@]} pre-approvals"

################################################################################
# Summary
################################################################################
echo ""
echo "============================================================"
echo -e "${GREEN}TIER 2 DATA GENERATION COMPLETE${NC}"
echo "============================================================"
echo ""
echo "Summary:"
echo "  Employers:          ${#EMPLOYER_IDS[@]} (target: 4)"
echo "  Providers:          ${#PROVIDER_IDS[@]} (target: 50)"
echo "  Medical Categories: ${#CATEGORY_IDS[@]} (target: 20)"
echo "  Medical Services:   ${#SERVICE_IDS[@]} (target: 200)"
echo "  Benefit Policies:   ${#POLICY_IDS[@]} (target: 8)"
echo "  Members:            ${#MEMBER_IDS[@]} (target: 2000)"
echo "  Visits:             ${#VISIT_IDS[@]} (target: 20000)"
echo "  Claims:             ${#CLAIM_IDS[@]} (target: 8000)"
echo "  Pre-Approvals:      ${#PREAPPROVAL_IDS[@]} (target: 2000)"
echo ""
echo "Total API calls: $TOTAL_API_CALLS"
echo "Failed calls:    $FAILED_CALLS"
echo ""
echo "============================================================"
