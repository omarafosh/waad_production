# Domain Model Refactoring Summary
## Consolidation to Single Employer Entity

**Date:** 2026-02-13  
**Architectural Decision:** Employer is the ONLY top-level business entity

---

## ✅ What Was Completed

### 1. Database Schema Migration (V2_21)

**File:** `backend/src/main/resources/db/migration/V2_21__consolidate_to_employer_only.sql`

#### Changes Made:
- ✅ Removed `organizations` table completely (DROP CASCADE)
- ✅ Removed `organization_seq` sequence
- ✅ Removed `organization_type` concept
- ✅ Removed `companies.organization_id` column and FK
- ✅ Renamed `provider_contracts.organization_id` → `employer_id`
- ✅ Renamed `benefit_policies.organization_id` → `employer_id`
- ✅ Renamed `members.employer_org_id` → `employer_id`
- ✅ Removed `members.insurance_org_id` column
- ✅ Renamed `visits.employer_org_id` → `employer_id` (if exists)
- ✅ Renamed `network_providers.organization_id` → `employer_id` (if exists)
- ✅ Removed `users.organization_id` column
- ✅ Removed `claims.insurance_org_id` column
- ✅ Updated all FK constraints to reference `companies` table
- ✅ Updated all indexes to use `employer_id`

### 2. Core Entity Updates

#### Employer Entity (✅ Complete)
**File:** `backend/src/main/java/com/waad/tba/modules/employer/entity/Employer.java`

- ✅ Removed `@Deprecated` annotation
- ✅ Updated documentation to reflect it's the ONLY business entity
- ✅ Maps to `companies` table
- ✅ Contains: id, code, name, address, phone, email, active

#### Member Entity (✅ Complete)
**File:** `backend/src/main/java/com/waad/tba/modules/member/entity/Member.java`

**Before:**
```java
@ManyToOne
@JoinColumn(name = "employer_org_id")
private Organization employerOrganization;

@ManyToOne
@JoinColumn(name = "insurance_org_id")
private Organization insuranceOrganization;
```

**After:**
```java
@ManyToOne
@JoinColumn(name = "employer_id")
private Employer employer;
```

#### BenefitPolicy Entity (✅ Complete)
**File:** `backend/src/main/java/com/waad/tba/modules/benefitpolicy/entity/BenefitPolicy.java`

**Before:**
```java
@ManyToOne
@JoinColumn(name = "employer_org_id")
private Organization employerOrganization;

@ManyToOne
@JoinColumn(name = "insurance_org_id")
private Organization insuranceOrganization;
```

**After:**
```java
@ManyToOne
@JoinColumn(name = "employer_id")
private Employer employer;
```

#### Claim Entity (✅ Complete)
**File:** `backend/src/main/java/com/waad/tba/modules/claim/entity/Claim.java`

**Before:**
```java
@ManyToOne
@JoinColumn(name = "insurance_org_id")
private Organization insuranceOrganization;
```

**After:**
```java
// REMOVED: No insurance organization concept
```

#### Visit Entity (✅ Complete)
**File:** `backend/src/main/java/com/waad/tba/modules/visit/entity/Visit.java`

**Before:**
```java
@ManyToOne
@JoinColumn(name = "employer_org_id")
private Organization employerOrganization;
```

**After:**
```java
@ManyToOne
@JoinColumn(name = "employer_id")
private Employer employer;
```

### 3. Interface Updates

#### EmployerScoped Interface (✅ Complete)
**File:** `backend/src/main/java/com/waad/tba/common/entity/EmployerScoped.java`

**Before:**
```java
Long getEmployerOrganizationId();
```

**After:**
```java
Long getEmployerId();
```

### 4. Removed Files (✅ Complete)

- ✅ `com/waad/tba/common/entity/Organization.java`
- ✅ `com/waad/tba/common/enums/OrganizationType.java`
- ✅ `com/waad/tba/common/repository/OrganizationRepository.java`
- ✅ `com/waad/tba/common/service/OrganizationContextService.java`

---

## ⚠️ What Remains (Compilation Errors)

The following files have compilation errors due to Organization removal. They need to be updated to use Employer instead:

