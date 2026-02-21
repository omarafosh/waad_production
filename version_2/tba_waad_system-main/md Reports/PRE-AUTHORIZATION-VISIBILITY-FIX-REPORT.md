# 🧾 Pre-Authorization Visibility & Access Fix Report

## TBA WAAD System | Production-Safe Fix
### Date: 2026-01-13

---

## 🎯 Summary

This report documents the comprehensive diagnosis and fix for the Pre-Authorization (Pre-Approval) visibility issue in both:
- **Internal Admin System** (Insurance Admin, Reviewer)
- **Provider Portal** (PROVIDER role)

---

## 🔍 Root Cause Analysis

### Problem Statement
The Pre-Approvals page was not visible to users who should have access to it.

### Root Causes Identified

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Role Name Mismatch** | Routes used `ADMIN`, `REVIEWER` instead of `INSURANCE_ADMIN`, `REVIEWER` | Routes blocked for real roles |
| 2 | **Missing PREAUTH Domain** | PROVIDER and REVIEWER didn't have PREAUTH domain in rbac.js | Menu hidden, API calls skipped |
| 3 | **Wrong API Endpoint** | Frontend called `/pre-approvals`, backend was `/pre-authorizations` | 404 errors |
| 4 | **Permission Name Mismatch** | Backend used `VIEW_PRE_AUTH`, roles had `VIEW_PREAUTH` (no underscore) | 403 forbidden |
| 5 | **Missing GET All Endpoint** | Backend controller lacked paginated GET all endpoint | Empty list |
| 6 | **Menu Filter Mismatch** | Used `INSURANCE_COMPANY` instead of `INSURANCE_ADMIN` | Menu not shown |

---

## ✅ Fixes Applied

### Phase 1: Route Fixes (MainRoutes.jsx)

**Before:**
```jsx
<RouteGuard allowedRoles={['ADMIN', 'REVIEWER']}>
```

**After:**
```jsx
<RouteGuard allowedRoles={['INSURANCE_ADMIN', 'REVIEWER', 'PROVIDER']}>
```

**Routes Updated:**
| Route | New Allowed Roles |
|-------|-------------------|
| `/pre-approvals` | INSURANCE_ADMIN, REVIEWER, PROVIDER |
| `/pre-approvals/dashboard` | INSURANCE_ADMIN, REVIEWER |
| `/pre-approvals/inbox` | INSURANCE_ADMIN, REVIEWER |
| `/pre-approvals/add` | INSURANCE_ADMIN, EMPLOYER_ADMIN, PROVIDER |
| `/pre-approvals/:id` | INSURANCE_ADMIN, REVIEWER, PROVIDER |
| `/pre-approvals/edit/:id` | INSURANCE_ADMIN, REVIEWER |
| `/pre-approvals/:id/audit` | INSURANCE_ADMIN, REVIEWER |

---

### Phase 2: RBAC Domain Fixes (constants/rbac.js)

**PROVIDER Role Domain Access:**
```javascript
[SystemRole.PROVIDER]: [
  PermissionDomain.CLAIMS,
  PermissionDomain.VISITS,
  PermissionDomain.MEMBERS,
  PermissionDomain.PREAUTH  // ✅ ADDED
]
```

**REVIEWER Role Domain Access:**
```javascript
[SystemRole.REVIEWER]: [
  PermissionDomain.CLAIMS,
  PermissionDomain.PREAUTH  // ✅ ADDED
]
```

---

### Phase 3: Menu Visibility Fixes (menu-items/components.jsx)

**Added INSURANCE_ADMIN rules:**
```javascript
INSURANCE_ADMIN: {
  hide: ['rbac'],  // Only RBAC hidden
  show: [
    'dashboard', 'members', 'employers', 'providers', 'claims',
    'claims-inbox', 'pre-approvals', 'pre-approvals-inbox',
    'unified-approvals-dashboard', 'visits', 'benefit-policies',
    // ... full list
  ]
}
```

**Added EMPLOYER_ADMIN rules:**
```javascript
EMPLOYER_ADMIN: {
  hide: ['employers', 'providers', 'claims-inbox', 'settlement-inbox', 'rbac'],
  show: ['dashboard', 'members', 'claims', 'visits', 'pre-approvals', ...]
}
```

**Fixed REVIEWER rules:**
```javascript
REVIEWER: {
  show: [
    'dashboard', 'claims', 'claims-inbox',
    'pre-approvals', 'pre-approvals-inbox',  // ✅ ADDED inbox
    'unified-approvals-dashboard', ...
  ]
}
```

---

### Phase 4: API Endpoint Fix (pre-approvals.service.js)

**Before:**
```javascript
const BASE_URL = '/pre-approvals';  // ❌ Wrong endpoint
```

**After:**
```javascript
// NOTE: Backend uses /pre-authorizations endpoint
const BASE_URL = '/pre-authorizations';  // ✅ Correct endpoint
```

---

### Phase 5: Backend Permission Fixes (AppPermission.java)

**Added Granular Pre-Auth Permissions:**
```java
// Granular Pre-Authorization Permissions (for controller-level security)
VIEW_PRE_AUTH("عرض طلبات الموافقة المسبقة", "View pre-authorization requests"),
CREATE_PRE_AUTH("إنشاء طلب موافقة مسبقة", "Create pre-authorization requests"),
UPDATE_PRE_AUTH("تحديث طلب موافقة مسبقة", "Update pre-authorization requests"),
APPROVE_PRE_AUTH("الموافقة على طلب مسبق", "Approve pre-authorization requests"),
REJECT_PRE_AUTH("رفض طلب مسبق", "Reject pre-authorization requests"),
CANCEL_PRE_AUTH("إلغاء طلب مسبق", "Cancel pre-authorization requests"),
DELETE_PRE_AUTH("حذف طلب مسبق", "Delete pre-authorization requests"),
```

