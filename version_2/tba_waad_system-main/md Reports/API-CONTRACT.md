# API Contract Documentation

## Overview
This document defines the **exact contract** between Backend (Spring Boot) and Frontend (React) for Organization-based APIs.

---

## 📋 Response Wrapper Structure

### Backend `ApiResponse<T>` Structure
All endpoints wrap their responses in `ApiResponse`:

```json
{
  "status": "success",
  "message": "Optional message",
  "data": <T>,
  "timestamp": "2025-12-20T00:00:00"
}
```

### Backend `PaginationResponse<T>` Structure
Paginated endpoints return:

```json
{
  "items": [<T>],
  "total": 100,
  "page": 1,
  "size": 10
}
```

---

## 🔌 Endpoint Contracts

### 1. Employers Module

#### `GET /api/employers`
**Returns:** `ApiResponse<List<EmployerResponseDto>>`

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "nameAr": "شركة الإسمنت الليبية",
      "nameEn": "Libyan Cement Company",
      "code": "LIBCEMENT",
      "active": true,
      "createdAt": "2025-12-20T00:00:00",
      "updatedAt": "2025-12-20T00:00:00"
    }
  ],
  "timestamp": "2025-12-20T00:00:00"
}
```

**Frontend Access:**
```javascript
const response = await axiosClient.get('/api/employers');
const employers = response.data.data; // Unwrap: axios.data → ApiResponse.data
```

#### `GET /api/employers/selectors`
**Returns:** `List<EmployerSelectorDto>` (No ApiResponse wrapper)

```json
[
  {
    "id": 1,
    "code": "LIBCEMENT",
    "nameAr": "شركة الإسمنت الليبية",
    "nameEn": "Libyan Cement Company"
  }
]
```

#### `GET /api/employers/{id}`
**Returns:** `ApiResponse<EmployerResponseDto>`

---

### 2. Insurance Companies Module

#### `GET /api/insurance-companies` (Paginated)
**Returns:** `ApiResponse<PaginationResponse<InsuranceCompanyResponseDto>>`

**Query Params:**
- `page` (default: 1) - 1-based page number
- `size` (default: 10) - Items per page
- `search` (optional) - Search query
- `sortBy` (default: "createdAt") - Sort field
- `sortDir` (default: "desc") - Sort direction

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "شركة الواحة للتأمين",
        "code": "ALWAHA_INS",
        "address": null,
        "phone": null,
        "email": null,
        "contactPerson": null,
        "active": true,
        "createdAt": "2025-12-20T00:00:00",
        "updatedAt": "2025-12-20T00:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10
  },
  "timestamp": "2025-12-20T00:00:00"
}
```

**Frontend Access:**
```javascript
const response = await axiosClient.get('/api/insurance-companies', { params: { page: 1, size: 10 } });
const paginationData = response.data.data; // { items, total, page, size }
const companies = paginationData.items;
```

#### `GET /api/insurance-companies/selector`
**Returns:** `ApiResponse<List<InsuranceCompanySelectorDto>>`

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "code": "ALWAHA_INS",
      "nameAr": "شركة الواحة للتأمين",
      "nameEn": "Al Waha Insurance Company"
    }
  ],
  "timestamp": "2025-12-20T00:00:00"
}
```

#### `GET /api/insurance-companies/all` (Deprecated)
**Returns:** `ApiResponse<List<InsuranceCompanyResponseDto>>`
**Note:** Use paginated endpoint instead

#### `GET /api/insurance-companies/{id}`
**Returns:** `ApiResponse<InsuranceCompanyResponseDto>`

#### `GET /api/insurance-companies/count`
**Returns:** `ApiResponse<Long>`

```json
{
  "status": "success",
  "data": 5,
  "timestamp": "2025-12-20T00:00:00"
}
```

---

### 3. Reviewer Companies Module

#### `GET /api/reviewer-companies` (Paginated)
**Returns:** `ApiResponse<PaginationResponse<ReviewerCompanyResponseDto>>`

**Query Params:** Same as insurance-companies

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "مراجع طبي 1",
        "code": "REV001",
        "active": true,
        "createdAt": "2025-12-20T00:00:00",
        "updatedAt": "2025-12-20T00:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10
  },
  "timestamp": "2025-12-20T00:00:00"
}
```

#### `GET /api/reviewer-companies/selector`
**Returns:** `ApiResponse<List<ReviewerCompanySelectorDto>>`

#### `GET /api/reviewer-companies/all`
**Returns:** `ApiResponse<List<ReviewerCompanyResponseDto>>`

#### `GET /api/reviewer-companies/{id}`
**Returns:** `ApiResponse<ReviewerCompanyResponseDto>`

---

## 🔧 Frontend Service Layer Contract

### Unwrapping Pattern
All services must unwrap the `ApiResponse` wrapper:

```javascript
const unwrap = (response) => response.data?.data || response.data;

export const getAll = async (params = {}) => {
  const response = await apiClient.get(BASE_URL, { params });
  return unwrap(response); // Returns PaginationResponse or Array
};
```

### Expected Returns by Service Method

| Method | Backend Returns | Service Returns | Hook Expects |
|--------|----------------|-----------------|--------------|
| `getAll()` | `ApiResponse<PaginationResponse<T>>` | `{ items: [], total: X, page: Y, size: Z }` | Pagination object |
| `getById(id)` | `ApiResponse<T>` | `T` | Single entity |
| `create(dto)` | `ApiResponse<T>` | `T` | Created entity |
| `update(id, dto)` | `ApiResponse<T>` | `T` | Updated entity |
| `remove(id)` | `ApiResponse<void>` | `void` | void |

---

## ✅ Compliance Checklist

- [x] All services unwrap `ApiResponse.data`
- [x] Pagination endpoints support query params
- [x] Hooks expect correct data structure
- [x] No hardcoded constants used
- [x] Build passes without errors
- [x] RBAC unchanged
- [x] Endpoint URLs unchanged

---

## 📝 Migration Notes

### Phase 1: Backend Stabilization
- Fixed `count()` method to use `countByType()` instead of loading all records

### Phase 2: Frontend Cleanup
- Marked `constants/companies.js` as LEGACY
- Migrated `pages/policies/index.jsx` to use API data

### Phase 3: Contract Alignment
- Fixed all Organization services to unwrap `ApiResponse`
- Updated insurance companies service to support pagination params
- Updated reviewers service to support pagination params
- Ensured employers service follows same pattern

---

**Last Updated:** 2025-12-20 (Phase 3 Complete)
