# 📜 Member API Contract Definition

**Phase:** 1 - API Contract Definition (Documentation Only)  
**Status:** 🔴 CRITICAL - Ready for Implementation  
**Date:** 2024-12-29  
**Domain:** Member Management  
**Version:** 1.0.0  
**Priority:** URGENT - Foundation for all medical services, claims, and benefits

---

## 🎯 Purpose

This document defines the **canonical API contract** for the Member domain. It serves as the single source of truth for:
- Field names and their mapping across layers
- Data types and validation rules
- Required vs optional fields
- Auto-card generation rules (WAAD|MEMBER|{SEQUENCE})
- Multi-organization linking (Employer + Insurance)
- Status lifecycle management (ACTIVE → SUSPENDED → TERMINATED)
- Eligibility status calculation
- Benefit policy auto-assignment
- Authorization and data isolation rules
- Error scenarios and handling

**This is Phase 1 - Documentation Only. No code modifications until Phase 2.**

---

## 📐 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend Form (React)                         │
│ nameAr, nameEn, civilId, birthDate, gender, employerId, etc.    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              Service Layer (members.service.js)                  │
│ Normalizes: nameAr → fullNameArabic, nameEn → fullNameEnglish   │
│ Validates: civilId format, email, phone, birthDate              │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Backend DTO (Spring Boot)                      │
│ MemberCreateDto: fullNameArabic, civilId, employerId, etc.      │
│ MemberViewDto: id, cardNumber, fullNameArabic, benefitPolicy   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Entity (JPA/Hibernate)                        │
│ Member: full_name_arabic, civil_id, card_number, employer_org  │
│ Auto-generates: cardNumber, QR code                             │
│ Auto-assigns: benefitPolicy (from active employer policy)       │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                         │
│ members table: id, full_name_arabic, card_number, civil_id     │
│ Constraints: UNIQUE(card_number), UNIQUE(civil_id) if not null │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📋 Field Registry

### 1. Core Personal Information

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Immutable | Owner | Notes |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-----------|-------|-------|
| **Full Name (Arabic)** | `nameAr` | `fullNameArabic` | `fullNameArabic` | `full_name_arabic` | String(200) | ✔ Yes | ❌ No | User | Primary name field |
| **Full Name (English)** | `nameEn` | `fullNameEnglish` | `fullNameEnglish` | `full_name_english` | String(200) | ❌ No | ❌ No | User | Secondary name |
| **Civil ID** | `civilId` | `civilId` | `civilId` | `civil_id` | String(50) | ❌ No | ✔ Yes* | User | Optional but unique if provided |
| **Card Number** | `cardNumber` | `cardNumber` | `cardNumber` | `card_number` | String(50) | ✔ Auto | ✔ Yes | System | Auto-generated BARCODE |
| **Birth Date** | `birthDate` | `birthDate` | `birthDate` | `birth_date` | LocalDate | ✔ Yes | ❌ No | User | Cannot be future date |
| **Gender** | `gender` | `gender` | `gender` | `gender` | Enum(MALE, FEMALE) | ✔ Yes | ❌ No | User | - |
| **Marital Status** | `maritalStatus` | `maritalStatus` | `maritalStatus` | `marital_status` | Enum | ❌ No | ❌ No | User | SINGLE, MARRIED, DIVORCED, WIDOWED |

*Immutable after first set (if not null)

### 2. Contact Information

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Validation |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|------------|
| **Phone** | `phone` | `phone` | `phone` | `phone` | String(20) | ❌ No | @Pattern (international format) |
| **Email** | `email` | `email` | `email` | `email` | String(255) | ❌ No | @Email |
| **Address** | `address` | `address` | `address` | `address` | String(500) | ❌ No | Free text |
| **Nationality** | `nationality` | `nationality` | `nationality` | `nationality` | String(100) | ❌ No | Free text |

### 3. Organization & Policy Links

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Notes |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-------|
| **Employer Organization** | `employerId` | `employerId` | `employerOrganization` | `employer_org_id` | Long (FK) | ✔ Yes | Many-to-One Organization |
| **Insurance Organization** | `insuranceId` | `insuranceId` | `insuranceOrganization` | `insurance_org_id` | Long (FK) | ❌ No | Many-to-One Organization |
| **Benefit Policy** | `benefitPolicyId` | `benefitPolicyId` | `benefitPolicy` | `benefit_policy_id` | Long (FK) | ❌ Auto | Auto-assigned from employer's active policy |

### 4. Employment Information

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Notes |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-------|
| **Employee Number** | `employeeNumber` | `employeeNumber` | `employeeNumber` | `employee_number` | String(100) | ❌ No | Employer-assigned |
| **Join Date** | `joinDate` | `joinDate` | `joinDate` | `join_date` | LocalDate | ❌ No | Employment start |
| **Occupation** | `occupation` | `occupation` | `occupation` | `occupation` | String(100) | ❌ No | Job title |
| **Policy Number** | `policyNumber` | `policyNumber` | `policyNumber` | `policy_number` | String(100) | ❌ No | Insurance policy ref |

### 5. Membership Status

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Default | Lifecycle |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|---------|-----------|
| **Member Status** | `status` | `status` | `status` | `status` | Enum | ✔ Yes | ACTIVE | ACTIVE → SUSPENDED → TERMINATED |
| **Start Date** | `startDate` | `startDate` | `startDate` | `start_date` | LocalDate | ❌ No | - | Membership start |
| **End Date** | `endDate` | `endDate` | `endDate` | `end_date` | LocalDate | ❌ No | - | Membership end |
| **Card Status** | `cardStatus` | `cardStatus` | `cardStatus` | `card_status` | Enum | ✔ Yes | ACTIVE | ACTIVE, BLOCKED, EXPIRED, INACTIVE |
| **Blocked Reason** | `blockedReason` | `blockedReason` | `blockedReason` | `blocked_reason` | String(500) | ❌ No | - | Required if cardStatus=BLOCKED |
| **Active Flag** | `active` | `active` | `active` | `active` | Boolean | ✔ Yes | true | Soft delete flag |

