# ✅ POST-FIX SMOKE TEST CHECKLIST

**Date:** December 20, 2025  
**Scope:** Frontend-Backend Integration Verification  
**Duration:** ~15 minutes  
**Environment:** Local Development (localhost:3000 + localhost:8080)

---

## 🔧 PRE-TEST SETUP

### Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Verify MySQL is running
# Check: Database should be accessible at localhost:5432 (PostgreSQL)

# 3. Build backend
mvn clean package

# 4. Start backend
java -jar target/tba-waad-system-backend-*.jar

# Expected output:
# Started TbaWaadApplication in X seconds
# Server running on port 8080
```

### Frontend Setup
```bash
# 1. Navigate to frontend
cd frontend

# 2. Copy environment config
cp .env.example .env.local

# 3. Verify .env.local has correct values
cat .env.local
# Should show: VITE_API_URL=http://localhost:8080/api

# 4. Install dependencies (if needed)
yarn install

# 5. Start frontend dev server
yarn start

# Expected output:
# VITE v7.1.9 ready in XXX ms
# ➜  Local:   http://localhost:3000/
```

---

## 🧪 TEST CASES

### TEST 1: Backend API Response Format

**Objective:** Verify EmployerController returns wrapped responses

**Steps:**
1. Open terminal/Postman
2. Execute: `curl -X GET http://localhost:8080/api/employers -H "Content-Type: application/json"`
3. Verify response

**Expected Response:**
```json
{
  "status": "success",
  "data": [],
  "timestamp": "2025-12-20T10:30:00"
}
```

**Verification:**
- [ ] HTTP Status: 200 OK
- [ ] Response has `status` field
- [ ] Response has `data` field (array)
- [ ] Response has `timestamp` field
- [ ] No raw array returned (not `[{...}]`)

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 2: Backend Selectors Endpoint

**Objective:** Verify `/selectors` endpoint returns wrapped response

**Steps:**
1. Execute: `curl -X GET http://localhost:8080/api/employers/selectors -H "Content-Type: application/json"`
2. Verify response

**Expected Response:**
```json
{
  "status": "success",
  "data": [],
  "timestamp": "2025-12-20T10:30:00"
}
```

**Verification:**
- [ ] HTTP Status: 200 OK
- [ ] Response wrapped in ApiResponse
- [ ] Data field contains array

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 3: Frontend Environment Configuration

**Objective:** Verify frontend has correct environment variables

**Steps:**
1. Check frontend directory: `ls -la frontend/.env*`
2. Verify `.env.example` exists
3. Verify `.env.local` exists (or create it)
4. Check content: `cat frontend/.env.local`

**Expected Files:**
- [ ] `.env.example` exists
- [ ] `.env.local` exists
- [ ] `.env.local` contains `VITE_API_URL=http://localhost:8080/api`

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 4: Frontend Startup

**Objective:** Verify frontend starts without errors

**Steps:**
1. Terminal shows: `VITE v7.1.9 ready in XXX ms`
2. Terminal shows: `➜  Local:   http://localhost:3000/`
3. Open browser: `http://localhost:3000`
4. Check browser console for errors

**Expected:**
- [ ] Frontend loads on port 3000
- [ ] No errors in terminal
- [ ] No errors in browser console
- [ ] Login page displays

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 5: Login Flow

**Objective:** Verify session-based authentication works

**Steps:**
1. Navigate to: `http://localhost:3000`
2. Enter credentials:
   - Username: `superadmin`
   - Password: `Admin@123`
3. Click "Login"
4. Wait for redirect to dashboard

**Expected:**
- [ ] Login succeeds
- [ ] Redirected to `/dashboard`
- [ ] JSESSIONID cookie created (check DevTools → Application → Cookies)
- [ ] No 401/403 errors

**Browser Console Expected:**
```
🌐 API Request: POST /api/auth/session/login
✅ API Response: POST /api/auth/session/login [200]
```

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 6: Menu Visibility

**Objective:** Verify SUPER_ADMIN sees all menu items

**Steps:**
1. After login, check sidebar menu
2. Verify menu items are visible

**Expected Menu Items:**
- [ ] Dashboard
- [ ] Members
- [ ] Employers ← Should be visible
- [ ] Providers
- [ ] Insurance Companies ← Should be visible
- [ ] Claims
- [ ] Visits
- [ ] Pre-Approvals
- [ ] Medical Categories
- [ ] Medical Services
- [ ] Medical Packages
- [ ] Benefit Packages
- [ ] Provider Contracts
- [ ] Insurance Policies
- [ ] Users
- [ ] Roles
- [ ] Companies
- [ ] Audit Log
- [ ] Settings

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 7: Employers Page Load

**Objective:** Verify Employers page loads and API call succeeds

**Steps:**
1. Click "Employers" in sidebar menu
2. Wait for page to load
3. Check browser console
4. Check Network tab

**Expected:**
- [ ] Page loads without errors
- [ ] URL changes to `/employers`
- [ ] No 500 errors in console
- [ ] No 404 errors in console
- [ ] Empty state displays (no data yet)

**Browser Console Expected:**
```
🌐 API Request: GET /employers
✅ API Response: GET /employers [200]
```

**Network Tab Expected:**
- [ ] Request: `GET /api/employers`
- [ ] Status: 200 OK
- [ ] Response: `{status: "success", data: []}`

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 8: Insurance Companies Page Load

**Objective:** Verify Insurance Companies page loads

**Steps:**
1. Click "Insurance Companies" in sidebar menu
2. Wait for page to load
3. Check browser console

