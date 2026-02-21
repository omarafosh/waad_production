# 🔴 تقرير التدقيق الشامل والقاسي لمنظومة TBA-WAAD
## التاريخ: 2026-02-17 | التصنيف: حاسم — بدون مجاملات

---

## التقييم العام الفوري

| المعيار | التقييم | الدرجة |
|---------|---------|--------|
| العمارة البرمجية (Backend) | **ضعيف** | D |
| الواجهة الأمامية (Frontend) | **ضعيف** | D |
| قاعدة البيانات والجداول | **ضعيف جداً** | D- |
| تغطية الاختبارات | **كارثي** | F |
| نظافة الكود | **ضعيف** | D |
| الأمان | **خطير** | D- |
| **التقييم الإجمالي** | **ضعيف** | **D** |

---

## 📊 الأرقام الصادمة — نظرة سريعة

| المقياس | القيمة | التعليق |
|---------|--------|---------|
| ملفات Java (Backend) | **567** | كبير لمنظومة بوظائف محدودة |
| ملفات JS/JSX (Frontend) | **687** | منتفخ بمكونات لا تُستخدم |
| سطور كود Java | **93,186** | ~164 سطر/ملف متوسط |
| سطور كود Frontend | **137,723** | ~200 سطر/ملف متوسط |
| ملفات هجرات SQL | **75** | 25% منها تصحيحية فقط! |
| ملفات Markdown في الجذر | **206** ملف = **82,923** سطر | أكثر من الكود المفيد |
| ملفات مؤقتة (.tmp) | **10** | منسية في الريبو |
| ملفات اختبار (Backend) | **1 فقط** من 567 | تغطية < 1% |
| ملفات اختبار (Frontend) | **2 فقط** من 687 | تغطية ≈ 0% |
| console.log في الإنتاج | **44 ملف** | في كل مكان |
| ملفات .backup و .old | **4** | منسية في المشروع |
| ملفات .deprecated | **1** | حرفياً ملف route باسم `.deprecated` |

---

# 🏗️ القسم الأول: تدقيق Backend (Java/Spring Boot)

## 1.1 هيكل الوحدات (Modules) — فوضى وتكرار

### جدول الوحدات وأحجامها

| الوحدة | عدد الملفات | التقييم |
|--------|------------|---------|
| claim | 70 | ⚠️ أكبر وحدة — تحتاج تقسيم |
| provider | 54 | 🔴 متداخل مع `providercontract` |
| member | 52 | ⚠️ يحتوي deprecated classes |
| rbac | 41 | 🔴 **مكرر بالكامل** مع `systemadmin` |
| systemadmin | 32 | 🔴 **مكرر بالكامل** مع `rbac` |
| preauthorization | 31 | ✅ معقول |
| settlement | 31 | ⚠️ 4 endpoints مهملة |
| medicaltaxonomy | 27 | ✅ معقول |
| eligibility | 23 | ✅ جيد (strategy pattern) |
| providercontract | 19 | 🔴 **نسخة مكررة** من provider |
| benefitpolicy | 17 | ✅ نظيف |
| pricing | 15 | ⚠️ تداخل مع providercontract |
| visit | 14 | ✅ نظيف |
| auth | 9 | 🔴 **متداخل** مع rbac |
| dashboard | 9 | ✅ قراءة فقط |
| employer | 9 | ✅ نظيف |
| medicalpackage | 7 | ✅ نظيف |
| reviewer | 5 | 🔴 **وحدة ميتة** — كل الكود محذوف |
| pdf | 5 | ✅ |
| medicalcode | 4 | 🔴 **يتيم** — بدون controller |
| admin | 2 | 🔴 متداخل مع systemadmin |
| company | 1 | 🔴 DTO وحيد بدون أي شيء آخر |
| test | 1 | 🔴 **في كود الإنتاج!** |

### 🔴 الصدمة: 3 تداخلات وحدات كارثية

#### التداخل #1: rbac ↔ systemadmin ↔ auth (82 ملف للوظيفة نفسها!)

| الملف المكرر | في `rbac` | في `systemadmin` | في `auth` |
|-------------|-----------|-------------------|-----------|
| UserCreateDto.java | ✅ | ✅ | — |
| UserUpdateDto.java | ✅ | ✅ | — |
| RoleCreateDto.java | ✅ | ✅ | — |
| UserService.java | ✅ | ✅ | — |
| UserController.java | ✅ | ✅ | — |
| PasswordResetToken.java | ✅ | — | ✅ |
| PasswordResetTokenRepository.java | ✅ | — | ✅ |

**الحكم:** وحدتان كاملتان تفعلان نفس الشيء. يجب حذف `systemadmin` بالكامل ودمج `auth` في `rbac`.

