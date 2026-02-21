# 🔍 Provider Account Settlement System - Diagnostic Audit Report

**Date:** 2026-01-31  
**Status:** 📊 READ-ONLY ANALYSIS  
**Prepared by:** Senior Healthcare Financial Systems Architect  

---

## 📋 Executive Summary

This diagnostic audit analyzes the current claim settlement and payment system in preparation for a future **Provider Account Settlement** refactor. The analysis covers backend entities, financial calculations, frontend components, and identifies risks and opportunities.

### Key Findings

| Category | Status | Risk Level |
|----------|--------|------------|
| Settlement Model | Per-Claim | 🟡 Medium |
| Financial Truth | Claim Entity | ✅ Good |
| Audit Trail | ClaimAuditLog | ✅ Good |
| Race Condition Protection | Pessimistic Locking | ✅ Good |
| Provider Account | ❌ Not Implemented | 🔴 Gap |
| Batch Settlement | ❌ Not Implemented | 🔴 Gap |
| Balance Tracking | ❌ Not Implemented | 🔴 Gap |

---

## 1️⃣ CURRENT FINANCIAL FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CURRENT CLAIM SETTLEMENT FLOW                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   ┌──────────┐        ┌───────────┐        ┌─────────────────────────────────────┐ │
│   │  VISIT   │───────▶│   CLAIM   │───────▶│           CLAIM_LINES[]            │ │
│   │(Provider)│        │(Member)   │        │  (MedicalService + ContractPrice)  │ │
│   └──────────┘        └─────┬─────┘        └─────────────────────────────────────┘ │
│                             │                                                       │
│                             ▼                                                       │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                    STATUS WORKFLOW (ClaimStateMachine)                      │   │
│   │                                                                             │   │
│   │    DRAFT ──▶ SUBMITTED ──▶ UNDER_REVIEW ──▶ APPROVED ──▶ SETTLED           │   │
│   │                              │                 │                            │   │
│   │                              │                 └────▶ REJECTED              │   │
│   │                              ▼                                              │   │
│   │                     RETURNED_FOR_INFO ◀────────────────────────             │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│                             ▼                                                       │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                  FINANCIAL SNAPSHOT (on APPROVAL)                           │   │
│   │                                                                             │   │
│   │    ┌─────────────────────────────────────────────────────────────────────┐  │   │
│   │    │ claim.approved_amount     = System calculated OR manual override   │  │   │
│   │    │ claim.patient_copay       = deductible + (copay% × approved)       │  │   │
│   │    │ claim.net_provider_amount = approved - patient_copay               │  │   │
│   │    │ claim.copay_percent       = Weighted from BenefitPolicyRules       │  │   │
│   │    │ claim.deductible_applied  = From annual deductible calculation     │  │   │
│   │    └─────────────────────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│                             ▼                                                       │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                  SETTLEMENT (APPROVED → SETTLED)                            │   │
│   │                                                                             │   │
│   │    ┌─────────────────────────────────────────────────────────────────────┐  │   │
│   │    │ claim.payment_reference   = Manual entry (bank transfer ref)       │  │   │
│   │    │ claim.settled_at          = Settlement timestamp                   │  │   │
│   │    │ claim.settlement_notes    = Optional notes                         │  │   │
│   │    │ claim.status              = SETTLED (terminal)                     │  │   │
│   │    └─────────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                             │   │
│   │    ⚠️ CURRENT MODEL: PER-CLAIM SETTLEMENT (NO BATCH/ACCOUNT)               │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│                             ▼                                                       │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                  AUDIT TRAIL (ClaimAuditLog - IMMUTABLE)                    │   │
│   │                                                                             │   │
│   │    • claimId, changeType, statusBefore, statusAfter                        │   │
│   │    • approvedAmountBefore, approvedAmountAfter                             │   │
│   │    • changedBy, changedByUsername, changedByRole                           │   │
│   │    • createdAt, comment, jsonBefore, jsonAfter                             │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ HOW CLAIMS ARE MARKED AS "SETTLED"

