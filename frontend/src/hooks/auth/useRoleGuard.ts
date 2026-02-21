import { useCallback, useMemo } from 'react';
import { useRBAC } from 'store';
import {
  SystemRole,
  PermissionDomain,
  RolePrivilegeLevel,
  SUPER_ADMIN_ONLY_ROUTES,
  isSuperAdminOnlyDomain
} from 'constants/rbac';

export interface RoleGuardHook {
  isSuperAdmin: boolean;
  primaryRole: string | null;
  isInsuranceAdminOrHigher: boolean;
  hasMinimumRole: (requiredRole: string) => boolean;
  canAccessRoute: (routePath: string) => boolean;
  canAccessDomain: (domain: string) => boolean;
  canManageUsers: boolean;
  canDeleteUser: (targetRole: string) => boolean;
  canEditUser: (targetRole: string) => boolean;
  canChangeUserRole: (currentRole: string, newRole: string) => boolean;
  canManageRoles: boolean;
  canCreateRole: boolean;
  canDeleteRole: (roleName: string) => boolean;
  canModifyRolePermissions: (roleName: string) => boolean;
  canAssignRole: (roleName: string) => boolean;
  getAssignableRoles: () => string[];
  getFilteredRoleOptions: (allRoles: any[]) => any[];
  canAccessSystemSettings: boolean;
  canAccessRbacManagement: boolean;
  canViewAuditLogs: boolean;
  showRbacMenu: boolean;
  showSystemMenu: boolean;
  showUserManagementMenu: boolean;
}

/**
 * useRoleGuard Hook - Programmatic RBAC Checking
 * 
 * Provides functions to check role-based access without using guard components.
 * Useful for:
 * - Hiding/showing UI elements
 * - Disabling buttons
 * - Conditional rendering
 * - Pre-validation before API calls
 * 
 * @example
 * const { canManageUsers, canDeleteUser, isSuperAdmin } = useRoleGuard();
 * 
 * return (
 *   <>
 *     {canManageUsers && <UserManagementLink />}
 *     <button disabled={!canDeleteUser('SUPER_ADMIN')}>Delete User</button>
 *   </>
 * );
 * 
 * @author TBA WAAD System
 * @version 1.0 - RBAC Hardening
 * @since 2026-01-13
 */
