# 🚀 دليل المطور السريع - إعدادات النظام

**تحديث:** 2 يناير 2026

---

## 📋 نظرة سريعة

### الملفات الرئيسية:
```
frontend/src/
├── services/api/
│   ├── company.service.js
│   └── companySettings.service.js
├── hooks/
│   ├── useCompany.js
│   └── useCompanySettings.js
└── pages/settings/
    ├── company/index.jsx
    └── employer-settings/index.jsx
```

---

## 🔌 استخدام API Services

### Company Service
```javascript
import { companyService } from 'services/api/company.service';

// جلب جميع الشركات
const companies = await companyService.getAll();

// جلب شركة بالكود
const tbaCompany = await companyService.getByCode('TBA');

// تحديث شركة
await companyService.update(1, {
  name: 'شركة TBA للمراجعة الطبية',
  code: 'TBA',
  active: true
});
```

### Company Settings Service
```javascript
import { companySettingsService } from 'services/api/companySettings.service';

// جلب إعدادات صاحب عمل
const settings = await companySettingsService.getByEmployerId(5);

// تحديث الصلاحيات
await companySettingsService.updateSettings(5, {
  canViewClaims: true,
  canViewVisits: false,
  canEditMembers: true,
  canDownloadAttachments: true
});

// تحديث إعدادات UI
await companySettingsService.updateUiVisibility(5, {
  members: {
    showFamilyTab: true,
    showDocumentsTab: true,
    showBenefitsTab: true,
    showChronicTab: false
  },
  claims: {
    showFilesSection: true,
    showPaymentsSection: true,
    showDiagnosisSection: false
  }
});
```

---

## 🪝 استخدام React Hooks

### Company Hooks
```javascript
import {
  useCompanies,
  useCompany,
  useCompanyByCode,
  useUpdateCompany
} from 'hooks/useCompany';

function MyComponent() {
  // جلب قائمة الشركات
  const { data: companies, isLoading } = useCompanies();

  // جلب شركة TBA
  const { data: company } = useCompanyByCode('TBA');

  // تحديث شركة
  const updateMutation = useUpdateCompany();

  const handleUpdate = () => {
    updateMutation.mutate({
      id: company.id,
      data: { name: 'اسم جديد', code: 'TBA', active: true }
    });
  };

  return <div>{/* UI */}</div>;
}
```

### Company Settings Hooks
```javascript
import {
  useEmployerSettings,
  useUpdateEmployerSettings
} from 'hooks/useCompanySettings';

function EmployerSettingsComponent() {
  const employerId = 5;
  
  // جلب الإعدادات
  const { data: settings, isLoading } = useEmployerSettings(employerId);

  // تحديث الإعدادات
  const updateMutation = useUpdateEmployerSettings();

  const handleSave = (formData) => {
    updateMutation.mutate({
      employerId,
      data: {
        canViewClaims: formData.canViewClaims,
        canViewVisits: formData.canViewVisits,
        uiVisibility: {
          members: {
            showFamilyTab: formData.members_showFamilyTab,
            // ...
          }
        }
      }
    });
  };

  return <div>{/* UI */}</div>;
}
```

---

## 📊 هيكل البيانات (DTOs)

### CompanyDto
```typescript
{
  id: number;
  name: string;          // "شركة TBA للمراجعة الطبية"
  code: string;          // "TBA"
  active: boolean;       // true
  createdAt: string;     // "2024-01-01T00:00:00"
  updatedAt: string;     // "2024-01-01T00:00:00"
}
```

### CompanySettingsDto
```typescript
{
  id: number;
  companyId: number;
  employerId: number;
  
  // Permissions
  canViewClaims: boolean;
  canViewVisits: boolean;
  canEditMembers: boolean;
  canDownloadAttachments: boolean;
  
  // Metadata
  employerName: string;
  companyName: string;
  
  // UI Visibility (nested object)
  uiVisibility: UiVisibilityDto;
}
```

### UiVisibilityDto
```typescript
{
  members: {
    showFamilyTab: boolean;
    showDocumentsTab: boolean;
    showBenefitsTab: boolean;
    showChronicTab: boolean;
  },
  claims: {
    showFilesSection: boolean;
    showPaymentsSection: boolean;
    showDiagnosisSection: boolean;
  },
  visits: {
    showAttachmentsSection: boolean;
    showServiceDetailsSection: boolean;
  },
  dashboard: {
    showMembersKpi: boolean;
    showClaimsKpi: boolean;
    showVisitsKpi: boolean;
  }
}
```

