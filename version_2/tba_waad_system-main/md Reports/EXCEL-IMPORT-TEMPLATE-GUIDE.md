# دليل قالب استيراد Excel لقوائم أسعار مقدمي الخدمة
# Excel Import Template Guide for Provider Contract Pricing

## 📋 نظرة عامة | Overview

هذا الدليل يشرح كيفية إعداد ملف Excel لاستيراد قوائم أسعار مقدمي الخدمة.

---

## 📊 بنية الملف | File Structure

### Required Columns (الأعمدة المطلوبة)

#### 1. **قالب المنتج** (Service Name) - **REQUIRED**
- **الوصف:** اسم الخدمة الطبية بالعربية
- **مثال:** `فحص شامل`، `تحليل دم كامل`، `أشعة سينية للصدر`
- **ملاحظات:** 
  - يجب أن يطابق **بالضبط** الاسم الموجود في جدول الخدمات الطبية
  - حساس للمسافات والأحرف العربية
  - Alternative column names: `service name`, `product template`

#### 2. **السعر** (Contract Price) - **REQUIRED**  
- **الوصف:** سعر الخدمة في العقد (المتفاوض عليه)
- **مثال:** `150.00`, `250.50`, `1000`
- **ملاحظات:**
  - يجب أن يكون >= 0
  - رقم عشري مسموح به
  - Alternative column names: `price`, `سعر`

---

### Optional Columns (الأعمدة الاختيارية)

#### 3. **كود منتج المورد** (Service Code) - OPTIONAL
- **الوصف:** كود الخدمة الطبية
- **مثال:** `SRV-CARDIO-001`, `SRV-LAB-CBC`
- **ملاحظات:**
  - **إذا كان موجوداً، له أولوية في المطابقة**
  - أسرع وأدق من المطابقة بالاسم
  - Alternative column names: `supplier product code`, `service code`, `code`

#### 4. **العملة** (Currency) - OPTIONAL
- **الوصف:** عملة السعر
- **مثال:** `LYD`, `SAR`, `USD`
- **القيمة الافتراضية:** `LYD`
- **ملاحظات:**
  - رموز العملات القياسية (3 أحرف)
  - Alternative column names: `currency`

#### 5. **تسلسل** (Sequence) - OPTIONAL
- **الوصف:** رقم الصف
- **مثال:** `1`, `2`, `3`
- **ملاحظات:** يُستخدم فقط للترتيب، يُتجاهل في الاستيراد
- **Alternative column names:** `sequence`

#### 6. **الكمية** (Quantity) - OPTIONAL  
- **الوصف:** الكمية (مهملة - تُستخدم في Odoo فقط)
- **مثال:** `0`, `1`
- **ملاحظات:** **يُتجاهل تماماً** - موجود فقط للتوافق مع تصدير Odoo
- **Alternative column names:** `quantity`

#### 7. **قائمة الأسعار** (Price List Name) - OPTIONAL
- **الوصف:** اسم قائمة الأسعار (مهملة - العقد يُحدد من الـ URL)
- **مثال:** `قائمة أسعار مستشفى السلام`
- **ملاحظات:** **يُتجاهل** - رقم العقد يأتي من الـ URL
- **Alternative column names:** `price list`, `pricelist`

---

## 📝 مثال على ملف Excel صحيح | Sample Excel File

### Scenario 1: مع كود الخدمة (Recommended ✅)

| تسلسل | قائمة الأسعار | قالب المنتج | كود منتج المورد | العملة | الكمية | السعر |
|------|---------------|-------------|----------------|--------|--------|-------|
| 1 | مستشفى السلام | فحص قلب شامل | SRV-CARDIO-001 | LYD | 0 | 350.00 |
| 2 | مستشفى السلام | تحليل دم كامل | SRV-LAB-CBC | LYD | 0 | 75.50 |
| 3 | مستشفى السلام | أشعة سينية للصدر | SRV-IMG-XRAY | LYD | 0 | 120.00 |

### Scenario 2: بدون كود الخدمة (Acceptable ⚠️)

| قالب المنتج | السعر |
|-------------|-------|
| فحص قلب شامل | 350.00 |
| تحليل دم كامل | 75.50 |
| أشعة سينية للصدر | 120.00 |

**⚠️ تحذير:** المطابقة بالاسم **حساسة للمسافات والأحرف**. استخدم الكود إذا ممكن.

---

## ✅ قواعد التحقق | Validation Rules

