# 🔍 Critical Models Contract Analysis Report

**Project:** TBA WAAD System  
**Analysis Date:** 2024-12-29  
**Total Entities Analyzed:** 37  
**Critical Entities Requiring Contracts:** 15  
**Priority Level:** HIGH (Pre-Development)

---

## 📊 Executive Summary

تم تحليل 37 موديل (Entity) في المشروع، وتم تحديد **15 موديل حرج** يتطلب عقد API Contract قبل التطوير.

**المعايير المستخدمة للتحديد:**
- وجود Auto-Code Generation
- Field Normalization (Frontend ↔ Backend)
- Unique Constraints & Validation Rules
- Complex Business Logic
- Multi-tenant Data Isolation
- Audit Trail Requirements
- Financial/Critical Data

---

## 🎯 Critical Models Requiring API Contracts

### ✅ 1. Organization (Employer/TPA/Insurance)
**Priority:** 🔴 CRITICAL - Already Implemented  
**Entity Path:** `common/entity/Organization.java`

```json
{
  "model": "Organization",
  "critical": true,
  "status": "✅ Contract Implemented",
  "reason": "Auto-Code Generation, Multi-type entity (EMPLOYER/TPA/INSURANCE), Uniqueness validation",
  "key_fields": ["code", "name", "nameEn", "type", "active", "createdAt", "updatedAt"],
  "contract_requirements": [
    "✅ Auto-Code Generation (EMP-XX, TPA-XX, INS-XX)",
    "✅ Field Normalization (name ↔ nameAr)",
    "✅ Validation (@NotBlank, @Size, Unique code)",
    "✅ Type-based filtering (OrganizationType enum)",
    "✅ Soft Delete (active flag)",
    "✅ Audit Trail (createdAt, updatedAt)",
    "✅ Logging (SLF4J)"
  ],
  "relations": [
    "Organization → BenefitPolicy (One-to-Many)",
    "Organization → Member.employerOrganization (One-to-Many)",
    "Organization → Claim.insuranceOrganization (One-to-Many)"
  ],
  "contract_file": "EMPLOYER_API_CONTRACT.md (Phase 1-3 Complete)",
  "implementation_notes": "Serves as central organization registry. Type-based polymorphism (Employer, TPA, Insurance)."
}
```

---

### 🔴 2. Member
**Priority:** 🔴 CRITICAL - Requires Contract  
**Entity Path:** `modules/member/entity/Member.java`

```json
{
  "model": "Member",
  "critical": true,
  "status": "⚠️ No Contract",
  "reason": "Auto-Card Generation (BARCODE), Multi-org relationships, Eligibility rules, Financial impact",
  "key_fields": [
    "cardNumber",
    "fullNameArabic",
    "fullNameEnglish",
    "civilId",
    "birthDate",
    "gender",
    "employerOrganization",
    "insuranceOrganization",
    "benefitPolicy",
    "status",
    "cardStatus",
    "eligibilityStatus",
    "active"
  ],
  "contract_requirements": [
    "❌ Auto-Card Generation (WAAD|MEMBER|{SEQUENCE})",
    "❌ Field Normalization (fullNameArabic ↔ nameAr)",
    "❌ Validation (@NotBlank on fullNameArabic, @Email, @Pattern for civilId)",
    "❌ Civil ID uniqueness check (optional but unique if provided)",
    "❌ Card Number uniqueness (mandatory, system-generated)",
    "❌ Multi-org linking (employerOrganization + insuranceOrganization)",
    "❌ Benefit Policy auto-assignment on creation",
    "❌ Status transition rules (ACTIVE → SUSPENDED → TERMINATED)",
    "❌ Card status management (ACTIVE, BLOCKED, EXPIRED)",
    "❌ Eligibility status calculation",
    "❌ QR Code generation",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt, createdBy, updatedBy)",
    "❌ Logging (member lifecycle events)"
  ],
  "relations": [
    "Member → Organization.employerOrganization (Many-to-One) CANONICAL",
    "Member → Organization.insuranceOrganization (Many-to-One)",
    "Member → BenefitPolicy (Many-to-One) CANONICAL",
    "Member → Visit (One-to-Many)",
    "Member → Claim (One-to-Many)",
    "Member → PreAuthorization (One-to-Many)",
    "Member → MemberAttribute (One-to-Many)",
    "Member → FamilyMember (One-to-Many)"
  ],
  "contract_sections": [
    "1. Auto-Card Generation & Uniqueness",
    "2. Field Normalization & Validation",
    "3. Multi-Organization Linking",
    "4. Benefit Policy Auto-Assignment",
    "5. Status Lifecycle Management",
    "6. Eligibility & Card Status Rules",
    "7. QR Code Generation",
    "8. Error Handling (409 Conflict, 404 Not Found)",
    "9. Authorization (Employer-scoped data access)"
  ],
  "business_impact": "HIGH - Core entity for all medical services, claims, and benefits",
  "complexity": "Very High"
}
```

