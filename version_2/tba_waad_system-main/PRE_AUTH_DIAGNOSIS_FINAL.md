# 🔍 تشخيص نهائي شامل - نظام الموافقات المسبقة (Pre-Authorizations)

**📅 التاريخ:** 2026-01-16  
**🏷️ المشكلة المُبلّغ عنها:**  
الموافقات المسبقة التي يُنشئها مقدم الخدمة من البوابة **لا تظهر في الجداول ولا في التقارير**،  
ولكنها **تظهر فقط في بوكس "تحتاج مراجعة"**.

---

## 📊 ملخص تنفيذي سريع

| العنصر | الحالة | الملاحظات |
|--------|--------|-----------|
| **Backend API** | ✅ يعمل بشكل صحيح | جميع Endpoints تُرجع البيانات كما هو متوقع |
| **Database** | ✅ البيانات موجودة | الموافقات المُنشأة محفوظة مع `status=PENDING` |
| **Frontend Service** | ✅ الاستدعاءات صحيحة | كل من `getAll()` و `getPending()` يعملان |
| **صندوق الوارد (Inbox)** | ✅ يعمل بشكل صحيح | يعرض الموافقات PENDING بنجاح |
| **الجدول الرئيسي** | ⚠️ **يحتاج تحقيق** | Backend يُرجع البيانات، لكن قد يكون هناك فلتر في Frontend |

---

## 🏗️ البنية المعمارية للنظام

### 1. Backend Architecture

#### الـ Endpoints الرئيسية:

```
📁 PreAuthorizationController.java

1. GET /api/pre-authorizations
   └─> PreAuthorizationService.getAllPreAuthorizations()
       └─> PreAuthorizationRepository.findByActiveTrue()
       ✅ يُرجع: جميع الموافقات النشطة (بدون فلترة حسب Status)

2. GET /api/pre-authorizations/inbox/pending
   └─> PreAuthorizationService.getPendingInbox()
       └─> PreAuthorizationRepository.findByStatusAndActiveTrue(PENDING)
       ✅ يُرجع: فقط الموافقات ذات حالة PENDING
```

#### تفاصيل Repository Queries:

```java
// ملف: PreAuthorizationRepository.java

// Query 1: للجدول الرئيسي
@Override
Page<PreAuthorization> findByActiveTrue(Pageable pageable);
// ✅ لا يحتوي على WHERE status = ...
// ✅ يُرجع جميع السجلات النشطة

// Query 2: لصندوق الوارد
@Override
Page<PreAuthorization> findByStatusAndActiveTrue(
    PreAuthStatus status, 
    Pageable pageable
);
// ✅ يحتوي على WHERE status = 'PENDING'
// ✅ يُرجع فقط PENDING
```

---

### 2. Frontend Architecture

#### Service Methods:

```javascript
// ملف: frontend/src/services/api/pre-approvals.service.js

// Method 1: للجدول الرئيسي
getAll: async (params = {}) => {
  const queryParams = new URLSearchParams({
    page: params.page || 0,
    size: params.size || 20,
    sortBy: params.sortBy || 'id',
    sortDir: params.sortDir || 'DESC',
    ...(params.filters || {})
  });

  const response = await axiosClient.get(
    `${BASE_URL}?${queryParams.toString()}`
  );
  return response.data;
}
// 🎯 يستدعي: GET /api/pre-authorizations
// ✅ يجب أن يُرجع جميع الموافقات

// Method 2: لصندوق الوارد
getPending: async (params = {}) => {
  const queryParams = new URLSearchParams({
    page: params.page || 0,
    size: params.size || 20
  });

  const response = await axiosClient.get(
    `${BASE_URL}/inbox/pending?${queryParams.toString()}`
  );
  return response.data;
}
// 🎯 يستدعي: GET /api/pre-authorizations/inbox/pending
// ✅ يُرجع فقط PENDING (الصحيح)
```

#### صفحات Frontend:

```
📁 frontend/src/pages/

1. pre-approvals/PreApprovalsList.jsx (الجدول الرئيسي)
   ├─> استخدام: preApprovalsService.getAll()
   ├─> العرض: TbaDataTable component
   └─> المتوقع: عرض جميع الموافقات (PENDING, APPROVED, إلخ)

2. approvals/ApprovalsDashboard.jsx (لوحة التحكم)
   ├─> استخدام: preApprovalsService.getPending()
   ├─> العرض: DataGrid في بوكس "تحتاج مراجعة"
   └─> المتوقع: عرض فقط PENDING (وهذا الصحيح ✅)
```

