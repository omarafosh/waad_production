# 📋 Contract Requirements Quick Checklist

**Generated:** 2024-12-29 (Updated: 2025-01-15)  
**Total Critical Models:** 15  
**Contracts Complete:** 4 ✅ (Organization, Member, BenefitPolicy, BenefitPolicyRule)  
**Contracts Needed:** 11 ⚠️

---

## 🔴 CRITICAL Priority (Implement ASAP)

### ✅ 1. Organization
- **Status:** Complete
- **Contract:** [EMPLOYER_API_CONTRACT.md](EMPLOYER_API_CONTRACT.md)
- **Auto-Code:** EMP-XX, TPA-XX, INS-XX
- **Phases:** Phase 1-3 Complete

### ✅ 2. Member
- **Status:** ✅ **Phase 2 COMPLETE** (2025-12-30)
- **Contract:** [MEMBER_API_CONTRACT.md](MEMBER_API_CONTRACT.md)
- **Implementation:** [MEMBER-PHASE-2-IMPLEMENTATION-REPORT.md](MEMBER-PHASE-2-IMPLEMENTATION-REPORT.md)
- **Auto-Code:** WAAD|MEMBER|{SEQUENCE}
- **Key Features:** 
  - ✅ Card number generation (AtomicLong sequence)
  - ✅ Status management (suspend/activate/terminate)
  - ✅ Card management (block/activate)
  - ✅ Eligibility check (7 conditions)
  - ✅ Benefit policy auto-assignment
  - ✅ Civil ID (optional, conditional validation)
  - ✅ Field normalization (@JsonAlias)
- **Complexity:** Very High
- **Business Impact:** CRITICAL
- **Compliance:** 100%

### ✅ 3. BenefitPolicy
- **Status:** ✅ **COMPLETE** (2025-01-15)
- **Contract:** [BENEFIT_POLICY_API_CONTRACT.md](BENEFIT_POLICY_API_CONTRACT.md)
- **Auto-Code:** POL-YYYY-XXX (e.g., POL-2025-001)
- **Key Features:**
  - ✅ Single active policy per employer (date overlap prevention)
  - ✅ Date range validation (startDate < endDate)
  - ✅ Coverage rules integration (BenefitPolicyRule)
  - ✅ Status lifecycle (DRAFT → ACTIVE → EXPIRED/SUSPENDED/CANCELLED)
  - ✅ Financial limits hierarchy (annual, per-family, per-member)
  - ✅ Default coverage percentage (0-100%, default 80%)
  - ✅ Member eligibility integration (conditions 5 & 6 of 7)
  - ✅ Auto-expiry scheduled job
  - ✅ Selector endpoints for dropdowns
- **Complexity:** Very High
- **Business Impact:** CRITICAL
- **Implementation:** FULLY IMPLEMENTED (entities, DTOs, services, controllers)

### ✅ 4. BenefitPolicyRule
- **Status:** ✅ **COMPLETE** (2025-01-15)
- **Contract:** [BENEFIT_POLICY_RULE_API_CONTRACT.md](BENEFIT_POLICY_RULE_API_CONTRACT.md)
- **Parent:** BenefitPolicy (nested endpoints)
- **Key Features:**
  - ✅ XOR constraint (category OR service, not both)
  - ✅ Coverage priority (service-specific > category-level)
  - ✅ Coverage percentage inheritance from policy
  - ✅ No coverage by default (0% if no rule exists)
  - ✅ No duplicate rules per target
  - ✅ Limits (amount, times, waiting period)
  - ✅ Pre-approval flag
  - ✅ Coverage lookup endpoints (for claims processing)
  - ✅ Bulk create rules
- **Complexity:** Very High
- **Business Impact:** CRITICAL
- **Implementation:** FULLY IMPLEMENTED (nested in BenefitPolicy module)

### ⚠️ 5. Provider
- **Status:** ⚠️ **CONTRACT NEEDED**
- **Auto-Code:** PRV-XXX
- **Key Features:**
  - License number uniqueness
  - Provider type validation (HOSPITAL, CLINIC, LAB, etc.)
  - Contract management
  - Pricing agreements
  - Tax number validation
- **Complexity:** High
- **Business Impact:** HIGH

---

## 🟠 HIGH Priority

### ⚠️ 6. User (RBAC)
- **Status:** ⚠️ **CONTRACT NEEDED**
- **Key Features:**
  - Authentication (username/email + password)
  - Password hashing (BCrypt)
  - Email verification
  - Role assignment (SUPER_ADMIN, EMPLOYER_ADMIN, etc.)
  - Multi-tenant scoping (employerId/companyId)
  - Active/Inactive status