### Current Model: Per-Claim Settlement

| Aspect | Current Implementation |
|--------|------------------------|
| **Settlement Unit** | Individual Claim |
| **Grouping** | ❌ None - Each claim settled independently |
| **Entity Ownership** | `Claim` entity owns all settlement data |
| **Settlement Fields** | `payment_reference`, `settled_at`, `settlement_notes` (all on Claim) |
| **Status Transition** | `APPROVED` → `SETTLED` (terminal state) |
| **Batch ID** | ❌ Not implemented |
| **Provider Account** | ❌ Not implemented |

### Settlement Flow (ClaimService.settleClaim)

```java
// File: ClaimService.java
@Transactional
public ClaimViewDto settleClaim(Long id, ClaimSettleDto dto) {
    // STEP 1: PESSIMISTIC LOCK (SELECT ... FOR UPDATE)
    Claim claim = claimRepository.findByIdForUpdate(id);
    
    // STEP 2: Validate status = APPROVED
    // STEP 3: Validate payment reference provided
    // STEP 4: Validate settlement amount ≤ netProviderAmount
    
    // STEP 5: Set settlement details
    claim.setPaymentReference(dto.getPaymentReference());
    claim.setSettledAt(LocalDateTime.now());
    claim.setSettlementNotes(dto.getNotes());
    
    // STEP 6: Transition to SETTLED (terminal)
    claimStateMachine.transition(claim, ClaimStatus.SETTLED, currentUser);
}
```

### Critical Observation

> **No Provider Account exists.** Settlement is a simple status change on the Claim entity with manual payment reference entry. There is no running balance, no batch grouping, and no automatic payment tracking.

---

## 3️⃣ WHERE IS FINANCIAL TRUTH STORED?

### Source of Truth: Claim Entity

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         FINANCIAL TRUTH HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  📊 CANONICAL SOURCE: `claims` table                                                │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  FIELD                      │ CALCULATION                                   │    │
│  │────────────────────────────────────────────────────────────────────────────│    │
│  │  requested_amount           │ SUM(claim_lines.total_price)                 │    │
│  │  approved_amount            │ Set on approval (system calc OR override)    │    │
│  │  patient_copay              │ deductible_applied + copay_amount            │    │
│  │  net_provider_amount        │ approved_amount - patient_copay              │    │
│  │  difference_amount          │ requested_amount - approved_amount           │    │
│  │  copay_percent              │ Weighted avg from BenefitPolicyRules         │    │
│  │  deductible_applied         │ From annual deductible calculation           │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
│  ✅ GOOD: Amounts are IMMUTABLE once approved (snapshot at approval time)           │
│  ✅ GOOD: All aggregations via ClaimFinancialSummaryService (database SUM())        │
│  ✅ GOOD: Frontend FORBIDDEN from calculating totals (enforced by architecture)     │
│                                                                                     │
│  ⚠️ GAP: No separate Settlement entity - all data on Claim                          │
│  ⚠️ GAP: No historical settlement record - only latest state                        │
│  ⚠️ GAP: No running balance per provider                                            │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Financial Aggregation Methods (ClaimRepository)

| Query | Purpose | Used By |
|-------|---------|---------|
| `sumApprovedAmounts()` | Total approved | Dashboard, Reports |
| `sumTotalPatientCoPay()` | Total patient share | FinancialSummary |
| `sumTotalNetProviderAmounts()` | Provider liability | SettlementInbox |
| `sumTotalSettledAmounts()` | Amount paid | OutstandingCalc |
| `getSettlementTotals(providerId, ...)` | Per-provider totals | ProviderSettlementReport |

### Recalculation Assessment

| Scenario | Does Recalculation Happen? |
|----------|---------------------------|
| Viewing claim details | ❌ No - reads snapshot |
| Report generation | ❌ No - uses DB SUM() |
| Settlement | ❌ No - uses approved snapshot |
| Dashboard KPIs | ❌ No - uses DB aggregates |

