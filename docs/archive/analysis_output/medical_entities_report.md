# تقرير تحليل الكيانات الطبية - نظام TBA-WAAD

**تاريخ التحليل:** 2026-01-14T17:52:58.512261

**عدد الكيانات:** 9

**عدد العلاقات:** 11

---

## ملخص الوحدات

### medicaltaxonomy
- **الوصف:** التصنيفات والخدمات الطبية - البنية الهرمية للخدمات
- **يظهر في الواجهة:** نعم

### medicalpackage
- **الوصف:** الباقات الطبية - مجموعات خدمات بسعر موحد
- **يظهر في الواجهة:** نعم

### benefitpolicy
- **الوصف:** وثائق المنافع وقواعد التغطية التأمينية
- **يظهر في الواجهة:** نعم

### medicalcode
- **الوصف:** أكواد التشخيص والإجراءات الطبية (ICD-10, CPT)
- **يظهر في الواجهة:** لا
- **ملاحظة:** هذه الأكواد موجودة في الباك‌اند لكنها لا تظهر في واجهة المستخدم حالياً

### providercontract
- **الوصف:** عقود مقدمي الخدمات الصحية وأسعارها
- **يظهر في الواجهة:** نعم


---

## تفاصيل الكيانات

### CptCode
- **جدول قاعدة البيانات:** `uk_cpt_code`
- **الوحدة:** medicalcode
- **الوصف:** كود CPT - رموز الإجراءات الطبية العالمية
- **يظهر في الواجهة:** لا
- **ملاحظة:** هذه الأكواد موجودة في الباك‌اند لكنها لا تظهر في واجهة المستخدم حالياً

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| code | String | ✅ |  |  | الرمز |
| descriptionAr | String | ✅ |  |  |  |
| descriptionEn | String | ✅ |  |  |  |
| category | String | ❌ |  |  |  |
| subCategory | String | ❌ |  |  |  |
| procedureType | ProcedureType | ❌ |  |  |  |
| standardPrice | BigDecimal | ❌ |  |  |  |
| maxAllowedPrice | BigDecimal | ❌ |  |  |  |
| minAllowedPrice | BigDecimal | ❌ |  |  |  |
| covered | Boolean | ✅ |  |  |  |
| coPaymentPercentage | BigDecimal | ❌ |  |  |  |
| requiresPreAuth | Boolean | ✅ |  |  |  |
| notes | String | ❌ |  |  | ملاحظات |
| active | Boolean | ✅ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ❌ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ❌ |  |  | تاريخ التحديث |

---

### IcdCode
- **جدول قاعدة البيانات:** `uk_icd_code`
- **الوحدة:** medicalcode
- **الوصف:** كود ICD-10 - رموز التشخيص الطبي العالمية
- **يظهر في الواجهة:** لا
- **ملاحظة:** هذه الأكواد موجودة في الباك‌اند لكنها لا تظهر في واجهة المستخدم حالياً

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| code | String | ✅ |  |  | الرمز |
| descriptionAr | String | ✅ |  |  |  |
| descriptionEn | String | ✅ |  |  |  |
| category | String | ❌ |  |  |  |
| subCategory | String | ❌ |  |  |  |
| version | IcdVersion | ❌ |  |  |  |
| notes | String | ❌ |  |  | ملاحظات |
| active | Boolean | ✅ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ❌ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ❌ |  |  | تاريخ التحديث |

---

### MedicalPackage
- **جدول قاعدة البيانات:** `uk_medical_package_code`
- **الوحدة:** medicalpackage
- **الوصف:** الباقة الطبية - مجموعة خدمات بسعر موحد
- **يظهر في الواجهة:** نعم

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| code | String | ✅ |  |  | الرمز |
| nameAr | String | ✅ |  |  |  |
| nameEn | String | ✅ |  |  | الاسم بالإنجليزية |
| description | String | ❌ |  |  | الوصف |
| totalCoverageLimit | Double | ❌ |  |  |  |
| active | Boolean | ✅ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ✅ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ✅ |  |  | تاريخ التحديث |

---

### MedicalCategory
- **جدول قاعدة البيانات:** `medical_categories`
- **الوحدة:** medicaltaxonomy
- **الوصف:** التصنيف الطبي - الفئة الرئيسية للخدمات الطبية
- **يظهر في الواجهة:** نعم

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| code | String | ✅ |  |  | الرمز |
| name | String | ✅ |  |  | الاسم بالعربية |
| nameEn | String | ❌ |  |  | الاسم بالإنجليزية |
| parentId | Long | ❌ |  |  |  |
| active | boolean | ✅ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ✅ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ✅ |  |  | تاريخ التحديث |

