# 📜 Employer API Contract Definition

**Phase:** 1 - API Contract Definition (Documentation Only)  
**Status:** ✅ Stabilized  
**Date:** 2024-12-29  
**Domain:** Employer Management  
**Version:** 1.0.0

---

## 🎯 Purpose

This document defines the **canonical API contract** for the Employer domain. It serves as the single source of truth for:
- Field names and their mapping across layers
- Data types and validation rules
- Required vs optional fields
- Ownership and immutability patterns
- Code generation rules
- Expected error scenarios

**This is a documentation-only phase. No code modifications are allowed.**

---

## 📐 Architecture Overview

```
┌─────────────────┐
│  Frontend Form  │ (employerCode, nameAr, nameEn, active)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service Layer   │ (Normalizer transforms field names)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend DTO   │ (code, name, nameEn, active)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Entity      │ (code, nameAr, nameEn, active)
│                 │ (DB: code, name_ar, name_en, active)
└─────────────────┘
```

---

## 📋 Field Registry

### Core Fields

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Immutable | Owner |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-----------|-------|
| **Employer Code** | `employerCode` | `code` | `code` | `code` | String(50) | ✔ Yes | ✔ Yes | System |
| **Name (Arabic)** | `nameAr` | `name` | `nameAr` | `name_ar` | String(200) | ✔ Yes | ❌ No | User |
| **Name (English)** | `nameEn` | `nameEn` | `nameEn` | `name_en` | String(200) | ❌ No | ❌ No | User |
| **Active Status** | `active` | `active` | `active` | `active` | Boolean | ❌ No | ❌ No | User |

### Audit Fields (System-Managed)

| Field Name | Entity Property | Database Column | Type | Required | Immutable | Owner |
|------------|-----------------|-----------------|------|----------|-----------|-------|
| **ID** | `id` | `id` | Long | ✔ Auto | ✔ Yes | System |
| **Created At** | `createdAt` | `created_at` | LocalDateTime | ✔ Auto | ✔ Yes | System |
| **Updated At** | `updatedAt` | `updated_at` | LocalDateTime | ✔ Auto | ❌ No | System |

### Deprecated Fields (Legacy Support)

| Field Name | Status | Notes |
|------------|--------|-------|
| `address` | Deprecated | Moved to Organization entity |
| `phone` | Deprecated | Moved to Organization entity |
| `email` | Deprecated | Moved to Organization entity |

---

## 🔄 Field Name Mapping Rules

### Rule 1: Frontend → Backend Transformation

**Pattern:** Frontend uses descriptive names, Backend uses concise canonical names

| Frontend Field | Transform Rule | Backend Field | Rationale |
|----------------|----------------|---------------|-----------|
| `employerCode` | Remove prefix | `code` | Code is contextually understood within Employer domain |
| `nameAr` | Map to canonical | `name` | Arabic is the primary language; `name` = Arabic name |
| `nameEn` | Keep as-is | `nameEn` | English name is supplementary |
| `active` | Keep as-is | `active` | Boolean status field |

### Rule 2: Backend DTO → Entity Mapping

**Pattern:** DTO uses business names, Entity uses database-aligned names

| Backend DTO Field | Transform Rule | Entity Field | Database Column |
|-------------------|----------------|--------------|-----------------|
| `code` | Direct map | `code` | `code` |
| `name` | Expand to locale | `nameAr` | `name_ar` |
| `nameEn` | Direct map | `nameEn` | `name_en` |
| `active` | Direct map | `active` | `active` |

### Rule 3: Normalization Point

**Location:** Service Layer (`employers.service.js`)

**Responsibility:**
- Transform `employerCode` → `code`
- Transform `nameAr` → `name`
- Ensure type safety (string trimming, boolean conversion)
- Apply default values

**Direction:** Bidirectional
- **Outbound (Create/Update):** Frontend names → Backend names
- **Inbound (Read):** Backend names → Frontend names (reverse mapping)

---

## 📝 API Endpoints

### Base URL
```
/api/employers
```

### Supported Operations

