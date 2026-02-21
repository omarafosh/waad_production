# Post-Unification Verification & Testing Plan 🔍

## التحقق والاختبار بعد توحيد حقول الأسماء

**التاريخ**: 2026-01-08  
**المرحلة**: Post-Implementation Verification  
**الحالة**: 🟢 **جاهز للاختبار**

---

## 1️⃣ التحقق من البحث والفلترة (Search & Filter)

### ✅ Backend Repositories - حالة البحث

#### MemberRepository.java
**الحالة**: ✅ **صحيح - يبحث في fullName**
```java
@Query("SELECT m FROM Member m WHERE LOWER(m.fullName) LIKE LOWER(CONCAT('%', :name, '%'))")
List<Member> findByNameContaining(@Param("name") String name);

@Query("SELECT m FROM Member m WHERE m.employerOrganization.id = :employerOrgId AND 
       LOWER(m.fullName) LIKE LOWER(CONCAT('%', :name, '%'))")
List<Member> findByNameContainingAndEmployerOrganizationId(@Param("name") String name, @Param("employerOrgId") Long employerOrgId);
```

**اختبار مطلوب**:
- ✅ البحث بالاسم العربي: "أحمد محمد"
- ✅ البحث بالاسم الإنجليزي: "Ahmed Mohammed"
- ✅ البحث الجزئي: "أحمد", "Ahmed"
- ✅ Case-insensitive search
- ✅ مع فلتر employer

---

#### OrganizationRepository.java
**الحالة**: ✅ **صحيح - يبحث في name و code**
```java
@Query("SELECT o FROM Organization o WHERE o.type = :type AND " +
       "(LOWER(o.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
       "LOWER(o.code) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
List<Organization> searchByType(@Param("type") OrganizationType type, @Param("searchTerm") String searchTerm);
```

**اختبار مطلوب**:
- ✅ البحث بالاسم العربي لـ Organization
- ✅ البحث بالاسم الإنجليزي لـ Organization
- ✅ البحث بالكود: "EMP-01"
- ✅ مع فلتر type (EMPLOYER, INSURANCE, etc.)

---

#### ⚠️ EmployerRepository.java (DEPRECATED)
**الحالة**: ⚠️ **LEGACY - لا يحتاج تحديث**

```java
// DEPRECATED - Read Only
@Query("SELECT e FROM Employer e WHERE LOWER(e.nameAr) LIKE ... OR LOWER(e.nameEn) LIKE ...")
List<Employer> findByNameContainingIgnoreCase(@Param("name") String name);
```

**ملاحظة**: 
- جدول `employers` deprecated
- النظام يستخدم `organizations` مع `type=EMPLOYER`
- هذا Repository يُستخدم فقط في Excel import القديم
- **لا يحتاج تحديث** - سيتم إزالته لاحقاً

---

### 🔧 Frontend Search Components

#### MembersList.jsx - Search & Filter
**الموقع**: `frontend/src/pages/members/MembersList.jsx`

**الحالة**: ✅ **يبحث في fullName**
- Column filter على `fullName`
- Global search يعمل على جميع الأعمدة بما فيها `fullName`

**اختبار مطلوب**:
- ✅ كتابة اسم عربي في search box
- ✅ كتابة اسم إنجليزي في search box
- ✅ Column filter على fullName column
- ✅ Global search
- ✅ Sorting by fullName

---

#### EmployersList.jsx - Search & Filter
**الموقع**: `frontend/src/pages/employers/EmployersList.jsx`

**الحالة**: ✅ **يبحث في name**
- Column filter على `name`
- Displays unified name

**اختبار مطلوب**:
- ✅ البحث بالاسم العربي للشريك
- ✅ البحث بالاسم الإنجليزي للشريك
- ✅ Column filter
- ✅ Sorting

---

## 2️⃣ Autocomplete & Dropdowns

### 🔍 تحقق من المكونات التفاعلية

#### EmployerAutocomplete (في MemberCreate.jsx)
**الموقع**: `frontend/src/pages/members/MemberCreate.jsx`

**الحالة**: ⚠️ **يحتاج فحص**
```jsx
setSelectedPartnerName(employerData.label || employerData.name)
```

**اختبار مطلوب**:
- ✅ Autocomplete dropdown يعرض employer.name
- ✅ العرض صحيح للأسماء العربية
- ✅ العرض صحيح للأسماء الإنجليزية
- ✅ البحث داخل dropdown يعمل بكلا اللغتين

---

#### Family Member Autocomplete
**الموقع**: `frontend/src/pages/members/MemberCreate.jsx`, `MemberEdit.jsx`

**الحالة**: ✅ **يستخدم fullName**

