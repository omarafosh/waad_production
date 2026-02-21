# 📜 PreAuthorization Analytics Dashboard API Contract

**Module:** PreAuthorization Analytics & Dashboard (لوحة تحليلات الموافقات المسبقة)  
**Status:** ✅ Backend Complete - Frontend Integration Needed  
**Version:** 1.0.0  
**Date:** 2025-12-31

---

## 🎯 Purpose

لوحة معلومات تحليلية شاملة لـ PreAuthorization تعرض:
- ✅ إحصائيات عامة (Overall Statistics)
- ✅ توزيع الحالات (Status Distribution) - Pie Chart
- ✅ قائمة الأولوية العالية (High Priority Queue)
- ✅ تنبيهات الانتهاء القريب (Expiring Soon Alerts)
- ✅ اتجاهات 30 يوم (Trends) - Line Chart
- ✅ أفضل مقدمي الخدمة (Top Providers) - Bar Chart
- ✅ النشاط الحديث (Recent Activity) - Timeline

---

## 📐 Architecture

```
Dashboard Request → PreAuthDashboardService → Multiple Data Sources
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   Statistics       Distributions       Trends (30 days)
        ↓                  ↓                  ↓
   Top Providers    High Priority    Expiring Soon
        ↓                  ↓                  ↓
              Recent Activity (Audit Log)
                           ↓
                    Dashboard DTO
```

---

## 📊 Dashboard Widgets

### Widget 1: Overall Statistics (إحصائيات عامة)

**Purpose:** ملخص شامل للأرقام الرئيسية

**Data:**
- عدد الموافقات الكلي
- عدد PENDING, APPROVED, REJECTED
- المبالغ (مطلوبة، موافق عليها، متوسط)
- نسب الموافقة والرفض

---

### Widget 2: Status Distribution (توزيع الحالات)

**Purpose:** توزيع الموافقات حسب الحالة (Pie Chart)

**Data:**
- عدد كل حالة: PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED
- المبالغ لكل حالة

**Chart Type:** Pie/Donut Chart

---

### Widget 3: High Priority Queue (قائمة الأولوية العالية)

**Purpose:** الموافقات EMERGENCY + URGENT التي تحتاج اهتمام فوري

**Data:**
- PreAuth مع priority = EMERGENCY or URGENT
- status = PENDING (في انتظار المراجعة)
- مرتبة حسب الأولوية ثم التاريخ

**Chart Type:** Data Table

---

### Widget 4: Expiring Soon (تنبيهات الانتهاء القريب)

**Purpose:** تنبيه للموافقات التي ستنتهي صلاحيتها قريباً

**Data:**
- Approved PreAuths with expiryDate within 7 days
- مرتبة حسب expiryDate (الأقرب أولاً)

**Chart Type:** Alert Cards / Table

---

### Widget 5: Trends (اتجاهات 30 يوم)

**Purpose:** اتجاه الموافقات خلال آخر 30 يوم

**Data:**
- Daily count: Created, Approved, Rejected
- Daily amounts: Total, Approved

**Chart Type:** Line Chart (Multi-series)

---

### Widget 6: Top Providers (أفضل مقدمي الخدمة)

**Purpose:** مقدمو الخدمة الأكثر نشاطاً ونسب الموافقة

**Data:**
- Provider name
- Total PreAuths count
- Approved count
- Approval rate (%)
- Total approved amount

**Chart Type:** Bar Chart (Horizontal)

---

### Widget 7: Recent Activity (النشاط الحديث)

**Purpose:** آخر الإجراءات على الموافقات

**Data:**
- Last 10 audit actions
- From PreAuthorization Audit Log

**Chart Type:** Timeline / Activity Feed

---

## 🔌 API Endpoints

### Base URL
```
/api/pre-authorizations/dashboard
```

---

### 1. Get Complete Dashboard

**Endpoint:** `GET /api/pre-authorizations/dashboard`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** الحصول على لوحة المعلومات الكاملة (جميع Widgets)

#### Request Parameters

