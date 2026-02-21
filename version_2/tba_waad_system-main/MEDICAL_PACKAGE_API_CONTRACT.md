# 📄 MEDICAL PACKAGE API CONTRACT

> **وثيقة العقد الرسمي بين Backend و Frontend لوحدة الباقات الطبية**  
> **الإصدار:** 1.0  
> **التاريخ:** 2026-01-13  
> **الحالة:** ✅ مُثبَّت

---

## 📑 الفهرس
1. [نظرة عامة](#نظرة-عامة)
2. [الـ DTOs الرسمية](#الـ-dtos-الرسمية)
3. [Endpoints](#endpoints)
4. [الصلاحيات المطلوبة](#الصلاحيات-المطلوبة)
5. [أمثلة الاستخدام](#أمثلة-الاستخدام)

---

## نظرة عامة

الباقات الطبية (Medical Packages) تجمع مجموعة من الخدمات الطبية (MedicalService) تحت باقة واحدة بحد تغطية إجمالي.

### ⚠️ قواعد صارمة:
- استخدم **الأسماء الموجودة هنا بالضبط** (case-sensitive)
- الحقول `nameAr` و `nameEn` (ليس `name`)
- العلاقة Many-to-Many مع MedicalService

---

## الـ DTOs الرسمية

### 📤 MedicalPackage Entity (للقراءة)

```typescript
interface MedicalPackage {
  id: number;                    // معرف الباقة
  code: string;                  // كود الباقة الفريد
  nameAr: string;                // الاسم بالعربية
  nameEn: string;                // الاسم بالإنجليزية
  description: string | null;    // الوصف
  services: MedicalService[];    // الخدمات المضمنة
  totalCoverageLimit: number | null;  // حد التغطية الإجمالي
  active: boolean;               // نشطة؟
  createdAt: string;             // تاريخ الإنشاء ISO
  updatedAt: string;             // تاريخ التحديث ISO
  servicesCount: number;         // عدد الخدمات (حقل محسوب)
}
```

### 📥 MedicalPackageDTO (للإنشاء/التحديث)

```typescript
interface MedicalPackageDTO {
  id?: number;                   // اختياري (للتحديث)
  code: string;                  // كود الباقة الفريد (مطلوب)
  nameAr: string;                // الاسم بالعربية (مطلوب)
  nameEn: string;                // الاسم بالإنجليزية (مطلوب)
  description?: string;          // الوصف (اختياري)
  serviceIds?: number[];         // معرفات الخدمات المضمنة
  totalCoverageLimit?: number;   // حد التغطية الإجمالي
  active?: boolean;              // نشطة؟ (افتراضي: true)
}
```

### 📤 MedicalPackageSelectorDto (للقوائم المنسدلة)

```typescript
interface MedicalPackageSelectorDto {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
}
```

---

## Endpoints

### 📋 1. قائمة الباقات (Paginated)

```http
GET /api/medical-packages
```

| Parameter | Type     | Default    | Description |
|-----------|----------|------------|-------------|
| `page`    | number   | 1          | رقم الصفحة (1-based) |
| `size`    | number   | 10         | حجم الصفحة |
| `search`  | string   | null       | نص البحث |
| `sortBy`  | string   | createdAt  | الحقل للترتيب |
| `sortDir` | string   | desc       | اتجاه الترتيب (asc/desc) |

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 1,
        "code": "PKG-GOLD",
        "nameAr": "الباقة الذهبية",
        "nameEn": "Gold Package",
        "description": "تغطية شاملة",
        "services": [...],
        "totalCoverageLimit": 50000.00,
        "active": true,
        "createdAt": "2026-01-01T00:00:00",
        "updatedAt": "2026-01-13T10:30:00",
        "servicesCount": 15
      }
    ],
    "total": 25,
    "page": 1,
    "size": 10
  },
  "timestamp": "2026-01-13T10:30:00"
}
```

### 📦 2. خيارات القائمة المنسدلة

```http
GET /api/medical-packages/selector
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "code": "PKG-GOLD",
      "nameAr": "الباقة الذهبية",
      "nameEn": "Gold Package"
    },
    {
      "id": 2,
      "code": "PKG-SILVER",
      "nameAr": "الباقة الفضية",
      "nameEn": "Silver Package"
    }
  ],
  "timestamp": "..."
}
```

### 🔍 3. جلب باقة واحدة بالمعرف

```http
GET /api/medical-packages/{id}
```

**Response:**
```json
{
  "status": 200,
  "message": "Medical package retrieved successfully",
  "data": { ...MedicalPackage },
  "timestamp": "..."
}
```

### 🔍 4. جلب باقة بالكود

```http
GET /api/medical-packages/code/{code}
```

### ✅ 5. جلب الباقات النشطة فقط

```http
GET /api/medical-packages/active
```

**Response:**
```json
{
  "status": 200,
  "message": "Active medical packages retrieved successfully",
  "data": [MedicalPackage, ...],
  "timestamp": "..."
}
```

### ➕ 6. إنشاء باقة جديدة

```http
POST /api/medical-packages
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "PKG-PLATINUM",
  "nameAr": "الباقة البلاتينية",
  "nameEn": "Platinum Package",
  "description": "أعلى مستوى تغطية",
  "serviceIds": [1, 2, 3, 4, 5],
  "totalCoverageLimit": 100000.00,
  "active": true
}
```

**Response:** `201 Created`
```json
{
  "status": 201,
  "message": "Medical package created successfully",
  "data": { ...MedicalPackage },
  "timestamp": "..."
}
```

### ✏️ 7. تحديث باقة

```http
PUT /api/medical-packages/{id}
Content-Type: application/json
```

**Request Body:** نفس `MedicalPackageDTO`

**Response:** `200 OK`
```json
{
  "status": 200,
  "message": "Medical package updated successfully",
  "data": { ...MedicalPackage },
  "timestamp": "..."
}
```

### 🗑️ 8. حذف باقة

```http
DELETE /api/medical-packages/{id}
```

**Response:**
```json
{
  "status": 200,
  "message": "Medical package deleted successfully",
  "data": null,
  "timestamp": "..."
}
```

### 🔢 9. عدد الباقات

```http
GET /api/medical-packages/count
```

**Response:**
```json
{
  "status": 200,
  "message": "Package count retrieved successfully",
  "data": 25,
  "timestamp": "..."
}
```

### 🔎 10. بحث في الباقات

```http
GET /api/medical-packages/search?query={searchTerm}
```

**Response:**
```json
{
  "status": 200,
  "message": "Success",
  "data": [MedicalPackage, ...],
  "timestamp": "..."
}
```

---

## الصلاحيات المطلوبة

| Endpoint | Permission Required |
|----------|---------------------|
| `GET /api/medical-packages` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_READ` |
| `GET /api/medical-packages/selector` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_READ` |
| `GET /api/medical-packages/{id}` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_READ` |
| `GET /api/medical-packages/code/{code}` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_READ` |
| `GET /api/medical-packages/active` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_READ` |
| `GET /api/medical-packages/count` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_READ` |
| `GET /api/medical-packages/search` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_READ` |
| `POST /api/medical-packages` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_CREATE` |
| `PUT /api/medical-packages/{id}` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_UPDATE` |
| `DELETE /api/medical-packages/{id}` | `SUPER_ADMIN` أو `MEDICAL_PACKAGE_DELETE` |