**اختبار مطلوب**:
- ✅ اختيار family member من dropdown
- ✅ عرض fullName بشكل صحيح
- ✅ البحث يعمل

---

## 3️⃣ API Endpoints Verification

### 📡 التحقق من جميع API Responses

#### Member APIs
**Endpoints**:
- `GET /api/members` - List
- `GET /api/members/{id}` - Details
- `POST /api/members` - Create
- `PUT /api/members/{id}` - Update
- `GET /api/members/search` - Search

**Response Format المطلوب**:
```json
{
  "id": 1,
  "fullName": "أحمد محمد علي",
  "civilId": "123456789",
  "cardNumber": "WAAD|MEMBER|...",
  ...
}
```

**اختبار**:
- ✅ Create member بالاسم العربي فقط
- ✅ Create member بالاسم الإنجليزي فقط
- ✅ Create member بالاسمين
- ✅ Response يحتوي على `fullName` فقط (لا يوجد fullNameArabic/English)
- ✅ Search يعمل بكلا اللغتين

---

#### Organization/Employer APIs
**Endpoints**:
- `GET /api/employers` - List
- `GET /api/employers/{id}` - Details
- `POST /api/employers` - Create
- `PUT /api/employers/{id}` - Update

**Response Format المطلوب**:
```json
{
  "id": 1,
  "code": "EMP-01",
  "name": "شركة المثال للتأمين",
  "active": true,
  ...
}
```

**اختبار**:
- ✅ Create employer بالاسم العربي
- ✅ Create employer بالاسم الإنجليزي
- ✅ Response يحتوي على `name` فقط (لا يوجد nameAr/nameEn)
- ✅ `@JsonAlias` يعمل (Frontend قديم يرسل nameAr يقبله Backend)

---

#### FamilyMember APIs
**Endpoints**:
- Embedded in Member APIs
- Part of Member create/update

**Response Format المطلوب**:
```json
{
  "familyMembers": [
    {
      "id": 1,
      "fullName": "فاطمة أحمد",
      "relationship": "WIFE",
      "civilId": "987654321",
      ...
    }
  ]
}
```

**اختبار**:
- ✅ Add family member بالاسم العربي
- ✅ Add family member بالاسم الإنجليزي
- ✅ Response يحتوي على `fullName` فقط

---

#### Claim APIs (يستخدم memberFullName)
**Endpoints**:
- `GET /api/claims` - List
- `GET /api/claims/{id}` - Details

**Response Format المطلوب**:
```json
{
  "id": 1,
  "memberId": 123,
  "memberFullName": "أحمد محمد علي",
  "memberCivilId": "123456789",
  ...
}
```

**اختبار**:
- ✅ Claim response يحتوي على `memberFullName`
- ✅ لا يوجد `memberFullNameArabic` في Response

---

#### Eligibility Check API
**Endpoint**: `POST /api/eligibility/check`

**Response Format المطلوب**:
```json
{
  "memberId": 123,
  "fullName": "أحمد محمد علي",
  "cardNumber": "WAAD|MEMBER|...",
  "eligible": true,
  ...
}
```

**اختبار**:
- ✅ Response يحتوي على `fullName` فقط
- ✅ لا يوجد `fullNameArabic/fullNameEnglish`

---

## 4️⃣ Excel Import/Export Testing

### 📥 Excel Import (MemberExcelImportService)

**Column Mapping**:
```java
// يدعم هذه الأسماء:
"full_name", "name", "full_name_arabic", "fullname", "member_name",
"الاسم الكامل", "الاسم", "اسم الموظف", "الاسم بالعربية", ...
```

**ملاحظة**: 
- ❌ تم إزالة mapping لـ `fullNameEnglish`
- ✅ يقبل أي column name من القائمة أعلاه
- ✅ يحفظ في حقل `fullName` واحد

**سيناريوهات الاختبار**:

#### Test 1: Excel بالأسماء العربية فقط
```csv
full_name,civil_id,birth_date,gender
أحمد محمد علي,123456789,1990-01-01,MALE
فاطمة حسن,987654321,1992-05-15,FEMALE
```

**النتيجة المتوقعة**:
- ✅ Import ناجح
- ✅ `fullName` يحتوي على الاسم العربي
- ✅ لا توجد أخطاء

---

#### Test 2: Excel بالأسماء الإنجليزية فقط
```csv
full_name,civil_id,birth_date,gender
Ahmed Mohammed Ali,123456789,1990-01-01,MALE
Fatima Hassan,987654321,1992-05-15,FEMALE
```

**النتيجة المتوقعة**:
- ✅ Import ناجح
- ✅ `fullName` يحتوي على الاسم الإنجليزي
- ✅ لا توجد أخطاء