---

### MedicalService
- **جدول قاعدة البيانات:** `medical_services`
- **الوحدة:** medicaltaxonomy
- **الوصف:** الخدمة الطبية - خدمة فردية ضمن تصنيف معين
- **يظهر في الواجهة:** نعم

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| code | String | ✅ |  |  | الرمز |
| name | String | ✅ |  |  | الاسم بالعربية |
| nameEn | String | ❌ |  |  | الاسم بالإنجليزية |
| categoryId | Long | ✅ |  |  |  |
| basePrice | BigDecimal | ❌ |  |  | السعر الأساسي |
| requiresPA | boolean | ✅ |  |  |  |
| active | boolean | ✅ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ✅ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ✅ |  |  | تاريخ التحديث |

---

### BenefitPolicyRule
- **جدول قاعدة البيانات:** `idx_bpr_policy`
- **الوحدة:** benefitpolicy
- **الوصف:** قاعدة وثيقة المنافع - تحدد حدود التغطية لكل خدمة/تصنيف
- **يظهر في الواجهة:** نعم

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| benefitPolicy | BenefitPolicy | ✅ |  | → BenefitPolicy |  |
| medicalCategory | MedicalCategory | ❌ |  | → MedicalCategory |  |
| medicalService | MedicalService | ❌ |  | → MedicalService |  |
| coveragePercent | Integer | ❌ |  |  | نسبة التغطية |
| amountLimit | BigDecimal | ❌ |  |  |  |
| timesLimit | Integer | ❌ |  |  |  |
| waitingPeriodDays | Integer | ❌ |  |  |  |
| requiresPreApproval | boolean | ❌ |  |  |  |
| notes | String | ❌ |  |  | ملاحظات |
| active | boolean | ❌ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ✅ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ❌ |  |  | تاريخ التحديث |

#### العلاقات:

- **ManyToOne** → `BenefitPolicy` (عبر `benefitPolicy`)
- **ManyToOne** → `MedicalCategory` (عبر `medicalCategory`)
- **ManyToOne** → `MedicalService` (عبر `medicalService`)

---

### BenefitPolicy
- **جدول قاعدة البيانات:** `idx_benefit_policy_employer`
- **الوحدة:** benefitpolicy
- **الوصف:** وثيقة المنافع - تحدد التغطية التأمينية للمؤمن عليهم
- **يظهر في الواجهة:** نعم

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| name | String | ✅ |  |  | الاسم بالعربية |
| policyCode | String | ❌ |  |  |  |
| description | String | ❌ |  |  | الوصف |
| employerOrganization | Organization | ✅ |  | → Organization |  |
| insuranceOrganization | Organization | ❌ |  | → Organization |  |
| startDate | LocalDate | ✅ |  |  | تاريخ البداية |
| endDate | LocalDate | ✅ |  |  | تاريخ النهاية |
| annualLimit | BigDecimal | ✅ |  |  |  |
| defaultCoveragePercent | Integer | ❌ |  |  |  |
| perMemberLimit | BigDecimal | ❌ |  |  |  |
| perFamilyLimit | BigDecimal | ❌ |  |  |  |
| defaultWaitingPeriodDays | Integer | ❌ |  |  |  |
| status | BenefitPolicyStatus | ❌ |  |  | الحالة |
| coveredMembersCount | Integer | ❌ |  |  |  |
| notes | String | ❌ |  |  | ملاحظات |
| active | boolean | ❌ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ✅ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ❌ |  |  | تاريخ التحديث |

#### العلاقات:

- **ManyToOne** → `Organization` (عبر `employerOrganization`)
- **ManyToOne** → `Organization` (عبر `insuranceOrganization`)
- **OneToMany** → `BenefitPolicyRule` (عبر `rules`)

---