#### التداخل #2: provider ↔ providercontract (73 ملف!)

| الملف المكرر | في `provider` | في `providercontract` |
|-------------|---------------|----------------------|
| ProviderContract.java (entity) | ✅ (`LegacyProviderContract`) | ✅ (`ModernProviderContract`) |
| ProviderContractCreateDto.java | ✅ | ✅ |
| ProviderContractUpdateDto.java | ✅ | ✅ |
| ProviderContractResponseDto.java | ✅ | ✅ |
| ProviderContractRepository.java | ✅ | ✅ |
| ProviderContractService.java | ✅ | ✅ |

**الحكم:** يوجد كيانان كاملان مختلفان لنفس المفهوم. يجب حذف `provider.entity.ProviderContract` (Legacy) وحذف وحدة `providercontract` بالكامل ودمجها.

#### التداخل #3: core/email ↔ common/email (8 ملفات!)

| المسار | الملفات |
|--------|---------|
| `core/email/` | 3 ملفات |
| `common/email/` | 5 ملفات |

**خطر:** وجود `@Service` مكرر لـ EmailService قد يسبب تضارب Spring beans.

---

## 1.2 الكود الميت والمهمل (Dead Code)

### @Deprecated — أكثر من 30 حالة!

| الملف | عدد الحالات | الخطورة |
|-------|------------|---------|
| SettlementBatchController.java | 4 | DTOs داخلية "للتوافق" |
| MedicalService.java (entity) | 4 | حقول deprecated لا تزال في الكيان |
| **SettleClaimRequest.java** | 3 | **الكلاس بأكمله مهمل** |
| **MemberImportController.java** | 1 | **الكنترولر بأكمله مهمل** |
| **MemberPdfExportService.java** | 1 | **السيرفس بأكمله مهمل** |
| CardNumberGenerator.java | 1 | `forRemoval = true` — لماذا ما زال موجود؟ |
| ClaimRepository.java | 1 | دالة تُرجع `0` ثابت دائماً |

### TODO — عمل غير مكتمل في 10+ ملفات

| الموقع | المشكلة | الخطورة |
|--------|---------|---------|
| ProviderAccountService.java | `pendingClaimsCount(0) // TODO: Calculate` — **صفر مُثبَّت** | 🔴 حرج |
| ClaimFinancialSummaryService.java | `BigDecimal.ZERO; // TODO: Add settled amount` — **مبلغ مالي خاطئ** | 🔴 حرج |
| SlaMonitoringScheduler.java | `// TODO: Send notifications` — **تنبيهات SLA لا تعمل** | 🔴 حرج |
| SettlementBatchController.java | `// TODO: Fetch actual username` — اسم مستخدم وهمي | ⚠️ متوسط |
| DashboardService.java | 4 TODOs غير مكتملة | ⚠️ متوسط |
| PreAuthorization.java entity | `// TODO: Create Diagnosis entity` — FK غير مكتمل | ⚠️ متوسط |

### الوحدات الميتة بالكامل

| الوحدة/الملف | الحالة |
|-------------|--------|
| `modules/reviewer/` (5 ملفات) | **كل الكود محذوف/معلق** — ReviewerCompanyController فارغ تماماً |
| `modules/medicalcode/` (4 ملفات) | **يتيم** — كيانات بدون controller أو service |
| `modules/company/` (1 ملف) | DTO وحيد بدون أي استخدام |
| `modules/test/TestEmailController.java` | **endpoint اختبار في كود الإنتاج!** يكشف `/api/v1/test/email` |
| `modules/admin/` (2 ملفات) | مكرر مع systemadmin |

### كود معلق (Commented-out)

| الملف | المحتوى المعلق |
|-------|---------------|
| ReviewerCompanyController.java | **جسم الكنترولر بأكمله** |
| ReviewerCompanyMapper.java | **جسم الـ mapper بأكمله** |
| MedicalServiceExcelController.java | كتلة كود كاملة |

---

## 1.3 إعدادات خطيرة (Configuration)

| المشكلة | الخطورة | التفصيل |
|---------|---------|---------|
| **`allow-circular-references: true`** | 🔴 حرج | في `application.yml` و `application-dev.yml` — يُخفي مشكلة DI حقيقية |
| **`show-sql: true`** كافتراضي | 🔴 حرج | سيُسجَّل كل SQL في الإنتاج |
| **TRACE logging لـ Hibernate** | 🔴 حرج | `org.hibernate.type.descriptor.sql: TRACE` — يكشف قيم المعاملات بما فيها PII |
| **كلمة مرور ثابتة** `Admin@123` | 🔴 حرج | في PasswordHashGenerator و RbacDataInitializer |
| **كلمة مرور DB** افتراضية | ⚠️ خطير | `password: ${DB_PASSWORD:12345}` |
| **JWT secret** ثابت | ⚠️ خطير | `dev-secret-key-for-local-development-only...` في base config |
| **189 wildcard imports** (`.*`) | ⚠️ متوسط | خاصة في settlement module |
| **8 حالات `@SuppressWarnings("null")`** | ⚠️ متوسط | في البنية التحتية الأساسية |

