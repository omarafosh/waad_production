# 📊 STEP 0: AUTHORIZATION MIGRATION ANALYSIS
## Complete Codebase Scan & Execution Plan

**Date:** 2026-02-02  
**Status:** ⚠️ **AWAITING APPROVAL TO PROCEED**

---

## 🔍 PART 1: CURRENT STATE ANALYSIS

### A. Route Guard Usage Statistics

| Guard Type | Count | Percentage | Status |
|-----------|-------|------------|--------|
| **RouteGuard with allowedRoles** | 85 | 90.4% | ❌ LEGACY (Must remove) |
| **RouteGuard with requiredPermission** | 2 | 2.1% | ⚠️ PARTIAL (Convert to PermissionGuard) |
| **RouteGuard with permissions array** | 2 | 2.1% | ⚠️ PARTIAL (Convert to PermissionGuard) |
| **PermissionGuard** | 13 | 13.8% | ✅ CORRECT (Settlement module only) |
| **Total Protected Routes** | ~94 | 100% | |

**File:** `frontend/src/routes/MainRoutes.jsx` (1,212 lines)

### B. Permission System Components

#### ✅ Existing & Correct:
1. **PermissionGuard Component** (`frontend/src/components/PermissionGuard.jsx`)
   - ✅ SUPER_ADMIN bypass implemented
   - ✅ Supports single permission
   - ✅ Supports multiple permissions (OR/AND logic)
   - ✅ Has `usePermission` and `usePermissions` hooks
   - ⚠️ **Issue:** Uses `user.roles?.includes('SUPER_ADMIN')` - should check `user.role === 'SUPER_ADMIN'`

2. **Permission Constants** (`frontend/src/constants/permissions.constants.js`)
   - ✅ 50+ permissions defined
   - ✅ Matches backend authorities
   - ✅ Well-organized by module

3. **Menu Permissions Map** (`frontend/src/config/rbac.config.js`)
   - ✅ Complete MENU_PERMISSIONS mapping
   - ✅ Permission-based menu filtering
   - ✅ Used by `filterMenuByPermissions()`

#### ❌ Legacy Components to Remove:
1. **RouteGuard Component** (`frontend/src/routes/RouteGuard.jsx`)
   - ❌ Supports role-based checks (`allowedRoles` prop)
   - ⚠️ Has some permission support (partial migration)
   - **Status:** To be deprecated/removed

---

## 🗺️ PART 2: ROUTE INVENTORY

### Complete Route Mapping (94 Protected Routes)

#### 1. Dashboard & Core (2 routes)
```
/dashboard                          → RouteGuard ['ADMIN', 'EMPLOYER']
/employer-dashboard                 → RouteGuard ['ADMIN', 'EMPLOYER']
```

#### 2. Members Module (6 routes)
```
/members                            → RouteGuard ['ADMIN', 'EMPLOYER']
/members/add                        → RouteGuard ['ADMIN', 'EMPLOYER']
/members/:id                        → RouteGuard ['ADMIN', 'EMPLOYER']
/members/:id/edit                   → RouteGuard ['ADMIN', 'EMPLOYER']
/members/:id/add-dependent          → RouteGuard ['ADMIN', 'EMPLOYER']
/members/eligibility                → RouteGuard ['ADMIN', 'EMPLOYER', 'PROVIDER']
```

#### 3. Employers Module (6 routes)
```
/employers                          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/employers/create                   → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/employers/edit/:id                 → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/employers/contracts                → RouteGuard requiredPermission="benefit_policies.view"
/employers/contracts/:id            → RouteGuard requiredPermission="benefit_policies.view"
/employers/:id                      → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
```

#### 4. Approvals Dashboard (1 route)
```
/approvals/dashboard                → RouteGuard ['ADMIN', 'REVIEWER', 'INSURANCE_COMPANY']
```

#### 5. Claims Module (4 routes)
```
/claims                             → RouteGuard ['ADMIN', 'EMPLOYER', 'REVIEWER', 'ACCOUNTANT']
/claims/inbox                       → RouteGuard ['ADMIN', 'REVIEWER', 'ACCOUNTANT']
/claims/settlement                  → RouteGuard ['ADMIN', 'FINANCE', 'ACCOUNTANT']
/claims/:id                         → RouteGuard ['ADMIN', 'EMPLOYER', 'REVIEWER', 'PROVIDER', 'ACCOUNTANT']
```

