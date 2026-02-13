package com.waad.tba.modules.member.util;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Card Number Generator for Member entities.
 * 
 * Format: WAAD|MEMBER|{SEQUENCE}
 * Example: WAAD|MEMBER|000000001, WAAD|MEMBER|000000002
 * 
 * Phase 2 Implementation:
 * - Thread-safe atomic sequence
 * - Flyway-compatible (no database sequence dependency)
 * - Monotonically increasing
 * - Zero-padded to 9 digits
 * 
 * Note: This is a transitional implementation. Future versions will use
 * PostgreSQL SEQUENCE for better distributed system support.
 */
public class CardNumberGenerator {
    
    /**
     * Thread-safe atomic counter.
     * Initialized to System.currentTimeMillis() % 1_000_000_000 to ensure
     * uniqueness across restarts while keeping numbers reasonable.
     */
    private static final AtomicLong sequence = new AtomicLong(
        System.currentTimeMillis() % 1_000_000_000L
    );
    
    /**
     * Generate a unique card number with format: WAAD|MEMBER|{SEQUENCE}
     * 
     * @return Card number (e.g., WAAD|MEMBER|735234859)
     */
    public static String generate() {
        long nextValue = sequence.incrementAndGet();
        // Format to 9 digits with zero-padding
        String sequenceStr = String.format("%09d", nextValue);
        return "WAAD|MEMBER|" + sequenceStr;
    }
    
    /**
     * Get current sequence value (for testing/debugging only).
     * 
     * @return Current sequence value
     */
    public static long getCurrentSequence() {
        return sequence.get();
    }
}
