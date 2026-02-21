# 🔐 RBAC HARDENING - VALIDATION CHECKLIST (2026-02-04)

## ملخص التعديلات المُنفذة

### ✅ PHASE 1: Backend RBAC Hardening
1. مراجعة جميع Controllers - كل Endpoint له `@PreAuthorize`
2. إزالة `hasRole('PROVIDER')` من ProviderContractController
3. إنشاء V008__rbac_hardening.sql لتوحيد صلاحيات الأدوار

### ✅ PHASE 2: Frontend Route Guards
- جميع Routes محمية بـ `PermissionGuard`
- لا يوجد استخدام لـ `allowedRoles`
- الصفحات غير المحمية مقصودة (Dashboard, Profile, Error pages)

### ✅ PHASE 3: Menu Permission System
1. تحديث `hasPermissionForItem()` في `components.jsx`:
   - `null` = مسموح للجميع صراحةً
   - `undefined` = غير معرف = **محجوب** (deny by default)
2. جميع menu IDs لها تعريف في `MENU_PERMISSIONS`

### ✅ PHASE 4: Page/Action Level
1. إصلاح أسماء الصلاحيات في صفحات Settlement:
   - `settlement:batches:read` → `VIEW_SETTLEMENTS`
   - `settlement:batches:create` → `CREATE_SETTLEMENT_BATCH`
   - `settlement:batches:update` → `CONFIRM_SETTLEMENT_BATCH`
   - `settlement:batches:pay` → `PAY_SETTLEMENT_BATCH`

---

## 🧪 خطوات التحقق

### الخطوة 1: تطبيق Migration
```bash
cd backend
./mvnw spring-boot:run
# Migration V008 سيُطبق تلقائياً
```

### الخطوة 2: اختبار الأدوار

#### 🔐 SUPER_ADMIN
| الاختبار | النتيجة المتوقعة | ✓/✗ |
|---------|-----------------|-----|
| تسجيل الدخول | نجاح | |
| عرض كل القوائم | نعم - جميعها | |
| دخول صفحة RBAC | نجاح | |
| دخول صفحة التسويات | نجاح | |
| دخول صفحة المطالبات | نجاح | |

#### 💰 ACCOUNTANT (المحاسب)
| الاختبار | النتيجة المتوقعة | ✓/✗ |
|---------|-----------------|-----|
| تسجيل الدخول | نجاح | |
| عرض القوائم | Dashboard + التسويات + التقارير فقط | |
| دخول /settlement/batches | نجاح | |
| دخول /members | Unauthorized | |
| دخول /employers | Unauthorized | |
| دخول /rbac | Unauthorized | |

#### 📋 REVIEWER (المراجع)
| الاختبار | النتيجة المتوقعة | ✓/✗ |
|---------|-----------------|-----|
| تسجيل الدخول | نجاح | |
| عرض القوائم | Dashboard + المطالبات/الموافقات فقط | |
| دخول /claims/inbox | نجاح | |
| دخول /pre-approvals/inbox | نجاح | |
| دخول /settlement | Unauthorized | |
| دخول /members | Unauthorized | |

