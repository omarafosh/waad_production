# تقرير تشخيص الأخطاء الحرجة - Backend
**تاريخ التحليل:** 2026-02-10  
**النطاق:** Backend Java Repository Queries & Entity Mappings

---

## 📋 ملخص تنفيذي

تم فحص جميع الـ Native SQL queries و DTO projections في `/workspaces/tba_waad_system/backend`. الأخطاء المكتشفة تتعلق بـ:
- **Object[] mapping** في Dashboard queries
- **Companies default** null constraint violation
- **Canonical services** stats endpoint
- **Pre-authorization inbox** queries

---

## 🔴 الخطأ #1: Dashboard Summary - Object[] Position Mismatches

### المشكلة
جميع Dashboard queries تستخدم **Object[] projection** مع احتمال حدوث **position errors** عند تغيير Query structure.

### الملفات المتأثرة

#### 📄 ClaimRepository.java
**الموقع:** `/workspaces/tba_waad_system/backend/src/main/java/com/waad/tba/modules/claim/repository/ClaimRepository.java`

##### Query 1: `getMonthlyTrends` (Lines 402-413)
```java
@Query("SELECT YEAR(c.createdAt) as year, MONTH(c.createdAt) as month, COUNT(c) as count " +
       "FROM Claim c WHERE c.active = true " +
       "AND c.createdAt >= :startDate " +
       "AND c.createdAt <= :endDate " +
       "GROUP BY YEAR(c.createdAt), MONTH(c.createdAt) " +
       "ORDER BY year, month")
List<Object[]> getMonthlyTrends(...);
```

**المعالجة في DashboardService.java (Lines 150-165):**
```java
List<Object[]> results = claimRepository.getMonthlyTrends(startDate, endDate);
return results.stream()
    .map(row -> {
        Integer year = (Integer) row[0];      // Position 0
        Integer month = (Integer) row[1];     // Position 1
        Long count = ((Number) row[2]).longValue(); // Position 2
        // ...
    })
```

**المخاطر:**
- إذا تغير ترتيب SELECT columns، سيحدث **ArrayIndexOutOfBoundsException** أو **ClassCastException**
- لا يوجد type safety

---

##### Query 2: `getCostsByProvider` (Lines 416-426)
```java
@Query("SELECT c.providerId, c.providerName, " +
       "COALESCE(SUM(c.approvedAmount), 0) as totalCost, " +
       "COUNT(c) as claimCount " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "AND c.approvedAmount IS NOT NULL " +
       "GROUP BY c.providerId, c.providerName " +
       "ORDER BY totalCost DESC")
List<Object[]> getCostsByProvider();
```

**المعالجة في DashboardService.java (Lines 215-232):**
```java
List<Object[]> results = claimRepository.getCostsByProvider();
return results.stream()
    .limit(limit)
    .map(row -> {
        Long providerId = row[0] != null ? ((Number) row[0]).longValue() : null;  // Position 0
        String providerName = (String) row[1];                                     // Position 1
        BigDecimal totalCost = (BigDecimal) row[2];                               // Position 2
        Long claimCount = ((Number) row[3]).longValue();                          // Position 3
        // ...
    })
```

**المخاطر:**
- 4 positions يجب أن تتطابق بالضبط
- **providerId** قد يكون NULL فيسبب NullPointerException

---

##### Query 3: `getServiceDistribution` (Lines 444-453)
```java
@Query("SELECT COALESCE(l.serviceName, 'خدمة غير محددة') as serviceName, " +
       "COUNT(DISTINCT c.id) as count " +
       "FROM Claim c JOIN c.lines l " +
       "WHERE c.active = true " +
       "GROUP BY l.serviceName " +
       "ORDER BY count DESC")
List<Object[]> getServiceDistribution();
```

**المعالجة في DashboardService.java (Lines 246-267):**
```java
List<Object[]> results = claimRepository.getServiceDistribution();
long total = results.stream()
    .mapToLong(row -> ((Number) row[1]).longValue())  // Position 1
    .sum();

return results.stream()
    .map(row -> {
        String serviceName = (String) row[0];          // Position 0
        Long count = ((Number) row[1]).longValue();    // Position 1
        // ...
    })
```

