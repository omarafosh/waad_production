# 🎯 نظام توليد PDF المحسّن - دليل شامل

## 📋 نظرة عامة

تم تحسين نظام توليد PDF بالكامل ليصبح **نظامًا مركزيًا احترافيًا** يضمن:

✅ **هيدر وفوتر ثابت** على كل صفحة  
✅ **تنسيق جداول متسق** للطباعة  
✅ **عدم ظهور صفحات فارغة**  
✅ **قابلية تعديل بيانات الشركة** (شعار، اسم، عنوان)  
✅ **دعم كامل للعربية** RTL

---

## 🏗️ البنية التقنية

### المكونات الرئيسية

```
backend/
├── src/main/java/com/waad/tba/
│   ├── modules/pdf/
│   │   ├── entity/PdfCompanySettings.java          # Entity للإعدادات
│   │   ├── repository/PdfCompanySettingsRepository.java
│   │   ├── service/PdfCompanySettingsService.java  # Business logic
│   │   └── controller/
│   │       ├── PdfCompanySettingsController.java   # REST API للإعدادات
│   │       └── PdfReportController.java            # تو ليد التقارير
│   └── services/pdf/
│       ├── PdfTemplateService.java                 # معالجة Thymeleaf
│       ├── HtmlToPdfService.java                   # تحويل HTML→PDF
│       ├── PdfReportService.java                   # الخدمة الأصلية (OpenPDF)
│       └── ... (قوالب أخرى)
│
└── src/main/resources/
    ├── db/migration/
    │   └── V1000__create_pdf_company_settings.sql  # Flyway migration
    └── templates/pdf/
        ├── layout-base.html                        # القالب الأساسي
        ├── claims-report.html                      # مثال: تقرير المطالبات
        └── ... (قوالب أخرى)
```

### التقنيات المستخدمة

| التقنية | الإصدار | الغرض |
|---------|---------|-------|
| **Spring Boot** | 3.x | إطار العمل الأساسي |
| **Thymeleaf** | Latest | محرك القوالب |
| **Flying Saucer** | 9.7.2 | تحويل HTML → PDF |
| **OpenPDF** | 1.3.34 | مكتبة PDF أساسية |
| **PostgreSQL** | 15+ | قاعدة البيانات |
| **Flyway** | Latest | Database migrations |

---

## 📊 قاعدة البيانات

### جدول `pdf_company_settings`

```sql
CREATE TABLE pdf_company_settings (
    id                 BIGSERIAL PRIMARY KEY,
    
    -- Company Branding
    company_name       VARCHAR(255) NOT NULL,
    logo_url           VARCHAR(512),
    logo_data          BYTEA,           -- Logo stored as binary
    
    -- Contact Info
    address            TEXT,
    phone              VARCHAR(50),
    email              VARCHAR(100),
    website            VARCHAR(255),
    
    -- Footer Text
    footer_text        TEXT,            -- Arabic
    footer_text_en     TEXT,            -- English
    
    -- Styling
    header_color       VARCHAR(7),      -- Hex color (#1976d2)
    footer_color       VARCHAR(7),
    
    -- Page Settings
    page_size          VARCHAR(20),     -- A4, LETTER
    margin_top         INTEGER,         -- in mm
    margin_bottom      INTEGER,
    margin_left        INTEGER,
    margin_right       INTEGER,
    
    -- Metadata
    is_active          BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP,
    created_by         VARCHAR(100),
    updated_by         VARCHAR(100)
);
```

**ميزات**:
- تخزين الشعار كـ **BYTEA** (binary data) لتجنب مشاكل الروابط الخارجية
- دعم **ألوان Hex** للهيدر والفوتر
- **هوامش قابلة للتخصيص** (بالملليمتر)
- **إعدادات نشطة واحدة** فقط في كل مرة

---

## 🚀 كيفية الاستخدام

### 1. إعداد الإعدادات (مرة واحدة)

#### أ. عبر API

