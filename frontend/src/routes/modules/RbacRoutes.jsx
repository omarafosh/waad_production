import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { TableRefreshProvider } from 'contexts/TableRefreshContext';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
// Lazy Imports
const RbacDashboard = Loadable(lazy(() => import('pages/rbac/index.jsx')));
const RbacUsersList = Loadable(lazy(() => import('pages/rbac/users/index.jsx')));
const RbacUserDetails = Loadable(lazy(() => import('pages/rbac/users/UserDetails.jsx')));
const RbacUserCreate = Loadable(lazy(() => import('pages/rbac/users/UserCreate.jsx')));
const RbacUserEdit = Loadable(lazy(() => import('pages/rbac/users/UserEdit.jsx')));
const RbacRolesList = Loadable(lazy(() => import('pages/rbac/roles/index.jsx')));
const RbacRoleDetails = Loadable(lazy(() => import('pages/rbac/roles/RoleDetails.jsx')));
// const PermissionMatrix = Loadable(lazy(() => import('pages/rbac/PermissionMatrix.jsx'))); // REMOVE
// const PermissionsList = Loadable(lazy(() => import('pages/rbac/PermissionsList.jsx'))); // REMOVE

const RbacRoutes = {
    path: 'rbac',
    children: [
        createRoute({
            index: true,
            element: RbacDashboard,
            roles: ROLES.ALL_ADMINS
        }),
        // Users
        {
            path: 'users',
            children: [
                createRoute({
                    index: true,
                    element: RbacUsersList,
                    roles: ROLES.ALL_ADMINS
                }),
                createRoute({
                    path: 'create',
                    element: RbacUserCreate,
                    roles: ['SUPER_ADMIN']
                }),
                createRoute({
                    path: ':id/edit',
                    element: RbacUserEdit,
                    roles: ['SUPER_ADMIN']
                }),
                createRoute({
                    path: ':id',
                    element: RbacUserDetails,
                    roles: ROLES.ALL_ADMINS
                })
            ]
        },
        // Roles
        {
            path: 'roles',
            children: [
                createRoute({
                    index: true,
                    element: RbacRolesList,
                    roles: ROLES.ALL_ADMINS
                }),
                createRoute({
                    path: ':id',
                    element: RbacRoleDetails,
                    roles: ROLES.ALL_ADMINS
                })
            ]
        }
    ]
};

export default RbacRoutes;
