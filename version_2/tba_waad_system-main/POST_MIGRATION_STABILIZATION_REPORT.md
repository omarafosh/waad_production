# 🏥 POST_MIGRATION STABILIZATION REPORT
**Date:** 2026-02-10  
**Status:** 🏗️ IN PROGRESS  
**Target:** Production Stabilization (Post V1_00->V1_08 Rebuild)

---

## 🚨 Root Cause Analysis (Phase 1)

### 1. HTTP 500 & "Entry for instance ... not found"
**Severity:** 🔴 CRITICAL (Blocker)  
**Location:** Login Flow / Entity Loading  
**Cause:** **Orphaned Data in Join Tables (`user_roles`, `role_permissions`)**.  
When the database schema was rebuilt (V1_00 -> V1_08) and existing data was migrated or partially kept, the join tables (`user_roles`, `role_permissions`) retained references to IDs that no longer exist in the parent tables (`users`, `roles`, `permissions`).
Because `User` loads `roles` EAGERly, and `Role` loads `permissions` EAGERly, **any** single invalid ID causes the entire login transaction to crash with `EntityNotFoundException`.

### 2. "column c0.id does not exist" & SQL Errors
**Severity:** 🟠 HIGH  
**Location:** JPA Criteria / Native Queries  
**Cause:** **Implicit Naming Strategy Mismatch vs Explicit `@Column` Definitions.**  
While most entities use `@Column(name="snake_case")`, custom queries or Criteria API usage often defaults to property names if not carefully aliased. The `c0.id` error specifically usually indicates a mismatch in the alias used for the root entity in a generated query.
*Action:* We will rely on standard JPA cleanup. If this persists after orphan cleanup, we will enable `spring.jpa.show-sql` to pinpoint the exact query. (Orphaned data often manifests as weird Hibernate errors too).

### 3. SUPER_ADMIN Permissions Missing
**Severity:** 🔴 CRITICAL  
**Location:** `AuthService.java`  
**Cause:** **Dependency on DB State for Logic.**  
The current implementation queries `PermissionRepository.findAll()` to grant "Full Access".
Since the V1_00->V1_08 migration implies a fresh schema for metadata (or cleaned permissions), the `permissions` table is likely empty or incomplete.
**Fix:** SUPER_ADMIN must derive permissions from the **Codebase Source of Truth** (`AppPermission` enum), not the database state.

### 4. /auth/me 401 on Login Page
**Severity:** 🟡 LOW (UX Noise)  
**Cause:** **Standard Security Behavior.**  
The backend correctly returns `401 Unauthorized` for anonymous users checking session status. The frontend logs this as an error.
**Decision:** We will maintain strict 401 for security/audit clarity, but ensure the backend never throws 500 for this check.

---

## 🛠️ Fix Strategy (Phase 2)

**Design Philosophy:** "Code is Truth, DB is Storage". Metadata should flow from Code -> App, not App -> DB -> App.

### Step 1: Data Sanitation (DB Layer)
**Goal:** Stop EntityNotFound exceptions immediately.
**Action:** Execute Migration `V1_13__cleanup_orphaned_rbac_data.sql`.
*   Delete `user_roles` where `role_id` is invalid.
*   Delete `role_permissions` where `permission_id` or `role_id` is invalid.

### Step 2: Unshackle SUPER_ADMIN (Service Layer)
**Goal:** Restore Full Access regardless of DB state.
**Action:** Modify `AuthService.java`.
*   **OLD:** `permissions = permissionRepository.findAll()...`
*   **NEW:** `permissions = Arrays.asList(AppPermission.getAllPermissionNames());` (Uses `com.waad.tba.security.AppPermission`).
*   **Benefit:** Zero DB queries for permission resolution for Super Admin. Works even with empty Permission table.

### Step 3: Auth Flow Resilience (Controller Layer)
**Goal:** Ensure predictable API behavior.
**Action:** Verify `AuthController.java` handles null sessions gracefully (already correct logic, just needs verification it doesn't 500).

---

## ⚡ Implementation Plan

1.  **Review & Apply V1_13 Migration** (Sanitize DB).
2.  **Refactor AuthService** to implement "Code-Source Permissions" for Super Admin.
3.  **Sanity Check** Login Flow.

---

**Authorized By:** Principal Engineer (AI)
**Date:** 2026-02-10
