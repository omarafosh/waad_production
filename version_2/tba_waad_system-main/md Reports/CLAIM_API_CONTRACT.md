# 📜 Claim Management API Contract

**Module:** Claims (المطالبات)  
**Status:** ✅ Backend Complete - DTOs Cleaned (2025-12-31)  
**Version:** 1.0.0  
**Last Updated:** 2025-12-31

---

## 🎯 Purpose

نظام إدارة المطالبات الطبية مع دورة حياة كاملة:
- ✅ إنشاء وتحديث المطالبات (Create/Update Claims)
- ✅ دورة حياة الحالات (Status Workflow) - State Machine
- ✅ حساب التكاليف التلقائي (Auto Cost Calculation)
- ✅ التكامل مع الموافقات المسبقة (PreAuthorization Integration)
- ✅ التكامل مع سياسات المنافع (BenefitPolicy Integration)
- ✅ عملية التسوية (Settlement Process)

---

## 📐 Architecture

```
Provider → Claim Creation → State Machine Validation → Cost Calculation
                                      ↓
           DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → SETTLED
                                      ↓
            Cost Breakdown: Deductible + CoPay + Insurance Share
                                      ↓
                            Settlement & Payment
```

---

## 🔄 Status Workflow (State Machine)

### Status Lifecycle

```
┌────────┐
│ DRAFT  │ ─── Initial state for newly created claims
└────┬───┘
     │ submit()
     ▼
┌────────────┐
│ SUBMITTED  │ ─── Claim submitted for review
└─────┬──────┘
      │ startReview()
      ▼
┌──────────────┐       ┌───────────────────┐
│ UNDER_REVIEW │──────▶│ RETURNED_FOR_INFO │ (needs more info)
└──────┬───────┘       └─────────┬─────────┘
       │                         │ resubmit()
       │ ◄───────────────────────┘
       │
  ┌────┴────┐
  ▼         ▼
┌──────────┐  ┌──────────┐
│ APPROVED │  │ REJECTED │ ─── Terminal (requires comment)
└────┬─────┘  └──────────┘
     │
     │ settle()
     ▼
┌──────────┐
│ SETTLED  │ ─── Payment completed (Terminal)
└──────────┘
```

### Status Details

| Status | Arabic | Description | Editable | Terminal |
|--------|--------|-------------|----------|----------|
| `DRAFT` | مسودة | Initial draft state | ✅ Yes | ❌ No |
| `SUBMITTED` | مقدم | Submitted for review | ❌ No | ❌ No |
| `UNDER_REVIEW` | قيد المراجعة | Being reviewed | ❌ No | ❌ No |
| `RETURNED_FOR_INFO` | إعادة للاستكمال | Needs more info | ✅ Yes | ❌ No |
| `APPROVED` | موافق عليه | Approved for payment | ❌ No | ❌ No |
| `REJECTED` | مرفوض | Rejected (final) | ❌ No | ✅ Yes |
| `SETTLED` | تمت التسوية | Payment completed (final) | ❌ No | ✅ Yes |

### Allowed Transitions

| From | To | Required Roles | Notes |
|------|----|--------------|----|
| DRAFT | SUBMITTED | SUPER_ADMIN, EMPLOYER, INSURANCE | Submit for review |
| SUBMITTED | UNDER_REVIEW | SUPER_ADMIN, INSURANCE, REVIEWER | Start review |
| UNDER_REVIEW | APPROVED | SUPER_ADMIN, INSURANCE, REVIEWER | Approve with amount |
| UNDER_REVIEW | REJECTED | SUPER_ADMIN, INSURANCE, REVIEWER | Reject with reason |
| UNDER_REVIEW | RETURNED_FOR_INFO | SUPER_ADMIN, REVIEWER | Request more info |
| RETURNED_FOR_INFO | SUBMITTED | SUPER_ADMIN, EMPLOYER, INSURANCE | Resubmit |
| APPROVED | SETTLED | SUPER_ADMIN, INSURANCE | Complete payment |

---

## 🔢 Auto-Code Generation

### Format
```
CLM-YYYYMMDD-XXXX
```

### Examples
- `CLM-20251231-0001` - First claim of the day
- `CLM-20251231-0042` - 42nd claim of the day

### Generation Rules
1. **Prefix:** Always `CLM-`
2. **Date:** Current date in YYYYMMDD format
3. **Sequence:** 4-digit zero-padded sequential number (resets daily)
4. **Uniqueness:** Guaranteed unique via database constraint

---

## 💰 Cost Calculation System

### Cost Components

```
RequestedAmount = PatientCoPay + NetProviderAmount
```

