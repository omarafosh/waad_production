import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const EmployersList = Loadable(lazy(() => import('pages/employers/EmployersList')));
const EmployerCreate = Loadable(lazy(() => import('pages/employers/EmployerCreate')));
const EmployerEdit = Loadable(lazy(() => import('pages/employers/EmployerEdit')));
const EmployerView = Loadable(lazy(() => import('pages/employers/EmployerView')));
const EmployerContracts = Loadable(lazy(() => import('pages/employers/EmployerContracts')));
const EmployerContractDetails = Loadable(lazy(() => import('pages/employers/EmployerContractDetails')));

const EmployerRoutes = {
    path: 'employers',
    children: [
        createRoute({
            path: '',
            element: EmployersList,
            roles: ROLES.REVIEWER_ACCESS
        }),
        createRoute({
            path: 'create',
            element: EmployerCreate,
            roles: ROLES.REVIEWER_ACCESS
        }),
        createRoute({
            path: 'edit/:id',
            element: EmployerEdit,
            roles: ROLES.REVIEWER_ACCESS
        }),
        createRoute({
            path: 'contracts',
            element: EmployerContracts,
            permission: 'benefit_policies.view'
        }),
        createRoute({
            path: 'contracts/:id',
            element: EmployerContractDetails,
            permission: 'benefit_policies.view'
        }),
        createRoute({
            path: ':id',
            element: EmployerView,
            roles: ROLES.REVIEWER_ACCESS
        })
    ]
};

export default EmployerRoutes;
