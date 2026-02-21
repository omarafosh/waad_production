# MEDICAL REVIEWER ISOLATION - IMPLEMENTATION GUIDE

**Status:** ✅ **IMPLEMENTED**  
**Date:** 2026-02-12  
**Phase:** NEXT - Medical Reviewer Isolation  

---

## 📋 Executive Summary

Medical Reviewer Isolation is a security feature that restricts medical reviewers to only see and approve/reject claims from specific healthcare providers they are explicitly assigned to. This prevents:

1. **Concurrent Review Conflicts** - Multiple reviewers working on the same claim
2. **Unauthorized Access** - Reviewers accessing claims outside their scope
3. **Review Confusion** - Clear assignment boundaries for each reviewer

---

## 🎯 Business Requirements

### Arabic Requirement:
> "ربط كل مستخدم بدور مراجع طبي يربط ويري فقط مقدمي خدمة محددين حتي لا يحصل تداخل في مراجعة وموافقة ورفض نفس المطالبة لمراجعين"

### Translation:
Link each user with medical reviewer role to see only specific providers to prevent overlap in reviewing, approving, or rejecting the same claim by multiple reviewers.

### Key Rules:
1. Each medical reviewer can be assigned to **multiple providers**
2. Each provider can have **multiple reviewers**
3. Reviewers only see claims from **assigned providers**
4. **Admin** and **SuperAdmin** bypass isolation (see all claims)
5. Assignments are **soft-deleted** (audit trail preserved)

---

## 🏗️ Architecture

### Database Schema

```sql
-- Mapping table: medical_reviewer_providers
CREATE TABLE medical_reviewer_providers (
    id                BIGINT PRIMARY KEY,
    reviewer_id       BIGINT NOT NULL REFERENCES users(id),
    provider_id       BIGINT NOT NULL REFERENCES providers(id),
    active            BOOLEAN DEFAULT true NOT NULL,
    created_at        TIMESTAMP NOT NULL,
    created_by        VARCHAR(255),
    updated_at        TIMESTAMP NOT NULL,
    updated_by        VARCHAR(255),
    
    UNIQUE(reviewer_id, provider_id)
);

-- Indexes for performance
CREATE INDEX idx_mrp_reviewer_active ON medical_reviewer_providers(reviewer_id, active) WHERE active = true;
CREATE INDEX idx_mrp_provider_active ON medical_reviewer_providers(provider_id, active) WHERE active = true;
CREATE INDEX idx_mrp_created_at ON medical_reviewer_providers(created_at DESC);
```

### Entity Model

```
┌─────────────────────────────────┐
│ MedicalReviewerProvider         │
├─────────────────────────────────┤
│ + id: Long                      │
│ + reviewer: User (FK)           │
│ + provider: Provider (FK)       │
│ + active: Boolean               │
│ + createdAt: LocalDateTime      │
│ + createdBy: String             │
│ + updatedAt: LocalDateTime      │
│ + updatedBy: String             │
└─────────────────────────────────┘
         │
         │ Many-to-One
         ├─────────────► User (reviewer)
         │
         │ Many-to-One
         └─────────────► Provider
```

---

## 🔐 Security Model

### Role-Based Isolation

| Role | Isolation | Sees |
|------|-----------|------|
| **MEDICAL_REVIEWER** | ✅ YES | Only claims from assigned providers |
| **ADMIN** | ❌ NO (Bypass) | All claims |
| **SUPER_ADMIN** | ❌ NO (Bypass) | All claims |
| **EMPLOYER** | ❌ NO | Claims from own employer only |
| **PROVIDER** | ❌ NO | Claims from own provider only |

### Defense-in-Depth (3 Layers)

```
┌─────────────────────────────────────────────────┐
│ Layer 1: QUERY FILTERING                       │
│ Repository queries filter by provider IDs       │
│ → searchPagedByReviewerProviders()              │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 2: SERVICE VALIDATION                     │
│ Defensive checks before operations              │
│ → validateReviewerAccess(user, providerId)      │
│ → Throws AccessDeniedException if unauthorized  │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 3: LIST FILTERING                         │
│ Search/list methods apply isolation             │
│ → listClaims() checks isSubjectToIsolation()    │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Details

### 1. Core Service: ReviewerProviderIsolationService

**Purpose:** Central isolation logic and validation

**Key Methods:**

```java
// Check if user is subject to isolation
boolean isSubjectToIsolation(User user)

// Get provider IDs reviewer has access to
List<Long> getAllowedProviderIds(User user)

// Defensive validation (throws AccessDeniedException)
void validateReviewerAccess(User user, Long providerId)

