# 🔷 TBA WAAD SYSTEM - ARCHITECTURE VIOLATIONS DIAGRAM

## VIOLATION #1: Dual Entity Mapping Conflict

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                          │
│                                                             │
│  ┌────────────────────────────────────────────────┐        │
│  │  Table: "companies"                             │        │
│  │  ┌────┬──────────┬─────────┬──────────────┐   │        │
│  │  │ id │   code   │  name   │    active    │   │        │
│  │  ├────┼──────────┼─────────┼──────────────┤   │        │
│  │  │ 1  │ "EMP001" │ "Acme"  │    true      │   │        │
│  │  └────┴──────────┴─────────┴──────────────┘   │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                      ▲                  ▲
                      │                  │
           ┌──────────┘                  └──────────┐
           │  @Table(name="companies")              │
           │                                        │
┌──────────┴──────────────┐         ┌──────────────┴─────────┐
│  Employer.java          │         │  Company.java          │
│  ✅ CANONICAL           │  ❌❌❌  │  @Deprecated           │
│                         │         │  READ ONLY             │
│  @Entity                │         │                        │
│  @Table(name="companies")│        │  @Entity               │
│  public class Employer  │         │  @Table(name="companies")│
│                         │         │  public class Company  │
└─────────────────────────┘         └────────────────────────┘

🔴 PROBLEM: Two entities trying to manage the same table!
🔴 RISK: ORM confusion, cascade conflicts, data corruption
🔴 SOLUTION: Delete Company.java, use only Employer.java
```

---

## VIOLATION #2: Schema vs Entity Name Mismatch

```
┌─────────────────────────────────────────────────────────────┐
│            V1__core_schema.sql (Migration)                  │
│                                                             │
│  CREATE TABLE IF NOT EXISTS employers (                     │
│      id BIGINT PRIMARY KEY,                                 │
│      code VARCHAR(50) NOT NULL UNIQUE,                      │
│      name VARCHAR(200) NOT NULL,                            │
│      ...                                                    │
│  );                                                         │
│                                                             │
│  COMMENT: 'Employer companies - the ONLY top-level entity'  │
└─────────────────────────────────────────────────────────────┘
                         ▼
              Migration creates: "employers"
                         ❌
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            Employer.java (Entity)                           │
│                                                             │
│  @Entity                                                    │
│  @Table(name = "companies")  ❌ MISMATCH!                   │
│  public class Employer {                                    │
│      @Id                                                    │
│      private Long id;                                       │
│      ...                                                    │
│  }                                                          │
│                                                             │
│  Entity maps to: "companies"                                │
└─────────────────────────────────────────────────────────────┘

🔴 PROBLEM: Migration creates "employers", entity expects "companies"
🔴 RUNTIME ERROR: "Table 'companies' doesn't exist"
🔴 SOLUTION: 
   Option A: Change entity to @Table(name="employers")
   Option B: Create migration to rename "employers" → "companies"