### 6. Eligibility & QR Code

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Owner | Notes |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-------|-------|
| **Eligibility Status** | `eligibilityStatus` | `eligibilityStatus` | `eligibilityStatus` | `eligibility_status` | Boolean | ✔ Yes | System | Auto-calculated |
| **Eligibility Updated At** | `eligibilityUpdatedAt` | `eligibilityUpdatedAt` | `eligibilityUpdatedAt` | `eligibility_updated_at` | LocalDateTime | ❌ Auto | System | Last eligibility check |
| **QR Code Value** | `qrCodeValue` | `qrCodeValue` | `qrCodeValue` | `qr_code_value` | String(100) | ❌ Auto | System | Unique QR code |

### 7. Additional Information

| Field Name (Canonical) | Frontend Name | Backend DTO Name | Entity Property | Database Column | Type | Required | Notes |
|------------------------|---------------|------------------|-----------------|-----------------|------|----------|-------|
| **Photo URL** | `photoUrl` | `photoUrl` | `photoUrl` | `photo_url` | String(500) | ❌ No | Member photo URL |
| **Notes** | `notes` | `notes` | `notes` | `notes` | String(2000) | ❌ No | Admin notes |

### 8. Audit Fields (System-Managed)

| Field Name | Entity Property | Database Column | Type | Required | Immutable | Owner |
|------------|-----------------|-----------------|------|----------|-----------|-------|
| **ID** | `id` | `id` | Long | ✔ Auto | ✔ Yes | System |
| **Created At** | `createdAt` | `created_at` | LocalDateTime | ✔ Auto | ✔ Yes | System |
| **Updated At** | `updatedAt` | `updated_at` | LocalDateTime | ✔ Auto | ❌ No | System |
| **Created By** | `createdBy` | `created_by` | String(100) | ❌ No | ✔ Yes | System |
| **Updated By** | `updatedBy` | `updated_by` | String(100) | ❌ No | ❌ No | System |

---

## 🔄 Field Name Mapping Rules

### Rule 1: Frontend → Backend Transformation

**Pattern:** Frontend uses concise Arabic-friendly names, Backend uses explicit descriptive names

| Frontend Field | Transform Rule | Backend Field | Rationale |
|----------------|----------------|---------------|-----------|
| `nameAr` | Expand to locale | `fullNameArabic` | Explicit locale designation |
| `nameEn` | Expand to locale | `fullNameEnglish` | Explicit locale designation |
| `civilId` | Keep as-is | `civilId` | Standardized term |
| `cardNumber` | Keep as-is | `cardNumber` | Unique identifier |
| `birthDate` | Keep as-is | `birthDate` | Standard date field |
| `employerId` | Keep as-is | `employerId` | Foreign key reference |

### Rule 2: Backend DTO → Entity Mapping

**Pattern:** DTO uses business names, Entity uses database-aligned names

| Backend DTO Field | Transform Rule | Entity Field | Database Column |
|-------------------|----------------|--------------|-----------------|
| `fullNameArabic` | Direct map | `fullNameArabic` | `full_name_arabic` |
| `fullNameEnglish` | Direct map | `fullNameEnglish` | `full_name_english` |
| `civilId` | Direct map | `civilId` | `civil_id` |
| `cardNumber` | Direct map | `cardNumber` | `card_number` |
| `employerId` | Resolve to entity | `employerOrganization` | `employer_org_id` |
| `insuranceId` | Resolve to entity | `insuranceOrganization` | `insurance_org_id` |
| `benefitPolicyId` | Resolve to entity | `benefitPolicy` | `benefit_policy_id` |

### Rule 3: Response Transformation (Backend → Frontend)

**Pattern:** Flatten nested objects for frontend consumption

| Entity/Nested Object | Backend Response | Frontend Field | Notes |
|----------------------|------------------|----------------|-------|
| `employerOrganization.id` | `employerId` | `employerId` | Flatten FK |
| `employerOrganization.name` | `employerName` | `employerName` | Include denormalized name |
| `benefitPolicy.id` | `benefitPolicyId` | `benefitPolicyId` | Flatten FK |
| `benefitPolicy.name` | `benefitPolicyName` | `policyName` | Include policy name |
| `benefitPolicy.status` | `benefitPolicyStatus` | `policyStatus` | Include policy status |

---

## 🔢 Auto-Card Generation

### Card Number Format

```
Pattern: WAAD|MEMBER|{TIMESTAMP}{RANDOM}
Example: WAAD|MEMBER|1735234859123

Components:
- Prefix: "WAAD|MEMBER|" (fixed)
- Timestamp: Last 9 digits of System.currentTimeMillis()
- Random: 4-digit random number (1000-9999)

Total Length: ~25 characters
```

### Generation Logic

```java
public static String generateCardNumber() {
    long timestamp = System.currentTimeMillis();
    String timeSuffix = String.valueOf(timestamp)
        .substring(String.valueOf(timestamp).length() - 9);
    int random = (int) (Math.random() * 9000) + 1000;
    return "WAAD|MEMBER|" + timeSuffix + random;
}
```

### Uniqueness Enforcement

1. **Database Constraint:** `UNIQUE(card_number)` on members table
2. **Pre-Insert Validation:** Check for duplicates before insertion
3. **Retry Logic:** If collision detected (extremely rare), regenerate and retry (max 3 attempts)
4. **Audit Trail:** Log all card number generations

### Card Number Rules

- ✔ **System-Generated:** Always auto-generated on member creation
- ✔ **Immutable:** Cannot be changed after creation
- ✔ **Mandatory:** Cannot be null or empty
- ✔ **Unique:** Enforced at database level
- ❌ **User-Provided:** Never accept card number from user input (ignore if provided)

