package com.waad.tba.security.rbac;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

/**
 * Role Hierarchy Service - RBAC Hardening
 * 
 * Provides role hierarchy validation and access control services.
 * This service enforces the critical security rules:
 * 
 * 1. SUPER_ADMIN Protection:
 *    - Cannot be deleted by non-SUPER_ADMIN
 *    - Cannot have role changed by non-SUPER_ADMIN
 *    - Cannot be created by non-SUPER_ADMIN
 * 
 * 2. Hierarchy Enforcement:
 *    - Users can only modify users with LOWER privilege level
 *    - Users can only assign roles they have authority to assign
 *    - No privilege escalation is allowed
 * 
 * 3. Domain-Based Access:
 *    - SYSTEM and RBAC domains are SUPER_ADMIN only
 *    - Other domains follow role-based restrictions
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RoleHierarchyService {

    // ============================================
    // Current User Role Detection
    // ============================================
    
    /**
     * Get the current authenticated user's primary role as SystemRole.
     * 
     * @return Optional containing the SystemRole, empty if not authenticated or role not found
     */
    public Optional<SystemRole> getCurrentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        if (authorities == null || authorities.isEmpty()) {
            return Optional.empty();
        }
        
        // Find the highest privilege role
        return authorities.stream()
                .map(a -> SystemRole.fromString(a.getAuthority()))
                .filter(r -> r != null)
                .max((r1, r2) -> Integer.compare(r1.getPrivilegeLevel(), r2.getPrivilegeLevel()));
    }

    /**
     * Check if current user is SUPER_ADMIN.
     * 
     * @return true if current user has SUPER_ADMIN role
     */
    public boolean isSuperAdmin() {
        return getCurrentUserRole()
                .map(role -> role == SystemRole.SUPER_ADMIN)
                .orElse(false);
    }

    /**
     * Check if current user is INSURANCE_ADMIN or higher.
     * 
     * @return true if current user has INSURANCE_ADMIN or higher privilege
     */
    public boolean isInsuranceAdminOrHigher() {
        return getCurrentUserRole()
                .map(role -> role.getPrivilegeLevel() >= SystemRole.INSURANCE_ADMIN.getPrivilegeLevel())
                .orElse(false);
    }

    // ============================================
    // Role Hierarchy Validation
    // ============================================
    
    /**
     * Validate if current user can modify a user with the specified role.
     * 
     * Rules:
     * - SUPER_ADMIN can modify any user
     * - Other users can only modify users with LOWER privilege level
     * - No one can modify themselves through this check (handled separately)
     * 
     * @param targetRoleName The role of the target user
     * @return true if modification is allowed
     */
    public boolean canModifyUserWithRole(String targetRoleName) {
        Optional<SystemRole> currentRole = getCurrentUserRole();
        if (currentRole.isEmpty()) {
            log.warn("🔒 Access denied: No authenticated user");
            return false;
        }
        
        SystemRole current = currentRole.get();
        SystemRole target = SystemRole.fromString(targetRoleName);
        
        if (target == null) {
            // Unknown role - allow modification (might be a custom role)
            log.debug("⚠️ Unknown target role: {} - allowing modification", targetRoleName);
            return true;
        }
        
        boolean allowed = current.canModify(target);
        
        if (!allowed) {
            log.warn("🔒 Hierarchy violation: {} cannot modify {} (privilege {} vs {})", 
                    current.name(), target.name(), 
                    current.getPrivilegeLevel(), target.getPrivilegeLevel());
        }
        
        return allowed;
    }

    /**
     * Validate if current user can assign a specific role.
     * 
     * Rules:
     * - SUPER_ADMIN can assign any role
     * - INSURANCE_ADMIN can assign any role EXCEPT SUPER_ADMIN
     * - Other roles cannot assign roles
     * 
     * @param roleToAssign The role name to be assigned
     * @return true if assignment is allowed
     */
    public boolean canAssignRole(String roleToAssign) {
        Optional<SystemRole> currentRole = getCurrentUserRole();
        if (currentRole.isEmpty()) {
            log.warn("🔒 Access denied: No authenticated user");
            return false;
        }
        
        SystemRole current = currentRole.get();
        SystemRole target = SystemRole.fromString(roleToAssign);
        
        if (target == null) {
            // Unknown role - only SUPER_ADMIN can assign unknown roles
            log.debug("⚠️ Unknown role: {} - only SUPER_ADMIN can assign", roleToAssign);
            return current == SystemRole.SUPER_ADMIN;
        }
        
        boolean allowed = current.canAssignRole(target);
        
        if (!allowed) {
            log.warn("🔒 Role assignment denied: {} cannot assign {} role", 
                    current.name(), target.name());
        }
        
        return allowed;
    }

    /**
     * Get the set of roles that current user can assign.
     * 
     * @return Set of assignable role names
     */
    public Set<SystemRole> getAssignableRoles() {
        Optional<SystemRole> currentRole = getCurrentUserRole();
        if (currentRole.isEmpty()) {
            return Set.of();
        }
        
        return SystemRole.getAssignableRoles(currentRole.get());
    }

    // ============================================
    // SUPER_ADMIN Protection
    // ============================================
    
    /**
     * Check if a user with the given role can be deleted.
     * 
     * SUPER_ADMIN users can only be deleted by other SUPER_ADMIN users.
     * 
     * @param targetRoleName The role of the user to delete
     * @return true if deletion is allowed
     */
    public boolean canDeleteUserWithRole(String targetRoleName) {
        SystemRole target = SystemRole.fromString(targetRoleName);
        
        if (target == SystemRole.SUPER_ADMIN) {
            boolean allowed = isSuperAdmin();
            if (!allowed) {
                log.error("🚨 CRITICAL: Non-SUPER_ADMIN attempted to delete SUPER_ADMIN user!");
            }
            return allowed;
        }
        
        // For other roles, use standard hierarchy check
        return canModifyUserWithRole(targetRoleName);
    }

    /**
     * Check if current user can change a user's role from oldRole to newRole.
     * 
     * Validates:
     * 1. Current user can modify user with oldRole
     * 2. Current user can assign newRole
     * 3. No privilege escalation (newRole <= currentUserRole)
     * 
     * @param oldRoleName Current role of the target user
     * @param newRoleName New role to assign
     * @return true if role change is allowed
     */
    public boolean canChangeRole(String oldRoleName, String newRoleName) {
        // Check 1: Can modify user with current role
        if (!canModifyUserWithRole(oldRoleName)) {
            return false;
        }
        
        // Check 2: Can assign the new role
        if (!canAssignRole(newRoleName)) {
            return false;
        }
        
        // Check 3: Validate no escalation (new role not higher than current user's role)
        Optional<SystemRole> currentRole = getCurrentUserRole();
        if (currentRole.isEmpty()) {
            return false;
        }
        
        SystemRole newRole = SystemRole.fromString(newRoleName);
        if (newRole != null && newRole.getPrivilegeLevel() > currentRole.get().getPrivilegeLevel()) {
            log.warn("🔒 Privilege escalation blocked: Cannot assign {} (higher than current {})",
                    newRole.name(), currentRole.get().name());
            return false;
        }
        
        return true;
    }

    // ============================================
    // Domain-Based Access Control
    // ============================================
    
    /**
     * Check if current user has access to a permission domain.
     * 
     * @param domain The permission domain
     * @return true if access is allowed
     */
    public boolean hasAccessToDomain(PermissionDomain domain) {
        if (domain == null) {
            return false;
        }
        
        Optional<SystemRole> currentRole = getCurrentUserRole();
        if (currentRole.isEmpty()) {
            return false;
        }
        
        SystemRole role = currentRole.get();
        
        // SUPER_ADMIN has access to all domains
        if (role == SystemRole.SUPER_ADMIN) {
            return true;
        }
        
        // For SUPER_ADMIN-only domains, deny access to others
        if (domain.isSuperAdminOnly()) {
            log.warn("🔒 Domain {} is SUPER_ADMIN only, access denied for {}", 
                    domain.name(), role.name());
            return false;
        }
        
        // Check role's allowed domains
        return role.hasAccessToDomain(domain);
    }

    /**
     * Check if current user can access a permission.
     * 
     * @param permissionName The permission name
     * @return true if access is allowed
     */
    public boolean canAccessPermission(String permissionName) {
        PermissionDomain domain = PermissionDomain.fromPermissionName(permissionName);
        return hasAccessToDomain(domain);
    }

    // ============================================
    // Audit Logging
    // ============================================
    
    /**
     * Log a security event for audit purposes.
     * 
     * @param action The action attempted
     * @param target The target of the action
     * @param allowed Whether the action was allowed
     */
    public void logSecurityEvent(String action, String target, boolean allowed) {
        String username = SecurityContextHolder.getContext().getAuthentication() != null 
                ? SecurityContextHolder.getContext().getAuthentication().getName() 
                : "ANONYMOUS";
        
        Optional<SystemRole> role = getCurrentUserRole();
        String roleName = role.map(Enum::name).orElse("NONE");
        
        if (allowed) {
            log.info("✅ RBAC: User '{}' (role: {}) performed {} on {}", 
                    username, roleName, action, target);
        } else {
            log.warn("🔒 RBAC: User '{}' (role: {}) DENIED {} on {}", 
                    username, roleName, action, target);
        }
    }
}