✅ **Financial Immutability Maintained** - Amounts are not recalculated after approval.

---

## 4️⃣ CURRENT RISKS & ISSUES

### 4.1 Double Settlement Risk

| Risk | Mitigation | Status |
|------|-----------|--------|
| Concurrent settlement of same claim | `PESSIMISTIC_WRITE` lock | ✅ Protected |
| Settlement amount > net_provider | Validation in `settleClaim()` | ✅ Protected |
| Settlement of non-APPROVED claim | Status validation | ✅ Protected |

**Current Protection Code:**
```java
// ClaimRepository.java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT c FROM Claim c WHERE c.id = :id")
Optional<Claim> findByIdForUpdate(@Param("id") Long id);
```

### 4.2 Missing Claims Risk

| Scenario | Current Handling | Risk Level |
|----------|-----------------|------------|
| Claim approved but never settled | Remains in APPROVED forever | 🟡 Medium |
| Settlement without valid payment ref | Empty string check only | 🟡 Medium |
| Provider not paid for settled claim | No tracking mechanism | 🔴 High |

### 4.3 Inconsistent Totals Risk

| Scenario | Current Protection | Risk Level |
|----------|-------------------|------------|
| Frontend calculates totals | Architectural rule (not enforced) | 🟡 Medium |
| Report vs claim mismatch | `validateFinancialConsistency()` | ✅ Protected |
| Partial settlement | Not supported (full only) | ✅ N/A |

### 4.4 Audit Failure Risks

| Risk | Mitigation | Completeness |
|------|-----------|--------------|
| Status change untracked | ClaimAuditLog | ✅ Complete |
| Amount change untracked | ClaimAuditLog (jsonBefore/After) | ✅ Complete |
| Settlement untracked | `recordSettlement()` | ✅ Complete |
| User attribution | `changedBy`, `changedByUsername`, `changedByRole` | ✅ Complete |

### 4.5 Critical Design Flaws

| # | Flaw | Impact | Severity |
|---|------|--------|----------|
| 1 | **No Provider Account** | Cannot track running balance or batch payments | 🔴 Critical |
| 2 | **Per-Claim Settlement Only** | Operational overhead, reconciliation difficulty | 🔴 Critical |
| 3 | **No Payment Entity** | Payment reference is just a string, no validation | 🟡 High |
| 4 | **No Batch Settlement** | Cannot group claims for single payment | 🟡 High |
| 5 | **No Invoice Generation** | Invoice number generated client-side | 🟡 Medium |
| 6 | **Settlement is Status, Not Entity** | Cannot track partial settlements or reversals | 🟡 Medium |
| 7 | **No Outstanding by Provider View** | Must calculate from claim-level data | 🟡 Medium |

---

## 5️⃣ REUSABLE COMPONENTS

### ✅ Backend Components (Can Be Reused)

| Component | File | Reusability | Notes |
|-----------|------|-------------|-------|
| `ClaimRepository` | claim/repository/ | ✅ High | Aggregation queries reusable |
| `ClaimFinancialSummaryService` | claim/service/ | ✅ High | Report generation pattern |
| `ProviderSettlementReportService` | claim/service/ | ✅ High | Line-level detail pattern |
| `ProviderSettlementExcelExporter` | claim/service/ | ✅ High | Export logic |
| `ClaimAuditLog` entity | claim/entity/ | ✅ High | Audit pattern |
| `AtomicFinancialService` | claim/service/ | ✅ High | Locking patterns |
| `ClaimStateMachine` | claim/service/ | 🟡 Partial | Needs extension for new states |

### ✅ Frontend Components (Can Be Reused)

| Component | File | Reusability | Notes |
|-----------|------|-------------|-------|
| `SettlementInbox` | claims/ | 🟡 Partial | UI pattern, needs batch capability |
| `ProviderSettlementReport` | reports/ | ✅ High | Report display pattern |
| `FinancialReports` | reports/ | ✅ High | KPI cards, tabs pattern |
| `claimsService.js` | services/api/ | ✅ High | API contract methods |
| `reportsService.js` | services/api/ | ✅ High | Report API methods |

