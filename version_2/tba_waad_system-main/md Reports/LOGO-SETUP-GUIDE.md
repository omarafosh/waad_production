# 🖼️ دليل إضافة شعار الشركة إلى نظام PDF

> **الشعار:** `/workspaces/tba_waad_system/logo Waad TPA.png`  
> **الحجم:** 7 KB (101x48 pixels)  
> **التنسيق:** PNG

---

## 📋 الطرق المتاحة

يوجد **4 طرق** لإضافة الشعار إلى نظام PDF. اختر الأنسب لك:

| الطريقة | الصعوبة | المتطلبات | الأفضل لـ |
|---------|---------|-----------|-----------|
| **1️⃣ Python Script** | ⭐ سهل | Python 3 + psycopg2 | مطورين Python |
| **2️⃣ SQL Script** | ⭐⭐ متوسط | PostgreSQL CLI | مسؤولي قواعد البيانات |
| **3️⃣ Bash + API** | ⭐⭐⭐ متقدم | Server running + Token | Testing/Production |
| **4️⃣ Migration Update** | ⭐⭐⭐⭐ خبير | إعادة بناء Database | Initial setup فقط |

---

## 1️⃣ الطريقة الأولى: Python Script (موصى بها ⭐)

### المميزات
- ✅ سهلة وسريعة
- ✅ لا تحتاج server running
- ✅ تحقق تلقائي من الأخطاء
- ✅ رسائل توضيحية واضحة

### الخطوات

**1. تثبيت المتطلبات**

```bash
pip install psycopg2-binary
```

**2. تحديث إعدادات قاعدة البيانات**

افتح الملف: `backend/add_logo_to_database.py`

عدّل هذا الجزء حسب إعداداتك:

```python
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'tba_waad',  # اسم قاعدة البيانات
    'user': 'postgres',      # اسم المستخدم
    'password': 'postgres'   # كلمة المرور
}
```

**3. تشغيل السكريبت**

```bash
cd /workspaces/tba_waad_system/backend
python3 add_logo_to_database.py
```

**4. النتيجة المتوقعة**

```
============================================================
  🖼️  Waad TPA Logo Database Updater
============================================================

✅ Logo file found: /workspaces/tba_waad_system/logo Waad TPA.png
   Size: 7,168 bytes (7.0 KB)

📖 Reading logo data...
✅ Logo data loaded: 7,168 bytes

🔌 Connecting to PostgreSQL database...
   Host: localhost:5432
   Database: tba_waad
✅ Connected successfully!

✅ Table 'pdf_company_settings' exists

✅ Found settings record: ID=1, Company='شركة الوعد للتأمين الطبي'

💾 Updating logo in database...
✅ Logo updated successfully!

✅ Verification successful!
   Logo stored in database: 7,168 bytes

🎉 DONE! The logo will now appear in all PDF reports.

🧪 Test it by generating a sample PDF:
   curl -X GET http://localhost:8080/api/pdf/reports/claims/sample -o test.pdf

============================================================
```

---

## 2️⃣ الطريقة الثانية: SQL Script

### المميزات
- ✅ مباشرة وسريعة
- ✅ لا تحتاج dependencies إضافية
- ✅ مناسبة لمسؤولي قواعد البيانات

### الخطوات

**1. الاتصال بقاعدة البيانات**

```bash
psql -h localhost -U postgres -d tba_waad
```

**2. تشغيل الأوامر**

```sql
-- قراءة الشعار وتحويله لـ Base64 ثم حفظه في المتغير
\set logo_base64 `base64 -w 0 "/workspaces/tba_waad_system/logo Waad TPA.png"`

-- تحديث قاعدة البيانات
UPDATE pdf_company_settings 
SET logo_data = decode(:'logo_base64', 'base64'),
    updated_at = NOW()
WHERE id = 1;

-- التحقق من النتيجة
SELECT 
    id,
    company_name,
    CASE WHEN logo_data IS NOT NULL 
         THEN octet_length(logo_data) || ' bytes'
         ELSE 'No logo'
    END as logo_size,
    updated_at
FROM pdf_company_settings 
WHERE id = 1;
```

**3. النتيجة المتوقعة**

```
UPDATE 1

 id |        company_name        | logo_size  |        updated_at
----+----------------------------+------------+---------------------------
  1 | شركة الوعد للتأمين الطبي  | 7168 bytes | 2026-01-11 23:45:32.123
(1 row)

✅ Logo updated successfully!
```

**4. الخروج**

```sql
\q
```

---

