# 🛠️ Production Fix Master Plan
## Medical TPA System - Remediation Roadmap

**Document Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-02-10  
**Author:** Principal Software Architect  
**Scope:** Critical & Major Issue Resolution  
**Target:** Production-Ready System  

---

## 📋 Executive Summary

### For Management

This Medical TPA system has **strong architectural foundations** but requires **targeted fixes** before handling real financial transactions in production. The audit identified **6 critical issues** and **5 major issues** that must be addressed.

**Good News:**
- Financial integrity patterns are enterprise-grade (pessimistic locking, immutable audit trails)
- Domain model is well-designed (visit-centric architecture, contract-driven pricing)
- Settlement workflows are sound (double-entry accounting, state machines)

**Required Action:**
- **Phase 1 (3 weeks):** Fix 6 critical security and data integrity issues
- **Phase 2 (6 weeks post-launch):** Add performance optimizations and constraints
- **Phase 3 (ongoing):** Address technical debt as capacity allows

**Cost-Benefit:**
- **Investment:** ~3 weeks developer time before go-live
- **Risk Reduction:** Prevents data corruption, unauthorized access, financial double-counting
- **ROI:** System can safely operate for years without architectural rewrites

**Go/No-Go Decision Point:**
- **WITH FIXES:** ✅ Safe for production medical TPA operations
- **WITHOUT FIXES:** 🔴 High risk of data corruption and security breaches

---

## 🎯 Guiding Principles

### Why These Fixes Matter

1. **Financial Correctness is Non-Negotiable**
   - Medical claims involve real money and patient care
   - Concurrency bugs can cause double-approvals and overpayments
   - Once money flows, errors are expensive to reverse

2. **Security Must Be Defense-in-Depth**
   - UI-only security is security theater
   - Every API endpoint MUST enforce permissions server-side
   - Session-based auth requires CSRF protection

3. **Data Integrity is Forever**
   - Soft-deleted records create orphan references
   - Non-idempotent migrations break CI/CD pipelines
   - Choose solutions that survive for years

4. **Performance Degrades Predictably**
   - Missing indexes cause O(n) scans that only hurt at scale
   - N+1 queries are invisible with 10 records, catastrophic with 100,000
   - Fix before pain, not after complaints

5. **Technical Debt is Acceptable When Labeled**
   - Not every issue is a blocker
   - Document trade-offs explicitly
   - Defer optimization but not safety

---

## 📊 Detailed Fix Plan

### Critical Issues (MUST FIX BEFORE PRODUCTION)

---

#### **C1: PreAuthorization Missing @Version**

**Issue:**
PreAuthorization entity lacks optimistic locking, allowing concurrent approvals on the same request.

**Production Risk:**
Two reviewers approving the same pre-authorization simultaneously:
- Both read PENDING status
- Both transition to APPROVED
- Member annual limit deducted TWICE
- Financial calculations run in parallel with race conditions

**Preferred Solution:**
Add `@Version` field to `PreAuthorization` entity.

**Why This Solution:**
- Standard JPA optimistic locking pattern
- Zero performance overhead (version checked during UPDATE)
- Fails fast with `OptimisticLockException` (easily caught and retried)
- Works automatically with existing Hibernate infrastructure

**Alternatives Considered:**
- ❌ Pessimistic locking (SELECT FOR UPDATE): Too slow, unnecessary for rare conflicts
- ❌ Distributed locks (Redis): Over-engineered for this use case

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Backend** | Add `@Version` field to `PreAuthorization.java` |
| **Database** | Migration: `ALTER TABLE pre_authorizations ADD COLUMN version BIGINT NOT NULL DEFAULT 0;` |
| **Testing** | Concurrency test: Two simultaneous approval attempts |

**Effort Estimate:** 4 hours (1 entity, 1 migration, 2 tests)  
**Implementation Risk:** ⚡ LOW (standard pattern, no breaking changes)  
**Timing:** ✅ **MUST FIX BEFORE GO-LIVE**

**Acceptance Criteria:**
- `PreAuthorization.java` has `@Version` annotation
- Migration `V062__add_version_to_preauth.sql` created and tested
- Concurrent approval test fails with `OptimisticLockException`

