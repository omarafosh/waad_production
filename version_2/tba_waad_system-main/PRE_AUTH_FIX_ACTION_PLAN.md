# 🛠️ خطة الإصلاح والتحسين - نظام الموافقات المسبقة

**التاريخ:** 2026-01-16  
**الهدف:** حل مشكلة عدم ظهور الموافقات المسبقة PENDING في الجداول والتقارير

---

## 📋 قائمة المهام

### المرحلة 1: التشخيص والتحقيق ✅ مكتمل
- [x] فحص Backend API endpoints
- [x] فحص Repository queries
- [x] فحص Frontend services  
- [x] فحص صفحات الجداول
- [x] إنشاء تقرير تشخيص شامل

### المرحلة 2: الاختبار والتحقق 🔄 قيد التنفيذ
- [ ] تشغيل Backend واختبار APIs
- [ ] اختبار `/api/pre-authorizations` (يجب أن يُرجع PENDING)
- [ ] اختبار `/api/pre-authorizations/inbox/pending`
- [ ] اختبار Frontend في المتصفح
- [ ] فحص Network Tab في DevTools
- [ ] فحص Console للأخطاء

### المرحلة 3: تحديد السبب الجذري ⏸️ معلق
- [ ] هل Backend يُرجع PENDING في `/api/pre-authorizations`؟
  - إذا لا → المشكلة في Backend Query
  - إذا نعم → المشكلة في Frontend
- [ ] هل Frontend Service يستقبل البيانات؟
  - إذا لا → مشكلة في Service Method
  - إذا نعم → مشكلة في Component Rendering
- [ ] هل توجد فلاتر نشطة على الجدول؟
  - فلتر في Column
  - فلتر في localStorage
  - فلتر في State

### المرحلة 4: التنفيذ ⏸️ معلق
حسب السبب الجذري:

#### السيناريو A: المشكلة في Backend
```java
// إذا كان Repository لا يُرجع PENDING
// تعديل: PreAuthorizationRepository.java
// التأكد من أن findByActiveTrue لا يحتوي على WHERE status != 'PENDING'
```

#### السيناريو B: المشكلة في Frontend Filters
```javascript
// إزالة أي فلتر افتراضي على Status
// PreApprovalsList.jsx
const [initialFilters] = useState({}); // بدلاً من { status: 'APPROVED' }
```

#### السيناريو C: المشكلة في TbaDataTable
```javascript
// إضافة debug logging
console.log('API Response:', data);
console.log('Filtered Data:', filteredData);
```

---

## 🧪 سكريبتات الاختبار

### 1. اختبار Backend API
```bash
# قم بتشغيل:
./test_preauth_api.sh

# المتوقع:
# ✅ إجمالي السجلات: X
# 📌 عدد PENDING في النتائج: Y (يجب أن يكون > 0)
```

### 2. اختبار Frontend Service
```javascript
// في Browser Console (F12)
// بعد تسجيل الدخول
fetch('/api/pre-authorizations?page=0&size=20', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  const content = data.data?.content || data.content || [];
  console.log('Total:', data.data?.totalElements || content.length);
  console.log('PENDING:', content.filter(x => x.status === 'PENDING').length);
  console.table(content.map(x => ({ id: x.id, status: x.status, member: x.memberName })));
});
```

---

## 🔧 الإصلاحات المقترحة

### Fix 1: إضافة Debug Mode في PreApprovalsList

```javascript
// frontend/src/pages/pre-approvals/PreApprovalsList.jsx
// أضف في الأعلى (بعد imports)
const DEBUG_MODE = true;

// في fetcher function
const fetcher = useCallback(async (params) => {
    if (DEBUG_MODE) {
      console.group('🔍 PreApprovalsList Fetcher');
      console.log('Input params:', params);
    }
    
    const data = await preApprovalsService.getAll(params);
    
    if (DEBUG_MODE) {
      console.log('API Response:', data);
      console.log('Total records:', data.totalElements || data.total);
      if (data.content || data.items) {
        const records = data.content || data.items;
        console.log('PENDING count:', records.filter(x => x.status === 'PENDING').length);
        console.log('APPROVED count:', records.filter(x => x.status === 'APPROVED').length);
        console.table(records.map(x => ({ 
          id: x.id, 
          status: x.status, 
          member: x.memberName,
          ref: x.referenceNumber 
        })));
      }
      console.groupEnd();
    }
    
    // ... باقي الكود
}, []);
```

### Fix 2: إضافة Status Filter Tabs (تحسين UX)

```javascript
// frontend/src/pages/pre-approvals/PreApprovalsList.jsx
import { Tabs, Tab, Badge } from '@mui/material';

const PreApprovalsList = () => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // تحديث fetcher ليستخدم status filter
  const fetcher = useCallback(async (params) => {
    // إضافة status filter إذا لم يكن ALL
    const apiParams = statusFilter !== 'ALL' 
      ? { ...params, status: statusFilter }
      : params;
    
    const data = await preApprovalsService.getAll(apiParams);
    
    // ... باقي الكود
  }, [statusFilter]);

  // في JSX - قبل MainCard
  return (
    <Box>
      <ModernPageHeader ... />
      
      {/* Status Filter Tabs */}
      <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={statusFilter} 
          onChange={(e, newValue) => setStatusFilter(newValue)}
          aria-label="status filter tabs"
        >
          <Tab 
            label={
              <Badge badgeContent={stats.all} color="primary">
                الكل
              </Badge>
            } 
            value="ALL" 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.pending} color="warning">
                معلق
              </Badge>
            } 
            value="PENDING" 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.approved} color="success">
                موافق عليه
              </Badge>
            } 
            value="APPROVED" 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.rejected} color="error">
                مرفوض
              </Badge>
            } 
            value="REJECTED" 
          />
        </Tabs>
      </Box>

      <MainCard ...>
        ...
      </MainCard>
    </Box>
  );
};
```