## 3️⃣ الطريقة الثالثة: Bash Script + API

### المميزات
- ✅ يستخدم REST API الرسمي
- ✅ مناسبة للـ Production
- ✅ يتحقق من صحة الـ Server

### المتطلبات
- ✅ Server يجب أن يكون **مشتغل**
- ✅ JWT Token لمستخدم **SUPER_ADMIN**

### الخطوات

**1. تشغيل السيرفر**

```bash
cd /workspaces/tba_waad_system/backend
mvn spring-boot:run
```

انتظر حتى ترى:
```
Started TbaWaadApplication in X.XXX seconds
```

**2. الحصول على Token**

سجل دخول كمستخدم SUPER_ADMIN واحصل على JWT token:

```bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

احفظ الـ `token` من الـ response.

**3. تشغيل Script**

```bash
cd /workspaces/tba_waad_system/backend
chmod +x upload-logo.sh
./upload-logo.sh
```

**4. أدخل Token**

```
🔐 Authentication required...
   Please enter your admin JWT token:
[أدخل الـ token هنا]
```

**5. النتيجة المتوقعة**

```
========================================
  Waad TPA Logo Upload Script
========================================

✅ Logo file found: 7.0K

🔍 Checking if server is running...
✅ Server is running

🔐 Authentication required...
   Please enter your admin JWT token:

📤 Uploading logo to PDF settings...
   API: POST http://localhost:8080/api/pdf/settings/1/logo

✅ SUCCESS! Logo uploaded successfully!

📄 The logo will now appear in all PDF reports.

🧪 Test it by generating a sample report:
   curl -X GET http://localhost:8080/api/pdf/reports/claims/sample -o test.pdf

========================================
```

---

## 4️⃣ الطريقة الرابعة: تحديث Migration (للخبراء فقط)

### ⚠️ تحذير
- هذه الطريقة تتطلب إعادة بناء قاعدة البيانات
- **لا تستخدمها** إذا كان لديك بيانات في Production

### الخطوات

**1. تحويل الشعار لـ Base64**

```bash
cd /workspaces/tba_waad_system
base64 -w 0 "logo Waad TPA.png" > logo_base64.txt
```

**2. تحديث Migration File**

افتح: `backend/src/main/resources/db/migration/V1000__create_pdf_company_settings.sql`

استبدل الـ `INSERT` statement الموجود بهذا:

```sql
INSERT INTO pdf_company_settings (
    id, company_name, logo_data, address, phone, email, website,
    footer_text, footer_text_en,
    header_color, footer_color, page_size, page_margins, is_active,
    created_at, updated_at
) VALUES (
    1,
    'شركة الوعد للتأمين الطبي',
    decode('[ضع محتوى ملف logo_base64.txt هنا]', 'base64'),  -- الشعار
    'الرياض، المملكة العربية السعودية',
    '+966-11-XXXXXXX',
    'info@waadinsurance.com',
    'https://waadinsurance.com',
    'جميع الحقوق محفوظة © 2026 شركة الوعد للتأمين الطبي',
    'All Rights Reserved © 2026 Waad Insurance Company',
    '#1976d2',  -- لون الهيدر (أزرق)
    '#424242',  -- لون الفوتر (رمادي داكن)
    'A4',
    50,         -- الهوامش بالبكسل
    true,
    NOW(),
    NOW()
);
```

**3. إعادة بناء قاعدة البيانات**

```bash
cd backend
mvn flyway:clean   # احذف كل شيء
mvn flyway:migrate # أنشئ من جديد
```

---

## 🧪 اختبار النتيجة

بعد إضافة الشعار بأي طريقة، اختبره:

### 1. من المتصفح

شغل السيرفر:
```bash
mvn spring-boot:run
```

افتح في المتصفح:
```
http://localhost:8080/api/pdf/reports/claims/sample
```

### 2. من Terminal

```bash
curl -X GET "http://localhost:8080/api/pdf/reports/claims/sample" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o test-report.pdf

# افتح الملف
xdg-open test-report.pdf  # Linux
open test-report.pdf      # macOS
```

### 3. معاينة HTML أولاً

```bash
curl -X GET "http://localhost:8080/api/pdf/reports/claims/preview-html" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  > preview.html

# افتح في المتصفح
xdg-open preview.html
```

---

## ✅ التحقق من نجاح الإضافة

### من قاعدة البيانات

```sql
-- الاتصال بقاعدة البيانات
psql -h localhost -U postgres -d tba_waad

