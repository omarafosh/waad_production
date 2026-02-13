import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const PreApprovalsList = Loadable(lazy(() => import('pages/pre-approvals/PreApprovalsList')));
const PreApprovalCreate = Loadable(lazy(() => import('pages/pre-approvals/PreApprovalCreate')));
const PreApprovalEdit = Loadable(lazy(() => import('pages/pre-approvals/PreApprovalEdit')));
const PreApprovalView = Loadable(lazy(() => import('pages/pre-approvals/PreApprovalView')));
const PreApprovalsInbox = Loadable(lazy(() => import('pages/pre-approvals/PreApprovalsInboxPro')));
const PreAuthAuditPage = Loadable(lazy(() => import('pages/pre-approvals/PreAuthAuditPage')));
const PreAuthDashboard = Loadable(lazy(() => import('pages/pre-approvals/PreAuthDashboard')));

const PRE_AUTH_ROLES = ['INSURANCE_ADMIN', 'REVIEWER', 'PROVIDER'];
const PRE_AUTH_ADMINS = ['INSURANCE_ADMIN', 'REVIEWER'];

const PreApprovalRoutes = {
    path: 'pre-approvals',
    children: [
        createRoute({
            path: '',
            element: PreApprovalsList,
            roles: PRE_AUTH_ROLES
        }),
        createRoute({
            path: 'dashboard',
            element: PreAuthDashboard,
            roles: PRE_AUTH_ADMINS
        }),
        createRoute({
            path: 'inbox',
            element: PreApprovalsInbox,
            roles: PRE_AUTH_ADMINS
        }),
        createRoute({
            path: 'add',
            element: PreApprovalCreate,
            roles: ['INSURANCE_ADMIN', 'EMPLOYER_ADMIN', 'PROVIDER']
        }),
        createRoute({
            path: 'edit/:id',
            element: PreApprovalEdit,
            roles: PRE_AUTH_ADMINS
        }),
        createRoute({
            path: ':id',
            element: PreApprovalView,
            roles: PRE_AUTH_ROLES
        }),
        createRoute({
            path: ':id/audit',
            element: PreAuthAuditPage,
            roles: PRE_AUTH_ADMINS
        })
    ]
};

export default PreApprovalRoutes;