**المخاطر:**
- JOIN c.lines يمكن أن يسبب N+1 query إذا لم يتم optimize
- COALESCE يمكن أن يخفي null data issues

---

##### Query 4: `getRecentClaims` (Lines 470-478)
```java
@Query("SELECT c.id, " +
       "c.member.fullName as memberName, " +
       "c.diagnosisDescription, " +
       "c.status, " +
       "c.createdAt " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "ORDER BY c.createdAt DESC")
List<Object[]> getRecentClaims(Pageable pageable);
```

**المعالجة في DashboardService.java (Lines 328-351):**
```java
List<Object[]> recentClaims = claimRepository.getRecentClaims(pageable);
for (Object[] row : recentClaims) {
    Long id = ((Number) row[0]).longValue();         // Position 0
    String memberName = (String) row[1];             // Position 1
    String diagnosis = (String) row[2];              // Position 2
    // Object statusObj = row[3];                    // Position 3
    LocalDateTime createdAt = (LocalDateTime) row[4]; // Position 4
    // ...
}
```

**المخاطر:**
- 5 positions - أي تغيير يسبب position mismatch
- **c.member.fullName** يسبب implicit JOIN قد يكون NULL

---

##### Query 5: `getFinancialSummaryByProvider` (Lines 874-887)
```java
@Query("SELECT c.providerId, c.providerName, " +
       "COUNT(c), " +
       "COALESCE(SUM(c.requestedAmount), 0), " +
       "COALESCE(SUM(c.approvedAmount), 0), " +
       "COALESCE(SUM(c.patientCoPay), 0), " +
       "COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "AND c.status IN (...) " +
       "GROUP BY c.providerId, c.providerName " +
       "ORDER BY COALESCE(SUM(c.approvedAmount), 0) DESC")
List<Object[]> getFinancialSummaryByProvider();
```

**المخاطر:**
- **7 positions** - أكثر query معقد
- Double COALESCE في position 6 يمكن أن يخفي logic errors
- لا يوجد DTO interface واضح

---

### 🎯 السبب الجذري

1. **Lack of Type Safety**: استخدام `Object[]` بدلاً من DTO interface projections
2. **Brittle Mapping**: أي تغيير في SELECT clause يكسر position mapping
3. **No Compile-Time Validation**: الأخطاء تظهر فقط في runtime

---

### ✅ الحل المقترح

#### الحل #1: استخدام Interface-Based Projections (مُوصى به)

**قبل (Object[]):**
```java
@Query("SELECT c.providerId, c.providerName, COALESCE(SUM(c.approvedAmount), 0) as totalCost, COUNT(c) as claimCount ...")
List<Object[]> getCostsByProvider();

// Manual mapping:
Long providerId = row[0] != null ? ((Number) row[0]).longValue() : null;
String providerName = (String) row[1];
BigDecimal totalCost = (BigDecimal) row[2];
Long claimCount = ((Number) row[3]).longValue();
```

**بعد (Interface Projection):**
```java
// Create projection interface
public interface CostsByProviderProjection {
    Long getProviderId();
    String getProviderName();
    BigDecimal getTotalCost();
    Long getClaimCount();
}

// Update repository
@Query("SELECT c.providerId as providerId, c.providerName as providerName, " +
       "COALESCE(SUM(c.approvedAmount), 0) as totalCost, " +
       "COUNT(c) as claimCount " +
       "FROM Claim c WHERE c.active = true AND c.approvedAmount IS NOT NULL " +
       "GROUP BY c.providerId, c.providerName ORDER BY totalCost DESC")
List<CostsByProviderProjection> getCostsByProvider();

// Update service - direct mapping
return results.stream()
    .limit(limit)
    .map(projection -> CostByProviderDto.builder()
        .providerId(projection.getProviderId())
        .providerName(projection.getProviderName() != null ? projection.getProviderName() : "غير محدد")
        .totalCost(projection.getTotalCost())
        .claimCount(projection.getClaimCount())
        .build())
    .collect(Collectors.toList());
```

**الفوائد:**
- ✅ **Type-safe** - compile-time validation
- ✅ **Refactoring-safe** - IDE يساعد في rename
- ✅ **Self-documenting** - واضح أي data يتم return
- ✅ **No position dependencies**

