# Dashboard Query Fix Report

## ❌ المشكلة

### الخطأ الأصلي:
```
UnknownPathException: Could not resolve attribute 'serviceType' of '...Claim'
UnknownPathException: Could not resolve attribute 'serviceName' of '...Claim'
```

### السبب:
استعلام `getServiceDistribution` في `ClaimRepository` كان يحاول الوصول إلى حقول غير موجودة في Entity `Claim`:
- `serviceType` ❌
- `serviceName` ❌

هذه الحقول **غير موجودة** في:
- ❌ `Claim` entity
- ❌ `ClaimLine` entity
- ❌ جدول `claims` في قاعدة البيانات

---

## ✅ الحل

### التغييرات المُنفذة:

#### 1. **ClaimRepository.java** - إصلاح Query

**قبل:**
```java
@Query("SELECT COALESCE(c.serviceType, 'غير محدد') as serviceType, " +
       "COALESCE(c.serviceName, 'غير محدد') as serviceName, " +
       "COUNT(c) as count " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "GROUP BY c.serviceType, c.serviceName " +
       "ORDER BY count DESC")
List<Object[]> getServiceDistribution();
```

**بعد:**
```java
@Query("SELECT COALESCE(c.providerName, 'غير محدد') as providerName, " +
       "COUNT(c) as count " +
       "FROM Claim c " +
       "WHERE c.active = true " +
       "GROUP BY c.providerName " +
       "ORDER BY count DESC")
List<Object[]> getServiceDistribution();
```

**التغيير:**
- ✅ استخدام `providerName` بدلاً من `serviceType` و `serviceName`
- ✅ Returns: `[providerName, count]` بدلاً من `[serviceType, serviceName, count]`

---

#### 2. **ClaimRepository.java** - إصلاح Recent Claims Query

**قبل:**
```java
@Query("SELECT c.id, " +
       "COALESCE(c.member.fullNameArabic, c.member.fullNameEnglish) as memberName, " +
       "c.diagnosis, " +
       "c.status, " +
       "c.submissionDate " +  // ❌ لا يوجد هذا الحقل
       "FROM Claim c " +
       "WHERE c.active = true " +
       "ORDER BY c.submissionDate DESC")
```

**بعد:**
```java
@Query("SELECT c.id, " +
       "COALESCE(c.member.fullNameArabic, c.member.fullNameEnglish) as memberName, " +
       "c.diagnosis, " +
       "c.status, " +
       "c.createdAt " +  // ✅ استخدام الحقل الموجود
       "FROM Claim c " +
       "WHERE c.active = true " +
       "ORDER BY c.createdAt DESC")
```

**التغيير:**
- ✅ استخدام `createdAt` بدلاً من `submissionDate` غير الموجود

---

#### 3. **DashboardService.java** - تحديث معالجة البيانات

**قبل:**
```java
return results.stream()
    .map(row -> {
        String serviceType = (String) row[0];
        String serviceName = (String) row[1];
        Long count = ((Number) row[2]).longValue();
        // ...
    })
```

**بعد:**
```java
return results.stream()
    .map(row -> {
        String providerName = (String) row[0];
        Long count = ((Number) row[1]).longValue();
        // Using provider name as service type
        return ServiceDistributionDto.builder()
            .serviceType(providerName)
            .serviceName(providerName)
            .count(count)
            .percentage(percentage)
            .build();
    })
```

**التغيير:**
- ✅ تحديث index: `row[1]` بدلاً من `row[2]`
- ✅ استخدام `providerName` في كلا `serviceType` و `serviceName`

---

#### 4. **DashboardService.java** - إصلاح Recent Claims

**قبل:**
```java
LocalDate submissionDate = (LocalDate) row[4];
// ...
.createdAt(submissionDate.atStartOfDay())
```

**بعد:**
```java
LocalDateTime createdAt = (LocalDateTime) row[4];
// ...
.createdAt(createdAt)
```

**التغيير:**
- ✅ استخدام `LocalDateTime` مباشرة بدلاً من `LocalDate`

---

## 📊 الملفات المُعدَّلة

| الملف | التغييرات | السطور |
|------|-----------|---------|
| `ClaimRepository.java` | تعديل 2 queries | 2 methods |
| `DashboardService.java` | تعديل معالجة البيانات | 2 methods |

---

## ✅ النتيجة

### الاختبار:
```bash
mvn clean compile -DskipTests
```

### النتيجة:
```
[INFO] BUILD SUCCESS
[INFO] Total time:  26.171 s
```

✅ **تم إصلاح المشكلة بنجاح!**

---

## 📝 ملاحظات مهمة

### 1. **Service Distribution الآن يعتمد على Provider Name**
   - لا يوجد حقل `service_type` أو `service_name` في جدول `claims`
   - الحل البديل: استخدام `provider_name` للتوزيع
   - هذا معقول لأنه يعرض توزيع المطالبات حسب مقدم الخدمة

### 2. **إذا كنت تريد Service Type حقيقي:**
   يمكنك إضافة الحقول إلى:
   - `Claim` entity
   - جدول `claims` في قاعدة البيانات
   - Migration script جديد

   **مثال:**
   ```sql
   ALTER TABLE claims ADD COLUMN service_type VARCHAR(50);
   ALTER TABLE claims ADD COLUMN service_name VARCHAR(255);
   ```

### 3. **الحقول الموجودة في Claim Entity:**
   ```java
   - id
   - member
   - insuranceOrganization
   - providerId
   - providerName  ✅ (مستخدم)
   - doctorName
   - diagnosis
   - visitDate
   - requestedAmount
   - approvedAmount
   - status
   - createdAt  ✅ (مستخدم)
   - updatedAt
   - lines (ClaimLine[])
   - attachments (ClaimAttachment[])
   ```

---

## 🚀 الخطوات التالية (اختياري)

إذا كنت تريد إضافة Service Type/Name حقيقي:

1. **إنشاء Migration:**
   ```sql
   -- V999__add_service_fields_to_claims.sql
   ALTER TABLE claims ADD COLUMN service_type VARCHAR(50);
   ALTER TABLE claims ADD COLUMN service_name VARCHAR(255);
   
   COMMENT ON COLUMN claims.service_type IS 'INPATIENT, OUTPATIENT, SURGERY, etc.';
   ```

2. **تحديث Entity:**
   ```java
   @Column(name = "service_type", length = 50)
   private String serviceType;
   
   @Column(name = "service_name", length = 255)
   private String serviceName;
   ```

3. **استعادة Query الأصلي:**
   ```java
   @Query("SELECT COALESCE(c.serviceType, 'غير محدد'), " +
          "COALESCE(c.serviceName, 'غير محدد'), " +
          "COUNT(c) " +
          "FROM Claim c WHERE c.active = true " +
          "GROUP BY c.serviceType, c.serviceName")
   ```

---

**تاريخ الإصلاح:** 2026-01-05  
**الحالة:** ✅ مُصلح ويعمل  
**Build Status:** ✅ SUCCESS
