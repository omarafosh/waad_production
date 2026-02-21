# دليل صلاحيات عقود مقدمي الخدمة
## Provider Contracts Permissions - Quick Reference

**آخر تحديث:** 2026-01-01  
**الإصدار:** 1.0

---

## 🎯 نظرة سريعة

| الصلاحية | من يمتلكها؟ | ماذا تتيح؟ |
|---------|------------|-----------|
| **VIEW_PROVIDER_CONTRACTS** | SUPER_ADMIN, INSURANCE_ADMIN | عرض وبحث وإحصائيات ✅ |
| **MANAGE_PROVIDER_CONTRACTS** | SUPER_ADMIN, INSURANCE_ADMIN | إنشاء، تعديل، حذف، تسعير ✅ |

---

## 📋 VIEW_PROVIDER_CONTRACTS (عرض العقود)

### الوصف:
```
عرض عقود مقدمي الخدمة والتسعيرات والإحصائيات
```

### الـ Endpoints المتاحة:

#### 📊 قوائم وبحث:
```
✅ GET /api/provider-contracts
   → عرض كل العقود (paginated)

✅ GET /api/provider-contracts/search?q={query}&status={status}
   → البحث في العقود

✅ GET /api/provider-contracts/expiring?days=30
   → العقود المنتهية خلال 30 يوم

✅ GET /api/provider-contracts/status/{status}
   → فلترة حسب الحالة (ACTIVE, EXPIRED, etc.)
```

#### 🔍 تفاصيل عقد معين:
```
✅ GET /api/provider-contracts/{id}
   → تفاصيل عقد بالـ ID

✅ GET /api/provider-contracts/code/{code}
   → عقد بالكود

✅ GET /api/provider-contracts/provider/{providerId}
   → كل عقود مقدم خدمة معين

✅ GET /api/provider-contracts/provider/{providerId}/active
   → العقد النشط لمقدم خدمة
```

#### 📈 إحصائيات:
```
✅ GET /api/provider-contracts/stats
   → إحصائيات شاملة للعقود

✅ GET /api/provider-contracts/{contractId}/pricing/stats
   → إحصائيات التسعير لعقد معين
```

#### 💰 التسعيرات:
```
✅ GET /api/provider-contracts/{contractId}/pricing
   → قائمة عناصر التسعير

✅ GET /api/provider-contracts/{contractId}/pricing/search?q={query}
   → البحث في التسعيرات

✅ GET /api/provider-contracts/pricing/{pricingId}
   → عنصر تسعير محدد
```

### من يمتلك هذه الصلاحية؟
```
✅ SUPER_ADMIN       (المدير العام)
✅ INSURANCE_ADMIN   (مدير شركة التأمين)
```

### مثال - Backend:
```java
@GetMapping("/api/provider-contracts/stats")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDER_CONTRACTS')")
public ResponseEntity<ApiResponse<ProviderContractStatsDto>> getStats() {
    // ...
}
```

### مثال - Frontend:
```javascript
// في providerContracts.service.js
export const getProviderContractStats = async () => {
  const response = await axiosClient.get('/provider-contracts/stats');
  return unwrap(response);
};

// الاستخدام في Component
useEffect(() => {
  const fetchStats = async () => {
    try {
      const stats = await getProviderContractStats();
      setStats(stats);
    } catch (error) {
      // إذا كان المستخدم ليس لديه صلاحية → 403 Forbidden
      console.error('Access denied:', error);
    }
  };
  fetchStats();
}, []);
```

---

## 🔧 MANAGE_PROVIDER_CONTRACTS (إدارة العقود)

### الوصف:
```
إدارة كاملة لعقود مقدمي الخدمة والتسعيرات
(إنشاء، تعديل، حذف، تفعيل، تسعير)
```

### الـ Endpoints المتاحة:

#### ➕ إنشاء وتعديل:
```
✅ POST /api/provider-contracts
   → إنشاء عقد جديد

✅ PUT /api/provider-contracts/{id}
   → تعديل عقد موجود

✅ DELETE /api/provider-contracts/{id}
   → حذف عقد (soft delete)
```

#### 🔄 إدارة دورة حياة العقد:
```
✅ POST /api/provider-contracts/{id}/activate
   → تفعيل عقد (DRAFT → ACTIVE)

✅ POST /api/provider-contracts/{id}/suspend
   → إيقاف عقد مؤقتاً (ACTIVE → SUSPENDED)

✅ POST /api/provider-contracts/{id}/terminate
   → إنهاء عقد نهائياً (ANY → TERMINATED)
```

#### 💰 إدارة التسعيرات:
```
✅ POST /api/provider-contracts/{contractId}/pricing
   → إضافة عنصر تسعير

✅ POST /api/provider-contracts/{contractId}/pricing/bulk
   → إضافة عدة عناصر دفعة واحدة

✅ PUT /api/provider-contracts/pricing/{pricingId}
   → تعديل عنصر تسعير

✅ DELETE /api/provider-contracts/pricing/{pricingId}
   → حذف عنصر تسعير

✅ DELETE /api/provider-contracts/{contractId}/pricing
   → حذف كل التسعيرات (Draft contracts only)
```

