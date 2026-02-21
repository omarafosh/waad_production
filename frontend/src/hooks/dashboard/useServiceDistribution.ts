import { useState, useEffect, useCallback } from 'react';
import { getServiceDistribution } from '../../services/api/dashboard.service';

export interface ServiceDistributionItem {
  serviceType: string;
  count: number;
  percentage: number;
  [key: string]: any;
}

export interface ServiceDistributionHook {
  distribution: ServiceDistributionItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching service distribution
 * 
 * Uses dedicated dashboard endpoint: GET /api/dashboard/service-distribution
 * Returns aggregated data grouped by service type.
 * 
 * @returns {Object} { distribution, loading, error, refresh }
 */
export const useServiceDistribution = (): ServiceDistributionHook => {
  const [distribution, setDistribution] = useState<ServiceDistributionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDistribution = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getServiceDistribution();
      setDistribution(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل توزيع الخدمات';
      setError(errorMessage);
      console.error('Error fetching service distribution:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistribution();
  }, [fetchDistribution]);

  return {
    distribution,
    loading,
    error,
    refresh: fetchDistribution
  };
};