---

#### **C2: Soft Delete Causing Orphan References**

**Issue:**
Entities use `active = false` soft deletes, allowing claims to reference "deleted" medical services.

**Production Risk:**
- Claim references MedicalService #45 (active = false)
- Service appears in claim display but is "deleted"
- Pricing calculations fail with null pointer
- Duplicate service codes per provider (unique constraint bypassed)

**Preferred Solution:**
**Keep soft delete** BUT add **partial unique index** on active records only.

**Why This Solution:**
- Preserves historical data (required for audit compliance)
- Prevents duplicate codes among active services
- No application logic changes needed
- Works with existing queries that filter `WHERE active = true`

**Alternatives Considered:**
- ❌ Hard delete with archival: Requires archive tables, complex migration
- ❌ Remove soft delete entirely: Breaks audit trail for deleted services

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Database** | Create partial unique indexes:<br>`CREATE UNIQUE INDEX idx_medical_service_code_active ON medical_services(provider_id, service_code) WHERE active = true;`<br>Same for `medical_categories`, `users`, `organizations` |
| **Backend** | Add validation: Prevent soft-delete if referenced by active claims |
| **Testing** | Test duplicate code insertion fails when active = true |

**Effort Estimate:** 8 hours (4 indexes, validation logic, tests)  
**Implementation Risk:** ⚡ LOW (PostgreSQL 9.4+ supports partial indexes)  
**Timing:** ✅ **MUST FIX BEFORE GO-LIVE**

**Acceptance Criteria:**
- Partial unique indexes on `medical_services`, `medical_categories`, `users`, `organizations`
- Attempting to create duplicate active service code throws unique constraint violation
- Service with active claims cannot be soft-deleted (validation error)

---

#### **C3: Missing Server-Side RBAC Enforcement**

**Issue:**
Many REST endpoints lack `@PreAuthorize` annotations, relying only on UI permission checks.

**Production Risk:**
- Attacker bypasses React UI using curl/Postman
- Low-privilege user accesses all member data via direct API call
- Financial operations (claim approval, settlement) executable by unauthorized users

**Preferred Solution:**
Systematic audit and enforcement of `@PreAuthorize` on ALL controller endpoints.

**Why This Solution:**
- Spring Security Method Security is battle-tested
- Declarative annotations (easy to review in code)
- Works with existing SUPER_ADMIN bypass logic
- Defense-in-depth (UI + server-side enforcement)

**Alternatives Considered:**
- ❌ AOP-based authorization: Harder to audit, less explicit
- ❌ Service-layer checks only: Controllers can bypass services

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Backend** | Audit every `@RestController` class<br>Add `@PreAuthorize` to all endpoints<br>Default: `@PreAuthorize("isAuthenticated()")`<br>Sensitive ops: `@PreAuthorize("hasAuthority('APPROVE_CLAIMS')")` |
| **Testing** | Security test: Low-privilege token attempts restricted endpoint → 403 |

**Effort Estimate:** 40 hours (50+ controllers × 30 min per controller)  
**Implementation Risk:** ⚡ MEDIUM (requires domain knowledge for correct permissions)  
**Timing:** ✅ **MUST FIX BEFORE GO-LIVE**

**Acceptance Criteria:**
- EVERY public endpoint has `@PreAuthorize` annotation
- Security regression test suite with low-privilege tokens
- Documentation: Permission mapping (endpoint → required authority)

**Implementation Strategy:**
```java
// Step 1: Default deny (add to application.properties)
# spring.security.filter.dispatcher-types=FORWARD,REQUEST,ERROR

// Step 2: Controller audit checklist
// ✅ MemberController
// ✅ ClaimController  
// ✅ SettlementBatchController
// ... (full list in separate tracking doc)

// Step 3: Template per operation type
GET /api/v1/members → @PreAuthorize("hasAnyAuthority('VIEW_MEMBERS', 'MANAGE_MEMBERS')")
POST /api/v1/claims/{id}/approve → @PreAuthorize("hasAuthority('APPROVE_CLAIMS')")
DELETE /api/v1/members/{id} → @PreAuthorize("hasAuthority('DELETE_MEMBERS')")
```