**Expected:**
- [ ] Page loads without errors
- [ ] URL changes to `/insurance-companies`
- [ ] No 500 errors
- [ ] Empty state displays

**Browser Console Expected:**
```
🌐 API Request: GET /api/insurance-companies
✅ API Response: GET /api/insurance-companies [200]
```

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 9: Reviewer Companies Page Load

**Objective:** Verify Reviewer Companies page loads

**Steps:**
1. Click "Reviewer Companies" in sidebar menu
2. Wait for page to load
3. Check browser console

**Expected:**
- [ ] Page loads without errors
- [ ] URL changes to `/reviewer-companies`
- [ ] No 500 errors
- [ ] Empty state displays

**Browser Console Expected:**
```
🌐 API Request: GET /api/reviewer-companies
✅ API Response: GET /api/reviewer-companies [200]
```

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 10: Add Employer Button

**Objective:** Verify navigation to create employer page

**Steps:**
1. On Employers page, click "Add Employer" button
2. Wait for page to load
3. Check URL and form

**Expected:**
- [ ] URL changes to `/employers/create`
- [ ] Form displays with fields:
  - [ ] Name (Arabic)
  - [ ] Name (English)
  - [ ] Code
  - [ ] Phone
  - [ ] Email
  - [ ] Active checkbox
- [ ] No errors in console

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 11: Create Employer

**Objective:** Verify employer creation works

**Steps:**
1. On create employer page, fill form:
   - Name (Arabic): `شركة الاختبار`
   - Name (English): `Test Company`
   - Code: `TEST001`
   - Phone: `+218123456789`
   - Email: `test@example.com`
   - Active: checked
2. Click "Save" button
3. Wait for response

**Expected:**
- [ ] HTTP 201 response
- [ ] Success message displays
- [ ] Redirected to employers list
- [ ] New employer appears in list

**Browser Console Expected:**
```
🌐 API Request: POST /api/employers
✅ API Response: POST /api/employers [201]
```

**Pass/Fail:** ☐ PASS ☐ FAIL

---

### TEST 12: Logout

**Objective:** Verify logout works

**Steps:**
1. Click user profile icon (top right)
2. Click "Logout"
3. Wait for redirect

**Expected:**
- [ ] Redirected to login page
- [ ] JSESSIONID cookie cleared
- [ ] No errors in console

**Pass/Fail:** ☐ PASS ☐ FAIL

---

## 📊 TEST SUMMARY

### Results Table

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Backend API Response Format | ☐ PASS ☐ FAIL | |
| 2 | Backend Selectors Endpoint | ☐ PASS ☐ FAIL | |
| 3 | Frontend Environment Config | ☐ PASS ☐ FAIL | |
| 4 | Frontend Startup | ☐ PASS ☐ FAIL | |
| 5 | Login Flow | ☐ PASS ☐ FAIL | |
| 6 | Menu Visibility | ☐ PASS ☐ FAIL | |
| 7 | Employers Page Load | ☐ PASS ☐ FAIL | |
| 8 | Insurance Companies Page | ☐ PASS ☐ FAIL | |
| 9 | Reviewer Companies Page | ☐ PASS ☐ FAIL | |
| 10 | Add Employer Button | ☐ PASS ☐ FAIL | |
| 11 | Create Employer | ☐ PASS ☐ FAIL | |
| 12 | Logout | ☐ PASS ☐ FAIL | |

### Overall Result

**Total Tests:** 12  
**Passed:** ☐ ___/12  
**Failed:** ☐ ___/12  

**Status:** ☐ ALL PASS ☐ SOME FAILURES ☐ CRITICAL FAILURES

---

## 🐛 TROUBLESHOOTING

### Issue: Backend returns 500 error

**Symptoms:**
- `GET /api/employers` returns HTTP 500
- Error message in backend logs

**Solution:**
1. Check backend logs: `tail -f backend.log`
2. Verify database connection
3. Verify Spring Boot started successfully
4. Check for compilation errors: `mvn clean compile`

---

### Issue: Frontend shows "Cannot GET /employers"

**Symptoms:**
- Page shows "Cannot GET /employers"
- URL is correct

**Solution:**
1. Verify frontend is running: `yarn start`
2. Check port: Should be 3000
3. Check browser console for errors
4. Verify routes are configured

---

### Issue: API calls return 404

**Symptoms:**
- Network tab shows 404 for `/api/employers`
- Backend is running

**Solution:**
1. Verify backend is running on port 8080
2. Check VITE_API_URL in `.env.local`
3. Verify axios baseURL: `http://localhost:8080/api`
4. Check CORS configuration in backend

---

### Issue: CORS error in browser console

**Symptoms:**
- Console shows: "Access to XMLHttpRequest blocked by CORS policy"
- API calls fail

**Solution:**
1. Verify backend CORS configuration
2. Check frontend origin: `http://localhost:3000`
3. Verify `withCredentials: true` in axios config
4. Check backend allows credentials

---

### Issue: Data shows as undefined

**Symptoms:**
- Page loads but shows empty/undefined data
- Console shows: `Cannot read property 'data' of undefined`

**Solution:**
1. Verify backend returns wrapped response
2. Check API response format: `{status: "success", data: [...]}`
3. Verify frontend unwrap function works
4. Check browser Network tab for actual response

---

## ✅ SIGN-OFF

**Test Date:** _______________  
**Tester Name:** _______________  
**Overall Status:** ☐ PASS ☐ FAIL  

**Comments:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

**Approved for Production:** ☐ YES ☐ NO

**Signature:** _______________  
**Date:** _______________

---

**Report Generated:** December 20, 2025  
**Status:** READY FOR TESTING
