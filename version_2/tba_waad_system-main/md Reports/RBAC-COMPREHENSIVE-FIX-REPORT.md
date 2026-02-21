# RBAC Comprehensive Fix Report

## Date: 2025 (Current Session)

## Executive Summary

This report documents the comprehensive RBAC (Role-Based Access Control) audit and fix applied to the TBA WAAD insurance system backend. The main issue was **403 Forbidden errors** on POST/PUT/DELETE operations for SUPER_ADMIN users due to missing `hasRole('SUPER_ADMIN')` bypass in `@PreAuthorize` annotations.

---

## Root Cause Analysis

### Problem
SUPER_ADMIN users were getting 403 Forbidden errors on various endpoints because:

1. **Missing SUPER_ADMIN bypass**: Many controllers used only `hasAuthority('PERMISSION_NAME')` without `hasRole('SUPER_ADMIN')` fallback
2. **Missing permissions in REQUIRED_PERMISSIONS list**: 12 permissions used in `@PreAuthorize` annotations were not in `SuperAdminPermissionSynchronizer.java`

### Security Architecture
```
User Login → CustomUserDetailsService → Grants ALL permissions to SUPER_ADMIN
                                       → SessionAuthenticationFilter adds ROLE_SUPER_ADMIN authority
                                       
Request → @PreAuthorize check:
          hasRole('SUPER_ADMIN') → TRUE → ALLOW
          OR hasAuthority('XXX') → Checks permission in user's granted authorities
```

---

## Changes Made

### 1. SuperAdminPermissionSynchronizer.java
Added 12 missing permissions to `REQUIRED_PERMISSIONS` list:
- `MANAGE_BENEFIT_POLICIES`
- `SETTLE_CLAIMS`
- `eligibility.check`
- `eligibility.view_logs`
- `members.import`
- `members.import_logs`
- `provider_contracts.view`
- `provider_contracts.manage`
- `MEDICAL_PACKAGE_READ`
- `MEDICAL_PACKAGE_CREATE`
- `MEDICAL_PACKAGE_UPDATE`
- `MEDICAL_PACKAGE_DELETE`

### 2. Controllers Fixed (Added `hasRole('SUPER_ADMIN') or` prefix)

| Controller | Endpoints Fixed |
|------------|-----------------|
| UserController.java | 8 endpoints |
| RoleController.java | 8 endpoints |
| BenefitPackageController.java | 7 endpoints |
| PolicyController.java | 10 endpoints |
| ClaimController.java | 17 endpoints |
| VisitController.java | 8 endpoints |
| MemberController.java | 9 endpoints |
| DashboardController.java | 2 endpoints |
| PermissionController.java | 7 endpoints |
| InsurancePolicyController.java | 10 endpoints |
| EligibilityController.java | 4 endpoints |
| PreApprovalController.java | 9 endpoints |
| SystemAdminController.java | 3 endpoints |
| InsuranceCompanyController.java | 1 endpoint |
| MedicalPackageController.java | 10 endpoints |
| ReportsController.java | 4 endpoints |
| MemberImportController.java | 6 endpoints |
| CompanyController.java | 8 endpoints |

### 3. Pattern Before vs After

**BEFORE (Vulnerable to 403 for SUPER_ADMIN):**
```java
@PreAuthorize("hasAuthority('VIEW_POLICIES')")
public ResponseEntity<...> getPolicies() { ... }
```

**AFTER (SUPER_ADMIN always passes):**
```java
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_POLICIES')")
public ResponseEntity<...> getPolicies() { ... }
```

---

## Controllers Already Correct (No changes needed)

These controllers already had proper SUPER_ADMIN bypass:
- `ProviderController.java`
- `InsuranceCompanyController.java` (most endpoints)
- `EmployerController.java`
- `OrganizationController.java`
- `AuthController.java`
- `MedicalServiceController.java`
- `MedicalCategoryController.java`
- `ReviewerCompanyController.java`
- `ProviderContractController.java`
- `BenefitPolicyController.java`

---

## Verification Steps

1. **Backend Compilation**: `mvn compile` - ✅ SUCCESS
2. **All `@PreAuthorize("hasAuthority` patterns removed** from controllers
3. **All controllers now use** `hasRole('SUPER_ADMIN') or hasAuthority('XXX')` pattern

---

## Testing Checklist

After deploying these changes:

1. **Login as SUPER_ADMIN** (e.g., admin@waad.sa)
2. **Test each module's CRUD operations:**
   - [ ] Members: Create, Update, Delete
   - [ ] Claims: Create, Update, Approve, Reject, Settle
   - [ ] Visits: Create, Update, Delete
   - [ ] Policies: Create, Update, Delete
   - [ ] Users: Create, Update, Delete
   - [ ] Roles: Create, Update, Delete, Assign Permissions
   - [ ] Providers: Create, Update, Delete
   - [ ] Companies: Create, Update, Delete
   - [ ] Insurance Policies: Create, Update, Delete
   - [ ] Benefit Packages: Create, Update, Delete
   - [ ] Pre-Approvals: Create, Approve, Reject

3. **Verify no 403 errors appear in browser console**

---

## Permission Reference

### Standard Permissions Pattern
```
VIEW_* - Read operations (GET)
MANAGE_* - Write operations (POST, PUT, DELETE)
```

### Module-Specific Permissions
| Module | View Permission | Manage Permission |
|--------|-----------------|-------------------|
| Members | VIEW_MEMBERS | MANAGE_MEMBERS |
| Claims | VIEW_CLAIMS | MANAGE_CLAIMS, APPROVE_CLAIMS, SETTLE_CLAIMS |
| Visits | VIEW_VISITS | MANAGE_VISITS |
| Policies | VIEW_POLICIES | MANAGE_POLICIES |
| Users | users.view | users.manage |
| Roles | roles.view | roles.manage |
| Providers | VIEW_PROVIDERS | MANAGE_PROVIDERS |
| Companies | VIEW_COMPANIES | MANAGE_COMPANIES |
| Insurance | VIEW_INSURANCE | MANAGE_INSURANCE |
| Benefit Packages | VIEW_BENEFIT_PACKAGES | MANAGE_BENEFIT_PACKAGES |
| Pre-Approvals | VIEW_PRE_APPROVAL | CREATE_PRE_APPROVAL, APPROVE_PRE_APPROVAL |
| Reports | VIEW_REPORTS | - |
| Dashboard | VIEW_REPORTS | - |
| Eligibility | eligibility.check | eligibility.view_logs |
| Medical Packages | MEDICAL_PACKAGE_READ | MEDICAL_PACKAGE_CREATE/UPDATE/DELETE |

---

## Files Modified

```
backend/src/main/java/com/waad/tba/config/SuperAdminPermissionSynchronizer.java
backend/src/main/java/com/waad/tba/modules/rbac/controller/UserController.java
backend/src/main/java/com/waad/tba/modules/rbac/controller/RoleController.java
backend/src/main/java/com/waad/tba/modules/rbac/controller/PermissionController.java
backend/src/main/java/com/waad/tba/modules/policy/controller/BenefitPackageController.java
backend/src/main/java/com/waad/tba/modules/policy/controller/PolicyController.java
backend/src/main/java/com/waad/tba/modules/claim/controller/ClaimController.java
backend/src/main/java/com/waad/tba/modules/claim/controller/ReportsController.java
backend/src/main/java/com/waad/tba/modules/visit/controller/VisitController.java
backend/src/main/java/com/waad/tba/modules/member/controller/MemberController.java
backend/src/main/java/com/waad/tba/modules/member/controller/MemberImportController.java
backend/src/main/java/com/waad/tba/modules/dashboard/controller/DashboardController.java
backend/src/main/java/com/waad/tba/modules/insurancepolicy/controller/InsurancePolicyController.java
backend/src/main/java/com/waad/tba/modules/eligibility/controller/EligibilityController.java
backend/src/main/java/com/waad/tba/modules/preauth/controller/PreApprovalController.java
backend/src/main/java/com/waad/tba/modules/admin/system/SystemAdminController.java
backend/src/main/java/com/waad/tba/modules/insurance/controller/InsuranceCompanyController.java
backend/src/main/java/com/waad/tba/modules/medicalpackage/MedicalPackageController.java
backend/src/main/java/com/waad/tba/modules/company/controller/CompanyController.java
```

---

## Conclusion

All 131+ endpoints across 18 controllers have been audited and fixed to ensure:
1. SUPER_ADMIN role always bypasses permission checks
2. All required permissions exist in the database synchronizer
3. Consistent `hasRole('SUPER_ADMIN') or hasAuthority('XXX')` pattern across all controllers

The backend is now ready for testing.