---

#### Test 3: Excel بأسماء مختلطة (Mixed)
```csv
full_name,civil_id,birth_date,gender
Ahmed محمد Ali,123456789,1990-01-01,MALE
فاطمة Hassan,987654321,1992-05-15,FEMALE
```

**النتيجة المتوقعة**:
- ✅ Import ناجح
- ✅ `fullName` يحتوي على الاسم المختلط كما هو
- ✅ لا توجد أخطاء

---

#### Test 4: Excel بأسماء طويلة (Edge Case)
```csv
full_name,civil_id,birth_date,gender
أحمد محمد علي حسن عبدالله الشمري القحطاني,123456789,1990-01-01,MALE
```

**النتيجة المتوقعة**:
- ✅ Import ناجح إذا < 255 حرف
- ⚠️ Error إذا > 255 حرف (VARCHAR limit)

---

#### Test 5: Template Generation
**Command**: Generate Excel Template

**النتيجة المتوقعة**:
- ✅ Template يحتوي على column `full_name`
- ✅ Header bilingual: "الاسم الكامل / Full Name"
- ❌ لا يوجد `full_name_arabic` أو `full_name_english`

---

### 📤 Excel Export

**Test Scenarios**:

#### Test 1: Export Members بأسماء عربية
**النتيجة المتوقعة**:
```csv
full_name,civil_id,card_number,employer_name
أحمد محمد علي,123456789,WAAD|MEMBER|...,شركة ABC
```

#### Test 2: Export Members بأسماء إنجليزية
**النتيجة المتوقعة**:
```csv
full_name,civil_id,card_number,employer_name
Ahmed Mohammed Ali,123456789,WAAD|MEMBER|...,ABC Company
```

#### Test 3: Export Employers
**النتيجة المتوقعة**:
```csv
code,name,active
EMP-01,شركة المثال للتأمين,true
EMP-02,Example Insurance Company,true
```

---

## 5️⃣ PDF Generation Testing

### 📄 Claim Reports (ClaimReportTemplate.java)

**التغييرات**:
```java
// Old
claim.getMemberFullNameArabic()

// New
claim.getMemberFullName()
```

**سيناريوهات الاختبار**:

#### Test 1: PDF مع اسم عضو عربي
**Input**: Member with `fullName = "أحمد محمد علي"`

**النتيجة المتوقعة**:
- ✅ PDF يعرض الاسم بشكل صحيح
- ✅ النص العربي من اليمين لليسار (RTL)
- ✅ لا يوجد قص أو تشويه

---

#### Test 2: PDF مع اسم عضو إنجليزي
**Input**: Member with `fullName = "Ahmed Mohammed Ali"`

**النتيجة المتوقعة**:
- ✅ PDF يعرض الاسم بشكل صحيح
- ✅ النص الإنجليزي من اليسار لليمين (LTR)

---

#### Test 3: PDF مع اسم مختلط
**Input**: Member with `fullName = "Ahmed محمد Ali"`

**النتيجة المتوقعة**:
- ✅ PDF يعرض الاسم بشكل صحيح
- ✅ Mixed direction يعمل

---

#### Test 4: PDF مع أسماء طويلة
**Input**: Member with very long name (>100 chars)

**النتيجة المتوقعة**:
- ✅ PDF يعرض الاسم مع word wrap
- ✅ لا يخرج عن حدود الصفحة

---

### 📊 Other Reports

**Reports to Test**:
- ✅ Eligibility Report
- ✅ Member List Report
- ✅ Claims Summary Report
- ✅ Financial Reports

**Verification**:
- ✅ جميع Reports تستخدم `fullName` / `name`
- ✅ لا يوجد `fullNameArabic` / `nameAr` في أي report

---

## 6️⃣ إزالة @JsonAlias والكود الاحتياطي

### 🧹 Cleanup Tasks (بعد التأكد من الاستقرار)

#### DTOs with @JsonAlias

**MemberCreateDto.java**:
```java
// Current (Temporary)
@JsonAlias({"fullNameArabic", "fullNameEnglish"})
private String fullName;

// After Cleanup
// Remove @JsonAlias - only accept 'fullName'
private String fullName;
```

**EmployerCreateDto.java**:
```java
// Current (Temporary)
@JsonAlias({"nameAr"})
private String name;

// After Cleanup
// Remove @JsonAlias
private String name;
```

**Timeline**: 
- ⏰ انتظر 1-2 أسابيع من الاستخدام المستقر
- ✅ تأكد من عدم وجود Frontend قديم يستخدم الحقول القديمة
- 🗑️ ثم احذف `@JsonAlias`

---

#### Frontend Fallback Code

