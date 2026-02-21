# Interface Projections - Ready to Use
**Package:** `com.waad.tba.modules.claim.projection`  
**Purpose:** Type-safe replacements for Object[] queries  
**تاريخ:** 2026-02-10

---

## 📁 هيكل المجلد المقترح

```
backend/src/main/java/com/waad/tba/modules/claim/projection/
├── CostsByProviderProjection.java
├── MonthlyTrendProjection.java
├── ServiceDistributionProjection.java
├── RecentClaimProjection.java
├── FinancialSummaryByProviderProjection.java
├── FinancialSummaryByStatusProjection.java
└── FinancialSummaryByEmployerProjection.java
```

---

## 1️⃣ CostsByProviderProjection.java

**يستبدل:** `getCostsByProvider()` - Object[] with 4 positions

```java
package com.waad.tba.modules.claim.projection;

import java.math.BigDecimal;

/**
 * Type-safe projection for costs aggregated by provider.
 * Replaces Object[] mapping in getCostsByProvider() query.
 * 
 * @see com.waad.tba.modules.claim.repository.ClaimRepository#getCostsByProvider()
 */
public interface CostsByProviderProjection {
    
    /**
     * Provider ID (may be null for unassigned claims)
     */
    Long getProviderId();
    
    /**
     * Provider name from Claim.providerName
     */
    String getProviderName();
    
    /**
     * Total approved amount (sum of all approved amounts)
     */
    BigDecimal getTotalCost();
    
    /**
     * Number of claims for this provider
     */
    Long getClaimCount();
}
```

**الاستخدام في Repository:**
```java
@Query("SELECT c.providerId as providerId, " +
       "c.providerName as providerName, " +
       "COALESCE(SUM(c.approvedAmount), 0) as totalCost, " +
       "COUNT(c) as claimCount " +
       "FROM Claim c " +
       "WHERE c.active = true AND c.approvedAmount IS NOT NULL " +
       "GROUP BY c.providerId, c.providerName " +
       "ORDER BY totalCost DESC")
List<CostsByProviderProjection> getCostsByProvider();
```

---

## 2️⃣ MonthlyTrendProjection.java

**يستبدل:** `getMonthlyTrends()` - Object[] with 3 positions

```java
package com.waad.tba.modules.claim.projection;

/**
 * Type-safe projection for monthly claims trends.
 * Replaces Object[] mapping in getMonthlyTrends() query.
 * 
 * @see com.waad.tba.modules.claim.repository.ClaimRepository#getMonthlyTrends(java.time.LocalDateTime, java.time.LocalDateTime)
 */
public interface MonthlyTrendProjection {
    
    /**
     * Year (e.g., 2026)
     */
    Integer getYear();
    
    /**
     * Month (1-12)
     */
    Integer getMonth();
    
    /**
     * Number of claims in this month
     */
    Long getCount();
}
```

**الاستخدام في Repository:**
```java
@Query("SELECT YEAR(c.createdAt) as year, " +
       "MONTH(c.createdAt) as month, " +
       "COUNT(c) as count " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "AND c.createdAt >= :startDate " +
       "AND c.createdAt <= :endDate " +
       "GROUP BY YEAR(c.createdAt), MONTH(c.createdAt) " +
       "ORDER BY year, month")
List<MonthlyTrendProjection> getMonthlyTrends(
    @Param("startDate") LocalDateTime startDate,
    @Param("endDate") LocalDateTime endDate
);
```

---

## 3️⃣ ServiceDistributionProjection.java

**يستبدل:** `getServiceDistribution()` - Object[] with 2 positions

```java
package com.waad.tba.modules.claim.projection;

/**
 * Type-safe projection for service distribution statistics.
 * Replaces Object[] mapping in getServiceDistribution() query.
 * 
 * @see com.waad.tba.modules.claim.repository.ClaimRepository#getServiceDistribution()
 */
public interface ServiceDistributionProjection {
    
    /**
     * Service name from ClaimLine.serviceName
     */
    String getServiceName();
    
    /**
     * Number of distinct claims using this service
     */
    Long getCount();
}
```

