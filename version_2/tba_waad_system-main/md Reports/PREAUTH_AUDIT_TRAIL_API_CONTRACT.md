# 📜 PreAuthorization Audit Trail API Contract

**Module:** PreAuthorization Audit Trail (سجل تدقيق الموافقات المسبقة)  
**Status:** ✅ Backend Complete - Frontend Integration Needed  
**Version:** 1.0.0  
**Date:** 2025-12-31

---

## 🎯 Purpose

نظام سجل التدقيق لتتبع جميع التغييرات على الموافقات المسبقة لأغراض الامتثال واستكشاف الأخطاء.

**Features:**
- ✅ تتبع كامل للتغييرات (Field-level tracking)
- ✅ توثيق المستخدمين والطوابع الزمنية
- ✅ البحث والفلترة المتقدمة
- ✅ إحصائيات سجل التدقيق
- ✅ دعم التصدير

---

## 📋 Audit Actions (أنواع الإجراءات)

### Action Types

```java
public enum AuditAction {
    CREATE,          // إنشاء موافقة مسبقة جديدة
    UPDATE,          // تعديل حقول
    APPROVE,         // الموافقة على الطلب
    REJECT,          // رفض الطلب
    CANCEL,          // إلغاء الطلب
    DELETE,          // حذف (soft delete)
    STATUS_CHANGE    // تغيير الحالة العامة
}
```

### When Each Action is Logged

| Action | متى يُسجل | Fields Logged | Notes |
|--------|-----------|---------------|-------|
| **CREATE** | عند إنشاء PreAuth جديد | - | notes: "Created with requested amount: X" |
| **UPDATE** | عند تعديل أي حقل (status=PENDING) | fieldName, oldValue, newValue | فقط للتغييرات الفعلية |
| **APPROVE** | عند الموافقة (status→APPROVED) | - | notes: approval notes |
| **REJECT** | عند الرفض (status→REJECTED) | - | notes: rejection reason |
| **CANCEL** | عند الإلغاء (status→CANCELLED) | - | notes: cancel reason |
| **DELETE** | عند الحذف (active→false) | - | notes: "Soft deleted" |

---

## 📊 Field Registry

### Audit Record Fields

| Field | Arabic | Type | Description |
|-------|--------|------|-------------|
| **id** | المعرف | Long | Audit record ID (auto) |
| **preAuthorizationId** | رقم الموافقة | Long | FK to pre_authorizations |
| **referenceNumber** | رقم المرجع | String(50) | PA-YYYYMMDD-XXXXX (for quick lookup) |
| **changedBy** | المستخدم | String(100) | Username who made the change |
| **changeDate** | تاريخ التغيير | LocalDateTime | Auto-timestamp |
| **action** | الإجراء | Enum | CREATE, UPDATE, APPROVE, etc. |
| **fieldName** | اسم الحقل | String(50) | Field that changed (null for CREATE/DELETE) |
| **oldValue** | القيمة القديمة | TEXT | Previous value (null for CREATE) |
| **newValue** | القيمة الجديدة | TEXT | New value (null for DELETE) |
| **notes** | ملاحظات | String(500) | Additional context |
| **ipAddress** | عنوان IP | String(45) | Optional security tracking |

---

## 🔌 API Endpoints

### Base URL
```
/api/pre-authorizations
```

---

### 1. Get Audit History (Paginated)

**Endpoint:** `GET /api/pre-authorizations/{id}/history`  
**Permission:** `VIEW_PRE_AUTH`  
**Description:** الحصول على سجل التدقيق لموافقة مسبقة محددة (مع ترقيم الصفحات)

#### Request Parameters

```
?page=0&size=20
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Audit history retrieved successfully",
  "data": {
    "content": [
      {
        "id": 1001,
        "preAuthorizationId": 789,
        "referenceNumber": "PA-20250115-00123",
        "changedBy": "reviewer.user",
        "changeDate": "2025-01-15T14:20:00",
        "action": "APPROVE",
        "fieldName": null,
        "oldValue": null,
        "newValue": null,
        "notes": "Approved as per contract price",
        "ipAddress": "192.168.1.100"
      },
      {
        "id": 1000,
        "preAuthorizationId": 789,
        "referenceNumber": "PA-20250115-00123",
        "changedBy": "provider.user",
        "changeDate": "2025-01-15T10:30:00",
        "action": "CREATE",
        "fieldName": null,
        "oldValue": null,
        "newValue": null,
        "notes": "Created with requested amount: 500.00",
        "ipAddress": "192.168.1.50"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1
  }
}
```

---

### 2. Get Full Audit History (Non-Paginated)

