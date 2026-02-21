// ==============================|| TBA API SERVICES - BARREL EXPORT ||============================== //

import axiosClient from 'utils/axios';
import claimsService from './claims.service';
import dashboardService from './dashboard.service';
import employersService from './employers.service';
import membersService from './unified-members.service';
import reviewersService from './reviewers.service';
import visitsService from './visits.service';
import preApprovalsService from './pre-approvals.service';
import providersService from './providers.service';
import settlementService from './settlement.service';
import rbacService from './rbac.service';
import lifecycleService from './lifecycle.service';


export {
    axiosClient,
    claimsService,
    dashboardService,
    employersService,
    membersService,
    reviewersService,
    visitsService,
    preApprovalsService,
    providersService,
    settlementService,
    rbacService,
    lifecycleService
};

export * as medicalServicesService from './medical-services.service';
export * as medicalCategoriesService from './medical-categories.service';
export * as medicalPackagesService from './medical-packages.service';
export * as benefitPackagesService from './benefit-packages.service';

// Default export MUST be the axios client because many services import it as 'api' 
// and call api.get() / api.post()
export default axiosClient;