#### 1. Deductible (الخصم السنوي)
- Fixed amount patient pays before insurance kicks in
- Tracked annually per member
- Default: 500.00 LYD if not specified in policy

#### 2. Co-Pay (نسبة المشاركة)
- Percentage of claim amount patient pays
- Varies by network type:
  - **In-Network:** 20% (default)
  - **Out-of-Network:** 40% (default)

#### 3. Out-of-Pocket Maximum (الحد الأقصى للمصاريف)
- Maximum amount patient pays per year
- After reaching this, insurance covers 100%
- Default: 5000.00 LYD

### Calculation Flow

```
STEP 1: Apply Deductible
  deductibleApplied = min(requestedAmount, remainingDeductible)
  afterDeductible = requestedAmount - deductibleApplied

STEP 2: Apply Co-Pay
  coPayAmount = afterDeductible × (coPayPercent / 100)
  insuranceAmount = afterDeductible - coPayAmount

STEP 3: Check Out-of-Pocket Max
  totalPatientResponsibility = deductibleApplied + coPayAmount
  if totalPatientResponsibility > remainingOutOfPocket:
    excess = totalPatientResponsibility - remainingOutOfPocket
    totalPatientResponsibility = remainingOutOfPocket
    insuranceAmount += excess

STEP 4: Final Validation
  patientCoPay = totalPatientResponsibility
  netProviderAmount = insuranceAmount
  verify: requestedAmount = patientCoPay + netProviderAmount
```

### Example Calculation

**Scenario:**
- Requested Amount: 1000.00 LYD
- Annual Deductible: 500.00 LYD
- Deductible Met YTD: 200.00 LYD
- Co-Pay %: 20% (In-Network)
- Out-of-Pocket Max: 5000.00 LYD
- Out-of-Pocket Spent: 800.00 LYD

**Calculation:**
```
1. Remaining Deductible = 500 - 200 = 300 LYD
2. Deductible Applied = min(1000, 300) = 300 LYD
3. After Deductible = 1000 - 300 = 700 LYD
4. Co-Pay Amount = 700 × 20% = 140 LYD
5. Insurance Amount = 700 - 140 = 560 LYD
6. Patient Co-Pay = 300 + 140 = 440 LYD
7. Net Provider Amount = 560 LYD

Verification: 1000 = 440 + 560 ✅
```

---

## 🔌 API Endpoints

### Base URL
```
/api/claims
```

---

### 1. Create Claim

**Endpoint:** `POST /api/claims`  
**Permission:** `MANAGE_CLAIMS` or `SUPER_ADMIN`  
**Description:** إنشاء مطالبة جديدة بحالة DRAFT

#### Request Body (ClaimCreateDto)

```json
{
  "memberId": 123,
  "benefitPackageId": 456,
  "preApprovalId": 789,
  "providerName": "مستشفى الواحة",
  "doctorName": "د. أحمد محمد",
  "diagnosis": "التهاب الحلق الحاد",
  "visitDate": "2025-01-15",
  "requestedAmount": 500.00,
  "lines": [
    {
      "serviceCode": "CONS-001",
      "description": "استشارة طبية",
      "quantity": 1,
      "unitPrice": 100.00,
      "totalPrice": 100.00
    },
    {
      "serviceCode": "MED-042",
      "description": "دواء مضاد حيوي",
      "quantity": 2,
      "unitPrice": 200.00,
      "totalPrice": 400.00
    }
  ],
  "attachments": [
    {
      "fileName": "medical_report.pdf",
      "fileUrl": "/uploads/claims/medical_report.pdf",
      "fileType": "MEDICAL_REPORT"
    }
  ]
}
```