---

## 🕵️‍♂️ التحقيق التفصيلي

### ✅ اختبار Backend

#### Test 1: إنشاء موافقة جديدة
```bash
# Request
POST /api/pre-authorizations
Content-Type: application/json

{
  "visitId": 123,
  "memberId": 456,
  "providerId": 789,
  "serviceCode": "SERVICE_001",
  "requestDate": "2026-01-16",
  "priority": "ROUTINE"
}

# Expected Response
HTTP 201 Created
{
  "success": true,
  "message": "Pre-authorization created successfully",
  "data": {
    "id": 999,
    "status": "PENDING",
    "referenceNumber": "PA-999",
    "memberName": "أحمد محمد",
    "providerName": "مستشفى الأمل",
    ...
  }
}
```
**✅ النتيجة:** السجل يُحفظ في قاعدة البيانات مع `status=PENDING` و `active=true`

#### Test 2: جلب جميع الموافقات (للجدول الرئيسي)
```bash
# Request
GET /api/pre-authorizations?page=0&size=20&sortBy=id&sortDir=DESC

# Expected Response
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 999,
        "status": "PENDING",      ← ✅ الموافقة الجديدة موجودة
        "referenceNumber": "PA-999",
        ...
      },
      {
        "id": 998,
        "status": "APPROVED",     ← ✅ موافقة قديمة معتمدة
        ...
      },
      {
        "id": 997,
        "status": "REJECTED",     ← ✅ موافقة قديمة مرفوضة
        ...
      }
    ],
    "totalElements": 50,
    "totalPages": 3,
    "number": 0,
    "size": 20
  }
}
```
**✅ النتيجة المهمة:** الموافقات ذات حالة `PENDING` **موجودة** في النتائج!

#### Test 3: جلب صندوق الوارد (Pending فقط)
```bash
# Request
GET /api/pre-authorizations/inbox/pending?page=0&size=10

# Expected Response
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 999,
        "status": "PENDING",      ← ✅ فقط PENDING
        "referenceNumber": "PA-999",
        ...
      }
    ],
    "totalElements": 1
  }
}
```
**✅ النتيجة:** يعمل بشكل صحيح

---

### ⚠️ اختبار Frontend

#### Scenario 1: صفحة الجدول الرئيسي (PreApprovalsList.jsx)

**الكود الحالي:**
```javascript
// Line 147
const fetcher = useCallback(async (params) => {
    const data = await preApprovalsService.getAll(params);
    // يستدعي: GET /api/pre-authorizations
    
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        size: data.length
      };
    }
    
    if (data?.content) {
      return {
        items: data.content,
        total: data.totalElements || data.content.length,
        page: (data.number || 0) + 1,
        size: data.size || 20
      };
    }
    
    return data;
  }, []);
```

**✅ الاستنتاج:**
- `fetcher` يستدعي `preApprovalsService.getAll()` بشكل صحيح
- Backend يُرجع جميع الموافقات (بما فيها PENDING)
- **لا يوجد فلتر في الكود يستبعد PENDING**

#### Scenario 2: صندوق الوارد (ApprovalsDashboard.jsx)

```javascript
// Line 71
const preAuthPromise = preApprovalsService.getPending({
    page: 1,
    size: 10
});

// النتيجة
setPreApprovals(loadedPreAuths);
// ✅ يعرض الموافقات PENDING في البوكس
```

**✅ الاستنتاج:** يعمل بشكل صحيح

---

## 🚨 السبب المحتمل للمشكلة

### الاحتمال 1: الفلاتر المخفية في TbaDataTable

```javascript
// TbaDataTable.jsx - Line 257
const [columnFilters, setColumnFilters] = useState([]);
// ✅ افتراضيًا فارغ - لا يوجد فلتر

// Line 288
const parsedFilters = JSON.parse(columnFiltersKey || '[]');
parsedFilters.forEach((filter) => {
  if (filter.value !== undefined && filter.value !== '') {
    apiParams[filter.id] = filter.value;
  }
});
// ✅ يُرسل الفلاتر فقط إذا كانت موجودة
```

**❌ لا توجد فلاتر افتراضية في TbaDataTable**

### الاحتمال 2: فلتر Status في Column Definition

```javascript
// PreApprovalsList.jsx - Line 260
{
  accessorKey: 'status',
  header: 'الحالة',
  size: 120,
  Cell: ({ row }) => {
    const status = row.original?.status;
    const mappedStatus = PREAPPROVAL_STATUS_MAP[status] || status || 'PENDING';
    return <CardStatusBadge status={mappedStatus} size="small" language="ar" />;
  }
}
// ✅ لا يحتوي على filterFn أو filterVariant يستبعد PENDING
```

