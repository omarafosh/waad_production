package com.waad.tba.modules.benefitpolicy.enums;

/**
 * ApplyOnType - defines the target of a coverage rule.
 */
public enum ApplyOnType {
    /** Rule applies to an entire medical category */
    CATEGORY,
    /** Rule applies to a specific medical service */
    SERVICE,
    /** Rule applies to a medical package */
    PACKAGE,
    /** Rule applies to an entire encounter type (global) */
    GENERAL
}
