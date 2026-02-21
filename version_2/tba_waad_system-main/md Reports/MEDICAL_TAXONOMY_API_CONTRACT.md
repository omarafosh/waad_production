# 📜 Medical Taxonomy API Contract Definition

**Phase:** 3 - Foundation Module (Reference Data)  
**Status:** ✅ Contract Defined  
**Date:** 2025-12-30  
**Domain:** Medical Taxonomy (Categories & Services)  
**Version:** 1.0.0

---

## 🎯 Purpose

This document defines the **canonical API contract** for the Medical Taxonomy domain. It serves as the **FOUNDATIONAL REFERENCE DATA** layer that must be implemented BEFORE:
- Provider
- ProviderContract
- PreAuthorization
- Claim

**Key Principles:**
- ✅ Pure reference data (NO coverage logic)
- ✅ Policy-agnostic (NO policy awareness)
- ✅ Provider-agnostic (NO provider logic)
- ✅ Network-agnostic (NO network logic)
- ✅ Claim-agnostic (NO claim calculations)

---

## 📐 Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│              Medical Taxonomy (Reference Data)            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  MedicalCategory                MedicalService           │
│  ├── id                         ├── id                    │
│  ├── code (UNIQUE)              ├── code (UNIQUE)         │
│  ├── name                       ├── name                  │
│  ├── parentId (hierarchy)       ├── categoryId (FK)       │
│  └── active                     ├── basePrice (reference) │
│                                 ├── requiresPA            │
│                                 └── active                │
│                                                           │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Used By (Future Modules)    │
        ├───────────────────────────────┤
        │ BenefitPolicyRule.serviceCode │
        │ ProviderContract.rates        │
        │ Claim.serviceCode             │
        │ PreAuthorization.serviceCode  │
        └───────────────────────────────┘
```

---

## 🚫 Architectural Boundaries (CRITICAL)

### ❌ This Module MUST NOT Contain:

```java
// ❌ FORBIDDEN - Coverage Logic
class MedicalService {
    BigDecimal coveragePercentage; // ← WRONG! Belongs to BenefitPolicyRule
    BigDecimal copay;              // ← WRONG! Belongs to BenefitPolicyRule
    BigDecimal deductible;         // ← WRONG! Belongs to BenefitPolicyRule
    BigDecimal maxBenefit;         // ← WRONG! Belongs to BenefitPolicyRule
}

// ❌ FORBIDDEN - Provider/Network Logic
class MedicalService {
    Long providerId;               // ← WRONG! Provider references Service, not vice versa
    Long networkId;                // ← WRONG! Network-agnostic reference data
    boolean inNetwork;             // ← WRONG! Network status is runtime calculation
    BigDecimal contractedRate;     // ← WRONG! Belongs to ProviderContract
}

// ❌ FORBIDDEN - Claim/PA Logic
class MedicalService {
    BigDecimal allowedAmount;      // ← WRONG! Calculated at claim time
    BigDecimal approvedAmount;     // ← WRONG! Belongs to PreAuthorization/Claim
    String claimStatus;            // ← WRONG! Belongs to Claim
}
```

### ✅ What This Module SHOULD Contain:

```java
// ✅ CORRECT - Pure Reference Data
class MedicalCategory {
    Long id;
    String code;              // ✅ Immutable unique identifier (e.g., "CONSULTATION")
    String name;              // ✅ Human-readable name
    Long parentId;            // ✅ Supports hierarchy (optional)
    boolean active;           // ✅ Soft delete flag
}

