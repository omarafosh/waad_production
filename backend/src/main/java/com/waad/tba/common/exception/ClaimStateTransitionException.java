package com.waad.tba.common.exception;

import com.waad.tba.common.error.ErrorCode;

/**
 * Exception thrown when an illegal claim state transition is attempted.
 * 
 * VALID TRANSITIONS:
 * DRAFT → SUBMITTED (by EMPLOYER, INSURANCE)
 * SUBMITTED → UNDER_REVIEW (by INSURANCE, REVIEWER)
 * UNDER_REVIEW → APPROVED (by INSURANCE, REVIEWER)
 * UNDER_REVIEW → REJECTED (by INSURANCE, REVIEWER)
 * UNDER_REVIEW → RETURNED_FOR_INFO (by REVIEWER)
 * RETURNED_FOR_INFO → SUBMITTED (by EMPLOYER, INSURANCE)
 * APPROVED → SETTLED (by INSURANCE)
 * 
 * INVALID TRANSITIONS (examples):
 * DRAFT → APPROVED (must go through SUBMITTED and UNDER_REVIEW)
 * SETTLED → DRAFT (terminal state)
 * REJECTED → APPROVED (terminal state)
 * 
 * SMOKE TEST:
 * Given: Claim C001 is in DRAFT status
 * When: User tries to change status to APPROVED
 * Then: ClaimStateTransitionException with message
 * "Invalid state transition: DRAFT → APPROVED. Must submit claim first."
 */
public class ClaimStateTransitionException extends BusinessRuleException {
    private static final long serialVersionUID = 1L;

    private final String fromStatus;
    private final String toStatus;
    private final String requiredRole;

    public ClaimStateTransitionException(String message) {
        super(ErrorCode.INVALID_CLAIM_TRANSITION, message);
        this.fromStatus = null;
        this.toStatus = null;
        this.requiredRole = null;
    }

    public ClaimStateTransitionException(String fromStatus, String toStatus) {
        super(ErrorCode.INVALID_CLAIM_TRANSITION, "claim.transition.invalid", new Object[] { fromStatus, toStatus });
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.requiredRole = null;
    }

    public ClaimStateTransitionException(String fromStatus, String toStatus, String requiredRole) {
        super(ErrorCode.INVALID_CLAIM_TRANSITION, "claim.transition.role.required", new Object[] { requiredRole });
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.requiredRole = requiredRole;
    }

    public String getFromStatus() {
        return fromStatus;
    }

    public String getToStatus() {
        return toStatus;
    }

    public String getRequiredRole() {
        return requiredRole;
    }
}
