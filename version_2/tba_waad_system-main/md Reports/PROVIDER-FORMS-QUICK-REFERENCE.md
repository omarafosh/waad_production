# Provider Forms - Quick Reference Guide

## Auto-Code Generation Logic

### Provider Code
```javascript
// File: frontend/src/pages/providers/ProviderCreate.jsx

useEffect(() => {
  if (formData.providerType && formData.nameArabic) {
    const typePrefix = formData.providerType.substring(0, 3).toUpperCase();
    const nameInitials = formData.nameArabic
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('');
    const timestamp = Date.now().toString().slice(-4);
    setAutoCode(`${typePrefix}-${nameInitials || 'XX'}-${timestamp}`);
  } else {
    setAutoCode('AUTO-GENERATED');
  }
}, [formData.providerType, formData.nameArabic]);

// Examples:
// - HOSPITAL + "مستشفى السلام" → HOS-مس-4321
// - CLINIC + "عيادة النور" → CLI-عن-5678
// - PHARMACY + "صيدلية الشفاء" → PHA-صش-9012
```

### Contract Code
```javascript
// File: frontend/src/pages/provider-contracts/ProviderContractCreate.jsx

useEffect(() => {
  if (selectedProvider && formData.startDate) {
    const providerInitials = (selectedProvider.nameArabic || selectedProvider.nameAr || '')
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('');
    const year = format(formData.startDate, 'yyyy');
    const month = format(formData.startDate, 'MM');
    const timestamp = Date.now().toString().slice(-3);
    setAutoContractCode(`PC-${providerInitials || 'XX'}-${year}${month}-${timestamp}`);
  } else {
    setAutoContractCode('AUTO-GENERATED');
  }
}, [selectedProvider, formData.startDate]);

// Examples:
// - Provider "مستشفى السلام" + Jan 2026 → PC-مس-202601-456
// - Provider "عيادة النور" + Dec 2025 → PC-عن-202512-789
```

---

## Providers List Data Extraction

### The Fix
```javascript
// WRONG (returned empty array):
const providers = providersData || [];

// CORRECT (handles different API response structures):
const providers = providersResponse?.content || providersResponse?.data || [];
```

### API Response Structures Handled
```javascript
// Spring Boot Pageable Response:
{
  content: [...],
  pageable: {...},
  totalElements: 10
}

// Simple Array Response:
{
  data: [...]
}

// Direct Array:
[...]
```

---

## Stepper Navigation

### Provider Form (3 Steps)
```javascript
const STEPS = ['البيانات الأساسية', 'الموقع والتواصل', 'المراجعة'];

const handleNext = () => {
  if (validateStep(activeStep)) {
    setActiveStep((prev) => prev + 1);
  }
};

const handleBack = () => {
  setActiveStep((prev) => prev - 1);
};
```

### Step-by-Step Validation
```javascript
const validateStep = (step) => {
  const newErrors = {};
  
  if (step === 0) {
    // Step 1: Basic Info
    if (!formData.nameArabic) newErrors.nameArabic = 'الاسم بالعربية مطلوب';
    if (!formData.nameEnglish) newErrors.nameEnglish = 'الاسم بالإنجليزية مطلوب';
    if (!formData.licenseNumber) newErrors.licenseNumber = 'رقم الترخيص مطلوب';
    if (!formData.providerType) newErrors.providerType = 'نوع المزود مطلوب';
  } else if (step === 1) {
    // Step 2: Location & Contact
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }
  }
  // Step 3 (Review) has no validation
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

## Contract Duration Calculation

```javascript
useEffect(() => {
  if (formData.startDate && formData.endDate) {
    const months = differenceInMonths(formData.endDate, formData.startDate);
    setContractDuration(months > 0 ? months : 0);
  }
}, [formData.startDate, formData.endDate]);

