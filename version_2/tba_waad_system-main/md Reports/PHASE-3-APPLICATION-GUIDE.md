# Phase 3 - Quick Application Guide

## Response Normalizer Application Pattern

### Step 1: Update Service Files

**Files to Update:** All list services with pagination
- `employers.service.js`
- `members.service.js`
- `medical-services.service.js`
- `medical-categories.service.js`
- `medical-packages.service.js`
- `benefit-packages.service.js`

**Pattern:**
```javascript
// Add import at top
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

// Wrap paginated responses
getAll: async (params) => {
  const response = await axiosClient.get(BASE_URL, { params });
  return normalizePaginatedResponse(response); // ✅ Add this
}
```

---

## Error Boundary Application Pattern

### Step 1: Wrap Table Pages

**Files to Update:** All list pages
- `frontend/src/pages/members/index.jsx`
- `frontend/src/pages/employers/index.jsx`
- `frontend/src/pages/providers/index.jsx`
- `frontend/src/pages/claims/ClaimsList.jsx`
- `frontend/src/pages/pre-approvals/PreApprovalsList.jsx`
- `frontend/src/pages/insurance-companies/index.jsx`
- `frontend/src/pages/insurance-policies/index.jsx`
- `frontend/src/pages/medical-services/index.jsx`
- `frontend/src/pages/medical-categories/index.jsx`
- `frontend/src/pages/medical-packages/index.jsx`
- `frontend/src/pages/benefit-packages/index.jsx`

**Pattern:**
```jsx
// Add import
import TableErrorBoundary from 'components/TableErrorBoundary';

// Wrap TbaDataTable component
return (
  <MainCard>
    <TableErrorBoundary>
      <TbaDataTable
        columns={columns}
        fetcher={fetchClaims}
        {...props}
      />
    </TableErrorBoundary>
  </MainCard>
);
```

### Step 2: Wrap App.jsx

```jsx
import ErrorBoundary from 'components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeCustomization>
        <RTLLayout>
          <Locales>
            <ScrollTop>
              <AppRoutes />
            </ScrollTop>
          </Locales>
        </RTLLayout>
      </ThemeCustomization>
    </ErrorBoundary>
  );
}
```

---

## Permission Guard Application Pattern

### Pattern 1: Hide Delete Buttons

**Files to Update:** All list pages with delete actions

```jsx
// Add import
import PermissionGuard from 'components/PermissionGuard';

// Wrap delete button in column definition
{
  header: 'Actions',
  accessorKey: 'actions',
  cell: ({ row }) => (
    <Stack direction="row" spacing={1}>
      <IconButton onClick={() => handleEdit(row.original)}>
        <EditOutlined />
      </IconButton>
      
      <PermissionGuard requires="members.delete">
        <IconButton onClick={() => handleDelete(row.original.id)}>
          <DeleteOutlined />
        </IconButton>
      </PermissionGuard>
    </Stack>
  )
}
```

### Pattern 2: Hide "Add New" Buttons

```jsx
<PermissionGuard requires="members.create">
  <Button
    variant="contained"
    startIcon={<PlusOutlined />}
    onClick={handleAdd}
  >
    Add New Member
  </Button>
</PermissionGuard>
```

### Pattern 3: Hide Approve/Reject Buttons

```jsx
// Claims approval buttons
<PermissionGuard requires="claims.approve">
  <Button onClick={handleApprove}>Approve</Button>
</PermissionGuard>

<PermissionGuard requires="claims.reject">
  <Button onClick={handleReject}>Reject</Button>
</PermissionGuard>
```

### Pattern 4: Multiple Permissions (AND)

```jsx
// Requires BOTH permissions
<PermissionGuard requires={["claims.update", "claims.approve"]} mode="all">
  <Button>Update & Approve</Button>
</PermissionGuard>
```

### Pattern 5: Multiple Permissions (OR)

```jsx
// Requires ANY of these permissions
<PermissionGuard requires={["claims.update", "claims.approve"]} mode="any">
  <Button>Modify Claim</Button>
</PermissionGuard>
```

### Pattern 6: Using Hooks

