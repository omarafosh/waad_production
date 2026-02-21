# 💡 Company Context Filtering - Code Implementation Guide

**Project:** TBA WAAD System  
**Date:** December 25, 2025  
**Purpose:** Step-by-step code patterns for implementing Odoo-like company context filtering

---

## 🎯 Quick Reference

### Key Principle
```
IF X-Employer-ID header is NULL:
  → TPA Context → Show ALL data (no filtering)
  
ELSE IF X-Employer-ID header has value:
  → Employer Context → Filter by that employerId
  
EMPLOYER role ALWAYS locked to user.employerId (ignore header)
```

---

## 📝 Backend Pattern

### Step 1: Update Controller

**Pattern:**
```java
@GetMapping
@PreAuthorize("hasAuthority('VIEW_X')")
@Operation(summary = "List items", description = "Returns paginated list (filtered by organization context)")
public ResponseEntity<ApiResponse<Page<ItemDto>>> list(
    @Parameter(description = "Employer ID for organization context (null = TPA/show all)")
    @RequestHeader(value = "X-Employer-ID", required = false) Long employerIdHeader,
    Pageable pageable) {
    
    Page<ItemDto> items = itemService.listItems(employerIdHeader, pageable);
    return ResponseEntity.ok(ApiResponse.success(items));
}
```

**Key Points:**
- Add `@RequestHeader(value = "X-Employer-ID", required = false) Long employerIdHeader`
- `required = false` allows null (TPA context)
- Pass `employerIdHeader` to service layer

---

### Step 2: Update Service

**Pattern:**
```java
@Service
@RequiredArgsConstructor
public class ItemService {
    
    private final ItemRepository itemRepository;
    private final OrganizationContextService orgContextService;
    
    public Page<ItemDto> listItems(Long employerIdHeader, Pageable pageable) {
        // Get organization context (TPA or specific employer)
        OrganizationContext context = orgContextService.getOrganizationContext(employerIdHeader);
        
        Page<Item> items;
        if (context.shouldFilter()) {
            // Employer context - filter by employerId
            Long employerId = context.getEmployerIdForFiltering();
            log.debug("🔒 Filtering items by employerId={}", employerId);
            items = itemRepository.findByEmployerOrganizationId(employerId, pageable);
        } else {
            // TPA context - show all
            log.debug("🔓 TPA context - showing all items");
            items = itemRepository.findAll(pageable);
        }
        
        return items.map(mapper::toDto);
    }
}
```

**Key Points:**
- Inject `OrganizationContextService`
- Call `getOrganizationContext(employerIdHeader)`
- Check `context.shouldFilter()`:
  - `true` → Filter by specific employer
  - `false` → Show all (TPA context)

---

### Step 3: Repository (Already Exists!)

**No changes needed - repositories already support both modes:**

```java
public interface ItemRepository extends JpaRepository<Item, Long> {
    // For TPA context (show all)
    Page<Item> findAll(Pageable pageable);  // ✅ Already exists
    
    // For employer context (filter by employer)
    Page<Item> findByEmployerOrganizationId(Long employerId, Pageable pageable);  // ✅ Already exists
}
```

---

## 🎨 Frontend Pattern

### Step 1: Update CompanySwitcher

**File:** `frontend/src/layout/Dashboard/Header/HeaderContent/CompanySwitcher.jsx`

**Pattern:**
```jsx
// Add TPA organization option
const TPA_ORGANIZATION = {
  id: null, // null = TPA context
  name: 'WAAD - جميع الشركات',
  code: 'TPA'
};

useEffect(() => {
  const fetchEmployers = async () => {
    const response = await axios.get('/employers');
    const employers = response.data.data;
    
    // Add TPA option for TPA admins
    if (isSuperAdmin || isTBAAdmin) {
      setEmployers([TPA_ORGANIZATION, ...employers]);
    } else {
      setEmployers(employers);
    }
  };
  
  fetchEmployers();
}, [isSuperAdmin, isTBAAdmin]);

const handleEmployerChange = (event) => {
  const selectedId = event.target.value;
  
  if (selectedId === '' || selectedId === 'null') {
    // TPA context
    setEmployerId(null);
  } else {
    // Employer context
    setEmployerId(parseInt(selectedId));
  }
};
```

---

### Step 2: Update axios Interceptor

**File:** `frontend/src/utils/axios.js`

**Pattern:**
```javascript
axiosServices.interceptors.request.use((config) => {
  const { employerId } = useRBACStore.getState();
  
  // CRITICAL: Handle TPA context (null = show all)
  if (employerId === null) {
    // TPA context - do NOT send X-Employer-ID header
    delete config.headers['X-Employer-ID'];
    console.log('✅ TPA context - showing all companies');
  } else if (employerId) {
    // Employer context - send specific employerId
    config.headers['X-Employer-ID'] = employerId.toString();
    console.log('✅ Employer context:', employerId);
  }
  
  return config;
});
```

