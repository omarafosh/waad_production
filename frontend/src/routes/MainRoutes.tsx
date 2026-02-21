import MainLayout from 'layout/Dashboard';

// Route Modules
import MemberRoutes from './modules/MemberRoutes';
import EmployerRoutes from './modules/EmployerRoutes';
import ClaimsRoutes from './modules/ClaimsRoutes';
import SettlementRoutes from './modules/SettlementRoutes';
import PreApprovalRoutes from './modules/PreApprovalRoutes';
import ProviderRoutes from './modules/ProviderRoutes';
import ProviderPortalRoutes from './modules/ProviderPortalRoutes';
import VisitsRoutes from './modules/VisitsRoutes';
import MedicalRoutes from './modules/MedicalRoutes';
import BenefitRoutes from './modules/BenefitRoutes';
import RbacRoutes from './modules/RbacRoutes';
import ReportRoutes from './modules/ReportRoutes';
import {
  DashboardRoute,
  AdminRoutes,
  SettingsRoutes,
  ProfileRoutes,
  UtilityRoutes
} from './modules/SystemRoutes';

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    // Dashboard
    DashboardRoute,

    // Core Domain Modules
    MemberRoutes,
    EmployerRoutes,
    ...ClaimsRoutes, // Claims and Approvals Dashboard are in an array
    SettlementRoutes,
    PreApprovalRoutes,
    ...ProviderRoutes, // Providers and Contracts are in an array
    ProviderPortalRoutes,
    VisitsRoutes,

    // Medical & Benefits
    ...MedicalRoutes,
    ...BenefitRoutes,

    // Administration & Config
    ...AdminRoutes,
    RbacRoutes,
    SettingsRoutes,
    ProfileRoutes,
    ReportRoutes,

    // Utilities & Fallbacks
    ...UtilityRoutes
  ]
};

export default MainRoutes;
