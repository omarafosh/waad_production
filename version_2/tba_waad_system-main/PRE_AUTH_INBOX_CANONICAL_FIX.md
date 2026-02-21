# 🔧 Pre-Authorization Inbox - Root-Cause Analysis & Canonical Fix

**تاريخ التحليل:** 2026-01-26  
**الحالة:** ✅ تم التطبيق

---

## 📋 ملخص المشكلة

الموافقات المسبقة (Pre-Authorizations) تُنشأ بنجاح من بوابة مقدم الخدمة، لكنها:
- لا تظهر أو تظهر ناقصة في وارد الموافقات
- لا تعمل أزرار الإجراءات بشكل صحيح

---

## 🔍 تحليل السبب الجذري

### 1️⃣ عدم توافق العقد (Contract Mismatch)

| المكون | Claims (يعمل) | PreAuthorizations (معطل) |
|--------|---------------|--------------------------|
| **Entry Status** | `DRAFT` → `SUBMITTED` | `PENDING` (مباشرة) |
| **Inbox Query** | `SUBMITTED` + `UNDER_REVIEW` | `PENDING` فقط |
| **Frontend Check** | `status === 'SUBMITTED'` | يبحث عن `SUBMITTED` ❌ |

### 2️⃣ الأسباب المحددة

#### Backend Issues:
```java
// ❌ قبل الإصلاح - استعلام واحد فقط
Page<PreAuthorization> preAuths = preAuthorizationRepository.findByStatusAndActiveTrue(
    PreAuthStatus.PENDING, pageable);

// ✅ بعد الإصلاح - يشمل جميع الحالات المعلقة
List<PreAuthStatus> inboxStatuses = List.of(PreAuthStatus.PENDING, PreAuthStatus.UNDER_REVIEW);
Page<PreAuthorization> preAuths = preAuthorizationRepository.findByStatusIn(inboxStatuses, pageable);
```

#### Frontend Issues:
```jsx
// ❌ قبل الإصلاح - يبحث عن SUBMITTED (غير موجود في PreAuth)
{params.row.status === 'SUBMITTED' && (
  <IconButton onClick={() => handleStartReview(params.row)}>
    بدء المراجعة
  </IconButton>
)}

// ✅ بعد الإصلاح - يستخدم PENDING (الحالة الصحيحة)
{params.row.status === 'PENDING' && (
  <IconButton onClick={() => handleStartReview(params.row)}>
    بدء المراجعة
  </IconButton>
)}
```

---

## 📊 مخطط سير العمل المُصحح

### Claims Workflow (Reference):
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → SETTLED
```

### PreAuthorization Workflow (CANONICAL):
```
PENDING → UNDER_REVIEW → APPROVED/REJECTED/CANCELLED/EXPIRED/USED
         ↑
    (إنشاء مباشر من بوابة مقدم الخدمة)
```

---

## ✅ الإصلاحات المطبقة

### 1. Backend - Repository (`PreAuthorizationRepository.java`)

```java
// إضافة استعلام inbox جديد يشمل حالات متعددة
@Query(value = "SELECT pa FROM PreAuthorization pa " +
       "LEFT JOIN FETCH pa.visit v " +
       "LEFT JOIN FETCH pa.medicalService ms " +
       "WHERE pa.active = true " +
       "AND pa.status IN :statuses",
       countQuery = "SELECT COUNT(pa) FROM PreAuthorization pa WHERE pa.active = true AND pa.status IN :statuses")