---

## 🛣️ الروابط (Routes)

### المسارات المتاحة:
```
/settings                    → Settings Main Page
/settings/company            → Company Settings (SUPER_ADMIN, ADMIN)
/settings/employer-settings  → Employer Settings (SUPER_ADMIN, INSURANCE_ADMIN, ADMIN)
/settings/users             → Users Settings (ADMIN)
```

### إضافة مسار جديد:
```javascript
// في MainRoutes.jsx
{
  path: 'settings',
  children: [
    {
      path: 'new-page',
      element: (
        <RouteGuard allowedRoles={['ADMIN']}>
          <NewSettingsPage />
        </RouteGuard>
      )
    }
  ]
}
```

---

## 🎨 أمثلة على Form Components

### TextField مع Validation
```javascript
<TextField
  fullWidth
  label="اسم الشركة"
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  error={!!errors.name}
  helperText={errors.name}
  required
/>
```

### Checkbox مع Label
```javascript
<FormControlLabel
  control={
    <Checkbox
      checked={formData.canViewClaims}
      onChange={(e) => setFormData({
        ...formData,
        canViewClaims: e.target.checked
      })}
    />
  }
  label="يمكن رؤية المطالبات"
/>
```

### Select Dropdown
```javascript
<FormControl fullWidth>
  <InputLabel>اختر صاحب العمل</InputLabel>
  <Select
    value={selectedEmployerId}
    onChange={(e) => setSelectedEmployerId(e.target.value)}
  >
    {employers.map((employer) => (
      <MenuItem key={employer.id} value={employer.id}>
        {employer.nameAr}
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

---

## 🔔 Notifications

### Success Notification
```javascript
import { useSnackbar } from 'notistack';

const { enqueueSnackbar } = useSnackbar();

enqueueSnackbar('تم الحفظ بنجاح', { variant: 'success' });
```

### Error Notification
```javascript
enqueueSnackbar('حدث خطأ أثناء الحفظ', { variant: 'error' });
```

---

## 🛡️ حماية الصفحات (Route Guards)

```javascript
import RouteGuard from 'routes/RouteGuard';

<RouteGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
  <YourProtectedPage />
</RouteGuard>
```

### الصلاحيات المتاحة:
- `SUPER_ADMIN`
- `ADMIN`
- `INSURANCE_ADMIN`
- `EMPLOYER`
- `EMPLOYER_ADMIN`
- `REVIEWER`

---

## 🎯 Best Practices

### 1. Error Handling
```javascript
const { data, isLoading, error } = useEmployerSettings(employerId);

if (error) {
  return <Alert severity="error">حدث خطأ في التحميل</Alert>;
}
```

### 2. Loading States
```javascript
if (isLoading) {
  return <CircularProgress />;
}
```

### 3. Empty States
```javascript
if (!employers || employers.length === 0) {
  return (
    <ModernEmptyState
      icon={BusinessIcon}
      title="لا توجد شركات"
      description="يجب إضافة شركات أولاً"
    />
  );
}
```

### 4. Form Validation
```javascript
const validateForm = () => {
  const errors = {};
  
  if (!formData.name?.trim()) {
    errors.name = 'الاسم مطلوب';
  }
  
  return errors;
};
```

---

## 🔄 Cache Invalidation

React Query يقوم بـ invalidate الـ cache تلقائياً عند التحديث:

```javascript
const updateMutation = useUpdateCompany();

updateMutation.mutate({ id, data }, {
  onSuccess: () => {
    // Cache invalidation happens automatically
    // queryClient.invalidateQueries(['companies']);
  }
});
```

---

## 🧪 التجربة السريعة

### 1. تشغيل النظام:
```bash
# Backend
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm start
```

### 2. الوصول للصفحات:
```
http://localhost:3000/settings/company
http://localhost:3000/settings/employer-settings
```

### 3. تسجيل الدخول:
```
Username: admin
Password: admin123
```

---

## 📚 مراجع إضافية

- [Material-UI Documentation](https://mui.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [SYSTEM-SETTINGS-UI-IMPLEMENTATION-REPORT.md](./SYSTEM-SETTINGS-UI-IMPLEMENTATION-REPORT.md)

---

**نهاية الدليل** ✅