---

## 🔐 Civil ID Validation

### Civil ID Rules

- **Format:** 12 digits (Kuwait standard)
- **Pattern:** `^[0-9]{12}$`
- **Uniqueness:** UNIQUE constraint if not null
- **Optional:** Can be null/empty
- **Immutable:** Once set (not null), cannot be changed
- **Validation:** Check format, check uniqueness

### Validation Logic

```java
@Pattern(regexp = "^[0-9]{12}$", message = "Civil ID must be exactly 12 digits")
private String civilId;

// Service layer validation
if (civilId != null && !civilId.isEmpty()) {
    validateCivilIdFormat(civilId);
    validateCivilIdUniqueness(civilId, memberId);
}
```

### Error Scenarios

| Scenario | HTTP Code | Error Message (Arabic) | Error Message (English) |
|----------|-----------|------------------------|------------------------|
| Invalid format | 400 | الرقم المدني يجب أن يتكون من 12 رقماً | Civil ID must be exactly 12 digits |
| Already exists | 409 | الرقم المدني مستخدم بالفعل | Civil ID already exists |
| Change attempt (immutable) | 400 | لا يمكن تعديل الرقم المدني بعد الإدخال | Civil ID cannot be changed after creation |

---

## 🏢 Multi-Organization Linking

### Organization Relationships

```
Member
  ├─► Employer Organization (REQUIRED)
  │    - employerOrganization: Organization (type=EMPLOYER)
  │    - Determines which employer the member works for
  │    - Used for data isolation (Employer-scoped access)
  │
  └─► Insurance Organization (OPTIONAL)
       - insuranceOrganization: Organization (type=INSURANCE/TPA)
       - Determines which TPA manages the member's claims
       - Can be null (defaults to employer's insurance org)
```

### Validation Rules

1. **Employer Organization (Required)**
   - Must exist in database
   - Must have `type = EMPLOYER`
   - Must be active (`active = true`)
   - Cannot be changed after creation (immutable)

2. **Insurance Organization (Optional)**
   - If provided, must exist in database
   - Must have `type IN (INSURANCE, TPA)`
   - Must be active (`active = true`)
   - Can be changed during updates

### Auto-Assignment Logic

```java
// On Member Creation:
1. Validate employerId exists and is active
2. Resolve employerOrganization from employerId
3. If insuranceId not provided:
   - Use employer's default insurance organization
   - OR leave null (TPA manages all by default)
4. If insuranceId provided:
   - Validate and resolve insuranceOrganization
```

---

## 🎯 Benefit Policy Auto-Assignment

### Assignment Rules

When a member is created:

1. **Query Active Policy:**
   ```sql
   SELECT * FROM benefit_policies
   WHERE employer_org_id = {member.employerOrgId}
     AND status = 'ACTIVE'
     AND start_date <= CURRENT_DATE
     AND end_date >= CURRENT_DATE
     AND active = true
   LIMIT 1
   ```

2. **Assign to Member:**
   - If found: Set `member.benefitPolicy = activeBenefitPolicy`
   - If not found: Leave `member.benefitPolicy = null` (member has no coverage)

3. **Validation:**
   - Warn if no active policy found (member has no coverage)
   - Log policy assignment for audit trail

### Policy Change Scenarios

| Scenario | Action | Notes |
|----------|--------|-------|
| New member created | Auto-assign employer's active policy | If exists |
| Policy expires | Member keeps expired policy | Admin must manually update |
| New policy activated | Existing members NOT auto-updated | Admin must bulk-update members |
| Member transferred to new employer | Re-assign new employer's active policy | On employer change |

---

## 📊 Status Lifecycle Management

### Member Status Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    Member Status Lifecycle                    │
└──────────────────────────────────────────────────────────────┘

    PENDING
       │
       │ (Admin Approval)
       ▼
    ACTIVE ◄────────────────┐
       │                    │
       │ (Violation/Policy) │ (Reinstatement)
       ▼                    │
   SUSPENDED ───────────────┘
       │
       │ (Contract End/Termination)
       ▼
   TERMINATED
```

### Status Transition Rules

| From | To | Allowed? | Condition | Reversible? |
|------|-----|----------|-----------|-------------|
| PENDING | ACTIVE | ✔ Yes | Admin approval | ❌ No |
| ACTIVE | SUSPENDED | ✔ Yes | Violation, non-payment | ✔ Yes (reinstatement) |
| ACTIVE | TERMINATED | ✔ Yes | Contract end, resignation | ❌ No |
| SUSPENDED | ACTIVE | ✔ Yes | Issue resolved | ✔ Yes |
| SUSPENDED | TERMINATED | ✔ Yes | Prolonged suspension | ❌ No |
| TERMINATED | ACTIVE | ❌ No | Cannot reactivate terminated | ❌ No |
| TERMINATED | SUSPENDED | ❌ No | Invalid transition | ❌ No |

### Card Status Lifecycle

```
    ACTIVE
       │
       ├─► BLOCKED (temporary - fraud, lost card)
       │      │
       │      └─► ACTIVE (reactivation)
       │
       ├─► INACTIVE (temporary - pending renewal)
       │      │
       │      └─► ACTIVE (renewal)
       │
       └─► EXPIRED (permanent - membership ended)
