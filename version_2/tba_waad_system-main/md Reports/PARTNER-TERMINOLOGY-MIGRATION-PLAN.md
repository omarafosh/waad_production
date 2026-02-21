# 🔄 خطة توحيد المصطلحات: من Employer/Company إلى "الشركاء" (Partners)

**التاريخ**: 2026-01-05  
**الحالة**: ✅ **Phase 1 COMPLETE** | Phase 2-7 Pending  
**المهندس**: Senior Full-Stack Architect

---

## 📋 ملخص تنفيذي

تحويل كامل المصطلحات من:
- ❌ أصحاب العمل / Employer / Employers
- ❌ الشركات / Company / Companies

إلى:
- ✅ **الشركاء** (عرض للمستخدم)
- ✅ **Partner / Partners** (تسمية منطقية في الكود)

مع تبسيط نموذج الاسم من `{nameAr, nameEn}` إلى `{name}` فقط (عربي).

---

## ✅ Phase 1: UI/UX Terminology - **COMPLETE**

**Status**: ✅ **100% Complete**  
**Files Updated**: 18 files  
**Report**: See [PHASE-1-PARTNER-TERMINOLOGY-COMPLETE.md](PHASE-1-PARTNER-TERMINOLOGY-COMPLETE.md)

### Summary of Changes

#### Core Components (2 files) ✅
- EmployerFilterSelector.jsx - All labels changed to "الشريك"
- EmployerFilterContext.jsx - Model simplified to {id, name}

#### Reports Pages (5 files) ✅
- Claims Report - RBAC comments updated
- Benefit Policy Report - Selector and labels updated
- Employer Dashboard - Title and selectors updated
- Visits Report - RBAC comments updated
- Reports Index - Description updated

#### Settings Pages (2 files) ✅
- Settings Index - Card title updated
- Employer Settings - Complete terminology overhaul

#### Employer Management (4 files) ✅
- EmployersList - Page header, breadcrumbs, print title
- EmployerView - Breadcrumbs
- EmployerEdit - Breadcrumbs
- EmployerCreate - Breadcrumbs

#### Members Pages (2 files) ✅
- MembersList - Table column "الشريك"
- MemberCreateWizard - Error messages

#### Utils & Hooks (3 files) ✅
- ar.json - All translations
- labels.js - Navigation labels
- useEmployerScope.js - Display names

---

## ⏳ Phase 2: Frontend Model Simplification - **PENDING**
**الموقع**: `frontend/src/contexts/EmployerFilterContext.jsx`

**التعديلات المنفذة**:
- تبسيط النموذج: `{name}` فقط بدلاً من `{nameAr, nameEn}`
- تحديث localStorage keys:
  - `tba_selected_partner_id` (جديد)
  - `tba_selected_partner` (جديد)
  - دعم خلفي للـ keys القديمة
- تحديث التعليقات والوثائق

---

### 📌 الملفات المتبقية للتحديث

#### 🔹 Reports Pages

##### 1. Claims Report
**الموقع**: `frontend/src/pages/reports/claims/index.jsx`

**التغييرات المطلوبة**:
```javascript
// التعليقات (lines 46-47)
- // - SUPER_ADMIN / ADMIN → All employers
- // - EMPLOYER_ADMIN → Own employer only
+ // - SUPER_ADMIN / ADMIN → All partners
+ // - EMPLOYER_ADMIN → Own partner only

// Labels
- "اختر صاحب العمل"
+ "اختر الشريك"

- "جميع أصحاب العمل"
+ "جميع الشركاء"

- "جاري تحميل أصحاب العمل..."
+ "جاري تحميل الشركاء..."

- "تم تحديد نطاق التقرير لصاحب العمل الخاص بك تلقائياً."
+ "تم تحديد نطاق التقرير للشريك الخاص بك تلقائياً."
```

##### 2. Visits Report  
**الموقع**: `frontend/src/pages/reports/visits/index.jsx`

**التغييرات المطلوبة**: نفس التغييرات أعلاه

##### 3. Benefit Policy Report
**الموقع**: `frontend/src/pages/reports/benefit-policy/index.jsx`

**التغييرات المطلوبة**: نفس التغييرات أعلاه

##### 4. Employer Dashboard
**الموقع**: `frontend/src/pages/reports/employer-dashboard/index.jsx`

**التغييرات المطلوبة**:
```javascript
// Component name
- const EmployerSelector = ({ selectedEmployerId, onEmployerChange, disabled }) => {
+ const PartnerSelector = ({ selectedPartnerId, onPartnerChange, disabled }) => {

// Labels
- "صاحب العمل"
+ "الشريك"

- "جميع أصحاب العمل"
+ "جميع الشركاء"

// Title
- "لوحة مؤشرات صاحب العمل"
+ "لوحة مؤشرات الشريك"

// Comments
- // Employer Selector
+ // Partner Selector
```

---

#### 🔹 Settings Pages

##### 1. Employer Settings
**الموقع**: `frontend/src/pages/settings/employer-settings/index.jsx`