class MedicalService {
    Long id;
    String code;              // ✅ Immutable unique identifier (e.g., "SRV-001")
    String name;              // ✅ Human-readable name
    Long categoryId;          // ✅ Links to category
    BigDecimal basePrice;     // ✅ Reference price ONLY (not for final calculation)
    boolean requiresPA;       // ✅ Indicates if pre-authorization needed
    boolean active;           // ✅ Soft delete flag
}
```

**basePrice Purpose:**
- Reference/baseline price for service
- NOT used for final claim calculation
- Actual amount = ProviderContract.contractedRate OR calculated at claim time
- Used for: estimation, reporting, out-of-network fallback

---

## 📋 MedicalCategory - Field Registry

### Core Fields

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Immutable | Owner |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-----------|-------|
| **Category Code** | `categoryCode` | `code` | `code` | `code` | String(50) | ✔ Yes | ✔ Yes | System |
| **Name (Arabic)** | `nameAr` | `name` | `name` | `name` | String(200) | ✔ Yes | ❌ No | User |
| **Name (English)** | `nameEn` | `nameEn` | `nameEn` | `name_en` | String(200) | ❌ No | ❌ No | User |
| **Parent Category** | `parentCategoryId` | `parentId` | `parentId` | `parent_id` | Long | ❌ No | ❌ No | User |
| **Active Status** | `active` | `active` | `active` | `active` | Boolean | ❌ No | ❌ No | User |

### Audit Fields (System-Managed)

| Field Name | Entity Property | Database Column | Type | Required | Immutable | Owner |
|------------|-----------------|-----------------|------|----------|-----------|-------|
| **ID** | `id` | `id` | Long | ✔ Auto | ✔ Yes | System |
| **Created At** | `createdAt` | `created_at` | LocalDateTime | ✔ Auto | ✔ Yes | System |
| **Updated At** | `updatedAt` | `updated_at` | LocalDateTime | ✔ Auto | ❌ No | System |

### Hierarchy Notes

- `parentId = null` → Root category (e.g., "MEDICAL", "DENTAL", "VISION")
- `parentId != null` → Subcategory (e.g., "MEDICAL" → "CONSULTATION", "SURGERY")
- Supports unlimited levels (recursive hierarchy)

---

## 📋 MedicalService - Field Registry

### Core Fields

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Immutable | Owner |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-----------|-------|
| **Service Code** | `serviceCode` | `code` | `code` | `code` | String(50) | ✔ Yes | ✔ Yes | System |
| **Name (Arabic)** | `nameAr` | `name` | `name` | `name` | String(200) | ✔ Yes | ❌ No | User |
| **Name (English)** | `nameEn` | `nameEn` | `nameEn` | `name_en` | String(200) | ❌ No | ❌ No | User |
| **Category ID** | `categoryId` | `categoryId` | `categoryId` | `category_id` | Long | ✔ Yes | ❌ No | User |
| **Base Price** | `basePrice` | `basePrice` | `basePrice` | `base_price` | BigDecimal | ❌ No | ❌ No | User |
| **Requires PA** | `requiresPA` | `requiresPA` | `requiresPA` | `requires_pa` | Boolean | ❌ No | ❌ No | User |
| **Active Status** | `active` | `active` | `active` | `active` | Boolean | ❌ No | ❌ No | User |

### Audit Fields (System-Managed)

| Field Name | Entity Property | Database Column | Type | Required | Immutable | Owner |
|------------|-----------------|-----------------|------|----------|-----------|-------|
| **ID** | `id` | `id` | Long | ✔ Auto | ✔ Yes | System |
| **Created At** | `createdAt` | `created_at` | LocalDateTime | ✔ Auto | ✔ Yes | System |
| **Updated At** | `updatedAt` | `updated_at` | LocalDateTime | ✔ Auto | ❌ No | System |

---

## 🔄 Field Name Mapping Rules

### MedicalCategory Mapping

| Frontend Field | Transform Rule | Backend Field | Entity Field | Database Column |
|----------------|----------------|---------------|--------------|-----------------|
| `categoryCode` | Remove prefix | `code` | `code` | `code` |
| `nameAr` | Map to canonical | `name` | `name` | `name` |
| `nameEn` | Keep as-is | `nameEn` | `nameEn` | `name_en` |
| `parentCategoryId` | Simplify | `parentId` | `parentId` | `parent_id` |
| `active` | Keep as-is | `active` | `active` | `active` |

### MedicalService Mapping

| Frontend Field | Transform Rule | Backend Field | Entity Field | Database Column |
|----------------|----------------|---------------|--------------|-----------------|
| `serviceCode` | Remove prefix | `code` | `code` | `code` |
| `nameAr` | Map to canonical | `name` | `name` | `name` |
| `nameEn` | Keep as-is | `nameEn` | `nameEn` | `name_en` |
| `categoryId` | Keep as-is | `categoryId` | `categoryId` | `category_id` |
| `basePrice` | Keep as-is | `basePrice` | `basePrice` | `base_price` |
| `requiresPA` | Keep as-is | `requiresPA` | `requiresPA` | `requires_pa` |
| `active` | Keep as-is | `active` | `active` | `active` |

---

## 🔌 API Endpoints

### MedicalCategory Endpoints

| # | Endpoint | Method | Description | Auth Required |
|---|----------|--------|-------------|---------------|
| 1 | `/api/medical-categories` | POST | Create category | ✔ Yes |
| 2 | `/api/medical-categories/{id}` | GET | Get by ID | ✔ Yes |
| 3 | `/api/medical-categories` | GET | List all (with filters) | ✔ Yes |
| 4 | `/api/medical-categories/{id}` | PUT | Update category | ✔ Yes |
| 5 | `/api/medical-categories/{id}` | DELETE | Soft delete | ✔ Yes |
| 6 | `/api/medical-categories/code/{code}` | GET | Get by code | ✔ Yes |
| 7 | `/api/medical-categories/{id}/children` | GET | Get subcategories | ✔ Yes |
| 8 | `/api/medical-categories/tree` | GET | Get hierarchy tree | ✔ Yes |
| 9 | `/api/medical-categories/root` | GET | Get root categories | ✔ Yes |

### MedicalService Endpoints

| # | Endpoint | Method | Description | Auth Required |
|---|----------|--------|-------------|---------------|
| 1 | `/api/medical-services` | POST | Create service | ✔ Yes |
| 2 | `/api/medical-services/{id}` | GET | Get by ID | ✔ Yes |
| 3 | `/api/medical-services` | GET | List all (with filters) | ✔ Yes |
| 4 | `/api/medical-services/{id}` | PUT | Update service | ✔ Yes |
| 5 | `/api/medical-services/{id}` | DELETE | Soft delete | ✔ Yes |
| 6 | `/api/medical-services/code/{code}` | GET | Get by code | ✔ Yes |
| 7 | `/api/medical-services/category/{categoryId}` | GET | Get by category | ✔ Yes |
| 8 | `/api/medical-services/requires-pa` | GET | Get services requiring PA | ✔ Yes |
| 9 | `/api/medical-services/search` | GET | Advanced search | ✔ Yes |

**Total Endpoints:** 18

---

## 📝 Request/Response Examples

### 1. Create MedicalCategory

**POST** `/api/medical-categories`

**Request Body:**
```json
{
  "code": "CONSULTATION",
  "name": "استشارة طبية",
  "nameEn": "Medical Consultation",
  "parentId": null,
  "active": true
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "code": "CONSULTATION",
  "name": "استشارة طبية",
  "nameEn": "Medical Consultation",
  "parentId": null,
  "active": true,
  "createdAt": "2025-12-30T10:00:00",
  "updatedAt": "2025-12-30T10:00:00"
}
```

---

### 2. Create Subcategory

**POST** `/api/medical-categories`

**Request Body:**
```json
{
  "code": "CARDIOLOGY_CONSULT",
  "name": "استشارة قلب",
  "nameEn": "Cardiology Consultation",
  "parentId": 1,
  "active": true
}
```

---

### 3. Create MedicalService

**POST** `/api/medical-services`

**Request Body:**
```json
{
  "code": "SRV-CARDIO-001",
  "name": "فحص القلب الشامل",
  "nameEn": "Comprehensive Cardiac Exam",
  "categoryId": 2,
  "basePrice": 500.00,
  "requiresPA": true,
  "active": true
}
```

**Response (201 Created):**
```json
{
  "id": 100,
  "code": "SRV-CARDIO-001",
  "name": "فحص القلب الشامل",
  "nameEn": "Comprehensive Cardiac Exam",
  "categoryId": 2,
  "categoryName": "استشارة قلب",
  "basePrice": 500.00,
  "requiresPA": true,
  "active": true,
  "createdAt": "2025-12-30T10:05:00",
  "updatedAt": "2025-12-30T10:05:00"
}
```

---

### 4. Get Category Hierarchy Tree

**GET** `/api/medical-categories/tree`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "code": "MEDICAL",
    "name": "الخدمات الطبية",
    "nameEn": "Medical Services",
    "parentId": null,
    "children": [
      {
        "id": 2,
        "code": "CONSULTATION",
        "name": "استشارة",
        "nameEn": "Consultation",
        "parentId": 1,
        "children": [
          {
            "id": 3,
            "code": "CARDIOLOGY_CONSULT",
            "name": "استشارة قلب",
            "nameEn": "Cardiology Consultation",
            "parentId": 2,
            "children": []
          }
        ]
      },
      {
        "id": 4,
        "code": "SURGERY",
        "name": "جراحة",
        "nameEn": "Surgery",
        "parentId": 1,
        "children": []
      }
    ]
  },
  {
    "id": 10,
    "code": "DENTAL",
    "name": "خدمات الأسنان",
    "nameEn": "Dental Services",
    "parentId": null,
    "children": []
  }
]
```

