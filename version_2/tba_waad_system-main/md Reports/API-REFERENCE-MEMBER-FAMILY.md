# 📡 API REFERENCE - Member & Family Module (HARDENED)

**Version:** 1.0.0 FINAL  
**Last Updated:** 2026-01-10  
**Base URL:** `/api`

---

## 🔐 Authentication

All endpoints require authentication:
```
Authorization: Bearer {token}
```

---

## 👤 MEMBER OPERATIONS

### 1. Create Member
**Endpoint:** `POST /api/members`  
**Auth:** `SUPER_ADMIN` or `MANAGE_MEMBERS`  
**Description:** Create new principal member (with optional family members)

**Request Body:**
```json
{
  "fullName": "Ali Hassan Ahmed",
  "nationalNumber": "289123456789",
  "cardNumber": "CARD-001",
  "birthDate": "1990-05-15",
  "gender": "MALE",
  "maritalStatus": "MARRIED",
  "phone": "+96512345678",
  "email": "ali@example.com",
  "address": "Block 5, Street 10, House 25",
  "nationality": "Kuwaiti",
  "employerId": 1,
  "employeeNumber": "EMP-001",
  "joinDate": "2024-01-01",
  "occupation": "Engineer",
  "benefitPolicyId": 1,
  "policyNumber": "POL-2024-001",
  "status": "ACTIVE",
  "startDate": "2024-01-01",
  "endDate": "2025-01-01",
  "cardStatus": "ACTIVE",
  "active": true,
  "familyMembers": [
    {
      "fullName": "Sara Ali",
      "nationalNumber": "289987654321",
      "cardNumber": "CARD-002",
      "birthDate": "2015-03-20",
      "gender": "FEMALE",
      "relationship": "DAUGHTER",
      "active": true
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Member created successfully",
  "data": {
    "id": 123,
    "fullName": "Ali Hassan Ahmed",
    "barcode": "WAAD-M-000001",
    "cardNumber": "CARD-001",
    "familyMembers": [
      {
        "id": 456,
        "fullName": "Sara Ali",
        "barcode": "WAAD-F-000001",
        "cardNumber": "CARD-002",
        "relationship": "DAUGHTER"
      }
    ]
  }
}
```

**Notes:**
- ✅ Barcode auto-generated: `WAAD-M-NNNNNN`
- ✅ Family member barcodes auto-generated: `WAAD-F-NNNNNN`
- ✅ CardNumber is optional and manual

---

### 2. Update Member
**Endpoint:** `PUT /api/members/{id}`  
**Auth:** `SUPER_ADMIN` or `MANAGE_MEMBERS`  
**Description:** Update principal member (NO family members)

**Request Body (All fields optional):**
```json
{
  "fullName": "Ali Hassan Updated",
  "phone": "+96512345999",
  "email": "ali.new@example.com",
  "active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member updated successfully",
  "data": {
    "id": 123,
    "fullName": "Ali Hassan Updated",
    "barcode": "WAAD-M-000001",
    "phone": "+96512345999"
  }
}
```

**CRITICAL RULES:**
- ❌ NO `familyMembers` field - use separate endpoints
- ❌ NO `attributes` field - handled separately
- ❌ NO `barcode` field - immutable
- ✅ All fields optional
- ✅ Send only fields you want to update

---

### 3. Get Member
**Endpoint:** `GET /api/members/{id}`  
**Auth:** `SUPER_ADMIN` or `VIEW_MEMBERS`  
**Description:** Get member details with family members

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "fullName": "Ali Hassan Ahmed",
    "barcode": "WAAD-M-000001",
    "cardNumber": "CARD-001",
    "familyMembers": [
      {
        "id": 456,
        "fullName": "Sara Ali",
        "barcode": "WAAD-F-000001",
        "cardNumber": "CARD-002"
      }
    ]
  }
}
```

---

### 4. Delete Member
**Endpoint:** `DELETE /api/members/{id}`  
**Auth:** `SUPER_ADMIN` or `MANAGE_MEMBERS`  
**Description:** Delete member (cascade deletes family members)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member deleted successfully"
}
```

---

## 👨‍👩‍👧‍👦 FAMILY MEMBER OPERATIONS (Nested)

### 5. Add Family Member
**Endpoint:** `POST /api/members/{memberId}/family-members`  
**Auth:** `SUPER_ADMIN` or `MANAGE_MEMBERS`  
**Description:** Add new dependent to existing member

**Request Body:**
```json
{
  "fullName": "Ahmed Ali",
  "nationalNumber": "289111222333",
  "cardNumber": "CARD-003",
  "birthDate": "2018-07-10",
  "gender": "MALE",
  "relationship": "SON",
  "phone": "+96512345000",
  "notes": "Youngest son",
  "active": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Family member added successfully",
  "data": {
    "id": 789,
    "fullName": "Ahmed Ali",
    "barcode": "WAAD-F-000002",
    "cardNumber": "CARD-003",
    "relationship": "SON"
  }
}
```

**Notes:**
- ✅ Barcode auto-generated: `WAAD-F-NNNNNN`
- ✅ CardNumber optional
- ✅ Does NOT affect principal member

---