#### 6. Settlement Module (6 routes) ✅ CORRECT
```
/settlement/provider-accounts       → PermissionGuard VIEW_PROVIDER_ACCOUNTS ✅
/settlement/provider-accounts/:id   → PermissionGuard VIEW_PROVIDER_ACCOUNTS ✅
/settlement/batches                 → PermissionGuard VIEW_SETTLEMENTS ✅
/settlement/batches/create          → PermissionGuard CREATE_SETTLEMENT_BATCH ✅
/settlement/batches/:batchId        → PermissionGuard VIEW_SETTLEMENTS ✅
/settlement/batches/:batchId/add    → PermissionGuard CREATE_SETTLEMENT_BATCH ✅
```

#### 7. Providers Module (4 routes)
```
/providers                          → RouteGuard ['ADMIN', 'EMPLOYER']
/providers/add                      → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/providers/edit/:id                 → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/providers/:id                      → RouteGuard ['ADMIN', 'EMPLOYER']
```

#### 8. Provider Contracts Module (3 routes)
```
/provider-contracts                 → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/provider-contracts/create          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/provider-contracts/:id             → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
```

#### 9. Visits Module (4 routes)
```
/visits                             → RouteGuard ['ADMIN', 'REVIEWER', 'PROVIDER']
/visits/add                         → RouteGuard ['ADMIN']
/visits/edit/:id                    → RouteGuard ['ADMIN']
/visits/:id                         → RouteGuard ['ADMIN', 'REVIEWER']
```

#### 10. Pre-Authorizations Module (5 routes)
```
/pre-approvals                      → RouteGuard ['INSURANCE_ADMIN', 'REVIEWER', 'PROVIDER', 'ACCOUNTANT']
/pre-approvals/dashboard            → RouteGuard ['INSURANCE_ADMIN', 'REVIEWER', 'ACCOUNTANT']
/pre-approvals/inbox                → RouteGuard ['INSURANCE_ADMIN', 'REVIEWER', 'ACCOUNTANT']
/pre-approvals/:id                  → RouteGuard ['INSURANCE_ADMIN', 'REVIEWER', 'PROVIDER', 'ACCOUNTANT']
/pre-approvals/:id/audit            → RouteGuard ['INSURANCE_ADMIN', 'REVIEWER', 'ACCOUNTANT']
```

#### 11. Medical Services Module (4 routes)
```
/medical-services                   → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-services/add               → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-services/edit/:id          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-services/:id               → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
```

#### 12. Medical Categories Module (4 routes)
```
/medical-categories                 → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-categories/add             → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-categories/edit/:id        → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-categories/:id             → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
```

#### 13. Medical Packages Module (4 routes)
```
/medical-packages                   → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/medical-packages/add               → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-packages/edit/:id          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/medical-packages/:id               → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
```

#### 14. Benefit Packages Module (4 routes)
```
/benefit-packages                   → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/benefit-packages/create            → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/benefit-packages/edit/:id          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/benefit-packages/view/:id          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
```

#### 15. Benefit Policies Module (4 routes)
```
/benefit-policies                   → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'EMPLOYER']
/benefit-policies/create            → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/benefit-policies/edit/:id          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/benefit-policies/:id               → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'EMPLOYER']
```

#### 16. Eligibility Module (1 route)
```
/eligibility                        → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER', 'EMPLOYER', 'PROVIDER']
```

#### 17. Provider Portal Module (5 routes)
```
/provider/eligibility-check         → RouteGuard ['PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN']
/provider/visits                    → RouteGuard ['PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN']
/provider/claims/submit             → RouteGuard ['PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN']
/provider/pre-approvals             → RouteGuard ['PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN']
/provider/documents                 → RouteGuard ['PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN']
```

#### 18. Company Module (4 routes)
```
/companies                          → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
/companies/create                   → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/companies/edit/:id                 → RouteGuard ['ADMIN', 'INSURANCE_COMPANY']
/companies/:id                      → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER', 'PROVIDER', 'SUPER_ADMIN']
```

#### 19. RBAC Module (1 route)
```
/rbac                               → RouteGuard ['SUPER_ADMIN']
```

#### 20. Settings Module (1 route)
```
/settings                           → RouteGuard ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER']
```

