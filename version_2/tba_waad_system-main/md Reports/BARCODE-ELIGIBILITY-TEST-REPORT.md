# 🧪 تقرير اختبار Barcode وCard Number
# Barcode & Eligibility Testing Report

> **تاريخ:** 12 يناير 2026  
> **المرحلة:** ما بعد Unified Member Architecture  
> **الحالة:** 🔄 جاهز للاختبار - يتطلب تشغيل Backend

---

## 📋 ملخص تنفيذي

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **Backend** | ⏸️ غير مشغل | يحتاج تشغيل |
| **PostgreSQL** | ⏸️ غير مشغل | يحتاج تشغيل |
| **API Endpoints** | ✅ موجودة | 4 endpoints للاختبار |
| **Test Data** | ⏸️ غير متاح | يحتاج قاعدة بيانات |

---

## 🎯 الهدف من الاختبار

### اختبار Unified Member Architecture بالكامل

**التأكد من:**
1. ✅ Barcode يعمل في فحص الأهلية
2. ✅ Card Number يعمل في Claim flow
3. ✅ لا أخطاء في NULL/Mapping
4. ✅ Workflow كامل يمر بنجاح
5. ✅ لا استدعاء لجداول قديمة

---

## 🔍 المرحلة 1: فحص API Endpoints

### 1️⃣ Eligibility Check Endpoints

#### Endpoint 1: Provider Portal (POST)

**المسار:** `ProviderPortalController.java` - Line 72

```java
@PostMapping("/eligibility-check")
@Operation(summary = "Check family eligibility for providers")
public ResponseEntity<ProviderEligibilityResponse> checkEligibility(
    @RequestBody ProviderEligibilityRequest request) {
    
    return ResponseEntity.ok(
        providerPortalService.checkEligibility(request.getBarcode())
    );
}
```

**التفاصيل:**
- **URL:** `POST /api/provider-portal/eligibility-check`
- **Body:** `{"barcode": "..."}`
- **Response:** `ProviderEligibilityResponse` مع family members
- **الحالة:** ✅ موجود

---

#### Endpoint 2: Provider Portal (GET)

**المسار:** `ProviderPortalController.java` - Line 122

```java
@GetMapping("/eligibility/{barcode}")
@Operation(summary = "Check eligibility by barcode (GET)")
public ResponseEntity<ProviderEligibilityResponse> checkEligibilityByBarcode(
    @PathVariable String barcode) {
    
    return ResponseEntity.ok(
        providerPortalService.checkEligibility(barcode)
    );
}
```

**التفاصيل:**
- **URL:** `GET /api/provider-portal/eligibility/{barcode}`
- **الحالة:** ✅ موجود

---

#### Endpoint 3: Unified Eligibility (GET)

**المسار:** `UnifiedEligibilityController.java` - Line 79

```java
@GetMapping("/eligibility")
@Operation(summary = "Check eligibility - Unified")
public ResponseEntity<FamilyEligibilityResponseDto> checkEligibility(
    @RequestParam String lookup) {
    
    // يدعم Barcode أو Card Number
    return ResponseEntity.ok(
        eligibilityService.checkEligibility(lookup)
    );
}
```

**التفاصيل:**
- **URL:** `GET /api/members/eligibility?lookup={barcode or cardNumber}`
- **الحالة:** ✅ موجود

---

#### Endpoint 4: Member Eligibility (GET)

**المسار:** `UnifiedMemberController.java` - Line 591

```java
@GetMapping("/eligibility/{barcode}")
@Operation(summary = "Check eligibility by barcode")
public ResponseEntity<FamilyEligibilityResponseDto> checkEligibilityByBarcode(
    @PathVariable String barcode) {
    
    return ResponseEntity.ok(
        eligibilityService.checkEligibility(barcode)
    );
}
```

**التفاصيل:**
- **URL:** `GET /api/members/eligibility/{barcode}`
- **الحالة:** ✅ موجود

---

## 🧪 المرحلة 2: خطة الاختبار

### متطلبات الاختبار

