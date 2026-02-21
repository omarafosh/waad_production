# Report 1: Employer Dashboard KPIs

**Phase:** 4 — Reports (Version 1)  
**Mode:** READ-ONLY  
**Status:** ✅ FINAL — Ready for Implementation  
**Date:** December 27, 2025

---

## ⚠️ Temporal Scope (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────────┐
│  All KPIs in Employer Dashboard are ALL-TIME aggregates.           │
│  No date filtering (monthly, yearly, range-based) is supported     │
│  in Phase 1.                                                       │
│                                                                     │
│  ❌ NOT SUPPORTED: "This month", "Last 30 days", date range        │
│  ✅ SUPPORTED: Total counts since system inception                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. KPI Definitions

| # | KPI Name | Arabic Label | Description | Unit |
|---|----------|--------------|-------------|------|
| 1 | Total Members | إجمالي الأعضاء | All members under employer (active + inactive) | Count |
| 2 | Active Members | الأعضاء الفعالين | Members with `status = 'ACTIVE'` | Count |
| 3 | Total Visits | إجمالي الزيارات | All visits for employer's members | Count |
| 4 | Total Claims | إجمالي المطالبات | All claims for employer's members | Count |
| 5 | Claims by Status | المطالبات حسب الحالة | Breakdown by ALL status values (see §3) | Breakdown |
| 6 | **Approved Amount** | المبالغ الموافق عليها | `SUM(approvedAmount)` WHERE `status IN ('APPROVED', 'SETTLED') AND approvedAmount IS NOT NULL` | Currency (LYD) |
| 7 | Rejected Amount | المبالغ المرفوضة | `SUM(requestedAmount)` WHERE `status = 'REJECTED'` | Currency (LYD) |

### ⚠️ Approved Amount Calculation Rule

```java
// CORRECT ✅
BigDecimal approvedTotal = claims.stream()
    .filter(c -> c.getStatus() == APPROVED || c.getStatus() == SETTLED)
    .filter(c -> c.getApprovedAmount() != null)
    .map(ClaimViewDto::getApprovedAmount)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// WRONG ❌ — Never use requestedAmount for Approved Amount
```

---

## 2. Data Source Mapping

| KPI | Entity | Field(s) | Filter | Calculation |
|-----|--------|----------|--------|-------------|
| **Total Members** | `Member` | `id` | `employer_org_id = :employerId` | `COUNT(*)` |
| **Active Members** | `Member` | `id`, `status` | `employer_org_id = :employerId AND status = 'ACTIVE'` | `COUNT(*)` |
| **Total Visits** | `Visit` | `id` | `employer_org_id = :employerId` | `COUNT(*)` |
| **Total Claims** | `Claim` | `id` | `member.employer_org_id = :employerId` | `COUNT(*)` |
| **Claims by Status** | `Claim` | `id`, `status` | `member.employer_org_id = :employerId` | `GROUP BY status` |
| **Approved Amount** | `Claim` | `approvedAmount` | `status IN ('APPROVED', 'SETTLED') AND approvedAmount IS NOT NULL` | `SUM(approvedAmount)` |
| **Rejected Amount** | `Claim` | `requestedAmount` | `status = 'REJECTED'` | `SUM(requestedAmount)` |

---

## 3. Claims by Status — Mandatory Display Values

**ALL** status values must be displayed in the UI, even if count = 0:

| Status | Arabic Label | Display Order | Color |
|--------|--------------|---------------|-------|
| `DRAFT` | مسودة | 1 | `gray` |
| `SUBMITTED` | مقدمة | 2 | `blue` |
| `UNDER_REVIEW` | قيد المراجعة | 3 | `orange` |
| `APPROVED` | موافق عليها | 4 | `green` |
| `REJECTED` | مرفوضة | 5 | `red` |
| `RETURNED_FOR_INFO` | مُرجعة للاستكمال | 6 | `yellow` |
| `SETTLED` | تمت التسوية | 7 | `purple` |

### Implementation Pattern

```javascript
// CORRECT ✅ — Always show all statuses
const STATUS_ORDER = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 
  'REJECTED', 'RETURNED_FOR_INFO', 'SETTLED'
];

const claimsByStatus = STATUS_ORDER.map(status => ({
  status,
  label: STATUS_LABELS[status],
  count: claims.filter(c => c.status === status).length,
  color: STATUS_COLORS[status]
}));

// WRONG ❌ — Only showing statuses with count > 0
// This hides the true state machine representation
```

---

## 4. Required Backend Endpoints (EXISTING)

| KPI | Primary Endpoint | Method | Employer Filter | Fallback |
|-----|------------------|--------|-----------------|----------|
| **Total Members** | `GET /api/members/count` | GET | `?employerId={id}` | See §6 |
| **Active Members** | `GET /api/members` | GET | `?employerId={id}&size=9999` | Filter client-side |
| **Total Visits** | `GET /api/visits/count` | GET | `?employerId={id}` | — |
| **Total Claims** | `GET /api/claims/count` | GET | `?employerId={id}` | — |
| **Claims Data** | `GET /api/claims` | GET | `?employerId={id}&size=9999` | — |

---

## 5. Authorization Rules

| Role | Access Level | Employer Scope | Selector Visible |
|------|--------------|----------------|------------------|
| **SUPER_ADMIN** | Full | ALL employers | ✅ YES |
| **ADMIN** | Full | ALL employers | ✅ YES |
| **INSURANCE_ADMIN** | Full | ALL employers | ✅ YES |
| **EMPLOYER_ADMIN** | Restricted | **Own employer ONLY** | ❌ NO |
| **REVIEWER** | Read-Only | ALL (if VIEW_* permissions) | ❌ NO |
| **PROVIDER** | ❌ No Access | — | — |