Page<PreAuthorization> findByStatusIn(@Param("statuses") List<PreAuthStatus> statuses, Pageable pageable);
```

### 2. Backend - Service (`PreAuthorizationService.java`)

```java
public Page<PreAuthorizationResponseDto> getPendingInbox(Pageable pageable) {
    log.info("[SERVICE] Fetching pending pre-authorizations for inbox (PENDING + UNDER_REVIEW)");
    
    // CANONICAL: Include both PENDING and UNDER_REVIEW statuses (like Claims)
    List<PreAuthStatus> inboxStatuses = List.of(PreAuthStatus.PENDING, PreAuthStatus.UNDER_REVIEW);
    
    Page<PreAuthorization> preAuths = preAuthorizationRepository.findByStatusIn(
            inboxStatuses, pageable);
    
    return preAuths.map(this::mapToResponseDtoLight);
}
```

### 3. Frontend - PreApprovalsInbox.jsx

```jsx
// تصحيح شرط عرض زر "بدء المراجعة"
{params.row.status === 'PENDING' && (
  <RBACGuard requiredPermission={PERMISSIONS.PREAPPROVAL_WRITE}>
    <Tooltip title="بدء المراجعة">
      <IconButton onClick={() => handleStartReview(params.row)}>
        <StartReviewIcon />
      </IconButton>
    </Tooltip>
  </RBACGuard>
)}
```

### 4. Frontend - PreApprovalsInboxPro.jsx

- إزالة خيار `SUBMITTED` من فلتر الحالة
- تصحيح شروط الإجراءات لتستخدم `PENDING` بدلاً من `SUBMITTED`
- تحديث قائمة الحالات المعروضة

---

## 📐 جدول ربط الأعمدة (Column Mapping)

| DB Column (pre_authorizations) | API Field (DTO) | UI Field (Arabic) |
|-------------------------------|-----------------|-------------------|
| `id` | `id` | معرف |
| `pre_auth_number` | `referenceNumber` | رقم الطلب |
| `visit_id` | `visitId` | رقم الزيارة |
| `member_id` | `memberId` | رقم المؤمن |
| - | `memberName` | اسم المؤمن عليه |
| - | `memberNationalNumber` | الرقم الوطني |
| `provider_id` | `providerId` | رقم مقدم الخدمة |
| - | `providerName` | مقدم الخدمة |
| `medical_service_id` | `medicalServiceId` | رقم الخدمة |
| `service_code` | `serviceCode` | كود الخدمة |
| `service_name` | `serviceName` | الخدمة |
| `contract_price` | `contractPrice` | المبلغ |
| `approved_amount` | `approvedAmount` | المبلغ المعتمد |
| `status` | `status` | الحالة |
| `priority` | `priority` | الأولوية |
| `request_date` | `requestDate` | تاريخ الطلب |
| `expiry_date` | `expiryDate` | تاريخ الانتهاء |
| `diagnosis_code` | `diagnosisCode` | كود التشخيص |
| `diagnosis_description` | `diagnosisDescription` | وصف التشخيص |
| `notes` | `notes` | ملاحظات |
| `rejection_reason` | `rejectionReason` | سبب الرفض |
| `created_at` | `createdAt` | تاريخ الإنشاء |
| `updated_at` | `updatedAt` | تاريخ التحديث |
| `created_by` | `createdBy` | أنشئ بواسطة |
| `active` | `active` | نشط |

---

## 🔄 API Contract - Inbox Endpoint

### Endpoint
```
GET /api/pre-authorizations/inbox/pending
```

### Request Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | رقم الصفحة (1-based) |
| `size` | int | 20 | عدد العناصر |
| `sortBy` | string | createdAt | حقل الترتيب |
| `sortDir` | string | ASC | اتجاه الترتيب (FIFO) |

### Response Schema
```json
{
  "status": "success",
  "data": {
    "content": [
      {
        "id": 1,
        "referenceNumber": "PA-20260126-00001",
        "visitId": 123,
        "memberId": 456,
        "memberName": "أحمد محمد",
        "memberNationalNumber": "1234567890",
        "providerId": 789,
        "providerName": "مستشفى الأمل",
        "medicalServiceId": 101,
        "serviceCode": "CONS001",
        "serviceName": "استشارة طبية",
        "contractPrice": 150.00,
        "status": "PENDING",
        "priority": "NORMAL",
        "requestDate": "2026-01-26",
        "expiryDate": "2026-02-25",
        "createdAt": "2026-01-26T10:30:00",
        "active": true
      }
    ],
    "totalElements": 10,
    "totalPages": 1,
    "number": 0,
    "size": 20
  }
}
```

### Status Values (PreAuthStatus enum)
| Status | Arabic | Description |
|--------|--------|-------------|
| `PENDING` | معلق | بانتظار المراجعة الأولى |
| `UNDER_REVIEW` | قيد المراجعة | تحت المراجعة حالياً |
| `APPROVED` | موافق عليه | تمت الموافقة |
| `REJECTED` | مرفوض | تم الرفض |
| `EXPIRED` | منتهي | انتهت الصلاحية |
| `CANCELLED` | ملغي | تم الإلغاء |
| `USED` | مستخدم | تم استخدامه في مطالبة |

---

## 🧪 اختبار الإصلاح

### 1. اختبار Backend API
```bash
# جلب الموافقات المسبقة المعلقة
curl -X GET "http://localhost:8080/api/pre-authorizations/inbox/pending?page=1&size=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. التحقق من قاعدة البيانات
```sql
-- عدد الموافقات حسب الحالة
SELECT status, COUNT(*) as count, active
FROM pre_authorizations
GROUP BY status, active
ORDER BY status;

-- الموافقات التي يجب أن تظهر في الوارد
SELECT id, pre_auth_number, status, member_id, provider_id, created_at
FROM pre_authorizations
WHERE active = true
  AND status IN ('PENDING', 'UNDER_REVIEW')
ORDER BY created_at ASC;
```

### 3. اختبار الواجهة
1. انتقل إلى `/pre-approvals/inbox`
2. تحقق من ظهور الموافقات المسبقة بحالة `PENDING` و `UNDER_REVIEW`
3. تحقق من ظهور زر "بدء المراجعة" للحالات `PENDING`
4. تحقق من ظهور أزرار "موافقة" و "رفض" للحالات `PENDING` و `UNDER_REVIEW`

---

## 📁 الملفات المُعدلة

