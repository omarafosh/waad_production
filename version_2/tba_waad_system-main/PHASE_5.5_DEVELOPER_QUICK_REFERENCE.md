# Phase 5.5: Developer Quick Reference

## 🎯 Quick Start

### Adding a New Role Landing Page

```javascript
// 1. Edit: frontend/src/utils/roleRoutes.js
export const getDefaultRouteForRole = (role) => {
  const roleRoutes = {
    'SUPER_ADMIN': '/dashboard',
    'ACCOUNTANT': '/settlement/batches',
    'REVIEWER': '/claims/inbox',
    'PROVIDER': '/provider/visits',
    'EMPLOYER': '/',
    'NEW_ROLE': '/new-role/landing'  // ✅ Add here
  };
  return roleRoutes[role] || '/dashboard';
};

// 2. Update smoke test: frontend/src/tests/smokeTest.js
const testCases = [
  // ... existing
  { 
    role: 'NEW_ROLE', 
    expectedRoute: '/new-role/landing', 
    description: 'New Role → Landing' 
  }
];

// 3. Update test page: frontend/src/pages/test/LandingPageTest.jsx
const roleConfig = [
  // ... existing
  {
    role: 'NEW_ROLE',
    route: '/new-role/landing',
    icon: <Icon />,
    label: 'الوصف بالعربي',
    color: 'primary'
  }
];
```

---

## 🔧 Common Tasks

### Change Landing Page for Existing Role

```javascript
// Single file change: frontend/src/utils/roleRoutes.js

// Before:
'ACCOUNTANT': '/settlement/batches'

// After:
'ACCOUNTANT': '/new/accountant/dashboard'
```

### Test Role-Based Navigation

```javascript
// Option 1: Browser Console
window.runSmokeTest()

// Option 2: Manual Test Page
// Navigate to: /test/landing-pages
// Click: "تشغيل جميع الاختبارات"

// Option 3: Navigation Test
// Click "انتقل" next to any role
```

### Debug Login Redirect

```javascript
// Add console log in AuthLogin.jsx
const user = await login({ identifier, password });
const landingRoute = getDefaultRouteForRole(user.role);
console.log('🔍 Login Debug:', { 
  role: user.role, 
  landingRoute 
});
navigate(landingRoute);
```

### Check Current User's Landing

```javascript
// In any component:
import useAuth from 'hooks/useAuth';
import { getDefaultRouteForRole } from 'utils/roleRoutes';

const { user } = useAuth();
const landing = getDefaultRouteForRole(user.role);
console.log(`Current user lands on: ${landing}`);
```

---

## 📁 File Locations

```
frontend/
├── src/
│   ├── components/
│   │   └── RoleBasedRedirect.jsx      # Root "/" handler
│   ├── pages/
│   │   └── test/
│   │       └── LandingPageTest.jsx    # Manual test page
│   ├── routes/
│   │   └── index.jsx                  # Router config (uses RoleBasedRedirect)
│   ├── sections/
│   │   └── auth/
│   │       └── jwt/
│   │           └── AuthLogin.jsx      # Login with role redirect
│   ├── tests/
│   │   └── smokeTest.js               # Automated smoke test
│   └── utils/
│       └── roleRoutes.js              # ⭐ CORE: Role → Route mapping
```

---

## 🧪 Testing Commands

### Run Smoke Test (Browser Console)

```javascript
// Full test suite
window.runSmokeTest()

// Expected output:
// 🧪 Phase 5.5 Smoke Test: Role-Based Landing Pages
// ✅ PASS: Super Admin → Dashboard
// ✅ PASS: Accountant → Settlement Batches
// ✅ PASS: Reviewer → Claims Inbox
// ✅ PASS: Provider → Visits
// ✅ PASS: Employer → Home
// ✅ PASS: Unknown Role → Default Dashboard
// 
// 📊 SMOKE TEST SUMMARY
// Role Landing Page Tests: 6/6 passed
// Route Accessibility Tests: 5 routes checked
// ✅ ALL TESTS PASSED
```

### Manual Testing

```bash
# 1. Start dev server
npm run dev

# 2. Open browser
http://localhost:3000

# 3. Navigate to test page
http://localhost:3000/test/landing-pages

# 4. Run tests from UI
Click "تشغيل جميع الاختبارات"
```

---

## 🐛 Troubleshooting

### Issue: User not redirecting after login

**Check:**
```javascript
// 1. Verify roleRoutes.js has the role
console.log(getDefaultRouteForRole('YOUR_ROLE'));

// 2. Check login response
const user = await login({ identifier, password });
console.log('User:', user); // Should have user.role

// 3. Verify route exists in MainRoutes.jsx
// Search for the landing route path
```

**Solution:**
```javascript
// If role missing from roleRoutes.js:
'YOUR_ROLE': '/your-role/landing'

// If route doesn't exist:
// Add route to MainRoutes.jsx first
```

### Issue: Root "/" not redirecting

**Check:**
```javascript
// 1. Verify RoleBasedRedirect in routes/index.jsx
{
  path: '/',
  element: <RoleBasedRedirect />  // ✅ Should be this
}

// 2. Check auth status
import useAuth from 'hooks/useAuth';
const { isLoggedIn, user } = useAuth();
console.log({ isLoggedIn, user });
```

**Solution:**
```javascript
// Ensure routes/index.jsx imports and uses RoleBasedRedirect
import RoleBasedRedirect from 'components/RoleBasedRedirect';
```

