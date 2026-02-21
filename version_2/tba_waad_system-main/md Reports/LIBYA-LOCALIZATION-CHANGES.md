# 🇱🇾 تعديلات التوطين للنظام الليبي

**تاريخ التعديل:** 11 يناير 2026  
**الغرض:** تعديل النظام ليتوافق مع ليبيا بدلاً من الكويت

---

## 📝 ملخص التعديلات

تم تحديث النظام ليتوافق مع:
1. ✅ **الموقع الجغرافي:** ليبيا
2. ✅ **العطلة الأسبوعية:** الجمعة فقط (بدلاً من الجمعة والسبت)
3. ✅ **المنطقة الزمنية:** Africa/Tripoli (UTC+2)
4. ✅ **العطلات الرسمية:** العطلات الرسمية الليبية لعام 2026

---

## 🔧 الملفات المُعدلة

### 1. BusinessDaysCalculatorService.java
**المسار:** `backend/src/main/java/com/waad/tba/common/service/BusinessDaysCalculatorService.java`

#### التعديلات:
- ✅ **العطلة الأسبوعية:** تغيير من `FRIDAY || SATURDAY` إلى `FRIDAY` فقط
- ✅ **العطلات الرسمية:** تحديث قائمة العطلات الرسمية

```java
// قبل التعديل:
if (dayOfWeek == DayOfWeek.FRIDAY || dayOfWeek == DayOfWeek.SATURDAY) {
    return false;
}

// بعد التعديل:
// Libya weekend: Friday only
if (dayOfWeek == DayOfWeek.FRIDAY) {
    return false;
}
```

#### العطلات الرسمية الليبية 2026:
```java
private static final List<LocalDate> PUBLIC_HOLIDAYS_2026 = List.of(
    LocalDate.of(2026, 2, 17),  // Revolution Day (ثورة 17 فبراير)
    LocalDate.of(2026, 4, 2),   // Isra and Mi'raj (الإسراء والمعراج)
    LocalDate.of(2026, 5, 1),   // Eid al-Fitr (عيد الفطر - 3 أيام)
    LocalDate.of(2026, 5, 2),
    LocalDate.of(2026, 5, 3),
    LocalDate.of(2026, 7, 9),   // Arafat Day (يوم عرفة)
    LocalDate.of(2026, 7, 10),  // Eid al-Adha (عيد الأضحى - 4 أيام)
    LocalDate.of(2026, 7, 11),
    LocalDate.of(2026, 7, 12),
    LocalDate.of(2026, 7, 31),  // Islamic New Year (رأس السنة الهجرية)
    LocalDate.of(2026, 10, 9),  // Prophet's Birthday (المولد النبوي)
    LocalDate.of(2026, 10, 23), // Liberation Day (عيد التحرير)
    LocalDate.of(2026, 12, 24)  // Independence Day (عيد الاستقلال)
);
```

**ملاحظة:** ⚠️ التواريخ الإسلامية تقريبية وقد تتغير بحسب رؤية الهلال

---

### 2. SlaMonitoringScheduler.java
**المسار:** `backend/src/main/java/com/waad/tba/modules/claim/service/SlaMonitoringScheduler.java`

#### التعديلات:
- ✅ **أيام التشغيل:** تغيير من `MON-THU` إلى `SAT-THU`
- ✅ **المنطقة الزمنية:** تغيير من `Asia/Kuwait` إلى `Africa/Tripoli`

```java
// قبل التعديل:
@Scheduled(cron = "0 0 9 * * MON-THU", zone = "Asia/Kuwait")

// بعد التعديل:
@Scheduled(cron = "0 0 9 * * SAT-THU", zone = "Africa/Tripoli")
```

**الجدولة الجديدة:**
- **الوقت:** 9:00 صباحاً
- **الأيام:** السبت إلى الخميس (تتخطى الجمعة)
- **التوقيت:** Africa/Tripoli (UTC+2)

---

