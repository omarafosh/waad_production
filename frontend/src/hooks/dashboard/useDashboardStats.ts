import { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary } from '../../services/api/dashboard.service';
import { useEmployerFilter } from 'store';

export interface DashboardSummary {
  totalMembers: number;
  activeMembers: number;
  totalClaims: number;
  openClaims: number;
  approvedClaims: number;
  totalProviders: number;
  activeProviders: number;
  totalEmployers: number;
  totalInsurers: number;
  totalReviewers: number;
  totalContracts: number;
  activeContracts: number;
  totalMedicalCost: number;
  monthlyGrowth: number;
}

export interface DashboardStatsHook {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching dashboard summary statistics
 * 
 * Uses dedicated dashboard endpoint: GET /api/dashboard/summary
 * All calculations done server-side using JPQL aggregations.
 * Supports employer filter.
 * 
 * @returns {Object} { summary, loading, error, refresh }
 */
export const useDashboardStats = (): DashboardStatsHook => {
  const { selectedEmployerId } = useEmployerFilter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardSummary(selectedEmployerId);
      setSummary(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل إحصائيات لوحة التحكم';
      setError(errorMessage);
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployerId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary
  };
};
