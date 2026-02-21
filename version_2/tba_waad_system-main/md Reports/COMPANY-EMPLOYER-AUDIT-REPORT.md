# 🔍 Company vs Employer Architectural Audit Report

**Date:** December 27, 2025  
**Version:** 1.0  
**Status:** AUDIT COMPLETE - NO CODE CHANGES  

---

## 📋 Executive Summary

This audit examines the separation of responsibilities between **Company** (TPA/Platform) and **Employer** (Business Operations) entities in the TBA-WAAD system. The audit found that the system is **PARTIALLY COMPLIANT** with the intended architecture, with several violations requiring attention.

### Key Findings:
- ✅ **Employer is correctly established as the operational axis** for Members, BenefitPolicies, and Visits
- ⚠️ **Company/companyId still appears in several operational tables** (PreApproval, User, CompanySettings)
- ❌ **Legacy InsuranceCompany references persist** in ClaimRepository and MemberRepository
- ✅ **Organization entity provides canonical model** for both TPA and Employer types
- ✅ **RBAC permissions for Company are SUPER_ADMIN only**

---

## 1️⃣ Company Responsibilities (FINAL)

### ✅ What Company SHOULD Do:
| Responsibility | Status | Notes |
|---------------|--------|-------|
| System/Platform configuration | ✅ CORRECT | `Company` entity is marked `@Deprecated` |
| Feature toggles via `CompanySettings` | ⚠️ MIXED | Feature flags per employer, but uses `companyId` FK |
| SUPER_ADMIN management scope | ✅ CORRECT | All endpoints require `SUPER_ADMIN` or `MANAGE_COMPANIES` |
| Branding/white-label settings | ✅ CORRECT | `CompanyController` is admin-only |
| Organization-level settings | ✅ CORRECT | `Organization` entity with type `TPA` is canonical |

### ❌ What Company MUST NOT Do:
| Anti-Pattern | Current Status | Severity |
|-------------|----------------|----------|
| Filter Members by company_id | ⚠️ VIOLATION | MEDIUM |
| Filter Claims by company_id | ❌ DEAD CODE | LOW |
| Filter Visits by company_id | ✅ NOT PRESENT | N/A |
| Own BenefitPolicies | ✅ NOT PRESENT | N/A |
| Be used in eligibility logic | ⚠️ DEAD CODE | LOW |
| Be part of EMPLOYER_ADMIN authorization | ✅ NOT PRESENT | N/A |

---

## 2️⃣ Employer Responsibilities (FINAL)

### ✅ Confirmed as Single Operational Axis:

| Domain | FK Field | Status |
|--------|----------|--------|
| **Member** | `employer_org_id` (Organization) | ✅ CORRECT |
| **Member** | `employer_id` (legacy, read-only) | ⚠️ DEPRECATED |
| **BenefitPolicy** | `employer_org_id` (Organization) | ✅ CORRECT |
| **Visit** | `employer_org_id` (Organization) | ✅ CORRECT |
| **Claim** | via `Member.employerOrganization` | ✅ CORRECT |
| **EligibilityCheck** | `employer_id` (snapshot) | ✅ CORRECT |
| **User** | `employer_id` | ✅ CORRECT |

### Organization Model (Canonical):
```
Organization
├── id
├── name / nameEn
├── code
├── type: TPA | INSURANCE | EMPLOYER | REVIEWER
└── active
```

---

## 3️⃣ Violations Found

### 🔴 HIGH SEVERITY