---

### 🔴 3. BenefitPolicy
**Priority:** 🔴 CRITICAL - Requires Contract  
**Entity Path:** `modules/benefitpolicy/entity/BenefitPolicy.java`

```json
{
  "model": "BenefitPolicy",
  "critical": true,
  "status": "⚠️ No Contract",
  "reason": "Business rule: Only ONE active policy per employer, Date validation, Financial limits, Coverage rules",
  "key_fields": [
    "name",
    "policyCode",
    "employerOrganization",
    "insuranceOrganization",
    "startDate",
    "endDate",
    "annualLimit",
    "defaultCoveragePercent",
    "perMemberLimit",
    "perFamilyLimit",
    "defaultWaitingPeriodDays",
    "status",
    "coveredMembersCount",
    "active"
  ],
  "contract_requirements": [
    "❌ Auto-Policy Code Generation (POL-YYYY-XXX)",
    "❌ Date Validation (startDate < endDate)",
    "❌ Single Active Policy Rule (per employer, per date range)",
    "❌ Overlap Detection (prevent overlapping date ranges)",
    "❌ Field Validation (@NotNull, @DecimalMin, @Min/@Max)",
    "❌ Status Lifecycle (DRAFT → ACTIVE → EXPIRED → TERMINATED)",
    "❌ Coverage Rules Management (BenefitPolicyRule nested)",
    "❌ Member Auto-Assignment (assign to members on activation)",
    "❌ Financial Validation (annualLimit >= perMemberLimit)",
    "❌ Waiting Period Defaults",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt)",
    "❌ Logging (policy lifecycle, activation, expiry)"
  ],
  "relations": [
    "BenefitPolicy → Organization.employerOrganization (Many-to-One)",
    "BenefitPolicy → Organization.insuranceOrganization (Many-to-One)",
    "BenefitPolicy → BenefitPolicyRule (One-to-Many) CASCADE",
    "BenefitPolicy → Member (One-to-Many)"
  ],
  "contract_sections": [
    "1. Auto-Code Generation & Uniqueness",
    "2. Date Range Validation & Overlap Prevention",
    "3. Single Active Policy Enforcement",
    "4. Status Lifecycle Management",
    "5. Financial Limits Validation",
    "6. Coverage Rules (BenefitPolicyRule)",
    "7. Member Auto-Assignment",
    "8. Error Handling (409 Conflict - Overlap, 400 Bad Request - Date validation)",
    "9. Authorization (Employer-scoped access)"
  ],
  "business_impact": "CRITICAL - Foundation for all coverage decisions",
  "complexity": "Very High"
}
```

---

### 🔴 4. Provider
**Priority:** 🔴 CRITICAL - Requires Contract  
**Entity Path:** `modules/provider/entity/Provider.java`

