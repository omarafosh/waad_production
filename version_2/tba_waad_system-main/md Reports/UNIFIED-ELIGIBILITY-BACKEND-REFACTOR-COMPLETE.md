# ✅ Unified Eligibility System - Backend Refactor Complete

**Date:** 2026-01-10  
**Version:** 2.0 (Deterministic)  
**Status:** ✅ Ready for Review

---

## 🎯 Architectural Decision

**القرار النهائي:**
- ✅ إلغاء البحث بالاسم (Name Search) نهائياً من Eligibility
- ✅ الاعتماد فقط على: **Card Number** و **Barcode/QR**
- ✅ Endpoint واحد موحد مع Auto-Detection
- ✅ Deterministic behavior (نتيجة واحدة فقط)

---

## 📦 Components Implemented

### 1️⃣ DTOs

#### **EligibilityResultDto.java**
```java
Location: /backend/src/main/java/com/waad/tba/modules/member/dto/
Purpose: Unified response for eligibility check
```

**Features:**
- ✅ Single deterministic result
- ✅ Complete member information
- ✅ Eligibility decision (ELIGIBLE / NOT_ELIGIBLE)
- ✅ Benefit policy details (copay, coverage, dates)
- ✅ Search method indicator (CARD_NUMBER / BARCODE)
- ✅ Ineligibility reason (if not eligible)

**Fields:**
```java
- memberId: Long
- fullName: String
- cardNumber: String
- barcode: String
- memberStatus: String (ACTIVE, SUSPENDED, etc.)
- cardStatus: String (ACTIVE, BLOCKED, etc.)
- eligibilityDecision: Enum (ELIGIBLE, NOT_ELIGIBLE)
- eligible: Boolean
- employerName: String
- policyName: String
- copayAmount: Integer
- coverageLimit: BigDecimal
- policyStartDate: LocalDate
- policyEndDate: LocalDate
- ineligibilityReason: String (if not eligible)
- message: String (status message)
- searchMethod: Enum (CARD_NUMBER, BARCODE)
```

---

### 2️⃣ Custom Exceptions

#### **InvalidEligibilityInputException.java**
```java
Location: /backend/src/main/java/com/waad/tba/modules/member/exception/
Error Code: INVALID_ELIGIBILITY_INPUT
HTTP Status: 400 Bad Request
```

**When thrown:**
- Input is null or empty
- Input doesn't match Card Number pattern (digits only)
- Input doesn't match Barcode pattern (WAD-YYYY-NNNNNNNN)

#### **MemberNotFoundException.java**
```java
Location: /backend/src/main/java/com/waad/tba/modules/member/exception/
Error Code: MEMBER_NOT_FOUND
HTTP Status: 404 Not Found
```

**When thrown:**
- No member found with provided card number
- No member found with provided barcode

---

### 3️⃣ Service Layer

#### **UnifiedEligibilityService.java**
```java
Location: /backend/src/main/java/com/waad/tba/modules/member/service/
Primary Method: checkEligibility(String query)
```

**Detection Logic:**

```java
// Regex Patterns
BARCODE_PATTERN = "^WAD-\\d{4}-\\d{8}$"     // Example: WAD-2026-00001234
CARD_NUMBER_PATTERN = "^\\d+$"               // Example: 1234567890

// Auto-Detection Flow
if (matches BARCODE_PATTERN) → searchByBarcode()
else if (matches CARD_NUMBER_PATTERN) → searchByCardNumber()
else → throw InvalidEligibilityInputException
```

**Search Methods:**
1. **checkByCardNumber(String cardNumber)**
   - Repository: `findByCardNumber(cardNumber)`
   - Exact match, indexed (idx_members_card_number)
   - Returns: `Optional<Member>`
   - If empty → throw MemberNotFoundException

2. **checkByBarcode(String barcode)**
   - Repository: `findByBarcode(barcode)`
   - Exact match, indexed (idx_members_barcode)
   - Returns: `Optional<Member>`
   - If empty → throw MemberNotFoundException

**Eligibility Decision Logic:**

```java
boolean isEligible = ALL of the following:
1. member.status == ACTIVE
2. member.cardStatus == ACTIVE
3. member.eligibilityStatus == true
4. member.active == true
```

**Why this design?**
- **Deterministic:** Same input always returns same result
- **No Ambiguity:** Single member lookup (not List)
- **Fast:** Uses indexed columns (< 50ms)
- **Clear Errors:** Specific exceptions for each failure case

---

### 4️⃣ Controller Layer