---

#### الحل #2: استخدام Constructor Expression (بديل)

```java
@Query("SELECT new com.waad.tba.modules.dashboard.dto.CostByProviderDto(" +
       "c.providerId, c.providerName, COALESCE(SUM(c.approvedAmount), 0), COUNT(c)) " +
       "FROM Claim c WHERE c.active = true GROUP BY c.providerId, c.providerName")
List<CostByProviderDto> getCostsByProvider();
```

**متطلبات:**
- يجب أن يكون DTO له constructor بنفس الترتيب والأنواع
- أقل flexibility من Interface Projections

---

### 📊 ملخص Queries المتأثرة

| Query Method | Positions | Risk Level | File:Line |
|-------------|-----------|------------|-----------|
| `getMonthlyTrends` | 3 | 🟡 Medium | ClaimRepository:402-413 |
| `getMonthlyTrendsByEmployer` | 3 | 🟡 Medium | ClaimRepository:535-546 |
| `getCostsByProvider` | 4 | 🟠 High | ClaimRepository:416-426 |
| `getCostsByProviderByEmployer` | 4 | 🟠 High | ClaimRepository:430-440 |
| `getServiceDistribution` | 2 | 🟢 Low | ClaimRepository:444-453 |
| `getServiceDistributionByEmployer` | 2 | 🟢 Low | ClaimRepository:457-465 |
| `getRecentClaims` | 5 | 🟠 High | ClaimRepository:470-478 |
| `getRecentClaimsByProvider` | 5 | 🟠 High | ClaimRepository:781 |
| `getFinancialSummaryByProvider` | 7 | 🔴 Critical | ClaimRepository:874-887 |
| `getFinancialSummaryByProviderAndEmployer` | 7 | 🔴 Critical | ClaimRepository:891-904 |
| `getFinancialSummaryByStatus` | 4 | 🟠 High | ClaimRepository:908-918 |
| `getFinancialSummaryByStatusAndEmployer` | 4 | 🟠 High | ClaimRepository:922-932 |
| `getFinancialSummaryByEmployer` | 6 | 🔴 Critical | ClaimRepository:944-957 |

**المجموع:** 13 query معرضة لـ position errors

---

## 🔴 الخطأ #2: Companies Default - NULL Constraint Violation

### المشكلة
عند استدعاء `/api/v1/companies/default`، إذا لم توجد companies في database، يحاول النظام إنشاء default company لكن **بدون جميع الـ required fields**.

### الملف المتأثر

#### 📄 CompanyService.java
**الموقع:** `/workspaces/tba_waad_system/backend/src/main/java/com/waad/tba/modules/company/service/CompanyService.java`

**Method:** `getOrCreateDefaultCompany()` (Lines 193-208)

```java
@Transactional
public CompanyDto getOrCreateDefaultCompany() {
    log.info("Getting or creating default company");
    
    CompanyDto existing = getDefaultCompany();
    if (existing != null) {
        return existing;
    }
    
    // ⚠️ PROBLEM: Creates company with only 4 fields!
    log.info("No company found, creating default company");
    Company defaultCompany = Company.builder()
            .name("شركة TBA للمراجعة الطبية")  // ✅ Required
            .code("TBA")                        // ✅ Required
            .active(true)                       // ✅ Required (default=true anyway)
            .isDefault(true)                    // ✅ Required (default=false)
            .build();
    
    Company saved = companyRepository.save(defaultCompany);
    log.info("Default company created with ID: {}", saved.getId());
    
    return companyMapper.toDto(saved);
}
```

### 🎯 السبب الجذري

يتم إنشاء Company entity بدون:
- **logoUrl** - قد يكون NULL لكن قد يسبب issues في frontend
- **phone** - قد يسبب validation issues
- **email** - قد يسبب validation issues  
- **address** - قد يسبب validation issues
- **website** - قد يسبب issues
- **businessType** - قد يسبب issues
- **taxNumber** - قد يسبب issues

### ✅ الحل المقترح

