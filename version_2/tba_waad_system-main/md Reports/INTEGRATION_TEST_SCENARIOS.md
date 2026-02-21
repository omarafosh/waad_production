# 🧪 سيناريوهات الاختبار التكاملي

**Date:** 2025-12-31  
**Module:** Full System Integration Tests  
**Status:** Ready for Execution

---

## 🎯 الهدف

التحقق من أن جميع مكونات النظام تعمل معاً بشكل صحيح:
- Backend APIs ✅
- Frontend UI ✅
- Database Integration ✅
- State Machines ✅
- Cost Calculations ✅
- RBAC & Permissions ✅

---

## 📋 متطلبات الاختبار

### Environment Setup
```bash
# Backend
cd backend
mvn clean install
mvn spring-boot:run
# Expected: Server running on http://localhost:8080

# Frontend
cd frontend
yarn install
yarn start
# Expected: App running on http://localhost:3000
```

### Test User Credentials
```json
{
  "SUPER_ADMIN": {
    "username": "admin",
    "password": "admin123",
    "roles": ["SUPER_ADMIN"]
  },
  "REVIEWER": {
    "username": "reviewer",
    "password": "review123",
    "roles": ["REVIEWER"]
  },
  "EMPLOYER": {
    "username": "employer",
    "password": "emp123",
    "roles": ["EMPLOYER"]
  }
}
```

### Base URLs
```bash
API_BASE_URL="http://localhost:8080/api"
FRONTEND_URL="http://localhost:3000"
```

---

## 📖 سيناريو 1: إنشاء عضو جديد

### الهدف
التحقق من إمكانية إنشاء عضو جديد مع جميع البيانات المطلوبة.

### المتطلبات الأولية
- ✅ Employer موجود في النظام
- ✅ BenefitPolicy موجودة
- ✅ User مُسجل دخول بصلاحيات `MANAGE_MEMBERS`

### الخطوات التفصيلية

#### 1.1 تسجيل الدخول
```bash
# Login as EMPLOYER
curl -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "employer",
    "password": "emp123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "employer",
      "roles": ["EMPLOYER"]
    }
  }
}
```

**Verification:**
- ✅ Status Code: 200
- ✅ Token present in response
- ✅ Save token for subsequent requests: `TOKEN="..."`

---

#### 1.2 الحصول على Employers
```bash
curl -X GET "${API_BASE_URL}/employers" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nameArabic": "شركة الواحة للتجارة",
      "nameEnglish": "Alwaha Trading Company",
      "commercialRegistration": "CR-123456"
    }
  ]
}
```

**Verification:**
- ✅ Save Employer ID: `EMPLOYER_ID=1`

---

#### 1.3 الحصول على BenefitPolicies
```bash
curl -X GET "${API_BASE_URL}/benefit-policies" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "name": "الباقة الأساسية",
      "code": "BASIC-2025",
      "active": true
    }
  ]
}
```

**Verification:**
- ✅ Save BenefitPolicy ID: `BENEFIT_POLICY_ID=101`

---

#### 1.4 إنشاء Member جديد
```bash
curl -X POST "${API_BASE_URL}/members" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "civilId": "12345678901234",
    "fullNameArabic": "أحمد محمد علي",
    "fullNameEnglish": "Ahmed Mohammed Ali",
    "dateOfBirth": "1990-01-15",
    "gender": "MALE",
    "phoneNumber": "+218911234567",
    "email": "ahmed.ali@example.com",
    "employerId": 1,
    "benefitPolicyId": 101,
    "nationalId": "LY-12345678901234",
    "passportNumber": "P123456",
    "address": "طرابلس، شارع الجمهورية",
    "city": "طرابلس",
    "country": "Libya"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Member created successfully",
  "data": {
    "id": 501,
    "civilId": "12345678901234",
    "fullNameArabic": "أحمد محمد علي",
    "fullNameEnglish": "Ahmed Mohammed Ali",
    "dateOfBirth": "1990-01-15",
    "age": 35,
    "gender": "MALE",
    "phoneNumber": "+218911234567",
    "email": "ahmed.ali@example.com",
    "employerId": 1,
    "employerName": "شركة الواحة للتجارة",
    "benefitPolicyId": 101,
    "benefitPolicyName": "الباقة الأساسية",
    "active": true,
    "createdAt": "2025-12-31T10:00:00",
    "createdBy": "employer"
  }
}
```

