# 🚀 Flyway Migration Policy - TBA WAAD System

## 📋 القاعدة الذهبية

**لا تُعدّل أبداً ملف Migration بعد تطبيقه على أي بيئة (Dev, Staging, Production)**

---

## ✅ الطريقة الصحيحة

### عند الحاجة لتعديل Schema:

1. **أنشئ ملف Migration جديد** مع رقم نسخة أعلى:
   ```
   V010__describe_your_changes.sql
   V011__fix_indexes.sql
   ```

2. **اكتب SQL الجديد** الذي يُطبّق التعديلات:
   ```sql
   -- V010__add_missing_column.sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
   CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
   ```

3. **اختبر محلياً** قبل الدفع:
   ```bash
   # تشغيل profile dev
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   
   # أو فحص Flyway فقط
   mvn flyway:info
   mvn flyway:migrate
   ```

---

## ❌ ممنوع تماماً

- ❌ **تعديل ملف V00X بعد تطبيقه** → يسبب checksum mismatch
- ❌ **استخدام `flyway:clean` في الإنتاج** → يحذف كل البيانات
- ❌ **تعطيل `validate-on-migrate` في الإنتاج** → يخفي أخطاء خطيرة
- ❌ **DDL-auto: update/create** في الإنتاج → Hibernate يعدل schema تلقائياً

---

## 🛠️ حل مشكلة Checksum Mismatch

### إذا حصل خطأ:
```
Migration checksum mismatch for migration version 9
Applied to database: 123456789
Resolved locally: 987654321
```

### الحل الآمن:

#### 1️⃣ **أخذ Backup أولاً** (إلزامي!)
```bash
# محلياً
pg_dump -h localhost -p 5432 -U postgres -Fc \
  -f backup_before_repair_$(date +%Y%m%d_%H%M%S).dump tba_waad_system

# في الإنتاج (تواصل مع DBA)
```

#### 2️⃣ **فحص الفرق**
```bash
# اعرض حالة Flyway
mvn flyway:info

# قارن ملف SQL الحالي مع ما في Git history
git log -p src/main/resources/db/migration/V009__*.sql
```

#### 3️⃣ **اختر الحل المناسب:**

**أ) إذا كان التعديل خطأ (الملف تغير بالغلط):**
```bash
# استرجع النسخة الصحيحة من Git
git checkout HEAD~1 src/main/resources/db/migration/V009__*.sql
mvn spring-boot:run
```

**ب) إذا كان التعديل ضروري ولم يُطبّق بعد في الإنتاج:**
```bash
# عمل repair (بعد Backup!)
mvn flyway:repair

# ثم migrate
mvn flyway:migrate
```

**ج) إذا كان التعديل ضروري وطُبّق في الإنتاج:**
```bash
# لا تعمل repair!
# بدلاً من ذلك:
# 1. استرجع V009 للنسخة القديمة
git checkout <commit-before-change> V009__*.sql

# 2. أنشئ V010 جديد بالتعديلات المطلوبة
vi src/main/resources/db/migration/V010__fix_v009_changes.sql

# 3. Commit & Deploy
git add .
git commit -m "fix: Add V010 to correct V009 changes"
```

---

## 🌍 الإعدادات حسب البيئة

### محلياً (Development):
```bash
# استخدم profile dev
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# مسموح:
- flyway:repair (بعد backup)
- flyway:clean (فقط على DB تطوير)
- validate-on-migrate: false
```

### في الإنتاج (Production):
```bash
# استخدم profile prod
java -jar app.jar -Dspring.profiles.active=prod

# إلزامي:
- validate-on-migrate: true
- clean-disabled: true
- Backup قبل أي تغيير
```

---

## 📝 Checklist قبل Deployment

- [ ] ✅ فحص `mvn flyway:info` محلياً
- [ ] ✅ اختبار Migration على DB نسخة من الإنتاج
- [ ] ✅ مراجعة SQL للأخطاء الإملائية
- [ ] ✅ تأكد من وجود Rollback plan
- [ ] ✅ أخذ Backup كامل قبل التطبيق
- [ ] ✅ اختبار Application بعد Migration

---

## 🔄 Rollback Strategy

### إذا فشل Migration:
```bash
# 1. Restore من Backup
pg_restore -h localhost -p 5432 -U postgres -d tba_waad_system \
  backup_before_repair_*.dump

# 2. احذف ملف Migration الفاشل أو صححه
rm src/main/resources/db/migration/V010__*.sql

# 3. أعد المحاولة
mvn flyway:migrate
```

---

## 📚 أوامر Flyway المفيدة

```bash
# عرض حالة Migrations
mvn flyway:info

# تطبيق Migrations الجديدة
mvn flyway:migrate

# فحص بدون تطبيق
mvn flyway:validate

# إصلاح Checksums (بعد backup!)
mvn flyway:repair

# ⚠️ حذف كل شيء (فقط DEV!)
mvn flyway:clean
```

---

## 🎯 أمثلة عملية

### مثال 1: إضافة عمود جديد
```sql
-- V010__add_user_phone.sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX idx_users_phone ON users(phone);
```

### مثال 2: تصحيح خطأ في V009
```sql
-- V011__fix_v009_index_name.sql
DROP INDEX IF EXISTS idx_old_name;
CREATE INDEX idx_correct_name ON table_name(column);
```

### مثال 3: بيانات أولية (Seed Data)
```sql
-- V012__seed_default_roles.sql
INSERT INTO roles (name, name_en, code) 
VALUES 
  ('مدير النظام', 'System Admin', 'SUPER_ADMIN'),
  ('مسؤول الشركة', 'Company Admin', 'COMPANY_ADMIN')
ON CONFLICT (code) DO NOTHING;
```

---

## 🚨 حالات طوارئ

### مشكلة: "Bean 'passwordResetTokenRepository' already defined"
**الحل:** راجع COMPILATION-FIXES-COMPLETE.md

### مشكلة: "Table already exists"
**الحل:** استخدم `IF NOT EXISTS` في جميع DDL statements

### مشكلة: "Checksum mismatch"
**الحل:** راجع قسم "حل مشكلة Checksum Mismatch" أعلاه

---

## 📞 للدعم

- **Local Dev Issues:** استخدم profile dev + flyway:repair
- **Production Issues:** اتصل بفريق DevOps + أخذ Backup أولاً
- **Migration Failed:** راجع logs في `target/` أو console output

---

**آخر تحديث:** 2026-01-01  
**الإصدار:** 1.0