```

### Card Status Rules

| Card Status | Can Access Services? | Can Update? | Notes |
|-------------|---------------------|-------------|-------|
| ACTIVE | ✔ Yes | ✔ Yes | Normal operation |
| BLOCKED | ❌ No | ✔ Yes (Admin) | Temporary block (fraud, lost) |
| INACTIVE | ❌ No | ✔ Yes (Admin) | Pending renewal |
| EXPIRED | ❌ No | ❌ No (Read-only) | Membership ended |

---

## ✅ Eligibility Status Calculation

### Eligibility Rules

A member is **ELIGIBLE** if ALL conditions are met:

```
✔ member.active = true
✔ member.status = ACTIVE
✔ member.cardStatus = ACTIVE
✔ member.benefitPolicy != null
✔ member.benefitPolicy.status = ACTIVE
✔ member.benefitPolicy.isEffectiveOn(serviceDate)
✔ member.employerOrganization.active = true
```

### Calculation Triggers

Eligibility status is recalculated on:

1. **Member Creation** - Initial eligibility check
2. **Member Update** - Status/card status change
3. **Policy Assignment** - Benefit policy linked/changed
4. **Policy Expiry** - Active policy becomes expired
5. **Service Request** - Before authorizing any medical service
6. **Scheduled Job** - Daily eligibility re-check (all members)

### Calculation Logic

```java
public boolean calculateEligibility(Member member, LocalDate serviceDate) {
    // 1. Member must be active
    if (!member.getActive() || member.getStatus() != MemberStatus.ACTIVE) {
        return false;
    }
    
    // 2. Card must be active
    if (member.getCardStatus() != CardStatus.ACTIVE) {
        return false;
    }
    
    // 3. Must have a benefit policy
    if (member.getBenefitPolicy() == null) {
        return false;
    }
    
    // 4. Policy must be active and effective on service date
    BenefitPolicy policy = member.getBenefitPolicy();
    if (policy.getStatus() != BenefitPolicyStatus.ACTIVE) {
        return false;
    }
    
    if (!policy.isEffectiveOn(serviceDate)) {
        return false;
    }
    
    // 5. Employer organization must be active
    if (!member.getEmployerOrganization().isActive()) {
        return false;
    }
    
    // All checks passed
    return true;
}
```

### Eligibility Response

```json
{
  "memberId": 123,
  "cardNumber": "WAAD|MEMBER|1735234859123",
  "eligible": true,
  "eligibilityStatus": "ELIGIBLE",
  "eligibilityCheckedAt": "2024-12-29T10:30:00",
  "benefitPolicy": {
    "id": 5,
    "name": "Gold Coverage",
    "status": "ACTIVE",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "ineligibilityReasons": []
}
```

### Ineligibility Reasons

If `eligible = false`, include reasons:

| Reason Code | Arabic Message | English Message |
|-------------|----------------|-----------------|
| MEMBER_INACTIVE | العضو غير نشط | Member is inactive |
| MEMBER_SUSPENDED | العضو موقوف | Member is suspended |
| CARD_BLOCKED | البطاقة محظورة | Card is blocked |
| CARD_EXPIRED | البطاقة منتهية الصلاحية | Card has expired |
| NO_POLICY | لا توجد وثيقة تأمينية | No benefit policy assigned |
| POLICY_EXPIRED | وثيقة التأمين منتهية الصلاحية | Benefit policy has expired |
| POLICY_NOT_STARTED | وثيقة التأمين لم تبدأ بعد | Benefit policy not yet effective |
| EMPLOYER_INACTIVE | صاحب العمل غير نشط | Employer is inactive |

---

## 🔒 Authorization & Data Isolation

### Role-Based Access Control

| Role | Create | Read | Update | Delete | Scope |
|------|--------|------|--------|--------|-------|
| **SUPER_ADMIN** | ✔ All | ✔ All | ✔ All | ✔ All | Global (all employers) |
| **EMPLOYER_ADMIN** | ✔ Own | ✔ Own | ✔ Own | ✔ Own | Employer-scoped (employerId) |
| **TPA_ADMIN** | ❌ No | ✔ All | ✔ Limited* | ❌ No | Global (read-only, limited updates) |
| **PROVIDER** | ❌ No | ✔ Limited** | ❌ No | ❌ No | Read-only (for service requests) |

*TPA_ADMIN can update: eligibilityStatus, cardStatus, notes (claims-related fields only)  
**PROVIDER can read: Basic info only (name, card number, eligibility status)

### Employer-Scoped Data Isolation

All employer users (EMPLOYER_ADMIN) can only access members where:

```sql
member.employer_org_id = currentUser.employerId
```

**Enforcement:**
- Applied at service layer (before query execution)
- Enforced in repository queries (WHERE clause)
- Validated in authorization checks (PreAuthorize)

### Authorization Examples

```java
// EMPLOYER_ADMIN creating member
@PreAuthorize("hasRole('EMPLOYER_ADMIN')")
public MemberViewDto createMember(MemberCreateDto dto) {
    // Validate: dto.employerId == currentUser.employerId
    if (!dto.getEmployerId().equals(getCurrentUser().getEmployerId())) {
        throw new UnauthorizedException("Cannot create member for different employer");
    }
    // Proceed with creation...
}

// EMPLOYER_ADMIN listing members
@PreAuthorize("hasRole('EMPLOYER_ADMIN')")
public Page<MemberViewDto> listMembers(Long employerId, Pageable page) {
    // Validate: employerId == currentUser.employerId
    if (!employerId.equals(getCurrentUser().getEmployerId())) {
        throw new UnauthorizedException("Cannot list members of different employer");
    }
    // Proceed with query...
}

// TPA_ADMIN read-only access
@PreAuthorize("hasRole('TPA_ADMIN')")
public MemberViewDto getMember(Long memberId) {
    // TPA can read any member (no employer restriction)
    return memberService.getMember(memberId);
}
```

---

## 📡 API Endpoints

### Base URL

```
/api/members
```

### Endpoint Summary

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/members` | Create new member | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| PUT | `/api/members/{id}` | Update member | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| GET | `/api/members/{id}` | Get member by ID | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN, TPA_ADMIN |
| GET | `/api/members` | List members | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN, TPA_ADMIN |
| DELETE | `/api/members/{id}` | Soft delete member | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| GET | `/api/members/selector` | Dropdown options | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| GET | `/api/members/count` | Total count | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| POST | `/api/members/{id}/suspend` | Suspend member | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| POST | `/api/members/{id}/activate` | Activate member | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| POST | `/api/members/{id}/terminate` | Terminate member | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| GET | `/api/members/{id}/eligibility` | Check eligibility | ✔ Yes | All roles |
| POST | `/api/members/{id}/card/block` | Block card | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |
| POST | `/api/members/{id}/card/activate` | Activate card | ✔ Yes | EMPLOYER_ADMIN, SUPER_ADMIN |

---

### 1. Create Member

**Endpoint:** `POST /api/members`

**Request Headers:**
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullNameArabic": "أحمد محمد علي",
  "fullNameEnglish": "Ahmed Mohammed Ali",
  "civilId": "289123456789",
  "birthDate": "1990-01-15",
  "gender": "MALE",
  "maritalStatus": "MARRIED",
  "phone": "+96512345678",
  "email": "ahmed@example.com",
  "address": "Block 5, Street 10, House 25, Kuwait",
  "nationality": "Kuwaiti",
  "employerId": 1,
  "insuranceId": 2,
  "employeeNumber": "EMP-001",
  "joinDate": "2024-01-01",
  "occupation": "Software Engineer",
  "policyNumber": "POL-2024-001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "تم إنشاء العضو بنجاح",
  "data": {
    "id": 123,
    "cardNumber": "WAAD|MEMBER|1735234859123",
    "fullNameArabic": "أحمد محمد علي",
    "fullNameEnglish": "Ahmed Mohammed Ali",
    "civilId": "289123456789",
    "birthDate": "1990-01-15",
    "gender": "MALE",
    "maritalStatus": "MARRIED",
    "phone": "+96512345678",
    "email": "ahmed@example.com",
    "employerId": 1,
    "employerName": "شركة الواحة",
    "insuranceId": 2,
    "insuranceName": "واعد للتأمين",
    "benefitPolicyId": 5,
    "benefitPolicyName": "Gold Coverage",
    "benefitPolicyStatus": "ACTIVE",
    "status": "ACTIVE",
    "cardStatus": "ACTIVE",
    "eligibilityStatus": true,
    "qrCodeValue": "QR-WAAD-MEMBER-123",
    "active": true,
    "createdAt": "2024-12-29T10:30:00",
    "updatedAt": "2024-12-29T10:30:00"
  }
}
```

**Validation Rules:**
- `fullNameArabic`: Required, 1-200 chars
- `birthDate`: Required, cannot be future date, age >= 0 and <= 150
- `gender`: Required, must be MALE or FEMALE
- `employerId`: Required, must exist and be active
- `civilId`: Optional, must be 12 digits if provided, must be unique
- `email`: Optional, must be valid email format
- `phone`: Optional, must match international format (+965XXXXXXXX)

---

### 2. Update Member

**Endpoint:** `PUT /api/members/{id}`

**Request Body:**
```json
{
  "fullNameArabic": "أحمد محمد علي السالم",
  "fullNameEnglish": "Ahmed Mohammed Ali Al-Salem",
  "phone": "+96512345679",
  "email": "ahmed.new@example.com",
  "address": "New Address",
  "maritalStatus": "MARRIED",
  "occupation": "Senior Software Engineer",
  "insuranceId": 3,
  "benefitPolicyId": 7
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "تم تحديث العضو بنجاح",
  "data": {
    "id": 123,
    "cardNumber": "WAAD|MEMBER|1735234859123",
    "fullNameArabic": "أحمد محمد علي السالم",
    "fullNameEnglish": "Ahmed Mohammed Ali Al-Salem",
    "phone": "+96512345679",
    "email": "ahmed.new@example.com",
    "updatedAt": "2024-12-29T11:00:00"
  }
}
```

**Immutable Fields (Cannot be Updated):**
- `id` - System-generated
- `cardNumber` - Auto-generated, immutable
- `civilId` - Immutable once set (if not null)
- `employerId` - Immutable (cannot transfer employer)
- `createdAt` - System timestamp
- `createdBy` - System audit

**Validation Rules:**
- Cannot change `civilId` if already set
- Cannot change `employerId` (employer transfer requires special process)
- Cannot change `cardNumber` (immutable)
- Can update `insuranceId` (if different insurance org)
- Can update `benefitPolicyId` (if different policy)

---

### 3. Get Member by ID

**Endpoint:** `GET /api/members/{id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "cardNumber": "WAAD|MEMBER|1735234859123",
    "fullNameArabic": "أحمد محمد علي",
    "fullNameEnglish": "Ahmed Mohammed Ali",
    "civilId": "289123456789",
    "birthDate": "1990-01-15",
    "gender": "MALE",
    "maritalStatus": "MARRIED",
    "phone": "+96512345678",
    "email": "ahmed@example.com",
    "address": "Block 5, Street 10, House 25, Kuwait",
    "nationality": "Kuwaiti",
    "employerId": 1,
    "employerName": "شركة الواحة",
    "employerCode": "EMP-01",
    "insuranceId": 2,
    "insuranceName": "واعد للتأمين",
    "benefitPolicyId": 5,
    "benefitPolicyName": "Gold Coverage",
    "benefitPolicyCode": "POL-2024-001",
    "benefitPolicyStatus": "ACTIVE",
    "benefitPolicyStartDate": "2024-01-01",
    "benefitPolicyEndDate": "2024-12-31",
    "employeeNumber": "EMP-001",
    "joinDate": "2024-01-01",
    "occupation": "Software Engineer",
    "policyNumber": "POL-2024-001",
    "status": "ACTIVE",
    "startDate": "2024-01-01",
    "endDate": null,
    "cardStatus": "ACTIVE",
    "blockedReason": null,
    "eligibilityStatus": true,
    "eligibilityUpdatedAt": "2024-12-29T10:30:00",
    "qrCodeValue": "QR-WAAD-MEMBER-123",
    "photoUrl": null,
    "notes": null,
    "active": true,
    "createdAt": "2024-12-29T10:30:00",
    "updatedAt": "2024-12-29T10:30:00",
    "createdBy": "admin@waad.com",
    "updatedBy": "admin@waad.com"
  }
}
```

---

### 4. List Members (Paginated)

**Endpoint:** `GET /api/members`

**Query Parameters:**
- `employerId` (required for EMPLOYER_ADMIN): Filter by employer
- `search` (optional): Search by name, card number, civil ID
- `status` (optional): Filter by member status (ACTIVE, SUSPENDED, TERMINATED)
- `cardStatus` (optional): Filter by card status
- `page` (optional, default=0): Page number
- `size` (optional, default=20): Page size
- `sort` (optional, default=id,desc): Sort field and direction

**Example Request:**
```http
GET /api/members?employerId=1&search=أحمد&status=ACTIVE&page=0&size=20&sort=createdAt,desc
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 123,
        "cardNumber": "WAAD|MEMBER|1735234859123",
        "fullNameArabic": "أحمد محمد علي",
        "fullNameEnglish": "Ahmed Mohammed Ali",
        "civilId": "289123456789",
        "employerId": 1,
        "employerName": "شركة الواحة",
        "status": "ACTIVE",
        "cardStatus": "ACTIVE",
        "eligibilityStatus": true,
        "createdAt": "2024-12-29T10:30:00"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 20,
      "sort": {
        "sorted": true,
        "unsorted": false
      }
    },
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true,
    "numberOfElements": 1
  }
}
```

---

### 5. Soft Delete Member

**Endpoint:** `DELETE /api/members/{id}`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "تم حذف العضو بنجاح"
}
```

