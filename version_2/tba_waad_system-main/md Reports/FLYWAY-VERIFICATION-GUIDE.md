# ═══════════════════════════════════════════════════════════════════════════
# FLYWAY MIGRATION VERIFICATION GUIDE
# ═══════════════════════════════════════════════════════════════════════════
# Purpose: Step-by-step verification checklist for Flyway migration success
# Database: PostgreSQL 15/16
# ═══════════════════════════════════════════════════════════════════════════

## 📋 PRE-FLIGHT CHECKLIST

Before running migrations, verify:

- [ ] PostgreSQL is running (port 5433 or 5432)
- [ ] Database `tba_waad_system` exists (or will be created fresh)
- [ ] application.yml has `ddl-auto: validate`
- [ ] application.yml has `flyway.enabled: true`
- [ ] New migrations (V001-V006) are in `src/main/resources/db/migration/`
- [ ] Old migrations (V001-V060) are backed up to `db/migration_backup/`

## 🚀 STEP 1: BUILD AND RUN

```bash
cd /workspaces/tba_waad_system/backend

# Clean build
mvn clean compile

# Run Spring Boot
mvn spring-boot:run
```

## ✅ STEP 2: VERIFY FLYWAY LOGS

Look for these specific log messages:

### ✅ Expected SUCCESS logs:

```
✓ INFO  FlywayAutoConfiguration: Flyway auto-configured
✓ INFO  o.f.c.internal.license.VersionPrinter: Flyway Community Edition
✓ INFO  o.f.c.internal.database.base.Database: Database: jdbc:postgresql://localhost:5433/tba_waad_system
✓ INFO  o.f.core.internal.command.DbValidate: Successfully validated 6 migrations
✓ INFO  o.f.core.internal.command.DbMigrate: Current version of schema "public": << Empty Schema >>
✓ INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "001 - core infrastructure"
✓ INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "002 - business entities"
✓ INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "003 - medical and pricing"
✓ INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "004 - claims and approvals"
✓ INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "005 - supporting tables"
✓ INFO  o.f.core.internal.command.DbMigrate: Migrating schema "public" to version "006 - indexes and constraints"
✓ INFO  o.f.core.internal.command.DbMigrate: Successfully applied 6 migrations to schema "public"
```

### ❌ Should NOT see these ERROR messages:

```
✗ ERROR o.s.boot.SpringApplication: Application run failed
✗ SchemaManagementException: Schema-validation: missing column [associated_service_codes]
✗ FlywayException: Validate failed: Migrations have failed validation
✗ PSQLException: relation "chronic_conditions" already exists
```

## ✅ STEP 3: VERIFY HIBERNATE VALIDATION

Look for Hibernate JPA initialization:

```
✓ INFO  j.LocalContainerEntityManagerFactoryBean: Initialized JPA EntityManagerFactory for persistence unit 'default'
✓ INFO  o.h.e.t.j.p.i.JtaPlatformInitiator: HHH000490: Using JtaPlatform implementation: org.hibernate.engine.transaction.jta.platform.internal.NoJtaPlatform
```

### Should NOT see:

```
✗ ERROR o.h.tool.schema.spi.SchemaManagementException: Schema-validation failed
✗ ERROR o.h.tool.hbm2ddl.SchemaValidator: HHH000424: Missing table [...]
✗ ERROR o.h.tool.hbm2ddl.SchemaValidator: HHH000423: Missing column [...]
```

## ✅ STEP 4: VERIFY TOMCAT STARTUP

```
✓ INFO  o.s.b.w.embedded.tomcat.TomcatWebServer: Tomcat initialized with port 8080
✓ INFO  o.s.b.w.embedded.tomcat.TomcatWebServer: Tomcat started on port 8080 (http)
✓ INFO  com.waad.tba.TbaWaadSystemApplication: Started TbaWaadSystemApplication in X.XXX seconds
```

## ✅ STEP 5: DATABASE VERIFICATION

Open a new terminal and connect to PostgreSQL:

```bash
psql -h localhost -p 5433 -U postgres -d tba_waad_system
```

### 5.1 Check Flyway Migration History

```sql
SELECT installed_rank, version, description, type, success, installed_on 
FROM flyway_schema_history 
ORDER BY installed_rank;
```

**Expected output:**
```
 installed_rank | version | description                    | type | success | installed_on        
----------------+---------+--------------------------------+------+---------+---------------------
              1 | 001     | core infrastructure            | SQL  | t       | 2025-12-28 ...
              2 | 002     | business entities              | SQL  | t       | 2025-12-28 ...
              3 | 003     | medical and pricing            | SQL  | t       | 2025-12-28 ...
              4 | 004     | claims and approvals           | SQL  | t       | 2025-12-28 ...
              5 | 005     | supporting tables              | SQL  | t       | 2025-12-28 ...
              6 | 006     | indexes and constraints        | SQL  | t       | 2025-12-28 ...
```

✅ All `success` should be `t` (true)

### 5.2 Count Tables

```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
```

**Expected:** ~45-50 tables (excluding flyway_schema_history)