```
?trendDays=30&topProviders=10
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `trendDays` | 30 | عدد الأيام للاتجاهات |
| `topProviders` | 10 | عدد أفضل مقدمي الخدمة |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "overallStats": {
      "totalCount": 1250,
      "pendingCount": 180,
      "approvedCount": 820,
      "rejectedCount": 150,
      "totalRequestedAmount": 625000.00,
      "totalApprovedAmount": 492000.00,
      "averageApprovedAmount": 600.00,
      "approvalRate": 65.6,
      "rejectionRate": 12.0
    },
    "statusDistribution": {
      "pending": 180,
      "approved": 820,
      "rejected": 150,
      "cancelled": 80,
      "expired": 20,
      "underReview": 0,
      "pendingAmount": 90000.00,
      "approvedAmount": 492000.00,
      "rejectedAmount": 75000.00
    },
    "highPriorityQueue": [
      {
        "id": 901,
        "referenceNumber": "PA-20250115-00250",
        "memberName": "أحمد محمد علي",
        "providerName": "مستشفى الواحة",
        "serviceName": "عملية جراحية طارئة",
        "requestedAmount": 5000.00,
        "status": "PENDING",
        "priority": "EMERGENCY",
        "expiryDate": "2025-01-20",
        "daysUntilExpiry": 5
      },
      {
        "id": 902,
        "referenceNumber": "PA-20250115-00251",
        "memberName": "فاطمة أحمد",
        "providerName": "مستشفى النور",
        "serviceName": "تصوير بالرنين المغناطيسي",
        "requestedAmount": 800.00,
        "status": "PENDING",
        "priority": "URGENT",
        "expiryDate": "2025-01-18",
        "daysUntilExpiry": 3
      }
    ],
    "expiringSoon": [
      {
        "id": 850,
        "referenceNumber": "PA-20250110-00200",
        "memberName": "محمد علي",
        "providerName": "عيادة الأسنان",
        "serviceName": "تنظيف الأسنان",
        "requestedAmount": 200.00,
        "status": "APPROVED",
        "priority": "NORMAL",
        "expiryDate": "2025-01-16",
        "daysUntilExpiry": 1
      }
    ],
    "trends": [
      {
        "date": "2025-01-15",
        "created": 45,
        "approved": 38,
        "rejected": 5,
        "totalAmount": 22500.00,
        "approvedAmount": 19000.00
      },
      {
        "date": "2025-01-14",
        "created": 52,
        "approved": 41,
        "rejected": 8,
        "totalAmount": 26000.00,
        "approvedAmount": 20500.00
      }
      // ... 28 more days
    ],
    "topProviders": [
      {
        "providerId": 101,
        "providerName": "مستشفى الواحة",
        "licenseNumber": "PRV-001",
        "totalPreAuths": 320,
        "approvedCount": 280,
        "totalApprovedAmount": 168000.00,
        "approvalRate": 87.5
      },
      {
        "providerId": 102,
        "providerName": "مستشفى النور",
        "licenseNumber": "PRV-002",
        "totalPreAuths": 250,
        "approvedCount": 200,
        "totalApprovedAmount": 120000.00,
        "approvalRate": 80.0
      }
      // ... 8 more providers
    ],
    "recentActivity": [
      {
        "preAuthId": 905,
        "referenceNumber": "PA-20250115-00255",
        "action": "APPROVED",
        "actionBy": "reviewer.user",
        "timestamp": "2025-01-15T16:45:00",
        "notes": "Approved - standard coverage"
      },
      {
        "preAuthId": 904,
        "referenceNumber": "PA-20250115-00254",
        "action": "REJECTED",
        "actionBy": "reviewer.user",
        "timestamp": "2025-01-15T16:30:00",
        "notes": "Service not covered"
      }
      // ... 8 more activities
    ]
  }
}
```

---

### 2. Get Overall Statistics Only

