# Frontend Integration Guide — Claims & Pre-Authorization API v1

**Document Type**: Frontend–Backend Integration Plan  
**Status**: FINAL — Backend Locked, Frontend Implementation Required  
**Date**: February 1, 2026

---

## Executive Summary

**Backend Status**: ✅ COMPLETE & LOCKED
- Claims module: API v1 contract-first (/api/v1/claims/*)
- Pre-Authorization module: API v1 contract-first (/api/v1/pre-authorizations/*)

**Backend Authority**: All monetary/decision values calculated server-side  
**Frontend Role**: Display, collect user input, submit to API, render results  
**Integration Risk**: 🟢 LOW — Backend prevents manipulation via API contracts

**This Document Provides**:
1. TypeScript interfaces for API contracts
2. UI action mappings (what frontend should/shouldn't do)
3. Strict frontend rules (non-negotiable)
4. Closure checklist (sign-off ready)

---

## Phase 1: Frontend Contract Mapping

### Pre-Authorization Module

#### 1.1 Request Interfaces

**Create Pre-Authorization**
```typescript
// POST /api/v1/pre-authorizations
interface CreatePreAuthorizationRequest {
  visitId: number;              // ✅ REQUIRED - Visit reference
  medicalServiceId: number;     // ✅ REQUIRED - Service to authorize
  priority?: 'ROUTINE' | 'URGENT' | 'EMERGENCY';  // ✅ Optional
  diagnosisCode?: string;       // ✅ Optional - ICD-10 code
  notes?: string;               // ✅ Optional - Clinical notes
  expiryDays?: number;          // ✅ Optional - Override default (30 days)
  
  // ❌ FORBIDDEN FIELDS (backend calculates):
  // approvedAmount, copayPercentage, copayAmount, 
  // insuranceCoveredAmount, contractPrice, coverageLimits
}
```

**Update Pre-Authorization**
```typescript
// PUT /api/v1/pre-authorizations/{id}
interface UpdatePreAuthorizationRequest {
  priority?: 'ROUTINE' | 'URGENT' | 'EMERGENCY';  // ✅ Allowed
  diagnosisCode?: string;       // ✅ Allowed
  notes?: string;               // ✅ Allowed
  expiryDays?: number;          // ✅ Allowed
  
  // ❌ FORBIDDEN FIELDS:
  // status, approvedAmount, medicalServiceId, visitId, memberId
}
```

**Approve Pre-Authorization** 🔒 CRITICAL
```typescript
// POST /api/v1/pre-authorizations/{id}/approve
interface ApprovePreAuthorizationRequest {
  approvalNotes?: string;       // ✅ ONLY ALLOWED FIELD (max 1000 chars)
  
  // ❌ FORBIDDEN FIELDS (backend calculates ALL):
  // approvedAmount - from ProviderContract
  // copayPercentage - from BenefitPolicy
  // copayAmount - calculated
  // insuranceCoveredAmount - calculated
  // expiryDate - calculated (approval date + 30 days)
}
```

**Reject Pre-Authorization**
```typescript
// POST /api/v1/pre-authorizations/{id}/reject
interface RejectPreAuthorizationRequest {
  rejectionReason: string;      // ✅ REQUIRED (10-500 chars)
}
```

---

#### 1.2 Response Interfaces

**Pre-Authorization Response**
```typescript
// Returned from all GET/POST/PUT endpoints
interface PreAuthorizationResponse {
  // Identity
  id: number;                           // READ-ONLY
  referenceNumber: string;              // READ-ONLY - e.g., "PA-2026-00123"
  
  // Status
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';  // READ-ONLY
  
  // Request Details
  visitId: number;                      // READ-ONLY
  memberId: number;                     // READ-ONLY
  memberName: string;                   // READ-ONLY
  memberPolicyNumber: string;           // READ-ONLY
  providerId: number;                   // READ-ONLY
  providerName: string;                 // READ-ONLY
  medicalServiceId: number;             // READ-ONLY
  medicalServiceCode: string;           // READ-ONLY
  medicalServiceName: string;           // READ-ONLY
  priority: string;                     // READ-ONLY
  diagnosisCode?: string;               // READ-ONLY
  notes?: string;                       // READ-ONLY
  
  // 💰 FINANCIAL FIELDS (ALL READ-ONLY - BACKEND CALCULATED)
  contractPrice?: number;               // READ-ONLY - From ProviderContract
  approvedAmount?: number;              // READ-ONLY - Calculated on approval
  copayPercentage?: number;             // READ-ONLY - From BenefitPolicy
  copayAmount?: number;                 // READ-ONLY - approvedAmount × copayPercentage ÷ 100
  insuranceCoveredAmount?: number;      // READ-ONLY - approvedAmount - copayAmount
  
  // Business Flags (READ-ONLY)
  hasContract: boolean;                 // READ-ONLY - Contract exists?
  isValid: boolean;                     // READ-ONLY - Approved and not expired?
  isExpired: boolean;                   // READ-ONLY - Past expiry date?
  canBeApproved: boolean;               // READ-ONLY - Eligible for approval?
  
  // Workflow Tracking
  createdBy: string;                    // READ-ONLY
  createdAt: string;                    // READ-ONLY - ISO 8601
  approvedBy?: string;                  // READ-ONLY
  approvedAt?: string;                  // READ-ONLY - ISO 8601
  approvalNotes?: string;               // READ-ONLY
  rejectedBy?: string;                  // READ-ONLY
  rejectedAt?: string;                  // READ-ONLY - ISO 8601
  rejectionReason?: string;             // READ-ONLY
  expiryDate?: string;                  // READ-ONLY - ISO 8601 date
}
```

**Pre-Authorization List Response**
```typescript
// Returned from GET /api/v1/pre-authorizations (paginated)
interface PreAuthorizationListResponse {
  items: PreAuthorizationResponse[];    // READ-ONLY
  total: number;                        // READ-ONLY - Total count
  page: number;                         // READ-ONLY - Current page (0-based)
  size: number;                         // READ-ONLY - Items per page
  totalPages: number;                   // READ-ONLY
  hasNext: boolean;                     // READ-ONLY
  hasPrevious: boolean;                 // READ-ONLY
}
```

---

### Claims Module

#### 1.3 Request Interfaces

**Create Claim**
```typescript
// POST /api/v1/claims
interface CreateClaimRequest {
  visitId: number;                      // ✅ REQUIRED - Visit reference
  memberId: number;                     // ✅ REQUIRED - Member ID
  providerId: number;                   // ✅ REQUIRED - Provider ID
  preAuthorizationId?: number;          // ✅ Optional - Pre-auth reference
  claimType: 'INPATIENT' | 'OUTPATIENT' | 'EMERGENCY';  // ✅ REQUIRED
  serviceDate: string;                  // ✅ REQUIRED - ISO 8601 date
  admissionDate?: string;               // ✅ Optional - For inpatient
  dischargeDate?: string;               // ✅ Optional - For inpatient
  diagnosisCode: string;                // ✅ REQUIRED - ICD-10
  notes?: string;                       // ✅ Optional
  
  claimLines: ClaimLineRequest[];       // ✅ REQUIRED - At least 1 line
  
  // ❌ FORBIDDEN FIELDS (backend calculates):
  // requestedAmount, approvedAmount, deductions, totalAmount, 
  // netProviderAmount, patientCoPay
}

interface ClaimLineRequest {
  medicalServiceId: number;             // ✅ REQUIRED
  quantity: number;                     // ✅ REQUIRED - e.g., 2 (X-rays)
  unitPrice: number;                    // ✅ REQUIRED - Provider's price
  notes?: string;                       // ✅ Optional
  
  // ❌ FORBIDDEN FIELDS:
  // lineTotal (calculated: quantity × unitPrice)
  // approvedAmount, deductions
}
```

**Update Claim**
```typescript
// PUT /api/v1/claims/{id}
interface UpdateClaimRequest {
  diagnosisCode?: string;               // ✅ Allowed
  notes?: string;                       // ✅ Allowed
  claimLines?: ClaimLineRequest[];      // ✅ Allowed - Replace all lines
  
  // ❌ FORBIDDEN FIELDS:
  // status, visitId, memberId, providerId, 
  // requestedAmount, approvedAmount, totalAmount
}
```

**Approve Claim** 🔒 CRITICAL
```typescript
// POST /api/v1/claims/{id}/approve
interface ApproveClaimRequest {
  notes?: string;                       // ✅ Optional approval notes
  useSystemCalculation?: boolean;       // ✅ Optional - Default: true
  
  // ❌ FORBIDDEN FIELDS (backend calculates ALL):
  // approvedAmount - from CostBreakdownEngine
  // coveredAmount - from benefit policy
  // deductions - policy-based
  // totalAmount - calculated
  // netProviderAmount - calculated
  // patientCoPay - calculated
}
```

**Reject Claim**
```typescript
// POST /api/v1/claims/{id}/reject
interface RejectClaimRequest {
  rejectionReason: string;              // ✅ REQUIRED (min 10 chars)
}
```

**Return Claim for Information**
```typescript
// POST /api/v1/claims/{id}/return-for-info
interface ReturnForInfoClaimRequest {
  returnReason: string;                 // ✅ REQUIRED (min 10 chars)
  requiredInformation: string;          // ✅ REQUIRED - What's missing
}
```

---

#### 1.4 Response Interfaces

**Claim Response**
```typescript
// Returned from all GET/POST/PUT endpoints
interface ClaimResponse {
  // Identity
  id: number;                           // READ-ONLY
  referenceNumber: string;              // READ-ONLY - e.g., "CLM-2026-00456"
  
  // Status
  status: 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_INFO' | 'SETTLED';  // READ-ONLY
  
  // Request Details
  visitId: number;                      // READ-ONLY
  memberId: number;                     // READ-ONLY
  memberName: string;                   // READ-ONLY
  memberPolicyNumber: string;           // READ-ONLY
  providerId: number;                   // READ-ONLY
  providerName: string;                 // READ-ONLY
  preAuthorizationId?: number;          // READ-ONLY
  preAuthorizationReference?: string;   // READ-ONLY
  claimType: string;                    // READ-ONLY
  serviceDate: string;                  // READ-ONLY
  diagnosisCode: string;                // READ-ONLY
  diagnosisDescription?: string;        // READ-ONLY
  notes?: string;                       // READ-ONLY
  
  // 💰 FINANCIAL FIELDS (ALL READ-ONLY - BACKEND CALCULATED)
  requestedAmount: number;              // READ-ONLY - Sum of all line items (qty × unitPrice)
  approvedAmount: number;               // READ-ONLY - Calculated by CostBreakdownEngine
  coveredAmount: number;                // READ-ONLY - What insurance covers
  deductions: number;                   // READ-ONLY - Policy-based deductions
  totalAmount: number;                  // READ-ONLY - Final amount
  netProviderAmount: number;            // READ-ONLY - What provider receives
  patientCoPay: number;                 // READ-ONLY - What patient pays
  
  // Cost Breakdown (READ-ONLY)
  costBreakdown?: {
    subtotal: number;                   // READ-ONLY
    policyDeduction: number;            // READ-ONLY
    copayAmount: number;                // READ-ONLY
    additionalCharges: number;          // READ-ONLY
    finalAmount: number;                // READ-ONLY
  };
  
  // Claim Lines (READ-ONLY)
  claimLines: ClaimLineResponse[];      // READ-ONLY
  
  // Business Flags (READ-ONLY)
  hasPreAuth: boolean;                  // READ-ONLY
  isPreAuthValid: boolean;              // READ-ONLY
  canBeApproved: boolean;               // READ-ONLY
  requiresReview: boolean;              // READ-ONLY
  
  // Workflow Tracking
  createdBy: string;                    // READ-ONLY
  createdAt: string;                    // READ-ONLY
  approvedBy?: string;                  // READ-ONLY
  approvedAt?: string;                  // READ-ONLY
  approvalNotes?: string;               // READ-ONLY
  rejectedBy?: string;                  // READ-ONLY
  rejectedAt?: string;                  // READ-ONLY
  rejectionReason?: string;             // READ-ONLY
}

interface ClaimLineResponse {
  id: number;                           // READ-ONLY
  medicalServiceId: number;             // READ-ONLY
  serviceCode: string;                  // READ-ONLY
  serviceName: string;                  // READ-ONLY
  quantity: number;                     // READ-ONLY
  unitPrice: number;                    // READ-ONLY
  lineTotal: number;                    // READ-ONLY - quantity × unitPrice
  approvedAmount?: number;              // READ-ONLY - Backend calculated
  deductions?: number;                  // READ-ONLY
  notes?: string;                       // READ-ONLY
}
```

**Claim List Response**
```typescript
// Returned from GET /api/v1/claims (paginated)
interface ClaimListResponse {
  items: ClaimResponse[];               // READ-ONLY
  total: number;                        // READ-ONLY
  page: number;                         // READ-ONLY
  size: number;                         // READ-ONLY
  totalPages: number;                   // READ-ONLY
  hasNext: boolean;                     // READ-ONLY
  hasPrevious: boolean;                 // READ-ONLY
}
```

---

## Phase 2: UI Actions Mapping

### Pre-Authorization Module

| Screen | Action | Frontend Behavior | Backend Endpoint | Fields |
|--------|--------|------------------|------------------|--------|
| **List Screen** | View all pre-auths | Display paginated list, filter by status | GET /api/v1/pre-authorizations | Query: page, size, sortBy, sortDirection |
| **Inbox - Pending** | View pending queue | Display PENDING pre-auths (FIFO) | GET /api/v1/pre-authorizations/inbox/pending | Query: page, size |
| **Details Screen** | View single pre-auth | Display all fields (READ-ONLY) | GET /api/v1/pre-authorizations/{id} | None |
| **Create Form** | Create new pre-auth | Collect: visitId, medicalServiceId, notes | POST /api/v1/pre-authorizations | Body: CreatePreAuthorizationRequest |
| **Edit Form** | Update metadata | Collect: priority, diagnosisCode, notes | PUT /api/v1/pre-authorizations/{id} | Body: UpdatePreAuthorizationRequest |
| **Approve Modal** | Approve pre-auth | Collect: approvalNotes ONLY | POST /api/v1/pre-authorizations/{id}/approve | Body: ApprovePreAuthorizationRequest |
| **Reject Modal** | Reject pre-auth | Collect: rejectionReason (required, 10-500 chars) | POST /api/v1/pre-authorizations/{id}/reject | Body: RejectPreAuthorizationRequest |
| **Cancel Action** | Cancel pre-auth | Confirm cancellation, optional reason | POST /api/v1/pre-authorizations/{id}/cancel | Query: reason |

#### Pre-Authorization Details Screen — Field Display Rules

**Always Display (READ-ONLY)**:
- Reference Number
- Status (with color badge: PENDING=yellow, APPROVED=green, REJECTED=red, EXPIRED=gray)
- Member Name + Policy Number
- Provider Name
- Medical Service Name
- Created Date/By

**Display Only If APPROVED**:
- ✅ Approved Amount (label: "Authorized Amount")
- ✅ Copay Percentage (label: "Patient Copay %")
- ✅ Copay Amount (label: "Patient Pays")
- ✅ Insurance Covered Amount (label: "Insurance Covers")
- ✅ Expiry Date (with warning if < 7 days remaining)

**Never Display Input Fields For**:
- ❌ Approved Amount (backend calculated)
- ❌ Copay Percentage (backend calculated)
- ❌ Status (workflow-controlled)

---

### Claims Module

| Screen | Action | Frontend Behavior | Backend Endpoint | Fields |
|--------|--------|------------------|------------------|--------|
| **List Screen** | View all claims | Display paginated list, filter by status | GET /api/v1/claims | Query: page, size, sortBy, sortDirection |
| **Inbox - Pending** | View pending queue | Display PENDING claims (FIFO) | GET /api/v1/claims/inbox/pending | Query: page, size |
| **Inbox - Returned** | View returned claims | Display RETURNED_FOR_INFO claims | GET /api/v1/claims/inbox/returned | Query: page, size |
| **Details Screen** | View single claim | Display all fields + cost breakdown (READ-ONLY) | GET /api/v1/claims/{id} | None |
| **Create Form** | Create new claim | Collect: visitId, memberId, providerId, serviceDate, diagnosisCode, claimLines | POST /api/v1/claims | Body: CreateClaimRequest |
| **Edit Form** | Update claim | Collect: diagnosisCode, notes, claimLines | PUT /api/v1/claims/{id} | Body: UpdateClaimRequest |
| **Approve Modal** | Approve claim | Collect: notes, useSystemCalculation | POST /api/v1/claims/{id}/approve | Body: ApproveClaimRequest |
| **Reject Modal** | Reject claim | Collect: rejectionReason (required, min 10 chars) | POST /api/v1/claims/{id}/reject | Body: RejectClaimRequest |
| **Return Modal** | Return for info | Collect: returnReason, requiredInformation | POST /api/v1/claims/{id}/return-for-info | Body: ReturnForInfoClaimRequest |
| **History Tab** | View audit log | Display status change history (READ-ONLY) | GET /api/v1/claims/{id}/history | None |

#### Claims Details Screen — Field Display Rules

**Always Display (READ-ONLY)**:
- Reference Number
- Status (with color badge)
- Member Name + Policy Number
- Provider Name
- Service Date
- Diagnosis Code + Description
- Pre-Auth Reference (if exists, with link)

**Financial Summary Section (READ-ONLY)**:
- ✅ Requested Amount (sum of claim lines)
- ✅ Approved Amount (backend calculated)
- ✅ Covered Amount (insurance pays)
- ✅ Deductions (policy-based)
- ✅ Total Amount (final)
- ✅ Net Provider Amount (provider receives)
- ✅ Patient Copay (patient pays)

**Claim Lines Table (READ-ONLY)**:
- Service Name, Quantity, Unit Price
- Line Total = Quantity × Unit Price
- Approved Amount (if claim approved)

**Never Display Input Fields For**:
- ❌ Approved Amount (backend calculated)
- ❌ Total Amount (backend calculated)
- ❌ Net Provider Amount (backend calculated)
- ❌ Patient Copay (backend calculated)

---

## Phase 3: Frontend Rules (STRICT)

### Rule 1: API Versioning — MANDATORY

✅ **DO**: Use API v1 endpoints exclusively
```typescript
const API_BASE = '/api/v1';  // ✅ CORRECT

// Pre-Authorization
await axios.get(`${API_BASE}/pre-authorizations/${id}`);
await axios.post(`${API_BASE}/pre-authorizations/${id}/approve`, { approvalNotes });

// Claims
await axios.get(`${API_BASE}/claims/${id}`);
await axios.post(`${API_BASE}/claims/${id}/approve`, { notes, useSystemCalculation: true });
```

❌ **DO NOT**: Use legacy unversioned endpoints
```typescript
const API_BASE = '/api';  // ❌ WRONG - Unversioned

await axios.get('/api/pre-authorizations/${id}');  // ❌ WRONG
await axios.get('/api/claims/${id}');              // ❌ WRONG
```

---

### Rule 2: Read-Only Financial Fields — MANDATORY

✅ **DO**: Display financial values from backend response
```typescript
// Pre-Authorization approval success
const response = await approvePreAuth(id, notes);
const { approvedAmount, copayAmount, copayPercentage } = response.data;

// Display (READ-ONLY)
<div>Approved Amount: {formatCurrency(approvedAmount)}</div>
<div>Patient Copay ({copayPercentage}%): {formatCurrency(copayAmount)}</div>
```

❌ **DO NOT**: Create input fields for financial values
```tsx
{/* ❌ WRONG - Do not allow editing */}
<input name="approvedAmount" value={approvedAmount} onChange={...} />
<input name="copayPercentage" value={copayPercentage} onChange={...} />
```

---

### Rule 3: No Client-Side Financial Calculations — MANDATORY

✅ **DO**: Use backend-calculated values
```typescript
// Display backend values
<div>Insurance Covers: {response.insuranceCoveredAmount}</div>
<div>Patient Pays: {response.copayAmount}</div>
```

❌ **DO NOT**: Calculate financial values in frontend
```typescript
// ❌ WRONG - Backend already calculated this
const copayAmount = approvedAmount * (copayPercentage / 100);
const insuranceCovered = approvedAmount - copayAmount;
```

---

### Rule 4: Approval/Rejection Actions — MANDATORY

✅ **DO**: Send only allowed fields
```typescript
// Pre-Authorization Approval
async function approvePreAuth(id: number, notes?: string) {
  return axios.post(`/api/v1/pre-authorizations/${id}/approve`, {
    approvalNotes: notes  // ✅ ONLY ALLOWED FIELD
  });
}