**Verification:**
- ✅ Status Code: 201
- ✅ Member ID present: `MEMBER_ID=501`
- ✅ All fields populated correctly
- ✅ Age calculated: 35
- ✅ Active status: true

---

#### 1.5 التحقق في Frontend

**Navigate to:**
```
http://localhost:3000/members/501
```

**Expected UI:**
- ✅ Member details displayed
- ✅ Employer name shown
- ✅ BenefitPolicy shown
- ✅ Active badge displayed
- ✅ Edit button available

**Screenshot:** `screenshots/member-501-view.png`

---

### ملخص السيناريو 1
```
✅ Login successful
✅ Employer fetched
✅ BenefitPolicy fetched
✅ Member created: ID=501
✅ Frontend displays correctly
```

---

## 📖 سيناريو 2: إنشاء موافقة مسبقة

### الهدف
إنشاء PreAuthorization للعضو المُنشأ في السيناريو 1.

### المتطلبات الأولية
- ✅ Member ID=501 موجود
- ✅ Provider موجود
- ✅ Medical Services موجودة

### الخطوات التفصيلية

#### 2.1 الحصول على Providers
```bash
curl -X GET "${API_BASE_URL}/providers" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 201,
      "nameArabic": "مستشفى الواحة الطبي",
      "nameEnglish": "Alwaha Medical Hospital",
      "providerCode": "PROV-001"
    }
  ]
}
```

**Verification:**
- ✅ Save Provider ID: `PROVIDER_ID=201`

---

#### 2.2 الحصول على Medical Services
```bash
curl -X GET "${API_BASE_URL}/medical-services" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 301,
      "code": "MED-001",
      "nameArabic": "فحص طبي شامل",
      "nameEnglish": "Comprehensive Medical Examination",
      "price": 500.00
    }
  ]
}
```

**Verification:**
- ✅ Save Service ID: `SERVICE_ID=301`

---

#### 2.3 إنشاء PreAuthorization
```bash
curl -X POST "${API_BASE_URL}/pre-authorizations" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 501,
    "providerId": 201,
    "diagnosis": "فحص طبي دوري",
    "priority": "ROUTINE",
    "requestedServices": [
      {
        "medicalServiceId": 301,
        "quantity": 1,
        "requestedPrice": 500.00
      }
    ],
    "requestedAmount": 500.00,
    "notes": "فحص دوري سنوي"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "PreAuthorization created successfully",
  "data": {
    "id": 701,
    "referenceNumber": "PA-20251231-0001",
    "memberId": 501,
    "memberFullNameArabic": "أحمد محمد علي",
    "providerId": 201,
    "providerName": "مستشفى الواحة الطبي",
    "diagnosis": "فحص طبي دوري",
    "priority": "ROUTINE",
    "requestedAmount": 500.00,
    "approvedAmount": null,
    "status": "PENDING",
    "statusLabel": "قيد الانتظار",
    "expiryDate": "2026-01-30",
    "services": [
      {
        "id": 1,
        "medicalServiceCode": "MED-001",
        "serviceNameArabic": "فحص طبي شامل",
        "quantity": 1,
        "requestedPrice": 500.00
      }
    ],
    "createdAt": "2025-12-31T10:05:00",
    "createdBy": "employer"
  }
}
```

**Verification:**
- ✅ Status Code: 201
- ✅ PreAuth ID: `PREAUTH_ID=701`
- ✅ Reference Number: `PA-20251231-0001`
- ✅ Status: `PENDING`
- ✅ Expiry Date: 30 days from now

---