---

#### **C4: CSRF Protection Strategy**

**Issue:**
CSRF protection disabled with comment "Modern SPA + CORS provides equivalent protection" (incorrect for session-based auth).

**Production Risk:**
- User logged into TPA system visits evil.com
- Evil site submits hidden form to `/api/v1/claims/123/approve`
- Browser sends session cookie automatically
- Request succeeds (no CSRF token validation)

**Preferred Solution:**
Implement **SameSite=Strict cookie attribute** (simplest, no frontend changes).

**Why This Solution:**
- Zero frontend code changes (no token handling needed)
- Browser-native CSRF protection
- Works with existing session-based auth
- Supported by all modern browsers (2020+)

**Alternatives Considered:**
- ❌ Synchronizer Token Pattern: Requires frontend changes (axios interceptor for XSRF-TOKEN)
- ❌ Double-Submit Cookie: More complex, no advantage over SameSite

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Backend** | Configure `CookieSerializer` with `SameSite=Strict`<br>Test with frontend on same domain |
| **Testing** | CSRF attack simulation: Form POST from different origin → blocked |

**Effort Estimate:** 4 hours (config change, testing)  
**Implementation Risk:** ⚡ LOW (single config bean)  
**Timing:** ✅ **MUST FIX BEFORE GO-LIVE**

**Acceptance Criteria:**
- Session cookie has `SameSite=Strict` attribute
- Cross-site form submission fails (cookie not sent)
- Same-site requests work normally

**Implementation:**
```java
@Configuration
public class CookieConfig {
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setSameSite("Strict"); // Blocks cross-site cookie sending
        serializer.setCookieName("JSESSIONID");
        serializer.setUseHttpOnlyCookie(true); // Already set, keep it
        serializer.setUseSecureCookie(true); // HTTPS only in production
        return serializer;
    }
}
```

---

#### **C5: Data-Mutating Flyway Migrations**

**Issue:**
Migrations `V056` and `V057` contain UPDATE statements, making them non-idempotent.

**Production Risk:**
- CI/CD pipeline creates fresh database
- `flyway migrate` runs UPDATE on empty table → no error but unexpected results
- Cannot rebuild database from scratch (breaks disaster recovery)

**Preferred Solution:**
Remove UPDATE statements, use `DEFAULT` + `NOT NULL` constraints only.

**Why This Solution:**
- Migrations become schema-only (idempotent)
- Works on empty databases (CI/CD friendly)
- Backfill existing data with ONE-TIME data script (run manually in production)

**Alternatives Considered:**
- ❌ Keep UPDATEs, add `IF EXISTS` checks: Still not idempotent (runs twice = different result)
- ❌ Move to repeatable migrations (R__): Runs every time, unnecessary

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Migration** | Edit `V056__enforce_financial_not_null.sql`:<br>Remove: `UPDATE claims SET approved_amount = 0 WHERE ...`<br>Keep: `ALTER TABLE claims ALTER COLUMN approved_amount SET DEFAULT 0, ALTER COLUMN approved_amount SET NOT NULL;` |
| **Backend** | Create `scripts/data-migrations/001-backfill-financial-nulls.sql` (run once manually) |
| **Testing** | Test: `dropdb && createdb && flyway migrate` succeeds |

**Effort Estimate:** 6 hours (edit 2 migrations, create backfill script, test clean rebuild)  
**Implementation Risk:** ⚡ LOW (schema changes only, data script for existing prod)  
**Timing:** ✅ **MUST FIX BEFORE GO-LIVE**

**Acceptance Criteria:**
- `V056` and `V057` contain NO UPDATE/INSERT/DELETE statements
- Fresh database build succeeds
- Idempotency test: Run `flyway migrate` twice → same result

---

#### **C6: Visit Entity Missing @Version**

**Issue:**
Visit status transitions lack optimistic locking (e.g., REGISTERED → CLAIM_SUBMITTED vs PENDING_PREAUTH).

