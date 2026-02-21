# UI Enhancement: Employer Dashboard Filter

## 🎨 Design Update
**Goal:** Align the "Partner Filter" appearance in the Employer Dashboard with the standard implementation in `MembersList`.
**Issue:** The filter was embedded in the `MainCard` header, which might interpret it differently or lack the proper context provided by `UnifiedPageHeader`.

## 🛠️ Changes Implemented
1. **Adopted `UnifiedPageHeader`**:
   - Replaced the direct use of `MainCard` title/secondary props with the standard `UnifiedPageHeader` component.
   - This ensures the Breadcrumbs, Title, Icon, and Action Buttons (Filter + Refresh) are rendered consistently across the application.
   
2. **Layout Restructuring**:
   - Wrapped the entire page in a `<Box>`.
   - Placed `<UnifiedPageHeader />` at the top.
   - Placed the content inside `<MainCard>` below the header.

3. **Filter Logic Update**:
    - Updated `onEmployerChange` to pass the entire employer object (or null) to matching the `MembersList` pattern `(emp) => handleEmployerChange(emp)`.

## ✅ Result
The Employer Dashboard now uses the standard page layout:
`Box > UnifiedPageHeader (Title + Filter) > MainCard (Charts/KPIs)`

This matches the look and feel of the "Members List" page exactly.