**Endpoint:** `GET /api/pre-authorizations/dashboard/stats`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** الحصول على الإحصائيات العامة فقط

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "totalCount": 1250,
    "pendingCount": 180,
    "approvedCount": 820,
    "rejectedCount": 150,
    "totalRequestedAmount": 625000.00,
    "totalApprovedAmount": 492000.00,
    "averageApprovedAmount": 600.00,
    "approvalRate": 65.6,
    "rejectionRate": 12.0
  }
}
```

**Calculations:**
```javascript
approvalRate = (approvedCount / totalCount) * 100
rejectionRate = (rejectedCount / totalCount) * 100
averageApprovedAmount = totalApprovedAmount / approvedCount
```

---

### 3. Get Status Distribution

**Endpoint:** `GET /api/pre-authorizations/dashboard/status-distribution`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** توزيع الحالات (لـ Pie Chart)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Status distribution retrieved successfully",
  "data": {
    "pending": 180,
    "approved": 820,
    "rejected": 150,
    "cancelled": 80,
    "expired": 20,
    "underReview": 0,
    "pendingAmount": 90000.00,
    "approvedAmount": 492000.00,
    "rejectedAmount": 75000.00
  }
}
```

**Chart Data Format (Recharts):**
```javascript
const pieChartData = [
  { name: 'Approved', value: 820, color: '#4caf50' },
  { name: 'Pending', value: 180, color: '#ff9800' },
  { name: 'Rejected', value: 150, color: '#f44336' },
  { name: 'Cancelled', value: 80, color: '#9e9e9e' },
  { name: 'Expired', value: 20, color: '#607d8b' }
];
```

---

### 4. Get High Priority Queue

**Endpoint:** `GET /api/pre-authorizations/dashboard/high-priority`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** الموافقات ذات الأولوية العالية (EMERGENCY + URGENT)

#### Request Parameters

```
?limit=10
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "High priority queue retrieved successfully",
  "data": [
    {
      "id": 901,
      "referenceNumber": "PA-20250115-00250",
      "memberName": "أحمد محمد علي",
      "providerName": "مستشفى الواحة",
      "serviceName": "عملية جراحية طارئة",
      "requestedAmount": 5000.00,
      "status": "PENDING",
      "priority": "EMERGENCY",
      "expiryDate": "2025-01-20",
      "daysUntilExpiry": 5
    },
    {
      "id": 902,
      "referenceNumber": "PA-20250115-00251",
      "memberName": "فاطمة أحمد",
      "providerName": "مستشفى النور",
      "serviceName": "تصوير بالرنين المغناطيسي",
      "requestedAmount": 800.00,
      "status": "PENDING",
      "priority": "URGENT",
      "expiryDate": "2025-01-18",
      "daysUntilExpiry": 3
    }
  ]
}
```

**Sorting Order:**
1. Priority: EMERGENCY > URGENT
2. Request Date: Oldest first

**Use Cases:**
- تنبيهات فورية للمراجعين
- صفحة "عاجل" منفصلة
- إشعارات Desktop/Mobile

---

### 5. Get Expiring Soon

**Endpoint:** `GET /api/pre-authorizations/dashboard/expiring-soon`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** الموافقات التي ستنتهي قريباً

#### Request Parameters

```
?withinDays=7&limit=10
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `withinDays` | 7 | عدد الأيام (expiryDate within N days) |
| `limit` | 10 | الحد الأقصى للنتائج |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Expiring items retrieved successfully",
  "data": [
    {
      "id": 850,
      "referenceNumber": "PA-20250110-00200",
      "memberName": "محمد علي",
      "providerName": "عيادة الأسنان",
      "serviceName": "تنظيف الأسنان",
      "requestedAmount": 200.00,
      "status": "APPROVED",
      "priority": "NORMAL",
      "expiryDate": "2025-01-16",
      "daysUntilExpiry": 1
    },
    {
      "id": 851,
      "referenceNumber": "PA-20250111-00201",
      "memberName": "سارة أحمد",
      "providerName": "مختبر التحاليل",
      "serviceName": "تحليل دم شامل",
      "requestedAmount": 150.00,
      "status": "APPROVED",
      "priority": "NORMAL",
      "expiryDate": "2025-01-17",
      "daysUntilExpiry": 2
    }
  ]
}
```

**Query Logic:**
```sql
WHERE status = 'APPROVED' 
  AND active = true
  AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY expiry_date ASC
LIMIT 10
```

**Alert Colors:**
- 1 day: Red (خطر)
- 2-3 days: Orange (تحذير)
- 4-7 days: Yellow (إشعار)

---

### 6. Get Trends

