# 📋 سجل القرارات المعمارية - Architecture Decision Record (ADR)

## تاريخ التحديث: 2026-01-15

---

## 🏛️ المعمارية الرئيسية: Visit-Centric Architecture

### ADR-001: Visit-Centric Data Flow

**الحالة:** ✅ مُطبّق

**السياق:**
كانت الـ Claims و الـ PreAuthorizations تُنشأ بشكل مستقل مما يؤدي إلى:
- سجلات يتيمة (orphan records) بدون سياق
- صعوبة في تتبع رحلة المريض
- تعقيد في المصالحة المالية

**القرار:**
جميع الـ PreAuthorizations و Claims يجب أن تُنشأ من خلال Visit موجود.

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISIT-CENTRIC FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐    ┌──────────┐    ┌──────────────────────┐    │
│  │ Eligibility│───▶│  Visit   │───▶│ PreAuthorization     │    │
│  │  Check     │    │          │    │  (if PA required)    │    │
│  └────────────┘    └──────────┘    └──────────────────────┘    │
│                          │                    │                 │
│                          │                    │                 │
│                          ▼                    ▼                 │
│                    ┌──────────────────────────────────┐        │
│                    │            CLAIM                 │        │
│                    │  (Always linked to Visit)        │        │
│                    └──────────────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**التنفيذ:**
- ✅ `Visit.id` → nullable=false في `Claim.visit_id`
- ✅ `Visit.id` → nullable=false في `PreAuthorization.visit_id`
- ✅ `ClaimCreateDto.visitId` → @NotNull
- ✅ `PreAuthorizationCreateDto.visitId` → @NotNull
- ✅ Service-level validation في `ClaimMapper.toEntity()`
- ✅ Service-level validation في `PreAuthorizationService.createPreAuthorization()`

**العواقب:**
- ✅ لا يوجد claims/preauths يتيمة
- ✅ تتبع كامل لرحلة المريض
- ✅ سهولة المصالحة المالية
- ⚠️ الـ Frontend يجب أن ينشئ Visit أولاً قبل إنشاء Claim

---

### ADR-002: Provider Context from Security

**الحالة:** ✅ مُطبّق

**السياق:**
كان الـ providerId يأتي من الـ request body مما يسمح بـ:
- Provider A ينشئ سجلات لـ Provider B
- تلاعب في البيانات
- مشاكل أمنية

**القرار:**
مستخدمي الـ PROVIDER يأخذون providerId من الـ Security Context تلقائياً.

```
┌─────────────────────────────────────────────────────────────────┐
│                  PROVIDER CONTEXT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌───────────────┐    ┌─────────────────┐   │
│  │   Login     │───▶│  Session/JWT  │───▶│   Service       │   │
│  │  Provider A │    │ providerId: 1 │    │ auto-fills      │   │
│  └─────────────┘    └───────────────┘    │ dto.providerId=1│   │
│                                          └─────────────────┘   │
│                                                                 │
│  If Request providerId ≠ Session providerId → ACCESS_DENIED    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**التنفيذ:**
- ✅ `VisitService.validateAndEnforceProviderId()`
- ✅ `PreAuthorizationService.validateAndEnforceProviderId()`
- ✅ `ClaimService.validateAndEnforceProviderId()`

**قواعد الأدوار:**
| Role | providerId Behavior |
|------|---------------------|
| PROVIDER | Auto-filled from session, cannot override |
| SUPER_ADMIN | Can set any providerId |
| INSURANCE_ADMIN | Can set any providerId |
| Others | No restriction |

---

### ADR-003: PreAuthorization Module Canonicalization

**الحالة:** ✅ مُطبّق

**السياق:**
وجود موديولين متنافسين:
- `modules/preauth` (قديم) - يستخدم `PreApproval` entity
- `modules/preauthorization` (جديد) - يستخدم `PreAuthorization` entity

**القرار:**
إزالة جميع الإشارات إلى `preauth` واستخدام `preauthorization` حصرياً.

**التنفيذ:**
- ✅ `Claim.preApproval` → `Claim.preAuthorization`
- ✅ `JoinColumn(pre_approval_id)` → `JoinColumn(pre_authorization_id)`
- ✅ جميع Repository queries محدّثة
- ✅ `ClaimMapper` يستخدم `PreAuthorizationRepository`
- ✅ `AttachmentRulesService` يستخدم `getPreAuthorization()`

**⚠️ ملاحظة Migration:**
```sql
-- TODO: Add Flyway migration to rename column
ALTER TABLE claims RENAME COLUMN pre_approval_id TO pre_authorization_id;
```

---

### ADR-004: Transaction Propagation for Audit

**الحالة:** ✅ مُطبّق

**السياق:**
`ClaimAuditService.recordCreation()` كان يستخدم `REQUIRES_NEW` propagation مما يسبب:
- FK constraint violation عند الـ audit log يحاول الإشارة إلى claim لم يُحفظ بعد
- فشل في تسجيل الـ audit trail

**القرار:**
تغيير الـ propagation من `REQUIRES_NEW` إلى `REQUIRED` لتشارك نفس الـ transaction.

```java
// BEFORE (broken)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void recordCreation(Claim claim, User user) { ... }