---

### 5. Get Services by Category

**GET** `/api/medical-services/category/2`

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 100,
      "code": "SRV-CARDIO-001",
      "name": "فحص القلب الشامل",
      "nameEn": "Comprehensive Cardiac Exam",
      "categoryId": 2,
      "categoryName": "استشارة قلب",
      "basePrice": 500.00,
      "requiresPA": true,
      "active": true
    },
    {
      "id": 101,
      "code": "SRV-CARDIO-002",
      "name": "تخطيط القلب",
      "nameEn": "ECG",
      "categoryId": 2,
      "categoryName": "استشارة قلب",
      "basePrice": 150.00,
      "requiresPA": false,
      "active": true
    }
  ],
  "totalElements": 2,
  "totalPages": 1,
  "size": 20,
  "number": 0
}
```

---

### 6. Search Services

**GET** `/api/medical-services/search?name=قلب&requiresPA=true&minPrice=100&maxPrice=1000`

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 100,
      "code": "SRV-CARDIO-001",
      "name": "فحص القلب الشامل",
      "categoryName": "استشارة قلب",
      "basePrice": 500.00,
      "requiresPA": true,
      "active": true
    }
  ],
  "totalElements": 1
}
```

---

## ✅ Validation Rules

### MedicalCategory Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `code` | Required, unique, 1-50 chars, alphanumeric + dash/underscore | "Category code is required and must be unique" |
| `code` | Immutable (cannot change after creation) | "Category code cannot be changed" |
| `name` | Required, 1-200 chars | "Category name is required" |
| `nameEn` | Optional, max 200 chars | - |
| `parentId` | Must reference existing category | "Parent category not found" |
| `parentId` | Cannot create circular hierarchy | "Circular parent reference detected" |
| `active` | Boolean, defaults to true | - |

