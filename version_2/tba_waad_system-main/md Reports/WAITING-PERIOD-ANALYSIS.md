# WAITING PERIOD / ELIGIBILITY LOGIC ANALYSIS

**Date:** 2025-01-14  
**Scope:** `policy` module only  
**Purpose:** Analysis-only, NO CODE CHANGES  

---

## EXECUTIVE SUMMARY

The `policy` module contains waiting period and coverage validation logic that **OVERLAPS** with:
1. `benefitpolicy` module (has `waitingPeriodDays` per rule)
2. `eligibility` module (has dedicated `WaitingPeriodRule`)

**Recommendation:** Most logic in `policy` module is **REDUNDANT** and should be **CONSOLIDATED** into existing modules.

---

## 1. CLASSES IDENTIFIED

### 1.1 PolicyValidationService

**Location:** `policy/service/PolicyValidationService.java`

**Methods:**
| Method | Purpose | Called From |
|--------|---------|-------------|
| `validatePolicyForDate(Policy, LocalDate)` | Validates policy status & date range | VisitService, ClaimService |
| `validateMemberPolicy(Member, LocalDate)` | Validates member has policy + is ACTIVE | VisitService.create(), ClaimService.createClaim() |
| `validatePolicyStatus(Policy)` | Checks policy status is ACTIVE | Internal |
| `validatePolicyDateRange(Policy, LocalDate)` | Checks date within start/end | Internal |
| `validateBenefitPackageLinkage(Policy)` | Checks policy has BenefitPackage | Internal |
| `isPolicyValidForDate(Policy, LocalDate)` | Boolean check (no exception) | UI hints |

**Inputs Required:**
- `Policy` entity (from `Member.getPolicy()`)
- `LocalDate serviceDate`

**Domain Decision Enforced:**
- Policy must be ACTIVE status
- Service date must be within policy period
- Policy must have linked BenefitPackage

---

### 1.2 CoverageValidationService

**Location:** `policy/service/CoverageValidationService.java`

**Methods:**
| Method | Purpose | Called From |
|--------|---------|-------------|
| `validateClaimCoverage(Member, Policy, amount, lines, date)` | Full claim coverage check | NOT USED |
| `validateServiceCoverage(serviceCode, BenefitPackage)` | Checks service type covered | Internal |
| `validateAmountLimits(Member, Policy, amount, date)` | Annual/lifetime limit checks | ClaimService.createClaim(), ClaimService.approve() |
| `validateWaitingPeriods(Member, Policy, lines, date)` | General + maternity waiting | Internal (called by validateClaimCoverage) |
| `calculatePayableAmount(amount, BenefitPackage, serviceType)` | Calculate after copay | NOT USED |
| `getCoPayPercentage(BenefitPackage, serviceType)` | Get copay for IP/OP | Internal |
| `calculateUsedAmountForYear(memberId, year)` | Sum approved claims YTD | Internal |
| `calculateTotalUsedForPolicy(memberId, policyId)` | Sum all member claims | Internal |
| `calculateLifetimeUsed(memberId)` | Sum lifetime claims | Internal |
| `getRemainingCoverage(Member, Policy, date)` | Get remaining limit | NOT USED (UI helper) |

**Inputs Required:**
- `Member` entity
- `Policy` entity (uses `Policy.generalWaitingPeriodDays`, `Policy.maternityWaitingPeriodDays`)
- `BenefitPackage` entity (from `Policy.getBenefitPackage()`)
- `BigDecimal requestedAmount`
- `LocalDate serviceDate`
- `List<ClaimLine>` (for service-specific validation)

**Domain Decisions Enforced:**
- Service category coverage (dental, optical, maternity, etc. via BenefitPackage flags)
- Annual limit per member
- Per-policy limits
- Lifetime limits
- General waiting period (configurable days)
- Maternity-specific waiting period (270 days default)

---

### 1.3 Policy Entity (Waiting Period Fields)

**Location:** `policy/entity/Policy.java`

**Waiting Period Fields:**
```java
generalWaitingPeriodDays = 0        // Default: no waiting
maternityWaitingPeriodDays = 270    // 9 months
preExistingWaitingPeriodDays = 365  // 1 year
```

**Used By:**
- `CoverageValidationService.validateWaitingPeriods()`
- `eligibility/rules/WaitingPeriodRule` (uses `Policy.generalWaitingPeriodDays`)

---

### 1.4 BenefitPackage Entity (Coverage Flags)

**Location:** `policy/entity/BenefitPackage.java`

**Coverage Fields:**
```java
maternityCovered = false
dentalCovered = false
opticalCovered = false
pharmacyCovered = true
emergencyCovered = true
chronicDiseaseCovered = false
preExistingConditionsCovered = false
```

