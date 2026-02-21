# RBAC Schema Contract - TBA WAAD System

> **⚠️ هذا العقد إلزامي - أي انتهاك له يعتبر خطأ معماري**

## تاريخ الإصلاح
- **التاريخ:** 2026-02-08
- **السبب الجذري:** `TRUNCATE TABLE role_permissions` في V060
- **الإصلاح:** إعادة كتابة V060 ليكون SCHEMA-ONLY

---

## ⛔ القاعدة الذهبية

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   Migration Scripts = SCHEMA ONLY (Tables, Indexes, Constraints)             ║
║                                                                              ║
║   RBAC Data = UI ONLY (Admin Panel) + Runtime (PermissionInitializer)        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 مصادر بيانات RBAC

| Table | Data Source | Notes |
|-------|-------------|-------|
| `permissions` | `PermissionInitializer.java` | يقرأ من `AppPermission.java` enum - ADD ONLY |
| `roles` | `RbacDataInitializer.java` | ينشئ SUPER_ADMIN فقط إذا لم يكن موجوداً |
| `role_permissions` | **UI فقط** | يدار من لوحة الإدارة |
| `user_roles` | **UI فقط** | يدار من لوحة الإدارة |

---

## 🛡️ SUPER_ADMIN Strategy

SUPER_ADMIN **لا يحتاج** صلاحيات محفوظة في `role_permissions`:

```java
// AuthService.java - عند تسجيل الدخول
if (user.isSuperAdmin()) {
    List<Permission> allPermissions = permissionRepository.findAll();
    // يحصل على جميع الصلاحيات ديناميكياً
}
```

**النتيجة:** SUPER_ADMIN يحصل دائماً على جميع الصلاحيات بدون الحاجة لتخزينها.

---

## ❌ محظورات في Migration Scripts

```sql
-- ❌ ممنوع منعاً باتاً
TRUNCATE TABLE role_permissions;
TRUNCATE TABLE permissions;
TRUNCATE TABLE roles;
TRUNCATE TABLE user_roles;

DELETE FROM role_permissions;
DELETE FROM permissions;
DELETE FROM roles;
DELETE FROM user_roles;

INSERT INTO role_permissions ...;
INSERT INTO permissions ...;  -- يدار من PermissionInitializer
INSERT INTO roles ...;        -- يدار من RbacDataInitializer
INSERT INTO user_roles ...;
```

---

## ✅ مسموح في Migration Scripts

```sql
-- ✅ Schema operations فقط
CREATE TABLE IF NOT EXISTS ...;
ALTER TABLE ... ADD COLUMN ...;
CREATE INDEX IF NOT EXISTS ...;
ALTER TABLE ... ADD CONSTRAINT ...;
DROP INDEX IF EXISTS ...;
```

---

## 🔄 CommandLineRunners

### PermissionInitializer.java (Order: 40)
```
المهمة: مزامنة الصلاحيات من AppPermission.java enum إلى جدول permissions
السلوك: ADD ONLY - لا يحذف أي صلاحية موجودة
```

### RbacDataInitializer.java (Order: 50)
```
المهمة: إنشاء دور SUPER_ADMIN ومستخدم admin إذا لم يكونوا موجودين
السلوك: IF NOT EXISTS - لا يعدل البيانات الموجودة
```

### SuperAdminPermissionSynchronizer.java (Order: 100)
```
الحالة: DISABLED
السبب: SUPER_ADMIN يحصل على الصلاحيات ديناميكياً - لا حاجة للمزامنة
```

---

## 📁 Migrations Structure

### ✅ Active Migrations (SCHEMA-ONLY)
```
V001__initial_schema.sql           - جداول RBAC الأساسية
V003__claims_module.sql            - جدول المطالبات
V004__preauth_module.sql           - جدول الموافقات المسبقة
V005__settlement_module.sql        - جدول التسويات
V006__member_eligibility.sql       - أهلية الأعضاء
V008__medical_reviews.sql          - المراجعات الطبية
V054__medical_packages_refactor.sql - الحزم الطبية
V055__canonical_medical_services.sql - الخدمات الطبية الموحدة
V059__member_eligibility_date.sql  - تاريخ الأهلية
V060__clean_rbac_schema.sql        - فهارس وقيود RBAC
```

### 🗄️ Deprecated Migrations (في migration_deprecated/)
```
V002__seed_data.sql
V007__settlement_permissions.sql
V050__rbac_hardening.sql
V051__clean_permission_sync.sql
V052__settlement_permission_add.sql
V053__permission_cleanup.sql
```

---

## 🧪 اختبار الإصلاح

```bash
# 1. Build التطبيق
cd backend && mvn clean compile -q

# 2. تشغيل التطبيق
mvn spring-boot:run

# 3. تسجيل دخول SUPER_ADMIN
# التحقق من:
# - ظهور جميع عناصر القائمة
# - الوصول لجميع الصفحات
# - القدرة على إنشاء/تعديل الأدوار

# 4. تعيين صلاحيات لدور آخر من الواجهة
# - إنشاء دور جديد
# - تعيين صلاحيات له
# - إعادة تشغيل التطبيق
# - التحقق من بقاء الصلاحيات ✅
```

---

## 📝 Checklist لأي Migration جديد

- [ ] لا يحتوي على TRUNCATE لجداول RBAC
- [ ] لا يحتوي على DELETE FROM لجداول RBAC
- [ ] لا يحتوي على INSERT INTO لجداول RBAC
- [ ] يحتوي فقط على تعريف Schema (جداول، فهارس، قيود)
- [ ] أضفت أي صلاحيات جديدة في `AppPermission.java` enum

---

## 🆘 في حالة المشكلات

### الصلاحيات تختفي بعد إعادة التشغيل؟
1. ✅ تأكد من عدم وجود TRUNCATE/DELETE في migrations
2. ✅ تأكد أن الصلاحيات موجودة في `AppPermission.java`
3. ✅ راجع logs لـ `PermissionInitializer`

### SUPER_ADMIN لا يرى القوائم؟
1. ✅ تأكد من عمل `AuthService.login()` - يجب أن يعطي جميع الصلاحيات
2. ✅ راجع `CustomUserDetailsService.java`
3. ✅ راجع Frontend `PermissionGuard.jsx` - يجب أن يتجاوز SUPER_ADMIN

---

**آخر تحديث:** 2026-02-08
**المسؤول:** TBA WAAD Development Team
