# TBA-WAAD Backend Windows Deployment Checklist

**Date:** December 28, 2024  
**Status:** ✅ PRODUCTION-READY FOR LOCAL WINDOWS

---

## 🎯 Executive Summary

The TBA-WAAD backend has been stabilized for local Windows development with:
- Schema alignment via Flyway migrations
- Configuration hardened for `ddl-auto=validate`
- Mail sending disabled for local dev
- Performance indexes Windows-compatible

---

## 📋 Windows Deployment Checklist

### Step 1: Create PostgreSQL Database

```sql
-- Connect to PostgreSQL (pgAdmin or psql)
CREATE DATABASE tba_waad_system;
```

**Or via psql:**
```powershell
psql -U postgres -c "CREATE DATABASE tba_waad_system;"
```

### Step 2: Configure Environment (Optional)

If using non-default settings, set these environment variables:
```powershell
# PowerShell
$env:DB_URL = "jdbc:postgresql://localhost:5432/tba_waad_system"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "12345"
$env:DDL_AUTO = "validate"
$env:FLYWAY_ENABLED = "true"
```

**Default configuration (application.yml):**
- Database URL: `jdbc:postgresql://localhost:5432/tba_waad_system`
- Username: `postgres`
- Password: `12345`
- Port: `5432` (standard PostgreSQL)

### Step 3: Start Backend

```powershell
cd backend
mvn clean spring-boot:run
```

**Or run the JAR:**
```powershell
cd backend
mvn clean package -DskipTests
java -jar target/tba-backend-1.0.0.jar
```

### Step 4: (Optional) Apply Performance Indexes

After schema is created, apply performance indexes:
```powershell
psql -U postgres -d tba_waad_system -f scripts/performance_indexes_optional.sql
```

**Or via pgAdmin:** Copy and execute the content of `scripts/performance_indexes_optional.sql`

---

## ✅ SQL Scripts Classification

### REQUIRED (Keep & Use)

| Script | Purpose | Status |
|--------|---------|--------|
| `V001__core_schema.sql` | Core tables (roles, permissions, organizations, users) | ✅ Active |
| `V002__employers.sql` | Employers table | ✅ Active |
| `V003__benefit_policies.sql` | Benefit policies table | ✅ Active |
| `V004__members.sql` | Members table | ✅ Active |
| `V005__family_members.sql` | Family members table | ✅ Active |
| `V006__member_attributes.sql` | Member attributes (EAV) | ✅ Active |
| `V007__providers.sql` | Providers table | ✅ Active |
| `V008__provider_contracts.sql` | Provider contracts | ✅ Active |
| `V009__medical_services.sql` | Medical services catalog | ✅ Active |
| `V010__pre_approvals.sql` | Pre-approvals workflow | ✅ Active |
| `V011__claims.sql` | Claims workflow | ✅ Active |
| `V012__eligibility_engine.sql` | Eligibility checks | ✅ Active |
| `V013__feature_toggles.sql` | Feature flags | ✅ Active |
| `V014__audit_logs.sql` | Audit logging | ✅ Active |
| `V015__seed_rbac.sql` | RBAC seed data | ✅ Active |
| `V016__seed_users.sql` | User seed data | ✅ Active |
| `V017__seed_sample_data.sql` | Sample data | ✅ Active |
| `V018__create_indexes.sql` | Performance indexes | ✅ Active |
| `V019__fix_user_roles_schema.sql` | User roles fix | ✅ Active |
| `V020__schema_alignment_windows.sql` | **NEW** Entity alignment | ✅ Active |

