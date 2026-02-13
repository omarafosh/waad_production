import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const SettlementBatchesList = Loadable(lazy(() => import('pages/settlement/SettlementBatchesList')));
const CreateSettlementBatch = Loadable(lazy(() => import('pages/settlement/CreateSettlementBatch')));
const SettlementBatchView = Loadable(lazy(() => import('pages/settlement/SettlementBatchView')));
const ProviderAccountsList = Loadable(lazy(() => import('pages/settlement/ProviderAccountsList')));

const FINANCE_ROLES = ['ADMIN', 'FINANCE', 'INSURANCE_ADMIN'];

const SettlementRoutes = {
    path: 'settlement',
    children: [
        createRoute({
            path: 'batches',
            element: SettlementBatchesList,
            roles: FINANCE_ROLES
        }),
        createRoute({
            path: 'batches/create',
            element: CreateSettlementBatch,
            roles: FINANCE_ROLES
        }),
        createRoute({
            path: 'batches/:id',
            element: SettlementBatchView,
            roles: FINANCE_ROLES
        }),
        createRoute({
            path: 'accounts',
            element: ProviderAccountsList,
            roles: FINANCE_ROLES
        })
    ]
};

export default SettlementRoutes;
