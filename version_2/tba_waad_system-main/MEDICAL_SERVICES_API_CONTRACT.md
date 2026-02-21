# 📋 Medical Services API Contract
# عقد واجهة برمجة الخدمات الطبية

**الإصدار:** 1.0.0  
**التاريخ:** 2026-01-14  
**الحالة:** ✅ مثبّت ومعتمد

---

## 🎯 الهدف

هذا المستند يُحدد العقد النهائي بين Backend و Frontend لموديول الخدمات الطبية.
**يُمنع أي اجتهاد أو mapping افتراضي خارج هذا العقد.**

---

## 📊 Response Wrapper

جميع الاستجابات تُغلّف في `ApiResponse`:

```json
{
  "status": "success",
  "message": "Optional message",
  "data": { ... },
  "timestamp": "2026-01-14T10:30:00"
}
```

---

## 📄 MedicalServiceResponseDto

الحقول المُرجعة من Backend:

| الحقل | النوع | مطلوب | الوصف |
|-------|-------|-------|-------|
| `id` | Long | ✅ | المعرف الفريد |
| `code` | String | ✅ | رمز الخدمة (فريد، غير قابل للتغيير) |
| `name` | String | ✅ | الاسم بالعربية |
| `nameEn` | String | ❌ | الاسم بالإنجليزية |
| `categoryId` | Long | ✅ | معرف التصنيف |
| `categoryName` | String | ❌ | اسم التصنيف (للعرض) |
| `categoryCode` | String | ❌ | رمز التصنيف (للمرجعية) |
| `description` | String | ❌ | الوصف |
| `basePrice` | BigDecimal | ❌ | السعر الأساسي (مرجعي فقط) |
| `requiresPA` | boolean | ✅ | يتطلب موافقة مسبقة |
| `active` | boolean | ✅ | نشط |
| `createdAt` | LocalDateTime | ✅ | تاريخ الإنشاء |
| `updatedAt` | LocalDateTime | ✅ | تاريخ التحديث |

---

## 📝 MedicalServiceCreateDto

الحقول المطلوبة للإنشاء:

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `code` | String | ✅ | @NotBlank, max 50 chars |
| `name` | String | ✅ | @NotBlank, max 200 chars |
| `categoryId` | Long | ✅ | @NotNull |
| `description` | String | ❌ | max 500 chars |
| `basePrice` | BigDecimal | ❌ | >= 0 |
| `requiresPA` | Boolean | ❌ | default: false |
| `active` | Boolean | ❌ | default: true |

---

## 🔄 MedicalServiceUpdateDto

الحقول المطلوبة للتحديث:

| الحقل | النوع | مطلوب | ملاحظات |
|-------|-------|-------|---------|
| `name` | String | ❌ | max 200 chars |
| `categoryId` | Long | ❌ | يجب أن يكون category موجود |
| `description` | String | ❌ | max 500 chars |
| `basePrice` | BigDecimal | ❌ | >= 0 |
| `requiresPA` | Boolean | ❌ | |
| `active` | Boolean | ❌ | |

⚠️ **`code` غير قابل للتغيير بعد الإنشاء**

---

## 📄 MedicalCategoryResponseDto

| الحقل | النوع | مطلوب | الوصف |
|-------|-------|-------|-------|
| `id` | Long | ✅ | المعرف الفريد |
| `code` | String | ✅ | رمز التصنيف |
| `name` | String | ✅ | الاسم بالعربية |
| `nameEn` | String | ❌ | الاسم بالإنجليزية |
| `parentId` | Long | ❌ | معرف الأب (للهرمية) |
| `parentName` | String | ❌ | اسم الأب |
| `active` | boolean | ✅ | نشط |
| `createdAt` | LocalDateTime | ✅ | تاريخ الإنشاء |
| `updatedAt` | LocalDateTime | ✅ | تاريخ التحديث |

---

## 🔢 Pagination Request

| Parameter | النوع | الافتراضي | الوصف |
|-----------|-------|-----------|-------|
| `page` | int | 0 | رقم الصفحة (0-based) |
| `size` | int | 20 | حجم الصفحة |
| `sortBy` | String | "code" | حقل الترتيب |
| `sortDir` | String | "ASC" | اتجاه الترتيب (ASC/DESC) |

---

## 📋 Pagination Response (Spring Page)

```json
{
  "content": [...],
  "totalElements": 150,
  "totalPages": 15,
  "number": 0,
  "size": 10,
  "first": true,
  "last": false
}
```

