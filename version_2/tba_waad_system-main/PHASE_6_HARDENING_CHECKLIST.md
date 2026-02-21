# 🎯 Phase 6: Documentation & Hardening - Checklist

**Status:** In Progress  
**Last Updated:** 2026-02-02  
**Phase Goal:** Production-ready documentation and automated validation

---

## ✅ Completed Tasks

### Documentation:
- [x] Created `PERMISSION_MIGRATION_COMPLETE.md` (comprehensive migration report)
- [x] Created `validate-permission-migration.sh` (automated validation script)
- [x] Documented all 87 routes with permission mappings
- [x] Created troubleshooting guide
- [x] Documented developer guide for adding new routes
- [x] Created role access matrix

### Validation:
- [x] Automated validation script (10 tests)
- [x] All tests passing (100% migration verified)
- [x] 90 PermissionGuard usages confirmed
- [x] 84 isRouteGuard props confirmed
- [x] Zero RouteGuard usages in active code
- [x] Zero allowedRoles props remaining

---

## ⏳ Pending Tasks

### 1. Manual Testing (Priority: HIGH)
**Status:** ⏳ Pending  
**Owner:** QA / Developer  
**Estimated Time:** 2-3 hours

#### Test Scenarios:

##### A. SUPER_ADMIN Role Testing:
- [ ] Login as SUPER_ADMIN
- [ ] Navigate to Dashboard → Should access ✅
- [ ] Navigate to Members → Should access ✅
- [ ] Navigate to Claims → Should access ✅
- [ ] Navigate to Settlements → Should access ✅
- [ ] Navigate to RBAC → Should access ✅
- [ ] Navigate to Reports → Should access ✅
- [ ] Try direct URL: `/members/add` → Should access ✅
- [ ] Try direct URL: `/claims/inbox` → Should access ✅
- [ ] **Expected Result:** 100% access to all routes

##### B. ACCOUNTANT Role Testing:
- [ ] Login as ACCOUNTANT
- [ ] Navigate to Dashboard → Should access ✅
- [ ] Navigate to Settlements → Should access ✅ (has VIEW_SETTLEMENTS)
- [ ] Navigate to Reports → Should access ✅ (has VIEW_REPORTS)
- [ ] Navigate to Members → Should redirect to `/unauthorized` ❌ (no VIEW_MEMBERS)
- [ ] Navigate to Claims → Should redirect to `/unauthorized` ❌ (no VIEW_CLAIMS)
- [ ] Try direct URL: `/members/add` → Should redirect to `/unauthorized` ❌
- [ ] Try direct URL: `/rbac/users` → Should redirect to `/unauthorized` ❌
- [ ] **Expected Result:** Only settlements + reports accessible

##### C. PROVIDER Role Testing:
- [ ] Login as PROVIDER
- [ ] Navigate to Dashboard → Should access ✅
- [ ] Navigate to Provider Portal → Should access ✅
- [ ] Navigate to Eligibility Check → Should access ✅ (has VIEW_MEMBERS for eligibility)
- [ ] Navigate to Submit Visit → Should access ✅ (has MANAGE_VISITS)
- [ ] Navigate to Submit Claim → Should access ✅ (has CREATE_CLAIM)
- [ ] Navigate to Submit Pre-Auth → Should access ✅ (has CREATE_PRE_AUTH)
- [ ] Navigate to Members List → Should redirect to `/unauthorized` ❌ (no general VIEW_MEMBERS)
- [ ] Navigate to Settlements → Should redirect to `/unauthorized` ❌ (no VIEW_SETTLEMENTS)
- [ ] **Expected Result:** Only provider portal features accessible

##### D. REVIEWER Role Testing:
- [ ] Login as REVIEWER
- [ ] Navigate to Dashboard → Should access ✅
- [ ] Navigate to Claims Inbox → Should access ✅ (has APPROVE_CLAIMS)
- [ ] Navigate to Pre-Auth Inbox → Should access ✅ (has APPROVE_PRE_AUTH)
- [ ] Navigate to Claims Detail → Should access ✅ (has VIEW_CLAIMS)
- [ ] Navigate to Members → Should redirect to `/unauthorized` ❌ (no VIEW_MEMBERS)
- [ ] Navigate to Settlements → Should redirect to `/unauthorized` ❌ (no VIEW_SETTLEMENTS)
- [ ] Try direct URL: `/members/add` → Should redirect to `/unauthorized` ❌
- [ ] **Expected Result:** Only review workflows accessible