#### **UnifiedEligibilityController.java**
```java
Location: /backend/src/main/java/com/waad/tba/modules/member/controller/
Endpoint: GET /api/members/eligibility?query={value}
```

**Request:**
```http
GET /api/members/eligibility?query=1234567890
GET /api/members/eligibility?query=WAD-2026-00001234
```

**Response (200 - Success):**
```json
{
  "status": "success",
  "data": {
    "memberId": 12345,
    "fullName": "أحمد محمد علي",
    "cardNumber": "1234567890",
    "barcode": "WAD-2026-00001234",
    "memberStatus": "ACTIVE",
    "cardStatus": "ACTIVE",
    "eligibilityDecision": "ELIGIBLE",
    "eligible": true,
    "employerName": "شركة الوعد للتأمين",
    "policyName": "سياسة الموظفين الأساسية",
    "copayAmount": 10,
    "coverageLimit": 50000.00,
    "policyStartDate": "2026-01-01",
    "policyEndDate": "2026-12-31",
    "ineligibilityReason": null,
    "message": "العضوية نشطة - يمكن بدء زيارة طبية",
    "searchMethod": "CARD_NUMBER"
  },
  "timestamp": "2026-01-10T12:34:56"
}
```

**Response (400 - Invalid Input):**
```json
{
  "status": "error",
  "message": "Invalid input format. Expected: Card Number (digits only) or Barcode (WAD-YYYY-NNNNNNNN)",
  "errorCode": "INVALID_ELIGIBILITY_INPUT",
  "timestamp": "2026-01-10T12:34:56"
}
```

**Response (404 - Not Found):**
```json
{
  "status": "error",
  "message": "Member not found with card number: 1234567890",
  "errorCode": "MEMBER_NOT_FOUND",
  "timestamp": "2026-01-10T12:34:56"
}
```

**Response (200 - Not Eligible):**
```json
{
  "status": "success",
  "data": {
    "memberId": 12345,
    "fullName": "أحمد محمد علي",
    "eligibilityDecision": "NOT_ELIGIBLE",
    "eligible": false,
    "memberStatus": "SUSPENDED",
    "ineligibilityReason": "Member status is SUSPENDED",
    "message": "العضو غير مؤهل للخدمات - Member status is SUSPENDED",
    "searchMethod": "CARD_NUMBER"
  }
}
```

**Why this design?**
- **Single Endpoint:** No confusion about which endpoint to use
- **Auto-Detection:** No need to specify searchType parameter
- **Clear Responses:** Structured error messages with error codes
- **RESTful:** Proper HTTP status codes (200, 400, 404)

---

### 5️⃣ Repository Layer

**Required Methods (Already Exist):**

```java
// MemberRepository.java
Optional<Member> findByCardNumber(String cardNumber);
Optional<Member> findByBarcode(String barcode);
```

**Database Indexes (Already Created):**
```sql
-- V113: Card Number Index
CREATE INDEX idx_members_card_number ON members(card_number);

-- V116: Barcode Index
CREATE INDEX idx_members_barcode ON members(barcode);
```

**Why these queries?**
- ✅ Exact match only (no LIKE, no fuzzy)
- ✅ Indexed for O(log n) performance
- ✅ Return Optional (single result or empty)
- ✅ No List → deterministic behavior

---

## 🚫 What Was Removed / Not Supported

### ❌ Name-Based Search
**Removed from Eligibility:**
- `findByFullNameContainingIgnoreCase()`
- Fuzzy search with pg_trgm
- Multiple results handling
- Autocomplete logic

**Why?**
- Name search is **non-deterministic** (multiple "أحمد" exist)
- Eligibility = Verification → requires exact identification
- Name search should be separate feature (member lookup, not eligibility)

### ❌ Multiple Parameters
**Not Accepted:**
- `?memberNumber=...&name=...&barcode=...`
- `?searchType=...`

**Why?**
- Single `query` parameter enforces clarity
- Auto-detection prevents user error
- Simpler API contract

### ❌ List Results
**Not Returned:**
- `List<MemberViewDto>`
- Multiple matches

**Why?**
- Eligibility requires **single member identification**
- List results create ambiguity in workflow
- Use separate endpoint for member search/listing

---

## 🧪 Testing Scenarios

### ✅ Valid Card Number
```bash
GET /api/members/eligibility?query=1234567890
Expected: 200 OK with EligibilityResultDto
```

### ✅ Valid Barcode
```bash
GET /api/members/eligibility?query=WAD-2026-00001234
Expected: 200 OK with EligibilityResultDto
```

### ❌ Invalid Format
```bash
GET /api/members/eligibility?query=أحمد
Expected: 400 Bad Request (INVALID_ELIGIBILITY_INPUT)
```

