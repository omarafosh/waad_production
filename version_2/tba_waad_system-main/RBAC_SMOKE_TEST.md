# 🧪 RBAC SMOKE TEST CHECKLIST
> Phase 6: Role-Based Testing Matrix

**Date:** 2026-02-05  
**Auditor:** AI Assistant  
**Status:** ✅ READY FOR EXECUTION

---

## 📊 Test Matrix Overview

| Role | Test Cases | Priority |
|------|------------|----------|
| SUPER_ADMIN | 25 | 🔴 Critical |
| ADMIN | 20 | 🔴 Critical |
| INSURANCE_ADMIN | 15 | 🟡 High |
| EMPLOYER_ADMIN | 12 | 🟡 High |
| PROVIDER | 10 | 🟡 High |
| REVIEWER/MEDICAL_REVIEWER | 15 | 🟡 High |
| USER | 8 | 🟢 Medium |

---

## 🔴 SUPER_ADMIN Tests (Full Access)

### Dashboard & Navigation
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| SA-01 | Login as SUPER_ADMIN | Redirect to Dashboard | ☐ |
| SA-02 | View main dashboard | All widgets visible | ☐ |
| SA-03 | View all menu items | All 48 menu items visible | ☐ |
| SA-04 | Access approvals dashboard | Page loads | ☐ |

### Members Module
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| SA-05 | View members list | Table loads with data | ☐ |
| SA-06 | Create new member | Form submits successfully | ☐ |
| SA-07 | Edit existing member | Changes save | ☐ |
| SA-08 | Delete member | Confirmation + delete | ☐ |
| SA-09 | Import members | Upload + process | ☐ |

### Claims Module
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| SA-10 | View claims list | Table loads | ☐ |
| SA-11 | View claim details | Modal/page opens | ☐ |
| SA-12 | Approve claim | Status changes | ☐ |
| SA-13 | Reject claim | Status changes + reason | ☐ |

### Pre-Authorization Module
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| SA-14 | View pre-auth list | Table loads | ☐ |
| SA-15 | Approve pre-auth | Status changes | ☐ |
| SA-16 | Reject pre-auth | Status changes | ☐ |

### Settlement Module
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| SA-17 | View settlements | Table loads | ☐ |
| SA-18 | Create batch | Batch created | ☐ |
| SA-19 | Confirm batch | Status = CONFIRMED | ☐ |
| SA-20 | Pay batch | Status = PAID | ☐ |

### Administration
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| SA-21 | View users list | Table loads | ☐ |
| SA-22 | Create user | User created | ☐ |
| SA-23 | View roles | Table loads | ☐ |
| SA-24 | Assign permissions | Permissions saved | ☐ |
| SA-25 | View audit logs | Logs visible | ☐ |

---

## 🔴 ADMIN Tests (Limited Admin)

### Access Control
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| AD-01 | Login as ADMIN | Redirect to Dashboard | ☐ |
| AD-02 | View dashboard | Limited widgets | ☐ |
| AD-03 | Menu visibility | Reduced menu items | ☐ |

### Operational Access
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| AD-04 | View members | ✅ Allowed | ☐ |
| AD-05 | Create member | ✅ Allowed | ☐ |
| AD-06 | View claims | ✅ Allowed | ☐ |
| AD-07 | Process claims | ✅ Allowed | ☐ |
| AD-08 | View pre-auth | ✅ Allowed | ☐ |

### Restricted Access
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| AD-09 | Access user management | ❌ Denied or limited | ☐ |
| AD-10 | Access role management | ❌ Denied | ☐ |
| AD-11 | Access audit logs | ❌ Denied | ☐ |

---

## 🟡 REVIEWER Tests (Read + Approve)

### Core Access
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| RV-01 | Login as REVIEWER | Redirect to Dashboard | ☐ |
| RV-02 | View dashboard | Approvals dashboard | ☐ |
| RV-03 | Menu visibility | Review-focused items | ☐ |

### Claims Review
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| RV-04 | View claims list | ✅ Allowed | ☐ |
| RV-05 | View claim details | ✅ Allowed | ☐ |
| RV-06 | Approve claim | ✅ Allowed | ☐ |
| RV-07 | Reject claim | ✅ Allowed | ☐ |
| RV-08 | Create claim | ❌ Button hidden | ☐ |

### Pre-Auth Review
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| RV-09 | View pre-auth list | ✅ Allowed | ☐ |
| RV-10 | Approve pre-auth | ✅ Allowed | ☐ |
| RV-11 | Reject pre-auth | ✅ Allowed | ☐ |

### Member Access (Fixed in Session)
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| RV-12 | View members | ✅ Allowed (fixed) | ☐ |
| RV-13 | View employer selectors | ✅ No 403 error | ☐ |
| RV-14 | View unified members | ✅ No 403 error | ☐ |
| RV-15 | View provider contracts | ✅ No 403 error | ☐ |

