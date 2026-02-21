import { lazy } from 'react';
import Loadable from 'components/Loadable';
import { createRoute, ROLES } from '../utils/routeUtils';

// Lazy Imports
const UnifiedMembersList = Loadable(lazy(() => import('pages/members/UnifiedMembersList')));
const UnifiedMemberCreate = Loadable(lazy(() => import('pages/members/UnifiedMemberCreate')));
const UnifiedMemberView = Loadable(lazy(() => import('pages/members/UnifiedMemberView')));
const UnifiedMemberEdit = Loadable(lazy(() => import('pages/members/UnifiedMemberEdit')));
const AddDependent = Loadable(lazy(() => import('pages/members/AddDependent')));
const EligibilityCheck = Loadable(lazy(() => import('pages/members/EligibilityCheck')));

const MemberRoutes = {
    path: 'members',
    children: [
        createRoute({
            path: '',
            element: UnifiedMembersList,
            roles: ROLES.ADMIN_EMPLOYER
        }),
        createRoute({
            path: 'add',
            element: UnifiedMemberCreate,
            roles: ROLES.ADMIN_EMPLOYER
        }),
        createRoute({
            path: ':id',
            element: UnifiedMemberView,
            roles: ROLES.ADMIN_EMPLOYER
        }),
        createRoute({
            path: ':id/edit',
            element: UnifiedMemberEdit,
            roles: ROLES.ADMIN_EMPLOYER
        }),
        createRoute({
            path: ':id/add-dependent',
            element: AddDependent,
            roles: ROLES.ADMIN_EMPLOYER
        }),
        createRoute({
            path: 'eligibility',
            element: EligibilityCheck,
            roles: [...ROLES.ADMIN_EMPLOYER, 'PROVIDER']
        })
    ]
};

export default MemberRoutes;
