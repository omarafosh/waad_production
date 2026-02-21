# تقرير تحليلي صارم لقسم الأعضاء (Member Module)

**تاريخ التحليل:** 2026-02-21  
**نطاق التحليل:** Backend + Frontend + Contracts الخاصة بوحدة الأعضاء الموحدة (`Unified Member`)  
**منهجية التقييم:** مراجعة مباشرة للكود الفعلي، والتحقق من الاتساق بين الطبقات (Controller/Service/Repository/Frontend).

---

## 1) الملخص التنفيذي (Executive Summary)

وحدة الأعضاء في وضع **هجين غير مستقر**: توجد بنية موحدة جيدة مبدئيًا، لكن التنفيذ الحالي يحتوي على ثغرات **حرجة** تمس الأمن، سلامة البيانات، واتساق العقود بين الواجهة والخادم.

**الحكم الصارم:**

- البنية النظرية: **جيدة**.
- التنفيذ الفعلي: **عالي المخاطر** في مسارات حساسة.
- الجاهزية الإنتاجية الآمنة: **غير مكتملة** حتى معالجة البنود الحرجة أدناه.

**النتيجة المختصرة:** هناك 4 مخاطر حرجة مباشرة:

1. احتمال **BOLA/IDOR** على استرجاع أعضاء خارج نطاق جهة المستخدم.
2. تضارب حاد بين "Soft Delete" المعلن و"Delete فعلي" المنفذ.
3. بحث متقدم يستخدم حقولًا غير موجودة على الكيان مما يهدد بثغرات تشغيلية (500).
4. تضارب واجهات Frontend (قديم/موحد) قد يولد سلوكًا غير متوقع وتكاملًا مضروبًا.

---

## 2) أهم النتائج الحرجة (Critical Findings)

## C1 — ثغرة صلاحيات نطاق الجهة (BOLA/IDOR) — **حرجة**

**الوصف:**
توجد حماية نطاق جهة العمل (`employer scoping`) في `getAllMembers` و`searchMembers` عبر `AuthorizationService`، لكنها **غير مطبقة بنفس الصرامة** في مسارات حساسة أخرى مثل:

- `getMember(id)`
- `getDependents(principalId)`
- `checkEligibility(barcode)`

**الأثر:**
مستخدم `EMPLOYER_ADMIN` قد يقرأ بيانات عضو/عائلة خارج جهته إذا امتلك `id` أو `barcode` صحيحًا.

**الأدلة:**

- التقييد موجود في `UnifiedMemberService.getAllMembers(...)` و`searchMembers(...)`.
- لا يوجد تقييد مماثل واضح في `getMember(...)` و`checkFamilyEligibility(...)` و`getDependents(...)`.

**التوصية القاطعة:**

- توحيد `enforceEmployerScope(member)` كقاعدة إلزامية في **كل** عمليات القراءة/التعديل/الحذف.
- رفض الوصول `403` عند عدم تطابق `member.employer.id` مع فلتر المستخدم.

---

## C2 — تضارب خطير: Soft Delete في التوثيق مقابل Delete فعلي في التنفيذ — **حرجة**

**الوصف:**
التوثيق في Controller يعلن أن الحذف "Soft Delete"، بينما الخدمة تنفذ `memberRepository.delete(member)` (حذف فعلي) مع Cascade.

**الأثر:**

- فقدان بيانات غير قابل للتراجع.
- كسر توقعات الأعمال والتدقيق (Audit/Compliance).
- خطورة قانونية وتشغيلية إذا كان النظام يَعِد بسجل تاريخي.

**التوصية القاطعة:**

- اعتماد Soft Delete حقيقي (`active=false` + `status=TERMINATED` + حقول audit).
- قصر الحذف الفعلي على endpoint منفصل وصلاحية `SUPER_ADMIN` مع تسجيل تدقيق إلزامي.

---

## C3 — البحث المتقدم يعتمد حقولًا غير موجودة على الكيان — **حرجة تشغيلية**

**الوصف:**
`UnifiedMemberService.searchMembers(...)` يبني شروط JPA على `nameAr` و`nameEn` بينما كيان `Member` يحتوي `fullName` فقط.

**الأثر:**

- أعطال وقت التشغيل (غالبًا 500) عند تفعيل البحث بهذه الحقول.
- فشل وظيفي مباشر في واجهات البحث.

**التوصية القاطعة:**

- إزالة `nameAr/nameEn` من Specification أو تحويلها إلى `fullName`.
- تعديل contract بحيث `fullName` هو الحقل الرسمي الوحيد (أو إضافة أعمدة فعلية إن كانت مطلوبة أعماليًا).

---

## C4 — ازدواجية Services في الواجهة الأمامية (Legacy + Unified) — **حرجة معمارية/تكاملية**

**الوصف:**
يوجد `members.service.js` (قديم) بجانب `unified-members.service.js` (موحد). بعض الأجزاء ما زالت تستورد القديم.

**الأثر:**

- تضارب endpoints (`/members` مقابل `/api/v1/unified-members`).
- اختلاف نماذج البيانات (`familyMembers` قديم مقابل `dependents` موحد).
- زيادة احتمالات regression وصعوبة صيانة عالية.

**التوصية القاطعة:**

- خطة إزالة تدريجية للقديم (deprecation + migration checklist).
- توحيد الاستدعاءات على `unified-members.service.js`.

---

## 3) نتائج عالية الأهمية (High Severity)

## H1 — تناقض دلالات العلاقة (Relationship Enum) بين الأمثلة والـ Enum