**Endpoint:** `GET /api/pre-authorizations/{id}/history/full`  
**Permission:** `VIEW_PRE_AUTH`  
**Description:** الحصول على سجل التدقيق الكامل بدون ترقيم صفحات

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Full audit history retrieved successfully",
  "data": [
    { /* Same as paginated response items */ }
  ]
}
```

---

### 3. Get Audits by User

**Endpoint:** `GET /api/pre-authorizations/audits/user/{username}`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** الحصول على جميع سجلات التدقيق لمستخدم معين

#### Request Parameters

```
?page=0&size=20
```

#### Example

```
GET /api/pre-authorizations/audits/user/ahmad.ali?page=0&size=20
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "User audits retrieved successfully",
  "data": {
    "content": [
      {
        "id": 2001,
        "preAuthorizationId": 750,
        "referenceNumber": "PA-20250114-00100",
        "changedBy": "ahmad.ali",
        "changeDate": "2025-01-14T09:15:00",
        "action": "CREATE",
        "fieldName": null,
        "oldValue": null,
        "newValue": null,
        "notes": "Created with requested amount: 300.00",
        "ipAddress": "192.168.1.75"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 15,
    "totalPages": 1
  }
}
```

**Use Cases:**
- مراقبة نشاط مستخدم معين
- كشف التلاعب المحتمل
- تقارير المراجعة

---

### 4. Get Audits by Action

**Endpoint:** `GET /api/pre-authorizations/audits/action/{action}`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** الحصول على سجلات التدقيق حسب نوع الإجراء

#### Request Parameters

```
?page=0&size=20
```

#### Valid Action Values

```
CREATE, UPDATE, APPROVE, REJECT, CANCEL, DELETE, STATUS_CHANGE
```

#### Example

```
GET /api/pre-authorizations/audits/action/APPROVE?page=0&size=20
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Action audits retrieved successfully",
  "data": {
    "content": [
      {
        "id": 3001,
        "preAuthorizationId": 800,
        "referenceNumber": "PA-20250115-00150",
        "changedBy": "reviewer.user",
        "changeDate": "2025-01-15T16:00:00",
        "action": "APPROVE",
        "fieldName": null,
        "oldValue": null,
        "newValue": null,
        "notes": "Approved - standard coverage",
        "ipAddress": "192.168.1.100"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 45,
    "totalPages": 3
  }
}
```

**Use Cases:**
- تحليل جميع الموافقات
- مراجعة الرفض
- تتبع الإلغاءات

---

### 5. Get Recent Audits

**Endpoint:** `GET /api/pre-authorizations/audits/recent`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** الحصول على السجلات الحديثة (آخر N يوم)

#### Request Parameters

```
?days=7&page=0&size=20
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `days` | 7 | عدد الأيام للرجوع |
| `page` | 0 | رقم الصفحة |
| `size` | 20 | عدد العناصر لكل صفحة |

#### Example

```
GET /api/pre-authorizations/audits/recent?days=30&page=0&size=50
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Recent audits retrieved successfully",
  "data": {
    "content": [ /* Audit records from last 30 days */ ],
    "page": 0,
    "size": 50,
    "totalElements": 120,
    "totalPages": 3
  }
}
```

**Use Cases:**
- نشاط حديث (Recent Activity Timeline)
- مراقبة في الوقت الفعلي
- لوحة معلومات

---

### 6. Search Audits

**Endpoint:** `GET /api/pre-authorizations/audits/search`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** البحث في سجلات التدقيق بالنص

#### Request Parameters

```
?query=approved&page=0&size=20
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | ✔️ Yes | نص البحث (في: notes, referenceNumber, changedBy) |
| `page` | ❌ No | Default: 0 |
| `size` | ❌ No | Default: 20 |

#### Example

```
GET /api/pre-authorizations/audits/search?query=rejected&page=0&size=20
```

#### Search Fields

البحث يتم في:
- `notes`
- `referenceNumber`
- `changedBy`
- `oldValue`
- `newValue`

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Search results retrieved successfully",
  "data": {
    "content": [
      {
        "id": 4001,
        "preAuthorizationId": 850,
        "referenceNumber": "PA-20250115-00200",
        "changedBy": "reviewer.user",
        "changeDate": "2025-01-15T17:30:00",
        "action": "REJECT",
        "fieldName": null,
        "oldValue": null,
        "newValue": null,
        "notes": "Service not covered by policy",
        "ipAddress": "192.168.1.100"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 8,
    "totalPages": 1
  }
}
```

---

### 7. Get Audit Statistics

**Endpoint:** `GET /api/pre-authorizations/audits/statistics`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** إحصائيات سجل التدقيق (عدد الإجراءات)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "totalAudits": 1250,
    "createCount": 500,
    "updateCount": 180,
    "approveCount": 320,
    "rejectCount": 150,
    "cancelCount": 80,
    "deleteCount": 20
  }
}
```

#### Use Cases

- تقارير شاملة
- مراقبة الأداء
- مؤشرات KPI
- لوحة معلومات إدارية

---

## 📝 Audit Logging Examples

### Example 1: CREATE Action

**Trigger:** `POST /api/pre-authorizations` (successful creation)

**Logged:**
```json
{
  "preAuthorizationId": 789,
  "referenceNumber": "PA-20250115-00123",
  "changedBy": "ahmad.ali",
  "action": "CREATE",
  "fieldName": null,
  "oldValue": null,
  "newValue": null,
  "notes": "Created with requested amount: 500.00"
}
```

---

### Example 2: UPDATE Action (Field Change)

**Trigger:** `PUT /api/pre-authorizations/{id}` (update requestedAmount)

**Logged:**
```json
{
  "preAuthorizationId": 789,
  "referenceNumber": "PA-20250115-00123",
  "changedBy": "provider.user",
  "action": "UPDATE",
  "fieldName": "requestedAmount",
  "oldValue": "500.00",
  "newValue": "550.00",
  "notes": null
}
```

**Notes:**
- يتم تسجيل كل حقل متغير بشكل منفصل
- إذا تغيرت عدة حقول، يتم إنشاء سجلات متعددة

---

### Example 3: APPROVE Action

**Trigger:** `POST /api/pre-authorizations/{id}/approve`

**Logged:**
```json
{
  "preAuthorizationId": 789,
  "referenceNumber": "PA-20250115-00123",
  "changedBy": "reviewer.user",
  "action": "APPROVE",
  "fieldName": null,
  "oldValue": null,
  "newValue": null,
  "notes": "Approved as per contract price"
}
```

**Additional Field Updates (logged separately):**
```json
// Status change
{
  "action": "UPDATE",
  "fieldName": "status",
  "oldValue": "PENDING",
  "newValue": "APPROVED"
}

