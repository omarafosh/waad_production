# Phase D2: Medical Services - GOLDEN REFERENCE MODULE

## Summary

Medical Services module has been refactored to serve as the **GOLDEN REFERENCE** for all CRUD modules in the system.

## Files Refactored

| File | Lines | Purpose |
|------|-------|---------|
| `MedicalServicesList.jsx` | ~600 | List page with search, filters, table, pagination |
| `MedicalServiceCreate.jsx` | ~350 | Create form with validation |
| `MedicalServiceEdit.jsx` | ~400 | Edit form with data loading |
| `MedicalServiceView.jsx` | ~350 | Read-only detail view |

## Pattern: Page Contract

Every page follows this strict structure:

```
Box
├── ModernPageHeader (title, subtitle, icon, breadcrumbs, actions)
└── MainCard
    └── Content (varies by page type)
```

## Rules Applied

### 1. Icon Pattern
```jsx
// ✅ CORRECT - Component reference
icon={MedicalServicesIcon}

// ❌ WRONG - JSX element
icon={<MedicalServicesIcon />}
```

### 2. Import Pattern
```jsx
// ✅ CORRECT - Separate imports
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// ❌ WRONG - Destructured with rename
import { Save as SaveIcon } from '@mui/icons-material';
```

### 3. Arabic Only Labels
All UI text is in Arabic:
- Buttons: `حفظ`, `إلغاء`, `رجوع`, `تعديل`, `حذف`
- Errors: `غير مصرح`, `خطأ تقني`, `غير موجود`
- Status: `نشط`, `غير نشط`
- Currency: `د.ل` (not LYD)

### 4. Defensive Coding
```jsx
// Lists - always use Array.isArray()
const items = useMemo(() => {
  if (!data) return [];
  return Array.isArray(data.items) ? data.items : [];
}, [data]);

// Properties - always use optional chaining
{service?.nameAr || '-'}
{service?.category?.nameAr || service?.category?.nameEn || '-'}

// Form validation
if (!form.code?.trim()) { ... }
```

### 5. Error States
```jsx
const getErrorInfo = (error) => {
  const status = error?.response?.status || error?.status;
  
  if (status === 403) {
    return {
      title: 'غير مصرح',
      message: 'ليس لديك صلاحية للوصول إلى هذه الصفحة',
      icon: LockIcon
    };
  }
  
  if (status >= 500) {
    return {
      title: 'خطأ تقني',
      message: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً',
      icon: ErrorOutlineIcon
    };
  }
  // ...
};
```

### 6. useCallback for All Handlers
```jsx
const handleBack = useCallback(() => {
  navigate('/medical-services');
}, [navigate]);

const handleChange = useCallback((field) => (e) => {
  const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  setForm((prev) => ({ ...prev, [field]: value }));
}, [errors]);
```

## Page Type Patterns

### List Page Pattern
```
ModernPageHeader
  actions: [Refresh, Add]
MainCard
  ├── Search Bar (TextField with SearchIcon, ClearIcon)
  ├── Filter Panel (collapsible, FormControl/Select)
  ├── Loading State (TableSkeleton)
  ├── Empty State (ModernEmptyState)
  ├── Error State (ModernEmptyState with error icon)
  ├── Data Table (Table with sortable headers)
  │   └── Actions (View, Edit, Delete IconButtons)
  └── Pagination (TablePagination with Arabic labels)
```

### Create/Edit Page Pattern
```
ModernPageHeader
  actions: [Back button]
MainCard
  └── Form
      ├── API Error Alert
      ├── Section: المعلومات الأساسية
      │   └── Grid with TextField, Select
      ├── Section: التسعير والتغطية
      │   └── Grid with number inputs
      ├── Section: تفاصيل الخدمة
      │   └── Duration, etc.
      ├── Section: الإعدادات
      │   └── Switches (Paper-outlined)
      └── Actions: [Cancel, Save]
```

### View Page Pattern
```
ModernPageHeader
  actions: [Back, Edit]
MainCard
  └── Grid
      ├── Section: المعلومات الأساسية
      │   └── DetailField components (Paper-outlined)
      ├── Section: التسعير والتغطية
      ├── Section: تفاصيل الخدمة
      ├── Section: الحالة
      └── Section: معلومات النظام (createdAt, updatedAt)
```

## Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `ModernPageHeader` | `components/tba/` | Page header with breadcrumbs |
| `MainCard` | `components/` | Content wrapper |
| `ModernEmptyState` | `components/tba/` | Empty/error states |
| `TableSkeleton` | `components/tba/LoadingSkeleton` | Loading state |

## Build Verification

```bash
npm run build
# ✓ built in 19.74s
# MedicalServicesList-DFHMUbvj.js    9.42 kB
# MedicalServiceEdit-Ut7Ur0ii.js    9.44 kB
# MedicalServiceCreate-*.js          ~8 kB
# MedicalServiceView-*.js            ~8 kB
```

## Next Steps

Use this GOLDEN REFERENCE to refactor:
1. Medical Categories module
2. Providers module  
3. Insurance Policies module
4. Members module
5. Other CRUD modules

---

**Phase D2 Complete** ✅