| Method | Endpoint | Operation | Request DTO | Response DTO | Auth Required |
|--------|----------|-----------|-------------|--------------|---------------|
| GET | `/api/employers` | List All | - | `List<EmployerResponseDto>` | Yes |
| GET | `/api/employers/{id}` | Get by ID | - | `EmployerResponseDto` | Yes |
| GET | `/api/employers/selectors` | Dropdown List | - | `List<EmployerSelectorDto>` | Yes |
| POST | `/api/employers` | Create | `EmployerCreateDto` | `EmployerResponseDto` | Yes |
| PUT | `/api/employers/{id}` | Update | `EmployerUpdateDto` | `EmployerResponseDto` | Yes |
| DELETE | `/api/employers/{id}` | Delete | - | `ApiResponse<Void>` | Yes |
| GET | `/api/employers/count` | Count Total | - | `ApiResponse<Long>` | Yes |

---

## 📤 Request DTOs

### EmployerCreateDto

**Purpose:** Create a new employer record

| Field | Type | Required | Validation | Default | Notes |
|-------|------|----------|------------|---------|-------|
| `code` | String | ✔ Yes | @NotBlank, Unique | - | System validates uniqueness |
| `name` | String | ✔ Yes | @NotBlank, Max 200 chars | - | Arabic name (primary) |
| `nameEn` | String | ❌ No | Max 200 chars | null | English name (optional) |
| `active` | Boolean | ❌ No | - | true | Status flag |

**Field Acceptance Rules:**
- Backend MUST accept `code` (canonical)
- Backend MAY accept `employerCode` via @JsonAlias (backward compatibility)
- Backend MUST accept `name` (canonical)
- Backend MAY accept `nameAr` via @JsonAlias (backward compatibility)

**Example Request (Canonical):**
```json
{
  "code": "EMP-001",
  "name": "شركة الواحة للتجارة",
  "nameEn": "Al Waha Trading Company",
  "active": true
}
```

**Example Request (Legacy/Frontend):**
```json
{
  "employerCode": "EMP-001",
  "nameAr": "شركة الواحة للتجارة",
  "nameEn": "Al Waha Trading Company",
  "active": true
}
```

**Normalization Requirement:**
- Service Layer MUST transform `employerCode` → `code` before sending
- Service Layer MUST transform `nameAr` → `name` before sending
- Backend SHOULD accept both via @JsonAlias for resilience

---

### EmployerUpdateDto

**Purpose:** Update an existing employer record

| Field | Type | Required | Validation | Immutable | Notes |
|-------|------|----------|------------|-----------|-------|
| `code` | String | ✔ Yes | @NotBlank | ❌ No | Can be changed (unique constraint enforced) |
| `name` | String | ✔ Yes | @NotBlank, Max 200 chars | ❌ No | Arabic name |
| `nameEn` | String | ❌ No | Max 200 chars | ❌ No | English name |
| `active` | Boolean | ❌ No | - | ❌ No | Status flag |

**Field Acceptance Rules:**
- Same as EmployerCreateDto
- `id` is provided in URL path, NOT in request body

**Example Request (Canonical):**
```json
{
  "code": "EMP-001-UPDATED",
  "name": "شركة الواحة للتجارة المحدودة",
  "nameEn": "Al Waha Trading Company Ltd",
  "active": true
}
```

---

## 📥 Response DTOs

### EmployerResponseDto

**Purpose:** Standard employer data response

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | Long | ❌ No | Primary key |
| `code` | String | ❌ No | Employer code |
| `nameAr` | String | ❌ No | Arabic name (Entity field name) |
| `nameEn` | String | ✔ Yes | English name |
| `active` | Boolean | ❌ No | Status flag |
| `createdAt` | LocalDateTime | ❌ No | Creation timestamp |
| `updatedAt` | LocalDateTime | ❌ No | Last update timestamp |