#### 21. Admin Module (7 routes)
```
/admin/users                        → RouteGuard ['SUPER_ADMIN']
/admin/users/:id                    → RouteGuard ['SUPER_ADMIN']
/admin/roles                        → RouteGuard ['SUPER_ADMIN', 'ADMIN']
/admin/roles/:id/users              → RouteGuard ['SUPER_ADMIN', 'ADMIN']
/admin/permissions                  → RouteGuard ['SUPER_ADMIN']
/admin/role-management              → RouteGuard ['SUPER_ADMIN', 'ADMIN']
/admin/role-management/:id          → RouteGuard ['SUPER_ADMIN', 'ADMIN']
```

#### 22. Reports Module (11 routes)
```
/reports/employers                  → RouteGuard ['ADMIN', 'EMPLOYER']
/reports/audit                      → RouteGuard ['SUPER_ADMIN', 'ADMIN']
/reports/employer-dashboard         → RouteGuard ['ADMIN', 'SUPER_ADMIN', 'INSURANCE_COMPANY', 'EMPLOYER_ADMIN', 'ACCOUNTANT']
/reports/claims                     → RouteGuard ['ADMIN', 'SUPER_ADMIN', 'EMPLOYER_ADMIN', 'ACCOUNTANT']
/reports/pre-approvals              → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'EMPLOYER_ADMIN', 'REVIEWER', 'ACCOUNTANT']
/reports/visits                     → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'EMPLOYER_ADMIN', 'REVIEWER', 'ACCOUNTANT']
/reports/benefit-policy             → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'EMPLOYER_ADMIN', 'REVIEWER', 'ACCOUNTANT']
/reports/beneficiaries              → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'EMPLOYER_ADMIN', 'REVIEWER', 'ACCOUNTANT']
/reports/financial                  → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'INSURANCE_COMPANY', 'EMPLOYER_ADMIN', 'ACCOUNTANT']
/reports/provider-settlement        → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'ACCOUNTANT']
/reports/provider-reports           → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'PROVIDER', 'ACCOUNTANT']
/reports/claims-adjudication        → RouteGuard ['SUPER_ADMIN', 'ADMIN', 'INSURANCE_ADMIN', 'REVIEWER']
```

#### 23. Audit & Documents (2 routes)
```
/audit                              → RouteGuard permissions=['VIEW_AUDIT_LOGS']
/documents-center                   → RouteGuard permissions=['claims.view', 'pre_approvals.view']
```

---

## 🎯 PART 3: PERMISSION MAPPING PROPOSAL

### Proposed Route → Permission Mapping

Based on existing MENU_PERMISSIONS and backend authorities:

```javascript
export const ROUTE_PERMISSIONS = {
  // ═════════════════════════════════════════════════════════════
  // 📊 DASHBOARD
  // ═════════════════════════════════════════════════════════════
  '/dashboard': null, // No permission required (role-based content)
  '/employer-dashboard': [PERMISSIONS.VIEW_EMPLOYERS],

  // ═════════════════════════════════════════════════════════════
  // 👥 MEMBERS
  // ═════════════════════════════════════════════════════════════
  '/members': [PERMISSIONS.VIEW_MEMBERS],
  '/members/add': [PERMISSIONS.MANAGE_MEMBERS],
  '/members/:id': [PERMISSIONS.VIEW_MEMBERS],
  '/members/:id/edit': [PERMISSIONS.MANAGE_MEMBERS],
  '/members/:id/add-dependent': [PERMISSIONS.MANAGE_MEMBERS],
  '/members/eligibility': [PERMISSIONS.VIEW_MEMBERS],

  // ═════════════════════════════════════════════════════════════
  // 🏢 EMPLOYERS
  // ═════════════════════════════════════════════════════════════
  '/employers': [PERMISSIONS.VIEW_EMPLOYERS],
  '/employers/create': [PERMISSIONS.MANAGE_EMPLOYERS],
  '/employers/edit/:id': [PERMISSIONS.MANAGE_EMPLOYERS],
  '/employers/:id': [PERMISSIONS.VIEW_EMPLOYERS],
  '/employers/contracts': [PERMISSIONS.VIEW_BENEFIT_POLICIES],
  '/employers/contracts/:id': [PERMISSIONS.VIEW_BENEFIT_POLICIES],

  // ═════════════════════════════════════════════════════════════
  // ✅ APPROVALS
  // ═════════════════════════════════════════════════════════════
  '/approvals/dashboard': [PERMISSIONS.APPROVE_CLAIMS, PERMISSIONS.APPROVE_PRE_AUTH],

  // ═════════════════════════════════════════════════════════════
  // 💰 CLAIMS
  // ═════════════════════════════════════════════════════════════
  '/claims': [PERMISSIONS.VIEW_CLAIMS],
  '/claims/inbox': [PERMISSIONS.APPROVE_CLAIMS, PERMISSIONS.REJECT_CLAIMS],
  '/claims/settlement': [PERMISSIONS.SETTLE_CLAIMS],
  '/claims/:id': [PERMISSIONS.VIEW_CLAIMS],

  // ═════════════════════════════════════════════════════════════
  // 💵 SETTLEMENT (Already correct - PermissionGuard)
  // ═════════════════════════════════════════════════════════════
  '/settlement/provider-accounts': [PERMISSIONS.VIEW_PROVIDER_ACCOUNTS],
  '/settlement/provider-accounts/:providerId': [PERMISSIONS.VIEW_PROVIDER_ACCOUNTS],
  '/settlement/batches': [PERMISSIONS.VIEW_SETTLEMENTS],
  '/settlement/batches/create': [PERMISSIONS.CREATE_SETTLEMENT_BATCH],
  '/settlement/batches/:batchId': [PERMISSIONS.VIEW_SETTLEMENTS],
  '/settlement/batches/:batchId/add-claims': [PERMISSIONS.CREATE_SETTLEMENT_BATCH],

  // ═════════════════════════════════════════════════════════════
  // 🏥 PROVIDERS
  // ═════════════════════════════════════════════════════════════
  '/providers': [PERMISSIONS.VIEW_PROVIDERS],
  '/providers/add': [PERMISSIONS.MANAGE_PROVIDERS],
  '/providers/edit/:id': [PERMISSIONS.MANAGE_PROVIDERS],
  '/providers/:id': [PERMISSIONS.VIEW_PROVIDERS],

  // ═════════════════════════════════════════════════════════════
  // 📜 PROVIDER CONTRACTS
  // ═════════════════════════════════════════════════════════════
  '/provider-contracts': [PERMISSIONS.VIEW_PROVIDER_CONTRACTS],
  '/provider-contracts/create': [PERMISSIONS.MANAGE_PROVIDER_CONTRACTS],
  '/provider-contracts/:id': [PERMISSIONS.VIEW_PROVIDER_CONTRACTS],

  // ═════════════════════════════════════════════════════════════
  // 🏥 VISITS
  // ═════════════════════════════════════════════════════════════
  '/visits': [PERMISSIONS.VIEW_VISITS],
  '/visits/add': [PERMISSIONS.MANAGE_VISITS],
  '/visits/edit/:id': [PERMISSIONS.MANAGE_VISITS],
  '/visits/:id': [PERMISSIONS.VIEW_VISITS],

  // ═════════════════════════════════════════════════════════════
  // ✅ PRE-AUTHORIZATIONS
  // ═════════════════════════════════════════════════════════════
  '/pre-approvals': [PERMISSIONS.VIEW_PRE_AUTH],
  '/pre-approvals/dashboard': [PERMISSIONS.APPROVE_PRE_AUTH, PERMISSIONS.REJECT_PRE_AUTH],
  '/pre-approvals/inbox': [PERMISSIONS.APPROVE_PRE_AUTH, PERMISSIONS.REJECT_PRE_AUTH],
  '/pre-approvals/:id': [PERMISSIONS.VIEW_PRE_AUTH],
  '/pre-approvals/:id/audit': [PERMISSIONS.VIEW_PRE_AUTH, PERMISSIONS.VIEW_AUDIT_LOGS],

  // ═════════════════════════════════════════════════════════════
  // 💊 MEDICAL TAXONOMY
  // ═════════════════════════════════════════════════════════════
  '/medical-services': [PERMISSIONS.VIEW_MEDICAL_SERVICES],
  '/medical-services/add': [PERMISSIONS.MANAGE_MEDICAL_SERVICES],
  '/medical-services/edit/:id': [PERMISSIONS.MANAGE_MEDICAL_SERVICES],
  '/medical-services/:id': [PERMISSIONS.VIEW_MEDICAL_SERVICES],

  '/medical-categories': [PERMISSIONS.VIEW_MEDICAL_CATEGORIES],
  '/medical-categories/add': [PERMISSIONS.MANAGE_MEDICAL_CATEGORIES],
  '/medical-categories/edit/:id': [PERMISSIONS.MANAGE_MEDICAL_CATEGORIES],
  '/medical-categories/:id': [PERMISSIONS.VIEW_MEDICAL_CATEGORIES],

  '/medical-packages': [PERMISSIONS.VIEW_MEDICAL_PACKAGES],
  '/medical-packages/add': [PERMISSIONS.MANAGE_MEDICAL_PACKAGES],
  '/medical-packages/edit/:id': [PERMISSIONS.MANAGE_MEDICAL_PACKAGES],
  '/medical-packages/:id': [PERMISSIONS.VIEW_MEDICAL_PACKAGES],

  // ═════════════════════════════════════════════════════════════
  // 📦 BENEFIT PACKAGES & POLICIES
  // ═════════════════════════════════════════════════════════════
  '/benefit-packages': [PERMISSIONS.VIEW_BENEFIT_PACKAGES],
  '/benefit-packages/create': [PERMISSIONS.MANAGE_BENEFIT_PACKAGES],
  '/benefit-packages/edit/:id': [PERMISSIONS.MANAGE_BENEFIT_PACKAGES],
  '/benefit-packages/view/:id': [PERMISSIONS.VIEW_BENEFIT_PACKAGES],

  '/benefit-policies': [PERMISSIONS.VIEW_BENEFIT_POLICIES],
  '/benefit-policies/create': [PERMISSIONS.MANAGE_BENEFIT_POLICIES],
  '/benefit-policies/edit/:id': [PERMISSIONS.MANAGE_BENEFIT_POLICIES],
  '/benefit-policies/:id': [PERMISSIONS.VIEW_BENEFIT_POLICIES],

  // ═════════════════════════════════════════════════════════════
  // ✅ ELIGIBILITY
  // ═════════════════════════════════════════════════════════════
  '/eligibility': [PERMISSIONS.VIEW_MEMBERS],

  // ═════════════════════════════════════════════════════════════
  // 🏥 PROVIDER PORTAL
  // ═════════════════════════════════════════════════════════════
  '/provider/eligibility-check': [PERMISSIONS.VIEW_MEMBERS],
  '/provider/visits': [PERMISSIONS.MANAGE_VISITS],
  '/provider/claims/submit': [PERMISSIONS.CREATE_CLAIM],
  '/provider/pre-approvals': [PERMISSIONS.CREATE_PRE_AUTH],
  '/provider/documents': [PERMISSIONS.VIEW_CLAIMS, PERMISSIONS.VIEW_PRE_AUTH],

  // ═════════════════════════════════════════════════════════════
  // 🏢 COMPANIES
  // ═════════════════════════════════════════════════════════════
  '/companies': [PERMISSIONS.VIEW_INSURANCE_COMPANIES],
  '/companies/create': [PERMISSIONS.MANAGE_INSURANCE_COMPANIES],
  '/companies/edit/:id': [PERMISSIONS.MANAGE_INSURANCE_COMPANIES],
  '/companies/:id': [PERMISSIONS.VIEW_INSURANCE_COMPANIES],

  // ═════════════════════════════════════════════════════════════
  // 🔐 RBAC
  // ═════════════════════════════════════════════════════════════
  '/rbac': [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES],

  // ═════════════════════════════════════════════════════════════
  // ⚙️ SETTINGS
  // ═════════════════════════════════════════════════════════════
  '/settings': [PERMISSIONS.MANAGE_SETTINGS],

  // ═════════════════════════════════════════════════════════════
  // 👥 ADMIN - USER MANAGEMENT
  // ═════════════════════════════════════════════════════════════
  '/admin/users': [PERMISSIONS.MANAGE_USERS],
  '/admin/users/:id': [PERMISSIONS.MANAGE_USERS],
  '/admin/roles': [PERMISSIONS.MANAGE_ROLES],
  '/admin/roles/:id/users': [PERMISSIONS.MANAGE_ROLES],
  '/admin/permissions': [PERMISSIONS.MANAGE_ROLES],
  '/admin/role-management': [PERMISSIONS.MANAGE_ROLES],
  '/admin/role-management/:id': [PERMISSIONS.MANAGE_ROLES],

  // ═════════════════════════════════════════════════════════════
  // 📊 REPORTS
  // ═════════════════════════════════════════════════════════════
  '/reports/employers': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_EMPLOYERS],
  '/reports/audit': [PERMISSIONS.VIEW_AUDIT_LOGS],
  '/reports/employer-dashboard': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_EMPLOYERS],
  '/reports/claims': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_CLAIMS],
  '/reports/pre-approvals': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_PRE_AUTH],
  '/reports/visits': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_VISITS],
  '/reports/benefit-policy': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_BENEFIT_POLICIES],
  '/reports/beneficiaries': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_MEMBERS],
  '/reports/financial': [PERMISSIONS.VIEW_REPORTS],
  '/reports/provider-settlement': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_SETTLEMENTS],
  '/reports/provider-reports': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_PROVIDERS],
  '/reports/claims-adjudication': [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.APPROVE_CLAIMS],

  // ═════════════════════════════════════════════════════════════
  // 📂 AUDIT & DOCUMENTS
  // ═════════════════════════════════════════════════════════════
  '/audit': [PERMISSIONS.VIEW_AUDIT_LOGS],
  '/documents-center': [PERMISSIONS.VIEW_CLAIMS, PERMISSIONS.VIEW_PRE_AUTH]
};
```