**الاستخدام في Repository:**
```java
@Query("SELECT COALESCE(l.serviceName, 'خدمة غير محددة') as serviceName, " +
       "COUNT(DISTINCT c.id) as count " +
       "FROM Claim c JOIN c.lines l " +
       "WHERE c.active = true " +
       "GROUP BY l.serviceName " +
       "ORDER BY count DESC")
List<ServiceDistributionProjection> getServiceDistribution();
```

---

## 4️⃣ RecentClaimProjection.java

**يستبدل:** `getRecentClaims()` - Object[] with 5 positions

```java
package com.waad.tba.modules.claim.projection;

import java.time.LocalDateTime;
import com.waad.tba.modules.claim.entity.ClaimStatus;

/**
 * Type-safe projection for recent claims activity.
 * Replaces Object[] mapping in getRecentClaims() query.
 * 
 * @see com.waad.tba.modules.claim.repository.ClaimRepository#getRecentClaims(org.springframework.data.domain.Pageable)
 */
public interface RecentClaimProjection {
    
    /**
     * Claim ID
     */
    Long getId();
    
    /**
     * Member full name
     */
    String getMemberName();
    
    /**
     * Diagnosis description (may be null)
     */
    String getDiagnosisDescription();
    
    /**
     * Claim status
     */
    ClaimStatus getStatus();
    
    /**
     * Claim creation timestamp
     */
    LocalDateTime getCreatedAt();
}
```

**الاستخدام في Repository:**
```java
@Query("SELECT c.id as id, " +
       "c.member.fullName as memberName, " +
       "c.diagnosisDescription as diagnosisDescription, " +
       "c.status as status, " +
       "c.createdAt as createdAt " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "ORDER BY c.createdAt DESC")
List<RecentClaimProjection> getRecentClaims(Pageable pageable);
```

---

## 5️⃣ FinancialSummaryByProviderProjection.java

**يستبدل:** `getFinancialSummaryByProvider()` - Object[] with 7 positions

```java
package com.waad.tba.modules.claim.projection;

import java.math.BigDecimal;

/**
 * Type-safe projection for comprehensive financial summary by provider.
 * Replaces Object[] mapping in getFinancialSummaryByProvider() query.
 * 
 * @see com.waad.tba.modules.claim.repository.ClaimRepository#getFinancialSummaryByProvider()
 */
public interface FinancialSummaryByProviderProjection {
    
    /**
     * Provider ID
     */
    Long getProviderId();
    
    /**
     * Provider name
     */
    String getProviderName();
    
    /**
     * Total number of claims
     */
    Long getClaimsCount();
    
    /**
     * Sum of requested amounts
     */
    BigDecimal getRequestedAmount();
    
    /**
     * Sum of approved amounts
     */
    BigDecimal getApprovedAmount();
    
    /**
     * Sum of patient co-pay amounts
     */
    BigDecimal getPatientCoPay();
    
    /**
     * Sum of net provider amounts (after co-pay)
     */
    BigDecimal getNetProviderAmount();
}
```

**الاستخدام في Repository:**
```java
@Query("SELECT c.providerId as providerId, " +
       "c.providerName as providerName, " +
       "COUNT(c) as claimsCount, " +
       "COALESCE(SUM(c.requestedAmount), 0) as requestedAmount, " +
       "COALESCE(SUM(c.approvedAmount), 0) as approvedAmount, " +
       "COALESCE(SUM(c.patientCoPay), 0) as patientCoPay, " +
       "COALESCE(SUM(COALESCE(c.netProviderAmount, c.approvedAmount)), 0) as netProviderAmount " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "AND c.status IN (com.waad.tba.modules.claim.entity.ClaimStatus.APPROVED, com.waad.tba.modules.claim.entity.ClaimStatus.SETTLED) " +
       "GROUP BY c.providerId, c.providerName " +
       "ORDER BY COALESCE(SUM(c.approvedAmount), 0) DESC")
List<FinancialSummaryByProviderProjection> getFinancialSummaryByProvider();
```

