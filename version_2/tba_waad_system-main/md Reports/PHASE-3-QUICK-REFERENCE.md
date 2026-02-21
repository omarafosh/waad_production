# 🚀 Phase 3 Quick Reference - Frontend Service Layer

**File:** `employers.service.js`  
**Status:** ✅ Complete  
**Date:** 2024-12-29

---

## 📦 What's Included

✅ **Field Normalization Functions**
- `normalizeEmployerRequest()` - Frontend → Backend
- `normalizeEmployerResponse()` - Backend → Frontend
- `normalizeEmployerArrayResponse()` - Array normalization

✅ **Error Handling**
- `handleEmployerErrors()` - Maps backend errors to Arabic messages

✅ **CRUD Operations** (All normalized)
- `createEmployer()` - Create with auto-code support
- `getEmployerById()` - Get single employer
- `getEmployers()` - Get all employers
- `updateEmployer()` - Update employer
- `deleteEmployer()` - Soft delete
- `getEmployerSelectors()` - Dropdown data
- `getEmployerCount()` - Count active employers

✅ **Client-Side Validation**
- Required field checking (nameAr)
- Pre-flight validation before API calls

✅ **Logging**
- Debug logs for all operations
- Error logs with full context

---

## 🎯 Core Transformations

### Request (Frontend → Backend)
```javascript
// Input (Frontend)
{
  employerCode: 'EMP-001',
  nameAr: 'شركة الواحة',
  nameEn: 'Al Waha',
  active: true
}

// Output (Backend)
{
  code: 'EMP-001',
  name: 'شركة الواحة',
  nameEn: 'Al Waha',
  active: true
}
```

### Response (Backend → Frontend)
```javascript
// Input (Backend)
{
  id: 1,
  code: 'EMP-01',
  nameAr: 'شركة الواحة',    // Backend serializes as 'nameAr'
  nameEn: 'Al Waha',
  active: true,
  createdAt: '2024-12-29T10:00:00',
  updatedAt: '2024-12-29T10:00:00'
}

// Output (Frontend)
{
  id: 1,
  code: 'EMP-01',
  nameAr: 'شركة الواحة',
  nameEn: 'Al Waha',
  active: true,
  createdAt: '2024-12-29T10:00:00',
  updatedAt: '2024-12-29T10:00:00'
}
```

---

## 📝 Quick Usage

### Create (Auto-Code)
```javascript
await createEmployer({
  nameAr: 'شركة الواحة',
  nameEn: 'Al Waha'
});
// → Backend generates: EMP-01
```

### Create (Custom Code)
```javascript
await createEmployer({
  employerCode: 'EMP-CUSTOM',
  nameAr: 'شركة النور',
  nameEn: 'Al Noor'
});
// → Backend uses: EMP-CUSTOM
```

### Get & Update
```javascript
const employer = await getEmployerById(1);
// employer.nameAr = 'شركة الواحة'

employer.nameAr = 'شركة الواحة المحدودة';
await updateEmployer(employer.id, employer);
```

### Error Handling
```javascript
try {
  await createEmployer(formData);
} catch (error) {
  console.log(error.status);        // 400, 404, 409, 500
  console.log(error.message);       // Arabic message
  console.log(error.fieldErrors);   // { nameAr: '...' }
}
```

---

## ✅ Features

| Feature | Status | Description |
|---------|--------|-------------|
| Auto-Code | ✅ | Omit code → backend generates |
| Field Mapping | ✅ | employerCode↔code, nameAr↔name |
| Validation | ✅ | Client-side before API call |
| Error Handling | ✅ | Arabic messages |
| Backward Compat | ✅ | Supports legacy names |
| Logging | ✅ | Debug + error logs |
| JSDoc | ✅ | Full documentation |

---

## 🔍 Error Messages

| Status | Arabic Message |
|--------|----------------|
| 400 | يرجى تصحيح الأخطاء في النموذج |
| 404 | صاحب العمل غير موجود |
| 409 | رمز صاحب العمل مستخدم بالفعل |
| 403 | ليس لديك صلاحية لتنفيذ هذه العملية |
| 500 | خطأ في الخادم. يرجى المحاولة لاحقاً |

---

## 📚 Documentation

- **Full Guide:** [PHASE-3-FRONTEND-SERVICE-GUIDE.md](PHASE-3-FRONTEND-SERVICE-GUIDE.md)
- **Backend Contract:** [EMPLOYER_API_CONTRACT.md](EMPLOYER_API_CONTRACT.md)
- **Backend Implementation:** [PHASE-2-EMPLOYER-IMPLEMENTATION-REPORT.md](PHASE-2-EMPLOYER-IMPLEMENTATION-REPORT.md)

---

**Implementation:** ✅ Complete  
**Integration:** Ready for use in all Employer forms  
**Testing:** Ready for manual and automated tests  
**Compatibility:** 100% with Backend Phase 2