---

## 📝 PART 4: MIGRATION EXECUTION PLAN

### Phase 1: Foundation (Low Risk) - **2 hours**
**Goal:** Create central config and enhance PermissionGuard

#### Tasks:
1. ✅ Create `frontend/src/config/route-permissions.config.js`
   - Copy permission mapping from above
   - Export ROUTE_PERMISSIONS constant
   - Add helper functions if needed

2. ✅ Fix PermissionGuard SUPER_ADMIN check
   - Change `user.roles?.includes('SUPER_ADMIN')` 
   - To `user.role === 'SUPER_ADMIN'` (singular)
   - Verify in both component and hooks

3. ✅ Add validation warnings
   - Console warn if route has no permission mapping
   - Console error if user tries to access unmapped route

**Deliverables:**
- New file: `route-permissions.config.js`
- Updated: `PermissionGuard.jsx`

**Risk:** ⚠️ LOW - No breaking changes

---

### Phase 2: Core Routes Migration (Medium Risk) - **4 hours**
**Goal:** Convert 50% of routes (highest traffic modules)

#### Priority Routes (Convert First):
1. **Dashboard** (2 routes)
2. **Members** (6 routes)
3. **Employers** (6 routes)
4. **Claims** (4 routes)
5. **Pre-Authorizations** (5 routes)
6. **Providers** (4 routes)

