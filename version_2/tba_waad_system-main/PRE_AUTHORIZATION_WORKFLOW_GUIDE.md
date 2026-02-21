# Pre-Authorization Workflow Guide

**Document Type**: Executive Business Overview  
**Audience**: Product Managers, Business Analysts, Operations Teams  
**Last Updated**: February 1, 2026

---

## 1. Purpose of Pre-Authorization

### What is a Pre-Authorization?

A **Pre-Authorization** is a formal approval obtained **before** a medical service is delivered. It confirms:

- **Eligibility**: The member is covered under their policy
- **Coverage**: The service is included in their benefit plan
- **Financial Terms**: How much the insurance will cover and what the patient pays

### What Problem Does It Solve?

**Without Pre-Authorization**:
- Providers deliver services that may not be covered
- Patients face unexpected out-of-pocket costs
- Claims get rejected after treatment (too late to change course)

**With Pre-Authorization**:
- Provider knows in advance what is covered
- Patient knows their expected copay before treatment
- Claims process faster (already pre-approved)
- Financial disputes are minimized

---

## 2. Workflow Overview

### Step 1: Request (Creation)

**Who**: Provider's office staff or insurance coordinator  
**When**: Before the medical service is provided  
**Input Required**:
- Which member needs the service
- Which medical service they need (e.g., MRI, surgery, specialist consultation)
- Which visit/appointment this is linked to

**System Actions**:
- Checks if member is active and eligible
- Verifies the service is covered under their benefit plan
- Looks up any existing provider contract for pricing
- Creates pre-authorization with status: **PENDING**

**Important**: The requestor does **NOT** specify approval amounts or copay percentages. These are calculated by the system.

---

### Step 2: Review

**Who**: Insurance operations team (medical reviewer or claims adjuster)  
**When**: Pre-authorization enters the operations queue  
**Review Criteria**:
- **Medical Necessity**: Is the service medically justified?
- **Policy Coverage**: Is the service included in the member's plan?
- **Contract Pricing**: Does a valid provider contract exist?
- **Eligibility**: Is the member currently active?

**Status Transitions**:
- PENDING → UNDER_REVIEW (when reviewer starts evaluation)

---

### Step 3: Decision

#### Option A: Approval

**Who**: Authorized insurance staff with approval permissions  
**Input**: Only approval notes (optional explanation)  

**System Automatically Calculates**:
- **Approved Amount**: Retrieved from provider contract pricing (if contract exists)
- **Copay Percentage**: Retrieved from member's benefit policy
- **Copay Amount**: Calculated as `Approved Amount × Copay % ÷ 100`
- **Insurance Coverage**: Calculated as `Approved Amount - Copay Amount`
- **Expiry Date**: Typically 30 days from approval date

**Status**: PENDING/UNDER_REVIEW → **APPROVED**

**Authorization Reference Number**: Generated (e.g., PA-2026-00123)

**Notification**: Provider and member are notified of approval

**Important**: The approver does **NOT** enter amounts manually. All financial values are policy-driven and contract-based.

---

#### Option B: Rejection

**Who**: Authorized insurance staff  
**Input**: Mandatory rejection reason (10-500 characters)  

**Common Rejection Reasons**:
- Service not covered under member's plan
- Medical necessity not demonstrated
- No valid provider contract
- Member not eligible at time of request

**Status**: PENDING/UNDER_REVIEW → **REJECTED**

**Notification**: Provider and member are notified with rejection reason

---

### Step 4: Outcome

#### If Approved:

**Provider Can**:
- Deliver the medical service with confidence
- Submit a claim referencing the pre-authorization

**Member Knows**:
- Expected copay amount before treatment
- Insurance will cover the approved portion

**Claim Submission**:
- Claim references the pre-authorization number
- Claim amounts are validated against pre-auth approved amounts
- Claim processes faster (already pre-approved)

---

#### If Rejected:

**Provider Cannot** submit a claim under insurance for that service