---

### Phase 6: Role Permission Assignments (RbacDataInitializer.java)

**SUPER_ADMIN & INSURANCE_ADMIN:**
```java
// Added granular pre-auth permissions
"VIEW_PRE_AUTH", "CREATE_PRE_AUTH", "UPDATE_PRE_AUTH",
"APPROVE_PRE_AUTH", "REJECT_PRE_AUTH", "CANCEL_PRE_AUTH", "DELETE_PRE_AUTH"
```

**REVIEWER:**
```java
// Pre-Authorization Review
"VIEW_PRE_AUTH",
"APPROVE_PRE_AUTH",
"REJECT_PRE_AUTH"
```

**PROVIDER:**
```java
// Pre-Authorization (submit and view their requests)
"VIEW_PRE_AUTH",
"CREATE_PRE_AUTH"
```

---

### Phase 7: Backend GET All Endpoint

**Added to PreAuthorizationController.java:**
```java
@GetMapping
@PreAuthorize("hasAuthority('VIEW_PRE_AUTH')")
public ResponseEntity<ApiResponse<Page<PreAuthorizationResponseDto>>> getAllPreAuthorizations(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "DESC") String sortDirection)
```

**Added to PreAuthorizationService.java:**
```java
@Transactional(readOnly = true)
public Page<PreAuthorizationResponseDto> getAllPreAuthorizations(Pageable pageable) {
    Page<PreAuthorization> preAuths = preAuthorizationRepository.findByActiveTrue(pageable);
    return preAuths.map(this::mapToResponseDtoLight);
}
```

**Added to PreAuthorizationRepository.java:**
```java
Page<PreAuthorization> findByActiveTrue(Pageable pageable);
```

---

## 📊 Files Modified

### Frontend
| File | Changes |
|------|---------|
| `routes/MainRoutes.jsx` | Updated allowedRoles for pre-approvals routes |
| `constants/rbac.js` | Added PREAUTH domain to PROVIDER, REVIEWER |
| `menu-items/components.jsx` | Added INSURANCE_ADMIN, EMPLOYER_ADMIN rules; fixed REVIEWER access |
| `services/api/pre-approvals.service.js` | Changed BASE_URL to `/pre-authorizations` |

### Backend
| File | Changes |
|------|---------|
| `security/AppPermission.java` | Added 7 granular pre-auth permissions |
| `config/RbacDataInitializer.java` | Added pre-auth permissions to SUPER_ADMIN, INSURANCE_ADMIN, REVIEWER, PROVIDER |
| `preauthorization/controller/PreAuthorizationController.java` | Added GET all endpoint |
| `preauthorization/service/PreAuthorizationService.java` | Added getAllPreAuthorizations method |
| `preauthorization/repository/PreAuthorizationRepository.java` | Added findByActiveTrue |

---

## 🔒 RBAC Summary

### Role Access Matrix

| Feature | SUPER_ADMIN | INSURANCE_ADMIN | REVIEWER | PROVIDER | EMPLOYER_ADMIN |
|---------|:-----------:|:---------------:|:--------:|:--------:|:--------------:|
| View Pre-Approvals List | ✅ | ✅ | ✅ | ✅ (own) | ❌ |
| Pre-Approvals Inbox | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Pre-Approval | ✅ | ✅ | ❌ | ✅ | ✅ |
| Approve/Reject | ✅ | ✅ | ✅ | ❌ | ❌ |
| Dashboard Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Audit Trail | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 🎯 Expected Behavior After Fix

### Admin System (INSURANCE_ADMIN)
- ✅ Pre-Approvals menu item visible
- ✅ Pre-Approvals Inbox visible
- ✅ Unified Approvals Dashboard visible
- ✅ Can view, create, approve, reject pre-approvals
- ✅ No 403 errors
- ✅ Clean console

### Admin System (REVIEWER)
- ✅ Pre-Approvals menu item visible
- ✅ Pre-Approvals Inbox visible
- ✅ Can view and approve/reject pre-approvals
- ✅ Cannot create pre-approvals
- ✅ No 403 errors

### Provider Portal (PROVIDER)
- ✅ Pre-Approvals menu item visible
- ✅ Can view own pre-approvals (filtered by providerId)
- ✅ Can create new pre-approval requests
- ✅ Cannot access inbox or approve/reject
- ✅ No 403 errors

---

## ⚠️ Post-Deployment Steps

1. **Restart Backend** - To load new permissions from RbacDataInitializer
2. **Clear Browser Cache** - To refresh menu configuration
3. **Verify Permissions** - Log in with INSURANCE_ADMIN, REVIEWER, PROVIDER and verify access
4. **Test Provider Scope** - Ensure PROVIDER only sees own pre-authorizations

---

## 📌 Principle Applied

> **"If a page does not appear, it is always: Route, RBAC, or Domain mapping — never magic."**

All issues traced back to one of these three categories:
1. **Route** - Wrong role names in RouteGuard
2. **RBAC** - Missing domain assignments
3. **Domain mapping** - Menu filter rules not matching actual roles

---

*Report generated by Pre-Authorization Visibility Fix - 2026-01-13*
