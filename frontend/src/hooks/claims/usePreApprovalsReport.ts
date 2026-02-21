import { useState, useEffect, useCallback, useMemo } from 'react';
import axiosClient from 'utils/axios';

/**
 * Pre-Authorization Status Constants
 */
export const PREAUTH_STATUS = {
  REQUESTED: 'REQUESTED',
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const;

export type PreAuthStatusType = typeof PREAUTH_STATUS[keyof typeof PREAUTH_STATUS];

/**
 * All pre-auth statuses for filter dropdown
 */
export const ALL_PREAUTH_STATUSES: PreAuthStatusType[] = Object.values(PREAUTH_STATUS);

/**
 * Arabic labels for pre-auth statuses
 */
export const PREAUTH_STATUS_LABELS: Record<PreAuthStatusType, string> = {
  [PREAUTH_STATUS.REQUESTED]: 'مطلوبة',
  [PREAUTH_STATUS.PENDING]: 'معلقة',
  [PREAUTH_STATUS.SUBMITTED]: 'مقدمة',
  [PREAUTH_STATUS.UNDER_REVIEW]: 'قيد المراجعة',
  [PREAUTH_STATUS.APPROVED]: 'موافق عليها',
  [PREAUTH_STATUS.REJECTED]: 'مرفوضة',
  [PREAUTH_STATUS.EXPIRED]: 'منتهية الصلاحية',
  [PREAUTH_STATUS.CANCELLED]: 'ملغاة'
};

/**
 * Helper to unwrap API response
 */
const unwrap = (response: any) => response.data?.data ?? response.data;

export interface PreApprovalsReportFilters {
  statuses: PreAuthStatusType[];
  memberSearch: string;
}

/**
 * Default filter state
 */
export const DEFAULT_FILTERS: PreApprovalsReportFilters = {
  statuses: [], // Empty = all statuses
  memberSearch: '' // Text search on member name
};

export interface PreApprovalsReportOptions {
  employerId?: number | null;
  providerId?: number | null;
  filters?: PreApprovalsReportFilters;
}

export interface MappedPreApproval {
  id: number | string;
  referenceNumber: string;
  memberName: string;
  employerName: string;
  providerName: string;
  serviceName: string;
  status: PreAuthStatusType;
  requestedAmount: number;
  approvedAmount: number | null;
  requestDate: string;
  validUntil: string;
  updatedAt: string;
  _raw: any;
}

export interface PreApprovalsReportPagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PreApprovalsReportHook {
  preApprovals: MappedPreApproval[];
  allPreApprovals: MappedPreApproval[];
  totalCount: number;
  totalFetched: number;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  pagination: PreApprovalsReportPagination;
  refetch: () => Promise<void>;
}

/**
 * usePreApprovalsReport Hook
 *
 * Fetches pre-approvals for operational reporting with client-side filtering.
 *
 * @param {PreApprovalsReportOptions} options
 * @returns {PreApprovalsReportHook} Pre-approvals data, loading states, error, and utilities
 */
export const usePreApprovalsReport = ({ employerId, providerId, filters = DEFAULT_FILTERS }: PreApprovalsReportOptions = {}): PreApprovalsReportHook => {
  const [preApprovals, setPreApprovals] = useState<MappedPreApproval[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PreApprovalsReportPagination>({
    page: 0,
    size: 100,
    totalElements: 0,
    totalPages: 0
  });

  /**
   * Fetch pre-approvals from API
   */
  const fetchPreApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        size: 9999 // Fetch all for client-side filtering
      };

      if (employerId) {
        params.employerId = employerId;
      }

      // Provider filtering is done client-side for better compatibility

      const response = await axiosClient.get('/pre-authorizations', { params });
      const data = unwrap(response);

      // Handle different response formats
      const preApprovalsList = data?.items ?? data?.content ?? data ?? [];

      if (!Array.isArray(preApprovalsList)) {
        throw new Error('Invalid pre-approvals data format');
      }

      // Map pre-approvals to UI-safe model
      const mappedPreApprovals: MappedPreApproval[] = preApprovalsList.map((pa: any) => ({
        id: pa.id,
        referenceNumber: pa.referenceNumber || `PA-${pa.id}`,
        memberName: pa.member?.fullName ?? pa.memberName ?? '—',
        employerName: pa.member?.employerOrganization?.name ?? pa.employerName ?? '—',
        providerName: pa.provider?.name ?? pa.providerName ?? '—',
        serviceName: pa.serviceName ?? pa.medicalService?.name ?? '—',
        status: pa.status,
        requestedAmount: parseFloat(pa.requestedAmount) || 0,
        approvedAmount: pa.approvedAmount != null ? parseFloat(pa.approvedAmount) : null,
        requestDate: pa.requestDate,
        validUntil: pa.validUntil,
        updatedAt: pa.updatedAt,
        // Keep raw for potential drill-down
        _raw: pa
      }));

      setPreApprovals(mappedPreApprovals);
      setPagination({
        page: data?.page ?? 0,
        size: data?.size ?? mappedPreApprovals.length,
        totalElements: data?.total ?? data?.totalElements ?? mappedPreApprovals.length,
        totalPages: data?.totalPages ?? 1
      });
    } catch (err: any) {
      console.error('❌ Failed to fetch pre-approvals:', err);
      setError(err.message || 'فشل في تحميل الموافقات المسبقة');
      setPreApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [employerId]);

  /**
   * Initial fetch and refetch on employerId change
   */
  useEffect(() => {
    fetchPreApprovals();
  }, [fetchPreApprovals]);

  /**
   * Apply client-side filters
   */
  const filteredPreApprovals = useMemo(() => {
    let result = [...preApprovals];

    // Filter by provider (client-side)
    if (providerId) {
      result = result.filter((pa) => {
        const paProviderId = pa._raw?.provider?.id ?? pa._raw?.providerId;
        return paProviderId === providerId;
      });
    }

    // Filter by status (multi-select)
    if (filters.statuses && filters.statuses.length > 0) {
      result = result.filter((pa) => filters.statuses.includes(pa.status));
    }

    // Filter by member name (text search)
    if (filters.memberSearch && filters.memberSearch.trim()) {
      const search = filters.memberSearch.trim().toLowerCase();
      result = result.filter((pa) => pa.memberName.toLowerCase().includes(search));
    }

    return result;
  }, [preApprovals, filters, providerId]);

  return {
    // Data
    preApprovals: filteredPreApprovals,
    allPreApprovals: preApprovals,
    totalCount: filteredPreApprovals.length,
    totalFetched: preApprovals.length,

    // State
    loading,
    error,
    isEmpty: !loading && filteredPreApprovals.length === 0,

    // Pagination info (from API)
    pagination,

    // Actions
    refetch: fetchPreApprovals
  };
};

export default usePreApprovalsReport;
