# ═══════════════════════════════════════════════════════════════
# SCHEMA CONSISTENCY AUDIT REPORT
# ═══════════════════════════════════════════════════════════════
# Generated: 2025-12-28T22:01:42.677136361
# Database: PostgreSQL (tba_waad_system)
# ═══════════════════════════════════════════════════════════════

## 📊 SUMMARY

| Category | Count |
|----------|-------|
| Missing Tables | 1 |
| Extra Tables | 4 |
| Missing Columns | 3 |
| Extra Columns | 3 |

## ❌ MISSING TABLES (Defined in JPA but not in Database)

### `password_reset_token`
Columns: email, expiry_time, id, otp

## ⚠️ EXTRA TABLES (In Database but not defined in JPA)

These tables may be legacy or manually created:
- `medical_package_services`
- `password_reset_tokens`
- `role_permissions`
- `user_roles`

## ❌ MISSING COLUMNS (Defined in JPA but not in Database)

**CRITICAL**: These columns must be added via Flyway migration!

### Table: `medical_packages`

| Column Name | Type |
|-------------|------|
| `total_coverage_limit` | Double |

### Table: `member_import_errors`

| Column Name | Type |
|-------------|------|
| `error_field` | String |
| `row_data` | String |

### Table: `visits`

| Column Name | Type |
|-------------|------|
| `active` | Boolean |
| `diagnosis` | String |
| `employer_org_id` | Organization |
| `specialty` | String |
| `total_amount` | BigDecimal |
| `treatment` | String |

## ⚠️ EXTRA COLUMNS (In Database but not in JPA)

These columns may be legacy or deprecated:

### Table: `medical_packages`
- `created_by`
- `discount_percent`
- `package_type`
- `total_price`
- `updated_by`

### Table: `member_import_errors`
- `field_name`
- `field_value`

### Table: `visits`
- `chief_complaint`
- `department`
- `diagnosis_code`
- `diagnosis_description`
- `status`
- `visit_type`

## 📋 RECOMMENDATIONS

1. Review the generated migration file: `V999__schema_alignment_missing_columns.sql`
2. Verify the SQL statements are correct
3. Apply the migration via Flyway
4. Restart the application with `ddl-auto=validate`
5. Ensure no SchemaManagementException errors occur

═══════════════════════════════════════════════════════════════
