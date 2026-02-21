# RBAC Architecture Restructure Report

**Date:** 2026-02-08  
**Type:** Database Migration Strategy & Backend Architecture  
**Status:** ✅ Complete

---

## Executive Summary

This report documents the restructuring of the RBAC (Role-Based Access Control) system to establish a clean, production-grade architecture where:

- ✅ Database migrations define **SCHEMA ONLY**
- ✅ NO permissions or role assignments via SQL migrations
- ✅ SUPER_ADMIN has **ALL permissions dynamically** (backend logic)
- ✅ All other roles managed **exclusively via UI**
- ✅ No migration ever reassigns or mutates role permissions

---

## Migration Files Analysis

### Files REMOVED (Moved to `migration_deprecated/`)

| File | Issue | Impact |
|------|-------|--------|
| `V002__seed_data.sql` | Seeds permissions, roles, and role-permission mappings | Overwrites UI changes on every fresh deploy |
| `V007__settlement_permissions.sql` | Inserts permissions and assigns to multiple roles | Causes permission drift |
| `V050__rbac_hardening.sql` | **DELETES ALL** role_permissions and re-inserts | Complete permission reset |
| `V051__permission_sync.sql` | **DELETES** SUPER_ADMIN permissions and re-inserts | Overwrites admin configuration |
| `V052__permission_cleanup.sql` | Modifies permissions, assigns to SUPER_ADMIN | Unexpected permission changes |
| `V053__missing_permissions.sql` | Inserts permissions and assigns to roles | Permission drift |

### Files RETAINED (Active Migrations)

| File | Purpose |
|------|---------|
| `V001__baseline_schema.sql` | Base schema creation (no data) |
| `V003__financial_indexes.sql` | Performance indexes |
| `V004__add_medical_category_columns.sql` | Schema extension |
| `V005__add_coverage_snapshot_columns.sql` | Schema extension |
| `V006__provider_account_settlement.sql` | Schema extension |
| `V054__add_member_enhanced_fields.sql` | Schema extension |
| `V055__canonical_medical_services_and_pricing.sql` | Schema extension |
| `V056__enforce_financial_not_null.sql` | Constraint enforcement |
| `V057__fix_critical_schema_mismatches.sql` | Schema fixes |
| `V058__provider_partner_isolation.sql` | Schema extension |
| `V059__provider_admin_documents.sql` | Schema extension |
| **`V060__clean_rbac_schema.sql`** | **NEW: Clean RBAC setup** |

---

## New RBAC Architecture

### 1. Database Layer (Migrations)

**Principle:** Schema Only, No Data

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│  roles              │ id, name, description                 │
│  permissions        │ id, name, module, description         │
│  role_permissions   │ role_id, permission_id (junction)     │
│  user_roles         │ user_id, role_id (junction)           │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ SCHEMA ONLY
                           │ No INSERT statements
```

### 2. Backend Layer (Application Startup)

**File:** `RbacDataInitializer.java`

```
┌─────────────────────────────────────────────────────────────┐
│                 RbacDataInitializer v3.0                     │
│                    (SAFE MODE)                               │
├─────────────────────────────────────────────────────────────┤
│  ✅ Creates SUPER_ADMIN role (if not exists)                │
│  ✅ Creates superadmin user (if not exists)                 │
│  ❌ Does NOT create permissions                              │
│  ❌ Does NOT assign permissions to roles                     │
│  ❌ Does NOT modify existing data                            │
└─────────────────────────────────────────────────────────────┘
```

### 3. Dynamic SUPER_ADMIN Permissions

**File:** `CustomUserDetailsService.java`

```java
// At login time, SUPER_ADMIN receives ALL permissions:
if (isSuperAdmin) {
    List<Permission> allPermissions = permissionRepository.findAll();
    for (Permission permission : allPermissions) {
        authorities.add(new SimpleGrantedAuthority(permission.getName()));
    }
}
```

**Key Benefits:**
- SUPER_ADMIN always has every permission (including new ones)
- No database storage needed for SUPER_ADMIN permissions
- Cannot be accidentally removed by migrations

### 4. Permission Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER LOGIN                                     │
└────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  CustomUserDetailsService                               │
│                                                                        │
│  1. Load user from database                                            │
│  2. Check if user has SUPER_ADMIN role                                 │
│                                                                        │
│  IF SUPER_ADMIN:                                                       │
│    └─► Read ALL permissions from DB                                    │
│    └─► Add ROLE_SUPER_ADMIN + ALL permissions as authorities           │
│                                                                        │
│  IF OTHER ROLE:                                                        │
│    └─► Read role-specific permissions from role_permissions table      │
│    └─► Add ROLE_[name] + assigned permissions as authorities           │
└────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Spring Security Context                               │
│                                                                        │
│  User authorities available for:                                       │
│  • @PreAuthorize("hasRole('SUPER_ADMIN')")                             │
│  • @PreAuthorize("hasAuthority('MANAGE_EMPLOYERS')")                   │
│  • Frontend permission checks                                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Backend Code Changes

### 1. RbacDataInitializer.java (MODIFIED)

**Before:** Created permissions from enum, assigned to roles  
**After:** Only creates SUPER_ADMIN role and user (if not exist)

```java
// v3.0 - SAFE MODE
@Override
public void run(String... args) {
    // Step 1: Ensure SUPER_ADMIN role exists (NO permissions assigned)
    Role superAdminRole = ensureSuperAdminRole();
    
    // Step 2: Create superadmin user if not exists
    ensureSuperAdminUser(superAdminRole);
}
```

### 2. SuperAdminPermissionSynchronizer.java (DISABLED)

**Before:** Synced all permissions to SUPER_ADMIN role in database  
**After:** Disabled - just logs informational message

```java
// v2.0 - DISABLED
@Override
public void run(String... args) {
    log.info("SUPER_ADMIN permissions are now DYNAMIC.");
    log.info("CustomUserDetailsService grants ALL permissions at login.");
}
```

### 3. CustomUserDetailsService.java (UNCHANGED - Already Correct)

Already implements dynamic SUPER_ADMIN permissions:

```java
if (isSuperAdmin) {
    List<Permission> allPermissions = permissionRepository.findAll();
    for (Permission permission : allPermissions) {
        authorities.add(new SimpleGrantedAuthority(permission.getName()));
    }
}
```

---

## Migration Reset Plan

Since this is a development environment:

### Step 1: Drop Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Drop and recreate database
DROP DATABASE IF EXISTS tba_waad;
CREATE DATABASE tba_waad;
```

