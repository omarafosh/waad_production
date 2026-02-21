# System-Wide API Contract Risk Analysis & Implementation Roadmap

**Date**: February 1, 2026  
**System**: TBA WAAD Medical Insurance Management System  
**Scope**: Complete Backend Module Analysis  
**Analyst**: Senior System Architect & Risk-Oriented API Designer

---

## 📊 PHASE 1: SYSTEM INVENTORY

### Identified Modules (22 Total)

| # | Module | Package | Controllers | Purpose |
|---|--------|---------|-------------|---------|
| 1 | **Settlement** | `modules.settlement` | 2 | Provider payment batch processing |
| 2 | **Claims** | `modules.claim` | 3 | Medical claim lifecycle management |
| 3 | **Pre-Authorization** | `modules.preauthorization` | 3 | Pre-approval for medical services |
| 4 | **Eligibility** | `modules.eligibility` | 1 | Member eligibility verification |
| 5 | **Provider Contracts** | `modules.providercontract` | 2 | Contract pricing & lifecycle |
| 6 | **Benefit Policies** | `modules.benefitpolicy` | 2 | Coverage rules & limits |
| 7 | **Providers** | `modules.provider` | 5 | Provider management & portal |
| 8 | **Members** | `modules.member` | 6 | Member/beneficiary management |
| 9 | **Visits** | `modules.visit` | 2 | Patient visit logging |
| 10 | **Employers** | `modules.employer` | 1 | Employer/sponsor management |
| 11 | **Company Settings** | `modules.company` | 2 | Company configuration |
| 12 | **Medical Taxonomy** | `modules.medicaltaxonomy` | 4 | Services & categories master data |
| 13 | **Medical Packages** | `modules.medicalpackage` | 1 | Service bundling |
| 14 | **Medical Codes** | `modules.medicalcode` | - | ICD/CPT coding |
| 15 | **Dashboard** | `modules.dashboard` | 1 | Analytics & KPIs |
| 16 | **Reports** | `modules.claim.controller` | 1 | Financial & operational reports |
| 17 | **RBAC** | `modules.rbac` | 3 | Role-based access control |
| 18 | **System Admin** | `modules.systemadmin` | 7 | System administration |
| 19 | **Authentication** | `modules.auth` | 1 | Login & security |
| 20 | **Reviewers** | `modules.reviewer` | 1 | Claims reviewers management |
| 21 | **PDF/Document** | `modules.pdf` | 2 | PDF generation & settings |
| 22 | **File Management** | `common.file` | 1 | File uploads/downloads |

---

## 🎯 PHASE 2: RISK CLASSIFICATION

### 🔴 HIGH RISK (API Contracts MANDATORY) - 7 Modules

#### 1. **Settlement Module** ✅ COMPLIANT
- **Risk Level**: 🔴 **CRITICAL**
- **Purpose**: Provider payment batch processing with financial transactions
- **Core Entities**: `SettlementBatch`, `SettlementBatchItem`, `ProviderAccount`, `ProviderAccountTransaction`
- **Main Endpoints**:
  - `POST /api/v1/settlement-batches` - Create batch
  - `POST /api/v1/settlement-batches/{id}/confirm` - Lock financials
  - `POST /api/v1/settlement-batches/{id}/pay` - Execute payment
  - `GET /api/v1/provider-accounts` - View balances
  
**Risk Factors**:
- ✅ Handles REAL MONEY transfers
- ✅ Irreversible payment operations
- ✅ Can cause legal disputes if amounts wrong
- ✅ Provider account balance reconciliation

**Current Status**: ✅ **COMPLIANT**
- Has dedicated `api/request` and `api/response` packages
- Versioned endpoints `/api/v1/settlement-batches`
- `PaySettlementBatchRequest` explicitly forbids amount fields
- Backend calculates all financial values
- 3-layer protection (contract + field stripping + runtime assertion)

**Evidence**: `backend/src/main/java/com/waad/tba/modules/settlement/api/`

