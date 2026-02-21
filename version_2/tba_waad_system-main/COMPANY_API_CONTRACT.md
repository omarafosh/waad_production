# 📄 COMPANY API CONTRACT

> **وثيقة العقد الرسمي بين Backend و Frontend لوحدة الشركات والإعدادات**  
> **الإصدار:** 1.0  
> **التاريخ:** 2026-01-13  
> **الحالة:** ✅ مُثبَّت

---

## 📑 الفهرس
1. [نظرة عامة](#نظرة-عامة)
2. [Company DTOs](#company-dtos)
3. [Company Endpoints](#company-endpoints)
4. [Company Settings DTOs](#company-settings-dtos)
5. [Company Settings Endpoints](#company-settings-endpoints)
6. [الصلاحيات المطلوبة](#الصلاحيات-المطلوبة)
7. [أمثلة الاستخدام](#أمثلة-الاستخدام)

---

## نظرة عامة

هذا النظام يعمل في **وضع الشركة الواحدة (Single-Tenant)**. الشركة الافتراضية تمثل TPA (مسؤول الطرف الثالث).

### ⚠️ قواعد صارمة:
- الـ endpoint الرئيسي هو `/api/companies/default`
- إعدادات الشركة منفصلة في `/api/company-settings`
- استخدم **الأسماء الموجودة هنا بالضبط**

---

## Company DTOs

### 📤 CompanyDto (للقراءة والكتابة)

```typescript
interface CompanyDto {
  id: number;                    // معرف الشركة
  name: string;                  // اسم الشركة (مطلوب)
  code: string;                  // كود الشركة الفريد (مطلوب)
  active: boolean;               // نشطة؟
  isDefault: boolean;            // هل هي الافتراضية؟
  
  // ============ بيانات الهوية والعلامة التجارية ============
  logoUrl: string | null;        // رابط الشعار
  phone: string | null;          // رقم الهاتف
  email: string | null;          // البريد الإلكتروني
  address: string | null;        // العنوان
  website: string | null;        // الموقع الإلكتروني
  businessType: string | null;   // نوع النشاط
  taxNumber: string | null;      // الرقم الضريبي
  
  createdAt: string;             // تاريخ الإنشاء ISO
  updatedAt: string;             // تاريخ التحديث ISO
}
```

---

## Company Endpoints

### 🏠 1. جلب الشركة الافتراضية (الأساسي)

```http
GET /api/companies/default
```

**Response:**
```json
{
  "status": 200,
  "message": "Default company retrieved successfully",
  "data": {
    "id": 1,
    "name": "شركة واعد للتأمين",
    "code": "WAAD",
    "active": true,
    "isDefault": true,
    "logoUrl": "/uploads/logo.png",
    "phone": "+218912345678",
    "email": "info@waad.ly",
    "address": "طرابلس، ليبيا",
    "website": "https://waad.ly",
    "businessType": "Third Party Administrator",
    "taxNumber": "123456789",
    "createdAt": "2026-01-01T00:00:00",
    "updatedAt": "2026-01-13T10:30:00"
  },
  "timestamp": "2026-01-13T10:30:00"
}
```

### ✏️ 2. تحديث الشركة الافتراضية

```http
PUT /api/companies/default
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "شركة واعد للتأمين",
  "code": "WAAD",
  "logoUrl": "/uploads/logo.png",
  "phone": "+218912345678",
  "email": "info@waad.ly",
  "address": "طرابلس، ليبيا",
  "website": "https://waad.ly",
  "businessType": "Third Party Administrator",
  "taxNumber": "123456789"
}
```

**Response:** `200 OK`
```json
{
  "status": 200,
  "message": "Company updated successfully",
  "data": { ...CompanyDto },
  "timestamp": "..."
}
```

### ➕ 3. إنشاء شركة جديدة

```http
POST /api/companies
Content-Type: application/json
```

**Request Body:** نفس CompanyDto (بدون id, createdAt, updatedAt)

**Response:** `201 Created`

### 🔍 4. جلب شركة بالمعرف

```http
GET /api/companies/{id}
```

### 🔍 5. جلب شركة بالكود

```http
GET /api/companies/code/{code}
```

### 📋 6. جلب كل الشركات

```http
GET /api/companies
```

**Response:**
```json
{
  "status": 200,
  "message": "Companies retrieved successfully",
  "data": [CompanyDto, ...],
  "timestamp": "..."
}
```

### ✅ 7. تفعيل شركة

```http
PATCH /api/companies/{id}/activate
```

### ❌ 8. إلغاء تفعيل شركة

```http
PATCH /api/companies/{id}/deactivate
```

### 🗑️ 9. حذف شركة

```http
DELETE /api/companies/{id}
```

---

## Company Settings DTOs

### 📤 CompanySettingsDto

```typescript
interface CompanySettingsDto {
  id: number;                    // معرف الإعدادات
  companyId: number;             // معرف الشركة (مطلوب)
  employerId: number;            // معرف صاحب العمل (مطلوب)
  
  // ============ صلاحيات الميزات ============
  canViewClaims: boolean;        // هل يمكن عرض المطالبات؟ (افتراضي: false)
  canViewVisits: boolean;        // هل يمكن عرض الزيارات؟ (افتراضي: false)
  canEditMembers: boolean;       // هل يمكن تعديل الأعضاء؟ (افتراضي: true)
  canDownloadAttachments: boolean; // هل يمكن تحميل المرفقات؟ (افتراضي: true)
  
  // ============ معلومات عرض ============
  employerName: string | null;   // اسم صاحب العمل
  employerCode: string | null;   // كود صاحب العمل
  companyName: string | null;    // اسم الشركة
  
  // ============ إعدادات واجهة المستخدم ============
  uiVisibility: UiVisibilityDto | null;
}
```

### 📤 UiVisibilityDto

```typescript
interface UiVisibilityDto {
  members: MembersVisibility;
  claims: ClaimsVisibility;
  visits: VisitsVisibility;
  dashboard: DashboardVisibility;
}

interface MembersVisibility {
  showFamilyTab: boolean;        // إظهار تبويب العائلة
  showDocumentsTab: boolean;     // إظهار تبويب المستندات
  showBenefitsTab: boolean;      // إظهار تبويب المنافع
  showChronicTab: boolean;       // إظهار تبويب الأمراض المزمنة
}

interface ClaimsVisibility {
  showFilesSection: boolean;     // إظهار قسم الملفات
  showPaymentsSection: boolean;  // إظهار قسم المدفوعات
  showDiagnosisSection: boolean; // إظهار قسم التشخيص
}

interface VisitsVisibility {
  showAttachmentsSection: boolean;    // إظهار قسم المرفقات
  showServiceDetailsSection: boolean; // إظهار تفاصيل الخدمة
}

interface DashboardVisibility {
  showMembersKpi: boolean;       // إظهار KPI الأعضاء
  showClaimsKpi: boolean;        // إظهار KPI المطالبات
  showVisitsKpi: boolean;        // إظهار KPI الزيارات
}
```

---

## Company Settings Endpoints

### 🔧 1. جلب إعدادات صاحب العمل

```http
GET /api/company-settings/employer/{employerId}
```

**Response:**
```json
{
  "id": 1,
  "companyId": 1,
  "employerId": 5,
  "canViewClaims": true,
  "canViewVisits": true,
  "canEditMembers": true,
  "canDownloadAttachments": true,
  "employerName": "شركة الطيران الليبية",
  "employerCode": "LAA",
  "companyName": "واعد",
  "uiVisibility": {
    "members": {
      "showFamilyTab": true,
      "showDocumentsTab": true,
      "showBenefitsTab": true,
      "showChronicTab": true
    },
    "claims": {
      "showFilesSection": true,
      "showPaymentsSection": true,
      "showDiagnosisSection": true
    },
    "visits": {
      "showAttachmentsSection": true,
      "showServiceDetailsSection": true
    },
    "dashboard": {
      "showMembersKpi": true,
      "showClaimsKpi": true,
      "showVisitsKpi": true
    }
  }
}
```

### ✏️ 2. تحديث إعدادات صاحب العمل

```http
PUT /api/company-settings/employer/{employerId}
Content-Type: application/json
```

**Request Body:** `CompanySettingsDto`

### 🎨 3. جلب إعدادات واجهة المستخدم

```http
GET /api/company-settings/employer/{employerId}/ui
```

**Response:** `UiVisibilityDto`

### ✏️ 4. تحديث إعدادات واجهة المستخدم

```http
PUT /api/company-settings/employer/{employerId}/ui
Content-Type: application/json
```

**Request Body:** `UiVisibilityDto`

---

## الصلاحيات المطلوبة

### Company Endpoints

| Endpoint | Permission Required |
|----------|---------------------|
| `GET /api/companies/default` | `SUPER_ADMIN` أو `VIEW_COMPANIES` أو `MANAGE_COMPANIES` |
| `PUT /api/companies/default` | `SUPER_ADMIN` أو `MANAGE_COMPANIES` |
| `POST /api/companies` | `SUPER_ADMIN` أو `MANAGE_COMPANIES` |
| `PUT /api/companies/{id}` | `SUPER_ADMIN` أو `MANAGE_COMPANIES` |
| `GET /api/companies` | `SUPER_ADMIN` أو `VIEW_COMPANIES` |
| `GET /api/companies/{id}` | `SUPER_ADMIN` أو `VIEW_COMPANIES` |
| `GET /api/companies/code/{code}` | `SUPER_ADMIN` أو `VIEW_COMPANIES` |
| `PATCH /api/companies/{id}/activate` | `SUPER_ADMIN` أو `MANAGE_COMPANIES` |
| `PATCH /api/companies/{id}/deactivate` | `SUPER_ADMIN` أو `MANAGE_COMPANIES` |
| `DELETE /api/companies/{id}` | `SUPER_ADMIN` أو `MANAGE_COMPANIES` |

### Company Settings Endpoints

| Endpoint | Permission Required |
|----------|---------------------|
| `GET /api/company-settings/employer/{id}` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` |
| `PUT /api/company-settings/employer/{id}` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` |
| `GET /api/company-settings/employer/{id}/ui` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` |
| `PUT /api/company-settings/employer/{id}/ui` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` |

> **ملاحظة:** `EMPLOYER_ADMIN` يمكنه فقط الوصول لإعدادات صاحب العمل الخاص به.

---

## أمثلة الاستخدام

### Frontend - جلب الشركة الافتراضية

```javascript
// ✅ صحيح
const response = await api.get('/api/companies/default');
const company = response.data.data;

console.log(company.name);       // ✅
console.log(company.logoUrl);    // ✅
console.log(company.phone);      // ✅
console.log(company.isDefault);  // ✅ true
```

### Frontend - تحديث الشركة

```javascript
// ✅ صحيح
const updatedCompany = {
  name: 'شركة واعد للتأمين',
  code: 'WAAD',
  phone: '+218912345678',
  email: 'info@waad.ly',
  address: 'طرابلس، ليبيا',
  website: 'https://waad.ly'
};

await api.put('/api/companies/default', updatedCompany);
```

### Frontend - جلب إعدادات صاحب العمل

```javascript
// ✅ صحيح
const response = await api.get(`/api/company-settings/employer/${employerId}`);
const settings = response.data;  // ⚠️ ملاحظة: بدون .data الثانية

if (settings.canViewClaims) {
  // إظهار المطالبات
}

if (settings.uiVisibility?.members?.showFamilyTab) {
  // إظهار تبويب العائلة
}
```

### Frontend - تحديث إعدادات UI

```javascript
// ✅ صحيح
const uiSettings = {
  members: {
    showFamilyTab: true,
    showDocumentsTab: true,
    showBenefitsTab: false,  // إخفاء المنافع
    showChronicTab: true
  },
  claims: {
    showFilesSection: true,
    showPaymentsSection: false,  // إخفاء المدفوعات
    showDiagnosisSection: true
  },
  visits: {
    showAttachmentsSection: true,
    showServiceDetailsSection: true
  },
  dashboard: {
    showMembersKpi: true,
    showClaimsKpi: true,
    showVisitsKpi: true
  }
};

await api.put(`/api/company-settings/employer/${employerId}/ui`, uiSettings);
```

---

## ⚠️ أخطاء شائعة يجب تجنبها

| ❌ خطأ | ✅ صحيح |
|--------|---------|
| `/api/company` | `/api/companies` |
| `/api/companies/settings` | `/api/company-settings` |
| `companyName` في Request | `name` |
| `logo` | `logoUrl` |
| `telephone` | `phone` |
| `data.data.settings` | `data` (لـ company-settings) |

---

## 🔄 ملاحظات مهمة

### 1. وضع الشركة الواحدة
- استخدم `/api/companies/default` بدلاً من `/api/companies/{id}`
- لا حاجة لتمرير ID الشركة

### 2. Response Format
- **Company endpoints:** يستخدم `ApiResponse<T>` wrapper
- **Company Settings endpoints:** يُرجع البيانات مباشرة (بدون wrapper)

### 3. Validation
- `name` و `code` مطلوبان عند الإنشاء/التحديث
- `companyId` و `employerId` مطلوبان في CompanySettingsDto

---

**📋 آخر تحديث:** 2026-01-13  
**✍️ المُعد:** GitHub Copilot  
**🔒 الحالة:** عقد ثابت ومُلزم
