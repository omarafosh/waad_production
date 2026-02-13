package com.waad.tba.security.rbac;

import com.waad.tba.modules.rbac.entity.Role;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.modules.rbac.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * RBAC Guard Service - Critical Operation Protection
 * 
 * This service provides validation methods for critical RBAC operations.
 * It enforces:
 * 
 * 1. SUPER_ADMIN Protection:
 *    - Cannot be deleted by non-SUPER_ADMIN
 *    - Cannot have role removed by non-SUPER_ADMIN
 *    - Cannot be assigned by non-SUPER_ADMIN
 * 
 * 2. Role Hierarchy:
 *    - Users can only modify users with lower privilege
 *    - No privilege escalation allowed
 * 
 * 3. System Role Protection:
 *    - System-defined roles cannot be deleted
 *    - SUPER_ADMIN role permissions cannot be modified
 * 
 * USAGE: Inject this service into your controllers/services and call
 * validation methods BEFORE performing any critical operation.
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RbacGuardService {

    private final RoleHierarchyService roleHierarchyService;
    private final UserRepository userRepository;

    // ============================================
    // Constants - Protected System Roles
    // ============================================
    
    private static final Set<String> PROTECTED_SYSTEM_ROLES = Set.of(
        "SUPER_ADMIN",
        "INSURANCE_ADMIN",
        "EMPLOYER_ADMIN",
        "REVIEWER",
        "PROVIDER",
        "USER"
    );

    // ============================================
    // User Operation Guards
    // ============================================
    
    /**
     * Validate if the current user can delete a target user.
     * 
     * @param targetUserId The ID of the user to delete
     * @throws AccessDeniedException if deletion is not allowed
     */
    public void validateUserDeletion(Long targetUserId) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + targetUserId));
        
        // Get target user's highest role
        String targetRole = getHighestRole(targetUser);
        
        // Check if current user can delete the target
        if (!roleHierarchyService.canDeleteUserWithRole(targetRole)) {
            log.error("🚨 BLOCKED: User deletion denied for target with role {}", targetRole);
            throw new AccessDeniedException(
                    "You do not have permission to delete this user. " +
                    "SUPER_ADMIN users can only be deleted by other SUPER_ADMIN users.");
        }
        
        // Additional check: cannot delete yourself
        String currentUsername = getCurrentUsername();
        if (targetUser.getUsername().equals(currentUsername)) {
            log.error("🚨 BLOCKED: User attempted to delete themselves");
            throw new AccessDeniedException("You cannot delete your own account.");
        }
        
        log.info("✅ User deletion validated for user ID: {}", targetUserId);
    }

    /**
     * Validate if the current user can update a target user.
     * 
     * @param targetUserId The ID of the user to update
     * @throws AccessDeniedException if update is not allowed
     */
    public void validateUserUpdate(Long targetUserId) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + targetUserId));
        
        String targetRole = getHighestRole(targetUser);
        
        // SUPER_ADMIN can only be modified by SUPER_ADMIN
        if ("SUPER_ADMIN".equals(targetRole) && !roleHierarchyService.isSuperAdmin()) {
            log.error("🚨 BLOCKED: Non-SUPER_ADMIN attempted to update SUPER_ADMIN user");
            throw new AccessDeniedException(
                    "SUPER_ADMIN users can only be modified by other SUPER_ADMIN users.");
        }
        
        // Standard hierarchy check
        if (!roleHierarchyService.canModifyUserWithRole(targetRole)) {
            log.error("🚨 BLOCKED: User update denied for target with role {}", targetRole);
            throw new AccessDeniedException(
                    "You do not have permission to modify this user.");
        }
        
        log.info("✅ User update validated for user ID: {}", targetUserId);
    }

    /**
     * Validate if the current user can assign roles to a target user.
     * 
     * @param targetUserId The ID of the user receiving roles
     * @param roleNames The roles to be assigned
     * @throws AccessDeniedException if assignment is not allowed
     */
    public void validateRoleAssignment(Long targetUserId, Set<String> roleNames) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + targetUserId));
        
        String currentTargetRole = getHighestRole(targetUser);
        
        // First, check if we can modify this user at all
        if (!roleHierarchyService.canModifyUserWithRole(currentTargetRole)) {
            log.error("🚨 BLOCKED: Cannot modify user with role {}", currentTargetRole);
            throw new AccessDeniedException(
                    "You do not have permission to modify this user's roles.");
        }
        
        // Check each role being assigned
        for (String roleName : roleNames) {
            if (!roleHierarchyService.canAssignRole(roleName)) {
                log.error("🚨 BLOCKED: Cannot assign role {}", roleName);
                throw new AccessDeniedException(
                        "You do not have permission to assign the role: " + roleName);
            }
        }
        
        // Validate no privilege escalation
        Optional<SystemRole> currentUserRole = roleHierarchyService.getCurrentUserRole();
        if (currentUserRole.isPresent()) {
            for (String roleName : roleNames) {
                SystemRole assignedRole = SystemRole.fromString(roleName);
                if (assignedRole != null && 
                    assignedRole.getPrivilegeLevel() > currentUserRole.get().getPrivilegeLevel()) {
                    log.error("🚨 BLOCKED: Privilege escalation attempt - assigning {} to user", roleName);
                    throw new AccessDeniedException(
                            "Cannot assign a role with higher privileges than your own.");
                }
            }
        }
        
        log.info("✅ Role assignment validated: {} roles to user ID: {}", roleNames.size(), targetUserId);
    }

    // ============================================
    // Role Operation Guards
    // ============================================
    
    /**
     * Validate if a role can be deleted.
     * System-defined roles cannot be deleted.
     * 
     * @param roleName The name of the role to delete
     * @throws AccessDeniedException if deletion is not allowed
     */
    public void validateRoleDeletion(String roleName) {
        // Check if it's a protected system role
        if (PROTECTED_SYSTEM_ROLES.contains(roleName.toUpperCase())) {
            log.error("🚨 BLOCKED: Attempted to delete protected system role: {}", roleName);
            throw new AccessDeniedException(
                    "System role '" + roleName + "' cannot be deleted. " +
                    "This is a protected role essential for system operation.");
        }
        
        // Only SUPER_ADMIN can delete roles
        if (!roleHierarchyService.isSuperAdmin()) {
            log.error("🚨 BLOCKED: Non-SUPER_ADMIN attempted to delete role");
            throw new AccessDeniedException(
                    "Only SUPER_ADMIN can delete roles.");
        }
        
        log.info("✅ Role deletion validated: {}", roleName);
    }

    /**
     * Validate if a role can be modified.
     * SUPER_ADMIN role permissions cannot be modified.
     * 
     * @param roleName The name of the role to modify
     * @throws AccessDeniedException if modification is not allowed
     */
    public void validateRoleModification(String roleName) {
        // SUPER_ADMIN role cannot be modified
        if ("SUPER_ADMIN".equalsIgnoreCase(roleName)) {
            log.error("🚨 BLOCKED: Attempted to modify SUPER_ADMIN role");
            throw new AccessDeniedException(
                    "SUPER_ADMIN role cannot be modified. " +
                    "This role has fixed permissions for system security.");
        }
        
        // Only SUPER_ADMIN can modify system roles
        if (PROTECTED_SYSTEM_ROLES.contains(roleName.toUpperCase()) && 
            !roleHierarchyService.isSuperAdmin()) {
            log.error("🚨 BLOCKED: Non-SUPER_ADMIN attempted to modify system role: {}", roleName);
            throw new AccessDeniedException(
                    "Only SUPER_ADMIN can modify system roles.");
        }
        
        log.info("✅ Role modification validated: {}", roleName);
    }

    /**
     * Validate if a new role can be created.
     * New roles cannot equal or exceed SUPER_ADMIN privileges.
     * 
     * @param roleName The name of the new role
     * @throws AccessDeniedException if creation is not allowed
     */
    public void validateRoleCreation(String roleName) {
        // Check if trying to create a system role name
        if (PROTECTED_SYSTEM_ROLES.contains(roleName.toUpperCase())) {
            log.error("🚨 BLOCKED: Attempted to create reserved system role: {}", roleName);
            throw new AccessDeniedException(
                    "Cannot create role with reserved name: " + roleName);
        }
        
        // Only SUPER_ADMIN can create roles
        if (!roleHierarchyService.isSuperAdmin()) {
            log.error("🚨 BLOCKED: Non-SUPER_ADMIN attempted to create role");
            throw new AccessDeniedException(
                    "Only SUPER_ADMIN can create new roles.");
        }
        
        log.info("✅ Role creation validated: {}", roleName);
    }

    // ============================================
    // Permission Domain Guards
    // ============================================
    
    /**
     * Validate access to RBAC management functions.
     * Only SUPER_ADMIN can manage RBAC.
     * 
     * @throws AccessDeniedException if access is not allowed
     */
    public void validateRbacAccess() {
        if (!roleHierarchyService.hasAccessToDomain(PermissionDomain.RBAC)) {
            log.error("🚨 BLOCKED: Access denied to RBAC domain");
            throw new AccessDeniedException(
                    "RBAC management is restricted to SUPER_ADMIN only.");
        }
        log.debug("✅ RBAC access validated");
    }

    /**
     * Validate access to system settings.
     * Only SUPER_ADMIN can access system settings.
     * 
     * @throws AccessDeniedException if access is not allowed
     */
    public void validateSystemAccess() {
        if (!roleHierarchyService.hasAccessToDomain(PermissionDomain.SYSTEM)) {
            log.error("🚨 BLOCKED: Access denied to SYSTEM domain");
            throw new AccessDeniedException(
                    "System settings are restricted to SUPER_ADMIN only.");
        }
        log.debug("✅ System access validated");
    }

    // ============================================
    // Helper Methods
    // ============================================
    
    /**
     * Get the highest privilege role from a user's roles.
     */
    private String getHighestRole(User user) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return "USER";
        }
        
        return user.getRoles().stream()
                .map(Role::getName)
                .map(SystemRole::fromString)
                .filter(r -> r != null)
                .max((r1, r2) -> Integer.compare(r1.getPrivilegeLevel(), r2.getPrivilegeLevel()))
                .map(Enum::name)
                .orElse(user.getRoles().iterator().next().getName());
    }

    /**
     * Get the current authenticated username.
     */
    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "ANONYMOUS";
    }

    /**
     * Check if the current operation would result in no SUPER_ADMIN in the system.
     * This is a critical safeguard.
     * 
     * @param userIdBeingModified The user being modified
     * @param newRoles The new roles being assigned (empty if deleting)
     */
    public void validateSuperAdminExists(Long userIdBeingModified, Set<String> newRoles) {
        // Count current SUPER_ADMIN users
        long superAdminCount = userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> "SUPER_ADMIN".equals(role.getName())))
                .count();
        
        // Check if this operation would remove the last SUPER_ADMIN
        User targetUser = userRepository.findById(userIdBeingModified).orElse(null);
        if (targetUser != null) {
            boolean isSuperAdmin = targetUser.getRoles().stream()
                    .anyMatch(role -> "SUPER_ADMIN".equals(role.getName()));
            boolean willRemainSuperAdmin = newRoles != null && newRoles.contains("SUPER_ADMIN");
            
            if (isSuperAdmin && !willRemainSuperAdmin && superAdminCount <= 1) {
                log.error("🚨 CRITICAL: Attempted to remove the last SUPER_ADMIN from the system!");
                throw new AccessDeniedException(
                        "Cannot remove SUPER_ADMIN role from the last SUPER_ADMIN user. " +
                        "The system must have at least one SUPER_ADMIN.");
            }
        }
    }
}
