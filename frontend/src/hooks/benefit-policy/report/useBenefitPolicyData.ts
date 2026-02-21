
import { useState, useCallback, useEffect } from 'react';
import axiosClient from 'utils/axios';
import { BenefitPolicyReportOptions, DEFAULT_FILTERS } from './types';

const unwrap = (response: any) => response.data?.data ?? response.data;

export const useBenefitPolicyData = (options: BenefitPolicyReportOptions = {}) => {
    const { employerId } = options;
    const [policies, setPolicies] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const policyParams: any = { size: 9999 };
            const memberParams: any = { size: 9999 };
            const claimsParams: any = { size: 9999 };

            if (employerId) {
                memberParams.organizationId = employerId;
                claimsParams.employerId = employerId;
            }

            const [policiesResponse, membersResponse, claimsResponse] = await Promise.all([
                employerId
                    ? axiosClient.get(`/benefit-policies/employer/${employerId}`)
                    : axiosClient.get('/benefit-policies', { params: policyParams }),
                axiosClient.get('/unified-members', { params: memberParams }),
                axiosClient.get('/claims', { params: claimsParams })
            ]);

            const policiesData = unwrap(policiesResponse);
            let policiesList: any[] = [];
            if (Array.isArray(policiesData)) {
                policiesList = policiesData;
            } else if (policiesData?.content || policiesData?.items) {
                policiesList = policiesData.content || policiesData.items;
            }

            const membersData = unwrap(membersResponse);
            let membersList = [];
            if (Array.isArray(membersData)) {
                membersList = membersData;
            } else if (membersData?.content || membersData?.items) {
                membersList = membersData.content || membersData.items;
            }

            const claimsData = unwrap(claimsResponse);
            let claimsList = [];
            if (Array.isArray(claimsData)) {
                claimsList = claimsData;
            } else if (claimsData?.content || claimsData?.items) {
                claimsList = claimsData.content || claimsData.items;
            }

            const mappedPolicies = policiesList.map((policy) => ({
                id: policy.id,
                policyCode: policy.policyCode ?? policy.code ?? '—',
                name: policy.name ?? '—',
                nameEn: policy.nameEn ?? policy.name ?? '—',
                status: policy.status ?? 'DRAFT',
                employerId: policy.employerOrgId ?? policy.employerId ?? null,
                employerName: policy.employerName ?? policy.employer?.name ?? '—',
                startDate: policy.startDate ?? null,
                endDate: policy.endDate ?? null,
                defaultCoveragePercent: policy.defaultCoveragePercent ?? 0,
                maxClaimAmount: policy.maxClaimAmount ?? 0,
                description: policy.description ?? '',
                createdAt: policy.createdAt ?? null,
                updatedAt: policy.updatedAt ?? null,
                _raw: policy
            }));

            const mappedMembers = membersList.map((member) => ({
                id: member.id,
                name: member.fullName ?? member.fullNameArabic ?? '—',
                employerId: member.employerOrgId ?? member.employerId ?? member.employerOrganization?.id ?? null,
                policyId: member.benefitPolicyId ?? member.policyId ?? null,
                policyCode: member.benefitPolicyCode ?? member.policyCode ?? null,
                status: member.status ?? 'ACTIVE',
                _raw: member
            }));

            const mappedClaims = claimsList.map((claim) => ({
                id: claim.id,
                memberId: claim.member?.id ?? claim.memberId ?? null,
                memberName: claim.member?.fullName ?? claim.memberName ?? '—',
                employerId: claim.member?.employerOrgId ?? claim.employerId ?? null,
                policyId: claim.member?.benefitPolicyId ?? claim.benefitPolicyId ?? null,
                policyName: claim.member?.benefitPolicyName ?? claim.benefitPolicyName ?? null,
                status: claim.status ?? 'DRAFT',
                requestedAmount: parseFloat(claim.requestedAmount) || 0,
                approvedAmount: claim.approvedAmount != null ? parseFloat(claim.approvedAmount) : null,
                visitDate: claim.visitDate ?? null,
                rejectionReason: claim.reviewerComment ?? claim.rejectionReason ?? null,
                serviceCategoryId: claim.serviceCategoryId ?? claim.lines?.[0]?.serviceCategoryId ?? null,
                serviceCategoryName: claim.serviceCategoryName ?? claim.lines?.[0]?.serviceCategoryName ?? null,
                _raw: claim
            }));

            setPolicies(mappedPolicies);
            setMembers(mappedMembers);
            setClaims(mappedClaims);
            setPagination({
                page: 0,
                size: mappedPolicies.length,
                totalElements: mappedPolicies.length,
                totalPages: 1
            });
        } catch (err: any) {
            console.error('❌ Failed to fetch benefit policy report data:', err);
            setError(err.message || 'فشل في تحميل بيانات التقرير');
        } finally {
            setLoading(false);
        }
    }, [employerId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        policies,
        members,
        claims,
        loading,
        error,
        pagination,
        refresh: fetchData
    };
};