---

## أمثلة الاستخدام

### Frontend - جلب الباقات

```javascript
// ✅ صحيح
const response = await api.get('/api/medical-packages', {
  params: {
    page: 1,
    size: 10,
    sortBy: 'nameAr',
    sortDir: 'asc'
  }
});
const { items, total, page, size } = response.data.data;

// ✅ استخدام الحقول الصحيحة
items.forEach(pkg => {
  console.log(pkg.nameAr);           // ✅ الاسم بالعربية
  console.log(pkg.nameEn);           // ✅ الاسم بالإنجليزية
  console.log(pkg.code);             // ✅ الكود
  console.log(pkg.servicesCount);    // ✅ عدد الخدمات
  console.log(pkg.totalCoverageLimit); // ✅ حد التغطية
});
```

### Frontend - جلب خيارات القائمة المنسدلة

```javascript
// ✅ صحيح - للـ Select/Dropdown
const response = await api.get('/api/medical-packages/selector');
const options = response.data.data;

// استخدام في MUI Select
<Select>
  {options.map(pkg => (
    <MenuItem key={pkg.id} value={pkg.id}>
      {pkg.nameAr} ({pkg.code})
    </MenuItem>
  ))}
</Select>
```

### Frontend - إنشاء باقة جديدة

```javascript
// ✅ صحيح
const newPackage = {
  code: 'PKG-VIP',
  nameAr: 'باقة VIP',
  nameEn: 'VIP Package',
  description: 'باقة خاصة للعملاء المميزين',
  serviceIds: [10, 20, 30],  // ✅ معرفات الخدمات
  totalCoverageLimit: 75000.00,
  active: true
};

const response = await api.post('/api/medical-packages', newPackage);
```

### Frontend - تحديث باقة

```javascript
// ✅ صحيح
const updatedPackage = {
  code: 'PKG-VIP',
  nameAr: 'باقة VIP المحسّنة',
  nameEn: 'Enhanced VIP Package',
  description: 'باقة محسّنة',
  serviceIds: [10, 20, 30, 40, 50],  // ✅ إضافة خدمات جديدة
  totalCoverageLimit: 100000.00,
  active: true
};

await api.put(`/api/medical-packages/${packageId}`, updatedPackage);
```

---

## ⚠️ أخطاء شائعة يجب تجنبها

| ❌ خطأ | ✅ صحيح |
|--------|---------|
| `name` | `nameAr` / `nameEn` |
| `services: [1, 2, 3]` | `serviceIds: [1, 2, 3]` |
| `coverageLimit` | `totalCoverageLimit` |
| `sort=nameAr,asc` | `sortBy=nameAr&sortDir=asc` |
| `data.content` | `data.items` |
| `data.totalElements` | `data.total` |

---

## 🔗 العلاقات

### MedicalPackage ↔ MedicalService

- علاقة **Many-to-Many**
- جدول وسيط: `medical_package_services`
- الباقة تحتوي على مجموعة خدمات
- الخدمة يمكن أن تكون في أكثر من باقة

```
┌─────────────────────┐       ┌──────────────────────────┐       ┌─────────────────────┐
│   MedicalPackage    │──────>│  medical_package_services │<──────│   MedicalService    │
│                     │       │  (package_id, service_id) │       │                     │
│  - id               │       └──────────────────────────┘       │  - id               │
│  - code             │                                          │  - code             │
│  - nameAr           │                                          │  - name             │
│  - nameEn           │                                          │  - basePrice        │
│  - services[]       │                                          │                     │
└─────────────────────┘                                          └─────────────────────┘
```

---

**📋 آخر تحديث:** 2026-01-13  
**✍️ المُعد:** GitHub Copilot  
**🔒 الحالة:** عقد ثابت ومُلزم
