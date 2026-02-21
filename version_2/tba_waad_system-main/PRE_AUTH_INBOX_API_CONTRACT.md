# 🔒 عقد API - صندوق الوارد للموافقات المسبقة (API CONTRACT)

**التاريخ:** 2026-01-25  
**النوع:** API Contract Definition  
**الحالة:** CANONICAL - يجب الالتزام به

---

## 📋 نظرة عامة

هذا المستند يُحدد **العقد الرسمي** بين Backend و Frontend لـ Inbox API.  
**لا يُسمح بالتخمين أو الافتراضات في Frontend!**

---

## 🎯 Endpoint Specification

### Request

```http
GET /api/pre-authorizations/inbox/pending?page={page}&size={size}&sortBy={sortBy}&sortDir={sortDir}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | `1` | رقم الصفحة (1-based) |
| `size` | integer | No | `20` | عدد السجلات في الصفحة |
| `sortBy` | string | No | `createdAt` | اسم الحقل للترتيب |
| `sortDir` | string | No | `ASC` | اتجاه الترتيب (`ASC` أو `DESC`) |

#### Example Request

```http
GET /api/pre-authorizations/inbox/pending?page=1&size=20&sortBy=createdAt&sortDir=ASC
Authorization: Bearer {token}
```

---

### Response Structure

```typescript
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

interface PageResponse<T> {
  content: T[];           // البيانات الفعلية
  totalElements: number;  // إجمالي عدد السجلات
  totalPages: number;     // إجمالي عدد الصفحات
  number: number;         // رقم الصفحة الحالية (0-based)
  size: number;           // حجم الصفحة
  first: boolean;         // هل هذه أول صفحة؟
  last: boolean;          // هل هذه آخر صفحة؟
  empty: boolean;         // هل الصفحة فارغة؟
}
```

#### Actual Backend Response (Spring Page)

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "referenceNumber": "PA-20260125-67862",
        "visitId": 123,
        "visitDate": "2026-01-25",
        "visitType": "CONSULTATION",
        "memberId": 456,
        "memberName": "أحمد محمد علي",
        "memberCardNumber": "CARD-001",
        "memberNationalNumber": "123456789",
        "employerId": 789,
        "employerName": "شركة الأمل",
        "employerCode": "EMP-001",
        "providerId": 101,
        "providerName": "مستشفى الوحدة",
        "providerLicense": "LIC-101",
        "medicalServiceId": 202,
        "serviceCode": "SRV-001",
        "serviceName": "جنس الاسنبز",
        "serviceNameEn": "Dental Extraction",
        "serviceCategoryId": 303,
        "serviceCategoryName": "طب الأسنان",
        "requiresPA": true,
        "diagnosisCode": "K04.5",
        "diagnosisDescription": "التهاب اللثة",
        "requestDate": "2026-01-25",
        "expiryDate": "2026-02-25",
        "daysUntilExpiry": 31,
        "contractPrice": 50.00,
        "approvedAmount": null,
        "copayAmount": null,
        "copayPercentage": 10.0,
        "insuranceCoveredAmount": null,
        "currency": "LYD",
        "status": "PENDING",
        "priority": "ROUTINE",
        "notes": null,
        "rejectionReason": null,
        "hasContract": true,
        "isValid": true,
        "isExpired": false,
        "canBeApproved": true,
        "canBeRejected": true,
        "canBeCancelled": true,
        "createdAt": "2026-01-25T10:30:00",
        "updatedAt": "2026-01-25T10:30:00",
        "createdBy": "provider_user",
        "updatedBy": "provider_user",
        "approvedAt": null,
        "approvedBy": null,
        "active": true
      }
    ],
    "totalElements": 4,
    "totalPages": 1,
    "number": 0,
    "size": 20,
    "first": true,
    "last": true,
    "empty": false
  }
}
```

---

## 📊 Backend DTO Definition

### PreAuthorizationResponseDto (CANONICAL)