```json
{
  "model": "Provider",
  "critical": true,
  "status": "⚠️ Partial Implementation (No Contract)",
  "reason": "License uniqueness, Provider type validation, Contract management, Pricing agreements",
  "key_fields": [
    "nameArabic",
    "nameEnglish",
    "licenseNumber",
    "taxNumber",
    "city",
    "address",
    "phone",
    "email",
    "providerType",
    "active",
    "contractStartDate",
    "contractEndDate",
    "defaultDiscountRate",
    "createdBy",
    "updatedBy"
  ],
  "contract_requirements": [
    "❌ Auto-Code Generation (PRV-XXX)",
    "❌ Field Normalization (nameArabic ↔ nameAr)",
    "❌ License Number uniqueness validation",
    "❌ Email & Phone validation (@Email, @Pattern)",
    "❌ Provider Type validation (HOSPITAL, CLINIC, LAB, PHARMACY, RADIOLOGY)",
    "❌ Tax Number format validation",
    "❌ Contract Date validation (startDate < endDate)",
    "❌ Default Discount validation (0-100%)",
    "❌ Provider Contracts relationship management",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt, createdBy, updatedBy)",
    "❌ Logging (provider registration, updates)"
  ],
  "relations": [
    "Provider → ProviderContract (One-to-Many) CASCADE",
    "Provider → PreAuthorization (One-to-Many indirectly via providerId)"
  ],
  "contract_sections": [
    "1. Auto-Code Generation",
    "2. Field Normalization & Validation",
    "3. License Number Uniqueness",
    "4. Provider Type Enum Validation",
    "5. Contract Management",
    "6. Pricing & Discount Rules",
    "7. Error Handling (409 Conflict - License, 400 Bad Request)",
    "8. Authorization (TPA/Insurance admin access)"
  ],
  "business_impact": "HIGH - Foundation for provider network and claims",
  "complexity": "High"
}
```

---

### 🟠 5. User (RBAC)
**Priority:** 🟠 HIGH - Requires Contract  
**Entity Path:** `modules/rbac/entity/User.java`

```json
{
  "model": "User",
  "critical": true,
  "status": "⚠️ No Contract",
  "reason": "Authentication, Multi-tenant scoping (employerId/companyId), Role-based access, Security",
  "key_fields": [
    "username",
    "password",
    "fullName",
    "email",
    "phone",
    "active",
    "emailVerified",
    "employerId",
    "companyId",
    "roles"
  ],
  "contract_requirements": [
    "❌ Username uniqueness validation",
    "❌ Email uniqueness validation",
    "❌ Password strength validation (min 8 chars, complexity)",
    "❌ Password hashing (BCrypt)",
    "❌ Field Normalization (fullName ↔ fullNameAr/fullNameEn)",
    "❌ Email verification workflow",
    "❌ Phone validation (@Pattern)",
    "❌ Role assignment validation (SUPER_ADMIN, EMPLOYER_ADMIN, etc.)",
    "❌ Employer-scoping for EMPLOYER_ADMIN users",
    "❌ Company-scoping for INSURANCE_ADMIN users (deprecated but present)",
    "❌ Active/Inactive status management",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt)",
    "❌ Logging (login, logout, role changes, password reset)"
  ],
  "relations": [
    "User → Role (Many-to-Many) via user_roles",
    "User → PreAuthorization.reviewer (One-to-Many)"
  ],
  "contract_sections": [
    "1. Registration & Validation",
    "2. Authentication (Username/Email + Password)",
    "3. Password Management (Reset, Change)",
    "4. Email Verification",
    "5. Role & Permission Assignment",
    "6. Multi-tenant Scoping (employerId/companyId)",
    "7. Session Management",
    "8. Error Handling (409 Conflict - Username/Email, 401 Unauthorized)",
    "9. Security Logging"
  ],
  "business_impact": "CRITICAL - Foundation for all authentication & authorization",
  "complexity": "Very High"
}
```

---

### 🟠 6. PreAuthorization
**Priority:** 🟠 HIGH - Requires Contract  
**Entity Path:** `modules/preauth/entity/PreAuthorization.java`

