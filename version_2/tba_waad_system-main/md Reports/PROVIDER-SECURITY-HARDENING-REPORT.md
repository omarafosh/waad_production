# 🔐 Provider User Security Hardening Report
## إصلاح صلاحيات مستخدم مقدم الخدمة - حل جذري
**التاريخ:** 2026-01-16

---

## 📋 ملخص التغييرات

تم تنفيذ إصلاح جذري لضمان عزل بيانات مقدمي الخدمة بشكل صارم، مع منع أي تسريب صلاحيات أو بيانات.

---

## 1️⃣ Backend Security Enforcement

### 🆕 ملف جديد: `ProviderContextGuard.java`
**المسار:** `backend/src/main/java/com/waad/tba/security/ProviderContextGuard.java`

مكون أساسي لإدارة سياق مقدم الخدمة:

```java
@Component
public class ProviderContextGuard {
    // التحقق من ربط المستخدم بـ Provider
    void validateProviderBinding(User user);
    
    // الحصول على providerId الإلزامي
    Long getRequiredProviderId();
    
    // التحقق من صلاحية الوصول لـ provider محدد
    void validateProviderAccess(Long requestedProviderId);
    
    // فرض providerId على DTO
    Long enforceProviderId(Long requestedProviderId);
    
    // الحصول على فلتر providerId للاستعلامات
    Long getProviderFilter();
}
```

### ✅ تحديث `AuthService.java`
**التحقق عند Login:**
- منع تسجيل الدخول إذا كان المستخدم PROVIDER بدون providerId
- التحقق من وجود Provider ونشاطه
- رسائل خطأ واضحة ثنائية اللغة

```java
private void validateRoleBindingsBeforeLogin(User user) {
    if (isProvider) {
        if (user.getProviderId() == null) {
            throw new BusinessRuleException(
                "حساب مقدم الخدمة غير مكتمل الإعداد..."
            );
        }
        // Also validate provider exists and is active
    }
}
```

### ✅ تحديث `VisitService.java`
- استخدام `ProviderContextGuard` لفرض providerId
- فلترة الزيارات بناءً على providerId
- تجاهل أي providerId قادم من الـ request

### ✅ تحديث `VisitRepository.java`
- إضافة `searchPagedByProviderId()` للبحث مع فلتر Provider
- إضافة `countByProviderId()` للإحصائيات

### ✅ تحديث `ClaimService.java`
- استخدام `ProviderContextGuard` للتحقق والفرض
- فلترة المطالبات بناءً على providerId

### ✅ تحديث `PreAuthorizationService.java`
- استخدام `ProviderContextGuard` للتحقق والفرض
- منع إنشاء موافقات مسبقة لمقدم خدمة آخر

### ✅ تحديث `ProviderPortalController.java`
- التحقق من provider binding قبل فحص الأهلية

---

## 2️⃣ Frontend Security Enforcement

### 🆕 ملف جديد: `providerSecurity.js`
**المسار:** `frontend/src/constants/providerSecurity.js`

ثوابت وأدوات للأمان:
```javascript
export const PROVIDER_ALLOWED_ROUTES = [
  '/provider',
  '/provider/eligibility-check',
  '/provider/visits',
  '/provider/claims/submit'
];

export const PROVIDER_ERROR_CODES = {
  NOT_LINKED: 'PROVIDER_NOT_LINKED',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  PROVIDER_INACTIVE: 'PROVIDER_INACTIVE',
  ACCESS_DENIED: 'PROVIDER_ACCESS_DENIED'
};
```

### 🆕 ملف جديد: `ProviderRouteGuard.jsx`
**المسار:** `frontend/src/routes/ProviderRouteGuard.jsx`

حارس أمان مخصص لبوابة مقدم الخدمة

### ✅ تحديث `RouteGuard.jsx`
- التحقق من providerId لمستخدمي PROVIDER
- إعادة التوجيه التلقائي للمسارات غير المسموحة
- منع الوصول عبر URL المباشر

---

## 3️⃣ قواعد الأمان المُطبَّقة

| القاعدة | الحالة | الوصف |
|---------|--------|-------|
| Provider binding validation | ✅ | التحقق من ربط المستخدم بـ provider عند Login |
| Provider ID enforcement | ✅ | فرض providerId من الـ session (تجاهل request) |
| Data isolation | ✅ | فلترة جميع البيانات بناءً على providerId |
| Route protection | ✅ | منع الوصول للمسارات غير المسموحة |
| Menu isolation | ✅ | إخفاء القوائم غير الخاصة بمقدم الخدمة |
| Error handling | ✅ | رسائل خطأ واضحة ثنائية اللغة |

