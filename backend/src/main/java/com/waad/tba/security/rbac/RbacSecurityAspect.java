package com.waad.tba.security.rbac;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.Order;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Optional;

/**
 * RBAC Security Aspect - Enforcement Layer
 * 
 * This aspect enforces RBAC rules through annotations:
 * - @SuperAdminOnly: Restricts access to SUPER_ADMIN only
 * - @RequireRole: Requires minimum role level
 * - @RequireDomain: Requires access to permission domains
 * 
 * Order: Runs BEFORE method execution (highest priority)
 * 
 * CRITICAL SECURITY:
 * - All denials are logged for audit
 * - SUPER_ADMIN protection is enforced at this layer
 * - No workarounds allowed
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
@Aspect
@Component
@Order(1) // Run before other aspects
@Slf4j
@RequiredArgsConstructor
public class RbacSecurityAspect {

    private final RoleHierarchyService roleHierarchyService;

    // ============================================
    // @SuperAdminOnly Enforcement
    // ============================================
    
    @Around("@annotation(superAdminOnly)")
    public Object enforceSuperAdminOnly(ProceedingJoinPoint joinPoint, SuperAdminOnly superAdminOnly) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        
        if (!roleHierarchyService.isSuperAdmin()) {
            log.error("🚨 SUPER_ADMIN_ONLY: Access denied to {} - {}", 
                    methodName, superAdminOnly.message());
            roleHierarchyService.logSecurityEvent("SUPER_ADMIN_ONLY_ACCESS", methodName, false);
            throw new AccessDeniedException(superAdminOnly.message());
        }
        
        log.debug("✅ SUPER_ADMIN access granted to {}", methodName);
        roleHierarchyService.logSecurityEvent("SUPER_ADMIN_ONLY_ACCESS", methodName, true);
        return joinPoint.proceed();
    }

    // ============================================
    // @RequireRole Enforcement
    // ============================================
    
    @Around("@annotation(requireRole)")
    public Object enforceRequireRole(ProceedingJoinPoint joinPoint, RequireRole requireRole) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        SystemRole requiredRole = requireRole.value();
        
        Optional<SystemRole> currentRole = roleHierarchyService.getCurrentUserRole();
        
        if (currentRole.isEmpty()) {
            log.error("🚨 REQUIRE_ROLE: No authenticated user for {}", methodName);
            throw new AccessDeniedException("Authentication required");
        }
        
        SystemRole userRole = currentRole.get();
        
        // Check if user's role meets or exceeds the required role
        if (userRole.getPrivilegeLevel() < requiredRole.getPrivilegeLevel()) {
            log.error("🚨 REQUIRE_ROLE: {} (level {}) cannot access {} (requires {} level {})", 
                    userRole.name(), userRole.getPrivilegeLevel(),
                    methodName, requiredRole.name(), requiredRole.getPrivilegeLevel());
            roleHierarchyService.logSecurityEvent("REQUIRE_ROLE", methodName, false);
            throw new AccessDeniedException(requireRole.message());
        }
        
        log.debug("✅ Role {} meets requirement {} for {}", 
                userRole.name(), requiredRole.name(), methodName);
        roleHierarchyService.logSecurityEvent("REQUIRE_ROLE", methodName, true);
        return joinPoint.proceed();
    }

    // ============================================
    // @RequireDomain Enforcement
    // ============================================
    
    @Around("@annotation(requireDomain)")
    public Object enforceRequireDomain(ProceedingJoinPoint joinPoint, RequireDomain requireDomain) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        PermissionDomain[] requiredDomains = requireDomain.value();
        
        for (PermissionDomain domain : requiredDomains) {
            if (!roleHierarchyService.hasAccessToDomain(domain)) {
                log.error("🚨 REQUIRE_DOMAIN: Access denied to domain {} for method {}", 
                        domain.name(), methodName);
                roleHierarchyService.logSecurityEvent("REQUIRE_DOMAIN:" + domain.name(), methodName, false);
                throw new AccessDeniedException(
                        requireDomain.message() + ": " + domain.getDisplayNameEn());
            }
        }
        
        log.debug("✅ Domain access granted for {}", methodName);
        roleHierarchyService.logSecurityEvent("REQUIRE_DOMAIN", methodName, true);
        return joinPoint.proceed();
    }

    // ============================================
    // Class-Level Annotation Support
    // ============================================
    
    @Around("@within(superAdminOnly)")
    public Object enforceClassLevelSuperAdmin(ProceedingJoinPoint joinPoint, SuperAdminOnly superAdminOnly) throws Throwable {
        // Check if method has its own annotation (method takes precedence)
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        if (method.isAnnotationPresent(SuperAdminOnly.class)) {
            // Method annotation will handle this
            return joinPoint.proceed();
        }
        
        // Apply class-level restriction
        return enforceSuperAdminOnly(joinPoint, superAdminOnly);
    }

    @Around("@within(requireRole)")
    public Object enforceClassLevelRequireRole(ProceedingJoinPoint joinPoint, RequireRole requireRole) throws Throwable {
        // Check if method has its own annotation (method takes precedence)
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        if (method.isAnnotationPresent(RequireRole.class)) {
            // Method annotation will handle this
            return joinPoint.proceed();
        }
        
        // Apply class-level restriction
        return enforceRequireRole(joinPoint, requireRole);
    }

    @Around("@within(requireDomain)")
    public Object enforceClassLevelRequireDomain(ProceedingJoinPoint joinPoint, RequireDomain requireDomain) throws Throwable {
        // Check if method has its own annotation (method takes precedence)
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        if (method.isAnnotationPresent(RequireDomain.class)) {
            // Method annotation will handle this
            return joinPoint.proceed();
        }
        
        // Apply class-level restriction
        return enforceRequireDomain(joinPoint, requireDomain);
    }
}
