package com.waad.tba.common.lifecycle;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.Set;

/**
 * Centalized State Machine for Lifecycle transitions.
 * Defines which status transitions are allowed globally.
 */
@Component
public class LifecycleStateMachine {

    // Transition Map: From Status -> Set of Allowed To Statuses
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
        "DRAFT",      Set.of("ACTIVE", "CANCELLED"),
        "ACTIVE",     Set.of("SUSPENDED", "TERMINATED"),
        "SUSPENDED",  Set.of("ACTIVE", "TERMINATED"),
        "TERMINATED", Set.of("ARCHIVED", "DRAFT"),
        "CANCELLED",  Set.of("ARCHIVED", "DRAFT"),
        "ARCHIVED",   Set.of("DRAFT")  // Allow restore from archive too
    );

    /**
     * Checks if a transition from one status to another is valid.
     * 
     * @param from Current status
     * @param to Target status
     * @return true if transition is allowed, false otherwise
     */
    public boolean isTransitionAllowed(String from, String to) {
        if (from == null || to == null) return false;
        if (from.equals(to)) return false; // Redundant
        
        return TRANSITIONS.getOrDefault(from.toUpperCase(), Set.of())
                .contains(to.toUpperCase());
    }

    /**
     * Gets all valid next statuses for a given current status.
     * 
     * @param currentStatus Current status
     * @return Set of allowed next statuses
     */
    public Set<String> getAllowedNextStatuses(String currentStatus) {
        if (currentStatus == null) return Set.of();
        return TRANSITIONS.getOrDefault(currentStatus.toUpperCase(), Set.of());
    }
}
