# Phase 1.5 – Database Integrity Hardening Report

**Date:** 2026-02-17  
**Schema Source:** 75 Flyway migrations (V1–V75) applied to clean PostgreSQL 16  
**Total Tables:** 60  
**Tables with JPA Entities:** 44  
**Orphan Tables (no entity):** 16  

---

## Step 1 – Orphan & FK Analysis

### 1A. Requested Relationship Pairs

| Child Table | FK Column | Parent Table | FK Constraint? | Risk Level |
|---|---|---|---|---|
| `claims` | `settlement_batch_id` | `settlement_batches` | ❌ **NO FK** | 🔴 CRITICAL – financial orphaning possible |
| `claims` | `visit_id` | `visits` | ❌ **NO FK** | 🟡 MEDIUM – broken visit→claim chain |
| `claims` | `pre_authorization_id` | `pre_authorizations` | ❌ **NO FK** | 🔴 CRITICAL – preauth links can dangle |
| `pre_authorizations` | `member_id` | `members` | ❌ **NO FK** | 🔴 CRITICAL – member deletion could orphan preauths |
| `pre_authorizations` | `provider_id` | `providers` | ❌ **NO FK** | 🔴 CRITICAL – provider deletion could orphan preauths |
| `pre_authorizations` | `medical_service_id` | `medical_services` | ❌ **NO FK** | 🟡 MEDIUM |
| `pre_authorizations` | `service_category_id` | `medical_categories` | ❌ **NO FK** | 🟡 MEDIUM |
| `pre_authorizations` | `visit_id` | `visits` | ❌ **NO FK** | 🟡 MEDIUM |
| `claim_audit_logs` | `claim_id` | `claims` | ❌ **NO FK** | 🔴 CRITICAL – audit logs can reference deleted claims |
| `claim_audit_logs` | `actor_user_id` | `users` | ❌ **NO FK** | 🟡 MEDIUM |

**Summary: 0/10 requested relationships have FK constraints.**  The `pre_authorizations` table has **zero FK constraints** despite having 5 `_id` columns.

### 1B. Full Missing FK Inventory (Target Tables)

| Table | Column | Has FK? |
|---|---|---|
| **claims** | `member_id` | ✅ FK EXISTS |
| **claims** | `provider_id` | ✅ FK EXISTS |
| **claims** | `reviewer_id` | ✅ FK EXISTS |
| **claims** | `pre_authorization_id` | ❌ NO FK |
| **claims** | `settlement_batch_id` | ❌ NO FK |
| **claims** | `visit_id` | ❌ NO FK |
| **settlement_batch_items** | `batch_id` | ✅ FK EXISTS |
| **settlement_batch_items** | `claim_id` | ✅ FK EXISTS |
| **settlement_batch_items** | `settlement_batch_id` | ✅ FK EXISTS |
| **settlement_batches** | `provider_id` | ✅ FK EXISTS |
| **settlement_batches** | `provider_account_id` | ✅ FK EXISTS |
| **pre_authorizations** | `member_id` | ❌ NO FK |
| **pre_authorizations** | `provider_id` | ❌ NO FK |
| **pre_authorizations** | `medical_service_id` | ❌ NO FK |
| **pre_authorizations** | `service_category_id` | ❌ NO FK |
| **pre_authorizations** | `visit_id` | ❌ NO FK |
| **claim_audit_logs** | `claim_id` | ❌ NO FK |
| **claim_audit_logs** | `actor_user_id` | ❌ NO FK |
| **visits** | `member_id` | ✅ FK EXISTS |
| **visits** | `employer_id` | ✅ FK EXISTS |
| **visits** | `provider_id` | ❌ NO FK |
| **visits** | `medical_service_id` | ❌ NO FK |
| **visits** | `medical_category_id` | ❌ NO FK |
| **visits** | `eligibility_check_id` | ❌ NO FK |

**Missing FKs: 14 out of 24 `_id` columns (58%) have no constraint.**

### 1C. Existing FK Constraints (68 total across all tables)

The settlement module is well-constrained. The `claims`, `pre_authorizations`, `visits`, and audit tables are dangerously exposed.

| Module | FK Count | Assessment |
|---|---|---|
| Settlement (batches, items, accounts) | 8 | ✅ Solid |
| Members (attributes, deductibles, etc.) | 9 | ✅ Solid |
| Provider contracts/pricing | 11 | ✅ Solid |
| Claims (core) | 3 of 6 | ⚠️ Half-covered |
| Pre-authorizations | 0 of 5 | 🔴 ZERO FKs |
| Claim audit/history | 0 of 3 | 🔴 ZERO FKs |
| Visits | 2 of 6 | ⚠️ One-third covered |