**Important Notes:**
- ✅ `memberId` - Required (Member must exist)
- ✅ `benefitPackageId` - Required (from Member.benefitPolicy)
- ❌ **REMOVED:** `insuranceCompanyId` (auto-resolved from Member)
- ❌ **REMOVED:** `insurancePolicyId` (no longer used)
- ⚠️ `preApprovalId` - Optional (link to PreAuthorization if exists)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Claim created successfully",
  "data": {
    "id": 901,
    "memberId": 123,
    "memberFullNameArabic": "علي أحمد محمد",
    "memberCivilId": "12345678901234",
    "insuranceCompanyName": "شركة التأمين الطبي الليبية",
    "insuranceCompanyCode": "WAAD-001",
    "benefitPackageId": 456,
    "benefitPackageName": "الباقة الأساسية",
    "benefitPackageCode": "BASIC-2025",
    "preApprovalId": 789,
    "preApprovalStatus": "APPROVED",
    "providerName": "مستشفى الواحة",
    "doctorName": "د. أحمد محمد",
    "diagnosis": "التهاب الحلق الحاد",
    "visitDate": "2025-01-15",
    "requestedAmount": 500.00,
    "approvedAmount": null,
    "differenceAmount": null,
    "patientCoPay": null,
    "netProviderAmount": null,
    "coPayPercent": null,
    "deductibleApplied": null,
    "status": "DRAFT",
    "statusLabel": "مسودة",
    "reviewerComment": null,
    "reviewedAt": null,
    "serviceCount": 2,
    "attachmentsCount": 1,
    "lines": [...],
    "attachments": [...],
    "active": true,
    "createdAt": "2025-12-31T10:30:00",
    "updatedAt": "2025-12-31T10:30:00",
    "createdBy": "employer.user",
    "updatedBy": "employer.user"
  }
}
```

---

### 2. Update Claim

**Endpoint:** `PUT /api/claims/{id}`  
**Permission:** `MANAGE_CLAIMS` or `SUPER_ADMIN`  
**Description:** تحديث مطالبة (فقط في حالة DRAFT أو RETURNED_FOR_INFO)

#### Request Body (ClaimUpdateDto)

```json
{
  "providerName": "مستشفى النور",
  "doctorName": "د. فاطمة أحمد",
  "diagnosis": "التهاب الحلق الحاد مع حساسية",
  "visitDate": "2025-01-15",
  "requestedAmount": 600.00,
  "benefitPackageId": 456,
  "preApprovalId": 789,
  "lines": [
    {
      "serviceCode": "CONS-001",
      "description": "استشارة طبية",
      "quantity": 1,
      "unitPrice": 100.00,
      "totalPrice": 100.00
    },
    {
      "serviceCode": "MED-042",
      "description": "دواء مضاد حيوي",
      "quantity": 2,
      "unitPrice": 200.00,
      "totalPrice": 400.00
    },
    {
      "serviceCode": "LAB-010",
      "description": "تحليل دم",
      "quantity": 1,
      "unitPrice": 100.00,
      "totalPrice": 100.00
    }
  ]
}
```

**Business Rules:**
- ❌ Cannot update if status is SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, or SETTLED
- ✅ Can update if status is DRAFT or RETURNED_FOR_INFO
- ⚠️ Updating `requestedAmount` recalculates `serviceCount`

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Claim updated successfully",
  "data": {
    "id": 901,
    "requestedAmount": 600.00,
    "serviceCount": 3,
    "status": "DRAFT",
    "updatedAt": "2025-12-31T11:00:00",
    "updatedBy": "employer.user"
  }
}
```

---

### 3. Get Claim by ID

**Endpoint:** `GET /api/claims/{id}`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** استرجاع تفاصيل مطالبة محددة

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Claim retrieved successfully",
  "data": {
    "id": 901,
    "memberId": 123,
    "memberFullNameArabic": "علي أحمد محمد",
    "memberCivilId": "12345678901234",
    "insuranceCompanyName": "شركة التأمين الطبي الليبية",
    "insuranceCompanyCode": "WAAD-001",
    "benefitPackageId": 456,
    "benefitPackageName": "الباقة الأساسية",
    "requestedAmount": 500.00,
    "approvedAmount": 420.00,
    "differenceAmount": 80.00,
    "patientCoPay": 140.00,
    "netProviderAmount": 280.00,
    "coPayPercent": 20.00,
    "deductibleApplied": 80.00,
    "status": "APPROVED",
    "statusLabel": "موافق عليه",
    "reviewerComment": "تمت الموافقة - التغطية القياسية",
    "reviewedAt": "2025-12-31T14:00:00",
    "serviceCount": 2,
    "attachmentsCount": 1,
    "paymentReference": null,
    "settledAt": null,
    "settlementNotes": null,
    "lines": [...],
    "attachments": [...],
    "active": true,
    "createdAt": "2025-12-31T10:30:00",
    "updatedAt": "2025-12-31T14:00:00",
    "createdBy": "employer.user",
    "updatedBy": "reviewer.user"
  }
}
```

---

### 4. List Claims (Paginated)

**Endpoint:** `GET /api/claims`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** قائمة المطالبات مع الفلترة والترتيب

#### Query Parameters

```
?employerId=10&page=1&size=20&sortBy=createdAt&sortDir=desc&search=علي
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `employerId` | - | فلترة حسب جهة العمل (optional) |
| `page` | 1 | رقم الصفحة |
| `size` | 20 | عدد النتائج في الصفحة |
| `sortBy` | createdAt | الحقل المستخدم للترتيب |
| `sortDir` | desc | اتجاه الترتيب (asc/desc) |
| `search` | - | البحث النصي (optional) |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Claims retrieved successfully",
  "data": {
    "items": [
      {
        "id": 901,
        "memberFullNameArabic": "علي أحمد محمد",
        "requestedAmount": 500.00,
        "approvedAmount": 420.00,
        "status": "APPROVED",
        "statusLabel": "موافق عليه",
        "createdAt": "2025-12-31T10:30:00"
      }
    ],
    "total": 150,
    "page": 1,
    "size": 20
  }
}
```

---

### 5. Delete Claim

**Endpoint:** `DELETE /api/claims/{id}`  
**Permission:** `MANAGE_CLAIMS` or `SUPER_ADMIN`  
**Description:** حذف مطالبة (soft delete - sets active=false)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Claim deleted successfully",
  "data": null
}
```