### 3. Claim.java
**المسار:** `backend/src/main/java/com/waad/tba/modules/claim/entity/Claim.java`

#### التعديلات:
- ✅ تحديث التوثيق ليعكس عطلة الجمعة فقط

```java
// قبل التعديل:
excluding weekends (Friday, Saturday) and public holidays.

// بعد التعديل:
excluding weekend (Friday) and public holidays.
```

---

### 4. Member DTOs
**الملفات:**
- `MemberCreateDto.java`
- `MemberViewDto.java`
- `MemberUpdateDto.java`

#### التعديلات:
- ✅ تحديث أمثلة العنوان والجنسية

```java
// قبل التعديل:
@Schema(description = "Address", example = "Block 5, Street 10, House 25, Kuwait")
@Schema(description = "Nationality", example = "Kuwaiti")

// بعد التعديل:
@Schema(description = "Address", example = "طرابلس، شارع الجمهورية، عمارة 15")
@Schema(description = "Nationality", example = "Libyan")
```

---

### 5. SLA-WORKFLOW-IMPLEMENTATION-COMPLETE.md
**المسار:** `SLA-WORKFLOW-IMPLEMENTATION-COMPLETE.md`

#### التعديلات:
- ✅ تحديث جميع الإشارات من الكويت إلى ليبيا
- ✅ تحديث جدولة المراقبة
- ✅ تحديث قائمة العطلات الرسمية

---

## 📊 تأثير التعديلات

### أيام العمل الأسبوعية:
| قبل التعديل | بعد التعديل |
|-------------|--------------|
| الأحد - الخميس (5 أيام) | السبت - الخميس (6 أيام) |
| العطلة: الجمعة + السبت | العطلة: الجمعة فقط |

### مثال حساب SLA:
**السيناريو:** مطالبة بـ SLA = 10 أيام عمل

#### قبل التعديل (الكويت - 5 أيام عمل/أسبوع):
- التقديم: الأحد 11 يناير 2026
- الموعد النهائي: الأحد 25 يناير 2026 (~2 أسبوع)

#### بعد التعديل (ليبيا - 6 أيام عمل/أسبوع):
- التقديم: الأحد 11 يناير 2026  
- الموعد النهائي: الخميس 22 يناير 2026 (~1.5 أسبوع)

**النتيجة:** ⚡ **معالجة أسرع بـ 3 أيام** بسبب يوم عمل إضافي كل أسبوع

---

## ✅ اختبار التعديلات

### سيناريوهات الاختبار:

#### 1. اختبار العطلة الأسبوعية
```java
// الجمعة 16 يناير 2026 - يجب أن تكون عطلة
assertFalse(businessDaysCalculator.isBusinessDay(LocalDate.of(2026, 1, 16)));

// السبت 17 يناير 2026 - يجب أن تكون يوم عمل
assertTrue(businessDaysCalculator.isBusinessDay(LocalDate.of(2026, 1, 17)));
```

#### 2. اختبار العطلات الرسمية
```java
// 17 فبراير 2026 (ثورة 17 فبراير) - عطلة رسمية
assertFalse(businessDaysCalculator.isBusinessDay(LocalDate.of(2026, 2, 17)));

// 23 أكتوبر 2026 (عيد التحرير) - عطلة رسمية
assertFalse(businessDaysCalculator.isBusinessDay(LocalDate.of(2026, 10, 23)));
```

#### 3. اختبار حساب أيام العمل
```java
// من الأحد 11 يناير إلى الأحد 18 يناير (7 أيام)
// أيام العمل: الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس، السبت (6 أيام)
// الجمعة: عطلة (يُستثنى)
int days = businessDaysCalculator.calculateBusinessDays(
    LocalDate.of(2026, 1, 11),  // Sunday
    LocalDate.of(2026, 1, 18)   // Sunday
);
assertEquals(6, days);
```