---

#### 2. **Claims Module** ❌ NON-COMPLIANT
- **Risk Level**: 🔴 **CRITICAL**
- **Purpose**: Medical claim lifecycle (creation, review, approval, settlement)
- **Core Entities**: `Claim`, `ClaimLine`, `ClaimStatus`
- **Main Endpoints**:
  - `POST /api/claims` - Create claim
  - `POST /api/claims/{id}/approve` - Approve with amount
  - `POST /api/claims/{id}/reject` - Reject claim
  - `POST /api/claims/{id}/return-for-info` - Request info
  - `POST /api/claims/{id}/settle` - Mark as settled
  - `GET /api/claims/inbox/pending` - Reviewer inbox
  - `GET /api/claims/cost-breakdown/{id}` - Financial breakdown

**Risk Factors**:
- ✅ Handles monetary values (`requestedAmount`, `approvedAmount`, `deductions`)
- ✅ Irreversible approval decisions
- ✅ Affects provider payments
- ✅ Can cause legal/financial disputes

**Current State**: ❌ **NON-COMPLIANT**
```java
// Uses internal DTOs directly as API contracts
@PostMapping
public ResponseEntity<ApiResponse<ClaimViewDto>> createClaim(@Valid @RequestBody ClaimCreateDto dto)

// Approver can send amount (HIGH RISK)
@PostMapping("/{id:\\d+}/approve")
public ResponseEntity<ApiResponse<ClaimViewDto>> approveClaim(
    @PathVariable Long id,
    @Valid @RequestBody ClaimApproveDto dto) {
    // ClaimApproveDto contains: BigDecimal approvedAmount
    // ⚠️ Frontend can manipulate approval amount!
}
```

**Violations**:
- ❌ No dedicated `api/` package
- ❌ Uses internal DTOs (`ClaimCreateDto`, `ClaimApproveDto`, `ClaimViewDto`)
- ❌ No versioning (`/api/claims` instead of `/api/v1/claims`)
- ❌ `ClaimApproveDto` allows frontend-supplied `approvedAmount`
- ❌ Missing strict request contracts

**Risk if Unchanged**: 🔴 **SEVERE**
- Frontend could manipulate approval amounts
- Incorrect claim amounts affect settlement batches
- Provider overpayment/underpayment
- Financial reconciliation failures

---

#### 3. **Pre-Authorization Module** ❌ NON-COMPLIANT
- **Risk Level**: 🔴 **CRITICAL**
- **Purpose**: Pre-approval for expensive medical services
- **Core Entities**: `PreAuthorization`, `PreAuthStatus`
- **Main Endpoints**:
  - `POST /api/pre-authorizations` - Create pre-auth
  - `POST /api/pre-authorizations/{id}/approve` - Approve
  - `POST /api/pre-authorizations/{id}/reject` - Reject
  - `GET /api/pre-authorizations/inbox/pending` - Reviewer inbox

**Risk Factors**:
- ✅ Irreversible approval/rejection decisions
- ✅ Affects claim processing (PA required services)
- ✅ Can block patient care if wrong
- ✅ Influences financial outcomes

**Current State**: ❌ **NON-COMPLIANT**
```java
// Uses internal DTOs directly
@PostMapping("/{id:\\d+}/approve")
public ResponseEntity<ApiResponse<PreAuthorizationResponseDto>> approvePreAuthorization(
    @PathVariable Long id,
    @Valid @RequestBody PreAuthorizationApproveDto dto,
    Authentication authentication)
```

**Violations**:
- ❌ No dedicated `api/` package
- ❌ Uses internal DTOs
- ❌ No versioning (`/api/pre-authorizations`)
- ❌ Approval/rejection DTOs not strictly validated
- ❌ Missing separation between internal and public contracts

**Risk if Unchanged**: 🔴 **HIGH**
- Approval manipulation
- Incorrect authorization status
- Claims blocked/approved incorrectly
- Patient care delays