### MedicalService Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `code` | Required, unique, 1-50 chars, alphanumeric + dash | "Service code is required and must be unique" |
| `code` | Immutable (cannot change after creation) | "Service code cannot be changed" |
| `name` | Required, 1-200 chars | "Service name is required" |
| `nameEn` | Optional, max 200 chars | - |
| `categoryId` | Required, must reference existing active category | "Category not found or inactive" |
| `basePrice` | Optional, >= 0 if provided | "Base price must be positive" |
| `requiresPA` | Boolean, defaults to false | - |
| `active` | Boolean, defaults to true | - |

---

## ❌ Error Scenarios

### MedicalCategory Errors

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Duplicate code | 409 Conflict | `CATEGORY_CODE_EXISTS` | "Category code already exists: {code}" |
| Code immutable | 400 Bad Request | `CATEGORY_CODE_IMMUTABLE` | "Category code cannot be changed" |
| Parent not found | 404 Not Found | `PARENT_CATEGORY_NOT_FOUND` | "Parent category not found: {parentId}" |
| Circular reference | 400 Bad Request | `CIRCULAR_PARENT_REFERENCE` | "Circular parent reference detected" |
| Category not found | 404 Not Found | `CATEGORY_NOT_FOUND` | "Medical category not found: {id}" |
| Category in use | 400 Bad Request | `CATEGORY_IN_USE` | "Cannot delete category with active services" |