**Response Format:**
```json
{
  "status": "success",
  "message": "Employer retrieved successfully",
  "data": {
    "id": 1,
    "code": "EMP-001",
    "nameAr": "شركة الواحة للتجارة",
    "nameEn": "Al Waha Trading Company",
    "active": true,
    "createdAt": "2024-01-15T10:30:00",
    "updatedAt": "2024-12-29T14:20:00"
  },
  "timestamp": "2024-12-29T14:20:00.123Z"
}
```

**Field Name Convention in Response:**
- Response uses Entity field names (`nameAr`, `nameEn`)
- NOT DTO names (`name`, `nameEn`)
- Frontend MUST map `nameAr` when displaying/editing

---

### EmployerSelectorDto

**Purpose:** Lightweight dropdown/selector data

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | Long | ❌ No | Primary key |
| `code` | String | ❌ No | Employer code |
| `nameAr` | String | ❌ No | Display name (Arabic) |
| `active` | Boolean | ❌ No | Status flag |

**Response Format:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "code": "EMP-001",
      "nameAr": "شركة الواحة للتجارة",
      "active": true
    },
    {
      "id": 2,
      "code": "EMP-002",
      "nameAr": "شركة النور للخدمات",
      "active": true
    }
  ]
}
```

---

## 🔒 Validation Rules

### Backend Validation (DTO Level)

| Rule ID | Field | Validation | Error Message | HTTP Status |
|---------|-------|------------|---------------|-------------|
| VAL-001 | `code` | @NotBlank | "Employer code is required" | 400 |
| VAL-002 | `code` | Unique constraint | "Employer code already exists" | 400 |
| VAL-003 | `code` | Max length 50 | "Employer code too long" | 400 |
| VAL-004 | `name` | @NotBlank | "Employer name (Arabic) is required" | 400 |
| VAL-005 | `name` | Max length 200 | "Employer name too long" | 400 |
| VAL-006 | `nameEn` | Max length 200 | "English name too long" | 400 |

### Business Rules

| Rule ID | Description | Enforcement Point | Error Code |
|---------|-------------|-------------------|------------|
| BUS-001 | Code must be unique across all employers | Database unique constraint | 400 Bad Request |
| BUS-002 | Cannot delete employer with active members | Service layer check | 409 Conflict |
| BUS-003 | Arabic name is mandatory (primary language) | DTO validation | 400 Bad Request |
| BUS-004 | English name is optional | DTO validation | - |
| BUS-005 | Active defaults to true on creation | Entity @Builder.Default | - |

---

## 🚫 Error Codes and Scenarios

### HTTP Status Codes

| Status | Code | Scenario | Response Body |
|--------|------|----------|---------------|
| 200 | OK | Successful GET/PUT | ApiResponse with data |
| 201 | Created | Successful POST | ApiResponse with created entity |
| 400 | Bad Request | Validation failure | Error details with field errors |
| 401 | Unauthorized | Missing/invalid auth token | Error message |
| 403 | Forbidden | Insufficient permissions | "Access denied" |
| 404 | Not Found | Employer ID not found | "Employer not found" |
| 409 | Conflict | Code already exists / Cannot delete | Business rule violation message |
| 500 | Internal Server Error | Unexpected server error | Generic error message |

### Error Response Format

**Validation Error (400):**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "code": "Employer code is required",
    "name": "Employer name (Arabic) is required"
  },
  "timestamp": "2024-12-29T14:20:00.123Z"
}
```

**Business Rule Violation (409):**
```json
{
  "status": "error",
  "message": "Cannot delete employer with active members",
  "errorCode": "EMPLOYER_HAS_MEMBERS",
  "timestamp": "2024-12-29T14:20:00.123Z"
}
```

**Not Found (404):**
```json
{
  "status": "error",
  "message": "Employer not found with ID: 999",
  "errorCode": "RESOURCE_NOT_FOUND",
  "timestamp": "2024-12-29T14:20:00.123Z"
}
```

---

## 🔐 Authorization Rules

### Permission Requirements