---

#### 4. **Provider Contracts Module** ⚠️ PARTIAL
- **Risk Level**: 🔴 **HIGH**
- **Purpose**: Contract pricing & service agreements
- **Core Entities**: `ProviderContract`, `ProviderContractPricingItem`
- **Main Endpoints**:
  - `POST /api/provider-contracts` - Create contract
  - `POST /api/provider-contracts/{id}/activate` - Activate
  - `POST /api/provider-contracts/{id}/pricing` - Add pricing
  - `PUT /api/provider-contracts/{id}/pricing/{itemId}` - Update price

**Risk Factors**:
- ✅ Pricing impacts claim calculations
- ✅ Contract activation is critical state change
- ✅ Wrong prices cause settlement errors
- ✅ Affects all claims for provider

**Current State**: ⚠️ **PARTIAL COMPLIANCE**
```java
// Endpoints exist but no strict API contracts
@PostMapping
public ResponseEntity<ApiResponse<ProviderContractResponseDto>> create(
    @Valid @RequestBody ProviderContractCreateDto dto)
    
// Pricing update allows amount input
@PutMapping("/{contractId}/pricing/{itemId}")
public ResponseEntity<ApiResponse<PricingItemDto>> updatePricingItem(
    @PathVariable Long contractId,
    @PathVariable Long itemId,
    @Valid @RequestBody PricingItemUpdateDto dto)
```

**Violations**:
- ⚠️ Uses DTOs but not in dedicated `api/` package
- ❌ No versioning
- ⚠️ Pricing DTOs allow price manipulation
- ❌ Missing strict request contracts

**Risk if Unchanged**: 🟠 **MEDIUM-HIGH**
- Wrong contract prices
- Claim calculation errors cascade
- Settlement amount discrepancies

---

#### 5. **Benefit Policies Module** ⚠️ PARTIAL
- **Risk Level**: 🔴 **HIGH**
- **Purpose**: Coverage limits, co-pay rules, deductibles
- **Core Entities**: `BenefitPolicy`, `BenefitPolicyRule`, `BenefitLimit`
- **Main Endpoints**:
  - `POST /api/benefit-policies` - Create policy
  - `POST /api/benefit-policies/{id}/activate` - Activate
  - `POST /api/benefit-policies/{id}/rules` - Add coverage rule

**Risk Factors**:
- ✅ Limits affect eligibility checks
- ✅ Wrong limits = incorrect claim approvals
- ✅ Co-pay/deductible calculations
- ✅ Affects member coverage

**Current State**: ⚠️ **PARTIAL COMPLIANCE**
- Has validation but no strict API contracts
- No versioning
- Coverage rule DTOs not strictly separated

**Risk if Unchanged**: 🟠 **MEDIUM-HIGH**
- Incorrect coverage calculations
- Members denied valid claims
- Overpayment on invalid claims

---

#### 6. **Eligibility Module** ❌ NON-COMPLIANT
- **Risk Level**: 🟠 **HIGH** (Influences Financial Decisions)
- **Purpose**: Verify member coverage eligibility
- **Core Entities**: `EligibilityCheck`, `EligibilityResult`
- **Main Endpoints**:
  - `POST /api/eligibility/check` - Check eligibility

**Risk Factors**:
- ✅ Affects claim acceptance (if ineligible, claim rejected)
- ✅ Can block patient care
- ✅ Wrong results = financial impact

**Current State**: ❌ **NON-COMPLIANT**
```java
@PostMapping("/check")
public ResponseEntity<ApiResponse<EligibilityCheckResponse>> checkEligibility(
    @Valid @RequestBody EligibilityCheckRequest request)
```

**Violations**:
- ❌ No dedicated `api/` package
- ❌ No versioning
- ❌ Request/Response DTOs not separated

**Risk if Unchanged**: 🟠 **MEDIUM**
- Eligibility manipulation
- Incorrect coverage decisions

---

