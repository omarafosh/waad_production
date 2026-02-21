# 🔒 ELIGIBILITY SYSTEM - FREEZE DECISION

**Decision Date:** January 10, 2026  
**Status:** LOCKED & ENFORCED  
**Version:** 2.0 (Deterministic Only)

---

## 📋 **Executive Summary**

**DECISION:** There is **ONE and ONLY ONE** source for eligibility verification in the TBA WAAD System.

**Location:** `/frontend/src/pages/eligibility/EligibilityCheckPage.jsx`  
**Backend:** `GET /api/members/eligibility?query={value}`

**ANY** eligibility check outside this source is **REJECTED and FORBIDDEN**.

---

## 🚫 **What is FORBIDDEN**

### **Frontend - Forbidden Components:**
- ❌ `/pages/members/EligibilityCheck.jsx` (DELETED)
- ❌ `/pages/members/UnifiedSearch.jsx` (DELETED - contains name search)
- ❌ `/pages/visits/EligibilityCheckPage.jsx` (DELETED)
- ❌ Any component that performs eligibility verification
- ❌ Any component with name-based search for eligibility
- ❌ Any "Check Eligibility" button outside the main page

### **Backend - Forbidden Endpoints:**
- ❌ `GET /api/members/check-eligibility` (OLD - DELETED)
- ❌ Any endpoint with name search for eligibility
- ❌ Any endpoint returning multiple members for eligibility
- ❌ Any fuzzy/autocomplete logic in eligibility context

### **Forbidden Patterns:**
- ❌ Name-based eligibility search
- ❌ Multiple result eligibility checks
- ❌ Embedded eligibility checks in other pages
- ❌ Eligibility verification without card/barcode
- ❌ Visit creation without prior eligibility check

---

## ✅ **What is ALLOWED**

### **The ONLY Eligibility Source:**

**Page:** `/pages/eligibility/EligibilityCheckPage.jsx`

**Features:**
- ✅ Card Number input (digits only)
- ✅ QR/Barcode camera scanning
- ✅ Hardware barcode scanner support
- ✅ Auto-detection (Card vs Barcode)
- ✅ Deterministic results (ONE input → ONE member)

**Endpoint:** `GET /api/members/eligibility?query={value}`

**Logic:**
```java
// Auto-detection
if (query matches BARCODE_PATTERN) → findByBarcode()
else if (query matches CARD_NUMBER_PATTERN) → findByCardNumber()
else → throw InvalidEligibilityInputException
```

**Response:**
```json
{
  "eligible": true/false,
  "memberId": 123,
  "fullName": "...",
  "cardNumber": "...",
  "barcode": "...",
  "policyName": "...",
  "copayAmount": 80,
  "coverageLimit": 50000,
  "ineligibilityReason": "..." // if not eligible
}
```

---

## 🔐 **Enforcement Rules**

### **Rule 1: Single Entry Point**
**Requirement:** All eligibility checks MUST go through `/eligibility` page.

**Enforcement:**
- No other page can check eligibility
- No duplicate eligibility logic
- No shortcuts or workarounds

**Violation:** Immediate rejection in code review

---

### **Rule 2: No Name Search for Eligibility**
**Requirement:** Name search is NOT allowed for eligibility verification.

**Reason:**
- Medical verification requires deterministic identification
- Name search = ambiguity = multiple results
- Eligibility = ONE member, not a list

**Enforcement:**
- Backend throws `InvalidEligibilityInputException` for non-card/barcode input
- Frontend disables name input in eligibility context

**Violation:** Compilation error + failed tests

---

### **Rule 3: Visit Requires Eligibility**
**Requirement:** No Visit can be created without a valid eligibility check.

**Enforcement (Backend):**
```java
@PrePersist
public void validateEligibility() {
  if (this.eligibilityCheckId == null) {
    throw new BusinessRuleException("Cannot create Visit without eligibility check");
  }
}
```

**Enforcement (Frontend):**
- "Create Visit" button disabled until eligibility verified
- Navigation from `/eligibility` → Visit creation with eligibilityId

**Violation:** HTTP 400 Bad Request

---

### **Rule 4: Immutable Eligibility Results**
**Requirement:** Eligibility check results cannot be modified after creation.

**Enforcement:**
- No UPDATE endpoint for eligibility
- Read-only access after initial check
- Audit log tracks all checks

**Violation:** Not allowed by design

---

## 🗑️ **Deleted Files (Phase 2)**

### **Frontend Deletions:**
```
frontend/src/pages/members/EligibilityCheck.jsx          ❌ DELETED
frontend/src/pages/members/UnifiedSearch.jsx             ❌ DELETED
frontend/src/pages/visits/EligibilityCheckPage.jsx       ❌ DELETED
```

### **Backend Deletions:**
```
backend/.../member/controller/EligibilityCheckController.java  ❌ DELETED
backend/.../member/service/EligibilityCheckService.java       ❌ DELETED
backend/.../member/dto/EligibilityCheckDto.java              ❌ DELETED
backend/.../member/service/NameSearchService.java            ❌ DELETED (if exists)
```

### **Why Direct Deletion (No _OLD)?**
- ✅ Clean codebase
- ✅ No confusion
- ✅ Git history preserves old code if needed
- ✅ Forces proper migration
- ✅ Prevents accidental reuse