---

## 6️⃣ FinancialSummaryByStatusProjection.java

**يستبدل:** `getFinancialSummaryByStatus()` - Object[] with 4 positions

```java
package com.waad.tba.modules.claim.projection;

import java.math.BigDecimal;
import com.waad.tba.modules.claim.entity.ClaimStatus;

/**
 * Type-safe projection for financial summary grouped by claim status.
 * Replaces Object[] mapping in getFinancialSummaryByStatus() query.
 * 
 * @see com.waad.tba.modules.claim.repository.ClaimRepository#getFinancialSummaryByStatus()
 */
public interface FinancialSummaryByStatusProjection {
    
    /**
     * Claim status
     */
    ClaimStatus getStatus();
    
    /**
     * Number of claims in this status
     */
    Long getClaimsCount();
    
    /**
     * Total requested amount
     */
    BigDecimal getTotalRequestedAmount();
    
    /**
     * Total approved amount
     */
    BigDecimal getTotalApprovedAmount();
}
```

**الاستخدام في Repository:**
```java
@Query("SELECT c.status as status, " +
       "COUNT(c) as claimsCount, " +
       "COALESCE(SUM(c.requestedAmount), 0) as totalRequestedAmount, " +
       "COALESCE(SUM(c.approvedAmount), 0) as totalApprovedAmount " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "GROUP BY c.status")
List<FinancialSummaryByStatusProjection> getFinancialSummaryByStatus();
```

---

## 7️⃣ FinancialSummaryByEmployerProjection.java

**يستبدل:** `getFinancialSummaryByEmployer()` - Object[] with 6 positions

```java
package com.waad.tba.modules.claim.projection;

import java.math.BigDecimal;

/**
 * Type-safe projection for financial summary grouped by employer organization.
 * Replaces Object[] mapping in getFinancialSummaryByEmployer() query.
 * 
 * @see com.waad.tba.modules.claim.repository.ClaimRepository#getFinancialSummaryByEmployer()
 */
public interface FinancialSummaryByEmployerProjection {
    
    /**
     * Employer organization ID
     */
    Long getEmployerOrgId();
    
    /**
     * Employer organization name
     */
    String getEmployerOrgName();
    
    /**
     * Number of claims
     */
    Long getClaimsCount();
    
    /**
     * Number of distinct members
     */
    Long getMembersCount();
    
    /**
     * Total requested amount
     */
    BigDecimal getRequestedAmount();
    
    /**
     * Total approved amount
     */
    BigDecimal getApprovedAmount();
}
```

**الاستخدام في Repository:**
```java
@Query("SELECT c.member.employerOrganization.id as employerOrgId, " +
       "c.member.employerOrganization.name as employerOrgName, " +
       "COUNT(c) as claimsCount, " +
       "COUNT(DISTINCT c.member.id) as membersCount, " +
       "COALESCE(SUM(c.requestedAmount), 0) as requestedAmount, " +
       "COALESCE(SUM(c.approvedAmount), 0) as approvedAmount " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "AND c.member.employerOrganization IS NOT NULL " +
       "GROUP BY c.member.employerOrganization.id, c.member.employerOrganization.name " +
       "ORDER BY COALESCE(SUM(c.approvedAmount), 0) DESC")
List<FinancialSummaryByEmployerProjection> getFinancialSummaryByEmployer();
```

---

## 📊 جدول المقارنة: قبل وبعد