// Display:
// "مدة العقد: 12 شهر (1 سنة و 0 شهر)"
// "مدة العقد: 18 شهر (1 سنة و 6 شهر)"
```

---

## Provider Types

```javascript
const PROVIDER_TYPES = [
  { value: 'HOSPITAL', label: 'مستشفى', icon: '🏥' },
  { value: 'CLINIC', label: 'عيادة', icon: '🏥' },
  { value: 'LAB', label: 'مختبر', icon: '🔬' },
  { value: 'PHARMACY', label: 'صيدلية', icon: '💊' },
  { value: 'RADIOLOGY', label: 'مركز أشعة', icon: '📷' }
];

// Usage in auto-code:
// HOSPITAL → HOS
// CLINIC → CLI
// LAB → LAB
// PHARMACY → PHA
// RADIOLOGY → RAD
```

---

## Pricing Models

```javascript
const PRICING_MODELS = [
  { 
    value: 'DISCOUNT', 
    label: 'نسبة خصم', 
    description: 'خصم نسبة مئوية من السعر الأصلي', 
    icon: '💰' 
  },
  { 
    value: 'FIXED', 
    label: 'سعر ثابت', 
    description: 'أسعار محددة لكل خدمة', 
    icon: '📌' 
  },
  { 
    value: 'TIERED', 
    label: 'تسعير متدرج', 
    description: 'أسعار متدرجة حسب الكمية', 
    icon: '📊' 
  },
  { 
    value: 'NEGOTIATED', 
    label: 'سعر تفاوضي', 
    description: 'أسعار حسب الاتفاق المسبق', 
    icon: '🤝' 
  }
];
```

---

## Error Handling Patterns

### Loading State
```jsx
{providersLoading && (
  <Alert severity="info" icon={<CircularProgress size={20} />}>
    جاري تحميل قائمة مقدمي الخدمة...
  </Alert>
)}
```

### Error State with Retry
```jsx
{providersError && (
  <Alert 
    severity="error" 
    action={
      <Button color="inherit" size="small" onClick={refetchProviders}>
        إعادة المحاولة
      </Button>
    }
  >
    فشل تحميل قائمة مقدمي الخدمة
  </Alert>
)}
```

### Empty State
```jsx
{!providersLoading && providers.length === 0 && (
  <Alert severity="warning">
    لا توجد مقدمي خدمة متاحين. يرجى إضافة مقدم خدمة أولاً من{' '}
    <Button size="small" onClick={() => navigate('/providers/create')}>
      صفحة مقدمي الخدمات
    </Button>
  </Alert>
)}
```

---

## Form Submission

### Provider Form
```javascript
const handleSubmit = async () => {
  if (!validateStep(0) || !validateStep(1)) {
    enqueueSnackbar('يرجى التأكد من صحة البيانات', { variant: 'error' });
    return;
  }

  const result = await create(formData);

  if (result.success) {
    enqueueSnackbar('تم إنشاء مقدم الخدمة بنجاح', { variant: 'success' });
    navigate('/providers');
  } else {
    enqueueSnackbar(result.error || 'فشل إنشاء مقدم الخدمة', { variant: 'error' });
  }
};
```

### Contract Form
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    enqueueSnackbar('يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح', { variant: 'error' });
    return;
  }

  const payload = {
    providerId: formData.providerId,
    contractCode: autoContractCode, // Use auto-generated code
    startDate: format(formData.startDate, 'yyyy-MM-dd'),
    endDate: format(formData.endDate, 'yyyy-MM-dd'),
    pricingModel: formData.pricingModel,
    discountRate: formData.pricingModel === 'DISCOUNT' ? parseFloat(formData.discountRate) : null,
    notes: formData.notes || null
  };

  createMutation.mutate(payload);
};
```

---

## Autocomplete Configuration

