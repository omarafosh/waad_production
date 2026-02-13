# Comprehensive Testing Design: Eligibility, Pricing & Claims

This document outlines the testing strategy and step-by-step scenarios for validating the core insurance engine of the TBA WAAD System.

## 1. 🔍 Eligibility Verification Scenarios
Eligibility is the gateway. We must test both "Positive" (should pass) and "Negative" (should fail) cases.

### Test Cases
| Scenario ID | Case Description | Expected Result | Reason Code |
|:---|:---|:---|:---|
| ELIG-01 | Active Member + Active Policy + Valid Date | ✅ ELIGIBLE | N/A |
| ELIG-02 | Terminated/Inactive Member | ❌ NOT ELIGIBLE | MEMBER_INACTIVE |
| ELIG-03 | Service date before Policy Start Date | ❌ NOT ELIGIBLE | SERVICE_DATE_BEFORE_COVERAGE |
| ELIG-04 | Service date after Policy End Date | ❌ NOT ELIGIBLE | POLICY_EXPIRED |
| ELIG-05 | Annual Limit Exceeded ($10,000 limit, $11,000 spent) | ❌ NOT ELIGIBLE | COVERAGE_LIMIT_EXHAUSTED |
| ELIG-06 | Member in Waiting Period (Enrollment + 30 days) | ❌ NOT ELIGIBLE | WAITING_PERIOD_NOT_SATISFIED |

---

## 2. 💰 Pricing & Service Mapping Scenarios
Ensures that the price billed by the provider matches the contract negotiated by the TPA.

### Test Cases
| Scenario ID | Case Description | Validation Logic |
|:---|:---|:---|
| PRICE-01 | Service Code "CONS-01" Mapping | Verify Provider Price vs Master Catalog Price. |
| PRICE-02 | Contract Pricing vs Standard Price | Ensure the engine picks the `ProviderContract` rate first. |
| PRICE-03 | Unmapped Service Handling | Verify claim goes to "MAPPING_REQUIRED" status if service is unknown. |

---

## 3. 📝 Claim Lifecycle & Cost Breakdown
Tests the financial calculation (Deductible, Co-pay, Net Amount).

### Calculation Logic
- **Total Amount**: The base service price.
- **Deductible**: Fixed amount paid by member (e.g., 50 SAR).
- **Co-pay**: Percentage of remaining amount (e.g., 20%).
- **Insurance Covered**: Remaining amount.

| Scenario ID | Input: Total 1000 SAR, Ded 100, Co-pay 10% | Expected Result |
|:---|:---|:---|
| CLAIM-01 | Initial Submission | Draft status, calculations previewed. |
| CLAIM-02 | Cost Breakdown Verification | Member Pays: 100 + (900 * 0.1) = 190 SAR. TPA Pays: 810 SAR. |
| CLAIM-03 | Status Transition | Draft ⏩ Submitted ⏩ Approved ⏩ Settled. |

---

## 🛠️ How to Execute: Step-by-Step Guide

### Step 1: Create Test Data
- Create an **Employer Organization**.
- Create a **Benefit Policy** (Configure annual limit, waiting period, deductible).
- Register a **Member** and link them to the policy.
- Create a **Provider** and a **Provider Contract** with specific prices for services (e.g., CPT codes).

### Step 2: Run Eligibility Check
- Use the **Eligibility** screen or API (`POST /api/eligibility/check`).
- Input the `memberId`, `serviceDate`, and `providerId`.
- **Observation**: Check if it returns "Eligible" in green.

### Step 3: Register a Visit & Create Claim
- Go to the **Provider Portal** or **Claims** list.
- Create a new claim using the `memberId`.
- Select a service (e.g., "General Consultation").
- **Observation**: The system should automatically pull the price from the provider's contract.

### Step 4: Verify Financials
- Click on "**Cost Breakdown**" in the claim view.
- Verify that the Deductible and Co-pay match the Benefit Policy rules.
- **Example**: If policy says 20% co-pay, a 1000 SAR service should show 200 SAR member share.

### Step 5: Process through Lifecycle
- **Submit**: As a provider, click "Submit".
- **Review**: As a TPA auditor, open the claim and click "Approve".
- **Settle**: As a finance user, mark the claim as "Settled" once payment is processed.