```

---

## VIOLATION #3: Multi-Tenant Pattern in Single-Tenant System

```
┌─────────────────────────────────────────────────────────────┐
│  CompanySettings Entity (Feature Flags)                     │
│                                                             │
│  @Table(name = "company_settings")                          │
│  public class CompanySettings {                             │
│      Long id;                                               │
│      Long companyId;   ❌ NOT needed in employer-only model │
│      Long employerId;  ✅ Correct                           │
│      Boolean canViewClaims;                                 │
│      Boolean canViewVisits;                                 │
│      ...                                                    │
│  }                                                          │
│                                                             │
│  @UniqueConstraint(columnNames = {                          │
│      "company_id",  ❌ Multi-tenant dimension               │
│      "employer_id"  ✅ Correct dimension                    │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
                         ▼
                Current Logic
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  getSettingsForEmployer(Long companyId, Long employerId)    │
│                              ▲                              │
│                              │                              │
│                    ❌ Unnecessary complexity                │
└─────────────────────────────────────────────────────────────┘

TARGET ARCHITECTURE (Simplified):
┌─────────────────────────────────────────────────────────────┐
│  EmployerSettings Entity                                    │
│                                                             │
│  @Table(name = "employer_settings")                         │
│  public class EmployerSettings {                            │
│      Long id;                                               │
│      Long employerId;  ✅ Single dimension                  │
│      Boolean canViewClaims;                                 │
│      Boolean canViewVisits;                                 │
│      ...                                                    │
│  }                                                          │
│                                                             │
│  @UniqueConstraint(columnNames = {"employer_id"})           │
└─────────────────────────────────────────────────────────────┘
                         ▼
                Simplified Logic
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  getSettingsForEmployer(Long employerId)                    │
│                              ▲                              │
│                              │                              │
│                    ✅ Clean single-tenant model             │
└─────────────────────────────────────────────────────────────┘

🔴 PROBLEM: Table structure suggests multi-company architecture
⚠️  IMPACT: Over-engineering, confusing code, unnecessary complexity
✅  SOLUTION: Rename to EmployerSettings, remove company_id
```

---

## CORRECT ARCHITECTURE: Employer-Centric Domain Model

```
┌────────────────────────────────────────────────────────────────┐
│                        EMPLOYER                                 │
│                    (ONLY Top-Level Entity)                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  id, code, name, active, email, phone                  │    │
│  └────────────────────────────────────────────────────────┘    │
└────────┬───────────┬───────────┬───────────┬───────────────────┘
         │           │           │           │
         ▼           ▼           ▼           ▼
    ┌────────┐  ┌──────────┐  ┌────────┐  ┌──────────────┐
    │ MEMBERS│  │BENEFIT   │  │PROVIDER│  │VISITS        │
    │        │  │POLICIES  │  │CONTRACT│  │              │
    └────┬───┘  └────┬─────┘  └────┬───┘  └───┬──────────┘
         │           │             │           │
         │           │             │           ├─→ Claims
         │           │             │           │
         │           │             │           └─→ PreAuth
         │           │             │
         └───────────┴─────────────┴───→ All reference
                                         employer_id FK

✅ Clean Hierarchy
✅ Single Root Entity
✅ No Organization Types
✅ No Insurance Company
✅ No Multi-Tenant Complexity
```

---

## FK RELATIONSHIP VIOLATIONS

### CURRENT (Incorrect):
```
members.employer_id    ──┐
                         ├──→  employers(id)  ❌ Table doesn't exist
claims.employer_id     ──┤     (Migration creates "employers"
visits.employer_id     ──┘      but entities map to "companies")
                                
                                Employer.java
                                @Table(name = "companies") ❌
```

### TARGET (Correct):
```
Option A: Align Entity to Schema
────────────────────────────────
members.employer_id    ──┐
claims.employer_id     ──┼──→  employers(id)  ✅ Schema creates this
visits.employer_id     ──┘                    
                                
                                Employer.java
                                @Table(name = "employers") ✅

Option B: Align Schema to Entity
────────────────────────────────
members.employer_id    ──┐
claims.employer_id     ──┼──→  companies(id)  ✅ Renamed from employers
visits.employer_id     ──┘                    
                                
                                Employer.java
                                @Table(name = "companies") ✅
                                (Keep current mapping)
```

---

## DEPRECATED ENTITIES STILL IN CODEBASE

```
┌─────────────────────────────────────────────────────────────┐
│  ENTITIES MARKED @Deprecated BUT STILL PRESENT              │
│                                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Company.java                          │                │
│  │  @Deprecated                           │  ❌ DELETE     │
│  │  "Use Employer instead"                │                │
│  └────────────────────────────────────────┘                │
│                    │                                        │
│                    ▼                                        │
│  ┌────────────────────────────────────────┐                │
│  │  CompanyRepository.java                │  ❌ DELETE     │
│  │  CompanyService.java                   │  ❌ DELETE     │
│  └────────────────────────────────────────┘                │
│                                                             │
│  ┌────────────────────────────────────────┐                │
│  │  ReviewerCompany.java                  │                │
│  │  @Deprecated                           │  ❌ DELETE     │
│  │  "Being refactored"                    │                │
│  └────────────────────────────────────────┘                │
│                    │                                        │
│                    ▼                                        │
│  ┌────────────────────────────────────────┐                │
│  │  ReviewerCompanyRepository.java        │  ❌ DELETE     │
│  │  ReviewerCompanyService.java           │  ❌ DELETE     │
│  └────────────────────────────────────────┘                │
│                                                             │
│  STILL REFERENCED IN:                                       │
│  • CompanySettingsController                                │
│  • PdfCompanySettingsService                                │
│  • SystemAdminService                                       │
└─────────────────────────────────────────────────────────────┘

🔴 PROBLEM: Dead code cluttering codebase
⚠️  IMPACT: Developer confusion, accidental usage
✅  SOLUTION: Delete all 6 files + update references
```

---

## SUMMARY OF VIOLATIONS

| # | Violation | Severity | Files Affected | Fix Effort |
|---|-----------|----------|----------------|------------|
| 1 | Dual entity mapping | 🔴 CRITICAL | 2 entities | 1 hour |
| 2 | Schema-entity mismatch | 🔴 CRITICAL | 1 entity, 1 migration | 1 hour |
| 3 | Multi-tenant pattern | ⚠️  WARNING | 1 entity, 1 service | 6 hours |
| 4 | Deprecated entities | ⚠️  WARNING | 6 files | 4 hours |
| 5 | Residual comments | ℹ️  INFO | 10+ files | 2 hours |

**TOTAL FIX EFFORT:** 14 hours (2 days)  
**TOTAL RISK:** HIGH (without fixes)  
**PRODUCTION READY:** ❌ NO (with fixes: ✅ YES)

---

**See ARCHITECTURE_AUDIT_REPORT.md for full details**