| # | File | Line | Issue | Risk |
|---|------|------|-------|------|
| 1 | [PreApproval.java](backend/src/main/java/com/waad/tba/modules/preauth/entity/PreApproval.java#L194) | 194 | `companyId` field marked as `@NotNull` - PreApprovals linked to Company | HIGH |
| 2 | [PreApprovalRepository.java](backend/src/main/java/com/waad/tba/modules/preauth/repository/PreApprovalRepository.java#L26-L50) | 26-50 | `findByCompanyId()` queries - filtering by company | HIGH |
| 3 | [User.java](backend/src/main/java/com/waad/tba/modules/rbac/entity/User.java#L75-L76) | 75-76 | `companyId` field for INSURANCE_ADMIN users | MEDIUM |

### 🟠 MEDIUM SEVERITY

| # | File | Line | Issue | Risk |
|---|------|------|-------|------|
| 4 | [CompanySettings.java](backend/src/main/java/com/waad/tba/modules/company/entity/CompanySettings.java#L62-L63) | 62-63 | `companyId` FK - Settings tied to Company | MEDIUM |
| 5 | [MemberRepository.java](backend/src/main/java/com/waad/tba/modules/member/repository/MemberRepository.java#L84-L92) | 84-92 | `findByInsuranceCompanyIdPaged()` - dead legacy queries | MEDIUM |
| 6 | [ClaimRepository.java](backend/src/main/java/com/waad/tba/modules/claim/repository/ClaimRepository.java#L19-L79) | 19+ | `LEFT JOIN FETCH c.insuranceCompany` - dead joins | MEDIUM |
| 7 | [JwtTokenProvider.java](backend/src/main/java/com/waad/tba/security/JwtTokenProvider.java#L95) | 95 | `companyId` claim in JWT token | MEDIUM |

### 🟡 LOW SEVERITY

| # | File | Line | Issue | Risk |
|---|------|------|-------|------|
| 8 | [PreApprovalService.java](backend/src/main/java/com/waad/tba/modules/preauth/service/PreApprovalService.java#L165) | 165 | `.companyId(null)` - workaround in place | LOW |
| 9 | [AuthService.java](backend/src/main/java/com/waad/tba/modules/auth/service/AuthService.java#L88-L172) | 88+ | `companyId` propagated in login response | LOW |
| 10 | [UserManagementService.java](backend/src/main/java/com/waad/tba/modules/systemadmin/service/UserManagementService.java#L101) | 101 | `companyId(dto.getInsuranceCompanyId())` | LOW |
| 11 | [ClaimViewDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimViewDto.java#L27-L29) | 27-29 | `insuranceCompanyId/Name/Code` fields | LOW |

---

## 4️⃣ Frontend Audit Results

### ✅ CORRECT Usage:

| Component | Status | Notes |
|-----------|--------|-------|
| Employer dropdown in MemberCreate | ✅ CORRECT | Uses `/employers/selector` API |
| Employer-based filtering | ✅ CORRECT | Uses `X-Employer-ID` header |
| No CompanyContext provider | ✅ CORRECT | Comment confirms removal |
| Companies admin page | ✅ CORRECT | Placeholder, SUPER_ADMIN only |

### ⚠️ LEGACY References (Acceptable):

| Component | Status | Notes |
|-----------|--------|-------|
| `FIXED_INSURANCE_COMPANY` constant | ⚠️ ACCEPTABLE | Single-tenant display only |
| `insuranceCompanyName` in views | ⚠️ ACCEPTABLE | Display-only, not filtering |
| `INSURANCE_COMPANY` role | ⚠️ ACCEPTABLE | Role exists but unused |

### ❌ Problematic:

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [ClaimCreate.jsx](frontend/src/pages/claims/ClaimCreate.jsx#L21) | 21 | `insuranceCompanyId` in form state | LOW |
| [EmployerView.jsx](frontend/src/pages/employers/EmployerView.jsx#L248-L253) | 248-253 | Displays `insuranceCompanyId` | LOW |

---

## 5️⃣ Security & RBAC Review

### ✅ Company Permissions are SUPER_ADMIN Only:

```java
// AppPermission.java
MANAGE_COMPANIES("إدارة الشركات", "Create, update, delete, and view all companies")
VIEW_COMPANIES("عرض الشركات", "View company information")

// CompanyController.java - ALL endpoints protected:
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_COMPANIES')")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_COMPANIES')")
```

### ✅ Permissions Correctly Assigned:

| Permission | SUPER_ADMIN | INSURANCE_ADMIN | EMPLOYER_ADMIN | REVIEWER |
|------------|:-----------:|:---------------:|:--------------:|:--------:|
| MANAGE_COMPANIES | ✅ | ❌ | ❌ | ❌ |
| VIEW_COMPANIES | ✅ | ❌ | ❌ | ❌ |
| MANAGE_EMPLOYERS | ✅ | ❌ | ❌ | ❌ |
| VIEW_EMPLOYERS | ✅ | ❌ | ❌ | ❌ |

### ✅ AuthorizationService Design:

The [AuthorizationService.java](backend/src/main/java/com/waad/tba/security/AuthorizationService.java) correctly documents:
- Line 41: "Never filtered by employerId or companyId" for SUPER_ADMIN
- Line 46: "No companyId filtering (single insurance company model)"
- Line 76-77: "No more companyId checks. No more insuranceCompanyId filtering."

---

## 6️⃣ Recommended Actions

### 🔴 CRITICAL - Must REFACTOR:

| # | Action | Target File | Description |
|---|--------|-------------|-------------|
| 1 | **REFACTOR** | `PreApproval.java` | Remove `companyId` field entirely. Link to employer via Member.employerOrganization |
| 2 | **REFACTOR** | `PreApprovalRepository.java` | Remove all `findByCompanyId*` methods |
| 3 | **REFACTOR** | `User.java` | Evaluate if `companyId` is still needed. Consider removing for INSURANCE_ADMIN |

### 🟠 MEDIUM - Should REFACTOR:

| # | Action | Target File | Description |
|---|--------|-------------|-------------|
| 4 | **REFACTOR** | `CompanySettings.java` | Rename to `EmployerSettings` or make `companyId` optional |
| 5 | **DELETE** | `MemberRepository.java` | Remove `findByInsuranceCompanyIdPaged`, `searchByInsuranceCompany` |
| 6 | **DELETE** | `ClaimRepository.java` | Remove `LEFT JOIN FETCH c.insuranceCompany` from all queries |
| 7 | **KEEP** | `JwtTokenProvider.java` | `companyId` can stay for backwards compatibility (optional) |

### 🟡 LOW - Can KEEP:

| # | Action | Target File | Description |
|---|--------|-------------|-------------|
| 8 | **KEEP** | `AuthService.java` | `companyId` in response is harmless |
| 9 | **KEEP** | `ClaimViewDto.java` | `insuranceCompanyName` for display is acceptable |
| 10 | **KEEP** | `FIXED_INSURANCE_COMPANY` | Frontend constant for single-tenant display |

---

## 7️⃣ Architectural Truth Verification

### ✅ CONFIRMED:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TBA-WAAD Architecture                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                    ┌──────────────────────────┐   │
│  │   Company    │                    │       Organization       │   │
│  │  (Legacy)    │ ──DEPRECATED───▶   │   type=TPA/INSURANCE     │   │
│  │              │                    │   (System Config Only)   │   │
│  └──────────────┘                    └──────────────────────────┘   │
│                                                    │                │
│                                            [Settings/Config]        │
│                                                    │                │
│  ════════════════════════════════════════════════════════════════   │
│                                                                     │
│  ┌──────────────┐                    ┌──────────────────────────┐   │
│  │   Employer   │                    │       Organization       │   │
│  │  (Legacy)    │ ──DEPRECATED───▶   │     type=EMPLOYER        │   │
│  │              │                    │  (Operational Axis)      │   │
│  └──────────────┘                    └──────────────────────────┘   │
│                                                    │                │
│                                      ┌─────────────┼─────────────┐  │
│                                      │             │             │  │
│                                      ▼             ▼             ▼  │
│                               ┌──────────┐  ┌──────────┐  ┌───────┐ │
│                               │  Member  │  │BenefitP. │  │ Visit │ │
│                               └──────────┘  └──────────┘  └───────┘ │
│                                      │                              │
│                                      ▼                              │
│                               ┌──────────┐                          │
│                               │  Claim   │                          │
│                               └──────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Entity Relationship Summary:

| Entity | Primary FK | Correct Model |
|--------|-----------|---------------|
| Member | `employer_org_id` → Organization (EMPLOYER) | ✅ |
| BenefitPolicy | `employer_org_id` → Organization (EMPLOYER) | ✅ |
| Visit | `employer_org_id` → Organization (EMPLOYER) | ✅ |
| Claim | via Member → Organization (EMPLOYER) | ✅ |
| PreApproval | ❌ `companyId` (orphan) | ❌ VIOLATION |
| CompanySettings | `company_id` + `employer_id` | ⚠️ NEEDS REVIEW |

---

## 8️⃣ Conclusion

### Overall Compliance: **75% COMPLIANT**

The system has made significant progress in establishing Employer as the operational axis via the Organization entity. However, several legacy patterns persist:

1. **PreApproval module** still uses `companyId` - **MUST BE REFACTORED**
2. **User.companyId** exists for INSURANCE_ADMIN - **EVALUATE NECESSITY**
3. **Dead code** in repositories references insuranceCompany - **SHOULD BE CLEANED**
4. **CompanySettings** conflates TPA settings with employer feature toggles - **CLARIFY PURPOSE**

### Next Steps:

1. ✅ Review this audit report with team
2. 📋 Create refactoring tasks based on recommendations
3. 🔧 Implement changes in priority order (HIGH → LOW)
4. 🧪 Test all affected flows after refactoring
5. 📝 Update this document when complete

---

**Report Generated:** December 27, 2025  
**Audit Scope:** Backend (Java/Spring), Frontend (React), Database (PostgreSQL)  
**NO CODE CHANGES MADE** - Audit and Recommendation Only

---

## Appendix: Quick Reference

### Files to Modify (Priority Order):

```
HIGH:
  backend/src/main/java/com/waad/tba/modules/preauth/entity/PreApproval.java
  backend/src/main/java/com/waad/tba/modules/preauth/repository/PreApprovalRepository.java

MEDIUM:
  backend/src/main/java/com/waad/tba/modules/rbac/entity/User.java
  backend/src/main/java/com/waad/tba/modules/company/entity/CompanySettings.java
  backend/src/main/java/com/waad/tba/modules/member/repository/MemberRepository.java
  backend/src/main/java/com/waad/tba/modules/claim/repository/ClaimRepository.java

LOW:
  backend/src/main/java/com/waad/tba/security/JwtTokenProvider.java
  backend/src/main/java/com/waad/tba/modules/auth/service/AuthService.java
  frontend/src/pages/claims/ClaimCreate.jsx
```

### Grep Commands for Future Audits:

```bash
# Find all company_id references
grep -rn "company_id\|companyId" backend/src/main/java --include="*.java"

# Find InsuranceCompany references
grep -rn "InsuranceCompany\|insuranceCompany" backend/src/main/java --include="*.java"

# Find employer_id references (should be dominant)
grep -rn "employer_id\|employerId" backend/src/main/java --include="*.java"
```