### 1. Contract State (حالة العقد)
- ✅ **DRAFT** → يُسمح بالاستيراد
- ✅ **ACTIVE** → يُسمح بالاستيراد  
- ❌ **EXPIRED** → يُرفض الاستيراد
- ❌ **TERMINATED** → يُرفض الاستيراد

### 2. Service Matching (مطابقة الخدمة)

**الأولوية:**
1. **Priority 1:** مطابقة بـ `كود منتج المورد` (دقيقة)
2. **Priority 2:** مطابقة بـ `قالب المنتج` (بالضبط)
3. **Fallback:** خطأ - الخدمة غير موجودة

**شروط الخدمة:**
- يجب أن تكون موجودة في جدول `medical_services`
- يجب أن تكون `active = true`
- الاسم يجب أن يطابق **بالضبط** (مع المسافات والأحرف)

### 3. Price Validation (التحقق من السعر)
- ✅ السعر >= 0
- ❌ السعر سالب → خطأ
- ❌ السعر فارغ → خطأ
- ✅ أعداد عشرية مسموح بها (2 منزلة عشرية)

---

## 🔄 سلوك Upsert

### INSERT (إضافة جديدة)
إذا لم تكن الخدمة موجودة في العقد:
```sql
INSERT INTO provider_contract_pricing_items 
  (contract_id, medical_service_id, base_price, contract_price, currency, ...)
VALUES
  (1, 123, 400.00, 350.00, 'LYD', ...)
```

### UPDATE (تحديث موجودة)
إذا كانت الخدمة موجودة **بالضبط** (contract_id + service_id):
```sql
UPDATE provider_contract_pricing_items
SET 
  contract_price = 350.00,
  base_price = 400.00,
  currency = 'LYD',
  updated_at = NOW(),
  updated_by = 'current_user'
WHERE contract_id = 1 AND medical_service_id = 123
```

**ملاحظة:** `discountPercent` يُحسب تلقائياً:
```
discountPercent = ((basePrice - contractPrice) / basePrice) * 100
```

---

## 🚫 أخطاء شائعة | Common Errors

### ❌ Error 1: "الخدمة الطبية غير موجودة"
**السبب:** الاسم في Excel لا يطابق الاسم في قاعدة البيانات

**الحل:**
1. افتح صفحة الخدمات الطبية
2. انسخ الاسم **بالضبط** (Ctrl+C)
3. الصق في Excel (Ctrl+V)
4. أو استخدم الكود بدلاً من الاسم

**مثال للخطأ:**
```
Excel:  "فحص   قلب شامل"  (مسافتان)
DB:     "فحص قلب شامل"     (مسافة واحدة)
Result: ❌ لا يطابق
```

### ❌ Error 2: "السعر مطلوب"
**السبب:** خلية السعر فارغة

**الحل:** تأكد من وجود قيمة في كل صف

### ❌ Error 3: "الخدمة الطبية غير نشطة"
**السبب:** الخدمة في قاعدة البيانات `active = false`

**الحل:** 
1. افتح صفحة الخدمة الطبية
2. فعّل الخدمة (active = true)
3. أعد المحاولة

### ❌ Error 4: كل الصفوف تفشل/تُتخطى
**الأسباب المحتملة:**
1. **أسماء الأعمدة خاطئة:**
   - استخدم `قالب المنتج` أو `service name`
   - استخدم `السعر` أو `price`
   
2. **صيغة الملف خاطئة:**
   - الملف يجب أن يكون `.xlsx` أو `.xls`
   - ليس `.csv` أو `.txt`

3. **الأسماء لا تطابق:**
   - استخدم **كود الخدمة** بدلاً من الاسم
   - تحقق من المسافات والأحرف الخاصة

---

## 🛠️ استكشاف الأخطاء | Troubleshooting

### الخطوة 1: تحقق من Logs

إذا فشلت جميع الصفوف، ابحث عن:
```
Excel Header Row Analysis:
  Column 0: 'تسلسل' -> mapped to 'sequence'
  Column 1: 'قائمة الأسعار' -> mapped to 'priceListName'
  Column 2: 'قالب المنتج' -> mapped to 'serviceName'
  Column 3: 'كود منتج المورد' -> mapped to 'serviceCode'
  Column 4: 'العملة' -> mapped to 'currency'
  Column 5: 'الكمية' -> mapped to 'quantity'
  Column 6: 'السعر' -> mapped to 'contractPrice'

Mapped columns: [sequence, priceListName, serviceName, serviceCode, currency, quantity, contractPrice]
```

