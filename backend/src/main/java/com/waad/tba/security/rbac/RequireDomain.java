package com.waad.tba.security.rbac;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to require access to specific permission domains.
 * 
 * Use this annotation on methods or classes that should only be
 * accessible by users with access to the specified domains.
 * 
 * Example usage:
 * <pre>
 * {@code @RequireDomain(PermissionDomain.RBAC)}
 * public void modifyRole(Long roleId) {
 *     // Only users with RBAC domain access can execute this
 * }
 * </pre>
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireDomain {
    
    /**
     * The required permission domain(s).
     * User must have access to ALL specified domains.
     */
    PermissionDomain[] value();
    
    /**
     * Optional message to display when access is denied.
     */
    String message() default "Access to required domain denied";
}