##### E. EMPLOYER Role Testing:
- [ ] Login as EMPLOYER
- [ ] Navigate to Dashboard → Should access ✅
- [ ] Navigate to Members → Should access ✅ (has VIEW_MEMBERS)
- [ ] Navigate to Members Add → Should access ✅ (has MANAGE_MEMBERS)
- [ ] Navigate to Employer Detail → Should access ✅ (has VIEW_EMPLOYERS)
- [ ] Navigate to Claims → Should redirect to `/unauthorized` ❌ (no VIEW_CLAIMS)
- [ ] Navigate to Settlements → Should redirect to `/unauthorized` ❌ (no VIEW_SETTLEMENTS)
- [ ] **Expected Result:** Only member/employer management accessible

##### F. Custom Role Testing:
- [ ] Create custom role with ONLY `VIEW_CLAIMS` permission
- [ ] Assign role to test user
- [ ] Login as test user
- [ ] Navigate to Claims List → Should access ✅ (has VIEW_CLAIMS)
- [ ] Navigate to Claims Detail → Should access ✅ (has VIEW_CLAIMS)
- [ ] Navigate to Claims Inbox → Should redirect to `/unauthorized` ❌ (no APPROVE_CLAIMS)
- [ ] Navigate to Members → Should redirect to `/unauthorized` ❌ (no VIEW_MEMBERS)
- [ ] **Expected Result:** Only claims viewing (no approval)

#### Testing Artifacts:
- [ ] Create test results document
- [ ] Screenshot unauthorized redirects
- [ ] Document any permission gaps
- [ ] Verify browser console shows no permission errors (production mode)

---

### 2. ESLint Rule Configuration (Priority: MEDIUM)
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes

**Task:** Prevent future use of deprecated RouteGuard component

**File:** `frontend/.eslintrc.js` or `frontend/eslint.config.js`

**Rule to Add:**
```javascript
module.exports = {
  // ... existing config
  rules: {
    // ... existing rules
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['**/RouteGuard', './RouteGuard'],
          message: 'RouteGuard is deprecated. Use PermissionGuard instead.'
        }
      ]
    }],
    'no-restricted-syntax': ['error', {
      selector: 'JSXAttribute[name.name="allowedRoles"]',
      message: 'allowedRoles prop is deprecated. Use PermissionGuard with permission prop instead.'
    }]
  }
};
```

**Validation:**
```bash
cd frontend
npm run lint
# Should show NO errors related to RouteGuard (if clean)
```

---

### 3. CI/CD Validation Script (Priority: HIGH)
**Status:** ⏳ Pending  
**Estimated Time:** 1 hour

**Task:** Add migration validation to CI/CD pipeline

**File:** `.github/workflows/frontend-validation.yml` (create new)

**Script Content:**
```yaml
name: Frontend Permission Migration Validation

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'frontend/src/routes/**'
      - 'frontend/src/components/PermissionGuard.jsx'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'frontend/src/routes/**'
      - 'frontend/src/components/PermissionGuard.jsx'

jobs:
  validate-permissions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Permission Migration Validation
        run: |
          chmod +x frontend/scripts/validate-permission-migration.sh
          ./frontend/scripts/validate-permission-migration.sh
      
      - name: Check for RouteGuard imports
        run: |
          if grep -r "import.*RouteGuard.*from.*'./RouteGuard'" frontend/src/routes/; then
            echo "ERROR: RouteGuard import found in routes"
            exit 1
          fi
      
      - name: Check for allowedRoles usage
        run: |
          if grep -r "allowedRoles=" frontend/src/routes/MainRoutes.jsx; then
            echo "ERROR: allowedRoles prop found (use permission prop instead)"
            exit 1
          fi
      
      - name: Verify PermissionGuard import
        run: |
          if ! grep -q "import.*PermissionGuard" frontend/src/routes/MainRoutes.jsx; then
            echo "ERROR: PermissionGuard import missing"
            exit 1
          fi
```

**Deployment:**
- [ ] Add workflow file to `.github/workflows/`
- [ ] Test workflow on feature branch
- [ ] Verify workflow runs on PR creation
- [ ] Verify workflow blocks merge if validation fails

---

### 4. Update Developer Documentation (Priority: MEDIUM)
**Status:** ⏳ Pending  
**Estimated Time:** 1 hour

**Files to Update:**

