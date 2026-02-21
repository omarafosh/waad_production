# BENEFIT POLICY API CONTRACT

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** IMPLEMENTED  
**Module:** `com.waad.tba.modules.benefitpolicy`

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
9. [Status Lifecycle](#status-lifecycle)
10. [Integration Points](#integration-points)

---

## 📝 PURPOSE & SCOPE

### Overview
The **Benefit Policy** module manages medical coverage plans for employers. Each policy defines:
- **Coverage limits** (annual, per-member, per-family)
- **Default coverage percentage** (e.g., 80% covered by insurance)
- **Effective date range** (start/end dates)
- **Coverage rules** (defined in BenefitPolicyRule - see separate contract)

### Key Principles
1. **Employer-Centric**: Each employer must have exactly ONE active policy at any given time
2. **No Insurance Company Entity**: Insurance organization is optional, not required
3. **Date-Based Activation**: Policies are effective only within their startDate/endDate range
4. **Rule-Based Coverage**: Specific coverage rules are defined in BenefitPolicyRule entities
5. **Auto-Code Generation**: Policy codes follow format `POL-YYYY-XXX` (e.g., POL-2025-001)

### Business Context
Benefit Policies represent the medical coverage agreements between employers and their employees. They define:
- How much the employer/insurance will cover (percentage)
- Maximum spending limits (annual, per-member, per-family)
- Which services are covered (via BenefitPolicyRule)
- Pre-approval requirements (via BenefitPolicyRule)
- Waiting periods (via BenefitPolicyRule)

---

## 🏗️ ARCHITECTURE & BUSINESS RULES

### Entity Relationships
```
Organization (Employer) 1──────▶ * BenefitPolicy
Organization (Insurance) ?──────▶ * BenefitPolicy (optional)
BenefitPolicy 1──────▶ * BenefitPolicyRule
BenefitPolicy 1──────▶ * Member (indirect via employer)
```

### Core Business Rules

#### 1. One Active Policy Per Employer
- **Rule**: An employer can have multiple policies (e.g., expired, draft), but ONLY ONE with status=ACTIVE at any given date
- **Validation**: System prevents activating a new policy if another active policy exists with overlapping dates
- **Exception**: Expired policies (status=EXPIRED) are excluded from overlap checks
- **Enforcement**: Database index on `(employer_org_id, status)` + service-layer validation

#### 2. Date Range Validation
- **Rule**: `startDate` must be before `endDate`
- **Auto-Expiry**: Policies automatically transition to EXPIRED status when current date > endDate
- **Future Activation**: Policies with status=ACTIVE but startDate in the future are NOT considered effective
- **Formula**: `isEffective = (status == ACTIVE) AND (startDate <= today <= endDate)`

#### 3. Coverage Limits Hierarchy
```
Annual Limit (policy-level, required)
    ├─ Per-Family Limit (optional, must be <= annualLimit)
    └─ Per-Member Limit (optional, must be <= perFamilyLimit or annualLimit)
```
- If `perMemberLimit` is null → defaults to `annualLimit`
- If `perFamilyLimit` is null → defaults to `annualLimit`
- Service-level limits are defined in BenefitPolicyRule (separate contract)

#### 4. Default Coverage Percentage
- **Range**: 0-100 (integer)
- **Default**: 80 (80% covered by insurance, 20% copay by member)
- **Inheritance**: BenefitPolicyRule can override this per service/category
- **Examples**:
  - 100 = Fully covered (no copay)
  - 80 = 80% covered, 20% member pays
  - 0 = Not covered (member pays 100%)

#### 5. Auto-Code Generation
- **Format**: `POL-YYYY-XXX` where:
  - `YYYY` = year of creation (e.g., 2025)
  - `XXX` = zero-padded sequence number (001, 002, ...)
- **Example**: `POL-2025-001`, `POL-2025-002`
- **Uniqueness**: Global uniqueness enforced (not per-employer)
- **Optional**: If `policyCode` is provided in CreateDto, it will be validated for format compliance

#### 6. Status Lifecycle (see dedicated section below)

---

## 📊 FIELD REGISTRY

### Entity: `BenefitPolicy`
**Table**: `benefit_policies`

| Field Name | Type | Required | Max Length | Default | Database Column | Description |
|------------|------|----------|------------|---------|-----------------|-------------|
| `id` | Long | Auto | - | - | `id` | Primary key (auto-generated) |
| `name` | String | ✅ Yes | 255 | - | `name` | Policy display name (e.g., "Gold Plan 2025") |
| `policyCode` | String | No | 50 | Auto-generated | `policy_code` | Unique policy identifier (POL-YYYY-XXX) |
| `description` | String | No | 2000 | null | `description` | Detailed policy description |
| `employerOrgId` | Long | ✅ Yes | - | - | `employer_org_id` | Foreign key to Organization (employer) |
| `insuranceOrgId` | Long | No | - | null | `insurance_org_id` | Foreign key to Organization (insurance, optional) |
| `startDate` | LocalDate | ✅ Yes | - | - | `start_date` | Policy effective start date (inclusive) |
| `endDate` | LocalDate | ✅ Yes | - | - | `end_date` | Policy effective end date (inclusive) |
| `annualLimit` | BigDecimal | ✅ Yes | 15,2 | - | `annual_limit` | Total annual coverage limit (LYD) |
| `defaultCoveragePercent` | Integer | ✅ Yes | - | 80 | `default_coverage_percent` | Default coverage % for services without specific rules (0-100) |
| `perMemberLimit` | BigDecimal | No | 15,2 | null | `per_member_limit` | Max coverage per member per year (LYD) |
| `perFamilyLimit` | BigDecimal | No | 15,2 | null | `per_family_limit` | Max coverage per family per year (LYD) |
| `defaultWaitingPeriodDays` | Integer | No | - | 0 | `default_waiting_period_days` | Default waiting period (days) before coverage starts |
| `status` | Enum | ✅ Yes | - | DRAFT | `status` | Policy status (DRAFT/ACTIVE/EXPIRED/SUSPENDED/CANCELLED) |
| `coveredMembersCount` | Integer | No | - | 0 | `covered_members_count` | Number of members covered by this policy (calculated) |
| `notes` | String | No | 1000 | null | `notes` | Internal notes/remarks |
| `active` | Boolean | ✅ Yes | - | true | `active` | Soft-delete flag (false = deleted) |
| `createdAt` | Timestamp | Auto | - | now() | `created_at` | Record creation timestamp |
| `updatedAt` | Timestamp | Auto | - | now() | `updated_at` | Last update timestamp |

### Computed Fields (Response Only)

| Field Name | Type | Description | Calculation Logic |
|------------|------|-------------|-------------------|
| `employerName` | String | Name of employer organization | Joined from Organization.name |
| `insuranceName` | String | Name of insurance organization | Joined from Organization.name (null if not set) |
| `statusDisplay` | String | Localized status text (Arabic) | Map: DRAFT→"مسودة", ACTIVE→"نشط", EXPIRED→"منتهي", SUSPENDED→"موقوف", CANCELLED→"ملغي" |
| `effective` | Boolean | Is policy currently effective? | `status == ACTIVE AND startDate <= today <= endDate` |
| `rulesCount` | Integer | Total number of coverage rules | Count of BenefitPolicyRule where benefitPolicyId = this.id |
| `activeRulesCount` | Integer | Number of active rules | Count where active = true |

---

## 🔄 FIELD MAPPING

### Create DTO → Entity
```java
BenefitPolicyCreateDto → BenefitPolicy

name                    → name (required)
policyCode              → policyCode (optional, auto-generated if null)
description             → description
employerOrgId           → employerOrganization.id (fetch Organization entity)
insuranceOrgId          → insuranceOrganization.id (nullable)
startDate               → startDate (required)
endDate                 → endDate (required, must be > startDate)
annualLimit             → annualLimit (required, >= 0)
defaultCoveragePercent  → defaultCoveragePercent (0-100, default 80)
perMemberLimit          → perMemberLimit (nullable)
perFamilyLimit          → perFamilyLimit (nullable)
notes                   → notes
status                  → status (defaults to DRAFT if not provided)
```

### Update DTO → Entity
```java
BenefitPolicyUpdateDto → BenefitPolicy

// All fields optional (partial update)
name                    → name (if provided)
policyCode              → policyCode (validated if changed, must remain unique)
description             → description (if provided)
startDate               → startDate (if provided, must be before endDate)
endDate                 → endDate (if provided, must be after startDate)
annualLimit             → annualLimit (if provided)
defaultCoveragePercent  → defaultCoveragePercent (if provided)
perMemberLimit          → perMemberLimit (if provided)
perFamilyLimit          → perFamilyLimit (if provided)
notes                   → notes (if provided)

// Immutable fields (cannot be changed via update):
employerOrgId           ❌ IMMUTABLE (set at creation only)
insuranceOrgId          ❌ IMMUTABLE (set at creation only)
status                  ❌ Use dedicated endpoints (activate/deactivate/suspend/cancel)
```

### Entity → Response DTO
```java
BenefitPolicy → BenefitPolicyResponseDto

id                      → id
name                    → name
policyCode              → policyCode
description             → description
employerOrgId           → employerOrganization.id
employerName            → employerOrganization.name
insuranceOrgId          → insuranceOrganization.id (null if not set)
insuranceName           → insuranceOrganization.name (null if not set)
startDate               → startDate
endDate                 → endDate
annualLimit             → annualLimit
defaultCoveragePercent  → defaultCoveragePercent
perMemberLimit          → perMemberLimit
perFamilyLimit          → perFamilyLimit
status                  → status
statusDisplay           → getStatusDisplay(status) // Localized Arabic text
effective               → isEffective() // Computed: active + within dates
coveredMembersCount     → coveredMembersCount
rulesCount              → rules.size()
activeRulesCount        → getActiveRulesCount()
notes                   → notes
active                  → active
createdAt               → createdAt
updatedAt               → updatedAt
```

---

## 🌐 API ENDPOINTS

### Base Path: `/api/benefit-policies`

### 1. CREATE - Create New Benefit Policy
**Endpoint:** `POST /api/benefit-policies`  
**Permission:** `benefit_policies.create` or `SUPER_ADMIN`  
**Request Body:** `BenefitPolicyCreateDto`  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `201 Created`

**Request Example:**
```json
{
  "name": "Gold Medical Plan 2025",
  "policyCode": "POL-2025-001",  // Optional, auto-generated if omitted
  "description": "Comprehensive coverage for all employees",
  "employerOrgId": 10,
  "insuranceOrgId": null,  // Optional
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "annualLimit": 50000.00,
  "defaultCoveragePercent": 80,
  "perMemberLimit": 5000.00,
  "perFamilyLimit": 15000.00,
  "notes": "Includes pre-approval requirement for surgeries",
  "status": "DRAFT"  // Optional, defaults to DRAFT
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Benefit policy created successfully",
  "data": {
    "id": 123,
    "name": "Gold Medical Plan 2025",
    "policyCode": "POL-2025-001",
    "description": "Comprehensive coverage for all employees",
    "employerOrgId": 10,
    "employerName": "Jeliana Construction",
    "insuranceOrgId": null,
    "insuranceName": null,
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "annualLimit": 50000.00,
    "defaultCoveragePercent": 80,
    "perMemberLimit": 5000.00,
    "perFamilyLimit": 15000.00,
    "status": "DRAFT",
    "statusDisplay": "مسودة",
    "effective": false,
    "coveredMembersCount": 0,
    "rulesCount": 0,
    "activeRulesCount": 0,
    "notes": "Includes pre-approval requirement for surgeries",
    "active": true,
    "createdAt": "2025-01-15T10:30:00",
    "updatedAt": "2025-01-15T10:30:00"
  }
}
```

**Validation:**
- `employerOrgId` must reference an existing Organization with type=EMPLOYER
- `startDate` < `endDate`
- `annualLimit` >= 0
- `defaultCoveragePercent` between 0-100
- If `insuranceOrgId` provided, must reference Organization with type=INSURANCE
- `policyCode` must be unique (if provided)

---

### 2. READ - Get Benefit Policy by ID
**Endpoint:** `GET /api/benefit-policies/{id}`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `id` (Long) - Policy ID  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Response Example:**
```json
{
  "success": true,
  "message": "Benefit policy retrieved",
  "data": {
    "id": 123,
    "name": "Gold Medical Plan 2025",
    // ... (same as CREATE response)
  }
}
```

**Error Cases:**
- `404 NOT_FOUND` - Policy not found
- `403 FORBIDDEN` - User lacks permission

---

### 3. READ - Get by Policy Code
**Endpoint:** `GET /api/benefit-policies/code/{policyCode}`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `policyCode` (String) - Unique policy code  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Example:** `GET /api/benefit-policies/code/POL-2025-001`

---

### 4. READ - List All (Paginated)
**Endpoint:** `GET /api/benefit-policies`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Query Parameters:**
- `employerId` (Long, optional) - Filter by employer
- `page` (int, default=0) - Page number (0-based)
- `size` (int, default=20) - Page size
- `sortBy` (String, default="createdAt") - Sort field
- `sortDir` (String, default="DESC") - Sort direction (ASC/DESC)

**Response:** `ApiResponse<Page<BenefitPolicyResponseDto>>`  
**Status:** `200 OK`

**Example:** `GET /api/benefit-policies?employerId=10&page=0&size=20&sortBy=startDate&sortDir=DESC`

---

### 5. READ - List by Employer
**Endpoint:** `GET /api/benefit-policies/employer/{employerOrgId}`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `employerOrgId` (Long)  
**Response:** `ApiResponse<List<BenefitPolicyResponseDto>>`  
**Status:** `200 OK`

**Returns:** All policies for the employer (active, draft, expired, etc.)

---

### 6. READ - List by Status
**Endpoint:** `GET /api/benefit-policies/status/{status}`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `status` (String) - DRAFT | ACTIVE | EXPIRED | SUSPENDED | CANCELLED  
**Response:** `ApiResponse<List<BenefitPolicyResponseDto>>`  
**Status:** `200 OK`

**Example:** `GET /api/benefit-policies/status/ACTIVE`

---

### 7. READ - Get Effective Policy for Employer
**Endpoint:** `GET /api/benefit-policies/effective`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Query Parameters:**
- `employerOrgId` (Long, required) - Employer ID
- `date` (LocalDate, optional) - Date to check (defaults to today)

**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Logic:** Returns the ONE active policy for the employer that is effective on the specified date

**Example:** `GET /api/benefit-policies/effective?employerOrgId=10&date=2025-06-15`

**Response (no policy found):**
```json
{
  "success": true,
  "message": "No effective policy found",
  "data": null
}
```

---

### 8. READ - Search Policies
**Endpoint:** `GET /api/benefit-policies/search`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Query Parameters:**
- `q` (String, required) - Search query (name or policy code)
- `page` (int, default=0)
- `size` (int, default=20)

**Response:** `ApiResponse<Page<BenefitPolicyResponseDto>>`  
**Status:** `200 OK`

**Example:** `GET /api/benefit-policies/search?q=Gold&page=0&size=10`

---

### 9. READ - Get Selector List
**Endpoint:** `GET /api/benefit-policies/selector`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Response:** `ApiResponse<List<BenefitPolicySelectorDto>>`  
**Status:** `200 OK`

**Purpose:** Lightweight DTO for dropdowns (id, name, policyCode only)

**Response Example:**
```json
{
  "success": true,
  "message": "Selectors retrieved",
  "data": [
    {
      "id": 123,
      "name": "Gold Medical Plan 2025",
      "policyCode": "POL-2025-001",
      "status": "ACTIVE"
    }
  ]
}
```

---

### 10. READ - Get Selector List for Employer
**Endpoint:** `GET /api/benefit-policies/selector/employer/{employerOrgId}`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Path Parameter:** `employerOrgId` (Long)  
**Response:** `ApiResponse<List<BenefitPolicySelectorDto>>`  
**Status:** `200 OK`

---

### 11. READ - Get Policies Expiring Soon
**Endpoint:** `GET /api/benefit-policies/expiring`  
**Permission:** `benefit_policies.view` or `SUPER_ADMIN`  
**Query Parameter:** `days` (int, default=30) - Number of days to check  
**Response:** `ApiResponse<List<BenefitPolicyResponseDto>>`  
**Status:** `200 OK`

**Logic:** Returns policies where `endDate` is within the next N days

**Example:** `GET /api/benefit-policies/expiring?days=30`

---

### 12. UPDATE - Update Benefit Policy
**Endpoint:** `PUT /api/benefit-policies/{id}`  
**Permission:** `benefit_policies.edit` or `SUPER_ADMIN`  
**Path Parameter:** `id` (Long)  
**Request Body:** `BenefitPolicyUpdateDto` (all fields optional)  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Request Example:**
```json
{
  "name": "Gold Medical Plan 2025 (Updated)",
  "description": "Updated coverage terms",
  "annualLimit": 60000.00,
  "defaultCoveragePercent": 85
}
```

**Immutable Fields (cannot be updated):**
- `employerOrgId` - Set at creation only
- `insuranceOrgId` - Set at creation only
- `status` - Use dedicated endpoints (activate/suspend/cancel)

---

### 13. ACTION - Activate Policy
**Endpoint:** `POST /api/benefit-policies/{id}/activate`  
**Permission:** `benefit_policies.activate` or `SUPER_ADMIN`  
**Path Parameter:** `id` (Long)  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Business Logic:**
1. Validates policy dates (startDate/endDate)
2. Checks for overlapping active policies for same employer
3. Transitions status: DRAFT → ACTIVE or SUSPENDED → ACTIVE
4. Returns updated policy

**Validation Errors:**
- `400 BAD_REQUEST` - Policy has invalid dates (startDate >= endDate)
- `409 CONFLICT` - Another active policy exists for employer with overlapping dates
- `400 BAD_REQUEST` - Policy is already ACTIVE or CANCELLED

---

### 14. ACTION - Deactivate Policy
**Endpoint:** `POST /api/benefit-policies/{id}/deactivate`  
**Permission:** `benefit_policies.edit` or `SUPER_ADMIN`  
**Path Parameter:** `id` (Long)  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Business Logic:**
- Transitions status: ACTIVE → DRAFT
- Does NOT set `active = false` (soft delete)
- Use for temporarily reverting activation

---

### 15. ACTION - Suspend Policy
**Endpoint:** `POST /api/benefit-policies/{id}/suspend`  
**Permission:** `benefit_policies.edit` or `SUPER_ADMIN`  
**Path Parameter:** `id` (Long)  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Business Logic:**
- Transitions status: ACTIVE → SUSPENDED
- Suspended policies are NOT considered effective (members lose coverage)
- Can be reactivated using `/activate` endpoint

---

### 16. ACTION - Cancel Policy
**Endpoint:** `POST /api/benefit-policies/{id}/cancel`  
**Permission:** `benefit_policies.delete` or `SUPER_ADMIN`  
**Path Parameter:** `id` (Long)  
**Response:** `ApiResponse<BenefitPolicyResponseDto>`  
**Status:** `200 OK`

**Business Logic:**
- Transitions status: ANY → CANCELLED
- PERMANENT cancellation (cannot be reactivated)
- Does NOT soft-delete (`active` remains true for audit trail)

---

### 17. DELETE - Soft Delete Policy
**Endpoint:** `DELETE /api/benefit-policies/{id}`  
**Permission:** `benefit_policies.delete` or `SUPER_ADMIN`  
**Path Parameter:** `id` (Long)  
**Response:** `ApiResponse<Void>`  
**Status:** `204 No Content`

**Business Logic:**
- Sets `active = false` (soft delete)
- Record remains in database for audit purposes
- Soft-deleted policies are excluded from all queries (except admin views)

---

## 📦 DTOS SPECIFICATION

### 1. BenefitPolicyCreateDto
```java
{
  "name": "string (required, max 255)",
  "policyCode": "string (optional, max 50, auto-generated if null)",
  "description": "string (optional, max 2000)",
  "employerOrgId": "long (required)",
  "insuranceOrgId": "long (optional)",
  "startDate": "date (required, ISO format YYYY-MM-DD)",
  "endDate": "date (required, must be > startDate)",
  "annualLimit": "decimal (required, >= 0, precision 15,2)",
  "defaultCoveragePercent": "integer (required, 0-100, default 80)",
  "perMemberLimit": "decimal (optional, >= 0)",
  "perFamilyLimit": "decimal (optional, >= 0)",
  "notes": "string (optional, max 1000)",
  "status": "string (optional, DRAFT|ACTIVE, default DRAFT)"
}
```

### 2. BenefitPolicyUpdateDto
```java
{
  "name": "string (optional, max 255)",
  "policyCode": "string (optional, max 50)",
  "description": "string (optional, max 2000)",
  "startDate": "date (optional)",
  "endDate": "date (optional)",
  "annualLimit": "decimal (optional, >= 0)",
  "defaultCoveragePercent": "integer (optional, 0-100)",
  "perMemberLimit": "decimal (optional, >= 0)",
  "perFamilyLimit": "decimal (optional, >= 0)",
  "notes": "string (optional, max 1000)"
  
  // IMMUTABLE FIELDS (not allowed in update):
  // - employerOrgId
  // - insuranceOrgId
  // - status (use dedicated endpoints)
}
```

### 3. BenefitPolicyResponseDto
```java
{
  "id": "long",
  "name": "string",
  "policyCode": "string",
  "description": "string",
  "employerOrgId": "long",
  "employerName": "string (joined from Organization)",
  "insuranceOrgId": "long (nullable)",
  "insuranceName": "string (nullable)",
  "startDate": "date",
  "endDate": "date",
  "annualLimit": "decimal",
  "defaultCoveragePercent": "integer",
  "perMemberLimit": "decimal (nullable)",
  "perFamilyLimit": "decimal (nullable)",
  "status": "DRAFT | ACTIVE | EXPIRED | SUSPENDED | CANCELLED",
  "statusDisplay": "string (Arabic localized)",
  "effective": "boolean (computed: active + within dates)",
  "coveredMembersCount": "integer",
  "rulesCount": "integer (count of BenefitPolicyRule)",
  "activeRulesCount": "integer",
  "notes": "string",
  "active": "boolean (soft-delete flag)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 4. BenefitPolicySelectorDto
```java
{
  "id": "long",
  "name": "string",
  "policyCode": "string",
  "status": "DRAFT | ACTIVE | EXPIRED | SUSPENDED | CANCELLED"
}
```

---

## ✅ VALIDATION RULES

### Field-Level Validation

| Field | Validation Rules |
|-------|------------------|
| `name` | Required, max 255 characters, not blank |
| `policyCode` | Max 50 characters, unique, format POL-YYYY-XXX |
| `description` | Max 2000 characters |
| `employerOrgId` | Required, must exist in Organization table with type=EMPLOYER |
| `insuranceOrgId` | Must exist in Organization table with type=INSURANCE (if provided) |
| `startDate` | Required, must be a valid date |
| `endDate` | Required, must be > startDate |
| `annualLimit` | Required, must be >= 0, max precision 15,2 |
| `defaultCoveragePercent` | Required, must be 0-100, defaults to 80 |
| `perMemberLimit` | Must be >= 0, max precision 15,2 |
| `perFamilyLimit` | Must be >= 0, max precision 15,2 |
| `notes` | Max 1000 characters |
| `status` | Must be one of: DRAFT, ACTIVE, EXPIRED, SUSPENDED, CANCELLED |

### Business Logic Validation

#### 1. Date Validation
```java
// startDate must be before endDate
if (startDate.isAfter(endDate) || startDate.isEqual(endDate)) {
    throw new ValidationException("Start date must be before end date");
}

// Cannot activate policy with past end date
if (status == ACTIVE && endDate.isBefore(LocalDate.now())) {
    throw new ValidationException("Cannot activate policy with past end date");
}
```

#### 2. One Active Policy Per Employer
```java
// When activating a policy
List<BenefitPolicy> existingActive = policyRepository
    .findByEmployerAndStatus(employerOrgId, ACTIVE);

for (BenefitPolicy existing : existingActive) {
    if (datesOverlap(existing.startDate, existing.endDate, newPolicy.startDate, newPolicy.endDate)) {
        throw new ConflictException(
            "Another active policy exists for this employer with overlapping dates: " 
            + existing.getPolicyCode()
        );
    }
}
```

#### 3. Limit Hierarchy Validation
```java
// Per-member limit cannot exceed per-family limit (if both set)
if (perMemberLimit != null && perFamilyLimit != null 
    && perMemberLimit.compareTo(perFamilyLimit) > 0) {
    throw new ValidationException("Per-member limit cannot exceed per-family limit");
}

// Per-family limit cannot exceed annual limit (if both set)
if (perFamilyLimit != null && annualLimit != null 
    && perFamilyLimit.compareTo(annualLimit) > 0) {
    throw new ValidationException("Per-family limit cannot exceed annual limit");
}
```

#### 4. Status Transition Validation
```java
// See Status Lifecycle section for allowed transitions
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
      "field": "startDate",
      "message": "Start date must be before end date"
    }
  ],
  "timestamp": "2025-01-15T10:30:00"
}
```

### HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| `200 OK` | Successful GET/PUT/POST (action) | Policy retrieved/updated/activated |
| `201 Created` | Successful POST (create) | Policy created |
| `204 No Content` | Successful DELETE | Policy deleted |
| `400 Bad Request` | Validation error | startDate >= endDate |
| `401 Unauthorized` | Authentication required | Missing/invalid token |
| `403 Forbidden` | Insufficient permissions | User lacks benefit_policies.create |
| `404 Not Found` | Resource not found | Policy ID 999 does not exist |
| `409 Conflict` | Business rule violation | Another active policy exists for employer |
| `500 Internal Server Error` | Unexpected error | Database connection failure |

### Common Error Messages

#### Validation Errors (400)
```
- "Policy name is required"
- "Start date must be before end date"
- "Annual limit must be >= 0"
- "Coverage percent must be between 0 and 100"
- "Employer organization ID is required"
- "Per-family limit cannot exceed annual limit"
```

#### Business Logic Errors (409)
```
- "Another active policy exists for this employer with overlapping dates: POL-2025-001"
- "Policy code POL-2025-001 is already in use"
- "Cannot activate policy: end date is in the past"
```

#### Not Found Errors (404)
```
- "Benefit policy with ID 123 not found"
- "Policy with code POL-2025-999 not found"
- "Employer organization with ID 999 not found"
```

---

## 🔄 STATUS LIFECYCLE

### Status Enum
```java
public enum BenefitPolicyStatus {
    DRAFT,      // Initial state, being configured
    ACTIVE,     // Currently in effect
    EXPIRED,    // End date has passed (auto-transition)
    SUSPENDED,  // Temporarily inactive (manual action)
    CANCELLED   // Permanently cancelled (manual action)
}
```

### Status Transitions

```
         CREATE
           ↓
       [DRAFT] ──────activate()──────▶ [ACTIVE]
           ↑                               │
           │                               │
           └──────deactivate()─────────────┘
                                           │
                                           ├──suspend()──▶ [SUSPENDED]
                                           │                    │
                                           │                    │
                                           │          activate() │
                                           │◀───────────────────┘
                                           │
                                           ├──(endDate passed)──▶ [EXPIRED]
                                           │
                                           └──cancel()───────────▶ [CANCELLED]
                                                                      ↓
                                                                (permanent)