**Behavior:**
- Sets `active = false` (soft delete)
- Sets `status = TERMINATED`
- Sets `cardStatus = EXPIRED`
- Sets `eligibilityStatus = false`
- Preserves all data (not physical delete)

---

### 6. Suspend Member

**Endpoint:** `POST /api/members/{id}/suspend`

**Request Body:**
```json
{
  "reason": "Non-payment of insurance premium"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "تم تعليق العضو بنجاح",
  "data": {
    "id": 123,
    "status": "SUSPENDED",
    "cardStatus": "BLOCKED",
    "blockedReason": "Non-payment of insurance premium",
    "eligibilityStatus": false
  }
}
```

**Business Rules:**
- Can only suspend if `status = ACTIVE`
- Automatically sets `cardStatus = BLOCKED`
- Sets `eligibilityStatus = false`
- Requires `reason` (mandatory)

---

### 7. Activate Member

**Endpoint:** `POST /api/members/{id}/activate`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "تم تفعيل العضو بنجاح",
  "data": {
    "id": 123,
    "status": "ACTIVE",
    "cardStatus": "ACTIVE",
    "blockedReason": null,
    "eligibilityStatus": true
  }
}
```

**Business Rules:**
- Can activate from `SUSPENDED` or `PENDING`
- Cannot activate from `TERMINATED`
- Automatically sets `cardStatus = ACTIVE`
- Recalculates `eligibilityStatus`
- Clears `blockedReason`

---

### 8. Check Eligibility

**Endpoint:** `GET /api/members/{id}/eligibility`

**Query Parameters:**
- `serviceDate` (optional, default=today): Date to check eligibility

**Example Request:**
```http
GET /api/members/123/eligibility?serviceDate=2024-12-29
```

**Response (200 OK) - Eligible:**
```json
{
  "success": true,
  "data": {
    "memberId": 123,
    "cardNumber": "WAAD|MEMBER|1735234859123",
    "fullNameArabic": "أحمد محمد علي",
    "eligible": true,
    "eligibilityStatus": "ELIGIBLE",
    "eligibilityCheckedAt": "2024-12-29T10:30:00",
    "serviceDate": "2024-12-29",
    "memberStatus": "ACTIVE",
    "cardStatus": "ACTIVE",
    "benefitPolicy": {
      "id": 5,
      "name": "Gold Coverage",
      "code": "POL-2024-001",
      "status": "ACTIVE",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    },
    "employer": {
      "id": 1,
      "name": "شركة الواحة",
      "code": "EMP-01",
      "active": true
    },
    "ineligibilityReasons": []
  }
}
```

**Response (200 OK) - Not Eligible:**
```json
{
  "success": true,
  "data": {
    "memberId": 123,
    "cardNumber": "WAAD|MEMBER|1735234859123",
    "fullNameArabic": "أحمد محمد علي",
    "eligible": false,
    "eligibilityStatus": "NOT_ELIGIBLE",
    "eligibilityCheckedAt": "2024-12-29T10:30:00",
    "serviceDate": "2024-12-29",
    "memberStatus": "SUSPENDED",
    "cardStatus": "BLOCKED",
    "benefitPolicy": null,
    "employer": {
      "id": 1,
      "name": "شركة الواحة",
      "code": "EMP-01",
      "active": true
    },
    "ineligibilityReasons": [
      {
        "code": "MEMBER_SUSPENDED",
        "messageAr": "العضو موقوف",
        "messageEn": "Member is suspended"
      },
      {
        "code": "CARD_BLOCKED",
        "messageAr": "البطاقة محظورة",
        "messageEn": "Card is blocked"
      },
      {
        "code": "NO_POLICY",
        "messageAr": "لا توجد وثيقة تأمينية",
        "messageEn": "No benefit policy assigned"
      }
    ]
  }
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Scenario | Arabic Message | English Message |
|------|----------|----------------|-----------------|
| 400 | Invalid field format | حقل غير صحيح | Invalid field format |
| 400 | Missing required field | حقل مطلوب مفقود | Required field is missing |
| 400 | Invalid date (future birth date) | تاريخ الميلاد لا يمكن أن يكون في المستقبل | Birth date cannot be in the future |
| 400 | Invalid civil ID format | الرقم المدني يجب أن يتكون من 12 رقماً | Civil ID must be exactly 12 digits |
| 400 | Civil ID change attempt | لا يمكن تعديل الرقم المدني بعد الإدخال | Civil ID cannot be changed |
| 400 | Employer change attempt | لا يمكن تغيير صاحب العمل | Employer cannot be changed |
| 401 | No authentication token | الرجاء تسجيل الدخول | Please log in |
| 403 | Insufficient permissions | ليس لديك صلاحية للوصول | Insufficient permissions |
| 403 | Employer mismatch | لا يمكنك الوصول لبيانات صاحب عمل آخر | Cannot access data of different employer |
| 404 | Member not found | العضو غير موجود | Member not found |
| 404 | Employer not found | صاحب العمل غير موجود | Employer not found |
| 404 | Benefit policy not found | وثيقة التأمين غير موجودة | Benefit policy not found |
| 409 | Card number already exists | رقم البطاقة مستخدم بالفعل | Card number already exists |
| 409 | Civil ID already exists | الرقم المدني مستخدم بالفعل | Civil ID already exists |
| 409 | Invalid status transition | لا يمكن تغيير الحالة من {from} إلى {to} | Cannot change status from {from} to {to} |
| 500 | Database error | خطأ في الخادم | Internal server error |
| 500 | Card generation failure | فشل في توليد رقم البطاقة | Failed to generate card number |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "CIVIL_ID_ALREADY_EXISTS",
    "message": "الرقم المدني مستخدم بالفعل",
    "messageEn": "Civil ID already exists",
    "timestamp": "2024-12-29T10:30:00",
    "path": "/api/members",
    "details": {
      "civilId": "289123456789",
      "existingMemberId": 45
    }
  }
}
```

### Field Validation Errors

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "خطأ في التحقق من البيانات",
    "messageEn": "Validation error",
    "timestamp": "2024-12-29T10:30:00",
    "path": "/api/members",
    "fieldErrors": [
      {
        "field": "fullNameArabic",
        "messageAr": "الاسم الكامل بالعربية مطلوب",
        "messageEn": "Full name in Arabic is required",
        "rejectedValue": null
      },
      {
        "field": "birthDate",
        "messageAr": "تاريخ الميلاد مطلوب",
        "messageEn": "Birth date is required",
        "rejectedValue": null
      },
      {
        "field": "civilId",
        "messageAr": "الرقم المدني يجب أن يتكون من 12 رقماً",
        "messageEn": "Civil ID must be exactly 12 digits",
        "rejectedValue": "123"
      }
    ]
  }
}
```