| Operation | Required Permission | Role Alternatives |
|-----------|---------------------|-------------------|
| View Employers (GET) | `VIEW_EMPLOYERS` | SUPER_ADMIN |
| Create Employer (POST) | `MANAGE_EMPLOYERS` | SUPER_ADMIN |
| Update Employer (PUT) | `MANAGE_EMPLOYERS` | SUPER_ADMIN |
| Delete Employer (DELETE) | `MANAGE_EMPLOYERS` | SUPER_ADMIN |
| View Selectors (GET) | `VIEW_EMPLOYERS` | SUPER_ADMIN |

### Security Annotations (Reference)

```
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('VIEW_EMPLOYERS')")   // GET
@PreAuthorize("hasRole('SUPER_ADMIN') or hasAuthority('MANAGE_EMPLOYERS')") // POST/PUT/DELETE
```

---

## 🎨 Code Generation Rules

### Frontend State Naming

**Convention:** Use descriptive, semantic names

```typescript
interface EmployerFormState {
  employerCode: string;    // Descriptive: indicates it's the employer's code
  nameAr: string;          // Locale suffix: indicates Arabic name
  nameEn: string;          // Locale suffix: indicates English name
  active: boolean;         // Status flag
}
```

**Rationale:**
- Frontend developers expect semantic clarity
- `employerCode` is more readable than generic `code` in UI context
- Locale suffixes (`Ar`, `En`) make internationalization explicit

---

### Backend DTO Naming

**Convention:** Use canonical, context-aware names

```java
public class EmployerCreateDto {
    private String code;      // Canonical: context (Employer) is implicit
    private String name;      // Primary name (Arabic) without suffix
    private String nameEn;    // Secondary name with locale suffix
    private Boolean active;   // Status flag
}
```

**Rationale:**
- Within Employer context, `code` is unambiguous
- `name` defaults to primary language (Arabic) without suffix
- English name gets explicit suffix (`nameEn`) as it's supplementary

---

### Service Layer Normalization

**Responsibility:** Bridge Frontend and Backend naming conventions

**Transformation Direction:**

**Outbound (Frontend → Backend):**
```javascript
// Transform before POST/PUT
{
  employerCode: "EMP-001",  // Frontend name
  nameAr: "شركة الواحة",     // Frontend name
  nameEn: "Al Waha"
}
↓ Normalize ↓
{
  code: "EMP-001",          // Backend canonical
  name: "شركة الواحة",       // Backend canonical
  nameEn: "Al Waha"
}
```

**Inbound (Backend → Frontend):**
```javascript
// Transform after GET
{
  code: "EMP-001",          // Backend canonical
  nameAr: "شركة الواحة",     // Entity field name
  nameEn: "Al Waha"
}
↓ Normalize ↓
{
  employerCode: "EMP-001",  // Frontend name
  nameAr: "شركة الواحة",     // Keep as-is (matches)
  nameEn: "Al Waha"
}
```

---

## 📊 Entity-Database Mapping

### Entity Definition (Reference)

**File:** `Employer.java`

| Java Property | JPA Annotation | Database Column | Type | Constraints |
|---------------|----------------|-----------------|------|-------------|
| `id` | @Id @GeneratedValue | `id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT |
| `code` | @Column(nullable=false, unique=true) | `code` | VARCHAR(50) | NOT NULL, UNIQUE |
| `nameAr` | @Column(nullable=false, name="name_ar") | `name_ar` | VARCHAR(200) | NOT NULL |
| `nameEn` | @Column(name="name_en") | `name_en` | VARCHAR(200) | NULL |
| `active` | @Column | `active` | BOOLEAN | DEFAULT TRUE |
| `createdAt` | @CreatedDate | `created_at` | TIMESTAMP | NOT NULL |
| `updatedAt` | @LastModifiedDate | `updated_at` | TIMESTAMP | NOT NULL |

### Database Schema (Reference)

```sql
-- Reference only - DO NOT EXECUTE in Phase 1

