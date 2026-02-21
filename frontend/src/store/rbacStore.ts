import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    SystemRole,
    getPrivilegeLevel,
    isInsuranceAdminOrHigher as isInsuranceAdminOrHigherUtil,
    hasAccessToDomain as hasAccessToDomainUtil,
    getAssignableRoles as getAssignableRolesUtil,
    canModifyRole as canModifyRoleUtil,
    ROLE_PERMISSIONS
} from 'constants/rbac';

// ==============================|| RBAC STORE - ROLE-BASED ACCESS CONTROL ||============================== //

/**
 * Zustand store for RBAC (Role-Based Access Control)
 *
 * RBAC HARDENING (2026-01-13):
 * - Role hierarchy enforcement
 * - SUPER_ADMIN protection
 * - Domain-based access control
 * - Privilege escalation prevention
 * 
 * REFACTOR (2026-02-20):
 * - Moved from api/rbac.ts to store/rbacStore.ts
 * - Added proper persist middleware for robustness
 */

const STORAGE_KEYS = {
    ROLES: 'userRoles',
    USER: 'userData',
    TOKEN: 'serviceToken',
    PERMISSIONS: 'userPermissions'
};

export interface User {
    id: string | number;
    username: string;
    email: string;
    roles: string[];
    permissions?: string[];
    [key: string]: any;
}

export interface RBACState {
    roles: string[];
    permissions: string[];
    user: User | null;
    isInitialized: boolean;
}

export interface RBACActions {
    setRoles: (roles: string[]) => void;
    setUser: (user: User | null) => void;
    setPermissions: (permissions: string[]) => void;
    initialize: (userData?: any) => void;
    clear: () => void;

    isSuperAdmin: () => boolean;
    getPrimaryRole: () => string | null;
    hasRole: (allowedRoles: string[]) => boolean;
    hasPermission: (permissionName: string) => boolean;
    hasAnyPermission: (permissionNames: string[]) => boolean;
    hasAllPermissions: (permissionNames: string[]) => boolean;
    isEmployerRole: () => boolean;

    hasAccessToDomain: (domain: string) => boolean;
    canManageRbac: () => boolean;
    canManageSystem: () => boolean;
    canModifyUserWithRole: (targetRole: string) => boolean;

    canAssignRole: (roleToAssign: string) => boolean;
    getAssignableRoles: () => string[];
    getPrivilegeLevel: () => number;
    isInsuranceAdminOrHigher: () => boolean;
}

export type RBACStore = RBACState & RBACActions;