```

### Transition Rules

| From | To | Method | Conditions | Reversible |
|------|-----|--------|-----------|------------|
| DRAFT | ACTIVE | `activate()` | Valid dates, no overlapping active policies | Yes (deactivate) |
| ACTIVE | DRAFT | `deactivate()` | None | Yes (activate) |
| ACTIVE | SUSPENDED | `suspend()` | None | Yes (activate) |
| SUSPENDED | ACTIVE | `activate()` | Valid dates, no overlapping active policies | Yes |
| ACTIVE | EXPIRED | Auto | `LocalDate.now() > endDate` | No |
| DRAFT | EXPIRED | Auto | `LocalDate.now() > endDate` | No |
| ANY | CANCELLED | `cancel()` | Permission: benefit_policies.delete | **No (permanent)** |

### Auto-Expiry Logic
```java
@Scheduled(cron = "0 0 1 * * *") // Daily at 1 AM
public void autoExpirePolicies() {
    List<BenefitPolicy> policies = policyRepository
        .findByStatusInAndEndDateBefore(
            Arrays.asList(ACTIVE, DRAFT, SUSPENDED), 
            LocalDate.now()
        );
    
    for (BenefitPolicy policy : policies) {
        policy.setStatus(EXPIRED);
        policyRepository.save(policy);
        log.info("Auto-expired policy: {}", policy.getPolicyCode());
    }
}
```

---

## 🔌 INTEGRATION POINTS

### 1. Member Eligibility Check
**Module:** `Member`  
**Integration:** BenefitPolicy status affects member eligibility

**Eligibility Condition 5 of 7:**
```java
// Member's employer must have an ACTIVE benefit policy
BenefitPolicy effectivePolicy = benefitPolicyService
    .findEffectiveForEmployer(member.getEmployerOrgId(), LocalDate.now());

