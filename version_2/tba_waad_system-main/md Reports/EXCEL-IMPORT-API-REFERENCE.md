# 📘 Excel Import API Reference

## 🎯 Overview

All Excel import endpoints follow the same pattern:
1. **Download Template**: `GET /api/{module}/import/template`
2. **Upload Data**: `POST /api/{module}/import`

---

## 👤 Members Module

### Download Template
```http
GET /api/members/import/template
Authorization: Bearer {jwt_token}
```

**Response:**
- Status: `200 OK`
- Content-Type: `application/octet-stream`
- File: `Members_Import_Template.xlsx`

**Permissions:** `SUPER_ADMIN` OR `members.import`

---

### Import Members
```http
POST /api/members/import
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: [Excel file]
```

**Request Body:**
```
Form Data:
- file: Excel file (Members_Import_Template.xlsx filled)
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Created 45 members",
  "data": {
    "summary": {
      "totalRows": 50,
      "created": 45,
      "skipped": 0,
      "rejected": 5,
      "updated": 0,
      "failed": 0
    },
    "errors": [
      {
        "rowNumber": 12,
        "errorType": "LOOKUP_FAILED",
        "columnName": "employer",
        "fieldName": "employerOrganization",
        "messageAr": "جهة العمل غير موجودة: شركة ABC",
        "messageEn": "Employer not found: شركة ABC",
        "value": "شركة ABC"
      }
    ],
    "success": true,
    "messageAr": "تم إنشاء 45 عضو، تم رفض 5",
    "messageEn": "Created 45 members, rejected 5",
    "timestamp": "2026-01-03T10:30:00"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Import failed: Mandatory columns missing",
  "errors": {
    "summary": {
      "totalRows": 0,
      "created": 0,
      "rejected": 0
    },
    "errors": [
      {
        "rowNumber": 0,
        "errorType": "MISSING_REQUIRED",
        "columnName": "full_name",
        "messageAr": "عمود الاسم الكامل مفقود",
        "messageEn": "Full name column is missing"
      }
    ]
  }
}
```

**Permissions:** `SUPER_ADMIN` OR `members.import`

---

## 🏥 Providers Module

### Download Template
```http
GET /api/providers/import/template
Authorization: Bearer {jwt_token}
```

**Response:**
- File: `Providers_Import_Template.xlsx`

---

### Import Providers
```http
POST /api/providers/import
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: [Excel file]
```

**Permissions:** `SUPER_ADMIN` OR `providers.import`

---

## 🧾 Medical Services Module

### Download Template
```http
GET /api/medical-services/import/template
Authorization: Bearer {jwt_token}
```

**Response:**
- File: `Medical_Services_Import_Template.xlsx`

---

### Import Services
```http
POST /api/medical-services/import
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: [Excel file]
```

**Permissions:** `SUPER_ADMIN` OR `medical-services.import`

---

## 📦 Medical Categories Module

### Download Template
```http
GET /api/medical-categories/import/template
Authorization: Bearer {jwt_token}
```

---

### Import Categories
```http
POST /api/medical-categories/import
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: [Excel file]
```

**Permissions:** `SUPER_ADMIN` OR `medical-services.import`

---

## 💰 Price Lists Module

### Download Template
```http
GET /api/provider-contracts/{contractId}/pricing/import/template
Authorization: Bearer {jwt_token}
```

**Path Parameters:**
- `contractId` (Long): Provider contract ID

---

### Import Pricing
```http
POST /api/provider-contracts/{contractId}/pricing/import
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: [Excel file]
```

**Permissions:** `SUPER_ADMIN` OR `contracts.import`

---

## 📊 Error Types Reference

### ErrorType Enum
```typescript
enum ErrorType {
  MISSING_REQUIRED = "MISSING_REQUIRED",           // Required field empty
  LOOKUP_FAILED = "LOOKUP_FAILED",                 // Foreign key not found
  INVALID_FORMAT = "INVALID_FORMAT",               // Invalid data format
  INVALID_ENUM = "INVALID_ENUM",                   // Invalid enum value
  MAX_LENGTH_EXCEEDED = "MAX_LENGTH_EXCEEDED",     // Text too long
  DUPLICATE = "DUPLICATE",                         // Uniqueness violation
  SYSTEM_GENERATED_IGNORED = "SYSTEM_GENERATED_IGNORED",  // User provided system field
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",    // Custom business rule
  PROCESSING_ERROR = "PROCESSING_ERROR"            // Unexpected exception
}
```

---

## 🔐 Security & Headers

### Required Headers
```http
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data  (for POST requests)
```

### CORS
```
Allowed Origins: Configured in application.yml
Methods: GET, POST
Headers: Authorization, Content-Type
```

---

## 📝 Example: Full Member Import Flow

### 1. Download Template (JavaScript/React)
```javascript
import { downloadMemberTemplate } from '@/services/api/members.service';

const handleDownloadTemplate = async () => {
  try {
    const blob = await downloadMemberTemplate();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Members_Import_Template.xlsx';
    a.click();
  } catch (error) {
    console.error('Template download failed:', error);
  }
};
```

### 2. Upload Filled Template
```javascript
import { importMembers } from '@/services/api/members.service';

const handleUpload = async (file) => {
  try {
    const result = await importMembers(file);
    
    console.log(`Created: ${result.summary.created}`);
    console.log(`Rejected: ${result.summary.rejected}`);
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        console.error(`Row ${error.rowNumber}: ${error.messageEn}`);
      });
    }
  } catch (error) {
    console.error('Import failed:', error);
  }
};
```

---

## 🧪 Testing

### Using cURL

**Download Template:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -o members_template.xlsx \
     http://localhost:8080/api/members/import/template
```

**Upload Data:**
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@members_filled.xlsx" \
     http://localhost:8080/api/members/import
```

### Using Postman

1. **Create New Request**: POST `{{baseUrl}}/api/members/import`
2. **Headers**: 
   - `Authorization`: `Bearer {{token}}`
3. **Body**: 
   - Select `form-data`
   - Key: `file`, Type: `File`
   - Choose Excel file
4. **Send**

---

## 🎯 Status Codes

| Code | Meaning | When |
|------|---------|------|
| `200` | OK | Import completed with some successes |
| `400` | Bad Request | Invalid file or zero records created |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User lacks import permission |
| `500` | Internal Server Error | Unexpected server error |

---

## 📚 Related Documentation

- [Architecture Overview](./EXCEL-TEMPLATE-IMPORT-ARCHITECTURE.md)
- [Frontend Integration Guide](./FRONTEND-INTEGRATION-GUIDE.md)
- [User Guide (Arabic)](./USER-GUIDE-AR.md)

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-03