#### 7. **Reports Module** ⚠️ PARTIAL
- **Risk Level**: 🟠 **MEDIUM** (Data Integrity)
- **Purpose**: Financial & operational reports
- **Core Endpoints**:
  - `GET /api/reports/financial` - Financial summary
  - `GET /api/reports/claims` - Claims report
  - `GET /api/reports/settlement` - Settlement report

**Risk Factors**:
- ⚠️ Financial reports must match actual data
- ⚠️ Reconciliation reports
- ⚠️ Audit trail

**Current State**: ⚠️ **PARTIAL**
- Read-only but no strict contracts
- No versioning

**Risk if Unchanged**: 🟡 **LOW-MEDIUM**
- Reporting inconsistencies
- Audit failures

---

### 🟠 MEDIUM RISK (API Contracts STRONGLY RECOMMENDED) - 6 Modules

#### 8. **Visits Module** 🟡 LOW-MEDIUM RISK
- **Purpose**: Patient visit logging
- **Risk**: Affects claim/pre-auth creation (visit required)
- **Recommendation**: Light contracts (visit cannot have claims without approval)

#### 9. **Members Module** 🟡 LOW RISK
- **Purpose**: Member management
- **Risk**: Data integrity but no direct financial impact
- **Recommendation**: Standard DTOs sufficient

#### 10. **Employers Module** 🟡 LOW RISK
- **Purpose**: Employer management
- **Risk**: Data integrity, affects benefit policy assignment
- **Recommendation**: Standard DTOs sufficient

#### 11. **Providers Module** 🟡 LOW-MEDIUM RISK
- **Purpose**: Provider management & portal
- **Risk**: Provider authentication, document uploads
- **Recommendation**: Light contracts for portal access

#### 12. **Company Settings Module** 🟡 LOW RISK
- **Purpose**: Company configuration
- **Risk**: Settings affect behavior but not financial
- **Recommendation**: Standard validation

#### 13. **Reviewers Module** 🟡 LOW RISK
- **Purpose**: Manage reviewers
- **Risk**: Access control but no direct financial impact
- **Recommendation**: Standard DTOs

---

### 🟡 LOW RISK (API Contracts OPTIONAL) - 5 Modules

#### 14-16. **Medical Taxonomy, Packages, Codes** 🟢 LOW RISK
- **Purpose**: Master data / reference data
- **Risk**: Data integrity only
- **Recommendation**: Standard CRUD validation

#### 17. **Dashboard Module** 🟢 LOW RISK
- **Purpose**: Read-only analytics
- **Risk**: Display only
- **Recommendation**: No contracts needed

#### 18. **PDF/Document Module** 🟢 LOW RISK
- **Purpose**: Document generation
- **Risk**: None
- **Recommendation**: No contracts needed

---

### 🟢 NO RISK (API Contracts NOT NEEDED) - 4 Modules

#### 19. **RBAC Module** 🟢 NO RISK
- **Purpose**: Role & permission management
- **Risk**: Security (but not financial)
- **Recommendation**: Standard validation sufficient

#### 20. **System Admin Module** 🟢 NO RISK
- **Purpose**: System administration
- **Risk**: None
- **Recommendation**: Admin-only endpoints

#### 21. **Authentication Module** 🟢 NO RISK
- **Purpose**: Login & JWT
- **Risk**: Security (separate concern)
- **Recommendation**: Standard validation

#### 22. **File Management Module** 🟢 NO RISK
- **Purpose**: File uploads/downloads
- **Risk**: None (storage only)
- **Recommendation**: Standard multipart handling

---

## 📈 PHASE 3: GAP ANALYSIS

### Compliance Matrix

