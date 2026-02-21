import { useState, useEffect, useCallback } from 'react';
import { getMembersGrowth } from 'services/api/dashboard.service';

export interface MembersGrowthData {
  month: string;
  count: number;
  [key: string]: any;
}

export interface MembersGrowthHook {
  growth: MembersGrowthData[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch members monthly growth trends
 * Uses dedicated backend endpoint with server-side aggregations
 * 
 * @param {number} months - Number of months to retrieve (default: 12)
 * @returns {MembersGrowthHook} { growth, loading, error, refresh }
 */
export const useMembersGrowth = (months: number = 12): MembersGrowthHook => {
  const [growth, setGrowth] = useState<MembersGrowthData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrowth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMembersGrowth(months);
      setGrowth(data || []);
    } catch (err: any) {
      console.error('Error fetching members growth:', err);
      setError(err.message || 'Failed to fetch members growth');
      setGrowth([]);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchGrowth();
  }, [fetchGrowth]);

  const refresh = useCallback(() => {
    fetchGrowth();
  }, [fetchGrowth]);

  return {
    growth,
    loading,
    error,
    refresh
  };
};

export default useMembersGrowth;
