import { useState, useEffect, useCallback } from 'react';
import { getCostsByProvider } from 'services/api/dashboard.service';

export interface ProviderCost {
  providerName: string;
  totalCost: number;
  [key: string]: any;
}

export interface CostsByProviderHook {
  costs: ProviderCost[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching costs by provider
 * 
 * Uses dedicated dashboard endpoint: GET /api/dashboard/cost-by-provider
 * Returns top N providers by total cost.
 * 
 * @param {number} limit - Maximum number of providers to return (default: 10)
 * @returns {CostsByProviderHook} { costs, loading, error, refresh }
 */
export const useCostsByProvider = (limit: number = 10): CostsByProviderHook => {
  const [costs, setCosts] = useState<ProviderCost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCostsByProvider(limit);
      setCosts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل التكاليف حسب مقدم الخدمة';
      setError(errorMessage);
      console.error('Error fetching costs by provider:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  return {
    costs,
    loading,
    error,
    refresh: fetchCosts
  };
};