```json
{
  "model": "PreAuthorization",
  "critical": true,
  "status": "⚠️ No Contract",
  "reason": "Auto-Number Generation, Status workflow, Financial approval, Multi-step review process",
  "key_fields": [
    "preAuthNumber",
    "member",
    "providerId",
    "providerName",
    "diagnosisCode",
    "procedureCodes",
    "serviceType",
    "estimatedCost",
    "approvedAmount",
    "requestDate",
    "expectedServiceDate",
    "status",
    "reviewer",
    "reviewedAt",
    "approvalExpiryDate",
    "active"
  ],
  "contract_requirements": [
    "❌ Auto-PreAuth Number Generation (PA-YYYYMMDD-XXXX)",
    "❌ Unique PreAuth Number validation",
    "❌ Status Workflow (REQUESTED → UNDER_REVIEW → APPROVED/REJECTED → EXPIRED)",
    "❌ Member eligibility validation (before creation)",
    "❌ Provider validation",
    "❌ Diagnosis code validation (ICD-10/11)",
    "❌ Procedure codes validation (CPT)",
    "❌ Service type validation (INPATIENT, OUTPATIENT, SURGERY, etc.)",
    "❌ Cost validation (estimatedCost > 0, approvedAmount <= estimatedCost)",
    "❌ Date validation (expectedServiceDate >= requestDate)",
    "❌ Reviewer assignment (role-based)",
    "❌ Approval expiry calculation (auto-expire after X days)",
    "❌ Attachment management",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt)",
    "❌ Logging (status changes, approvals, rejections)"
  ],
  "relations": [
    "PreAuthorization → Member (Many-to-One)",
    "PreAuthorization → User.reviewer (Many-to-One)",
    "PreAuthorization → Provider (Many-to-One via providerId)"
  ],
  "contract_sections": [
    "1. Auto-Number Generation",
    "2. Member Eligibility Validation",
    "3. Provider & Diagnosis/Procedure Validation",
    "4. Status Lifecycle Management",
    "5. Financial Approval Logic",
    "6. Reviewer Assignment & Workflow",
    "7. Expiry Management",
    "8. Error Handling (404 Member/Provider, 409 Duplicate, 400 Invalid Status)",
    "9. Authorization (Provider can create, Reviewer can approve)"
  ],
  "business_impact": "HIGH - Controls access to services & financial exposure",
  "complexity": "Very High"
}
```

---

### 🟠 7. Claim
**Priority:** 🟠 HIGH - Requires Contract  
**Entity Path:** `modules/claim/entity/Claim.java`

```json
{
  "model": "Claim",
  "critical": true,
  "status": "⚠️ No Contract",
  "reason": "Financial settlement, Status workflow, Multi-line items, Coverage calculation, Payment processing",
  "key_fields": [
    "member",
    "insuranceOrganization",
    "preApproval",
    "providerName",
    "diagnosis",
    "visitDate",
    "requestedAmount",
    "approvedAmount",
    "differenceAmount",
    "status",
    "patientCoPay",
    "netProviderAmount",
    "coPayPercent",
    "deductibleApplied",
    "paymentReference",
    "settledAt",
    "active"
  ],
  "contract_requirements": [
    "❌ Auto-Claim Number Generation (CLM-YYYYMMDD-XXXX)",
    "❌ Status Workflow (DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → SETTLED)",
    "❌ Member eligibility validation",
    "❌ PreApproval linkage validation (if required)",
    "❌ Coverage calculation (via BenefitPolicy)",
    "❌ Financial validation (requestedAmount > 0, approvedAmount <= requestedAmount)",
    "❌ Co-Pay calculation (patientCoPay = requestedAmount * coPayPercent)",
    "❌ Deductible application",
    "❌ Net provider amount calculation",
    "❌ Claim lines management (ClaimLine nested)",
    "❌ Attachment management (ClaimAttachment)",
    "❌ Settlement workflow (payment reference tracking)",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt, reviewedAt, settledAt)",
    "❌ Logging (status changes, approvals, settlements)"
  ],
  "relations": [
    "Claim → Member (Many-to-One)",
    "Claim → Organization.insuranceOrganization (Many-to-One)",
    "Claim → PreApproval (Many-to-One)",
    "Claim → ClaimLine (One-to-Many) CASCADE",
    "Claim → ClaimAttachment (One-to-Many) CASCADE",
    "Claim → ClaimAuditLog (One-to-Many)"
  ],
  "contract_sections": [
    "1. Auto-Claim Number Generation",
    "2. Eligibility & Coverage Validation",
    "3. PreApproval Validation",
    "4. Financial Calculation Logic",
    "5. Status Lifecycle Management",
    "6. Claim Lines Management",
    "7. Settlement Processing",
    "8. Error Handling (404 Member, 400 Invalid Amount, 409 Duplicate)",
    "9. Authorization (Member-scoped, Provider-scoped)"
  ],
  "business_impact": "CRITICAL - Core financial transaction entity",
  "complexity": "Very High"
}
```