// Claim Approval
async function approveClaim(id: number, notes?: string) {
  return axios.post(`/api/v1/claims/${id}/approve`, {
    notes,                          // ✅ Optional
    useSystemCalculation: true      // ✅ Optional
  });
}
```

❌ **DO NOT**: Send forbidden fields
```typescript
// ❌ WRONG - Backend will reject (400 Bad Request)
await axios.post(`/api/v1/pre-authorizations/${id}/approve`, {
  approvalNotes: notes,
  approvedAmount: 1500,        // ❌ FORBIDDEN
  copayPercentage: 20          // ❌ FORBIDDEN
});
```

---

### Rule 5: Error Handling — MANDATORY

✅ **DO**: Handle validation errors gracefully
```typescript
try {
  await approvePreAuth(id, notes);
  showSuccess('Pre-authorization approved successfully');
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error (e.g., forbidden field sent)
    showError(error.response.data.message);
  } else if (error.response?.status === 404) {
    // Pre-authorization not found
    showError('Pre-authorization not found');
  } else if (error.response?.status === 409) {
    // Business rule violation (e.g., already approved)
    showError(error.response.data.message);
  } else {
    showError('An unexpected error occurred');
  }
}
```

---

### Rule 6: No Legacy Endpoint Fallback — MANDATORY

✅ **DO**: Fail gracefully if v1 endpoint unavailable
```typescript
try {
  return await axios.get(`/api/v1/claims/${id}`);
} catch (error) {
  if (error.response?.status === 404) {
    throw new Error('Claim not found');
  }
  throw error;  // Don't fallback to /api/claims/{id}
}
```

❌ **DO NOT**: Fallback to unversioned endpoints
```typescript
// ❌ WRONG - Violates contract-first principle
try {
  return await axios.get(`/api/v1/claims/${id}`);
} catch (error) {
  // ❌ DO NOT DO THIS
  return await axios.get(`/api/claims/${id}`);  // Legacy endpoint
}
```

---

### Rule 7: Claim Lines Creation — SPECIAL HANDLING

✅ **DO**: Send only allowed fields for claim lines
```typescript
// Create claim with lines
const createClaimRequest: CreateClaimRequest = {
  visitId: 123,
  memberId: 456,
  providerId: 789,
  claimType: 'OUTPATIENT',
  serviceDate: '2026-02-01',
  diagnosisCode: 'A01.0',
  claimLines: [
    {
      medicalServiceId: 101,
      quantity: 2,           // ✅ User enters
      unitPrice: 500.00,     // ✅ User enters (provider's price)
      notes: 'X-ray (AP and lateral)'
    },
    {
      medicalServiceId: 102,
      quantity: 1,
      unitPrice: 150.00,
      notes: 'Consultation'
    }
  ]
};