// Approved amount
{
  "action": "UPDATE",
  "fieldName": "approvedAmount",
  "oldValue": null,
  "newValue": "450.00"
}

// Copay amount
{
  "action": "UPDATE",
  "fieldName": "copayAmount",
  "oldValue": "0.00",
  "newValue": "90.00"
}
```

---

### Example 4: REJECT Action

**Trigger:** `POST /api/pre-authorizations/{id}/reject`

**Logged:**
```json
{
  "preAuthorizationId": 789,
  "referenceNumber": "PA-20250115-00123",
  "changedBy": "reviewer.user",
  "action": "REJECT",
  "fieldName": null,
  "oldValue": null,
  "newValue": null,
  "notes": "Service not covered by policy"
}
```

---

### Example 5: CANCEL Action

**Trigger:** `POST /api/pre-authorizations/{id}/cancel?reason=Patient cancelled appointment`

**Logged:**
```json
{
  "preAuthorizationId": 789,
  "referenceNumber": "PA-20250115-00123",
  "changedBy": "provider.user",
  "action": "CANCEL",
  "fieldName": null,
  "oldValue": null,
  "newValue": null,
  "notes": "Patient cancelled appointment"
}
```

---

### Example 6: DELETE Action

**Trigger:** `DELETE /api/pre-authorizations/{id}`

**Logged:**
```json
{
  "preAuthorizationId": 789,
  "referenceNumber": "PA-20250115-00123",
  "changedBy": "admin.user",
  "action": "DELETE",
  "fieldName": null,
  "oldValue": null,
  "newValue": null,
  "notes": "Soft deleted"
}
```

---

## 🔍 Filtering & Search Capabilities

### Available Filters

| Filter Type | Endpoint | Parameters | Use Case |
|-------------|----------|------------|----------|
| **By PreAuth ID** | `/{id}/history` | - | تاريخ موافقة مسبقة محددة |
| **By User** | `/audits/user/{username}` | username | نشاط مستخدم معين |
| **By Action** | `/audits/action/{action}` | action | جميع الموافقات/الرفض |
| **By Date Range** | `/audits/recent` | days | آخر N يوم |
| **By Text Search** | `/audits/search` | query | بحث عام |

### Combined Filtering (Frontend Implementation)

```javascript
// Example: Get all APPROVE actions by specific user in last 30 days
// Step 1: Get user audits
GET /api/pre-authorizations/audits/user/reviewer.user?page=0&size=1000