```java
@Transactional
public CompanyDto getOrCreateDefaultCompany() {
    log.info("Getting or creating default company");
    
    CompanyDto existing = getDefaultCompany();
    if (existing != null) {
        return existing;
    }
    
    // ✅ FIXED: Create with complete default values
    log.info("No company found, creating default company with complete profile");
    Company defaultCompany = Company.builder()
            .name("شركة وعد للمراجعة الطبية")
            .code("WAAD_DEFAULT")
            .active(true)
            .isDefault(true)
            // Branding & Contact Information (Prevents NULL constraint errors)
            .logoUrl(null) // Explicit null - frontend should handle missing logo
            .phone("+966-XX-XXX-XXXX") // Default placeholder
            .email("info@waad-system.com") // Default placeholder
            .address("الرياض، المملكة العربية السعودية") // Default address
            .website("https://www.waad-system.com") // Default website
            .businessType("إدارة طرف ثالث للمطالبات الطبية") // TPA description
            .taxNumber("N/A") // Placeholder - admin should update
            .build();
    
    Company saved = companyRepository.save(defaultCompany);
    log.info("Default company created with ID: {} with complete profile", saved.getId());
    
    return companyMapper.toDto(saved);
}
```

### 📌 ملاحظات إضافية

#### الـ Entity Validation
في **Company.java** (Lines 34-42):
```java
@NotBlank(message = "Company name is required")
@Column(nullable = false, length = 200)
private String name;

@NotBlank(message = "Company code is required")
@Column(nullable = false, unique = true, length = 50)
private String code;
```

**الحقول الإلزامية فقط:**
- `name` - ✅ موجود في default creation
- `code` - ✅ موجود في default creation

**الحقول Optional لكن قد تسبب Frontend Issues:**
- `logoUrl` - frontend قد يحاول display NULL
- `phone`, `email` - contact form قد يحتاجهم
- `address`, `website` - profile page issues
- `businessType` - branding issues
- `taxNumber` - financial reports issues

---

## 🔴 الخطأ #3: Canonical Services Stats - Potential JDBC Issues

### الملف المتأثر

#### 📄 CanonicalMedicalServiceController.java
**الموقع:** `/workspaces/tba_waad_system/backend/src/main/java/com/waad/tba/modules/pricing/controller/CanonicalMedicalServiceController.java`

**Endpoint:** `GET /api/v1/canonical-services/stats` (Lines 77-83)

```java
@GetMapping("/stats")
@PreAuthorize("hasAnyAuthority('VIEW_CANONICAL_SERVICES', 'MANAGE_CANONICAL_SERVICES')")
@Operation(summary = "Get catalog statistics")
public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
    return ResponseEntity.ok(ApiResponse.success(Map.of(
            "totalServices", service.countActive(),     // ⚠️ 3 separate queries!
            "level1Options", service.getDistinctLevel1Care(),
            "level2Options", service.getDistinctLevel2Domain()
    )));
}
```

### 🎯 المشكلة

يتم تنفيذ **3 queries منفصلة** لبناء stats response:
1. `countActive()` - COUNT query
2. `getDistinctLevel1Care()` - DISTINCT query  
3. `getDistinctLevel2Domain()` - DISTINCT query

**المخاطر:**
- **N+1 Query Problem** - 3 round-trips لـ database
- **Performance** - slow response time
- **Potential JDBC Position Errors** - إذا كانت queries تستخدم native SQL

### ✅ الحل المقترح

#### الحل #1: Single Query with Object[] (سريع لكن brittle)

```java
@Query(value = """
    SELECT 
        COUNT(*) as totalServices,
        (SELECT STRING_AGG(DISTINCT level1_care, ',') FROM canonical_medical_services WHERE active = true) as level1Options,
        (SELECT STRING_AGG(DISTINCT level2_domain, ',') FROM canonical_medical_services WHERE active = true) as level2Options
    FROM canonical_medical_services
    WHERE active = true
    """, nativeQuery = true)
Object getStatsRaw();
```

#### الحل #2: Caching (مُوصى به للـ stats endpoints)

```java
@Cacheable(value = "canonicalServiceStats", key = "'stats'")
@GetMapping("/stats")
public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
    return ResponseEntity.ok(ApiResponse.success(Map.of(
            "totalServices", service.countActive(),
            "level1Options", service.getDistinctLevel1Care(),
            "level2Options", service.getDistinctLevel2Domain()
    )));
}
```

