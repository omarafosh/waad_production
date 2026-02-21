# ═══════════════════════════════════════════════════════════════════════════
# FLYWAY MIGRATION RESET STRATEGY
# ═══════════════════════════════════════════════════════════════════════════
# Created: 2025-12-28
# Purpose: Clean Flyway migration rebuild for TBA-WAAD System
# Database: PostgreSQL 15/16
# ═══════════════════════════════════════════════════════════════════════════

## ═══════════════════════════════════════════════════════════════════════════
## PHASE 1: BACKUP CURRENT DATA (OPTIONAL - IF YOU NEED TO PRESERVE DATA)
## ═══════════════════════════════════════════════════════════════════════════

### Option A: Backup entire database
```bash
# Linux/Mac
pg_dump -h localhost -p 5433 -U postgres -d tba_waad_system -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Windows
pg_dump -h localhost -p 5433 -U postgres -d tba_waad_system -F c -f backup_%date:~0,4%%date:~5,2%%date:~8,2%.dump
```

### Option B: Export critical data only (if you have test data)
```bash
# Export users, roles, organizations (adjust tables as needed)
pg_dump -h localhost -p 5433 -U postgres -d tba_waad_system \
  -t users -t roles -t permissions -t organizations \
  -F c -f critical_data_backup.dump
```

## ═══════════════════════════════════════════════════════════════════════════
## PHASE 2: DROP AND RECREATE DATABASE
## ═══════════════════════════════════════════════════════════════════════════

### Step 1: Connect to PostgreSQL
```bash
# Linux/Mac
psql -h localhost -p 5433 -U postgres

# Windows (from Command Prompt)
psql -h localhost -p 5433 -U postgres
```

### Step 2: Drop and recreate database
```sql
-- Terminate active connections (if any)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'tba_waad_system' AND pid <> pg_backend_pid();

-- Drop database
DROP DATABASE IF EXISTS tba_waad_system;

-- Create fresh database
CREATE DATABASE tba_waad_system
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TEMPLATE = template0;

-- Connect to new database
\c tba_waad_system

-- Verify empty database
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Should return 0
```

### Step 3: Exit psql
```sql
\q
```

## ═══════════════════════════════════════════════════════════════════════════
## PHASE 3: BACKUP OLD MIGRATIONS AND INSTALL NEW ONES
## ═══════════════════════════════════════════════════════════════════════════

### Step 1: Navigate to backend directory
```bash
cd /workspaces/tba_waad_system/backend
```

### Step 2: Backup old migrations (V001-V060)
```bash
# Create backup directory
mkdir -p src/main/resources/db/migration_backup

# Move old migrations to backup
mv src/main/resources/db/migration/V*.sql src/main/resources/db/migration_backup/

# Verify old migrations are backed up
ls -la src/main/resources/db/migration_backup/
```

### Step 3: Move new consolidated migrations to active directory
```bash
# Move new V001-V006 from migration_rebuild to migration
mv src/main/resources/db/migration_rebuild/V*.sql src/main/resources/db/migration/

# Verify new migrations are in place
ls -la src/main/resources/db/migration/

# Expected output:
# V001__core_infrastructure.sql
# V002__business_entities.sql
# V003__medical_and_pricing.sql
# V004__claims_and_approvals.sql
# V005__supporting_tables.sql
# V006__indexes_and_constraints.sql
```

### Step 4: Clean up temporary directory
```bash
rmdir src/main/resources/db/migration_rebuild
```

## ═══════════════════════════════════════════════════════════════════════════
## PHASE 4: VERIFY APPLICATION CONFIGURATION
## ═══════════════════════════════════════════════════════════════════════════

Ensure `src/main/resources/application.yml` has these settings:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate   # ✅ CRITICAL: Must be 'validate' - no auto schema updates!
    show-sql: false
    
  flyway:
    enabled: true          # ✅ Flyway must be enabled
    baseline-on-migrate: true
    baseline-version: '0'
    locations: classpath:db/migration
    validate-on-migrate: true   # ✅ Validate migrations before applying
    out-of-order: false         # ✅ Enforce migration order
```

## ═══════════════════════════════════════════════════════════════════════════
## PHASE 5: RUN FLYWAY MIGRATIONS
## ═══════════════════════════════════════════════════════════════════════════

### Step 1: Clean and compile
```bash
mvn clean compile
```

### Step 2: Run Spring Boot (Flyway will auto-migrate)
```bash
mvn spring-boot:run
```

### Expected Output:
```
INFO  FlywayAutoConfiguration      : Flyway auto-configured
INFO  o.f.c.internal.license.VersionPrinter: Flyway Community Edition X.X.X
INFO  o.f.c.internal.database.base.Database: Database: jdbc:postgresql://localhost:5433/tba_waad_system (PostgreSQL 15.X)
INFO  o.f.core.internal.command.DbValidate: Successfully validated 6 migrations
INFO  o.f.core.internal.command.DbMigrate: Current version of schema "public": << Empty Schema >>
INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "001 - core infrastructure"
INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "002 - business entities"
INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "003 - medical and pricing"
INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "004 - claims and approvals"
INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "005 - supporting tables"
INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "006 - indexes and constraints"
INFO  o.f.core.internal.command.DbMigrate: Successfully applied 6 migrations
INFO  j.LocalContainerEntityManagerFactoryBean: Initialized JPA EntityManagerFactory
INFO  o.s.b.w.embedded.tomcat.TomcatWebServer: Tomcat started on port 8080
INFO  com.waad.tba.TbaWaadSystemApplication: Started TbaWaadSystemApplication in X.XXX seconds
```

## ═══════════════════════════════════════════════════════════════════════════
## PHASE 6: VERIFICATION
## ═══════════════════════════════════════════════════════════════════════════

### Step 1: Check Flyway migration history
```bash
psql -h localhost -p 5433 -U postgres -d tba_waad_system
```

```sql
-- Check Flyway schema history
SELECT installed_rank, version, description, type, script, checksum, installed_on, success 
FROM flyway_schema_history 
ORDER BY installed_rank;