```bash
# الحصول على الإعدادات النشطة
GET /api/pdf/settings/active

# إنشاء إعدادات جديدة (SUPER_ADMIN فقط)
POST /api/pdf/settings
Content-Type: application/json

{
  "companyName": "نظام وعد الطبي",
  "address": "الرياض، المملكة العربية السعودية",
  "phone": "+966 XX XXX XXXX",
  "email": "info@waad-system.com",
  "footerText": "جميع الحقوق محفوظة © 2026",
  "footerTextEn": "All Rights Reserved © 2026",
  "headerColor": "#1976d2",
  "footerColor": "#757575",
  "pageSize": "A4",
  "marginTop": 20,
  "marginBottom": 20,
  "marginLeft": 20,
  "marginRight": 20,
  "isActive": true
}

# رفع شعار الشركة
POST /api/pdf/settings/{id}/logo
Content-Type: multipart/form-data

file: logo.png (max 5MB, PNG/JPG/SVG)
```

#### ب. عبر قاعدة البيانات

```sql
-- تحديث بيانات الشركة
UPDATE pdf_company_settings
SET company_name = 'شركة التأمين الطبي',
    address = 'جدة، المملكة العربية السعودية',
    phone = '+966 12 XXX XXXX'
WHERE is_active = TRUE;

-- تحديث الشعار (من ملف)
UPDATE pdf_company_settings
SET logo_data = pg_read_binary_file('/path/to/logo.png')
WHERE is_active = TRUE;
```

### 2. توليد تقرير PDF

#### أ. استخدام Controller جاهز

```bash
# تقرير تجريبي للمطالبات
GET /api/pdf/reports/claims/sample

# معاينة HTML (للتطوير)
GET /api/pdf/reports/claims/preview-html

# تقرير مخصص
POST /api/pdf/reports/claims
Content-Type: application/json

{
  "reportDate": "2026-01-11",
  "claimsCount": 10,
  "totalAmount": 50000.00,
  "claims": [
    {
      "claimNumber": "CLM-001",
      "patientName": "محمد أحمد",
      "providerName": "مستشفى النور",
      "claimDate": "2026-01-10",
      "amount": 5000.00,
      "status": "معتمد",
      "action": "-"
    }
  ]
}
```

#### ب. من كود Java

```java
@RestController
@RequiredArgsConstructor
public class MyReportController {
    
    private final PdfTemplateService templateService;
    private final HtmlToPdfService htmlToPdfService;
    
    @GetMapping("/my-report")
    public ResponseEntity<byte[]> generateReport() throws IOException {
        // 1. تحضير البيانات
        Map<String, Object> data = new HashMap<>();
        data.put("reportTitle", "تقريري المخصص");
        data.put("items", getMyData());
        
        // 2. معالجة القالب
        String html = templateService.processTemplate(
            "pdf/my-template",  // اسم القالب
            data,
            new Locale("ar", "SA")
        );
        
        // 3. تحويل لـ PDF
        byte[] pdfBytes = htmlToPdfService.convertHtmlToPdf(html);
        
        // 4. إرجاع الملف
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "report.pdf");
        
        return ResponseEntity.ok()
            .headers(headers)
            .body(pdfBytes);
    }
}
```

### 3. إنشاء قالب Thymeleaf جديد

#### أ. إنشاء ملف HTML