### ✅ Database Queries (Can Be Reused)

| Query | Purpose | Reuse Path |
|-------|---------|------------|
| `getSettlementTotals()` | Provider totals | Extend to Provider Account |
| `findForSettlementReport()` | Claim details | Extend to Batch selection |
| `getFinancialSummaryByProvider()` | Provider breakdown | Account balance source |

### ✅ DTOs (Can Be Reused)

| DTO | Purpose | Reusability |
|-----|---------|-------------|
| `ClaimFinancialSummaryDto` | Financial overview | ✅ Extend with account fields |
| `ProviderSettlementReportDto` | Provider report | ✅ As-is |
| `ClaimViewDto` | Claim display | ✅ Add batch_id reference |

---

## 6️⃣ COMPONENTS TO DEPRECATE (Future)

### Backend Deprecation Candidates

| Component | Reason | Deprecation Path |
|-----------|--------|------------------|
| `settleClaim()` per-claim method | Replace with batch | Mark `@Deprecated`, add `settleBatch()` |
| `payment_reference` on Claim | Move to Payment entity | Migrate to new table, keep readonly |
| `settled_at` on Claim | Move to SettlementBatch | Migrate, keep for history |

### Frontend Deprecation Candidates

| Component | Reason | Deprecation Path |
|-----------|--------|------------------|
| Individual settle button | Confusing UX | Replace with batch selection |
| Invoice number generation | Should be backend | Remove client-side generation |
| Tab 2 client filtering | Backend should filter | Already flagged as antipattern |

---

## 7️⃣ MIGRATION FEASIBILITY ANALYSIS

### Can We Introduce Provider Account Without Breaking Data?

| Aspect | Assessment | Feasibility |
|--------|------------|-------------|
| Schema additions | Additive only (new tables) | ✅ Safe |
| Existing claims | No modification needed | ✅ Safe |
| Historical settlements | payment_reference preserved | ✅ Safe |
| Reports | Continue working | ✅ Safe |
| API contracts | Add new endpoints, keep old | ✅ Safe |
| Frontend | Add batch UI, keep per-claim | ✅ Safe |

### Minimal Schema Additions Required

```sql
-- NEW TABLE 1: Provider Account (Running Balance)
CREATE TABLE provider_accounts (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id),
    running_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_approved NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    last_settlement_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id)
);

-- NEW TABLE 2: Settlement Batch (Groups claims for payment)
CREATE TABLE settlement_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    provider_account_id BIGINT NOT NULL REFERENCES provider_accounts(id),
    settlement_date DATE NOT NULL,
    total_claims_count INT NOT NULL,
    total_gross_amount NUMERIC(15,2) NOT NULL,
    total_net_amount NUMERIC(15,2) NOT NULL,
    payment_reference VARCHAR(100),
    payment_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- NEW TABLE 3: Settlement Batch Items (Links claims to batches)
CREATE TABLE settlement_batch_items (
    id BIGSERIAL PRIMARY KEY,
    settlement_batch_id BIGINT NOT NULL REFERENCES settlement_batches(id),
    claim_id BIGINT NOT NULL REFERENCES claims(id),
    net_provider_amount NUMERIC(15,2) NOT NULL,  -- Snapshot at settlement
    UNIQUE(claim_id)  -- Claim can only be in ONE batch
);

-- ADD COLUMN to claims (optional - for quick batch lookup)
ALTER TABLE claims ADD COLUMN settlement_batch_id BIGINT REFERENCES settlement_batches(id);

-- INDEXES
CREATE INDEX idx_provider_accounts_provider ON provider_accounts(provider_id);
CREATE INDEX idx_settlement_batches_provider ON settlement_batches(provider_account_id);
CREATE INDEX idx_settlement_batches_date ON settlement_batches(settlement_date);
CREATE INDEX idx_settlement_batch_items_batch ON settlement_batch_items(settlement_batch_id);
CREATE INDEX idx_settlement_batch_items_claim ON settlement_batch_items(claim_id);
```

