# Settlement Module API Contract - Version 1

**Document Control**
- **Version**: 1.0.0
- **Date**: February 1, 2026
- **Status**: PRODUCTION
- **Base Path**: `/api/v1/settlement-batches`
- **Authentication**: JWT Bearer Token Required
- **Content-Type**: `application/json`

---

## Executive Summary

This document defines the **strict, backend-authoritative API contracts** for the Settlement module. All financial calculations occur server-side. **The frontend NEVER sends monetary values.**

### Financial Safety Guarantees

✅ **Backend is the SOLE source of truth for all amounts**  
✅ **Frontend cannot manipulate payment values**  
✅ **All calculations derived from immutable database records**  
✅ **Approved batches are financially locked**  
✅ **Payment operations are atomic and irreversible**  

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Request Contracts](#request-contracts)
3. [Response Contracts](#response-contracts)
4. [Business Rules](#business-rules)
5. [Error Handling](#error-handling)
6. [Security](#security)
7. [Audit Trail](#audit-trail)

---

## API Endpoints

### 1. Create Settlement Batch

**Endpoint**: `POST /api/v1/settlement-batches`  
**Permission**: `CREATE_SETTLEMENT_BATCH`  
**Status**: Creates batch in `DRAFT` status

#### Request Contract
```json
{
  "providerId": 123,                    // REQUIRED
  "description": "January 2026",        // Optional (max 500 chars)
  "claimIds": [456, 457, 458]           // Optional
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "batchNumber": "STL-2026-000001",
    "status": "DRAFT",
    "claimCount": 3,
    "totalNetAmount": 125000.00,        // BACKEND CALCULATED
    "totalGrossAmount": 135000.00,      // BACKEND CALCULATED
    "totalPatientShare": 10000.00       // BACKEND CALCULATED
  }
}
```

**CRITICAL**: Frontend does NOT send any amounts. Backend calculates from claim data.

---

### 2. Add Claims to Batch

**Endpoint**: `PUT /api/v1/settlement-batches/{batchId}/claims`  
**Permission**: `CREATE_SETTLEMENT_BATCH`  
**Precondition**: Batch must be in `DRAFT` status

#### Request Contract
```json
{
  "claimIds": [789, 790, 791]           // REQUIRED (min 1)
}
```

#### Backend Validations
- ✅ Batch is in DRAFT status
- ✅ Claims are APPROVED
- ✅ Claims belong to same provider
- ✅ Claims not in another batch
- ✅ Claims have valid net amounts > 0

#### Response
```json
{
  "success": true,
  "data": {
    "addedClaimIds": [789, 790],
    "addedCount": 2,
    "requestedCount": 3,
    "batch": { /* Updated BatchSummaryDTO */ },
    "message": "تم إضافة 2 مطالبة إلى الدفعة"
  }
}
```

**NOTE**: Partial success possible. Check `addedCount` vs `requestedCount`.

---

### 3. Remove Claims from Batch

**Endpoint**: `DELETE /api/v1/settlement-batches/{batchId}/claims`  
**Permission**: `CREATE_SETTLEMENT_BATCH`  
**Precondition**: Batch must be in `DRAFT` status

#### Request Contract
```json
{
  "claimIds": [789, 790]                // REQUIRED (min 1)
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "removedClaimIds": [789, 790],
    "removedCount": 2,
    "batch": { /* Updated BatchSummaryDTO */ },
    "message": "تم إزالة 2 مطالبة من الدفعة"
  }
}
```

---

### 4. Confirm Batch

**Endpoint**: `POST /api/v1/settlement-batches/{batchId}/confirm`  
**Permission**: `CONFIRM_SETTLEMENT_BATCH`  
**State Transition**: `DRAFT` → `CONFIRMED`

#### Request Contract
```json
{
  "confirmationNotes": "Verified amounts"  // Optional (max 500 chars)
}
```

#### Backend Validations
- ✅ Batch is in DRAFT status
- ✅ Batch contains at least 1 claim
- ✅ All financial totals are valid

#### Response
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "status": "CONFIRMED",
    "confirmedBy": 5,
    "confirmedByName": "Fatima Al-Mutairi",
    "confirmedAt": "2026-01-15T14:20:00",
    "totalNetAmount": 125000.00,        // IMMUTABLE from this point
    "modifiable": false
  },
  "message": "تم تأكيد الدفعة بنجاح - جاهزة للدفع"
}
```

**CRITICAL**: After confirmation, financial amounts are **LOCKED**. Batch cannot be modified.

---

### 5. Pay Batch (CRITICAL FINANCIAL OPERATION)

**Endpoint**: `POST /api/v1/settlement-batches/{batchId}/pay`  
**Permission**: `PAY_SETTLEMENT_BATCH`  
**State Transition**: `CONFIRMED` → `PAID`  
**WARNING**: **IRREVERSIBLE OPERATION**

#### Request Contract
```json
{
  "paymentReference": "TRF-2026-001234",     // REQUIRED (3-100 chars, unique)
  "paymentMethod": "BANK_TRANSFER",          // REQUIRED (BANK_TRANSFER|CHECK|CASH)
  "bankAccountNumber": "SA123...",           // Optional (max 50 chars)
  "paymentNotes": "NCB transfer"             // Optional (max 500 chars)
}
```

#### FORBIDDEN Fields (Compile-time Prevention)
❌ **NO paymentAmount** - Taken from `batch.totalNetAmount` (immutable)  
❌ **NO totalAmount**  
❌ **NO netAmount**  
❌ **NO deductions**  
❌ **NO claimIds**  

#### Backend Operations (Atomic)
1. Validate batch is CONFIRMED
2. Lock provider account (SELECT FOR UPDATE)
3. Validate sufficient balance
4. Create DEBIT transaction = `batch.totalNetAmount`
5. Update provider balance
6. Mark ALL claims as SETTLED
7. Set batch status = PAID

#### Response
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "status": "PAID",
    "paymentReference": "TRF-2026-001234",
    "paymentMethod": "BANK_TRANSFER",
    "paymentDate": "2026-01-20",
    "totalNetAmount": 125000.00,
    "paidBy": 7,
    "paidByName": "Mohammed Al-Rashid",
    "paidAt": "2026-01-20T09:45:00"
  },
  "message": "تم دفع الدفعة بنجاح ✓ - جميع المطالبات تمت تسويتها"
}
```

**FINANCIAL INTEGRITY GUARANTEE**:  
Payment amount = `batch.totalNetAmount` (locked since CONFIRMED).  
Provider account debited = exactly `batch.totalNetAmount`.  
No arithmetic manipulation possible.

---

### 6. Cancel Batch

**Endpoint**: `POST /api/v1/settlement-batches/{batchId}/cancel`  
**Permission**: `CANCEL_SETTLEMENT_BATCH`  
**Allowed Statuses**: `DRAFT`, `CONFIRMED`  
**NOT Allowed**: `PAID` (use reversal process instead)

#### Request Contract
```json
{
  "cancellationReason": "Provider requested revision..."  // REQUIRED (10-500 chars)
}
```

#### Backend Operations
1. Validate batch can be cancelled
2. Return all claims to APPROVED status
3. Delete batch items
4. Mark batch as CANCELLED

#### Response
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "status": "CANCELLED",
    "cancellationReason": "Provider requested revision...",
    "cancelledBy": 8,
    "cancelledByName": "Sara Al-Harbi",
    "cancelledAt": "2026-01-12T11:00:00"
  },
  "message": "تم إلغاء الدفعة - المطالبات عادت لحالة 'معتمدة'"
}
```

---

### 7. Get Batch Details

**Endpoint**: `GET /api/v1/settlement-batches/{batchId}`  
**Permission**: `VIEW_SETTLEMENTS`

#### Response
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "batchNumber": "STL-2026-000001",
    "providerId": 123,
    "providerName": "Al-Shifa Hospital",
    "status": "CONFIRMED",
    "statusArabic": "مؤكد",
    "modifiable": false,
    "claimCount": 25,
    "totalGrossAmount": 135000.00,
    "totalNetAmount": 125000.00,
    "totalPatientShare": 10000.00,
    "description": "January 2026 settlements",
    "createdBy": 5,
    "createdByName": "Ahmed Al-Salem",
    "createdAt": "2026-01-10T10:30:00",
    "confirmedBy": 6,
    "confirmedByName": "Fatima Al-Mutairi",
    "confirmedAt": "2026-01-15T14:20:00",
    "claims": [ /* Optional: list of BatchClaimItemResponse */ ]
  }
}
```

---

### 8. List Available Claims

**Endpoint**: `GET /api/v1/settlement-batches/available-claims/{providerId}`  
**Permission**: `VIEW_SETTLEMENTS`

#### Query Filters (Backend)
- Status = `APPROVED`
- Not in any batch
- Net payable amount > 0

#### Response
```json
{
  "success": true,
  "data": [
    {
      "claimId": 789,
      "claimNumber": "CLM-789",
      "memberName": "Fatima Al-Harbi",
      "serviceDate": "2026-01-05",
      "approvedAmount": 3200.00,
      "netPayableAmount": 3000.00,      // BACKEND CALCULATED
      "status": "APPROVED"
    }
  ],
  "message": "Found 15 available claims"
}
```

---

## Business Rules

### Batch Lifecycle

```
DRAFT ──────────→ CONFIRMED ──────────→ PAID (terminal)
  ↓                   ↓
CANCELLED         CANCELLED
```

| Status | Can Modify | Can Confirm | Can Pay | Can Cancel |
|--------|-----------|-------------|---------|-----------|
| DRAFT | ✅ | ✅ | ❌ | ✅ |
| CONFIRMED | ❌ | ❌ | ✅ | ✅ |
| PAID | ❌ | ❌ | ❌ | ❌ |
| CANCELLED | ❌ | ❌ | ❌ | ❌ |

### Financial Rules (ENFORCED BY BACKEND)

1. **Claim Eligibility**
   - Must be in APPROVED status
   - Must belong to batch provider
   - Cannot be in another batch
   - Must have netPayableAmount > 0

2. **Batch Totals** (Auto-calculated)
   - `totalGrossAmount` = SUM(claim.requestedAmount)
   - `totalNetAmount` = SUM(claim.netPayableAmount)
   - `totalPatientShare` = SUM(claim.patientCoPay)

3. **Payment Validation**
   - Provider account balance ≥ `batch.totalNetAmount`
   - Payment reference must be unique
   - Transaction amount = exactly `batch.totalNetAmount`

4. **Immutability**
   - After CONFIRMED: amounts are locked
   - After PAID: batch is terminal (cannot modify)

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "BATCH_NOT_MODIFIABLE",
    "message": "Cannot add claims to batch 1001. Status is: CONFIRMED",
    "timestamp": "2026-01-15T14:30:00"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `BATCH_NOT_FOUND` | 404 | Batch ID does not exist |
| `BATCH_NOT_MODIFIABLE` | 400 | Batch not in DRAFT status |
| `CLAIM_NOT_APPROVED` | 400 | Claim must be APPROVED |
| `CLAIM_ALREADY_BATCHED` | 400 | Claim in another batch |
| `INSUFFICIENT_BALANCE` | 400 | Provider balance too low |
| `INVALID_STATUS_TRANSITION` | 400 | Status change not allowed |
| `DUPLICATE_PAYMENT_REFERENCE` | 400 | Payment ref already used |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `FORBIDDEN` | 403 | Missing permission |

---

## Security

### Required Permissions

| Operation | Permission |
|-----------|-----------|
| Create/Modify Batch | `CREATE_SETTLEMENT_BATCH` |
| Confirm Batch | `CONFIRM_SETTLEMENT_BATCH` |
| Pay Batch | `PAY_SETTLEMENT_BATCH` |
| Cancel Batch | `CANCEL_SETTLEMENT_BATCH` |
| View Batches/Claims | `VIEW_SETTLEMENTS` |

### JWT Claims Required

```json
{
  "sub": "user@example.com",
  "userId": 5,
  "roles": ["SUPER_ADMIN"],
  "permissions": ["CREATE_SETTLEMENT_BATCH", "PAY_SETTLEMENT_BATCH"]
}
```

---

## Audit Trail

Every batch tracks complete lifecycle:

- **Created**: userId, timestamp
- **Confirmed**: userId, timestamp
- **Paid**: userId, timestamp, paymentReference
- **Cancelled**: userId, timestamp, reason

All claim state transitions logged in `ClaimAuditLog`.

---

## Frontend Integration Guidelines

### DO's ✅

- Send only claim IDs
- Display amounts from backend responses
- Validate inputs before submission
- Handle partial success scenarios
- Show detailed error messages
- Implement optimistic UI updates with rollback

### DON'Ts ❌

- **NEVER calculate payment amounts**
- **NEVER send monetary values**
- **NEVER assume batch modification succeeded**
- **NEVER cache financial data**
- **NEVER retry payment operations**
- **NEVER allow editing CONFIRMED batches**

---

## Examples

### Complete Workflow

```http
### 1. Create batch
POST /api/v1/settlement-batches
{
  "providerId": 123,
  "description": "January settlements"
}
# Response: { "batchId": 1001, "status": "DRAFT" }

### 2. Add claims
PUT /api/v1/settlement-batches/1001/claims
{
  "claimIds": [456, 457, 458]
}
# Backend validates and calculates totals

### 3. Confirm
POST /api/v1/settlement-batches/1001/confirm
{
  "confirmationNotes": "Verified"
}
# Status: CONFIRMED, amounts LOCKED

### 4. Pay (IRREVERSIBLE)
POST /api/v1/settlement-batches/1001/pay
{
  "paymentReference": "TRF-2026-001234",
  "paymentMethod": "BANK_TRANSFER"
}
# Backend debits account, settles claims
# Status: PAID (terminal)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-01 | Initial API contract with strict validation |

---

## Contact & Support

For API questions or integration support:
- **Technical Lead**: Backend Architect
- **Documentation**: See also `FINANCIAL_INTEGRITY_REMEDIATION_REPORT.md`
- **Code Location**: `backend/src/main/java/com/waad/tba/modules/settlement/api/`

---

**END OF CONTRACT DOCUMENT**
