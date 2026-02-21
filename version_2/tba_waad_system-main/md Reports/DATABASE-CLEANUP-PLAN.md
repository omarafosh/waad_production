# PostgreSQL Database Cleanup & Rebuild Plan

## TBA-WAAD System - Policy-Free Migration

**Date:** 2025-12-27  
**Status:** 📋 PLAN (No SQL Executed)

---

## 📊 SCRIPT ANALYSIS SUMMARY

### `/backend/database/` Scripts

| Script | Purpose | Action | Reason |
|--------|---------|--------|--------|
| `benefit_policies_permissions.sql` | Add RBAC perms for BenefitPolicy | ✅ **KEEP** | PostgreSQL, aligns with architecture |
| `complete_rbac_fix.sql` | Complete RBAC setup | ❌ **DELETE** | MySQL syntax (START TRANSACTION, INSERT IGNORE, ON DUPLICATE KEY), references legacy `INSURANCE_COMPANIES`, `POLICIES` permissions |
| `medical_categories_migration.sql` | Create medical_categories | ❌ **DELETE** | MySQL syntax (AUTO_INCREMENT, ENGINE=InnoDB, ON DUPLICATE KEY UPDATE) |
| `medical_packages_migration.sql` | Create medical_packages | ✏️ **MODIFY** | Already PostgreSQL but has INSERT that conflicts with permissions table |
| `medical_services_timestamps_migration.sql` | Add timestamps to medical_services | ❌ **DELETE** | MySQL syntax (ON UPDATE CURRENT_TIMESTAMP) |
| `rbac_schema.sql` | RBAC tables schema | ✏️ **MODIFY** | Good PostgreSQL, but has legacy `MANAGE_INSURANCE_COMPANIES` permission |
| `seed_rbac_mysql.sql` | Seed RBAC data | ❌ **DELETE** | MySQL syntax, references `POLICY_*`, `BENEFIT_PACKAGE_*` permissions |
| `super_admin_permissions_sync.sql` | Sync SUPER_ADMIN perms | ❌ **DELETE** | MySQL syntax (INSERT IGNORE) |

### `/backend/src/main/resources/db/migration/` Scripts

| Script | Purpose | Action | Reason |
|--------|---------|--------|--------|
| `V001__create_organizations_table.sql` | Organizations table | ✅ **KEEP** | Clean PostgreSQL |
| `V002__add_organization_fk_columns.sql` | Add org FK columns | 🔀 **MERGE** → delete | References `policies`, `insurance_org_id` |
| `V003__backfill_organizations.sql` | Backfill orgs from legacy | ❌ **DELETE** | References `insurance_companies` table |
| `V004__backfill_organization_fks.sql` | Backfill FK data | ❌ **DELETE** | References `insurance_companies`, `policies` |
| `V005__add_organization_constraints.sql` | Add org FK constraints | 🔀 **MERGE** → delete | References `policies`, `insurance_org_id` |
| `V006__rollback_instructions.sql` | Rollback docs | ❌ **DELETE** | Not needed for clean migration |
| `V9__company_feature_toggles.sql` | CompanySettings table | ✅ **KEEP** | Clean PostgreSQL |
| `V10__company_ui_visibility.sql` | UI visibility JSONB | ✅ **KEEP** | Clean PostgreSQL |
| `V11__member_family_refactor.sql` | Members + family_members | ✏️ **MODIFY** | Has `benefit_package_id` column (legacy) |
| `V13__insurance_policies_and_benefit_packages.sql` | Insurance policies tables | ❌ **DELETE** | Creates `insurance_policies`, `policy_benefit_packages` - LEGACY |
| `V14__pre_approvals.sql` | Pre-approvals table | ✅ **KEEP** | Clean PostgreSQL |
| `V15__claims.sql` | Claims tables | ✏️ **MODIFY** | References `insurance_company_id`, `insurance_policy_id`, `benefit_package_id` |
| `V16__provider_network.sql` | Providers table | ✅ **KEEP** | Clean PostgreSQL |
| `V17__refactor_employers_remove_company_relation.sql` | Employer cleanup | ✅ **KEEP** | Clean PostgreSQL |
| `V20__enhanced_provider_contracts.sql` | Provider contracts | ✅ **KEEP** | Clean PostgreSQL |
| `V21__provider_contracts_rbac.sql` | Provider contracts RBAC | ✅ **KEEP** | Clean PostgreSQL |
| `V22__seed_benefit_policies.sql` | Seed benefit policies | ✅ **KEEP** | Clean PostgreSQL, BenefitPolicy focused |
| `V23__seed_provider_contracts.sql` | Seed provider contracts | ✅ **KEEP** | Clean PostgreSQL |
| `V8_2__create_indexes_phase_8_2.sql` | Performance indexes | ✏️ **MODIFY** | Has `insurance_company_id` indexes |
| `V999__seed_fixed_users.sql` | Seed users | ✏️ **MODIFY** | Uses `@default_password` MySQL variable syntax |
| `V2025_12_23_001__eligibility_engine.sql` | Eligibility checks table | ✅ **KEEP** | Clean PostgreSQL |
| `V2025_12_23_002__member_attributes_and_import.sql` | Member attributes | ✅ **KEEP** | Clean PostgreSQL |
| `V2025_12_24_001__remove_insurance_companies.sql` | Remove insurance_companies | ❌ **DELETE** | Uses MySQL `DROP FOREIGN KEY` syntax |

