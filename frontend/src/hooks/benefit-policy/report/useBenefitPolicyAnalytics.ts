
import { useMemo } from 'react';
import { BenefitPolicyFilters, STATUS_CONFIG } from './types';

export const useBenefitPolicyAnalytics = (
    policies: any[],
    members: any[],
    claims: any[],
    filters: BenefitPolicyFilters
) => {
    const filteredPolicies = useMemo(() => {
        let result = [...policies];
        if (filters.policySearch && filters.policySearch.trim()) {
            const search = filters.policySearch.trim().toLowerCase();
            result = result.filter((policy) =>
                policy.name.toLowerCase().includes(search) ||
                policy.policyCode.toLowerCase().includes(search)
            );
        }
        if (filters.status) {
            result = result.filter((policy) => policy.status === filters.status);
        }
        if (filters.employerSearch && filters.employerSearch.trim()) {
            const search = filters.employerSearch.trim().toLowerCase();
            result = result.filter((policy) =>
                policy.employerName.toLowerCase().includes(search)
            );
        }
        if (filters.dateFrom) {
            result = result.filter((policy) => policy.startDate && policy.startDate >= filters.dateFrom);
        }
        if (filters.dateTo) {
            result = result.filter((policy) => policy.startDate && policy.startDate <= filters.dateTo);
        }
        return result;
    }, [policies, filters]);

    const policyMemberCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        members.forEach((member) => {
            if (member.policyId) {
                counts[member.policyId] = (counts[member.policyId] || 0) + 1;
            }
        });

        const policyCodeToId: Record<string, string | number> = {};
        policies.forEach((p) => {
            if (p.policyCode && p.policyCode !== '—') {
                policyCodeToId[p.policyCode] = p.id;
            }
        });

        members.forEach((member) => {
            if (member.policyCode && policyCodeToId[member.policyCode]) {
                const policyId = policyCodeToId[member.policyCode];
                if (!member.policyId || member.policyId !== policyId) {
                    counts[policyId] = (counts[policyId] || 0) + 1;
                }
            }
        });
        return counts;
    }, [policies, members]);

    const kpis = useMemo(() => {
        const totalPolicies = filteredPolicies.length;
        const activePolicies = filteredPolicies.filter((p) => p.status === 'ACTIVE').length;
        const filteredPolicyIds = new Set(filteredPolicies.map((p) => p.id));
        const membersCovered = members.filter((m) => m.policyId && filteredPolicyIds.has(m.policyId)).length;
        const avgMembersPerPolicy = totalPolicies > 0 ? (membersCovered / totalPolicies).toFixed(1) : 0;
        const policiesWithNoUsage = filteredPolicies.filter((policy) => (policyMemberCounts[policy.id] || 0) === 0).length;

        return {
            totalPolicies,
            activePolicies,
            membersCovered,
            avgMembersPerPolicy: parseFloat(avgMembersPerPolicy as string),
            policiesWithNoUsage
        };
    }, [filteredPolicies, members, policyMemberCounts]);

    const utilizationKpis = useMemo(() => {
        const totalClaimsAmount = claims.reduce((sum, claim) => sum + claim.requestedAmount, 0);
        const approvedAmount = claims.reduce((sum, claim) => {
            if (claim.approvedAmount != null) return sum + claim.approvedAmount;
            return sum;
        }, 0);

        const activePoliciesList = filteredPolicies.filter((p) => p.status === 'ACTIVE');
        const totalAnnualLimit = activePoliciesList.reduce((sum, policy) => {
            const memberCount = policyMemberCounts[policy.id] || 0;
            const policyLimit = policy.maxClaimAmount || 0;
            return sum + (policyLimit * memberCount);
        }, 0);

        const utilizationPercent = totalAnnualLimit > 0 ? ((approvedAmount / totalAnnualLimit) * 100).toFixed(1) : 0;
        const policiesWithClaims = new Set(
            claims
                .filter((c) => c.memberId)
                .map((c) => {
                    const member = members.find((m) => m.id === c.memberId);
                    return member?.policyId;
                })
                .filter(Boolean)
        );

        const avgUtilizationPerPolicy = policiesWithClaims.size > 0 ? (approvedAmount / policiesWithClaims.size).toFixed(0) : 0;

        return {
            totalClaimsAmount,
            approvedAmount,
            utilizationPercent: parseFloat(utilizationPercent as string),
            avgUtilizationPerPolicy: parseFloat(avgUtilizationPerPolicy as string),
            totalAnnualLimit,
            claimsCount: claims.length
        };
    }, [claims, filteredPolicies, policyMemberCounts, members]);

    const limitsStressData = useMemo(() => {
        const memberPolicyMap: Record<string, any> = {};
        members.forEach((m) => { if (m.id) memberPolicyMap[m.id] = m.policyId; });

        const policyUsage: Record<string, number> = {};
        claims.forEach((claim) => {
            let policyId = claim.policyId;
            if (!policyId && claim.memberId) policyId = memberPolicyMap[claim.memberId];
            if (policyId && claim.approvedAmount != null) {
                policyUsage[policyId] = (policyUsage[policyId] || 0) + claim.approvedAmount;
            }
        });

        const stressData = filteredPolicies.map((policy) => {
            const memberCount = policyMemberCounts[policy.id] || 0;
            const annualLimit = (policy.maxClaimAmount || 0) * memberCount;
            const usedAmount = policyUsage[policy.id] || 0;
            const remaining = Math.max(0, annualLimit - usedAmount);
            const utilizationPercent = annualLimit > 0 ? (usedAmount / annualLimit) * 100 : 0;

            let status = 'healthy';
            let statusLabel = 'صحي';
            let statusColor = 'success';

            if (utilizationPercent > 85) {
                status = 'critical';
                statusLabel = 'حرج';
                statusColor = 'error';
            } else if (utilizationPercent >= 60) {
                status = 'warning';
                statusLabel = 'تحذير';
                statusColor = 'warning';
            }

            return {
                id: policy.id,
                policyName: policy.name,
                policyCode: policy.policyCode,
                employerName: policy.employerName,
                memberCount,
                annualLimit,
                usedAmount,
                remaining,
                utilizationPercent: parseFloat(utilizationPercent.toFixed(1)),
                status,
                statusLabel,
                statusColor
            };
        });

        return stressData.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
    }, [filteredPolicies, claims, members, policyMemberCounts]);

    const rejectionsAnalysis = useMemo(() => {
        const rejectedClaims = claims.filter((c) => c.status === 'REJECTED');
        const totalRejectedClaims = rejectedClaims.length;
        const rejectedAmount = rejectedClaims.reduce((sum, c) => sum + c.requestedAmount, 0);
        const rejectionRate = claims.length > 0 ? (totalRejectedClaims / claims.length) * 100 : 0;

        const memberPolicyMap: Record<string, any> = {};
        members.forEach((m) => {
            if (m.id) memberPolicyMap[m.id] = { policyId: m.policyId, policyCode: m.policyCode };
        });

        const byPolicy: Record<string, { count: number; amount: number }> = {};
        rejectedClaims.forEach((claim) => {
            let policyName = claim.policyName;
            let policyId = claim.policyId;
            if (!policyId && claim.memberId && memberPolicyMap[claim.memberId]) {
                policyId = memberPolicyMap[claim.memberId].policyId;
            }
            if (policyId) {
                const policy = filteredPolicies.find((p) => p.id === policyId);
                if (policy) policyName = policy.name;
            }
            const key = policyName || 'غير محدد';
            if (!byPolicy[key]) byPolicy[key] = { count: 0, amount: 0 };
            byPolicy[key].count += 1;
            byPolicy[key].amount += claim.requestedAmount;
        });

        const byPolicyList = Object.entries(byPolicy)
            .map(([name, data]) => ({
                name,
                count: data.count,
                amount: data.amount,
                percentage: totalRejectedClaims > 0 ? (data.count / totalRejectedClaims) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        const byReason: Record<string, { count: number; amount: number }> = {};
        rejectedClaims.forEach((claim) => {
            const reason = claim.rejectionReason?.trim() || 'غير محدد';
            if (!byReason[reason]) byReason[reason] = { count: 0, amount: 0 };
            byReason[reason].count += 1;
            byReason[reason].amount += claim.requestedAmount;
        });

        const byReasonList = Object.entries(byReason)
            .map(([reason, data]) => ({
                reason,
                count: data.count,
                amount: data.amount,
                percentage: totalRejectedClaims > 0 ? (data.count / totalRejectedClaims) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        const byCategory: Record<string, { count: number; amount: number }> = {};
        rejectedClaims.forEach((claim) => {
            const category = claim.serviceCategoryName || 'غير محدد';
            if (!byCategory[category]) byCategory[category] = { count: 0, amount: 0 };
            byCategory[category].count += 1;
            byCategory[category].amount += claim.requestedAmount;
        });

        const byCategoryList = Object.entries(byCategory)
            .map(([category, data]) => ({
                category,
                count: data.count,
                amount: data.amount,
                percentage: totalRejectedClaims > 0 ? (data.count / totalRejectedClaims) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        return {
            kpis: {
                totalRejectedClaims,
                rejectedAmount,
                rejectionRate: parseFloat(rejectionRate.toFixed(1))
            },
            byPolicy: byPolicyList,
            byReason: byReasonList,
            byCategory: byCategoryList
        };
    }, [claims, members, filteredPolicies]);

    const policyEffectivenessRanking = useMemo(() => {
        const memberPolicyMap: Record<string, any> = {};
        members.forEach((m) => { if (m.id) memberPolicyMap[m.id] = m.policyId; });

        const policyClaimsData: Record<string, any> = {};
        claims.forEach((claim) => {
            let policyId = claim.policyId;
            if (!policyId && claim.memberId) policyId = memberPolicyMap[claim.memberId];
            if (policyId) {
                if (!policyClaimsData[policyId]) {
                    policyClaimsData[policyId] = {
                        totalClaims: 0,
                        approvedClaims: 0,
                        rejectedClaims: 0,
                        totalRequestedAmount: 0,
                        totalApprovedAmount: 0
                    };
                }
                policyClaimsData[policyId].totalClaims += 1;
                policyClaimsData[policyId].totalRequestedAmount += claim.requestedAmount;
                if (claim.status === 'APPROVED' || claim.status === 'SETTLED') {
                    policyClaimsData[policyId].approvedClaims += 1;
                    policyClaimsData[policyId].totalApprovedAmount += claim.approvedAmount || 0;
                } else if (claim.status === 'REJECTED') {
                    policyClaimsData[policyId].rejectedClaims += 1;
                }
            }
        });

        const rankingData = filteredPolicies.map((policy) => {
            const memberCount = policyMemberCounts[policy.id] || 0;
            const claimsData = policyClaimsData[policy.id] || {
                totalClaims: 0,
                approvedClaims: 0,
                rejectedClaims: 0,
                totalRequestedAmount: 0,
                totalApprovedAmount: 0
            };

            const claimsCount = claimsData.totalClaims;
            const approvalRate = claimsCount > 0 ? (claimsData.approvedClaims / claimsCount) * 100 : 0;
            const rejectionRate = claimsCount > 0 ? (claimsData.rejectedClaims / claimsCount) * 100 : 0;
            const avgClaimAmount = claimsCount > 0 ? claimsData.totalRequestedAmount / claimsCount : 0;

            const annualLimit = (policy.maxClaimAmount || 0) * memberCount;
            const utilizationPercent = annualLimit > 0 ? (claimsData.totalApprovedAmount / annualLimit) * 100 : 0;

            let effectivenessScore = 0;
            effectivenessScore += approvalRate * 0.3;
            effectivenessScore += (100 - rejectionRate) * 0.2;
            const utilizationScore = utilizationPercent <= 60 ? utilizationPercent * 1.5 : Math.max(0, 100 - (utilizationPercent - 60) * 2);
            effectivenessScore += utilizationScore * 0.3;
            const activityScore = Math.min(100, claimsCount * 5);
            effectivenessScore += activityScore * 0.2;

            let recommendation = 'مراجعة';
            let recommendationColor = 'default';
            if (memberCount === 0) {
                recommendation = 'غير مستخدم';
                recommendationColor = 'error';
            } else if (rejectionRate > 40) {
                recommendation = 'إعادة تصميم';
                recommendationColor = 'error';
            } else if (utilizationPercent > 85) {
                recommendation = 'توسيع الحدود';
                recommendationColor = 'warning';
            } else if (utilizationPercent < 20 && claimsCount < 5) {
                recommendation = 'تقليص أو دمج';
                recommendationColor = 'info';
            } else if (approvalRate > 80 && utilizationPercent >= 30 && utilizationPercent <= 70) {
                recommendation = 'أداء ممتاز';
                recommendationColor = 'success';
            } else if (approvalRate > 60) {
                recommendation = 'أداء جيد';
                recommendationColor = 'success';
            }

            return {
                id: policy.id,
                policyName: policy.name,
                policyCode: policy.policyCode,
                employerName: policy.employerName,
                status: policy.status,
                memberCount,
                claimsCount,
                approvalRate: parseFloat(approvalRate.toFixed(1)),
                avgClaimAmount: parseFloat(avgClaimAmount.toFixed(0)),
                utilizationPercent: parseFloat(utilizationPercent.toFixed(1)),
                rejectionRate: parseFloat(rejectionRate.toFixed(1)),
                effectivenessScore: parseFloat(effectivenessScore.toFixed(1)),
                recommendation,
                recommendationColor,
                _rawClaimsData: claimsData,
                _annualLimit: annualLimit
            };
        });

        return rankingData.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
    }, [filteredPolicies, claims, members, policyMemberCounts]);

    const insights = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        filteredPolicies.forEach((policy) => {
            const status = policy.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        const policiesByStatus = Object.entries(statusCounts)
            .map(([status, count]) => ({
                status,
                label: STATUS_CONFIG[status]?.label ?? status,
                color: STATUS_CONFIG[status]?.color ?? 'default',
                count
            }))
            .sort((a, b) => b.count - a.count);

        const topPoliciesByMembers = filteredPolicies
            .map((policy) => ({
                id: policy.id,
                name: policy.name,
                code: policy.policyCode,
                status: policy.status,
                memberCount: policyMemberCounts[policy.id] || 0
            }))
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 5);

        const employerCounts: Record<string, any> = {};
        filteredPolicies.forEach((policy) => {
            const key = policy.employerName;
            if (key && key !== '—') {
                if (!employerCounts[key]) employerCounts[key] = { policies: 0, members: 0 };
                employerCounts[key].policies += 1;
                employerCounts[key].members += policyMemberCounts[policy.id] || 0;
            }
        });
        const coverageByEmployer = Object.entries(employerCounts)
            .map(([name, data]) => ({ name, policies: data.policies, members: data.members }))
            .sort((a, b) => b.members - a.members)
            .slice(0, 5);

        const unusedPolicies = filteredPolicies
            .filter((policy) => (policyMemberCounts[policy.id] || 0) === 0)
            .map((policy) => ({
                id: policy.id,
                name: policy.name,
                code: policy.policyCode,
                status: policy.status,
                employerName: policy.employerName
            }))
            .slice(0, 10);

        return { policiesByStatus, topPoliciesByMembers, coverageByEmployer, unusedPolicies };
    }, [filteredPolicies, policyMemberCounts]);

    return {
        filteredPolicies,
        policyMemberCounts,
        kpis,
        utilizationKpis,
        limitsStressData,
        rejectionsAnalysis,
        policyEffectivenessRanking,
        insights
    };
};