**المصدر:** `backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationResponseDto.java`

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreAuthorizationResponseDto {
    
    // ==================== CORE ====================
    private Long id;                    // ✅ ALWAYS present
    private String referenceNumber;     // ✅ ALWAYS present
    
    // ==================== VISIT ====================
    private Long visitId;               // ✅ ALWAYS present (mandatory FK)
    private LocalDate visitDate;        // ✅ ALWAYS present
    private String visitType;           // ✅ ALWAYS present
    
    // ==================== MEMBER ====================
    private Long memberId;              // ✅ ALWAYS present
    private String memberName;          // ✅ ALWAYS present
    private String memberCardNumber;    // ⚠️ MAY be null
    private String memberNationalNumber;// ⚠️ MAY be null
    
    // ==================== EMPLOYER ====================
    private Long employerId;            // ✅ ALWAYS present
    private String employerName;        // ✅ ALWAYS present
    private String employerCode;        // ✅ ALWAYS present
    
    // ==================== PROVIDER ====================
    private Long providerId;            // ✅ ALWAYS present
    private String providerName;        // ✅ ALWAYS present
    private String providerLicense;     // ⚠️ MAY be null
    
    // ==================== SERVICE ====================
    private Long medicalServiceId;      // ✅ ALWAYS present
    private String serviceCode;         // ✅ ALWAYS present
    private String serviceName;         // ✅ ALWAYS present (Arabic)
    private String serviceNameEn;       // ⚠️ MAY be null
    private Long serviceCategoryId;     // ✅ ALWAYS present
    private String serviceCategoryName; // ✅ ALWAYS present
    private Boolean requiresPA;         // ✅ ALWAYS present
    
    // ==================== DIAGNOSIS ====================
    private String diagnosisCode;       // ⚠️ MAY be null
    private String diagnosisDescription;// ⚠️ MAY be null
    
    // ==================== DATES ====================
    private LocalDate requestDate;      // ✅ ALWAYS present
    private LocalDate expiryDate;       // ⚠️ MAY be null
    private Integer daysUntilExpiry;    // ⚠️ MAY be null
    
    // ==================== PRICING ====================
    private BigDecimal contractPrice;   // ✅ ALWAYS present (from Contract)
    private BigDecimal approvedAmount;  // ❌ NULL until approved
    private BigDecimal copayAmount;     // ❌ NULL until approved
    private BigDecimal copayPercentage; // ✅ ALWAYS present
    private BigDecimal insuranceCoveredAmount; // ❌ NULL until approved
    private String currency;            // ✅ ALWAYS present (default: "LYD")
    
    // ==================== STATUS ====================
    private String status;              // ✅ ALWAYS present (enum)
    private String priority;            // ✅ ALWAYS present (enum)
    
    // ==================== ADDITIONAL ====================
    private String notes;               // ⚠️ MAY be null
    private String rejectionReason;     // ❌ NULL until rejected
    
    // ==================== FLAGS ====================
    private Boolean hasContract;        // ✅ ALWAYS present
    private Boolean isValid;            // ✅ ALWAYS present
    private Boolean isExpired;          // ✅ ALWAYS present
    private Boolean canBeApproved;      // ✅ ALWAYS present
    private Boolean canBeRejected;      // ✅ ALWAYS present
    private Boolean canBeCancelled;     // ✅ ALWAYS present
    
    // ==================== AUDIT ====================
    private LocalDateTime createdAt;    // ✅ ALWAYS present
    private LocalDateTime updatedAt;    // ✅ ALWAYS present
    private String createdBy;           // ✅ ALWAYS present
    private String updatedBy;           // ✅ ALWAYS present
    private LocalDateTime approvedAt;   // ❌ NULL until approved
    private String approvedBy;          // ❌ NULL until approved
    private Boolean active;             // ✅ ALWAYS present
}
```

### Field Guarantees

| Symbol | Meaning |
|--------|---------|
| ✅ | **ALWAYS** present - never null |
| ⚠️ | **MAY** be null - handle null safely |
| ❌ | **NULL** until condition met (e.g., approval) |

---

## 🚫 Frontend Rules (STRICT)

### ❌ FORBIDDEN - لا يُسمح بالتالي:

#### 1. **No Fallbacks or Assumptions**
```javascript
// ❌ BAD - التخمين والافتراضات
valueGetter: (value, row) => 
  row?.memberName || row?.memberFullName || row?.name || 'Unknown'

// ❌ BAD - استخدام حقول غير موجودة في DTO
valueGetter: (value, row) => 
  row?.requestedAmount || row?.amount  // requestedAmount لا يوجد في DTO!