### 6. List Family Members
**Endpoint:** `GET /api/members/{memberId}/family-members`  
**Auth:** `SUPER_ADMIN` or `VIEW_MEMBERS`  
**Description:** Get all dependents for a member

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "fullName": "Sara Ali",
      "barcode": "WAAD-F-000001",
      "cardNumber": "CARD-002",
      "relationship": "DAUGHTER"
    },
    {
      "id": 789,
      "fullName": "Ahmed Ali",
      "barcode": "WAAD-F-000002",
      "cardNumber": "CARD-003",
      "relationship": "SON"
    }
  ]
}
```

---

### 7. Get Family Member
**Endpoint:** `GET /api/members/{memberId}/family-members/{familyMemberId}`  
**Auth:** `SUPER_ADMIN` or `VIEW_MEMBERS`  
**Description:** Get specific dependent details

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "fullName": "Sara Ali",
    "barcode": "WAAD-F-000001",
    "cardNumber": "CARD-002",
    "birthDate": "2015-03-20",
    "gender": "FEMALE",
    "relationship": "DAUGHTER",
    "active": true
  }
}
```

---

## 👥 FAMILY MEMBER OPERATIONS (Standalone) 🆕

### 8. Update Family Member (Standalone)
**Endpoint:** `PUT /api/family-members/{familyMemberId}`  
**Auth:** `SUPER_ADMIN` or `MANAGE_MEMBERS`  
**Description:** Update dependent (no memberId required in path)

**Request Body (All fields optional):**
```json
{
  "fullName": "Sara Ali Updated",
  "cardNumber": "CARD-NEW-002",
  "gender": "FEMALE",
  "active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Family member updated successfully",
  "data": {
    "id": 456,
    "fullName": "Sara Ali Updated",
    "barcode": "WAAD-F-000001",
    "cardNumber": "CARD-NEW-002"
  }
}
```

**CRITICAL RULES:**
- ❌ NO `barcode` field - immutable
- ✅ All fields optional
- ✅ No dependency on member update
- ✅ CardNumber can be updated

---

### 9. Delete Family Member (Standalone)
**Endpoint:** `DELETE /api/family-members/{familyMemberId}`  
**Auth:** `SUPER_ADMIN` or `MANAGE_MEMBERS`  
**Description:** Delete dependent by ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Family member deleted successfully"
}
```

---

## 📄 PDF / EXPORT OPERATIONS

### 10. Generate Member Card PDF
**Endpoint:** `GET /api/members/{id}/card/pdf`  
**Auth:** `SUPER_ADMIN` or `VIEW_MEMBERS`  
**Description:** Generate PDF card with QR code

**Response:** PDF file (Content-Type: application/pdf)

**PDF Content:**
- Company logo and header
- QR Code with barcode
- Member information
- Family members table
- Professional footer

---

## ❌ ERROR RESPONSES

### Validation Error (400)
```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": {
    "fullName": "Full name is required",
    "cardNumber": "Duplicate card number",
    "familyMember.birthDate": "Invalid date for relationship SON"
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "errorCode": "NOT_FOUND",
  "message": "Member not found: 999"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "errorCode": "FORBIDDEN",
  "message": "Family member does not belong to the specified member"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "errorCode": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

## 📋 ENUMS

### Member.Gender
```
MALE
FEMALE
UNDEFINED
```

### Member.MaritalStatus
```
SINGLE
MARRIED
DIVORCED
WIDOWED
```

### Member.MemberStatus
```
ACTIVE
INACTIVE
SUSPENDED
TERMINATED
```

### Member.CardStatus
```
ACTIVE
BLOCKED
EXPIRED
LOST
```

### FamilyMember.Relationship
```
WIFE
HUSBAND
SON
DAUGHTER
FATHER
MOTHER
BROTHER
SISTER
```

---

## 🔧 QUERY PARAMETERS

### Search/Filter (Future Enhancement)
```
GET /api/members?search=Ali&status=ACTIVE&employerId=1
```

### Pagination (Future Enhancement)
```
GET /api/members?page=0&size=20&sort=fullName,asc
```

---

## 📊 RATE LIMITS

- **Standard:** 100 requests/minute per user
- **Bulk Operations:** 10 requests/minute
- **PDF Generation:** 20 requests/minute

---

## 🔐 SECURITY

### Required Permissions

| Endpoint | Permission |
|----------|-----------|
| POST /members | `MANAGE_MEMBERS` |
| PUT /members/{id} | `MANAGE_MEMBERS` |
| DELETE /members/{id} | `MANAGE_MEMBERS` |
| GET /members/{id} | `VIEW_MEMBERS` |
| POST /family-members | `MANAGE_MEMBERS` |
| PUT /family-members/{id} | `MANAGE_MEMBERS` |
| DELETE /family-members/{id} | `MANAGE_MEMBERS` |

**Super Admin:** Has all permissions

---

## ✅ BEST PRACTICES

1. **Always use standalone endpoints for family member updates**
   ```bash
   # ✅ CORRECT
   PUT /api/family-members/456
   
   # ❌ WRONG (will fail)
   PUT /api/members/123  # with familyMembers in payload
   ```

2. **Send only fields you want to update**
   ```json
   // ✅ CORRECT - update phone only
   { "phone": "+96512345678" }
   
   // ❌ WASTEFUL - sending all fields
   { "fullName": "...", "phone": "...", "email": "...", ... }
   ```

3. **Never try to update barcode**
   ```json
   // ❌ FORBIDDEN
   { "barcode": "WAAD-M-999999" }
   
   // ✅ CORRECT - barcode is immutable
   { "fullName": "Updated Name" }
   ```

4. **Use field-level error responses**
   - Check `errors` object for specific field validation failures
   - Display errors next to respective form fields

---

## 📚 RELATED DOCUMENTATION

- **Architecture Guide:** `ARCHITECTURE-HARDENING-FINAL-COMPLETE.md`
- **Quick Guide (Arabic):** `ARCHITECTURE-HARDENING-QUICK-GUIDE-AR.md`
- **Migration Guide:** `V999__member_family_architecture_hardening.sql`

---

**API Version:** 1.0.0 FINAL  
**Last Updated:** 2026-01-10  
**Status:** Production Ready ✅
