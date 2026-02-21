# ═══════════════════════════════════════════════════════════════════════════
# FLYWAY MIGRATION REBUILD - QUICK START
# ═══════════════════════════════════════════════════════════════════════════
# FOR IMMEDIATE EXECUTION - Follow these steps in order
# ═══════════════════════════════════════════════════════════════════════════

## ⚡ EXECUTE THESE COMMANDS NOW

### STEP 1: Navigate to workspace
```bash
cd /workspaces/tba_waad_system
```

### STEP 2: Drop and recreate database
```bash
psql -h localhost -p 5433 -U postgres <<EOF
-- Terminate connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'tba_waad_system' AND pid <> pg_backend_pid();

-- Drop and recreate
DROP DATABASE IF EXISTS tba_waad_system;
CREATE DATABASE tba_waad_system WITH ENCODING='UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8' TEMPLATE=template0;
EOF
```

**Expected output:** `DROP DATABASE` then `CREATE DATABASE`

### STEP 3: Backup old migrations
```bash
cd backend
mkdir -p src/main/resources/db/migration_backup
mv src/main/resources/db/migration/V*.sql src/main/resources/db/migration_backup/ 2>/dev/null || true
```

**Expected:** Old V001-V060 files moved to migration_backup/

### STEP 4: Install new migrations
```bash
mv src/main/resources/db/migration_rebuild/V*.sql src/main/resources/db/migration/
rmdir src/main/resources/db/migration_rebuild 2>/dev/null || true
```

**Expected:** New V001-V006 files now in migration/

### STEP 5: Verify migration files
```bash
ls -1 src/main/resources/db/migration/V*.sql
```

**Expected output:**
```
src/main/resources/db/migration/V001__core_infrastructure.sql
src/main/resources/db/migration/V002__business_entities.sql
src/main/resources/db/migration/V003__medical_and_pricing.sql
src/main/resources/db/migration/V004__claims_and_approvals.sql
src/main/resources/db/migration/V005__supporting_tables.sql
src/main/resources/db/migration/V006__indexes_and_constraints.sql
```

### STEP 6: Build and run
```bash
mvn clean compile
mvn spring-boot:run
```

## ✅ WATCH FOR SUCCESS INDICATORS

You should see these logs in order:

```
✓ Flyway auto-configured
✓ Successfully validated 6 migrations
✓ Migrating schema "public" to version "001 - core infrastructure"
✓ Migrating schema "public" to version "002 - business entities"
✓ Migrating schema "public" to version "003 - medical and pricing"
✓ Migrating schema "public" to version "004 - claims and approvals"
✓ Migrating schema "public" to version "005 - supporting tables"
✓ Migrating schema "public" to version "006 - indexes and constraints"
✓ Successfully applied 6 migrations
✓ Initialized JPA EntityManagerFactory
✓ Tomcat started on port 8080
✓ Started TbaWaadSystemApplication
```

## ❌ STOP IF YOU SEE THESE ERRORS

```
✗ SchemaManagementException
✗ missing column [associated_service_codes]
✗ FlywayException
✗ PSQLException: relation already exists
```

**If errors occur:** Stop (Ctrl+C), check FLYWAY-VERIFICATION-GUIDE.md

## 🎯 QUICK VERIFICATION (Open new terminal)

```bash
# Check Flyway history
psql -h localhost -p 5433 -U postgres -d tba_waad_system -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;"

# Count tables (should be ~45-50)
psql -h localhost -p 5433 -U postgres -d tba_waad_system -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# Verify critical fix
psql -h localhost -p 5433 -U postgres -d tba_waad_system -c "SELECT column_name FROM information_schema.columns WHERE table_name='chronic_conditions' AND column_name='associated_service_codes';"

# Test health endpoint
curl http://localhost:8080/actuator/health
```

**Expected:** All commands return success, health returns `{"status":"UP"}`

## 🚨 ROLLBACK IF NEEDED

```bash
# Stop application (Ctrl+C)
cd /workspaces/tba_waad_system/backend

# Restore old migrations
rm src/main/resources/db/migration/V*.sql
mv src/main/resources/db/migration_backup/V*.sql src/main/resources/db/migration/

# Restart
mvn spring-boot:run
```

## 📚 DETAILED DOCUMENTATION

- **Full deployment guide:** FLYWAY-RESET-STRATEGY.md
- **Verification procedures:** FLYWAY-VERIFICATION-GUIDE.md
- **Complete summary:** FLYWAY-MIGRATION-SUMMARY.md

═══════════════════════════════════════════════════════════════════════════
🚀 READY TO EXECUTE
═══════════════════════════════════════════════════════════════════════════
