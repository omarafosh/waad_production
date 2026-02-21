# 🔧 Financial Settlement Inbox & Reports - Root-Cause Analysis & Canonical Fix

**تاريخ التحليل:** 2026-01-26  
**الحالة:** ✅ تم التشخيص والتطبيق

---

## 📋 ملخص المشاكل المكتشفة والإصلاحات المطبقة

بعد التحليل الجذري للنظام، تم اكتشاف المشاكل التالية:

| # | المشكلة | الخطورة | النوع | الحالة |
|---|---------|---------|-------|--------|
| 1 | Frontend لا يستدعي endpoint التسويات بشكل صحيح | 🔴 عالية | Frontend | ✅ تم الإصلاح |
| 2 | SettlementInbox يعتمد على فلترة محلية بدلاً من Backend | 🔴 عالية | Contract | ✅ تم الإصلاح |
| 3 | FinancialReports يحاول جلب كل البيانات ثم يفلترها محلياً | 🔴 عالية | Contract | ✅ تم الإصلاح |
| 4 | لا يوجد endpoint مخصص للتبويبات (Invoices, Payments, Completed) | 🟡 متوسطة | Backend | ✅ تم الإصلاح (Frontend method) |

---

## 1️⃣ Contract Validation (Backend ↔ Frontend)

### Backend Endpoints المتاحة:

| Endpoint | HTTP | Query Params | DTO Response | الحالة |
|----------|------|--------------|--------------|--------|
| `/api/claims/inbox/approved` | GET | page, size, sortBy, sortDir | `PaginationResponse<ClaimViewDto>` | ✅ موجود |
| `/api/claims/{id}/settle` | POST | - | `ClaimViewDto` | ✅ موجود |
| `/api/reports/financial-summary` | GET | employerOrgId, fromDate, toDate | `ClaimFinancialSummaryDto` | ✅ موجود |
| `/api/reports/settlement-summary` | GET | employerOrgId | `ClaimFinancialSummaryDto` | ✅ موجود |
| `/api/reports/adjudication` | GET | fromDate, toDate, providerName, statuses | `AdjudicationReportDto` | ✅ موجود |

### Frontend API Calls:

| Frontend Method | Backend Endpoint | الحالة |
|----------------|------------------|--------|
| `claimsService.getApprovedClaims()` | `/api/claims/inbox/approved` | ✅ صحيح |
| `claimsService.getFinancialSummary()` | `/api/reports/financial-summary` | ✅ صحيح |
| `claimsService.getSettlementSummary()` | `/api/reports/settlement-summary` | ✅ صحيح |
| `claimsService.settle()` | `/api/claims/{id}/settle` | ✅ صحيح |

---

## 2️⃣ مصدر البيانات المالية (Source of Truth)

### الجدول الرئيسي: `claims`

```
claims
├── id (PK)
├── visit_id (FK → visits) ✅ MANDATORY
├── member_id (FK → members)
├── provider_id
├── requested_amount       ← SUM(claim_lines.total_price)
├── approved_amount        ← Server-calculated
├── patient_copay          ← Server-calculated
├── net_provider_amount    ← Server-calculated
├── status                 ← APPROVED/SETTLED
├── settled_at             ← Settlement timestamp
├── payment_reference      ← Payment tracking
└── settlement_notes
```

### المعادلات المالية:

```
requestedAmount = SUM(claim_lines.total_price)
patientCoPay = requestedAmount × (coPayPercent / 100)
netProviderAmount = approvedAmount - patientCoPay
outstandingAmount = totalNetProvider - totalSettled
```

### الكيان المعتمد:

| الغرض | الكيان | الاستعلام |
|-------|--------|-----------|
| **صندوق التسويات** | `claims` | `status = 'APPROVED' AND active = true` |
| **التقارير المالية** | `claims` | `status IN ('APPROVED', 'SETTLED') AND active = true` |
| **الفواتير** | `claims` | `status = 'SETTLED' AND active = true` |
| **المدفوعات** | `claims` | `status = 'SETTLED' AND payment_reference IS NOT NULL` |

---

## 3️⃣ Canonical Financial Flow

