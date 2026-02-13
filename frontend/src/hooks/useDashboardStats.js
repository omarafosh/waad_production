import { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary } from 'services/api/dashboard.service';
import { useEmployerFilter } from 'contexts/EmployerFilterContext';

/**
 * Hook for fetching dashboard summary statistics
 * 
 * Uses dedicated dashboard endpoint: GET /api/dashboard/summary
 * All calculations done server-side using JPQL aggregations.
 * Supports employer filter.
 * 
 * @returns {Object} { summary, loading, error, refresh }
 */
export const useDashboardStats = () => {
  const { selectedEmployerId } = useEmployerFilter();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardSummary(selectedEmployerId);
      setSummary(data);
    } catch (err) {
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