#### 2.4 الموافقة على PreAuthorization (as REVIEWER)
```bash
# Login as REVIEWER
curl -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "reviewer",
    "password": "review123"
  }'
# Save new token: REVIEWER_TOKEN="..."

# Approve PreAuth
curl -X POST "${API_BASE_URL}/pre-authorizations/701/approve" \
  -H "Authorization: Bearer ${REVIEWER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedAmount": 500.00,
    "approvedServices": [
      {
        "medicalServiceId": 301,
        "approvedQuantity": 1,
        "approvedPrice": 500.00
      }
    ],
    "notes": "تمت الموافقة - فحص دوري"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "PreAuthorization approved successfully",
  "data": {
    "id": 701,
    "referenceNumber": "PA-20251231-0001",
    "status": "APPROVED",
    "statusLabel": "معتمد",
    "approvedAmount": 500.00,
    "approvedBy": "reviewer",
    "approvedAt": "2025-12-31T10:10:00"
  }
}
```

**Verification:**
- ✅ Status changed: `PENDING` → `APPROVED`
- ✅ Approved amount: 500.00
- ✅ Approved by: reviewer
- ✅ Timestamp recorded

---

#### 2.5 التحقق من Status Workflow

**Navigate to Frontend:**
```
http://localhost:3000/pre-approvals/701
```

**Expected UI:**
- ✅ Status badge: "معتمد" (green)
- ✅ Approved amount displayed
- ✅ Reviewer name shown
- ✅ Timeline showing: PENDING → APPROVED

**Screenshot:** `screenshots/preauth-701-approved.png`

---

#### 2.6 التحقق من Audit Trail

**Navigate to:**
```
http://localhost:3000/pre-approvals/701/audit
```

**Expected Audit Entries:**
1. ✅ CREATE - employer - 2025-12-31 10:05:00
2. ✅ APPROVE - reviewer - 2025-12-31 10:10:00
   - Old Value: status=PENDING
   - New Value: status=APPROVED

**Screenshot:** `screenshots/preauth-701-audit.png`

---

### ملخص السيناريو 2
```
✅ Provider fetched: ID=201
✅ Service fetched: ID=301
✅ PreAuth created: ID=701, Status=PENDING
✅ PreAuth approved: Status=APPROVED
✅ Workflow validated: PENDING → APPROVED
✅ Audit trail recorded: 2 entries
```

---

## 📖 سيناريو 3: إنشاء مطالبة مربوطة بالموافقة المسبقة

### الهدف
إنشاء Claim مرتبطة بالـ PreAuthorization المعتمدة.

### المتطلبات الأولية
- ✅ Member ID=501
- ✅ PreAuth ID=701 (APPROVED)

### الخطوات التفصيلية

#### 3.1 إنشاء Claim مع PreAuth
```bash
curl -X POST "${API_BASE_URL}/claims" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 501,
    "preApprovalId": 701,
    "providerName": "مستشفى الواحة الطبي",
    "doctorName": "د. محمد أحمد",
    "diagnosis": "فحص طبي دوري",
    "visitDate": "2025-12-31",
    "requestedAmount": 500.00,
    "attachments": [
      {
        "fileName": "medical-report.pdf",
        "fileUrl": "https://storage.example.com/reports/001.pdf",
        "fileType": "medical_report"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Claim created successfully",
  "data": {
    "id": 801,
    "claimNumber": "CLM-20251231-0001",
    "memberId": 501,
    "memberFullNameArabic": "أحمد محمد علي",
    "preApprovalId": 701,
    "preApprovalReferenceNumber": "PA-20251231-0001",
    "preApprovalStatus": "APPROVED",
    "providerName": "مستشفى الواحة الطبي",
    "doctorName": "د. محمد أحمد",
    "diagnosis": "فحص طبي دوري",
    "visitDate": "2025-12-31",
    "requestedAmount": 500.00,
    "approvedAmount": null,
    "status": "DRAFT",
    "statusLabel": "مسودة",
    "attachmentsCount": 1,
    "createdAt": "2025-12-31T10:15:00",
    "createdBy": "employer"
  }
}
```

**Verification:**
- ✅ Status Code: 201
- ✅ Claim ID: `CLAIM_ID=801`
- ✅ PreAuth linked: ID=701
- ✅ Status: `DRAFT`
- ✅ Attachment count: 1

