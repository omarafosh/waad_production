import { useState, useEffect, useCallback, useMemo } from 'react';
import axiosClient from 'utils/axios';

/**
 * Helper to unwrap API response
 */
const unwrap = (response: any) => response.data?.data ?? response.data;

/**
 * Get today's date string (YYYY-MM-DD)
 */
const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Get current month's first day string (YYYY-MM-DD)
 */
const getMonthStartString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
};

/**
 * Check if a date string is today
 */
const isToday = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  return dateString.startsWith(getTodayString());
};

/**
 * Check if a date string is in current month
 */
const isThisMonth = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const monthStart = getMonthStartString();
  return dateString >= monthStart;
};

export interface VisitsReportFilters {
  providerSearch: string;
  memberSearch: string;
  dateFrom: string;
  dateTo: string;
  hasClaims: string;
  minServicesCount: string;
  maxServicesCount: string;
}

/**
 * Default filter state
 */
export const DEFAULT_FILTERS: VisitsReportFilters = {
  providerSearch: '', // Text search on provider name
  memberSearch: '', // Text search on member name
  dateFrom: '', // Date range start
  dateTo: '', // Date range end
  hasClaims: '', // 'yes', 'no', or '' (all)
  minServicesCount: '', // Minimum services count
  maxServicesCount: '' // Maximum services count
};

export interface VisitsReportOptions {
  employerId?: number | string | null;
  providerId?: number | string | null;
  filters?: VisitsReportFilters;
}

export interface MappedVisit {
  id: number | string;
  visitDate: string | null;
  memberName: string;
  memberId: number | string | null;
  employerId: number | string | null;
  employerName: string;
  providerName: string;
  providerId: number | string | null;
  servicesCount: number;
  services: any[];
  diagnosis: string;
  hasClaim: boolean;
  createdAt: string | null;
  _raw: any;
}

export interface VisitsReportKPIs {
  totalVisits: number;
  visitsToday: number;
  visitsThisMonth: number;
  distinctProviders: number;
  avgVisitsPerMember: number;
}

export interface VisitsReportInsights {
  topProviders: { name: string; count: number }[];
  topServices: { name: string; count: number }[];
  topMembers: { name: string; count: number }[];
}

export interface VisitsReportPagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface VisitsReportHook {
  visits: MappedVisit[];
  allVisits: MappedVisit[];
  totalCount: number;
  totalFetched: number;
  kpis: VisitsReportKPIs;
  insights: VisitsReportInsights;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  pagination: VisitsReportPagination;
  refetch: () => Promise<void>;
}

/**
 * useVisitsReport Hook
 *
 * Fetches visits for operational reporting with client-side filtering and KPI calculation.
 *
 * @param {VisitsReportOptions} options
 * @returns {VisitsReportHook} Visits data, KPIs, insights, loading states, and utilities
 *
 * Architecture: Employer → Member → Visit
 * Data Source: GET /api/visits?employerId={id}&providerId={id}
 */
