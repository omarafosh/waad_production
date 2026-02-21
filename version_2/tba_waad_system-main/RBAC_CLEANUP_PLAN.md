# 🧹 RBAC CLEANUP PLAN
> Phase 5: Safe Deletion Roadmap

**Date:** 2026-02-05  
**Auditor:** AI Assistant  
**Status:** ✅ READY FOR EXECUTION

---

## 📊 Executive Summary

| Category | Items | Risk Level | Action |
|----------|-------|------------|--------|
| Dead Code | 5 items | 🟢 Low | DELETE |
| Alias Permissions | 3 items | 🟡 Medium | DEPRECATE → DELETE |
| Unused Components | 2 items | 🟡 Medium | VERIFY → DELETE |
| Legacy Patterns | 0 items | ✅ None | N/A |

---

## 🟢 Safe to Delete Immediately

### 1. Dead Alias Permissions

**File:** `/frontend/src/constants/permissions.constants.js`

```diff
// DELETE THESE - Unused aliases
- PROCESS_CLAIMS: 'PROCESS_CLAIMS',
- PREAPPROVAL_READ: 'PREAPPROVAL_READ',
- PREAPPROVAL_WRITE: 'PREAPPROVAL_WRITE',
```

**Reason:** These are aliases that point to nothing. Verified not used anywhere.

---

### 2. allowedRoles Pattern (If Found)

**Status:** ✅ NOT FOUND - No action needed

```bash
# Verified with:
grep -r "allowedRoles" --include="*.jsx" --include="*.js" frontend/
# Result: 0 matches
```

---

### 3. Unused Helper Functions

**File:** `/frontend/src/constants/permissions.constants.js`

```javascript
// REVIEW THESE - May be unused:
export const canCreate = (entityType) => hasPermission(`${entityType}_CREATE`);
export const canView = (entityType) => hasPermission(`${entityType}_VIEW`);
export const canUpdate = (entityType) => hasPermission(`${entityType}_UPDATE`);
export const canDelete = (entityType) => hasPermission(`${entityType}_DELETE`);
```

**Action:** Search for usage → If 0, DELETE

---

## 🟡 Requires Verification Before Deletion

### 4. RouteGuard.jsx (If Exists)

**Location:** Unknown - may not exist

```bash
# Search for:
find frontend/src -name "RouteGuard*" -type f
```

**Action:** 
- If exists and unused → DELETE
- If exists and used → MIGRATE to PermissionGuard

---

### 5. Old Permission Format in Routes

**Current State:** Some routes still use legacy format

```jsx
// OLD FORMAT (still works, low priority to change)
<Route element={<PermissionGuard permission={PERMISSIONS.VIEW_MEMBERS} />}>

// NEW FORMAT (preferred)
<Route element={<PermissionGuard resource="members" action="view" />}>
```

**Action:** ❌ DO NOT DELETE - Continue working, migrate gradually

---

## 🔴 DO NOT DELETE

### Critical Files - Keep Forever

| File | Reason |
|------|--------|
| `resource-action-model.js` | NEW canonical source |
| `legacy-permission-map.js` | Bridge layer - still needed |
| `permissions.constants.js` | Backend permissions - needed for API |
| `PermissionGuard.jsx` | Core component |
| `usePermissions.js` | Core hook |
| `RBACProvider.jsx` | Core provider |

### Backend - No Changes

| Component | Reason |
|-----------|--------|
| `@PreAuthorize` annotations | Working correctly |
| Permission entities | Database integrity |
| Role-Permission mappings | User access depends on these |

---

## 📋 Cleanup Execution Checklist

### Step 1: Backup (5 minutes)
```bash
# Create backup branch
git checkout -b backup-before-rbac-cleanup
git push origin backup-before-rbac-cleanup
git checkout main
```

### Step 2: Delete Alias Permissions (10 minutes)
```bash
# Edit permissions.constants.js
# Remove PROCESS_CLAIMS, PREAPPROVAL_READ, PREAPPROVAL_WRITE
# Run tests
npm test
```

### Step 3: Verify No Regressions (15 minutes)
```bash
# Start application
npm start

# Test critical flows:
# 1. Login as SUPER_ADMIN
# 2. Login as ADMIN
# 3. Login as REVIEWER
# 4. Verify all menus appear correctly
# 5. Verify all CRUD operations work
```

### Step 4: Commit (5 minutes)
```bash
git add .
git commit -m "chore(rbac): remove unused permission aliases"
git push
```

---

## 📅 Phased Cleanup Timeline

### Week 1: Low Risk
- [ ] Delete alias permissions
- [ ] Remove unused helper functions (if verified)
- [ ] Clean up any TODO comments in RBAC files

### Week 2: Medium Risk
- [ ] Migrate remaining legacy route guards to resource+action
- [ ] Remove RouteGuard.jsx (if exists and unused)
- [ ] Update documentation

### Week 3: Verification
- [ ] Full regression test all roles
- [ ] Performance test with large permission sets
- [ ] Security audit of permission checks

### Future (After Stability Confirmed)
- Consider removing legacy-permission-map.js when:
  - All routes use resource+action format
  - Backend is updated to use resource+action
  - No more legacy permission strings in codebase

---

## ⚠️ Risk Mitigation

### If Something Breaks

1. **Immediate Rollback:**
```bash
git revert HEAD
# or
git checkout backup-before-rbac-cleanup -- <file>
```

2. **Emergency Permission Grant:**
```javascript
// In legacy-permission-map.js, add emergency mapping:
'resource:action': [null] // Grants to everyone temporarily
```

3. **Contact Points:**
- Check browser console for permission errors
- Check network tab for 403 responses
- Review backend logs for authorization failures

---

## ✅ Cleanup Summary

| Action | Items | Effort | Risk |
|--------|-------|--------|------|
| DELETE alias permissions | 3 | 10 min | 🟢 Low |
| VERIFY helper functions | 4 | 15 min | 🟢 Low |
| MIGRATE legacy routes | ~20 | 2 hours | 🟡 Medium |
| TOTAL | 27 | ~3 hours | 🟢 Low |

---

**PHASE 5: ✅ CLEANUP PLAN COMPLETE**

**Recommended Action:** Start with alias permission deletion, then proceed gradually.
