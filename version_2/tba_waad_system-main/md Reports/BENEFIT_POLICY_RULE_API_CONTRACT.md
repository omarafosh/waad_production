# BENEFIT POLICY RULE API CONTRACT

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** IMPLEMENTED  
**Module:** `com.waad.tba.modules.benefitpolicy`  
**Parent Contract:** [BENEFIT_POLICY_API_CONTRACT.md](BENEFIT_POLICY_API_CONTRACT.md)

---

## 📋 TABLE OF CONTENTS

1. [Purpose & Scope](#purpose--scope)
2. [Architecture & Business Rules](#architecture--business-rules)
3. [Field Registry](#field-registry)
4. [Field Mapping](#field-mapping)
5. [API Endpoints](#api-endpoints)
6. [DTOs Specification](#dtos-specification)
7. [Validation Rules](#validation-rules)
8. [Error Handling](#error-handling)
9. [Coverage Resolution Logic](#coverage-resolution-logic)
10. [Integration Points](#integration-points)

---

## 📝 PURPOSE & SCOPE

### Overview
**Benefit Policy Rules** define specific coverage terms for medical services or categories within a Benefit Policy. Each rule specifies:
- **Coverage target**: Either a Medical Service (e.g., "X-Ray Chest") OR a Medical Category (e.g., "All Lab Tests")
- **Coverage percentage**: 0-100% (how much is covered by insurance)
- **Limits**: Amount limits, usage times limits
- **Waiting periods**: Days before coverage becomes effective
- **Pre-approval requirements**: Whether service requires prior authorization

### Key Principles
1. **XOR Constraint**: Each rule targets EITHER a category OR a service, NOT both
2. **Service Priority**: Service-specific rules override category-level rules
3. **Default Inheritance**: Rules inherit `defaultCoveragePercent` from parent policy if not specified
4. **No Coverage by Default**: If no rule exists for a service, it is NOT covered (0%)
5. **One Rule Per Target**: No duplicate rules (same category or service) within one policy

### Business Context
Rules enable fine-grained control over medical coverage. For example:
- **Category Rule**: "All Lab Tests covered at 80%" (applies to entire category)
- **Service Override**: "COVID-19 PCR Test covered at 100%" (overrides category rule for specific service)
- **Exclusion**: "Cosmetic Surgery" has no rule → NOT covered (0%)

---

## 🏗️ ARCHITECTURE & BUSINESS RULES

### Entity Relationships
```
BenefitPolicy 1──────▶ * BenefitPolicyRule
BenefitPolicyRule *──────▶ 1 MedicalCategory (optional)
BenefitPolicyRule *──────▶ 1 MedicalService (optional)
```

### Core Business Rules

#### 1. XOR Constraint (Category OR Service)
- **Rule**: A rule must target EITHER `medicalCategoryId` OR `medicalServiceId`, NOT both and NOT neither
- **Validation**: 
  ```java
  if ((categoryId == null && serviceId == null) || (categoryId != null && serviceId != null)) {
      throw new ValidationException("Rule must target EITHER category OR service, not both/neither");
  }
  ```
- **Database Enforcement**: Unique constraints prevent duplicates:
  - `uk_bpr_policy_category` on `(benefit_policy_id, medical_category_id)`
  - `uk_bpr_policy_service` on `(benefit_policy_id, medical_service_id)`

#### 2. Coverage Priority (Service > Category)
```
Service-Specific Rule (highest priority)
    ↓
Category-Level Rule (if no service rule)
    ↓
No Coverage (0%) (if no rule exists)
```

**Example:**
- Policy has category rule: "Lab Tests → 80% coverage"
- Policy has service rule: "COVID-19 PCR → 100% coverage"
- Request for "COVID-19 PCR" → 100% (service rule wins)
- Request for "Blood Test" → 80% (category rule applies)
- Request for "MRI Scan" → 0% (no rule exists)

#### 3. Coverage Percentage Inheritance
```java
// If rule.coveragePercent is null, inherit from parent policy
int effectiveCoverage = rule.getCoveragePercent() != null 
    ? rule.getCoveragePercent() 
    : rule.getBenefitPolicy().getDefaultCoveragePercent();
```

**Use Case:** Set default to 80%, then create rules with:
- `null` → inherits 80%
- `100` → overrides to 100% (full coverage)
- `0` → overrides to 0% (excluded)

#### 4. No Duplicate Rules
- **Rule**: A policy cannot have two rules targeting the same category or service
- **Example (INVALID)**:
  ```json
  // Rule 1
  { "medicalCategoryId": 5, "coveragePercent": 80 }
  
  // Rule 2 (DUPLICATE - will be rejected)
  { "medicalCategoryId": 5, "coveragePercent": 100 }
  ```
- **Error**: `409 CONFLICT - Rule already exists for this category/service`

#### 5. Limit Types

| Limit Type | Description | Example |
|------------|-------------|---------|
| **Amount Limit** | Max cost per service claim (LYD) | 500.00 = max 500 LYD per X-Ray |
| **Times Limit** | Max usage per year | 12 = max 12 physiotherapy sessions |
| **Waiting Period** | Days before coverage starts | 90 = coverage starts 90 days after enrollment |

**Hierarchy:**
- Rule-level limits are MORE restrictive than policy-level limits
- Policy has `annualLimit` = 10,000 LYD
- Rule has `amountLimit` = 500 LYD per service
- Both limits apply (service limit AND annual limit)

#### 6. Pre-Approval Flag
- **True**: Service requires prior authorization before claim submission
- **False**: No pre-approval needed (default)
- **Use Case**: Surgeries, expensive procedures, specialized treatments

---

## 📊 FIELD REGISTRY

### Entity: `BenefitPolicyRule`
**Table**: `benefit_policy_rules`

| Field Name | Type | Required | Max Length | Default | Database Column | Description |
|------------|------|----------|------------|---------|-----------------|-------------|
| `id` | Long | Auto | - | - | `id` | Primary key (auto-generated) |
| `benefitPolicyId` | Long | ✅ Yes | - | - | `benefit_policy_id` | Foreign key to BenefitPolicy |
| `medicalCategoryId` | Long | Conditional* | - | null | `medical_category_id` | Foreign key to MedicalCategory (XOR with service) |
| `medicalServiceId` | Long | Conditional* | - | null | `medical_service_id` | Foreign key to MedicalService (XOR with category) |
| `coveragePercent` | Integer | No | - | null | `coverage_percent` | Coverage % (0-100), inherits from policy if null |
| `amountLimit` | BigDecimal | No | 15,2 | null | `amount_limit` | Max amount per claim (LYD) |
| `timesLimit` | Integer | No | - | null | `times_limit` | Max usage times per year |
| `waitingPeriodDays` | Integer | No | - | 0 | `waiting_period_days` | Days before coverage starts (0 = no waiting) |
| `requiresPreApproval` | Boolean | ✅ Yes | - | false | `requires_pre_approval` | Whether pre-authorization is needed |
| `notes` | String | No | 500 | null | `notes` | Internal notes |
| `active` | Boolean | ✅ Yes | - | true | `active` | Soft-delete flag |
| `createdAt` | Timestamp | Auto | - | now() | `created_at` | Record creation timestamp |
| `updatedAt` | Timestamp | Auto | - | now() | `updated_at` | Last update timestamp |

**\*Conditional:** Exactly ONE of `medicalCategoryId` OR `medicalServiceId` must be set (XOR constraint)

### Computed Fields (Response Only)

| Field Name | Type | Description | Calculation Logic |
|------------|------|-------------|-------------------|
| `ruleType` | String | "CATEGORY" or "SERVICE" | `medicalCategoryId != null ? "CATEGORY" : "SERVICE"` |
| `effectiveCoveragePercent` | Integer | Resolved coverage % | `coveragePercent ?? benefitPolicy.defaultCoveragePercent ?? 80` |
| `label` | String | Display name for UI | Category name OR Service name (localized) |
| `benefitPolicyName` | String | Parent policy name | Joined from BenefitPolicy.name |
| `medicalCategoryCode` | String | Category code (if category rule) | Joined from MedicalCategory.code |
| `medicalCategoryNameAr` | String | Category name (Arabic) | Joined from MedicalCategory.nameAr |
| `medicalCategoryNameEn` | String | Category name (English) | Joined from MedicalCategory.nameEn |
| `medicalServiceCode` | String | Service code (if service rule) | Joined from MedicalService.code |
| `medicalServiceNameAr` | String | Service name (Arabic) | Joined from MedicalService.nameAr |
| `medicalServiceNameEn` | String | Service name (English) | Joined from MedicalService.nameEn |

---

## 🔄 FIELD MAPPING

### Create DTO → Entity
```java
BenefitPolicyRuleCreateDto → BenefitPolicyRule

medicalCategoryId       → medicalCategory.id (XOR with service)
medicalServiceId        → medicalService.id (XOR with category)
coveragePercent         → coveragePercent (nullable, inherits if null)
amountLimit             → amountLimit (nullable)
timesLimit              → timesLimit (nullable)
waitingPeriodDays       → waitingPeriodDays (default 0)
requiresPreApproval     → requiresPreApproval (default false)
notes                   → notes
active                  → active (default true)

// Injected by service layer:
benefitPolicyId         → benefitPolicy.id (from path parameter)
```

### Update DTO → Entity
```java
BenefitPolicyRuleUpdateDto → BenefitPolicyRule

// All fields optional (partial update)
coveragePercent         → coveragePercent (if provided)
amountLimit             → amountLimit (if provided)
timesLimit              → timesLimit (if provided)
waitingPeriodDays       → waitingPeriodDays (if provided)
requiresPreApproval     → requiresPreApproval (if provided)
notes                   → notes (if provided)
active                  → active (if provided)

// Immutable fields (cannot be changed via update):
medicalCategoryId       ❌ IMMUTABLE (set at creation only)
medicalServiceId        ❌ IMMUTABLE (set at creation only)
benefitPolicyId         ❌ IMMUTABLE (set at creation only)
```

**Rationale:** Changing the target (category/service) would effectively create a new rule, so updates are not allowed for these fields.

### Entity → Response DTO
```java
BenefitPolicyRule → BenefitPolicyRuleResponseDto

id                      → id
benefitPolicyId         → benefitPolicy.id
benefitPolicyName       → benefitPolicy.name
ruleType                → isCategoryRule() ? "CATEGORY" : "SERVICE"
medicalCategoryId       → medicalCategory.id (if category rule)
medicalCategoryCode     → medicalCategory.code
medicalCategoryNameAr   → medicalCategory.nameAr
medicalCategoryNameEn   → medicalCategory.nameEn
medicalServiceId        → medicalService.id (if service rule)
medicalServiceCode      → medicalService.code
medicalServiceNameAr    → medicalService.nameAr
medicalServiceNameEn    → medicalService.nameEn
coveragePercent         → coveragePercent (raw value, nullable)
effectiveCoveragePercent → getEffectiveCoveragePercent() (resolved)
amountLimit             → amountLimit
timesLimit              → timesLimit
waitingPeriodDays       → waitingPeriodDays
requiresPreApproval     → requiresPreApproval
label                   → getLabel() (category/service name)
notes                   → notes
active                  → active
createdAt               → createdAt
updatedAt               → updatedAt
```

---

## 🌐 API ENDPOINTS

### Base Path: `/api/benefit-policies/{policyId}/rules`

**Note:** All rule endpoints are nested under a specific policy. You must provide `policyId` in the path.

---

### 1. CREATE - Create New Rule
**Endpoint:** `POST /api/benefit-policies/{policyId}/rules`  
**Permission:** `benefit_policies.update` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Request Body:** `BenefitPolicyRuleCreateDto`  
**Response:** `ApiResponse<BenefitPolicyRuleResponseDto>`  
**Status:** `201 Created`

**Request Example (Category Rule):**
```json
{
  "medicalCategoryId": 5,
  "medicalServiceId": null,
  "coveragePercent": 80,
  "amountLimit": null,
  "timesLimit": null,
  "waitingPeriodDays": 0,
  "requiresPreApproval": false,
  "notes": "All lab tests covered at 80%",
  "active": true
}
```

**Request Example (Service Rule with Pre-Approval):**
```json
{
  "medicalCategoryId": null,
  "medicalServiceId": 123,
  "coveragePercent": 100,
  "amountLimit": 5000.00,
  "timesLimit": 1,
  "waitingPeriodDays": 90,
  "requiresPreApproval": true,
  "notes": "Surgery requires pre-approval",
  "active": true
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Rule created successfully",
  "data": {
    "id": 456,
    "benefitPolicyId": 123,
    "benefitPolicyName": "Gold Medical Plan 2025",
    "ruleType": "SERVICE",
    "medicalCategoryId": null,
    "medicalServiceId": 123,
    "medicalServiceCode": "SRG-001",
    "medicalServiceNameAr": "جراحة العمود الفقري",
    "medicalServiceNameEn": "Spine Surgery",
    "coveragePercent": 100,
    "effectiveCoveragePercent": 100,
    "amountLimit": 5000.00,
    "timesLimit": 1,
    "waitingPeriodDays": 90,
    "requiresPreApproval": true,
    "label": "Spine Surgery",
    "notes": "Surgery requires pre-approval",
    "active": true,
    "createdAt": "2025-01-15T10:30:00",
    "updatedAt": "2025-01-15T10:30:00"
  }
}
```

**Validation:**
- XOR: Exactly ONE of `medicalCategoryId` or `medicalServiceId` must be set
- No duplicates: Same category/service cannot have another rule in this policy
- `coveragePercent` must be 0-100 (if provided)
- `amountLimit` must be >= 0
- `timesLimit` must be >= 0
- `waitingPeriodDays` must be >= 0

---

### 2. CREATE - Bulk Create Rules
**Endpoint:** `POST /api/benefit-policies/{policyId}/rules/bulk`  
**Permission:** `benefit_policies.update` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Request Body:** `List<BenefitPolicyRuleCreateDto>`  
**Response:** `ApiResponse<List<BenefitPolicyRuleResponseDto>>`  
**Status:** `201 Created`

**Request Example:**
```json
[
  {
    "medicalCategoryId": 1,
    "coveragePercent": 80,
    "notes": "All consultations"
  },
  {
    "medicalCategoryId": 2,
    "coveragePercent": 90,
    "notes": "All lab tests"
  },
  {
    "medicalServiceId": 50,
    "coveragePercent": 100,
    "requiresPreApproval": true,
    "notes": "MRI requires pre-approval"
  }
]
```

**Behavior:**
- Creates all rules in a single transaction
- If ANY rule fails validation, entire batch is rolled back
- Returns all created rules in response

---

### 3. READ - List All Rules for Policy
**Endpoint:** `GET /api/benefit-policies/{policyId}/rules`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Response:** `ApiResponse<List<BenefitPolicyRuleResponseDto>>`  
**Status:** `200 OK`

**Example:** `GET /api/benefit-policies/123/rules`

**Returns:** All rules (active and inactive) for the policy

---

### 4. READ - List Rules (Paginated)
**Endpoint:** `GET /api/benefit-policies/{policyId}/rules/paged`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Query Parameters:**
- `page` (int, default=0)
- `size` (int, default=20)

**Response:** `ApiResponse<Page<BenefitPolicyRuleResponseDto>>`  
**Status:** `200 OK`

---

### 5. READ - List Only Active Rules
**Endpoint:** `GET /api/benefit-policies/{policyId}/rules/active`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Response:** `ApiResponse<List<BenefitPolicyRuleResponseDto>>`  
**Status:** `200 OK`

**Returns:** Only rules with `active = true`

---

### 6. READ - Get Rule by ID
**Endpoint:** `GET /api/benefit-policies/{policyId}/rules/{ruleId}`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameters:**
- `policyId` (Long)
- `ruleId` (Long)

**Response:** `ApiResponse<BenefitPolicyRuleResponseDto>`  
**Status:** `200 OK`

**Error Cases:**
- `404 NOT_FOUND` - Rule does not exist
- `400 BAD_REQUEST` - Rule exists but belongs to different policy

---

### 7. READ - List Category Rules
**Endpoint:** `GET /api/benefit-policies/{policyId}/rules/category`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Response:** `ApiResponse<List<BenefitPolicyRuleResponseDto>>`  
**Status:** `200 OK`

**Returns:** Only rules where `medicalCategoryId != null`

---

### 8. READ - List Service Rules
**Endpoint:** `GET /api/benefit-policies/{policyId}/rules/service`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Response:** `ApiResponse<List<BenefitPolicyRuleResponseDto>>`  
**Status:** `200 OK`

**Returns:** Only rules where `medicalServiceId != null`

---

### 9. READ - List Pre-Approval Rules
**Endpoint:** `GET /api/benefit-policies/{policyId}/rules/pre-approval`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `policyId` (Long)  
**Response:** `ApiResponse<List<BenefitPolicyRuleResponseDto>>`  
**Status:** `200 OK`

**Returns:** Only rules where `requiresPreApproval = true`

---

### 10. COVERAGE LOOKUP - Get Coverage for Service
**Endpoint:** `GET /api/benefit-policies/{policyId}/coverage/service/{serviceId}`  
**Permission:** `benefit_policies.view`, `claims.create`, or `SUPER_ADMIN`  
**Path Parameters:**
- `policyId` (Long)
- `serviceId` (Long)

**Response:** `ApiResponse<BenefitPolicyRuleResponseDto>`  
**Status:** `200 OK`

**Logic:**
1. Check for service-specific rule → return if found
2. Else, check category of service → return category rule if found
3. Else, return `null` (service not covered)

**Response (Covered):**
```json
{
  "success": true,
  "message": "Coverage found",
  "data": {
    "id": 456,
    "ruleType": "SERVICE",
    "effectiveCoveragePercent": 100,
    "requiresPreApproval": true,
    // ... full rule details
  }
}
```

**Response (Not Covered):**
```json
{
  "success": true,
  "message": "Service not covered under this policy",
  "data": null
}
```

**Use Case:** Claims processing, eligibility checks

---

### 11. COVERAGE LOOKUP - Quick Coverage Check
**Endpoint:** `GET /api/benefit-policies/{policyId}/coverage/service/{serviceId}/check`  
**Permission:** `benefit_policies.view`, `claims.create`, or `SUPER_ADMIN`  
**Path Parameters:**
- `policyId` (Long)
- `serviceId` (Long)

**Response:** `ApiResponse<Map<String, Object>>`  
**Status:** `200 OK`

**Response Example:**
```json
{
  "success": true,
  "message": "Coverage check complete",
  "data": {
    "covered": true,
    "coveragePercent": 80,
    "requiresPreApproval": false
  }
}
```

**Use Case:** Fast lookup for UI (no full rule details needed)

---

### 12. UPDATE - Update Rule
**Endpoint:** `PUT /api/benefit-policies/{policyId}/rules/{ruleId}`  
**Permission:** `benefit_policies.update` or `SUPER_ADMIN`  
**Path Parameters:**
- `policyId` (Long)
- `ruleId` (Long)

**Request Body:** `BenefitPolicyRuleUpdateDto` (all fields optional)  
**Response:** `ApiResponse<BenefitPolicyRuleResponseDto>`  
**Status:** `200 OK`

**Request Example:**
```json
{
  "coveragePercent": 90,
  "amountLimit": 1000.00,
  "requiresPreApproval": true
}
```

**Immutable Fields:**
- `medicalCategoryId` - Cannot change target after creation
- `medicalServiceId` - Cannot change target after creation
- `benefitPolicyId` - Cannot move rule to different policy

**Validation:**
- All limits must be >= 0
- `coveragePercent` must be 0-100
- Cannot set both `medicalCategoryId` and `medicalServiceId` (XOR)

---

### 13. UPDATE - Activate Rule
**Endpoint:** `POST /api/benefit-policies/{policyId}/rules/{ruleId}/activate`  
**Permission:** `benefit_policies.update` or `SUPER_ADMIN`  
**Response:** `ApiResponse<BenefitPolicyRuleResponseDto>`  
**Status:** `200 OK`

**Logic:** Sets `active = true`

---

### 14. UPDATE - Deactivate Rule
**Endpoint:** `POST /api/benefit-policies/{policyId}/rules/{ruleId}/deactivate`  
**Permission:** `benefit_policies.update` or `SUPER_ADMIN`  
**Response:** `ApiResponse<BenefitPolicyRuleResponseDto>`  
**Status:** `200 OK`

**Logic:** Sets `active = false` (soft delete)

---

### 15. DELETE - Soft Delete Rule
**Endpoint:** `DELETE /api/benefit-policies/{policyId}/rules/{ruleId}`  
**Permission:** `benefit_policies.delete` or `SUPER_ADMIN`  
**Response:** `ApiResponse<Void>`  
**Status:** `204 No Content`

**Logic:** Sets `active = false` (same as deactivate)

---

### 16. DELETE - Hard Delete Rule
**Endpoint:** `DELETE /api/benefit-policies/{policyId}/rules/{ruleId}/permanent`  
**Permission:** `SUPER_ADMIN` only  
**Response:** `ApiResponse<Void>`  
**Status:** `204 No Content`

**WARNING:** Permanently removes rule from database (cannot be undone)

---

## 📦 DTOS SPECIFICATION

### 1. BenefitPolicyRuleCreateDto
```java
{
  "medicalCategoryId": "long (conditional, XOR with service)",
  "medicalServiceId": "long (conditional, XOR with category)",
  "coveragePercent": "integer (optional, 0-100, inherits if null)",
  "amountLimit": "decimal (optional, >= 0, precision 15,2)",
  "timesLimit": "integer (optional, >= 0)",
  "waitingPeriodDays": "integer (optional, >= 0, default 0)",
  "requiresPreApproval": "boolean (optional, default false)",
  "notes": "string (optional, max 500)",
  "active": "boolean (optional, default true)"
}
```

**XOR Validation:**
```java
@AssertTrue(message = "Exactly one of medicalCategoryId or medicalServiceId must be set")
public boolean isTargetValid() {
    return (medicalCategoryId != null) ^ (medicalServiceId != null);
}
```

---

### 2. BenefitPolicyRuleUpdateDto
```java
{
  "coveragePercent": "integer (optional, 0-100)",
  "amountLimit": "decimal (optional, >= 0)",
  "timesLimit": "integer (optional, >= 0)",
  "waitingPeriodDays": "integer (optional, >= 0)",
  "requiresPreApproval": "boolean (optional)",
  "notes": "string (optional, max 500)",
  "active": "boolean (optional)"
  
  // IMMUTABLE FIELDS (not allowed in update):
  // - medicalCategoryId
  // - medicalServiceId
  // - benefitPolicyId
}
```

---

### 3. BenefitPolicyRuleResponseDto
```java
{
  "id": "long",
  "benefitPolicyId": "long",
  "benefitPolicyName": "string",
  "ruleType": "CATEGORY | SERVICE",
  
  // Category info (if category rule)
  "medicalCategoryId": "long (nullable)",
  "medicalCategoryCode": "string (nullable)",
  "medicalCategoryNameAr": "string (nullable)",
  "medicalCategoryNameEn": "string (nullable)",
  
  // Service info (if service rule)
  "medicalServiceId": "long (nullable)",
  "medicalServiceCode": "string (nullable)",
  "medicalServiceNameAr": "string (nullable)",
  "medicalServiceNameEn": "string (nullable)",
  
  // Coverage settings
  "coveragePercent": "integer (nullable, raw value)",
  "effectiveCoveragePercent": "integer (computed, never null)",
  "amountLimit": "decimal (nullable)",
  "timesLimit": "integer (nullable)",
  "waitingPeriodDays": "integer",
  "requiresPreApproval": "boolean",
  
  // Display
  "label": "string (category/service name)",
  
  // Metadata
  "notes": "string",
  "active": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## ✅ VALIDATION RULES

### Field-Level Validation

| Field | Validation Rules |
|-------|------------------|
| `medicalCategoryId` | Must exist in MedicalCategory table (if provided) |
| `medicalServiceId` | Must exist in MedicalService table (if provided) |
| `coveragePercent` | Must be 0-100 (if provided) |
| `amountLimit` | Must be >= 0, max precision 15,2 |
| `timesLimit` | Must be >= 0 |
| `waitingPeriodDays` | Must be >= 0 |
| `notes` | Max 500 characters |

### Business Logic Validation

#### 1. XOR Constraint
```java
// Exactly ONE of category or service must be set
if ((medicalCategoryId == null && medicalServiceId == null) 
    || (medicalCategoryId != null && medicalServiceId != null)) {
    throw new ValidationException(
        "Rule must target EITHER medicalCategoryId OR medicalServiceId, not both/neither"
    );
}
```

#### 2. No Duplicates
```java
// Check for existing rule with same target
if (medicalCategoryId != null) {
    boolean exists = ruleRepository.existsByPolicyAndCategory(policyId, medicalCategoryId);
    if (exists) {
        throw new ConflictException("Rule already exists for this category in this policy");
    }
}

if (medicalServiceId != null) {
    boolean exists = ruleRepository.existsByPolicyAndService(policyId, medicalServiceId);
    if (exists) {
        throw new ConflictException("Rule already exists for this service in this policy");
    }
}
```

#### 3. Policy Must Be Active
```java
// Can only add rules to active policies (or drafts)
BenefitPolicy policy = policyRepository.findById(policyId);
if (policy.getStatus() == BenefitPolicyStatus.CANCELLED 
    || policy.getStatus() == BenefitPolicyStatus.EXPIRED) {
    throw new ValidationException("Cannot add rules to cancelled/expired policies");
}
```

---

## ❌ ERROR HANDLING

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "medicalCategoryId",
      "message": "Rule must target EITHER category OR service, not both"
    }
  ],
  "timestamp": "2025-01-15T10:30:00"
}
```

### HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| `200 OK` | Successful GET/PUT | Rule retrieved/updated |
| `201 Created` | Successful POST | Rule created |
| `204 No Content` | Successful DELETE | Rule deleted |
| `400 Bad Request` | Validation error | Both categoryId and serviceId set (XOR violation) |
| `404 Not Found` | Resource not found | Rule ID 999 does not exist |
| `409 Conflict` | Business rule violation | Duplicate rule for same category |
| `500 Internal Server Error` | Unexpected error | Database failure |

### Common Error Messages

#### Validation Errors (400)
```
- "Rule must target EITHER medicalCategoryId OR medicalServiceId, not both/neither"
- "Coverage percent must be between 0 and 100"
- "Amount limit must be >= 0"
- "Times limit must be >= 0"
- "Waiting period must be >= 0"
- "Notes must not exceed 500 characters"
```

#### Business Logic Errors (409)
```
- "Rule already exists for this category in this policy"
- "Rule already exists for this service in this policy"
- "Cannot add rules to cancelled/expired policies"
```

#### Not Found Errors (404)
```
- "Benefit policy rule with ID 456 not found"
- "Medical category with ID 999 not found"
- "Medical service with ID 999 not found"
- "Rule belongs to a different policy"
```

---

## 🔍 COVERAGE RESOLUTION LOGIC

### Priority Algorithm
```java
public BenefitPolicyRule findCoverageForService(Long policyId, Long serviceId) {
    // STEP 1: Check for service-specific rule (highest priority)
    Optional<BenefitPolicyRule> serviceRule = ruleRepository
        .findByPolicyAndService(policyId, serviceId);
    
    if (serviceRule.isPresent() && serviceRule.get().isActive()) {
        return serviceRule.get();
    }
    
    // STEP 2: Check for category rule
    MedicalService service = serviceRepository.findById(serviceId);
    Long categoryId = service.getCategoryId();
    
    Optional<BenefitPolicyRule> categoryRule = ruleRepository
        .findByPolicyAndCategory(policyId, categoryId);
    
    if (categoryRule.isPresent() && categoryRule.get().isActive()) {
        return categoryRule.get();
    }
    
    // STEP 3: No coverage (return null)
    return null;
}
```

### Coverage Percent Resolution
```java
public int getEffectiveCoveragePercent(BenefitPolicyRule rule) {
    // 1. Use rule's coverage if set
    if (rule.getCoveragePercent() != null) {
        return rule.getCoveragePercent();
    }
    
    // 2. Inherit from parent policy's default
    if (rule.getBenefitPolicy() != null 
        && rule.getBenefitPolicy().getDefaultCoveragePercent() != null) {
        return rule.getBenefitPolicy().getDefaultCoveragePercent();
    }
    
    // 3. System default (fallback)
    return 80;
}
```

### Example Scenarios

#### Scenario 1: Service-Specific Override
```
Policy: defaultCoveragePercent = 80
Rules:
  - Category "Lab Tests" → 70%
  - Service "COVID-19 PCR" → 100%

Request for "COVID-19 PCR":
  → Service rule found → 100% ✅

Request for "Blood Test" (same category):
  → No service rule → Category rule found → 70% ✅
```

#### Scenario 2: Inheritance
```
Policy: defaultCoveragePercent = 80
Rules:
  - Category "Lab Tests" → coveragePercent = null

Request for "Blood Test":
  → Category rule found
  → coveragePercent is null → inherit from policy
  → Result: 80% ✅
```

#### Scenario 3: No Coverage
```
Policy: defaultCoveragePercent = 80
Rules:
  - Category "Lab Tests" → 90%

Request for "MRI Scan" (different category):
  → No service rule found
  → No category rule found
  → Result: 0% (NOT COVERED) ❌
```

---

## 🔌 INTEGRATION POINTS

### 1. Claims Processing (BenefitRequest)
**Integration:** Determine coverage for claim submission

```java
// Get coverage for service
BenefitPolicyRule rule = ruleService.findCoverageForService(policyId, serviceId);

if (rule == null) {
    throw new NotCoveredException("Service is not covered under this policy");
}

// Calculate covered amount
int coveragePercent = rule.getEffectiveCoveragePercent();
BigDecimal claimAmount = request.getAmount();
BigDecimal coveredAmount = claimAmount.multiply(BigDecimal.valueOf(coveragePercent / 100.0));
BigDecimal copay = claimAmount.subtract(coveredAmount);

// Check amount limit
if (rule.getAmountLimit() != null && coveredAmount.compareTo(rule.getAmountLimit()) > 0) {
    coveredAmount = rule.getAmountLimit();
    copay = claimAmount.subtract(coveredAmount);
}

// Check pre-approval
if (rule.isRequiresPreApproval() && !claim.hasPreApproval()) {
    throw new PreApprovalRequiredException("This service requires pre-approval");
}

// Check times limit
if (rule.getTimesLimit() != null) {
    int usedTimes = claimRepository.countByMemberAndServiceAndYear(memberId, serviceId, year);
    if (usedTimes >= rule.getTimesLimit()) {
        throw new LimitExceededException("Service usage limit exceeded for this year");
    }
}

// Check waiting period
if (rule.getWaitingPeriodDays() > 0) {
    LocalDate enrollmentDate = member.getEnrollmentDate();
    LocalDate eligibleDate = enrollmentDate.plusDays(rule.getWaitingPeriodDays());
    if (LocalDate.now().isBefore(eligibleDate)) {
        throw new WaitingPeriodException("Service is still in waiting period until " + eligibleDate);
    }
}
```

---

### 2. Member Eligibility Check
**Integration:** Rule existence affects service coverage status

```java
// Check if member has coverage for a specific service
public boolean hasServiceCoverage(Long memberId, Long serviceId) {
    Member member = memberRepository.findById(memberId);
    BenefitPolicy policy = policyService.findEffectiveForEmployer(
        member.getEmployerOrgId(), 
        LocalDate.now()
    );
    
    if (policy == null) return false;
    
    BenefitPolicyRule rule = ruleService.findCoverageForService(policy.getId(), serviceId);
    return rule != null && rule.isActive();
}
```

---

### 3. Policy Activation Validation
**Integration:** Policies should have rules before activation

```java
// Warn if activating policy without rules
public void activatePolicy(Long policyId) {
    BenefitPolicy policy = policyRepository.findById(policyId);
    
    int rulesCount = ruleRepository.countByPolicyAndActive(policyId, true);
    if (rulesCount == 0) {
        log.warn("Activating policy {} with ZERO coverage rules - no services will be covered", 
                 policy.getPolicyCode());
        // Optional: throw exception or send notification
    }
    
    policy.setStatus(BenefitPolicyStatus.ACTIVE);
    policyRepository.save(policy);
}
```

---

### 4. Reporting & Analytics
**Integration:** Rule statistics for policy coverage reports

**Metrics:**
- Total rules per policy
- Coverage distribution (0%, 1-50%, 51-99%, 100%)
- Pre-approval requirements count
- Average waiting period
- Most/least used rules (by claim count)

---

## 📝 NOTES & BEST PRACTICES

### Performance Optimization
```sql
-- Index for coverage lookup (most common query)
CREATE INDEX idx_bpr_service_lookup 
ON benefit_policy_rules(benefit_policy_id, medical_service_id, active)
WHERE active = true;

CREATE INDEX idx_bpr_category_lookup 
ON benefit_policy_rules(benefit_policy_id, medical_category_id, active)
WHERE active = true;
```

### Data Migration Pattern
```java
// Import rules from Excel/CSV
public void importRules(Long policyId, List<RuleImportDto> rules) {
    List<BenefitPolicyRule> entities = new ArrayList<>();
    
    for (RuleImportDto dto : rules) {
        BenefitPolicyRule rule = BenefitPolicyRule.builder()
            .benefitPolicy(policyRepository.getOne(policyId))
            .medicalService(serviceRepository.findByCode(dto.getServiceCode()))
            .coveragePercent(dto.getCoveragePercent())
            .requiresPreApproval(dto.isRequiresPreApproval())
            .build();
        
        entities.add(rule);
    }
    
    ruleRepository.saveAll(entities);
}
```

### Common Coverage Patterns
```java
// Pattern 1: Full coverage for essential services
{
  "medicalServiceId": 1,
  "coveragePercent": 100,
  "requiresPreApproval": false
}

// Pattern 2: Partial coverage with copay
{
  "medicalCategoryId": 5,
  "coveragePercent": 80  // 20% copay
}

// Pattern 3: Expensive service with limits
{
  "medicalServiceId": 50,
  "coveragePercent": 70,
  "amountLimit": 2000.00,
  "timesLimit": 2,
  "requiresPreApproval": true
}

// Pattern 4: Waiting period for new members
{
  "medicalCategoryId": 10,
  "coveragePercent": 100,
  "waitingPeriodDays": 90
}
```

---

## 🔗 RELATED CONTRACTS

- **[BENEFIT_POLICY_API_CONTRACT.md](BENEFIT_POLICY_API_CONTRACT.md)** - Parent policy contract
- **[MEMBER_API_CONTRACT.md](MEMBER_API_CONTRACT.md)** - Member eligibility integration
- **Medical Service Contract** (pending) - Service catalog reference
- **Medical Category Contract** (pending) - Category classification reference

---

**Contract Owner:** Backend Development Team  
**Review Date:** January 2025  
**Next Review:** July 2025
