# 🏗️ Excel Template & Import Architecture - System-Generated Only

## 📋 Executive Summary

تم إعادة تصميم كامل لنظام استيراد Excel في TBA-WAAD بحيث يعتمد حصريًا على:
1. **System-Generated Templates** - القوالب المُنشأة من النظام فقط
2. **Create-Only Mode** - إنشاء سجلات جديدة فقط (المرحلة 1)
3. **Auto-Generated Identifiers** - معرفات مُنشأة تلقائياً
4. **Strict Validation** - تحقق صارم مع تقارير أخطاء مُفصّلة

---

## 🎯 Core Principles

### 1. System is Source of Truth
```
✅ النظام يحدد الأعمدة والبنية
❌ المستخدم لا يحدد الأعمدة
```

### 2. No External Excel Formats
```
✅ تنزيل القالب من النظام → ملئه → رفعه
❌ استيراد ملفات Odoo/Excel خارجية مباشرةً
```

### 3. Create-Only Strategy (Phase 1)
```
✅ Always CREATE new records
❌ No UPDATE
❌ No MATCH
❌ No UPSERT
```

### 4. System-Generated Identifiers
```
Prohibited from Excel:
❌ IDs
❌ Card Numbers  
❌ Barcodes
❌ Contract Numbers
❌ License Numbers

Auto-Generated:
✅ Member.cardNumber → WAAD|MEMBER|{seq}
✅ Provider.licenseNumber → {TYPE}-{timestamp}
✅ All primary keys
```

---

## 🔁 Unified Workflow

### Step 1: Download Template
```http
GET /api/{module}/import/template
```

**Supported Modules:**
- `/api/members/import/template` - Members
- `/api/providers/import/template` - Providers
- `/api/medical-services/import/template` - Medical Services
- `/api/medical-categories/import/template` - Medical Categories
- `/api/provider-contracts/{id}/pricing/import/template` - Price Lists

### Step 2: Fill Template
- Mandatory columns highlighted (yellow background)
- Example row provided
- Dropdowns for enums
- Lookup sheets for reference data

### Step 3: Upload Template
```http
POST /api/{module}/import
Content-Type: multipart/form-data

file: [Excel file]
```

### Step 4: Review Results
```json
{
  "summary": {
    "totalRows": 100,
    "created": 85,
    "skipped": 10,
    "rejected": 5,
    "failed": 0
  },
  "errors": [
    {
      "rowNumber": 15,
      "errorType": "LOOKUP_FAILED",
      "columnName": "employer",
      "messageAr": "جهة العمل غير موجودة",
      "messageEn": "Employer not found",
      "value": "شركة غير موجودة"
    }
  ],
  "success": true,
  "messageAr": "تم إنشاء 85 سجل",
  "messageEn": "Created 85 records"
}
```

---

## 📦 Module-Specific Details

### 👤 MEMBERS Module

#### Template Columns
| Column | Arabic | Type | Required | Auto-Generated |
|--------|--------|------|----------|----------------|
| `full_name` | الاسم الكامل | TEXT | ✅ | ❌ |
| `employer` | جهة العمل | TEXT | ✅ | ❌ |
| `birth_date` | تاريخ الميلاد | DATE | ✅ | ❌ |
| `gender` | الجنس | ENUM | ✅ | ❌ |
| `full_name_english` | الاسم بالإنجليزية | TEXT | ❌ | ❌ |
| `civil_id` | الرقم الوطني | TEXT | ❌ | ❌ |
| `phone` | رقم الهاتف | TEXT | ❌ | ❌ |
| `email` | البريد الإلكتروني | TEXT | ❌ | ❌ |
| `card_number` | رقم البطاقة | - | - | ✅ AUTO |

#### Business Rules
```java
// Card Number - AUTO-GENERATED
cardNumber = CardNumberGenerator.generate()
// Format: WAAD|MEMBER|{sequence}

// Employer - MANDATORY LOOKUP
Organization employer = findByNameOrId(employerName)
if (employer == null) → REJECT_ROW

// Civil ID - OPTIONAL, Non-Unique
civilId can be null or duplicate

// Status - Default
status = MemberStatus.ACTIVE
```

#### Lookup Sheets
- **Employers Sheet**: ID | Name (AR) | Name (EN)

---

### 🏥 MEDICAL PROVIDERS Module