### Step 2: Run Flyway Migrations
```bash
cd /workspaces/tba_waad_system/backend
./mvnw flyway:migrate
```

### Step 3: Start Application
```bash
./mvnw spring-boot:run
```

The application will:
1. Execute Flyway migrations (schema only)
2. Run RbacDataInitializer (creates SUPER_ADMIN role + user)
3. Be ready for permission management via UI

### Step 4: Initial Setup via UI
1. Login as `superadmin` / `Admin@123`
2. Navigate to Admin → Permissions
3. Create required permissions
4. Navigate to Admin → Roles  
5. Assign permissions to non-SUPER_ADMIN roles

---

## Verification Checklist

### After Migration Reset

| Check | Expected |
|-------|----------|
| `SELECT COUNT(*) FROM permissions;` | 0 (or populated via UI) |
| `SELECT COUNT(*) FROM roles WHERE name = 'SUPER_ADMIN';` | 1 |
| `SELECT COUNT(*) FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'SUPER_ADMIN');` | 0 |
| Login as superadmin | ✅ Full access to all features |
| Create permission via UI | ✅ Permission persists |
| Restart application | ✅ Permission still exists |

### Security Verification

| Check | Expected |
|-------|----------|
| SUPER_ADMIN can access all pages | ✅ Yes (dynamic permissions) |
| Other roles can only access assigned permissions | ✅ Yes (stored in role_permissions) |
| UI changes persist after restart | ✅ Yes |
| New migrations don't reset permissions | ✅ Yes |

---

## Future Recommendations

1. **Permission Seeding via API:** Create an admin endpoint to seed initial permissions from AppPermission enum (protected by `hasRole('SUPER_ADMIN')`)

2. **Role Templates:** Consider creating role templates that can be applied via UI rather than SQL

3. **Audit Logging:** Add audit logs for permission changes

4. **Permission Versioning:** Consider versioning permissions for tracking changes

---

## Files Modified

| File | Action |
|------|--------|
| `V060__clean_rbac_schema.sql` | **Created** - New clean RBAC migration |
| `RbacDataInitializer.java` | **Modified** - SAFE mode (no permission seeding) |
| `SuperAdminPermissionSynchronizer.java` | **Modified** - Disabled |
| `V002__seed_data.sql` | **Moved** to `migration_deprecated/` |
| `V007__settlement_permissions.sql` | **Moved** to `migration_deprecated/` |
| `V050__rbac_hardening.sql` | **Moved** to `migration_deprecated/` |
| `V051__permission_sync.sql` | **Moved** to `migration_deprecated/` |
| `V052__permission_cleanup.sql` | **Moved** to `migration_deprecated/` |
| `V053__missing_permissions.sql` | **Moved** to `migration_deprecated/` |

---

## Summary

The RBAC system has been restructured to follow production-grade best practices:

✅ **Schema-Only Migrations:** No data seeding in SQL  
✅ **Dynamic SUPER_ADMIN:** All permissions granted at runtime  
✅ **UI-Managed Roles:** Permissions assigned via admin interface  
✅ **Non-Destructive Startup:** Application doesn't overwrite DB state  
✅ **Persistent Changes:** UI modifications survive restarts  

**Login Credentials:**
- Username: `superadmin`
- Password: `Admin@123`
