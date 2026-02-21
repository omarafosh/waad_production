# 🚀 دليل البدء السريع - نظام RBAC

## ⚡ البدء خلال 5 دقائق

### 1️⃣ إضافة صفحة جديدة بحماية صلاحيات

```jsx
// Step 1: في ملف المسارات (routes)
import ProtectedRoute from '../utils/ProtectedRoute';
import MyNewPage from '../pages/MyNewPage';

{
  path: 'my-page',
  element: (
    <ProtectedRoute requiredPermission="MY_FEATURE_VIEW">
      <MyNewPage />
    </ProtectedRoute>
  )
}

// Step 2: في المينيو
{
  id: 'my-feature',
  title: 'ميزتي الجديدة',
  type: 'item',
  url: '/provider/my-page',
  icon: icons.IconName,
  permission: 'MY_FEATURE_VIEW'  // ⚠️ مهم!
}

// Step 3: في الصفحة نفسها
import { useRBAC } from '../store/rbacSlice';

function MyNewPage() {
  const { hasPermission } = useRBAC();
  
  return (
    <div>
      {hasPermission('MY_FEATURE_VIEW') && <ViewSection />}
      {hasPermission('MY_FEATURE_CREATE') && <CreateButton />}
    </div>
  );
}
```

---

### 2️⃣ استخدام الصلاحيات في المكونات

```jsx
import { useRBAC } from '../store/rbacSlice';

function MyComponent() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRBAC();

  // صلاحية واحدة
  if (hasPermission('VISITS_CREATE')) {
    return <CreateVisitButton />;
  }

  // أي صلاحية من القائمة (OR)
  if (hasAnyPermission(['CLAIMS_VIEW', 'CLAIMS_REVIEW'])) {
    return <ClaimsList />;
  }

  // جميع الصلاحيات مطلوبة (AND)
  if (hasAllPermissions(['CLAIMS_VIEW', 'CLAIMS_APPROVE'])) {
    return <ApproveButton />;
  }

  return null;
}
```

---

### 3️⃣ الصلاحيات المتاحة

| الصلاحية | الوصف |
|----------|-------|
| `VISITS_VIEW` | عرض الزيارات |
| `VISITS_CREATE` | إنشاء زيارة |
| `CLAIMS_VIEW` | عرض المطالبات |
| `CLAIMS_CREATE` | إنشاء مطالبة |
| `CLAIMS_REVIEW` | مراجعة المطالبات |
| `CLAIMS_APPROVE` | الموافقة على المطالبة |
| `PREAUTH_VIEW` | عرض الموافقات المسبقة |
| `MEMBERS_VIEW` | عرض المؤمن عليهم |
| `DOCUMENTS_VIEW` | عرض المستندات |
| `FINANCIAL_REPORTS` | التقارير المالية |

**للقائمة الكاملة:** راجع [`frontend/src/config/permissions.map.js`](frontend/src/config/permissions.map.js)

---

### 4️⃣ الأدوار والصلاحيات

| الدور | الصلاحيات |
|-------|-----------|
| `SERVICE_PROVIDER` | 14 صلاحية - العمليات التشغيلية |
| `PARTNER_MANAGER` | 4 صلاحيات - قراءة فقط |
| `MEDICAL_REVIEWER` | 10 صلاحيات - المراجعة الطبية |
| `ACCOUNTANT` | 5 صلاحيات - المالية فقط |
| `SYSTEM_ADMIN` | جميع الصلاحيات |

---

### 5️⃣ الاختبار

#### في المتصفح (Console):

```javascript
// تحميل سكريبت الاختبار
const script = document.createElement('script');
script.src = '/src/tests/rbac-test-scenarios.js';
document.head.appendChild(script);

// اختبار جميع الأدوار
runAllRBACTests();

// اختبار المستخدم الحالي
testCurrentUser();

// اختبار دور معين
testServiceProvider();
testPartnerManager();
testMedicalReviewer();
testAccountant();
```

#### من Terminal:

```bash
# التحقق من التطبيق الصحيح
./scripts/verify-rbac-implementation.sh
```

---

### 6️⃣ القواعد الذهبية

✅ **افعل:**
- استخدم `hasPermission()` دائماً
- احمِ كل مسار بـ `<ProtectedRoute>`
- أضف `permission` لكل عنصر في المينيو
- استخدم conditional rendering بدلاً من CSS hiding

❌ **لا تفعل:**
- لا تستخدم `if (user.role === 'ADMIN')`
- لا تخفي العناصر بـ CSS فقط
- لا تترك صفحات بدون `<ProtectedRoute>`
- لا تنسى `permission` في المينيو

---

### 7️⃣ الأخطاء الشائعة

#### ❌ خطأ: Hardcoding Role

```jsx
// ❌ خطأ
if (user.role === 'SERVICE_PROVIDER') {
  return <VisitsPage />;
}

// ✅ صحيح
if (hasPermission('VISITS_VIEW')) {
  return <VisitsPage />;
}
```

#### ❌ خطأ: CSS Hiding

```jsx
// ❌ خطأ
<div style={{ display: user.role === 'ADMIN' ? 'block' : 'none' }}>
  <AdminPanel />
</div>

// ✅ صحيح
{hasPermission('SYSTEM_SETTINGS') && <AdminPanel />}
```

#### ❌ خطأ: نسيان Permission في المينيو

```jsx
// ❌ خطأ
{
  id: 'settings',
  title: 'الإعدادات',
  url: '/settings'
  // نسينا permission!
}

// ✅ صحيح
{
  id: 'settings',
  title: 'الإعدادات',
  url: '/settings',
  permission: 'SYSTEM_SETTINGS'
}
```

---

### 8️⃣ مصادر إضافية

📘 **الدليل الكامل:** [`RBAC_DEVELOPER_GUIDE.md`](RBAC_DEVELOPER_GUIDE.md)  
📊 **التقرير النهائي:** [`PROFESSIONAL_RBAC_IMPLEMENTATION_COMPLETE.md`](PROFESSIONAL_RBAC_IMPLEMENTATION_COMPLETE.md)  
🧪 **سيناريوهات الاختبار:** [`frontend/src/tests/rbac-test-scenarios.js`](frontend/src/tests/rbac-test-scenarios.js)  
✅ **التحقق:** [`scripts/verify-rbac-implementation.sh`](scripts/verify-rbac-implementation.sh)

---

### 9️⃣ Checklist - قبل Push

- [ ] أضفت `permission` لعنصر المينيو
- [ ] استخدمت `<ProtectedRoute>` للمسار
- [ ] استخدمت `hasPermission()` في المكون
- [ ] اختبرت مع جميع الأدوار
- [ ] لا توجد فحوصات hardcoded للأدوار
- [ ] شغلت `./scripts/verify-rbac-implementation.sh`

---

## 🆘 حل المشاكل

### المشكلة: المينيو لا يظهر
**الحل:** تحقق من:
1. هل `permission` موجودة في تعريف المينيو؟
2. هل المستخدم يمتلك الصلاحية؟ (شغّل `testCurrentUser()`)
3. هل الصلاحية مكتوبة بشكل صحيح؟

### المشكلة: 403 Forbidden
**الحل:**
1. تحقق من Backend `@PreAuthorize`
2. تحقق من `user.permissions` في Response
3. تحقق من تطابق اسم الصلاحية

### المشكلة: صفحة فارغة
**الحل:**
1. تحقق من `<ProtectedRoute>` configuration
2. تحقق من `requiredPermission` spelling
3. افتح Console وابحث عن أخطاء

---

**نصيحة أخيرة:** إذا كنت في شك، راجع [`RBAC_DEVELOPER_GUIDE.md`](RBAC_DEVELOPER_GUIDE.md) 📘

---

**تم إنشاء هذا الدليل:** 29 يناير 2026  
**آخر تحديث:** 29 يناير 2026
