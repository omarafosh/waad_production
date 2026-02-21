# 🔥 PERMISSION STABILIZATION SMOKE TEST

## تاريخ التنفيذ: 2026-02-03
## الهدف: التحقق من استقرار النظام بعد إصلاح Permission Migration

---

## 📋 ملخص الإصلاحات المنفذة

### PHASE A: SUPER_ADMIN Normalization ✅
- إضافة `ALL_PERMISSIONS` constant شامل لجميع الصلاحيات
- تنفيذ `normalizeSuperAdminPermissions()` - تحقن جميع الصلاحيات تلقائياً لـ SUPER_ADMIN
- تعديل `useRBAC` hook لإضافة `hasPermission`, `hasAnyPermission`, `hasAllPermissions`
- **النتيجة**: SUPER_ADMIN يُعامل دائماً كأنه يملك جميع الصلاحيات

### PHASE B: Error Boundary & Safe API ✅
- إنشاء `ApiErrorHandler` - معالج مركزي لأخطاء API (401/403/404/500)
- إنشاء `SafeDataWrapper` - wrapper لمنع crashes من null/undefined data
- إنشاء `PageErrorBoundary` - error boundary على مستوى الصفحة
- إضافة `PageErrorBoundary` في `DashboardLayout`
- **النتيجة**: لا توجد صفحات بيضاء أو crashes

### PHASE C: Menu Permission Hardening ✅
- إعادة كتابة `filterMenuByRoles()` - permission-based فقط، بدون role-based logic
- تحديث `MENU_PERMISSIONS` map مع جميع menu items
- SUPER_ADMIN/ADMIN → يرى جميع القوائم (bypass)
- الأدوار الأخرى → filtering حسب permissions فقط
- **النتيجة**: القوائم تعتمد فقط على الصلاحيات

---

## 🧪 اختبارات الدخان (Smoke Tests)

### 1️⃣ SUPER_ADMIN Test

| الصفحة | المسار | النتيجة المتوقعة | الحالة |
|--------|--------|------------------|--------|
| لوحة المعلومات | `/dashboard` | تحميل بدون أخطاء | ⏳ |
| المؤمن عليهم | `/members` | قائمة كاملة | ⏳ |
| الشركاء | `/employers` | قائمة كاملة | ⏳ |
| مقدمو الخدمة | `/providers` | قائمة كاملة | ⏳ |
| وارد المطالبات | `/claims/inbox` | inbox يعمل | ⏳ |
| وارد الموافقات | `/pre-approvals/inbox` | inbox يعمل | ⏳ |
| حسابات مقدمي الخدمة | `/settlement/provider-accounts` | قائمة كاملة | ⏳ |
| دفعات التسوية | `/settlement/batches` | قائمة كاملة | ⏳ |
| التقارير | `/reports/*` | جميع التقارير | ⏳ |
| المستخدمون والأدوار | `/rbac` | إدارة كاملة | ⏳ |
| إعدادات النظام | `/settings/company` | إعدادات كاملة | ⏳ |

**المتوقع**: جميع الصفحات تعمل بدون أخطاء 500

---

### 2️⃣ ACCOUNTANT Test (المحاسب)

| الصفحة | المسار | النتيجة المتوقعة | الحالة |
|--------|--------|------------------|--------|
| لوحة المعلومات | `/dashboard` | تحميل (محتوى محدود) | ⏳ |
| حسابات مقدمي الخدمة | `/settlement/provider-accounts` | ✅ يظهر | ⏳ |
| دفعات التسوية | `/settlement/batches` | ✅ يظهر | ⏳ |
| التقارير المالية | `/reports/financial` | ✅ يظهر | ⏳ |
| تقارير تسوية مقدمي الخدمة | `/reports/provider-settlement` | ✅ يظهر | ⏳ |
| المؤمن عليهم | `/members` | ❌ لا يظهر بالقائمة | ⏳ |
| الشركاء | `/employers` | ❌ لا يظهر بالقائمة | ⏳ |
| RBAC | `/rbac` | ❌ لا يظهر بالقائمة | ⏳ |

**الصلاحيات المتوقعة**:
- VIEW_SETTLEMENTS
- VIEW_PROVIDER_ACCOUNTS
- VIEW_REPORTS
- VIEW_CLAIMS (قراءة فقط)

---

### 3️⃣ REVIEWER Test (المراجع الطبي)

