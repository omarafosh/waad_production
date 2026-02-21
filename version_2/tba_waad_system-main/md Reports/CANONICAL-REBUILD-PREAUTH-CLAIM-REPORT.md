# 🏗️ تقرير إعادة البناء الكانونية - PreAuthorization & Claim

## CANONICAL REBUILD: Visit-Centric, Contract-Driven Architecture

**التاريخ:** 2026-01-16  
**الحالة:** ✅ مكتمل  
**الإصدار:** 2.0.0

---

## 📋 ملخص التغييرات

### القوانين المعمارية المُطبقة

```
❌ لا يجوز لأي كيان تجاوز Visit
❌ لا يجوز كتابة الخدمة يدوياً
❌ لا يجوز إدخال السعر من المستخدم
✅ كل البيانات تتدفق من: Visit → Diagnosis → Medical Service → Contract Price → PreAuth/Claim
```

---

## 🔄 التغييرات في PreAuthorization

### PreAuthorization.java (Entity)
```java
// الحقول الجديدة المضافة:
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "visit_id", nullable = false)
private Visit visit;  // ← كان Long visitId

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "medical_service_id", nullable = false)
private MedicalService medicalService;  // ← جديد، إلزامي

@Column(nullable = false, precision = 15, scale = 2)
private BigDecimal contractPrice;  // ← من العقد، ليس المستخدم

private String diagnosisCode;
private String diagnosisDescription;
private Boolean requiresPA;

// تم حذف:
// - requestedAmount (السعر من العقد فقط)
```

### PreAuthorizationCreateDto.java
```java
// تغييرات:
@NotNull
private Long medicalServiceId;  // ← كان serviceCode String

// تم حذف:
// - requestedAmount (السعر من العقد)
// - memberId/providerId (مشتقان من Visit)
```

### PreAuthorizationService.java
```java
// منطق جديد في createPreAuthorization():
1. التحقق من وجود Visit (إلزامي)
2. جلب MedicalService والتحقق من isActive
3. التحقق من service.isRequiresPA()
4. جلب السعر من ProviderContractService.getEffectivePrice()
5. رمي استثناء إذا لم يوجد عقد
```

---

## 🔄 التغييرات في Claim

### Claim.java (Entity)
```java
// الحقول الجديدة/المعدلة:
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "visit_id", nullable = false)
private Visit visit;

@Column(nullable = false)
private Long providerId;  // ← كان nullable

private String diagnosisCode;       // ← بدلاً من diagnosis
private String diagnosisDescription;
private LocalDate serviceDate;      // ← بدلاً من visitDate

// تم إضافة validateArchitecturalRules() في @PrePersist
// تم تحديث calculateFields() لجمع من lines
```

### ClaimLine.java (Entity)
```java
// الحقول الجديدة:
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "medical_service_id", nullable = false)
private MedicalService medicalService;

// حقول denormalized للعرض:
private String serviceName;
private Long serviceCategoryId;
private Boolean requiresPA;

// تم إضافة validateArchitecturalRules() في @PrePersist
```

### ClaimCreateDto.java
```java
@NotNull @Positive
private Long visitId;  // ← إلزامي

@NotEmpty @Valid
private List<ClaimLineDto> lines;  // ← إلزامي، على الأقل سطر واحد

private String diagnosisCode;
private String diagnosisDescription;
private Long preAuthorizationId;

// تم حذف:
// - providerName (من Visit)
// - diagnosis (استبدل بـ diagnosisCode/Description)
// - visitDate (من Visit)
// - requestedAmount (محسوب من lines)
// - memberId (من Visit)
```

### ClaimLineDto.java
```java
@NotNull @Positive
private Long medicalServiceId;  // ← إلزامي، بدلاً من serviceCode

@NotNull @Min(1)
private Integer quantity = 1;

// حقول القراءة فقط:
private String serviceCode;      // ← denormalized
private String serviceName;      // ← denormalized
private BigDecimal unitPrice;    // ← من العقد
private BigDecimal totalPrice;   // ← محسوب
private Boolean requiresPA;
```

### ClaimMapper.java
```java
// toEntity() الجديد:
1. التحقق من visitId (إلزامي)
2. جلب Visit → Member → Provider
3. لكل ClaimLineDto:
   - جلب MedicalService بـ medicalServiceId
   - جلب السعر من ProviderContractService.getEffectivePrice()
   - بناء ClaimLine مع السعر من العقد
4. حساب requestedAmount من مجموع lines

// updateEntityFromDto() المعدل:
- لا يسمح بتعديل providerName, visitDate, requestedAmount
- لا يسمح بتعديل lines (الأسعار من العقد)
- يسمح فقط بتعديل: doctorName, diagnosis, status, reviewerComment, attachments
```

### ClaimService.java
```java
// createClaim() المعدل:
1. التحقق من visitId (إلزامي)
2. ClaimMapper يعالج كل منطق العقد
3. التحقق من BenefitPolicy للعضو
4. حفظ وتسجيل في Audit
```

### ClaimViewDto.java
```java
// الحقول الجديدة:
private Long visitId;
private String visitType;
private LocalDate serviceDate;
private Long providerId;
private String diagnosisCode;
private String diagnosisDescription;

// @Deprecated:
private String diagnosis;  // للتوافق مع الإصدارات السابقة
```