**Options**:
- Member pays full amount out-of-pocket
- Provider appeals the decision with additional documentation
- Member seeks the service from a different provider with a contract

---

## 3. Relationship with Claims

### How Claims Reference Pre-Authorizations

When a provider submits a **Claim** after delivering a service:

1. **Claim Creation** includes the pre-authorization reference number
2. **System Validates**:
   - Pre-authorization exists and is APPROVED
   - Pre-authorization is not expired
   - Pre-authorization is for the same member, provider, and service
3. **Claim Approval Amounts** are guided by pre-authorization amounts

---

### Why Claim Amounts May Differ from Pre-Auth

**Pre-Authorization** is an **estimate** based on:
- Standard service pricing
- Expected procedures

**Claim** reflects **actual** services delivered, which may include:
- Additional procedures performed
- Complications requiring extra care
- Multiple service codes (not just the pre-authorized one)

**Example**:
- **Pre-Auth Approved**: MRI scan - $1,200
- **Actual Claim**: MRI scan + contrast dye + radiologist consultation - $1,650

**Result**: Claim may require secondary review for the additional $450.

---

### Pre-Authorization is NOT a Guarantee

**Important**: A pre-authorization approves **estimated** coverage. Final claim amounts are determined during claim adjudication based on:
- Actual services rendered
- Medical records submitted
- Itemized billing codes

---

## 4. Key Business Rules

### What is Allowed

✅ **Multiple pre-authorizations** for the same member (different services)  
✅ **Updating metadata** before approval (priority, diagnosis code, notes)  
✅ **Cancelling** a pre-authorization if service is no longer needed  
✅ **Resubmitting** a rejected pre-authorization with corrected information  

---

### What is Forbidden

❌ **Approving without a provider contract** (system prevents this)  
❌ **Manually entering approval amounts** (system calculates from contract)  
❌ **Manually setting copay percentages** (system retrieves from benefit policy)  
❌ **Using expired pre-authorizations** for claim submission  
❌ **Changing service or member** after creation (must create new pre-auth)  

---

### Authorization Expiry

**Default**: 30 days from approval date  
**After Expiry**: Pre-authorization becomes invalid  
**Impact**: Provider must request a new pre-authorization if service not yet delivered  
**System Action**: Automated job marks expired pre-authorizations daily  

---

### Financial Authority

**All financial decisions are made by the system**, not by users:

| Field | Controlled By |
|-------|---------------|
| Approved Amount | Provider Contract pricing |
| Copay Percentage | Benefit Policy for member's plan |
| Copay Amount | Calculation: Approved × Copay% |
| Insurance Coverage | Calculation: Approved - Copay |
| Expiry Date | Policy rule (30 days default) |

**Why This Matters**: Prevents unauthorized approvals, ensures policy compliance, maintains financial integrity.

---

## 5. Summary

### Five Key Points

1. **Pre-Authorization is a promise, not a guarantee** — It estimates coverage before service delivery but final claim amounts may vary based on actual services rendered.

2. **All financial values are policy-driven** — Approval amounts come from provider contracts, copay percentages from benefit policies. Users cannot manually override these values.

3. **Pre-authorizations expire** — Default 30 days from approval. Expired authorizations cannot be used for claim submission.

4. **Pre-authorizations streamline claim processing** — Claims with valid pre-auths process faster because eligibility and coverage are already confirmed.

5. **Rejection is not permanent** — Rejected pre-authorizations can be resubmitted with corrected information or additional medical documentation to support medical necessity.

---

**End of Workflow Guide**

For technical implementation details, see:
- [PRE_AUTH_MODULE_API_V1_IMPLEMENTATION_REPORT.md](PRE_AUTH_MODULE_API_V1_IMPLEMENTATION_REPORT.md)
- [API_V1_IMPLEMENTATION_PROGRESS.md](API_V1_IMPLEMENTATION_PROGRESS.md)