#### Template Columns
| Column | Arabic | Type | Required | Auto-Generated |
|--------|--------|------|----------|----------------|
| `provider_name` | اسم مقدم الخدمة | TEXT | ✅ | ❌ |
| `provider_type` | نوع المقدم | ENUM | ✅ | ❌ |
| `city` | المدينة | TEXT | ✅ | ❌ |
| `name_english` | الاسم بالإنجليزية | TEXT | ❌ | ❌ |
| `phone` | رقم الهاتف | TEXT | ❌ | ❌ |
| `email` | البريد الإلكتروني | TEXT | ❌ | ❌ |
| `address` | العنوان | TEXT | ❌ | ❌ |
| `license_number` | رقم الترخيص | - | - | ✅ AUTO |

#### Business Rules
```java
// License Number - AUTO-GENERATED
String prefix = providerType.substring(0, 3).toUpperCase()
licenseNumber = prefix + "-" + timestamp
// Example: HOS-123456

// Provider Type - ENUM Validation
allowedValues = [HOSPITAL, CLINIC, LAB, PHARMACY, RADIOLOGY]
arabicMapping = [مستشفى, عيادة, مختبر, صيدلية, أشعة]

// Status - Default
active = true
```

#### Lookup Sheets
- **Provider Types**: Type (EN) | Type (AR)

---

### 🧾 PRICE LISTS Module

#### Template Columns
| Column | Arabic | Type | Required |
|--------|--------|------|----------|
| `provider` | مقدم الخدمة | TEXT | ✅ |
| `medical_service_code` | كود الخدمة | TEXT | ✅ |
| `price` | السعر | NUMBER | ✅ |
| `currency` | العملة | ENUM | ✅ |
| `coverage_limit` | حد التغطية | NUMBER | ❌ |
| `notes` | ملاحظات | TEXT | ❌ |

#### Business Rules
```java
// Provider Lookup - MANDATORY
Provider provider = findByNameOrId(providerName)
if (provider == null) → REJECT_ROW

// Medical Service Lookup - MANDATORY
MedicalService service = findByCode(serviceCode)
if (service == null) → REJECT_ROW

// Price Validation
if (price <= 0) → REJECT_ROW

// Currency
defaultCurrency = "LYD"
```

#### Lookup Sheets
- **Providers**: ID | Name (AR) | Name (EN)
- **Medical Services**: Code | Name (AR) | Name (EN)

---

## 🧪 Validation Strategy

### Error Types
```java
public enum ErrorType {
    MISSING_REQUIRED,           // Required field empty
    LOOKUP_FAILED,              // Foreign key not found
    INVALID_FORMAT,             // Invalid data format
    INVALID_ENUM,               // Invalid enum value
    MAX_LENGTH_EXCEEDED,        // Text too long
    DUPLICATE,                  // Uniqueness violation
    SYSTEM_GENERATED_IGNORED,   // User provided system field
    BUSINESS_RULE_VIOLATION,    // Custom business rule
    PROCESSING_ERROR            // Unexpected exception
}
```

### Validation Flow
```
Row Processing:
┌─────────────────────────────────┐
│ 1. Validate Mandatory Fields   │
│    → REJECT if missing          │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 2. Validate Lookups             │
│    → REJECT if not found        │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 3. Validate Enums               │
│    → REJECT if invalid          │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 4. Create Entity                │
│    → AUTO-GENERATE identifiers  │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 5. Save to Database             │
│    → COMMIT (no rollback)       │
└─────────────────────────────────┘
```

---

## 🏗️ Architecture Components

### Backend Components

#### 1. Core Services
```
com.waad.tba.common.excel.service/
├── ExcelTemplateService.java      # Template generation
├── ExcelParserService.java        # Excel parsing utilities
```

#### 2. DTOs
```
com.waad.tba.common.excel.dto/
├── ExcelTemplateColumn.java       # Column definition
├── ExcelImportResult.java         # Import result (unified)
├── ExcelLookupData.java           # Lookup sheet data
```

#### 3. Module Services
```
{module}.service/
├── {Module}ExcelTemplateService.java
    ├── generateTemplate()
    └── importFromExcel()
```

#### 4. Controllers
```
{module}.controller/
├── {Module}ExcelTemplateController.java
    ├── GET  /template
    └── POST /import
```

### Technology Stack
- **Apache POI 5.3.0** - Excel generation/parsing
- **Spring Boot 3.5.7** - Framework
- **PostgreSQL** - Database
- **React** - Frontend

---

## 🔐 Security & Permissions

### Permission Matrix
| Permission | Endpoint | Description |
|------------|----------|-------------|
| `members.import` | `/api/members/import/*` | Import members |
| `providers.import` | `/api/providers/import/*` | Import providers |
| `medical-services.import` | `/api/medical-services/import/*` | Import services |
| `SUPER_ADMIN` | All import endpoints | Full access |