**Production Risk:**
- Two operations (claim creation + pre-auth creation) modify visit simultaneously
- Both read status = REGISTERED
- One saves CLAIM_SUBMITTED, other saves PENDING_PREAUTH
- Final status is inconsistent with actual entities created

**Preferred Solution:**
Add `@Version` field to `Visit` entity.

**Why This Solution:**
- Same pattern as Claim and Member (consistency)
- Prevents concurrent status updates
- No UI changes needed (backend safety net)

**Alternatives Considered:**
- ❌ Pessimistic locking: Overkill for visit updates (rare conflicts)

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Backend** | Add `@Version` field to `Visit.java` |
| **Database** | Migration: `ALTER TABLE visits ADD COLUMN version BIGINT NOT NULL DEFAULT 0;` |
| **Testing** | Concurrency test: Simultaneous claim + pre-auth creation on same visit |

**Effort Estimate:** 4 hours (same as C1)  
**Implementation Risk:** ⚡ LOW (standard pattern)  
**Timing:** ✅ **MUST FIX BEFORE GO-LIVE**

**Acceptance Criteria:**
- `Visit.java` has `@Version` annotation
- Migration `V063__add_version_to_visit.sql` created
- Concurrent modification test throws `OptimisticLockException`

---

### Major Issues (FIX POST-PRODUCTION)

---

#### **M1: Missing Foreign Key Indexes**

**Issue:**
FK columns (`member_id`, `visit_id`, `provider_id`) lack indexes, causing sequential scans on JOINs.

**Production Risk:**
- Query: "Show all claims for member #123" performs table scan
- Performance acceptable with 1,000 claims
- Degrades to timeouts with 100,000+ claims
- Invisible until production scale

**Preferred Solution:**
Create indexes on ALL FK columns in one migration.

**Why This Solution:**
- PostgreSQL best practice (every FK should have index unless proven unnecessary)
- Zero application code changes
- One-time index build (5-10 min on production data)

**Alternatives Considered:**
- ❌ Wait for slow query complaints: Reactive approach, poor UX
- ❌ Selective indexing: Premature optimization (just index all FKs)

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Database** | Migration: Create 15-20 indexes on FK columns<br>`CREATE INDEX idx_claims_member_id ON claims(member_id);`<br>`CREATE INDEX idx_claims_visit_id ON claims(visit_id);`<br>Etc. |
| **Testing** | Query plan analysis: `EXPLAIN ANALYZE` shows index scans, not seq scans |

**Effort Estimate:** 6 hours (identify all FKs, create migration, test query plans)  
**Implementation Risk:** ⚡ LOW (indexes can be created online in PostgreSQL 11+)  
**Timing:** ⚠️ **CAN FIX POST-GO-LIVE** (within 1 month)

**Acceptance Criteria:**
- All FK columns have corresponding indexes
- Query plans show "Index Scan" instead of "Seq Scan" on joined tables
- Performance baseline documented for future comparison

---

#### **M2: Denormalized Snapshot Consistency**

**Issue:**
Visit stores `medicalServiceName` as cached snapshot; if master data changes, old visits show stale names.

**Production Risk:**
- Service renamed: "MRI Brain" → "Brain MRI Scan"
- Old visits display old name (historical snapshot)
- Users expect current master data (confusion)
- Reports mix snapshot vs live data

**Preferred Solution:**
**Document as intentional historical snapshot** in JavaDoc.

**Why This Solution:**
- This is actually CORRECT for audit compliance (preserve as-of-date information)
- Changing to live JOINs breaks historical accuracy
- Minimal effort (documentation only)
- Aligns with financial snapshot pattern (Claim stores approved_amount at time of approval)

**Alternatives Considered:**
- ❌ Remove snapshots, always JOIN: Breaks audit trail (what was the name when visit occurred?)
- ❌ Add "current name" column: Doubles storage, confuses users

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Backend** | Add JavaDoc to `Visit.java`:<br>`/** Medical service name AT TIME OF VISIT (historical snapshot). May differ from current master data. */` |
| **Frontend** | Add tooltip: "Service name as of visit date (may have been renamed)" |
| **Documentation** | ADR: "Why We Use Denormalized Snapshots for Historical Data" |