### Services (11 files)
1. `com/waad/tba/services/pdf/templates/BenefitPolicyReportTemplate.java`
2. `com/waad/tba/modules/provider/service/ProviderReportsService.java`
3. `com/waad/tba/modules/provider/service/ProviderVisitService.java`
4. `com/waad/tba/modules/provider/service/ProviderService.java`
5. `com/waad/tba/modules/provider/service/ProviderPortalService.java`
6. `com/waad/tba/modules/dashboard/service/DashboardService.java`
7. `com/waad/tba/modules/benefitpolicy/service/BenefitPolicyService.java`
8. `com/waad/tba/modules/employer/service/EmployerService.java`
9. `com/waad/tba/modules/preauthorization/service/PreAuthorizationService.java`
10. `com/waad/tba/modules/claim/service/ClaimFinancialSummaryService.java`
11. `com/waad/tba/modules/eligibility/service/EligibilityEngineServiceImpl.java`

### Repositories (4 files)
1. `com/waad/tba/modules/benefitpolicy/repository/BenefitPolicyRepository.java`
2. `com/waad/tba/modules/employer/repository/EmployerRepository.java`
3. `com/waad/tba/modules/visit/repository/VisitRepository.java`
4. `com/waad/tba/modules/claim/repository/ClaimRepository.java`
5. `com/waad/tba/modules/member/repository/MemberRepository.java`

### DTOs (3 files)
1. `com/waad/tba/modules/benefitpolicy/dto/BenefitPolicyResponseDto.java`
2. `com/waad/tba/modules/member/dto/MemberCreateDto.java`
3. `com/waad/tba/modules/member/dto/MemberSearchDto.java`

### Mappers (3 files)
1. `com/waad/tba/modules/employer/mapper/EmployerMapper.java`
2. `com/waad/tba/modules/visit/mapper/VisitMapper.java`
3. `com/waad/tba/modules/claim/mapper/ClaimMapper.java`

### Other (6 files)
1. `com/waad/tba/modules/provider/entity/ProviderAllowedEmployer.java`
2. `com/waad/tba/modules/eligibility/domain/EligibilityContext.java`
3. `com/waad/tba/modules/member/service/MemberExcelImportService.java`
4. `com/waad/tba/modules/member/service/UnifiedMemberService.java`
5. `com/waad/tba/modules/member/service/MemberExcelExportService.java`
6. `com/waad/tba/modules/member/service/MemberExcelTemplateService.java`

**Total:** ~30 files requiring updates

---

## 🔄 Required Changes Pattern

For each affected file, the typical changes needed are:

### 1. Import Statements
**Before:**
```java
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.enums.OrganizationType;
import com.waad.tba.common.repository.OrganizationRepository;
```

**After:**
```java
import com.waad.tba.modules.employer.entity.Employer;
import com.waad.tba.modules.employer.repository.EmployerRepository;
```

### 2. Repository Methods
**Before:**
```java
List<BenefitPolicy> findByEmployerOrganizationId(Long organizationId);
Page<BenefitPolicy> findByEmployerOrganizationIdAndActiveTrue(Long organizationId, Pageable pageable);
```

**After:**
```java
List<BenefitPolicy> findByEmployerId(Long employerId);
Page<BenefitPolicy> findByEmployerIdAndActiveTrue(Long employerId, Pageable pageable);
```

### 3. Service Methods
**Before:**
```java
public List<BenefitPolicy> getPoliciesForOrganization(Long organizationId) {
    return policyRepository.findByEmployerOrganizationId(organizationId);
}
```

**After:**
```java
public List<BenefitPolicy> getPoliciesForEmployer(Long employerId) {
    return policyRepository.findByEmployerId(employerId);
}
```

### 4. DTO Fields
**Before:**
```java
private Long employerOrganizationId;
private Long insuranceOrganizationId;
```

**After:**
```java
private Long employerId;
```

---

## 🎯 Architectural Decisions

### What Was Removed
- ❌ Insurance Company entity
- ❌ TPA entity  
- ❌ `organizations` table
- ❌ `organization_type` enum (INSURANCE, TPA, GOVERNMENT, EMPLOYER, REVIEWER)
- ❌ Dual organization IDs (employer_org_id + insurance_org_id)

### What Remains
- ✅ `Employer` entity (ONLY business entity)
- ✅ `companies` table (now represents employers)
- ✅ `employer_id` (single FK for all business relationships)

### Security Boundary
**Before:** 
- Multiple boundaries: organizationId, companyId, employerId

**After:**
- Single boundary: `employerId`

---

## 📋 Migration Execution Checklist

### On Clean Database (Fresh Install)
```bash
# 1. Run migrations
cd backend
mvn flyway:migrate

# Expected: V2_21 creates clean schema with only employer_id fields
```

### On Existing Database (Upgrade Path)
```bash
# 1. Backup database first!
pg_dump tba_waad_system > backup_before_refactor.sql

# 2. Run migration
mvn flyway:migrate

# Expected: V2_21 renames columns, drops organizations table
```