if (effectivePolicy == null) {
    return EligibilityResult.builder()
        .eligible(false)
        .reason("No active benefit policy for employer")
        .build();
}
```

**Eligibility Condition 6 of 7:**
```java
// Today must be within policy's effective date range
if (!effectivePolicy.isEffective()) {
    return EligibilityResult.builder()
        .eligible(false)
        .reason("Benefit policy is not effective on current date")
        .build();
}
```

**IMPORTANT:**
- **Eligibility does NOT depend on Civil ID**
- Civil ID is optional and only used for identification purposes, not for coverage determination
- A member can be eligible even without a Civil ID (e.g., dependents, expatriates)

---

### 2. Coverage Calculation
**Module:** `BenefitRequest` (claims processing)  
**Integration:** BenefitPolicy provides default coverage percentage

**Coverage Resolution:**
```java
// 1. Check if a specific service rule exists (BenefitPolicyRule)
BenefitPolicyRule rule = ruleService.findRuleForService(policyId, serviceId);

if (rule != null) {
    coveragePercent = rule.getCoveragePercent() != null 
        ? rule.getCoveragePercent() 
        : policy.getDefaultCoveragePercent();
} else {
    // 2. Check if a category rule exists
    MedicalService service = serviceRepo.findById(serviceId);
    rule = ruleService.findRuleForCategory(policyId, service.getCategoryId());
    
    if (rule != null) {
        coveragePercent = rule.getCoveragePercent() != null 
            ? rule.getCoveragePercent() 
            : policy.getDefaultCoveragePercent();
    } else {
        // 3. No rule found → service is NOT covered
        coveragePercent = 0;
    }
}
```

**Coverage Hierarchy:**
1. **Service-specific rule** (highest priority)
2. **Category-level rule** (if no service rule)
3. **No coverage** (0%) if no rule exists

**Note:** `defaultCoveragePercent` is inherited by rules, NOT applied directly to uncovered services

---

### 3. Annual Limit Tracking
**Module:** `BenefitRequest`  
**Integration:** Track total usage against policy limits

```java
// Calculate total used amount for member in current year
BigDecimal usedAmount = benefitRequestRepo
    .sumApprovedAmountByMemberAndYear(memberId, year);