**Effort Estimate:** 4 hours (documentation, UI tooltip)  
**Implementation Risk:** ⚡ NONE (documentation only)  
**Timing:** ⚠️ **CAN FIX POST-GO-LIVE** (when time allows)

**Acceptance Criteria:**
- JavaDoc explains snapshot semantics
- UI tooltips clarify historical vs current data
- ADR documents decision rationale

---

#### **M3: Claim Entity Size (God Object)**

**Issue:**
Claim entity has 34 columns, mixing core data, financials, SLA tracking, and settlement data.

**Production Risk:**
- Hard to test (too many concerns in one class)
- Frequent merge conflicts (hotspot file)
- Changes to SLA logic require touching Claim entity

**Preferred Solution:**
**DEFER refactoring.** Mark as technical debt, address in Phase 3.

**Why This Solution:**
- Not a production-blocking issue (system works as-is)
- Refactoring is risky close to launch
- Better to stabilize in production first, refactor later with data
- Use `@Embeddable` pattern later if needed

**Alternatives Considered:**
- ❌ Refactor now: High risk, low ROI before production data exists
- ❌ Extract to separate tables: Over-normalization, performance hit

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Documentation** | Add TODO comment in `Claim.java`:<br>`// TODO (Post-Production): Consider @Embeddable for ClaimFinancials, ClaimSLA` |
| **Backlog** | Create ticket: "Refactor Claim entity using @Embeddable pattern" (P3) |

**Effort Estimate:** 1 hour (documentation only)  
**Implementation Risk:** ⚡ NONE (deferred)  
**Timing:** 🔵 **TECHNICAL DEBT** (address 6-12 months post-launch if pain arises)

**Acceptance Criteria:**
- Technical debt documented in code and backlog
- No action required before go-live

---

#### **M4: No Batch Size Limits**

**Issue:**
`SettlementBatchService.addClaimsToBatch()` accepts unlimited claim IDs, risking memory exhaustion.

**Production Risk:**
- Malicious/accidental request: Add 10,000 claims to batch
- Application loads 10,000 entities into memory
- OutOfMemoryError or timeout
- DoS attack vector

**Preferred Solution:**
Add `MAX_CLAIMS_PER_BATCH = 500` validation.

**Why This Solution:**
- Simple guard clause (1 line of code)
- Reasonable limit (500 claims = ~$50k-500k per batch, typical business size)
- Fail fast with clear error message

**Alternatives Considered:**
- ❌ No limit: Accepts DoS risk
- ❌ Pagination only: Doesn't prevent large batch creation

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Backend** | Add constant `MAX_CLAIMS_PER_BATCH = 500`<br>Add validation in `addClaimsToBatch()`:<br>`if (claimIds.size() > MAX_CLAIMS_PER_BATCH) throw BusinessRuleException(...)` |
| **Testing** | Test: Request with 501 claims fails with clear error message |

**Effort Estimate:** 2 hours (validation logic, test)  
**Implementation Risk:** ⚡ LOW (simple validation)  
**Timing:** ⚠️ **CAN FIX POST-GO-LIVE** (low likelihood of exploitation)

**Acceptance Criteria:**
- Batch creation with >500 claims fails with error message
- UI shows batch size limit in tooltip/help text
- Error message: "Cannot add more than 500 claims per batch. Split into multiple batches."

---

#### **M5: Business Logic in Controllers**

**Issue:**
Some controllers contain validation logic that should be in service layer.

**Production Risk:**
- Duplicated validation across endpoints
- Hard to unit test (requires HTTP mocking)
- Inconsistent business rules

**Preferred Solution:**
**DEFER refactoring.** Move to service layer gradually during feature work.

**Why This Solution:**
- Not a correctness issue (logic still executes)
- Refactoring controllers is risky (easy to break routes)
- Better to fix incrementally as you touch code
- Forces review during future changes

**Alternatives Considered:**
- ❌ Big Bang refactoring: High risk, low ROI
- ❌ Keep as-is: Accumulates technical debt