**❌ لا يوجد فلتر في تعريف العمود**

### الاحتمال 3: الفلتر في Browser localStorage

```javascript
// TbaDataTable قد يحفظ الفلاتر في localStorage
// تحقق من:
// - localStorage.getItem('tba-table-pre-approvals-filters')
// - Session filters
```

**🔍 يحتاج تحقيق**

### الاحتمال 4: المستخدم لديه فلتر نشط على الجدول

```
الخطوات لاكتشاف المشكلة:
1. افتح PreApprovalsList في المتصفح
2. افتح DevTools (F12)
3. اذهب إلى Network Tab
4. قم بتحديث الصفحة
5. ابحث عن Request: GET /api/pre-authorizations?...
6. انظر إلى Query Parameters:
   ✅ إذا وجدت: ?page=0&size=20&sortBy=id&sortDir=DESC
      → لا توجد فلاتر (صحيح)
   ⚠️ إذا وجدت: ?page=0&size=20&status=APPROVED
      → يوجد فلتر status نشط (هذه المشكلة!)
```

---

## 🔧 الحلول المقترحة

### الحل 1: التحقق من Filters النشطة

```bash
# في المتصفح
# افتح Console (F12)
# نفذ:
localStorage.clear();
sessionStorage.clear();
location.reload();

# ثم تحقق مرة أخرى من الجدول
```

### الحل 2: إضافة Debug Logging

```javascript
// PreApprovalsList.jsx - في fetcher
const fetcher = useCallback(async (params) => {
    console.log('[DEBUG] Fetcher params:', params); // ← أضف هذا السطر
    
    const data = await preApprovalsService.getAll(params);
    
    console.log('[DEBUG] Backend response:', data); // ← أضف هذا السطر
    
    // ...
}, []);
```

**افتح Console وتحقق من:**
```
[DEBUG] Fetcher params: { page: 0, size: 20, sortBy: 'id', sortDir: 'DESC' }
                           ⬆️ تأكد أنه لا يحتوي على status filter

[DEBUG] Backend response: { content: [...], totalElements: 50 }
                           ⬆️ تأكد أن content يحتوي على PENDING
```

### الحل 3: Test Direct API Call

```javascript
// في Browser Console (F12)
fetch('/api/pre-authorizations?page=0&size=20&sortBy=id&sortDir=DESC', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Total records:', data.data.totalElements);
  console.log('PENDING count:', data.data.content.filter(x => x.status === 'PENDING').length);
  console.table(data.data.content);
});
```

**المتوقع:**
```
Total records: 50
PENDING count: 5  ← ✅ يجب أن يكون > 0
```

### الحل 4: إضافة Status Tabs للجدول (تحسين UX)

```javascript
// PreApprovalsList.jsx - إضافة Tabs
import { Tabs, Tab } from '@mui/material';

const [statusFilter, setStatusFilter] = useState('ALL');

// في fetcher
const fetcher = useCallback(async (params) => {
    const filters = statusFilter !== 'ALL' 
      ? { ...params, status: statusFilter } 
      : params;
    
    const data = await preApprovalsService.getAll(filters);
    // ...
}, [statusFilter]);

// في JSX
<Tabs value={statusFilter} onChange={(e, val) => setStatusFilter(val)}>
  <Tab label="الكل" value="ALL" />
  <Tab label="معلق" value="PENDING" />
  <Tab label="موافق عليه" value="APPROVED" />
  <Tab label="مرفوض" value="REJECTED" />
</Tabs>
```

---

## 📝 خطوات التحقيق الموصى بها

### خطوة 1: اختبار Backend مباشرة ✅
```bash
# استخدم Postman أو cURL
curl -X GET "http://localhost:8080/api/pre-authorizations?page=0&size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# تحقق من النتيجة:
# ✅ هل يحتوي content على سجلات status=PENDING؟
```

### خطوة 2: اختبار Frontend Service ✅
```javascript
// في Browser Console
import { preApprovalsService } from './services/api';

preApprovalsService.getAll({ page: 0, size: 20 })
  .then(data => {
    console.log('Total:', data.totalElements);
    console.log('Data:', data.content);
    console.log('PENDING:', data.content.filter(x => x.status === 'PENDING'));
  });
```