// Quick check for assignments
boolean hasAnyProviderAssignments(Long userId)
```

**Usage Example:**

```java
@Transactional
public ClaimViewDto approveClaim(Long claimId, ClaimApproveDto dto) {
    Claim claim = claimRepository.findByIdForUpdate(claimId);
    User currentUser = authorizationService.getCurrentUser();
    
    // DEFENSIVE VALIDATION - throws AccessDeniedException if unauthorized
    reviewerIsolationService.validateReviewerAccess(currentUser, claim.getProviderId());
    
    // Proceed with approval...
}
```

---

### 2. Repository Queries

**Isolation-Aware Queries Added to ClaimRepository:**

```java
// Search with reviewer provider filter
Page<Claim> searchPagedByReviewerProviders(
    String keyword,
    List<Long> providerIds,
    Pageable pageable
);

// Search with filters + reviewer provider filter
Page<Claim> searchPagedWithFiltersAndReviewerProviders(
    String keyword,
    List<Long> providerIds,
    Long employerId,
    ClaimStatus status,
    LocalDate dateFrom,
    LocalDate dateTo,
    Pageable pageable
);

// Find by status + reviewer provider filter
Page<Claim> findByStatusInAndReviewerProviders(
    List<Long> providerIds,
    List<ClaimStatus> statuses,
    Pageable pageable
);
```

---

### 3. Protected ClaimService Methods

**Methods with Defensive Validation:**

| Method | Protection | Throws AccessDeniedException |
|--------|------------|------------------------------|
| `approveClaim()` | ✅ Write + Validate | If reviewer not assigned to provider |
| `rejectClaim()` | ✅ Write + Validate | If reviewer not assigned to provider |
| `getClaim()` | ✅ Read + Validate | If reviewer not assigned to provider |
| `listClaims()` | ✅ List + Filter | Returns empty if no assignments |
| `getPendingClaims()` | ✅ List + Filter | Returns empty if no assignments |
| `getApprovedClaims()` | ✅ List + Filter | Returns empty if no assignments |

---

## 📊 Example Scenarios

### Scenario 1: Reviewer Assignment

```
┌─────────────────────────────────────────────────┐
│ Dr. Ahmed (Medical Reviewer)                    │
│ Assigned to:                                    │
│   - Provider A (Clinic Al-Salam)                │
│   - Provider B (Hospital Al-Noor)               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Dr. Fatima (Medical Reviewer)                   │
│ Assigned to:                                    │
│   - Provider C (Medical Center Al-Amal)         │
└─────────────────────────────────────────────────┘
```

**What Dr. Ahmed Sees:**
- ✅ Claims from Clinic Al-Salam (Provider A)
- ✅ Claims from Hospital Al-Noor (Provider B)
- ❌ Claims from Medical Center Al-Amal (Provider C) - **HIDDEN**

**What Dr. Fatima Sees:**
- ❌ Claims from Clinic Al-Salam (Provider A) - **HIDDEN**
- ❌ Claims from Hospital Al-Noor (Provider B) - **HIDDEN**
- ✅ Claims from Medical Center Al-Amal (Provider C)

**What Admin Sees:**
- ✅ All claims from all providers (bypass isolation)

---

### Scenario 2: Concurrent Review Prevention

**Problem Without Isolation:**
```
Claim #1234 (Provider A) - UNDER_REVIEW

Dr. Ahmed: Opens claim → Approves
Dr. Fatima: Opens claim → Approves   ❌ CONFLICT!
```

**Solution With Isolation:**
```
Claim #1234 (Provider A) - UNDER_REVIEW

Dr. Ahmed (assigned to Provider A): 
  ✅ Sees claim → Can approve

Dr. Fatima (NOT assigned to Provider A):
  ❌ Doesn't see claim in list
  ❌ If tries direct access → AccessDeniedException
```

---

### Scenario 3: Unauthorized Access Attempt

```java
// Dr. Fatima tries to approve claim from Provider A (not assigned)

// Request: POST /api/claims/1234/approve
// User: dr.fatima (MEDICAL_REVIEWER, assigned to Provider C only)
// Claim #1234: providerId = Provider A

// Service layer:
reviewerIsolationService.validateReviewerAccess(dr.fatima, providerA);

// Result:
throw AccessDeniedException(
  "Medical reviewer 200 does not have access to provider 10. " +
  "Reviewers can only access claims from assigned providers."
);

