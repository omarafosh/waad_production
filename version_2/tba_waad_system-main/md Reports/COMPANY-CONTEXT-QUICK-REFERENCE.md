# 🎯 COMPANY CONTEXT QUICK REFERENCE CARD

**Purpose:** One-page reference for implementing Odoo-like company context filtering

---

## 🔑 Core Concept

```
WAAD (TPA) Selected → X-Employer-ID = null → Show ALL data
Specific Employer Selected → X-Employer-ID = 123 → Filter by employer 123
EMPLOYER Role → LOCKED to user.employerId (header ignored)
```

---

## 📝 Backend Pattern (Copy-Paste)

### Controller
```java
@GetMapping
public ResponseEntity<ApiResponse<Page<ItemDto>>> list(
    @RequestHeader(value = "X-Employer-ID", required = false) Long employerIdHeader,
    Pageable pageable) {
    
    Page<ItemDto> items = itemService.listItems(employerIdHeader, pageable);
    return ResponseEntity.ok(ApiResponse.success(items));
}
```

### Service
```java
@Autowired
private OrganizationContextService orgContextService;

public Page<ItemDto> listItems(Long employerIdHeader, Pageable pageable) {
    OrganizationContext context = orgContextService.getOrganizationContext(employerIdHeader);
    
    Page<Item> items;
    if (context.shouldFilter()) {
        Long employerId = context.getEmployerIdForFiltering();
        items = itemRepository.findByEmployerOrganizationId(employerId, pageable);
    } else {
        items = itemRepository.findAll(pageable);
    }
    
    return items.map(mapper::toDto);
}
```

---

## 🎨 Frontend Pattern (Copy-Paste)

### CompanySwitcher.jsx
```jsx
const TPA_ORG = { id: null, name: 'WAAD - جميع الشركات', code: 'TPA' };

// Add TPA option for admins
if (isSuperAdmin || isTBAAdmin) {
  setEmployers([TPA_ORG, ...fetchedEmployers]);
}

const handleChange = (event) => {
  const selectedId = event.target.value;
  setEmployerId(selectedId === 'null' ? null : parseInt(selectedId));
};
```

### axios.js
```javascript
if (employerId === null) {
  delete config.headers['X-Employer-ID']; // TPA context
} else if (employerId) {
  config.headers['X-Employer-ID'] = employerId.toString();
}
```

### TbaDataTable Page
```jsx
const { employerId } = useEmployerContext();

<TbaDataTable
  queryKey={['items', employerId, page, size]}  // ← Add employerId
  columns={columns}
  fetcher={fetcher}
/>
```

---

## ✅ Files Checklist

### Backend (Per Module)
- [ ] Update Controller: Add `@RequestHeader` parameter
- [ ] Update Service: Inject `OrganizationContextService`
- [ ] Update Service: Use `getOrganizationContext()` + `shouldFilter()`

### Frontend (One-Time)
- [ ] CompanySwitcher: Add TPA organization option
- [ ] axios.js: Update interceptor to handle null
- [ ] rbac.js: Support TPA in store

### Frontend (Per Page)
- [ ] Import `useEmployerContext()`
- [ ] Add `employerId` to TbaDataTable `queryKey`

---

## 🔍 Modules to Update

**Backend:**
1. ✅ Members (example done)
2. ⏳ Claims
3. ⏳ PreApprovals
4. ⏳ BenefitPolicies
5. ⏳ Providers
6. ⏳ Visits
7. ⏳ Policies

**Frontend:**
1. ⏳ CompanySwitcher
2. ⏳ axios
3. ⏳ MembersList
4. ⏳ ClaimsList
5. ⏳ PreApprovalsList
6. ⏳ ProvidersList

---

## 🚫 Common Mistakes

### ❌ Mistake 1: Forgetting queryKey
```jsx
// ❌ WRONG
queryKey: ['members', page]

// ✅ CORRECT
queryKey: ['members', employerId, page]
```

### ❌ Mistake 2: Always sending header
```javascript
// ❌ WRONG
config.headers['X-Employer-ID'] = employerId || '';

// ✅ CORRECT
if (employerId === null) {
  delete config.headers['X-Employer-ID'];
} else if (employerId) {
  config.headers['X-Employer-ID'] = employerId.toString();
}
```

### ❌ Mistake 3: Not checking shouldFilter
```java
// ❌ WRONG
return repository.findByEmployerOrganizationId(employerId, pageable);

// ✅ CORRECT
if (context.shouldFilter()) {
  return repository.findByEmployerOrganizationId(context.getEmployerIdForFiltering(), pageable);
} else {
  return repository.findAll(pageable);
}
```

---

## 🧪 Quick Test

1. Login as SUPER_ADMIN
2. Open Members page
3. Company selector shows: "WAAD - جميع الشركات" + employers
4. Select WAAD → Table shows ALL members
5. Select specific employer → Table shows ONLY that employer's members
6. Login as EMPLOYER → Company selector locked

---

## 📚 Full Documentation

- Architecture: [COMPANY-CONTEXT-FILTERING-IMPLEMENTATION-REPORT.md](COMPANY-CONTEXT-FILTERING-IMPLEMENTATION-REPORT.md)
- Code Patterns: [COMPANY-CONTEXT-CODE-PATTERNS.md](COMPANY-CONTEXT-CODE-PATTERNS.md)
- Final Summary: [COMPANY-CONTEXT-FINAL-SUMMARY.md](COMPANY-CONTEXT-FINAL-SUMMARY.md)

---

**Estimated Time:** 11 hours for full implementation  
**Complexity:** MEDIUM  
**Risk:** LOW  
**Impact:** HIGH

---

**Keep this card visible while implementing!** 🎯