**قبل البدء:**
1. ✅ تشغيل PostgreSQL
2. ✅ تشغيل Backend (Spring Boot)
3. ✅ وجود بيانات اختبارية:
   - Principal member مع barcode
   - Dependent members مرتبطين
   - Benefit policy نشطة
   - Employer نشط

---

### TEST 1: Member Lookup (البحث عن العضو)

**الهدف:** التأكد أن Member يُعثر عليه بـ Barcode

**الخطوات:**
```bash
# 1. اختيار barcode من قاعدة البيانات
SELECT barcode, full_name, parent_id, active 
FROM members 
WHERE parent_id IS NULL AND barcode IS NOT NULL 
LIMIT 1;

# 2. استدعاء API
curl -X GET "http://localhost:8080/api/members/eligibility/{barcode}" \
  -H "Authorization: Bearer {token}"
```

**النتيجة المتوقعة:**
```json
{
  "eligible": true,
  "principal": {
    "id": 123,
    "fullName": "أحمد محمد",
    "barcode": "TEST123456",
    "active": true
  },
  "dependents": [
    {
      "id": 124,
      "fullName": "محمد أحمد",
      "relationship": "SON",
      "cardNumber": "TEST123456-01"
    }
  ],
  "totalMembers": 2
}
```

**معايير النجاح:**
- ✅ Member موجود
- ✅ `active = true`
- ✅ مرتبط ببوليصة
- ✅ لا أخطاء null

---

### TEST 2: Eligibility Check (فحص الأهلية)

**الهدف:** التأكد من عمل Eligibility workflow بالكامل

**الخطوات:**
```bash
# 1. استخدام Provider Portal endpoint
curl -X POST "http://localhost:8080/api/provider-portal/eligibility-check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"barcode": "TEST123456"}'
```

**النتيجة المتوقعة:**
```json
{
  "eligible": true,
  "statusCode": "SUCCESS",
  "message": "العائلة مؤهلة - يرجى اختيار المريض",
  "familyMembers": [
    {
      "id": 123,
      "fullName": "أحمد محمد",
      "barcode": "TEST123456",
      "isPrincipal": true,
      "eligible": true,
      "annualLimit": 50000,
      "consumed": 5000,
      "remaining": 45000
    },
    {
      "id": 124,
      "fullName": "محمد أحمد",
      "cardNumber": "TEST123456-01",
      "relationship": "SON",
      "isPrincipal": false,
      "eligible": true,
      "annualLimit": 50000,
      "consumed": 0,
      "remaining": 50000
    }
  ],
  "totalFamilyMembers": 2
}
```

**معايير النجاح:**
- ✅ `eligible = true`
- ✅ Principal + Dependents معروضين
- ✅ Limits محسوبة صحيحًا
- ✅ لا استدعاء لجدول `family_members`

---

### TEST 3: Card Number Lookup (البحث بـ Card Number)

**الهدف:** التأكد أن Card Number يعمل للـ Dependent

**الخطوات:**
```bash
# 1. الحصول على card number لـ dependent
SELECT card_number, full_name, relationship, parent_id 
FROM members 
WHERE parent_id IS NOT NULL 
LIMIT 1;

# 2. استدعاء API
curl -X GET "http://localhost:8080/api/members/eligibility?lookup=TEST123456-01" \
  -H "Authorization: Bearer {token}"
```

**النتيجة المتوقعة:**
```json
{
  "eligible": true,
  "principal": {
    "id": 123,
    "barcode": "TEST123456"
  },
  "dependents": [
    {
      "id": 124,
      "cardNumber": "TEST123456-01",
      "relationship": "SON"
    }
  ]
}
```

**معايير النجاح:**
- ✅ Dependent يُعثر عليه بـ Card Number
- ✅ Principal يُرجع معه
- ✅ العلاقة (relationship) صحيحة

---

### TEST 4: Claim Flow (سير العمل الكامل)

**الهدف:** التأكد من Claim workflow

**الخطوات:**
```bash
# 1. إنشاء Claim
curl -X POST "http://localhost:8080/api/claims" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "memberId": 124,
    "claimDate": "2026-01-12",
    "diagnosis": "Flu",
    "claimAmount": 500
  }'
```

