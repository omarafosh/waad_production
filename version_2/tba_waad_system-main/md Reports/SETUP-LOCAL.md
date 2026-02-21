# 🚀 دليل التشغيل المحلي - خطوة بخطوة

## المتطلبات الأساسية

✅ **PostgreSQL 14+** (يعمل على port 5432)  
✅ **Java 21**  
✅ **Maven 3.8+**  
✅ **Git**

---

## الخطوات التفصيلية

### 📋 الخطوة 1: التأكد من PostgreSQL

```bash
# تحقق أن PostgreSQL يعمل
sudo systemctl status postgresql

# أو إذا كنت تستخدم Docker
docker ps | grep postgres
```

**إذا لم يكن مُثبَّت:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# أو استخدم Docker
docker run -d \
  --name tba_postgres \
  -e POSTGRES_PASSWORD=12345 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=tba_waad_system \
  -p 5432:5432 \
  postgres:14
```

---

### 📋 الخطوة 2: إنشاء قاعدة البيانات

```bash
# الدخول إلى PostgreSQL
sudo -u postgres psql

# أو إذا كنت تستخدم Docker
docker exec -it tba_postgres psql -U postgres
```

**داخل PostgreSQL، نفذ:**
```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE tba_waad_system;

-- الاتصال بالقاعدة
\c tba_waad_system

-- التحقق
\l

-- الخروج
\q
```

---

### 📋 الخطوة 3: تنفيذ Flyway Migrations

#### **خيار 1: تلقائياً عند تشغيل السيرفر** (موصى به)

```bash
cd /workspaces/tba_waad_system/backend

# التشغيل مع dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Flyway سينفذ تلقائياً جميع السكربتات (V001 - V012)** ✅

---

#### **خيار 2: يدوياً قبل تشغيل السيرفر**

```bash
cd /workspaces/tba_waad_system/backend

# 1. فحص حالة Migrations
mvn flyway:info

# 2. تنفيذ Migrations
mvn flyway:migrate

# 3. التحقق من النتيجة
mvn flyway:info
```

**النتيجة المتوقعة:**
```
+----------+---------+-----------------------------+----------+
| Category | Version | Description                 | State    |
+----------+---------+-----------------------------+----------+
| Versioned| 1       | core infrastructure         | Success  |
| Versioned| 2       | business entities           | Success  |
| Versioned| 3       | medical and pricing         | Success  |
| Versioned| 4       | claims and approvals        | Success  |
| Versioned| 5       | supporting tables           | Success  |
| Versioned| 6       | indexes and constraints     | Success  |
| Versioned| 7       | schema alignment            | Success  |
| Versioned| 8       | fix super admin             | Success  |
| Versioned| 9       | user security               | Success  |
| Versioned| 10      | claim attachments           | Success  |
| Versioned| 11      | preauth attachments         | Success  |
| Versioned| 12      | visit attachments           | Success  |
+----------+---------+-----------------------------+----------+
```

---

### 📋 الخطوة 4: التحقق من قاعدة البيانات

```bash
# الدخول للقاعدة
psql -h localhost -p 5432 -U postgres -d tba_waad_system

# أو Docker
docker exec -it tba_postgres psql -U postgres -d tba_waad_system
```

**التحقق من الجداول:**
```sql
-- عرض جميع الجداول
\dt

-- التحقق من جدول flyway_schema_history
SELECT version, description, type, installed_on, success 
FROM flyway_schema_history 
ORDER BY installed_rank;

-- عدد الجداول
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- الخروج
\q
```

**المتوقع:** حوالي 50+ جدول ✅

---

### 📋 الخطوة 5: تشغيل Backend

```bash
cd /workspaces/tba_waad_system/backend

# التشغيل مع dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**انتظر حتى تظهر:**
```
Started TbaWaadApplication in X.XXX seconds
Tomcat started on port 8080
```

---

### 📋 الخطوة 6: اختبار API

```bash
# في terminal آخر

# فحص الصحة
curl http://localhost:8080/actuator/health

# Swagger UI (افتح في المتصفح)
open http://localhost:8080/swagger-ui.html
# أو
xdg-open http://localhost:8080/swagger-ui.html
```

---

## 🔧 حل المشاكل الشائعة

### ❌ مشكلة: "Connection refused to localhost:5432"

**الحل:**
```bash
# تحقق أن PostgreSQL يعمل
sudo systemctl start postgresql

# أو Docker
docker start tba_postgres

# تحقق من البورت
netstat -tlnp | grep 5432
# أو
lsof -i :5432
```

---

### ❌ مشكلة: "Database 'tba_waad_system' does not exist"

**الحل:**
```bash
# أنشئ القاعدة
psql -U postgres -c "CREATE DATABASE tba_waad_system;"

# أو Docker
docker exec -it tba_postgres psql -U postgres -c "CREATE DATABASE tba_waad_system;"
```

---

### ❌ مشكلة: "Flyway checksum mismatch"

**الحل:**
```bash
cd /workspaces/tba_waad_system/backend

# استخدم السكربت الآمن
./flyway-repair.sh

# أو يدوياً
mvn flyway:repair
```

---

### ❌ مشكلة: "Port 8080 already in use"

**الحل:**
```bash
# إيقاف العملية التي تستخدم 8080
lsof -ti:8080 | xargs kill -9

# أو غيّر البورت في application-dev.yml
server:
  port: 8081
```

---

## 📝 أوامر مفيدة

```bash
# إعادة تشغيل PostgreSQL
sudo systemctl restart postgresql

# عرض logs السيرفر
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev | tee server.log

# تنظيف وإعادة التجميع
mvn clean install -DskipTests

# إعادة ضبط قاعدة البيانات (⚠️ يحذف كل البيانات!)
mvn flyway:clean
mvn flyway:migrate

# إيقاف السيرفر
Ctrl + C

# أو قتل جميع عمليات Spring Boot
pkill -f spring-boot:run
```

---

## 🎯 الخلاصة

### ترتيب التنفيذ المثالي:

1. ✅ **تشغيل PostgreSQL** → `sudo systemctl start postgresql`
2. ✅ **إنشاء قاعدة البيانات** → `psql -U postgres -c "CREATE DATABASE tba_waad_system;"`
3. ✅ **تنفيذ Migrations** → يتم تلقائياً عند تشغيل السيرفر
4. ✅ **تشغيل Backend** → `mvn spring-boot:run -Dspring-boot.run.profiles=dev`
5. ✅ **اختبار API** → `curl http://localhost:8080/swagger-ui.html`

---

## 📚 ملفات مهمة للمراجعة

- **[FLYWAY-POLICY.md](../FLYWAY-POLICY.md)** - سياسة إدارة Migrations
- **[application-dev.yml](src/main/resources/application-dev.yml)** - إعدادات التطوير
- **[flyway-repair.sh](flyway-repair.sh)** - سكربت إصلاح Flyway

---

**آخر تحديث:** 2026-01-01  
**الحالة:** جاهز للتشغيل ✅