### MedicalService Errors

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Duplicate code | 409 Conflict | `SERVICE_CODE_EXISTS` | "Service code already exists: {code}" |
| Code immutable | 400 Bad Request | `SERVICE_CODE_IMMUTABLE` | "Service code cannot be changed" |
| Category not found | 404 Not Found | `CATEGORY_NOT_FOUND` | "Medical category not found: {categoryId}" |
| Category inactive | 400 Bad Request | `CATEGORY_INACTIVE` | "Cannot assign service to inactive category" |
| Invalid base price | 400 Bad Request | `INVALID_BASE_PRICE` | "Base price must be positive" |
| Service not found | 404 Not Found | `SERVICE_NOT_FOUND` | "Medical service not found: {id}" |
| Service in use | 400 Bad Request | `SERVICE_IN_USE` | "Cannot delete service referenced by claims/PA" |

---

## 🔗 Integration Points

### Integration with BenefitPolicyRule (Future)

```java
// BenefitPolicyRule validation enhancement
class BenefitPolicyRule {
    String serviceCode; // Must reference MedicalService.code
    String categoryCode; // Must reference MedicalCategory.code
    
    @PrePersist
    @PreUpdate
    void validate() {
        if (serviceCode != null) {
            medicalServiceRepository.findByCode(serviceCode)
                .orElseThrow(() -> new BusinessRuleException("Invalid service code"));
        }
        if (categoryCode != null) {
            medicalCategoryRepository.findByCode(categoryCode)
                .orElseThrow(() -> new BusinessRuleException("Invalid category code"));
        }
    }
}
```

### Integration with Claim (Future)

```java
// Claim validation
class ClaimService {
    validateClaim(ClaimDto dto) {
        // Validate service code exists
        MedicalService service = medicalServiceRepository.findByCode(dto.getServiceCode())
            .orElseThrow(() -> new BusinessRuleException("Invalid service code"));
        
        // Check if PA required
        if (service.isRequiresPA() && dto.getPreAuthorizationId() == null) {
            throw new BusinessRuleException("Pre-authorization required for this service");
        }
    }
}
```

---

## 🎯 Business Rules

### MedicalCategory Rules

1. **Code Uniqueness:** Category code must be globally unique across all categories
2. **Code Immutability:** Once created, category code cannot be changed
3. **Hierarchy Integrity:** Parent category must exist and be active
4. **No Circular References:** Cannot create circular parent-child relationships
5. **Soft Delete:** Deactivating category sets `active = false` (no physical deletion)
6. **Cascade Deactivation:** When category is deactivated, optionally deactivate all child categories
7. **Delete Protection:** Cannot delete/deactivate category if it has active services

### MedicalService Rules

1. **Code Uniqueness:** Service code must be globally unique across all services
2. **Code Immutability:** Once created, service code cannot be changed
3. **Category Link:** Service must belong to an active category
4. **Base Price:** If provided, must be >= 0
5. **PA Flag:** Indicates if pre-authorization is required (not enforced here)
6. **Soft Delete:** Deactivating service sets `active = false` (no physical deletion)
7. **Delete Protection:** Cannot delete/deactivate service if referenced by claims/PA (future)