| Module | Risk Level | Versioning | API Package | Contracts Exist | Amount Safety | Status |
|--------|-----------|------------|-------------|-----------------|---------------|--------|
| **Settlement** | 🔴 Critical | ✅ `/api/v1/` | ✅ `api/request`, `api/response` | ✅ 11 contracts | ✅ Forbidden | ✅ **COMPLIANT** |
| **Claims** | 🔴 Critical | ❌ `/api/claims` | ❌ None | ❌ Uses internal DTOs | ❌ Allows `approvedAmount` | ❌ **NON-COMPLIANT** |
| **Pre-Auth** | 🔴 Critical | ❌ `/api/pre-authorizations` | ❌ None | ❌ Uses internal DTOs | ⚠️ No explicit protection | ❌ **NON-COMPLIANT** |
| **Provider Contracts** | 🔴 High | ❌ `/api/provider-contracts` | ❌ None | ⚠️ DTOs exist | ⚠️ Allows price input | ⚠️ **PARTIAL** |
| **Benefit Policies** | 🔴 High | ❌ `/api/benefit-policies` | ❌ None | ⚠️ DTOs exist | ⚠️ Allows limit input | ⚠️ **PARTIAL** |
| **Eligibility** | 🟠 High | ❌ `/api/eligibility` | ❌ None | ❌ Uses internal DTOs | N/A | ❌ **NON-COMPLIANT** |
| **Reports** | 🟠 Medium | ❌ `/api/reports` | ❌ None | ❌ Uses internal DTOs | N/A (read-only) | ⚠️ **PARTIAL** |
| **Visits** | 🟡 Low-Med | ❌ `/api/visits` | ❌ None | ⚠️ DTOs exist | N/A | 🟡 **ACCEPTABLE** |
| **Members** | 🟡 Low | ❌ `/api/members` | ❌ None | ⚠️ DTOs exist | N/A | 🟡 **ACCEPTABLE** |
| **Others** | 🟢 Low/None | Various | ❌ None | ⚠️ Varies | N/A | 🟡 **ACCEPTABLE** |

### Critical Gap Summary

**❌ Non-Compliant High-Risk Modules**: **3**
1. Claims
2. Pre-Authorization
3. Eligibility

**⚠️ Partial Compliance High-Risk Modules**: **2**
1. Provider Contracts
2. Benefit Policies

**✅ Compliant High-Risk Modules**: **1**
1. Settlement ✅

**Compliance Rate (High-Risk Modules)**: **17%** (1/6)

---

## 🚀 PHASE 4: EXECUTION PLAN

### Priority Matrix

| Priority | Module | Risk | Effort | Risk if Delayed | Timeline |
|----------|--------|------|--------|-----------------|----------|
| **P0 (URGENT)** | **Claims** | 🔴 Critical | High | 🔴 **SEVERE** - Financial errors cascade to settlement | **Week 1-2** |
| **P0 (URGENT)** | **Pre-Authorization** | 🔴 Critical | Medium | 🔴 **HIGH** - Blocks claims, affects patient care | **Week 1-2** |
| **P1 (HIGH)** | **Provider Contracts** | 🔴 High | Medium | 🟠 **MEDIUM** - Wrong prices affect all claims | **Week 3** |
| **P1 (HIGH)** | **Benefit Policies** | 🔴 High | Medium | 🟠 **MEDIUM** - Wrong limits affect eligibility | **Week 3** |
| **P2 (MEDIUM)** | **Eligibility** | 🟠 High | Low | 🟡 **LOW** - Read-mostly, affects decisions | **Week 4** |
| **P3 (LOW)** | **Reports** | 🟠 Medium | Low | 🟡 **LOW** - Read-only reporting | **Week 5** |

---

### P0 URGENT: Claims Module API Contracts

**Timeline**: Week 1-2  
**Effort**: High (15-20 hours)  
**Risk Reduction**: 🔴 **SEVERE** → 🟢 **LOW**

#### Required Contracts (8 total)

**Request Contracts**:
1. `CreateClaimRequest` - NO amounts (backend calculates from contract pricing)
2. `UpdateClaimRequest` - NO amount changes
3. `ApproveClaimRequest` - ❌ **NO `approvedAmount`** (backend calculates)
4. `RejectClaimRequest` - Only rejection reason
5. `ReturnForInfoClaimRequest` - Only notes
6. `SettleClaimRequest` - NO amounts (backend matches settlement batch)

