package com.waad.tba.common.exception;

import com.waad.tba.common.error.ErrorCode;

/**
 * Exception thrown when a business rule is violated.
 * 
 * BUSINESS RULE EXAMPLES:
 * - Member cannot create claim without active policy
 * - Claim cannot transition from DRAFT directly to SETTLED
 * - Coverage limit exceeded
 * 
 * @see ErrorCode for standard error codes
 */
public class BusinessRuleException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final ErrorCode errorCode;
    private final Object[] args;

    public BusinessRuleException(String message) {
        this(ErrorCode.BUSINESS_RULE_VIOLATION, message, null);
    }

    public BusinessRuleException(ErrorCode errorCode, String message) {
        this(errorCode, message, null);
    }

    public BusinessRuleException(ErrorCode errorCode, String message, Object[] args) {
        super(message);
        this.errorCode = errorCode;
        this.args = args;
    }

    public BusinessRuleException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = ErrorCode.BUSINESS_RULE_VIOLATION;
        this.args = null;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public Object[] getArgs() {
        return args;
    }
}