// HTTP Response: 403 Forbidden
```

---

## 🧪 Testing

### Unit Tests (ReviewerProviderIsolationServiceTest.java)

**11 Test Cases:**
1. ✅ `testIsSubjectToIsolation_MedicalReviewer_ReturnsTrue()`
2. ✅ `testIsSubjectToIsolation_Admin_ReturnsFalse()`
3. ✅ `testIsSubjectToIsolation_SuperAdmin_ReturnsFalse()`
4. ✅ `testGetAllowedProviderIds_ReturnsAssignedProviders()`
5. ✅ `testGetAllowedProviderIds_NoAssignments_ReturnsEmptyList()`
6. ✅ `testValidateReviewerAccess_HasAccess_NoException()`
7. ✅ `testValidateReviewerAccess_NoAccess_ThrowsAccessDeniedException()`
8. ✅ `testValidateReviewerAccess_AdminUser_BypassesValidation()`
9. ✅ `testValidateReviewerAccess_SuperAdminUser_BypassesValidation()`
10. ✅ `testHasAnyProviderAssignments_WithAssignments_ReturnsTrue()`
11. ✅ `testScenario_ReviewerCanOnlyApproveAssignedProviders()`

### Integration Test Scenarios

```java
// Scenario: Reviewer sees only assigned providers in list
@Test
void testListClaims_MedicalReviewer_OnlySeesAssignedProviders() {
    // Given: 
    // - Reviewer assigned to Provider 10, 20
    // - Claims exist for Provider 10, 20, 30
    
    // When: reviewer calls listClaims()
    
    // Then:
    // - Returns claims from Provider 10, 20 only
    // - Claims from Provider 30 are hidden
}

// Scenario: Admin sees all claims (bypass)
@Test
void testListClaims_Admin_SeesAllClaims() {
    // Given: Claims from Provider 10, 20, 30
    
    // When: admin calls listClaims()
    
    // Then: Returns all claims regardless of provider
}
```

---

## 📝 Admin Management API (To Be Implemented)

### Endpoints

```
POST   /api/admin/reviewer-providers          - Assign reviewer to provider
DELETE /api/admin/reviewer-providers/{id}     - Remove assignment (soft delete)
GET    /api/admin/reviewer-providers          - List all assignments
GET    /api/admin/reviewers/{id}/providers    - Get providers for reviewer
GET    /api/admin/providers/{id}/reviewers    - Get reviewers for provider
PUT    /api/admin/reviewer-providers/{id}/activate   - Reactivate assignment
```

### Example Request

```json
POST /api/admin/reviewer-providers
Content-Type: application/json

{
  "reviewerId": 100,
  "providerId": 10
}
```

### Example Response

```json
{
  "id": 1,
  "reviewerId": 100,
  "reviewerName": "Dr. Ahmed",
  "providerId": 10,
  "providerName": "Clinic Al-Salam",
  "active": true,
  "createdAt": "2026-02-12T10:30:00",
  "createdBy": "admin"
}
```

---

## ⚠️ Important Notes

### 1. Financial Logic Unchanged
✅ **No changes** to financial calculations, deductible logic, or settlement  
✅ Only **isolation layer** added on top of existing logic  
✅ All financial guarantees remain intact  

### 2. Migration Safety
✅ New table with proper indexes  
✅ No data loss - soft delete preserves audit trail  
✅ Backward compatible - existing code works without assignments  

### 3. Performance Considerations
✅ Partial indexes reduce index size  
✅ Query filters applied at database level  
✅ Eager loading prevents N+1 queries  

---

## 🚀 Next Steps

### Immediate (Before Production):
- [ ] Create admin management controller
- [ ] Add DTO classes for API requests/responses
- [ ] Create integration tests with real database
- [ ] Add OpenAPI/Swagger documentation

### Future Enhancements:
- [ ] UI for managing reviewer-provider mappings
- [ ] Bulk assignment operations
- [ ] Assignment history tracking
- [ ] Reviewer workload analytics

---

## 📚 Files Modified/Created

### Database
- ✅ `V1_13__medical_reviewer_provider_mapping.sql` - Migration script

### Entity Layer
- ✅ `MedicalReviewerProvider.java` - Mapping entity

### Repository Layer
- ✅ `MedicalReviewerProviderRepository.java` - New repository
- ✅ `ClaimRepository.java` - Added 3 isolation-aware queries

### Service Layer
- ✅ `ReviewerProviderIsolationService.java` - Core isolation logic
- ✅ `ClaimService.java` - Added defensive validation

### Tests
- ✅ `ReviewerProviderIsolationServiceTest.java` - 11 unit tests

---

## ✅ Verification Checklist

- [x] Database migration created with indexes
- [x] Entity with proper relationships
- [x] Repository with efficient queries
- [x] Service with defensive validation
- [x] ClaimService methods protected (approve, reject, getClaim)
- [x] List methods filtered (listClaims, getPendingClaims, getApprovedClaims)
- [x] Unit tests with 11 test cases
- [x] Admin/SuperAdmin bypass logic
- [x] Role detection (MEDICAL_REVIEWER)
- [x] No changes to financial logic
- [ ] Integration tests
- [ ] Admin management API
- [ ] Swagger documentation

---

**Status:** ✅ **CORE IMPLEMENTATION COMPLETE**  
**Ready for:** Integration Testing → Admin API → Production Deployment  

---

*Last Updated: 2026-02-12*  
*Implementation Phase: Medical Reviewer Isolation*
