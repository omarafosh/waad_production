import PropTypes from 'prop-types';
import { useRBAC } from 'api/rbac';

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children based on user permissions.
 * Supports single permission or array of permissions (OR logic).
 * 
 * Usage:
 * <PermissionGuard permission="CLAIM_VIEW">
 *   <Button>View Claim</Button>
 * </PermissionGuard>
 */
const PermissionGuard = ({
    permission,
    permissions,
    requireAll = false,
    fallback = null,
    children
}) => {
    const { hasPermission, isInitialized } = useRBAC();

    // Don't render anything until RBAC is initialized
    if (!isInitialized) return null;

    const permsToCheck = permissions || (permission ? [permission] : []);

    if (permsToCheck.length === 0) return children;

    const hasAccess = requireAll
        ? permsToCheck.every(p => hasPermission(p))
        : permsToCheck.some(p => hasPermission(p));

    if (!hasAccess) {
        return fallback;
    }

    return children;
};

PermissionGuard.propTypes = {
    permission: PropTypes.string,
    permissions: PropTypes.arrayOf(PropTypes.string),
    requireAll: PropTypes.bool,
    fallback: PropTypes.node,
    children: PropTypes.node
};

export default PermissionGuard;