// Backend calculates:
// - lineTotal (quantity × unitPrice)
// - requestedAmount (sum of all lineTotal)
// - approvedAmount (via CostBreakdownEngine)
```

❌ **DO NOT**: Send pre-calculated totals
```typescript
// ❌ WRONG - Backend calculates these
claimLines: [
  {
    medicalServiceId: 101,
    quantity: 2,
    unitPrice: 500.00,
    lineTotal: 1000.00,        // ❌ Backend calculates
    approvedAmount: 900.00     // ❌ Backend calculates
  }
]
```

---

## Phase 4: Closure Checklist

### Backend Verification ✅ COMPLETE

- [x] Claims module API v1 contracts implemented (9 files, 1,191 lines)
- [x] Pre-Authorization module API v1 contracts implemented (7 files, 900+ lines)
- [x] Both modules compiled successfully (0 errors)
- [x] Forbidden fields excluded from request contracts (compile-time safety)
- [x] Backend services calculate all financial/decision values
- [x] Mapper layer enforces field restrictions
- [x] Comprehensive documentation provided (2,500+ lines)

---

### Frontend Implementation Checklist

#### Code Changes Required

**1. API Client Updates**
- [ ] Update API base URL to `/api/v1` for both modules
- [ ] Create TypeScript interfaces from Phase 1 (copy contracts exactly)
- [ ] Update all API calls to use v1 endpoints
- [ ] Remove legacy endpoint references

**2. Pre-Authorization UI Updates**
- [ ] **List Screen**: Update to fetch from `/api/v1/pre-authorizations`
- [ ] **Details Screen**: Display all financial fields as READ-ONLY
- [ ] **Approval Form**: Remove ALL input fields except `approvalNotes` textarea
- [ ] **Rejection Form**: Ensure `rejectionReason` is required (10-500 chars)
- [ ] **Create Form**: Use `visitId` + `medicalServiceId` (not `memberId`)
- [ ] Remove any client-side copay calculations

**3. Claims UI Updates**
- [ ] **List Screen**: Update to fetch from `/api/v1/claims`
- [ ] **Details Screen**: Display cost breakdown as READ-ONLY
- [ ] **Approval Form**: Remove ALL amount input fields, keep only `notes` + `useSystemCalculation` checkbox
- [ ] **Create Form**: Ensure `claimLines` only send `medicalServiceId`, `quantity`, `unitPrice`, `notes`
- [ ] Remove any client-side total/deduction calculations
- [ ] Update history tab to fetch from `/api/v1/claims/{id}/history`

**4. Validation Updates**
- [ ] Add frontend validation for rejection reason length (10-500 chars)
- [ ] Add frontend validation for approval notes max length (1000 chars)
- [ ] Add frontend validation for claim line quantity (positive numbers)
- [ ] Remove validation for forbidden fields (they shouldn't exist in forms)

**5. Error Handling**
- [ ] Add handlers for 400 (validation errors)
- [ ] Add handlers for 404 (not found)
- [ ] Add handlers for 409 (business rule violations)
- [ ] Display backend error messages to users

---

#### Testing Checklist

**Pre-Authorization Module**
- [ ] Create pre-auth: Verify backend calculates `contractPrice` (if contract exists)
- [ ] Approve pre-auth: Verify backend returns `approvedAmount`, `copayPercentage`, `copayAmount`
- [ ] Approve pre-auth: Verify sending `approvedAmount` in request results in 400 error
- [ ] Reject pre-auth: Verify `rejectionReason` is required
- [ ] View details: Verify all financial fields displayed as READ-ONLY
- [ ] Check expiry: Verify expiry date is 30 days from approval

**Claims Module**
- [ ] Create claim: Verify backend calculates `requestedAmount` from claim lines
- [ ] Approve claim: Verify backend returns cost breakdown with all amounts
- [ ] Approve claim: Verify sending `approvedAmount` in request results in 400 error
- [ ] Reject claim: Verify `rejectionReason` is required (min 10 chars)
- [ ] View details: Verify cost breakdown displayed correctly
- [ ] Claim with pre-auth: Verify pre-auth reference displayed (if exists)

**Edge Cases**
- [ ] Pre-auth without contract: Verify error message shown
- [ ] Claim without pre-auth: Verify claim can still be created
- [ ] Expired pre-auth: Verify `isValid` flag is false
- [ ] Duplicate approval: Verify 409 error (already approved)

---

#### Deployment Checklist

**Pre-Deployment**
- [ ] All TypeScript interfaces created and type-checked
- [ ] All legacy endpoint references removed
- [ ] All forbidden fields removed from forms
- [ ] No client-side financial calculations present
- [ ] Error handling implemented for 400/404/409 responses

**Post-Deployment**
- [ ] Monitor API error logs for 400 errors (indicates frontend sending forbidden fields)
- [ ] Verify all approval amounts match backend calculations
- [ ] Verify no fallback to legacy endpoints occurring
- [ ] Confirm users see backend-calculated values in UI

---

### Sign-Off Criteria

**This integration is COMPLETE when**:

✅ **All API calls** use `/api/v1/` endpoints (no legacy endpoints)  
✅ **All forbidden fields** removed from UI (no amount inputs in approval forms)  
✅ **All financial values** displayed are backend-calculated (no client-side math)  
✅ **All TypeScript interfaces** match API contracts exactly  
✅ **Error handling** implemented for validation/business rule violations  
✅ **Testing** completed for both happy path and error scenarios  
✅ **No fallback logic** to unversioned APIs exists in codebase  

---

## Final Notes

### Backend is LOCKED — Do NOT Request Changes

The backend API contracts are **FINAL** and **LOCKED**. Any issues must be resolved on the frontend side by:
- Updating frontend logic to match API contracts
- Removing forbidden fields from UI
- Using backend-calculated values

**If you encounter issues**:
1. Check that request matches contract exactly (see Phase 1 interfaces)
2. Verify no forbidden fields are being sent
3. Ensure all required fields are provided
4. Check backend error message (it will specify the issue)

### Frontend Team Responsibilities

**You are responsible for**:
- Implementing TypeScript interfaces from Phase 1
- Updating UI to remove forbidden fields
- Displaying backend-calculated values as READ-ONLY
- Handling API errors gracefully
- Testing all workflows end-to-end

**You are NOT responsible for**:
- Calculating approval amounts
- Calculating copay percentages
- Validating business rules (backend handles this)
- Determining eligibility (backend handles this)

---

## Support & Resources

**Documentation**:
- [PRE_AUTH_MODULE_API_V1_IMPLEMENTATION_REPORT.md](PRE_AUTH_MODULE_API_V1_IMPLEMENTATION_REPORT.md) — Technical implementation details
- [CLAIMS_MODULE_API_V1_IMPLEMENTATION_REPORT.md](CLAIMS_MODULE_API_V1_IMPLEMENTATION_REPORT.md) — Technical implementation details
- [PRE_AUTHORIZATION_WORKFLOW_GUIDE.md](PRE_AUTHORIZATION_WORKFLOW_GUIDE.md) — Business workflow overview
- [API_V1_IMPLEMENTATION_PROGRESS.md](API_V1_IMPLEMENTATION_PROGRESS.md) — Overall project status

**API Endpoints Quick Reference**:

**Pre-Authorization**:
- GET /api/v1/pre-authorizations (list)
- GET /api/v1/pre-authorizations/{id} (details)
- POST /api/v1/pre-authorizations (create)
- PUT /api/v1/pre-authorizations/{id} (update)
- POST /api/v1/pre-authorizations/{id}/approve 🔒
- POST /api/v1/pre-authorizations/{id}/reject
- POST /api/v1/pre-authorizations/{id}/cancel

**Claims**:
- GET /api/v1/claims (list)
- GET /api/v1/claims/{id} (details)
- POST /api/v1/claims (create)
- PUT /api/v1/claims/{id} (update)
- POST /api/v1/claims/{id}/approve 🔒
- POST /api/v1/claims/{id}/reject
- POST /api/v1/claims/{id}/return-for-info
- GET /api/v1/claims/{id}/history

---

**Document Status**: ✅ FINAL — Ready for Frontend Implementation  
**Backend Status**: 🔒 LOCKED — No further changes  
**Next Step**: Frontend team implements UI updates per this guide  
**Target Completion**: Within 2 weeks from handoff

---

**End of Integration Guide**
