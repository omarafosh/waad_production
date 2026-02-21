# 📋 Contract Audit Report: Claims & Pre-Authorizations

**تاريخ التدقيق:** 2026-01-15  
**نوع التدقيق:** Contract-First Audit (ليس سلوكياً)  
**الموديولات:** Claims (المطالبات) | Pre-Authorizations (الموافقات المسبقة)  
**المدقق:** Spark (AI Agent)

---

## 📑 فهرس المحتويات

1. [ملخص تنفيذي](#ملخص-تنفيذي)
2. [تدقيق موديول Claims](#تدقيق-موديول-claims)
3. [تدقيق موديول Pre-Authorizations](#تدقيق-موديول-pre-authorizations)
4. [مطابقة Frontend ↔ Backend](#مطابقة-frontend--backend)
5. [قواعد العمل (Business Rules)](#قواعد-العمل)
6. [المرفقات (Attachments)](#المرفقات)
7. [الصلاحيات والأمان](#الصلاحيات-والأمان)
8. [العملة والتنسيق](#العملة-والتنسيق)
9. [الخلاصة والتوصيات](#الخلاصة-والتوصيات)

---

## ملخص تنفيذي

### إحصائيات التدقيق

| الفئة | Claims | Pre-Auth |
|-------|--------|----------|
| ✅ مطابق للعقد | 18 | 15 |
| ⚠️ اختلاف عن العقد | 3 | 5 |
| ❌ Endpoint مفقود | 2 | 3 |
| ❌ Field mismatch | 1 | 2 |
| ❌ Feature ناقص | 0 | 1 |

### 🚨 مشاكل حرجة (يجب إصلاحها فوراً)

| # | المشكلة | الموديول | الأولوية |
|---|---------|----------|----------|
| 1 | **ازدواجية موديولات PreAuth** - يوجد موديولان: `preauth` و `preauthorization` | Pre-Auth | 🔴 حرج |
| 2 | Frontend يستخدم `/pre-authorizations` لكن attachments على `/api/preauth/` | Pre-Auth | 🔴 حرج |
| 3 | Endpoint `GET /api/claims/visit/{visitId}` غير موجود في Backend | Claims | 🟠 عالي |
| 4 | Endpoint `GET /api/claims/number/{claimNumber}` غير موجود | Claims | 🟠 عالي |

---

## تدقيق موديول Claims

### 📦 DTOs المُستخرجة

#### 1. ClaimCreateDto
**الملف:** [ClaimCreateDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimCreateDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `visitId` | Long | ✅ نعم | `@NotNull`, `@Positive` |
| `memberId` | Long | ✅ نعم | `@NotNull`, `@Positive` |
| `benefitPackageId` | Long | ❌ لا | - |
| `preApprovalId` | Long | ❌ لا | - |
| `providerId` | Long | ❌ لا | - |
| `providerName` | String | ✅ نعم | `@NotBlank` |
| `doctorName` | String | ❌ لا | - |
| `diagnosis` | String | ✅ نعم | `@NotBlank` |
| `visitDate` | LocalDate | ✅ نعم | `@NotNull` |
| `requestedAmount` | BigDecimal | ✅ نعم | `@NotNull`, `@DecimalMin("0.01")` |
| `lines` | List<ClaimLineDto> | ❌ لا | - |
| `attachments` | List<ClaimAttachmentDto> | ❌ لا | - |

**✅ ملاحظة معمارية:** visitId مطلوب - يفرض Visit-Centric Architecture

---

#### 2. ClaimUpdateDto
**الملف:** [ClaimUpdateDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimUpdateDto.java#L1)

| الحقل | النوع | مطلوب | ملاحظة |
|-------|-------|-------|--------|
| `providerName` | String | ❌ لا | - |
| `doctorName` | String | ❌ لا | - |
| `diagnosis` | String | ❌ لا | - |
| `visitDate` | LocalDate | ❌ لا | - |
| `requestedAmount` | BigDecimal | ❌ لا | - |
| `status` | ClaimStatus | ❌ لا | ⚠️ لا يجب السماح بتغيير الحالة مباشرة |
| `approvedAmount` | BigDecimal | ❌ لا | - |
| `reviewerComment` | String | ❌ لا | - |
| `benefitPackageId` | Long | ❌ لا | - |
| `preApprovalId` | Long | ❌ لا | - |
| `lines` | List<ClaimLineDto> | ❌ لا | - |
| `attachments` | List<ClaimAttachmentDto> | ❌ لا | - |
| `active` | Boolean | ❌ لا | - |

**⚠️ اختلاف عن العقد:**
- الحقل `status` في UpdateDto يسمح بتغيير الحالة مباشرة
- **السلوك الصحيح:** يجب استخدام endpoints lifecycle فقط لتغيير الحالة

---

#### 3. ClaimViewDto (Response)
**الملف:** [ClaimViewDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimViewDto.java#L1)

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `id` | Long | معرف المطالبة |
| `memberId` | Long | معرف العضو |
| `memberFullName` | String | اسم العضو |
| `memberNationalNumber` | String | الرقم الوطني |
| `insuranceCompanyName` | String | شركة التأمين |
| `insuranceCompanyCode` | String | كود الشركة |
| `benefitPackageId` | Long | معرف حزمة المنافع |
| `benefitPackageName` | String | اسم الحزمة |
| `benefitPackageCode` | String | كود الحزمة |
| `preApprovalId` | Long | معرف الموافقة المسبقة |
| `preApprovalStatus` | String | حالة الموافقة |
| `providerName` | String | مقدم الخدمة |
| `doctorName` | String | الطبيب |
| `diagnosis` | String | التشخيص |
| `visitDate` | LocalDate | تاريخ الزيارة |
| **Financial** | | |
| `requestedAmount` | BigDecimal | المبلغ المطلوب |
| `approvedAmount` | BigDecimal | المبلغ المعتمد |
| `differenceAmount` | BigDecimal | الفرق |
| `patientCoPay` | BigDecimal | تحمل المريض |
| `netProviderAmount` | BigDecimal | المستحق للمزود |
| `coPayPercent` | BigDecimal | نسبة المشاركة % |
| `deductibleApplied` | BigDecimal | الخصم المطبق |
| **Settlement** | | |
| `paymentReference` | String | مرجع الدفع |
| `settledAt` | LocalDateTime | تاريخ التسوية |
| `settlementNotes` | String | ملاحظات التسوية |
| **SLA** | | |
| `expectedCompletionDate` | LocalDate | الإنجاز المتوقع |
| `actualCompletionDate` | LocalDate | الإنجاز الفعلي |
| `withinSla` | Boolean | ضمن SLA |
| `businessDaysTaken` | Integer | أيام العمل |
| `slaDaysConfigured` | Integer | SLA المحدد |
| `slaStatus` | String | حالة SLA |
| **Status** | | |
| `status` | ClaimStatus | الحالة |
| `statusLabel` | String | عنوان الحالة |
| `reviewerComment` | String | تعليق المراجع |
| `reviewedAt` | LocalDateTime | تاريخ المراجعة |
| **Metadata** | | |
| `serviceCount` | Integer | عدد الخدمات |
| `attachmentsCount` | Integer | عدد المرفقات |
| `lines` | List<ClaimLineDto> | بنود الخدمات |
| `attachments` | List<ClaimAttachmentDto> | المرفقات |
| `active` | Boolean | نشط |
| `createdAt` | LocalDateTime | تاريخ الإنشاء |
| `updatedAt` | LocalDateTime | تاريخ التحديث |
| `createdBy` | String | أُنشئ بواسطة |
| `updatedBy` | String | عُدّل بواسطة |

**✅ مطابق للعقد بالكامل**

---

#### 4. ClaimApproveDto
**الملف:** [ClaimApproveDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimApproveDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `approvedAmount` | BigDecimal | ❌ لا | `@DecimalMin("0.01")` |
| `notes` | String | ❌ لا | - |
| `useSystemCalculation` | Boolean | ❌ لا | Default: false |

**✅ مطابق للعقد**

---

#### 5. ClaimRejectDto
**الملف:** [ClaimRejectDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimRejectDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `rejectionReason` | String | ✅ نعم | `@NotBlank`, `@Size(10-2000)` |
| `rejectionCode` | String | ❌ لا | - |

**✅ مطابق للعقد**

---

#### 6. ClaimSettleDto
**الملف:** [ClaimSettleDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimSettleDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `paymentReference` | String | ✅ نعم | `@NotBlank` |
| `settlementAmount` | BigDecimal | ❌ لا | - |
| `paymentDate` | LocalDate | ❌ لا | - |
| `bankReference` | String | ❌ لا | - |
| `notes` | String | ❌ لا | - |

**✅ مطابق للعقد**

---

### 🔌 REST Endpoints - Claims

**Controller:** [ClaimController.java](backend/src/main/java/com/waad/tba/modules/claim/controller/ClaimController.java#L1)  
**Base URL:** `/api/claims`

| Method | Endpoint | Permission | DTO | الحالة |
|--------|----------|------------|-----|--------|
| `POST` | `/api/claims` | `MANAGE_CLAIMS` | ClaimCreateDto | ✅ مطابق |
| `PUT` | `/api/claims/{id}` | `MANAGE_CLAIMS` | ClaimUpdateDto | ✅ مطابق |
| `GET` | `/api/claims/{id}` | `VIEW_CLAIMS` | - | ✅ مطابق |
| `GET` | `/api/claims` | `VIEW_CLAIMS` | - | ✅ مطابق |
| `DELETE` | `/api/claims/{id}` | `MANAGE_CLAIMS` | - | ✅ مطابق |
| `GET` | `/api/claims/count` | `VIEW_CLAIMS` | - | ✅ مطابق |
| `GET` | `/api/claims/search` | `VIEW_CLAIMS` | - | ✅ مطابق |
| `GET` | `/api/claims/member/{memberId}` | `VIEW_CLAIMS` | - | ✅ مطابق |
| `GET` | `/api/claims/pre-approval/{preApprovalId}` | `VIEW_CLAIMS` | - | ✅ مطابق |
| **Lifecycle** | | | | |
| `POST` | `/api/claims/{id}/submit` | `MANAGE_CLAIMS` | - | ✅ مطابق |
| `POST` | `/api/claims/{id}/start-review` | `APPROVE_CLAIMS` | - | ✅ مطابق |
| `POST` | `/api/claims/{id}/approve` | `APPROVE_CLAIMS` | ClaimApproveDto | ✅ مطابق |
| `POST` | `/api/claims/{id}/reject` | `APPROVE_CLAIMS` | ClaimRejectDto | ✅ مطابق |
| `POST` | `/api/claims/{id}/settle` | `SETTLE_CLAIMS` | ClaimSettleDto | ✅ مطابق |
| `GET` | `/api/claims/{id}/cost-breakdown` | `VIEW_CLAIMS` | - | ✅ مطابق |
| **Inbox** | | | | |
| `GET` | `/api/claims/inbox/pending` | `VIEW_CLAIMS` | - | ✅ مطابق |
| `GET` | `/api/claims/inbox/approved` | `VIEW_CLAIMS` | - | ✅ مطابق |

---

### ❌ Endpoints مفقودة في Claims Backend

| Endpoint | الاستخدام في Frontend | الملف | السطر |
|----------|----------------------|-------|-------|
| `GET /api/claims/visit/{visitId}` | `claimsService.getByVisit()` | [claims.service.js](frontend/src/services/api/claims.service.js#L127) | 127 |
| `GET /api/claims/number/{claimNumber}` | `claimsService.getByClaimNumber()` | [claims.service.js](frontend/src/services/api/claims.service.js#L54) | 54 |
| `GET /api/claims/status/{status}` | `claimsService.getByStatus()` | [claims.service.js](frontend/src/services/api/claims.service.js#L137) | 137 |

---

### 📎 Attachments Endpoints - Claims

**Controller:** [ClaimAttachmentController.java](backend/src/main/java/com/waad/tba/modules/claim/controller/ClaimAttachmentController.java#L1)

| Method | Endpoint | Permission | الحالة |
|--------|----------|------------|--------|
| `POST` | `/api/claims/{claimId}/attachments` | `CLAIM_CREATE`, `CLAIM_UPDATE`, `ADMIN` | ✅ مطابق |
| `GET` | `/api/claims/{claimId}/attachments` | `CLAIM_VIEW`, `ADMIN` | ✅ مطابق |
| `GET` | `/api/claims/{claimId}/attachments/{attachmentId}` | `CLAIM_VIEW`, `ADMIN` | ✅ مطابق |
| `DELETE` | `/api/claims/{claimId}/attachments/{attachmentId}` | `CLAIM_UPDATE`, `CLAIM_DELETE`, `ADMIN` | ✅ مطابق |
| `GET` | `/api/claims/{claimId}/attachments/count` | `CLAIM_VIEW`, `ADMIN` | ✅ مطابق |

**✅ جميع عمليات المرفقات مُنفّذة بالكامل**

---

## تدقيق موديول Pre-Authorizations

### 🚨 مشكلة حرجة: ازدواجية الموديولات

**يوجد موديولان منفصلان:**

1. **`modules/preauth/`** - PreApproval Module
   - Controller: `/api/pre-approvals`
   - Entity: `PreApproval`
   - Status Enum: `ApprovalStatus` (inner enum)

2. **`modules/preauthorization/`** - PreAuthorization Module
   - Controller: `/api/pre-authorizations`
   - Entity: `PreAuthorization`
   - Status Enum: `PreAuthStatus`

**Frontend يستخدم:** `/api/pre-authorizations` ✅

| الجانب | preauth (قديم) | preauthorization (جديد) |
|--------|---------------|------------------------|
| Base URL | `/api/pre-approvals` | `/api/pre-authorizations` |
| Entity | PreApproval | PreAuthorization |
| Status | ApprovalStatus (enum داخلي) | PreAuthStatus (enum مستقل) |
| visitId | Optional | Required ✅ |
| Attachments URL | `/api/preauth/{id}/attachments` | ❌ غير موجود |

**⚠️ خلاصة:** Frontend يستخدم `/pre-authorizations` لكن attachments تستخدم `/api/preauth/` - هذا تضارب!

---

### 📦 DTOs المُستخرجة - PreAuthorization (المستخدم فعلياً)

#### 1. PreAuthorizationCreateDto
**الملف:** [PreAuthorizationCreateDto.java](backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationCreateDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `visitId` | Long | ✅ نعم | `@NotNull`, `@Positive` |
| `memberId` | Long | ✅ نعم | `@NotNull`, `@Positive` |
| `providerId` | Long | ✅ نعم | `@NotNull`, `@Positive` |
| `serviceCode` | String | ✅ نعم | `@NotBlank`, `@Size(max=50)` |
| `requestDate` | LocalDate | ✅ نعم | `@NotNull`, `@FutureOrPresent` |
| `requestedAmount` | BigDecimal | ✅ نعم | `@NotNull`, `@DecimalMin("0.0")` |
| `currency` | String | ❌ لا | Default: "LYD" |
| `priority` | String | ❌ لا | - |
| `diagnosis` | String | ❌ لا | `@Size(max=500)` |
| `notes` | String | ❌ لا | `@Size(max=1000)` |
| `expiryDays` | Integer | ❌ لا | Default: 30 |

**✅ visitId مطلوب - يفرض Visit-Centric Architecture**

---

#### 2. PreAuthorizationUpdateDto
**الملف:** [PreAuthorizationUpdateDto.java](backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationUpdateDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `requestedAmount` | BigDecimal | ❌ لا | `@DecimalMin("0.0")` |
| `priority` | String | ❌ لا | - |
| `diagnosis` | String | ❌ لا | `@Size(max=500)` |
| `notes` | String | ❌ لا | `@Size(max=1000)` |
| `expiryDays` | Integer | ❌ لا | `@Positive` |

**✅ مطابق للعقد**

---

#### 3. PreAuthorizationApproveDto
**الملف:** [PreAuthorizationApproveDto.java](backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationApproveDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `approvedAmount` | BigDecimal | ✅ نعم | `@NotNull`, `@DecimalMin("0.0")` |
| `copayPercentage` | BigDecimal | ❌ لا | 0-100 |
| `approvalNotes` | String | ❌ لا | `@Size(max=1000)` |

**✅ مطابق للعقد**

---

#### 4. PreAuthorizationRejectDto
**الملف:** [PreAuthorizationRejectDto.java](backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationRejectDto.java#L1)

| الحقل | النوع | مطلوب | Validation |
|-------|-------|-------|------------|
| `rejectionReason` | String | ✅ نعم | `@NotBlank`, `@Size(max=500)` |

**✅ مطابق للعقد**

---

#### 5. PreAuthorizationResponseDto
**الملف:** [PreAuthorizationResponseDto.java](backend/src/main/java/com/waad/tba/modules/preauthorization/dto/PreAuthorizationResponseDto.java#L1)

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `id` | Long | معرف |
| `referenceNumber` | String | رقم المرجع |
| `memberId` | Long | معرف العضو |
| `memberName` | String | اسم العضو |
| `memberCardNumber` | String | رقم البطاقة |
| `providerId` | Long | معرف المزود |
| `providerName` | String | اسم المزود |
| `providerLicense` | String | ترخيص المزود |
| `serviceCode` | String | كود الخدمة |
| `serviceName` | String | اسم الخدمة |
| `serviceNameEn` | String | الاسم بالإنجليزية |
| `requestDate` | LocalDate | تاريخ الطلب |
| `expiryDate` | LocalDate | تاريخ الانتهاء |
| `daysUntilExpiry` | Integer | أيام للانتهاء |
| **Financial** | | |
| `requestedAmount` | BigDecimal | المبلغ المطلوب |
| `contractPrice` | BigDecimal | سعر العقد |
| `approvedAmount` | BigDecimal | المبلغ المعتمد |
| `copayAmount` | BigDecimal | تحمل المريض |
| `copayPercentage` | BigDecimal | نسبة التحمل |
| `insuranceCoveredAmount` | BigDecimal | المغطى تأمينياً |
| `currency` | String | العملة |
| **Status** | | |
| `status` | String | الحالة |
| `priority` | String | الأولوية |
| `diagnosis` | String | التشخيص |
| `notes` | String | ملاحظات |
| `rejectionReason` | String | سبب الرفض |
| **Flags** | | |
| `hasContract` | Boolean | يوجد عقد |
| `isValid` | Boolean | صالح |
| `isExpired` | Boolean | منتهي |
| `canBeApproved` | Boolean | قابل للموافقة |
| `canBeRejected` | Boolean | قابل للرفض |
| `canBeCancelled` | Boolean | قابل للإلغاء |
| **Audit** | | |
| `createdAt` | LocalDateTime | تاريخ الإنشاء |
| `updatedAt` | LocalDateTime | تاريخ التحديث |
| `createdBy` | String | أُنشئ بواسطة |
| `updatedBy` | String | عُدّل بواسطة |
| `approvedAt` | LocalDateTime | تاريخ الموافقة |
| `approvedBy` | String | وافق عليه |
| `active` | Boolean | نشط |

**✅ مطابق للعقد**

---

### 🔌 REST Endpoints - PreAuthorization

**Controller:** [PreAuthorizationController.java](backend/src/main/java/com/waad/tba/modules/preauthorization/controller/PreAuthorizationController.java#L1)  
**Base URL:** `/api/pre-authorizations`

| Method | Endpoint | Permission | DTO | الحالة |
|--------|----------|------------|-----|--------|
| `POST` | `/api/pre-authorizations` | `CREATE_PRE_AUTH` | PreAuthorizationCreateDto | ✅ مطابق |
| `PUT` | `/api/pre-authorizations/{id}` | `UPDATE_PRE_AUTH` | PreAuthorizationUpdateDto | ✅ مطابق |
| `GET` | `/api/pre-authorizations/{id}` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| `GET` | `/api/pre-authorizations` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| `DELETE` | `/api/pre-authorizations/{id}` | `DELETE_PRE_AUTH` | - | ✅ مطابق |
| `GET` | `/api/pre-authorizations/reference/{referenceNumber}` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| `GET` | `/api/pre-authorizations/member/{memberId}` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| `GET` | `/api/pre-authorizations/provider/{providerId}` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| `GET` | `/api/pre-authorizations/status/{status}` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| **Lifecycle** | | | | |
| `POST` | `/api/pre-authorizations/{id}/approve` | `APPROVE_PRE_AUTH` | PreAuthorizationApproveDto | ✅ مطابق |
| `POST` | `/api/pre-authorizations/{id}/reject` | `REJECT_PRE_AUTH` | PreAuthorizationRejectDto | ✅ مطابق |
| `POST` | `/api/pre-authorizations/{id}/cancel` | `CANCEL_PRE_AUTH` | - | ✅ مطابق |
| **Inbox** | | | | |
| `GET` | `/api/pre-authorizations/inbox/pending` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| **Utility** | | | | |
| `GET` | `/api/pre-authorizations/valid` | `VIEW_PRE_AUTH` | - | ✅ مطابق |
| `POST` | `/api/pre-authorizations/maintenance/mark-expired` | `ADMIN` | - | ✅ مطابق |

---

### ❌ Endpoints مفقودة في PreAuthorization Backend

| Endpoint | الاستخدام في Frontend | الملف | السطر |
|----------|----------------------|-------|-------|
| `POST /api/pre-authorizations/{id}/start-review` | `preApprovalsService.startReview()` | [pre-approvals.service.js](frontend/src/services/api/pre-approvals.service.js#L206) | 206 |
| `GET /api/pre-authorizations/pending` | `preApprovalsService.getPending()` | [pre-approvals.service.js](frontend/src/services/api/pre-approvals.service.js#L156) | 156 |
| `GET /api/pre-authorizations/check-validity` | `preApprovalsService.checkValidity()` | [pre-approvals.service.js](frontend/src/services/api/pre-approvals.service.js#L247) | 247 |

---

### 📎 Attachments - PreAuthorization

**🚨 مشكلة:** Frontend يتوقع مسار `/api/pre-authorizations/{id}/attachments`

**Controller الموجود:** [PreAuthAttachmentController.java](backend/src/main/java/com/waad/tba/modules/preauth/controller/PreAuthAttachmentController.java#L1)  
**URL الفعلي:** `/api/preauth/{id}/attachments` ❌

| Method | URL متوقع | URL فعلي | الحالة |
|--------|----------|---------|--------|
| `POST` | `/api/pre-authorizations/{id}/attachments` | `/api/preauth/{id}/attachments` | ❌ Mismatch |
| `GET` | `/api/pre-authorizations/{id}/attachments` | `/api/preauth/{id}/attachments` | ❌ Mismatch |
| `GET` | `/api/pre-authorizations/{id}/attachments/{attId}` | `/api/preauth/{id}/attachments/{attId}` | ❌ Mismatch |
| `DELETE` | `/api/pre-authorizations/{id}/attachments/{attId}` | `/api/preauth/{id}/attachments/{attId}` | ❌ Mismatch |

---

## مطابقة Frontend ↔ Backend

### Claims Service
**الملف:** [claims.service.js](frontend/src/services/api/claims.service.js#L1)

| Method | Frontend Call | Backend Endpoint | الحالة |
|--------|--------------|------------------|--------|
| `getAll()` | `GET /claims` | ✅ موجود | ✅ |
| `getById(id)` | `GET /claims/{id}` | ✅ موجود | ✅ |
| `getByClaimNumber(num)` | `GET /claims/number/{num}` | ❌ غير موجود | ❌ |
| `create(data)` | `POST /claims` | ✅ موجود | ✅ |
| `update(id, data)` | `PUT /claims/{id}` | ✅ موجود | ✅ |
| `remove(id)` | `DELETE /claims/{id}` | ✅ موجود | ✅ |
| `getByVisit(visitId)` | `GET /claims/visit/{visitId}` | ❌ غير موجود | ❌ |
| `getByStatus(status)` | `GET /claims/status/{status}` | ❌ غير موجود | ❌ |
| `approve(id, data)` | `POST /claims/{id}/approve` | ✅ موجود | ✅ |
| `reject(id, data)` | `POST /claims/{id}/reject` | ✅ موجود | ✅ |
| `submit(id)` | `POST /claims/{id}/submit` | ✅ موجود | ✅ |
| `startReview(id)` | `POST /claims/{id}/start-review` | ✅ موجود | ✅ |
| `settle(id, data)` | `POST /claims/{id}/settle` | ✅ موجود | ✅ |
| `getCostBreakdown(id)` | `GET /claims/{id}/cost-breakdown` | ✅ موجود | ✅ |
| `getAttachments(id)` | `GET /claims/{id}/attachments` | ✅ موجود | ✅ |
| `downloadAttachment(cId, aId)` | `GET /claims/{cId}/attachments/{aId}` | ✅ موجود | ✅ |
| `getPendingClaims(params)` | `GET /claims/inbox/pending` | ✅ موجود | ✅ |
| `getApprovedClaims(params)` | `GET /claims/inbox/approved` | ✅ موجود | ✅ |

---

### Pre-Approvals Service
**الملف:** [pre-approvals.service.js](frontend/src/services/api/pre-approvals.service.js#L1)

| Method | Frontend Call | Backend Endpoint | الحالة |
|--------|--------------|------------------|--------|
| `getAll()` | `GET /pre-authorizations` | ✅ موجود | ✅ |
| `getById(id)` | `GET /pre-authorizations/{id}` | ✅ موجود | ✅ |
| `create(data)` | `POST /pre-authorizations/simple` | ❓ يوجد في preauth فقط | ⚠️ |
| `createFull(data)` | `POST /pre-authorizations` | ✅ موجود | ✅ |
| `update(id, data)` | `PUT /pre-authorizations/{id}` | ✅ موجود | ✅ |
| `remove(id)` | `DELETE /pre-authorizations/{id}` | ✅ موجود | ✅ |
| `getByStatus(status)` | `GET /pre-authorizations/status/{status}` | ✅ موجود | ✅ |
| `getPending()` | `GET /pre-authorizations/pending` | ❌ غير موجود (يوجد inbox/pending) | ⚠️ |
| `approve(id, data)` | `POST /pre-authorizations/{id}/approve` | ✅ موجود | ✅ |
| `reject(id, data)` | `POST /pre-authorizations/{id}/reject` | ✅ موجود | ✅ |
| `startReview(id)` | `POST /pre-authorizations/{id}/start-review` | ❌ غير موجود | ❌ |
| `getPending(params)` | `GET /pre-authorizations/inbox/pending` | ✅ موجود | ✅ |
| `getByMember(memberId)` | `GET /pre-authorizations/member/{memberId}` | ✅ موجود | ✅ |
| `checkValidity(memberId, serviceCode)` | `GET /pre-authorizations/check-validity` | ❌ غير موجود (يوجد /valid) | ⚠️ |
| `getAttachments(id)` | `GET /pre-authorizations/{id}/attachments` | ❌ URL خاطئ | ❌ |
| `downloadAttachment(pId, aId)` | `GET /pre-authorizations/{pId}/attachments/{aId}` | ❌ URL خاطئ | ❌ |

---

## قواعد العمل

### Claims Business Rules

| القاعدة | التطبيق | الحالة |
|---------|---------|--------|
| Claim مرتبط بـ Visit | ✅ visitId مطلوب في CreateDto | ✅ صحيح |
| لا يوجد تسعير داخل Claim يخالف Policy | ✅ CostBreakdown يُحسب من BenefitPolicy | ✅ صحيح |
| المبالغ للعرض فقط وليس للحساب | ✅ patientCoPay, netProviderAmount للعرض | ✅ صحيح |
| Status Lifecycle واضح | ✅ DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → SETTLED | ✅ صحيح |
| Reviewer Comment مطلوب للرفض | ✅ ClaimRejectDto.rejectionReason مطلوب | ✅ صحيح |

---

### Pre-Authorization Business Rules

| القاعدة | التطبيق | الحالة |
|---------|---------|--------|
| الموافقة مرتبطة بزيارة | ✅ visitId مطلوب في CreateDto | ✅ صحيح |
| لا يوجد coverage/copayment داخل الموافقة | ⚠️ يوجد copayAmount, copayPercentage في Entity | ⚠️ للعرض فقط |
| Status Lifecycle واضح | ✅ PENDING → APPROVED/REJECTED/CANCELLED/EXPIRED/USED | ✅ صحيح |

**⚠️ ملاحظة:** PreAuthorizationResponseDto يحتوي على `copayAmount` و `copayPercentage` - هذا مقبول إذا كان **للعرض فقط** وليس للحساب المالي النهائي.

---

## المرفقات

### Claims Attachments

| الميزة | الحالة | الملاحظة |
|--------|--------|---------|
| Upload attachments | ✅ موجود | `POST /api/claims/{id}/attachments` |
| List attachments | ✅ موجود | `GET /api/claims/{id}/attachments` |
| Download attachment | ✅ موجود | `GET /api/claims/{id}/attachments/{attId}` |
| Delete attachment | ✅ موجود | `DELETE /api/claims/{id}/attachments/{attId}` |

**✅ Claims Attachments مكتمل**

---

### Pre-Authorization Attachments

| الميزة | Backend URL | Frontend URL | الحالة |
|--------|-------------|--------------|--------|
| Upload | `/api/preauth/{id}/attachments` | `/api/pre-authorizations/{id}/attachments` | ❌ Mismatch |
| List | `/api/preauth/{id}/attachments` | `/api/pre-authorizations/{id}/attachments` | ❌ Mismatch |
| Download | `/api/preauth/{id}/attachments/{attId}` | `/api/pre-authorizations/{id}/attachments/{attId}` | ❌ Mismatch |
| Delete | `/api/preauth/{id}/attachments/{attId}` | `/api/pre-authorizations/{id}/attachments/{attId}` | ❌ Mismatch |

**❌ يجب إضافة endpoints في PreAuthorizationController أو تعديل Frontend**

---

## الصلاحيات والأمان

### Claims Permissions

| Endpoint | Permission | الحالة |
|----------|------------|--------|
| Create/Update/Delete | `MANAGE_CLAIMS` | ✅ محمي |
| View | `VIEW_CLAIMS` | ✅ محمي |
| Approve/Reject/Start Review | `APPROVE_CLAIMS` | ✅ محمي |
| Settle | `SETTLE_CLAIMS` | ✅ محمي |
| Attachments | `CLAIM_VIEW`, `CLAIM_CREATE`, `CLAIM_UPDATE`, `CLAIM_DELETE` | ✅ محمي |

**✅ جميع Endpoints محمية**

---

### Pre-Authorization Permissions

| Endpoint | Permission | الحالة |
|----------|------------|--------|
| Create | `CREATE_PRE_AUTH` | ✅ محمي |
| Update | `UPDATE_PRE_AUTH` | ✅ محمي |
| Delete | `DELETE_PRE_AUTH` | ✅ محمي |
| View | `VIEW_PRE_AUTH` | ✅ محمي |
| Approve | `APPROVE_PRE_AUTH` | ✅ محمي |
| Reject | `REJECT_PRE_AUTH` | ✅ محمي |
| Cancel | `CANCEL_PRE_AUTH` | ✅ محمي |
| Attachments | `PREAUTH_VIEW`, `PREAUTH_CREATE`, `PREAUTH_UPDATE`, `PREAUTH_DELETE` | ✅ محمي |

**✅ جميع Endpoints محمية**

---

## العملة والتنسيق

### Backend Currency

| الحقل | العملة | الملاحظة |
|-------|--------|---------|
| Claim.requestedAmount | LYD (implicit) | ✅ |
| Claim.approvedAmount | LYD (implicit) | ✅ |
| PreAuthorization.currency | "LYD" (explicit default) | ✅ |

---

### Frontend Currency Formatter

**الملف:** [currency-formatter.js](frontend/src/utils/currency-formatter.js#L1)

```javascript
export const formatCurrency = (amount, locale = 'en-US') => {
  // Returns: "1,500.500 د.ل"
};
```

**الملف:** [formatters.js](frontend/src/utils/formatters.js#L1)

```javascript
export const CURRENCY_CODE = 'LYD';
export const formatCurrency = (value, showSymbol = true) => { ... };
export const formatCurrencyLYD = (value) => formatCurrency(value);
```

**✅ يوجد util مركزي للتنسيق**  
**✅ جميع المبالغ بـ LYD فقط**

---

## الخلاصة والتوصيات

### ✅ مطابق للعقد (إجمالي: 33)

1. جميع Claims DTOs مطابقة للعقد
2. جميع PreAuthorization DTOs مطابقة للعقد
3. Status Lifecycle واضح ومُنفّذ لكلا الموديولين
4. Cost Calculation متكامل مع BenefitPolicy
5. جميع Endpoints الأساسية محمية بـ Permissions
6. Claims Attachments مكتمل
7. Currency formatter مركزي موجود

---

### ⚠️ اختلاف عن العقد (يجب مراجعته)

| # | المشكلة | الملف | التوصية |
|---|---------|-------|---------|
| 1 | ClaimUpdateDto.status يسمح بتغيير الحالة مباشرة | [ClaimUpdateDto.java](backend/src/main/java/com/waad/tba/modules/claim/dto/ClaimUpdateDto.java#L20) | إزالة حقل status أو تجاهله في Service |
| 2 | Frontend getPending() تستخدم `/pending` بينما Backend `/inbox/pending` | [pre-approvals.service.js](frontend/src/services/api/pre-approvals.service.js#L156) | توحيد المسار |
| 3 | PreApprovalSimpleCreateDto موجود في preauth فقط | - | نقله لـ preauthorization |

---

### ❌ Endpoints مفقودة (يجب إنشاؤها)

| # | Endpoint | الموديول | الأولوية |
|---|----------|----------|----------|
| 1 | `GET /api/claims/visit/{visitId}` | Claims | 🔴 عالية |
| 2 | `GET /api/claims/number/{claimNumber}` | Claims | 🟠 متوسطة |
| 3 | `GET /api/claims/status/{status}` | Claims | 🟠 متوسطة |
| 4 | `POST /api/pre-authorizations/{id}/start-review` | Pre-Auth | 🟠 متوسطة |
| 5 | `GET /api/pre-authorizations/check-validity` | Pre-Auth | 🟠 متوسطة |

---

### ❌ Field Mismatches (يجب إصلاحها)

| # | المشكلة | الحل |
|---|---------|------|
| 1 | PreAuth Attachments URL mismatch | إنشاء Controller جديد على `/api/pre-authorizations/{id}/attachments` |

---

### ❌ Features ناقصة

| # | الميزة | التوصية |
|---|--------|---------|
| 1 | PreAuthorization Attachments على URL الصحيح | إنشاء endpoints في PreAuthorizationController |

---

### 📋 خطة التنفيذ المقترحة

#### المرحلة 1: إصلاح Endpoints مفقودة (الأولوية القصوى)

```java
// 1. ClaimController - إضافة
@GetMapping("/visit/{visitId}")
public ResponseEntity<ApiResponse<List<ClaimViewDto>>> getClaimsByVisit(@PathVariable Long visitId);

@GetMapping("/number/{claimNumber}")
public ResponseEntity<ApiResponse<ClaimViewDto>> getByClaimNumber(@PathVariable String claimNumber);

@GetMapping("/status/{status}")
public ResponseEntity<ApiResponse<List<ClaimViewDto>>> getByStatus(@PathVariable ClaimStatus status);
```

#### المرحلة 2: توحيد PreAuth Attachments

```java
// 2. PreAuthorizationController - إضافة endpoints للمرفقات
@PostMapping("/{id}/attachments")
@GetMapping("/{id}/attachments")
@GetMapping("/{id}/attachments/{attachmentId}")
@DeleteMapping("/{id}/attachments/{attachmentId}")
```

#### المرحلة 3: تنظيف الازدواجية

- مراجعة استخدام `preauth` vs `preauthorization`
- توحيد على module واحد
- إزالة الموديول غير المستخدم

---

### 🎯 النتيجة المتوقعة بعد التنفيذ

- ✅ لا يوجد Endpoint وهمي
- ✅ لا يوجد حقل غير معرف
- ✅ لا يوجد تسعير في غير مكانه
- ✅ العقود قابلة للتوسعة بثقة
- ✅ الواجهة تعمل بدون 400 / 500 غير مبرر

---

**تم إعداد هذا التقرير بواسطة:** Spark AI Agent  
**تاريخ التدقيق:** 2026-01-15  
**الإصدار:** 1.0.0
