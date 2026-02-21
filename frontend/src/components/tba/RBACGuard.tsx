import PropTypes from 'prop-types';
import useAuth from 'hooks/useAuth';
import { ROLES, LEGACY_PERMISSION_MAP } from 'constants/permissions.constants';

// ==============================|| RBAC GUARD - PERMISSION-BASED ACCESS CONTROL ||============================== //

/**
 * RBACGuard - Controls visibility based on user roles and permissions
 *
 * CRITICAL: SUPER_ADMIN bypasses ALL permission checks!
 *
 * Usage:
 * <RBACGuard requiredPermissions={['MANAGE_EMPLOYERS']}>
 *   <Button>Add Employer</Button>
 * </RBACGuard>
 *
 * <RBACGuard requiredRoles={['ADMIN', 'INSURANCE_ADMIN']}>
 *   <AdminPanel />
 * </RBACGuard>
 *
 * Legacy (still supported):
 * <RBACGuard permission="MANAGE_EMPLOYERS">
 *   <Button>Add</Button>
 * </RBACGuard>
 */
export default function RBACGuard({
  requiredRoles = [],
  requiredPermissions = [],
  permissions = [], // Support both prop names
  permission = null, // Legacy: singular permission (backward compatibility)
  requireAll = false,
  fallback = null,
  children
}) {
  const { user } = useAuth();

  // If no user, deny access
  if (!user) {
    return fallback;
  }

  const userRoles = user.roles || [];
  const userPermissions = user.permissions || [];

  // ==========================================
  // CRITICAL FIX: SUPER_ADMIN BYPASS
  // SUPER_ADMIN has unrestricted access to everything
  // ==========================================
  if (userRoles.includes(ROLES.SUPER_ADMIN) || userRoles.includes('SUPER_ADMIN')) {
    return children;
  }

  // Check role requirements
  const hasRequiredRole =
    requiredRoles.length === 0 ||
    (requireAll ? requiredRoles.every((role) => userRoles.includes(role)) : requiredRoles.some((role) => userRoles.includes(role)));

  // ==========================================
  // PERMISSION CHECK - With Legacy Support
  // ==========================================

  // Build effective permissions list (merge all permission props)
  // 1. Start with requiredPermissions and permissions (normalized)
  let effectivePermissions = [...requiredPermissions, ...permissions].map(p => LEGACY_PERMISSION_MAP[p] || p);

  // 2. Add singular permission prop if provided (legacy support)
  if (permission) {
    // Convert legacy permission name if needed
    const normalizedPermission = LEGACY_PERMISSION_MAP[permission] || permission;
    effectivePermissions.push(normalizedPermission);
  }

  // Check permission requirements
  const hasRequiredPermission =
    effectivePermissions.length === 0 ||
    (requireAll
      ? effectivePermissions.every((perm) => userPermissions.includes(perm))
      : effectivePermissions.some((perm) => userPermissions.includes(perm)));

  // Grant access if both checks pass
  const hasAccess = hasRequiredRole && hasRequiredPermission;

  return hasAccess ? children : fallback;
}

RBACGuard.propTypes = {
  requiredRoles: PropTypes.arrayOf(PropTypes.string),
  requiredPermissions: PropTypes.arrayOf(PropTypes.string),
  permissions: PropTypes.arrayOf(PropTypes.string), // Alias for requiredPermissions
  permission: PropTypes.string, // Legacy: singular permission
  requireAll: PropTypes.bool,
  fallback: PropTypes.node,
  children: PropTypes.node
};
