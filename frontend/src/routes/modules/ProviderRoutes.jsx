import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const ProvidersList = Loadable(lazy(() => import('pages/providers/ProvidersList')));
const ProviderCreate = Loadable(lazy(() => import('pages/providers/ProviderCreate')));
const ProviderEdit = Loadable(lazy(() => import('pages/providers/ProviderEdit')));
const ProviderView = Loadable(lazy(() => import('pages/providers/ProviderView')));
const ProviderContractsList = Loadable(lazy(() => import('pages/provider-contracts')));
const ProviderContractView = Loadable(lazy(() => import('pages/provider-contracts/ProviderContractView')));
const ProviderContractCreate = Loadable(lazy(() => import('pages/provider-contracts/ProviderContractCreate')));

const ProviderRoutes = [
    // Providers Module
    {
        path: 'providers',
        children: [
            createRoute({
                path: '',
                element: ProvidersList,
                roles: ROLES.ADMIN_EMPLOYER
            }),
            createRoute({
                path: 'add',
                element: ProviderCreate,
                roles: ROLES.REVIEWER_ACCESS
            }),
            createRoute({
                path: 'edit/:id',
                element: ProviderEdit,
                roles: ROLES.REVIEWER_ACCESS
            }),
            createRoute({
                path: ':id',
                element: ProviderView,
                roles: ROLES.ADMIN_EMPLOYER
            })
        ]
    },
    // Provider Contracts Module
    {
        path: 'provider-contracts',
        children: [
            createRoute({
                path: '',
                element: ProviderContractsList,
                roles: ROLES.REVIEWER_ACCESS
            }),
            createRoute({
                path: 'create',
                element: ProviderContractCreate,
                roles: ROLES.ADMIN_INSURANCE
            }),
            createRoute({
                path: ':id',
                element: ProviderContractView,
                roles: ROLES.REVIEWER_ACCESS
            })
        ]
    }
];

export default ProviderRoutes;