```jsx
import { usePermission, usePermissions } from 'components/PermissionGuard';

function MyComponent() {
  const canDelete = usePermission('members.delete');
  const { hasAll, hasAny } = usePermissions(['claims.approve', 'claims.update']);
  
  return (
    <>
      {canDelete && <DeleteButton />}
      {hasAny && <EditButton />}
    </>
  );
}
```

---

## Permission Mapping Reference

| Feature | Create | Read | Update | Delete | Approve | Reject |
|---------|--------|------|--------|--------|---------|--------|
| **Members** | members.create | members.read | members.update | members.delete | - | - |
| **Employers** | employers.create | employers.read | employers.update | employers.delete | - | - |
| **Claims** | claims.create | claims.read | claims.update | claims.delete | claims.approve | claims.reject |
| **Pre-Approvals** | pre_approvals.create | pre_approvals.read | pre_approvals.update | pre_approvals.delete | pre_approvals.approve | pre_approvals.reject |
| **Providers** | providers.create | providers.read | providers.update | providers.delete | - | - |
| **Insurance Companies** | insurance_companies.create | insurance_companies.read | insurance_companies.update | insurance_companies.delete | - | - |
| **Insurance Policies** | insurance_policies.create | insurance_policies.read | insurance_policies.update | insurance_policies.delete | - | - |
| **Medical Services** | medical_services.manage | medical_services.manage | medical_services.manage | medical_services.manage | - | - |

---

## Bulk Search & Replace Commands

### Find all TbaDataTable usage
```bash
grep -rn "<TbaDataTable" frontend/src/pages/
```

### Find all delete buttons
```bash
grep -rn "DeleteOutlined" frontend/src/pages/
```

### Find all "Add New" buttons
```bash
grep -rn "PlusOutlined" frontend/src/pages/
```

### Find all service getAll methods
```bash
grep -rn "getAll.*async" frontend/src/services/api/*.service.js
```

---

## Testing Checklist

After applying changes:

### 1. Service Layer Tests
```bash
# Test each service independently in browser console:
import { claimsService } from 'services/api';
claimsService.getAll({ page: 0, size: 20 })
  .then(data => console.log('Items:', data.items, 'Total:', data.total))
```

### 2. UI Error Handling Tests
- [ ] Trigger network error (disconnect network)
- [ ] Verify TableErrorBoundary shows fallback UI
- [ ] Verify "Retry" button works
- [ ] Trigger React error (null reference)
- [ ] Verify ErrorBoundary shows fallback UI

### 3. Permission Guard Tests
- [ ] Login as TPA_ADMIN → All buttons visible
- [ ] Login as TPA_VIEWER → Delete buttons hidden
- [ ] Login as TPA_CLAIM_PROCESSOR → Approve/Reject visible
- [ ] Test fallback UI (if provided)

### 4. Response Normalization Tests
- [ ] Verify empty list shows "No data" message
- [ ] Verify pagination controls work
- [ ] Verify sorting works
- [ ] Verify search/filter works

---

## Estimated Time per Task

| Task | Files | Time per File | Total Time |
|------|-------|---------------|------------|
| Apply Response Normalizer | 10 services | 2 min | 20 min |
| Wrap Tables with ErrorBoundary | 15 pages | 1 min | 15 min |
| Add Permission Guards | 20 locations | 3 min | 60 min |
| Test All Changes | - | - | 30 min |

**Total Estimated Time:** ~2 hours for complete Phase 3 implementation

---

## Priority Order

1. **High Priority (30 min)**
   - Apply response normalizer to claims, members, employers services
   - Wrap claims, members, employers pages with ErrorBoundary

2. **Medium Priority (30 min)**
   - Apply normalizer to remaining services
   - Wrap remaining pages with ErrorBoundary

3. **Low Priority (60 min)**
   - Add permission guards to all delete buttons
   - Add permission guards to approve/reject buttons
   - Add permission guards to "Add New" buttons

---

**Last Updated:** 2024-12-21  
**Dependencies:** Requires Phase 1 & 2 completion (✅ COMPLETE)
