# خطة تحديث صفحات إدارة مقدمي الخدمة

## 📋 الملخص
تحديث صفحات إضافة وتعديل مقدمي الخدمة لتطابق المستودع المرجعي `omarafosh/waadTbaSystem2026` مع جميع الميزات المتقدمة.

## 🎯 الأهداف

### 1. ProviderCreate.jsx
**الحالة**: Stepper Interface → **المطلوب**: Tabs + User Management

**التغييرات المطلوبة**:
- ✅ استبدال Stepper بواجهة Tabs (3 تبويبات)
- ✅ إضافة تبويب Account Manager مع 3 أوضاع:
  - CREATE: إنشاء مستخدم جديد
  - LINK: ربط مستخدم موجود غير مرتبط
  - SKIP: تخطي تعيين مستخدم
- ✅ Autocomplete لاختيار المستخدمين
- ✅ Auto-fill من البيانات الأساسية

**Services Required**:
```javascript
usersService.getUnassignedProviders() // قائمة المستخدمين غير المرتبطين
usersService.createUser(payload)      // إنشاء مستخدم جديد
rolesService.getAllRoles()            // الحصول على دور PROVIDER
usersService.assignRoles(userId, [roleId]) // تعيين الدور
usersService.updateUser(id, {providerId}) // ربط المستخدم بالمزود
```

---

### 2. ProviderEdit.jsx
**الحالة**: Single Form → **المطلوب**: 6 Tabs Interface

**التبويبات المطلوبة**:
1. **Basic Info (أساسي)**: البيانات الأساسية
2. **Location (موقع)**: الموقع والتواصل
3. **Contracts (عقود)**: معلومات العقد
4. **Partners (شركاء)**: شركاء التأمين
   - Toggle "Allow All Employers"
   - جدول تفعيل/إيقاف الشركاء
5. **Responsible User (مدير الحساب)**: المستخدم المسؤول
   - عرض المستخدم المرتبط
   - Unlink with strict confirmation (كتابة اسم المستخدم)
   - Link existing user
   - Create new user
6. **Documents (مستندات)**: إدارة المستندات
   - Upload: LICENSE, COMMERCIAL_REGISTER, TAX_CERTIFICATE, CONTRACT_COPY, OTHER
   - Preview (iframe)
   - Delete with confirmation
   - Expiry date tracking

**Services Required**:
```javascript
// User Management
usersService.getUsersByProvider(id)      // المستخدم المرتبط
usersService.getUnassignedProviders()    // قائمة المستخدمين المتاحين
usersService.createUser(payload)         // إنشاء مستخدم جديد
usersService.updateUser(id, {providerId: null}) // فك الارتباط
usersService.assignRoles(userId, [roleId])

// Partners
getEmployerSelectors()                   // قائمة الشركاء
providersService.getAllowedEmployerIds(id) // الشركاء المصرح بهم

// Documents
providersService.getDocuments(id)        // قائمة المستندات
providersService.addDocument(id, formData) // رفع مستند
providersService.deleteDocument(providerId, docId) // حذف
```

---

## 📦 Required Service Methods

### usersService (services/rbac/users.service.js)
```javascript
// ✅ موجودة
assignRoles: (id, roleIds) => { ... }

// ❌ غير موجودة - يجب إضافتها
getUnassignedProviders: () => api.get('/rbac/users/unassigned-providers')
getUsersByProvider: (providerId) => api.get(`/rbac/users/provider/${providerId}`)
getUserById: (id) => api.get(`/rbac/users/${id}`)
```

### providersService (services/api/providers.service.js)
```javascript
// ❌ غير موجودة - يجب إضافتها
getDocuments: (id) => api.get(`/api/providers/${id}/documents`)
addDocument: (id, formData) => api.post(`/api/providers/${id}/documents`, formData)
deleteDocument: (providerId, docId) => api.delete(`/api/providers/${providerId}/documents/${docId}`)
getAllowedEmployerIds: (id) => api.get(`/api/providers/${id}/allowed-employers`)
```

### employersService
```javascript
// ✅ موجودة (نأمل)
getEmployerSelectors: () => api.get('/api/employers/selectors')
```

---

## 🔧 Implementation Steps

### Step 1: إضافة الوظائف الناقصة للـ Services
1. تحديث `usersService` بوظائف Provider
2. تحديث `providersService` بوظائف Documents والـ Partners

### Step 2: استبدال ProviderCreate.jsx
1. نسخ الكود الكامل من المستودع المرجعي
2. تعديل المسارات (imports)
3. التحقق من التكامل

### Step 3: استبدال ProviderEdit.jsx
1. نسخ الكود الكامل (824 سطر)
2. تعديل المسارات
3. التحقق من جميع التبويبات

### Step 4: اختبار التكامل
1. Compile frontend
2. اختبار ProviderCreate مع جميع الأوضاع (CREATE, LINK, SKIP)
3. اختبار ProviderEdit مع جميع التبويبات الـ 6
4. التأكد من عدم وجود console errors

---

## ⚠️ ملاحظات هامة

1. **Backend API**: تأكد من وجود endpoints التالية:
   ```
   GET  /rbac/users/unassigned-providers
   GET  /rbac/users/provider/{providerId}
   GET  /api/providers/{id}/documents
   POST /api/providers/{id}/documents
   DELETE /api/providers/{providerId}/documents/{docId}
   GET  /api/providers/{id}/allowed-employers
   ```

2. **DTOs Required**:
   - ProviderDocumentDto
   - UserAssignmentDto

3. **File Structure**:
   ```
   frontend/src/
   ├── pages/providers/
   │   ├── ProviderCreate.jsx (NEW - 575 lines)
   │   ├── ProviderEdit.jsx   (NEW - 824 lines)
   │   ├── ProviderCreate.jsx.bak (backup)
   │   └── ProviderEdit.jsx.bak   (backup)
   ├── services/
   │   ├── rbac/
   │   │   └── users.service.js (UPDATE)
   │   └── api/
   │       └── providers.service.js (UPDATE)
   ```

---

## ✅ Checklist

- [x] نسخ احتياطي من الملفات الحالية
- [ ] إضافة `getUnassignedProviders()` في usersService
- [ ] إضافة `getUsersByProvider()` في usersService
- [ ] إضافة `getUserById()` في usersService
- [ ] إضافة `getDocuments()` في providersService
- [ ] إضافة `addDocument()` في providersService
- [ ] إضافة `deleteDocument()` في providersService
- [ ] إضافة `getAllowedEmployerIds()` في providersService
- [ ] استبدال ProviderCreate.jsx بالكامل
- [ ] استبدال ProviderEdit.jsx بالكامل
- [ ] Compile frontend
- [ ] اختبار Create مع CREATE mode
- [ ] اختبار Create مع LINK mode
- [ ] اختبار Edit - جميع التبويبات الـ 6
- [ ] اختبار User Link/Unlink
- [ ] اختبار Partners management
- [ ] اختبار Documents upload/delete

---

**Status**: جاري التنفيذ
**Next Action**: إضافة الوظائف الناقصة في Services