**التغييرات المطلوبة**:
```javascript
// Page Title
- title="إعدادات أصحاب العمل"
+ title="إعدادات الشركاء"

// Breadcrumbs
- breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الإعدادات' }, { label: 'أصحاب العمل' }]}
+ breadcrumbs={[{ label: 'الرئيسية', path: '/' }, { label: 'الإعدادات' }, { label: 'الشركاء' }]}

// Form Labels
- label="صاحب العمل"
+ label="الشريك"

// Empty State
- "لم يتم العثور على أصحاب عمل"
+ "لم يتم العثور على شركاء"
```

---

#### 🔹 Menu Items

##### Sidebar Menu
**الموقع**: `frontend/src/menu-items/index.js` (أو ملف مشابه)

**التغييرات المطلوبة**:
```javascript
{
  id: 'employers',
  title: 'الشركاء', // كان: أصحاب العمل
  type: 'item',
  url: '/employers',
  icon: BusinessIcon
}

{
  id: 'employer-settings',
  title: 'إعدادات الشركاء', // كان: إعدادات أصحاب العمل
  type: 'item',
  url: '/settings/employer-settings'
}
```

---

#### 🔹 Members Page

**الموقع**: `frontend/src/pages/members/MembersList.jsx`

**التغييرات المطلوبة**:
```javascript
// Table Column Header
{
  accessorKey: 'employerName',
  header: 'الشريك', // كان: صاحب العمل
  // ...
}
```

---

#### 🔹 Claims Page

**الموقع**: `frontend/src/pages/claims/ClaimsList.jsx`

**التغييرات**: تم تحديثها بالفعل (تستخدم EmployerFilterSelector المحدّث)

---

#### 🔹 Dashboard Page

**الموقع**: `frontend/src/pages/dashboard/index.jsx`

**التغييرات**: تم تحديثها بالفعل (تستخدم EmployerFilterSelector المحدّث)

---

## 🔧 Phase 2: Frontend Model Simplification

### النموذج القديم:
```javascript
{
  id: 1,
  nameAr: "شركة النور",
  nameEn: "Al Noor Co"
}
```

### النموذج الجديد:
```javascript
{
  id: 1,
  name: "شركة النور" // عربي فقط
}
```

### 📌 الملفات المتأثرة

#### 1. Services
**الموقع**: `frontend/src/services/api/employers.service.js`

**التغييرات المطلوبة**:
- تحديث نموذج البيانات المتوقع
- Mapping من الـ Backend إلى النموذج الجديد

```javascript
// Mapper function (إضافة)
const mapPartnerFromAPI = (apiData) => ({
  id: apiData.id,
  name: apiData.name || apiData.nameAr || apiData.name_ar,
  // Ignore nameEn completely
});
```

#### 2. Hooks
**الموقع**: `frontend/src/hooks/useEmployers.js`

**التغييرات المطلوبة**:
- استخدام النموذج المبسط
- تحديث التسميات في التعليقات

---

## 🎯 Phase 3: Backend DTO Strategy

### DTO الموحد (جديد)

**الموقع**: `backend/src/main/java/com/waad/tba/common/dto/PartnerDTO.java`

```java
package com.waad.tba.common.dto;

/**
 * Partner DTO - Unified model for Partners (formerly Employers)
 * 
 * Architecture Decision:
 * - Single name field (Arabic only)
 * - Simplified for frontend consumption
 * - Mapped from name_ar in database
 */
public record PartnerDTO(
    Long id,
    String name
) {}
```

### Mapper (جديد)

**الموقع**: `backend/src/main/java/com/waad/tba/modules/employer/mapper/PartnerMapper.java`

```java
package com.waad.tba.modules.employer.mapper;

import com.waad.tba.common.dto.PartnerDTO;
import com.waad.tba.modules.employer.entity.Employer;
import org.springframework.stereotype.Component;

@Component
public class PartnerMapper {
    
    /**
     * Map Employer entity to Partner DTO
     * Uses name_ar as primary source
     */
    public PartnerDTO toDTO(Employer employer) {
        if (employer == null) {
            return null;
        }
        
        return new PartnerDTO(
            employer.getId(),
            employer.getNameAr() != null ? employer.getNameAr() : employer.getNameEn()
        );
    }
    
    /**
     * Map list of Employers to Partner DTOs
     */
    public List<PartnerDTO> toDTOList(List<Employer> employers) {
        if (employers == null) {
            return Collections.emptyList();
        }
        
        return employers.stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
}
```

---

## 📊 Phase 4: API Contract Update

### قبل (القديم):
```json
GET /api/employers/123

{
  "success": true,
  "data": {
    "id": 123,
    "nameAr": "شركة النور",
    "nameEn": "Al Noor Co",
    "code": "NOR001",
    "active": true
  }
}
```

### بعد (الجديد):
```json
GET /api/employers/123

{
  "success": true,
  "data": {
    "id": 123,
    "name": "شركة النور",
    "code": "NOR001",
    "active": true
  }
}
```