### ClaimUpdateDto.java
```java
// الحقول المسموحة للتحديث:
private String doctorName;
private String diagnosisCode;
private String diagnosisDescription;
private ClaimStatus status;
private BigDecimal approvedAmount;
private String reviewerComment;
private Long preAuthorizationId;
private List<ClaimAttachmentDto> attachments;
private Boolean active;

// تم حذف (لمنع الانتهاكات):
// - providerName
// - visitDate
// - requestedAmount
// - lines (أسعار العقد)
```

---

## 🔒 التحقق المعماري (Architectural Validation)

### في الكيانات (@PrePersist)
```java
private void validateArchitecturalRules() {
    if (visit == null) {
        throw new IllegalStateException("ARCHITECTURAL VIOLATION: [Entity] MUST reference a Visit");
    }
    if (medicalService == null) {
        throw new IllegalStateException("ARCHITECTURAL VIOLATION: [Entity] MUST reference a MedicalService");
    }
    if (contractPrice == null || contractPrice.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalStateException("ARCHITECTURAL VIOLATION: Contract price must be resolved from Provider Contract");
    }
}
```

### في ClaimMapper.toEntity()
```java
// يرمي IllegalArgumentException عند:
// - visitId == null
// - Visit لا يحتوي على Member
// - Visit لا يحتوي على Provider
// - lines فارغة
// - أي line بدون medicalServiceId
// - لا يوجد عقد سعر للخدمة مع المزود
// - خدمة تتطلب PA بدون preAuthorizationId
```

---

## 📊 الجدول المقارن

| الحقل | قبل | بعد | ملاحظة |
|-------|-----|-----|--------|
| Visit | `Long visitId` | `@ManyToOne Visit visit` | FK إلزامي |
| Service | `String serviceCode` | `@ManyToOne MedicalService` | FK إلزامي |
| Price | `BigDecimal requestedAmount` (user) | `BigDecimal contractPrice` (auto) | من العقد |
| Diagnosis | `String diagnosis` | `diagnosisCode + diagnosisDescription` | منظم |
| Provider | `String providerName` | `Long providerId + providerName` | من Visit |
| Lines | Optional | `@NotEmpty` | إلزامي |

---

## 🧪 اختبار التجميع

```bash
$ mvn compile -q
# نجاح ✅

$ mvn compile test-compile -q
# نجاح ✅
```

---

## 📁 الملفات المعدلة

### Backend
1. `PreAuthorization.java` - Entity
2. `PreAuthorizationCreateDto.java`
3. `PreAuthorizationResponseDto.java`
4. `PreAuthorizationService.java`
5. `Claim.java` - Entity
6. `ClaimLine.java` - Entity
7. `ClaimCreateDto.java`
8. `ClaimLineDto.java`
9. `ClaimUpdateDto.java`
10. `ClaimViewDto.java`
11. `ClaimMapper.java`
12. `ClaimService.java`

---

## ⚠️ الخطوات التالية

### 1. Database Migration (مطلوب)
```sql
-- إضافة أعمدة FK الجديدة
ALTER TABLE pre_authorizations ADD COLUMN medical_service_id BIGINT;
ALTER TABLE pre_authorizations ADD COLUMN diagnosis_code VARCHAR(50);
ALTER TABLE pre_authorizations ADD COLUMN diagnosis_description VARCHAR(500);

ALTER TABLE claims ADD COLUMN diagnosis_code VARCHAR(50);
ALTER TABLE claims ADD COLUMN diagnosis_description VARCHAR(500);
ALTER TABLE claims RENAME COLUMN visit_date TO service_date;

ALTER TABLE claim_lines ADD COLUMN medical_service_id BIGINT;
ALTER TABLE claim_lines ADD COLUMN service_name VARCHAR(255);
ALTER TABLE claim_lines ADD COLUMN service_category_id BIGINT;
ALTER TABLE claim_lines ADD COLUMN requires_pa BOOLEAN;

-- إضافة القيود
ALTER TABLE pre_authorizations ADD CONSTRAINT fk_preauth_medical_service 
    FOREIGN KEY (medical_service_id) REFERENCES medical_services(id);

ALTER TABLE claim_lines ADD CONSTRAINT fk_claim_line_medical_service 
    FOREIGN KEY (medical_service_id) REFERENCES medical_services(id);
```

### 2. Frontend Updates (مطلوب)
- `PreApprovalCreate.jsx` - تغيير من نص حر إلى dropdown للخدمات
- `ClaimCreate.jsx` - تغيير إلى اختيار الخدمات من العقد

### 3. API Testing
- اختبار POST /api/preauthorizations مع medicalServiceId
- اختبار POST /api/claims مع visitId و lines

---

## ✅ الخلاصة

تم تطبيق **إعادة البناء الكانونية** بنجاح:

1. ✅ Visit-Centric: كل PreAuth/Claim يجب أن يرتبط بـ Visit
2. ✅ Contract-Driven: الأسعار تأتي من ProviderContract فقط
3. ✅ System-Selected: الخدمات يتم اختيارها من MedicalService (لا نص حر)
4. ✅ Validation: تحقق معماري في @PrePersist وفي الـ Mapper
5. ✅ Compilation: التجميع ناجح بدون أخطاء

**الهندسة المعمارية الجديدة تمنع:**
- إنشاء Claims بدون Visit
- إدخال أسعار يدوية
- كتابة أسماء خدمات حرة
- تعديل الأسعار بعد الإنشاء
