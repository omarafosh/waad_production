# Frontend Validation Matrix - Phase C Cleanup

## Overview

This document summarizes the Phase C frontend validation cleanup work:
- Created centralized `formValidation.js` utility
- Unified validation rules across Create, Edit, and Import flows
- Implemented payload normalization (empty string → null, trim all text, block negative numbers)

---

## Centralized Validation Utility

**File:** `frontend/src/utils/formValidation.js`

### Core Functions

| Function | Purpose | Usage |
|----------|---------|-------|
| `normalizePayload(obj)` | Trims strings, converts empty → null, handles nested objects | Before every API call |
| `normalizeValue(value)` | Single value normalization | Real-time form handling |
| `validateField(type, value, options)` | Validate single field with multiple rules | Form validation |
| `validateForm(data, schema)` | Validate entire form against schema | Bulk validation |
| `normalizeExcelRow(row)` | Excel-specific normalization | Excel imports |
| `validateExcelRow(row, schema, rowNum)` | Validate Excel row | Excel imports |

### Built-in Validators

| Validator | Rule | Arabic Error Message |
|-----------|------|----------------------|
| `required` | Non-empty value | `{field} مطلوب` |
| `email` | Valid email format | `صيغة البريد الإلكتروني غير صحيحة` |
| `phone` | Saudi phone format (05xxxxxxxx) | `رقم الهاتف غير صحيح (مثال: 0512345678)` |
| `nationalNumber` | 10 digits starting with 1 or 2 | `رقم الهوية يجب أن يكون 10 أرقام تبدأ بـ 1 أو 2` |
| `positiveNumber` | Greater than zero | `{field} يجب أن يكون أكبر من صفر` |
| `nonNegativeNumber` | Zero or greater | `{field} لا يمكن أن يكون سالباً` |
| `percentage` | 0-100 range | `{field} يجب أن يكون بين 0 و 100` |
| `maxLength` | Max character limit | `{field} يجب ألا يتجاوز {n} حرف` |
| `minLength` | Min character requirement | `{field} يجب أن يكون {n} أحرف على الأقل` |
| `dateRange` | Start ≤ End | `تاريخ البداية يجب أن يكون قبل تاريخ النهاية` |
| `futureDate` | Date ≥ Today | `{field} يجب أن يكون في المستقبل` |
| `pastDate` | Date ≤ Today | `{field} يجب أن يكون في الماضي أو اليوم` |
| `code` | Alphanumeric + dashes | `{field} يجب أن يحتوي على أحرف وأرقام فقط` |

---

## Entity Validation Rules

### Members (UnifiedMemberCreate/Edit)

| Field | Required | Validator | Notes |
|-------|----------|-----------|-------|
| `fullName` | ✅ | required, maxLength(255) | Principal & Dependent |
| `birthDate` | ✅ | required, pastDate | |
| `gender` | ✅ | required | MALE/FEMALE/UNDEFINED |
| `employerOrganizationId` | ✅ (Principal) | required | Principal only |
| `relationship` | ✅ (Dependent) | required | Dependent only |
| `nationalNumber` | ❌ | nationalNumber | 10-digit Saudi ID |
| `email` | ❌ | email | |
| `phone` | ❌ | phone | Saudi format |

### Providers (ProviderCreate/Edit)

| Field | Required | Validator | Notes |
|-------|----------|-----------|-------|
| `name` | ✅ | required, maxLength(255) | |
| `licenseNumber` | ✅ | required | Ministry of Health license |
| `providerType` | ✅ | required | HOSPITAL/CLINIC/LAB/PHARMACY/RADIOLOGY |
| `email` | ❌ | email | |
| `phone` | ❌ | phone | |
| `defaultDiscountRate` | ❌ | percentage | 0-100 |

### Medical Services (MedicalServiceCreate/Edit)

| Field | Required | Validator | Notes |
|-------|----------|-----------|-------|
| `code` | ✅ | required, code | Alphanumeric |
| `name` | ✅ | required, maxLength(255) | |
| `categoryId` | ✅ | required | FK to category |
| `basePrice` | ❌ | nonNegativeNumber | Reference price only |

### Claims (ClaimCreate)