---

#### 3.2 Submit Claim للمراجعة
```bash
curl -X POST "${API_BASE_URL}/claims/801/submit" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Claim submitted successfully",
  "data": {
    "id": 801,
    "status": "SUBMITTED",
    "statusLabel": "مقدم",
    "submittedAt": "2025-12-31T10:16:00"
  }
}
```

**Verification:**
- ✅ Status changed: `DRAFT` → `SUBMITTED`

---

#### 3.3 Start Review (as REVIEWER)
```bash
curl -X POST "${API_BASE_URL}/claims/801/start-review" \
  -H "Authorization: Bearer ${REVIEWER_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Claim review started",
  "data": {
    "id": 801,
    "status": "UNDER_REVIEW",
    "statusLabel": "قيد المراجعة",
    "reviewedBy": "reviewer",
    "reviewStartedAt": "2025-12-31T10:17:00"
  }
}
```

**Verification:**
- ✅ Status changed: `SUBMITTED` → `UNDER_REVIEW`

---

#### 3.4 Approve Claim مع Cost Calculation
```bash
curl -X POST "${API_BASE_URL}/claims/801/approve" \
  -H "Authorization: Bearer ${REVIEWER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedAmount": 500.00,
    "reviewerComment": "تمت الموافقة - الفحص مطابق للموافقة المسبقة"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Claim approved successfully",
  "data": {
    "id": 801,
    "status": "APPROVED",
    "statusLabel": "موافق عليه",
    "requestedAmount": 500.00,
    "approvedAmount": 500.00,
    "differenceAmount": 0.00,
    
    "costBreakdown": {
      "deductibleApplied": 50.00,
      "coPayPercent": 10,
      "patientCoPay": 45.00,
      "netProviderAmount": 405.00,
      "insuranceShare": 405.00
    },
    
    "reviewerComment": "تمت الموافقة - الفحص مطابق للموافقة المسبقة",
    "approvedBy": "reviewer",
    "approvedAt": "2025-12-31T10:18:00"
  }
}
```

**Verification:**
- ✅ Status changed: `UNDER_REVIEW` → `APPROVED`
- ✅ Cost breakdown calculated:
  - Deductible: 50.00
  - CoPay (10%): 45.00
  - Provider gets: 405.00
  - Insurance pays: 405.00

---

#### 3.5 Settle Claim (Payment Completed)
```bash
curl -X POST "${API_BASE_URL}/claims/801/settle" \
  -H "Authorization: Bearer ${REVIEWER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "settlementAmount": 405.00,
    "settlementDate": "2025-12-31",
    "paymentMethod": "BANK_TRANSFER",
    "paymentReference": "TRX-20251231-001",
    "notes": "تمت التسوية - تحويل بنكي"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Claim settled successfully",
  "data": {
    "id": 801,
    "status": "SETTLED",
    "statusLabel": "تمت التسوية",
    "settlementAmount": 405.00,
    "settlementDate": "2025-12-31",
    "paymentMethod": "BANK_TRANSFER",
    "paymentReference": "TRX-20251231-001",
    "settledAt": "2025-12-31T10:20:00"
  }
}
```

**Verification:**
- ✅ Status changed: `APPROVED` → `SETTLED` (Terminal)
- ✅ Settlement amount: 405.00
- ✅ Payment reference recorded

---

#### 3.6 التحقق من Full Workflow

**Navigate to Frontend:**
```
http://localhost:3000/claims/801
```

**Expected UI:**
- ✅ Status badge: "تمت التسوية" (blue)
- ✅ Timeline showing: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SETTLED
- ✅ Cost breakdown displayed:
  - Requested: 500.00 ر.س
  - Approved: 500.00 ر.س
  - Deductible: 50.00 ر.س
  - CoPay: 45.00 ر.س
  - Provider receives: 405.00 ر.س
- ✅ PreAuth chip clickable (navigates to /pre-approvals/701)
- ✅ Payment reference shown

**Screenshot:** `screenshots/claim-801-settled.png`

---