---

### 🟠 8. Visit
**Priority:** 🟠 MEDIUM - Requires Contract  
**Entity Path:** `modules/visit/entity/Visit.java`

```json
{
  "model": "Visit",
  "critical": false,
  "status": "⚠️ No Contract (Consider implementing)",
  "reason": "Multi-org denormalization, Financial tracking, Member history",
  "key_fields": [
    "member",
    "employerOrganization",
    "providerId",
    "doctorName",
    "specialty",
    "visitDate",
    "diagnosis",
    "treatment",
    "totalAmount",
    "notes",
    "active"
  ],
  "contract_requirements": [
    "❌ Member validation",
    "❌ Provider validation",
    "❌ Visit date validation (not future date)",
    "❌ Financial validation (totalAmount >= 0)",
    "❌ Employer organization denormalization (from member)",
    "❌ Diagnosis validation (free text or ICD code)",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt)",
    "❌ Logging (visit creation)"
  ],
  "relations": [
    "Visit → Member (Many-to-One)",
    "Visit → Organization.employerOrganization (Many-to-One) DENORMALIZED"
  ],
  "business_impact": "MEDIUM - Medical history tracking",
  "complexity": "Medium"
}
```

---

### 🟡 9. BenefitPolicyRule
**Priority:** 🟡 MEDIUM - Requires Contract  
**Entity Path:** `modules/benefitpolicy/entity/BenefitPolicyRule.java`

```json
{
  "model": "BenefitPolicyRule",
  "critical": true,
  "status": "⚠️ No Contract",
  "reason": "Complex coverage logic, Uniqueness constraints, Inheritance rules, Financial impact",
  "key_fields": [
    "benefitPolicy",
    "medicalCategory",
    "medicalService",
    "coveragePercent",
    "annualLimit",
    "perVisitLimit",
    "waitingPeriodDays",
    "requiresPreAuth",
    "active"
  ],
  "contract_requirements": [
    "❌ Mutual exclusivity validation (EITHER category OR service, NOT both)",
    "❌ Uniqueness validation (no duplicate category/service per policy)",
    "❌ Coverage percent validation (0-100, inherits from policy if null)",
    "❌ Financial limits validation (annualLimit, perVisitLimit >= 0)",
    "❌ Waiting period validation (days >= 0)",
    "❌ Pre-auth requirement flag",
    "❌ Rule priority/ordering (if multiple rules apply)",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt)",
    "❌ Logging (rule creation, updates)"
  ],
  "relations": [
    "BenefitPolicyRule → BenefitPolicy (Many-to-One)",
    "BenefitPolicyRule → MedicalCategory (Many-to-One) OPTIONAL",
    "BenefitPolicyRule → MedicalService (Many-to-One) OPTIONAL"
  ],
  "contract_sections": [
    "1. Category vs Service Validation",
    "2. Uniqueness Enforcement",
    "3. Coverage Calculation Logic",
    "4. Financial Limits Validation",
    "5. Waiting Period Rules",
    "6. Pre-Authorization Requirements",
    "7. Error Handling (400 Bad Request - Both category & service, 409 Conflict - Duplicate)"
  ],
  "business_impact": "HIGH - Determines service coverage",
  "complexity": "High"
}
```

---

### 🟡 10. ProviderContract
**Priority:** 🟡 MEDIUM - Requires Contract  
**Entity Path:** `modules/providercontract/entity/ProviderContract.java`