**النتيجة المتوقعة:**
```json
{
  "id": 456,
  "member": {
    "id": 124,
    "fullName": "محمد أحمد",
    "cardNumber": "TEST123456-01",
    "relationship": "SON"
  },
  "claimAmount": 500,
  "status": "PENDING"
}
```

**معايير النجاح:**
- ✅ العضو (Dependent) يُربط صحيحًا
- ✅ لا استدعاء لجداول قديمة
- ✅ Workflow يكمل بدون أخطاء

---

### TEST 5: Pre-Approval Flow

**الهدف:** التأكد من Pre-Approval workflow

**الخطوات:**
```bash
# إنشاء Pre-Approval
curl -X POST "http://localhost:8080/api/pre-authorizations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "memberId": 123,
    "serviceType": "SURGERY",
    "estimatedAmount": 15000
  }'
```

**معايير النجاح:**
- ✅ العضو الرئيسي أو التابع يُحلل من `members`
- ✅ العلاقة (`parent_id` / `relationship`) تُستخدم
- ✅ لا أخطاء

---

## 🛠️ المرحلة 3: تشغيل البيئة

### الخطوات المطلوبة

#### 1️⃣ تشغيل PostgreSQL

**الطريقة 1: Docker**
```bash
cd /workspaces/tba_waad_system
docker-compose up -d postgres
```

**الطريقة 2: Service**
```bash
sudo service postgresql start
```

**التحقق:**
```bash
pg_isready -h localhost -p 5432
# Expected: localhost:5432 - accepting connections
```

---

#### 2️⃣ تشغيل Backend

```bash
cd /workspaces/tba_waad_system/backend
mvn spring-boot:run
```

**التحقق:**
```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

---

#### 3️⃣ إنشاء بيانات اختبارية

```sql
-- إنشاء Employer
INSERT INTO employers (name, code, active) 
VALUES ('Test Company', 'TEST001', true);

-- إنشاء Benefit Policy
INSERT INTO benefit_policies (name, annual_limit, active) 
VALUES ('Test Policy', 50000, true);

-- إنشاء Principal Member
INSERT INTO members (
    full_name, barcode, card_number, 
    employer_id, benefit_policy_id, 
    parent_id, relationship, active
) VALUES (
    'أحمد محمد علي', 'TEST123456', 'TEST123456',
    1, 1,
    NULL, NULL, true
) RETURNING id;

-- إنشاء Dependent Member
INSERT INTO members (
    full_name, card_number,
    employer_id, benefit_policy_id,
    parent_id, relationship, active
) VALUES (
    'محمد أحمد علي', 'TEST123456-01',
    1, 1,
    {principal_id}, 'SON', true
);
```

---

## 📊 المرحلة 4: تنفيذ الاختبارات

### سكريبت اختبار شامل

```bash
#!/bin/bash
# barcode-test.sh

BASE_URL="http://localhost:8080"
TOKEN="YOUR_JWT_TOKEN"
BARCODE="TEST123456"
CARD_NUMBER="TEST123456-01"

echo "=== TEST 1: Member Lookup ==="
curl -X GET "$BASE_URL/api/members/eligibility/$BARCODE" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

echo ""
echo "=== TEST 2: Provider Eligibility Check ==="
curl -X POST "$BASE_URL/api/provider-portal/eligibility-check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"barcode\": \"$BARCODE\"}" \
  | jq .

echo ""
echo "=== TEST 3: Card Number Lookup ==="
curl -X GET "$BASE_URL/api/members/eligibility?lookup=$CARD_NUMBER" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

echo ""
echo "=== TEST 4: Claim Creation ==="
curl -X POST "$BASE_URL/api/claims" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "memberId": 2,
    "claimDate": "2026-01-12",
    "diagnosis": "Flu Test",
    "claimAmount": 500
  }' \
  | jq .