### ملخص السيناريو 3
```
✅ Claim created: ID=801, linked to PreAuth=701
✅ Workflow: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SETTLED
✅ Cost calculation: Deductible + CoPay + Provider Share
✅ Settlement completed: 405.00 ر.س
✅ Payment tracked: TRX-20251231-001
```

---

## 📖 سيناريو 4: التحقق من Audit Trail

### الهدف
التحقق من تسجيل جميع الإجراءات في Audit Log.

### الخطوات التفصيلية

#### 4.1 Claim Audit Trail
```bash
curl -X GET "${API_BASE_URL}/claims/801/audit" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "claimId": 801,
      "action": "CREATE",
      "changedBy": "employer",
      "changeDate": "2025-12-31T10:15:00",
      "notes": "Claim created"
    },
    {
      "id": 2,
      "claimId": 801,
      "action": "SUBMIT",
      "changedBy": "employer",
      "changeDate": "2025-12-31T10:16:00",
      "fieldName": "status",
      "oldValue": "DRAFT",
      "newValue": "SUBMITTED"
    },
    {
      "id": 3,
      "claimId": 801,
      "action": "START_REVIEW",
      "changedBy": "reviewer",
      "changeDate": "2025-12-31T10:17:00",
      "fieldName": "status",
      "oldValue": "SUBMITTED",
      "newValue": "UNDER_REVIEW"
    },
    {
      "id": 4,
      "claimId": 801,
      "action": "APPROVE",
      "changedBy": "reviewer",
      "changeDate": "2025-12-31T10:18:00",
      "fieldName": "status",
      "oldValue": "UNDER_REVIEW",
      "newValue": "APPROVED"
    },
    {
      "id": 5,
      "claimId": 801,
      "action": "SETTLE",
      "changedBy": "reviewer",
      "changeDate": "2025-12-31T10:20:00",
      "fieldName": "status",
      "oldValue": "APPROVED",
      "newValue": "SETTLED"
    }
  ]
}
```

**Verification:**
- ✅ 5 audit entries recorded
- ✅ All status transitions tracked
- ✅ User & timestamp for each action

---

#### 4.2 PreAuth Audit Trail
```bash
curl -X GET "${API_BASE_URL}/pre-authorizations/701/history" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "preAuthorizationId": 701,
      "referenceNumber": "PA-20251231-0001",
      "action": "CREATE",
      "changedBy": "employer",
      "changeDate": "2025-12-31T10:05:00"
    },
    {
      "id": 2,
      "preAuthorizationId": 701,
      "action": "APPROVE",
      "changedBy": "reviewer",
      "changeDate": "2025-12-31T10:10:00",
      "fieldName": "status",
      "oldValue": "PENDING",
      "newValue": "APPROVED"
    }
  ]
}
```

**Verification:**
- ✅ 2 audit entries
- ✅ CREATE + APPROVE tracked

---

### ملخص السيناريو 4
```
✅ Claim audit: 5 entries (CREATE → SETTLE)
✅ PreAuth audit: 2 entries (CREATE → APPROVE)
✅ All transitions tracked with user & timestamp
```

---

## 📖 سيناريو 5: التحقق من الصلاحيات (RBAC)

### الهدف
التحقق من أن كل دور يصل فقط للموارد المسموح له بها.

### الخطوات التفصيلية

#### 5.1 EMPLOYER - يستطيع إنشاء ولا يستطيع الموافقة
```bash
# Login as EMPLOYER
TOKEN_EMPLOYER="..."

# ✅ Can CREATE Member
curl -X POST "${API_BASE_URL}/members" \
  -H "Authorization: Bearer ${TOKEN_EMPLOYER}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: 201 Created

# ✅ Can CREATE PreAuth
curl -X POST "${API_BASE_URL}/pre-authorizations" \
  -H "Authorization: Bearer ${TOKEN_EMPLOYER}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: 201 Created

# ❌ CANNOT Approve PreAuth
curl -X POST "${API_BASE_URL}/pre-authorizations/701/approve" \
  -H "Authorization: Bearer ${TOKEN_EMPLOYER}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: 403 Forbidden
```

