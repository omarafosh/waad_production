# 🧪 Excel Import System - Testing Checklist

## Overview
This document provides a comprehensive testing checklist for all Excel import modules after the standardization refactor.

---

## 🎯 Pre-Test Setup

### Backend
```bash
cd /workspaces/tba_waad_system/backend
mvn clean install -DskipTests
mvn spring-boot:run
```

### Frontend
```bash
cd /workspaces/tba_waad_system/frontend
npm install
npm run dev
```

### Test User Credentials
- **SUPER_ADMIN:** Has access to ALL import endpoints
- **INSURANCE_COMPANY:** Has access to most import endpoints
- **Regular User:** Limited access based on specific authorities

---

## ✅ Module 1: Members Import

### Template Download
- [ ] **Endpoint:** GET `/api/members/import/template`
- [ ] **Expected:** 200 OK, Excel file downloads
- [ ] **Template Structure:**
  - [ ] Header row with AR/EN column names
  - [ ] Example row with sample data
  - [ ] Employers lookup sheet
  - [ ] Metadata sheet (hidden)
  - [ ] Yellow highlighted mandatory columns
  
### Import Execution
- [ ] **Endpoint:** POST `/api/members/import`
- [ ] **Test Cases:**
  - [ ] Valid template with 5 members → 5 created
  - [ ] Template with duplicate civil_id → Gracefully handled
  - [ ] Missing mandatory field (full_name) → Error reported with row number
  - [ ] Invalid gender value → Error reported
  - [ ] Non-existent employer → Error reported with lookup failure
  - [ ] Empty file → Validation error

### Authorization
- [ ] SUPER_ADMIN can download template
- [ ] SUPER_ADMIN can import
- [ ] User with `members.import` authority can import
- [ ] User without permission gets 403

---

## ✅ Module 2: Medical Categories Import

### Template Download
- [ ] **Endpoint:** GET `/api/medical-categories/import/template`
- [ ] **Expected:** 200 OK (was 403 before fix)
- [ ] **Template Structure:**
  - [ ] Header row: code, name_ar, name_en, description, active
  - [ ] Example row with sample data
  - [ ] No lookup sheets (flat structure)
  - [ ] Metadata sheet

### Import Execution  
- [ ] **Endpoint:** POST `/api/medical-categories/import`
- [ ] **Test Cases:**
  - [ ] New category with unique code → Created
  - [ ] Existing category code → Updated (upsert)
  - [ ] Missing mandatory field (code) → Error
  - [ ] Duplicate code in file → Only first processed
  - [ ] Arabic-only name → Valid
  - [ ] Empty template → No changes

### Authorization
- [ ] SUPER_ADMIN can download template ✅
- [ ] INSURANCE_COMPANY can download template ✅ (was 403)
- [ ] SUPER_ADMIN can import ✅
- [ ] INSURANCE_COMPANY can import ✅ (was 403)
- [ ] Regular user gets 403

---

## ✅ Module 3: Medical Services Import

### Template Download
- [ ] **Endpoint:** GET `/api/medical-services/import/template`
- [ ] **Expected:** 200 OK (was 403 before fix)
- [ ] **Template Structure:**
  - [ ] Header row: code, name, category, base_price, description
  - [ ] Example row
  - [ ] Categories lookup sheet with valid category codes
  - [ ] Metadata sheet

### Import Execution
- [ ] **Endpoint:** POST `/api/medical-services/import`
- [ ] **Test Cases:**
  - [ ] New service with valid category → Created
  - [ ] Existing service code → Updated (upsert)
  - [ ] Invalid category code → Error with lookup failure
  - [ ] Missing base_price → Defaults to 0.00
  - [ ] Negative base_price → Validation error
  - [ ] Service without code → Error (code required)

### Authorization
- [ ] SUPER_ADMIN can download template ✅
- [ ] INSURANCE_COMPANY can download template ✅ (was 403)
- [ ] SUPER_ADMIN can import ✅
- [ ] INSURANCE_COMPANY can import ✅ (was 403)
- [ ] Regular user gets 403

---

## ✅ Module 4: Provider Contract Pricing Import

