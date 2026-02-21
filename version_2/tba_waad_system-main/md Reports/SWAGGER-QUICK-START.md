# Phase 2 API Documentation - Swagger Quick Start

## Access Swagger UI

### Local Development
```
http://localhost:8080/swagger-ui.html
```

### OpenAPI JSON Spec
```
http://localhost:8080/v3/api-docs
```

---

## Phase 2 Endpoints

### Member Status Management

#### 1. Suspend Member
```http
POST /api/members/{id}/suspend
Content-Type: application/json

{
  "reason": "Exceeded annual limit"
}
```

**Effect:** Member→SUSPENDED, Card→BLOCKED, Eligibility→false

---

#### 2. Activate Member
```http
POST /api/members/{id}/activate
```

**Effect:** Member→ACTIVE, Card→ACTIVE, Eligibility→recalculated

---

#### 3. Terminate Member (IRREVERSIBLE)
```http
POST /api/members/{id}/terminate
```

**Effect:** Member→TERMINATED, Card→EXPIRED, active→false  
**⚠️ WARNING:** This action is IRREVERSIBLE!

---

### Card Management

#### 4. Block Card
```http
POST /api/members/{id}/card/block
Content-Type: application/json

{
  "reason": "Lost card"
}
```

**Effect:** Card→BLOCKED (Member status unchanged)

---

#### 5. Activate Card
```http
POST /api/members/{id}/card/activate
```

**Effect:** Card→ACTIVE (Member status unchanged)

---

### Eligibility Check

#### 6. Check Eligibility
```http
GET /api/members/{id}/eligibility?serviceDate=2024-12-29
```

**Returns:**
- `eligible: true/false`
- `eligibilityStatus: ELIGIBLE/INELIGIBLE`
- `ineligibilityReasons: []` (if ineligible)
- Full member, policy, and employer details

---

## Key Features

### ✅ Civil ID is OPTIONAL
Members can be created and remain eligible WITHOUT Civil ID.

```json
{
  "fullNameArabic": "أحمد محمد",
  "fullNameEnglish": "Ahmed Mohammed",
  "civilId": null,  // ✅ VALID
  "employerId": 1,
  "benefitPolicyId": 1
}
```

### ✅ Card as Primary Identifier
Card number (barcode) is used for service access, not Civil ID.

### ✅ Real-Time Eligibility
Eligibility calculated on each request based on 7 conditions:
1. Member active
2. Member status = ACTIVE
3. Card status = ACTIVE
4. Benefit policy assigned
5. Policy status = ACTIVE
6. Policy effective on service date
7. Employer active

### ⚠️ TERMINATED is Irreversible
Once terminated, member cannot be reactivated. Use suspend for temporary restrictions.

---

## Status Lifecycle

```
PENDING → ACTIVE ⇄ SUSPENDED → TERMINATED (final)
```

**Valid Transitions:**
- PENDING → ACTIVE
- ACTIVE ⇄ SUSPENDED
- ACTIVE/SUSPENDED → TERMINATED

**Forbidden:**
- TERMINATED → any status (irreversible)

---

## Interactive Testing

1. Open Swagger UI: http://localhost:8080/swagger-ui.html
2. Navigate to "Members" tag
3. Click "Authorize" and enter credentials
4. Try out endpoints with real examples
5. View response codes and examples

---

## Documentation Files

- **[PHASE-2-DOCUMENTATION-INDEX.md](PHASE-2-DOCUMENTATION-INDEX.md)** - Documentation index
- **[STREAM-3-DOCUMENTATION-COMPLETE.md](STREAM-3-DOCUMENTATION-COMPLETE.md)** - Complete API docs
- **[PHASE-2-COMPLETE-SUMMARY.md](PHASE-2-COMPLETE-SUMMARY.md)** - Implementation summary

---

## Quick Examples

### Suspend Member
```bash
curl -X POST "http://localhost:8080/api/members/123/suspend" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "Exceeded annual limit"}'
```

### Check Eligibility
```bash
curl -X GET "http://localhost:8080/api/members/123/eligibility?serviceDate=2024-12-29" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Terminate Member
```bash
curl -X POST "http://localhost:8080/api/members/123/terminate" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Last Updated:** 2025-12-29  
**API Version:** Phase 2  
**Status:** ✅ Production Ready