**Verification:**
- ✅ EMPLOYER can create
- ❌ EMPLOYER cannot approve

---

#### 5.2 REVIEWER - يستطيع الموافقة ولا يستطيع التعديل بعد التسوية
```bash
# Login as REVIEWER
TOKEN_REVIEWER="..."

# ✅ Can APPROVE PreAuth
curl -X POST "${API_BASE_URL}/pre-authorizations/701/approve" \
  -H "Authorization: Bearer ${TOKEN_REVIEWER}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: 200 OK

# ✅ Can APPROVE Claim
curl -X POST "${API_BASE_URL}/claims/801/approve" \
  -H "Authorization: Bearer ${TOKEN_REVIEWER}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: 200 OK

# ❌ CANNOT Edit SETTLED Claim
curl -X PUT "${API_BASE_URL}/claims/801" \
  -H "Authorization: Bearer ${TOKEN_REVIEWER}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: 400 Bad Request (Terminal status)
```

**Verification:**
- ✅ REVIEWER can approve
- ❌ Cannot edit terminal status

---

#### 5.3 SUPER_ADMIN - يستطيع كل شيء
```bash
# Login as SUPER_ADMIN
TOKEN_ADMIN="..."

# ✅ Can do EVERYTHING
curl -X POST "${API_BASE_URL}/members" -H "Authorization: Bearer ${TOKEN_ADMIN}" -d '{...}'
curl -X POST "${API_BASE_URL}/pre-authorizations" -H "Authorization: Bearer ${TOKEN_ADMIN}" -d '{...}'
curl -X POST "${API_BASE_URL}/claims" -H "Authorization: Bearer ${TOKEN_ADMIN}" -d '{...}'
curl -X POST "${API_BASE_URL}/claims/801/approve" -H "Authorization: Bearer ${TOKEN_ADMIN}" -d '{...}'
curl -X DELETE "${API_BASE_URL}/claims/801" -H "Authorization: Bearer ${TOKEN_ADMIN}"
# All Expected: 2xx Success
```

**Verification:**
- ✅ SUPER_ADMIN full access

---

### ملخص السيناريو 5
```
✅ EMPLOYER: CREATE only
✅ REVIEWER: APPROVE + REVIEW
✅ SUPER_ADMIN: All permissions
✅ RBAC working correctly
```

---

## 📖 سيناريو 6: لوحة التحليلات (Dashboard)

### الهدف
التحقق من أن Dashboard يعرض الإحصائيات والـ Charts بشكل صحيح.

### الخطوات التفصيلية

#### 6.1 PreAuth Dashboard Stats
```bash
curl -X GET "${API_BASE_URL}/pre-authorizations/dashboard/stats" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 1,
    "totalApproved": 1,
    "totalRejected": 0,
    "totalPending": 0,
    "approvalRate": 100.0,
    "totalRequestedAmount": 500.00,
    "totalApprovedAmount": 500.00,
    "averageRequestedAmount": 500.00,
    "requestsChangePercent": 0.0,
    "approvedChangePercent": 0.0
  }
}
```

**Verification:**
- ✅ Total: 1 request
- ✅ Approved: 1
- ✅ Approval rate: 100%

---

#### 6.2 Status Distribution
```bash
curl -X GET "${API_BASE_URL}/pre-authorizations/dashboard/status-distribution" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "status": "APPROVED",
      "count": 1
    }
  ]
}
```

**Verification:**
- ✅ 1 APPROVED PreAuth

---

#### 6.3 Frontend Dashboard
**Navigate to:**
```
http://localhost:3000/pre-approvals/dashboard
```

**Expected UI:**
- ✅ Stats Cards:
  - إجمالي الطلبات: 1
  - المعتمدة: 1
  - المرفوضة: 0
  - نسبة الموافقة: 100%
- ✅ Pie Chart: 1 slice (APPROVED)
- ✅ High Priority Queue: Empty (no urgent)
- ✅ Expiring Soon: Empty (not expiring yet)
- ✅ Trends: 1 data point (today)
- ✅ Top Providers: 1 provider (مستشفى الواحة)
- ✅ Recent Activity: 2 actions (CREATE, APPROVE)