### Issue: Smoke test failing

**Check:**
```javascript
// Run with verbose logging
const results = await runSmokeTest();
console.log('Detailed results:', results);

// Check specific role
const route = getDefaultRouteForRole('FAILING_ROLE');
console.log('Expected route:', route);
```

**Solution:**
```javascript
// Update roleRoutes.js to match test expectations
// Or update test expectations in smokeTest.js
```

---

## 🔐 Security Notes

### Role-Based Access Control

```javascript
// ⚠️ IMPORTANT: Role-based landing is NOT authorization
// It's UX convenience only

// Example:
// User lands on /settlement/batches
// BUT they still need SETTLEMENT_VIEW permission

// PermissionGuard still enforces access:
<PermissionGuard permission={PERMISSIONS.SETTLEMENT_VIEW}>
  <SettlementBatches />
</PermissionGuard>

// If permission missing → 403 Forbidden page
```

### Safe Fallback

```javascript
// roleRoutes.js always has fallback:
return roleRoutes[role] || '/dashboard';

// This prevents:
// 1. Undefined redirects
// 2. Navigation to null
// 3. Crashes on unknown roles
```

---

## 📊 Performance Notes

### Redirect Speed

```javascript
// No async operations:
const landingRoute = getDefaultRouteForRole(user.role); // Instant
navigate(landingRoute); // Immediate

// No API calls
// No permission checks
// No database queries
// Pure synchronous mapping
```

### Memory Usage

```javascript
// roleRoutes object: ~200 bytes
// RoleBasedRedirect component: Minimal
// No state management overhead
// No re-renders on change
```

---

## 🎨 UI/UX Guidelines

### Login Experience

```
1. User enters credentials
2. Clicks "تسجيل الدخول"
3. ⏳ "جاري تسجيل الدخول..."
4. ✅ Success → Instant redirect to role page
5. User sees relevant interface immediately
```

**Bad UX (Before):**
```
Login → Generic "/" → Manual navigation → Task page
```

**Good UX (After):**
```
Login → Direct to task page
```

### Error Recovery

```
SystemErrorBoundary wraps everything:

1. React error occurs
2. Error boundary catches
3. Shows: "حدث خطأ غير متوقع"
4. Options:
   - [إعادة المحاولة] → Retry component
   - [الصفحة الرئيسية] → Go to home
   - [تحديث الصفحة] → Full reload
5. Error ID logged: ERR-ABC123XYZ
```

---

## 📚 Related Documentation

- **Phase 5.5 Implementation:** `PHASE_5.5_CRITICAL_STABILIZATION_COMPLETE.md`
- **Flow Diagrams:** `PHASE_5.5_FLOW_DIAGRAMS.md`
- **RBAC System:** `RBAC_DEVELOPER_GUIDE.md`
- **Permissions:** `ROLE_PERMISSION_API_CONTRACT.md`

---

## 💡 Best Practices

### DO ✅

```javascript
// Use utility function
const route = getDefaultRouteForRole(user.role);
navigate(route);

// Centralized configuration
// All roles in roleRoutes.js

// Test after changes
window.runSmokeTest()

// Document new roles
// Update this guide + smoke test
```

### DON'T ❌

```javascript
// Hard-coded redirects
if (user.role === 'ACCOUNTANT') navigate('/settlement/batches');

// Inline mapping
const routes = { ACCOUNTANT: '/settlement/batches' }; // ❌

// Skip testing
// Always run smoke test after changes

// Forget fallback
// roleRoutes.js must have default
```

---

## 🚀 Quick Win Examples

### Example 1: Add New Role

**Time:** 2 minutes

```javascript
// 1. roleRoutes.js (30 seconds)
'NEW_ROLE': '/new-role/page'

// 2. smokeTest.js (30 seconds)
{ role: 'NEW_ROLE', expectedRoute: '/new-role/page', ... }

// 3. Test (1 minute)
window.runSmokeTest()
// ✅ PASS: New Role → Page
```

### Example 2: Change Landing

**Time:** 30 seconds

```javascript
// 1. roleRoutes.js (15 seconds)
'ACCOUNTANT': '/new/accountant/dashboard'

// 2. Test (15 seconds)
window.runSmokeTest()
// ✅ PASS: Accountant → New Dashboard
```

### Example 3: Debug Issue

**Time:** 1 minute

```javascript
// 1. Console (30 seconds)
const { user } = useAuth();
getDefaultRouteForRole(user.role);

// 2. Smoke test (30 seconds)
window.runSmokeTest()

// 3. Fix and verify
```

---

## 📞 Support

**Issues with Phase 5.5?**

1. **Check smoke test:** `window.runSmokeTest()`
2. **Review flow diagram:** `PHASE_5.5_FLOW_DIAGRAMS.md`
3. **Check error logs:** Browser DevTools → Console
4. **Verify routes:** `/test/landing-pages`

**Common Questions:**

Q: **How do I add a new role?**  
A: Edit `roleRoutes.js` + update smoke test

Q: **Why isn't my role redirecting?**  
A: Check if role exists in `roleRoutes.js`

Q: **Can I have multiple landing pages for one role?**  
A: No, one role = one landing page (by design)

Q: **What if route doesn't exist?**  
A: User will see 404, add route to MainRoutes.jsx first

---

**Last Updated:** Phase 5.5 Complete (2026-01-15)  
**Maintained By:** TBA WAAD System Team