#### 4. اختبار جدولة المراقبة
```
الجدولة: "0 0 9 * * SAT-THU" zone="Africa/Tripoli"

✅ يوم السبت 10 يناير 2026 الساعة 9:00 ص - يعمل
✅ يوم الأحد 11 يناير 2026 الساعة 9:00 ص - يعمل
✅ يوم الخميس 15 يناير 2026 الساعة 9:00 ص - يعمل
❌ يوم الجمعة 16 يناير 2026 - لا يعمل (عطلة)
✅ يوم السبت 17 يناير 2026 الساعة 9:00 ص - يعمل
```

---

## 🚀 خطوات النشر

### 1. التحقق من الإعدادات
```bash
# التحقق من المنطقة الزمنية للخادم
timedatectl

# يجب أن تكون: Africa/Tripoli (UTC+2)
```

### 2. تشغيل الاختبارات
```bash
# اختبار حساب أيام العمل
./mvnw test -Dtest=BusinessDaysCalculatorServiceTest

# اختبار SLA Monitoring
./mvnw test -Dtest=SlaMonitoringSchedulerTest
```

### 3. تحديث قاعدة البيانات
```sql
-- تحقق من إعدادات SLA الحالية
SELECT * FROM system_settings WHERE setting_key = 'CLAIM_SLA_DAYS';

-- النتيجة المتوقعة: 10 أيام (لم تتغير)
```

### 4. إعادة التشغيل
```bash
# إعادة تشغيل الخدمة
./mvnw spring-boot:run

# مراقبة السجلات
tail -f logs/application.log | grep -i "sla"
```

---

## 📌 ملاحظات مهمة

### 1. التواريخ الإسلامية
⚠️ **مهم:** التواريخ الإسلامية (عيد الفطر، عيد الأضحى، المولد النبوي، إلخ) **تقريبية** وتعتمد على رؤية الهلال.

**يجب تحديثها كل عام** قبل بداية السنة الميلادية الجديدة.

### 2. العطلات الرسمية لعام 2027
في نهاية عام 2026، يجب:
1. إضافة عطلات 2027 إلى `PUBLIC_HOLIDAYS_2026`
2. أو (الأفضل): نقل العطلات إلى جدول database كما هو مذكور في TODO

### 3. المنطقة الزمنية
النظام يستخدم `Africa/Tripoli`:
- **UTC+2** في الشتاء
- قد تتغير إذا طُبق التوقيت الصيفي (حالياً ليبيا لا تطبقه)

### 4. الأداء
يوم عمل إضافي (السبت) يعني:
- ⚡ **معالجة أسرع** بـ ~20% (6 أيام عمل بدلاً من 5)
- 📈 **تحسين SLA compliance rate** المتوقع
- ⏱️ **تقليل متوسط أيام المعالجة**

---

## ✅ الخلاصة

### التعديلات المطبقة:
1. ✅ العطلة الأسبوعية: **الجمعة فقط**
2. ✅ المنطقة الزمنية: **Africa/Tripoli (UTC+2)**
3. ✅ العطلات الرسمية: **13 عطلة ليبية لعام 2026**
4. ✅ جدولة المراقبة: **السبت-الخميس 9:00 ص**
5. ✅ الأمثلة الجغرافية: **عناوين وجنسيات ليبية**

### الملفات المُعدلة:
- ✅ `BusinessDaysCalculatorService.java`
- ✅ `SlaMonitoringScheduler.java`
- ✅ `Claim.java`
- ✅ `MemberCreateDto.java`
- ✅ `MemberViewDto.java`
- ✅ `MemberUpdateDto.java`
- ✅ `SLA-WORKFLOW-IMPLEMENTATION-COMPLETE.md`

### الأثر المتوقع:
- 📊 **معالجة أسرع** بـ ~20% (بسبب يوم عمل إضافي)
- 🎯 **تحسين الامتثال لـ SLA**
- 🇱🇾 **توطين كامل للنظام الليبي**

---

**الحالة:** ✅ **التعديلات مكتملة وجاهزة للاختبار**

**التاريخ:** 11 يناير 2026  
**المُنفذ:** GitHub Copilot
