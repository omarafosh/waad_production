# TBA-WAAD Security Model Refactoring

## Date: December 17, 2025

## Overview
This document describes the **SIMPLIFIED SECURITY MODEL** refactoring performed on the TBA-WAAD system to eliminate unnecessary complexity and establish clear, maintainable authorization rules.

---

## 🎯 Problem Statement

### Issues with Previous Model:
1. **Mixed authorization logic**: employerId and companyId were both used for data filtering
2. **Inconsistent SUPER_ADMIN behavior**: Sometimes restricted by companyId checks
3. **Over-complicated insurance company filtering**: Despite having only ONE insurance company
4. **403 errors for authorized users**: Due to mixing UI filters with backend authorization
5. **Difficult to debug and maintain**: Authorization logic spread across multiple layers

---

## ✅ Solution: Simplified Security Model

### Core Business Rules (FINAL):
1. **There is ONLY ONE insurance company** in the system
2. **Insurance companies are NOT a security boundary**
3. **Companies table is SYSTEM-LEVEL only** (branding, settings, feature flags)
4. **Employers are the ONLY data-level security boundary**

---

## 🔐 Authorization Roles

### 1. SUPER_ADMIN
- **Behavior**: GOD MODE - bypasses ALL authorization checks
- **Data Access**: Can access EVERYTHING without any restrictions
- **Filtering**: NEVER filtered by employerId or companyId
- **Implementation**: Always returns `true` for access checks, `null` for filters

### 2. INSURANCE_ADMIN
- **Behavior**: Behaves like SUPER_ADMIN for data access (for now)
- **Data Access**: Can access ALL data without restrictions
- **Filtering**: NO companyId filtering (single insurance company model)
- **Implementation**: Same as SUPER_ADMIN - returns `true` for access, `null` for filters

### 3. EMPLOYER_ADMIN
- **Behavior**: Restricted STRICTLY by their employerId
- **Data Access**: Can ONLY access data belonging to their employer
- **Filtering**: Applied to: members, claims, visits, pre-approvals
- **Implementation**: Returns employerId for filtering
- **Feature Toggles**: Subject to employer-specific feature flags

### 4. PROVIDER
- **Behavior**: Restricted by provider-specific logic (to be implemented)
- **Data Access**: Can access claims (provider-specific logic TBD)
- **Filtering**: None (for now)

### 5. REVIEWER
- **Behavior**: Can access claims for review purposes only
- **Data Access**: Full access to claims
- **Filtering**: None

---

## 📋 Key Principles

### 1. RBAC ≠ Data Filtering
- **RBAC (permissions)**: Decides WHAT modules a user can access
- **Data filtering**: Decides WHICH rows they can see
- **These are TWO SEPARATE concerns**

### 2. Authorization Flow
```
Request → Authentication → RBAC Check → Data-Level Filtering → Response
```

### 3. Filtering Logic
```java
// SUPER_ADMIN & INSURANCE_ADMIN
getEmployerFilterForUser() → NULL (no filtering)

// EMPLOYER_ADMIN
getEmployerFilterForUser() → user.employerId

// Service Layer Usage
if (employerFilter != null) {
    return repository.findByEmployerId(employerFilter);
} else {
    return repository.findAll();
}
```

---

## 🔨 Changes Made

### 1. AuthorizationService.java
**Location**: `backend/src/main/java/com/waad/tba/security/AuthorizationService.java`

#### Removed Methods:
- ❌ `hasCompanyAccess(User, Long)` - No longer needed (no company filtering)
- ❌ `getCompanyFilterForUser(User)` - Removed company-based filtering

#### Updated Methods:
- ✅ `canAccessMember()` - INSURANCE_ADMIN now has full access
- ✅ `canAccessClaim()` - Simplified logic, no company checks
- ✅ `canAccessVisit()` - Simplified logic, no company checks
- ✅ `getEmployerFilterForUser()` - Returns NULL for SUPER_ADMIN & INSURANCE_ADMIN
- ✅ Feature toggle methods - SUPER_ADMIN & INSURANCE_ADMIN bypass all feature flags