echo ""
echo "✅ All tests completed"
```

**الاستخدام:**
```bash
chmod +x barcode-test.sh
./barcode-test.sh
```

---

## ✅ معايير النجاح (Definition of Done)

### Database

- [  ] لا يوجد أي استدعاء لجدول `family_members`
- [  ] جميع الـ queries تستخدم `members` فقط
- [  ] `parent_id` و `relationship` تُستخدم صحيحًا

### API Endpoints

- [  ] Barcode يعمل في Eligibility Check
- [  ] Card Number يعمل في Eligibility Check
- [  ] لا أخطاء NULL/Mapping
- [  ] Response صحيح ومتكامل

### Workflows

- [  ] Eligibility Check يكمل بنجاح
- [  ] Claim Flow يكمل بنجاح
- [  ] Pre-Approval Flow يكمل بنجاح
- [  ] لا أخطاء في Console

### Performance

- [  ] Response Time < 500ms
- [  ] لا Slow Queries
- [  ] لا N+1 Query Problems

---

## 🚨 المشاكل المحتملة

### Problem 1: Backend غير مشغل

**الأعراض:**
```
Connection refused on localhost:8080
```

**الحل:**
```bash
cd /workspaces/tba_waad_system/backend
mvn spring-boot:run
```

---

### Problem 2: PostgreSQL غير متصل

**الأعراض:**
```
Connection refused on localhost:5432
```

**الحل:**
```bash
# Docker
docker-compose up -d postgres

# أو Service
sudo service postgresql start
```

---

### Problem 3: لا توجد بيانات اختبارية

**الأعراض:**
```json
{
  "error": "Member not found"
}
```

**الحل:**
```sql
-- تنفيذ SQL script لإنشاء بيانات اختبارية
-- (راجع المرحلة 3 أعلاه)
```

---

### Problem 4: Barcode NULL للـ Dependent

**الأعراض:**
```json
{
  "error": "Barcode is required"
}
```

**الحل:**
- ✅ هذا **صحيح** - Dependent لا يجب أن يكون له barcode
- استخدم Card Number بدلاً من Barcode

---

## 📝 نموذج نتائج الاختبار

### Test Results Template

```markdown
## Test Execution: 2026-01-12

### TEST 1: Member Lookup
- Status: [ ] Pass / [ ] Fail
- Barcode Used: TEST123456
- Response Time: ___ ms
- Notes: ___

### TEST 2: Eligibility Check
- Status: [ ] Pass / [ ] Fail
- Family Size: ___
- Eligible: [ ] Yes / [ ] No
- Notes: ___

### TEST 3: Card Number Lookup
- Status: [ ] Pass / [ ] Fail
- Card Number: TEST123456-01
- Found Member: [ ] Yes / [ ] No
- Notes: ___

### TEST 4: Claim Flow
- Status: [ ] Pass / [ ] Fail
- Claim ID: ___
- Amount: ___
- Notes: ___

### TEST 5: Pre-Approval Flow
- Status: [ ] Pass / [ ] Fail
- Pre-Auth ID: ___
- Notes: ___

### Overall Result
- [ ] All tests passed
- [ ] Some tests failed
- [ ] Ready for production
```

---

## 🎯 الخطوة التالية

### بعد تشغيل البيئة

1. ✅ تنفيذ SQL لإنشاء بيانات اختبارية
2. ✅ تشغيل `barcode-test.sh`
3. ✅ تسجيل النتائج
4. ✅ التأكد من معايير النجاح
5. ✅ إنشاء تقرير نهائي

---

## 📊 الحالة الحالية

| المتطلب | الحالة |
|---------|--------|
| **PostgreSQL** | ⏸️ يحتاج تشغيل |
| **Backend** | ⏸️ يحتاج تشغيل |
| **Test Data** | ⏸️ يحتاج إنشاء |
| **Test Scripts** | ✅ جاهز |
| **API Endpoints** | ✅ موجودة |

---

<div align="center">

**🔄 جاهز للاختبار**

**يتطلب تشغيل البيئة أولاً**

---

**الخطوات التالية:**
1. تشغيل PostgreSQL
2. تشغيل Backend
3. إنشاء بيانات اختبارية
4. تنفيذ الاختبارات

</div>