- **Complexity:** Very High
- **Business Impact:** CRITICAL

### ⚠️ 7. PreAuthorization
- **Status:** ⚠️ **CONTRACT NEEDED**
- **Auto-Code:** PA-YYYYMMDD-XXXX
- **Key Features:**
  - Status workflow (REQUESTED → UNDER_REVIEW → APPROVED/REJECTED → EXPIRED)
  - Member eligibility validation
  - Diagnosis (ICD) + Procedure (CPT) codes validation
  - Cost validation
  - Reviewer assignment
  - Approval expiry
- **Complexity:** Very High
- **Business Impact:** HIGH

### ⚠️ 8. Claim
- **Status:** ⚠️ **CONTRACT NEEDED**
- **Auto-Code:** CLM-YYYYMMDD-XXXX
- **Key Features:**
  - Status workflow (DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SETTLED)
  - Coverage calculation (via BenefitPolicy)
  - Co-Pay + Deductible calculation
  - Claim lines (multi-line items)
  - Settlement processing
  - Payment reference tracking
- **Complexity:** Very High
- **Business Impact:** CRITICAL

---

## 🟡 MEDIUM Priority

### ⚠️ 8. Visit
- **Status:** ⚠️ **CONTRACT NEEDED** (Consider)
- **Key Features:**
  - Member validation
  - Provider validation
  - Visit date validation
  - Financial tracking
  - Employer denormalization (from member)
- **Complexity:** Medium
- **Business Impact:** MEDIUM

### ⚠️ 9. BenefitPolicyRule
- **Status:** ⚠️ **CONTRACT NEEDED**
- **Key Features:**
  - Mutual exclusivity (EITHER category OR service)
  - Uniqueness per policy
  - Coverage percent inheritance (from parent policy)
  - Financial limits validation
  - Waiting period rules
  - Pre-auth requirements
- **Complexity:** High
- **Business Impact:** HIGH

### ⚠️ 10. ProviderContract
- **Status:** ⚠️ **CONTRACT NEEDED**
- **Auto-Code:** CON-YYYY-XXX
- **Key Features:**
  - Single active contract per provider
  - Date overlap prevention
  - Status workflow (DRAFT → ACTIVE → EXPIRED)
  - Pricing model (DISCOUNT, FIXED, NEGOTIATED)
  - Pricing items management
  - Auto-expiry on endDate
- **Complexity:** High
- **Business Impact:** MEDIUM

### ⚠️ 11. IcdCode & CptCode
- **Status:** ⚠️ **CONTRACT NEEDED** (Bulk Import)
- **Key Features:**
  - Code uniqueness
  - Version/Type validation
  - Bulk import from CSV/Excel
  - Bilingual descriptions
  - Category/SubCategory
- **Complexity:** Medium
- **Business Impact:** MEDIUM
- **Note:** Consider bulk import/sync API instead of CRUD

---

## ⚪ LOW Priority

### 12. Role & Permission
- **Status:** ⚪ Optional (Standard CRUD)
- **Key Features:**
  - Name uniqueness
  - Standard validation
  - Admin-only access
- **Complexity:** Low
- **Business Impact:** LOW

---

## ⚪ NO CONTRACT NEEDED

### 13. AuditLog
- **Status:** ⚪ Write-Only (No contract needed)
- **Reason:** Immutable audit records, system-generated

### 14. EligibilityCheck
- **Status:** ⚪ Write-Only (No contract needed)
- **Reason:** Immutable audit trail

### 15. Company & Employer (Deprecated)
- **Status:** ⚪ DEPRECATED (Use Organization)
- **Reason:** Legacy entities, read-only

---

## 📊 Summary Matrix