// AFTER (fixed)
@Transactional(propagation = Propagation.REQUIRED)
public void recordCreation(Claim claim, User user) { ... }
```

**العواقب:**
- ✅ Audit log و Claim يُحفظان في نفس الـ transaction
- ✅ لا FK constraint violations
- ⚠️ إذا فشل الـ audit log، يفشل الـ Claim أيضاً (acceptable)

---

### ADR-005: providerId Mandatory on Visit

**الحالة:** ✅ مُطبّق

**السياق:**
الـ Visit كان يُنشأ بدون providerId مما يجعل من الصعب تتبع أي Provider قدّم الخدمة.

**القرار:**
`providerId` إجباري في `VisitCreateDto`.

```java
@NotNull(message = "Provider ID is required - all visits must be linked to a Provider")
private Long providerId;
```

**التنفيذ:**
- ✅ `VisitCreateDto.providerId` → @NotNull
- ✅ Service-level validation في `VisitService.validateAndEnforceProviderId()`

---

## 📦 ملخص الـ Entities والعلاقات

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐                                                               │
│  │ Provider │◄──────────────────────────────────────────┐                   │
│  │ (Root)   │                                           │                   │
│  └──────────┘                                           │                   │
│       │                                                 │                   │
│       │ providerId                                      │ providerId        │
│       ▼                                                 │                   │
│  ┌──────────┐     ┌────────────────────┐               │                   │
│  │  Visit   │────▶│ PreAuthorization   │               │                   │
│  │          │     │ (Optional)         │               │                   │
│  └──────────┘     └────────────────────┘               │                   │
│       │                    │                            │                   │
│       │ visitId            │ preAuthorizationId         │                   │
│       │                    │ (optional)                 │                   │
│       ▼                    ▼                            │                   │
│  ┌───────────────────────────────────────┐             │                   │
│  │               CLAIM                    │─────────────┘                   │
│  │  - visitId (REQUIRED, NOT NULL)       │                                 │
│  │  - preAuthorizationId (optional)      │                                 │
│  │  - providerId (REQUIRED)              │                                 │
│  └───────────────────────────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 قواعد الأمان

### Data-Level Security

| Entity | SUPER_ADMIN | INSURANCE_ADMIN | PROVIDER | EMPLOYER |
|--------|-------------|-----------------|----------|----------|
| Visit | All | All | Own Provider Only | Own Employer Only |
| PreAuth | All | All | Own Provider Only | Own Employer Only |
| Claim | All | All | Own Provider Only | Own Employer Only |

### Provider Context Enforcement

```java
// Pattern used in all Create/Update operations
private void validateAndEnforceProviderId(XxxCreateDto dto, User currentUser) {
    if (authorizationService.isProvider(currentUser)) {
        Long userProviderId = currentUser.getProviderId();
        
        if (userProviderId == null) {
            throw new AccessDeniedException("Provider user has no provider assigned");
        }
        
        // If providerId is provided, it MUST match the user's providerId
        if (dto.getProviderId() != null && !dto.getProviderId().equals(userProviderId)) {
            throw new AccessDeniedException("Provider can only create for their own provider");
        }
        
        // Auto-fill providerId from session
        dto.setProviderId(userProviderId);
    }
}
```

---

## 📁 الملفات المُعدّلة

| File | Changes |
|------|---------|
| `Claim.java` | `preApproval`→`preAuthorization`, visit nullable=false |
| `ClaimRepository.java` | JPQL queries updated for preAuthorization |
| `ClaimMapper.java` | Uses PreAuthorizationRepository |
| `ClaimService.java` | Added visitId validation |
| `ClaimAuditService.java` | Propagation REQUIRES_NEW→REQUIRED |
| `PreAuthorization.java` | visit nullable=false |
| `VisitService.java` | Added validateAndEnforceProviderId() |
| `VisitCreateDto.java` | providerId @NotNull |
| `AttachmentRulesService.java` | getPreAuthorization() |

---

## 🚀 Flyway Migrations Required

```sql
-- V1001__rename_pre_approval_to_pre_authorization.sql

