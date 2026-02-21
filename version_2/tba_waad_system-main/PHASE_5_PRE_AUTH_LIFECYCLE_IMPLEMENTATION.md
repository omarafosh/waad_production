# 🟡 Phase 5: Pre-Authorization Lifecycle Implementation

**Date:** February 2, 2026  
**Status:** In Progress  
**Goal:** Complete Pre-Auth business flow from CREATED → USED/EXPIRED

---

## 📊 Current State Analysis

### Existing Status Enum ✅
```java
public enum PreAuthStatus {
    PENDING,              // ✅ Existing
    UNDER_REVIEW,         // ✅ Existing
    APPROVAL_IN_PROGRESS, // ✅ Existing
    APPROVED,             // ✅ Existing
    REJECTED,             // ✅ Existing
    EXPIRED,              // ✅ Existing - NEEDS WORKFLOW
    CANCELLED,            // ✅ Existing
    USED                  // ✅ Existing - NEEDS WORKFLOW
}
```

**Good News:** All status values already exist!  
**Missing:** Lifecycle transitions (ACKNOWLEDGED is NOT in enum, USED/EXPIRED lack implementation)

### Required Lifecycle Flow
```
CREATED/PENDING
    ↓
UNDER_REVIEW
    ↓
APPROVED
    ↓
ACKNOWLEDGED (Provider viewed approval) ← NEW STATUS NEEDED
    ↓
USED (Linked to claim) ← AUTO-TRANSITION NEEDED
    ↓
EXPIRED (if not used within validity period) ← AUTO-CHECK NEEDED
```

---

## 🎯 Implementation Plan

### ✅ Task 1: Add ACKNOWLEDGED Status to Enum
**File:** `backend/src/main/java/com/waad/tba/modules/preauthorization/entity/PreAuthorization.java`

**Change:**
```java
public enum PreAuthStatus {
    PENDING("معلق"),
    UNDER_REVIEW("قيد المراجعة"),
    APPROVAL_IN_PROGRESS("جاري معالجة الموافقة"),
    APPROVED("موافق عليه"),
    ACKNOWLEDGED("تم الاطلاع"),  // ← ADD THIS
    REJECTED("مرفوض"),
    EXPIRED("منتهي"),
    CANCELLED("ملغي"),
    USED("مستخدم");
    // ...
}
```

### ✅ Task 2: Add Acknowledge Endpoint
**File:** `backend/src/main/java/com/waad/tba/modules/preauthorization/controller/PreAuthorizationController.java`

**New Endpoint:**
```java
@PostMapping("/{id}/acknowledge")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('CREATE_PRE_AUTH')")
public ResponseEntity<ApiResponse<PreAuthorizationResponse>> acknowledgePreAuthorization(
        @PathVariable Long id,
        Authentication authentication) {
    
    String acknowledgedBy = authentication != null ? authentication.getName() : "system";
    PreAuthorizationResponseDto response = preAuthorizationService.acknowledgePreAuthorization(id, acknowledgedBy);
    
    PreAuthorizationResponse apiResponse = apiMapper.toResponse(response);
    return ResponseEntity.ok(ApiResponse.success("Pre-authorization acknowledged", apiResponse));
}
```

### ✅ Task 3: Implement Acknowledge Service Method
**File:** `backend/src/main/java/com/waad/tba/modules/preauthorization/service/PreAuthorizationService.java`

**New Method:**
```java
@Transactional
public PreAuthorizationResponseDto acknowledgePreAuthorization(Long id, String acknowledgedBy) {
    PreAuthorization preAuth = preAuthorizationRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("PreAuthorization not found"));
    
    // Validation: Only APPROVED pre-auths can be acknowledged
    if (preAuth.getStatus() != PreAuthStatus.APPROVED) {
        throw new IllegalStateException("Only APPROVED pre-authorizations can be acknowledged. Current status: " + preAuth.getStatus());
    }
    
    // Transition to ACKNOWLEDGED
    preAuth.setStatus(PreAuthStatus.ACKNOWLEDGED);
    preAuth.setUpdatedBy(acknowledgedBy);
    
    PreAuthorization saved = preAuthorizationRepository.save(preAuth);
    
    // Audit log
    auditService.logStatusChange(id, PreAuthStatus.APPROVED, PreAuthStatus.ACKNOWLEDGED, acknowledgedBy, 
                                  "Provider acknowledged the approval");
    
    return entityToDto(saved);
}
```

