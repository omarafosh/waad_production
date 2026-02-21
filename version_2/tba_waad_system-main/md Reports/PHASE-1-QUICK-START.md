# 🚀 دليل البدء السريع - المرحلة الأولى
## Card Number Eligibility Check - Quick Start Guide

---

## ⚡ تشغيل سريع (Quick Start)

### 1️⃣ Database Migration

```bash
cd /workspaces/tba_waad_system/backend
./mvnw flyway:migrate
```

**المتوقع**: ✅ Migration V113 تم تنفيذها بنجاح

---

### 2️⃣ اختبار Backend API

#### باستخدام cURL
```bash
curl -X GET "http://localhost:8080/api/members/check-eligibility?cardNumber=12345" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### باستخدام Swagger UI
```
http://localhost:8080/swagger-ui.html
→ Eligibility Check Controller
→ GET /api/members/check-eligibility
→ Try it out
→ cardNumber: 12345
→ Execute
```

---

### 3️⃣ إضافة صفحة Frontend

#### A. إضافة Route
**الملف**: `frontend/src/routes/MainRoutes.js`

```javascript
// Import Component
import EligibilityCheck from 'pages/members/EligibilityCheck';

// Add Route (داخل children)
{
  path: 'members/eligibility-check',
  element: <EligibilityCheck />
}
```

#### B. إضافة Menu Item (اختياري)
**الملف**: `frontend/src/menu-items/index.js` أو `members.js`

```javascript
{
  id: 'eligibility-check',
  title: 'التحقق من الأهلية',
  type: 'item',
  url: '/members/eligibility-check',
  icon: icons.SearchOutlined,
  breadcrumbs: false
}
```

---

### 4️⃣ اختبار Frontend

```bash
cd /workspaces/tba_waad_system/frontend
npm start
```

**افتح المتصفح**:
```
http://localhost:3000/members/eligibility-check
```

**خطوات الاختبار**:
1. ✅ أدخل رقم بطاقة موجود
2. ✅ اضغط Enter أو زر "بحث"
3. ✅ شاهد النتيجة فوراً

---

## 📋 API Examples

### ✅ Success Response (200)
```json
{
  "status": "success",
  "message": "Member found",
  "data": {
    "fullName": "أحمد محمد علي",
    "status": "ACTIVE",
    "copayAmount": 20.00,
    "cardNumber": "12345",
    "eligible": true,
    "message": ""
  },
  "timestamp": "2026-01-09T12:00:00"
}
```

### ❌ Not Found (404)
```json
{
  "status": "error",
  "message": "No member found with card number: 99999",
  "timestamp": "2026-01-09T12:00:00"
}
```

### ❌ Bad Request (400)
```json
{
  "status": "error",
  "message": "Card number is required",
  "timestamp": "2026-01-09T12:00:00"
}
```

---

## 🔍 التحقق من التثبيت

### Backend Checklist
- [ ] ✅ V113 Migration تم تنفيذها
- [ ] ✅ EligibilityCheckService موجود
- [ ] ✅ EligibilityCheckController موجود
- [ ] ✅ GET /api/members/check-eligibility يعمل

### Frontend Checklist
- [ ] ✅ EligibilityCheck.jsx موجود
- [ ] ✅ checkEligibilityByCardNumber في members.service.js
- [ ] ✅ Route مُسجّل
- [ ] ✅ الصفحة تفتح بدون أخطاء

---

## 🐛 استكشاف الأخطاء

### Backend

#### Error: "No member found"
**السبب**: رقم البطاقة غير موجود  
**الحل**: تحقق من Database أو استخدم رقم موجود

```sql
-- التحقق من البيانات
SELECT id, full_name, card_number, status 
FROM members 
WHERE card_number IS NOT NULL 
LIMIT 10;
```

#### Error: "Migration failed"
**السبب**: Index موجود مسبقاً  
**الحل**: طبيعي، استخدم `IF NOT EXISTS` في Migration

### Frontend

#### Error: "Cannot find module"
**السبب**: Component غير مُسجّل  
**الحل**: راجع خطوة 3 (إضافة Route)

#### Error: "404 Network Error"
**السبب**: Backend غير شغال  
**الحل**: 
```bash
cd backend
./mvnw spring-boot:run
```

---

## 📊 Performance Testing

### Database Query Performance
```sql
-- اختبار أداء Index
EXPLAIN ANALYZE
SELECT * FROM members 
WHERE card_number = '12345';

-- المتوقع: Index Scan على idx_members_card_number
```

### Expected Results
- **Planning Time**: < 1ms
- **Execution Time**: < 10ms (small dataset), < 50ms (large dataset)
- **Scan Type**: Index Scan (NOT Seq Scan)

---

## 🎯 Use Cases

### Case 1: Reception Desk
**السيناريو**: موظف الاستقبال يستقبل منتفع  
**الخطوات**:
1. المنتفع يعطي بطاقته
2. الموظف يدخل رقم البطاقة
3. النظام يعرض الأهلية فوراً
4. الموظف يُكمل الإجراءات

### Case 2: Scanner Integration
**السيناريو**: ماسح باركود متصل  
**الخطوات**:
1. الموظف يمسح البطاقة
2. النظام يستقبل الرقم تلقائياً (Enter detection)
3. النتيجة تظهر فوراً
4. لا حاجة لضغط أي زر

### Case 3: Phone Support
**السيناريو**: اتصال هاتفي من منتفع  
**الخطوات**:
1. المنتفع يُملي رقم البطاقة
2. الموظف يُدخله في النظام
3. يتحقق من الأهلية
4. يُجيب على استفسار المنتفع

---

## 📞 Support

**للمشاكل التقنية**:
1. راجع Logs: `backend/logs/application.log`
2. تحقق من Swagger: `/swagger-ui.html`
3. راجع الملف الكامل: `PHASE-1-CARD-NUMBER-SEARCH-COMPLETE.md`

---

## ✅ Acceptance Test

```bash
# Test 1: بحث ناجح
curl "http://localhost:8080/api/members/check-eligibility?cardNumber=VALID_CARD" | jq
# Expected: 200 + data

# Test 2: بحث فاشل
curl "http://localhost:8080/api/members/check-eligibility?cardNumber=INVALID" | jq
# Expected: 404 + error message

# Test 3: مدخل فارغ
curl "http://localhost:8080/api/members/check-eligibility?cardNumber=" | jq
# Expected: 400 + validation error
```

---

**🎉 جاهز للاستخدام! 🎉**

للانتقال إلى المرحلة الثانية، راجع: `PHASE-2-FUZZY-NAME-SEARCH.md` (قريباً)