```json
{
  "model": "ProviderContract",
  "critical": true,
  "status": "⚠️ No Contract",
  "reason": "Auto-Code Generation, Single active contract rule, Pricing management, Date validation",
  "key_fields": [
    "contractCode",
    "provider",
    "status",
    "pricingModel",
    "discountPercent",
    "startDate",
    "endDate",
    "active"
  ],
  "contract_requirements": [
    "❌ Auto-Contract Code Generation (CON-YYYY-XXX)",
    "❌ Single active contract per provider enforcement",
    "❌ Date validation (startDate < endDate)",
    "❌ Overlap detection (prevent overlapping contracts)",
    "❌ Status workflow (DRAFT → ACTIVE → EXPIRED → TERMINATED)",
    "❌ Pricing model validation (DISCOUNT, FIXED, NEGOTIATED)",
    "❌ Discount percent validation (0-100%)",
    "❌ Pricing items management (ProviderContractPricingItem nested)",
    "❌ Auto-expiry on endDate",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt)",
    "❌ Logging (contract activation, expiry)"
  ],
  "relations": [
    "ProviderContract → Provider (Many-to-One)",
    "ProviderContract → ProviderContractPricingItem (One-to-Many) CASCADE"
  ],
  "business_impact": "MEDIUM - Determines provider pricing",
  "complexity": "High"
}
```

---

### 🟡 11. IcdCode & CptCode (Medical Codes)
**Priority:** 🟡 MEDIUM - Requires Contract  
**Entity Paths:** `modules/medicalcode/entity/IcdCode.java`, `CptCode.java`

```json
{
  "model": "IcdCode & CptCode",
  "critical": false,
  "status": "⚠️ No Contract (Standardized data - consider bulk import contract)",
  "reason": "Standardized medical codes, Uniqueness, Version management, Bulk import/sync",
  "key_fields": [
    "code",
    "descriptionAr",
    "descriptionEn",
    "category",
    "subCategory",
    "version/procedureType",
    "active"
  ],
  "contract_requirements": [
    "❌ Code uniqueness validation",
    "❌ Version/Type validation (ICD-10, ICD-11, etc.)",
    "❌ Bulk import validation (CSV/Excel)",
    "❌ Code format validation (@Pattern)",
    "❌ Description bilingual requirement",
    "❌ Category/SubCategory validation",
    "❌ Soft Delete (active flag)",
    "❌ Audit Trail (createdAt, updatedAt)",
    "❌ Logging (bulk imports, updates)"
  ],
  "business_impact": "MEDIUM - Reference data for diagnoses & procedures",
  "complexity": "Medium",
  "notes": "Consider bulk import/sync API contract instead of CRUD"
}
```

---

### ⚪ 12. Role & Permission (RBAC)
**Priority:** ⚪ LOW - Standard CRUD (Optional Contract)  
**Entity Paths:** `modules/rbac/entity/Role.java`, `Permission.java`

```json
{
  "model": "Role & Permission",
  "critical": false,
  "status": "⚪ Standard CRUD (Optional contract for permission matrix)",
  "reason": "Standard RBAC entities, Less complex validation, Admin-only access",
  "key_fields": [
    "name",
    "description",
    "permissions",
    "module"
  ],
  "contract_requirements": [
    "✓ Name uniqueness validation",
    "✓ Standard validation (@NotBlank)",
    "✓ Soft Delete (active flag)",
    "✓ Audit Trail (createdAt, updatedAt)"
  ],
  "business_impact": "LOW - Admin configuration",
  "complexity": "Low",
  "notes": "Standard CRUD sufficient, unless complex permission matrix required"
}
```

---

### ⚪ 13. AuditLog
**Priority:** ⚪ LOW - Write-Only Entity (No Contract Needed)  
**Entity Path:** `modules/systemadmin/entity/AuditLog.java`

```json
{
  "model": "AuditLog",
  "critical": false,
  "status": "⚪ Write-Only (No contract needed)",
  "reason": "Immutable audit records, No user-facing CRUD, System-generated",
  "key_fields": [
    "timestamp",
    "userId",
    "username",
    "action",
    "entityType",
    "entityId",
    "details",
    "ipAddress"
  ],
  "contract_requirements": [
    "N/A - Write-only, no validation needed"
  ],
  "business_impact": "LOW - System logging",
  "complexity": "Very Low",
  "notes": "No contract needed - internal system logging only"
}
```

