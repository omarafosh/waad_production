import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { TableRefreshLayout } from 'contexts/TableRefreshContext';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const BenefitPackagesList = Loadable(lazy(() => import('pages/benefit-packages/BenefitPackagesList')));
const BenefitPackageCreate = Loadable(lazy(() => import('pages/benefit-packages/BenefitPackageCreate')));
const BenefitPackageEdit = Loadable(lazy(() => import('pages/benefit-packages/BenefitPackageEdit')));
const BenefitPackageView = Loadable(lazy(() => import('pages/benefit-packages/BenefitPackageView')));

const BenefitPoliciesList = Loadable(lazy(() => import('pages/benefit-policies/BenefitPoliciesList')));
const BenefitPolicyView = Loadable(lazy(() => import('pages/benefit-policies/BenefitPolicyView')));
const BenefitPolicyCreate = Loadable(lazy(() => import('pages/benefit-policies/BenefitPolicyCreate')));
const BenefitPolicyEdit = Loadable(lazy(() => import('pages/benefit-policies/BenefitPolicyEdit')));

const BenefitRoutes = [
    // Benefit Packages
    {
        path: 'benefit-packages',
        element: <TableRefreshLayout />,
        children: [
            createRoute({ path: '', element: BenefitPackagesList, roles: ROLES.REVIEWER_ACCESS }),
            createRoute({ path: 'create', element: BenefitPackageCreate, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'edit/:id', element: BenefitPackageEdit, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'view/:id', element: BenefitPackageView, roles: ROLES.REVIEWER_ACCESS })
        ]
    },
    // Benefit Policies
    {
        path: 'benefit-policies',
        children: [
            createRoute({ path: '', element: BenefitPoliciesList, roles: [...ROLES.ADMIN_INSURANCE, 'EMPLOYER'] }),
            createRoute({ path: 'create', element: BenefitPolicyCreate, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'edit/:id', element: BenefitPolicyEdit, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: ':id', element: BenefitPolicyView, roles: [...ROLES.ADMIN_INSURANCE, 'EMPLOYER'] })
        ]
    }
];

export default BenefitRoutes;