### Authorization Example
```java
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('members.import')")
public ResponseEntity<?> importMembers(@RequestParam MultipartFile file) {
    // ...
}
```

---

## 📊 Template Features

### Visual Indicators
- **Yellow Header** = Required field
- **Gray Header** = Optional field
- **Blue Example Row** = Sample data
- **Dropdown Validation** = Enum fields
- **Cell Comments** = Field descriptions

### Metadata Sheet (Hidden)
```
Module: Members / الأعضاء
Version: 1.0.0

⚠️ WARNING:
Only files downloaded from this system are accepted.
يتم قبول الملفات المُنزَّلة من هذا النظام فقط.

Column Definitions:
[Table of all columns with types and requirements]
```

### Lookup Sheets
```
Sheet: Employers
┌────┬─────────────────────┬──────────────────┐
│ ID │ Name (AR)           │ Name (EN)        │
├────┼─────────────────────┼──────────────────┤
│ 1  │ شركة النفط الليبية │ Libyan Oil Co.   │
│ 2  │ وزارة الصحة         │ Health Ministry  │
└────┴─────────────────────┴──────────────────┘
```

---

## 🧰 API Contracts

### Download Template
```http
GET /api/members/import/template
Authorization: Bearer {token}

Response: 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="Members_Import_Template.xlsx"

[Binary Excel file]
```

### Import Data
```http
POST /api/members/import
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [Excel file]

Response: 200 OK (if some records created)
{
  "success": true,
  "data": {
    "summary": {
      "totalRows": 50,
      "created": 45,
      "skipped": 3,
      "rejected": 2,
      "failed": 0
    },
    "errors": [...],
    "messageAr": "تم إنشاء 45 عضو",
    "messageEn": "Created 45 members"
  }
}

Response: 400 Bad Request (if zero records created)
{
  "success": false,
  "errors": [...],
  "messageAr": "فشل الاستيراد",
  "messageEn": "Import failed"
}
```

---

## 🚦 Phase Strategy

### Phase 1 (CURRENT) ✅
- [x] Create-only imports
- [x] System-generated templates
- [x] Strict validation
- [x] Auto-generated identifiers
- [x] Members module
- [x] Providers module
- [x] Medical Services module
- [x] Medical Categories module
- [x] Price Lists module

### Phase 2 (FUTURE) 🔮
- [ ] Optional update mode (with match key)
- [ ] Versioned templates
- [ ] External system sync (Odoo API)
- [ ] Async processing for large files
- [ ] Export failed rows to Excel
- [ ] Import history & audit trail
- [ ] Duplicate detection settings

---

## 📝 Usage Examples

### Example 1: Import Members

**Step 1: Download Template**
```bash
curl -H "Authorization: Bearer {token}" \
     -o members_template.xlsx \
     https://api.tba-waad.ly/api/members/import/template
```

**Step 2: Fill Template**
```
Open members_template.xlsx in Excel
Fill rows 2+ with member data:
- Use exact employer name from "Employers" sheet
- Use MALE/FEMALE or ذكر/أنثى for gender
- Date format: 1990-01-15
```

**Step 3: Upload**
```bash
curl -X POST \
     -H "Authorization: Bearer {token}" \
     -F "file=@members_filled.xlsx" \
     https://api.tba-waad.ly/api/members/import
```

**Step 4: Review Response**
```json
{
  "summary": {
    "created": 98,
    "rejected": 2
  },
  "errors": [
    {
      "rowNumber": 15,
      "errorType": "LOOKUP_FAILED",
      "messageAr": "جهة العمل غير موجودة: شركة ABC",
      "value": "شركة ABC"
    }
  ]
}
```

---

## 🎯 Best Practices

### For Users
1. **Always download fresh templates** - Structure may change
2. **Use exact names from lookup sheets** - Copy/paste recommended
3. **Test with small file first** - Verify format before bulk import
4. **Keep backup copies** - Save original data

### For Developers
1. **Never skip validation** - All mandatory fields must be checked
2. **Provide clear error messages** - Arabic + English
3. **Log all imports** - Audit trail required
4. **No silent failures** - Return all errors to user

---

## ⚠️ Migration from Legacy System

### Old System (DEPRECATED)
```java
// ❌ Allowed external Excel with arbitrary columns
// ❌ Column mapping guessing
// ❌ Silent failures
// ❌ User-provided IDs

@PostMapping("/import")
public void importMembers(MultipartFile file, 
                         Map<String, String> customMappings) {
    // Auto-detect columns
    // Guess mappings
    // Silently skip errors
}
```

