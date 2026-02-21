import { useState, useEffect, useCallback } from 'react';
import { getMonthlyTrends } from '../../services/api/dashboard.service';
import { useEmployerFilter } from 'store';

export interface MonthlyTrend {
  month: string;
  claims: number;
  preAuths: number;
  members: number;
  [key: string]: any;
}

export interface MonthlyTrendsHook {
  trends: MonthlyTrend[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching monthly trends
 * 
 * Uses dedicated dashboard endpoint: GET /api/dashboard/monthly-trends
 * Returns monthly aggregated data for charts.
 * Supports employer filter.
 * 
 * @param {number} months - Number of months to retrieve (default: 12)
 * @returns {Object} { trends, loading, error, refresh }
 */
export const useMonthlyTrends = (months: number = 12): MonthlyTrendsHook => {
  const { selectedEmployerId } = useEmployerFilter();
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMonthlyTrends(months, selectedEmployerId);
      setTrends(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل الاتجاهات الشهرية';
      setError(errorMessage);
      console.error('Error fetching monthly trends:', err);
    } finally {
      setLoading(false);
    }
  }, [months, selectedEmployerId]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return {
    trends,
    loading,
    error,
    refresh: fetchTrends
  };
};

