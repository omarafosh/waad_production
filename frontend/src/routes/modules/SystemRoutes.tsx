import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { TableRefreshProvider } from 'contexts/TableRefreshContext';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const Dashboard = Loadable(lazy(() => import('pages/dashboard')));
const CompaniesList = Loadable(lazy(() => import('pages/companies')));
const ReviewerCompaniesList = Loadable(lazy(() => import('pages/reviewer-companies')));
const AdminCompaniesList = Loadable(lazy(() => import('pages/admin/companies')));
const AdminRolesList = Loadable(lazy(() => import('pages/admin/roles')));
const MedicalServiceSandbox = Loadable(lazy(() => import('pages/admin/tools/MedicalServiceSandbox')));
const Settings = Loadable(lazy(() => import('pages/settings')));
const SystemSettings = Loadable(lazy(() => import('pages/settings/system'))); // Renamed import
const ProfileOverview = Loadable(lazy(() => import('pages/profile/ProfileOverview')));
const AccountSettings = Loadable(lazy(() => import('pages/profile/AccountSettings')));
const AuditLog = Loadable(lazy(() => import('pages/audit')));
const EntityHistoryDashboard = Loadable(lazy(() => import('pages/audit/EntityHistoryDashboard')));
const DocumentsLibrary = Loadable(lazy(() => import('pages/documents/DocumentsLibrary')));
const UnderDevelopment = Loadable(lazy(() => import('pages/under-development')));

// Error Pages
const NoAccess = Loadable(lazy(() => import('pages/errors/NoAccess.jsx')));
const Error403 = Loadable(lazy(() => import('pages/errors/Forbidden403.jsx')));
const Error404 = Loadable(lazy(() => import('pages/errors/NotFound404.jsx')));
const Error500 = Loadable(lazy(() => import('pages/errors/ServerError500.jsx')));

export const DashboardRoute = createRoute({
    path: 'dashboard',
    element: Dashboard,
    roles: ROLES.ADMIN_EMPLOYER
});

export const AdminRoutes = [
    // Companies
    createRoute({ path: 'companies', element: CompaniesList, roles: ['SUPER_ADMIN'] }),
    createRoute({ path: 'reviewer-companies', element: ReviewerCompaniesList, roles: ROLES.REVIEWER_ACCESS }),
    // Admin Namespace
    {
        path: 'admin',
        children: [
            createRoute({ path: 'companies', element: AdminCompaniesList, roles: ['SUPER_ADMIN'] }),
            createRoute({ path: 'roles', element: AdminRolesList, roles: ['SUPER_ADMIN'] }),
            createRoute({ path: 'tools/service-import', element: MedicalServiceSandbox, roles: ['SUPER_ADMIN'] })
        ]
    }
];

export const SettingsRoutes = {
    path: 'settings', // /settings
    children: [
        createRoute({ path: '', element: Settings, roles: ROLES.ADMIN_EMPLOYER }),
        createRoute({ path: 'system', element: SystemSettings, roles: ROLES.ALL_ADMINS }) // /settings/system
    ]
};

export const ProfileRoutes = {
    path: 'profile',
    children: [
        createRoute({ path: '', element: ProfileOverview }), // Open access
        createRoute({ path: 'account', element: AccountSettings }) // Open access
    ]
};

export const UtilityRoutes = [
    // Audit
    createRoute({
        path: 'audit',
        element: function AuditWithProvider() { return <TableRefreshProvider><AuditLog /></TableRefreshProvider> },
        permissions: ['VIEW_AUDIT_LOGS'],
        requireAll: false
    }),
    createRoute({
        path: 'audit/history',
        element: function HistoryWithProvider() { return <TableRefreshProvider><EntityHistoryDashboard /></TableRefreshProvider> },
        permissions: ['VIEW_AUDIT_LOGS'],
        requireAll: false
    }),
    // Documents
    createRoute({
        path: 'documents',
        element: function DocsWithProvider() { return <TableRefreshProvider><DocumentsLibrary /></TableRefreshProvider> },
        permissions: ['claims.view', 'pre_approvals.view'],
        requireAll: false
    }),
    // Under Dev
    createRoute({ path: 'under-development', element: UnderDevelopment }),
    // Errors
    { path: '403', element: <NoAccess /> },
    { path: 'forbidden', element: <Error403 /> },
    { path: '404', element: <Error404 /> },
    { path: '500', element: <Error500 /> },
    { path: '*', element: <Error404 /> }
];

// Note: For Documents, I'll hardcode it to match MainRoutes exactly in MainRoutes.jsx if createRoute is limited,
// OR I can accept the limitation that 'claims.view' is enough for now,
// OR I can use the manual route definition approach for this edge case.
