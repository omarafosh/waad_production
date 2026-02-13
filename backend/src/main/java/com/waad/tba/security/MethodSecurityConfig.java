package com.waad.tba.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Method Security Configuration for SUPER_ADMIN bypass.
 * 
 * This configuration registers a custom PermissionEvaluator and Expression Handler
 * that automatically grants SUPER_ADMIN full access to all protected endpoints.
 * 
 * CRITICAL BUSINESS RULE:
 * SUPER_ADMIN must NEVER be blocked by any @PreAuthorize annotation.
 * 
 * MULTI-LAYER BYPASS STRATEGY:
 * 1. CustomUserDetailsService: Loads ALL permissions for SUPER_ADMIN at login
 * 2. SessionAuthenticationFilter: Loads ALL permissions for SUPER_ADMIN on each request
 * 3. SuperAdminPermissionEvaluator: Bypasses hasPermission() checks
 * 4. This handler: Enables the custom evaluator in method security
 * 
 * @author TBA WAAD System
 * @version 1.1 - Enhanced bypass with custom expression handler
 */
@Configuration
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
@RequiredArgsConstructor
@Slf4j
public class MethodSecurityConfig {

    private final SuperAdminPermissionEvaluator permissionEvaluator;

    /**
     * Register the custom expression handler that grants SUPER_ADMIN bypass
     * for hasPermission(), hasRole(), and hasAuthority() expressions.
     * 
     * The DefaultMethodSecurityExpressionHandler is enhanced with:
     * - Custom PermissionEvaluator for hasPermission() bypass
     * - Default role hierarchy support
     * - Support for @Secured and @PreAuthorize annotations
     */
    @Bean
    public MethodSecurityExpressionHandler methodSecurityExpressionHandler() {
        log.info("═══════════════════════════════════════════════════════════");
        log.info("🔐 Registering SUPER_ADMIN comprehensive bypass handler");
        log.info("   ✓ hasPermission() bypass enabled");
        log.info("   ✓ hasRole() with ALL permissions granted at login");
        log.info("   ✓ hasAuthority() with ALL permissions granted at login");
        log.info("═══════════════════════════════════════════════════════════");
        
        DefaultMethodSecurityExpressionHandler handler = new DefaultMethodSecurityExpressionHandler();
        
        // Set custom permission evaluator for SUPER_ADMIN bypass
        handler.setPermissionEvaluator(permissionEvaluator);
        
        // Enable default behavior for role/authority checks
        // SUPER_ADMIN bypass works because all permissions are loaded at login time
        handler.setDefaultRolePrefix("ROLE_");
        
        return handler;
    }
}
