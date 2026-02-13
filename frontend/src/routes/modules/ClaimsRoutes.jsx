import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const ClaimsList = Loadable(lazy(() => import('pages/claims/ClaimsList')));
const ClaimCreate = Loadable(lazy(() => import('pages/claims/ClaimCreate')));
const ClaimEdit = Loadable(lazy(() => import('pages/claims/ClaimEdit')));
const ClaimView = Loadable(lazy(() => import('pages/claims/ClaimView')));
const ClaimsInbox = Loadable(lazy(() => import('pages/claims/ClaimsInboxPro')));
const ApprovalsDashboard = Loadable(lazy(() => import('pages/approvals/ApprovalsDashboard')));

const ClaimsRoutes = [
    // Claims Module
    {
        path: 'claims',
        children: [
            createRoute({
                path: '',
                element: ClaimsList,
                roles: [...ROLES.ADMIN_EMPLOYER, 'REVIEWER', 'PROVIDER']
            }),
            createRoute({
                path: 'inbox',
                element: ClaimsInbox,
                roles: ['ADMIN', 'REVIEWER']
            }),
            createRoute({
                path: 'add',
                element: ClaimCreate,
                roles: ROLES.ADMIN_EMPLOYER
            }),
            createRoute({
                path: 'edit/:id',
                element: ClaimEdit,
                roles: [...ROLES.ADMIN_EMPLOYER, 'PROVIDER']
            }),
            createRoute({
                path: ':id',
                element: ClaimView,
                roles: [...ROLES.ADMIN_EMPLOYER, 'REVIEWER', 'PROVIDER']
            })
        ]
    },
    // Approvals Dashboard
    {
        path: 'approvals/dashboard',
        element: (
            <ApprovalsDashboard />
        ),
        // Note: MainRoutes had this wrapped in RouteGuard manually, we can use createRoute but it expects a Component.
        // We can just define it as a standard object if custom wrapping is needed, 
        // but createRoute handles it.
        ...createRoute({
            path: 'approvals/dashboard',
            element: ApprovalsDashboard,
            roles: ROLES.REVIEWER_ACCESS
        })
    }
];

export default ClaimsRoutes;
