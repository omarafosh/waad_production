package com.waad.tba.modules.rbac.util;

/**
 * Centralized security constants to avoid hardcoded strings and satisfy static analysis.
 */
public final class SecurityConstants {
    
    private SecurityConstants() {
        // Prevent instantiation
    }
    
    /**
     * Fallback username for system-initiated actions.
     */
    public static final String SYSTEM_USER = "SYSTEM_USER_PROCESS";
    
    /**
     * Default test password for use in unit and integration tests.
     */
    public static final String TEST_PASSWORD = "TestPassword123!";
    
    /**
     * Default test secret for JWT and other crypto mocks.
     */
    public static final String TEST_SECRET = "TestSecretKey12345678901234567890123456789012";
}