---

## Step 2 – Monetary Precision Audit

### Standard: `NUMERIC(15,2)` – Correctly Standardized Columns

| Table | Column | Precision | Status |
|---|---|---|---|
| `benefit_policies` | `per_family_limit` | 15,2 | ✅ |
| `benefit_policies` | `per_member_limit` | 15,2 | ✅ |
| `benefit_policy_rules` | `amount_limit` | 15,2 | ✅ |
| `claim_audit_logs` | `new_approved_amount` | 15,2 | ✅ |
| `claim_audit_logs` | `new_requested_amount` | 15,2 | ✅ |
| `claim_audit_logs` | `previous_approved_amount` | 15,2 | ✅ |
| `claim_audit_logs` | `previous_requested_amount` | 15,2 | ✅ |
| `claim_lines` | `total_price` | 15,2 | ✅ |
| `claims` | `deductible_applied` | 15,2 | ✅ |
| `claims` | `difference_amount` | 15,2 | ✅ |
| `claims` | `net_provider_amount` | 15,2 | ✅ |
| `claims` | `patient_copay` | 15,2 | ✅ |
| `cpt_codes` | `max_allowed_price` | 15,2 | ✅ |
| `cpt_codes` | `min_allowed_price` | 15,2 | ✅ |
| `cpt_codes` | `standard_price` | 15,2 | ✅ |
| `pre_authorizations` | `approved_amount` | 15,2 | ✅ |
| `pre_authorizations` | `contract_price` | 15,2 | ✅ |
| `pre_authorizations` | `copay_amount` | 15,2 | ✅ |
| `pre_authorizations` | `insurance_covered_amount` | 15,2 | ✅ |
| `pre_authorizations` | `reserved_amount` | 15,2 | ✅ |
| `provider_contract_pricing_items` | `base_price` | 15,2 | ✅ |
| `provider_contract_pricing_items` | `contract_price` | 15,2 | ✅ |
| `provider_contracts` | `total_value` | 15,2 | ✅ |
| `settlement_batch_items` | `gross_amount_snapshot` | 15,2 | ✅ |
| `settlement_batch_items` | `net_amount_snapshot` | 15,2 | ✅ |
| `settlement_batch_items` | `patient_share_snapshot` | 15,2 | ✅ |
| `settlement_batches` | `total_gross_amount` | 15,2 | ✅ |
| `settlement_batches` | `total_net_amount` | 15,2 | ✅ |
| `settlement_batches` | `total_patient_share` | 15,2 | ✅ |

**29 columns correctly standardized to (15,2).**

### ⚠️ Non-Standard Monetary Columns (NEED MIGRATION)