```jsx
<Autocomplete
  fullWidth
  value={selectedProvider}
  onChange={handleProviderChange}
  options={providers}
  getOptionLabel={(option) => 
    option.nameArabic || option.nameAr || option.nameEnglish || option.nameEn || ''
  }
  loading={providersLoading}
  disabled={providersLoading || createMutation.isLoading}
  isOptionEqualToValue={(option, value) => option.id === value?.id}
  renderInput={(params) => (
    <TextField
      {...params}
      label="مقدم الخدمة *"
      error={!!errors.providerId}
      helperText={errors.providerId || 'ابحث واختر مقدم الخدمة الصحية'}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {providersLoading && <CircularProgress color="inherit" size={20} />}
            {params.InputProps.endAdornment}
          </>
        )
      }}
    />
  )}
  renderOption={(props, option) => (
    <Box component="li" {...props} key={option.id}>
      <Stack spacing={0.5} sx={{ width: '100%' }}>
        <Typography variant="body2" fontWeight={500}>
          {option.nameArabic || option.nameAr}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {option.nameEnglish || option.nameEn}
          </Typography>
          {option.city && (
            <Chip label={option.city} size="small" variant="outlined" sx={{ height: 18 }} />
          )}
        </Box>
      </Stack>
    </Box>
  )}
  noOptionsText={providersLoading ? 'جاري التحميل...' : 'لا توجد مقدمي خدمة'}
/>
```

---

## Common Issues & Solutions

### Issue: Auto-code not updating
**Solution:** Check that both required fields are filled:
- Provider form: `providerType` + `nameArabic`
- Contract form: `selectedProvider` + `startDate`

### Issue: Provider list empty
**Solution:**
1. Check API response structure in console
2. Verify extraction: `content || data || []`
3. Check network tab for API errors

### Issue: Validation not working
**Solution:**
- Check field names match formData keys
- Ensure validateStep is called before navigation
- Check error state is being set correctly

### Issue: Stepper stuck
**Solution:**
- Ensure validation passes for current step
- Check activeStep state updates
- Verify handleNext/handleBack are bound correctly

---

## Testing Checklist

### Provider Form
- [ ] Auto-code appears when type + name filled
- [ ] Auto-code updates on type/name change
- [ ] Cannot proceed to step 2 without required fields
- [ ] Email validation works
- [ ] Step 3 shows correct summary
- [ ] Submit works and navigates to list

### Contract Form
- [ ] Providers list loads successfully
- [ ] Can search and select provider
- [ ] Auto-code appears when provider + date filled
- [ ] Duration calculated correctly
- [ ] Pricing model conditional fields work
- [ ] Discount rate validation (0-100)
- [ ] Submit works and navigates to list

---

## File Locations

```
frontend/src/
├── pages/
│   ├── providers/
│   │   ├── ProviderCreate.jsx          (600+ lines)
│   │   └── ProviderCreate.jsx.backup   (original)
│   └── provider-contracts/
│       ├── ProviderContractCreate.jsx       (550+ lines)
│       └── ProviderContractCreate.jsx.backup (original)
├── hooks/
│   └── useProviders.js                 (no changes)
├── services/api/
│   ├── providers.service.js            (no changes)
│   └── provider-contracts.service.js   (no changes)
└── components/
    ├── MainCard.jsx                    (no changes)
    └── tba/
        ├── ModernPageHeader.jsx        (no changes)
        └── RBACGuard.jsx               (no changes)
```

---

## Dependencies

### Required packages:
- `@mui/material` - UI components
- `@mui/icons-material` - Icons
- `@mui/x-date-pickers` - Date pickers
- `@tanstack/react-query` - Data fetching
- `react-router-dom` - Navigation
- `notistack` - Notifications
- `date-fns` - Date utilities

### No new dependencies added!

---

## Quick Commands

```bash
# Restore original files
cd frontend/src/pages/providers/
mv ProviderCreate.jsx.backup ProviderCreate.jsx

cd frontend/src/pages/provider-contracts/
mv ProviderContractCreate.jsx.backup ProviderContractCreate.jsx

# View changes
git diff cf680e8^..cf680e8

# View commit
git show cf680e8

# Rollback if needed
git revert cf680e8
```

---

**Last Updated:** 2026-01-03  
**Version:** 2.0  
**Commits:** cf680e8, a0ff7ee, 866c0cd