---

### ⚪ 14. EligibilityCheck
**Priority:** ⚪ LOW - Write-Only Entity (No Contract Needed)  
**Entity Path:** `modules/eligibility/entity/EligibilityCheck.java`

```json
{
  "model": "EligibilityCheck",
  "critical": false,
  "status": "⚪ Write-Only (No contract needed)",
  "reason": "Immutable audit records, No user-facing CRUD, System-generated",
  "key_fields": [
    "requestId",
    "checkTimestamp",
    "memberId",
    "policyId",
    "serviceDate",
    "isEligible"
  ],
  "contract_requirements": [
    "N/A - Write-only audit trail"
  ],
  "business_impact": "LOW - Audit trail",
  "complexity": "Very Low",
  "notes": "No contract needed - immutable audit records"
}
```

---

### ⚪ 15. Deprecated Entities (Company, Employer)
**Priority:** ⚪ DEPRECATED - No Contract Needed  
**Entity Paths:** `modules/company/entity/Company.java`, `modules/employer/entity/Employer.java`

```json
{
  "model": "Company & Employer (Deprecated)",
  "critical": false,
  "status": "⚪ DEPRECATED - Read-Only",
  "reason": "Legacy entities, replaced by Organization, read-only for backward compatibility",
  "contract_requirements": [
    "N/A - No new development, use Organization instead"
  ],
  "business_impact": "NONE - Legacy",
  "complexity": "N/A",
  "notes": "Marked @Deprecated, use Organization with type=EMPLOYER/TPA instead"
}
```

---

## 📋 Priority Matrix

| Priority | Models | Contract Status | Action Required |
|----------|--------|-----------------|-----------------|
| 🔴 CRITICAL | Organization | ✅ Complete (Phase 1-3) | None |
| 🔴 CRITICAL | Member | ⚠️ Missing | **Create Contract Now** |
| 🔴 CRITICAL | BenefitPolicy | ⚠️ Missing | **Create Contract Now** |
| 🔴 CRITICAL | Provider | ⚠️ Partial | **Create Contract Now** |
| 🟠 HIGH | User (RBAC) | ⚠️ Missing | Create Contract |
| 🟠 HIGH | PreAuthorization | ⚠️ Missing | Create Contract |
| 🟠 HIGH | Claim | ⚠️ Missing | Create Contract |
| 🟡 MEDIUM | Visit | ⚠️ Missing | Consider Contract |
| 🟡 MEDIUM | BenefitPolicyRule | ⚠️ Missing | Consider Contract |
| 🟡 MEDIUM | ProviderContract | ⚠️ Missing | Consider Contract |
| 🟡 MEDIUM | IcdCode & CptCode | ⚠️ Missing | Bulk Import Contract |
| ⚪ LOW | Role & Permission | ⚪ Optional | Standard CRUD |
| ⚪ LOW | AuditLog | ⚪ N/A | No Contract |
| ⚪ LOW | EligibilityCheck | ⚪ N/A | No Contract |
| ⚪ DEPRECATED | Company & Employer | ⚪ N/A | Use Organization |

---

## 🎯 Recommended Implementation Order

### Phase 1: Foundation (CRITICAL) ✅ DONE
1. ✅ **Organization** - Complete (EMP-XX auto-code, field normalization)

### Phase 2: Core Entities (CRITICAL) 🔴 URGENT
2. 🔴 **Member** - Auto-card generation, multi-org, eligibility
3. 🔴 **BenefitPolicy** - Coverage foundation, single active policy rule
4. 🔴 **Provider** - Provider network, license validation

### Phase 3: Security & Authorization (HIGH) 🟠
5. 🟠 **User** - Authentication, RBAC, multi-tenant scoping

### Phase 4: Business Workflows (HIGH) 🟠
6. 🟠 **PreAuthorization** - Approval workflow, status lifecycle
7. 🟠 **Claim** - Financial settlement, coverage calculation