#### 🏥 PROVIDER (مقدم الخدمة)
| الاختبار | النتيجة المتوقعة | ✓/✗ |
|---------|-----------------|-----|
| تسجيل الدخول | نجاح | |
| عرض القوائم | Dashboard + بوابة مقدم الخدمة فقط | |
| دخول /provider/* | نجاح | |
| دخول /claims/inbox | Unauthorized | |
| دخول /settlement | Unauthorized | |
| دخول /rbac | Unauthorized | |

### الخطوة 3: اختبار URL المباشر
| URL | المستخدم | النتيجة المتوقعة |
|-----|---------|-----------------|
| /settlement/batches | ACCOUNTANT | نجاح |
| /settlement/batches | REVIEWER | Redirect → /unauthorized |
| /members | SUPER_ADMIN | نجاح |
| /members | ACCOUNTANT | Redirect → /unauthorized |
| /rbac | SUPER_ADMIN | نجاح |
| /rbac | أي دور آخر | Redirect → /unauthorized |

### الخطوة 4: اختبار API مباشر
```bash
# اختبار API بدون صلاحية
curl -X GET http://localhost:8080/api/v1/settlement-batches \
  -H "Cookie: JSESSIONID=<reviewer_session>"
# Expected: 403 Forbidden

# اختبار API بصلاحية
curl -X GET http://localhost:8080/api/v1/settlement-batches \
  -H "Cookie: JSESSIONID=<accountant_session>"
# Expected: 200 OK
```

---

## 📊 جدول الصلاحيات النهائي

### ACCOUNTANT (المحاسب المالي)
| الصلاحية | الوصف |
|---------|-------|
| VIEW_DASHBOARD | عرض لوحة التحكم |
| VIEW_SETTLEMENTS | عرض دفعات التسوية |
| VIEW_PROVIDER_ACCOUNTS | عرض حسابات مقدمي الخدمة |
| CREATE_SETTLEMENT_BATCH | إنشاء دفعة تسوية |
| CONFIRM_SETTLEMENT_BATCH | تأكيد دفعة التسوية |
| PAY_SETTLEMENT_BATCH | دفع دفعة التسوية |
| CANCEL_SETTLEMENT_BATCH | إلغاء دفعة التسوية |
| VIEW_CLAIMS | عرض المطالبات (للمرجع) |
| VIEW_REPORTS | عرض التقارير |
| EXPORT_REPORTS | تصدير التقارير |

### REVIEWER (المراجع)
| الصلاحية | الوصف |
|---------|-------|
| VIEW_DASHBOARD | عرض لوحة التحكم |
| VIEW_CLAIMS | عرض المطالبات |
| APPROVE_CLAIMS | الموافقة على المطالبات |
| REJECT_CLAIMS | رفض المطالبات |
| VIEW_PRE_AUTH | عرض الموافقات المسبقة |
| APPROVE_PRE_AUTH | الموافقة على الطلبات |
| REJECT_PRE_AUTH | رفض الطلبات |
| VIEW_REPORTS | عرض التقارير |

### PROVIDER (مقدم الخدمة)
| الصلاحية | الوصف |
|---------|-------|
| VIEW_DASHBOARD | عرض لوحة التحكم |
| VIEW_MEMBERS | التحقق من الأهلية |
| VIEW_VISITS | عرض الزيارات |
| MANAGE_VISITS | إدارة الزيارات |
| VIEW_CLAIMS | عرض المطالبات |
| CREATE_CLAIM | إنشاء مطالبة |
| VIEW_PRE_AUTH | عرض الموافقات المسبقة |
| CREATE_PRE_AUTH | إنشاء طلب موافقة |
| VIEW_MEDICAL_SERVICES | عرض الخدمات الطبية |
| VIEW_MEDICAL_CATEGORIES | عرض الفئات الطبية |

---

## ⚠️ ملاحظات مهمة

1. **بعد تطبيق V008**: يجب إعادة تسجيل دخول جميع المستخدمين لتحديث الصلاحيات
2. **SUPER_ADMIN**: يحصل على جميع الصلاحيات تلقائياً (bypass)
3. **التسويات**: الآن محمية بشكل صحيح بصلاحيات `VIEW_SETTLEMENTS` و `CREATE_SETTLEMENT_BATCH`

---

## ✅ الحالة النهائية

| المكون | الحالة |
|--------|--------|
| Backend @PreAuthorize | ✅ مكتمل |
| Frontend Route Guards | ✅ مكتمل |
| Menu Permission System | ✅ مكتمل |
| Database RBAC | ✅ V008 جاهز للتطبيق |
| Settlement Pages | ✅ أسماء الصلاحيات مصححة |

---

**التاريخ:** 2026-02-04
**الحالة:** جاهز للاختبار