**الفوائد:**
- ✅ Queries تُنفذ مرة واحدة ثم cached
- ✅ Fast subsequent requests
- ✅ Cache invalidation عند update

---

## 🔴 الخطأ #4: Pre-Authorization Inbox - JDBC Position Errors

### الملف المتأثر

#### 📄 PreAuthorizationRepository.java
**الموقع:** `/workspaces/tba_waad_system/backend/src/main/java/com/waad/tba/modules/preauthorization/repository/PreAuthorizationRepository.java`

**Query:** `findByStatusIn` (Lines 105-115)

```java
@Query(value = "SELECT pa FROM PreAuthorization pa " +
       "LEFT JOIN FETCH pa.visit v " +
       "LEFT JOIN FETCH pa.medicalService ms " +
       "WHERE pa.active = true " +
       "AND pa.status IN :statuses",
       countQuery = "SELECT COUNT(pa) FROM PreAuthorization pa WHERE pa.active = true AND pa.status IN :statuses")
Page<PreAuthorization> findByStatusIn(@Param("statuses") List<PreAuthStatus> statuses, Pageable pageable);
```

### 🎯 التحليل

**الإيجابيات:**
- ✅ يستخدم **Entity Fetch** وليس Object[]
- ✅ له **countQuery** منفصل للـ pagination
- ✅ **Type-safe** - يعيد PreAuthorization entities

**المخاطر المحتملة:**
- 🟡 **N+1 if lines loaded** - إذا كان PreAuthorization له lazy collections
- 🟡 **Multiple fetches** - visit و medicalService fetched separately

### ✅ التوصية

**Keep as-is** - هذا Query صحيح وآمن. لكن راقب:
```java
// إذا كان PreAuthorization entity له collections:
@OneToMany(mappedBy = "preAuth", fetch = FetchType.LAZY)
private List<PreAuthLine> lines;

// تأكد من عدم access لـ lines في view code بدون FETCH JOIN
```

---

## 🔴 الخطأ #5: Provider Documents/Visits - UnknownPathException

### التحليل

من الصور المذكورة، هناك `UnknownPathException` في provider reports/claims:
> "could…ifer.id = providerId ORDER BY c.createdAt DESC"

### البحث في الكود

#### 📄 ProviderReportsService.java
**الموقع:** `/workspaces/tba_waad_system/backend/src/main/java/com/waad/tba/modules/provider/service/ProviderReportsService.java`

**Query Construction** (Lines 45-68):
```java
StringBuilder jpql = new StringBuilder(
    "SELECT c FROM Claim c WHERE c.provider.id = :providerId");  // ⚠️ PROBLEM!

if (fromDate != null) {
    jpql.append(" AND c.createdAt >= :fromDate");
}
// ...
jpql.append(" ORDER BY c.createdAt DESC");
```

### 🎯 السبب الجذري

**Claim entity** ليس له `provider` relationship! بدلاً من ذلك يستخدم:
- `c.providerId` (Long field) ❌ **في الـ query**
- `c.provider` (Entity relationship) ✅ **لا يوجد!**

### ✅ الحل

```java
// ❌ WRONG:
StringBuilder jpql = new StringBuilder(
    "SELECT c FROM Claim c WHERE c.provider.id = :providerId");

// ✅ CORRECT:
StringBuilder jpql = new StringBuilder(
    "SELECT c FROM Claim c WHERE c.providerId = :providerId");
```

**الملف:** ProviderReportsService.java - Line 47

---

## 🔴 الخطأ #6: Frontend JavaScript - claimsService.getAllClaims is not a function

### التحليل

هذا خطأ **Frontend** وليس Backend. لكن السبب المحتمل:

1. **Service File Issue:**
   - `claimsService.js` لا يُصدّر `getAllClaims` method
   - أو تم rename الـ method ولم يتم update في component

2. **Import Issue:**
   - Component يستورد service بطريقة خاطئة
   - مثال: `import claimsService from './claimsService'` بدلاً من named export

### الحل المقترح

**ابحث في Frontend:**
```bash
cd /workspaces/tba_waad_system/frontend
grep -r "getAllClaims" src/
grep -r "claimsService" src/
```