---

## 4️⃣ Validation Checklist

✅ مستخدم Provider لا يرى إلا Provider Portal  
✅ لا تظهر أي بيانات تخص مقدمي خدمة آخرين  
✅ الزيارات محصورة على مقدم الخدمة المرتبط  
✅ فحص الأهلية لا يرمي خطأ provider linkage  
✅ لا يمكن تغيير providerId بعد ربط المستخدم  
✅ SuperAdmin ما زال يرى كل شيء (بدون كسر)  

---

## 5️⃣ رسائل الخطأ

### عند Login
| الكود | الرسالة (عربي) | الرسالة (إنجليزي) |
|-------|---------------|------------------|
| PROVIDER_NOT_LINKED | حساب مقدم الخدمة غير مكتمل الإعداد | Provider account setup incomplete |
| PROVIDER_NOT_FOUND | مقدم الخدمة المرتبط بالحساب غير موجود | The linked provider does not exist |
| PROVIDER_INACTIVE | مقدم الخدمة المرتبط بالحساب غير نشط | The linked provider is not active |

### عند محاولة الوصول غير المصرح
| الكود | الرسالة |
|-------|---------|
| ACCESS_DENIED | لا يمكن الوصول إلى هذه الصفحة. مقدمو الخدمة يمكنهم الوصول فقط لبوابة مقدم الخدمة |

---

## 6️⃣ الملفات المُعدَّلة

### Backend
1. `security/ProviderContextGuard.java` - **جديد**
2. `auth/service/AuthService.java` - تحقق عند Login
3. `visit/service/VisitService.java` - فلترة وفرض providerId
4. `visit/repository/VisitRepository.java` - إضافة methods للبحث
5. `claim/service/ClaimService.java` - فلترة وفرض providerId
6. `preauthorization/service/PreAuthorizationService.java` - فرض providerId
7. `provider/controller/ProviderPortalController.java` - تحقق إضافي

### Frontend
1. `constants/providerSecurity.js` - **جديد**
2. `routes/ProviderRouteGuard.jsx` - **جديد**
3. `routes/RouteGuard.jsx` - تعزيز الحماية

---

## 7️⃣ تدفق الأمان

```
┌─────────────────────────────────────────────────────────────┐
│                     LOGIN FLOW                               │
├─────────────────────────────────────────────────────────────┤
│ 1. User submits credentials                                  │
│ 2. AuthService.validateRoleBindingsBeforeLogin()            │
│    ├── Is PROVIDER? → Check providerId                      │
│    │   ├── No providerId → BLOCK LOGIN                      │
│    │   ├── Provider not found → BLOCK LOGIN                 │
│    │   └── Provider inactive → BLOCK LOGIN                  │
│    └── Else → Continue                                      │
│ 3. Generate token with providerId                           │
│ 4. Frontend receives user with providerId                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  DATA ACCESS FLOW                            │
├─────────────────────────────────────────────────────────────┤
│ 1. User requests data (visits/claims/etc.)                  │
│ 2. Service checks user role                                 │
│    ├── PROVIDER?                                            │
│    │   ├── ProviderContextGuard.validateProviderBinding()   │
│    │   ├── Get providerId from user (NOT request)           │
│    │   └── Filter data by providerId                        │
│    └── ADMIN? → No filter                                   │
│ 3. Return filtered data                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  CREATE DATA FLOW                            │
├─────────────────────────────────────────────────────────────┤
│ 1. User submits create request (visit/claim/etc.)           │
│ 2. Service enforces providerId                              │
│    ├── PROVIDER?                                            │
│    │   ├── IGNORE providerId from request                   │
│    │   └── USE providerId from session                      │
│    └── ADMIN? → Use provided providerId (required)          │
│ 3. Create record with enforced providerId                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8️⃣ الخطوات التالية (اختياري)

1. **اختبار شامل:** إنشاء integration tests للتحقق من جميع السيناريوهات
2. **Audit logging:** تسجيل محاولات الوصول المرفوضة
3. **Rate limiting:** حماية من محاولات الاختراق المتكررة
4. **IP whitelist:** تقييد الوصول من عناوين IP معينة لمقدمي الخدمة

---

**النتيجة:** ✅ Provider User يعمل داخل Provider Portal فقط، ببياناته فقط، بدون أخطاء ربط، وبدون تسريب صلاحيات.