| Priority | Model | Status | Auto-Code | Complexity | Impact |
|----------|-------|--------|-----------|------------|--------|
| 🔴 | Organization | ✅ Complete | EMP-XX | Very High | CRITICAL |
| 🔴 | Member | ✅ Complete | WAAD\|MEMBER\|XX | Very High | CRITICAL |
| 🔴 | BenefitPolicy | ⚠️ Needed | POL-YYYY-XXX | Very High | CRITICAL |
| 🔴 | Provider | ⚠️ Needed | PRV-XXX | High | HIGH |
| 🟠 | User | ⚠️ Needed | - | Very High | CRITICAL |
| 🟠 | PreAuthorization | ⚠️ Needed | PA-YYYYMMDD-XXXX | Very High | HIGH |
| 🟠 | Claim | ⚠️ Needed | CLM-YYYYMMDD-XXXX | Very High | CRITICAL |
| 🟡 | Visit | ⚠️ Consider | - | Medium | MEDIUM |
| 🟡 | BenefitPolicyRule | ⚠️ Needed | - | High | HIGH |
| 🟡 | ProviderContract | ⚠️ Needed | CON-YYYY-XXX | High | MEDIUM |
| 🟡 | IcdCode/CptCode | ⚠️ Needed | - | Medium | MEDIUM |
| ⚪ | Role/Permission | ⚪ Optional | - | Low | LOW |
| ⚪ | AuditLog | ⚪ N/A | - | Very Low | LOW |
| ⚪ | EligibilityCheck | ⚪ N/A | - | Very Low | LOW |
| ⚪ | Company/Employer | ⚪ Deprecated | - | N/A | NONE |

---

## 🚀 Recommended Action Plan

### Week 1-2: Core Foundation
1. ✅ Organization - **DONE**
2. ⚠️ **Member API Contract** - Create & Implement
3. ⚠️ **BenefitPolicy API Contract** - Create & Implement

### Week 3-4: Provider Network
4. ⚠️ **Provider API Contract** - Create & Implement
5. ⚠️ **ProviderContract API Contract** - Create & Implement

### Week 5: Security
6. ⚠️ **User API Contract** - Create & Implement

### Week 6-7: Business Workflows
7. ⚠️ **PreAuthorization API Contract** - Create & Implement
8. ⚠️ **Claim API Contract** - Create & Implement

### Week 8: Supporting Entities
9. ⚠️ **BenefitPolicyRule API Contract** - Create & Implement
10. ⚠️ **Visit API Contract** - Create & Implement (Optional)

### Week 9: Reference Data
11. ⚠️ **IcdCode/CptCode Bulk Import Contract** - Create & Implement

---

## 📝 Contract Template Sections

Each contract should include:

1. **Field Registry & Mapping**
   - Frontend ↔ Backend field names
   - Required vs Optional
   - Data types & formats

2. **API Endpoints**
   - Create (POST)
   - Update (PUT)
   - Get (GET)
   - List (GET with filters)
   - Delete (DELETE - soft)

3. **Validation Rules**
   - @NotBlank, @Size, @Email, @Pattern
   - Business logic validation
   - Uniqueness constraints

4. **Auto-Code Generation** (if applicable)
   - Format pattern
   - Sequence logic
   - Collision handling

5. **Status Lifecycle** (if applicable)
   - Status transitions
   - Allowed transitions
   - Validation rules

6. **Error Handling**
   - 400 Bad Request
   - 404 Not Found
   - 409 Conflict
   - 500 Internal Server Error
   - Arabic error messages

7. **Authorization**
   - Role-based access
   - Multi-tenant scoping
   - Data isolation rules

8. **Audit Trail**
   - createdAt, updatedAt
   - createdBy, updatedBy
   - Status change history

9. **Logging**
   - INFO, DEBUG, WARN, ERROR
   - Lifecycle events

---

## ✅ Success Criteria

Contract is COMPLETE when:

- [x] Field mapping documented (Frontend ↔ Backend)
- [x] All API endpoints defined
- [x] Validation rules specified
- [x] Auto-code generation implemented (if applicable)
- [x] Status lifecycle documented (if applicable)
- [x] Error handling specified
- [x] Authorization rules defined
- [x] Audit trail configured
- [x] Logging implemented
- [x] Frontend service layer created
- [x] Backend implementation complete
- [x] Integration tests passed

---

**For detailed analysis, see:**
- 📄 [CRITICAL-MODELS-CONTRACT-ANALYSIS.md](CRITICAL-MODELS-CONTRACT-ANALYSIS.md)
- 📄 [critical-models-analysis.json](critical-models-analysis.json)

**Reference Implementation:**
- 📄 [EMPLOYER_API_CONTRACT.md](EMPLOYER_API_CONTRACT.md) (Phase 1)
- 📄 [PHASE-2-EMPLOYER-IMPLEMENTATION-REPORT.md](PHASE-2-EMPLOYER-IMPLEMENTATION-REPORT.md) (Backend)
- 📄 [PHASE-3-FRONTEND-SERVICE-GUIDE.md](PHASE-3-FRONTEND-SERVICE-GUIDE.md) (Frontend)