**Limit Fields:**
```java
annualLimitPerMember
lifetimeLimitPerMember
opCoverageLimit, opCoPaymentPercentage
ipCoverageLimit, ipCoPaymentPercentage
maternityCoverageLimit, dentalCoverageLimit, opticalCoverageLimit
pharmacyCoverageLimit
```

**Used By:**
- `CoverageValidationService.validateServiceCoverage()`
- `CoverageValidationService.validateAmountLimits()`

---

## 2. CALL FLOW ANALYSIS

### 2.1 ClaimService.createClaim()
```
ClaimService.createClaim()
├── benefitPolicyCoverageService.validateCanCreateClaim(member, date)  [PRIMARY]
├── policyValidationService.validateMemberPolicy(member, date)          [LEGACY - wrapped in try/catch]
└── coverageValidationService.validateAmountLimits(member, policy, amount, date)  [LEGACY - wrapped in try/catch]
```

**Observation:** Legacy validation is wrapped in try/catch and logged as warnings. `BenefitPolicyCoverageService` is now primary.

### 2.2 ClaimService.approve()
```
ClaimService.approve()
└── coverageValidationService.validateAmountLimits(member, policy, approvedAmount, date)  [ACTIVE]
```

**Observation:** Still actively used for limit validation during approval.

### 2.3 VisitService.create()
```
VisitService.create()
└── policyValidationService.validateMemberPolicy(member, visitDate)  [ACTIVE]
```

**Observation:** No BenefitPolicy validation here yet.

### 2.4 EligibilityEngineService.checkEligibility()
```
EligibilityEngineServiceImpl.evaluateRules()
├── PolicyActiveRule         → checks Policy.status = ACTIVE
├── PolicyCoveragePeriodRule → checks date within Policy dates
├── PolicyExistsRule         → checks Member.policy != null
└── WaitingPeriodRule        → checks Policy.generalWaitingPeriodDays
```

**Observation:** Eligibility engine has its own independent waiting period rule using `Policy.generalWaitingPeriodDays`.

---

## 3. LOGIC CLASSIFICATION

### 3.1 Where Does Each Piece Belong?

| Logic | Classification | Best Target |
|-------|---------------|-------------|
| Policy status check (ACTIVE) | Member eligibility | **EligibilityEngine** (already has `PolicyActiveRule`) |
| Policy date range | Member eligibility | **EligibilityEngine** (already has `PolicyCoveragePeriodRule`) |
| BenefitPackage linkage | Policy validation | **Keep in PolicyValidationService** (defensive check) |
| Service category coverage | Coverage rules | **MOVE to BenefitPolicyCoverageService** |
| Annual/lifetime limits | Coverage rules | **MOVE to BenefitPolicyCoverageService** |
| General waiting period | Coverage rules | **MOVE to BenefitPolicy** (rule-level: `BenefitPolicyRule.waitingPeriodDays`) |
| Maternity waiting period | Coverage rules | **MOVE to BenefitPolicy** (maternity rule + waiting period) |
| Pre-existing waiting period | Coverage rules | **MOVE to BenefitPolicy** (rule config) |
| Copay calculation | Cost calculation | **Keep in CostCalculationService** |

### 3.2 Classification Summary

| Category | What It Does | Current Location | Ideal Location |
|----------|-------------|------------------|----------------|
| **a) BenefitPolicy Rules** | Service coverage, waiting periods per service | CoverageValidationService | **BenefitPolicyCoverageService** |
| **b) Claim/PreAuth Validation** | Amount limits, copay | CoverageValidationService | **BenefitPolicyCoverageService** |
| **c) Member Eligibility** | Policy status, dates, active member | PolicyValidationService | **EligibilityEngine** |

---

## 4. OVERLAP ANALYSIS

### 4.1 Waiting Period Logic - THREE IMPLEMENTATIONS!

| Location | Implementation | Data Source |
|----------|---------------|-------------|
| `policy/CoverageValidationService.validateWaitingPeriods()` | Checks general + maternity | `Policy.generalWaitingPeriodDays`, `Policy.maternityWaitingPeriodDays` |
| `eligibility/rules/WaitingPeriodRule` | Checks general only | `Policy.generalWaitingPeriodDays` |
| `benefitpolicy/entity/BenefitPolicyRule` | Per-service/category waiting | `BenefitPolicyRule.waitingPeriodDays` |

**CONFLICT:** Three different places handle waiting periods with different granularity.

### 4.2 Policy Validation - TWO IMPLEMENTATIONS!

| Location | Implementation |
|----------|---------------|
| `policy/PolicyValidationService` | Validates Policy entity status & dates |
| `eligibility/rules/PolicyActiveRule, PolicyCoveragePeriodRule, PolicyExistsRule` | Same validation as eligibility rules |

**CONFLICT:** Duplicated logic for policy status/date validation.

### 4.3 Coverage Validation - TWO IMPLEMENTATIONS!

