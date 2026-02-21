# 🔍 Member Contract Compliance Report

**Date:** 2024-12-29  
**Phase:** 1.5 - Pre-Implementation Compliance Check  
**Contract:** MEMBER_API_CONTRACT.md v1.0.0  
**Status:** 🔴 **CRITICAL GAPS FOUND** - Implementation Required

---

## 📊 Executive Summary

| Layer | ✔ Compliant | ⚠ Needs Fix | ❌ Missing | Total Items | Compliance % |
|-------|-------------|-------------|-----------|-------------|--------------|
| **Entity** | 28 | 5 | 2 | 35 | 80% |
| **DTOs** | 18 | 8 | 6 | 32 | 56% |
| **Repository** | 8 | 2 | 4 | 14 | 57% |
| **Service** | 6 | 2 | 10 | 18 | 33% |
| **Controller** | 7 | 0 | 7 | 14 | 50% |
| **TOTAL** | **67** | **17** | **29** | **113** | **59%** |

### 🎯 Critical Findings

1. ❌ **No Status Management Endpoints** - suspend/activate/terminate missing
2. ❌ **No Eligibility Check Endpoint** - eligibility calculation missing
3. ❌ **No Card Management Endpoints** - block/activate card missing
4. ⚠️ **Civil ID Validation Missing** - No @Pattern validation for 12-digit format
5. ⚠️ **No @JsonAlias Annotations** - Field normalization (nameAr → fullNameArabic) missing
6. ⚠️ **Insurance Organization Missing** - No insuranceOrganization field in DTOs
7. ⚠️ **No Authorization Checks** - Employer-scoped validation missing in controller
8. ❌ **Eligibility Calculation Logic Missing** - 7-condition eligibility service missing

---

## 🏗️ Layer 1: Entity (Member.java)

### ✔️ **COMPLIANT** (28 items)

| Field | Contract Reference | Status | Notes |
|-------|-------------------|--------|-------|
| `id` | Field Registry - Audit | ✔️ | Auto-generated Long |
| `fullNameArabic` | Field Registry - Personal | ✔️ | @NotBlank, length=200 |
| `fullNameEnglish` | Field Registry - Personal | ✔️ | length=200, nullable |
| `civilId` | Field Registry - Personal | ✔️ | Optional, length=50 |
| `cardNumber` | Field Registry - Personal | ✔️ | @PrePersist generation |
| `birthDate` | Field Registry - Personal | ✔️ | @NotNull LocalDate |
| `gender` | Field Registry - Personal | ✔️ | @NotNull Enum(MALE, FEMALE) |
| `maritalStatus` | Field Registry - Personal | ✔️ | Enum(SINGLE, MARRIED, DIVORCED, WIDOWED) |
| `phone` | Field Registry - Contact | ✔️ | String(20) |
| `email` | Field Registry - Contact | ✔️ | @Email validation |
| `address` | Field Registry - Contact | ✔️ | String(500) |
| `nationality` | Field Registry - Contact | ✔️ | String(100) |
| `employerOrganization` | Field Registry - Organization | ✔️ | @NotNull ManyToOne |
| `benefitPolicy` | Field Registry - Organization | ✔️ | ManyToOne, auto-assigned |
| `employeeNumber` | Field Registry - Employment | ✔️ | String(100) |
| `joinDate` | Field Registry - Employment | ✔️ | LocalDate |
| `occupation` | Field Registry - Employment | ✔️ | String(100) |
| `policyNumber` | Field Registry - Employment | ✔️ | String(100) |
| `status` | Field Registry - Status | ✔️ | Enum(ACTIVE, SUSPENDED, TERMINATED, PENDING) |
| `startDate` | Field Registry - Status | ✔️ | LocalDate |
| `endDate` | Field Registry - Status | ✔️ | LocalDate |
| `cardStatus` | Field Registry - Status | ✔️ | Enum(ACTIVE, INACTIVE, BLOCKED, EXPIRED) |
| `blockedReason` | Field Registry - Status | ✔️ | String(500) |
| `active` | Field Registry - Status | ✔️ | Boolean, default=true |
| `eligibilityStatus` | Field Registry - Eligibility | ✔️ | Boolean, default=true |
| `eligibilityUpdatedAt` | Field Registry - Eligibility | ✔️ | LocalDateTime |
| `qrCodeValue` | Field Registry - Eligibility | ✔️ | String(100), unique |
| `photoUrl` | Field Registry - Additional | ✔️ | String(500) |