**Business Rules:**
- Soft delete only (sets `active = false`)
- Cannot delete claims in APPROVED or SETTLED status
- Can only delete DRAFT, SUBMITTED, or REJECTED claims

---

### 6. Count Claims

**Endpoint:** `GET /api/claims/count`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** عدد المطالبات

#### Query Parameters

```
?employerId=10
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Claims counted successfully",
  "data": 150
}
```

---

### 7. Search Claims

**Endpoint:** `GET /api/claims/search`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** البحث النصي في المطالبات

#### Query Parameters

```
?employerId=10&query=علي
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Search results retrieved",
  "data": [
    {
      "id": 901,
      "memberFullNameArabic": "علي أحمد محمد",
      "status": "APPROVED",
      "requestedAmount": 500.00
    }
  ]
}
```

---

### 8. Get Claims by Member

**Endpoint:** `GET /api/claims/member/{memberId}`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** جميع المطالبات لعضو محدد

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Member claims retrieved successfully",
  "data": [
    {
      "id": 901,
      "visitDate": "2025-01-15",
      "requestedAmount": 500.00,
      "approvedAmount": 420.00,
      "status": "APPROVED",
      "providerName": "مستشفى الواحة"
    },
    {
      "id": 850,
      "visitDate": "2024-12-10",
      "requestedAmount": 200.00,
      "approvedAmount": 180.00,
      "status": "SETTLED",
      "providerName": "عيادة الأسنان"
    }
  ]
}
```

---

### 9. Get Claims by PreAuthorization

**Endpoint:** `GET /api/claims/pre-approval/{preApprovalId}`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** جميع المطالبات المرتبطة بموافقة مسبقة

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Pre-approval claims retrieved successfully",
  "data": [
    {
      "id": 901,
      "preApprovalId": 789,
      "requestedAmount": 500.00,
      "approvedAmount": 420.00,
      "status": "APPROVED"
    }
  ]
}
```

---

## 🔄 Lifecycle Endpoints

### 10. Submit Claim

**Endpoint:** `POST /api/claims/{id}/submit`  
**Permission:** `MANAGE_CLAIMS` or `SUPER_ADMIN`  
**Description:** تقديم المطالبة للمراجعة  
**Transition:** `DRAFT → SUBMITTED`

#### Request Body

```json
{}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "تم تقديم المطالبة للمراجعة بنجاح",
  "data": {
    "id": 901,
    "status": "SUBMITTED",
    "statusLabel": "مقدم",
    "updatedAt": "2025-12-31T12:00:00"
  }
}
```

**Validations:**
- Claim must be in DRAFT status
- Must have at least 1 service line
- Required attachments must be present (based on service type)

---

### 11. Start Review

**Endpoint:** `POST /api/claims/{id}/start-review`  
**Permission:** `APPROVE_CLAIMS` or `SUPER_ADMIN`  
**Description:** استلام المطالبة للمراجعة  
**Transition:** `SUBMITTED → UNDER_REVIEW`

#### Response (200 OK)

```json
{
  "success": true,
  "message": "تم استلام المطالبة للمراجعة",
  "data": {
    "id": 901,
    "status": "UNDER_REVIEW",
    "statusLabel": "قيد المراجعة",
    "updatedAt": "2025-12-31T13:00:00",
    "updatedBy": "reviewer.user"
  }
}
```

---

### 12. Approve Claim

**Endpoint:** `POST /api/claims/{id}/approve`  
**Permission:** `APPROVE_CLAIMS` or `SUPER_ADMIN`  
**Description:** الموافقة على المطالبة مع حساب التكاليف  
**Transition:** `UNDER_REVIEW → APPROVED`

#### Request Body (ClaimApproveDto)

```json
{
  "approvedAmount": 420.00,
  "notes": "تمت الموافقة - التغطية القياسية",
  "useSystemCalculation": false
}
```

**OR (Auto-Calculation):**