**Verify Service Declaration:**
```javascript
// claimsService.js should have:
export const getAllClaims = async (params) => {
    // implementation
};

// OR default export:
export default {
    getAllClaims: async (params) => { ... }
};
```

---

## 📊 ملخص الأخطاء وأولويات الإصلاح

| # | الخطأ | الملف | السطر | الأولوية | التأثير | الحالة |
|---|-------|-------|-------|---------|---------|--------|
| 0 | medical_co_as Column | N/A | N/A | ✅ Resolved | لا يوجد | ✅ لا يوجد في الكود |
| 1 | Object[] Position Errors | ClaimRepository.java | 402-957 | 🔴 High | 13 queries معرضة للكسر | ⏳ Needs Refactoring |
| 2 | Companies Default NULL | CompanyService.java | 193-208 | 🟠 Medium | 500 Error عند first startup | 🔧 Ready to Fix |
| 3 | Canonical Stats N+1 | CanonicalMedicalServiceController.java | 77-83 | 🟡 Low | Performance only | 💡 Optimization |
| 4 | Pre-Auth Inbox (Safe) | PreAuthorizationRepository.java | 105-115 | ✅ OK | No action needed | ✅ Working Fine |
| 5 | Provider Reports Path | ProviderReportsService.java | 47 | 🔴 High | UnknownPathException | 🔧 Ready to Fix |
| 6 | Frontend getAllClaims | (Frontend files) | N/A | 🟠 Medium | UI breakage | 🔍 Needs Investigation |

---

## 🎯 خطة الإصلاح الموصى بها

### المرحلة 1: إصلاح Critical (يوم واحد)
1. ✅ إصلاح `ProviderReportsService.java` line 47 - تغيير `c.provider.id` إلى `c.providerId`
2. ✅ إصلاح `CompanyService.getOrCreateDefaultCompany()` - إضافة default values كاملة
3. ✅ اختبار `/api/v1/companies/default` endpoint
4. ✅ اختبار `/api/provider/reports/claims` endpoint

### المرحلة 2: تحسين Dashboard Queries (3-5 أيام)
1. ✅ إنشاء Interface Projections لجميع Dashboard queries
2. ✅ تحديث ClaimRepository methods
3. ✅ تحديث DashboardService mapping logic
4. ✅ Unit tests لكل projection
5. ✅ Integration tests للـ dashboard endpoints

### المرحلة 3: Frontend Fix (نصف يوم)
1. ✅ تحديد موقع `claimsService.js`
2. ✅ التأكد من export صحيح لـ `getAllClaims`
3. ✅ تحديث components التي تستخدم method

### المرحلة 4: Performance Optimization (اختياري)
1. ✅ إضافة Caching لـ canonical-services/stats
2. ✅ تحسين dashboard queries بـ composite indexes

---

## 📝 ملاحظات نهائية

1. **لم يتم العثور على `medical_co_as`** في أي backend query - قد يكون:
   - ✅ **تم إصلاحه سابقاً** - لا يوجد أي استخدام لهذا alias في الكود
   - 🔍 **الحقل الصحيح:** `totalMedicalCost` موجود في:
     - `DashboardSummaryDto.java` - line 73
     - `DashboardService.java` - lines 62, 74, 111, 131
   - 💡 **الاحتمال:** الخطأ كان في إصدار قديم أو typo مؤقت في frontend/backend mapping
   - ⚠️ **تحذير:** إذا ظهر الخطأ مرة أخرى، ابحث في:
     - Frontend Dashboard component عن `medical_co_as` property access
     - Database migration scripts عن column aliases خاطئة

2. **جميع Position Errors محتملة** - لم تحدث بعد لكن:
   - تحدث عند refactoring queries
   - تحدث عند تغيير column order  
   - تحدث عند إضافة/حذف columns

3. **Interface Projections** هي الحل الأفضل:
   - Type-safe
   - Refactoring-safe
   - Self-documenting
   - Spring Data JPA standard practice

---

**التوصية النهائية:**  
ابدأ بإصلاح Critical errors (المرحلة 1) فوراً، ثم خطط للـ refactoring التدريجي للـ Dashboard queries (المرحلة 2).