**Implementation Scope:**
| Area | Changes Required |
|------|------------------|
| **Documentation** | Add coding standard: "Business logic belongs in @Service classes, not @RestController" |
| **Code Review** | Add checklist item: "Does this controller have business logic? Move to service." |

**Effort Estimate:** 2 hours (documentation)  
**Implementation Risk:** ⚡ NONE (policy change, incremental enforcement)  
**Timing:** 🔵 **TECHNICAL DEBT** (address during ongoing development)

**Acceptance Criteria:**
- Coding standard documented
- Code review process enforces pattern
- New code follows standard

---

## 🗓️ Phase-Based Roadmap

### **Phase 1: Pre-Production Hardening** (3 weeks before go-live)

**Goal:** Fix all production-blocking issues

**Critical Security (Week 1)**
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| C3: Audit + add @PreAuthorize to all controllers | Backend Dev | 40h | ⏳ Not Started |
| C4: Implement SameSite=Strict CSRF protection | Backend Dev | 4h | ⏳ Not Started |
| Security regression test suite | QA | 8h | ⏳ Not Started |

**Data Integrity (Week 2)**
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| C1: Add @Version to PreAuthorization | Backend Dev | 4h | ⏳ Not Started |
| C6: Add @Version to Visit | Backend Dev | 4h | ⏳ Not Started |
| C2: Add partial unique indexes for soft delete | DBA | 8h | ⏳ Not Started |
| C2: Add validation: prevent delete if referenced | Backend Dev | 4h | ⏳ Not Started |
| Concurrency integration tests | QA | 8h | ⏳ Not Started |

**Migration Safety (Week 3)**
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| C5: Remove UPDATE from V056, V057 migrations | DBA | 4h | ⏳ Not Started |
| C5: Create data backfill script for production | DBA | 2h | ⏳ Not Started |
| Test: Clean database rebuild from scratch | DevOps | 2h | ⏳ Not Started |
| Test: Idempotent migration (run twice) | DevOps | 2h | ⏳ Not Started |

**Total Effort:** ~90 hours (2.25 developer-weeks)

**Success Criteria:**
- ✅ All endpoints have server-side permission checks
- ✅ CSRF protection active (SameSite cookies)
- ✅ PreAuthorization and Visit have optimistic locking
- ✅ Soft delete cannot create orphan references
- ✅ Migrations are schema-only and idempotent
- ✅ Security + concurrency test suites pass

**Go-Live Gate:** All Phase 1 tasks MUST be complete.

---

### **Phase 2: Post-Production Hardening** (6 weeks after go-live)

**Goal:** Performance optimization and operational resilience

**Performance (Weeks 1-2)**
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| M1: Create FK indexes migration (V064) | DBA | 4h | ⏳ Not Started |
| M1: Run index build on production (off-peak) | DBA | 2h | ⏳ Not Started |
| Baseline query performance metrics | DevOps | 4h | ⏳ Not Started |
| EXPLAIN ANALYZE validation on top 10 queries | Backend Dev | 4h | ⏳ Not Started |

**Operational Safety (Weeks 3-4)**
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| M4: Add MAX_CLAIMS_PER_BATCH validation | Backend Dev | 2h | ⏳ Not Started |
| M2: Document denormalized snapshots (JavaDoc) | Backend Dev | 4h | ⏳ Not Started |
| M2: Add UI tooltips for historical data | Frontend Dev | 4h | ⏳ Not Started |

**Production Monitoring (Weeks 5-6)**
| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| Set up slow query logging (>1s) | DevOps | 4h | ⏳ Not Started |
| Dashboard: Concurrent approval exceptions | DevOps | 4h | ⏳ Not Started |
| Alert: Batch size approaching 500 | DevOps | 2h | ⏳ Not Started |

**Total Effort:** ~34 hours (1 developer-week)

**Success Criteria:**
- ✅ All FK columns have indexes
- ✅ Query performance baseline established
- ✅ Batch size limits enforced
- ✅ Monitoring and alerting active

---

### **Phase 3: Technical Debt Backlog** (Ongoing, 6-12 months)