---

## 📝 Audit Trail & Logging

### Audit Trail Fields

All member operations are tracked with:

| Field | Description | Type | Auto-Managed |
|-------|-------------|------|--------------|
| `createdAt` | Member creation timestamp | LocalDateTime | ✔ Yes |
| `createdBy` | User who created the member | String(100) | ✔ Yes |
| `updatedAt` | Last update timestamp | LocalDateTime | ✔ Yes |
| `updatedBy` | User who last updated the member | String(100) | ✔ Yes |

### Logging Events

| Event | Log Level | Message Template | Context |
|-------|-----------|------------------|---------|
| Member created | INFO | "Member created: id={}, cardNumber={}, employerId={}" | id, cardNumber, employerId |
| Member updated | INFO | "Member updated: id={}, changes={}" | id, changed fields |
| Member deleted (soft) | WARN | "Member soft deleted: id={}, cardNumber={}" | id, cardNumber |
| Member suspended | WARN | "Member suspended: id={}, reason={}" | id, reason |
| Member activated | INFO | "Member activated: id={}" | id |
| Member terminated | WARN | "Member terminated: id={}" | id |
| Card generated | INFO | "Card number generated: {}" | cardNumber |
| Card blocked | WARN | "Card blocked: memberId={}, reason={}" | memberId, reason |
| Eligibility checked | DEBUG | "Eligibility checked: memberId={}, eligible={}" | memberId, eligible |
| Benefit policy assigned | INFO | "Benefit policy assigned: memberId={}, policyId={}" | memberId, policyId |
| Civil ID conflict | ERROR | "Civil ID already exists: civilId={}, existingMemberId={}" | civilId, existingMemberId |
| Validation error | WARN | "Validation failed: field={}, error={}" | field, error |
| Authorization denied | ERROR | "Access denied: userId={}, employerId={}, requestedEmployerId={}" | userId, employerId, requestedEmployerId |

