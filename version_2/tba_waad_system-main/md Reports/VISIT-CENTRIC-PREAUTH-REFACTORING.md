# Visit-Centric Architecture - Pre-Authorization Refactoring

## Date: 2026-01-14

## Overview

This document summarizes the architectural refactoring to enforce Visit-Centric Architecture for Pre-Authorizations in the Provider Portal.

## Architectural Rule

**Pre-authorizations can ONLY be created from an existing Visit.**

```
Eligibility Check → Register Visit → Create Pre-Authorization/Claim
     (Step 1)         (Step 2)              (Step 3)
```

## Changes Made

### 1. Provider Portal Menu (Frontend)

**File:** `frontend/src/menu-items/components.jsx`

**Changes:**
- Removed `provider-pre-approvals` menu item from Provider Portal
- Pre-approvals are now only accessible via Visit Log
- Updated RBAC rules for PROVIDER role to hide standalone pre-approvals

**Before:**
```jsx
{
  id: 'provider-pre-approvals',
  title: 'الموافقات المسبقة',
  url: '/pre-approvals',
  ...
}
```

**After:**
- Menu item removed entirely
- Comment added explaining architectural decision

### 2. Pre-Approval Create Page (Frontend)

**File:** `frontend/src/pages/pre-approvals/PreApprovalCreate.jsx`

**Changes:**
- Added access blocking when `visitId` is not provided
- Shows informative error screen guiding users to correct flow
- Updated validation to require `visitId`
- Member selector is locked when linked to visit

**New Behavior:**
- Direct access to `/pre-approvals/add` shows "Access Blocked" screen
- Must navigate from Visit Log with proper state containing `visitId`

### 3. Backend DTO Validation

**File:** `backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationCreateDto.java`

**Changes:**
- Added `visitId` field with `@NotNull` validation
- Added clear documentation comments

```java
@NotNull(message = "Visit ID is required - Pre-authorization must originate from a Visit")
@Positive(message = "Visit ID must be positive")
private Long visitId;
```

### 4. Simplified DTO Validation

**File:** `backend/src/main/java/com/waad/tba/modules/preauth/dto/PreApprovalSimpleCreateDto.java`

**Changes:**
- Made `visitId` required with `@NotNull` annotation
- Added Arabic validation messages

```java
@NotNull(message = "معرف الزيارة مطلوب - يجب إنشاء الموافقة المسبقة من سجل الزيارات")
@Positive(message = "معرف الزيارة يجب أن يكون رقماً موجباً")
private Long visitId;
```

### 5. Backend Service Validation

**File:** `backend/src/main/java/com/waad/tba/modules/preauthorization/service/PreAuthorizationService.java`

**Changes:**
- Added Visit existence validation before creating pre-authorization
- Validates visit is not cancelled
- Validates member ID matches between DTO and Visit
- Added `VisitRepository` dependency

**File:** `backend/src/main/java/com/waad/tba/modules/preauth/service/PreApprovalService.java`

**Changes:**
- Enhanced visit validation with error throwing instead of silent skip
- Added member ID cross-validation

### 6. Database Migration

**File:** `backend/src/main/resources/db/migration/V041__enforce_visit_centric_preauth.sql`

**Changes:**
- Added foreign key constraint `fk_preauth_visit` 
- Added documentation comments on column
- Historical records with NULL `visit_id` are preserved

## Acceptance Criteria Verification

| Criteria | Status |
|----------|--------|
| ✅ Provider Portal has NO standalone Pre-Authorization page | ✓ Removed from menu |
| ✅ Pre-Authorization menu item is removed | ✓ Removed `provider-pre-approvals` |
| ✅ Eligibility does not redirect anywhere | ✓ Only "Register Visit" button |
| ✅ Visit Log is the ONLY place to create Pre-Approvals | ✓ Enforced via frontend blocking |
| ✅ Creating Pre-Authorization without visitId fails | ✓ Backend validation added |
| ✅ No Unified Workflow APIs exist | ✓ No unified workflow found |
| ✅ No auto-navigation between steps | ✓ Eligibility only registers visit |

## Files Modified

### Frontend
- `frontend/src/menu-items/components.jsx` - Removed pre-auth menu item
- `frontend/src/pages/pre-approvals/PreApprovalCreate.jsx` - Added access blocking

### Backend
- `backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationCreateDto.java` - Added visitId requirement
- `backend/src/main/java/com/waad/tba/modules/preauthorization/service/PreAuthorizationService.java` - Added visit validation
- `backend/src/main/java/com/waad/tba/modules/preauth/dto/PreApprovalSimpleCreateDto.java` - Added visitId requirement
- `backend/src/main/java/com/waad/tba/modules/preauth/service/PreApprovalService.java` - Enhanced visit validation

### Database
- `backend/src/main/resources/db/migration/V041__enforce_visit_centric_preauth.sql` - FK constraint

## User Flow (New)

### For Provider Portal Users:

1. **Eligibility Check** (`/provider/eligibility-check`)
   - Enter card number or scan barcode
   - Verify member eligibility
   - Select family member
   - Click "Register Visit"

2. **Visit Log** (`/provider/visits`)
   - See all registered visits
   - For eligible visit, click "موافقة مسبقة" (Pre-Authorization) button
   - This navigates to pre-auth create with visit context

3. **Create Pre-Authorization** (`/pre-approvals/add`)
   - Visit ID is pre-filled and locked
   - Member is pre-selected and locked
   - Fill remaining form fields
   - Submit

## Error Handling

### Direct Access Attempt
When users try to access `/pre-approvals/add` directly:

```
┌─────────────────────────────────────────┐
│         🚫 الوصول غير مسموح              │
│                                         │
│  لا يمكن إنشاء موافقة مسبقة بشكل مباشر.   │
│  يجب أن تكون الموافقة المسبقة مرتبطة      │
│  بزيارة مسجلة.                          │
│                                         │
│  📋 طريقة إنشاء موافقة مسبقة:           │
│  1. التحقق من الأهلية                   │
│  2. تسجيل زيارة                         │
│  3. من سجل الزيارات، اضغط "موافقة مسبقة"  │
│                                         │
│  [التحقق من الأهلية]  [سجل الزيارات]     │
└─────────────────────────────────────────┘
```

### Backend Validation Errors
- Missing visitId: `"Visit ID is required - Pre-authorization must originate from a Visit"`
- Invalid visitId: `"Visit not found with ID: X. Pre-authorization MUST be linked to an existing Visit."`
- Cancelled visit: `"Cannot create pre-authorization for a cancelled visit"`
- Member mismatch: `"Member ID mismatch: request member X does not match visit member Y"`

## Notes

1. **Historical Data:** Pre-authorizations created before this policy (with NULL visit_id) are preserved and remain functional.

2. **Migration Safety:** The migration uses `ON DELETE SET NULL` to prevent cascade deletion of pre-authorizations when visits are deleted.

3. **RBAC:** Provider role explicitly hides `pre-approvals` from their allowed modules.
