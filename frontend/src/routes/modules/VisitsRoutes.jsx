import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const VisitsList = Loadable(lazy(() => import('pages/visits/VisitsList')));
const VisitCreate = Loadable(lazy(() => import('pages/visits/VisitCreate')));
const VisitEdit = Loadable(lazy(() => import('pages/visits/VisitEdit')));
const VisitView = Loadable(lazy(() => import('pages/visits/VisitView')));

const VisitsRoutes = {
    path: 'visits',
    children: [
        createRoute({
            path: '',
            element: VisitsList,
            roles: ['ADMIN', 'INSURANCE_COMPANY', 'REVIEWER', 'PROVIDER'] // Combined roles from duplication
        }),
        createRoute({
            path: 'create', // Was 'add' in first duplicaton, 'create' in second. Standardizing on 'create' as per second block which seemed newer
            element: VisitCreate,
            roles: ROLES.ADMIN_INSURANCE
        }),
        createRoute({
            path: 'add', // Keeping 'add' for compatibility if needed, but pointing to same component
            element: VisitCreate,
            roles: ['ADMIN']
        }),
        createRoute({
            path: 'edit/:id',
            element: VisitEdit,
            roles: ROLES.ADMIN_INSURANCE
        }),
        createRoute({
            path: ':id', // View
            element: VisitView,
            roles: ['ADMIN', 'REVIEWER', 'INSURANCE_COMPANY']
        }),
        createRoute({
            path: 'view/:id', // Duplicate view path found in second block
            element: VisitView,
            roles: ['ADMIN', 'REVIEWER', 'INSURANCE_COMPANY']
        })
    ]
};

export default VisitsRoutes;