### Log Format

```
[TIMESTAMP] [LEVEL] [com.waad.tba.modules.member.service.MemberService] - [EVENT] - [DETAILS]

Examples:
[2024-12-29 10:30:00] [INFO] [MemberService] - Member created: id=123, cardNumber=WAAD|MEMBER|1735234859123, employerId=1
[2024-12-29 10:35:00] [WARN] [MemberService] - Member suspended: id=123, reason=Non-payment
[2024-12-29 10:40:00] [ERROR] [MemberService] - Civil ID already exists: civilId=289123456789, existingMemberId=45
```

---

## 🧪 Testing Scenarios

### Unit Tests

1. **Card Number Generation**
   - Test format: `WAAD|MEMBER|{TIMESTAMP}{RANDOM}`
   - Test uniqueness (simulate collisions)
   - Test retry logic (max 3 attempts)

2. **Civil ID Validation**
   - Test format validation (12 digits)
   - Test uniqueness check
   - Test immutability (cannot change)

3. **Eligibility Calculation**
   - Test all eligibility conditions
   - Test ineligibility reasons
   - Test edge cases (expired policy, inactive employer)

4. **Status Transitions**
   - Test allowed transitions
   - Test forbidden transitions
   - Test status validation

### Integration Tests

1. **Create Member Flow**
   - Create with all fields
   - Create with minimal fields
   - Create with invalid employerId (404)
   - Create with duplicate civilId (409)