### 5.3 Verify Core Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'organizations', 'users', 'roles', 'permissions',
    'members', 'chronic_conditions', 'providers', 
    'claims', 'benefit_policies', 'medical_services'
  )
ORDER BY table_name;
```

**Expected:** All 10 tables should exist

### 5.4 CRITICAL: Verify Missing Column Fixed

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'chronic_conditions' 
  AND column_name = 'associated_service_codes';
```

**Expected output:**
```
       column_name        | data_type |  character_maximum_length 
--------------------------+-----------+---------------------------
 associated_service_codes | character varying | 2000
(1 row)
```

✅ This column MUST exist - it was the root cause of schema validation errors!

### 5.5 Verify Foreign Key Constraints

```sql
SELECT COUNT(*) 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
  AND table_schema = 'public';
```

**Expected:** ~30-40 foreign key constraints

### 5.6 Verify Indexes

```sql
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename NOT IN ('flyway_schema_history');
```

**Expected:** ~40-60 indexes

## ✅ STEP 6: APPLICATION ENDPOINT VERIFICATION

### 6.1 Health Check

```bash
curl http://localhost:8080/actuator/health
```

**Expected:**
```json
{"status":"UP"}
```

### 6.2 Swagger UI

Open browser:
```
http://localhost:8080/swagger-ui.html
```

✅ Should load without errors and show all API endpoints

### 6.3 Sample API Call (if endpoints exist)

```bash
# Test RBAC endpoints
curl -X GET "http://localhost:8080/api/roles" -H "accept: application/json"

# Test organization endpoints
curl -X GET "http://localhost:8080/api/organizations" -H "accept: application/json"
```

## ✅ STEP 7: LOGS VERIFICATION

Check application logs for NO errors:

```bash
tail -f /workspaces/tba_waad_system/backend/logs/application.log
```

### Should NOT see:

- ❌ SchemaManagementException
- ❌ ConstraintViolationException
- ❌ PSQLException
- ❌ FlywayException
- ❌ Bean creation errors
- ❌ EntityManagerFactory initialization failures

## 🎯 SUCCESS CRITERIA CHECKLIST

Mark each as complete:

- [ ] Flyway validated 6 migrations successfully
- [ ] Flyway applied all 6 migrations without errors
- [ ] flyway_schema_history shows 6 rows with success=true
- [ ] ~45+ tables created in public schema
- [ ] chronic_conditions.associated_service_codes column exists
- [ ] 30+ foreign key constraints created
- [ ] 40+ indexes created
- [ ] Hibernate validation passed (no SchemaManagementException)
- [ ] EntityManagerFactory initialized successfully
- [ ] Tomcat started on port 8080
- [ ] Swagger UI loads correctly
- [ ] Health endpoint returns {"status":"UP"}
- [ ] No errors in application logs
- [ ] RBAC entities initialized properly

## 🔧 TROUBLESHOOTING

### Problem: "Missing column [associated_service_codes]"

**Cause:** V002 migration didn't run or failed  
**Solution:**
```sql
-- Check if migration completed
SELECT * FROM flyway_schema_history WHERE version = '002';

-- If success=false, manually add column:
ALTER TABLE chronic_conditions 
ADD COLUMN IF NOT EXISTS associated_service_codes VARCHAR(2000);
```

### Problem: "Table 'chronic_conditions' already exists"

**Cause:** Database wasn't dropped before re-running migrations  
**Solution:** Go back to FLYWAY-RESET-STRATEGY.md Phase 2 and drop/recreate database

### Problem: Flyway validation failed

**Cause:** Checksum mismatch or out-of-order migrations  
**Solution (DEV ONLY):**
```sql
-- Clear Flyway history and retry
DELETE FROM flyway_schema_history;
```

Then restart application.

### Problem: Port 5433 connection refused

**Cause:** PostgreSQL not running  
**Solution:**
```bash
# Check Docker container
docker ps | grep postgres

# Start if needed
docker-compose up -d postgres
```

### Problem: Too many foreign key constraint errors

**Cause:** V006 indexes/constraints migration failed  
**Solution:** Check V006 migration logs, verify all referenced tables exist

## 📊 DETAILED TABLE VERIFICATION

Run this comprehensive check:

```sql
-- Comprehensive table and column check
SELECT 
    t.table_name,
    COUNT(c.column_name) as column_count,
    COUNT(tc.constraint_name) as constraint_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name != 'flyway_schema_history'
GROUP BY t.table_name
ORDER BY t.table_name;
```

**Expected output:** Should show 40+ tables with varying column and constraint counts

## 🎉 FINAL VERIFICATION

If ALL checks pass:

✅ **MIGRATION SUCCESSFUL**

Your Flyway migration rebuild is complete! The schema is clean, properly normalized, and validated by Hibernate.

Next steps:
1. Run any seed data scripts (RBAC roles, permissions, sample data)
2. Test full application functionality
3. Deploy to staging/production following the same process

═══════════════════════════════════════════════════════════════════════════
END OF VERIFICATION GUIDE
═══════════════════════════════════════════════════════════════════════════
