import useAuth from 'hooks/useAuth';

/**
 * Permission Guard Component
 *
 * Conditionally renders children based on user permissions.
 * Hides UI elements if user lacks required permission.
 *
 * Usage:
 * <PermissionGuard permission="members.delete">
 *   <Button>Delete</Button>
 * </PermissionGuard>
 *
 * Multiple permissions (OR logic):
 * <PermissionGuard permissions={['members.edit', 'members.delete']}>
 *   <Button>Edit</Button>
 * </PermissionGuard>
 *
 * Multiple permissions (AND logic):
 * <PermissionGuard permissions={['members.edit', 'members.delete']} requireAll>
 *   <Button>Edit</Button>
 * </PermissionGuard>
 *
 * @param {string} permission - Single permission to check
 * @param {string} requires - Alias for permission (backward compatibility)
 * @param {string[]} permissions - Array of permissions to check
 * @param {boolean} requireAll - If true, user must have ALL permissions (default: false, means ANY)
 * @param {React.ReactNode} children - Component(s) to render if permitted
 * @param {React.ReactNode} fallback - Optional fallback to render if not permitted (default: null)
 */
const PermissionGuard = ({ permission, requires, permissions, requireAll = false, children, fallback = null }) => {
  const { user } = useAuth();

  // If no user, don't render (safety check)
  if (!user) {
    return fallback;
  }

  // SUPER_ADMIN has access to everything
  if (user.roles?.includes('SUPER_ADMIN')) {
    return children;
  }

  // Get user's permissions
  const userPermissions = user.permissions || [];
  
  // Use permission or requires (alias)
  const targetPermission = permission || requires;

  // Single permission check
  if (targetPermission) {
    const hasPermission = userPermissions.includes(targetPermission);
    return hasPermission ? children : fallback;
  }

  // Multiple permissions check
  if (permissions && Array.isArray(permissions)) {
    if (requireAll) {
      // AND logic: user must have ALL permissions
      const hasAllPermissions = permissions.every((perm) => userPermissions.includes(perm));
      return hasAllPermissions ? children : fallback;
    } else {
      // OR logic: user must have ANY permission
      const hasAnyPermission = permissions.some((perm) => userPermissions.includes(perm));
      return hasAnyPermission ? children : fallback;
    }
  }

  // No permission specified, render by default (dangerous!)
  console.warn('⚠️ PermissionGuard used without permission prop');
  return children;
};

/**
 * Hook version for conditional logic
 *
 * Usage:
 * const canDelete = usePermission('members.delete');
 * if (canDelete) { ... }
 */
export const usePermission = (permission) => {
  const { user } = useAuth();

  if (!user) return false;

  // SUPER_ADMIN has all permissions
  if (user.roles?.includes('SUPER_ADMIN')) return true;

  const userPermissions = user.permissions || [];
  return userPermissions.includes(permission);
};

/**
 * Hook for checking multiple permissions
 *
 * Usage:
 * const canEdit = usePermissions(['members.edit', 'members.update'], true);
 */
export const usePermissions = (permissions, requireAll = false) => {
  const { user } = useAuth();

  if (!user) return false;

  // SUPER_ADMIN has all permissions
  if (user.roles?.includes('SUPER_ADMIN')) return true;

  const userPermissions = user.permissions || [];

  if (requireAll) {
    return permissions.every((perm) => userPermissions.includes(perm));
  } else {
    return permissions.some((perm) => userPermissions.includes(perm));
  }
};

export default PermissionGuard;