**Total:** 27 routes

#### Migration Pattern:
```jsx
// BEFORE:
<RouteGuard allowedRoles={['ADMIN', 'EMPLOYER']}>
  <MembersList />
</RouteGuard>

// AFTER:
<PermissionGuard permission={PERMISSIONS.VIEW_MEMBERS}>
  <MembersList />
</PermissionGuard>
```

**Deliverables:**
- Updated: `MainRoutes.jsx` (27 routes converted)

**Risk:** ⚠️ MEDIUM - High-traffic routes

---

### Phase 3: Reference Data Routes (Medium Risk) - **3 hours**
**Goal:** Convert medical taxonomy & benefit modules

#### Routes to Convert:
1. **Medical Services** (4 routes)
2. **Medical Categories** (4 routes)
3. **Medical Packages** (4 routes)
4. **Benefit Packages** (4 routes)
5. **Benefit Policies** (4 routes)
6. **Provider Contracts** (3 routes)
7. **Visits** (4 routes)

**Total:** 27 routes

**Deliverables:**
- Updated: `MainRoutes.jsx` (54 routes total converted)

**Risk:** ⚠️ MEDIUM - Reference data integrity

---

### Phase 4: Admin & Reports Routes (Low-Medium Risk) - **2 hours**
**Goal:** Convert admin and reporting routes

#### Routes to Convert:
1. **RBAC** (1 route)
2. **Settings** (1 route)
3. **Admin Module** (7 routes)
4. **Reports Module** (11 routes)
5. **Audit & Documents** (2 routes)
6. **Provider Portal** (5 routes)
7. **Companies** (4 routes)
8. **Eligibility** (1 route)
9. **Approvals Dashboard** (1 route)