**Endpoint:** `GET /api/pre-authorizations/dashboard/trends`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** اتجاهات يومية (Line Chart)

#### Request Parameters

```
?days=30
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Trends retrieved successfully",
  "data": [
    {
      "date": "2025-01-15",
      "created": 45,
      "approved": 38,
      "rejected": 5,
      "totalAmount": 22500.00,
      "approvedAmount": 19000.00
    },
    {
      "date": "2025-01-14",
      "created": 52,
      "approved": 41,
      "rejected": 8,
      "totalAmount": 26000.00,
      "approvedAmount": 20500.00
    }
    // ... 28 more data points
  ]
}
```

**Chart Data Format (Recharts):**
```javascript
const lineChartData = response.data.map(item => ({
  date: formatDate(item.date),
  Created: item.created,
  Approved: item.approved,
  Rejected: item.rejected
}));

// Multi-series Line Chart:
// - Line 1: Created (blue)
// - Line 2: Approved (green)
// - Line 3: Rejected (red)
```

---

### 7. Get Top Providers

**Endpoint:** `GET /api/pre-authorizations/dashboard/top-providers`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** أفضل مقدمي الخدمة (بالحجم ونسبة الموافقة)

#### Request Parameters

```
?limit=10
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Top providers retrieved successfully",
  "data": [
    {
      "providerId": 101,
      "providerName": "مستشفى الواحة",
      "licenseNumber": "PRV-001",
      "totalPreAuths": 320,
      "approvedCount": 280,
      "totalApprovedAmount": 168000.00,
      "approvalRate": 87.5
    },
    {
      "providerId": 102,
      "providerName": "مستشفى النور",
      "licenseNumber": "PRV-002",
      "totalPreAuths": 250,
      "approvedCount": 200,
      "totalApprovedAmount": 120000.00,
      "approvalRate": 80.0
    },
    {
      "providerId": 103,
      "providerName": "عيادة الأسنان المتخصصة",
      "licenseNumber": "PRV-003",
      "totalPreAuths": 180,
      "approvedCount": 150,
      "totalApprovedAmount": 30000.00,
      "approvalRate": 83.3
    }
  ]
}
```

**Sorting:**
- Primary: `totalPreAuths` DESC (الأكثر حجماً)
- Secondary: `approvalRate` DESC (الأعلى نسبة موافقة)

**Chart Data Format (Recharts - Horizontal Bar Chart):**
```javascript
const barChartData = response.data.map(p => ({
  name: p.providerName,
  'Total PreAuths': p.totalPreAuths,
  'Approved': p.approvedCount,
  'Approval Rate': p.approvalRate
}));
```

---

### 8. Get Recent Activity

**Endpoint:** `GET /api/pre-authorizations/dashboard/recent-activity`  
**Permission:** `VIEW_PRE_AUTH` or `ADMIN`  
**Description:** آخر الإجراءات (من Audit Log)

#### Request Parameters

```
?limit=10
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Recent activity retrieved successfully",
  "data": [
    {
      "preAuthId": 905,
      "referenceNumber": "PA-20250115-00255",
      "action": "APPROVED",
      "actionBy": "reviewer.user",
      "timestamp": "2025-01-15T16:45:00",
      "notes": "Approved - standard coverage"
    },
    {
      "preAuthId": 904,
      "referenceNumber": "PA-20250115-00254",
      "action": "REJECTED",
      "actionBy": "reviewer.user",
      "timestamp": "2025-01-15T16:30:00",
      "notes": "Service not covered"
    },
    {
      "preAuthId": 903,
      "referenceNumber": "PA-20250115-00253",
      "action": "CREATED",
      "actionBy": "provider.user",
      "timestamp": "2025-01-15T15:00:00",
      "notes": "Created with requested amount: 500.00"
    }
  ]
}
```

**Action Icons (Frontend):**
- CREATED: `<AddIcon />`
- APPROVED: `<CheckCircleIcon />`
- REJECTED: `<CancelIcon />`
- UPDATED: `<EditIcon />`
- CANCELLED: `<BlockIcon />`

---

## 📊 Chart Specifications

### 1. Pie Chart - Status Distribution

**Library:** Recharts (`<PieChart>`)

