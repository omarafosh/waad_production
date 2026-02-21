# 🔐 TBA-WAAD Security Model - Quick Reference

## Authorization at a Glance

### SUPER_ADMIN
```
✅ Can access EVERYTHING
✅ NO filters applied (employerId = NULL)
✅ Bypasses ALL checks
```

### INSURANCE_ADMIN
```
✅ Can access EVERYTHING
✅ NO filters applied (employerId = NULL)
✅ Behaves like SUPER_ADMIN
```

### EMPLOYER_ADMIN
```
🔒 Can ONLY access their employer's data
🔒 Filtered by employerId
🔧 Subject to feature flags
```

---

## Code Examples

### Service Layer - List Data with Filtering

```java
@Service
public class MyService {
    private final AuthorizationService authorizationService;
    private final MyRepository repository;
    
    public List<MyDto> findAll() {
        User currentUser = authorizationService.getCurrentUser();
        
        // Get employer filter (NULL for SUPER_ADMIN/INSURANCE_ADMIN)
        Long employerFilter = authorizationService.getEmployerFilterForUser(currentUser);
        
        if (employerFilter != null) {
            // EMPLOYER_ADMIN: Filter by employer
            return repository.findByEmployerId(employerFilter);
        } else {
            // SUPER_ADMIN / INSURANCE_ADMIN: No filter
            return repository.findAll();
        }
    }
}
```

### Service Layer - Check Individual Item Access

```java
public MyDto getById(Long id) {
    User currentUser = authorizationService.getCurrentUser();
    
    // Check if user can access this item
    if (!authorizationService.canAccessMyItem(currentUser, id)) {
        throw new AccessDeniedException("Access denied");
    }
    
    return repository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Not found"));
}
```

### Repository - Add Employer Filtering

```java
@Repository
public interface MyRepository extends JpaRepository<MyEntity, Long> {
    
    // Find by employer ID
    List<MyEntity> findByEmployerId(Long employerId);
    
    // Find by employer ID with pagination
    Page<MyEntity> findByEmployerId(Long employerId, Pageable pageable);
    
    // Search by employer ID
    @Query("SELECT e FROM MyEntity e WHERE e.employer.id = :employerId " +
           "AND LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<MyEntity> searchByEmployerId(@Param("search") String search, 
                                      @Param("employerId") Long employerId);
}
```

---

## Authorization Methods Reference

### Role Checks
```java
authorizationService.isSuperAdmin(user);       // Check if SUPER_ADMIN
authorizationService.isInsuranceAdmin(user);   // Check if INSURANCE_ADMIN
authorizationService.isEmployerAdmin(user);    // Check if EMPLOYER_ADMIN
authorizationService.isProvider(user);         // Check if PROVIDER
authorizationService.isReviewer(user);         // Check if REVIEWER
```

### Access Checks
```java
authorizationService.canAccessMember(user, memberId);   // Check member access
authorizationService.canAccessClaim(user, claimId);     // Check claim access
authorizationService.canAccessVisit(user, visitId);     // Check visit access
authorizationService.canModifyClaim(user, claimId);     // Check claim modification
```

### Filtering
```java
authorizationService.getEmployerFilterForUser(user);    // Get employer filter
// Returns: NULL (no filter) or employerId (filter by employer)
```

### Feature Toggles (EMPLOYER_ADMIN only)
```java
authorizationService.canEmployerViewClaims(user);           // Can view claims?
authorizationService.canEmployerViewVisits(user);           // Can view visits?
authorizationService.canEmployerEditMembers(user);          // Can edit members?
authorizationService.canEmployerDownloadAttachments(user);  // Can download attachments?
```

---

## Logging

The authorization service uses emoji indicators for easy log reading:

```
✅ - Access ALLOWED
❌ - Access DENIED
🔒 - Filtering APPLIED (EMPLOYER_ADMIN)
🔓 - NO filtering (SUPER_ADMIN / INSURANCE_ADMIN)
🔧 - Feature flag check
⚠️ - Warning
📋 - General operation
🔍 - Search operation
```

Example log:
```
✅ canAccessMember: ALLOWED - user=admin@tba.com is SUPER_ADMIN
🔒 Filtering members by employerId=5
❌ Access denied: user=employer1@test.com attempted to access member 999
```

---

## Important Rules

### ✅ DO:
- Use `getEmployerFilterForUser()` for listing/filtering data
- Use `canAccessXxx()` for checking individual item access
- Always check feature flags for EMPLOYER_ADMIN users
- Return empty list/Page when access denied (don't throw exception)
- Log all authorization decisions

### ❌ DON'T:
- Don't use `companyId` for authorization (removed)
- Don't mix RBAC with data filtering
- Don't apply filters to SUPER_ADMIN or INSURANCE_ADMIN
- Don't bypass authorization checks in service layer
- Don't return 403 for list operations (return empty list instead)

---

## Testing Your Code

```java
// Test SUPER_ADMIN access
@Test
void testSuperAdminAccessAll() {
    User superAdmin = createSuperAdminUser();
    
    // Should return NULL (no filter)
    Long filter = authorizationService.getEmployerFilterForUser(superAdmin);
    assertNull(filter);
    
    // Should access everything
    assertTrue(authorizationService.canAccessMember(superAdmin, anyMemberId));
}

// Test EMPLOYER_ADMIN filtering
@Test
void testEmployerAdminFiltering() {
    User employerAdmin = createEmployerAdminUser(employerId: 5L);
    
    // Should return employer ID
    Long filter = authorizationService.getEmployerFilterForUser(employerAdmin);
    assertEquals(5L, filter);
    
    // Should only access their employer's data
    assertTrue(authorizationService.canAccessMember(employerAdmin, memberFromEmployer5));
    assertFalse(authorizationService.canAccessMember(employerAdmin, memberFromEmployer6));
}
```

---

## Full Documentation

For complete documentation, see: [SECURITY-MODEL-REFACTORING.md](SECURITY-MODEL-REFACTORING.md)

---

## Questions?

1. Check the comprehensive documentation first
2. Review `AuthorizationService.java` implementation
3. Look at the examples in this file
4. Check the logs (with emoji indicators)
5. Contact the backend team

---

**Last Updated**: December 17, 2025