#### A. `frontend/README.md`:
- [ ] Add "Authorization System" section
- [ ] Document PermissionGuard usage
- [ ] Add migration completion notice
- [ ] Link to `PERMISSION_MIGRATION_COMPLETE.md`

**Content:**
```markdown
## Authorization System

### Overview
This application uses a **permission-based authorization system**. All routes and components are protected using `PermissionGuard`.

⚠️ **IMPORTANT:** RouteGuard with `allowedRoles` is DEPRECATED. Do NOT use it.

### Adding Protected Routes

1. Define route permission in `src/config/route-permissions.config.js`:
\`\`\`javascript
export const ROUTE_PERMISSIONS = {
  '/new-page': [PERMISSIONS.VIEW_NEW_MODULE]
};
\`\`\`

2. Use PermissionGuard in route definition:
\`\`\`jsx
{
  path: 'new-page',
  element: (
    <PermissionGuard permission={PERMISSIONS.VIEW_NEW_MODULE} isRouteGuard>
      <NewPage />
    </PermissionGuard>
  )
}
\`\`\`

See [PERMISSION_MIGRATION_COMPLETE.md](../PERMISSION_MIGRATION_COMPLETE.md) for detailed guide.
```

#### B. `backend/README.md`:
- [ ] Document Frontend-Backend permission alignment
- [ ] Add permission naming conventions
- [ ] Document @PreAuthorize annotation usage

---

### 5. Production Deployment Checklist (Priority: HIGH)
**Status:** ⏳ Pending  
**Estimated Time:** 2 hours

**Pre-Deployment:**
- [ ] All manual tests passing (Task #1)
- [ ] ESLint rule configured (Task #2)
- [ ] CI/CD validation passing (Task #3)
- [ ] Documentation updated (Task #4)
- [ ] Backend permissions verified to match frontend
- [ ] Database migrations applied (if any permission changes)

**Deployment Steps:**
```bash
# 1. Build Frontend
cd frontend
npm run build
# Verify: Build successful with 0 errors

# 2. Run validation
./scripts/validate-permission-migration.sh
# Verify: All tests PASSED

# 3. Deploy to staging
# [Your deployment command]

# 4. Smoke test on staging
# Test 1 user from each role (SUPER_ADMIN, ACCOUNTANT, PROVIDER, REVIEWER, EMPLOYER)

# 5. Deploy to production (if staging tests pass)
# [Your production deployment command]
```

**Post-Deployment:**
- [ ] Monitor error logs for permission-related errors
- [ ] Check analytics for unauthorized access attempts
- [ ] Verify no users reporting access issues
- [ ] Document any edge cases discovered

---

### 6. Performance Baseline (Priority: LOW)
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes

**Task:** Measure permission check performance

**Metrics to Collect:**
- [ ] Average route load time (before migration)
- [ ] Average route load time (after migration)
- [ ] PermissionGuard render time (React DevTools Profiler)
- [ ] Number of permission checks per page load
- [ ] Memory usage comparison

**Expected Result:** < 1ms difference (negligible impact)

**Tools:**
- React DevTools Profiler
- Chrome Performance tab
- Lighthouse audit

---

## 📊 Progress Summary

| Task | Status | Priority | Time Estimate |
|------|--------|----------|---------------|
| Documentation | ✅ Complete | HIGH | - |
| Automated Validation Script | ✅ Complete | HIGH | - |
| Manual Testing | ⏳ Pending | HIGH | 2-3 hours |
| ESLint Rule | ⏳ Pending | MEDIUM | 30 min |
| CI/CD Script | ⏳ Pending | HIGH | 1 hour |
| Developer Docs | ⏳ Pending | MEDIUM | 1 hour |
| Production Deployment | ⏳ Pending | HIGH | 2 hours |
| Performance Baseline | ⏳ Pending | LOW | 30 min |

**Total Remaining Time:** ~7-8 hours

---

## 🚀 Next Steps

1. **IMMEDIATE:** Run manual testing (all roles)
2. **PRIORITY:** Configure ESLint rules to prevent regression
3. **PRIORITY:** Set up CI/CD validation
4. **BEFORE PRODUCTION:** Update developer documentation
5. **PRODUCTION:** Follow deployment checklist

---

## ✅ Success Criteria

- [ ] All manual tests passing for 5 roles
- [ ] ESLint rules preventing RouteGuard usage
- [ ] CI/CD validation passing
- [ ] Documentation complete and reviewed
- [ ] Production deployment successful
- [ ] Zero permission-related errors in production (first 24 hours)

---

**End of Phase 6 Checklist**
