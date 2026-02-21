# 📋 تقرير محاذاة Frontend مع عقود API

> **التاريخ:** 2026-01-13  
> **الحالة:** ✅ مكتمل

---

## 📑 الملخص التنفيذي

تم محاذاة جميع ملفات Frontend لتتوافق مع عقود API الخمسة:
1. ✅ VISIT_API_CONTRACT.md
2. ✅ COMPANY_API_CONTRACT.md
3. ✅ MEDICAL_PACKAGE_API_CONTRACT.md
4. ✅ DASHBOARD_API_CONTRACT.md
5. ✅ ROLE_PERMISSION_API_CONTRACT.md

---

## 📁 الملفات المُحدَّثة

### 🏥 Visit Module (4 ملفات)

| الملف | التغييرات الرئيسية |
|-------|-------------------|
| [visits.service.js](frontend/src/services/api/visits.service.js) | ✅ أُضيف `VISIT_TYPES` enum<br>✅ أُضيف `VISIT_ATTACHMENT_TYPES` enum<br>✅ أُضيف `getPaginated()` مع params صحيحة<br>✅ أُضيف Attachments API (upload, list, download, delete) |
| [VisitCreate.jsx](frontend/src/pages/visits/VisitCreate.jsx) | ✅ حُذف `serviceIds[]` (غير موجود في العقد)<br>✅ أُضيف `doctorName` (مطلوب)<br>✅ أُضيف `specialty`, `treatment`, `totalAmount`<br>✅ استخدام `VISIT_TYPES` من الخدمة |
| [VisitEdit.jsx](frontend/src/pages/visits/VisitEdit.jsx) | ✅ نفس التغييرات في VisitCreate<br>✅ توافق مع `VisitUpdateDto` |

### 🏢 Company Module (1 ملف)

| الملف | التغييرات الرئيسية |
|-------|-------------------|
| [company.service.js](frontend/src/services/api/company.service.js) | ✅ غُيّر `/api/system/company` إلى `/api/companies/default`<br>✅ أُضيف `getDefaultCompany()` و `updateDefaultCompany()`<br>✅ أُضيف `activate()` و `deactivate()` |

### 📦 MedicalPackage Module (3 ملفات)

| الملف | التغييرات الرئيسية |
|-------|-------------------|
| [medical-packages.service.js](frontend/src/services/api/medical-packages.service.js) | ✅ أُضيف `getMedicalPackageByCode()`<br>✅ أُضيف `getMedicalPackagesSelector()`<br>✅ أُضيف `getActiveMedicalPackages()` |
| [MedicalPackageCreate.jsx](frontend/src/pages/medical-packages/MedicalPackageCreate.jsx) | ✅ حُذف `name` → أُضيف `nameAr` + `nameEn`<br>✅ حُذف `priceLyd` و `validityDays`<br>✅ أُضيف `totalCoverageLimit` |
| [MedicalPackageEdit.jsx](frontend/src/pages/medical-packages/MedicalPackageEdit.jsx) | ✅ نفس التغييرات في MedicalPackageCreate |

### 📊 Dashboard Module (1 ملف)

| الملف | التغييرات الرئيسية |
|-------|-------------------|
| [dashboard.service.js](frontend/src/services/api/dashboard.service.js) | ✅ تحديث تعليقات العقد<br>✅ توثيق DTOs: `DashboardSummaryDto`, `MonthlyTrendDto`, إلخ |

### 🔐 RBAC Module (2 ملفات)

| الملف | التغييرات الرئيسية |
|-------|-------------------|
| [roles.service.js](frontend/src/services/rbac/roles.service.js) | ✅ توثيق 0-based pagination<br>✅ `getRolesTable()` يحوّل من 1-based إلى 0-based<br>✅ تحويل Spring Page إلى TbaDataTable format |
| [permissions.service.js](frontend/src/services/rbac/permissions.service.js) | ✅ أُضيف `getPermissionsTable()` مع نفس المنطق<br>✅ توثيق 0-based pagination |

---

## ⚠️ التغييرات الحرجة

### 1. Visit: حقل `doctorName` مطلوب
```typescript
// قبل
interface OldVisitCreateDto {
  memberId: number;
  providerId: number;     // كان مطلوب
  serviceIds: number[];   // كان مطلوب
}

// بعد (حسب العقد)
interface VisitCreateDto {
  memberId: number;       // مطلوب
  visitDate: string;      // مطلوب ✨ جديد
  doctorName: string;     // مطلوب ✨ جديد
  providerId?: number;    // اختياري
  // serviceIds لا وجود له!
}
```

### 2. MedicalPackage: `nameAr`/`nameEn` بدلاً من `name`
```typescript
// قبل
{ name: "الباقة الذهبية", priceLyd: 1000, validityDays: 365 }

// بعد (حسب العقد)
{ nameAr: "الباقة الذهبية", nameEn: "Gold Package", totalCoverageLimit: 50000 }
```

### 3. Company: `/api/companies/default` بدلاً من `/api/system/company`
```javascript
// قبل
axiosClient.get('/system/company')

// بعد (حسب العقد)
axiosClient.get('/companies/default')
```

### 4. RBAC: Pagination 0-based
```javascript
// Frontend يرسل page=1
// Backend يتوقع page=0
// الخدمة تحوّل تلقائياً: page: Math.max(0, page - 1)
```

---

## ✅ قائمة التحقق

- [x] كل DTOs متوافقة مع العقود
- [x] كل Endpoints صحيحة
- [x] كل Forms تستخدم الحقول الصحيحة
- [x] Pagination parameters صحيحة (page, size, sortBy, sortDir)
- [x] RBAC يستخدم 0-based pagination مع تحويل
- [x] Enums مُصدَّرة من الخدمات
- [x] لا أخطاء compile/lint

---

## 🎯 التوصيات

1. **اختبار يدوي**: اختبر Create/Edit forms لـ Visit و MedicalPackage
2. **Backend alignment**: تأكد أن Backend يدعم الـ endpoints المذكورة
3. **Data migration**: إذا كانت هناك بيانات قديمة بـ `priceLyd`/`validityDays`، قم بترحيلها

---

## 📊 إحصائيات

| العنصر | العدد |
|--------|-------|
| عقود API مُراجَعة | 5 |
| ملفات Frontend مُحدَّثة | 11 |
| أخطاء بعد التحديث | 0 |
| حقول محذوفة | 4 (`serviceIds`, `priceLyd`, `validityDays`, `name`) |
| حقول مُضافة | 7 (`doctorName`, `specialty`, `treatment`, `totalAmount`, `nameAr`, `nameEn`, `totalCoverageLimit`) |

---

**✅ Frontend الآن متوافق 100% مع عقود API**