-- Rename column in claims table
ALTER TABLE claims RENAME COLUMN pre_approval_id TO pre_authorization_id;

-- Update foreign key constraint (if exists)
ALTER TABLE claims DROP CONSTRAINT IF EXISTS fk_claims_pre_approval;
ALTER TABLE claims ADD CONSTRAINT fk_claims_pre_authorization 
    FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id);
```

---

## ✅ التحقق (Validation Checklist) - COMPLETED 2026-01-15

- [x] Run `mvn clean compile` - no compilation errors ✅
- [x] Run integration tests - E2E flow validated ✅
- [x] Verify Visit → PreAuth → Claim flow works ✅
- [x] Verify Provider Context enforcement (PROVIDER user creates with own ID) ✅
- [x] Verify Admin can override providerId ✅
- [x] Apply Flyway migration V045 for column rename ✅
- [x] Apply V046 for visit_id NOT NULL constraint ✅
- [x] Verify attachments work for PreAuth and Claim ✅

### Final Verification Results (2026-01-15)

| Check | Status |
|-------|--------|
| Compilation (`mvn compile`) | ✅ PASS |
| V045 Migration Applied | ✅ PASS |
| V046 Migration Applied | ✅ PASS |
| claims.visit_id NOT NULL | ✅ PASS |
| pre_authorizations.visit_id NOT NULL | ✅ PASS |
| FK: fk_claims_visit | ✅ EXISTS |
| FK: fk_claims_pre_authorization | ✅ EXISTS |
| FK: fk_preauth_visit | ✅ EXISTS |
| E2E Flow: Login → Visit → PreAuth → Claim | ✅ PASS |
| Provider Context Enforcement | ✅ PASS |
| PreAuth Attachments | ✅ PASS |
| Claim Attachments | ✅ PASS |

---

## 🏆 SYSTEM STATUS: CLOSED

**Date:** 2026-01-15  
**Status:** ✅ ALL PHASES COMPLETE  
**Pending Issues:** NONE  
**Skipped Steps:** NONE  

---

## 📚 المراجع

- [Visit-Centric Architecture Discussion](./md%20Reports/ARCHITECTURE-ANALYSIS-REPORT.md)
- [API Contracts](./VISIT_API_CONTRACT.md)
- [Frontend Alignment Report](./FRONTEND-API-CONTRACT-ALIGNMENT-REPORT.md)