### `/backend/src/main/resources/db/` (Non-Migration)

| Script | Action | Reason |
|--------|--------|--------|
| `create-super-admin.sql` | 🔀 **MERGE** → V015 | Clean PostgreSQL |
| `create-super-admin-complete.sql` | 🔀 **MERGE** → V015 | Clean PostgreSQL with permissions |
| `fix-permissions.sql` | ❌ **DELETE** | Ad-hoc fixes not needed |

---

## 🏗️ FINAL MIGRATION STRUCTURE

### Clean PostgreSQL Migration Order

```
backend/src/main/resources/db/migration/
├── V001__core_schema.sql                  # Base tables: organizations, companies
├── V002__rbac_schema.sql                  # RBAC: roles, permissions, user_roles, role_permissions
├── V003__employers.sql                    # Employers table
├── V004__medical_services.sql             # medical_categories, medical_services, medical_packages
├── V005__members.sql                      # members, family_members, member_attributes
├── V006__benefit_policies.sql             # benefit_policies, benefit_policy_rules
├── V007__providers.sql                    # providers table
├── V008__provider_contracts.sql           # provider_contracts, provider_contract_pricing_items
├── V009__visits.sql                       # visits table
├── V010__pre_approvals.sql                # pre_approvals table
├── V011__claims.sql                       # claims, claim_lines, claim_attachments
├── V012__eligibility_engine.sql           # eligibility_checks table
├── V013__audit_logs.sql                   # audit_logs table
├── V014__company_settings.sql             # company_settings table
├── V015__seed_rbac.sql                    # Seed roles, permissions, role_permissions
├── V016__seed_super_admin.sql             # Seed SUPER_ADMIN user
├── V017__seed_reference_data.sql          # Seed ONE employer, ONE benefit_policy, medical categories
├── V018__create_indexes.sql               # Performance indexes
```

---

## 📋 DETAILED MIGRATION CONTENTS

### V001__core_schema.sql
```sql
-- Organizations (unified org entity)
-- Companies (TPA entity)
-- Basic update_updated_at trigger function
```

### V002__rbac_schema.sql
```sql
-- users
-- roles  
-- permissions
-- user_roles
-- role_permissions
```

### V003__employers.sql
```sql
-- employers (name_ar, name_en, code, active, etc.)
```

### V004__medical_services.sql
```sql
-- medical_categories
-- medical_services
-- medical_packages
-- medical_package_services (junction)
```

### V005__members.sql
```sql
-- members (NO policy_id, NO insurance_company_id)
--   FK: employer_id → employers
--   FK: benefit_policy_id → benefit_policies (nullable for migration)
-- family_members
-- member_attributes
-- member_import_logs
-- member_import_errors
```

### V006__benefit_policies.sql
```sql
-- benefit_policies (canonical policy model)
--   FK: employer_org_id → organizations
-- benefit_policy_rules
--   FK: benefit_policy_id → benefit_policies
--   FK: medical_service_id → medical_services
--   FK: medical_category_id → medical_categories
```

### V007__providers.sql
```sql
-- providers
```

### V008__provider_contracts.sql
```sql
-- provider_contracts
-- provider_contract_pricing_items
```

