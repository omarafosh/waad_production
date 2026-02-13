package com.waad.tba.security.rbac;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to restrict access to SUPER_ADMIN only.
 * 
 * Use this annotation on methods or classes that should only be
 * accessible by SUPER_ADMIN users.
 * 
 * Example usage:
 * <pre>
 * {@code @SuperAdminOnly}
 * public void deleteSystemRole(Long roleId) {
 *     // Only SUPER_ADMIN can execute this
 * }
 * </pre>
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface SuperAdminOnly {
    
    /**
     * Optional message to display when access is denied.
     */
    String message() default "This operation requires SUPER_ADMIN privileges";
}