CREATE TABLE employers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_employer_code ON employers(code);
CREATE INDEX idx_employer_active ON employers(active);
```

---

## 🔄 Data Flow Examples

### Example 1: Create Employer Flow

**Step 1: Frontend Form Submission**
```javascript
// User fills form in EmployerCreate.jsx
const formData = {
  employerCode: "EMP-001",
  nameAr: "شركة الواحة",
  nameEn: "Al Waha Company",
  active: true
};
```

**Step 2: Service Layer Normalization**
```javascript
// employers.service.js normalizes field names
const normalizedPayload = {
  code: "EMP-001",           // employerCode → code
  name: "شركة الواحة",        // nameAr → name
  nameEn: "Al Waha Company",
  active: true
};

// POST /api/employers
```

**Step 3: Backend DTO Validation**
```java
// EmployerCreateDto receives and validates
{
  code: "EMP-001",           ✔ @NotBlank passed
  name: "شركة الواحة",        ✔ @NotBlank passed
  nameEn: "Al Waha Company", ✔ Optional
  active: true               ✔ Default honored
}
```

**Step 4: Entity Mapping**
```java
// Mapper converts DTO → Entity
Employer entity = new Employer();
entity.setCode("EMP-001");
entity.setNameAr("شركة الواحة");    // name → nameAr
entity.setNameEn("Al Waha Company");
entity.setActive(true);
```

**Step 5: Database Persistence**
```sql
INSERT INTO employers (code, name_ar, name_en, active, created_at, updated_at)
VALUES ('EMP-001', 'شركة الواحة', 'Al Waha Company', TRUE, NOW(), NOW());
```

**Step 6: Response**
```json
{
  "status": "success",
  "message": "Employer created successfully",
  "data": {
    "id": 1,
    "code": "EMP-001",
    "nameAr": "شركة الواحة",       // Entity field name
    "nameEn": "Al Waha Company",
    "active": true,
    "createdAt": "2024-12-29T10:00:00",
    "updatedAt": "2024-12-29T10:00:00"
  }
}
```

---

### Example 2: Update Employer Flow

**Step 1: Frontend Loads Existing Data**
```javascript
// GET /api/employers/1 returns entity field names
const employer = {
  id: 1,
  code: "EMP-001",
  nameAr: "شركة الواحة",       // Entity name
  nameEn: "Al Waha Company",
  active: true
};

// Frontend maps to form state
const formData = {
  employerCode: employer.code,      // Map: code → employerCode
  nameAr: employer.nameAr,          // Keep as-is
  nameEn: employer.nameEn,
  active: employer.active
};
```

**Step 2: User Edits and Submits**
```javascript
// Modified form data
const updatedFormData = {
  employerCode: "EMP-001-UPD",
  nameAr: "شركة الواحة المحدودة",
  nameEn: "Al Waha Company Ltd",
  active: true
};
```

**Step 3: Service Layer Normalization**
```javascript
// Normalize before PUT
const normalizedPayload = {
  code: "EMP-001-UPD",              // employerCode → code
  name: "شركة الواحة المحدودة",      // nameAr → name
  nameEn: "Al Waha Company Ltd",
  active: true
};

// PUT /api/employers/1
```

**Step 4: Backend Update**
```java
// Find existing entity
Employer existing = repository.findById(1);

// Update fields from DTO
existing.setCode("EMP-001-UPD");
existing.setNameAr("شركة الواحة المحدودة");
existing.setNameEn("Al Waha Company Ltd");
existing.setActive(true);