### ⚠️ Employer Selector Rule (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────────┐
│  EMPLOYER_ADMIN cannot change employer context.                    │
│  Employer selector is visible ONLY to SUPER_ADMIN / ADMIN.         │
│                                                                     │
│  Implementation:                                                    │
│  - EMPLOYER_ADMIN: employerId locked from JWT token                │
│  - SUPER_ADMIN/ADMIN: Show employer dropdown at top of dashboard   │
│  - Others: Use assigned employerId or show 403                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Edge Cases

| Scenario | Handling | UI Display |
|----------|----------|------------|
| **No Data** | Return `0` for counts, `0.00 LYD` for amounts | Show "0" with placeholder |
| **No Members** | All KPIs = 0 | "لا يوجد أعضاء مسجلين" |
| **No Claims** | Claims KPIs = 0, show all status rows with 0 | "لا توجد مطالبات" |
| **Partial Data** | Display available, show "—" for missing | Handle null gracefully |
| **API Error** | Retry once, then show error state | "فشل في تحميل البيانات" |
| **Large Data Set** | Paginated fetch if >1000 records | Progressive loading |
| **No Employer Selected** | SUPER_ADMIN must select employer | "اختر جهة العمل أولاً" |
| **Unauthorized Employer** | Return 403 | "غير مصرح بالوصول" |
| **`/api/members/count` not available** | Use `GET /api/members?size=1` and read `total` from pagination response | Fallback only |
| **`approvedAmount` is NULL** | Skip in sum calculation | Don't count as 0 |

### Members Count Fallback Pattern

```javascript
// Primary approach
const countResponse = await axios.get(`/api/members/count?employerId=${id}`);
const totalMembers = countResponse.data.data;

// Fallback if count endpoint fails
const listResponse = await axios.get(`/api/members?employerId=${id}&size=1`);
const totalMembers = listResponse.data.data.total; // From PaginationResponse
```

---

## 7. KPI Display Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 لوحة المؤشرات                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ جهة العمل: [Employer Selector - ADMIN only]                │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │     👥       │  │     ✅       │  │     🏥       │              │
│  │    250       │  │    230       │  │   1,245      │              │
│  │ إجمالي الأعضاء │  │ أعضاء فعالين │  │ إجمالي الزيارات │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  📋 المطالبات حسب الحالة (إجمالي: 456)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ⚪ مسودة          12  │ 🔵 مقدمة           23              │   │
│  │ 🟠 قيد المراجعة    8  │ 🟢 موافق عليها    380              │   │
│  │ 🔴 مرفوضة         41  │ 🟡 مُرجعة           0              │   │
│  │ 🟣 تمت التسوية   (ضمن الموافق عليها)                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  💰 المبالغ                                                        │
│  ┌───────────────────────────┬────────────────────────────────┐   │
│  │  ✅ موافق عليها            │  ❌ مرفوضة                     │   │
│  │  150,000.00 د.ل           │  12,500.00 د.ل                │   │
│  └───────────────────────────┴────────────────────────────────┘   │
│                                                                     │
│  ⏱️ آخر تحديث: منذ 5 دقائق                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Gaps (Documentation Only — NO FIXES)

| Gap | Impact | Workaround |
|-----|--------|------------|
| No `/api/members/count?status=ACTIVE` | Extra fetch required | Filter from full list |
| No `/api/claims/summary` endpoint | Multiple fetches + client calc | Aggregate client-side |
| No date range filtering | Cannot show "this month" | ALL-TIME only in Phase 1 |
| No real-time updates | Dashboard may be stale | Manual refresh / 5min cache |

---

## 9. Implementation Checklist

### File Structure

```
frontend/src/
├── pages/
│   └── reports/
│       └── employer-dashboard/
│           ├── index.jsx              # Main page
│           ├── KPICard.jsx            # Reusable KPI card
│           ├── ClaimsStatusGrid.jsx   # Status breakdown
│           └── AmountsBlock.jsx       # Financial summary
├── hooks/
│   └── useEmployerDashboardKPIs.js    # Data fetching hook
└── constants/
    └── claimStatus.constants.js       # Status labels/colors
```

### Implementation Order

| Step | Task | Dependencies |
|------|------|--------------|
| 1 | Create page route `/reports/employer-dashboard` | MainRoutes.jsx |
| 2 | Create `useEmployerDashboardKPIs(employerId)` hook | React Query |
| 3 | Implement KPI Cards (Members, Visits counts) | Hook ready |
| 4 | Implement Claims Status Grid (7 statuses) | Hook ready |
| 5 | Implement Amounts Block (Approved/Rejected) | Hook ready |
| 6 | Add Loading / Empty states | All components |
| 7 | Add Employer Selector (ADMIN only) | RBAC context |
| 8 | RBAC verification | Auth guards |

---

## 10. Sign-Off

| Item | Status |
|------|--------|
| Design | ✅ FINAL |
| Temporal Scope | ✅ ALL-TIME only |
| KPI Definitions | ✅ 7 KPIs defined |
| Approved Amount Rule | ✅ Corrected |
| Claims Status Display | ✅ All 7 mandatory |
| Authorization | ✅ Role-based + selector rule |
| Edge Cases | ✅ 10 scenarios |
| Data Gaps | ✅ 4 documented |
| Backend Dependency | ❌ NONE (existing endpoints only) |
| Ready for Implementation | ✅ YES |

---

## 📌 Change Control

```
Any modification to Report 1 after this sign-off = Change Request (CR)
CR must include: Justification, Impact Analysis, Approval
```

---

**Document Version:** 1.0 FINAL  
**Author:** System Architect  
**Approved:** December 27, 2025