---

## 1.4 عمليات CRUD لكل Controller

| Controller | GET | POST | PUT | DELETE | التقييم |
|------------|----:|-----:|----:|-------:|---------|
| ClaimController | 13 | 6 | 3 | 1 | ✅ كامل |
| PreAuthorizationController | 11 | 10 | 3 | 2 | ✅ كامل |
| BenefitPolicyController | 11 | 6 | 1 | 1 | ✅ كامل |
| BenefitPolicyRuleController | 10 | 4 | 1 | 3 | ✅ كامل |
| UnifiedMemberController | 13 | 3 | 2 | 3 | ✅ كامل |
| ProviderContractController | 16 | 7 | 2 | 3 | ✅ كامل |
| ProviderController | 5 | 2 | 2 | 1 | ✅ كامل |
| EmployerController | 4 | 3 | 1 | 1 | ✅ كامل |
| SettlementBatchController | 4 | 4 | 1 | 1 | ✅ كامل |
| AuthController | 2 | 11 | 1 | 0 | 🟡 بدون DELETE |
| DashboardController | 8 | 0 | 0 | 0 | ✅ قراءة فقط (صحيح) |
| ReportsController | 9 | 0 | 0 | 0 | ✅ قراءة فقط (صحيح) |
| **ReviewerCompanyController** | **0** | **0** | **0** | **0** | 🔴 **ميت** — كل شيء معلق |
| **TestEmailController** | 1 | 0 | 0 | 0 | 🔴 **في الإنتاج!** |
| UserManagementController | 0 | 0 | 3 | 1 | 🟡 ناقص GET/POST |

---

## 1.5 التغطية بالاختبارات — 🔴 كارثة

| المقياس | القيمة |
|---------|--------|
| ملفات الاختبار | **1 ملف واحد فقط** |
| الملف | `MemberExcelImportServiceTest.java` |
| الوحدات المغطاة | 1 من 23 (member فقط) |
| التغطية المقدرة | **< 1%** |

> **567 ملف إنتاج، ملف اختبار واحد.** في منظومة تأمين مالي! عمليات Claims, Settlement, Eligibility المالية بدون أي اختبار.

---

# 🎨 القسم الثاني: تدقيق Frontend (React/Vite)

## 2.1 ملفات Auth المتكررة — 🔴 كارثة القوالب

| المجلد | عدد الملفات | مُستخدم فعلاً؟ |
|--------|------------|----------------|
| `pages/auth/jwt/` | 7 ملفات | ✅ هذا فقط |
| `pages/auth/auth0/` | 6 ملفات | 🔴 **لا يُستخدم** |
| `pages/auth/aws/` | 6 ملفات | 🔴 **لا يُستخدم** |
| `pages/auth/firebase/` | 6 ملفات | 🔴 **لا يُستخدم** |
| `pages/auth/supabase/` | 6 ملفات | 🔴 **لا يُستخدم** |

**24 ملف auth لا يُستخدم.** المنظومة تستخدم JWT فقط ولكن تحمل قوالب Auth0, AWS Cognito, Firebase, Supabase من القالب الأصلي (Mantis template).

## 2.2 تكرار الصفحات والمكونات

### Provider — مجلدان مختلفان!

| المجلد | المحتوى | الغرض |
|--------|---------|-------|
| `pages/provider/` | بوابة مزود الخدمة (6 ملفات) | Provider Portal |
| `pages/providers/` | إدارة المزودين (8 ملفات + 4 backup/old) | Admin Management |

**المشكلة:** `providers/` يحتوي 4 ملفات `.backup` و `.old` منسية!

### Admin — مجلدان مختلفان!

| المجلد | المحتوى |
|--------|---------|
| `pages/admin/` | (companies, medical-reviewers, roles) |
| `pages/rbac/` | (roles, users) |

`admin/roles` و `rbac/roles` — **مجلدان للأدوار!**

### Medical — 4 مجلدات!

| المجلد | الملفات |
|--------|---------|
| `pages/medical/` | CanonicalCatalogPage + components |
| `pages/medical-categories/` | 5 ملفات CRUD |
| `pages/medical-services/` | 5 ملفات CRUD |
| `pages/medical-packages/` | 5 ملفات CRUD |