### Template Download
- [ ] **Endpoint:** GET `/api/provider-contracts/pricing/import/template`
- [ ] **Expected:** 200 OK (was 500 before fix)
- [ ] **Template is GENERIC** (no contract-specific data pre-filled)
- [ ] **Template Structure:**
  - [ ] Header row: service_code, service_name, base_price, contract_price, unit, notes
  - [ ] Example row
  - [ ] Medical Services lookup sheet
  - [ ] Metadata sheet

### Import Execution
- [ ] **Endpoint:** POST `/api/provider-contracts/{contractId}/pricing/import`
- [ ] **Test Cases:**
  - [ ] New pricing item → Created
  - [ ] Existing service for contract → Updated (upsert)
  - [ ] Missing contract_price → Error
  - [ ] Service lookup by code → Success
  - [ ] Service lookup by name (AR) → Success
  - [ ] Service lookup by name (EN) → Success
  - [ ] Non-existent service → Error with lookup failure
  - [ ] Discount percentage auto-calculated correctly
  - [ ] Import to EXPIRED contract → Validation error
  - [ ] Import to TERMINATED contract → Validation error

### Authorization
- [ ] SUPER_ADMIN can download template ✅
- [ ] User with MANAGE_PROVIDER_CONTRACTS can download ✅
- [ ] INSURANCE_COMPANY can download ✅
- [ ] SUPER_ADMIN can import ✅
- [ ] User with MANAGE_PROVIDER_CONTRACTS can import ✅
- [ ] Regular user gets 403

---

## 🔍 Error Handling Validation

### Structural Errors (Should fail immediately)
- [ ] Missing mandatory column → Clear error message
- [ ] Completely empty file → Validation error
- [ ] File with wrong format (not .xlsx) → Format error
- [ ] File not generated from system → Version mismatch warning

### Data Errors (Should report per row)
- [ ] Row 5 has invalid data → Error shows "Row 5: ..."
- [ ] Multiple rows with errors → All errors listed
- [ ] 100 valid rows + 5 invalid → 100 imported, 5 errors reported
- [ ] Error includes: row number, column name, error type, invalid value

### Transaction Safety
- [ ] Import with 50% errors → Valid rows imported, invalid rows rejected
- [ ] Database constraint violation → Rolled back, error reported
- [ ] Concurrent imports to same entity → One succeeds, others fail gracefully

---

## 📊 Performance Benchmarks

### Template Generation
- [ ] Members template (with 100 employers lookup) → < 500ms
- [ ] Medical Services template (with 50 categories) → < 300ms
- [ ] Contract Pricing template (with 500 services) → < 1s

### Import Processing
- [ ] 100 members → < 5s
- [ ] 500 medical services → < 10s
- [ ] 1000 pricing items → < 15s

### Memory Usage
- [ ] Importing 10,000 rows → No OutOfMemoryError
- [ ] Concurrent imports (5 users) → No performance degradation

---

## 🔐 Security Testing

### Authentication
- [ ] Unauthenticated request → 401 Unauthorized
- [ ] Invalid token → 401 Unauthorized
- [ ] Expired session → 401 Unauthorized

### Authorization
- [ ] User without permission → 403 Forbidden
- [ ] SUPER_ADMIN bypasses all checks → 200 OK
- [ ] Specific authority granted → 200 OK
- [ ] Role without authority → 403 Forbidden

### CSRF Protection
- [ ] GET requests (template download) → No CSRF token required
- [ ] POST requests (import) → CSRF disabled (REST API pattern)

---

## 🧩 Integration Testing

### End-to-End Workflow
1. [ ] User logs in
2. [ ] Downloads template
3. [ ] Opens in Excel
4. [ ] Fills data using lookup sheets
5. [ ] Saves file
6. [ ] Uploads file via import
7. [ ] Sees success message with summary
8. [ ] Verifies data appears in system

### Cross-Module Dependencies
- [ ] Import members with employer lookup → Employer must exist
- [ ] Import medical services with category lookup → Category must exist
- [ ] Import pricing with service lookup → Service must exist
- [ ] Import pricing with contract → Contract must be ACTIVE or PENDING