### Frontend Normalized Response:
```javascript
{
  items: [...],
  total: 150,
  page: 1,
  size: 10
}
```

---

## 🔌 API Endpoints

### Medical Services

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/medical-services` | قائمة الخدمات (paginated) |
| GET | `/api/medical-services/{id}` | خدمة واحدة |
| GET | `/api/medical-services/code/{code}` | خدمة بالرمز |
| POST | `/api/medical-services` | إنشاء خدمة |
| PUT | `/api/medical-services/{id}` | تحديث خدمة |
| DELETE | `/api/medical-services/{id}` | حذف (soft) |
| GET | `/api/medical-services/import/template` | تحميل قالب Excel |
| POST | `/api/medical-services/import` | استيراد Excel |

### Medical Categories

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/medical-categories` | قائمة التصنيفات |
| GET | `/api/medical-categories/{id}` | تصنيف واحد |
| GET | `/api/medical-categories/root` | التصنيفات الجذرية |
| GET | `/api/medical-categories/tree` | الشجرة الهرمية |
| POST | `/api/medical-categories` | إنشاء تصنيف |
| PUT | `/api/medical-categories/{id}` | تحديث تصنيف |
| DELETE | `/api/medical-categories/{id}` | حذف (soft) |

---

## 🔒 Permissions

| Role | Read | Create | Update | Delete | Import |
|------|------|--------|--------|--------|--------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| INSURANCE_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| PROVIDER | ✅ | ❌ | ❌ | ❌ | ❌ |
| MEMBER | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## ⚠️ قواعد مهمة

### 1. لا تسعير ولا تغطية في Service
```
❌ coverageLimit
❌ coveragePercent
❌ duration
❌ copayment
```
هذه الحقول تنتمي لـ **BenefitPolicyRule** فقط.

### 2. basePrice مرجعي فقط
- لا يُستخدم للحساب النهائي
- السعر الفعلي = `ProviderContractPricingItem.contractedRate`

### 3. Field Naming Convention
- Backend: `name` (primary Arabic)
- Backend: `nameEn` (secondary English)
- ❌ لا يوجد `nameAr` في Backend

### 4. Sorting
- Frontend يرسل: `sortBy=code&sortDir=ASC`
- Backend يستقبل: `@RequestParam String sortBy, String sortDir`

---

## 📁 الملفات المرتبطة

### Backend:
- `MedicalService.java` - Entity
- `MedicalServiceResponseDto.java` - Response DTO
- `MedicalServiceCreateDto.java` - Create DTO
- `MedicalServiceUpdateDto.java` - Update DTO
- `MedicalServiceController.java` - REST Controller
- `MedicalServiceBulkImportService.java` - Excel Import

### Frontend:
- `medical-services.service.js` - API Service
- `MedicalServicesList.jsx` - List Page
- `MedicalServiceCreate.jsx` - Create Page
- `MedicalServiceEdit.jsx` - Edit Page
- `MedicalServiceView.jsx` - View Page

---

## 📊 Excel Import Contract

### Template Columns:
| Column | Required | Description |
|--------|----------|-------------|
| `code` | ✅ | رمز الخدمة الفريد |
| `name` | ✅ | الاسم بالعربية |
| `category_code` | ✅ | رمز التصنيف |
| `description` | ❌ | الوصف |
| `base_price` | ❌ | السعر الأساسي |
| `cost` | ❌ | التكلفة |
| `requires_pre_approval` | ❌ | yes/no |
| `active` | ❌ | yes/no |

### Import Response:
```json
{
  "success": true,
  "message": "تم الاستيراد في 2.5 ثانية",
  "summary": {
    "total": 12500,
    "inserted": 12000,
    "updated": 400,
    "skipped": 0,
    "failed": 100,
    "errors": [
      { "row": 45, "error": "التصنيف غير موجود" }
    ]
  }
}
```

---

## ✅ Checklist للاستخدام

- [ ] استخدم `name` وليس `nameAr`
- [ ] استخدم `basePrice` وليس `priceLyd`
- [ ] استخدم `cost` وليس `costLyd`
- [ ] استخدم `requiresPA` وليس `requiresApproval`
- [ ] استخدم `categoryName` للعرض
- [ ] استخدم `items` و `total` من normalizePaginatedResponse
- [ ] استخدم `sortBy` و `sortDir` للترتيب
