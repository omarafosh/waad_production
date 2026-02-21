# Runtime QA Smoke Log — 2026-02-17

## Scope
Focused runtime smoke checklist requested for:
1) Claim lifecycle
2) PreAuth lifecycle
3) RBAC mutation behavior
4) Guard visibility matrix
5) Network tab verification

## Environment
- Workspace: `d:\tba_waad_system`
- Branch: `main`
- Frontend build command: `npm run build`
- Build result: ✅ PASS

---

## 1) Claim Lifecycle Full Path

### Provider flow
- Create claim → DRAFT: ⛔ BLOCKED (needs interactive UI + test account)
- Edit claim → remains DRAFT: ⛔ BLOCKED (needs interactive UI + test account)
- Submit → SUBMITTED: ⛔ BLOCKED (needs interactive UI + test account)
- Cannot edit after submit: ⛔ BLOCKED (needs interactive UI + test account)
- Cannot submit twice: ⛔ BLOCKED (needs interactive UI + test account)

### Reviewer flow
- See only assigned providers: ⛔ BLOCKED (needs reviewer account + assigned providers data)
- Set NEEDS_CORRECTION: ⛔ BLOCKED (needs interactive UI + reviewer account)
- Provider can edit: ⛔ BLOCKED (needs provider account)
- Resubmit: ⛔ BLOCKED (needs provider account)
- Approve: ⛔ BLOCKED (needs reviewer account)
- Cannot edit after APPROVED: ⛔ BLOCKED (needs interactive UI + account flow)

### After Settlement
- No edit allowed: ⛔ BLOCKED (needs settlement scenario data)
- No review allowed: ⛔ BLOCKED (needs settlement scenario data)
- No submit allowed: ⛔ BLOCKED (needs settlement scenario data)

---

## 2) PreAuth Lifecycle
- Create → PENDING: ⛔ BLOCKED (needs provider workflow runtime)
- Submit → UNDER_REVIEW: ⛔ BLOCKED (needs provider workflow runtime)
- NEEDS_CORRECTION: ⛔ BLOCKED (needs reviewer runtime action)
- Resubmit: ⛔ BLOCKED (needs provider runtime action)
- Approve: ⛔ BLOCKED (needs reviewer runtime action)
- Create claim from approved preauth: ⛔ BLOCKED (needs approved preauth data + provider account)

---

## 3) RBAC Mutation Test (Critical)

### Step 1
- Login as admin
- Remove permission from Role X
- Save

Status: ⛔ BLOCKED (interactive login/session required)

### Step 2 (Session reaction)
- Does current user refresh?
- Are buttons instantly removed?
- Or require logout/login?

Static code verification:
- `refreshUser()` now reinitializes RBAC store from backend payload.
- Page-centric role permission save now triggers `refreshUser()` immediately after assignment.

Result: ✅ PASS (code-path verified) / ⛔ BLOCKED (runtime confirmation requires browser session)

### Step 3
- Logout
- Login again
- Verify permissions fully aligned

Status: ⛔ BLOCKED (interactive auth required)

Drift verdict:
- Runtime verdict: ⛔ BLOCKED (cannot confirm without interactive accounts)
- Static drift risk after save: ✅ Reduced by forced refresh path

---

## 4) Guard Visibility Matrix
Accounts to validate:
- Provider
- Reviewer
- Employer Admin
- Super Admin

Targets:
- Dashboard
- Claims
- PreAuth
- Role Management
- Settings

Checks:
- Empty page
- Hidden 403 route
- Button visible but action fails

Status: ⛔ BLOCKED (requires 4 runtime accounts + browser navigation)

---

## 5) Network/Contract Verification

### Automated verifications (done)
- No deprecated calls to:
  - `PUT /claims/{id}`
  - `PUT /pre-authorizations/{id}`

Result: ✅ PASS (service-layer search)

- Canonical calls found:
  - `PUT /claims/{id}/data`
  - `PUT /claims/{id}/review`
  - `POST /claims/{id}/submit`
  - `PUT /pre-authorizations/{id}/data`
  - `PUT /pre-authorizations/{id}/review`

Result: ✅ PASS

- `RETURNED_FOR_INFO` references in frontend source:

Result: ✅ PASS (none found)

- Frontend compile/build:

Result: ✅ PASS

### DevTools runtime network checks (manual-only)
- No 500
- No unexplained 403
- No unexpected 401

Status: ⛔ BLOCKED (requires browser DevTools session)

---

## Console Errors / Silent UI Failures
- Console errors during interactive flows: ⛔ BLOCKED (browser runtime needed)
- Silent UI failure detection: ⛔ BLOCKED (browser runtime needed)

---

## Final QA Status
- **Automatable smoke checks**: ✅ PASS
- **Interactive runtime smoke checks**: ⛔ BLOCKED (credentials + browser session required)

## Required to close runtime QA completely
1. Execute checklist with 4 real accounts (Provider/Reviewer/Employer Admin/Super Admin)
2. Capture DevTools Network + Console during each lifecycle
3. Mark each blocked line above as PASS/FAIL with evidence (timestamp + endpoint + UI screen)