### ProviderContractPricingItem
- **جدول قاعدة البيانات:** `idx_pricing_contract_id`
- **الوحدة:** providercontract
- **الوصف:** بند تسعير العقد - سعر خدمة محددة ضمن عقد
- **يظهر في الواجهة:** نعم

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| contract | ProviderContract | ✅ |  | → ProviderContract |  |
| medicalService | MedicalService | ❌ |  | → MedicalService |  |
| serviceName | String | ❌ |  |  | اسم الخدمة |
| quantity | Integer | ❌ |  |  | الكمية |
| medicalCategory | MedicalCategory | ❌ |  | → MedicalCategory |  |
| basePrice | BigDecimal | ❌ |  |  | السعر الأساسي |
| contractPrice | BigDecimal | ❌ |  |  | سعر العقد |
| discountPercent | BigDecimal | ❌ |  |  | نسبة الخصم |
| unit | String | ❌ |  |  | الوحدة |
| currency | String | ❌ |  |  | العملة |
| effectiveFrom | LocalDate | ❌ |  |  | تاريخ السريان من |
| effectiveTo | LocalDate | ❌ |  |  | تاريخ السريان إلى |
| notes | String | ❌ |  |  | ملاحظات |
| active | Boolean | ❌ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ✅ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ✅ |  |  | تاريخ التحديث |
| createdBy | String | ❌ |  |  | أنشأ بواسطة |
| updatedBy | String | ❌ |  |  | حُدث بواسطة |

#### العلاقات:

- **ManyToOne** → `ProviderContract` (عبر `contract`)
- **ManyToOne** → `MedicalService` (عبر `medicalService`)
- **ManyToOne** → `MedicalCategory` (عبر `medicalCategory`)

---

### ProviderContract
- **جدول قاعدة البيانات:** `idx_contracts_provider_id`
- **الوحدة:** providercontract
- **الوصف:** عقد مقدم الخدمة - الاتفاق بين شركة التأمين ومقدم الخدمة
- **يظهر في الواجهة:** نعم

#### الأعمدة:

| العمود | نوع البيانات | إلزامي | مفتاح أساسي | مفتاح خارجي | الوصف |
|--------|-------------|--------|------------|------------|-------|
| id | Long | ✅ | 🔑 |  | المعرف الفريد |
| contractCode | String | ✅ |  |  |  |
| contractNumber | String | ❌ |  |  |  |
| provider | Provider | ✅ |  | → Provider |  |
| status | ContractStatus | ❌ |  |  | الحالة |
| pricingModel | PricingModel | ❌ |  |  |  |
| discountPercent | BigDecimal | ❌ |  |  | نسبة الخصم |
| discountRate | BigDecimal | ❌ |  |  |  |
| startDate | LocalDate | ✅ |  |  | تاريخ البداية |
| endDate | LocalDate | ❌ |  |  | تاريخ النهاية |
| signedDate | LocalDate | ❌ |  |  |  |
| totalValue | BigDecimal | ❌ |  |  |  |
| currency | String | ❌ |  |  | العملة |
| paymentTerms | String | ❌ |  |  |  |
| autoRenew | Boolean | ❌ |  |  |  |
| contactPerson | String | ❌ |  |  |  |
| contactPhone | String | ❌ |  |  |  |
| contactEmail | String | ❌ |  |  |  |
| notes | String | ❌ |  |  | ملاحظات |
| active | Boolean | ❌ |  |  | نشط/فعال |
| createdAt | LocalDateTime | ✅ |  |  | تاريخ الإنشاء |
| updatedAt | LocalDateTime | ✅ |  |  | تاريخ التحديث |
| createdBy | String | ❌ |  |  | أنشأ بواسطة |
| updatedBy | String | ❌ |  |  | حُدث بواسطة |

#### العلاقات:

- **ManyToOne** → `Provider` (عبر `provider`)
- **OneToMany** → `ProviderContractPricingItem` (عبر `pricingItems`)

---

## خريطة العلاقات

```
BenefitPolicyRule.benefitPolicy ──► BenefitPolicy
BenefitPolicyRule.medicalCategory ──► MedicalCategory
BenefitPolicyRule.medicalService ──► MedicalService
BenefitPolicy.employerOrganization ──► Organization
BenefitPolicy.insuranceOrganization ──► Organization
BenefitPolicy.rules ──≫ BenefitPolicyRule
ProviderContractPricingItem.contract ──► ProviderContract
ProviderContractPricingItem.medicalService ──► MedicalService
ProviderContractPricingItem.medicalCategory ──► MedicalCategory
ProviderContract.provider ──► Provider
ProviderContract.pricingItems ──≫ ProviderContractPricingItem
```

## الكيانات المتعلقة بالتسعير

- CptCode
- MedicalPackage
- MedicalService
- BenefitPolicyRule
- ProviderContractPricingItem
- ProviderContract

## الكيانات المتعلقة بالتغطية

- CptCode
- MedicalPackage
- BenefitPolicyRule
- BenefitPolicy
- ProviderContractPricingItem
- ProviderContract

## الكيانات غير الظاهرة في الواجهة

- CptCode
- IcdCode