package com.waad.tba.security.rbac;

/**
 * Permission Domain - RBAC Hardening
 * 
 * Defines the permission domains for role-based access control.
 * Permissions are grouped into domains for clearer authorization.
 * 
 * CRITICAL SECURITY RULES:
 * - SYSTEM domain: SUPER_ADMIN only
 * - RBAC domain: SUPER_ADMIN only
 * - All other domains: Based on role configuration
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
public enum PermissionDomain {
    
    // ============================================
    // SUPER_ADMIN ONLY Domains
    // ============================================
    
    /**
     * SYSTEM Domain - System Configuration
     * 
     * Controls access to:
     * - System settings and configuration
     * - Application parameters
     * - Sensitive system operations
     * 
     * ACCESS: SUPER_ADMIN ONLY
     */
    SYSTEM("النظام", "System", true),
    
    /**
     * RBAC Domain - Role & Permission Management
     * 
     * Controls access to:
     * - Role definitions (create, update, delete)
     * - Permission assignments
     * - User role assignments
     * 
     * ACCESS: SUPER_ADMIN ONLY
     */
    RBAC("الأدوار والصلاحيات", "Roles & Permissions", true),
    
    // ============================================
    // INSURANCE_ADMIN+ Domains
    // ============================================
    
    /**
     * USERS Domain - User Management
     * 
     * Controls access to:
     * - User creation and management
     * - User activation/deactivation
     * - Password reset
     * 
     * ACCESS: INSURANCE_ADMIN+ (with hierarchy restrictions)
     */
    USERS("المستخدمين", "Users", false),
    
    /**
     * MEMBERS Domain - Member Management
     * 
     * Controls access to:
     * - Member (insured person) management
     * - Member eligibility
     * - Dependents
     */
    MEMBERS("الأعضاء", "Members", false),
    
    /**
     * SETTLEMENT Domain - Financial Settlements
     * 
     * Controls access to:
     * - Settlement processing
     * - Payment batches
     * - Provider account financial views
     */
    SETTLEMENT("التسويات", "Settlement", false),

    /**
     * CLAIMS Domain - Claims Management
     * 
     * Controls access to:
     * - Claim submission and tracking
     * - Claim approval/rejection
     * - Claim reporting
     */
    CLAIMS("المطالبات", "Claims", false),
    
    /**
     * PROVIDERS Domain - Provider Management
     * 
     * Controls access to:
     * - Healthcare provider management
     * - Provider contracts
     * - Provider networks
     */
    PROVIDERS("مقدمي الخدمة", "Providers", false),
    
    /**
     * EMPLOYERS Domain - Employer Management
     * 
     * Controls access to:
     * - Employer company management
     * - Benefit policies
     * - Member groups
     */
    EMPLOYERS("أصحاب العمل", "Employers", false),
    
    /**
     * DASHBOARD Domain - Dashboard & Analytics
     * 
     * Controls access to:
     * - Dashboard views
     * - Analytics
     * - Statistics
     */
    DASHBOARD("لوحة التحكم", "Dashboard", false),
    
    /**
     * REPORTS Domain - Reporting
     * 
     * Controls access to:
     * - Report generation
     * - Data export
     * - Audit logs
     */
    REPORTS("التقارير", "Reports", false),
    
    /**
     * PREAUTH Domain - Pre-Authorization
     * 
     * Controls access to:
     * - Pre-authorization requests
     * - Pre-authorization approvals
     */
    PREAUTH("الموافقات المسبقة", "Pre-Authorization", false),
    
    /**
     * VISITS Domain - Visit Management
     * 
     * Controls access to:
     * - Visit registration
     * - Visit tracking
     */
    VISITS("الزيارات", "Visits", false);

    // ============================================
    // Enum Properties
    // ============================================
    
    private final String displayNameAr;
    private final String displayNameEn;
    private final boolean superAdminOnly;

    PermissionDomain(String displayNameAr, String displayNameEn, boolean superAdminOnly) {
        this.displayNameAr = displayNameAr;
        this.displayNameEn = displayNameEn;
        this.superAdminOnly = superAdminOnly;
    }

    // ============================================
    // Getters
    // ============================================
    
    public String getDisplayNameAr() {
        return displayNameAr;
    }

    public String getDisplayNameEn() {
        return displayNameEn;
    }

    /**
     * Check if this domain is restricted to SUPER_ADMIN only.
     * 
     * @return true if only SUPER_ADMIN can access this domain
     */
    public boolean isSuperAdminOnly() {
        return superAdminOnly;
    }

    // ============================================
    // Static Utility Methods
    // ============================================
    
    /**
     * Get the permission domain from a permission name.
     * Permission naming convention: {DOMAIN}_{ACTION}
     * 
     * Examples:
     * - MEMBER_VIEW → MEMBERS
     * - CLAIM_VIEW → CLAIMS
     * - RBAC_MANAGE → RBAC
     * 
     * @param permissionName The permission name
     * @return The corresponding domain or null
     */
    public static PermissionDomain fromPermissionName(String permissionName) {
        if (permissionName == null || permissionName.isBlank()) {
            return null;
        }
        
        String upperName = permissionName.toUpperCase();
        
        // Direct mappings
        if (upperName.contains("SYSTEM_SETTINGS") || upperName.contains("SYSTEM")) {
            return SYSTEM;
        }
        if (upperName.contains("RBAC")) {
            return RBAC;
        }
        if (upperName.contains("MEMBER")) {
            return MEMBERS;
        }
        if (upperName.contains("CLAIM")) {
            return CLAIMS;
        }
        if (upperName.contains("PROVIDER")) {
            return PROVIDERS;
        }
        if (upperName.contains("SETTLEMENT")) {
            return SETTLEMENT;
        }
        if (upperName.contains("EMPLOYER")) {
            return EMPLOYERS;
        }
        if (upperName.contains("DASHBOARD")) {
            return DASHBOARD;
        }
        if (upperName.contains("REPORT")) {
            return REPORTS;
        }
        if (upperName.contains("PREAUTH")) {
            return PREAUTH;
        }
        if (upperName.contains("VISIT")) {
            return VISITS;
        }
        if (upperName.contains("USER")) {
            return USERS;
        }
        
        // Default: assume DASHBOARD for basic access
        return DASHBOARD;
    }

    /**
     * Check if a permission requires SUPER_ADMIN based on its domain.
     * 
     * @param permissionName The permission name
     * @return true if the permission requires SUPER_ADMIN
     */
    public static boolean requiresSuperAdmin(String permissionName) {
        PermissionDomain domain = fromPermissionName(permissionName);
        return domain != null && domain.isSuperAdminOnly();
    }
}
