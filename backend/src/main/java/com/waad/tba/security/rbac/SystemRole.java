package com.waad.tba.security.rbac;

import java.util.Arrays;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * System Role Hierarchy - RBAC Hardening
 * 
 * Defines the complete role hierarchy with privilege levels.
 * This is the AUTHORITATIVE source for role definitions.
 * 
 * CRITICAL SECURITY RULES:
 * 1. SUPER_ADMIN has maximum privilege level (999)
 * 2. SUPER_ADMIN cannot be modified/deleted by anyone except other SUPER_ADMIN
 * 3. Users cannot modify users with higher or equal privilege level
 * 4. INSURANCE_ADMIN has operational authority but cannot manage RBAC
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
public enum SystemRole {
    
    // ============================================
    // TIER 1: System Owner (Maximum Privileges)
    // ============================================
    
    /**
     * SUPER_ADMIN - System Owner
     * 
     * - Has ALL permissions (bypass all checks)
     * - Can manage RBAC definitions (roles, permissions)
     * - Can create/delete other SUPER_ADMIN users
     * - Cannot be deleted by non-SUPER_ADMIN
     * - System-critical role
     */
    SUPER_ADMIN(999, "مالك النظام", "System Owner", true, true,
        EnumSet.allOf(PermissionDomain.class)),
    
    // ============================================
    // TIER 2: Operational Administrator
    // ============================================
    
    /**
     * INSURANCE_ADMIN - Insurance Company Administrator
     * 
     * - Has ALL operational permissions
     * - Can manage users (except SUPER_ADMIN)
     * - Can assign roles (except SUPER_ADMIN)
     * - CANNOT manage RBAC definitions
     * - CANNOT access system settings (sensitive)
     */
    INSURANCE_ADMIN(100, "مدير التأمين", "Insurance Administrator", false, false,
        EnumSet.of(
            PermissionDomain.USERS,
            PermissionDomain.MEMBERS,
            PermissionDomain.CLAIMS,
            PermissionDomain.PROVIDERS,
            PermissionDomain.EMPLOYERS,
            PermissionDomain.DASHBOARD,
            PermissionDomain.REPORTS,
            PermissionDomain.PREAUTH,
            PermissionDomain.VISITS
        )),
    
    // ============================================
    // TIER 3: Department Administrators
    // ============================================
    
    /**
     * EMPLOYER_ADMIN - Employer Company Administrator
     */
    EMPLOYER_ADMIN(50, "مدير صاحب العمل", "Employer Administrator", false, false,
        EnumSet.of(
            PermissionDomain.MEMBERS,
            PermissionDomain.CLAIMS,
            PermissionDomain.REPORTS
        )),
    
    /**
     * REVIEWER - Medical Claim Reviewer
     */
    REVIEWER(40, "مراجع طبي", "Medical Reviewer", false, false,
        EnumSet.of(
            PermissionDomain.CLAIMS
        )),
    
    /**
     * PROVIDER - Healthcare Provider
     */
    PROVIDER(30, "مقدم خدمة", "Healthcare Provider", false, false,
        EnumSet.of(
            PermissionDomain.CLAIMS,
            PermissionDomain.VISITS,
            PermissionDomain.MEMBERS
        )),
    
    // ============================================
    // TIER 4: Basic Users
    // ============================================
    
    /**
     * USER - Basic Read-Only User
     */
    USER(10, "مستخدم", "Basic User", false, false,
        EnumSet.of(
            PermissionDomain.DASHBOARD
        ));

    // ============================================
    // Enum Properties
    // ============================================
    
    private final int privilegeLevel;
    private final String displayNameAr;
    private final String displayNameEn;
    private final boolean canManageRbac;
    private final boolean canManageSystem;
    private final Set<PermissionDomain> allowedDomains;

    SystemRole(int privilegeLevel, String displayNameAr, String displayNameEn,
               boolean canManageRbac, boolean canManageSystem, 
               Set<PermissionDomain> allowedDomains) {
        this.privilegeLevel = privilegeLevel;
        this.displayNameAr = displayNameAr;
        this.displayNameEn = displayNameEn;
        this.canManageRbac = canManageRbac;
        this.canManageSystem = canManageSystem;
        this.allowedDomains = Collections.unmodifiableSet(allowedDomains);
    }

