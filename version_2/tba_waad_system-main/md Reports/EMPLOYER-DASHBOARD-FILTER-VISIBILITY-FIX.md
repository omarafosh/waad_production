# Fix: Employer Filter Visibility

## 🐛 Problem
The user reported that the "Partner Filter" was not showing up, unlike in the `MembersList` page.

## 🔍 Root Cause
The `EmployerDashboard` page had an explicit permission check `{canSelectEmployer && ...}` wrapping the filter component.
```javascript
const canSelectEmployer = ['SUPER_ADMIN', 'INSURANCE_ADMIN'].includes(user?.role);
```
This logic was hiding the filter for any user not strictly in those roles (e.g., restricted admins or dev accounts), whereas `MembersList` renders the filter unconditionally and relies on the API/Component to handle available options.

## 🛠️ Solution
Removed the conditional rendering check to match the behavior of `MembersList`.

```diff
-   {canSelectEmployer && (
      <Box sx={{ minWidth: 250 }}>
        <EmployerFilterSelector ... />
      </Box>
-   )}
+   <Box sx={{ minWidth: 250 }}>
+     <EmployerFilterSelector ... />
+   </Box>
```

This ensures the filter is always visible in the UI, consistent with other system pages.