---

### Step 3: Update TbaDataTable Pages

**Pattern: Add `employerId` to queryKey**

**Before:**
```jsx
const { data, isLoading } = useQuery({
  queryKey: ['members', page, pageSize, sortField],
  queryFn: () => fetchMembers(page, pageSize, sortField)
});
```

**After:**
```jsx
const { employerId } = useEmployerContext();

const { data, isLoading } = useQuery({
  queryKey: ['members', employerId, page, pageSize, sortField],  // ← Add employerId
  queryFn: () => fetchMembers(page, pageSize, sortField)
});
```

**Why?** When `employerId` changes (TPA ↔ Employer), React Query will automatically re-fetch data.

---

### Step 4: Update RBAC Store

**File:** `frontend/src/api/rbac.js`

**Pattern:**
```javascript
setEmployerId: (employerId) => {
  set({ employerId });
  
  if (employerId === null) {
    // TPA context - store special marker
    localStorage.setItem(STORAGE_KEYS.EMPLOYER_ID, 'TPA');
  } else if (employerId) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYER_ID, employerId.toString());
  } else {
    localStorage.removeItem(STORAGE_KEYS.EMPLOYER_ID);
  }
},

// On initialization
initialize: () => {
  const storedValue = localStorage.getItem(STORAGE_KEYS.EMPLOYER_ID);
  
  let employerId;
  if (storedValue === 'TPA') {
    employerId = null; // TPA context
  } else if (storedValue) {
    employerId = parseInt(storedValue, 10);
  } else {
    employerId = null;
  }
  
  set({ employerId });
}
```

---

## 🔍 Complete Example: Members Module

### Backend: MemberController.java

```java
@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {
    
    private final MemberService memberService;
    
    @GetMapping
    @PreAuthorize("hasAuthority('VIEW_MEMBERS')")
    public ResponseEntity<ApiResponse<Page<MemberViewDto>>> list(
        @RequestHeader(value = "X-Employer-ID", required = false) Long employerIdHeader,
        Pageable pageable) {
        
        Page<MemberViewDto> members = memberService.listMembers(employerIdHeader, pageable);
        return ResponseEntity.ok(ApiResponse.success(members));
    }
    
    @GetMapping("/selector")
    @PreAuthorize("hasAuthority('VIEW_MEMBERS')")
    public ResponseEntity<ApiResponse<List<MemberSelectorDto>>> getSelectorOptions(
        @RequestHeader(value = "X-Employer-ID", required = false) Long employerIdHeader) {
        
        List<MemberSelectorDto> options = memberService.getSelectorOptions(employerIdHeader);
        return ResponseEntity.ok(ApiResponse.success(options));
    }
    
    @GetMapping("/count")
    @PreAuthorize("hasAuthority('VIEW_MEMBERS')")
    public ResponseEntity<ApiResponse<Long>> count(
        @RequestHeader(value = "X-Employer-ID", required = false) Long employerIdHeader) {
        
        long count = memberService.count(employerIdHeader);
        return ResponseEntity.ok(ApiResponse.success(count));
    }
}
```

### Backend: MemberService.java

```java
@Service
@RequiredArgsConstructor
public class MemberService {
    
    private final MemberRepository memberRepository;
    private final OrganizationContextService orgContextService;
    private final MemberMapper mapper;
    
    public Page<MemberViewDto> listMembers(Long employerIdHeader, Pageable pageable) {
        OrganizationContext context = orgContextService.getOrganizationContext(employerIdHeader);
        
        Page<Member> members;
        if (context.shouldFilter()) {
            Long employerId = context.getEmployerIdForFiltering();
            members = memberRepository.findByEmployerOrganizationId(employerId, pageable);
        } else {
            members = memberRepository.findAll(pageable);
        }
        
        return members.map(mapper::toViewDto);
    }
    
    public List<MemberSelectorDto> getSelectorOptions(Long employerIdHeader) {
        OrganizationContext context = orgContextService.getOrganizationContext(employerIdHeader);
        
        List<Member> members;
        if (context.shouldFilter()) {
            Long employerId = context.getEmployerIdForFiltering();
            members = memberRepository.findByEmployerOrganizationId(employerId);
        } else {
            members = memberRepository.findAll();
        }
        
        return members.stream()
            .map(mapper::toSelectorDto)
            .collect(Collectors.toList());
    }
    
    public long count(Long employerIdHeader) {
        OrganizationContext context = orgContextService.getOrganizationContext(employerIdHeader);
        
        if (context.shouldFilter()) {
            Long employerId = context.getEmployerIdForFiltering();
            return memberRepository.countByEmployerOrganizationId(employerId);
        } else {
            return memberRepository.count();
        }
    }
}
```

### Frontend: MembersList.jsx