#### New Documentation:
- 📝 Comprehensive header explaining the security model
- 📝 Clear comments for each authorization rule
- 📝 Emoji indicators for better log readability (✅, ❌, 🔒, 🔓)

---

### 2. MemberService.java
**Location**: `backend/src/main/java/com/waad/tba/modules/member/service/MemberService.java`

#### Changes:
- ✅ Added `AuthorizationService` injection
- ✅ `getSelectorOptions()` - Now applies employerId filtering
- ✅ `getMember()` - Added access authorization check
- ✅ `listMembers()` - Applies employerId filtering for pagination
- ✅ `search()` - Applies employerId filtering for search
- ✅ `count()` - Applies employerId filtering for count

---

### 3. MemberRepository.java
**Location**: `backend/src/main/java/com/waad/tba/modules/member/repository/MemberRepository.java`

#### Added Methods:
- ✅ `searchPagedByEmployerId()` - Search members by employer with pagination
- ✅ `searchByEmployerId()` - Search members by employer (non-paginated)

---

### 4. ClaimService.java
**Location**: `backend/src/main/java/com/waad/tba/modules/claim/service/ClaimService.java`

#### Changes:
- ✅ Added `AuthorizationService` injection
- ✅ `getClaim()` - Added access authorization and feature flag checks
- ✅ `listClaims()` - Applies employerId filtering for pagination
- ✅ `getClaimsByMember()` - Added member access authorization check
- ✅ `search()` - Applies employerId filtering for search
- ✅ `countClaims()` - Applies employerId filtering for count

---

### 5. ClaimRepository.java
**Location**: `backend/src/main/java/com/waad/tba/modules/claim/repository/ClaimRepository.java`

#### Added Methods:
- ✅ `searchPagedByEmployerId()` - Search claims by employer with pagination
- ✅ `searchByEmployerId()` - Search claims by employer (non-paginated)
- ✅ `countByMemberEmployerId()` - Count claims filtered by employer

---

### 6. VisitService.java
**Location**: `backend/src/main/java/com/waad/tba/modules/visit/service/VisitService.java`

#### Changes:
- ❌ Removed `getCompanyFilterForUser()` usage
- ✅ INSURANCE_ADMIN now returns ALL visits (no company filtering)
- ✅ Improved logging with emoji indicators

---

## 🧪 Testing Checklist

### SUPER_ADMIN Tests:
- [ ] Can access ALL members without restriction
- [ ] Can access ALL claims without restriction
- [ ] Can access ALL visits without restriction
- [ ] Can access ALL employers without restriction
- [ ] No 403 errors on any endpoint
- [ ] All menus visible in frontend

### INSURANCE_ADMIN Tests:
- [ ] Can access ALL members without restriction
- [ ] Can access ALL claims without restriction
- [ ] Can access ALL visits without restriction
- [ ] No companyId filtering applied
- [ ] Feature flags DO NOT apply to INSURANCE_ADMIN

### EMPLOYER_ADMIN Tests:
- [ ] Can ONLY access members from their employer
- [ ] Can ONLY access claims from their employer's members
- [ ] Can ONLY access visits from their employer's members
- [ ] Cannot access other employers' data
- [ ] Feature flags correctly applied
- [ ] Proper 403 when feature disabled

### General Tests:
- [ ] No null pointer exceptions in authorization logic
- [ ] Proper error messages for unauthorized access
- [ ] Audit logs capture all access attempts
- [ ] Performance: No N+1 query problems

---

## 📊 Database Impact

### NO SCHEMA CHANGES
- ✅ All existing tables remain unchanged
- ✅ `companyId` column still exists in `users` table (not used for authorization)
- ✅ `insuranceCompanyId` column still exists in `members` table (not used for authorization)
- ✅ Changes are LOGICAL only, not STRUCTURAL

---

## 🚀 Deployment Notes