```
Visit
 └→ Claim (created from Visit)
     └→ ClaimLines[] (unit_price from ProviderContract)
         └→ Adjudication (UNDER_REVIEW → APPROVED)
             └→ Settlement (APPROVED → SETTLED)
                 └→ Payment Reference (tracking only)
```

### حالات المطالبة:

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SETTLED
                                      ↓
                                   REJECTED
```

### Settlement Rules (قواعد التسوية):

1. ✅ `claim.status = APPROVED` (مطلوب)
2. ✅ `claim.approved_amount > 0` (مطلوب)
3. ✅ `claim.payment_reference IS NULL` (لم يُسدد بعد)
4. ✅ `claim.active = true` (غير محذوف)

---

## 4️⃣ Settlement Inbox Query (Canonical)

```sql
-- المطالبات الجاهزة للتسوية
SELECT c.* FROM claims c
WHERE c.active = true
  AND c.status = 'APPROVED'
  AND c.settled_at IS NULL
ORDER BY c.reviewed_at ASC;

-- ملخص التسويات (Backend يحسب الإجماليات)
SELECT
    COUNT(*) FILTER (WHERE status = 'APPROVED') as pending_count,
    COUNT(*) FILTER (WHERE status = 'SETTLED') as settled_count,
    COALESCE(SUM(approved_amount) FILTER (WHERE status IN ('APPROVED', 'SETTLED')), 0) as total_approved,
    COALESCE(SUM(COALESCE(net_provider_amount, approved_amount)) FILTER (WHERE status = 'SETTLED'), 0) as total_settled,
    COALESCE(SUM(COALESCE(net_provider_amount, approved_amount)) FILTER (WHERE status = 'APPROVED'), 0) as outstanding
FROM claims
WHERE active = true;
```

---

## 5️⃣ المشاكل المكتشفة والإصلاحات

### 🐛 Bug #1: Frontend يفلتر البيانات محلياً

**الملف:** `SettlementInbox.jsx`

**السبب:**
```jsx
// ❌ خاطئ - يجلب كل المطالبات ثم يفلترها محلياً
} else if (activeTab === 1) {
  response = await claimsService.getAll(params);
  items = (response.data?.items || [])
    .filter(c => c.status === 'SETTLED')
    .map((claim, idx) => ({...}));
}
```

**الإصلاح:**
```jsx
// ✅ صحيح - يجب استخدام endpoint مخصص من Backend
} else if (activeTab === 1) {
  response = await claimsService.getSettledClaims(params);
  items = response.items || [];
}
```

### 🐛 Bug #2: Financial Reports يجلب 10 سجلات فقط للمعاينة

**الملف:** `FinancialReports.jsx`

**السبب:**
```jsx
// يجلب 10 سجلات فقط - ليس تقرير كامل
const allClaimsResponse = await claimsService.getAll({
  page: 1,
  size: 10 // Only fetch 10 for preview, not 1000!
});
```

**الإصلاح:** التقارير يجب أن تعتمد على `summaryData` من Backend فقط، لا تحتاج قائمة المطالبات.

---

## 6️⃣ الإصلاحات المطبقة ✅

### Backend (لا تغييرات مطلوبة)
- ✅ DTOs موثقة بشكل صحيح
- ✅ Endpoints موجودة ومحمية
- ✅ الإجماليات تُحسب من قاعدة البيانات (SUM/COUNT)
- ✅ Pessimistic locking للتسوية

### Frontend (تم التطبيق ✅)

| الملف | التغيير | الحالة |
|-------|---------|--------|
| `claims.service.js` | ✅ إضافة `getSettledClaims()` method | تم |
| `SettlementInbox.jsx` | ✅ استخدام `getSettledClaims()` للتبويبات 1-3 | تم |
| `FinancialReports.jsx` | ✅ استخدام `getSettledClaims()` للتقارير | تم |

### التغييرات التفصيلية:

#### 1. `claims.service.js` - إضافة method جديدة
```javascript
/**
 * Get settled claims (for Invoices/Payments/Completed tabs)
 * ⚠️ CANONICAL: Uses backend filter instead of client-side filtering
 */