| Table | Column | Current | Should Be | Risk |
|---|---|---|---|---|
| **account_transactions** | `amount` | (12,2) | (15,2) | 🔴 Overflow at >9.99B |
| **account_transactions** | `balance_after` | (14,2) | (15,2) | 🟡 Minor |
| **account_transactions** | `balance_before` | (14,2) | (15,2) | 🟡 Minor |
| **benefit_policies** | `annual_limit` | (12,2) | (15,2) | 🟡 |
| **benefit_policies** | `deductible_amount` | (10,2) | (15,2) | 🟡 |
| **benefit_policies** | `per_visit_limit` | (10,2) | (15,2) | 🟡 |
| **benefit_policy_rules** | `coverage_percentage` | (5,2) | (5,2) | ✅ OK for % |
| **benefit_policy_rules** | `max_amount_per_session` | (10,2) | (15,2) | 🟡 |
| **benefit_policy_rules** | `max_amount_per_year` | (12,2) | (15,2) | 🟡 |
| **claim_lines** | `approved_amount` | (12,2) | (15,2) | 🔴 Inconsistent with claims table |
| **claim_lines** | `total_amount` | (12,2) | (15,2) | 🔴 |
| **claim_lines** | `unit_price` | (10,2) | (15,2) | 🟡 |
| **claims** | `approved_amount` | (12,2) | (15,2) | 🔴 CORE FINANCIAL – mismatch with net_provider_amount |
| **claims** | `copay_percent` | (5,2) | (5,2) | ✅ OK for % |
| **claims** | `paid_amount` | (12,2) | (15,2) | 🔴 CORE |
| **claims** | `patient_share` | (12,2) | (15,2) | 🔴 |
| **claims** | `requested_amount` | (12,2) | (15,2) | 🔴 CORE |
| **cpt_codes** | `co_payment_percentage` | (5,2) | (5,2) | ✅ OK for % |
| **legacy_provider_contracts** | `contract_price` | (10,2) | (15,2) | 🟡 Legacy |
| **medical_services** | `base_price` | (10,2) | (15,2) | 🟡 |
| **member_deductibles** | `deductible_remaining` | (10,2) | (15,2) | 🟡 |
| **member_deductibles** | `deductible_used` | (10,2) | (15,2) | 🟡 |
| **member_deductibles** | `total_deductible` | (10,2) | (15,2) | 🟡 |
| **pre_authorizations** | `copay_percentage` | (10,2) | (5,2) | ⚠️ Over-sized for % |
| **preauthorization_requests** | `estimated_cost` | (12,2) | (15,2) | 🟡 Orphan table |
| **provider_accounts** | `running_balance` | (14,2) | (15,2) | 🟡 Minor |
| **provider_accounts** | `total_approved` | (14,2) | (15,2) | 🟡 Minor |
| **provider_accounts** | `total_paid` | (14,2) | (15,2) | 🟡 Minor |
| **provider_contract_pricing_items** | `discount_percent` | (5,2) | (5,2) | ✅ OK for % |
| **provider_contract_service_prices** | `contracted_price` | (10,2) | (15,2) | 🟡 |
| **provider_contracts** | `discount_percent` | (5,2) | (5,2) | ✅ OK for % |
| **provider_contracts** | `discount_rate` | (5,2) | (5,2) | ✅ OK for % |
| **provider_service_prices** | `price` | (10,2) | (15,2) | 🟡 |
| **provider_service_prices** | `unit_price` | (10,2) | (15,2) | 🟡 |
| **providers** | `default_discount_rate` | (5,2) | (5,2) | ✅ OK for % |
| **settlement_batch_items** | `claim_amount` | (12,2) | (15,2) | 🔴 Financial |
| **settlement_batches** | `total_amount` | (14,2) | (15,2) | 🟡 Minor |
| **visits** | `total_amount` | (10,2) | (15,2) | 🟡 |

### 🔴 DANGEROUS: Non-Numeric Types for Financial Data

| Table | Column | Type | Issue |
|---|---|---|---|
| `medical_packages` | `total_coverage_limit` | `double precision` | 🔴 **FLOATING POINT** – rounding errors guaranteed |

### Summary

| Category | Count |
|---|---|
| ✅ Correct (15,2) | 29 |
| ✅ OK for percentages (5,2) | 8 |
| ⚠️ Under-sized monetary (10,2) | 13 |
| ⚠️ Under-sized monetary (12,2) | 10 |
| 🟡 Close to standard (14,2) | 6 |
| 🔴 Floating point (double) | 1 |
| **Total monetary columns** | **67** |

**Critical finding:** `claims` table has mixed precision — `net_provider_amount` is (15,2) but `requested_amount`, `approved_amount`, `paid_amount` are (12,2). This means calculations derived from these columns can produce inconsistent precision.

---

## Step 3 – Table Usage & Orphan Analysis

### 3A. ORPHAN TABLES (No JPA Entity, No Code Reference)

These tables exist in the database but have **zero Java entity** mapping:

| # | Table | Columns | FK Out | FK In | Status | Origin |
|---|---|---|---|---|---|---|
| 1 | `preauthorization_requests` | 16 | 4 | 1 | 🔴 ORPHAN | Legacy V16 – replaced by `pre_authorizations` |
| 2 | `provider_service_price_import_log` | 10 | 1 | 0 | 🔴 ORPHAN | Legacy – replaced by `provider_service_price_import_logs` (plural) |
| 3 | `icd_codes` | 10 | 0 | 0 | 🔴 ORPHAN | Created V27, entity deleted in Phase 1 |
| 4 | `cpt_codes` | 16 | 0 | 0 | 🔴 ORPHAN | Created V23, entity deleted in Phase 1 |
| 5 | `medical_codes` | 12 | 1 FK out | 0 | 🔴 ORPHAN | Created V3, entity deleted in Phase 1 |
| 6 | `claim_history` | 8 | 1 FK out | 0 | 🔴 ORPHAN | No entity class found |
| 7 | `member_deductibles` | 9 | 1 FK out | 0 | 🔴 ORPHAN | No entity class, FK to members |
| 8 | `network_providers` | 9 | 2 FK out | 0 | 🔴 ORPHAN | No entity class, FKs to employers + providers |
| 9 | `member_policy_assignments` | 7 | 2 FK out | 0 | 🔴 ORPHAN | No entity class, FKs to members + benefit_policies |
| 10 | `provider_contract_service_prices` | 7 | 2 FK out | 0 | 🔴 ORPHAN | No entity class, FKs to contracts + services |