### V009__visits.sql
```sql
-- visits
--   FK: member_id → members
--   FK: provider_id → providers
--   FK: employer_id → employers
```

### V010__pre_approvals.sql
```sql
-- pre_approvals (NO insurance_company_id)
-- chronic_conditions
-- member_chronic_conditions
-- pre_approval_rules
```

### V011__claims.sql
```sql
-- claims (NO insurance_company_id, NO insurance_policy_id)
--   FK: member_id → members
--   FK: pre_approval_id → pre_approvals
--   FK: provider_id → providers
--   FK: benefit_policy_id → benefit_policies (NEW)
-- claim_lines
-- claim_attachments
-- claim_audit_logs
```

### V012__eligibility_engine.sql
```sql
-- eligibility_checks
```

### V013__audit_logs.sql
```sql
-- audit_logs
-- feature_flags
-- module_access
```

### V014__company_settings.sql
```sql
-- company_settings
```

### V015__seed_rbac.sql
```sql
-- INSERT roles: SUPER_ADMIN, ADMIN, INSURANCE_ADMIN, EMPLOYER_ADMIN, REVIEWER, PROVIDER
-- INSERT permissions (NO insurance_company, NO policy permissions)
-- INSERT role_permissions mappings
```

### V016__seed_super_admin.sql
```sql
-- INSERT users: superadmin
-- INSERT user_roles: superadmin → SUPER_ADMIN
```

### V017__seed_reference_data.sql
```sql
-- INSERT one sample employer
-- INSERT one sample benefit_policy for that employer
-- INSERT medical_categories (basic set)
```

### V018__create_indexes.sql
```sql
-- All performance indexes
```

---

## ❌ FILES TO DELETE

### From `/backend/database/`
1. `complete_rbac_fix.sql` - MySQL syntax, legacy permissions
2. `medical_categories_migration.sql` - MySQL syntax
3. `medical_services_timestamps_migration.sql` - MySQL syntax
4. `seed_rbac_mysql.sql` - MySQL syntax, legacy permissions
5. `super_admin_permissions_sync.sql` - MySQL syntax

### From `/backend/src/main/resources/db/migration/`
1. `V002__add_organization_fk_columns.sql` - Legacy FKs
2. `V003__backfill_organizations.sql` - References insurance_companies
3. `V004__backfill_organization_fks.sql` - References insurance_companies
4. `V005__add_organization_constraints.sql` - Legacy FKs
5. `V006__rollback_instructions.sql` - Not needed
6. `V13__insurance_policies_and_benefit_packages.sql` - Creates LEGACY tables
7. `V2025_12_24_001__remove_insurance_companies.sql` - MySQL syntax

### From `/backend/src/main/resources/db/`
1. `fix-permissions.sql` - Ad-hoc not needed

---

## ⚠️ LEGACY CONCEPTS TO REMOVE

### Tables NOT to Create
| Table | Reason |
|-------|--------|
| `policies` | Replaced by `benefit_policies` |
| `benefit_packages` | Replaced by `benefit_policy_rules` |
| `insurance_companies` | No insurance company concept |
| `insurance_policies` | No separate insurance policies |
| `policy_benefit_packages` | Legacy structure |

### Columns NOT to Create
| Column | Table | Reason |
|--------|-------|--------|
| `policy_id` | members | Use `benefit_policy_id` |
| `insurance_company_id` | members, claims | No insurance company |
| `insurance_policy_id` | claims | Use `benefit_policy_id` |
| `benefit_package_id` | members | Replaced by `benefit_policy_id` |
| `insurance_org_id` | any | No insurance organization |

### Permissions NOT to Create
```sql
-- DO NOT CREATE:
'VIEW_POLICIES'
'MANAGE_POLICIES'
'VIEW_BENEFIT_PACKAGES'
'MANAGE_BENEFIT_PACKAGES'
'VIEW_INSURANCE_COMPANIES'
'MANAGE_INSURANCE_COMPANIES'
'POLICY_READ'
'POLICY_CREATE'
'POLICY_UPDATE'
'POLICY_DELETE'
'BENEFIT_PACKAGE_READ'
'BENEFIT_PACKAGE_CREATE'
'BENEFIT_PACKAGE_UPDATE'
'BENEFIT_PACKAGE_DELETE'
```

---