// Save (updatedAt auto-updated)
repository.save(existing);
```

---

## 🎯 Contract Compliance Checklist

### Backend Compliance

- [ ] EmployerCreateDto has fields: `code`, `name`, `nameEn`, `active`
- [ ] EmployerUpdateDto has fields: `code`, `name`, `nameEn`, `active`
- [ ] EmployerResponseDto has fields: `id`, `code`, `nameAr`, `nameEn`, `active`, timestamps
- [ ] EmployerSelectorDto has fields: `id`, `code`, `nameAr`, `active`
- [ ] Validation annotations present: @NotBlank on `code` and `name`
- [ ] @JsonAlias supports backward compatibility: `employerCode`, `nameAr`
- [ ] Unique constraint on `code` field
- [ ] Default value for `active` is `true`
- [ ] Mapper correctly transforms: `name` ↔ `nameAr`

### Frontend Compliance

- [ ] Form state uses: `employerCode`, `nameAr`, `nameEn`, `active`
- [ ] Service normalizer transforms field names before API calls
- [ ] Response mapper transforms backend field names to frontend names
- [ ] Validation messages match backend error messages
- [ ] Form handles both create and update scenarios
- [ ] Selector/dropdown uses `nameAr` for display

### Service Layer Compliance

- [ ] Normalizer function exists for create/update operations
- [ ] Field transformations: `employerCode` → `code`, `nameAr` → `name`
- [ ] Response denormalizer for GET operations (if needed)
- [ ] Error handling for 400/404/409/500 status codes
- [ ] Unwrapper handles ApiResponse envelope correctly

---

## 📌 Migration Notes (Informational Only)

### Current State Assessment

**Mismatches Identified:**
1. Frontend sends `employerCode`, Backend expects `code`
2. Frontend sends `nameAr`, Backend expects `name`
3. `active` field missing in EmployerCreateDto (exists in UpdateDto)
4. No @JsonAlias for backward compatibility

**Impact:**
- 400 Bad Request errors on create/update operations
- Field values not reaching backend (silently ignored)
- Frontend validation passes, backend validation fails

### Required Changes (Future Phases)

**Phase 2 - Backend Implementation:**
- Add `active` field to EmployerCreateDto
- Add @JsonAlias annotations for `employerCode` and `nameAr`
- Ensure Mapper handles `name` → `nameAr` transformation
- Add unit tests for DTO validation

**Phase 3 - Service Layer Normalization:**
- Implement `normalizeEmployerPayload` function
- Add transformation logic for field name mapping
- Implement error response standardization

**Phase 4 - Frontend Refactoring:**
- Optionally rename frontend fields to match backend (breaking change)
- Or keep frontend names and rely on service normalization (recommended)
- Update documentation and comments

---

## 🔗 Related Contracts

### Organization Entity Transition

**Note:** Employer entity is deprecated in favor of Organization with `type=EMPLOYER`

**Migration Path (Informational):**
- Employer table remains for backward compatibility (READ ONLY)
- New employers should be created in Organization table
- Existing code continues to work with Employer entity
- Future: Employer API will proxy to Organization

**Organization Fields (Reference):**
- `organizationType`: EMPLOYER
- `code`: Employer code
- `nameAr`: Arabic name
- `nameEn`: English name
- `active`: Status flag

---

## 📚 References

### Code Files (Reference Only)

**Frontend:**
- `/frontend/src/pages/employers/EmployerCreate.jsx`
- `/frontend/src/pages/employers/EmployerEdit.jsx`
- `/frontend/src/services/api/employers.service.js`

**Backend:**
- `/backend/src/main/java/com/waad/tba/modules/employer/controller/EmployerController.java`
- `/backend/src/main/java/com/waad/tba/modules/employer/dto/EmployerCreateDto.java`
- `/backend/src/main/java/com/waad/tba/modules/employer/dto/EmployerUpdateDto.java`
- `/backend/src/main/java/com/waad/tba/modules/employer/dto/EmployerResponseDto.java`
- `/backend/src/main/java/com/waad/tba/modules/employer/entity/Employer.java`
- `/backend/src/main/java/com/waad/tba/modules/employer/mapper/EmployerMapper.java`

### Related Documentation

- `FRONTEND-BACKEND-ALIGNMENT-AUDIT-REPORT.md` - Comprehensive audit findings
- `API-CONTRACT.md` - Global API standards (if exists)
- `SECURITY-MODEL-REFACTORING.md` - Authorization patterns

---

## ✅ Contract Approval

**Status:** ✅ Ready for Review

**Approval Workflow:**
1. Technical Lead Review
2. Backend Team Approval
3. Frontend Team Approval
4. QA Team Acknowledgment

**Once approved, this contract becomes the binding specification for all Employer API implementations.**

---

**Document Version:** 1.0.0  
**Last Updated:** 2024-12-29  
**Next Review:** Before Phase 2 Implementation