getSettledClaims: async (params = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('status', 'SETTLED');  // Backend filtering
  // ... other params
  const response = await axiosClient.get(`${BASE_URL}?${queryParams.toString()}`);
  return normalizePaginatedResponse(response);
}
```

#### 2. `SettlementInbox.jsx` - تحديث fetchClaims
```diff
// Before (wrong - local filtering):
- response = await claimsService.getAll(params);
- items = (response.data?.items || []).filter(c => c.status === 'SETTLED');

// After (correct - backend filtering):
+ response = await claimsService.getSettledClaims(params);
+ items = response.items || [];
```

#### 3. `FinancialReports.jsx` - تحديث جميع fetch methods
```diff
// Before (wrong - local filtering):
- response = await claimsService.getAll(params);
- const settledClaims = (response.data?.items || []).filter(c => c.status === 'SETTLED');

// After (correct - backend filtering):
+ response = await claimsService.getSettledClaims(params);
+ const settledClaims = response.items || [];
```

---

## 7️⃣ DB → API → UI Column Mapping

| Database Column | API DTO Field | UI Display |
|-----------------|---------------|------------|
| `claims.id` | `id` | رقم المطالبة |
| `claims.requested_amount` | `requestedAmount` | المبلغ المطلوب |
| `claims.approved_amount` | `approvedAmount` | المبلغ المعتمد |
| `claims.patient_copay` | `patientCoPay` | تحمل المريض |
| `claims.net_provider_amount` | `netProviderAmount` | المستحق للمستشفى |
| `claims.status` | `status` | الحالة |
| `claims.settled_at` | `settledAt` | تاريخ التسوية |
| `claims.payment_reference` | `paymentReference` | مرجع الدفع |

---

## 8️⃣ Security & Role-Based Filtering

| الدور | صندوق التسويات | التقارير المالية | تسوية |
|-------|----------------|------------------|-------|
| SUPER_ADMIN | ✅ الكل | ✅ الكل | ✅ |
| INSURANCE_ADMIN | ✅ الكل | ✅ الكل | ✅ |
| REVIEWER | ✅ عرض فقط | ✅ عرض فقط | ❌ |
| PROVIDER | ❌ | ❌ | ❌ |
| EMPLOYER | ❌ | ❌ | ❌ |

---

## ✅ النتيجة النهائية

بعد التحليل والإصلاح:
1. **Backend صحيح معماريًا** - DTOs موثقة، Endpoints محمية، الحسابات في قاعدة البيانات
2. **Frontend تم إصلاحه** ✅ - الآن يستخدم endpoints صحيحة بدلاً من الفلترة المحلية
3. **لا توجد مشاكل في البيانات** - الهيكل صحيح
4. **الأمان مُطبق** - @PreAuthorize على كل endpoint

### ملخص التغييرات المُنفذة:

| الإجراء | الحالة |
|---------|--------|
| Backend | ✅ No changes needed |
| Frontend SettlementInbox | ✅ Fixed - uses `getSettledClaims()` |
| Frontend FinancialReports | ✅ Fixed - uses `getSettledClaims()` |
| Frontend claims.service.js | ✅ Added `getSettledClaims()` method |
| Data | ✅ No changes needed |

### الملفات المُعدلة:

1. `/frontend/src/services/api/claims.service.js`
   - ✅ Added `getSettledClaims()` method with backend status filter
   - ✅ Added `employerId` param to `getApprovedClaims()`

2. `/frontend/src/pages/claims/SettlementInbox.jsx`
   - ✅ Tab 0 (Pending): Uses `getApprovedClaims()` ← Already correct
   - ✅ Tab 1 (Invoices): Now uses `getSettledClaims()` 
   - ✅ Tab 2 (Payments): Now uses `getSettledClaims()` 
   - ✅ Tab 3 (Completed): Now uses `getSettledClaims()`

3. `/frontend/src/pages/reports/FinancialReports.jsx`
   - ✅ Tab 0 (Summary): Uses `getFinancialSummary()` ← Already correct
   - ✅ Tab 1 (Invoices): Now uses `getSettledClaims()`
   - ✅ Tab 2 (Payments): Now uses `getSettledClaims()`
   - ✅ Tab 3 (Settlements): Now uses `getSettledClaims()`
