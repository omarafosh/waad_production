import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { TableRefreshLayout } from 'contexts/TableRefreshContext';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const MedicalServicesList = Loadable(lazy(() => import('pages/medical-services/MedicalServicesList')));
const MedicalServiceCreate = Loadable(lazy(() => import('pages/medical-services/MedicalServiceCreate')));
const MedicalServiceEdit = Loadable(lazy(() => import('pages/medical-services/MedicalServiceEdit')));
const MedicalServiceView = Loadable(lazy(() => import('pages/medical-services/MedicalServiceView')));
const MedicalCatalogList = Loadable(lazy(() => import('pages/medical-catalog/MedicalCatalogList')));
const MedicalCatalogDashboard = Loadable(lazy(() => import('pages/medical-catalog/MedicalCatalogDashboard')));
const MappingWizard = Loadable(lazy(() => import('pages/medical-catalog/MappingWizard')));
const MappingCenter = Loadable(lazy(() => import('pages/medical-catalog/MappingCenter')));

const MedicalCategoriesList = Loadable(lazy(() => import('pages/medical-categories/MedicalCategoriesList')));
const MedicalCategoryCreate = Loadable(lazy(() => import('pages/medical-categories/MedicalCategoryCreate')));
const MedicalCategoryEdit = Loadable(lazy(() => import('pages/medical-categories/MedicalCategoryEdit')));
const MedicalCategoryView = Loadable(lazy(() => import('pages/medical-categories/MedicalCategoryView')));

const MedicalPackagesList = Loadable(lazy(() => import('pages/medical-packages')));
const MedicalPackageCreate = Loadable(lazy(() => import('pages/medical-packages/MedicalPackageCreate')));
const MedicalPackageEdit = Loadable(lazy(() => import('pages/medical-packages/MedicalPackageEdit')));
const MedicalPackageView = Loadable(lazy(() => import('pages/medical-packages/MedicalPackageView')));

const MedicalRoutes = [
    // Unified Medical Dictionary (Phase 2 & Enterprise)
    // Medical Master Catalog (Phase 2)
    {
        path: 'medical-catalog',
        element: <TableRefreshLayout />,
        children: [
            createRoute({ path: '', element: MedicalCatalogDashboard, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'list', element: MedicalCatalogList, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'wizard', element: MappingWizard, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'mapping-center', element: MappingCenter, roles: ROLES.ADMIN_INSURANCE }),
            // View and Edit use the same components as MedicalService but with restricted catalog context
            createRoute({ path: ':id', element: MedicalServiceView, roles: ROLES.REVIEWER_ACCESS }),
            createRoute({ path: 'edit/:id', element: MedicalServiceEdit, roles: ROLES.ADMIN_INSURANCE })
        ]
    },
    // Medical Categories management (Restored)
    {
        path: 'medical-categories',
        element: <TableRefreshLayout />,
        children: [
            createRoute({ path: '', element: MedicalCategoriesList, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'add', element: MedicalCategoryCreate, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: 'edit/:id', element: MedicalCategoryEdit, roles: ROLES.ADMIN_INSURANCE }),
            createRoute({ path: ':id', element: MedicalCategoryView, roles: ROLES.REVIEWER_ACCESS })
        ]
    }
];

export default MedicalRoutes;