// Step 2: Filter client-side
const approvals = response.data.content.filter(audit => 
  audit.action === 'APPROVE' && 
  isWithinDays(audit.changeDate, 30)
);
```

**Note:** للأداء الأفضل، يمكن إضافة endpoints مخصصة للفلاتر المركبة لاحقاً.

---

## 📊 Data Export (Future Enhancement)

### Export to Excel (Planned)

**Endpoint:** `POST /api/pre-authorizations/audits/export` (To be implemented)

**Request:**
```json
{
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "action": "APPROVE",
    "username": null
  },
  "format": "EXCEL"
}
```

**Response:**
- Binary file download (Excel)
- Columns: ID, Reference, User, Date, Action, Field, Old Value, New Value, Notes

---

## 🔒 Permissions

| Endpoint | Permission | Roles |
|----------|------------|-------|
| GET /{id}/history | VIEW_PRE_AUTH | ALL_AUTHENTICATED |
| GET /{id}/history/full | VIEW_PRE_AUTH | ALL_AUTHENTICATED |
| GET /audits/user/{username} | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /audits/action/{action} | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /audits/recent | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /audits/search | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /audits/statistics | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |

**Security Notes:**
- User audits may be restricted to own actions (based on role)
- ADMIN can see all audit logs
- IP address logging for enhanced security

---

## 🧪 Frontend Integration Guide

### 1. Audit Timeline Component

```jsx
// Component: AuditTimeline.jsx
import { useEffect, useState } from 'react';
import { getAuditHistory } from 'services/api/preauth-audit.service';

const AuditTimeline = ({ preAuthId }) => {
  const [audits, setAudits] = useState([]);
  
  useEffect(() => {
    async function fetchAudits() {
      const response = await getAuditHistory(preAuthId);
      setAudits(response.data);
    }
    fetchAudits();
  }, [preAuthId]);
  
  return (
    <Timeline>
      {audits.map(audit => (
        <TimelineItem key={audit.id}>
          <TimelineOppositeContent>
            {formatDate(audit.changeDate)}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color={getActionColor(audit.action)} />
            <TimelineConnector />
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="h6">{audit.action}</Typography>
            <Typography color="textSecondary">{audit.changedBy}</Typography>
            {audit.fieldName && (
              <Typography variant="body2">
                {audit.fieldName}: {audit.oldValue} → {audit.newValue}
              </Typography>
            )}
            {audit.notes && <Typography>{audit.notes}</Typography>}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};
```

---

### 2. Audit Search Component

```jsx
// Component: AuditSearch.jsx
const AuditSearch = () => {
  const [filters, setFilters] = useState({
    action: '',
    username: '',
    days: 7,
    searchQuery: ''
  });
  
  const handleSearch = async () => {
    let response;
    
    if (filters.searchQuery) {
      response = await searchAudits(filters.searchQuery);
    } else if (filters.action) {
      response = await getAuditsByAction(filters.action);
    } else if (filters.username) {
      response = await getAuditsByUser(filters.username);
    } else {
      response = await getRecentAudits(filters.days);
    }
    
    setAudits(response.data.content);
  };
  
  return (
    <Box>
      <FormControl>
        <Select value={filters.action} onChange={...}>
          <MenuItem value="">All Actions</MenuItem>
          <MenuItem value="CREATE">Create</MenuItem>
          <MenuItem value="APPROVE">Approve</MenuItem>
          <MenuItem value="REJECT">Reject</MenuItem>
        </Select>
      </FormControl>
      
      <TextField 
        label="Username" 
        value={filters.username}
        onChange={...}
      />
      
      <TextField 
        label="Search" 
        value={filters.searchQuery}
        onChange={...}
      />
      
      <Button onClick={handleSearch}>Search</Button>
    </Box>
  );
};
```

---

### 3. Statistics Widget

```jsx
// Component: AuditStatsWidget.jsx
const AuditStatsWidget = () => {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    async function fetchStats() {
      const response = await getAuditStatistics();
      setStats(response.data);
    }
    fetchStats();
  }, []);
  
  return (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <StatCard 
          title="Total Audits" 
          value={stats?.totalAudits} 
          icon={<ListIcon />}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <StatCard 
          title="Approvals" 
          value={stats?.approveCount}
          color="success"
          icon={<CheckIcon />}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <StatCard 
          title="Rejections" 
          value={stats?.rejectCount}
          color="error"
          icon={<CloseIcon />}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <StatCard 
          title="Updates" 
          value={stats?.updateCount}
          color="info"
          icon={<EditIcon />}
        />
      </Grid>
    </Grid>
  );
};
```

---

## 📚 Related Documents

- [PreAuthorization API Contract](./PREAUTHORIZATION_API_CONTRACT.md)
- [PreAuth Analytics API Contract](./PREAUTH_ANALYTICS_API_CONTRACT.md)
- [API Contract Status Report](./API_CONTRACT_STATUS_COMPREHENSIVE.md)

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-31 | Initial version |

---

**Status:** ✅ Backend Complete - Ready for Frontend Integration  
**Next Steps:**
1. Create Audit Timeline UI component
2. Add filters and search functionality
3. Implement Export to Excel feature
4. Add real-time audit notifications

---

*This document defines the complete API contract for PreAuthorization Audit Trail. All implementations must adhere to this specification.*