const useRoleGuard = (): RoleGuardHook => {
  const {
    isSuperAdmin,
    primaryRole,
    hasRole,
    hasAccessToDomain,
    getPrivilegeLevel,
    canModifyUserWithRole,
    canAssignRole,
    getAssignableRoles,
    isInsuranceAdminOrHigher
  } = useRBAC();

  // ============================================
  // Basic Role Checks
  // ============================================

  /**
   * Check if user has minimum role level
   */
  const hasMinimumRole = useCallback((requiredRole: string): boolean => {
    const requiredLevel = (RolePrivilegeLevel as any)[requiredRole] ?? 0;
    const userLevel = getPrivilegeLevel();
    return userLevel >= requiredLevel;
  }, [getPrivilegeLevel]);

  /**
   * Check if user can access a route
   */
  const canAccessRoute = useCallback((routePath: string): boolean => {
    // Check SUPER_ADMIN only routes
    if (SUPER_ADMIN_ONLY_ROUTES.some(r => routePath.startsWith(r))) {
      return isSuperAdmin;
    }
    return true;
  }, [isSuperAdmin]);

  // ============================================
  // User Management Checks
  // ============================================

  /**
   * Check if user can manage users (create/edit)
   */
  const canManageUsers = useMemo((): boolean => {
    return hasAccessToDomain(PermissionDomain.USERS);
  }, [hasAccessToDomain]);

  /**
   * Check if user can delete a user with given role
   */
  const canDeleteUser = useCallback((targetRole: string): boolean => {
    // SUPER_ADMIN users can only be deleted by other SUPER_ADMIN
    if (targetRole === SystemRole.SUPER_ADMIN) {
      return isSuperAdmin;
    }
    // Use hierarchy check
    return canModifyUserWithRole(targetRole);
  }, [isSuperAdmin, canModifyUserWithRole]);

  /**
   * Check if user can edit a user with given role
   */
  const canEditUser = useCallback((targetRole: string): boolean => {
    // SUPER_ADMIN users can only be edited by SUPER_ADMIN
    if (targetRole === SystemRole.SUPER_ADMIN) {
      return isSuperAdmin;
    }
    return canModifyUserWithRole(targetRole);
  }, [isSuperAdmin, canModifyUserWithRole]);

  /**
   * Check if user can change another user's role
   */
  const canChangeUserRole = useCallback((currentRole: string, newRole: string): boolean => {
    // Can modify the user?
    if (!canModifyUserWithRole(currentRole)) {
      return false;
    }
    // Can assign the new role?
    return canAssignRole(newRole);
  }, [canModifyUserWithRole, canAssignRole]);

  // ============================================
  // Role Management Checks
  // ============================================

  /**
   * Check if user can manage roles (RBAC)
   */
  const canManageRoles = useMemo((): boolean => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  /**
   * Check if user can create new roles
   */
  const canCreateRole = useMemo((): boolean => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  /**
   * Check if user can delete a role
   */
  const canDeleteRole = useCallback((roleName: string): boolean => {
    // Only SUPER_ADMIN can delete roles
    if (!isSuperAdmin) {
      return false;
    }
    // Cannot delete SUPER_ADMIN role
    if (roleName === SystemRole.SUPER_ADMIN) {
      return false;
    }
    return true;
  }, [isSuperAdmin]);

  /**
   * Check if user can modify a role's permissions
   */
  const canModifyRolePermissions = useCallback((roleName: string): boolean => {
    // Only SUPER_ADMIN can modify role permissions
    if (!isSuperAdmin) {
      return false;
    }
    // SUPER_ADMIN role permissions cannot be modified
    if (roleName === SystemRole.SUPER_ADMIN) {
      return false;
    }
    return true;
  }, [isSuperAdmin]);

  // ============================================
  // Domain Access Checks
  // ============================================

  /**
   * Check if user can access system settings
   */
  const canAccessSystemSettings = useMemo((): boolean => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  /**
   * Check if user can access RBAC management
   */
  const canAccessRbacManagement = useMemo((): boolean => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  /**
   * Check if user can view audit logs
   */
  const canViewAuditLogs = useMemo((): boolean => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  /**
   * Check domain access (generic)
   */
  const canAccessDomain = useCallback((domain: string): boolean => {
    if (isSuperAdminOnlyDomain(domain)) {
      return isSuperAdmin;
    }
    return hasAccessToDomain(domain);
  }, [isSuperAdmin, hasAccessToDomain]);

  // ============================================
  // UI Visibility Checks
  // ============================================

  /**
   * Check if RBAC menu should be visible
   */
  const showRbacMenu = useMemo((): boolean => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  /**
   * Check if System Settings menu should be visible
   */
  const showSystemMenu = useMemo((): boolean => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  /**
   * Check if User Management menu should be visible
   */
  const showUserManagementMenu = useMemo((): boolean => {
    return hasAccessToDomain(PermissionDomain.USERS);
  }, [hasAccessToDomain]);

  /**
   * Get filtered role options for assignment (removes roles user can't assign)
   */
  const getFilteredRoleOptions = useCallback((allRoles: any[]): any[] => {
    const assignable = getAssignableRoles();
    return allRoles.filter(role =>
      assignable.includes(role.name || role)
    );
  }, [getAssignableRoles]);

  return {
    // Basic info
    isSuperAdmin,
    primaryRole,
    isInsuranceAdminOrHigher,

    // Generic checks
    hasMinimumRole,
    canAccessRoute,
    canAccessDomain,

    // User management
    canManageUsers,
    canDeleteUser,
    canEditUser,
    canChangeUserRole,

    // Role management
    canManageRoles,
    canCreateRole,
    canDeleteRole,
    canModifyRolePermissions,
    canAssignRole,
    getAssignableRoles,
    getFilteredRoleOptions,

    // Domain access
    canAccessSystemSettings,
    canAccessRbacManagement,
    canViewAuditLogs,

    // UI visibility
    showRbacMenu,
    showSystemMenu,
    showUserManagementMenu
  };
};

export default useRoleGuard;