**Response Contracts**:
1. `ClaimResponse` - Read-only financial fields
2. `ClaimListResponse` - Paginated claims

#### Implementation Steps

1. **Create API Package Structure**:
```
backend/src/main/java/com/waad/tba/modules/claim/
├── api/
│   ├── request/
│   │   ├── CreateClaimRequest.java
│   │   ├── UpdateClaimRequest.java
│   │   ├── ApproveClaimRequest.java ⚠️ CRITICAL
│   │   ├── RejectClaimRequest.java
│   │   ├── ReturnForInfoClaimRequest.java
│   │   └── SettleClaimRequest.java
│   └── response/
│       ├── ClaimResponse.java
│       └── ClaimListResponse.java
├── controller/
│   └── ClaimController.java (update to /api/v1/claims)
├── dto/ (keep for internal use)
└── service/
```

2. **Critical Contract: ApproveClaimRequest**
```java
package com.waad.tba.modules.claim.api.request;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Approve Claim Request - API v1
 * 
 * ⚠️⚠️⚠️ FINANCIAL SAFETY CONTRACT ⚠️⚠️⚠️
 * 
 * This contract EXPLICITLY FORBIDS amount fields.
 * The approvedAmount is CALCULATED by backend from:
 * 1. Contract pricing (provider contract)
 * 2. Benefit policy rules (coverage %, limits)
 * 3. Cost breakdown engine
 * 
 * Frontend CANNOT influence approval amount.
 */
@Data
public class ApproveClaimRequest {
    
    /**
     * Optional approval note
     */
    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
    
    /**
     * Whether to use auto-calculated amount or manual review
     * If true, backend uses cost breakdown engine
     * If false, backend uses reviewer's judgment (still backend-calculated)
     */
    @Builder.Default
    private Boolean useSystemCalculation = true;
    
    // ❌ NO approvedAmount field - FORBIDDEN
    // ❌ NO deductions field - FORBIDDEN
    // ❌ NO totalAmount field - FORBIDDEN
    // ❌ NO coveredAmount field - FORBIDDEN
    
    /**
     * Backend calculates approvedAmount from:
     * - claim.requestedAmount
     * - providerContract.pricingItem.price
     * - benefitPolicy.coveragePercent
     * - benefitPolicy.limits
     * - member.usedLimits
     * - costBreakdownEngine.calculate()
     */
}
```

3. **Update Controller**:
```java
@RestController
@RequestMapping("/api/v1/claims") // ✅ Versioned
@RequiredArgsConstructor
public class ClaimController {
    
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('APPROVE_CLAIM')")
    public ResponseEntity<ApiResponse<ClaimResponse>> approveClaim(
            @PathVariable Long id,
            @Valid @RequestBody ApproveClaimRequest apiRequest) { // ✅ API v1 contract
        
        // Convert to internal DTO if needed
        ClaimApproveDto internalDto = new ClaimApproveDto();
        internalDto.setNotes(apiRequest.getNotes());
        internalDto.setUseSystemCalculation(apiRequest.getUseSystemCalculation());
        // ✅ NO amount passed - backend calculates
        
        Claim claim = claimService.approveClaim(id, internalDto);
        ClaimResponse response = ClaimMapper.toResponse(claim);
        
        return ResponseEntity.ok(ApiResponse.success("Claim approved", response));
    }
}
```

4. **Frontend Migration**:
   - Update `frontend/src/types/api/claims/index.ts`
   - Update `frontend/src/services/api/claims.service.js`
   - Remove approval amount input from UI
   - Show calculated amount from backend response