### ✅ Task 4: Auto-Mark USED When Linked to Claim
**File:** `backend/src/main/java/com/waad/tba/modules/claim/service/ClaimService.java`

**Enhancement in createClaim():**
```java
// AFTER claim is created successfully:
if (claim.getPreAuthorization() != null) {
    PreAuthorization preAuth = claim.getPreAuthorization();
    
    // Auto-transition to USED if currently APPROVED or ACKNOWLEDGED
    if (preAuth.getStatus() == PreAuthStatus.APPROVED || 
        preAuth.getStatus() == PreAuthStatus.ACKNOWLEDGED) {
        
        preAuth.setStatus(PreAuthStatus.USED);
        preAuth.setUpdatedBy(createdBy);
        preAuthorizationRepository.save(preAuth);
        
        // Audit log
        preAuthAuditService.logStatusChange(
            preAuth.getId(),
            preAuth.getStatus(),
            PreAuthStatus.USED,
            createdBy,
            "Auto-marked as USED when claim #" + claim.getClaimNumber() + " was created"
        );
        
        log.info("✅ Pre-authorization {} auto-marked as USED (linked to claim {})", 
                 preAuth.getReferenceNumber(), claim.getClaimNumber());
    }
}
```

### ✅ Task 5: Auto-Expire Scheduler (Optional - Future Enhancement)
**File:** `backend/src/main/java/com/waad/tba/modules/preauthorization/service/PreAuthorizationExpiryScheduler.java`

**New Scheduled Job:**
```java
@Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
public void expireOldPreAuthorizations() {
    LocalDate today = LocalDate.now();
    
    List<PreAuthorization> approved = preAuthorizationRepository.findByStatusAndExpiryDateBefore(
        PreAuthStatus.APPROVED, today
    );
    
    for (PreAuthorization preAuth : approved) {
        preAuth.setStatus(PreAuthStatus.EXPIRED);
        preAuth.setUpdatedBy("system");
        preAuthorizationRepository.save(preAuth);
        
        auditService.logStatusChange(preAuth.getId(), PreAuthStatus.APPROVED, PreAuthStatus.EXPIRED, 
                                      "system", "Auto-expired (past expiry date)");
    }
    
    log.info("✅ Expired {} pre-authorizations", approved.size());
}
```

---

## 🎨 Frontend Implementation

### ✅ Task 6: Provider Inbox for Approved Pre-Auths
**File:** `frontend/src/pages/provider/PreAuthInbox.jsx` (NEW)

**Features:**
- List APPROVED pre-authorizations for logged-in provider
- Show expiry date countdown
- "تم الاطلاع" button → calls `/api/v1/pre-authorizations/{id}/acknowledge`
- Status badge (APPROVED / ACKNOWLEDGED / USED / EXPIRED)

### ✅ Task 7: Claim Creation - Pre-Auth Selection
**File:** `frontend/src/pages/provider/claims/ClaimCreate.jsx`

**Enhancement:**
- Dropdown to select approved pre-authorization
- Filter: Only show APPROVED or ACKNOWLEDGED pre-auths for the member
- Display selected pre-auth details (service, approved amount)
- On claim submit → backend auto-marks pre-auth as USED

---

## 📋 Testing Checklist

### Happy Path:
1. Provider creates pre-auth → PENDING
2. Reviewer approves → APPROVED
3. Provider views inbox → clicks "تم الاطلاع" → ACKNOWLEDGED
4. Provider creates claim + links pre-auth → pre-auth auto-marked USED
5. Verify audit log has all transitions

### Edge Cases:
1. Try acknowledge PENDING pre-auth → Should fail
2. Try acknowledge USED pre-auth → Should fail
3. Create claim without pre-auth (if service doesn't require PA) → Should work
4. Create claim with EXPIRED pre-auth → Should fail (validation)

---

## 🚀 Deployment Order

1. Backend: Add ACKNOWLEDGED to enum (breaks nothing)
2. Backend: Add acknowledge endpoint
3. Backend: Add auto-USED logic in claim creation
4. Frontend: Provider inbox for approved pre-auths
5. Frontend: Claim creation with pre-auth selection
6. Test end-to-end flow
7. Deploy to production

---

**Status:** Ready to implement