### Companies — مجلدان!

| المجلد | المحتوى |
|--------|---------|
| `pages/companies/` | index.jsx |
| `pages/settings/company/` | index.jsx |

## 2.3 خدمات API المتكررة — 🔴 فوضى

| المفهوم | الملف 1 | الملف 2 | نوع التكرار |
|---------|---------|---------|-------------|
| Company | `services/api/company.service.js` | `services/api/companySettings.service.js` | endpoints مختلفة لكن نفس المفهوم |
| Providers | `services/api/providers.service.js` | `services/providerService.js` | **نفس الشيء بأسماء مختلفة!** |
| Benefit Policy | `services/api/benefit-policies.service.js` | `services/benefitPolicyService.js` | **تكرار صريح** |
| Organization | `services/organizationService.js` | — | يتيم؟ |

### 🔴 تناقض عناوين API

| الخدمة | BASE_URL المستخدم | المشكلة |
|--------|------------------|---------|
| providerServicePrices | `/api/v1/providers` | يشمل `/api/v1/` |
| providers.service | `/providers` | بدون `/api/v1/` |
| providerService (root) | `/provider` | **اسم مختلف!** (مفرد) |
| company.service | `/pdf/settings` | لا علاقة بـ company! |
| provider-contracts | `/provider-contracts` | بدون `/api/v1/` |

**والأخطر:** ملف `.env` يحدد `VITE_API_URL=http://localhost:8080/api/v1` بينما `.env.example` يحدد `VITE_API_URL=http://localhost:8080/api` — **تناقض!**

## 2.4 console.log في الإنتاج — 44 ملف!

أعلى 10 ملفات بعدد `console.log`:

| الملف | العدد |
|-------|-------|
| contexts/JWTContext.jsx | 19 |
| services/api/members.service.js | 14 |
| pages/rbac/roles/PageCentricRolePermissions.jsx | 12 |
| pages/provider/ProviderPreApprovalSubmission.jsx | 12 |
| pages/documents/DocumentsLibrary.jsx | 7 |
| pages/rbac/roles/ModernRolePermissions.jsx | 6 |
| pages/settings/company/index.jsx | 5 |
| services/api/files.service.js | 4 |
| services/api/employers.service.js | 4 |
| auth/tokenRefresh.service.js | 3 |

## 2.5 تكرار مكتبات الرسوم البيانية — 4 مكتبات!

| المكتبة | مُستخدمة في | الحجم |
|---------|------------|-------|
| ApexCharts | dashboard sections (~8 ملفات) | كبيرة |
| Recharts | dashboard components (3 ملفات) | متوسطة |
| Chart.js + react-chartjs-2 | بعض المكونات | متوسطة |
| @mui/x-charts | KpiCard | صغيرة |

**4 مكتبات رسوم بيانية في مشروع واحد!** يجب اختيار واحدة فقط.

## 2.6 تكرار مكتبات النماذج — مكتبتان!

| المكتبة | مُستخدمة في |
|---------|------------|
| Formik + Yup | auth forms, benefit policies, providers |
| React Hook Form | CrudDrawer, table editing |

**يجب توحيدها في مكتبة واحدة.**

## 2.7 تكرار مكتبات التاريخ

| المكتبة | عدد الاستخدامات |
|---------|----------------|
| dayjs | عديدة |
| date-fns | عديدة |

**26 ملف يستخدم مكتبتي تاريخ مختلفتين.**

## 2.8 Theme — مجلدان!

| المجلد | المحتوى |
|--------|---------|
| `src/theme/` | `medical-theme.js` فقط |
| `src/themes/` | 10+ ملفات (palette, typography, overrides, provider-theme, tailwindTheme) |

**مجلد `theme/` يجب أن يُدمج في `themes/`.**

## 2.9 sections/ — بقايا القالب

| المجلد | عدد الملفات | مُستخدم؟ |
|--------|------------|----------|
| `sections/dashboard/analytics/` | 7 charts | 🔴 من قالب Mantis — لا تعرض بيانات حقيقية |
| `sections/dashboard/default/` | 3 charts | 🔴 من قالب Mantis |
| `sections/apps/profiles/` | عدة ملفات | ⚠️ يحتاج مراجعة |
| `sections/auth/jwt/` | 5 ملفات | ✅ مُستخدم |
| `sections/tools/` | إعدادات | ✅ مُستخدم |

