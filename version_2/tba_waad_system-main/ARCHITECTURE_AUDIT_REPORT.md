# 🔷 TBA WAAD SYSTEM - ARCHITECTURE REALIGNMENT AUDIT
**Project:** TBA Waad System  
**Mode:** ANALYSIS ONLY – NO IMPLEMENTATION  
**Date:** 2026-02-14  
**Audit Type:** Full Structural Diagnosis Before Clean Refactor

---

## EXECUTIVE SUMMARY

### Current State
The TBA Waad System has undergone partial migration from a multi-organization architecture to an **Employer-Centric Closed TPA Model**. While significant progress has been made (V1-V5 migrations implement employer-only schema), **critical architectural violations remain** that prevent full alignment with the target architecture.

### Critical Findings
1. **🔴 CRITICAL:** Dual entity mapping conflict - Both `Employer.java` and `Company.java` map to the same `companies` table
2. **🔴 CRITICAL:** Database schema creates `employers` table but entities map to `companies` table (naming mismatch)
3. **⚠️ WARNING:** Deprecated entities (`Company`, `ReviewerCompany`) still exist and are partially used
4. **⚠️ WARNING:** Multi-tenant patterns remain in `CompanySettings` (company_id + employer_id)
5. **✅ GOOD:** V1-V5 migrations correctly implement employer-only FK architecture
6. **✅ GOOD:** No `organizations` or `insurance_companies` tables in active migrations

### Risk Assessment
**Risk Level:** 🔴 **HIGH** (Production deployment blocked)  
**Blocker:** Entity-to-table mapping conflict will cause runtime failures  
**Complexity:** Medium (requires entity consolidation, not full schema rewrite)

---

## 1. STRUCTURAL VIOLATIONS FOUND

### 1.1 CRITICAL: Dual Entity Mapping to Same Table

**Violation:** Two entities map to `companies` table
```java
// Employer.java (Line 33)
@Table(name = "companies")
public class Employer { ... }

// Company.java (Line 24) - DEPRECATED
@Table(name = "companies", uniqueConstraints = {
    @UniqueConstraint(columnNames = "code", name = "uk_company_code")
})
public class Company { ... }
```

**Impact:**
- JPA will treat these as separate entities but use the same table
- Potential data corruption if both are used simultaneously
- Confusion in ORM layer about which entity owns which records
- Cascades and lifecycle hooks may conflict

**Evidence:**
- File: `backend/src/main/java/com/waad/tba/modules/employer/entity/Employer.java:33`
- File: `backend/src/main/java/com/waad/tba/modules/company/entity/Company.java:24`

---

### 1.2 CRITICAL: Schema vs Entity Naming Mismatch

**Violation:** Migration creates `employers` table, but entities map to `companies`

**Migration (V1__core_schema.sql:34):**
```sql
CREATE TABLE IF NOT EXISTS employers (
    id BIGINT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    ...
);
```

**Entity Mapping:**
```java
@Table(name = "companies")  // ❌ Mismatch!
public class Employer { ... }
```

**Impact:**
- If database has `employers` table but no `companies` table: Runtime SQL errors
- If `companies` table exists from old migrations: Silent mapping to wrong table
- FK constraints reference `employers(id)` but entities look for `companies(id)`

**Evidence:**
- Migration: `backend/src/main/resources/db/migration/V1__core_schema.sql:34`
- Entity: `backend/src/main/java/com/waad/tba/modules/employer/entity/Employer.java:33`
- FK Example: `V4__business_entities.sql:73` - `FOREIGN KEY (employer_id) REFERENCES employers(id)`

---

### 1.3 VIOLATION: Deprecated Entities Still in Codebase

**Entities That Do NOT Belong:**

| Entity | Table | Status | Location |
|--------|-------|--------|----------|
| `Company` | companies | @Deprecated (Line 22) | `modules/company/entity/Company.java` |
| `ReviewerCompany` | reviewer_companies | @Deprecated (Line 20) | `modules/reviewer/entity/ReviewerCompany.java` |