**Goal:** Code quality improvements (non-blocking)

| Task | Effort | Priority |
|------|--------|----------|
| M3: Refactor Claim entity (@Embeddable pattern) | 16h | P3 - Low |
| M5: Move business logic from controllers to services | 20h | P3 - Low |
| L1: Add JOIN FETCH queries for N+1 prevention | 12h | P4 - Backlog |
| L2: Extract hardcoded role prefixes to config | 2h | P4 - Backlog |
| L3: Standardize comment language (all English) | 8h | P4 - Backlog |

**Approach:**
- Address during feature development (when touching related code)
- Schedule 1 technical debt task per sprint
- Revisit priority if production issues arise

---

## ✅ Final Readiness Checklist

### Pre-Production Sign-Off (All MUST be ✅)

**Security Hardening**
- [ ] All REST endpoints have `@PreAuthorize` annotations
- [ ] Security regression test suite passes (low-privilege tokens → 403)
- [ ] CSRF protection enabled (SameSite=Strict cookies)
- [ ] CSRF attack simulation test passes (cross-site form blocked)

**Data Integrity**
- [ ] `PreAuthorization` has `@Version` field (migration V062 applied)
- [ ] `Visit` has `@Version` field (migration V063 applied)
- [ ] Partial unique indexes on soft-delete tables (medical_services, etc.)
- [ ] Validation prevents soft-delete of referenced records
- [ ] Concurrency tests pass (OptimisticLockException on simultaneous updates)

**Migration Safety**
- [ ] V056 and V057 contain NO UPDATE/INSERT/DELETE statements
- [ ] Data backfill script created (scripts/data-migrations/001-backfill.sql)
- [ ] Clean database rebuild succeeds (`dropdb && createdb && flyway migrate`)
- [ ] Migration idempotency test passes (run twice → same result)

**Documentation**
- [ ] ADR created: "CSRF Protection Strategy" (SameSite cookies)
- [ ] ADR created: "Soft Delete with Partial Unique Indexes"
- [ ] JavaDoc added: Denormalized snapshot fields explained
- [ ] Permission mapping documented (endpoint → required authority)

**Testing**
- [ ] Security test suite: ~30 test cases (per-endpoint permission checks)
- [ ] Concurrency test suite: ~10 test cases (PreAuth, Visit, Claim)
- [ ] Migration test suite: ~5 test cases (clean rebuild, idempotency)
- [ ] All tests GREEN on CI/CD pipeline

**Performance Baseline**
- [ ] Query performance metrics recorded (top 10 queries)
- [ ] Monitoring dashboards configured (slow queries, exceptions)
- [ ] Alerting rules created (CSRF failures, OptimisticLockExceptions)

**Deployment**
- [ ] Production database backup taken
- [ ] Flyway migration dry-run on staging (V062, V063)
- [ ] Data backfill script tested on staging
- [ ] Rollback plan documented (restore from backup)

**Sign-Off**
- [ ] **Principal Software Architect:** Code review complete
- [ ] **Database Architect:** Schema changes approved
- [ ] **Security Engineer:** Security controls verified
- [ ] **QA Lead:** Test suites pass
- [ ] **DevOps Lead:** Deployment plan ready
- [ ] **Product Owner:** Accepts 3-week timeline

---

## 📈 Risk Assessment

### Pre-Mitigation Risks (Without Fixes)

| Risk | Likelihood | Impact | Score |
|------|------------|--------|-------|
| Unauthorized data access via direct API calls | HIGH | CRITICAL | 🔴 9/10 |
| Concurrent approval double-spending | MEDIUM | CRITICAL | 🔴 8/10 |
| Soft-delete orphan references | HIGH | HIGH | 🟡 7/10 |
| CSRF attack on session cookies | LOW | CRITICAL | 🟡 6/10 |
| Non-idempotent migration breaks CI/CD | MEDIUM | MEDIUM | 🟠 5/10 |
| Performance degradation at scale | HIGH | MEDIUM | 🟠 6/10 |

### Post-Mitigation Risks (With Phase 1 Fixes)

