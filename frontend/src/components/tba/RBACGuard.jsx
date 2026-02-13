import React from 'react';
import PropTypes from 'prop-types';
import { useRBAC } from 'api/rbac';

// ==============================|| RBAC GUARD - CONSOLIDATED PERMISSION CONTROL ||============================== //

/**
 * RBACGuard - Controls visibility based on user roles and permissions
 * 
 * Now uses the UNIFIED api/rbac store.
 */
export default function RBACGuard({
  requiredRoles = [],
  requiredPermissions = [],
  permissions = [],
  permission = null,
  requireAll = false,
  fallback = null,
  children
}) {
  const { hasRole, hasPermission, hasAllPermissions, hasAnyPermission, isInitialized, isSuperAdmin } = useRBAC();

  // 1. Loading state
  if (!isInitialized) return null;

  // 2. SUPER_ADMIN bypass
  if (isSuperAdmin) return children;

  // 3. Normalization
  const permsToCheck = [...requiredPermissions, ...permissions];
  if (permission) permsToCheck.push(permission);

  // 4. Access Evaluation
  let hasAccess = true;

  // Check roles if specified
  if (requiredRoles.length > 0) {
    hasAccess = requireAll
      ? requiredRoles.every(r => hasRole(r))
      : requiredRoles.some(r => hasRole(r));
  }

  // Check permissions if specified and roles passed (or weren't specified)
  if (hasAccess && permsToCheck.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permsToCheck)
      : hasAnyPermission(permsToCheck);
  }

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