### 3B. SUSPECT TABLES (Have entity but questionable usage)

| # | Table | Entity File | FK In | Concern |
|---|---|---|---|---|
| 1 | `legacy_provider_contracts` | `ProviderContract.java` (SecondaryTable) | 0 | Legacy compat layer — marked DEPRECATED in code |
| 2 | `pre_authorization_audit` | `PreAuthorizationAudit.java` | 0 | Zero FK constraints, no FK references INTO it |

### 3C. DUPLICATE TABLE PAIRS

| Pair | Active Table (has entity) | Orphan Table | Overlapping Columns |
|---|---|---|---|
| Pre-auth | `pre_authorizations` (39 cols) | `preauthorization_requests` (16 cols) | member_id, provider_id, status, created_at |
| Import log | `provider_service_price_import_logs` (20 cols) | `provider_service_price_import_log` (10 cols) | provider_id, file_name, total_rows |

### 3D. COMPLETELY ISOLATED TABLES (no FK in, no FK out)

| Table | Has Entity? | Purpose |
|---|---|---|
| `audit_logs` | ✅ Yes | General audit (system-level) |
| `feature_flags` | ✅ Yes | Feature toggle system |
| `module_access` | ✅ Yes | UI module access config |
| `pdf_company_settings` | ✅ Yes | PDF branding settings |
| `system_settings` | ✅ Yes | System-wide config |
| `user_login_attempts` | ✅ Yes | Security: login tracking |
| `icd_codes` | ❌ ORPHAN | Deleted module |
| `cpt_codes` | ❌ ORPHAN | Deleted module |

*Note: Isolated config/audit tables are expected — they don't need FKs.*

---

## EXECUTIVE SUMMARY

### Risk Matrix

| Finding | Severity | Count | Action Required |
|---|---|---|---|
| Missing FK on financial relationships | 🔴 CRITICAL | 14 columns | Phase 2: Add FK constraints |
| `pre_authorizations` has ZERO FKs | 🔴 CRITICAL | 5 missing | Phase 2: Add FKs |
| `claim_audit_logs` → `claims` no FK | 🔴 CRITICAL | 2 missing | Phase 2: Add FK |
| Monetary precision inconsistency in `claims` | 🔴 CRITICAL | 3 columns | Phase 2: ALTER to (15,2) |
| `medical_packages.total_coverage_limit` is `double` | 🔴 CRITICAL | 1 column | Phase 2: ALTER to NUMERIC(15,2) |
| Orphan tables with no entity | 🟡 MEDIUM | 10 tables | Phase 3: DROP after backup |
| Under-sized monetary columns (10,2)/(12,2) | 🟡 MEDIUM | 23 columns | Phase 2: ALTER to (15,2) |
| Duplicate table pairs | 🟡 MEDIUM | 2 pairs | Phase 3: DROP orphan of each pair |
| `legacy_provider_contracts` still as SecondaryTable | 🟠 LOW | 1 table | Refactor code first, then drop |

### Recommended Phase 2 Actions (In Order)

1. **Add FK constraints** to `claims.settlement_batch_id`, `claims.visit_id`, `claims.pre_authorization_id`
2. **Add FK constraints** to all 5 `pre_authorizations` `_id` columns
3. **Add FK constraints** to `claim_audit_logs.claim_id` and `actor_user_id`
4. **Add FK constraints** to `visits.provider_id`, `medical_service_id`, `medical_category_id`, `eligibility_check_id`
5. **ALTER** `claims.requested_amount`, `approved_amount`, `paid_amount`, `patient_share` from (12,2) → (15,2)
6. **ALTER** `medical_packages.total_coverage_limit` from `double precision` → `NUMERIC(15,2)`
7. **ALTER** remaining 20+ monetary columns to (15,2) for consistency
8. **Backup + DROP** 10 orphan tables: `preauthorization_requests`, `provider_service_price_import_log`, `icd_codes`, `cpt_codes`, `medical_codes`, `claim_history`, `member_deductibles`, `network_providers`, `member_policy_assignments`, `provider_contract_service_prices`

---

*No tables were dropped. No columns were modified. No FKs were added. This is a read-only audit.*
