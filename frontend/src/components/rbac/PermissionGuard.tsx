import { ReactNode } from 'react';
import { useRBAC } from 'store';

interface PermissionGuardProps {
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    fallback?: ReactNode;
    children?: ReactNode;
}

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
}: PermissionGuardProps) => {
    const { hasPermission, isInitialized } = useRBAC();

    // Don't render anything until RBAC is initialized
    if (!isInitialized) return null;

    const permsToCheck = permissions || (permission ? [permission] : []);

    if (permsToCheck.length === 0) return children;

    const hasAccess = requireAll
        ? permsToCheck.every((perm) => hasPermission(perm))
        : permsToCheck.some((perm) => hasPermission(perm));

    if (!hasAccess) {
        return fallback;
    }

    return children;
};

export const usePermission = (permission: string): boolean => {
    const { hasPermission, isInitialized } = useRBAC();

    if (!isInitialized) return false;
    return hasPermission(permission);
};

export const usePermissions = (permissions: string[], requireAll: boolean = false): boolean => {
    const { hasPermission, isInitialized } = useRBAC();

    if (!isInitialized) return false;

    return requireAll
        ? permissions.every((perm) => hasPermission(perm))
        : permissions.some((perm) => hasPermission(perm));
};

export default PermissionGuard;