```json
{
  "useSystemCalculation": true,
  "notes": "حساب تلقائي بناءً على سياسة المنافع"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "تمت الموافقة على المطالبة بنجاح",
  "data": {
    "id": 901,
    "requestedAmount": 500.00,
    "approvedAmount": 420.00,
    "differenceAmount": 80.00,
    "patientCoPay": 140.00,
    "netProviderAmount": 280.00,
    "coPayPercent": 20.00,
    "deductibleApplied": 80.00,
    "status": "APPROVED",
    "statusLabel": "موافق عليه",
    "reviewerComment": "تمت الموافقة - التغطية القياسية",
    "reviewedAt": "2025-12-31T14:00:00",
    "updatedBy": "reviewer.user"
  }
}
```

**Auto-Calculation Process:**
1. Determine network type (In-Network/Out-of-Network) from provider
2. Calculate deductible applied (based on annual deductible met)
3. Calculate co-pay amount (percentage × remaining amount)
4. Apply out-of-pocket maximum if reached
5. Validate: `requestedAmount = patientCoPay + netProviderAmount`
6. Store all calculated values

**Validations:**
- `approvedAmount` must be > 0
- `approvedAmount` must not exceed `requestedAmount`
- Coverage limits validation (via BenefitPolicyCoverageService)
- Financial equation must balance

---

### 13. Reject Claim

**Endpoint:** `POST /api/claims/{id}/reject`  
**Permission:** `APPROVE_CLAIMS` or `SUPER_ADMIN`  
**Description:** رفض المطالبة  
**Transition:** `UNDER_REVIEW → REJECTED` (Terminal)

#### Request Body (ClaimRejectDto)

```json
{
  "rejectionReason": "الخدمة غير مشمولة في سياسة المنافع الحالية",
  "rejectionCode": "NOT_COVERED"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "تم رفض المطالبة",
  "data": {
    "id": 901,
    "status": "REJECTED",
    "statusLabel": "مرفوض",
    "reviewerComment": "الخدمة غير مشمولة في سياسة المنافع الحالية",
    "reviewedAt": "2025-12-31T14:30:00",
    "updatedBy": "reviewer.user"
  }
}
```

**Validations:**
- `rejectionReason` is MANDATORY (min 10 characters)
- Claim becomes terminal state (cannot be modified)

---

### 14. Settle Claim

**Endpoint:** `POST /api/claims/{id}/settle`  
**Permission:** `SETTLE_CLAIMS` or `SUPER_ADMIN`  
**Description:** تسوية المطالبة (إتمام الدفع)  
**Transition:** `APPROVED → SETTLED` (Terminal)

#### Request Body (ClaimSettleDto)

```json
{
  "paymentReference": "PAY-2025-001234",
  "settlementAmount": 420.00,
  "paymentDate": "2025-12-31",
  "bankReference": "TRX-987654321",
  "settlementNotes": "تم الدفع عبر التحويل البنكي"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "تمت تسوية المطالبة بنجاح",
  "data": {
    "id": 901,
    "status": "SETTLED",
    "statusLabel": "تمت التسوية",
    "paymentReference": "PAY-2025-001234",
    "settledAt": "2025-12-31T16:00:00",
    "settlementNotes": "تم الدفع عبر التحويل البنكي",
    "approvedAmount": 420.00,
    "updatedBy": "finance.user"
  }
}
```

**Validations:**
- Claim must be in APPROVED status
- `paymentReference` is MANDATORY
- `settlementAmount` should match `approvedAmount` (warning if different)
- Claim becomes terminal state (cannot be modified)

---

### 15. Get Cost Breakdown