### ⚠️ **NEEDS FIX** (5 items)

| Issue | Contract Reference | Current State | Action Required |
|-------|-------------------|---------------|-----------------|
| **civilId - No uniqueness constraint** | Field Registry: "UNIQUE(civil_id) if not null" | No database constraint | Add `@UniqueConstraint(columnNames = "civil_id")` to @Table |
| **civilId - No format validation** | Civil ID Validation: "@Pattern(regexp = '^[0-9]{12}$')" | No @Pattern annotation | Add @Pattern to entity field |
| **civilId - Not immutable** | Field Registry: "Immutable: ✔ Yes*" | No immutability enforcement | Add validation in service layer |
| **employerOrganization - Not immutable** | Field Registry: "Cannot be changed after creation" | No immutability enforcement | Add validation in service updateMember() |
| **cardNumber - No uniqueness check on update** | Auto-Card Generation: "Uniqueness Enforcement" | @PrePersist only | Add validation in updateMember() to prevent changes |

### ❌ **MISSING** (2 items)

| Missing Item | Contract Reference | Action Required |
|--------------|-------------------|-----------------|
| **insuranceOrganization** | Field Registry - Organization: "Insurance Organization (Optional)" | Add `@ManyToOne Organization insuranceOrganization` field |
| **notes** | Field Registry - Additional: "Notes - String(2000)" | Already exists ✔️ (False alarm - it's present) |

---

## 📝 Layer 2: DTOs

### A. MemberCreateDto

#### ✔️ **COMPLIANT** (15 items)

| Field | Contract Reference | Status |
|-------|-------------------|--------|
| `fullNameArabic` | Field Registry - Personal | ✔️ @NotBlank |
| `fullNameEnglish` | Field Registry - Personal | ✔️ |
| `civilId` | Field Registry - Personal | ✔️ |
| `birthDate` | Field Registry - Personal | ✔️ @NotNull |
| `gender` | Field Registry - Personal | ✔️ @NotNull |
| `maritalStatus` | Field Registry - Personal | ✔️ |
| `phone` | Field Registry - Contact | ✔️ |
| `email` | Field Registry - Contact | ✔️ @Email |
| `address` | Field Registry - Contact | ✔️ |
| `nationality` | Field Registry - Contact | ✔️ |
| `employerId` | Field Registry - Organization | ✔️ @NotNull |
| `benefitPolicyId` | Field Registry - Organization | ✔️ |
| `employeeNumber` | Field Registry - Employment | ✔️ |
| `joinDate` | Field Registry - Employment | ✔️ |
| `occupation` | Field Registry - Employment | ✔️ |

#### ⚠️ **NEEDS FIX** (5 items)

| Issue | Contract Reference | Current State | Action Required |
|-------|-------------------|---------------|-----------------|
| **No @JsonAlias for frontend normalization** | Field Mapping Rules: "nameAr → fullNameArabic" | No @JsonAlias annotation | Add `@JsonAlias({"nameAr"})` to fullNameArabic |
| **No @JsonAlias for nameEn** | Field Mapping Rules: "nameEn → fullNameEnglish" | No @JsonAlias annotation | Add `@JsonAlias({"nameEn"})` to fullNameEnglish |
| **civilId - No @Pattern validation** | Civil ID Validation: "@Pattern(regexp = '^[0-9]{12}$')" | No validation | Add @Pattern annotation |
| **phone - No @Pattern validation** | Field Registry: "@Pattern (international format)" | No validation | Add @Pattern for +965XXXXXXXX |
| **cardNumber field present** | Auto-Card Generation: "Never accept from user input" | Field exists | Remove cardNumber field (system-generated only) |

#### ❌ **MISSING** (3 items)

| Missing Item | Contract Reference | Action Required |
|--------------|-------------------|-----------------|
| **insuranceId** | Field Registry - Organization: "Insurance Organization (Optional)" | Add `Long insuranceId` field |
| **policyNumber** | Field Registry - Employment: "Policy Number" | Already exists ✔️ |
| **status/cardStatus validation** | Endpoint 1: "Validation Rules" | Already exists ✔️ |

### B. MemberUpdateDto

#### ✔️ **COMPLIANT** (12 items)

Same compliant fields as CreateDto (without @NotNull validations)

#### ⚠️ **NEEDS FIX** (3 items)

| Issue | Contract Reference | Current State | Action Required |
|-------|-------------------|---------------|-----------------|
| **No @JsonAlias annotations** | Field Mapping Rules | Missing | Add @JsonAlias for nameAr/nameEn |
| **cardNumber updatable** | Auto-Card Generation: "Immutable" | Field present | Remove from DTO (cannot be updated) |
| **civilId updatable** | Field Registry: "Immutable: ✔ Yes*" | Field present | Add documentation: immutable if set |

#### ❌ **MISSING** (2 items)

| Missing Item | Contract Reference | Action Required |
|--------------|-------------------|-----------------|
| **insuranceId** | Field Registry - Organization | Add `Long insuranceId` field |
| **Immutability documentation** | Endpoint 2: "Immutable Fields" | Add @Schema descriptions |

### C. MemberViewDto

#### ✔️ **COMPLIANT** (18 items)

All fields mapped correctly from entity to response

#### ⚠️ **NEEDS FIX** (2 items)

| Issue | Contract Reference | Current State | Action Required |
|-------|-------------------|---------------|-----------------|
| **No @JsonProperty for response normalization** | Field Mapping Rules: "fullNameArabic → nameAr (optional)" | No renaming | Add @JsonProperty if frontend needs nameAr |
| **Missing eligibilityCheckedAt** | Field Registry - Eligibility: "eligibilityUpdatedAt" | Field present as eligibilityStatus | Verify field naming consistency |

#### ❌ **MISSING** (1 item)

| Missing Item | Contract Reference | Action Required |
|--------------|-------------------|-----------------|
| **insuranceId & insuranceName** | Field Registry - Organization | Add insurance organization fields |

---

## 🗄️ Layer 3: Repository (MemberRepository.java)

### ✔️ **COMPLIANT** (8 items)

| Query Method | Contract Reference | Status |
|--------------|-------------------|--------|
| `findByCardNumber(String)` | Auto-Card Generation: "Check uniqueness" | ✔️ |
| `findByCivilId(String)` | Civil ID Validation: "Check uniqueness" | ✔️ |
| `findByEmployerOrganizationId(Long)` | Authorization: "Employer-scoped queries" | ✔️ |
| `findByEmployerOrganizationId(Long, Pageable)` | Endpoint 4: "List members with pagination" | ✔️ |
| `countByEmployerOrganizationId(Long)` | Endpoint 7: "Count members" | ✔️ |
| `searchByEmployerOrganizationId(String, Long)` | Endpoint 8: "Search members" | ✔️ |
| `findByBenefitPolicyId(Long)` | Benefit Policy Auto-Assignment | ✔️ |
| `existsByCivilId(String)` | Civil ID Validation: "Uniqueness check" | ✔️ |

### ⚠️ **NEEDS FIX** (2 items)

| Issue | Contract Reference | Current State | Action Required |
|-------|-------------------|---------------|-----------------|
| **Legacy employer queries** | Organization Migration | Old `findByEmployerId()` methods still present | Mark as @Deprecated, use employerOrganization queries |
| **No existsByCardNumber()** | Auto-Card Generation: "Uniqueness check" | Method exists | ✔️ Already present |

### ❌ **MISSING** (4 items)

| Missing Method | Contract Reference | Action Required |
|----------------|-------------------|-----------------|
| **findByStatusAndEmployerOrganizationId** | Endpoint 4: "Filter by member status" | Add query method for status filtering |
| **findByCardStatusAndEmployerOrganizationId** | Endpoint 4: "Filter by card status" | Add query method for cardStatus filtering |
| **findByInsuranceOrganizationId** | Field Registry - Organization | Add query for insurance org filtering |
| **findEligibleMembers** | Eligibility Calculation: "Daily eligibility re-check" | Add query for bulk eligibility checks |

---

## 🔧 Layer 4: Service (MemberService.java)

### ✔️ **COMPLIANT** (6 items)

| Method | Contract Reference | Status |
|--------|-------------------|--------|
| `createMember()` | Endpoint 1: "Create member" | ✔️ |
| `updateMember()` | Endpoint 2: "Update member" | ✔️ |
| `getMember()` | Endpoint 3: "Get member by ID" | ✔️ |
| `listMembers()` | Endpoint 4: "List members" | ✔️ |
| `deleteMember()` | Endpoint 5: "Soft delete" | ✔️ |
| `autoAssignBenefitPolicy()` | Benefit Policy Auto-Assignment | ✔️ |

### ⚠️ **NEEDS FIX** (2 items)

| Issue | Contract Reference | Current State | Action Required |
|-------|-------------------|---------------|-----------------|
| **createMember - No civil ID validation** | Civil ID Validation: "Check format, check uniqueness" | No format validation | Add civilId format validation (12 digits) |
| **updateMember - No immutability checks** | Endpoint 2: "Immutable Fields" | Can update civilId, employerId | Add validation to prevent updates |

### ❌ **MISSING** (10 items)

| Missing Method | Contract Reference | Action Required |
|----------------|-------------------|-----------------|
| **suspendMember(Long, String)** | Endpoint 8: "Suspend member" | Create method: set status=SUSPENDED, cardStatus=BLOCKED |
| **activateMember(Long)** | Endpoint 9: "Activate member" | Create method: set status=ACTIVE, cardStatus=ACTIVE |
| **terminateMember(Long)** | Endpoint 10: "Terminate member" | Create method: set status=TERMINATED, cardStatus=EXPIRED |
| **checkEligibility(Long, LocalDate)** | Endpoint 11: "Check eligibility" | Create method with 7-condition logic |
| **calculateEligibility(Member, LocalDate)** | Eligibility Calculation: "Calculation Logic" | Create private method with all conditions |
| **blockCard(Long, String)** | Endpoint 12: "Block card" | Create method: set cardStatus=BLOCKED |
| **activateCard(Long)** | Endpoint 13: "Activate card" | Create method: set cardStatus=ACTIVE |
| **validateCivilIdFormat(String)** | Civil ID Validation: "Format validation" | Create validation method |
| **validateCivilIdUniqueness(String, Long)** | Civil ID Validation: "Uniqueness check" | Create validation method |
| **validateStatusTransition(MemberStatus, MemberStatus)** | Status Lifecycle: "Transition Rules" | Create validation with transition matrix |

---

## 🎮 Layer 5: Controller (MemberController.java)

### ✔️ **COMPLIANT** (7 items)

| Endpoint | Contract Reference | Status |
|----------|-------------------|--------|
| `POST /api/members` | Endpoint 1: "Create member" | ✔️ |
| `PUT /api/members/{id}` | Endpoint 2: "Update member" | ✔️ |
| `GET /api/members/{id}` | Endpoint 3: "Get member by ID" | ✔️ |
| `GET /api/members` | Endpoint 4: "List members" | ✔️ |
| `DELETE /api/members/{id}` | Endpoint 5: "Soft delete" | ✔️ |
| `GET /api/members/selector` | Endpoint 6: "Dropdown options" | ✔️ |
| `GET /api/members/count` | Endpoint 7: "Total count" | ✔️ |

### ⚠️ **NEEDS FIX** (0 items)

All existing endpoints have correct @PreAuthorize annotations ✔️

### ❌ **MISSING** (7 items)

| Missing Endpoint | Contract Reference | Action Required |
|------------------|-------------------|-----------------|
| **POST /api/members/{id}/suspend** | Endpoint 8: "Suspend member" | Add endpoint with reason parameter |
| **POST /api/members/{id}/activate** | Endpoint 9: "Activate member" | Add endpoint |
| **POST /api/members/{id}/terminate** | Endpoint 10: "Terminate member" | Add endpoint |
| **GET /api/members/{id}/eligibility** | Endpoint 11: "Check eligibility" | Add endpoint with serviceDate parameter |
| **POST /api/members/{id}/card/block** | Endpoint 12: "Block card" | Add endpoint with reason parameter |
| **POST /api/members/{id}/card/activate** | Endpoint 13: "Activate card" | Add endpoint |
| **Status/cardStatus filters in list** | Endpoint 4: "Query Parameters" | Add @RequestParam for status filtering |

---

## 📋 Detailed Compliance Matrix

### Section 1: Field Registry Compliance

| Category | Fields in Contract | Fields in Entity | Missing Fields | Compliance |
|----------|-------------------|------------------|----------------|------------|
| Personal | 7 | 7 | 0 | 100% |
| Contact | 4 | 4 | 0 | 100% |
| Organization | 3 | 2 | 1 (insuranceOrg) | 67% |
| Employment | 4 | 4 | 0 | 100% |
| Status | 6 | 6 | 0 | 100% |
| Eligibility | 3 | 3 | 0 | 100% |
| Additional | 2 | 2 | 0 | 100% |
| Audit | 5 | 5 | 0 | 100% |

### Section 2: Auto-Card Generation Compliance

| Rule | Contract Requirement | Implementation | Compliance |
|------|---------------------|----------------|------------|
| Format | `WAAD\|MEMBER\|{TIMESTAMP}{RANDOM}` | ✔️ CardNumberGenerator.generate() | ✔️ 100% |
| Uniqueness | Database constraint + retry logic | ✔️ @UniqueConstraint, @PrePersist | ✔️ 100% |
| Immutability | Cannot be changed after creation | ⚠️ No validation in updateMember | ⚠️ 50% |
| System-Generated | Never accept from user input | ⚠️ CreateDto has cardNumber field | ⚠️ 50% |

### Section 3: Civil ID Validation Compliance

| Rule | Contract Requirement | Implementation | Compliance |
|------|---------------------|----------------|------------|
| Format | 12 digits `^[0-9]{12}$` | ❌ No @Pattern | ❌ 0% |
| Uniqueness | UNIQUE constraint if not null | ⚠️ No DB constraint | ⚠️ 0% |
| Immutability | Cannot change once set | ❌ No validation | ❌ 0% |
| Optional | Can be null/empty | ✔️ Column nullable | ✔️ 100% |

### Section 4: Multi-Organization Linking Compliance

| Rule | Contract Requirement | Implementation | Compliance |
|------|---------------------|----------------|------------|
| Employer Org | Required, must be active | ✔️ @NotNull, validation in service | ✔️ 100% |
| Insurance Org | Optional, can be null | ❌ Field missing | ❌ 0% |
| Employer Immutable | Cannot change after creation | ⚠️ No validation | ⚠️ 0% |
| Insurance Updatable | Can change during updates | ❌ Field missing | ❌ 0% |

### Section 5: Status Lifecycle Compliance

| Rule | Contract Requirement | Implementation | Compliance |
|------|---------------------|----------------|------------|
| Member Status Enum | PENDING, ACTIVE, SUSPENDED, TERMINATED | ✔️ Correct enum | ✔️ 100% |
| Card Status Enum | ACTIVE, BLOCKED, EXPIRED, INACTIVE | ✔️ Correct enum | ✔️ 100% |
| Transition Validation | Enforce transition matrix | ❌ No validation | ❌ 0% |
| Suspend Endpoint | POST /api/members/{id}/suspend | ❌ Missing | ❌ 0% |
| Activate Endpoint | POST /api/members/{id}/activate | ❌ Missing | ❌ 0% |
| Terminate Endpoint | POST /api/members/{id}/terminate | ❌ Missing | ❌ 0% |

### Section 6: Eligibility Calculation Compliance

| Rule | Contract Requirement | Implementation | Compliance |
|------|---------------------|----------------|------------|
| Eligibility Field | Boolean eligibilityStatus | ✔️ Exists | ✔️ 100% |
| Updated Timestamp | eligibilityUpdatedAt | ✔️ Exists | ✔️ 100% |
| 7-Condition Logic | All conditions implemented | ❌ No calculation method | ❌ 0% |
| Calculation Triggers | 6 triggers defined | ❌ No trigger implementations | ❌ 0% |
| Eligibility Endpoint | GET /api/members/{id}/eligibility | ❌ Missing | ❌ 0% |
| Ineligibility Reasons | 8 reason codes | ❌ Not implemented | ❌ 0% |

### Section 7: Authorization & Data Isolation Compliance

| Rule | Contract Requirement | Implementation | Compliance |
|------|---------------------|----------------|------------|
| Role-Based Access | 4 roles defined | ✔️ @PreAuthorize on endpoints | ✔️ 100% |
| Employer-Scoped Queries | Filter by employerOrganization | ✔️ Organization context service | ✔️ 100% |
| Authorization in Create | Validate employerId match | ⚠️ No validation in controller | ⚠️ 50% |
| Authorization in Update | Validate employer ownership | ⚠️ canAccessMember() used | ✔️ 100% |

### Section 8: API Endpoints Compliance

| Endpoint | Contract | Implementation | Compliance |
|----------|----------|----------------|------------|
| POST /api/members | ✔️ | ✔️ | ✔️ 100% |
| PUT /api/members/{id} | ✔️ | ✔️ | ✔️ 100% |
| GET /api/members/{id} | ✔️ | ✔️ | ✔️ 100% |
| GET /api/members | ✔️ | ✔️ | ✔️ 100% |
| DELETE /api/members/{id} | ✔️ | ✔️ | ✔️ 100% |
| GET /api/members/selector | ✔️ | ✔️ | ✔️ 100% |
| GET /api/members/count | ✔️ | ✔️ | ✔️ 100% |
| POST /api/members/{id}/suspend | ✔️ | ❌ | ❌ 0% |
| POST /api/members/{id}/activate | ✔️ | ❌ | ❌ 0% |
| POST /api/members/{id}/terminate | ✔️ | ❌ | ❌ 0% |
| GET /api/members/{id}/eligibility | ✔️ | ❌ | ❌ 0% |
| POST /api/members/{id}/card/block | ✔️ | ❌ | ❌ 0% |
| POST /api/members/{id}/card/activate | ✔️ | ❌ | ❌ 0% |
| GET /api/members (search param) | ✔️ | ✔️ | ✔️ 100% |

---

## 🚨 Critical Gaps Summary

### Priority 1: CRITICAL (Must Fix Before Phase 2)

1. **❌ Status Management Endpoints Missing**
   - Contract Reference: Endpoints 8, 9, 10
   - Impact: Cannot manage member lifecycle (suspend/activate/terminate)
   - Action: Create 3 endpoints + 3 service methods
   - Estimated Effort: 4 hours

2. **❌ Eligibility Calculation Missing**
   - Contract Reference: Eligibility Calculation section + Endpoint 11
   - Impact: Cannot verify member eligibility for services
   - Action: Create calculateEligibility() method with 7-condition logic + endpoint
   - Estimated Effort: 6 hours

3. **❌ Card Management Endpoints Missing**
   - Contract Reference: Endpoints 12, 13
   - Impact: Cannot block/activate member cards
   - Action: Create 2 endpoints + 2 service methods
   - Estimated Effort: 2 hours

4. **❌ Insurance Organization Missing**
   - Contract Reference: Field Registry - Organization, Multi-Organization Linking
   - Impact: Cannot link members to insurance/TPA organizations
   - Action: Add insuranceOrganization field to entity + DTOs
   - Estimated Effort: 3 hours

### Priority 2: HIGH (Fix During Phase 2)

5. **⚠️ Civil ID Validation Missing**
   - Contract Reference: Civil ID Validation section
   - Impact: Invalid civil IDs can be entered
   - Action: Add @Pattern validation + uniqueness constraint + immutability check
   - Estimated Effort: 2 hours

6. **⚠️ Field Normalization Missing (@JsonAlias)**
   - Contract Reference: Field Mapping Rules section
   - Impact: Frontend must use backend field names (no nameAr → fullNameArabic mapping)
   - Action: Add @JsonAlias annotations to all DTOs
   - Estimated Effort: 1 hour

7. **⚠️ Immutability Validation Missing**
   - Contract Reference: Endpoint 2 - "Immutable Fields"
   - Impact: Critical fields (civilId, employerId, cardNumber) can be changed
   - Action: Add validation in updateMember() service method
   - Estimated Effort: 2 hours

8. **⚠️ Status Transition Validation Missing**
   - Contract Reference: Status Lifecycle Management section
   - Impact: Invalid transitions allowed (TERMINATED → ACTIVE)
   - Action: Create validateStatusTransition() with transition matrix
   - Estimated Effort: 3 hours

### Priority 3: MEDIUM (Nice to Have)

9. **⚠️ Card Number in CreateDto**
   - Contract Reference: Auto-Card Generation - "Never accept from user input"
   - Impact: User-provided card numbers could bypass generation
   - Action: Remove cardNumber field from MemberCreateDto
   - Estimated Effort: 0.5 hours

10. **⚠️ Legacy Employer Queries**
    - Contract Reference: Organization Migration
    - Impact: Confusion between old and new queries
    - Action: Mark old methods as @Deprecated
    - Estimated Effort: 0.5 hours

---

## 📝 Action Plan

### Phase 1.5 Completion Checklist

Before proceeding to Phase 2 backend implementation, complete these tasks:

#### Task Group 1: Entity Layer (3 hours)
- [ ] Add `insuranceOrganization` field to Member entity
- [ ] Add `@UniqueConstraint(columnNames = "civil_id")` to @Table
- [ ] Add `@Pattern(regexp = "^[0-9]{12}$")` to civilId field
- [ ] Update @PrePersist to include eligibility calculation

#### Task Group 2: DTOs (2 hours)
- [ ] Remove `cardNumber` from MemberCreateDto
- [ ] Add `insuranceId` to MemberCreateDto
- [ ] Add `insuranceId` to MemberUpdateDto
- [ ] Add `insuranceId`, `insuranceName` to MemberViewDto
- [ ] Add `@JsonAlias({"nameAr"})` to fullNameArabic in all DTOs
- [ ] Add `@JsonAlias({"nameEn"})` to fullNameEnglish in all DTOs
- [ ] Add `@Pattern` for civilId (12 digits) in CreateDto
- [ ] Add `@Pattern` for phone (+965XXXXXXXX) in CreateDto

#### Task Group 3: Repository (1 hour)
- [ ] Add `findByStatusAndEmployerOrganizationId()`
- [ ] Add `findByCardStatusAndEmployerOrganizationId()`
- [ ] Add `findByInsuranceOrganizationId()`
- [ ] Mark legacy employer methods as @Deprecated

#### Task Group 4: Service Layer (10 hours)
- [ ] Create `validateCivilIdFormat(String civilId)` method
- [ ] Create `validateCivilIdUniqueness(String civilId, Long memberId)` method
- [ ] Create `validateImmutableFields(Member existing, MemberUpdateDto dto)` method
- [ ] Create `validateStatusTransition(MemberStatus from, MemberStatus to)` method
- [ ] Create `calculateEligibility(Member member, LocalDate serviceDate)` method
- [ ] Create `suspendMember(Long id, String reason)` method
- [ ] Create `activateMember(Long id)` method
- [ ] Create `terminateMember(Long id)` method
- [ ] Create `checkEligibility(Long id, LocalDate serviceDate)` method
- [ ] Create `blockCard(Long id, String reason)` method
- [ ] Create `activateCard(Long id)` method
- [ ] Update `createMember()` to validate civilId format
- [ ] Update `updateMember()` to validate immutable fields

#### Task Group 5: Controller Layer (4 hours)
- [ ] Add `POST /api/members/{id}/suspend` endpoint
- [ ] Add `POST /api/members/{id}/activate` endpoint
- [ ] Add `POST /api/members/{id}/terminate` endpoint
- [ ] Add `GET /api/members/{id}/eligibility` endpoint
- [ ] Add `POST /api/members/{id}/card/block` endpoint
- [ ] Add `POST /api/members/{id}/card/activate` endpoint
- [ ] Add `status` filter to `GET /api/members` endpoint
- [ ] Add `cardStatus` filter to `GET /api/members` endpoint

#### Task Group 6: Testing (8 hours)
- [ ] Unit test: Card number generation
- [ ] Unit test: Civil ID validation (format + uniqueness)
- [ ] Unit test: Eligibility calculation (all 7 conditions)
- [ ] Unit test: Status transition validation
- [ ] Integration test: Create member with all fields
- [ ] Integration test: Update immutable fields (should fail)
- [ ] Integration test: Suspend → Activate → Terminate flow
- [ ] Integration test: Eligibility check scenarios
- [ ] E2E test: Full member lifecycle

**Total Estimated Effort:** 28 hours

---

## ✅ Contract Compliance Certification

### Before Phase 2 Implementation:

- [ ] **All entity fields match contract** (100% compliance)
- [ ] **All DTOs have @JsonAlias annotations** (field normalization)
- [ ] **All validation rules implemented** (civilId, phone, email)
- [ ] **All status management endpoints created** (suspend/activate/terminate)
- [ ] **Eligibility calculation implemented** (7-condition logic)
- [ ] **Card management endpoints created** (block/activate)
- [ ] **All immutability rules enforced** (civilId, employerId, cardNumber)
- [ ] **Status transition matrix implemented** (forbidden transitions rejected)
- [ ] **Multi-organization linking complete** (employer + insurance)
- [ ] **All repository queries created** (status/cardStatus filtering)
- [ ] **All unit tests passing** (100% coverage for new methods)
- [ ] **All integration tests passing** (CRUD + status + eligibility)

---

## 📊 Compliance Score

| Layer | Current Compliance | Target Compliance | Gap |
|-------|-------------------|-------------------|-----|
| Entity | 80% | 100% | 20% |
| DTOs | 56% | 100% | 44% |
| Repository | 57% | 100% | 43% |
| Service | 33% | 100% | 67% |
| Controller | 50% | 100% | 50% |
| **Overall** | **59%** | **100%** | **41%** |

---

## 🎯 Next Steps

1. **Review this compliance report** with the team
2. **Complete all Phase 1.5 tasks** (28 hours estimated)
3. **Re-run compliance check** (should be 100%)
4. **Proceed to Phase 2** (Backend Implementation)

---

**Golden Rule:** ✅ **Any code that cannot be directly linked to a line in the contract = Do not write it.**

**Contract Version:** 1.0.0  
**Report Date:** 2024-12-29  
**Status:** 🔴 **59% Compliant - Action Required**  
**Next Milestone:** Phase 2 Backend Implementation (after 100% compliance)