### Data Migration Strategy (Zero Downtime)

```
PHASE 1: Add new tables (non-breaking)
    └─ provider_accounts (empty)
    └─ settlement_batches (empty)
    └─ settlement_batch_items (empty)

PHASE 2: Create provider accounts from existing providers
    └─ INSERT INTO provider_accounts (provider_id, running_balance, ...)
       SELECT p.id, COALESCE(SUM(c.net_provider_amount), 0) - settled_sum
       FROM providers p
       JOIN claims c ON c.provider_id = p.id AND c.status = 'APPROVED'
       GROUP BY p.id;

PHASE 3: Create historical batches from existing settlements
    └─ For each settled claim, create a single-claim batch (optional)
    └─ OR mark existing settlements as "legacy" and start fresh

PHASE 4: Add settlement_batch_id column to claims (nullable)

PHASE 5: Deploy new batch settlement API (additive)

PHASE 6: Deploy new frontend with batch capability

PHASE 7: Deprecate per-claim settlement (after validation period)
```

---

## 8️⃣ READINESS SCORE

### Overall Readiness: 7/10 ✅ GOOD

| Dimension | Score | Notes |
|-----------|-------|-------|
| Data Model Foundation | 8/10 | Claim entity well-structured |
| Financial Integrity | 9/10 | Strong locking, immutability |
| Audit Completeness | 9/10 | Full audit trail exists |
| Report Infrastructure | 8/10 | Aggregation patterns established |
| Frontend Architecture | 6/10 | Needs batch UI additions |
| Schema Extensibility | 7/10 | Additive changes feasible |
| API Contract Clarity | 7/10 | Good documentation exists |
| Migration Risk | 6/10 | Low risk with phased approach |

### Blockers for Provider Account Implementation

| Blocker | Severity | Mitigation |
|---------|----------|------------|
| No batch grouping logic | Medium | Build from scratch |
| No payment entity | Medium | Create new entity |
| Per-claim UX | Low | Add parallel batch UX |
| No running balance | Medium | Calculate from claims initially |

### Enablers for Provider Account Implementation

| Enabler | Benefit |
|---------|---------|
| Strong audit foundation | Easy to add batch audit |
| Existing provider ID on claims | Easy to group by provider |
| Database aggregation pattern | Extend to batch totals |
| Pessimistic locking pattern | Apply to batch settlement |
| Excel export capability | Extend to batch reports |

---

## 9️⃣ RECOMMENDED TRANSITION PATH (NO CODE)

### Phase 1: Foundation (Weeks 1-2)
1. Create `provider_accounts` table
2. Create `settlement_batches` table
3. Create `settlement_batch_items` table
4. Populate provider accounts from existing approved claims
5. Add indexes for batch queries

### Phase 2: Backend Services (Weeks 3-4)
1. Create `ProviderAccountService` (balance tracking)
2. Create `SettlementBatchService` (batch creation, payment)
3. Create `BatchSettlementReportService` (batch reports)
4. Add new endpoints: `/api/settlements/batches/*`
5. Keep existing per-claim endpoints (marked deprecated)

### Phase 3: Frontend Enhancement (Weeks 5-6)
1. Create `ProviderAccountView` component
2. Create `BatchSettlementInbox` with multi-select
3. Create `BatchSettlementReport` component
4. Add "Create Batch" action to Settlement Inbox
5. Add Provider Account dashboard card

### Phase 4: Migration & Validation (Weeks 7-8)
1. Parallel run: Both per-claim and batch available
2. Validate totals match between methods
3. Train users on batch workflow
4. Monitor for issues

### Phase 5: Deprecation (Week 9+)
1. Hide per-claim settle button
2. Deprecate per-claim API
3. Remove per-claim code (optional)
4. Update documentation