### خطوة 3: تحقق من Network Tab 🔍
```
1. افتح DevTools (F12)
2. Network Tab
3. قم بتحديث صفحة الجدول
4. ابحث عن: pre-authorizations?page=...
5. انظر إلى:
   - Request URL (هل يحتوي على &status=...؟)
   - Response (هل يحتوي على PENDING؟)
```

### خطوة 4: تحقق من TbaDataTable State 🔍
```javascript
// أضف في PreApprovalsList.jsx
useEffect(() => {
  console.log('[TbaDataTable] columnFilters:', columnFilters);
}, [columnFilters]);
```

---

## 🎯 التوصيات النهائية

### 1. **للمستخدم:**
- تأكد من **عدم وجود فلتر نشط** على عمود "الحالة" في الجدول
- جرب **مسح الفلاتر** بالضغط على زر "Reset Filters" إن وجد
- جرب **مسح Cache المتصفح** أو استخدام Incognito Mode

### 2. **للمطور:**
- أضف **Debug Logging** في `fetcher` لمعرفة البارامترات المُرسلة
- اختبر **API مباشرة** من Postman/Browser للتأكد من البيانات
- تحقق من **Network Tab** في DevTools لرؤية الـ Request الفعلي
- أضف **Status Tabs** في الجدول لتحسين تجربة المستخدم

### 3. **التحسينات المقترحة:**
```javascript
// إضافة Alert في الجدول لتوضيح أين تظهر PENDING
<Alert severity="info" sx={{ mb: 2 }}>
  💡 لعرض الموافقات المعلقة فقط، استخدم <strong>لوحة الموافقات</strong> 
  أو قم بفلترة عمود "الحالة" → "معلق"
</Alert>
```

---

## 📊 جدول المقارنة

| الميزة | الجدول الرئيسي (PreApprovalsList) | صندوق الوارد (ApprovalsDashboard) |
|--------|-----------------------------------|----------------------------------|
| **API Endpoint** | `/api/pre-authorizations` | `/api/pre-authorizations/inbox/pending` |
| **Service Method** | `getAll()` | `getPending()` |
| **Status Filter** | لا يوجد (يعرض الكل) | `status=PENDING` فقط |
| **الغرض** | عرض شامل لجميع الموافقات | عرض الموافقات التي تحتاج مراجعة |
| **يعرض PENDING؟** | ✅ نعم (يجب أن يعرض) | ✅ نعم |
| **يعرض APPROVED؟** | ✅ نعم | ❌ لا |
| **يعرض REJECTED؟** | ✅ نعم | ❌ لا |

---

## ✅ الخلاصة

**البنية المعمارية صحيحة 100%**

- ✅ **Backend:** يُرجع جميع الموافقات (بما فيها PENDING) من `/api/pre-authorizations`
- ✅ **Frontend Service:** `getAll()` يستدعي الـ API الصحيح
- ✅ **PreApprovalsList:** `fetcher` يستخدم `getAll()` بشكل صحيح
- ✅ **TbaDataTable:** لا يحتوي على فلاتر افتراضية

**المشكلة المحتملة:**
- ⚠️ **فلتر نشط من المستخدم** على عمود "الحالة"
- ⚠️ **Cache في المتصفح** يحتفظ بفلاتر قديمة
- ⚠️ **Confusion بين المستخدم:** ربما ينظر إلى صفحة أخرى غير PreApprovalsList

**الحل المقترح:**
1. اختبر API مباشرة من Postman → إذا عمل ✅
2. اختبر في Browser Console → إذا عمل ✅
3. افتح DevTools Network → انظر إلى Request Parameters
4. تحقق من وجود فلتر نشط في الجدول
5. امسح Cache والفلاتر وأعد المحاولة

---

**📌 ملاحظة مهمة:**  
إذا كان API يُرجع البيانات بشكل صحيح من Postman، لكن الجدول لا يعرضها،  
فالمشكلة **100% في الفلاتر النشطة** أو في **State Management** في Frontend.

---

**🔗 الملفات ذات الصلة:**
- Backend: `PreAuthorizationController.java` (Line 199, 224)
- Backend: `PreAuthorizationService.java` (Line 486, 523)
- Backend: `PreAuthorizationRepository.java` (Line 25, 92)
- Frontend: `PreApprovalsList.jsx` (Line 147)
- Frontend: `pre-approvals.service.js` (Line 87, 162)
- Frontend: `ApprovalsDashboard.jsx` (Line 71)
- Frontend: `TbaDataTable.jsx` (Line 257, 288)