| Query Method | قبل (Object[]) | بعد (Interface) | Positions | Type Safety |
|--------------|---------------|----------------|-----------|-------------|
| getCostsByProvider | `List<Object[]>` | `List<CostsByProviderProjection>` | 4 | ✅ |
| getMonthlyTrends | `List<Object[]>` | `List<MonthlyTrendProjection>` | 3 | ✅ |
| getServiceDistribution | `List<Object[]>` | `List<ServiceDistributionProjection>` | 2 | ✅ |
| getRecentClaims | `List<Object[]>` | `List<RecentClaimProjection>` | 5 | ✅ |
| getFinancialSummaryByProvider | `List<Object[]>` | `List<FinancialSummaryByProviderProjection>` | 7 | ✅ |
| getFinancialSummaryByStatus | `List<Object[]>` | `List<FinancialSummaryByStatusProjection>` | 4 | ✅ |
| getFinancialSummaryByEmployer | `List<Object[]>` | `List<FinancialSummaryByEmployerProjection>` | 6 | ✅ |

---

## 🎯 خطوات التطبيق

### 1. إنشاء Package
```bash
mkdir -p backend/src/main/java/com/waad/tba/modules/claim/projection
```

### 2. نسخ Interface Files
انسخ جميع الـ 7 interface files أعلاه إلى المجلد الجديد.

### 3. تحديث ClaimRepository
غيّر return type من `List<Object[]>` إلى `List<XxxProjection>` لكل query.

### 4. تحديث DashboardService
غيّر processing logic من position-based access إلى getter methods.

### 5. Build & Test
```bash
cd backend
mvn clean compile
mvn test
```

---

## ⚠️ ملاحظات مهمة

1. **Alias Matching**: اسم الـ alias في query يجب أن يطابق getter method name:
   - `c.providerId as providerId` → `getProviderId()`
   - `COUNT(c) as claimsCount` → `getClaimsCount()`

2. **Case Sensitivity**: Spring ignores case لكن best practice:
   - Query: all lowercase `as providerid`
   - Interface: camelCase `getProviderId()`

3. **NULL Handling**: Projections يمكن أن تعيد null، handle في service:
   ```java
   String name = projection.getProviderName() != null ? 
       projection.getProviderName() : "غير محدد";
   ```

4. **Performance**: Interface projections أسرع من Object[] mapping لأن Spring يستخدم proxies محسّنة.

---

## 🧪 Unit Test Example

```java
@SpringBootTest
@Transactional
class ClaimRepositoryProjectionTest {
    
    @Autowired
    private ClaimRepository claimRepository;
    
    @Test
    void testCostsByProviderProjection() {
        // Arrange: Create test data
        // ...
        
        // Act
        List<CostsByProviderProjection> results = claimRepository.getCostsByProvider();
        
        // Assert
        assertNotNull(results);
        assertFalse(results.isEmpty());
        
        CostsByProviderProjection first = results.get(0);
        assertNotNull(first.getProviderId());
        assertNotNull(first.getProviderName());
        assertNotNull(first.getTotalCost());
        assertNotNull(first.getClaimCount());
        
        // Type safety verification (compile-time check)
        Long providerId = first.getProviderId(); // ✅ Type-safe
        BigDecimal cost = first.getTotalCost();   // ✅ Type-safe
    }
}
```

---

## 📝 الخلاصة

**الفوائد:**
- ✅ Type-safe - compile-time validation
- ✅ Refactoring-safe - IDE support
- ✅ Self-documenting - واضح ما يتم return
- ✅ No position dependencies - ترتيب SELECT لا يهم
- ✅ Better performance - optimized Spring proxies

**الوقت المتوقع:**
- إنشاء interfaces: 1 ساعة
- تحديث repositories: 2 ساعات
- تحديث services: 2 ساعات
- Testing: 2 ساعات
- **المجموع: 7 ساعات** (~1 يوم عمل)

**الأولوية:**
1. 🔴 High: CostsByProviderProjection
2. 🟠 Medium: MonthlyTrendProjection, ServiceDistributionProjection
3. 🟡 Low: Financial summary projections (يمكن تأجيلها)