**Total:** 33 routes

**Deliverables:**
- Updated: `MainRoutes.jsx` (87 routes total converted)

**Risk:** ⚠️ LOW - Lower traffic, admin-only

---

### Phase 5: Cleanup & Validation (High Importance) - **2 hours**
**Goal:** Remove legacy code and validate all roles

#### Tasks:
1. **Remove RouteGuard Component**
   - Delete or deprecate `frontend/src/routes/RouteGuard.jsx`
   - Remove all imports in `MainRoutes.jsx`

2. **Validate Each Role:**
   - **SUPER_ADMIN:** Can access ALL routes
   - **INSURANCE_ADMIN:** Can access operational routes (no RBAC)
   - **ACCOUNTANT:** Can access settlements + reports only
   - **PROVIDER:** Can access provider portal only
   - **REVIEWER:** Can access claims/pre-auth review only
   - **EMPLOYER:** Can access members + employers only

3. **Add Automated Tests:**
   - Permission guard unit tests
   - Route permission mapping validation
   - Role-based access tests

**Deliverables:**
- Deleted: `RouteGuard.jsx`
- Test suite: Permission validation tests
- Documentation: Role access matrix

**Risk:** ⚠️ LOW - Cleanup phase

---

### Phase 6: Documentation & Hardening (Essential) - **2 hours**
**Goal:** Document and prevent regression

#### Tasks:
1. **Create Documentation:**
   - `PERMISSION_MIGRATION_COMPLETE.md` - Migration summary
   - `ROLE_ACCESS_MATRIX.md` - What each role can access
   - Update `RBAC_DEVELOPER_GUIDE.md`

2. **Add ESLint Rule:**
   - Prevent use of `allowedRoles` prop
   - Enforce PermissionGuard usage

3. **Add CI/CD Validation:**
   - Check all routes have permission mappings
   - Verify no RouteGuard imports exist

**Deliverables:**
- 3 documentation files
- ESLint custom rule
- CI/CD validation script

**Risk:** ⚠️ NONE - Documentation only

---

## ⚠️ PART 5: RISK ANALYSIS

### Critical Risks Identified:

#### 🔴 Risk #1: SUPER_ADMIN Bypass Inconsistency
**Issue:** 
- PermissionGuard uses `user.roles?.includes('SUPER_ADMIN')`
- Auth context likely uses `user.role` (singular)
- May cause SUPER_ADMIN to be blocked

**Mitigation:**
- Fix in Phase 1 before any route conversion
- Test SUPER_ADMIN access immediately

#### 🟡 Risk #2: Missing Permissions in Backend
**Issue:**
- Frontend permission constant exists but backend might not recognize it
- Example: `VIEW_INSURANCE_COMPANIES` - verify backend has this

**Mitigation:**
- Cross-reference all permissions with backend authorities
- Add fallback logging if permission check fails

#### 🟡 Risk #3: Multi-Permission Routes (OR vs AND Logic)
**Issue:**
- Some routes need "VIEW_CLAIMS OR VIEW_PRE_AUTH"
- Current PermissionGuard supports this but needs testing

**Mitigation:**
- Test multi-permission routes thoroughly
- Document OR vs AND logic clearly

#### 🟢 Risk #4: Menu-Route Desync During Migration
**Issue:**
- Menu shows item (permission exists) but route still uses role check

**Mitigation:**
- Migrate in phases (Priority 1 routes first)
- Test after each phase
- Document which routes are migrated

---

## 📊 PART 6: ESTIMATED EFFORT & TIMELINE

| Phase | Tasks | Effort | Risk Level | Dependencies |
|-------|-------|--------|------------|--------------|
| **Phase 1** | Foundation | 2 hours | LOW | None |
| **Phase 2** | Core Routes (27) | 4 hours | MEDIUM | Phase 1 |
| **Phase 3** | Reference Data (27) | 3 hours | MEDIUM | Phase 2 |
| **Phase 4** | Admin & Reports (33) | 2 hours | LOW | Phase 3 |
| **Phase 5** | Cleanup & Validation | 2 hours | LOW | Phase 4 |
| **Phase 6** | Documentation | 2 hours | NONE | Phase 5 |
| **TOTAL** | **94 routes migrated** | **15 hours** | **MEDIUM** | Sequential |

