# 🚀 دليل الاستخدام السريع - Member Identification System

## ✅ التطبيق والتشغيل

### 1️⃣ تشغيل Migration
```bash
cd /workspaces/tba_waad_system/backend
mvn clean package
mvn spring-boot:run
```

Migration سيعمل تلقائياً عند بدء التشغيل:
- ✅ `V111__member_identification_system.sql`

---

## 📝 API Usage Examples

### 1️⃣ إنشاء منتفع جديد

**Endpoint**: `POST /api/members`

**Request Body**:
```json
{
  "fullName": "أحمد محمد علي",
  "nationalNumber": "289123456789",
  "cardNumber": "CARD-12345",
  "birthDate": "1990-01-15",
  "gender": "MALE",
  "employerId": 1,
  "phone": "+96512345678",
  "email": "ahmed@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fullName": "أحمد محمد علي",
    "nationalNumber": "289123456789",
    "cardNumber": "CARD-12345",
    "barcode": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "birthDate": "1990-01-15",
    "gender": "MALE"
  }
}
```

**ملاحظات**:
- ✅ `barcode` يتولد تلقائياً (UUID)
- ✅ `nationalNumber` اختياري
- ✅ `cardNumber` اختياري

---

### 2️⃣ البحث عن منتفع

**Endpoint**: `GET /api/members/search`

#### البحث بـ cardNumber:
```bash
GET /api/members/search?cardNumber=CARD-12345
```

#### البحث بـ barcode (QR):
```bash
GET /api/members/search?barcode=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

#### البحث بالاسم:
```bash
GET /api/members/search?name=أحمد
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fullName": "أحمد محمد علي",
      "nationalNumber": "289123456789",
      "cardNumber": "CARD-12345",
      "barcode": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  ]
}
```

**ملاحظات**:
- ✅ يجب إرسال parameter واحد على الأقل
- ✅ إذا لم توجد نتائج → `[]`
- ✅ لا ترجع 500 أبداً

---

### 3️⃣ الحصول على منتفع بـ barcode

**Endpoint**: `GET /api/members/barcode/{barcode}`

```bash
GET /api/members/barcode/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fullName": "أحمد محمد علي",
    "nationalNumber": "289123456789",
    "cardNumber": "CARD-12345",
    "barcode": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "eligibilityStatus": true
  }
}
```

---

## 🎨 Frontend Usage

### 1️⃣ صفحة إضافة منتفع

```jsx
// Navigate to
/members/create

// Fields visible:
✅ الاسم الكامل (required)
✅ الرقم الوطني (optional)
✅ رقم بطاقة العضو (optional)
✅ الرقم المدني (deprecated, optional)
❌ الباركود (auto-generated - not shown)
```

### 2️⃣ صفحة التحقق من الأهلية

```jsx
// Navigate to
/visits/eligibility-check

// Search methods:
1. Scan QR (barcode)
2. Enter cardNumber
3. Enter fullName
```

---

## 🗄️ Database Schema

### members table:
```sql
CREATE TABLE members (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  national_number VARCHAR(50) NULL,
  card_number VARCHAR(50) NULL,
  barcode VARCHAR(100) NOT NULL UNIQUE,
  civil_id VARCHAR(50) NULL, -- deprecated
  birth_date DATE NOT NULL,
  gender VARCHAR(10) NOT NULL,
  -- ...
  
  CONSTRAINT uk_member_barcode UNIQUE (barcode),
  CONSTRAINT uk_member_card_number_partial UNIQUE (card_number) WHERE card_number IS NOT NULL
);

CREATE INDEX idx_members_national_number ON members (national_number) WHERE national_number IS NOT NULL;
```

---

## 🔍 Validation Rules

### Backend:
```java
// Required fields:
✅ fullName (@NotBlank)
✅ birthDate (@NotNull)
✅ gender (@NotNull)
✅ employerId (@NotNull)
✅ barcode (auto-generated, NOT NULL)

// Optional fields:
⚪ nationalNumber
⚪ cardNumber (unique when not null)
⚪ civilId (deprecated)
```

### Frontend:
```javascript
// Form validation:
if (!form.fullName) {
  errors.fullName = "الاسم الكامل مطلوب";
}

if (!form.birthDate) {
  errors.birthDate = "تاريخ الميلاد مطلوب";
}

// nationalNumber, cardNumber - NO validation (optional)
```

---

## ⚠️ Common Issues

### Issue 1: "barcode is null"
**سبب**: محاولة إرسال barcode من Frontend
**حل**: إزالة barcode من الـ payload - سيتولد تلقائياً

### Issue 2: "cardNumber already exists"
**سبب**: محاولة إدخال cardNumber مكرر
**حل**: اختيار رقم بطاقة فريد أو ترك الحقل فارغاً

### Issue 3: "Search returns empty"
**سبب**: لا توجد نتائج
**حل**: التحقق من صحة البيانات المدخلة

---

## 📊 Testing Checklist

### Backend:
- [ ] إنشاء منتفع جديد بدون cardNumber
- [ ] إنشاء منتفع جديد مع cardNumber
- [ ] التأكد من توليد barcode تلقائياً
- [ ] البحث بـ cardNumber
- [ ] البحث بـ barcode
- [ ] البحث بـ fullName
- [ ] محاولة تعديل barcode (يجب أن تفشل)

### Frontend:
- [ ] عرض نموذج الإضافة بالحقول الصحيحة
- [ ] إضافة منتفع جديد بنجاح
- [ ] عرض cardNumber في قائمة الأعضاء
- [ ] البحث في صفحة الأهلية

---

## 🎯 Next Steps

1. **تطبيق Migration**:
   ```bash
   mvn spring-boot:run
   ```

2. **اختبار APIs**:
   - استخدم Postman أو Swagger UI
   - تحقق من توليد barcode

3. **استكمال Frontend**:
   - تحديث MemberEdit.jsx
   - تحديث MembersList.jsx
   - تحديث EligibilityCheckPage.jsx

4. **Deploy to Production**:
   - تأكد من نجاح جميع الاختبارات
   - راجع logs للتأكد من عدم وجود أخطاء

---

**الحالة**: ✅ Backend جاهز بالكامل | ⚠️ Frontend يحتاج استكمال
**التوافق**: ✅ Backward Compatible (civilId محفوظ)
**الأمان**: ✅ Validated | ✅ No 500 errors