-- Expected: 6 rows (V001 through V006) all with success=true
```

### Step 2: Verify all critical tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected critical tables:
-- ✓ organizations
-- ✓ users, roles, permissions, user_roles, role_permissions
-- ✓ members, family_members, member_attributes
-- ✓ chronic_conditions, member_chronic_conditions
-- ✓ providers, provider_contracts, provider_contract_pricing_items
-- ✓ medical_categories, medical_services, icd_codes, cpt_codes
-- ✓ benefit_policies, benefit_policy_rules
-- ✓ claims, claim_lines, claim_attachments, claim_audit_logs
-- ✓ pre_approvals, pre_approval_rules, pre_authorizations
-- ✓ visits, eligibility_checks
-- ✓ module_access, feature_flags, audit_logs
```

### Step 3: Verify critical column exists (the one that was missing!)
```sql
-- Check for the missing column that caused schema validation errors
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chronic_conditions' 
AND column_name = 'associated_service_codes';

-- Expected: 1 row with type VARCHAR(2000)
```

### Step 4: Verify foreign key constraints
```sql
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- Should see many FK constraints (30+)
```

### Step 5: Test application endpoints
```bash
# Check Swagger UI is accessible
curl http://localhost:8080/swagger-ui.html

# Check actuator health
curl http://localhost:8080/actuator/health

# Expected: {"status":"UP"}
```

## ═══════════════════════════════════════════════════════════════════════════
## PHASE 7: POST-MIGRATION TASKS
## ═══════════════════════════════════════════════════════════════════════════

### Step 1: Seed RBAC data (if needed)
You may need to create seed scripts for:
- Default roles (SUPER_ADMIN, EMPLOYER_ADMIN, etc.)
- Default permissions
- Initial admin user
- System organizations

Create: `src/main/resources/db/migration/V007__seed_rbac_data.sql`

### Step 2: Restore backed-up data (if applicable)
```bash
# If you backed up data and want to restore it
pg_restore -h localhost -p 5433 -U postgres -d tba_waad_system backup_file.dump
```

## ═══════════════════════════════════════════════════════════════════════════
## TROUBLESHOOTING
## ═══════════════════════════════════════════════════════════════════════════

### Problem: SchemaManagementException - Column not found
**Solution**: Ensure all V001-V006 migrations completed successfully. Check Flyway logs.

### Problem: Flyway validation failed
**Solution**: 
```bash
# Clear Flyway metadata and retry (CAUTION: only in development!)
psql -h localhost -p 5433 -U postgres -d tba_waad_system -c "DELETE FROM flyway_schema_history;"
```

### Problem: Port 5433 connection refused
**Solution**: 
```bash
# Check if PostgreSQL Docker container is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres
```

### Problem: Tables already exist
**Solution**: You didn't drop the database. Go back to Phase 2 and drop/recreate.

## ═══════════════════════════════════════════════════════════════════════════
## ROLLBACK PROCEDURE (IF NEEDED)
## ═══════════════════════════════════════════════════════════════════════════

If something goes wrong and you need to go back to old migrations:

```bash
# Stop Spring Boot application (Ctrl+C)

# Restore old migrations
rm src/main/resources/db/migration/V*.sql
mv src/main/resources/db/migration_backup/V*.sql src/main/resources/db/migration/

# Drop and recreate database (Phase 2)
# Restore data backup (if you made one)

# Restart application
mvn spring-boot:run
```

## ═══════════════════════════════════════════════════════════════════════════
## SUCCESS CRITERIA
## ═══════════════════════════════════════════════════════════════════════════

✅ Flyway schema_history shows 6 successful migrations (V001-V006)  
✅ All 40+ tables created without errors  
✅ chronic_conditions.associated_service_codes column exists  
✅ All FK constraints applied correctly  
✅ Hibernate validation passes (no SchemaManagementException)  
✅ EntityManagerFactory initializes successfully  
✅ Tomcat starts on port 8080  
✅ Swagger UI accessible at http://localhost:8080/swagger-ui.html  
✅ No errors in application logs  

## ═══════════════════════════════════════════════════════════════════════════
## NOTES
## ═══════════════════════════════════════════════════════════════════════════

- All new migrations use `IF NOT EXISTS` / `IF EXISTS` for safety
- All migrations are idempotent (can be re-run safely)
- Old V001-V060 migrations are preserved in migration_backup/ folder
- New migrations consolidate 60 incremental migrations into 6 logical groups
- No data is lost if you follow the backup procedure in Phase 1
- Schema validation is enforced via Hibernate ddl-auto=validate

═══════════════════════════════════════════════════════════════════════════
END OF FLYWAY RESET STRATEGY
═══════════════════════════════════════════════════════════════════════════
