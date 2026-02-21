# 🛡️ Medical Category → Service: Financial Hardening Complete

**Date:** 2026-01-28  
**Status:** ✅ COMPLETE

---

## 📋 Summary

This document records the implementation of 3 recommended enhancements to protect the canonical "Medical Category → Medical Service" flow from financial errors.

---

## 🔒 Enhancement 1: Backend Guard (Hard Validation)

### What Changed
Both `ClaimMapper` and `PreAuthorizationService` now **throw exceptions** (instead of just logging warnings) when a service doesn't belong to the selected category.

### Files Modified
- [ClaimMapper.java](backend/src/main/java/com/waad/tba/modules/claim/mapper/ClaimMapper.java#L185-L193)
- [PreAuthorizationService.java](backend/src/main/java/com/waad/tba/modules/preauthorization/service/PreAuthorizationService.java#L210-L218)

### Error Message (Arabic)
```
الخدمة الطبية 'اسم الخدمة' (كود الخدمة) لا تنتمي للتصنيف الطبي المختار. يرجى التأكد من اختيار التصنيف الصحيح.
```

### Protection Against
- ❌ Postman attacks bypassing frontend validation
- ❌ Future frontend bugs sending wrong category/service combinations
- ❌ API consumers making incorrect requests

---

## 💰 Enhancement 2: Coverage Snapshot Policy

### What Changed
Coverage values are now **stored as snapshots** at creation time, ensuring financial records reflect the rules that were active when the transaction was created.

### New Database Columns
| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `claim_lines` | `coverage_percent_snapshot` | INTEGER | Coverage % at claim creation |
| `claim_lines` | `patient_copay_percent_snapshot` | INTEGER | Copay % at claim creation |
| `pre_authorizations` | `coverage_percent_snapshot` | INTEGER | Coverage % at pre-auth creation |
| `pre_authorizations` | `patient_copay_percent_snapshot` | INTEGER | Copay % at pre-auth creation |

### Migration File
- [V005__add_coverage_snapshot_columns.sql](backend/src/main/resources/db/migration/V005__add_coverage_snapshot_columns.sql)

### Files Modified
- [ClaimLine.java](backend/src/main/java/com/waad/tba/modules/claim/entity/ClaimLine.java#L111-L122)
- [PreAuthorization.java](backend/src/main/java/com/waad/tba/modules/preauthorization/entity/PreAuthorization.java#L169-L182)
- [ClaimMapper.java](backend/src/main/java/com/waad/tba/modules/claim/mapper/ClaimMapper.java#L160-L170) - Now populates snapshots
- [PreAuthorizationService.java](backend/src/main/java/com/waad/tba/modules/preauthorization/service/PreAuthorizationService.java#L220-L227) - Now populates snapshots

### Why This Matters
```
📅 Jan 1: Member creates claim with policy showing 75% coverage
📅 Jan 15: Policy updated to 50% coverage
📅 Jan 20: Auditor checks January claim

✅ CORRECT: claim_line.coverage_percent_snapshot = 75% (original)
❌ WRONG: Recalculating would show 50% (incorrect for audit!)
```

---

## 🧪 Enhancement 3: Critical Test Case

### Test File
- [CategoryBasedCoverageTest.java](backend/src/test/java/com/waad/tba/modules/benefitpolicy/service/CategoryBasedCoverageTest.java)

### Test Scenarios

#### 1. Same Service, Different Categories → Different Coverage
```java
// Blood Test - CBC (same service ID)
// In Preventive Care: 100% coverage → 0 LYD copay
// In Diagnostic Tests: 75% coverage → 25 LYD copay
// DIFFERENCE: 25 LYD per test!
```

#### 2. Category Mismatch Rejection
Documents that the system rejects requests where sent categoryId doesn't match service's actual category.

#### 3. Snapshot Immutability
Documents that coverage snapshot values are preserved even after policy changes.

### Test Results
```
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  User selects: Category → Service (enforced by UI)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /api/claims  or  POST /api/pre-authorizations
                             │ { serviceCategoryId: X, medicalServiceId: Y }
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ARCHITECTURAL GUARD                                       │   │
│  │ if (serviceCategoryId != service.categoryId)             │   │
│  │     throw IllegalArgumentException("Arabic error...")     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             │ Guard passed                       │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ COVERAGE SNAPSHOT                                         │   │
│  │ coverageInfo = getCoverageForService(member, serviceId)   │   │
│  │ snapshot.coveragePercent = coverageInfo.getCoveragePercent│   │
│  │ snapshot.copayPercent = 100 - coveragePercent             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             │ Snapshot stored                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ DATABASE                                                  │   │
│  │ claim_lines.coverage_percent_snapshot = 75                │   │
│  │ claim_lines.patient_copay_percent_snapshot = 25           │   │
│  │ (IMMUTABLE - never recalculated after creation)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Financial Impact

| Scenario | Without Hardening | With Hardening |
|----------|-------------------|----------------|
| Wrong category sent | Claim created with wrong coverage | **REJECTED** |
| Policy changed after claim | Coverage recalculated (wrong) | **Snapshot preserved** |
| Audit trail | Inaccurate financial records | **Accurate historical record** |

---

## ✅ Verification Checklist

- [x] Backend compiles successfully
- [x] All 5 tests pass
- [x] Migration file created for new columns
- [x] ClaimMapper throws exception on category mismatch
- [x] PreAuthorizationService throws exception on category mismatch
- [x] ClaimMapper populates coverage snapshot
- [x] PreAuthorizationService populates coverage snapshot

---

## 🔗 Related Documents

- [MEDICAL-SERVICES-CATEGORIES-FIX-REPORT.md](MEDICAL-SERVICES-CATEGORIES-FIX-REPORT.md) - Original 6-phase implementation
- [MEDICAL_SERVICES_API_CONTRACT.md](MEDICAL_SERVICES_API_CONTRACT.md) - API contract for medical services