### OPTIONAL (External Scripts)

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/performance_indexes_optional.sql` | Additional indexes | ✅ Windows-compatible |
| `scripts/seed_tier2_v2.sql` | Performance test data | ✅ Available |

### OBSOLETE (In migration_backup/)

| Script | Status |
|--------|--------|
| `migration_backup/V*__*` | ❌ Archived, do not use |

---

## 🔧 Configuration Summary

### application.yml Changes

| Setting | Before | After |
|---------|--------|-------|
| `spring.jpa.hibernate.ddl-auto` | `update` | `validate` |
| `spring.datasource.url` | `localhost:5433` | `localhost:5432` (default) |
| `spring.mail.host` | `smtp.hostinger.com` | `localhost` (disabled) |
| `spring.mail.test-connection` | N/A | `false` |
| `spring.flyway.enabled` | N/A | `true` |

### Environment Variable Support

```yaml
DB_URL: jdbc:postgresql://localhost:5432/tba_waad_system
DB_USERNAME: postgres
DB_PASSWORD: 12345
DDL_AUTO: validate
FLYWAY_ENABLED: true
SHOW_SQL: false
```

---

## 🛡️ Schema Alignment (V020)

### Tables Created by V020

1. **visits** - Visit tracking
2. **companies** - Legacy TPA companies
3. **company_settings** - Company configurations
4. **reviewer_companies** - Reviewer assignments
5. **claim_attachments** - Claim file attachments
6. **claim_audit_logs** - Claim audit trail
7. **password_reset_tokens** - Password reset
8. **icd_codes** - ICD medical codes
9. **cpt_codes** - CPT procedure codes
10. **chronic_conditions** - Chronic disease catalog
11. **member_chronic_conditions** - Member conditions
12. **pre_authorizations** - Pre-auth requests
13. **pre_approval_rules** - Approval rules
14. **module_access** - Module permissions
15. **feature_flags** - Feature toggles
16. **provider_contracts** - Provider contracts
17. **provider_contract_pricing_items** - Contract pricing

### Columns Added to Existing Tables

- **audit_logs**: `timestamp`, `details`
- **members**: `employer_org_id`, `insurance_org_id`, `eligibility_updated_at`
- **claims**: `insurance_org_id`, `provider_name`, `doctor_name`, `patient_copay`, etc.
- **providers**: `tax_number`, `contract_start_date`, `contract_end_date`
- **benefit_policies**: `employer_org_id`, `start_date`, `end_date`
- **pre_approvals**: `approval_number`, `type`, `visit_id`, etc.

---

## ✅ Verification Commands

### Test Build
```powershell
cd backend
mvn clean package -DskipTests
# Expected: BUILD SUCCESS
```

### Test Startup
```powershell
mvn spring-boot:run
# Expected: Application started on port 8080
# Expected: No schema validation errors
```

### Test Database Connection
```powershell
psql -U postgres -d tba_waad_system -c "\dt"
# Expected: List of all tables
```

---

## 🚨 Troubleshooting

### "Table X does not exist" Error
**Cause:** Flyway migrations haven't run  
**Fix:** Ensure `spring.flyway.enabled=true` and restart

### "Column Y does not exist" Error
**Cause:** V020 migration didn't apply  
**Fix:** Check `flyway_schema_history` table for V020 status

### Connection Refused on Port 5432
**Cause:** PostgreSQL not running or wrong port  
**Fix:** 
- Start PostgreSQL service
- Or change `DB_URL` to use your custom port (e.g., 5433)

### "Permission name constraint violation"
**Cause:** Duplicate permission names  
**Fix:** V020 handles this, but if needed run:
```sql
UPDATE permissions SET name = code WHERE name IS NULL;
```

---

## ✅ Confirmation Statement

**Backend is now portable between Codespaces (Linux) and Local Windows.**

- ✅ Maven build passes
- ✅ All Flyway migrations execute in order
- ✅ Schema validates against JPA entities
- ✅ No Hibernate auto-schema changes
- ✅ Mail sending disabled for local dev
- ✅ Performance indexes Windows-compatible
- ✅ RBAC permissions auto-sync on startup

---

## 📝 Maintenance Notes

1. **Adding new entities:** Create new `V0XX__*.sql` migration
2. **Schema changes:** Never modify existing migrations, create new ones
3. **Production deployment:** Ensure `DDL_AUTO=validate` always
4. **Testing with data:** Use `seed_tier2_v2.sql` after schema creation

---

*Generated: December 28, 2024*  
*TBA WAAD System - Production-Grade Stabilization*