### Backend
- [PreAuthorizationRepository.java](backend/src/main/java/com/waad/tba/modules/preauthorization/repository/PreAuthorizationRepository.java#L89-L109)
- [PreAuthorizationService.java](backend/src/main/java/com/waad/tba/modules/preauthorization/service/PreAuthorizationService.java#L516-L545)

### Frontend
- [PreApprovalsInbox.jsx](frontend/src/pages/pre-approvals/PreApprovalsInbox.jsx)
- [PreApprovalsInboxPro.jsx](frontend/src/pages/pre-approvals/PreApprovalsInboxPro.jsx)

---

## 📝 ملاحظات مهمة

1. **لا يوجد SUBMITTED في PreAuth:** عكس Claims، الموافقات المسبقة تُنشأ مباشرة بحالة `PENDING`
2. **FIFO:** الوارد مرتب بتاريخ الإنشاء تصاعدياً (الأقدم أولاً) لضمان العدالة
3. **الأمان:** جميع الـ endpoints محمية بـ `@PreAuthorize` مع صلاحيات `VIEW_PRE_AUTH`
4. **الأداء:** استخدام `JOIN FETCH` في Repository لتجنب N+1 queries

---

## ✅ النتيجة المتوقعة

بعد تطبيق هذه الإصلاحات:
- ✅ كل موافقة مسبقة تُنشأ من بوابة مقدم الخدمة ستظهر فورًا في الوارد
- ✅ أزرار الإجراءات تعمل بشكل صحيح حسب حالة الطلب
- ✅ نفس موثوقية سير عمل المطالبات
- ✅ لا يوجد تخمين أو منطق مخفي في الواجهة

---

## 🔐 إصلاحات صلاحيات المراجعين (2026-01-26 Update)

### المشكلة
بعد الموافقة أو الرفض، كان المراجع ينتقل لصفحة الإنشاء بدلاً من البقاء في الوارد. كما أن عملية الموافقة كانت تعلق.

### الأسباب
1. **عدم توافق حقل DTO:** Frontend يرسل `notes`، Backend يتوقع `approvalNotes`
2. **Routes غير محمية:** المراجعون يمكنهم الوصول لصفحات الإنشاء والتعديل
3. **أزرار ظاهرة للجميع:** أزرار التعديل والحذف ظاهرة حتى للمراجعين

### الإصلاحات المطبقة

#### 1. إصلاح حقل DTO (`approvalNotes`)

**PreApprovalsInbox.jsx & PreApprovalsInboxPro.jsx:**
```jsx
// ❌ قبل الإصلاح
await preApprovalsService.approve(selectedRequest.id, {
  approvedAmount: amount,
  notes: approveNotes  // ❌ حقل خاطئ
});

// ✅ بعد الإصلاح
await preApprovalsService.approve(selectedRequest.id, {
  approvedAmount: amount,
  approvalNotes: approveNotes  // ✅ يطابق Backend DTO
});
```

#### 2. حذف Routes الإنشاء والتعديل للمراجعين (`MainRoutes.jsx`)

```jsx
// ❌ Routes محذوفة/معلقة للمراجعين
// { path: 'pre-approvals/add', element: <PreApprovalAdd /> },
// { path: 'pre-approvals/edit/:id', element: <PreApprovalEdit /> },
// { path: 'claims/add', element: <ClaimsAdd /> },
// { path: 'claims/edit/:id', element: <ClaimsEdit /> },
```

#### 3. إخفاء أزرار التعديل/الحذف في القوائم

**PreApprovalsList.jsx & ClaimsList.jsx:**
```jsx
// إضافة EDIT_ROLES
const EDIT_ROLES = ['SUPER_ADMIN', 'INSURANCE_ADMIN', 'PROVIDER', 'EMPLOYER'];

// استخدام useAuth للتحقق من الصلاحية
const { user } = useAuth();
const canEdit = useMemo(() => {
  const role = user?.role || user?.roles?.[0];
  return EDIT_ROLES.includes(role);
}, [user]);

// إخفاء الأزرار للمراجعين
{canEdit && (
  <>
    <Tooltip title="تعديل">
      <IconButton onClick={() => handleNavigateEdit(row.original?.id)}>
        <EditIcon />
      </IconButton>
    </Tooltip>
    <Tooltip title="حذف">
      <IconButton onClick={() => handleDelete(row.original?.id)}>
        <DeleteIcon />
      </IconButton>
    </Tooltip>
  </>
)}
```

### الملفات المُعدلة (Update 2)

| الملف | التغيير |
|-------|---------|
| `PreApprovalsInbox.jsx` | `notes` → `approvalNotes` |
| `PreApprovalsInboxPro.jsx` | `notes` → `approvalNotes` + إزالة SUBMITTED من الفلاتر |
| `MainRoutes.jsx` | حذف routes الإنشاء/التعديل للمراجعين |
| `PreApprovalsList.jsx` | إضافة `canEdit` + إخفاء أزرار التعديل/الحذف |
| `ClaimsList.jsx` | إضافة `canEdit` + إخفاء أزرار التعديل/الحذف |

### سلوك النظام بعد الإصلاح

| الدور | عرض | تعديل | حذف | إنشاء | موافقة/رفض |
|-------|-----|-------|-----|-------|------------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| INSURANCE_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| PROVIDER | ✅ | ✅ | ✅ | ✅ | ❌ |
| EMPLOYER | ✅ | ✅ | ✅ | ❌ | ❌ |
| REVIEWER | ✅ | ❌ | ❌ | ❌ | ✅ |