### New System (CURRENT)
```java
// ✅ System-generated templates only
// ✅ Fixed column structure
// ✅ Detailed error reporting
// ✅ Auto-generated IDs

@PostMapping("/import")
public ExcelImportResult importMembers(MultipartFile file) {
    // Validate template structure
    // Strict column validation
    // Return all errors
    // Auto-generate identifiers
}
```

### Migration Steps
1. Remove legacy import endpoints
2. Update frontend to use new endpoints
3. Educate users on new workflow
4. Provide migration scripts for existing data

---

## 📖 Technical Implementation Details

### Template Generation
```java
// Define columns
List<ExcelTemplateColumn> columns = List.of(
    ExcelTemplateColumn.builder()
        .name("full_name")
        .nameAr("الاسم الكامل")
        .type(ColumnType.TEXT)
        .required(true)
        .example("أحمد محمد")
        .description("Full name in Arabic")
        .width(25)
        .build()
);

// Define lookups
List<ExcelLookupData> lookups = buildLookupSheets();

// Generate
byte[] excel = templateService.generateTemplate(
    "Members", columns, lookups
);
```

### Import Processing
```java
// Parse file
Workbook workbook = parserService.openWorkbook(file);
Sheet sheet = parserService.getDataSheet(workbook);

// Process rows
for (int rowNum = 2; rowNum <= lastRow; rowNum++) {
    Row row = sheet.getRow(rowNum);
    
    // Validate & create
    Member member = parseAndValidate(row, errors);
    
    if (member != null) {
        memberRepository.save(member);
        summary.created++;
    } else {
        summary.rejected++;
    }
}

// Return result
return ExcelImportResult.builder()
    .summary(summary)
    .errors(errors)
    .success(summary.created > 0)
    .build();
```

---

## 🔍 Troubleshooting

### Common Issues

#### Issue 1: "Template not accepted"
```
Error: Invalid file format
Solution: Download fresh template from system
```

#### Issue 2: "Employer not found"
```
Error: Lookup failed for "شركة XYZ"
Solution: Check "Employers" sheet in template for exact name
```

#### Issue 3: "Invalid gender value"
```
Error: Invalid enum "M"
Solution: Use MALE/FEMALE or ذكر/أنثى
```

#### Issue 4: "All rows rejected"
```
Error: Created=0, Rejected=50
Solution: Check error details in response, fix mandatory fields
```

---

## ✅ Success Criteria

### System-Level
- ✅ Zero schema mismatches
- ✅ Zero silent failures
- ✅ 100% error visibility
- ✅ Predictable import behavior

### User-Level
- ✅ Clear workflow (download → fill → upload)
- ✅ Visual validation in Excel
- ✅ Detailed error messages
- ✅ Arabic + English support

### Enterprise-Level
- ✅ Audit trail
- ✅ Data integrity
- ✅ Scalability
- ✅ Security compliance

---

## 📞 Support

### For Users
- Download template from system only
- Check lookup sheets for valid values
- Review error messages carefully
- Contact admin if employer/provider not listed

### For Administrators
- Ensure reference data is complete (employers, providers, etc.)
- Grant appropriate import permissions
- Monitor import logs
- Provide training on new workflow

### For Developers
- Follow validation patterns in existing services
- Maintain consistency across modules
- Update documentation when adding fields
- Test with edge cases

---

## 🎓 Training Materials

### Quick Start Guide (Arabic)
```markdown
# دليل البدء السريع - استيراد الأعضاء

1. **تنزيل القالب**
   انتقل إلى: الأعضاء → استيراد → تنزيل القالب

2. **ملء البيانات**
   - افتح الملف في Excel
   - املأ الصفوف بدءاً من الصف 3
   - استخدم القوائم المنسدلة للأعمدة الثابتة
   - راجع ورقة "جهات العمل" للأسماء الصحيحة

3. **رفع الملف**
   ارجع إلى الصفحة → رفع الملف المعبأ

4. **مراجعة النتائج**
   - تحقق من عدد السجلات المُنشأة
   - راجع الأخطاء إن وجدت
   - صحح الأخطاء وأعد الرفع
```

---

## 🏁 Conclusion

This architecture provides:
- **Predictability** - No surprises, clear errors
- **Safety** - No data corruption
- **Scalability** - Ready for enterprise volume
- **Maintainability** - Clear separation of concerns
- **User-Friendliness** - Visual validation, clear guidance

**Next Steps:**
1. ✅ Train users on new workflow
2. ✅ Migrate existing import processes
3. ✅ Monitor adoption and feedback
4. 🔮 Plan Phase 2 enhancements

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-03  
**Author:** TBA-WAAD Development Team
