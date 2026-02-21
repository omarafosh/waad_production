# Company-Employer Architecture Refactor Summary

**Date:** December 27, 2025  
**Commit Message:** `refactor: remove company from PreApproval and clean legacy insurance references`  

---

## 🎯 Objective

Enforce the employer-centric architecture by removing all `companyId` dependencies from operational entities and cleaning up legacy InsuranceCompany references.

### Architectural Truth (Enforced)
```
Company  → System / Platform / TPA (Settings & SUPER_ADMIN only)
Employer → Business / Operations / Members / Claims / PreApprovals
```

---

## 🔧 Changes Made

### 1. PreApproval Entity (`PreApproval.java`)

**REMOVED:**
- `@NotNull(message = "Company ID is required")` annotation
- `@Column(nullable = false) private Long companyId;` field

**WHY:** PreApproval is an operational entity. Employer context must be derived via `preApproval.getMember().getEmployerOrganization()`, NOT via a direct `companyId` FK.

---

### 2. PreApproval Repository (`PreApprovalRepository.java`)

**REMOVED:**
- `List<PreApproval> findByCompanyId(Long companyId);`
- `Page<PreApproval> findByCompanyId(Long companyId, Pageable pageable);`
- `Page<PreApproval> findByCompanyAndStatuses(...)` query

**ADDED:**
- `Page<PreApproval> findByEmployerOrganizationAndStatuses(Long employerOrgId, List<ApprovalStatus> statuses, Pageable pageable)` - proper employer-based filtering

**WHY:** Company-based filtering violates the employer-centric architecture. All operational queries must use `member.employerOrganization`.

---

### 3. PreApproval Service (`PreApprovalService.java`)

**REMOVED:**
- `.companyId(null)` workaround in `createPreApproval()` method

**WHY:** The `companyId` field no longer exists on the entity. Service code is now clean and doesn't require workarounds.

---

### 4. User Entity (`User.java`)

**CHANGED:**
- Added `@Deprecated` annotation to `companyId` field
- Updated JavaDoc to clarify this is a legacy field NOT used for operational filtering

**WHY:** Field kept for backwards compatibility (INSURANCE_ADMIN display purposes) but marked deprecated to prevent misuse. All authorization is employer-centric via `employerId`.

---

### 5. Claim Repository (`ClaimRepository.java`)

**REMOVED from queries:**
- `LEFT JOIN FETCH c.insuranceCompany ic`
- `LEFT JOIN FETCH c.insurancePolicy ip`
- `LEFT JOIN FETCH c.benefitPackage bp`

**AFFECTED QUERIES:**
- `searchPaged()`
- `searchPagedByEmployerId()`
- `findByMemberId()`
- `findByPreApprovalId()`
- `findByStatusIn()`
- `findByStatus()`

**WHY:** These are dead joins - `insuranceCompany`, `insurancePolicy`, and `benefitPackage` fields don't exist on the Claim entity anymore. The queries were referencing non-existent relationships.

---

### 6. Member Repository (`MemberRepository.java`)

**REMOVED:**
- `Page<Member> findByInsuranceCompanyIdPaged(Long companyId, Pageable pageable);`
- `Page<Member> searchByInsuranceCompany(Long companyId, String search, Pageable pageable);`

**WHY:** These methods reference `m.insuranceCompany` which doesn't exist on Member entity. All member filtering must use `employerOrganization`.

---

## ✅ Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| PreApproval has NO companyId column | ✅ DONE |
| No repository method filters by companyId | ✅ DONE |
| All operational flows resolve context via Employer → Organization | ✅ DONE |
| Application compiles successfully | ✅ VERIFIED |
| No new tables or permissions added | ✅ CONFIRMED |
| Architecture remains Employer-centric | ✅ ENFORCED |

---

## 🚫 NOT Changed (Explicitly Kept)

| Item | Reason |
|------|--------|
| `FIXED_INSURANCE_COMPANY` (Frontend) | Display-only constant |
| JWT `companyId` claim | Backwards compatibility |
| `CompanyController` | SUPER_ADMIN/MANAGE_COMPANIES only |
| `CompanySettings` entity | TPA-level feature toggles (review separately) |

---

## 📁 Files Modified

```
backend/src/main/java/com/waad/tba/modules/preauth/entity/PreApproval.java
backend/src/main/java/com/waad/tba/modules/preauth/repository/PreApprovalRepository.java
backend/src/main/java/com/waad/tba/modules/preauth/service/PreApprovalService.java
backend/src/main/java/com/waad/tba/modules/rbac/entity/User.java
backend/src/main/java/com/waad/tba/modules/claim/repository/ClaimRepository.java
backend/src/main/java/com/waad/tba/modules/member/repository/MemberRepository.java
```

---

## ⚠️ Database Migration Required

The `pre_approvals.company_id` column needs to be dropped in production. Create a migration:

```sql
-- V999__remove_preapproval_company_id.sql
-- Architecture Refactor: Remove company_id from pre_approvals table
-- Employer context is now derived via member.employer_org_id

ALTER TABLE pre_approvals DROP COLUMN IF EXISTS company_id;
```

**Note:** Review existing data before migration. If `company_id` contains meaningful data, archive it first.

---

## 🔗 Related Documentation

- [COMPANY-EMPLOYER-AUDIT-REPORT.md](COMPANY-EMPLOYER-AUDIT-REPORT.md) - Full audit report
- `AuthorizationService.java` - Security model documentation

---

**Refactor Complete - Architecture is now fully Employer-centric for operational data.**