### ❌ Not Found
```bash
GET /api/members/eligibility?query=9999999999
Expected: 404 Not Found (MEMBER_NOT_FOUND)
```

### ✅ Not Eligible Member
```bash
GET /api/members/eligibility?query=1234567890
Expected: 200 OK with eligible=false, ineligibilityReason="Card status is BLOCKED"
```

---

## 📊 Performance Expectations

| Operation | Expected Time | Index Used |
|-----------|--------------|------------|
| Card Number Search | < 50ms | idx_members_card_number |
| Barcode Search | < 50ms | idx_members_barcode |
| Auto-Detection | < 1ms | Regex Pattern Matching |
| DTO Building | < 10ms | In-memory object creation |
| **Total** | **< 100ms** | **End-to-end** |

---

## 🔄 Migration Notes

### Old Endpoints (Deprecated)
```java
❌ GET /api/members/check-eligibility?cardNumber=...  (EligibilityCheckController)
❌ GET /api/members/search?memberNumber=...&name=...&barcode=...  (MemberController)
```

### New Endpoint (Recommended)
```java
✅ GET /api/members/eligibility?query=...  (UnifiedEligibilityController)
```

**Migration Path:**
1. Frontend should migrate to new endpoint
2. Old endpoints can remain for backward compatibility (mark as @Deprecated)
3. Remove old endpoints after all clients migrated

---

## 📝 Design Decisions - Justification

### 1. Why Single Query Parameter?
**Decision:** Use `?query=...` instead of `?cardNumber=...` or `?barcode=...`

**Justification:**
- ✅ Simpler API (one parameter instead of three)
- ✅ Auto-detection prevents user error
- ✅ Cleaner URL structure
- ✅ Easier to extend (add new formats in future)

### 2. Why Auto-Detection?
**Decision:** Detect input type using Regex patterns

**Justification:**
- ✅ User doesn't need to know the difference between card/barcode
- ✅ Scanner output is automatically recognized
- ✅ Reduces frontend complexity
- ✅ Clear error if format is wrong

### 3. Why No Name Search?
**Decision:** Remove name-based eligibility check

**Justification:**
- ✅ Eligibility = Verification → needs exact identification
- ✅ Name search returns multiple results (non-deterministic)
- ✅ Medical workflows require certainty
- ✅ Name search belongs in separate member lookup feature

### 4. Why Custom Exceptions?
**Decision:** Create `InvalidEligibilityInputException` and `MemberNotFoundException`

**Justification:**
- ✅ Clear error codes for frontend handling
- ✅ Specific HTTP status codes (400 vs 404)
- ✅ Better logging and debugging
- ✅ Follows REST best practices

### 5. Why Single DTO?
**Decision:** One `EligibilityResultDto` for all responses

**Justification:**
- ✅ Consistent response structure
- ✅ Complete information in one object
- ✅ Frontend can handle all cases uniformly
- ✅ Easy to extend with new fields

---

## ✅ Checklist - Implementation Complete

- [x] **DTOs Created**
  - [x] EligibilityResultDto.java
  
- [x] **Custom Exceptions**
  - [x] InvalidEligibilityInputException.java
  - [x] MemberNotFoundException.java
  
- [x] **Service Layer**
  - [x] UnifiedEligibilityService.java
  - [x] Auto-detection logic (Regex patterns)
  - [x] checkByCardNumber() method
  - [x] checkByBarcode() method
  - [x] Eligibility decision logic
  - [x] DTO building with complete info
  
- [x] **Controller Layer**
  - [x] UnifiedEligibilityController.java
  - [x] GET /api/members/eligibility endpoint
  - [x] Exception handlers
  - [x] Swagger documentation
  
- [x] **Repository Layer**
  - [x] Verified findByCardNumber() exists
  - [x] Verified findByBarcode() exists
  - [x] Verified database indexes exist

---

## 🚀 Next Steps (Awaiting Approval)

**Before Frontend Implementation:**
1. ✅ Review backend implementation
2. ✅ Test with Postman/curl
3. ✅ Verify error responses
4. ✅ Confirm performance benchmarks
5. ✅ Approve architectural decisions

**After Approval:**
1. Update frontend to use new endpoint
2. Deprecate old endpoints (if confirmed)
3. Update API documentation
4. Create integration tests

---

## 📞 Contact / Questions

**Implementation Date:** 2026-01-10  
**Version:** 2.0  
**Status:** ✅ Ready for Review  

**Awaiting approval to proceed with frontend implementation.**