2. **Update Member Flow**
   - Update allowed fields
   - Attempt to update immutable fields (400)
   - Update with employer mismatch (403)

3. **Benefit Policy Auto-Assignment**
   - Create member → policy auto-assigned
   - Create member with no active policy → null policy
   - Update employer → policy reassigned

4. **Eligibility Check**
   - Eligible member on valid date
   - Ineligible (suspended) member
   - Ineligible (no policy) member
   - Ineligible (expired policy) member

### End-to-End Tests

1. **Full Member Lifecycle**
   - Create → Activate → Suspend → Reactivate → Terminate
   - Verify status at each step
   - Verify eligibility at each step

2. **Authorization Tests**
   - EMPLOYER_ADMIN creates member for own employer
   - EMPLOYER_ADMIN attempts to create for different employer (403)
   - TPA_ADMIN reads member (allowed)
   - TPA_ADMIN attempts to create member (403)

---

## 📚 Dependencies & Relations

### Entity Relationships

```
Member
  ├─► Organization (employerOrganization) [Many-to-One] REQUIRED
  ├─► Organization (insuranceOrganization) [Many-to-One] OPTIONAL
  ├─► BenefitPolicy [Many-to-One] OPTIONAL (auto-assigned)
  ├─► Visit [One-to-Many]
  ├─► Claim [One-to-Many]
  ├─► PreAuthorization [One-to-Many]
  ├─► MemberAttribute [One-to-Many] CASCADE
  └─► FamilyMember [One-to-Many] CASCADE
```

### Required Services

| Service | Purpose | Dependency |
|---------|---------|------------|
| OrganizationService | Resolve employer/insurance orgs | Required |
| BenefitPolicyService | Auto-assign active policy | Required |
| CardNumberGenerator | Generate unique card numbers | Required |
| EligibilityService | Calculate eligibility status | Required |
| AuthorizationService | Validate user permissions | Required |
| AuditLogService | Log all member operations | Required |

---

## 🚀 Phase 2: Backend Implementation Checklist

### DTO Enhancements
- [ ] Add @JsonAlias annotations for field normalization
- [ ] Add @JsonProperty for response field renaming
- [ ] Add comprehensive validation annotations
- [ ] Add civil ID pattern validation
- [ ] Add phone/email validation

### Service Layer
- [ ] Implement card number generation logic
- [ ] Implement civil ID uniqueness validation
- [ ] Implement benefit policy auto-assignment
- [ ] Implement eligibility calculation
- [ ] Implement status transition validation
- [ ] Implement multi-org linking validation
- [ ] Implement employer-scoped data isolation
- [ ] Implement comprehensive logging

### Repository Layer
- [ ] Add findByCardNumber() query
- [ ] Add findByCivilId() query
- [ ] Add findByEmployerOrgId() query
- [ ] Add existsByCivilId() query
- [ ] Add custom queries with employer filtering

### Controller Layer
- [ ] Implement @PreAuthorize for all endpoints
- [ ] Implement employer-scoped validation
- [ ] Implement pagination for list endpoint
- [ ] Implement search/filter functionality
- [ ] Implement status change endpoints (suspend/activate/terminate)
- [ ] Implement card management endpoints (block/activate)

### Testing
- [ ] Unit tests for card generation
- [ ] Unit tests for eligibility calculation
- [ ] Integration tests for CRUD operations
- [ ] Integration tests for status transitions
- [ ] End-to-end tests for full lifecycle
- [ ] Authorization tests

---

## 🎯 Phase 3: Frontend Service Layer Checklist

### Service Layer (members.service.js)
- [ ] Implement normalizeMemberRequest()
- [ ] Implement normalizeMemberResponse()
- [ ] Implement handleMemberErrors()
- [ ] Implement client-side validation
- [ ] Implement createMember()
- [ ] Implement updateMember()
- [ ] Implement getMemberById()
- [ ] Implement getMembers() with filters
- [ ] Implement deleteMember()
- [ ] Implement suspendMember()
- [ ] Implement activateMember()
- [ ] Implement terminateMember()
- [ ] Implement checkEligibility()
- [ ] Implement blockCard()
- [ ] Implement activateCard()

### Frontend Components
- [ ] MemberCreate.jsx - use new service layer
- [ ] MemberEdit.jsx - use new service layer
- [ ] MembersList.jsx - use new service layer
- [ ] MemberDetails.jsx - display full member info
- [ ] EligibilityCheck.jsx - check eligibility

---

## 📄 Contract Compliance

This contract defines the **complete specification** for Member domain implementation. All phases must strictly adhere to:

✅ **Field Naming:** Frontend ↔ Backend normalization rules  
✅ **Validation:** All validation rules defined in registry  
✅ **Auto-Generation:** Card number generation pattern  
✅ **Authorization:** Role-based access and employer-scoping  
✅ **Status Lifecycle:** Allowed transitions and business rules  
✅ **Eligibility:** Calculation logic and rules  
✅ **Error Handling:** Standardized error responses  
✅ **Audit Trail:** Comprehensive logging and tracking  

---

**Contract Version:** 1.0.0  
**Date:** 2024-12-29  
**Status:** ✅ Ready for Phase 2 Implementation  
**Next Phase:** Backend Implementation (Phase 2)  

**For Reference Implementation, see:**
- [EMPLOYER_API_CONTRACT.md](EMPLOYER_API_CONTRACT.md) - Organization/Employer contract
- [PHASE-2-EMPLOYER-IMPLEMENTATION-REPORT.md](PHASE-2-EMPLOYER-IMPLEMENTATION-REPORT.md) - Backend implementation guide
- [PHASE-3-FRONTEND-SERVICE-GUIDE.md](PHASE-3-FRONTEND-SERVICE-GUIDE.md) - Frontend service layer guide