### من يمتلك هذه الصلاحية؟
```
✅ SUPER_ADMIN (المدير العام)
✅ INSURANCE_ADMIN (مدير شركة التأمين)
```

### لماذا هذان الدوران فقط؟
```
📌 التوزيع المنطقي:
✅ INSURANCE_ADMIN: مسؤول عن إدارة الشبكة الطبية اليومية
✅ SUPER_ADMIN: مراقبة وإشراف على جميع العمليات

⚠️ الحماية:
- Audit trail كامل لكل التعديلات
- كلا الدورين في مستوى إداري عالي
- لا يمنح لأدوار تنفيذية أو مقدمي خدمة
```

### مثال - Backend:
```java
@PostMapping("/api/provider-contracts")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_PROVIDER_CONTRACTS')")
public ResponseEntity<ApiResponse<ProviderContractResponseDto>> create(
    @Valid @RequestBody ProviderContractCreateDto dto) {
    // ...
}
```

### مثال - Frontend:
```javascript
// في providerContracts.service.js
export const createProviderContract = async (data) => {
  const response = await axiosClient.post('/provider-contracts', data);
  return unwrap(response);
};

// الاستخدام في Component
const handleSubmit = async (formData) => {
  try {
    const contract = await createProviderContract(formData);
    toast.success('تم إنشاء العقد بنجاح');
  } catch (error) {
    if (error.response?.status === 403) {
      toast.error('ليس لديك صلاحية لإنشاء عقود');
    }
  }
};
```

---

## 🔐 مصفوفة الأدوار والصلاحيات

| الدور | VIEW | MANAGE | حالات الاستخدام |
|------|------|--------|-----------------|
| **SUPER_ADMIN** | ✅ | ✅ | إشراف كامل على النظام |
| **INSURANCE_ADMIN** | ✅ | ✅ | إدارة الشبكة الطبية والعقود |
| **EMPLOYER_ADMIN** | ❌ | ❌ | لا يحتاج الوصول |
| **REVIEWER** | ❌ | ❌ | لا يحتاج الوصول |
| **PROVIDER** | ❌ | ❌ | لا يحتاج الوصول |
| **USER** | ❌ | ❌ | لا يحتاج الوصول |

---

## 🎬 سيناريوهات عملية

### Scenario 1: إنشاء عقد جديد
```javascript
// المستخدم: SUPER_ADMIN
const newContract = {
  providerId: 123,
  contractCode: 'PC-2026-001',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  pricingModel: 'DISCOUNT',
  discountRate: 15.00,
  // ...
};

const result = await createProviderContract(newContract);
// ✅ Status: 201 Created
```

### Scenario 2: عرض إحصائيات العقود
```javascript
// المستخدم: INSURANCE_ADMIN
const stats = await getProviderContractStats();
// ✅ Status: 200 OK
// {
//   totalContracts: 45,
//   activeContracts: 38,
//   expiringThisMonth: 5,
//   averageDiscountRate: 12.5
// }
```

### Scenario 3: محاولة إنشاء عقد بدون صلاحية
```javascript
// المستخدم: EMPLOYER_ADMIN (ليس لديه MANAGE_PROVIDER_CONTRACTS)
try {
  const result = await createProviderContract(newContract);
} catch (error) {
  // ❌ Status: 403 Forbidden
  // error.response.data.message: "Access is denied"
}
```

---

## 🔍 التحقق من الصلاحيات

### في Frontend (قبل الطلب):
```javascript
// في utils/permissions.js
export const canManageProviderContracts = (user) => {
  return user?.authorities?.includes('MANAGE_PROVIDER_CONTRACTS') ||
         user?.roles?.some(r => r.name === 'SUPER_ADMIN');
};

export const canViewProviderContracts = (user) => {
  return user?.authorities?.includes('VIEW_PROVIDER_CONTRACTS') ||
         user?.roles?.some(r => ['SUPER_ADMIN', 'INSURANCE_ADMIN'].includes(r.name));
};

// الاستخدام في Component
import { canManageProviderContracts } from 'utils/permissions';

const ProviderContractsList = () => {
  const { user } = useAuth();
  const canManage = canManageProviderContracts(user);

  return (
    <div>
      {canManage && (
        <Button onClick={() => navigate('/provider-contracts/create')}>
          إنشاء عقد جديد
        </Button>
      )}
      {/* قائمة العقود */}
    </div>
  );
};
```

