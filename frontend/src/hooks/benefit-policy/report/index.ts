
import { useMemo } from 'react';
import { useBenefitPolicyData } from './useBenefitPolicyData';
import { useBenefitPolicyAnalytics } from './useBenefitPolicyAnalytics';
import {
    BenefitPolicyReportOptions,
    BenefitPolicyReportHook,
    DEFAULT_FILTERS
} from './types';

/**
 * useBenefitPolicyReport Hook (Refactored)
 * 
 * Orchestrates technical data fetching and complex business analytics.
 */
export const useBenefitPolicyReport = (
    options: BenefitPolicyReportOptions = {}
): BenefitPolicyReportHook => {
    const { employerId, filters = DEFAULT_FILTERS } = options;

    // 1. Data Layer
    const {
        policies,
        members,
        claims,
        loading,
        error,
        pagination,
        refresh
    } = useBenefitPolicyData({ employerId });

    // 2. Analytics Layer
    const analytics = useBenefitPolicyAnalytics(
        policies,
        members,
        claims,
        filters
    );

    // 3. Combine and Format
    const enrichedPolicies = useMemo(() => {
        return analytics.filteredPolicies.map((policy) => ({
            ...policy,
            memberCount: analytics.policyMemberCounts[policy.id] || 0
        }));
    }, [analytics.filteredPolicies, analytics.policyMemberCounts]);

    return {
        // Data
        policies: enrichedPolicies,
        members,
        claims,

        // KPIs & Analytics
        kpis: analytics.kpis,
        utilizationKpis: analytics.utilizationKpis,
        limitsStressData: analytics.limitsStressData,
        rejectionsAnalysis: analytics.rejectionsAnalysis,
        policyUtilization: analytics.policyEffectivenessRanking, // Aliased for backward compatibility if needed
        topUtilizedPolicies: analytics.insights.topPoliciesByMembers, // Aliased
        financialImpact: analytics.rejectionsAnalysis.byPolicy, // Aliased
        coverageGaps: analytics.insights.unusedPolicies, // Aliased
        insights: analytics.insights,

        // State
        loading,
        error,
        pagination,

        // Actions
        refresh,

        // Additional refined data
        filteredPolicies: analytics.filteredPolicies
    };
};

export default useBenefitPolicyReport;
export * from './types';