**Screenshot:** `screenshots/preauth-dashboard.png`

---

#### 6.4 Claims Dashboard (if available)
```bash
curl -X GET "${API_BASE_URL}/claims/dashboard/stats" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalClaims": 1,
    "totalApproved": 1,
    "totalSettled": 1,
    "totalAmount": 500.00,
    "approvedAmount": 500.00,
    "settledAmount": 405.00
  }
}
```

**Verification:**
- ✅ 1 claim settled
- ✅ Settlement amount: 405.00

---

### ملخص السيناريو 6
```
✅ PreAuth Stats accurate
✅ Status distribution correct
✅ Dashboard charts rendering
✅ Recent activity showing
✅ All widgets functional
```

---

## 📊 ملخص جميع السيناريوهات

### السيناريو 1: Member Creation
```
✅ Member created: ID=501
✅ BenefitPolicy linked
✅ Frontend displays correctly
```

### السيناريو 2: PreAuthorization
```
✅ PreAuth created: ID=701
✅ Workflow: PENDING → APPROVED
✅ Audit trail: 2 entries
```

### السيناريو 3: Claim with PreAuth
```
✅ Claim created: ID=801
✅ Linked to PreAuth: 701
✅ Workflow: DRAFT → SETTLED (5 steps)
✅ Cost calculation: Deductible + CoPay
✅ Settlement: 405.00 ر.س
```

### السيناريو 4: Audit Trails
```
✅ Claim audit: 5 entries
✅ PreAuth audit: 2 entries
✅ All transitions tracked
```

### السيناريو 5: RBAC
```
✅ EMPLOYER: Create only
✅ REVIEWER: Approve rights
✅ SUPER_ADMIN: Full access
```

### السيناريو 6: Dashboard
```
✅ Stats accurate
✅ Charts rendering
✅ All widgets working
```

---

## 🎯 معايير النجاح

### Backend APIs
- ✅ All endpoints responding
- ✅ Status codes correct
- ✅ Data validation working
- ✅ State machines enforced
- ✅ Cost calculations accurate

### Frontend UI
- ✅ All pages rendering
- ✅ Forms submitting
- ✅ Navigation working
- ✅ Charts displaying
- ✅ No console errors

### Integration
- ✅ PreAuth → Claim linking
- ✅ Member → BenefitPolicy
- ✅ Audit trails complete
- ✅ RBAC enforced
- ✅ Workflow validated

---

## 📸 Screenshots Checklist

Required screenshots:
- [ ] `member-501-view.png` - Member details page
- [ ] `preauth-701-approved.png` - Approved PreAuth
- [ ] `preauth-701-audit.png` - PreAuth audit trail
- [ ] `claim-801-settled.png` - Settled claim with cost breakdown
- [ ] `preauth-dashboard.png` - Dashboard with all widgets
- [ ] `rbac-403-error.png` - Permission denied example

---

## 🐛 Known Issues / Edge Cases

### To Test
1. ⏳ What happens if PreAuth expires before Claim submission?
2. ⏳ Can Claim amount exceed PreAuth approved amount?
3. ⏳ What if Member's BenefitPolicy changes mid-claim?
4. ⏳ Can multiple Claims link to same PreAuth?
5. ⏳ What if Provider is not in network?

---

## 📝 Test Results Template

```markdown
## Test Execution Report

**Date:** 2025-12-31  
**Tester:** [Your Name]  
**Environment:** Local Dev

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Member Creation | ✅ Pass | All fields validated |
| 2. PreAuthorization | ✅ Pass | Workflow correct |
| 3. Claim with PreAuth | ✅ Pass | Cost calc accurate |
| 4. Audit Trail | ✅ Pass | All tracked |
| 5. RBAC | ✅ Pass | Permissions work |
| 6. Dashboard | ✅ Pass | Charts render |

**Overall:** ✅ All tests passed
```

---

**Next Step:** Execute scenarios and create `INTEGRATION_TEST_REPORT.md` with results.