**Endpoint:** `GET /api/claims/{id}/cost-breakdown`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** الحصول على تفاصيل حساب التكلفة (Financial Snapshot)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "تم استرجاع تفاصيل التكلفة",
  "data": {
    "requestedAmount": 500.00,
    "patientCoPay": 140.00,
    "netProviderAmount": 360.00,
    "annualDeductible": 500.00,
    "deductibleMetYTD": 420.00,
    "deductibleApplied": 80.00,
    "coPayPercent": 20.00,
    "coPayAmount": 84.00,
    "outOfPocketMax": 5000.00,
    "outOfPocketYTD": 1200.00,
    "networkType": "IN_NETWORK",
    "deductibleMet": false,
    "outOfPocketMaxReached": false,
    "calculationNotes": "الخصم السنوي: 80 د.ل | المشاركة: 84 د.ل (20%)"
  }
}
```

**Calculation Details:**
- `deductibleApplied`: Amount of deductible charged to this claim
- `coPayAmount`: Co-pay percentage × remaining amount
- `patientCoPay`: Total patient responsibility (deductible + co-pay)
- `netProviderAmount`: Amount insurance will pay
- `networkType`: IN_NETWORK (20%) or OUT_OF_NETWORK (40%)

---

## 📥 Inbox Endpoints

### 16. Get Pending Claims (Reviewer Inbox)

**Endpoint:** `GET /api/claims/inbox/pending`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** المطالبات المعلقة (SUBMITTED + UNDER_REVIEW)

#### Query Parameters

```
?page=1&size=20&sortBy=createdAt&sortDir=asc
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "المطالبات المعلقة",
  "data": {
    "items": [
      {
        "id": 902,
        "memberFullNameArabic": "فاطمة أحمد",
        "requestedAmount": 800.00,
        "status": "SUBMITTED",
        "statusLabel": "مقدم",
        "createdAt": "2025-12-30T09:00:00"
      },
      {
        "id": 903,
        "memberFullNameArabic": "محمد علي",
        "requestedAmount": 1200.00,
        "status": "UNDER_REVIEW",
        "statusLabel": "قيد المراجعة",
        "createdAt": "2025-12-29T14:30:00"
      }
    ],
    "total": 25,
    "page": 1,
    "size": 20
  }
}
```

**Use Cases:**
- Reviewer dashboard showing claims awaiting review
- Sorted by oldest first (FIFO queue)

---

### 17. Get Approved Claims (Finance Inbox)

**Endpoint:** `GET /api/claims/inbox/approved`  
**Permission:** `VIEW_CLAIMS` or `SUPER_ADMIN`  
**Description:** المطالبات الموافق عليها (ready for settlement)

#### Query Parameters

```
?page=1&size=20&sortBy=reviewedAt&sortDir=asc
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "المطالبات الموافق عليها",
  "data": {
    "items": [
      {
        "id": 900,
        "memberFullNameArabic": "سارة محمد",
        "requestedAmount": 600.00,
        "approvedAmount": 480.00,
        "netProviderAmount": 360.00,
        "status": "APPROVED",
        "statusLabel": "موافق عليه",
        "reviewedAt": "2025-12-28T16:00:00"
      }
    ],
    "total": 15,
    "page": 1,
    "size": 20
  }
}
```

**Use Cases:**
- Finance team dashboard for payment processing
- Shows claims ready for settlement
- Sorted by review date (oldest approved first)

---

## 📊 Data Transfer Objects (DTOs)

### ClaimCreateDto

```java
{
  "memberId": Long,              // Required
  "benefitPackageId": Long,      // Required
  "preApprovalId": Long,         // Optional
  "providerName": String,        // Required
  "doctorName": String,          // Optional
  "diagnosis": String,           // Required
  "visitDate": LocalDate,        // Required
  "requestedAmount": BigDecimal, // Required
  "lines": [ClaimLineDto],       // Required (min 1)
  "attachments": [ClaimAttachmentDto] // Optional
}
```

**Removed Fields (2025-12-31):**
- ❌ `insuranceCompanyId` - Auto-resolved from Member
- ❌ `insurancePolicyId` - No longer used

---

### ClaimUpdateDto

```java
{
  "providerName": String,
  "doctorName": String,
  "diagnosis": String,
  "visitDate": LocalDate,
  "requestedAmount": BigDecimal,
  "benefitPackageId": Long,
  "preApprovalId": Long,
  "lines": [ClaimLineDto],
  "attachments": [ClaimAttachmentDto]
}
```

**Constraints:**
- Can only update if status is DRAFT or RETURNED_FOR_INFO
- All fields are optional (update only what changed)

---

### ClaimViewDto

```java
{
  "id": Long,
  "memberId": Long,
  "memberFullNameArabic": String,
  "memberCivilId": String,
  "insuranceCompanyName": String,        // From Member.benefitPolicy
  "insuranceCompanyCode": String,        // From Member.benefitPolicy
  "benefitPackageId": Long,
  "benefitPackageName": String,
  "benefitPackageCode": String,
  "preApprovalId": Long,
  "preApprovalStatus": String,
  "providerName": String,
  "doctorName": String,
  "diagnosis": String,
  "visitDate": LocalDate,
  "requestedAmount": BigDecimal,
  "approvedAmount": BigDecimal,
  "differenceAmount": BigDecimal,
  "patientCoPay": BigDecimal,            // Patient responsibility
  "netProviderAmount": BigDecimal,       // Provider payment
  "coPayPercent": BigDecimal,            // Co-pay percentage
  "deductibleApplied": BigDecimal,       // Deductible charged
  "paymentReference": String,            // Settlement reference
  "settledAt": LocalDateTime,            // Settlement timestamp
  "settlementNotes": String,             // Settlement notes
  "status": ClaimStatus,
  "statusLabel": String,
  "reviewerComment": String,
  "reviewedAt": LocalDateTime,
  "serviceCount": Integer,
  "attachmentsCount": Integer,
  "lines": [ClaimLineDto],
  "attachments": [ClaimAttachmentDto],
  "active": Boolean,
  "createdAt": LocalDateTime,
  "updatedAt": LocalDateTime,
  "createdBy": String,
  "updatedBy": String
}
```

**Removed Fields (2025-12-31):**
- ❌ `insuranceCompanyId`
- ❌ `insurancePolicyId`
- ❌ `insurancePolicyName`
- ❌ `insurancePolicyCode`

---

### ClaimLineDto

```java
{
  "id": Long,
  "serviceCode": String,      // E.g., "CONS-001"
  "description": String,      // E.g., "استشارة طبية"
  "quantity": Integer,        // E.g., 1
  "unitPrice": BigDecimal,    // E.g., 100.00
  "totalPrice": BigDecimal    // quantity × unitPrice
}
```

---

### ClaimApproveDto

```java
{
  "approvedAmount": BigDecimal,        // Manual approved amount
  "notes": String,                     // Reviewer notes
  "useSystemCalculation": Boolean      // True = auto-calculate
}
```

---

### ClaimRejectDto

```java
{
  "rejectionReason": String,    // MANDATORY (min 10 chars)
  "rejectionCode": String       // Optional category code
}
```

---

### ClaimSettleDto

```java
{
  "paymentReference": String,   // MANDATORY
  "settlementAmount": BigDecimal,
  "paymentDate": LocalDate,
  "bankReference": String,      // Optional
  "settlementNotes": String
}
```

---

### CostBreakdownDto

```java
{
  "requestedAmount": BigDecimal,
  "patientCoPay": BigDecimal,
  "netProviderAmount": BigDecimal,
  "annualDeductible": BigDecimal,
  "deductibleMetYTD": BigDecimal,
  "deductibleApplied": BigDecimal,
  "coPayPercent": BigDecimal,
  "coPayAmount": BigDecimal,
  "outOfPocketMax": BigDecimal,
  "outOfPocketYTD": BigDecimal,
  "networkType": NetworkType,        // IN_NETWORK / OUT_OF_NETWORK
  "deductibleMet": Boolean,
  "outOfPocketMaxReached": Boolean,
  "calculationNotes": String
}
```

---

## 🔗 Integration Points

### 1. Member Integration

```java
// Get member details
Member member = memberRepository.findById(claim.getMemberId());