| Risk | Likelihood | Impact | Score |
|------|------------|--------|-------|
| Unauthorized data access | LOW | CRITICAL | 🟢 3/10 |
| Concurrent approval issues | LOW | CRITICAL | 🟢 2/10 |
| Soft-delete orphans | LOW | MEDIUM | 🟢 2/10 |
| CSRF exploits | VERY LOW | MEDIUM | 🟢 1/10 |
| Migration failures | LOW | LOW | 🟢 2/10 |
| Performance issues | MEDIUM | MEDIUM | 🟠 4/10 |

**Residual Risk:** Phase 2 addresses performance (M1 indexes reduce to 🟢 2/10)

---

## 🎓 Lessons Learned (For Future Projects)

1. **Security by Default:**
   - Add `@PreAuthorize("isAuthenticated()")` to base controller class
   - Fail-closed, not fail-open

2. **Concurrency from Day 1:**
   - Every entity with business state gets `@Version`
   - No exceptions, no "we'll add it later"

3. **Migrations as Schema-Only:**
   - Treat Flyway migrations as DDL scripts
   - Data changes go in separate `scripts/data-migrations/` folder

4. **Soft Delete Requires Constraints:**
   - Partial unique indexes (`WHERE active = true`)
   - Validation on delete (check for references)

5. **Index Every FK:**
   - Create indexes in same migration as FK creation
   - No "wait and see" approach

---

## 📞 Support and Escalation

**For Questions During Implementation:**

- **Technical Lead:** Principal Software Architect
- **Database Changes:** Database Architect
- **Security Review:** Security Engineer
- **Timeline Issues:** Product Owner

**Escalation Triggers:**
- Any Phase 1 task blocked >2 days
- Security test failures (must resolve before go-live)
- Migration failures on staging
- Timeline slippage >3 days

**Decision Authority:**
- Phase 1 scope changes: Principal Architect + Product Owner
- Go-live gate decision: All stakeholders (security, QA, DevOps)

---

## 📝 Appendix: Implementation Checklists

### Checklist: Adding @Version to Entity

- [ ] Add field to entity class: `@Version @Column(name = "version") private Long version;`
- [ ] Create migration: `V0XX__add_version_to_ENTITY.sql`
- [ ] Migration content: `ALTER TABLE table_name ADD COLUMN version BIGINT NOT NULL DEFAULT 0;`
- [ ] Write concurrency test: Two simultaneous updates → OptimisticLockException
- [ ] Update DTO mappers if needed (version field in responses)
- [ ] Document in entity JavaDoc: "Uses optimistic locking to prevent concurrent modifications"

### Checklist: Adding @PreAuthorize to Controller

- [ ] Identify required permission (VIEW_X, CREATE_X, UPDATE_X, DELETE_X)
- [ ] Add annotation: `@PreAuthorize("hasAuthority('PERMISSION_NAME')")`
- [ ] Verify permission exists in `app_permissions` table
- [ ] Write security test: Low-privilege token → 403
- [ ] Write security test: Correct permission → 200
- [ ] Update API documentation (Swagger): Add security requirement
- [ ] Add to permission mapping spreadsheet: Endpoint → Permission

### Checklist: Creating Partial Unique Index

- [ ] Identify table with soft delete (`active` column)
- [ ] Identify unique constraint needed (e.g., provider_id + service_code)
- [ ] Create migration: `V0XX__add_partial_unique_index.sql`
- [ ] Migration content: `CREATE UNIQUE INDEX idx_NAME ON table(col1, col2) WHERE active = true;`
- [ ] Test: Insert duplicate with `active = true` → constraint violation
- [ ] Test: Insert duplicate with `active = false` → allowed
- [ ] Test: Reactivate duplicate → constraint violation

---

**Document Status:** READY FOR APPROVAL  
**Next Review:** After Phase 1 completion  
**Version:** 1.0  
**Last Updated:** 2026-02-10

---

**Approved By:**

_________________________  
Principal Software Architect

_________________________  
Database Architect

_________________________  
Security Engineer

_________________________  
Product Owner

**Approval Date:** ___________