export const useRBACStore = create<RBACStore>()(
    persist(
        (set, get) => ({
            // State
            roles: [],
            permissions: [],
            user: null,
            isInitialized: false,

            // Actions
            setRoles: (roles: string[]) => {
                set({ roles });
            },

            setUser: (user: User | null) => {
                set({ user });
            },

            setPermissions: (permissions: string[]) => {
                set({ permissions });
            },

            /**
             * Initialize RBAC state from backend user data or storage
             */
            initialize: (userData: any = null) => {
                try {
                    let rawRoles: any[] = [];
                    let user: User | null = null;
                    let rawPermissions: any[] = [];

                    if (userData) {
                        // Initialize from backend response (login)
                        rawRoles = userData.roles || [];
                        user = userData;
                        rawPermissions = userData.permissions || [];
                    } else {
                        // Initialized from persisted state (middleware handles loading, 
                        // but we keep this for manual re-hydration logic if needed)
                        const state = get();
                        if (state.isInitialized) return; // Already initialized by persist

                        // Fallback for direct localStorage check (for migration/debug)
                        const rolesStr = localStorage.getItem(STORAGE_KEYS.ROLES);
                        rawRoles = rolesStr ? JSON.parse(rolesStr) : [];
                        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
                        user = userStr ? JSON.parse(userStr) : null;
                        const permissionsStr = localStorage.getItem(STORAGE_KEYS.PERMISSIONS);
                        rawPermissions = permissionsStr ? JSON.parse(permissionsStr) : [];
                    }

                    // 1. ROLE NORMALIZATION (Strip 'ROLE_' prefix)
                    const normalizedRoles = rawRoles.map(role => {
                        const roleStr = typeof role === 'string' ? role : (role?.name || '');
                        return roleStr.replace(/^ROLE_/, '');
                    });

                    // 2. PERMISSION HYDRATION (Merge Backend + Frontend Defaults)
                    const hydratedPermissions = new Set<string>();

                    // Add permissions from backend
                    rawPermissions.forEach(p => {
                        const pName = typeof p === 'string' ? p : p?.name;
                        if (pName) hydratedPermissions.add(pName);
                    });

                    // Hydrate with defaults based on normalized roles
                    normalizedRoles.forEach(role => {
                        // @ts-ignore
                        const defaults = ROLE_PERMISSIONS[role] || [];
                        defaults.forEach((p: string) => hydratedPermissions.add(p));
                    });

                    const finalPermissions = Array.from(hydratedPermissions);

                    // 3. COMPLETE HYDRATION (Update user object for downstream guards)
                    const hydratedUser = user ? {
                        ...user,
                        roles: normalizedRoles,
                        permissions: finalPermissions
                    } : null;

                    set({
                        roles: normalizedRoles,
                        permissions: finalPermissions,
                        user: hydratedUser,
                        isInitialized: true
                    });

                    console.log('🔒 RBAC Initialized (Zustand Persist Mode):', {
                        roles: normalizedRoles,
                        permissionCount: finalPermissions.length
                    });
                } catch (error) {
                    console.error('❌ Failed to initialize RBAC:', error);
                    set({ isInitialized: true });
                }
            },

            /**
             * Clear RBAC state (on logout)
             */
            clear: () => {
                // Clear manual keys for compatibility
                localStorage.removeItem(STORAGE_KEYS.ROLES);
                localStorage.removeItem(STORAGE_KEYS.USER);
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
                localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
                localStorage.removeItem('selectedEmployerId');
                localStorage.removeItem('selectedEmployerName');

                set({
                    roles: [],
                    permissions: [],
                    user: null,
                    isInitialized: false
                });
            },

            /**
             * Getters and Helpers
             */
            isSuperAdmin: () => {
                const { roles } = get();
                return roles.includes('SUPER_ADMIN');
            },

            getPrimaryRole: () => {
                const { roles } = get();
                return roles.length > 0 ? roles[0] : null;
            },

            hasRole: (allowedRoles: string[]) => {
                const { roles } = get();
                const primaryRole = roles[0];
                if (primaryRole === 'SUPER_ADMIN') return true;
                if (!allowedRoles || allowedRoles.length === 0) return true;
                return allowedRoles.includes(primaryRole);
            },

            hasPermission: (permissionName: string) => {
                const { permissions, roles } = get();
                if (roles.includes('SUPER_ADMIN')) return true;
                return permissions.some((p: any) => (p?.name || p) === permissionName);
            },

            hasAnyPermission: (permissionNames: string[]) => {
                const { permissions, roles } = get();
                if (roles.includes('SUPER_ADMIN')) return true;
                return permissionNames.some(pn => permissions.some((p: any) => (p?.name || p) === pn));
            },

            hasAllPermissions: (permissionNames: string[]) => {
                const { permissions, roles } = get();
                if (roles.includes('SUPER_ADMIN')) return true;
                return permissionNames.every(pn => permissions.some((p: any) => (p?.name || p) === pn));
            },

            isEmployerRole: () => {
                const { roles } = get();
                return roles[0] === 'EMPLOYER';
            },

            hasAccessToDomain: (domain: string) => {
                const { roles } = get();
                const primaryRole = roles[0];
                if (primaryRole === SystemRole.SUPER_ADMIN) return true;
                return hasAccessToDomainUtil(primaryRole, domain);
            },

            canManageRbac: () => {
                const { roles } = get();
                return roles[0] === SystemRole.SUPER_ADMIN;
            },

            canManageSystem: () => {
                const { roles } = get();
                return roles[0] === SystemRole.SUPER_ADMIN;
            },

            canModifyUserWithRole: (targetRole: string) => {
                const { roles } = get();
                const primaryRole = roles[0];
                return canModifyRoleUtil(primaryRole, targetRole);
            },

            canAssignRole: (roleToAssign: string) => {
                const { roles } = get();
                const primaryRole = roles[0];
                const assignableRoles = getAssignableRolesUtil(primaryRole);
                // @ts-ignore
                return assignableRoles.includes(roleToAssign);
            },

            getAssignableRoles: () => {
                const { roles } = get();
                const primaryRole = roles[0];
                return getAssignableRolesUtil(primaryRole);
            },

            getPrivilegeLevel: () => {
                const { roles } = get();
                const primaryRole = roles[0];
                return getPrivilegeLevel(primaryRole);
            },

            isInsuranceAdminOrHigher: () => {
                const { roles } = get();
                const primaryRole = roles[0];
                return isInsuranceAdminOrHigherUtil(primaryRole);
            }
        }),
        {
            name: 'tba-rbac-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// ==============================|| EXPORTED HOOKS ||============================== //

export const useRole = () => {
    const roles = useRBACStore((state) => state.roles);
    return roles.length > 0 ? roles[0] : null;
};

export const useRoles = () => {
    return useRBACStore((state) => state.roles);
};

export const useUser = () => {
    return useRBACStore((state) => state.user);
};

export const useRBAC = () => {
    const store = useRBACStore();

    return {
        ...store,
        primaryRole: store.getPrimaryRole(),
        isSuperAdmin: store.isSuperAdmin(),
        isEmployerRole: store.isEmployerRole(),
        isInsuranceAdminOrHigher: store.isInsuranceAdminOrHigher(),
        isAuthenticated: store.user !== null,
        // Keep compatibility for any manual checks
        employerId: null,
        canSwitch: false
    };
};

export default useRBACStore;