### Prerequisites:
1. Backup database before deployment
2. Test with sample data for each role
3. Verify existing sessions continue to work

### Deployment Steps:
1. Deploy backend changes (AuthorizationService + Services + Repositories)
2. Monitor logs for authorization errors
3. Verify SUPER_ADMIN access to all modules
4. Verify EMPLOYER_ADMIN restrictions work correctly

### Rollback Plan:
- Git revert commit if critical issues arise
- No database rollback needed (no schema changes)

---

## 📝 Future Improvements

### Phase 1 (Immediate):
- [ ] Add integration tests for authorization logic
- [ ] Add provider-specific authorization logic
- [ ] Implement `createdBy` field for claims (provider ownership)

### Phase 2 (Later):
- [ ] Consider removing `companyId` from `User` entity (if confirmed unused)
- [ ] Consider removing insurance company filtering from `Member` entity
- [ ] Implement audit dashboard for authorization failures

---

## 🎓 Developer Guide

### How to Add a New Protected Endpoint:

```java
@GetMapping("/my-endpoint")
@PreAuthorize("hasAuthority('VIEW_MY_MODULE')")  // <-- RBAC Check
public ResponseEntity<List<MyDto>> getMyData() {
    User currentUser = authorizationService.getCurrentUser();
    
    // Apply data-level filtering
    Long employerFilter = authorizationService.getEmployerFilterForUser(currentUser);
    
    List<MyEntity> data;
    if (employerFilter != null) {
        // EMPLOYER_ADMIN: Filter by employer
        data = myRepository.findByEmployerId(employerFilter);
    } else {
        // SUPER_ADMIN / INSURANCE_ADMIN: No filter
        data = myRepository.findAll();
    }
    
    return ResponseEntity.ok(ApiResponse.success(data));
}
```

### How to Check Individual Item Access:

```java
@GetMapping("/{id}")
@PreAuthorize("hasAuthority('VIEW_MY_MODULE')")
public ResponseEntity<MyDto> getMyItem(@PathVariable Long id) {
    User currentUser = authorizationService.getCurrentUser();
    
    // Check authorization for specific item
    if (!authorizationService.canAccessMyItem(currentUser, id)) {
        throw new AccessDeniedException("Access denied");
    }
    
    MyEntity item = myRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Not found"));
    
    return ResponseEntity.ok(ApiResponse.success(item));
}
```

---

## 🐛 Known Issues

### None at this time

If issues arise:
1. Check application logs for authorization errors
2. Verify user's `employerId` is set correctly
3. Verify feature flags are configured properly
4. Verify RBAC permissions are assigned correctly

---

## 📞 Support

For questions or issues with the security model:
- Review this document first
- Check `AuthorizationService.java` for implementation details
- Review logs with emoji indicators (✅ = allowed, ❌ = denied)
- Contact the backend team for assistance

---

## ✍️ Changelog

### Version 2.0 - December 17, 2025
- **BREAKING**: Removed `getCompanyFilterForUser()` method
- **BREAKING**: Removed `hasCompanyAccess()` method
- **IMPROVED**: SUPER_ADMIN and INSURANCE_ADMIN now have full access without company restrictions
- **IMPROVED**: Simplified authorization logic across all services
- **ADDED**: Comprehensive documentation and logging
- **ADDED**: employerId filtering for Members, Claims, Visits
- **ADDED**: Access authorization checks for individual items

### Version 1.0 - Previous Implementation
- Mixed employerId and companyId filtering
- Complex authorization logic
- SUPER_ADMIN sometimes restricted

---

## 🎉 Conclusion

This refactoring establishes a **clear, maintainable, and debuggable** security model that:
- ✅ Aligns with business requirements (single insurance company)
- ✅ Eliminates unnecessary complexity
- ✅ Provides clear separation between RBAC and data filtering
- ✅ Makes SUPER_ADMIN truly "super"
- ✅ Enables easier future development

**The system is now ready for stable, scalable growth.**
