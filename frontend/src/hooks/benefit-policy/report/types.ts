
export interface BenefitPolicyFilters {
    policySearch: string;
    status: string;
    employerSearch: string;
    dateFrom: string;
    dateTo: string;
}

export const DEFAULT_FILTERS: BenefitPolicyFilters = {
    policySearch: '',
    status: '',
    employerSearch: '',
    dateFrom: '',
    dateTo: ''
};

export interface StatusConfigItem {
    label: string;
    labelEn: string;
    color: string;
}

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
    DRAFT: { label: 'مسودة', labelEn: 'Draft', color: 'default' },
    ACTIVE: { label: 'نشط', labelEn: 'Active', color: 'success' },
    SUSPENDED: { label: 'موقوف', labelEn: 'Suspended', color: 'warning' },
    EXPIRED: { label: 'منتهي', labelEn: 'Expired', color: 'error' },
    CANCELLED: { label: 'ملغي', labelEn: 'Cancelled', color: 'error' }
};

export interface BenefitPolicyReportOptions {
    employerId?: number | string | null;
    filters?: BenefitPolicyFilters;
}

export interface BenefitPolicyReportHook {
    policies: any[];
    members: any[];
    claims: any[];
    loading: boolean;
    error: any;
    pagination: any;
    refresh: () => Promise<void>;
    kpis: any;
    insights: any;
    filteredPolicies: any[];
    policyUtilization: any[];
    topUtilizedPolicies: any[];
    financialImpact: any[];
    coverageGaps: any[];
    // Added from the complex analytic blocks
    utilizationKpis: any;
    limitsStressData: any[];
    rejectionsAnalysis: any;
}