| الصفحة | المسار | النتيجة المتوقعة | الحالة |
|--------|--------|------------------|--------|
| لوحة المعلومات | `/dashboard` | تحميل | ⏳ |
| وارد المطالبات | `/claims/inbox` | ✅ يظهر | ⏳ |
| وارد الموافقات المسبقة | `/pre-approvals/inbox` | ✅ يظهر | ⏳ |
| لوحة الموافقات الموحدة | `/approvals/dashboard` | ✅ يظهر | ⏳ |
| تقارير المطالبات | `/reports/claims` | ✅ يظهر | ⏳ |
| التسويات | `/settlement/*` | ❌ لا يظهر | ⏳ |
| الأعضاء | `/members` | ❌ لا يظهر | ⏳ |
| RBAC | `/rbac` | ❌ لا يظهر | ⏳ |

**الصلاحيات المتوقعة**:
- VIEW_CLAIMS
- APPROVE_CLAIMS
- REJECT_CLAIMS
- VIEW_PRE_AUTH
- APPROVE_PRE_AUTH
- REJECT_PRE_AUTH
- VIEW_REPORTS

---

### 4️⃣ PROVIDER Test (مقدم الخدمة)

| الصفحة | المسار | النتيجة المتوقعة | الحالة |
|--------|--------|------------------|--------|
| بوابة مقدم الخدمة | `/provider/*` | ✅ المجموعة الوحيدة | ⏳ |
| التحقق من الأهلية | `/provider/eligibility-check` | ✅ يعمل | ⏳ |
| سجل الزيارات | `/provider/visits` | ✅ يعمل | ⏳ |
| المستندات | `/provider/documents` | ✅ يعمل | ⏳ |
| لوحة المعلومات الرئيسية | `/dashboard` | ❌ لا يظهر | ⏳ |
| المؤمن عليهم | `/members` | ❌ لا يظهر | ⏳ |
| التقارير | `/reports/*` | ❌ لا يظهر | ⏳ |
| RBAC | `/rbac` | ❌ لا يظهر | ⏳ |

**الصلاحيات المتوقعة**:
- VIEW_MEMBERS (للتحقق من الأهلية)
- MANAGE_VISITS
- CREATE_CLAIM
- CREATE_PRE_AUTH
- VIEW_CLAIMS (حالة المطالبات المقدمة)
- VIEW_PRE_AUTH (حالة الموافقات المقدمة)

---

## 🔴 أعراض يجب التحقق من عدم وجودها

1. **أخطاء 500**: لا توجد صفحات تعيد خطأ 500
2. **صفحات بيضاء**: لا توجد white screens
3. **قوائم غير مصرح بها**: لا يرى المستخدم قوائم ليس له صلاحية عليها
4. **crashes**: لا توجد JavaScript errors تسبب crash

---

## 📁 الملفات المعدلة

```
frontend/src/api/rbac.js
  - إضافة ALL_PERMISSIONS constant
  - إضافة normalizeSuperAdminPermissions()
  - تحديث useRBAC hook مع hasPermission functions

frontend/src/components/SafeStates/
  - ApiErrorHandler.jsx (جديد)
  - SafeDataWrapper.jsx (جديد)
  - PageErrorBoundary.jsx (جديد)
  - index.js (جديد)

frontend/src/layout/Dashboard/index.jsx
  - إضافة PageErrorBoundary wrapper

frontend/src/menu-items/components.jsx
  - إعادة كتابة filterMenuByRoles() - permission-based only

frontend/src/config/rbac.config.js
  - تحديث MENU_PERMISSIONS map
```

---

## ✅ معايير النجاح

- [ ] SUPER_ADMIN يدخل جميع الصفحات بدون أخطاء 500
- [ ] ACCOUNTANT يرى فقط: Settlement + Financial Reports
- [ ] REVIEWER يرى فقط: Inbox pages + Dashboard + Reports
- [ ] PROVIDER يرى فقط: Provider Portal
- [ ] لا توجد صفحات بيضاء أو crashes
- [ ] القوائم تظهر فقط حسب الصلاحيات (لا role-based logic)

---

## 🚀 خطوات التشغيل

```bash
# 1. Start backend
cd backend && ./mvnw spring-boot:run

# 2. Start frontend
cd frontend && npm run dev

# 3. Login with different roles and test each scenario
```

---

## 📞 للإبلاغ عن مشاكل

عند اكتشاف مشكلة، يرجى توثيق:
1. الدور المستخدم
2. الصفحة/المسار
3. الخطأ الظاهر (screenshot إن أمكن)
4. Console errors (F12 → Console)