---

## 📊 Data Model

### Database Schema

```sql
-- Medical Category Table
CREATE TABLE medical_categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    parent_id BIGINT REFERENCES medical_categories(id),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_no_self_reference CHECK (id != parent_id)
);

CREATE INDEX idx_medical_categories_code ON medical_categories(code);
CREATE INDEX idx_medical_categories_parent_id ON medical_categories(parent_id);
CREATE INDEX idx_medical_categories_active ON medical_categories(active);

-- Medical Service Table
CREATE TABLE medical_services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    category_id BIGINT NOT NULL REFERENCES medical_categories(id),
    base_price DECIMAL(10, 2),
    requires_pa BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_base_price_positive CHECK (base_price IS NULL OR base_price >= 0)
);

CREATE INDEX idx_medical_services_code ON medical_services(code);
CREATE INDEX idx_medical_services_category_id ON medical_services(category_id);
CREATE INDEX idx_medical_services_requires_pa ON medical_services(requires_pa);
CREATE INDEX idx_medical_services_active ON medical_services(active);
```

---

## 🧪 Test Scenarios

### MedicalCategory Tests

1. ✅ Create root category successfully
2. ✅ Create subcategory successfully
3. ✅ Prevent duplicate category codes
4. ✅ Prevent code modification
5. ✅ Prevent circular parent references
6. ✅ Get category hierarchy tree
7. ✅ Get subcategories of category
8. ✅ Soft delete category
9. ✅ Prevent deletion of category with services

### MedicalService Tests

1. ✅ Create service successfully
2. ✅ Prevent duplicate service codes
3. ✅ Prevent code modification
4. ✅ Validate category exists and is active
5. ✅ Validate base price is positive
6. ✅ Get services by category
7. ✅ Get services requiring PA
8. ✅ Search services by name
9. ✅ Soft delete service

---

## 📌 Implementation Notes

### DO's ✅

1. ✅ Keep entities as pure reference data
2. ✅ Use `code` as business key (immutable)
3. ✅ Support hierarchy in MedicalCategory
4. ✅ Validate category exists when creating service
5. ✅ Use soft delete (`active = false`)
6. ✅ Add indexes on `code`, `categoryId`, `active`
7. ✅ Return category name in service responses (for UX)

### DON'Ts ❌

1. ❌ No coverage logic (copay, deductible, limits)
2. ❌ No provider references
3. ❌ No network logic
4. ❌ No claim calculations
5. ❌ No policy awareness
6. ❌ Don't use `basePrice` for claim calculations (it's reference only)
7. ❌ Don't delete physically (use soft delete)

---

## 📋 Implementation Checklist

- [ ] MedicalCategory entity
- [ ] MedicalCategory repository (with hierarchy queries)
- [ ] MedicalCategory service (CRUD + hierarchy logic)
- [ ] MedicalCategory DTOs (Create, Update, Response)
- [ ] MedicalCategory controller (9 endpoints)
- [ ] MedicalService entity
- [ ] MedicalService repository
- [ ] MedicalService service (CRUD + category validation)
- [ ] MedicalService DTOs (Create, Update, Response)
- [ ] MedicalService controller (9 endpoints)
- [ ] Unit tests (services)
- [ ] Integration tests (controllers)
- [ ] Validation tests
- [ ] Build SUCCESS
- [ ] Implementation report

---

## 🔮 Future Extensions (Out of Scope)

- Service bundles (group of services)
- Service modifiers (procedure modifiers)
- ICD-10 code mapping
- CPT code mapping
- Multi-language support beyond Arabic/English
- Service versioning

---

**Contract Status:** ✅ READY FOR IMPLEMENTATION  
**Next Step:** Backend implementation (entities, services, controllers, tests)  
**Blocking:** None (foundational module)

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-12-30  
**Author:** GitHub Copilot
