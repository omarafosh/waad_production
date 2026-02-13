import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const ReportsPage = Loadable(lazy(() => import('pages/reports')));
const EmployerDashboard = Loadable(lazy(() => import('pages/reports/employer-dashboard')));
const ClaimsReport = Loadable(lazy(() => import('pages/reports/claims')));
const PreApprovalsReport = Loadable(lazy(() => import('pages/reports/pre-approvals')));
const VisitsReport = Loadable(lazy(() => import('pages/reports/visits')));
const BenefitPolicyReport = Loadable(lazy(() => import('pages/reports/benefit-policy')));
const BeneficiariesReports = Loadable(lazy(() => import('pages/reports/BeneficiariesReports')));
const FinancialReports = Loadable(lazy(() => import('pages/reports/FinancialReports')));
const ProviderReports = Loadable(lazy(() => import('pages/reports/ProviderReports')));
const ComingSoonReport = Loadable(lazy(() => import('pages/reports/ComingSoonReport')));

const REPORT_VIEWERS = ['SUPER_ADMIN', 'ADMIN', 'INSURANCE_COMPANY', 'EMPLOYER_ADMIN'];
const REPORT_REVIEWERS = ['SUPER_ADMIN', 'ADMIN', 'EMPLOYER_ADMIN', 'REVIEWER', 'PROVIDER'];

const ReportRoutes = {
    path: 'reports',
    children: [
        createRoute({ path: '', element: ReportsPage, roles: ['ADMIN', 'SUPER_ADMIN', 'INSURANCE_COMPANY', 'EMPLOYER_ADMIN', 'PROVIDER'] }),
        createRoute({ path: 'employer-dashboard', element: EmployerDashboard, roles: ['ADMIN', 'SUPER_ADMIN', 'EMPLOYER_ADMIN'] }),
        createRoute({ path: 'claims', element: ClaimsReport, roles: REPORT_REVIEWERS }),
        createRoute({ path: 'pre-approvals', element: PreApprovalsReport, roles: REPORT_REVIEWERS }),
        createRoute({ path: 'visits', element: VisitsReport, roles: REPORT_REVIEWERS }),
        createRoute({ path: 'benefit-policy', element: BenefitPolicyReport, roles: REPORT_REVIEWERS }),
        createRoute({ path: 'beneficiaries', element: BeneficiariesReports, roles: REPORT_VIEWERS }),
        createRoute({ path: 'financial', element: FinancialReports, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] }),
        createRoute({ path: 'providers', element: ProviderReports, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'INSURANCE_ADMIN'] }),
        createRoute({ path: 'coming-soon/:reportId', element: ComingSoonReport, roles: ['SUPER_ADMIN', 'ADMIN', 'INSURANCE_ADMIN', 'REVIEWER'] })
    ]
};

export default ReportRoutes;