## 🧠 EXECUTION NOTES

### Before Running Migrations
1. **DROP DATABASE** completely
2. **CREATE DATABASE** fresh
3. Run migrations in order V001 → V018
4. Verify all tables created
5. Verify SUPER_ADMIN can login

### Dependencies Order
```
V001 (organizations, companies)
  └── V002 (RBAC) 
        └── V003 (employers)
              └── V004 (medical_services)
                    └── V005 (members) → depends on employers
                          └── V006 (benefit_policies) → depends on organizations
                                └── V007 (providers)
                                      └── V008 (provider_contracts)
                                            └── V009 (visits) → depends on members, providers
                                                  └── V010 (pre_approvals)
                                                        └── V011 (claims) → depends on members, benefit_policies
                                                              └── V012-V018 (independent)
```

### Post-Migration Validation
```sql
-- Check no legacy tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('policies', 'benefit_packages', 'insurance_companies', 'insurance_policies');
-- Expected: 0 rows

-- Check benefit_policies exists
SELECT COUNT(*) FROM benefit_policies;
-- Expected: 1+ row (seeded)

-- Check SUPER_ADMIN has all permissions
SELECT COUNT(*) FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'SUPER_ADMIN';
-- Expected: equals total permissions count
```

---

## 📁 BACKEND ENTITY ALIGNMENT

### Current Entities (Keep)
| Entity | Table | Status |
|--------|-------|--------|
| `Organization` | `organizations` | ✅ Keep |
| `Company` | `companies` | ✅ Keep (TPA entity) |
| `Employer` | `employers` | ✅ Keep |
| `Member` | `members` | ✅ Keep |
| `FamilyMember` | `family_members` | ✅ Keep |
| `BenefitPolicy` | `benefit_policies` | ✅ Keep (CANONICAL) |
| `BenefitPolicyRule` | `benefit_policy_rules` | ✅ Keep |
| `Provider` | `providers` | ✅ Keep |
| `ProviderContract` | `provider_contracts` | ✅ Keep |
| `Claim` | `claims` | ✅ Keep |
| `ClaimLine` | `claim_lines` | ✅ Keep |
| `Visit` | `visits` | ✅ Keep |
| `PreApproval` | `pre_approvals` | ✅ Keep |
| `EligibilityCheck` | `eligibility_checks` | ✅ Keep |
| `User` | `users` | ✅ Keep |
| `Role` | `roles` | ✅ Keep |
| `Permission` | `permissions` | ✅ Keep |
| `AuditLog` | `audit_logs` | ✅ Keep |
| `MedicalCategory` | `medical_categories` | ✅ Keep |
| `MedicalService` | `medical_services` | ✅ Keep |
| `MedicalPackage` | `medical_packages` | ✅ Keep |

### Entities to Keep but NOT Migrate Data
| Entity | Table | Reason |
|--------|-------|--------|
| `Policy` | `policies` | ⚠️ Entity exists but table NOT created |
| `BenefitPackage` | `benefit_packages` | ⚠️ Entity exists but table NOT created |

### ⚠️ JAVA CODE WARNING
The following entity files still exist in the codebase:
- `Policy.java` - Has `@Table(name = "policies")`
- `BenefitPackage.java` - Has `@Table(name = "benefit_packages")`

**Recommendation:** These entities should be deleted from Java code in a separate PR after database migration is stable.

---

## 📊 FINAL DELIVERABLE SUMMARY

| Category | Count |
|----------|-------|
| Scripts to DELETE | **12** |
| Scripts to MODIFY | **5** |
| Scripts to KEEP | **12** |
| Scripts to MERGE | **2** |
| New Migration Files | **18** |
| Legacy Tables Removed | **5** |
| Legacy Columns Removed | **6+** |
| Legacy Permissions Removed | **12+** |

---

## ✅ SUCCESS CRITERIA

After migration:
1. ✅ Database can be dropped and recreated
2. ✅ All migrations run without errors
3. ✅ No legacy tables exist (policies, benefit_packages, insurance_companies)
4. ✅ BenefitPolicy is the single source for coverage
5. ✅ SUPER_ADMIN can login with Admin@123
6. ✅ All FK constraints are valid
7. ✅ Spring Boot application starts successfully

---

**Next Steps:** Create the 18 clean PostgreSQL migration files based on this plan.