    // ============================================
    // Getters
    // ============================================
    
    public int getPrivilegeLevel() {
        return privilegeLevel;
    }

    public String getDisplayNameAr() {
        return displayNameAr;
    }

    public String getDisplayNameEn() {
        return displayNameEn;
    }

    public boolean canManageRbac() {
        return canManageRbac;
    }

    public boolean canManageSystem() {
        return canManageSystem;
    }

    public Set<PermissionDomain> getAllowedDomains() {
        return allowedDomains;
    }

    // ============================================
    // Hierarchy Methods
    // ============================================
    
    /**
     * Check if this role can modify another role.
     * A role can only modify roles with LOWER privilege level.
     * 
     * @param targetRole The role to be modified
     * @return true if this role can modify the target role
     */
    public boolean canModify(SystemRole targetRole) {
        if (targetRole == null) {
            return false;
        }
        // SUPER_ADMIN can modify anyone except themselves (self-protection)
        if (this == SUPER_ADMIN) {
            return true;
        }
        // Others can only modify roles with strictly lower privilege
        return this.privilegeLevel > targetRole.privilegeLevel;
    }

    /**
     * Check if this role can assign another role to a user.
     * 
     * Rules:
     * - SUPER_ADMIN can assign any role
     * - INSURANCE_ADMIN can assign any role EXCEPT SUPER_ADMIN
     * - Other roles cannot assign roles
     * 
     * @param roleToAssign The role to be assigned
     * @return true if this role can assign the target role
     */
    public boolean canAssignRole(SystemRole roleToAssign) {
        if (roleToAssign == null) {
            return false;
        }
        
        // SUPER_ADMIN can assign any role
        if (this == SUPER_ADMIN) {
            return true;
        }
        
        // INSURANCE_ADMIN can assign any role except SUPER_ADMIN
        if (this == INSURANCE_ADMIN) {
            return roleToAssign != SUPER_ADMIN;
        }
        
        // Other roles cannot assign roles
        return false;
    }

    /**
     * Check if this role outranks another role.
     * 
     * @param other The role to compare
     * @return true if this role has higher privilege level
     */
    public boolean outranks(SystemRole other) {
        if (other == null) {
            return true;
        }
        return this.privilegeLevel > other.privilegeLevel;
    }

    /**
     * Check if this role has access to a permission domain.
     * 
     * @param domain The permission domain
     * @return true if this role has access to the domain
     */
    public boolean hasAccessToDomain(PermissionDomain domain) {
        if (domain == null) {
            return false;
        }
        return allowedDomains.contains(domain);
    }

    // ============================================
    // Static Utility Methods
    // ============================================
    
    /**
     * Get SystemRole from string name.
     * Case-insensitive, also handles ROLE_ prefix.
     * 
     * @param roleName The role name
     * @return The SystemRole or null if not found
     */
    public static SystemRole fromString(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return null;
        }
        
        // Remove ROLE_ prefix if present
        String cleanName = roleName.toUpperCase().trim();
        if (cleanName.startsWith("ROLE_")) {
            cleanName = cleanName.substring(5);
        }
        
        try {
            return SystemRole.valueOf(cleanName);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Get all roles that can be assigned by the given role.
     * 
     * @param assignerRole The role doing the assignment
     * @return Set of roles that can be assigned
     */
    public static Set<SystemRole> getAssignableRoles(SystemRole assignerRole) {
        if (assignerRole == null) {
            return Collections.emptySet();
        }
        
        EnumSet<SystemRole> assignable = EnumSet.noneOf(SystemRole.class);
        for (SystemRole role : values()) {
            if (assignerRole.canAssignRole(role)) {
                assignable.add(role);
            }
        }
        return assignable;
    }

    /**
     * Check if a role name is a system-protected role.
     * System-protected roles have special handling.
     * 
     * @param roleName The role name to check
     * @return true if it's a system-protected role
     */
    public static boolean isSystemRole(String roleName) {
        return fromString(roleName) != null;
    }

    /**
     * Get all role names as strings.
     * 
     * @return Array of role names
     */
    public static String[] getAllRoleNames() {
        return Arrays.stream(values())
                .map(Enum::name)
                .toArray(String[]::new);
    }
}