**Active References to Deprecated Code:**

1. **CompanyService** (@Deprecated but still used)
   - `CompanySettingsController` still calls methods
   - `PdfCompanySettingsService` still references Company
   - `SystemAdminService.java:66` still has disabled company creation logic

2. **ReviewerCompanyRepository** (deprecated)
   - Still injected in `SystemAdminService.java:30`
   - Used in reset operations (line 44)

**Business Impact:**
- Developer confusion about which entity to use
- Risk of accidentally using deprecated entities in new code
- Maintenance burden of keeping deprecated code functional
- Unclear migration path for existing references

---

### 1.4 VIOLATION: Organization/Insurance Residue in Comments

**Location:** Various service and entity files

**Examples:**
```java
// BenefitPolicy.java
COMMENT ON TABLE benefit_policies IS 'Insurance benefit policies...'

// ClaimRepository.java (Lines 5.B comments)
"Full fetch joins for member, benefitPolicy, insuranceOrganization"

// SystemAdminService.java (Line 82-86)
"Member and Claim entities still have FK relationships to legacy 
 Employer/InsuranceCompany tables"

// EmployerRepository.java (Lines 12-15)
@deprecated Use {@link com.waad.tba.common.repository.OrganizationRepository}
```

**Impact:**
- Documentation debt
- Misleading comments for future developers
- Suggests unfinished migration work

---

### 1.5 VIOLATION: Multi-Tenant Pattern in Single-Tenant System

**Table:** `company_settings`

**Schema (V2__security_schema.sql:134-166):**
```sql
CREATE TABLE IF NOT EXISTS company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT,  -- ❌ NOT used in employer-only model
    employer_id BIGINT NOT NULL,
    can_view_claims BOOLEAN NOT NULL DEFAULT false,
    ...
    CONSTRAINT fk_company_settings_employer FOREIGN KEY (employer_id) 
        REFERENCES employers(id)
);
```

**Violation Analysis:**
- Table named `company_settings` but references `employers` not `companies`
- Has `company_id` column suggesting multi-company architecture
- Unique constraint on `(company_id, employer_id)` suggests multi-tenant design
- Comments say "per employer" but structure says "company + employer"

**Evidence:**
- Migration: `backend/src/main/resources/db/migration/V2__security_schema.sql:134-166`
- Entity: `backend/src/main/java/com/waad/tba/modules/company/entity/CompanySettings.java:39-70`
- Service: `CompanySettingsService.java:76` - `findByCompanyIdAndEmployerId(companyId, employerId)`

---

## 2. OVER-ENGINEERING AREAS

### 2.1 Unnecessary Abstraction: CompanySettings Multi-Tenant Support

**Current Architecture:**
- Supports multiple companies, each with multiple employers
- Feature flags per company-employer combination
- Service methods with dual parameters: `getSettingsForEmployer(companyId, employerId)`

**Target Architecture:**
- Single employer is the only top-level entity
- Feature flags should be simple employer-level settings
- No need for company_id dimension

**Simplification Opportunity:**
```java
// Current (over-engineered)
CompanySettings getSettingsForEmployer(Long companyId, Long employerId);

// Simplified (target)
EmployerSettings getSettingsForEmployer(Long employerId);
```

**Complexity Score:** Medium  
**Benefit of Simplification:** High (removes entire dimension of complexity)

---

### 2.2 Unnecessary Entities: Company and ReviewerCompany

**Current State:**
- Both entities marked @Deprecated
- Both have repositories and services
- Both still referenced in some active code paths