// Validate member has active policy
boolean hasActivePolicy = member.getBenefitPolicy() != null;

// Get insurance company from member's benefit policy
String insuranceCompanyName = member.getBenefitPolicy()
    .getInsuranceCompany()
    .getNameArabic();
```

**Business Rules:**
- Member must exist
- Member must have active BenefitPolicy
- BenefitPolicy must cover service date

---

### 2. PreAuthorization Integration

```java
// Link claim to pre-authorization
claim.setPreApprovalId(preAuthId);

// Validate pre-auth is APPROVED
PreAuthorization preAuth = preAuthRepository.findById(preAuthId);
if (preAuth.getStatus() != PreAuthStatus.APPROVED) {
    throw new BusinessRuleException("PreAuth must be approved");
}

// Check pre-auth not already used
if (preAuth.isUsed()) {
    throw new BusinessRuleException("PreAuth already used");
}

// Mark pre-auth as used when claim is approved
preAuth.setUsed(true);
```

**Business Rules:**
- PreAuth must be in APPROVED status
- PreAuth cannot be already used
- PreAuth amount should guide claim approval
- PreAuth is marked as used when claim is approved

---

### 3. BenefitPolicy Integration

```java
// Get coverage from BenefitPolicy
BenefitPolicy benefitPolicy = member.getBenefitPolicy();

// Get co-pay percentage
BigDecimal coPayPercent = benefitPolicy.getCoPayPercentage();

// Get deductible
BigDecimal annualDeductible = benefitPolicy.getAnnualDeductible();

// Validate service coverage
boolean isCovered = benefitPolicyCoverageService
    .isServiceCovered(benefitPolicy, serviceCode);

// Validate coverage limits
boolean withinLimits = benefitPolicyCoverageService
    .validateCoverageLimits(benefitPolicy, requestedAmount);
```

**Business Rules:**
- Service must be covered in BenefitPolicy
- Requested amount must be within coverage limits
- Co-pay and deductible from BenefitPolicy
- Network type affects co-pay percentage

---

### 4. Provider Integration

```java
// Determine network type from provider name
NetworkType networkType = providerNetworkService
    .determineNetworkTypeByName(claim.getProviderName());