**إذا رأيت `Mapped columns: []`:**
- أسماء الأعمدة لا تطابق المتوقعة
- تحقق من الأسماء المدعومة أعلاه

### الخطوة 2: تحقق من البيانات

ابحث عن:
```
Row 2: serviceCode='SRV-CARDIO-001', serviceName='فحص قلب شامل', price=350.00
Row 2: Found service by code: SRV-CARDIO-001 -> فحص قلب شامل
```

أو:
```
Row 2: serviceCode='SRV-XYZ-999', serviceName='خدمة غير موجودة', price=100.00
Row 2: Service NOT found by name: 'خدمة غير موجودة'. Available names sample: [فحص قلب شامل, تحليل دم كامل, ...]
Row 2: Skipped - service not found: 'SRV-XYZ-999'
```

### الخطوة 3: استخدم Endpoint للتحقق

```bash
# الحصول على قائمة الخدمات الطبية
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/medical-services?page=0&size=1000

# النتيجة:
{
  "data": {
    "content": [
      {
        "id": 1,
        "code": "SRV-CARDIO-001",
        "name": "فحص قلب شامل",  ← استخدم هذا الاسم بالضبط
        "nameEn": "Comprehensive Cardiac Exam",
        "basePrice": 400.00,
        "active": true
      }
    ]
  }
}
```

---

## 📊 Excel Template Download

### Template 1: Odoo Export Format (Full)
```
تسلسل | قائمة الأسعار | قالب المنتج | كود منتج المورد | العملة | الكمية | السعر
-----|--------------|------------|----------------|--------|--------|------
     |              |            |                |        |        |
```

### Template 2: Minimal Format (Recommended)
```
قالب المنتج | كود منتج المورد | السعر
-----------|----------------|------
           |                |
```

### Template 3: English Headers
```
Service Name | Service Code | Contract Price | Currency
-------------|--------------|----------------|----------
             |              |                |
```

---

## 📈 نتائج الاستيراد | Import Results

### Response Structure

```json
{
  "success": true,
  "message": "تم استيراد 150 عنصر تسعير بنجاح (إضافة: 100، تحديث: 50، تخطي: 0، فشل: 0)",
  "summary": {
    "total": 150,
    "inserted": 100,
    "updated": 50,
    "skipped": 0,
    "failed": 0,
    "errors": []
  }
}
```

### Success Scenarios

#### Full Success ✅
```json
{
  "total": 100,
  "inserted": 80,
  "updated": 20,
  "skipped": 0,
  "failed": 0
}
```
→ **100%** نجاح

#### Partial Success ⚠️
```json
{
  "total": 100,
  "inserted": 60,
  "updated": 20,
  "skipped": 15,
  "failed": 5,
  "errors": [
    {"row": 3, "column": "قالب المنتج", "error": "الخدمة الطبية غير موجودة: خدمة اختبار"},
    {"row": 7, "column": "السعر", "error": "السعر مطلوب"}
  ]
}
```
→ **80%** نجاح - راجع الأخطاء

#### Total Failure ❌
```json
{
  "total": 100,
  "inserted": 0,
  "updated": 0,
  "skipped": 100,
  "failed": 0
}
```
→ **0%** نجاح - تحقق من أسماء الأعمدة وبيانات الخدمات

---

## 🎯 Best Practices (أفضل الممارسات)

### 1. استخدم الأكواد ✅
```
كود منتج المورد | قالب المنتج      | السعر
----------------|-----------------|------
SRV-CARDIO-001  | فحص قلب شامل    | 350.00  ← دقيق وسريع
```

### 2. تحقق من البيانات قبل الاستيراد ✅
- استخدم Endpoint `/api/medical-services` للحصول على القائمة الكاملة
- قارن الأسماء في Excel مع القائمة
- استخدم Copy/Paste للأسماء

### 3. ابدأ بملف صغير ✅
- جرّب 10-20 صف أولاً
- تأكد من النجاح
- ثم ارفع الملف الكامل

### 4. احتفظ بنسخة احتياطية ✅
- قبل الاستيراد، صدّر البيانات الحالية
- في حالة الخطأ، يمكنك الاسترجاع

---

## 📞 الدعم | Support

إذا استمرت المشكلة:
1. افتح Developer Console (F12)
2. انسخ رسالة الخطأ
3. تحقق من Backend Logs
4. راجع هذا الدليل
5. اتصل بفريق الدعم الفني

---

**آخر تحديث:** 2026-01-03  
**الإصدار:** 1.0.0
