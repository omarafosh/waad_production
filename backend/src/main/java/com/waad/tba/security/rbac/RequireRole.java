package com.waad.tba.security.rbac;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to require a minimum role level for access.
 * 
 * Use this annotation on methods or classes that should only be
 * accessible by users with the specified role or higher.
 * 
 * Example usage:
 * <pre>
 * {@code @RequireRole(SystemRole.INSURANCE_ADMIN)}
 * public void manageUsers() {
 *     // Only INSURANCE_ADMIN or SUPER_ADMIN can execute this
 * }
 * </pre>
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRole {
    
    /**
     * The minimum required role.
     * Users with this role or higher privilege can access.
     */
    SystemRole value();
    
    /**
     * Optional message to display when access is denied.
     */
    String message() default "Insufficient privileges for this operation";
}