---

## 🔄 **Migration Path (For Old Code)**

**If you find old eligibility code:**

1. **Stop immediately**
2. **Do NOT modify it**
3. **Replace with:**
   ```javascript
   // Redirect to eligibility page
   navigate('/eligibility');
   ```

4. **In backend, use:**
   ```java
   // UnifiedEligibilityService
   EligibilityResultDto result = unifiedEligibilityService.checkEligibility(query);
   ```

---

## 📊 **System Architecture**

### **Correct Flow:**
```
User → /eligibility → QR Scan / Card Input
  ↓
Backend: UnifiedEligibilityController.checkEligibility()
  ↓
UnifiedEligibilityService.checkEligibility()
  ↓
Auto-detect → findByCard() OR findByBarcode()
  ↓
Return EligibilityResultDto
  ↓
Frontend: Display result
  ↓
[If eligible] → Navigate to Visit/Claim creation with eligibilityId
```

### **Incorrect Flow (FORBIDDEN):**
```
User → /visits → "Check Eligibility" button  ❌ WRONG
User → /members → Name search → Select → Check  ❌ WRONG
User → Any page → Embedded eligibility check  ❌ WRONG
```

---

## 🧪 **Testing Requirements**

### **Unit Tests:**
```java
@Test
void shouldRejectVisitWithoutEligibility() {
  Visit visit = new Visit();
  visit.setEligibilityCheckId(null);
  
  assertThrows(BusinessRuleException.class, () -> {
    visitRepository.save(visit);
  });
}
```

### **Integration Tests:**
```java
@Test
void shouldRejectNameSearchForEligibility() {
  String nameQuery = "أحمد محمد";
  
  assertThrows(InvalidEligibilityInputException.class, () -> {
    eligibilityService.checkEligibility(nameQuery);
  });
}
```

### **E2E Tests:**
```javascript
test('Cannot create visit without eligibility', async () => {
  await page.goto('/visits/create');
  
  const submitButton = await page.$('button[type="submit"]');
  expect(await submitButton.isDisabled()).toBe(true);
});
```

---

## 📈 **Success Metrics**

### **Acceptance Criteria:**

✅ **Criterion 1:** Only ONE eligibility page exists  
✅ **Criterion 2:** No old endpoints respond  
✅ **Criterion 3:** No UI suggests eligibility check outside main page  
✅ **Criterion 4:** Backend rejects Visit without eligibilityId  
✅ **Criterion 5:** Name search does NOT trigger eligibility  

### **How to Verify:**

**Frontend:**
```bash
# Should find ONLY ONE file
find frontend/src -name "*ligibility*" -type f
# Expected: frontend/src/pages/eligibility/EligibilityCheckPage.jsx
```

**Backend:**
```bash
# Should find ONLY unified files
find backend/src -name "*ligibility*" -type f | grep -v "_OLD"
# Expected:
# - UnifiedEligibilityController.java
# - UnifiedEligibilityService.java
# - EligibilityResultDto.java
# - InvalidEligibilityInputException.java
# - MemberNotFoundException.java
```

**Database:**
```sql
-- Should return 0 (no visits without eligibility)
SELECT COUNT(*) FROM visits WHERE eligibility_check_id IS NULL;
```

---

## 🔨 **Enforcement Checklist**

### **For Developers:**
- [ ] I have read this document
- [ ] I understand the ONE SOURCE rule
- [ ] I will NOT create eligibility checks outside `/eligibility`
- [ ] I will NOT use name search for eligibility
- [ ] I will always require eligibilityId for Visit creation

### **For Code Reviewers:**
- [ ] No new eligibility components outside `/eligibility`
- [ ] No name search in eligibility context
- [ ] Visit creation includes eligibilityId validation
- [ ] No resurrection of deleted old code
- [ ] Tests enforce the freeze decision

### **For QA:**
- [ ] Cannot create Visit without eligibility
- [ ] Name search does not trigger eligibility
- [ ] Only card/barcode work for eligibility
- [ ] Old endpoints return 404
- [ ] UI has no misleading eligibility buttons

---

## 📝 **Change Log**

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Initial freeze decision | TBA Team |
| 2026-01-10 | Deleted old eligibility files | TBA Team |
| 2026-01-10 | Enforced backend validation | TBA Team |

---

## ⚠️ **Breaking This Decision**

**Consequences:**
1. Immediate code review rejection
2. Failed CI/CD pipeline
3. Architectural violation flag
4. Mandatory refactoring

**Exception Process:**
- Must be approved by Lead Architect
- Must document WHY exception is needed
- Must have alternative solution evaluation
- Must update this document

---

## 🎯 **Summary**

**Remember:**

> **ONE SOURCE. ONE TRUTH. ONE WAY.**

**Eligibility lives at:** `/pages/eligibility/EligibilityCheckPage.jsx`  
**Everything else:** DELETED or FORBIDDEN.

**No exceptions. No shortcuts. No workarounds.**

---

**Status:** ✅ ENFORCED  
**Last Updated:** January 10, 2026  
**Next Review:** When architectural change is proposed (requires Lead approval)