### Phase 5: Supporting Entities (MEDIUM) 🟡
8. 🟡 **BenefitPolicyRule** - Coverage rules, waiting periods
9. 🟡 **ProviderContract** - Pricing agreements
10. 🟡 **Visit** - Medical history

### Phase 6: Reference Data (MEDIUM) 🟡
11. 🟡 **IcdCode & CptCode** - Bulk import/sync

---

## 📊 Contract Template Structure

Each contract should follow the Employer pattern (EMPLOYER_API_CONTRACT.md):

```markdown
# {MODEL_NAME} API Contract

## 1. Field Registry & Mapping
- Frontend ↔ Backend field mappings
- Required vs Optional fields
- Data types & formats

## 2. API Endpoints
- Create (POST /api/{resource})
- Update (PUT /api/{resource}/{id})
- Get (GET /api/{resource}/{id})
- List (GET /api/{resource})
- Delete (DELETE /api/{resource}/{id})

## 3. Validation Rules
- @NotBlank, @Size, @Email, @Pattern
- Business logic validation
- Uniqueness constraints

## 4. Auto-Code Generation (if applicable)
- Format pattern
- Sequence logic
- Collision handling

## 5. Status Lifecycle (if applicable)
- Status transitions
- Allowed transitions
- Validation rules

## 6. Error Handling
- 400 Bad Request - Field validation
- 404 Not Found - Resource not found
- 409 Conflict - Uniqueness violation
- 500 Internal Server Error

## 7. Authorization
- Role-based access
- Multi-tenant scoping
- Data isolation rules

## 8. Audit Trail
- createdAt, updatedAt
- createdBy, updatedBy
- Status change history

## 9. Logging
- INFO - Create, Update, Delete
- DEBUG - Validation steps
- WARN - Business rule violations
- ERROR - Exceptions
```

---

## 🚀 Next Steps

### Immediate Actions (This Week)
1. ✅ Organization Contract - **COMPLETE**
2. 🔴 **Create Member API Contract** (Priority 1)
3. 🔴 **Create BenefitPolicy API Contract** (Priority 2)
4. 🔴 **Create Provider API Contract** (Priority 3)

### Short-term (Next 2 Weeks)
5. 🟠 Create User API Contract
6. 🟠 Create PreAuthorization API Contract
7. 🟠 Create Claim API Contract

### Medium-term (Next Month)
8. 🟡 Create BenefitPolicyRule API Contract
9. 🟡 Create ProviderContract API Contract
10. 🟡 Create Medical Codes Bulk Import Contract

---

## 📝 Notes & Recommendations

### Best Practices
1. **Always create contract BEFORE implementation** - Prevents field mismatch errors
2. **Include auto-code generation** - Reduces manual errors, ensures uniqueness
3. **Define status lifecycles** - Prevents invalid state transitions
4. **Plan field normalization** - Frontend (nameAr) ↔ Backend (name)
5. **Document error scenarios** - 400, 404, 409, 500 with Arabic messages
6. **Test multi-tenant isolation** - Employer-scoped, Company-scoped data access

### Lessons from Organization Contract
- ✅ @JsonAlias provides backward compatibility
- ✅ @JsonProperty enables field renaming in responses
- ✅ Auto-code generation requires max code query + increment logic
- ✅ Service layer normalization decouples frontend/backend
- ✅ Client-side validation improves UX

### Common Pitfalls to Avoid
- ❌ Skipping contract → Field mismatch errors (400 Bad Request)
- ❌ No auto-code generation → Manual code entry errors
- ❌ Missing field normalization → Frontend/Backend coupling
- ❌ No status lifecycle → Invalid state transitions
- ❌ Missing authorization rules → Data leakage across tenants

---

**Report Generated:** 2024-12-29  
**Analysis Scope:** 37 entities across 10 modules  
**Contract Coverage:** 1/15 (6.7%) - Organization complete  
**Target Coverage:** 15/15 (100%) - All critical models  

**Status:** 🔴 **URGENT - 14 critical models require contracts before development**