---

## 🟡 PROVIDER Tests (Provider Portal)

### Portal Access
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| PR-01 | Login as PROVIDER | Redirect to Provider Portal | ☐ |
| PR-02 | View provider dashboard | Provider-specific widgets | ☐ |
| PR-03 | View own contracts | ✅ Allowed | ☐ |
| PR-04 | View own settlements | ✅ Allowed | ☐ |

### Claim Submission
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| PR-05 | Submit new claim | ✅ Allowed | ☐ |
| PR-06 | View own claims | ✅ Allowed | ☐ |
| PR-07 | Edit draft claim | ✅ Allowed | ☐ |
| PR-08 | View all claims | ❌ Denied | ☐ |

### Pre-Auth Submission
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| PR-09 | Submit pre-auth | ✅ Allowed | ☐ |
| PR-10 | View own pre-auth | ✅ Allowed | ☐ |

---

## 🟡 EMPLOYER_ADMIN Tests

### Employer Access
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| EA-01 | Login as EMPLOYER_ADMIN | Redirect to Dashboard | ☐ |
| EA-02 | View own employer | ✅ Allowed | ☐ |
| EA-03 | View own members | ✅ Allowed | ☐ |
| EA-04 | Add member | ✅ Allowed | ☐ |
| EA-05 | View other employers | ❌ Denied | ☐ |

### Limited Operations
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| EA-06 | View claims for own members | ✅ Allowed | ☐ |
| EA-07 | Process claims | ❌ Denied | ☐ |
| EA-08 | View settlements | ❌ Denied | ☐ |

---

## 🟢 USER Tests (Basic Access)

### Minimal Access
| Test ID | Test Case | Expected Result | ✓/✗ |
|---------|-----------|-----------------|------|
| US-01 | Login as USER | Redirect to Dashboard | ☐ |
| US-02 | View own profile | ✅ Allowed | ☐ |
| US-03 | View members | Depends on permissions | ☐ |
| US-04 | Create anything | ❌ Mostly denied | ☐ |

---

## 🔧 API Endpoint Tests

### Critical Endpoints (All Roles)
| Endpoint | SUPER_ADMIN | ADMIN | REVIEWER | PROVIDER |
|----------|-------------|-------|----------|----------|
| GET /members | ✅ | ✅ | ✅ | ❌ |
| POST /members | ✅ | ✅ | ❌ | ❌ |
| GET /claims | ✅ | ✅ | ✅ | Own only |
| POST /claims | ✅ | ✅ | ❌ | ✅ |
| PUT /claims/{id}/approve | ✅ | ✅ | ✅ | ❌ |
| GET /settlements | ✅ | ✅ | ✅ | Own only |
| POST /settlements/batch | ✅ | ✅ | ❌ | ❌ |
| GET /employers/selectors | ✅ | ✅ | ✅ | ❌ |
| GET /unified-members | ✅ | ✅ | ✅ | ❌ |

### Fixed Endpoints (Session Changes)
| Endpoint | Before | After |
|----------|--------|-------|
| GET /employers/selectors | 403 for REVIEWER | ✅ 200 |
| GET /employers | 403 for REVIEWER | ✅ 200 |
| GET /unified-members | 403 for REVIEWER | ✅ 200 |
| GET /provider-contracts/provider/{id} | 403 for REVIEWER | ✅ 200 |

---

## 📝 Test Execution Instructions

### Pre-Test Setup
```bash
# 1. Ensure backend is running
cd backend && ./mvnw spring-boot:run

# 2. Ensure frontend is running
cd frontend && npm start

# 3. Clear browser cache
# 4. Prepare test accounts for each role
```

### Test Data Requirements
- [ ] 1 user per role in database
- [ ] Test members with different statuses
- [ ] Test claims in various states
- [ ] Test pre-auth requests
- [ ] Test settlements (draft, confirmed, paid)

### Execution Steps
1. Login with test account
2. Execute all tests for that role
3. Mark ✓ for pass, ✗ for fail
4. Document any failures with screenshots
5. Logout and repeat for next role

---

## ✅ Phase 6 Checklist Summary

### Critical Tests (Must Pass)
- [ ] SA-01 to SA-10 (SUPER_ADMIN core)
- [ ] RV-12 to RV-15 (REVIEWER fixes verified)
- [ ] All 403 errors resolved
- [ ] All menu items show correctly per role

### High Priority Tests
- [ ] All CRUD operations work
- [ ] All workflow actions work (approve, reject, settle)
- [ ] Reports accessible to authorized roles

### Medium Priority Tests
- [ ] Edge cases (empty data, large data)
- [ ] Concurrent user scenarios
- [ ] Session timeout handling

---

**PHASE 6: ✅ SMOKE TEST CHECKLIST COMPLETE**

**Next:** Execute tests, document results, proceed to Final Sign-off