```jsx
import { useEmployerContext } from 'api/rbac';

export default function MembersList() {
  const { employerId } = useEmployerContext(); // ← Get current organization context
  
  const columns = [...]; // Same as before
  
  const fetcher = async (page, size, sortField, sortOrder, filters) => {
    const response = await membersService.getMembers({
      page,
      size,
      sortBy: sortField,
      sortDir: sortOrder
    });
    return response;
  };
  
  return (
    <TableErrorBoundary>
      <TbaDataTable
        queryKey={['members', employerId]} // ← Include employerId in queryKey
        columns={columns}
        fetcher={fetcher}
        enableSearch
        enableFilters
      />
    </TableErrorBoundary>
  );
}
```

---

## ⚠️ Common Pitfalls

### 1. Forgetting to add employerId to queryKey
**Problem:** Table doesn't re-fetch when company changes

**Solution:**
```jsx
// ❌ WRONG
queryKey: ['members', page, size]

// ✅ CORRECT
const { employerId } = useEmployerContext();
queryKey: ['members', employerId, page, size]
```

---

### 2. Always sending X-Employer-ID header
**Problem:** TPA context not working (always filters)

**Solution:**
```javascript
// ❌ WRONG
config.headers['X-Employer-ID'] = employerId || '';

// ✅ CORRECT
if (employerId === null) {
  delete config.headers['X-Employer-ID']; // Don't send header for TPA
} else if (employerId) {
  config.headers['X-Employer-ID'] = employerId.toString();
}
```

---

### 3. Not checking shouldFilter() in service
**Problem:** Logic errors, potential security issues

**Solution:**
```java
// ❌ WRONG
Long employerId = context.getEmployerIdForFiltering();
return repository.findByEmployerOrganizationId(employerId, pageable);

// ✅ CORRECT
if (context.shouldFilter()) {
  Long employerId = context.getEmployerIdForFiltering();
  return repository.findByEmployerOrganizationId(employerId, pageable);
} else {
  return repository.findAll(pageable);
}
```

---

## 📋 Checklist for Each Module

### Backend (Per Module)
- [ ] Add `@RequestHeader` parameter to all GET endpoints
- [ ] Pass `employerIdHeader` to service methods
- [ ] Inject `OrganizationContextService` in service
- [ ] Use `getOrganizationContext()` in each service method
- [ ] Check `shouldFilter()` and call appropriate repository method
- [ ] Update Swagger annotations

### Frontend (Per Page)
- [ ] Import `useEmployerContext()` hook
- [ ] Add `employerId` to component state
- [ ] Include `employerId` in TbaDataTable `queryKey`
- [ ] Verify table re-fetches when company changes

---

## 🎯 Files to Update

### Backend (~16 files)
**Controllers (8):**
1. ✅ MemberController
2. ⏳ ClaimController
3. ⏳ PreApprovalController
4. ⏳ BenefitPolicyController
5. ⏳ ProviderController
6. ⏳ VisitController
7. ⏳ PolicyController
8. ✅ DashboardController (already done)

**Services (8):**
1. ⏳ MemberService
2. ⏳ ClaimService
3. ⏳ PreApprovalService
4. ⏳ BenefitPolicyService
5. ⏳ ProviderService
6. ⏳ VisitService
7. ⏳ PolicyService
8. ✅ DashboardService (already done)

### Frontend (~8 files)
1. ⏳ CompanySwitcher.jsx - Add TPA option
2. ⏳ axios.js - Update interceptor
3. ⏳ rbac.js - Update RBAC store
4. ⏳ MembersList.jsx - Add employerId to queryKey
5. ⏳ ClaimsList.jsx - Add employerId to queryKey
6. ⏳ PreApprovalsList.jsx - Add employerId to queryKey
7. ⏳ ProvidersList.jsx - Add employerId to queryKey
8. ⏳ EmployersList.jsx - Add employerId to queryKey

---

## ⏱️ Time Estimate

| Task | Files | Time | Difficulty |
|------|-------|------|-----------|
| Backend Controllers | 8 | 2h | LOW |
| Backend Services | 8 | 3h | MEDIUM |
| Frontend CompanySwitcher | 1 | 1h | LOW |
| Frontend axios | 1 | 0.5h | LOW |
| Frontend Pages | 8 | 2h | LOW |
| Frontend RBAC | 1 | 0.5h | LOW |
| Testing | N/A | 2h | MEDIUM |
| **TOTAL** | **27** | **11h** | **MEDIUM** |

---

**Status:** ✅ **ARCHITECTURE COMPLETE + PATTERNS DOCUMENTED**  
**Next:** Apply patterns to all modules systematically  
**Recommendation:** Start with Members (✅ done), then Claims, then remaining modules

---

**Author:** GitHub Copilot (Claude Sonnet 4.5)  
**Date:** December 25, 2025  
**Project:** TBA WAAD - Company Context Filtering Implementation