**MembersList.jsx**:
```jsx
// Current (Defensive)
{row.original?.fullName || row.original?.fullNameArabic || '-'}

// After Cleanup
{row.original?.fullName || '-'}
```

**EmployersList.jsx**:
```jsx
// Current (Defensive)
{row.original?.name || row.original?.nameAr || '-'}

// After Cleanup
{row.original?.name || '-'}
```

---

#### Deprecated Code Removal

**Files to Remove** (بعد فترة انتقالية):
- ❌ `EmployerRepository.java` (DEPRECATED)
- ❌ `Employer.java` entity (DEPRECATED)
- ❌ جدول `employers` من database (بعد migration النهائية)

---

## 7️⃣ Testing Checklist

### ✅ Manual Testing

#### Backend Testing
- [ ] Run all unit tests: `./mvnw test`
- [ ] Test Member search API with Arabic names
- [ ] Test Member search API with English names
- [ ] Test Organization search API
- [ ] Test Claim APIs return `memberFullName`
- [ ] Test Eligibility API returns `fullName`
- [ ] Test Excel import with Arabic names
- [ ] Test Excel import with English names
- [ ] Test Excel export
- [ ] Generate PDF for Arabic member
- [ ] Generate PDF for English member

#### Frontend Testing
- [ ] Member Create: Enter Arabic fullName → Save → Verify
- [ ] Member Create: Enter English fullName → Save → Verify
- [ ] Member Edit: Edit fullName → Save → Verify
- [ ] Member List: Search by Arabic name
- [ ] Member List: Search by English name
- [ ] Member View: Display fullName correctly
- [ ] Employer Create: Enter Arabic name → Save → Verify
- [ ] Employer Create: Enter English name → Save → Verify
- [ ] Employer List: Search by name
- [ ] Family Member: Add with Arabic fullName
- [ ] Family Member: Add with English fullName
- [ ] Autocomplete: Employer dropdown shows correct names
- [ ] Reports: Financial reports show correct names

#### Database Testing
- [ ] Run migration V110 on dev database
- [ ] Verify `name_en` dropped from `organizations`
- [ ] Verify `full_name_arabic`, `full_name_english` dropped from `family_members`
- [ ] Verify data integrity (no NULL values)
- [ ] Verify data merge (Arabic preferred, English fallback)

---

### 🤖 Automated Testing

#### Integration Tests Needed
```java
@Test
public void testMemberSearchByArabicName() {
    // Create member with Arabic name
    Member member = createMember("أحمد محمد علي");
    
    // Search
    List<Member> results = memberRepository.findByNameContaining("أحمد");
    
    // Assert
    assertThat(results).contains(member);
}

@Test
public void testMemberSearchByEnglishName() {
    Member member = createMember("Ahmed Mohammed Ali");
    List<Member> results = memberRepository.findByNameContaining("Ahmed");
    assertThat(results).contains(member);
}

@Test
public void testOrganizationSearchByName() {
    Organization org = createOrganization("شركة ABC");
    List<Organization> results = organizationRepository.searchByType(
        OrganizationType.EMPLOYER, "ABC"
    );
    assertThat(results).contains(org);
}
```

---

## 📋 Sign-Off Checklist

### Pre-Production Verification

- [ ] All backend tests pass
- [ ] All frontend builds without errors
- [ ] Migration V110 tested on staging
- [ ] Excel import/export tested
- [ ] PDF generation tested
- [ ] Search functionality verified (Arabic & English)
- [ ] API responses verified (no old field names)
- [ ] Performance tested (search speed)
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Stakeholder approval

---

## 🎯 Success Criteria

### ✅ Verification Complete When:
1. ✅ All searches work with both Arabic and English names
2. ✅ All autocomplete/dropdowns show unified names
3. ✅ All API responses use unified field names (`fullName`, `name`)
4. ✅ Excel import works with both languages
5. ✅ Excel export produces correct column headers
6. ✅ PDF reports display names correctly in both languages
7. ✅ No compilation errors or warnings
8. ✅ No runtime errors in logs
9. ✅ Database migration runs successfully
10. ✅ No data loss or corruption

---

## 📞 Support & Issues

**If Issues Found**:
1. Document the issue with screenshots
2. Include sample data
3. Check logs for errors
4. Rollback plan: Revert migration V110
5. Contact: Development Team

---

## 📝 Notes

- Migration V110 is **reversible** (keep backup before running)
- Old `employers` table remains **read-only** for backward compatibility
- `@JsonAlias` provides temporary backward compatibility
- Cleanup phase can begin after 2 weeks of stable operation

---

**Status**: 🟢 Ready for Testing  
**Next Step**: Execute Manual Testing Checklist  
**Timeline**: Complete testing within 1 week
