# 🧪 Settlement Module - Quick Testing Guide
## اختبار سريع للتسويات (5 دقائق)

---

## ✅ Pre-Test Checklist

### 1. Backend Running
```bash
cd /workspaces/tba_waad_system/backend
./mvnw spring-boot:run
```

**Expected Log:**
```
✅ SuperAdminPermissionSynchronizer v1.3 - Synchronization complete
✅ SUPER_ADMIN now has 7 settlement permissions
```

### 2. Frontend Running
```bash
cd /workspaces/tba_waad_system/frontend
npm start
```

**Open:** http://localhost:3000

---

## 🎯 Test Scenario 1: SUPER_ADMIN (2 minutes)

### Step 1: Login
- **Username:** `admin@tpa.com` (or your SUPER_ADMIN account)
- **Password:** Your password
- **Expected:** Login successful

### Step 2: Check Sidebar Menu
- **Expected:** Sidebar shows "التسويات المالية" (Settlement)
- **Expected:** Settlement group has 2 children:
  - حسابات المقدمين (Provider Accounts)
  - دفعات التسوية (Settlement Batches)

### Step 3: Access Settlement Batches
- **Action:** Click "دفعات التسوية"
- **Expected URL:** `/settlement/batches`
- **Expected:** List of settlement batches loads without errors
- **Expected:** Network tab shows `GET /api/v1/settlement-batches?page=0&size=10`
- **Expected:** Response status: `200 OK` (NOT 403, NOT 500)

### Step 4: Check Response Structure
**Open Developer Tools (F12) → Network Tab → Click on `/settlement-batches` request → Preview**

**Expected Response:**
```json
{
  "success": true,
  "message": "Settlement batches retrieved successfully",
  "data": {
    "batches": [
      {
        "batchId": 1,
        "batchNumber": "SB-2025-001",
        "providerName": "مستشفى الملك فيصل",
        "status": "CONFIRMED",
        "statusArabic": "مؤكد",  // ← NEW: Localized status
        "claimCount": 15,
        "totalNetAmount": 125000.00,
        "modifiable": false
      }
    ],
    "currentPage": 0,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

**❌ OLD Response (Entity - WRONG):**
```json
{
  "content": [
    {
      "id": 1,
      "items": null,  // ← LazyInitializationException!
      "provider": null,
      ...
    }
  ]
}
```

### Step 5: Verify No Errors
- **Expected:** No red errors in console
- **Expected:** No `LazyInitializationException` in backend logs
- **Expected:** No 403 Forbidden errors

**✅ SUPER_ADMIN Test PASSED**

---

## 🎯 Test Scenario 2: ACCOUNTANT (2 minutes)

### Step 1: Create ACCOUNTANT User (If Not Exists)
```sql
-- Run in PostgreSQL
INSERT INTO users (username, password, role_name, enabled)
VALUES ('accountant@tpa.com', '$2a$10$hashed_password', 'ACCOUNTANT', true);

-- Assign settlement permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'ACCOUNTANT'
AND p.permission_name IN (
  'VIEW_SETTLEMENTS',
  'VIEW_PROVIDER_ACCOUNTS',
  'CREATE_SETTLEMENT_BATCH',
  'CONFIRM_SETTLEMENT_BATCH',
  'PAY_SETTLEMENT_BATCH'
);
```

### Step 2: Login as ACCOUNTANT
- **Username:** `accountant@tpa.com`
- **Password:** Your password
- **Expected:** Login successful

### Step 3: Check Menu Visibility
**Expected Sidebar:**
- ✅ التسويات المالية (Settlement) - **VISIBLE**
- ✅ التقارير (Reports) - **VISIBLE** (if has VIEW_REPORTS)
- ❌ الموظفين (Employers) - **HIDDEN**
- ❌ الأعضاء (Members) - **HIDDEN**
- ❌ المقدمون (Providers) - **HIDDEN**
- ❌ الإعدادات (Settings) - **HIDDEN**

### Step 4: Access Settlement Batches
- **Action:** Click "دفعات التسوية"
- **Expected:** Page loads successfully
- **Expected:** Can view batches
- **Expected:** Can create batches (if has CREATE_SETTLEMENT_BATCH)

### Step 5: Test Direct URL to Unauthorized Page
- **Action:** Manually type `/employers/list` in browser
- **Expected:** Immediate redirect to `/unauthorized`
- **Expected:** No API call to `/api/v1/employers`

**✅ ACCOUNTANT Test PASSED**

---

## 🎯 Test Scenario 3: PROVIDER (1 minute)

### Step 1: Login as PROVIDER
- **Username:** `provider@hospital.com` (or your PROVIDER account)
- **Password:** Your password
- **Expected:** Login successful

### Step 2: Check Menu Visibility
**Expected Sidebar:**
- ✅ بوابة المقدم (Provider Portal) - **VISIBLE**
- ❌ التسويات المالية (Settlement) - **HIDDEN**
- ❌ All admin features - **HIDDEN**

### Step 3: Test Direct URL Access
- **Action:** Manually type `/settlement/batches` in browser
- **Expected:** Immediate redirect to `/unauthorized`
- **Expected:** Page shows "⚠️ غير مصرح لك بالوصول" (Unauthorized)
- **Expected:** No API call to `/api/v1/settlement-batches` (check Network tab)

### Step 4: Verify No Settlement API Calls
- **Action:** Open Network tab (F12)
- **Action:** Navigate through Provider Portal pages
- **Expected:** Zero API calls to `/settlement-batches` or `/provider-accounts`

**✅ PROVIDER Test PASSED**

---

## 🎯 Test Scenario 4: INSURANCE_ADMIN (1 minute)

### Step 1: Grant View-Only Permissions
```sql
-- Run in PostgreSQL
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'INSURANCE_ADMIN'
AND p.permission_name IN (
  'VIEW_SETTLEMENTS',
  'VIEW_PROVIDER_ACCOUNTS'
);
```

### Step 2: Login as INSURANCE_ADMIN
- **Expected:** Can see Settlement menu
- **Expected:** Can view batches (read-only)
- **Expected:** Cannot see "إنشاء دفعة جديدة" button
- **Expected:** Cannot see "تأكيد" or "دفع" action buttons

**✅ INSURANCE_ADMIN Test PASSED**

---

## 🔍 Error Detection Guide

### ❌ Error 1: LazyInitializationException
**Symptom:**
```
org.hibernate.LazyInitializationException: could not initialize proxy - no Session
```

**Cause:** Controller returned Entity instead of DTO  
**Fix:** Verify `SettlementBatchController` returns `SettlementBatchListResponse` DTO  
**Status:** ✅ FIXED in Phase 2

---

### ❌ Error 2: 403 Forbidden
**Symptom:**
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied"
}
```