export const useVisitsReport = ({ employerId, providerId, filters = DEFAULT_FILTERS }: VisitsReportOptions = {}): VisitsReportHook => {
  const [visits, setVisits] = useState<MappedVisit[]>([]);
  const [membersCount, setMembersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<VisitsReportPagination>({
    page: 0,
    size: 100,
    totalElements: 0,
    totalPages: 0
  });

  /**
   * Fetch visits from API
   */
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        size: 9999 // Fetch all for client-side filtering
      };

      if (employerId) {
        params.employerId = employerId;
      }

      if (providerId) {
        params.providerId = providerId;
      }

      // Fetch visits
      const visitsResponse = await axiosClient.get('/visits', { params });
      const visitsData = unwrap(visitsResponse);

      // Handle different response formats
      const visitsList = visitsData?.items ?? visitsData?.content ?? visitsData ?? [];

      if (!Array.isArray(visitsList)) {
        throw new Error('Invalid visits data format');
      }

      // Map visits to UI-safe model
      const mappedVisits: MappedVisit[] = visitsList.map((visit: any) => ({
        id: visit.id,
        visitDate: visit.visitDate ?? null,
        memberName: visit.member?.fullName ?? visit.memberName ?? '—',
        memberId: visit.member?.id ?? visit.memberId ?? null,
        employerId: visit.employerId ?? visit.member?.employerOrganization?.id ?? null,
        employerName: visit.employerName ?? visit.member?.employerOrganization?.name ?? '—',
        providerName: visit.provider?.name ?? visit.providerName ?? '—',
        providerId: visit.provider?.id ?? visit.providerId ?? null,
        servicesCount: Array.isArray(visit.services) ? visit.services.length : (visit.servicesCount ?? 0),
        services: visit.services ?? [],
        diagnosis: visit.diagnosis ?? '—',
        hasClaim: visit.claimId != null || visit.claim != null,
        createdAt: visit.createdAt ?? null,
        // Keep raw for potential drill-down
        _raw: visit
      }));

      setVisits(mappedVisits);
      setPagination({
        page: visitsData?.page ?? 0,
        size: visitsData?.size ?? mappedVisits.length,
        totalElements: visitsData?.total ?? visitsData?.totalElements ?? mappedVisits.length,
        totalPages: visitsData?.totalPages ?? 1
      });

      // Fetch members count for avg calculation
      try {
        const membersParams = employerId ? { organizationId: employerId, size: 1 } : { size: 1 };
        const membersResponse = await axiosClient.get('/unified-members', { params: membersParams });
        const membersData = unwrap(membersResponse);
        setMembersCount(membersData?.total ?? membersData?.totalElements ?? 0);
      } catch {
        setMembersCount(0);
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch visits:', err);
      setError(err.message || 'فشل في تحميل الزيارات');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [employerId, providerId]);

  /**
   * Initial fetch and refetch on employerId/providerId change
   */
  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  /**
   * Apply client-side filters
   */
  const filteredVisits = useMemo(() => {
    let result = [...visits];

    // Filter by selected provider (Dropdown)
    // Note: Backend might ignore providerId param in some versions, so we enforce it here
    if (providerId) {
      result = result.filter((visit) => visit.providerId === providerId);
    }

    // Filter by provider name (text search)
    if (filters.providerSearch && filters.providerSearch.trim()) {
      const search = filters.providerSearch.trim().toLowerCase();
      result = result.filter((visit) => visit.providerName.toLowerCase().includes(search));
    }

    // Filter by member name (text search)
    if (filters.memberSearch && filters.memberSearch.trim()) {
      const search = filters.memberSearch.trim().toLowerCase();
      result = result.filter((visit) => visit.memberName.toLowerCase().includes(search));
    }

    // Filter by date range (Compare YYYY-MM-DD strings to ignore time logic issues)
    if (filters.dateFrom) {
      result = result.filter((visit) => {
        if (!visit.visitDate) return false;
        // Normalize visit date to YYYY-MM-DD
        const visitDateStr = visit.visitDate.substring(0, 10);
        return visitDateStr >= filters.dateFrom;
      });
    }
    if (filters.dateTo) {
      result = result.filter((visit) => {
        if (!visit.visitDate) return false;
        // Normalize visit date to YYYY-MM-DD
        const visitDateStr = visit.visitDate.substring(0, 10);
        return visitDateStr <= filters.dateTo;
      });
    }

    // Filter by has claims
    if (filters.hasClaims === 'yes') {
      result = result.filter((visit) => visit.hasClaim);
    } else if (filters.hasClaims === 'no') {
      result = result.filter((visit) => !visit.hasClaim);
    }

    // Filter by services count range
    if (filters.minServicesCount !== '' && !isNaN(parseInt(filters.minServicesCount))) {
      const min = parseInt(filters.minServicesCount);
      result = result.filter((visit) => visit.servicesCount >= min);
    }
    if (filters.maxServicesCount !== '' && !isNaN(parseInt(filters.maxServicesCount))) {
      const max = parseInt(filters.maxServicesCount);
      result = result.filter((visit) => visit.servicesCount <= max);
    }

    return result;
  }, [visits, filters, providerId]);

  /**
   * Compute KPIs from filtered data
   */
  const kpis = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const visitsToday = filteredVisits.filter((v) => isToday(v.visitDate)).length;
    const visitsThisMonth = filteredVisits.filter((v) => isThisMonth(v.visitDate)).length;

    // Distinct providers
    const distinctProviders = new Set(filteredVisits.filter((v) => v.providerId != null).map((v) => v.providerId)).size;

    // Average visits per member
    const avgVisitsPerMember = membersCount > 0 ? (totalVisits / membersCount).toFixed(2) : 0;

    return {
      totalVisits,
      visitsToday,
      visitsThisMonth,
      distinctProviders,
      avgVisitsPerMember: parseFloat(avgVisitsPerMember)
    };
  }, [filteredVisits, membersCount]);

  /**
   * Compute Insights from filtered data
   */
  const insights = useMemo(() => {
    // Top 5 Providers by visit count
    const providerCounts = {};
    filteredVisits.forEach((visit) => {
      const key = visit.providerName;
      if (key && key !== '—') {
        providerCounts[key] = (providerCounts[key] || 0) + 1;
      }
    });
    const topProviders = Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top 5 Services by usage
    const serviceCounts = {};
    filteredVisits.forEach((visit) => {
      if (Array.isArray(visit.services)) {
        visit.services.forEach((service) => {
          const name = service?.name ?? service?.serviceName ?? 'خدمة غير محددة';
          serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        });
      }
    });
    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top 10 Members by visit count
    const memberCounts = {};
    filteredVisits.forEach((visit) => {
      const key = visit.memberName;
      if (key && key !== '—') {
        memberCounts[key] = (memberCounts[key] || 0) + 1;
      }
    });
    const topMembers = Object.entries(memberCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      topProviders,
      topServices,
      topMembers
    };
  }, [filteredVisits]);

  return {
    // Data
    visits: filteredVisits,
    allVisits: visits,
    totalCount: filteredVisits.length,
    totalFetched: visits.length,

    // KPIs
    kpis,

    // Insights
    insights,

    // State
    loading,
    error,
    isEmpty: !loading && filteredVisits.length === 0,

    // Pagination info (from API)
    pagination,

    // Actions
    refetch: fetchVisits
  };
};

export default useVisitsReport;