---

## 📊 APPENDIX A: Current Database Schema (Settlement-Related)

```sql
-- CLAIMS TABLE (settlement fields highlighted)
claims (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    visit_id BIGINT NOT NULL,
    
    -- Financial snapshot (set on approval)
    requested_amount NUMERIC(15,2) NOT NULL,
    approved_amount NUMERIC(15,2),
    patient_copay NUMERIC(15,2),
    net_provider_amount NUMERIC(15,2),
    copay_percent NUMERIC(5,2),
    deductible_applied NUMERIC(15,2),
    
    -- Settlement fields (current per-claim model)
    payment_reference VARCHAR(100),      -- ⚠️ Manual entry, no validation
    settled_at TIMESTAMP,                -- ⚠️ Set on settlement
    settlement_notes TEXT,               -- ⚠️ Optional notes
    
    status VARCHAR(30) NOT NULL,         -- APPROVED/SETTLED
    version BIGINT DEFAULT 0,            -- Optimistic locking
    
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- PROVIDERS TABLE (no account fields)
providers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    -- ⚠️ NO balance fields
    -- ⚠️ NO running_balance
    -- ⚠️ NO total_outstanding
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- CLAIM_AUDIT_LOG TABLE (immutable)
claim_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    status_before VARCHAR(30),
    status_after VARCHAR(30),
    approved_amount_before NUMERIC(15,2),
    approved_amount_after NUMERIC(15,2),
    changed_by BIGINT,
    changed_by_username VARCHAR(255),
    changed_by_role VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    comment TEXT,
    json_before TEXT,
    json_after TEXT
);
```

---

## 📊 APPENDIX B: Frontend Component Map

```
CURRENT SETTLEMENT SCREENS
├── /claims/settlement (SettlementInbox)
│   ├── Tab 0: Pending (APPROVED claims)
│   │   └── Action: "Settle" → Opens dialog → POST /claims/{id}/settle
│   ├── Tab 1: Invoices (SETTLED with invoice number)
│   ├── Tab 2: Payments (SETTLED with payment_reference)
│   └── Tab 3: Completed (All SETTLED)
│
├── /reports/provider-settlement (ProviderSettlementReport)
│   ├── Provider selector (Admin sees all)
│   ├── Date range filter
│   ├── Status filter
│   ├── Claims list with expandable lines
│   └── Export: Excel, Print
│
├── /reports/financial (FinancialReports)
│   ├── Tab 0: Financial Summary (KPIs)
│   ├── Tab 1: Invoices Report
│   ├── Tab 2: Payments Report
│   └── Tab 3: Settlements Report
│
└── /claims/{id} (ClaimView)
    └── Action: "Settle" (if APPROVED and has SETTLE_CLAIMS permission)

API ENDPOINTS USED
├── GET  /api/claims/inbox/approved      → Pending settlements
├── POST /api/claims/{id}/settle         → Per-claim settlement
├── GET  /api/reports/settlement-summary → Financial totals
├── GET  /api/reports/provider-settlement-report → Provider report
└── GET  /api/claims?status=SETTLED      → Settled claims list
```

---

## ✅ CONCLUSION

The current system has a **solid foundation** for financial integrity with:
- ✅ Immutable financial snapshots on claims
- ✅ Comprehensive audit trail
- ✅ Race condition protection via pessimistic locking
- ✅ Backend-calculated totals (no client math)

However, it lacks the **Provider Account Settlement model** needed for:
- ❌ Running balance per provider
- ❌ Batch payment processing
- ❌ Payment entity with validation
- ❌ Outstanding amount tracking per provider

**Migration is FEASIBLE** with:
- Additive schema changes (no breaking changes)
- Phased rollout (parallel per-claim and batch)
- Reuse of existing aggregation patterns
- Extension of current audit infrastructure

**Recommended Next Step:** Create detailed technical design document for Provider Account Settlement system based on this diagnostic analysis.

---

*End of Diagnostic Report*