// Get co-pay percentage based on network
BigDecimal coPayPercent = networkType == NetworkType.IN_NETWORK 
    ? DEFAULT_COPAY_IN_NETWORK 
    : DEFAULT_COPAY_OUT_OF_NETWORK;
```

**Network Types:**
- `IN_NETWORK`: 20% co-pay (default)
- `OUT_OF_NETWORK`: 40% co-pay (default)

---

## 🔐 Permissions

| Endpoint | Permission | Roles |
|----------|------------|-------|
| POST /claims | MANAGE_CLAIMS or ADMIN | EMPLOYER, INSURANCE, ADMIN |
| PUT /claims/{id} | MANAGE_CLAIMS or ADMIN | EMPLOYER, INSURANCE, ADMIN |
| GET /claims/{id} | VIEW_CLAIMS or ADMIN | ALL_AUTHENTICATED |
| GET /claims | VIEW_CLAIMS or ADMIN | ALL_AUTHENTICATED |
| DELETE /claims/{id} | MANAGE_CLAIMS or ADMIN | EMPLOYER, INSURANCE, ADMIN |
| POST /claims/{id}/submit | MANAGE_CLAIMS or ADMIN | EMPLOYER, INSURANCE, ADMIN |
| POST /claims/{id}/start-review | APPROVE_CLAIMS or ADMIN | INSURANCE, REVIEWER, ADMIN |
| POST /claims/{id}/approve | APPROVE_CLAIMS or ADMIN | INSURANCE, REVIEWER, ADMIN |
| POST /claims/{id}/reject | APPROVE_CLAIMS or ADMIN | INSURANCE, REVIEWER, ADMIN |
| POST /claims/{id}/settle | SETTLE_CLAIMS or ADMIN | INSURANCE, ADMIN |
| GET /claims/{id}/cost-breakdown | VIEW_CLAIMS or ADMIN | ALL_AUTHENTICATED |
| GET /claims/inbox/pending | VIEW_CLAIMS or ADMIN | REVIEWER, INSURANCE, ADMIN |
| GET /claims/inbox/approved | VIEW_CLAIMS or ADMIN | INSURANCE, FINANCE, ADMIN |

---

## ⚠️ Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| CLAIM_001 | Member not found | 404 |
| CLAIM_002 | Benefit package not found | 404 |
| CLAIM_003 | PreAuthorization not found | 404 |
| CLAIM_004 | PreAuthorization not approved | 400 |
| CLAIM_005 | PreAuthorization already used | 400 |
| CLAIM_006 | Service not covered in policy | 400 |
| CLAIM_007 | Coverage limit exceeded | 400 |
| CLAIM_008 | Invalid state transition | 400 |
| CLAIM_009 | Cannot edit claim in current status | 400 |
| CLAIM_010 | Approved amount exceeds requested | 400 |
| CLAIM_011 | Rejection reason required | 400 |
| CLAIM_012 | Payment reference required | 400 |
| CLAIM_013 | Financial equation does not balance | 400 |
| CLAIM_014 | Insufficient role for transition | 403 |
| CLAIM_015 | Claim already deleted | 410 |

---

## 📚 Related Documents

- [PreAuthorization API Contract](./PREAUTHORIZATION_API_CONTRACT.md)
- [Member API Contract](./MEMBER_API_CONTRACT.md)
- [BenefitPolicy API Contract](./BENEFIT_POLICY_API_CONTRACT.md)
- [API Contract Status Report](./API_CONTRACT_STATUS_COMPREHENSIVE.md)

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-31 | Initial version with cleaned DTOs |

---

## 📝 Notes

### Recent Changes (2025-12-31)
✅ **DTOs Cleaned:**
- Removed `insuranceCompanyId` from ClaimCreateDto
- Removed `insurancePolicyId` from ClaimCreateDto and ClaimUpdateDto
- Removed `insuranceCompanyId`, `insurancePolicyId`, `insurancePolicyName`, `insurancePolicyCode` from ClaimViewDto
- Insurance company now auto-resolved from `Member.benefitPolicy.insuranceCompany`

### Migration Impact
- Old claims with `insurancePolicyId` still in database (legacy columns)
- New claims use `Member.benefitPolicy` relationship only
- Frontend must NOT send `insuranceCompanyId` or `insurancePolicyId` in Create/Update requests

---

**Status:** ✅ **Backend Complete - Ready for Frontend Integration**  
**Next Steps:**
1. Create Claim Management UI
2. Implement Status Workflow UI
3. Add Cost Breakdown Display
4. Implement Inbox Views (Pending/Approved)
5. Add Settlement Process UI

---

*This document defines the complete API contract for Claim Management. All implementations must adhere to this specification.*