```jsx
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';

const COLORS = {
  approved: '#4caf50',
  pending: '#ff9800',
  rejected: '#f44336',
  cancelled: '#9e9e9e',
  expired: '#607d8b'
};

const data = [
  { name: 'موافق عليه', value: 820, key: 'approved' },
  { name: 'قيد الانتظار', value: 180, key: 'pending' },
  { name: 'مرفوض', value: 150, key: 'rejected' },
  { name: 'ملغي', value: 80, key: 'cancelled' },
  { name: 'منتهي', value: 20, key: 'expired' }
];

<PieChart width={400} height={300}>
  <Pie
    data={data}
    cx={200}
    cy={150}
    labelLine={false}
    label={renderCustomLabel}
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
  >
    {data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[entry.key]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

---

### 2. Line Chart - Trends (30 Days)

**Library:** Recharts (`<LineChart>`)

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const data = trendsData.map(item => ({
  date: formatDate(item.date, 'MM/DD'),
  'تم الإنشاء': item.created,
  'موافق عليه': item.approved,
  'مرفوض': item.rejected
}));

<LineChart width={800} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="تم الإنشاء" stroke="#2196f3" />
  <Line type="monotone" dataKey="موافق عليه" stroke="#4caf50" />
  <Line type="monotone" dataKey="مرفوض" stroke="#f44336" />
</LineChart>
```

---

### 3. Horizontal Bar Chart - Top Providers

**Library:** Recharts (`<BarChart>`)

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const data = topProvidersData.map(p => ({
  name: p.providerName.substring(0, 20), // Truncate for display
  'إجمالي الطلبات': p.totalPreAuths,
  'موافق عليه': p.approvedCount
}));

<BarChart 
  width={600} 
  height={400} 
  data={data}
  layout="horizontal"
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis type="number" />
  <YAxis dataKey="name" type="category" width={150} />
  <Tooltip />
  <Legend />
  <Bar dataKey="إجمالي الطلبات" fill="#2196f3" />
  <Bar dataKey="موافق عليه" fill="#4caf50" />
</BarChart>
```

---

## 🧪 Frontend Implementation Guide

### 1. Dashboard Page Layout

```jsx
// Page: PreAuthDashboard.jsx
import { useState, useEffect } from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { getDashboard } from 'services/api/preauth-dashboard.service';

const PreAuthDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await getDashboard({ trendDays: 30, topProviders: 10 });
        setDashboard(response.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        لوحة معلومات الموافقات المسبقة
      </Typography>

      {/* Row 1: Overall Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="إجمالي الموافقات" 
            value={dashboard.overallStats.totalCount}
            icon={<ListIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="قيد الانتظار" 
            value={dashboard.overallStats.pendingCount}
            color="warning"
            icon={<PendingIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="موافق عليه" 
            value={dashboard.overallStats.approvedCount}
            color="success"
            icon={<CheckIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="مرفوض" 
            value={dashboard.overallStats.rejectedCount}
            color="error"
            icon={<CloseIcon />}
          />
        </Grid>
      </Grid>

      {/* Row 2: Charts */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">توزيع الحالات</Typography>
            <StatusPieChart data={dashboard.statusDistribution} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">الاتجاهات (30 يوم)</Typography>
            <TrendsLineChart data={dashboard.trends} />
          </Paper>
        </Grid>
      </Grid>

      {/* Row 3: Queues & Alerts */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">الأولوية العالية</Typography>
            <HighPriorityTable data={dashboard.highPriorityQueue} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">ينتهي قريباً</Typography>
            <ExpiringSoonAlerts data={dashboard.expiringSoon} />
          </Paper>
        </Grid>
      </Grid>

      {/* Row 4: Top Providers & Activity */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">أفضل مقدمي الخدمة</Typography>
            <TopProvidersBarChart data={dashboard.topProviders} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">النشاط الحديث</Typography>
            <RecentActivityTimeline data={dashboard.recentActivity} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
```

---

### 2. Custom Hook: usePreAuthDashboard

```javascript
// hooks/usePreAuthDashboard.js
import { useState, useEffect } from 'react';
import { 
  getDashboard, 
  getOverallStats, 
  getStatusDistribution,
  getHighPriorityQueue,
  getExpiringSoon,
  getTrends,
  getTopProviders,
  getRecentActivity
} from 'services/api/preauth-dashboard.service';

export const usePreAuthDashboard = (options = {}) => {
  const {
    trendDays = 30,
    topProviders = 10,
    highPriorityLimit = 10,
    expiringWithinDays = 7,
    expiringLimit = 10,
    recentActivityLimit = 10,
    autoRefresh = false,
    refreshInterval = 60000 // 1 minute
  } = options;

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboard({ trendDays, topProviders });
      setDashboard(response.data);
    } catch (err) {
      setError(err);
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [trendDays, topProviders, autoRefresh, refreshInterval]);

  const refetch = () => {
    fetchDashboard();
  };

  return {
    dashboard,
    loading,
    error,
    refetch,
    // Individual widgets (lazy loading)
    fetchOverallStats: () => getOverallStats(),
    fetchStatusDistribution: () => getStatusDistribution(),
    fetchHighPriority: () => getHighPriorityQueue(highPriorityLimit),
    fetchExpiringSoon: () => getExpiringSoon(expiringWithinDays, expiringLimit),
    fetchTrends: () => getTrends(trendDays),
    fetchTopProviders: () => getTopProviders(topProviders),
    fetchRecentActivity: () => getRecentActivity(recentActivityLimit)
  };
};
```

---

### 3. Service Layer

```javascript
// services/api/preauth-dashboard.service.js
import axiosClient from 'utils/axios';

const BASE_URL = '/pre-authorizations/dashboard';

export const getDashboard = async (params = {}) => {
  const { trendDays = 30, topProviders = 10 } = params;
  const response = await axiosClient.get(BASE_URL, {
    params: { trendDays, topProviders }
  });
  return response.data;
};

export const getOverallStats = async () => {
  const response = await axiosClient.get(`${BASE_URL}/stats`);
  return response.data;
};

export const getStatusDistribution = async () => {
  const response = await axiosClient.get(`${BASE_URL}/status-distribution`);
  return response.data;
};

export const getHighPriorityQueue = async (limit = 10) => {
  const response = await axiosClient.get(`${BASE_URL}/high-priority`, {
    params: { limit }
  });
  return response.data;
};

export const getExpiringSoon = async (withinDays = 7, limit = 10) => {
  const response = await axiosClient.get(`${BASE_URL}/expiring-soon`, {
    params: { withinDays, limit }
  });
  return response.data;
};

export const getTrends = async (days = 30) => {
  const response = await axiosClient.get(`${BASE_URL}/trends`, {
    params: { days }
  });
  return response.data;
};

export const getTopProviders = async (limit = 10) => {
  const response = await axiosClient.get(`${BASE_URL}/top-providers`, {
    params: { limit }
  });
  return response.data;
};

export const getRecentActivity = async (limit = 10) => {
  const response = await axiosClient.get(`${BASE_URL}/recent-activity`, {
    params: { limit }
  });
  return response.data;
};
```

---

## 🔒 Permissions

| Endpoint | Permission | Roles |
|----------|------------|-------|
| GET /dashboard | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /dashboard/stats | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /dashboard/status-distribution | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /dashboard/high-priority | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /dashboard/expiring-soon | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /dashboard/trends | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /dashboard/top-providers | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |
| GET /dashboard/recent-activity | VIEW_PRE_AUTH or ADMIN | ALL_AUTHENTICATED, ADMIN |

---

## 📚 Related Documents

- [PreAuthorization API Contract](./PREAUTHORIZATION_API_CONTRACT.md)
- [PreAuth Audit Trail API Contract](./PREAUTH_AUDIT_TRAIL_API_CONTRACT.md)
- [API Contract Status Report](./API_CONTRACT_STATUS_COMPREHENSIVE.md)

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-31 | Initial version |

---

**Status:** ✅ Backend Complete - Ready for Frontend Integration  
**Next Steps:**
1. Create Dashboard UI page
2. Implement all 7 widgets
3. Add charts (Pie, Line, Bar)
4. Add auto-refresh feature
5. Add drill-down capabilities

---

*This document defines the complete API contract for PreAuthorization Analytics Dashboard. All implementations must adhere to this specification.*