// ❌ BAD - افتراض بنية مختلفة
const amount = row.pricing?.contractPrice || 0  // pricing ليس object!
```

#### 2. **No Data Transformation in UI**
```javascript
// ❌ BAD - حساب البيانات في Frontend
const copay = contractPrice * 0.10;  // يجب أن يأتي من Backend!

// ❌ BAD - استنتاج الحالة
const isExpired = new Date(expiryDate) < new Date();  // يوجد isExpired في DTO!
```

#### 3. **No Magic Strings**
```javascript
// ❌ BAD - hardcoded labels
const statusLabel = status === 'PENDING' ? 'قيد المراجعة' : 'آخر';

// ✅ GOOD - استخدام mapping من Backend أو constants
const STATUS_LABELS = {
  PENDING: 'قيد المراجعة',
  APPROVED: 'موافق عليه',
  // ... يجب أن يأتي من Backend أو constants file
};
```

### ✅ ALLOWED - المسموح به:

#### 1. **Direct Field Access Only**
```javascript
// ✅ GOOD - استخدام الحقول كما هي
const columns = [
  {
    field: 'referenceNumber',
    headerName: 'رقم المرجع',
    valueGetter: (value, row) => row.referenceNumber  // مباشرة من DTO
  },
  {
    field: 'memberName',
    headerName: 'اسم المؤمن عليه',
    valueGetter: (value, row) => row.memberName  // مباشرة من DTO
  }
];
```

#### 2. **Null Handling Only**
```javascript
// ✅ GOOD - معالجة null فقط
valueGetter: (value, row) => row.memberCardNumber || '-'  // عرض "-" إذا null

// ✅ GOOD - التحقق من null
{row.diagnosisDescription ? row.diagnosisDescription : 'غير محدد'}
```

#### 3. **Formatting Only (No Logic)**
```javascript
// ✅ GOOD - تنسيق فقط
valueGetter: (value, row) => {
  return row.contractPrice 
    ? `${Number(row.contractPrice).toFixed(2)} ${row.currency}` 
    : '-';
}

// ✅ GOOD - تنسيق التاريخ
valueGetter: (value, row) => {
  return row.requestDate 
    ? new Date(row.requestDate).toLocaleDateString('ar-LY')
    : '-';
}
```

---

## 📐 Frontend Implementation Rules

### Rule 1: Use Exact DTO Field Names

```typescript
// ✅ CORRECT - استخدام الأسماء الصحيحة
interface PreApprovalRow {
  id: number;
  referenceNumber: string;
  memberName: string;
  serviceName: string;
  contractPrice: number;
  status: string;
  priority: string;
  // ... exact DTO fields
}
```

### Rule 2: No Data Mapping (Use DTO As-Is)

```javascript
// ❌ WRONG - تحويل البيانات
const displayData = response.data.content.map(item => ({
  refNo: item.referenceNumber,  // ❌ تغيير الاسم
  member: item.memberName,      // ❌ تغيير الاسم
  amount: item.contractPrice    // ❌ تغيير الاسم
}));

// ✅ CORRECT - استخدام DTO مباشرة
setPreApprovals(response.data.content);  // كما هو من Backend
```

### Rule 3: Backend is Single Source of Truth

```javascript
// ❌ WRONG - حساب في Frontend
const canApprove = status === 'PENDING' && isValid;

// ✅ CORRECT - استخدام flag من Backend
const canApprove = row.canBeApproved;  // Backend يحدد
```

### Rule 4: Display Flags, Not Logic

```javascript
// ❌ WRONG - منطق في UI
if (status === 'APPROVED' && approvedAmount > 0) {
  // show approval info
}