**المسار**: `src/main/resources/templates/pdf/my-report.html`

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org" lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8"/>
    <title th:text="${reportTitle}">My Report</title>
    
    <style>
        /* نسخ الأنماط من layout-base.html */
        @page {
            size: A4;
            margin: 20mm;
        }
        
        body {
            font-family: 'Traditional Arabic', 'Arial', sans-serif;
            font-size: 11pt;
            direction: rtl;
        }
        
        header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            padding: 10mm;
            border-bottom: 2px solid #1976d2;
            background: white;
        }
        
        footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 5mm 10mm;
            border-top: 1px solid #ddd;
            text-align: center;
        }
        
        .content {
            margin-top: 80px;
            margin-bottom: 60px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: right;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div th:if="${company.hasLogo()}">
                <img th:src="${company.logoBase64DataUrl}" 
                     alt="Logo" 
                     style="max-height: 50px;"/>
            </div>
            <div style="text-align: center; flex: 1;">
                <div style="font-size: 18pt; font-weight: bold; color: #1976d2;"
                     th:text="${company.companyName}">Company Name</div>
                <div style="font-size: 9pt; color: #666;">
                    <span th:text="${company.address}">Address</span> •
                    <span th:text="${company.phone}">Phone</span>
                </div>
            </div>
        </div>
    </header>
    
    <!-- Footer -->
    <footer>
        <div th:text="${company.footerText}">Footer Text</div>
    </footer>
    
    <!-- Content -->
    <div class="content">
        <h1 style="text-align: center; color: #1976d2;" 
            th:text="${reportTitle}">Report Title</h1>
        
        <!-- Your custom content here -->
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>البيان</th>
                    <th>القيمة</th>
                </tr>
            </thead>
            <tbody>
                <tr th:each="item, iterStat : ${items}">
                    <td th:text="${iterStat.count}">1</td>
                    <td th:text="${item.name}">Name</td>
                    <td th:text="${item.value}">Value</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
```

#### ب. استخدام القالب

```java
Map<String, Object> data = new HashMap<>();
data.put("reportTitle", "تقرير العناصر");
data.put("items", itemsList);

String html = templateService.processTemplate("pdf/my-report", data);
byte[] pdf = htmlToPdfService.convertHtmlToPdf(html);
```

---

## 🎨 التخصيص

### 1. تخصيص الألوان

```java
// عبر API
{
  "headerColor": "#e91e63",  // وردي
  "footerColor": "#9e9e9e"   // رمادي
}
```

### 2. تخصيص الهوامش

```java
{
  "marginTop": 25,      // 25mm
  "marginBottom": 25,
  "marginLeft": 15,
  "marginRight": 15
}
```

### 3. تخصيص الشعار

```bash
# رفع شعار جديد
POST /api/pdf/settings/1/logo
Content-Type: multipart/form-data

file: new-logo.png
```

### 4. تخصيص النصوص

```sql
UPDATE pdf_company_settings
SET footer_text = 'نص مخصص بالعربية',
    footer_text_en = 'Custom English Text'
WHERE is_active = TRUE;
```

---

## 🧪 الاختبار

### 1. اختبار الإعدادات

```bash
# الحصول على الإعدادات النشطة
curl http://localhost:8080/api/pdf/settings/active

# معاينة HTML
curl http://localhost:8080/api/pdf/reports/claims/preview-html > preview.html
open preview.html
```

### 2. اختبار توليد PDF

```bash
# تحميل تقرير تجريبي
curl -o sample.pdf http://localhost:8080/api/pdf/reports/claims/sample
open sample.pdf

# تحميل تقرير مخصص
curl -X POST http://localhost:8080/api/pdf/reports/claims \
  -H "Content-Type: application/json" \
  -d '{"reportDate":"2026-01-11","claimsCount":1,"claims":[...]}' \
  -o custom.pdf
```

### 3. اختبار رفع الشعار

```bash
curl -X POST http://localhost:8080/api/pdf/settings/1/logo \
  -F "file=@logo.png" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 أمثلة إضافية

### مثال 1: تقرير بجداول متعددة

```html
<table>
    <thead>
        <tr><th>العمود 1</th><th>العمود 2</th></tr>
    </thead>
    <tbody>
        <tr th:each="row : ${table1}">
            <td th:text="${row.col1}"></td>
            <td th:text="${row.col2}"></td>
        </tr>
    </tbody>
</table>

<div style="page-break-after: always;"></div>

<table>
    <!-- جدول ثاني -->
</table>
```

### مثال 2: تقرير بصور مضمنة

```html
<!-- صورة من Base64 -->
<img th:src="${'data:image/png;base64,' + imageBase64}" 
     style="max-width: 100%; height: auto;"/>

<!-- صورة من الشركة -->
<img th:src="${company.logoBase64DataUrl}" 
     alt="Logo"/>
```

### مثال 3: تقرير بعناصر شرطية

```html
<div th:if="${showSummary}">
    <h2>الملخص</h2>
    <!-- محتوى الملخص -->
</div>

<div th:unless="${items.isEmpty()}">
    <table>
        <!-- جدول العناصر -->
    </table>
</div>
```

---

## ⚠️ استكشاف الأخطاء

### مشكلة: الصفحات فارغة

**السبب**: CSS غير صحيح أو HTML غير متوافق مع XHTML

**الحل**:
```html
<!-- ✅ صحيح -->
<img src="..." alt="Logo"/>
<br/>
<input type="text"/>

<!-- ❌ خطأ -->
<img src="..." alt="Logo">
<br>
<input type="text">
```

### مشكلة: الهيدر/الفوتر لا يظهر

**السبب**: `position: fixed` غير مدعوم في Flying Saucer

**الحل**: استخدم `position: fixed` مع `top/bottom`:
```css
header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
}

footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
}

.content {
    margin-top: 80px;  /* ارتفاع الهيدر */
    margin-bottom: 60px;  /* ارتفاع الفوتر */
}
```

### مشكلة: الشعار لا يظهر

**السبب**: مسار الشعار غير صحيح أو البيانات غير موجودة

**الحل**:
```java
// تحقق من وجود البيانات
if (settings.hasLogo()) {
    String base64 = settings.getLogoBase64DataUrl();
    // استخدام base64 في القالب
}
```

### مشكلة: الخطوط العربية لا تظهر

**السبب**: الخط غير مدعوم

**الحل**:
```css
body {
    font-family: 'Traditional Arabic', 'Arial', sans-serif;
    /* أو استخدم خط مضمن في النظام */
}
```

---

## 📚 المراجع

### وثائق التقنيات

- [Flying Saucer User Guide](https://github.com/flyingsaucerproject/flyingsaucer)
- [Thymeleaf Documentation](https://www.thymeleaf.org/documentation.html)
- [Spring Boot File Upload](https://spring.io/guides/gs/uploading-files/)
- [Flyway Migrations](https://flywaydb.org/documentation/)

### دروس مفيدة

- [Thymeleaf → PDF with Flying Saucer - Baeldung](https://www.baeldung.com/thymeleaf-generate-pdf)
- [CSS for Print - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@page)

---

## ✅ معايير القبول (DoD)

- [x] ✅ جدول `pdf_company_settings` تم إنشاؤه
- [x] ✅ Entity, Repository, Service جاهزة
- [x] ✅ REST API للإعدادات كاملة
- [x] ✅ Template Service جاهز
- [x] ✅ HTML to PDF Service جاهز
- [x] ✅ قالب أساسي `layout-base.html`
- [x] ✅ قالب مثال `claims-report.html`
- [x] ✅ Controller مثال للتقارير
- [x] ✅ رفع الشعار يعمل
- [x] ✅ هيدر/فوتر ثابت على كل صفحة
- [x] ✅ لا صفحات فارغة
- [x] ✅ جداول منسقة
- [x] ✅ بيانات قابلة للتعديل

---

## 🎉 الخلاصة

تم بنجاح إنشاء **نظام PDF احترافي متكامل** يتضمن:

✅ إدارة مركزية لإعدادات الشركة  
✅ قوالب Thymeleaf مع دعم كامل للعربية  
✅ تحويل HTML → PDF عبر Flying Saucer  
✅ هيدر/فوتر ثابت احترافي  
✅ جداول منسقة للطباعة  
✅ رفع الشعارات بشكل آمن  
✅ REST API كاملة  

**جاهز للاستخدام في الإنتاج** 🚀

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-11  
**Status**: ✅ Implementation Complete
