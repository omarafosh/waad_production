# 📄 DASHBOARD API CONTRACT

> **وثيقة العقد الرسمي بين Backend و Frontend لوحدة لوحة التحكم**  
> **الإصدار:** 1.0  
> **التاريخ:** 2026-01-13  
> **الحالة:** ✅ مُثبَّت

---

## 📑 الفهرس
1. [نظرة عامة](#نظرة-عامة)
2. [الـ DTOs الرسمية](#الـ-dtos-الرسمية)
3. [Endpoints](#endpoints)
4. [الصلاحيات المطلوبة](#الصلاحيات-المطلوبة)
5. [أمثلة الاستخدام](#أمثلة-الاستخدام)

---

## نظرة عامة

لوحة التحكم توفر إحصائيات مجمّعة ورسوم بيانية للنظام. كل الحسابات تتم في الـ Backend باستخدام JPQL aggregations.

### ⚠️ قواعد صارمة:
- جميع الـ endpoints تُرجع DTOs مجمّعة (لا كيانات كاملة)
- يمكن تصفية البيانات حسب `employerId`
- التواريخ بصيغة ISO 8601

---

## الـ DTOs الرسمية

### 📊 DashboardSummaryDto (ملخص KPIs)

```typescript
interface DashboardSummaryDto {
  totalMembers: number;          // إجمالي الأعضاء
  activeMembers: number;         // الأعضاء النشطين
  totalClaims: number;           // إجمالي المطالبات
  openClaims: number;            // المطالبات المفتوحة
  approvedClaims: number;        // المطالبات الموافق عليها
  totalProviders: number;        // إجمالي مقدمي الخدمات
  activeProviders: number;       // مقدمو الخدمات النشطين
  totalContracts: number;        // إجمالي العقود
  activeContracts: number;       // العقود النشطة
  totalMedicalCost: number;      // إجمالي التكلفة الطبية
  monthlyGrowth: number;         // نسبة النمو الشهري %
}
```

### 📈 MonthlyTrendDto (الاتجاهات الشهرية)

```typescript
interface MonthlyTrendDto {
  month: string;                 // الشهر بصيغة "YYYY-MM" (مثل: "2026-01")
  count: number;                 // العدد لهذا الشهر
  amount: number | null;         // المبلغ لهذا الشهر (اختياري)
}
```

### 🏥 CostByProviderDto (التكاليف حسب المزود)

```typescript
interface CostByProviderDto {
  providerId: number;            // معرف المزود
  providerName: string;          // اسم المزود
  totalCost: number;             // إجمالي التكلفة
  claimCount: number;            // عدد المطالبات
}
```

### 🍩 ServiceDistributionDto (توزيع الخدمات)

```typescript
interface ServiceDistributionDto {
  serviceType: string;           // نوع/كود الخدمة
  serviceName: string;           // اسم الخدمة
  count: number;                 // العدد
  percentage: number;            // النسبة المئوية
}
```

### 📅 RecentActivityDto (الأنشطة الأخيرة)

```typescript
interface RecentActivityDto {
  id: number;                    // معرف النشاط
  type: string;                  // نوع النشاط (MEMBER_ADDED, CLAIM_SUBMITTED, etc.)
  title: string;                 // عنوان النشاط
  description: string;           // وصف النشاط
  entityName: string;            // اسم الكيان (اسم العضو، رقم المطالبة)
  timestamp: string;             // توقيت النشاط ISO
}
```

### 📊 DashboardStatsDto (إحصائيات - Legacy)

```typescript
interface DashboardStatsDto {
  totalMembers: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalEmployers: number;
  totalInsuranceCompanies: number;
  totalReviewerCompanies: number;
}
```

### 📆 ClaimsPerDayDto (المطالبات اليومية - Legacy)

```typescript
interface ClaimsPerDayDto {
  date: string;                  // التاريخ "YYYY-MM-DD"
  count: number;                 // العدد
}
```

---

## Endpoints

### 📊 1. ملخص لوحة التحكم (الرئيسي)

```http
GET /api/dashboard/summary
```

| Parameter    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `employerId`| number | ❌       | تصفية حسب صاحب العمل |

**Response:**
```json
{
  "status": 200,
  "message": "Dashboard summary retrieved successfully",
  "data": {
    "totalMembers": 1500,
    "activeMembers": 1350,
    "totalClaims": 5000,
    "openClaims": 250,
    "approvedClaims": 4500,
    "totalProviders": 50,
    "activeProviders": 45,
    "totalContracts": 100,
    "activeContracts": 85,
    "totalMedicalCost": 2500000.00,
    "monthlyGrowth": 5.5
  },
  "timestamp": "2026-01-13T10:30:00"
}
```

### 📈 2. الاتجاهات الشهرية

```http
GET /api/dashboard/monthly-trends
```

| Parameter    | Type   | Default | Description |
|-------------|--------|---------|-------------|
| `months`    | number | 12      | عدد الأشهر |
| `employerId`| number | null    | تصفية حسب صاحب العمل |

**Response:**
```json
{
  "status": 200,
  "message": "Monthly trends retrieved successfully",
  "data": [
    { "month": "2025-02", "count": 450, "amount": 150000.00 },
    { "month": "2025-03", "count": 480, "amount": 165000.00 },
    { "month": "2025-04", "count": 520, "amount": 175000.00 }
  ],
  "timestamp": "..."
}
```

### 👥 3. نمو الأعضاء الشهري

```http
GET /api/dashboard/members-growth
```

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `months`  | number | 12      | عدد الأشهر |

**Response:**
```json
{
  "status": 200,
  "message": "Members growth retrieved successfully",
  "data": [
    { "month": "2025-02", "count": 100, "amount": null },
    { "month": "2025-03", "count": 150, "amount": null },
    { "month": "2025-04", "count": 200, "amount": null }
  ],
  "timestamp": "..."
}
```

### 🏥 4. التكاليف حسب المزود

```http
GET /api/dashboard/cost-by-provider
```

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `limit`   | number | 10      | أعلى N مزودين |

**Response:**
```json
{
  "status": 200,
  "message": "Costs by provider retrieved successfully",
  "data": [
    {
      "providerId": 1,
      "providerName": "مستشفى طرابلس المركزي",
      "totalCost": 500000.00,
      "claimCount": 250
    },
    {
      "providerId": 2,
      "providerName": "مستشفى بنغازي الجامعي",
      "totalCost": 350000.00,
      "claimCount": 180
    }
  ],
  "timestamp": "..."
}
```

### 🍩 5. توزيع الخدمات

```http
GET /api/dashboard/service-distribution
```

**Response:**
```json
{
  "status": 200,
  "message": "Service distribution retrieved successfully",
  "data": [
    { "serviceType": "LAB", "serviceName": "مختبر", "count": 1500, "percentage": 30.0 },
    { "serviceType": "RADIOLOGY", "serviceName": "أشعة", "count": 1000, "percentage": 20.0 },
    { "serviceType": "PHARMACY", "serviceName": "صيدلة", "count": 2500, "percentage": 50.0 }
  ],
  "timestamp": "..."
}
```

### ⏱️ 6. الأنشطة الأخيرة

```http
GET /api/dashboard/recent-activities
```

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `limit`   | number | 10      | عدد الأنشطة |

**Response:**
```json
{
  "status": 200,
  "message": "Recent activities retrieved successfully",
  "data": [
    {
      "id": 1,
      "type": "CLAIM_SUBMITTED",
      "title": "مطالبة جديدة",
      "description": "تم تقديم مطالبة جديدة",
      "entityName": "CLM-2026-0001",
      "timestamp": "2026-01-13T10:25:00"
    },
    {
      "id": 2,
      "type": "MEMBER_ADDED",
      "title": "عضو جديد",
      "description": "تم إضافة عضو جديد",
      "entityName": "محمد أحمد",
      "timestamp": "2026-01-13T10:20:00"
    }
  ],
  "timestamp": "..."
}
```

---

## Legacy Endpoints (للتوافق)

### 📊 إحصائيات (قديم)

```http
GET /api/dashboard/stats
```

> ⚠️ **Deprecated:** استخدم `/api/dashboard/summary` بدلاً من هذا

| Header | Type   | Required | Description |
|--------|--------|----------|-------------|
| `X-Employer-ID` | number | ❌ | تصفية حسب صاحب العمل |

### 📆 المطالبات اليومية (قديم)

```http
GET /api/dashboard/claims-per-day
```

> ⚠️ **Deprecated:** استخدم `/api/dashboard/monthly-trends` بدلاً من هذا

| Parameter   | Type   | Required | Description |
|------------|--------|----------|-------------|
| `startDate`| string | ✅       | تاريخ البداية "YYYY-MM-DD" |
| `endDate`  | string | ✅       | تاريخ النهاية "YYYY-MM-DD" |

| Header | Type   | Required | Description |
|--------|--------|----------|-------------|
| `X-Employer-ID` | number | ❌ | تصفية حسب صاحب العمل |

---

## الصلاحيات المطلوبة

| Endpoint | Permission Required |
|----------|---------------------|
| `GET /api/dashboard/summary` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` أو `VIEW_REPORTS` |
| `GET /api/dashboard/monthly-trends` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` أو `VIEW_REPORTS` |
| `GET /api/dashboard/members-growth` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` أو `VIEW_REPORTS` |
| `GET /api/dashboard/cost-by-provider` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` أو `VIEW_REPORTS` |
| `GET /api/dashboard/service-distribution` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` أو `VIEW_REPORTS` |
| `GET /api/dashboard/recent-activities` | `SUPER_ADMIN` أو `INSURANCE_ADMIN` أو `EMPLOYER_ADMIN` أو `VIEW_REPORTS` |
| `GET /api/dashboard/stats` | `SUPER_ADMIN` أو `VIEW_REPORTS` |
| `GET /api/dashboard/claims-per-day` | `SUPER_ADMIN` أو `VIEW_REPORTS` |

---

## أمثلة الاستخدام

### Frontend - جلب ملخص لوحة التحكم

```javascript
// ✅ صحيح
const response = await api.get('/api/dashboard/summary', {
  params: { employerId: currentEmployerId }  // اختياري
});
const summary = response.data.data;

// عرض KPIs
console.log(`إجمالي الأعضاء: ${summary.totalMembers}`);
console.log(`الأعضاء النشطين: ${summary.activeMembers}`);
console.log(`المطالبات المفتوحة: ${summary.openClaims}`);
console.log(`إجمالي التكلفة: ${summary.totalMedicalCost} د.ل`);
console.log(`نسبة النمو: ${summary.monthlyGrowth}%`);
```

### Frontend - رسم بياني للاتجاهات الشهرية

```javascript
// ✅ صحيح
const response = await api.get('/api/dashboard/monthly-trends', {
  params: { months: 12 }
});
const trends = response.data.data;

// تحويل للـ Chart.js
const chartData = {
  labels: trends.map(t => t.month),  // ✅ "2026-01", "2026-02", ...
  datasets: [{
    label: 'عدد المطالبات',
    data: trends.map(t => t.count)    // ✅ الأعداد
  }]
};
```

### Frontend - رسم دائري لتوزيع الخدمات

```javascript
// ✅ صحيح
const response = await api.get('/api/dashboard/service-distribution');
const distribution = response.data.data;

// تحويل لـ Donut Chart
const donutData = {
  labels: distribution.map(d => d.serviceName),
  datasets: [{
    data: distribution.map(d => d.percentage),
    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
  }]
};
```

### Frontend - عرض الأنشطة الأخيرة

```javascript
// ✅ صحيح
const response = await api.get('/api/dashboard/recent-activities', {
  params: { limit: 5 }
});
const activities = response.data.data;

activities.forEach(activity => {
  console.log(`${activity.title} - ${activity.entityName}`);
  console.log(`النوع: ${activity.type}`);
  console.log(`التوقيت: ${activity.timestamp}`);
});
```

---

## ⚠️ أخطاء شائعة يجب تجنبها

| ❌ خطأ | ✅ صحيح |
|--------|---------|
| `/api/dashboard` | `/api/dashboard/summary` |
| `data.members` | `data.totalMembers` |
| `data.claims.open` | `data.openClaims` |
| `month: "January"` | `month: "2026-01"` |
| Header `employerId` | Query param `employerId` أو Header `X-Employer-ID` |

---

## 🎨 استخدام الرسوم البيانية

| Endpoint | نوع الرسم المقترح |
|----------|------------------|
| `/summary` | KPI Cards |
| `/monthly-trends` | Line Chart, Area Chart |
| `/members-growth` | Area Chart |
| `/cost-by-provider` | Bar Chart (Horizontal) |
| `/service-distribution` | Donut Chart, Pie Chart |
| `/recent-activities` | Timeline List |

---

**📋 آخر تحديث:** 2026-01-13  
**✍️ المُعد:** GitHub Copilot  
**🔒 الحالة:** عقد ثابت ومُلزم