**الوصف:**
الأمثلة في الـ API تعرض `SPOUSE/CHILD` بينما enum الفعلي يعتمد `WIFE/HUSBAND/SON/DAUGHTER...`.

**الأثر:**

- طلبات صحيحة من منظور الواجهة قد تُرفض 400 في الخادم.
- كسر التكامل مع فرق أخرى تعتمد الـ Swagger examples.

**المطلوب:**
توحيد المفردات فورًا في الـ DTO docs + frontend forms + backend enum mapping.

## H2 — فلترة غير متسقة في الواجهة (`organizationId` مقابل `employerId`)

**الوصف:**
بعض شاشات الفرونت ترسل `organizationId` بينما endpoint الموحد يتوقع `employerId`.

**الأثر:**

- فلاتر لا تعمل فعليًا أو تعمل جزئيًا.
- نتائج خاطئة للمستخدمين وصورة مضللة عن البيانات.

**المطلوب:**
تثبيت contract واحد: `employerId` فقط، مع adapter backward-compatible لفترة انتقالية قصيرة.

## H3 — Barcode قابل للتخمين + endpoint eligibility مكشوف نسبيًا

**الوصف:**
النمط التسلسلي للباركود (`WAHA-YYYY-NNNNNN`) مع endpoint lookup مباشر قد يسهل enumeration.

**الأثر:**
زيادة سطح التعرض لاستخراج بيانات أسر عبر التخمين.

**المطلوب:**

- Rate limiting + audit + anomaly detection.
- إضافة فحص نطاق الجهة قبل إرجاع أي تفاصيل.

---

## 4) نتائج متوسطة (Medium Severity)

## M1 — Logging يحتوي PII مفرط

تسجيل `fullName/cardNumber/barcode` في `INFO` بشكل متكرر يرفع مخاطر الخصوصية.

## M2 — إدارة الصور تعتمد التحقق MIME فقط

لا يوجد حد حجم/فحص محتوى عميق/سياسة امتدادات متشددة كفاية.

## M3 — تراكم Legacy وDeprecated داخل الوحدة

وجود طبقات متروكة يزيد التشويش، ويصعب فرض مرجعية موحدة للكود.

---

## 5) نقاط إيجابية مثبتة (Strengths)

- استخدام `@PreAuthorize` واسع نسبيًا على مستوى Controller.
- وجود `@Version` في كيان `Member` (حماية جيدة ضد مشاكل التزامن).
- معالجة N+1 في تحميل التابعين (`findByParentIdIn`) خطوة ممتازة.
- استخدام architecture موحدة (Principal/Dependent) بدل نموذج مزدوج قديم.

---

## 6) مصفوفة المخاطر المختصرة

| الرمز | القضية                             | الشدة | الاحتمال | التأثير    | أولوية التنفيذ |
| ----- | ---------------------------------- | ----- | -------- | ---------- | -------------- |
| C1    | BOLA/IDOR عبر id/barcode           | حرجة  | مرتفع    | مرتفع جدًا | P0             |
| C2    | Soft vs Hard delete mismatch       | حرجة  | مرتفع    | مرتفع جدًا | P0             |
| C3    | Search على حقول غير موجودة         | حرجة  | مرتفع    | مرتفع      | P0             |
| C4    | ازدواجية services (legacy/unified) | حرجة  | مرتفع    | مرتفع      | P1             |
| H1    | تناقض enum العلاقات                | عالٍ  | مرتفع    | متوسط-عالٍ | P1             |
| H2    | organizationId vs employerId       | عالٍ  | متوسط    | متوسط-عالٍ | P1             |
| H3    | Barcode enumeration surface        | عالٍ  | متوسط    | عالٍ       | P1             |
| M1    | PII logging                        | متوسط | مرتفع    | متوسط      | P2             |
| M2    | Photo upload hardening             | متوسط | متوسط    | متوسط      | P2             |
| M3    | Legacy debt                        | متوسط | مرتفع    | متوسط      | P2             |

---

## 7) خطة علاج تنفيذية صارمة

## المرحلة P0 (فورية – قبل أي إطلاق)

1. فرض `employer scope` على كل عمليات القراءة/التعديل/الحذف/eligibility.
2. إصلاح `deleteMember` ليصبح Soft Delete حقيقي أو تعديل التوثيق فورًا حتى لا يكذب العقد.
3. إصلاح `searchMembers` لاستعمال `fullName` بدل `nameAr/nameEn` (أو إضافة أعمدة حقيقية + migration).

## المرحلة P1 (قصيرة المدى)

4. توحيد Frontend بالكامل على `unified-members.service.js`.
5. توحيد مفردات العلاقة (Relationship) عبر backend/frontend/docs.
6. فرض rate limiting + logging أمني + إنذار enumeration على eligibility endpoints.

## المرحلة P2 (تحسينات ضبط الجودة)

7. تقليل PII في logs (masking).
8. تشديد photo upload (size cap, file signature checks, extension policy).
9. إزالة/عزل legacy endpoints والخدمات المتروكة.

---

## 8) حكم نهائي (Strict Verdict)

الوحدة ليست فاشلة تقنيًا، لكنها **غير منضبطة أمنيًا وتشغيليًا بما يكفي للإطلاق الآمن**.

**الحكم النهائي:**

- **لا يُنصح بالإطلاق** قبل إغلاق عناصر P0 كاملة.
- بعد إغلاق P0 + P1، يمكن اعتبار الوحدة قابلة للإطلاق المشروط.

---

## 9) ملاحظة منهجية

هذا التقرير مبني على مراجعة الكود الفعلي في طبقات `controller/service/repository/entity` مع تدقيق اتساق عقود الفرونت، وليس على توثيق نظري فقط.