-- التحقق من وجود الشعار
SELECT 
    id,
    company_name,
    CASE WHEN logo_data IS NOT NULL 
         THEN 'Logo exists (' || octet_length(logo_data) || ' bytes)'
         ELSE 'No logo'
    END as logo_status,
    updated_at
FROM pdf_company_settings 
WHERE id = 1;
```

**النتيجة المتوقعة:**
```
 id |        company_name        |      logo_status       |        updated_at
----+----------------------------+------------------------+---------------------------
  1 | شركة الوعد للتأمين الطبي  | Logo exists (7168 bytes) | 2026-01-11 23:45:32
```

### من API

```bash
curl -X GET "http://localhost:8080/api/pdf/settings/active" | jq '.logoData' | head -c 50
```

يجب أن ترى Base64 string:
```
"iVBORw0KGgoAAAANSUhEUgAAAGUAAAAwCAYAAAAIP7SL..."
```

---

## 🎨 تخصيص ظهور الشعار

### تغيير حجم الشعار في الهيدر

عدّل ملف: `backend/src/main/resources/templates/pdf/claims-report.html`

```html
<!-- ابحث عن هذا السطر -->
<img th:if="${company.hasLogo()}" 
     th:src="${company.logoBase64DataUrl}" 
     style="width: 80px; height: 80px; float: left;" 
     alt="Logo"/>

<!-- غيّر width و height حسب الحاجة -->
<img th:if="${company.hasLogo()}" 
     th:src="${company.logoBase64DataUrl}" 
     style="width: 120px; height: auto; float: left; margin-left: 20px;" 
     alt="Logo"/>
```

### تغيير موضع الشعار

```html
<!-- للوسط -->
<div style="text-align: center;">
    <img th:if="${company.hasLogo()}" 
         th:src="${company.logoBase64DataUrl}" 
         style="width: 100px; height: auto;" 
         alt="Logo"/>
</div>

<!-- لليمين -->
<img th:if="${company.hasLogo()}" 
     th:src="${company.logoBase64DataUrl}" 
     style="width: 80px; height: 80px; float: right; margin-right: 20px;" 
     alt="Logo"/>
```

---

## 🔧 حل المشاكل

### المشكلة: الشعار لا يظهر في PDF

**الحلول:**

1. **تحقق من وجود الشعار في قاعدة البيانات**
   ```sql
   SELECT 
       CASE WHEN logo_data IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END 
   FROM pdf_company_settings WHERE id = 1;
   ```

2. **تحقق من القالب**
   ```html
   <!-- يجب أن يكون هكذا -->
   <img th:if="${company.hasLogo()}" 
        th:src="${company.logoBase64DataUrl}" 
        alt="Logo"/>
   ```

3. **تحقق من logs**
   ```bash
   tail -f /tmp/spring-boot.log | grep -i logo
   ```

---

### المشكلة: الشعار مشوه أو غير واضح

**الحلول:**

1. **استخدم PNG بجودة عالية**
   - الحالي: 101x48 pixels
   - موصى به: 300x150 pixels على الأقل

2. **استخدم `height: auto`**
   ```html
   style="width: 100px; height: auto;"
   ```

---

### المشكلة: "File too large" عند رفع الشعار

**السبب:** الحد الأقصى 5MB

**الحلول:**

1. **ضغط الصورة**
   ```bash
   convert "logo Waad TPA.png" -quality 85 logo-compressed.png
   ```

2. **تغيير الحد الأقصى في الكود**
   
   في `PdfCompanySettingsService.java`:
   ```java
   if (file.getSize() > 10 * 1024 * 1024) {  // 10MB بدلاً من 5MB
   ```

---

## 📚 المراجع

- [Base64 Encoding في PostgreSQL](https://www.postgresql.org/docs/current/functions-binarystring.html)
- [Thymeleaf Image Handling](https://www.thymeleaf.org/doc/tutorials/3.0/usingthymeleaf.html#images)
- [Flying Saucer CSS Support](https://github.com/flyingsaucerproject/flyingsaucer/blob/master/www/guide/users-guide-R8.html)

---

## ✨ الملخص

**أسهل طريقة:** استخدم Python Script

```bash
cd /workspaces/tba_waad_system/backend
python3 add_logo_to_database.py
```

**للإنتاج:** استخدم API + Bash Script

```bash
./upload-logo.sh
```

**بعد ذلك:** اختبر النتيجة

```bash
curl -X GET "http://localhost:8080/api/pdf/reports/claims/sample" -o test.pdf
xdg-open test.pdf
```

✅ **الشعار سيظهر الآن في كل صفحة من كل تقرير PDF!**