### في Backend (التحقق التلقائي):
```java
// Spring Security يتحقق تلقائياً من @PreAuthorize
// لا حاجة للتحقق اليدوي في معظم الحالات

@GetMapping("/api/provider-contracts")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_PROVIDER_CONTRACTS')")
public ResponseEntity<...> getAll() {
    // إذا وصل هنا → المستخدم لديه الصلاحية ✅
}
```

---

## 📊 Endpoints Reference - ملخص شامل

### GET Endpoints (VIEW_PROVIDER_CONTRACTS)

| HTTP Method | Endpoint | Description AR | Description EN |
|-------------|----------|---------------|----------------|
| GET | `/api/provider-contracts` | قائمة العقود | List all contracts |
| GET | `/api/provider-contracts/search` | بحث في العقود | Search contracts |
| GET | `/api/provider-contracts/stats` | إحصائيات العقود | Contract statistics |
| GET | `/api/provider-contracts/expiring` | عقود منتهية قريباً | Expiring contracts |
| GET | `/api/provider-contracts/status/{status}` | فلترة بالحالة | Filter by status |
| GET | `/api/provider-contracts/{id}` | تفاصيل عقد | Contract details |
| GET | `/api/provider-contracts/code/{code}` | بحث بالكود | Find by code |
| GET | `/api/provider-contracts/provider/{providerId}` | عقود مقدم خدمة | Provider contracts |
| GET | `/api/provider-contracts/provider/{providerId}/active` | العقد النشط | Active contract |
| GET | `/api/provider-contracts/{contractId}/pricing` | قائمة التسعيرات | Pricing items |
| GET | `/api/provider-contracts/{contractId}/pricing/search` | بحث في التسعيرات | Search pricing |
| GET | `/api/provider-contracts/{contractId}/pricing/stats` | إحصائيات التسعير | Pricing stats |
| GET | `/api/provider-contracts/pricing/{pricingId}` | عنصر تسعير | Pricing item |

### POST/PUT/DELETE Endpoints (MANAGE_PROVIDER_CONTRACTS)

| HTTP Method | Endpoint | Description AR | Description EN |
|-------------|----------|---------------|----------------|
| POST | `/api/provider-contracts` | إنشاء عقد | Create contract |
| PUT | `/api/provider-contracts/{id}` | تعديل عقد | Update contract |
| DELETE | `/api/provider-contracts/{id}` | حذف عقد | Delete contract |
| POST | `/api/provider-contracts/{id}/activate` | تفعيل عقد | Activate contract |
| POST | `/api/provider-contracts/{id}/suspend` | إيقاف عقد | Suspend contract |
| POST | `/api/provider-contracts/{id}/terminate` | إنهاء عقد | Terminate contract |
| POST | `/api/provider-contracts/{contractId}/pricing` | إضافة تسعير | Add pricing |
| POST | `/api/provider-contracts/{contractId}/pricing/bulk` | إضافة جماعية | Bulk add pricing |
| PUT | `/api/provider-contracts/pricing/{pricingId}` | تعديل تسعير | Update pricing |
| DELETE | `/api/provider-contracts/pricing/{pricingId}` | حذف تسعير | Delete pricing |
| DELETE | `/api/provider-contracts/{contractId}/pricing` | حذف كل التسعيرات | Delete all pricing |

---

## 🚨 رسائل الخطأ الشائعة

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Access is denied",
  "timestamp": "2026-01-01T20:00:00Z"
}
```

**السبب:**
- المستخدم ليس لديه الصلاحية المطلوبة
- أو الدور لا يمتلك الصلاحية

**الحل:**
- تحقق من دور المستخدم
- أضف الصلاحية للدور في RbacDataInitializer
- أعد تشغيل Backend

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Full authentication is required",
  "timestamp": "2026-01-01T20:00:00Z"
}
```

**السبب:**
- لا يوجد توكن JWT/Session
- التوكن منتهي الصلاحية

**الحل:**
- تسجيل دخول جديد
- تحديث التوكن

---

## ✅ Checklist للمطورين

عند إضافة endpoint جديد لعقود مقدمي الخدمة:

```
☐ 1. إضافة @PreAuthorize annotation
     ✓ VIEW operations: hasAuthority('VIEW_PROVIDER_CONTRACTS')
     ✓ MANAGE operations: hasAuthority('MANAGE_PROVIDER_CONTRACTS')

☐ 2. اختبار الصلاحيات:
     ✓ SUPER_ADMIN → يجب أن يعمل ✅
     ✓ INSURANCE_ADMIN → يعمل للعرض فقط ✅
     ✓ أدوار أخرى → 403 Forbidden ✅

☐ 3. توثيق الـ endpoint في Swagger

☐ 4. إضافة function في Frontend service

☐ 5. اختبار من Frontend مع كل الأدوار
```

---

**دليل سريع - انتهى ✅**

*للتفاصيل الكاملة، راجع: [PROVIDER-CONTRACTS-403-FIX-COMPLETE.md](PROVIDER-CONTRACTS-403-FIX-COMPLETE.md)*