### Rollback Plan (If Needed)
```bash
# Restore from backup
psql tba_waad_system < backup_before_refactor.sql

# Or manually rollback migration
mvn flyway:undo  # If Flyway Teams edition
```

---

## 🧪 Testing Plan

### Database Migration Tests
- [ ] Run V2_21 on clean PostgreSQL database
- [ ] Verify `organizations` table does not exist
- [ ] Verify `companies` table has no `organization_id` column
- [ ] Verify `benefit_policies` table uses `employer_id`
- [ ] Verify `members` table uses `employer_id` (not `employer_org_id`)
- [ ] Verify all FK constraints point to `companies` table

### Entity Tests
- [ ] Create new Employer
- [ ] Create Member with employer_id
- [ ] Create BenefitPolicy with employer_id
- [ ] Verify Member.employer relationship works
- [ ] Verify BenefitPolicy.employer relationship works

### Service Layer Tests
- [ ] Get all employers
- [ ] Get members by employerId
- [ ] Get benefit policies by employerId
- [ ] Verify no OrganizationType references

---

## 🚀 Next Steps (Priority Order)

### Step 1: Fix Repositories
Update repository method signatures:
- BenefitPolicyRepository
- MemberRepository
- VisitRepository
- ClaimRepository
- EmployerRepository

### Step 2: Fix Services  
Update service layer to use employerId:
- BenefitPolicyService
- MemberService (UnifiedMemberService)
- EmployerService
- ClaimService

### Step 3: Fix DTOs
Update DTO fields:
- BenefitPolicyResponseDto
- MemberCreateDto
- MemberSearchDto

### Step 4: Fix Mappers
Update mapper logic:
- EmployerMapper
- VisitMapper
- ClaimMapper

### Step 5: Run Tests
- Fix compilation errors
- Run unit tests
- Run integration tests
- Manual smoke testing

---

## 📊 Impact Analysis

### Database
- **Tables Modified:** 6 (companies, provider_contracts, benefit_policies, members, visits, users)
- **Tables Dropped:** 1 (organizations)
- **Columns Renamed:** 5 (organization_id → employer_id in various tables)
- **Columns Dropped:** 4 (companies.organization_id, members.insurance_org_id, claims.insurance_org_id, users.organization_id)

### Java Code
- **Entities Modified:** 5 (Employer, Member, BenefitPolicy, Claim, Visit)
- **Files Deleted:** 4 (Organization, OrganizationType, OrganizationRepository, OrganizationContextService)
- **Files with Compilation Errors:** ~30 (services, repositories, DTOs, mappers)

### API Impact (Expected)
- **Endpoints Modified:** TBD (after fixing services/controllers)
- **Request/Response DTOs:** TBD
- **Breaking Changes:** YES - All organization_id parameters become employer_id

---

## 🔒 Security Implications

### Before Refactor
```java
// Multiple security boundaries
if (user.getOrganizationId() != null) { /* check organization */ }
if (user.getEmployerId() != null) { /* check employer */ }
if (user.getCompanyId() != null) { /* check company */ }
```

### After Refactor
```java
// Single security boundary
if (user.getEmployerId() != null) { /* check employer */ }
```

### RBAC Changes
- User types simplified
- Removed: `INSURANCE_ADMIN`, `MEDICAL_REVIEWER` (organization-scoped)
- Kept: `SUPER_ADMIN`, `EMPLOYER_ADMIN`, `PROVIDER_USER`

---

## 📝 Notes

1. **Company Entity:** The deprecated `Company.java` entity in `modules/company` is kept for now (it also maps to `companies` table). Further cleanup can consolidate Employer and Company into a single entity.

2. **CompanySettings:** The `company_settings` table remains for feature flags. This may need refactoring to `employer_settings` in a future phase.

3. **Migration Idempotency:** V2_21 uses `IF EXISTS` checks to allow safe re-execution.

4. **Data Loss:** The migration DROPS the `organizations` table. Any data in this table will be lost. In a production environment, data migration scripts would be needed to preserve historical records.

---

## 🎓 Lessons Learned

1. **Incremental Approach:** Breaking a large refactor into phases (DB → Entities → Services → DTOs → Controllers) makes it manageable.

2. **Migration Testing:** Always test migrations on a clean database AND an existing database with data.

3. **Compilation as Validation:** Removing the Organization entity immediately revealed all dependent code via compilation errors.

4. **Documentation First:** Creating the architecture decision record (this document) helps guide implementation.

---

**End of Summary**
