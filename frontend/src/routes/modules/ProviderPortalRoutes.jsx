import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const ProviderEligibilityCheck = Loadable(lazy(() => import('pages/provider/ProviderEligibilityCheck')));
const ProviderVisitLog = Loadable(lazy(() => import('pages/provider/ProviderVisitLog')));
const ProviderClaimsSubmission = Loadable(lazy(() => import('pages/provider/ProviderClaimsSubmission')));
const ProviderPreApprovalSubmission = Loadable(lazy(() => import('pages/provider/ProviderPreApprovalSubmission')));
const ProviderDocuments = Loadable(lazy(() => import('pages/provider/ProviderDocuments')));

const PORTAL_ROLES = ['PROVIDER', 'SUPER_ADMIN', 'INSURANCE_ADMIN'];

const ProviderPortalRoutes = {
    path: 'provider',
    children: [
        createRoute({
            path: 'eligibility-check',
            element: ProviderEligibilityCheck,
            roles: PORTAL_ROLES
        }),
        createRoute({
            path: 'visits',
            element: ProviderVisitLog,
            roles: PORTAL_ROLES
        }),
        createRoute({
            path: 'claims/submit',
            element: ProviderClaimsSubmission,
            roles: PORTAL_ROLES
        }),
        createRoute({
            path: 'pre-approvals/submit',
            element: ProviderPreApprovalSubmission,
            roles: PORTAL_ROLES
        }),
        createRoute({
            path: 'documents',
            element: ProviderDocuments,
            roles: PORTAL_ROLES
        })
    ]
};

export default ProviderPortalRoutes;
