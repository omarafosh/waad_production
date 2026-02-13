import PropTypes from 'prop-types';
import { useRBAC } from 'api/rbac';

/**
 * ActionGuard Component
 * 
 * Safely guards UI actions (Buttons, Links, etc.) based on RBAC permissions.
 * Optimized to use the central useRBAC hook.
 *
 * Usage:
 * <ActionGuard permission="MEMBER_UPDATE">
 *   <Button>Edit Member</Button>
 * </ActionGuard>
 *
 * @param {string|string[]} permission - Required permission(s) string or array
 * @param {boolean} requireAll - If true, user must have ALL permissions in the array
 * @param {React.ReactNode} children - Elements to render if permitted
 * @param {React.ReactNode} fallback - Optional elements to render if NOT permitted (default: null)
 */
const ActionGuard = ({ permission, permissions, requireAll = false, children, fallback = null }) => {
    const { hasPermission, hasAllPermissions, isInitialized } = useRBAC();

    // If RBAC is not yet initialized, show nothing to prevent flashes
    if (!isInitialized) return null;

    const targetPermissions = permissions || (Array.isArray(permission) ? permission : [permission]);

    const isPermitted = requireAll
        ? hasAllPermissions(targetPermissions)
        : hasPermission(targetPermissions);

    return isPermitted ? children : fallback;
};

ActionGuard.propTypes = {
    permission: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    permissions: PropTypes.arrayOf(PropTypes.string),
    requireAll: PropTypes.boolean,
    children: PropTypes.node,
    fallback: PropTypes.node
};

export default ActionGuard;