**Engineering Overhead:**
- 6 files to maintain (2 entities, 2 repositories, 2 services)
- Migration complexity (V1-V5 don't create their tables)
- Developer confusion about which entity to use

**Simplification Path:**
- Delete all 6 files
- Remove all references in active code
- Consolidate functionality into Employer where needed

**Complexity Score:** Low  
**Benefit of Simplification:** Medium (cleaner codebase, less confusion)

---

### 2.3 Dual Provider-Employer Mapping (Marketplace Pattern)

**Current Architecture:**
- `provider_allowed_employers` junction table
- Supports providers serving multiple employers
- `allowAllEmployers` flag in Provider entity
- Complex access control logic in services

**Target Architecture Analysis:**
- **KEEP THIS** - This is a legitimate business requirement
- Providers can have contracts with multiple employers
- Provider portal isolation requires this mapping

**Verdict:** NOT over-engineered - this is correct for the domain model

---

## 3. INSURANCE / ORGANIZATION RESIDUE

### 3.1 Database Level: CLEAN ✅
- **V1-V5 migrations:** Zero references to `insurance_companies` or `organizations` tables
- **All FKs:** Properly reference `employers(id)`
- **Comments:** Some mention "insurance" but in business context (insurance benefits), not as entity type

### 3.2 Code Level: RESIDUE FOUND ⚠️

**Comments Referencing Old Model:**
```java
// EmployerRepository.java:12-15
@deprecated Use {@link com.waad.tba.common.repository.OrganizationRepository}

// ClaimRepository.java
"Full fetch joins for member, benefitPolicy, insuranceOrganization"

// BenefitPolicyResponseDto.java:4-6
.insuranceOrgId(null) // Insurance organization no longer exists
.insuranceName(null) // Insurance organization no longer exists
```

**Service Logic Referencing OrganizationType:**
```java
// ReviewerCompanyService.java:3-9
"REVIEWER organization type has been removed"

// SystemAdminService.java:45-49
// Claim.insurance_company_id mentioned but doesn't exist in schema
```

**DTOs with Deprecated Fields:**
```java
// BenefitPolicyResponseDto
private Long insuranceOrgId;  // Explicitly set to null
private String insuranceName; // Explicitly set to null
```

### 3.3 Residue Cleanup Checklist

| Category | Item | Files | Action |
|----------|------|-------|--------|
| **Comments** | OrganizationRepository references | EmployerRepository.java | Delete @deprecated tag |
| **Comments** | insuranceOrganization fetch joins | ClaimRepository.java | Update comments |
| **DTOs** | insuranceOrgId, insuranceName fields | BenefitPolicyResponseDto | Remove fields |
| **Services** | OrganizationType checks | ReviewerCompanyService | Delete entire service |
| **Comments** | Insurance company FK mentions | SystemAdminService | Update documentation |

---

## 4. CLEAN TARGET MODEL CONFIRMATION

### 4.1 Target Architecture Compliance Matrix

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ✅ Employer is ONLY top-level entity | 🟡 Partial | Schema correct, entities need consolidation |
| ❌ No Insurance Company entity | 🔴 **VIOLATION** | Company.java exists (deprecated but present) |
| ❌ No TPA Organization entity | 🟢 Pass | No TPA entity found |
| ❌ No organization_type concept | 🔴 **VIOLATION** | OrganizationType mentioned in comments/services |
| ❌ No insurance_org_id anywhere | 🟢 Pass | No insurance_org_id in schema |
| ❌ No dual-organization model | 🔴 **VIOLATION** | CompanySettings has company_id + employer_id |
| ❌ No multi-insurance abstraction | 🟢 Pass | No multi-insurance pattern found |
| ❌ No marketplace model | 🟢 Pass | Provider-employer mapping is legitimate |
| ❌ No public self-registration | 🟢 Pass | Internal user creation only |
| ❌ No multi-tenant architecture | 🔴 **VIOLATION** | CompanySettings implements multi-tenant |

**Overall Compliance:** 50% (5/10 requirements fully met)

---

### 4.2 Required Domain Structure - Status Check

**Employer ✅**
- ✅ Entity exists: `Employer.java`
- 🔴 Maps to wrong table: `companies` instead of `employers`
- ✅ Repository exists: `EmployerRepository.java`
- ✅ Service exists: `EmployerService.java`

**Members → BenefitPolicy → BenefitPolicyRules ✅**
- ✅ All entities exist
- ✅ Correct FK relationships: `member.employer_id → employers(id)`
- ✅ Correct FK relationships: `benefit_policy.employer_id → employers(id)`
- ✅ Cascade rules correct

**ProviderContracts → Provider → ProviderServicePrices ✅**
- ✅ All entities exist
- ✅ Correct FK: `provider_contracts.employer_id → employers(id)`
- ✅ Provider-employer isolation via `provider_allowed_employers`
- ✅ Pricing via `provider_service_prices` with canonical services

**Visits → Claim/PreAuthorization ✅**
- ✅ All entities exist
- ✅ Visit-centric architecture maintained
- ✅ Correct FK relationships
- ✅ Claim lines reference canonical services

**Financial ✅**
- ✅ SettlementBatch, ProviderAccount exist
- ✅ Transactions linked to claims
- ✅ Optimistic locking implemented (V4)

**Overall Domain Structure:** 90% correct (main issue is entity-table mapping)

---

## 5. REFACTOR STRATEGY RECOMMENDATION

### 5.1 Migration Reset vs Incremental Cleanup

**Option A: Full Database Reset (RECOMMENDED for Development)**

**Pros:**
- Clean slate with correct naming
- Zero legacy artifacts
- Fastest path to compliance
- No risk of orphaned data

**Cons:**
- Loses all existing data
- Requires re-seeding test data
- Downtime required

**Steps:**
1. Drop all tables (`flyway:clean`)
2. Fix entity-table mappings
3. Re-run V1-V5 migrations
4. Seed fresh data

**Recommended:** ✅ YES (if development environment)

---

**Option B: Incremental Cleanup (Required for Production)**

**Pros:**
- Preserves existing data
- Can be done in phases
- Lower risk per step

**Cons:**
- More complex
- Requires careful FK management
- Multiple migration steps

**Steps:**
1. Create V6 migration to rename `employers` → `companies` (align with entities)
2. Update all FK constraints
3. Remove deprecated entities (Company, ReviewerCompany)
4. Simplify CompanySettings to EmployerSettings
5. Clean up comments and documentation

**Recommended:** ⚠️ ONLY IF production data exists

---

### 5.2 Entity Cleanup Plan

**Phase 1: Resolve Entity-Table Mapping Conflict**

**Approach 1: Align Entity to Schema (Change Entity)**
```java
// Employer.java
@Table(name = "employers")  // Was "companies"
public class Employer { ... }
```
**Required:**
- Update Employer.java entity annotation
- Delete Company.java entity
- Delete CompanyRepository, CompanyService

**Approach 2: Align Schema to Entity (Change Migration)**
```sql
-- V6__rename_employers_to_companies.sql
ALTER TABLE employers RENAME TO companies;
-- Update all FK constraint names
```
**Required:**
- Create V6 migration
- Keep Employer.java unchanged
- Delete deprecated Company.java

**Recommendation:** **Approach 1** (align entity to schema)
- Migration V1 clearly states employer-only architecture
- Table name `employers` better matches business domain
- Avoids additional migration complexity

---

**Phase 2: Remove Deprecated Entities**

**Files to DELETE:**
1. `modules/company/entity/Company.java`
2. `modules/company/repository/CompanyRepository.java`
3. `modules/company/service/CompanyService.java`
4. `modules/reviewer/entity/ReviewerCompany.java`
5. `modules/reviewer/repository/ReviewerCompanyRepository.java`
6. `modules/reviewer/service/ReviewerCompanyService.java`

**Files to UPDATE:**
- `CompanySettingsController.java` - Remove Company references
- `PdfCompanySettingsService.java` - Use Employer instead
- `SystemAdminService.java` - Remove ReviewerCompany reset logic

---

**Phase 3: Simplify CompanySettings → EmployerSettings**

**Current Schema:**
```sql
CREATE TABLE company_settings (
    company_id BIGINT,
    employer_id BIGINT NOT NULL,
    ...
);
```

**Target Schema:**
```sql
CREATE TABLE employer_settings (
    employer_id BIGINT NOT NULL UNIQUE,  -- One settings record per employer
    ...
);
```

**Migration Steps:**
1. Create V6 migration to restructure table
2. Rename entity to `EmployerSettings`
3. Remove `company_id` column
4. Update service methods to use single parameter
5. Remove multi-tenant unique constraint

---

### 5.3 Migration File Strategy

**V1-V5: KEEP** ✅
- Current migrations are structurally correct
- Employer-only architecture implemented
- All FKs reference employers correctly
- Financial safety patterns included

**V6 (NEW): Entity Alignment Migration**
```sql
-- V6__fix_entity_table_alignment.sql
-- Option 1: If using Approach 1 above (entity to schema)
-- No database changes needed, just delete Company.java

-- Option 2: If using Approach 2 above (schema to entity)
ALTER TABLE employers RENAME TO companies;
-- Update FK constraint names for clarity
```

**V7 (NEW): Simplify CompanySettings**
```sql
-- V7__simplify_company_settings_to_employer.sql
ALTER TABLE company_settings RENAME TO employer_settings;
ALTER TABLE employer_settings DROP COLUMN company_id;
ALTER TABLE employer_settings 
    ADD CONSTRAINT uk_employer_settings_employer UNIQUE (employer_id);
```

**Migration Archive: DELETE**
- If `db/migration_archive/` exists with old V2.x migrations → DELETE directory
- These are obsolete and conflict with V1-V5 rebaseline

---

## 6. FINAL ENTITY & TABLE LISTS

### 6.1 Proposed FINAL ENTITY LIST (Post-Cleanup)

**Core Business Entities (15):**
1. ✅ Employer
2. ✅ Member
3. ✅ BenefitPolicy
4. ✅ BenefitPolicyRule
5. ✅ Provider
6. ✅ ProviderContract
7. ✅ ProviderServicePrice
8. ✅ Visit
9. ✅ Claim
10. ✅ ClaimLine
11. ✅ PreAuthorization
12. ✅ EligibilityCheck
13. ✅ SettlementBatch
14. ✅ ProviderAccount
15. ✅ AccountTransaction

**Medical Taxonomy (4):**
16. ✅ MedicalCategory
17. ✅ MedicalService
18. ✅ CanonicalMedicalService
19. ✅ MedicalCode

**RBAC & Security (6):**
20. ✅ User
21. ✅ Role
22. ✅ Permission
23. ✅ PasswordResetToken
24. ✅ EmailVerificationToken
25. ✅ UserLoginAttempt

**Supporting Entities (10):**
26. ✅ ProviderAllowedEmployer
27. ✅ VisitAttachment
28. ✅ ClaimAttachment
29. ✅ PreAuthorizationAttachment
30. ✅ ClaimAuditLog
31. ✅ UserAuditLog
32. ✅ MemberImportLog
33. ✅ SettlementBatchItem
34. ✅ **EmployerSettings** (renamed from CompanySettings)
35. ✅ PdfCompanySettings (config for PDF generation)

**TO DELETE (2):**
- ❌ Company
- ❌ ReviewerCompany

**TOTAL:** 35 entities (was 37)

---

### 6.2 Proposed FINAL TABLE LIST

**Core Tables (15):**
1. `employers` (or `companies` if keeping entity mapping)
2. `members`
3. `benefit_policies`
4. `benefit_policy_rules`
5. `providers`
6. `provider_contracts`
7. `provider_service_prices`
8. `visits`
9. `claims`
10. `claim_lines`
11. `pre_authorizations`
12. `eligibility_checks`
13. `settlement_batches`
14. `provider_accounts`
15. `account_transactions`

**Medical Taxonomy (5):**
16. `medical_categories`
17. `medical_services`
18. `canonical_medical_services`
19. `medical_codes`
20. `medical_packages`

**RBAC (7):**
21. `users`
22. `roles`
23. `permissions`
24. `role_permissions`
25. `user_roles`
26. `password_reset_tokens`
27. `email_verification_tokens`

**Supporting (13):**
28. `provider_allowed_employers`
29. `provider_admin_documents`
30. `provider_contract_service_prices`
31. `visit_attachments`
32. `claim_attachments`
33. `pre_authorization_attachments`
34. `claim_audit_logs`
35. `user_audit_log`
36. `user_login_attempts`
37. `member_import_logs`
38. `settlement_batch_items`
39. `employer_settings` (renamed from company_settings)
40. `pdf_company_settings`

**TO DELETE:**
- ❌ `reviewer_companies` (if exists - not in V1-V5)
- ❌ Any archived V2.x tables

**TOTAL:** 40 tables

---

### 6.3 Clean FK Relationship Map

```
Employer (ROOT)
  ├── Members (employer_id FK)
  │     ├── BenefitPolicy (via member_policy_assignments)
  │     ├── Visits (member_id FK)
  │     └── EligibilityChecks (member_id FK)
  │
  ├── BenefitPolicies (employer_id FK)
  │     └── BenefitPolicyRules (policy_id FK)
  │           └── CanonicalMedicalService (canonical_service_id FK)
  │
  ├── ProviderContracts (employer_id FK)
  │     ├── Provider (provider_id FK)
  │     └── ProviderContractServicePrices (contract_id FK)
  │           └── CanonicalMedicalService (canonical_service_id FK)
  │
  ├── Visits (employer_id FK)
  │     ├── Claims (visit_id FK)
  │     │     └── ClaimLines (claim_id FK)
  │     │           └── CanonicalMedicalService (canonical_service_id FK)
  │     └── PreAuthorizations (visit_id FK)
  │
  └── EmployerSettings (employer_id FK UNIQUE)

Provider
  ├── ProviderAllowedEmployers (provider_id FK, employer_id FK)
  ├── ProviderContracts
  └── ProviderServicePrices (provider_id FK)

SettlementBatch
  └── SettlementBatchItems (batch_id FK)
        └── Claims (claim_id FK)

ProviderAccount
  └── AccountTransactions (account_id FK)

MedicalCategory
  └── MedicalServices (category_id FK)
        └── CanonicalMedicalServices (1:1 mapping)
              └── MedicalCodes (service_id FK)
```

**Key Principles:**
- Single root: Employer
- No circular dependencies
- All business entities trace to Employer
- Financial entities independent (SettlementBatch, ProviderAccount)
- Medical taxonomy independent (shared reference data)

---

## 7. COMPLEXITY & RISK ASSESSMENT

### 7.1 Refactor Complexity Estimate

| Phase | Task | Complexity | Effort | Risk |
|-------|------|------------|--------|------|
| 1 | Fix entity-table mapping | **Low** | 2 hours | Low |
| 2 | Delete deprecated entities | **Medium** | 4 hours | Medium |
| 3 | Simplify CompanySettings | **Medium** | 6 hours | Medium |
| 4 | Update service references | **Medium** | 8 hours | Low |
| 5 | Clean up comments/docs | **Low** | 2 hours | Low |
| 6 | Test & validate | **Medium** | 8 hours | Medium |

**TOTAL ESTIMATED EFFORT:** 30 hours (3-4 days)  
**OVERALL COMPLEXITY:** **Medium**

---

### 7.2 Risk Level by Environment

**Development Environment:**
- **Risk Level:** 🟢 **LOW**
- **Strategy:** Full database reset
- **Data Loss:** Acceptable
- **Downtime:** N/A
- **Rollback:** Easy (restore from scratch)

**Production Environment (if data exists):**
- **Risk Level:** 🔴 **HIGH**
- **Strategy:** Incremental migrations with backups
- **Data Loss:** Unacceptable
- **Downtime:** Required for some steps
- **Rollback:** Complex (requires V6/V7 down migrations)

---

### 7.3 Risk Mitigation Strategy

**Pre-Refactor:**
1. ✅ Full database backup
2. ✅ Document all existing queries/reports
3. ✅ Freeze new feature development
4. ✅ Create rollback V6/V7 down migrations

**During Refactor:**
1. ✅ Work in feature branch
2. ✅ Run full test suite after each phase
3. ✅ Validate FK integrity after each change
4. ✅ Manual smoke test of key workflows

**Post-Refactor:**
1. ✅ Performance regression testing
2. ✅ Data integrity audit
3. ✅ User acceptance testing (if production)
4. ✅ Update all documentation

---

## 8. FINAL RECOMMENDATIONS

### 8.1 Immediate Actions (Week 1)

**For Development Environment:**
1. ✅ **APPROVE** full database reset strategy
2. ✅ Fix Employer.java mapping: `@Table(name = "employers")`
3. ✅ Delete Company.java, ReviewerCompany.java entities
4. ✅ Delete all deprecated repositories/services
5. ✅ Run `mvn flyway:clean && mvn flyway:migrate`
6. ✅ Rebuild application and run tests

**For Production Environment (if exists):**
1. ⚠️ **DO NOT PROCEED** until data migration plan approved
2. ⚠️ Create V6/V7 migrations with rollback scripts
3. ⚠️ Test migrations in staging environment first
4. ⚠️ Schedule maintenance window for table renames

---

### 8.2 Long-Term Cleanup (Week 2-3)

1. ✅ Rename CompanySettings → EmployerSettings
2. ✅ Remove company_id from settings table
3. ✅ Update all service methods to use single employer_id parameter
4. ✅ Clean up all comments referencing Organizations/Insurance
5. ✅ Remove insuranceOrgId, insuranceName from DTOs
6. ✅ Update API documentation
7. ✅ Run final compliance check against target architecture

---

### 8.3 Decision Matrix

| Scenario | Recommendation |
|----------|----------------|
| **Fresh deployment (no data)** | ✅ Full reset + entity fixes (1 day) |
| **Development with test data** | ✅ Full reset + entity fixes (1 day) |
| **Staging with important data** | ⚠️ Incremental + V6/V7 migrations (1 week) |
| **Production with real data** | 🔴 **HOLD** - Requires business approval (2 weeks+) |

---

## 9. FINAL COMPLIANCE SCORECARD

### Before Refactor (Current State)

| Category | Score | Notes |
|----------|-------|-------|
| Schema Design | 90% | V1-V5 migrations excellent |
| Entity Design | 40% | Dual entity mapping, deprecated code |
| Service Layer | 60% | Some deprecated references |
| Documentation | 50% | Outdated comments |
| **OVERALL** | **60%** | **Not production-ready** |

### After Refactor (Target State)

| Category | Score | Notes |
|----------|-------|-------|
| Schema Design | 95% | Clean employer-only architecture |
| Entity Design | 95% | Single Employer entity, no deprecated code |
| Service Layer | 90% | All references updated |
| Documentation | 90% | Comments aligned with architecture |
| **OVERALL** | **93%** | **Production-ready** |

---

## 10. CONCLUSION

### Current Status
The system is **60% compliant** with the target Employer-Centric Closed TPA architecture. The database schema (V1-V5 migrations) is **excellent and production-ready**, but the entity layer has **critical conflicts** that must be resolved before deployment.

### Blocker Issues
1. 🔴 Dual entity mapping to `companies` table
2. 🔴 Entity maps to `companies` but migration creates `employers`
3. ⚠️ Deprecated entities still in active use

### Path Forward
- **Development:** Full reset recommended (1 day effort, low risk)
- **Production:** Incremental cleanup required (2 weeks effort, medium risk)
- **Overall Complexity:** Medium
- **Success Probability:** High (well-defined scope)

### Final Recommendation
✅ **APPROVE** refactor plan for development environment  
⚠️ **CONDITIONAL APPROVAL** for production (requires data migration plan)  
🚫 **DO NOT DEPLOY** current state to production

---

**End of Architecture Audit Report**

*Generated by: TBA System Architecture Team*  
*Date: 2026-02-14*  
*Version: 1.0*