// Check per-member limit
BigDecimal memberLimit = policy.getPerMemberLimit() != null 
    ? policy.getPerMemberLimit() 
    : policy.getAnnualLimit();

if (usedAmount.add(newRequestAmount).compareTo(memberLimit) > 0) {
    throw new LimitExceededException("Member annual limit exceeded");
}

// Check per-family limit (if applicable)
// ...

// Check policy annual limit
// ...
```

---

### 4. Reporting & Analytics
**Module:** `Reports`  
**Integration:** Policy data for coverage reports

**Metrics:**
- Total active policies
- Policies expiring soon (30/60/90 days)
- Average coverage percentage by employer
- Total annual limit commitments
- Member coverage gaps (employers without active policies)

---

## 📝 NOTES & BEST PRACTICES

### Auto-Code Generation
```java
// Format: POL-YYYY-XXX
public String generatePolicyCode() {
    int year = LocalDate.now().getYear();
    String prefix = "POL-" + year + "-";
    
    // Find highest sequence number for current year
    String maxCode = policyRepository
        .findMaxPolicyCodeByYear(prefix);
    
    int nextSequence = 1;
    if (maxCode != null) {
        String seqStr = maxCode.substring(maxCode.lastIndexOf('-') + 1);
        nextSequence = Integer.parseInt(seqStr) + 1;
    }
    
    return String.format("POL-%d-%03d", year, nextSequence);
}
```

### Performance Optimization
```sql
-- Index for finding effective policy (most common query)
CREATE INDEX idx_benefit_policy_effective 
ON benefit_policies(employer_org_id, status, start_date, end_date)
WHERE active = true;

-- Index for expiry checks
CREATE INDEX idx_benefit_policy_expiring 
ON benefit_policies(end_date, status)
WHERE active = true;
```

### Audit Trail
- All status changes are logged (createdAt, updatedAt timestamps)
- Soft-delete (`active = false`) preserves historical data
- Cancelled policies remain in database for compliance/audit

---

## 🔗 RELATED CONTRACTS

- **[BENEFIT_POLICY_RULE_API_CONTRACT.md](BENEFIT_POLICY_RULE_API_CONTRACT.md)** - Coverage rules per service/category
- **[MEMBER_API_CONTRACT.md](MEMBER_API_CONTRACT.md)** - Member eligibility integration
- **[EMPLOYER_API_CONTRACT.md](EMPLOYER_API_CONTRACT.md)** - Employer organization reference

---

**Contract Owner:** Backend Development Team  
**Review Date:** January 2025  
**Next Review:** July 2025
