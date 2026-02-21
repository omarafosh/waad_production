# PHASE 3 PROVIDER MODULE - QUICK REFERENCE

## Issues Fixed (Summary)

### 1. FK Constraint: claims.provider_id
**Problem**: Claims could reference deleted providers (orphan risk)  
**Fix**: `fk_claims_provider` RESTRICT  
**Impact**: Cannot delete provider with claims (financial records protected)  
**Test**: `testProviderDeletionBlockedByClaims()`

### 2. FK Constraint: legacy_provider_contracts.provider_id
**Problem**: Contracts could reference deleted providers  
**Fix**: `fk_legacy_contracts_provider` CASCADE  
**Impact**: Deleting provider cascades to contracts (owned data)  
**Migration**: V1_14

### 3. FK Constraint: provider_accounts.provider_id
**Problem**: Accounts could exist without valid provider  
**Fix**: `fk_provider_accounts_provider` RESTRICT  
**Impact**: Cannot delete provider with account (financial history protected)  
**Test**: `testProviderDeletionBlockedByAccount()`

### 4. NOT NULL: claims.provider_id
**Problem**: Claims without provider reference possible  
**Fix**: `ALTER TABLE claims ALTER COLUMN provider_id SET NOT NULL`  
**Impact**: Every claim MUST have a provider  
**Test**: `testClaimProviderIdCannotBeNull()`

### 5. Deprecated: Provider.defaultDiscountRate
**Problem**: Financial field in definitional entity  
**Fix**: `@Deprecated(since = "Phase 3 - 2026-02-12")`  
**Replacement**: Use `ProviderContract.discountPercent`  
**Test**: `testDefaultDiscountRateIsDeprecated()`

---

## Deletion Rules

### ✅ CAN Delete Provider When:
- No claims exist
- No provider account exists
- Allowed employers will cascade
- Admin documents will cascade
- Reviewer mappings will cascade

### ❌ CANNOT Delete Provider When:
- Claims exist (FK RESTRICT)
- Provider account exists (FK RESTRICT)

### ✅ RECOMMENDED: Soft Delete
```java
provider.setActive(false);
providerRepository.save(provider);
```

---

## Database Indexes Added

```sql
idx_provider_accounts_status (provider_id, status) WHERE status = 'ACTIVE'
```

Existing indexes verified:
- `idx_claims_provider_id`
- `idx_claims_provider_status`
- `idx_pae_provider`
- `idx_mrp_provider_active`
- `idx_contracts_provider_id`

---

## Code Changes

### Provider.java
```java
// BEFORE
@Column(precision = 5, scale = 2)
private BigDecimal defaultDiscountRate;

// AFTER
@Deprecated(since = "Phase 3 - 2026-02-12", forRemoval = false)
@Column(precision = 5, scale = 2)
private BigDecimal defaultDiscountRate;
```

### Migration V1_14
- Pre-flight orphan checks
- FK constraints (3 added)
- NOT NULL constraint
- Index creation
- Post-migration verification
- Column deprecation comment

---

## Test Coverage

| Test | Verifies | Status |
|---|---|---|
| `testProviderDeletionBlockedByClaims` | FK RESTRICT on claims | ✅ |
| `testProviderDeletionBlockedByAccount` | FK RESTRICT on accounts | ✅ |
| `testClaimProviderIdCannotBeNull` | NOT NULL constraint | ✅ |
| `testProviderSoftDelete` | Soft delete pattern | ✅ |
| `testProviderCanBeDeletedWhenNoConstraints` | Clean deletion | ✅ |
| `testDefaultDiscountRateIsDeprecated` | @Deprecated annotation | ✅ |

---

## Compliance Checklist

- [x] Provider is definitional only (no financial logic)
- [x] Cannot be deleted unsafely (FK constraints)
- [x] All relationships indexed
- [x] All list endpoints paginated
- [x] All endpoints RBAC protected
- [x] Lazy loading on all relationships
- [x] Integration tests for all critical paths

---

## Next Phase: Settlement Module

Focus areas for Phase 4:
1. ProviderAccount balance integrity
2. SettlementBatch workflow validation
3. AccountTransaction audit trail
4. Concurrent settlement safety
5. Financial reconciliation accuracy

---

**Last Updated**: 2026-02-12  
**Migration**: V1_14__provider_module_hardening.sql  
**Tests**: ProviderModuleIntegrityTest.java  
**Report**: PHASE_3_PROVIDER_HARDENING_REPORT.md