### Timeline (Recommended):
- **Day 1 Morning:** Phase 1 (Foundation)
- **Day 1 Afternoon:** Phase 2 (Core Routes) + Test
- **Day 2 Morning:** Phase 3 (Reference Data) + Test
- **Day 2 Afternoon:** Phase 4 (Admin & Reports) + Test
- **Day 3 Morning:** Phase 5 (Cleanup) + Full Validation
- **Day 3 Afternoon:** Phase 6 (Documentation)

**Total Duration:** 3 working days

---

## ✅ PART 7: SUCCESS CRITERIA

### Pre-Migration Checklist:
- [ ] All 94 routes inventoried
- [ ] All permissions mapped to routes
- [ ] Backend permissions verified
- [ ] Test plan prepared
- [ ] Rollback plan prepared

### Post-Migration Validation:
- [ ] Zero routes use `RouteGuard` with `allowedRoles`
- [ ] All routes use `PermissionGuard`
- [ ] SUPER_ADMIN can access all routes
- [ ] ACCOUNTANT can access only settlements + reports
- [ ] PROVIDER can access only provider portal
- [ ] Menu visibility === Route accessibility
- [ ] No console errors
- [ ] No 403 errors for permitted users
- [ ] All role-based tests pass
- [ ] Documentation complete
- [ ] ESLint rule enforces PermissionGuard

---

## 🚧 PART 8: ROLLBACK PLAN

### If Migration Fails:

1. **Git Revert:**
   ```bash
   git revert HEAD~6  # Revert last 6 commits (one per phase)
   ```

2. **Feature Flag (Alternative):**
   ```javascript
   const USE_PERMISSION_GUARDS = false; // Disable migration
   
   {USE_PERMISSION_GUARDS ? (
     <PermissionGuard permission={PERMISSIONS.VIEW_CLAIMS}>
       <ClaimsList />
     </PermissionGuard>
   ) : (
     <RouteGuard allowedRoles={['ADMIN']}>
       <ClaimsList />
     </RouteGuard>
   )}
   ```

3. **Partial Rollback:**
   - Keep Phase 1 (foundation) - no breaking changes
   - Revert Phases 2-5 if routes break
   - Settlement module already uses PermissionGuard - keep it

---

## 📋 PART 9: FILES TO BE MODIFIED

### New Files (1):
1. ✅ `frontend/src/config/route-permissions.config.js` - **NEW**

### Modified Files (2):
1. ✅ `frontend/src/components/PermissionGuard.jsx` - Enhanced
2. ✅ `frontend/src/routes/MainRoutes.jsx` - 94 routes updated

### Deprecated/Removed Files (1):
1. ❌ `frontend/src/routes/RouteGuard.jsx` - **TO BE REMOVED**

### Documentation Files (3):
1. ✅ `PERMISSION_MIGRATION_COMPLETE.md` - NEW
2. ✅ `ROLE_ACCESS_MATRIX.md` - NEW
3. ✅ `RBAC_DEVELOPER_GUIDE.md` - UPDATED

**Total Files:** 7 modified, 1 removed

---

## 🎯 FINAL RECOMMENDATION

### Proceed with Migration: ✅ **YES**

**Justification:**
1. ✅ Current system has critical architectural flaw (dual authorization)
2. ✅ Settlement module proves PermissionGuard works correctly
3. ✅ All infrastructure exists (PermissionGuard, PERMISSIONS constants)
4. ✅ Clear migration path with low-medium risk
5. ✅ Phased approach allows validation at each step
6. ✅ Rollback plan exists
7. ✅ 15 hours effort is reasonable for 94 routes
8. ✅ Long-term maintainability significantly improved

### Next Steps:
1. **Get Approval** for this execution plan
2. **Review** permission mapping (Part 3)
3. **Confirm** SUPER_ADMIN check fix strategy
4. **Begin Phase 1** upon approval

---

**Analysis Status:** ✅ **COMPLETE**  
**Awaiting:** 🚦 **USER APPROVAL TO PROCEED**  
**Recommendation:** ✅ **APPROVED FOR MIGRATION**

---

**⚠️ WAITING FOR CONFIRMATION TO START CODING ⚠️**