**Success Criteria**:
- ✅ All claim endpoints use `/api/v1/claims`
- ✅ `ApproveClaimRequest` has NO amount fields
- ✅ Backend calculates `approvedAmount` from cost breakdown
- ✅ Frontend cannot send monetary values
- ✅ All tests passing

---

### P0 URGENT: Pre-Authorization Module API Contracts

**Timeline**: Week 1-2  
**Effort**: Medium (10-15 hours)  
**Risk Reduction**: 🔴 **HIGH** → 🟢 **LOW**

#### Required Contracts (6 total)

**Request Contracts**:
1. `CreatePreAuthRequest` - NO amounts (backend resolves from contract)
2. `UpdatePreAuthRequest` - NO amount changes
3. `ApprovePreAuthRequest` - Only approval notes (NO amounts)
4. `RejectPreAuthRequest` - Only rejection reason

**Response Contracts**:
1. `PreAuthResponse` - Read-only fields
2. `PreAuthListResponse` - Paginated

**Implementation**: Similar pattern to Claims

---

### P1 HIGH: Provider Contracts Module API Contracts

**Timeline**: Week 3  
**Effort**: Medium (8-12 hours)  
**Risk Reduction**: 🟠 **MEDIUM** → 🟢 **LOW**

#### Required Contracts (5 total)

**Request Contracts**:
1. `CreateProviderContractRequest`
2. `UpdateProviderContractRequest`
3. `ActivateContractRequest` - State change only
4. `AddPricingItemRequest` - Validate price format/range
5. `UpdatePricingItemRequest` - Validate price changes

**Critical**: Pricing DTOs must validate price ranges (min/max) to prevent extreme values

---

### P1 HIGH: Benefit Policies Module API Contracts

**Timeline**: Week 3  
**Effort**: Medium (8-12 hours)  
**Risk Reduction**: 🟠 **MEDIUM** → 🟢 **LOW**

#### Required Contracts (5 total)

**Request Contracts**:
1. `CreateBenefitPolicyRequest`
2. `UpdateBenefitPolicyRequest`
3. `AddCoverageRuleRequest` - Validate percentages (0-100)
4. `AddBenefitLimitRequest` - Validate limit amounts
5. `ActivatePolicyRequest` - State change only

---

### P2 MEDIUM: Eligibility Module API Contracts

**Timeline**: Week 4  
**Effort**: Low (5-8 hours)

#### Required Contracts (2 total)

1. `EligibilityCheckRequest`
2. `EligibilityCheckResponse`

**Pattern**: Simple read-heavy module

---

### P3 LOW: Reports Module

**Timeline**: Week 5  
**Effort**: Low (3-5 hours)

**Response Contracts Only** (read-only reporting)

---

## 📋 SUMMARY & RECOMMENDATIONS

### Executive Summary

**System Status**:
- **Total Modules**: 22
- **High-Risk Modules**: 7
- **Compliant High-Risk**: 1 (Settlement) ✅
- **Non-Compliant High-Risk**: 6 ❌⚠️

**Compliance Gap**: **83%** of high-risk modules lack proper API contracts

**Financial Risk Exposure**: 🔴 **SEVERE**
- Claims module allows frontend-supplied approval amounts
- Pre-authorization decisions not contract-protected
- Provider contract pricing can be manipulated
- Settlement module is secure but depends on claim data integrity

---

### Critical Recommendations

#### 1. **IMMEDIATE ACTION REQUIRED** (Week 1-2)

**Modules**: Claims, Pre-Authorization

**Justification**:
- Claims directly handle monetary approvals
- Pre-auth affects claim validity
- Both influence settlement (already secured)
- **Current risk**: Frontend can manipulate financial decisions

**Expected Outcome**:
- Zero frontend monetary influence
- Backend-authoritative calculations
- Contract-first API design
- Cascading financial safety (claims → settlement)

---

#### 2. **HIGH PRIORITY** (Week 3)

**Modules**: Provider Contracts, Benefit Policies

**Justification**:
- Contract pricing affects ALL claims
- Benefit policies affect eligibility & coverage
- Wrong prices/limits = systematic errors