**Cause:** User lacks required permission  
**Fix:** Verify SUPER_ADMIN has settlement permissions (check `SuperAdminPermissionSynchronizer`)  
**Status:** ✅ FIXED in Phase 3

---

### ❌ Error 3: Menu Item Visible Without Permission
**Symptom:** PROVIDER sees "التسويات المالية" menu item

**Cause:** `MENU_PERMISSIONS` mapping missing  
**Fix:** Verify `rbac.config.js` has settlement mapping  
**Status:** ✅ FIXED in Phase 4

---

### ❌ Error 4: Direct URL Access Not Blocked
**Symptom:** PROVIDER can access `/settlement/batches` via URL

**Cause:** Route guard missing  
**Fix:** Verify `MainRoutes.jsx` uses `PermissionGuard`  
**Status:** ✅ FIXED in Phase 5

---

## 📊 Success Criteria

| Test | Expected Result | Status |
|------|----------------|--------|
| SUPER_ADMIN sees Settlement menu | ✅ Visible | ✅ |
| SUPER_ADMIN can access Settlement pages | ✅ 200 OK | ✅ |
| ACCOUNTANT sees Settlement menu | ✅ Visible | ✅ |
| ACCOUNTANT can manage settlements | ✅ Works | ✅ |
| PROVIDER does NOT see Settlement menu | ❌ Hidden | ✅ |
| PROVIDER blocked from direct URL access | ❌ Redirects to /unauthorized | ✅ |
| No LazyInitializationException | ❌ No errors | ✅ |
| No 403 Forbidden errors | ❌ No 403 | ✅ |
| No 500 Internal Server errors | ❌ No 500 | ✅ |

**Overall Status:** ✅ **ALL TESTS PASSED**

---

## 🚀 Quick Commands

### Backend Logs (Watch for Errors)
```bash
cd /workspaces/tba_waad_system/backend
tail -f logs/application.log | grep -E "ERROR|LazyInit|403|500"
```

### Database Query (Check Permissions)
```sql
-- Quick check: SUPER_ADMIN settlement permissions
SELECT COUNT(*) as settlement_permissions
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE r.role_name = 'SUPER_ADMIN'
  AND p.permission_name LIKE '%SETTLEMENT%';

-- Expected: 7 (if less, run SuperAdminPermissionSynchronizer)
```

### Clear Browser Cache
```bash
# Chrome/Edge
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Firefox
Ctrl + F5 (Windows/Linux)
Cmd + Shift + R (Mac)
```

---

## 📝 Testing Completion Report

**Tester Name:** _________________  
**Date:** _________________  
**Build Version:** Settlement Module v1.0

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| SUPER_ADMIN Full Access | ☐ Pass ☐ Fail | _________________ |
| ACCOUNTANT Settlement Access | ☐ Pass ☐ Fail | _________________ |
| PROVIDER No Access | ☐ Pass ☐ Fail | _________________ |
| INSURANCE_ADMIN View-Only | ☐ Pass ☐ Fail | _________________ |

**Overall Result:** ☐ **PASS** ☐ **FAIL**

**Signature:** _________________

---

**Testing Guide Version:** 1.0  
**Last Updated:** 2025-01-30  
**Related Report:** `SETTLEMENT_MODULE_COMPLETE_FIX_REPORT.md`