| Location | Implementation |
|----------|---------------|
| `policy/CoverageValidationService` | Uses `BenefitPackage` flags (dentalCovered, etc.) |
| `benefitpolicy/BenefitPolicyCoverageService` | Uses `BenefitPolicyRule` with category/service rules |

**CONFLICT:** BenefitPackage flags vs. BenefitPolicyRule rules - different data models.

---

## 5. RECOMMENDATION

### 5.1 Methods to KEEP (in policy module)

| Method | Reason |
|--------|--------|
| `PolicyValidationService.validatePolicyForDate()` | Defensive check for legacy `Policy` entity usage |
| `PolicyValidationService.isPolicyValidForDate()` | UI helper (non-throwing) |

### 5.2 Methods to MOVE

| Method | From | To | Reason |
|--------|------|----|----|
| `CoverageValidationService.validateAmountLimits()` | policy | `BenefitPolicyCoverageService` | Should use BenefitPolicy.annualLimit, not BenefitPackage |
| `CoverageValidationService.validateServiceCoverage()` | policy | `BenefitPolicyCoverageService` | Already implemented better with BenefitPolicyRule |
| `CoverageValidationService.validateWaitingPeriods()` | policy | `BenefitPolicyCoverageService` | Should use BenefitPolicyRule.waitingPeriodDays |
| Waiting period fields from `Policy` | policy entity | `BenefitPolicy` or `BenefitPolicyRule` | Single source of truth |

### 5.3 Methods SAFE TO DELETE (after moving)

| Method | Reason |
|--------|--------|
| `CoverageValidationService.validateClaimCoverage()` | Not called anywhere |
| `CoverageValidationService.calculatePayableAmount()` | Not called, CostCalculationService handles this |
| `CoverageValidationService.getRemainingCoverage()` | Not called |
| `PolicyValidationService.validateMemberPolicy()` | Duplicates BenefitPolicyCoverageService + EligibilityEngine |

### 5.4 Data to MIGRATE

| Field | From | To |
|-------|------|-----|
| `Policy.generalWaitingPeriodDays` | Policy entity | `BenefitPolicy` (policy-level default) |
| `Policy.maternityWaitingPeriodDays` | Policy entity | `BenefitPolicyRule` (for maternity category) |
| `Policy.preExistingWaitingPeriodDays` | Policy entity | `BenefitPolicyRule` (for pre-existing rules) |
| `BenefitPackage.*Covered` flags | BenefitPackage | `BenefitPolicyRule` (presence of rule = covered) |

---

## 6. RECOMMENDED FINAL STRUCTURE

```
benefitpolicy/
├── entity/
│   ├── BenefitPolicy.java          ← Add: defaultWaitingPeriodDays
│   └── BenefitPolicyRule.java      ← Already has: waitingPeriodDays
├── service/
│   ├── BenefitPolicyCoverageService.java  ← MOVE: all coverage logic here
│   ├── BenefitPolicyRuleService.java
│   └── BenefitPolicyService.java

eligibility/
├── rules/
│   ├── WaitingPeriodRule.java      ← UPDATE: use BenefitPolicy instead of Policy
│   ├── PolicyActiveRule.java       ← RENAME: BenefitPolicyActiveRule
│   └── ...

policy/                             ← DEPRECATED MODULE (keep minimal)
├── entity/
│   ├── Policy.java                 ← KEEP: for legacy compatibility
│   └── BenefitPackage.java         ← KEEP: legacy data
├── service/
│   ├── PolicyValidationService.java ← KEEP: minimal defensive checks
│   ├── CoverageValidationService.java ← DELETE: after migration
│   └── PolicyService.java          ← KEEP: CRUD only, no business logic
```

---

## 7. MIGRATION PRIORITY

1. **HIGH**: Move `validateAmountLimits` to BenefitPolicyCoverageService (actively used)
2. **MEDIUM**: Update EligibilityEngine rules to use BenefitPolicy
3. **LOW**: Remove deprecated methods after verification
4. **DEFER**: Database schema changes for waiting period fields

---

## 8. RISK ASSESSMENT

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking ClaimService.approve() | HIGH | Keep CoverageValidationService until BenefitPolicy has limit checking |
| Breaking VisitService.create() | MEDIUM | Add BenefitPolicyCoverageService validation to VisitService |
| EligibilityEngine uses Policy entity | MEDIUM | Gradual migration, keep Policy as fallback |

---

## APPENDIX: FILE DEPENDENCIES

```
ClaimService.java
├── imports PolicyValidationService     [CAN REMOVE after migration]
├── imports CoverageValidationService   [CAN REMOVE after migration]
└── imports BenefitPolicyCoverageService [KEEP - primary]

VisitService.java
├── imports PolicyValidationService     [REPLACE with BenefitPolicyCoverageService]

EligibilityEngineServiceImpl.java
├── imports PolicyRepository            [KEEP for now]
└── uses Policy entity in rules         [MIGRATE to BenefitPolicy later]
```