### 🔄 Backward Compatibility (مؤقت)

للحفاظ على التوافق، يمكن إرسال الحقول القديمة أيضاً:

```json
{
  "id": 123,
  "name": "شركة النور",
  "nameAr": "شركة النور",  // Deprecated
  "nameEn": null,            // Deprecated
  "code": "NOR001",
  "active": true
}
```

مع إضافة `@Deprecated` annotations في الـ DTOs.

---

## 🔐 Phase 5: Filters & Permissions Terminology

### المصطلحات الداخلية (Internal Variables)

**يمكن الإبقاء على**:
- `employerId` (متغير داخلي)
- `employer_id` (عمود في Database)
- `EmployerScoped` (Interface)

**السبب**: تجنب Breaking Changes في:
- Database schema
- API parameters
- Backend logic

### المصطلحات المرئية (UI Only)

**يجب تغيير**:
- جميع النصوص المعروضة للمستخدم
- Page titles
- Form labels
- Table headers
- Breadcrumbs

---

## 📄 Phase 6: Reports & PDF

### التغييرات المطلوبة

#### 1. Report Headers
```
// قبل
تقرير أصحاب العمل
تقرير شركة

// بعد
تقرير الشركاء
تقرير شريك
```

#### 2. Table Columns
```javascript
// قبل
columns: [
  { header: 'اسم صاحب العمل', field: 'employerName' }
]

// بعد
columns: [
  { header: 'اسم الشريك', field: 'partnerName' }
]
```

#### 3. PDF Export
```javascript
// قبل
filename: `employers_report_${date}.pdf`
title: "تقرير أصحاب العمل"

// بعد
filename: `partners_report_${date}.pdf`
title: "تقرير الشركاء"
```

---

## 🗄️ Phase 7: Database Strategy (لاحقاً)

### الوضع الحالي (لا تغيير الآن)
```sql
-- الإبقاء على الجداول الحالية
employers (
  id BIGINT PRIMARY KEY,
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  code VARCHAR(50),
  active BOOLEAN
)
```

### المستقبل (بعد الاستقرار)
```sql
-- Migration مخطط
ALTER TABLE employers RENAME TO partners;
ALTER TABLE partners RENAME COLUMN name_ar TO name;
ALTER TABLE partners DROP COLUMN name_en;
```

**⚠️ تحذير**: 
- لا تنفيذ الآن
- يحتاج تخطيط دقيق
- يتطلب Migration scripts
- اختبار شامل

---

## ✅ Definition of Done

### Checklist التنفيذ

#### Frontend UI/UX
- [x] EmployerFilterSelector محدّث
- [x] EmployerFilterContext محدّث (نموذج مبسط)
- [ ] Reports pages محدّثة (4 صفحات)
- [ ] Settings pages محدّثة (1 صفحة)
- [ ] Menu items محدّثة
- [ ] Members page محدّثة
- [ ] Dashboard (تم)
- [ ] Claims (تم)

#### Frontend Models
- [x] Context يستخدم {name} فقط
- [x] Component يعرض {name} فقط
- [ ] Services تستخدم {name} فقط
- [ ] Hooks محدّثة

#### Backend
- [ ] PartnerDTO منشأ
- [ ] PartnerMapper منشأ
- [ ] Controllers محدّثة
- [ ] API Contract محدّث

#### Reports
- [ ] عناوين التقارير محدّثة
- [ ] أعمدة الجداول محدّثة
- [ ] PDF exports محدّثة

#### Testing
- [ ] لا كسر في APIs
- [ ] لا مشاكل في البيانات التاريخية
- [ ] التقارير تعمل بشكل صحيح
- [ ] Filters تعمل بشكل صحيح
- [ ] Permissions لم تتأثر

---

## 🚀 خطة التنفيذ المتبقية

### المرحلة الحالية: Phase 1 (UI/UX)

#### الخطوات التالية:
1. ✅ تحديث EmployerFilterSelector
2. ✅ تحديث EmployerFilterContext
3. ⏳ تحديث Reports pages (4 ملفات)
4. ⏳ تحديث Settings pages (1 ملف)
5. ⏳ تحديث Menu items
6. ⏳ تحديث Members page columns

#### الوقت المقدر: 2-3 ساعات

---

### Phase 2-6: بقية المراحل

#### الوقت المقدر: 3-5 ساعات إضافية

---

## 📚 ملاحظات مهمة

### 1. Backward Compatibility
- ✅ الكود القديم لن يتأثر
- ✅ APIs القديمة تعمل
- ✅ البيانات التاريخية محفوظة

### 2. Migration Safe
- ✅ لا تغيير في Database الآن
- ✅ DTOs فقط تتغير
- ✅ UI فقط يتغير

### 3. Testing Strategy
- اختبار كل مرحلة قبل الانتقال للتالية
- التأكد من عدم كسر APIs
- مراجعة جميع الصفحات

---

**نهاية الوثيقة** ✅