// ✅ CORRECT - استخدام flags من Backend
if (row.status === 'APPROVED') {
  // Backend يضمن أن approvedAmount موجود
  <span>{row.approvedAmount} {row.currency}</span>
}
```

---

## 🔍 Validation Checklist

عند تطوير Frontend، تحقق من:

- [ ] **No fallback chains** (`field1 || field2 || field3`)
- [ ] **No assumed fields** (fields not in DTO)
- [ ] **No calculations** (use Backend-provided values)
- [ ] **No status inference** (use Backend flags)
- [ ] **No hardcoded enums** (use constants or Backend)
- [ ] **Exact DTO field names** (no renaming)
- [ ] **Proper null handling** (display placeholder, not crash)

---

## 🎯 Correct Frontend Example

```jsx
// ✅ CORRECT IMPLEMENTATION
const columns = [
  {
    field: 'referenceNumber',
    headerName: 'رقم المرجع',
    width: 150,
    valueGetter: (value, row) => row.referenceNumber || '-'
  },
  {
    field: 'memberName',
    headerName: 'المؤمن عليه',
    width: 200,
    valueGetter: (value, row) => row.memberName || '-'
  },
  {
    field: 'serviceName',
    headerName: 'الخدمة',
    width: 180,
    valueGetter: (value, row) => row.serviceName || '-'
  },
  {
    field: 'contractPrice',
    headerName: 'المبلغ',
    width: 120,
    valueGetter: (value, row) => {
      return row.contractPrice 
        ? `${Number(row.contractPrice).toFixed(2)} ${row.currency}`
        : '-';
    }
  },
  {
    field: 'priority',
    headerName: 'الأولوية',
    width: 100,
    renderCell: (params) => {
      const priority = params.row.priority;
      if (priority === 'EMERGENCY') {
        return <Chip label="طارئ" color="error" size="small" />;
      }
      if (priority === 'URGENT') {
        return <Chip label="عاجل" color="warning" size="small" />;
      }
      return <Chip label="عادي" color="default" size="small" />;
    }
  },
  {
    field: 'status',
    headerName: 'الحالة',
    width: 120,
    renderCell: (params) => {
      // Use exact status from Backend
      const statusConfig = {
        'PENDING': { label: 'معلق', color: 'warning' },
        'APPROVED': { label: 'موافق', color: 'success' },
        'REJECTED': { label: 'مرفوض', color: 'error' }
      };
      const config = statusConfig[params.row.status] || statusConfig.PENDING;
      return <Chip label={config.label} color={config.color} size="small" />;
    }
  },
  {
    field: 'actions',
    headerName: 'الإجراءات',
    width: 150,
    renderCell: (params) => (
      <Stack direction="row" spacing={1}>
        {/* Use Backend flags */}
        {params.row.canBeApproved && (
          <IconButton size="small" color="success">
            <CheckIcon />
          </IconButton>
        )}
        {params.row.canBeRejected && (
          <IconButton size="small" color="error">
            <CloseIcon />
          </IconButton>
        )}
      </Stack>
    )
  }
];
```

---

## 📝 Error Response Contract

### Error Structure

```json
{
  "success": false,
  "message": "خطأ في جلب البيانات",
  "error": "RESOURCE_NOT_FOUND",
  "details": "Pre-authorization not found with id: 123",
  "timestamp": "2026-01-25T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Frontend Action |
|------|---------|-----------------|
| 200 | Success | Display data |
| 400 | Bad Request | Show validation errors |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show access denied |
| 404 | Not Found | Show not found message |
| 500 | Server Error | Show generic error |

---

## 🔐 Security Notes

1. **Always include Authorization header**
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```

2. **Validate permissions on Backend** (not Frontend)
3. **Never trust Frontend validation** (Backend must validate)

---

## 📊 Performance Guidelines

1. **Page Size:** Default 20, max 100
2. **Caching:** Use React Query or SWR with 5min cache
3. **Polling:** Avoid auto-refresh, use manual refresh button
4. **Lazy Loading:** Load data on mount, not before

---

## ✅ Compliance Checklist

Frontend Developer must ensure:

- [x] Using exact DTO field names
- [x] No data transformation or mapping
- [x] No fallback chains for different fields
- [x] No calculations (use Backend values)
- [x] No assumed fields (only DTO fields)
- [x] Proper null handling (display "-" not crash)
- [x] Using Backend flags for business logic
- [x] No hardcoded status labels (use constants)
- [x] Proper error handling
- [x] Authorization header included

---

## 📚 Related Documents

- [PRE_AUTH_FINAL_FIX.md](./PRE_AUTH_FINAL_FIX.md) - Pagination fix
- [PreAuthorizationResponseDto.java](backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationResponseDto.java) - Backend DTO
- [PreAuthorizationController.java](backend/src/main/java/com/waad/tba/modules/preauthorization/controller/PreAuthorizationController.java) - Backend API

---

**🔒 هذا العقد ملزم ويجب الالتزام به!**  
**أي انحراف عن هذا العقد يُعتبر خطأ ويجب إصلاحه.**