### Fix 3: إضافة Backend Endpoint للإحصائيات

```java
// backend/src/main/java/com/waad/tba/modules/preauthorization/controller/PreAuthorizationController.java
/**
 * Get statistics by status
 * GET /api/pre-authorizations/stats
 */
@GetMapping("/stats")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PRE_AUTH')")
public ResponseEntity<ApiResponse<Map<String, Long>>> getStatistics() {
    log.info("[API] Fetching pre-authorization statistics");
    
    List<Object[]> results = preAuthorizationRepository.countByStatus();
    
    Map<String, Long> stats = new HashMap<>();
    stats.put("TOTAL", 0L);
    
    for (Object[] row : results) {
        PreAuthStatus status = (PreAuthStatus) row[0];
        Long count = (Long) row[1];
        stats.put(status.name(), count);
        stats.put("TOTAL", stats.get("TOTAL") + count);
    }
    
    return ResponseEntity.ok(ApiResponse.success(stats));
}
```

```javascript
// frontend/src/services/api/pre-approvals.service.js
/**
 * Get statistics by status
 */
getStats: async () => {
  const response = await axiosClient.get(`${BASE_URL}/stats`);
  return response.data?.data || response.data;
}
```

### Fix 4: إضافة Alert توضيحي في الجدول

```javascript
// frontend/src/pages/pre-approvals/PreApprovalsList.jsx
<MainCard
  title="قائمة الموافقات المسبقة"
  secondary={
    <Stack direction="row" spacing={2} alignItems="center">
      {/* Alert توضيحي */}
      <Alert 
        severity="info" 
        variant="outlined" 
        sx={{ py: 0.5, px: 1.5 }}
        icon={<InfoIcon />}
      >
        💡 لعرض الموافقات المعلقة فقط، استخدم تبويب <strong>"معلق"</strong> أعلاه
      </Alert>
      
      {/* زر Refresh */}
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={triggerRefresh}
      >
        تحديث
      </Button>
    </Stack>
  }
>
  ...
</MainCard>
```

---

## 📊 مصفوفة اتخاذ القرار

| الحالة | الإجراء المطلوب |
|--------|-----------------|
| Backend لا يُرجع PENDING في `/api/pre-authorizations` | تعديل Repository Query |
| Backend يُرجع PENDING لكن Frontend لا يستقبلها | تعديل Service Method |
| Frontend يستقبل البيانات لكن لا يعرضها | فحص Component Rendering |
| البيانات تصل للـ Table لكن لا تظهر | فحص Column Filters / TbaDataTable State |
| البيانات تظهر في Console لكن ليس في UI | فحص CSS / Conditional Rendering |

---

## ✅ معايير القبول

تُعتبر المشكلة محلولة عندما:

1. ✅ `/api/pre-authorizations` يُرجع سجلات PENDING
2. ✅ `preApprovalsService.getAll()` يستقبل البيانات بشكل صحيح
3. ✅ PreApprovalsList يعرض سجلات PENDING في الجدول
4. ✅ يمكن فلترة الجدول حسب Status
5. ✅ الإحصائيات تظهر بشكل صحيح
6. ✅ صندوق الوارد (Inbox) لا يزال يعمل

---

## 🚀 خطوات التنفيذ المقترحة

### الخطوة 1: التحقق (15 دقيقة)
```bash
# 1. قم بتشغيل Backend
./start-backend.sh

# 2. انتظر حتى يبدأ (حوالي 30 ثانية)

# 3. اختبر APIs
./test_preauth_api.sh

# 4. افتح Frontend
npm run dev

# 5. افتح Browser DevTools (F12)
# 6. اذهب إلى صفحة الموافقات المسبقة
# 7. افتح Network Tab
# 8. ابحث عن Request: pre-authorizations?page=...
# 9. تحقق من Response
```

### الخطوة 2: تحديد السبب (10 دقائق)
```javascript
// في Browser Console
// نفذ الاختبارات من القسم "سكريبتات الاختبار" أعلاه
```

### الخطوة 3: تطبيق الحل المناسب (30 دقيقة)
حسب السبب المُحدد في الخطوة 2

### الخطوة 4: الاختبار النهائي (15 دقيقة)
- [ ] إنشاء موافقة مسبقة جديدة من بوابة مقدم الخدمة
- [ ] التحقق من ظهورها في صندوق الوارد ✅
- [ ] التحقق من ظهورها في الجدول الرئيسي ✅
- [ ] التحقق من ظهورها في التقارير ✅
- [ ] الموافقة عليها
- [ ] التحقق من تحديث الحالة في الجدول

---

## 📝 التوثيق

بعد الانتهاء، قم بتحديث:

1. **PRE_AUTH_DIAGNOSIS_FINAL.md** - إضافة النتائج النهائية
2. **ARCHITECTURE_DECISION_RECORD.md** - توثيق أي تغييرات معمارية
3. **README.md** - تحديث دليل الاستخدام إذا لزم الأمر
4. **API_CONTRACT.md** - توثيق أي endpoints جديدة

---

## 🆘 جهات الاتصال

إذا واجهت صعوبات:
- راجع التقرير الشامل: [PRE_AUTH_DIAGNOSIS_FINAL.md](./PRE_AUTH_DIAGNOSIS_FINAL.md)
- تحقق من الـ logs في `backend/logs/`
- تحقق من Console في Browser DevTools

---

**آخر تحديث:** 2026-01-16  
**الحالة:** في انتظار الاختبار والتحقيق