**Expected Outcome**:
- Validated pricing ranges
- Protected coverage limits
- Pricing integrity guarantees

---

#### 3. **MEDIUM PRIORITY** (Week 4-5)

**Modules**: Eligibility, Reports

**Justification**:
- Lower financial impact
- Mainly read operations
- Can be addressed after critical modules

---

### Architecture Principles

#### For ALL High-Risk Modules:

1. **Dedicated API Package**:
```
modules/{module}/
├── api/
│   ├── request/     (What frontend sends)
│   └── response/    (What backend returns)
├── dto/             (Internal use only)
└── controller/      (Uses api.request, returns api.response)
```

2. **Versioned Endpoints**:
   - `/api/v1/{resource}` (NOT `/api/{resource}`)
   - Allows breaking changes in `/api/v2/` later

3. **Financial Safety**:
   - Request contracts NEVER contain amount fields (for approval/payment endpoints)
   - Backend calculates from database/contracts
   - Frontend displays backend-calculated amounts (read-only)

4. **Validation**:
   - Jakarta Bean Validation on all request contracts
   - Range validation (prices, percentages, limits)
   - Pattern validation (reference numbers, codes)

5. **Documentation**:
   - JSDoc/JavaDoc referencing backend contracts
   - OpenAPI/Swagger annotations
   - Frontend TypeScript contracts mirror backend

---

### Implementation Checklist (Per Module)

- [ ] Create `api/request/` package
- [ ] Create `api/response/` package
- [ ] Define request contracts (Jakarta validation)
- [ ] Define response contracts (read-only fields)
- [ ] Update controller to `/api/v1/...`
- [ ] Update controller methods to use API contracts
- [ ] Keep internal DTOs for service layer
- [ ] Create TypeScript contracts in frontend
- [ ] Update frontend API service
- [ ] Document contracts (backend & frontend)
- [ ] Add integration tests
- [ ] Verify no amount fields in critical requests

---

### Estimated Total Effort

| Phase | Modules | Effort | Timeline |
|-------|---------|--------|----------|
| **P0 Urgent** | Claims, Pre-Auth | 25-35 hours | Week 1-2 |
| **P1 High** | Contracts, Policies | 16-24 hours | Week 3 |
| **P2 Medium** | Eligibility | 5-8 hours | Week 4 |
| **P3 Low** | Reports | 3-5 hours | Week 5 |
| **TOTAL** | **6 modules** | **49-72 hours** | **5 weeks** |

---

### Risk Mitigation Timeline

| Week | Action | Risk Reduction |
|------|--------|----------------|
| **Baseline** | Current State | 🔴 **SEVERE** Financial manipulation possible |
| **Week 2** | Claims + Pre-Auth contracts complete | 🟠 **MEDIUM** Core financial flows secured |
| **Week 3** | Contracts + Policies secured | 🟡 **LOW** Pricing & limits protected |
| **Week 5** | All high-risk modules compliant | 🟢 **MINIMAL** Full contract coverage |

---

## 🎯 FINAL RECOMMENDATION

**Start immediately with P0 modules (Claims & Pre-Authorization).**

These two modules represent the **highest financial risk** and are **prerequisites for full system integrity**. The settlement module is already secured, but it depends on claim data being trustworthy.

**Priority Order**:
1. **Claims Module** (Week 1-2) - Most critical
2. **Pre-Authorization Module** (Week 1-2) - Blocks claims
3. **Provider Contracts Module** (Week 3) - Pricing foundation
4. **Benefit Policies Module** (Week 3) - Coverage rules
5. **Eligibility Module** (Week 4) - Decision support
6. **Reports Module** (Week 5) - Data integrity

**Success Metric**: **100% compliance for all High-Risk modules within 5 weeks**

---

**Document Version**: 1.0  
**Last Updated**: February 1, 2026  
**Next Review**: After P0 modules completion (Week 3)