---

## 📱 Frontend Integration

### UI Components
- [ ] Import button appears for authorized users
- [ ] Import button hidden for unauthorized users
- [ ] Template download works from UI
- [ ] File upload dialog opens
- [ ] Upload progress indicator shows
- [ ] Success message displays import summary
- [ ] Error dialog shows detailed error list

### User Experience
- [ ] Template downloads with proper filename
- [ ] File picker accepts only .xlsx files
- [ ] Import shows loading state
- [ ] Results display clearly (X created, Y updated, Z failed)
- [ ] Error rows highlighted with specific messages

---

## 🐛 Regression Testing

### Issues That Should NOT Occur
- [ ] ❌ 500 error during template download
- [ ] ❌ 403 error for authorized users
- [ ] ❌ Transaction rollback-only errors
- [ ] ❌ LazyInitializationException during import
- [ ] ❌ N+1 query problem (check logs for excessive queries)
- [ ] ❌ Memory leaks during large imports
- [ ] ❌ Null pointer exceptions

### Consistency Checks
- [ ] All templates have same structure (header + example + lookups + metadata)
- [ ] All imports return same ExcelImportResult format
- [ ] All error messages are bilingual (AR + EN)
- [ ] All authorization patterns match

---

## 📝 Test Results Summary

| Module | Template Download | Import Success | Error Handling | Performance | Security | Status |
|--------|------------------|----------------|----------------|-------------|----------|---------|
| Members | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⏳ Pending |
| Medical Categories | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⏳ Pending |
| Medical Services | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⏳ Pending |
| Contract Pricing | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⏳ Pending |

**Legend:** ✅ Pass | ❌ Fail | ⏳ Pending | ⚠️ Warning

---

## 🔄 Automated Test Script

```bash
#!/bin/bash
# test-excel-imports.sh

BASE_URL="http://localhost:8080/api"
TOKEN="your-jwt-token-here"

echo "🧪 Testing Excel Import System..."

# Test 1: Members Template
echo "1️⃣ Testing Members Template Download..."
curl -s -o /tmp/members.xlsx \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/members/import/template"
[ -f /tmp/members.xlsx ] && echo "✅ Members template downloaded" || echo "❌ Failed"

# Test 2: Medical Categories Template
echo "2️⃣ Testing Medical Categories Template Download..."
curl -s -o /tmp/categories.xlsx \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/medical-categories/import/template"
[ -f /tmp/categories.xlsx ] && echo "✅ Categories template downloaded" || echo "❌ Failed"

# Test 3: Medical Services Template
echo "3️⃣ Testing Medical Services Template Download..."
curl -s -o /tmp/services.xlsx \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/medical-services/import/template"
[ -f /tmp/services.xlsx ] && echo "✅ Services template downloaded" || echo "❌ Failed"

# Test 4: Contract Pricing Template
echo "4️⃣ Testing Contract Pricing Template Download..."
curl -s -o /tmp/pricing.xlsx \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/provider-contracts/pricing/import/template"
[ -f /tmp/pricing.xlsx ] && echo "✅ Pricing template downloaded" || echo "❌ Failed"

echo "✅ All template downloads tested!"
```

---

## 📞 Support Checklist

### If Template Download Fails
1. Check user authentication (valid token/session)
2. Verify user has required authority
3. Check backend logs for exceptions
4. Verify database connectivity
5. Check lookup data exists (e.g., employers for members)

### If Import Fails
1. Verify file is .xlsx format
2. Check file was downloaded from system (not manually created)
3. Verify mandatory columns are filled
4. Check lookup values match reference sheets
5. Review import error details (row number + message)
6. Check entity state (e.g., contract not expired)

### If 403 Errors Occur
1. Verify user is authenticated
2. Check user has required authority in database
3. Review @PreAuthorize annotation on endpoint
4. Check if SUPER_ADMIN role is set correctly
5. Clear browser cache and re-login

---

**Testing Date:** January 6, 2026  
**Tester:** _____________  
**Status:** ⏳ Ready for Testing