| Field | Required | Validator | Notes |
|-------|----------|-----------|-------|
| `visitId` | ✅ | required | Must link to visit |
| `diagnosisCode` | ✅ | required | ICD-10 code |
| `diagnosisDescription` | ✅ | required | |
| `claimLines` | ✅ | length ≥ 1 | At least one service |
| `doctorName` | ❌ | | |
| `notes` | ❌ | | |

---

## Payload Normalization

### Before (Inconsistent)

```javascript
// Manual, inconsistent pattern
const payload = {
  fullName: principalForm.fullName.trim(),
  nationalNumber: principalForm.nationalNumber?.trim() || null,
  email: principalForm.email || null,
  // ... inconsistent handling
};
```

### After (Centralized)

```javascript
import { normalizePayload } from 'utils/formValidation';

// Automatic normalization
const rawPayload = {
  fullName: principalForm.fullName,
  nationalNumber: principalForm.nationalNumber,
  email: principalForm.email,
  // ... all values as-is
};

// This automatically:
// - Trims all strings
// - Converts empty strings to null
// - Handles nested objects/arrays
// - Preserves booleans and numbers
const payload = normalizePayload(rawPayload);
```

---

## Files Updated

### Forms Updated with Centralized Validation

| File | Changes |
|------|---------|
| `pages/members/UnifiedMemberCreate.jsx` | Import `normalizePayload`, `validators`; use in `validatePrincipalForm()` and `handleSubmit()` |
| `pages/members/UnifiedMemberEdit.jsx` | Import `normalizePayload`, `validators`; use in `validateForm()` and `handleSubmit()` |
| `pages/providers/ProviderCreate.jsx` | Import `normalizePayload`, `validators`; use in `validateStep()` and `handleSubmit()` |
| `pages/medical-services/MedicalServiceCreate.jsx` | Import `normalizePayload`, `validators`; use in `validate()` and `handleSubmit()` |
| `pages/claims/ClaimCreate.jsx` | Import `normalizePayload`, `validators`; use in `validateForm()` and `handleSubmit()` |

### New Utility Created

| File | Purpose |
|------|---------|
| `utils/formValidation.js` | Centralized validation & normalization utility |

---

## Validation Rules Relaxed/Removed

| Entity | Field | Change | Reason |
|--------|-------|--------|--------|
| Member | `nationalNumber` | Optional (was sometimes required) | Civil ID is optional per architecture |
| Provider | `phone` | Format validation only (not required) | Contact info is optional |
| Provider | `email` | Format validation only (not required) | Contact info is optional |
| Medical Service | `basePrice` | Allow 0 (was > 0) | Reference price can be zero |

---

## Validation Rules Added

| Entity | Field | Rule | Purpose |
|--------|-------|------|---------|
| Member | `phone` | Saudi phone format | Consistent formatting |
| Member | `nationalNumber` | 10-digit Saudi ID format | Data integrity |
| Provider | `defaultDiscountRate` | 0-100 percentage | Prevent invalid values |
| All | All numeric fields | Block negative numbers | Data integrity |

---

## Backend Error Reduction

Expected reduction in backend validation errors:

1. **Empty string errors**: Eliminated by converting to `null`
2. **Whitespace issues**: Eliminated by auto-trimming
3. **Format validation**: Caught early in frontend
4. **Negative numbers**: Blocked before submission
5. **Required field errors**: Consistent across all forms

---

## Usage Example

```javascript
import { 
  normalizePayload, 
  validators, 
  validateForm, 
  memberValidationSchema 
} from 'utils/formValidation';

// Option 1: Manual validation
const errors = {};
const nameResult = validators.required(form.fullName, 'الاسم الكامل');
if (!nameResult.valid) errors.fullName = nameResult.error;

// Option 2: Schema-based validation
const errors = validateForm(form, memberValidationSchema);

// Option 3: Field-specific validation with options
const error = validateField('email', form.email, { 
  required: true, 
  label: 'البريد الإلكتروني' 
});

// Always normalize before API call
const payload = normalizePayload(formData);
await api.create(payload);
```

---

## Date: 2026-01-15
## Phase: C - Frontend Validation Cleanup
## Status: ✅ COMPLETE