**44 ملف في sections/**, أغلبها بقايا من قالب Mantis الأصلي.

## 2.10 التبعيات المشكوك فيها (package.json)

| التبعية | المشكلة |
|---------|---------|
| `bcryptjs` | 🔴 **تشفير في الفرونت إند؟** هذا عمل الباك إند! |
| `html5-qrcode` | 🟡 هل يُستخدم فعلاً؟ |
| `qrcode.react` | 🟡 مكتبتان QR code! |
| `react-csv` | 🟡 مع وجود `exceljs` — هل كلاهما ضروري؟ |
| `@fontsource/inter` + `poppins` + `public-sans` + `roboto` | ⚠️ **4 خطوط!** |
| `formik` + `react-hook-form` | 🔴 مكتبتان نماذج |
| `apexcharts` + `recharts` + `chart.js` + `@mui/x-charts` | 🔴 **4 مكتبات رسوم!** |
| `dayjs` + `date-fns` | ⚠️ مكتبتان تاريخ |
| `node_modules/` حجم | **912 MB** | مُنتفخ جداً |

---

# 🗃️ القسم الثالث: تدقيق قاعدة البيانات

## 3.1 الهجرات (75 migration) — 25% تصحيحية!

| الفئة | العدد | النسبة |
|-------|-------|--------|
| CREATE TABLE | ~20 | 27% |
| ALTER/ALIGN | ~30 | 40% |
| **FIX ID generation** | **9** | **12%** |
| **RELAX/UNDO NOT NULL** | **10** | **13%** |
| Index/Constraint فقط | ~6 | 8% |

> **19 من 75 هجرة (25.3%)** وُجدت فقط لتصحيح أخطاء الهجرات السابقة. هذا مؤشر على التصميم أثناء الكتابة بدلاً من التخطيط المسبق.

## 3.2 جداول يتيمة — 8 جداول بدون Entity!

| الجدول | أُنشئ في | الحالة |
|--------|---------|--------|
| `medical_codes` | V3 | مُستبدَل بـ `icd_codes` + `cpt_codes` |
| `member_deductibles` | V4 | **ميت** |
| `provider_contract_service_prices` | V4 | **ميت** |
| `member_policy_assignments` | V4 | **ميت** |
| `network_providers` | V4 | **ميت** |
| `claim_history` | V4 | **ميت** |
| `preauthorization_requests` | V4 | مُستبدَل بـ `pre_authorizations` (V16) |
| `provider_service_price_import_log` | V3 | مُستبدَل بالجمع `..._logs` (V48) |

## 3.3 جداول مكررة المفهوم — 🔴 كارثة

### Pre-authorization: 3 أسماء لمفهوم واحد!

| الجدول | Migration | Entity |
|--------|-----------|--------|
| `preauthorization_requests` | V4 | **لا يوجد** (يتيم) |
| `pre_authorizations` | V16 | `PreAuthorization.java` |
| `pre_authorization_attachments` | V4 | `PreAuthorizationAttachment.java` |

### Provider Contracts: كيانان وجداول مزدوجة!

| Entity | @Entity name | @Table | Package |
|--------|-------------|--------|---------|
| ProviderContract.java | `LegacyProviderContract` | `legacy_provider_contracts` | modules.provider |
| ProviderContract.java | `ModernProviderContract` | `provider_contracts` | modules.providercontract |

**والأسوأ:** جدول `provider_contracts` يحتوي أعمدة مكررة (legacy + modern):

| عمود قديم | عمود حديث | الغرض |
|-----------|-----------|-------|
| `contract_number` | `contract_code` | معرف العقد |
| `contract_status` | `status` | حالة العقد |
| `contract_start_date` | `start_date` | تاريخ البداية |
| `contract_end_date` | `end_date` | تاريخ النهاية |

## 3.4 أعمدة بدون Foreign Key — 11 حالة!

| الجدول | العمود | يجب أن يُشير إلى | FK موجود؟ |
|--------|--------|------------------|-----------|
| claims | settlement_batch_id | settlement_batches(id) | ❌ |
| claims | visit_id | visits(id) | ❌ |
| claims | pre_authorization_id | pre_authorizations(id) | ❌ |
| pre_authorizations | member_id | members(id) | ❌ |
| pre_authorizations | provider_id | providers(id) | ❌ |
| pre_authorizations | medical_service_id | medical_services(id) | ❌ |
| eligibility_checks | employer_id | employers(id) | ❌ |
| users | company_id | ??? | ❌ |
| legacy_provider_contracts | provider_id | providers(id) | ❌ |
| claim_audit_logs | claim_id | claims(id) | ❌ |
| claim_audit_logs | actor_user_id | users(id) | ❌ |

> جدول `pre_authorizations` (V16) بدون **أي FK** رغم أنه يُشير لـ members, providers, medical_services!

## 3.5 تناقضات أنواع البيانات

### المبالغ المالية — 3 دقات مختلفة!

| الدقة | الجداول |
|-------|---------|
| NUMERIC(15,2) | claims, pre_authorizations, settlement_batch_items |
| NUMERIC(12,2) | preauthorization_requests (V4) |
| NUMERIC(10,2) | legacy_provider_contracts, provider_service_prices |

**في نظام مالي، يجب توحيد جميع المبالغ على NUMERIC(15,2) كحد أدنى.**

### أحجام VARCHAR — فوضى

| الغرض | الأحجام الموجودة |
|-------|-----------------|
| Status | VARCHAR(50), VARCHAR(30), VARCHAR(20) |
| Name/Title | VARCHAR(255), VARCHAR(200), VARCHAR(100) |
| Notes | TEXT, VARCHAR(500), VARCHAR(2000) |

## 3.6 فهارس متكررة ومتداخلة

جدول `provider_contracts` وحده يحتوي **~12 فهرس** مع تداخلات متعددة:

| الفهرس | المشكلة |
|--------|---------|
| `idx_contracts_provider` (V4) | مغطى بـ `idx_provider_contracts_active` (V5) |
| `idx_contracts_provider_id` (V47) | **نفس العمود** — تكرار ثلاثي! |
| `idx_contracts_status` (V4) | يتعارض مع `idx_contracts_status` (V47) — **نفس الاسم, عمود مختلف!** |

## 3.7 تسمية غير متسقة

| الجدول | المشكلة |
|--------|---------|
| `user_audit_log` | **مفرد** — يجب أن يكون `user_audit_logs` |
| `module_access` | **مفرد** — يجب أن يكون `module_accesses` |
| `pre_authorization_audit` | **مفرد** — غير متسق مع `claim_audit_logs` |
| `users.company_id` | يتعارض مع `users.employer_id` — أيهما الصحيح؟ |

---

# 🔐 القسم الرابع: فحص Multi-Tenancy

## 4.1 النتيجة: بقايا Multi-Tenancy لم تُنظَّف

المنظومة صُممت أصلاً لتعدد الشركات ثم تحولت لشركة واحدة، لكن **لم تُنظَّف التعليمات البرمجية القديمة**.

### أدلة في Backend (12 ملف):

| الدليل | الموقع |
|--------|--------|
| عمود `company_id` على جدول `users` | User.java entity |
| `companyId` في LoginResponse | LoginResponse.java (يقول "deprecated") |
| `insuranceCompanyId` في UserCreateDto | systemadmin/dto/UserCreateDto.java |
| `companyId` يُعيَّن عند إنشاء مستخدم | UserManagementService.java |
| تعليقات `// Multi-tenant validation` | UserService.java |
| `organizationId` في member controller | UnifiedMemberController.java |
| واجهة `EmployerScoped` | common/entity/EmployerScoped.java |
| AuthorizationService يقول صراحة "No companyId filtering" | AuthorizationService.java |

### أدلة في Frontend (10 ملفات):

| الملف | المحتوى |
|-------|---------|
| DataExportWizard.jsx | يُشير لـ companyId |
| DataImportWizard.jsx | يُشير لـ companyId |
| useVisitsReport.js | يُشير لـ companyId |
| useBenefitPolicyReport.js | يُشير لـ companyId |
| companySettings.service.js | خدمة كاملة حول companyId |
| unified-members.service.js | يُشير لـ companyId |
| settings/company/index.jsx | صفحة إعدادات الشركة |
| EmployerView.jsx | يُشير لـ companyId |
| UnifiedMembersList.jsx | يُشير لـ companyId |
| BeneficiariesReports.jsx | يُشير لـ companyId |

**الحكم:** يجب إزالة `company_id` من جدول `users`، حذف `companyId` من جميع DTOs، إزالة واجهة `EmployerScoped`، وتنظيف جميع المراجع.

---

# 📁 القسم الخامس: نظافة الملفات

## 5.1 ملفات يجب حذفها فوراً

### جذر المشروع (Root)

| الملف | السبب |
|-------|-------|
| 10 ملفات `.tmp_*` | ملفات Python مؤقتة منسية |
| 206 ملف `.md` تقارير | **82,923 سطر** من التقارير في الجذر! |
| `cleanup.bat` | سكربت Windows — المشروع Linux |
| `start-backend.bat` | سكربت Windows |
| `start-frontend.bat` | سكربت Windows |
| `start-landing-page.bat` | سكربت Windows |
| `backend-audit.sh` | سكربت مؤقت |
| `smoke_test_v2.sh`, `test_*.sh` | سكربتات اختبار يدوية |
| `reproduce_login_500.py` | سكربت تشخيص مؤقت |
| `settlement_test_data.sql` | بيانات اختبار في الجذر |
| `critical-models-analysis.json` | تحليل مؤقت |
| `members_template (12).xlsx` | ملف Excel منسي |
| `المستفيدين_Template (1).xlsx` | ملف Excel منسي |
| 5 ملفات `imgi_*.webp` | صور في الجذر بدلاً من assets |

### داخل Backend

| الملف | السبب |
|-------|-------|
| `backend.log` (121KB) | ملف log مُلتزم في Git |
| `response.txt` | ملف debug |
| `tmp_schema_probe.py` | ملف مؤقت |
| `fix_repository_casing.py` | سكربت لمرة واحدة |
| `extract_schema.py` | أداة مساعدة |
| `generate_migrations.py` | سكربت مساعد |
| 7 ملفات `.sh` و `.bat` | أدوات مساعدة يجب نقلها لـ `tools/` |
| `schema_audit_report.md` | تقرير لا يجب أن يكون هنا |

### داخل Frontend

| الملف | السبب |
|-------|-------|
| `ProviderCreate.jsx.backup` | نسخة احتياطية — في Git لا توجد حاجة |
| `ProviderCreate.jsx.old` | نسخة قديمة |
| `ProviderEdit.jsx.backup` | نسخة احتياطية |
| `ProviderEdit.jsx.old` | نسخة قديمة |
| `RouteGuard.jsx.deprecated` | ملف مهمل |
| `check_hash.js` | أداة مساعدة مؤقتة |
| `search_script.js` | سكربت بحث مؤقت |

---

# ✅ القسم السادس: التوصيات — خطة العمل

## الأولوية 1: حرج — يجب التنفيذ فوراً

| # | الإجراء | التفصيل |
|---|---------|---------|
| 1 | **إزالة TRACE logging** | حذف `org.hibernate.type.descriptor.sql: TRACE` و `show-sql: true` من base config |
| 2 | **إزالة كلمات المرور الثابتة** | حذف `Admin@123` و `12345` و JWT dev secret من الكود |
| 3 | **إزالة TestEmailController** | حذف `modules/test/` بالكامل |
| 4 | **إصلاح TODO المالية** | إصلاح `ClaimFinancialSummaryService` (settledAmount = ZERO) و `ProviderAccountService` (pendingClaimsCount = 0) |
| 5 | **إضافة FK constraints** | إضافة الـ 11 FK المفقودة، خاصة على `pre_authorizations` و `claims` |
| 6 | **إلغاء `allow-circular-references`** | إصلاح DI الحقيقي بدلاً من إخفائه |

## الأولوية 2: عالية — خلال أسبوع

| # | الإجراء | التفصيل |
|---|---------|---------|
| 7 | **دمج rbac + systemadmin + auth** | حذف `systemadmin` كاملاً، دمج `auth` في `rbac` |
| 8 | **دمج provider + providercontract** | حذف `provider/entity/ProviderContract.java` (Legacy)، دمج providercontract في provider |
| 9 | **دمج core/email + common/email** | توحيد في مسار واحد |
| 10 | **حذف وحدة reviewer** | 5 ملفات فارغة تماماً |
| 11 | **حذف medicalcode** | 4 ملفات يتيمة بدون controller |
| 12 | **حذف company module** | DTO وحيد بلا قيمة |
| 13 | **تنظيف multi-tenancy** | إزالة `company_id` من users, حذف `companyId` من DTOs, إزالة `EmployerScoped` |
| 14 | **حذف auth pages غير JWT** | حذف `pages/auth/auth0/`, `aws/`, `firebase/`, `supabase/` (24 ملف) |
| 15 | **حذف ملفات .backup و .old** | 4 ملفات + 1 `.deprecated` |
| 16 | **إزالة console.log** | تنظيف 44 ملف |

## الأولوية 3: متوسطة — خلال أسبوعين

| # | الإجراء | التفصيل |
|---|---------|---------|
| 17 | **توحيد مكتبات الرسوم** | اختيار Recharts أو ApexCharts فقط، حذف الباقي |
| 18 | **توحيد مكتبات النماذج** | اختيار React Hook Form، حذف Formik |
| 19 | **توحيد مكتبات التاريخ** | اختيار dayjs، حذف date-fns |
| 20 | **حذف الجداول اليتيمة** | Migration جديدة لحذف 8 جداول ميتة |
| 21 | **تنظيف أعمدة legacy** | Migration لحذف الأعمدة القديمة من provider_contracts, medical_services, members |
| 22 | **توحيد VARCHAR/NUMERIC** | توحيد أحجام VARCHAR و dq monetary fields |
| 23 | **حذف الفهارس المتكررة** | تنظيف ~15 فهرس متداخل |
| 24 | **إزالة sections/ من القالب** | حذف analytics/ و default/ dashboard charts |
| 25 | **دمج theme/ في themes/** | مجلد واحد للثيمات |
| 26 | **توحيد خدمات API** | دمج providers + providerService, benefitPolicy duplicates |
| 27 | **إصلاح تناقض API URLs** | توحيد `.env` مع `.env.example` وتوحيد BASE_URLs في الخدمات |

## الأولوية 4: تحسين — خلال شهر

| # | الإجراء | التفصيل |
|---|---------|---------|
| 28 | **كتابة اختبارات** | أولوية: Settlement, Claims, Eligibility (المالية) |
| 29 | **إزالة wildcard imports** | 189 حالة → explicit imports |
| 30 | **حذف Markdown من الجذر** | نقل 206 ملف تقرير إلى `docs/` أو حذفها |
| 31 | **حذف ملفات .tmp من الجذر** | 10 ملفات Python مؤقتة |
| 32 | **إزالة `bcryptjs` من frontend** | التشفير يكون في الباك إند فقط |
| 33 | **ضغط migrations** | 75 → ~10 migrations مُجمَّعة للبيئات الجديدة |
| 34 | **إزالة 4 خطوط** | اختيار 1 فقط من (Inter, Poppins, Public Sans, Roboto) |
| 35 | **تنظيف `node_modules`** | 912 MB — حذف التبعيات غير المُستخدمة |

---

# 📊 ملخص التأثير

## ما سيتم حذفه:

| الفئة | العدد التقريبي | السطور |
|-------|---------------|--------|
| وحدات Backend ميتة/مكررة (reviewer, medicalcode, company, admin, test) | ~17 ملف | ~2,000 سطر |
| ملفات مكررة عبر الوحدات (rbac↔systemadmin, provider↔providercontract) | ~40 ملف | ~6,000 سطر |
| صفحات auth غير مُستخدمة | 24 ملف | ~3,000 سطر |
| ملفات .backup/.old/.deprecated | 5 ملفات | ~1,500 سطر |
| sections/ من القالب | ~20 ملف | ~4,000 سطر |
| ملفات .tmp و سكربتات | ~30 ملف | ~2,000 سطر |
| تقارير Markdown من الجذر | 206 ملف | ~82,000 سطر |
| جداول DB يتيمة | 8 جداول | — |
| أعمدة legacy مكررة | ~20 عمود | — |
| فهارس متكررة | ~15 فهرس | — |
| **الإجمالي** | **~370 ملف/كائن** | **~100,000+ سطر** |

## بعد التنظيف المتوقع:

| المقياس | قبل | بعد (تقدير) | التحسن |
|---------|-----|-------------|--------|
| ملفات Java | 567 | ~465 | -18% |
| ملفات Frontend | 687 | ~580 | -16% |
| وحدات Backend | 23 | ~15 | -35% |
| مجلدات pages/ | 52 | ~38 | -27% |
| تبعيات npm المكررة | ~8 | 0 | -100% |
| جداول يتيمة | 8 | 0 | -100% |
| FK مفقودة | 11 | 0 | -100% |
| migrations تصحيحية | 19 | 0 (مُجمَّعة) | -100% |

---

# 🎯 الخلاصة النهائية

المنظومة تعاني من **ديون تقنية متراكمة وشديدة** ناتجة عن:

1. **البناء فوق قالب Mantis** بدون تنظيف القالب أولاً (auth0, aws, firebase, supabase, sections, themes)
2. **تصميم multi-tenancy ثم التراجع عنه** بدون تنظيف الآثار
3. **تكرار وحدات كاملة** بدلاً من إعادة تصميم (rbac/systemadmin, provider/providercontract)
4. **كتابة الـ Entity أولاً** ثم إنشاء migration للتوافق (25% migrations تصحيحية)
5. **غياب شبه تام للاختبارات** في منظومة مالية/تأمينية
6. **206 ملف MD** في الجذر تُشوِّش على المشروع الفعلي

**التقييم:** المنظومة **تعمل لكنها غير جاهزة للإنتاج** بسبب:
- مخاطر أمنية (كلمات مرور ثابتة, TRACE logging, JWT secret)
- مخاطر مالية (TODO في حسابات مالية = أرقام صفرية ثابتة)
- ديون تقنية (~100,000 سطر يجب حذفها أو إعادة كتابتها)
- غياب اختبارات (< 1% coverage لنظام تأمين)

**المطلوب:** خطة تنظيف مرحلية (4 أسابيع) قبل أي تطوير جديد.
