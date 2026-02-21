import { useState, useEffect, useCallback } from 'react';
import preAuthDashboardService from 'services/api/preauth-dashboard.service';

export interface PreAuthDashboardHook {
  dashboard: any | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for PreAuthorization Dashboard
 * Auto-refreshes every 2 minutes
 */
export const usePreAuthDashboard = (trendDays: number = 30, topProviders: number = 10, autoRefresh: boolean = true): PreAuthDashboardHook => {
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await preAuthDashboardService.getDashboard(trendDays, topProviders);
      setDashboard(response.data || response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل لوحة التحكم');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [trendDays, topProviders]);

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh every 2 minutes
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 120000);
      return () => clearInterval(interval);
    }
  }, [fetchDashboard, autoRefresh]);

  return {
    dashboard,
    loading,
    error,
    refresh: fetchDashboard
  };
};

export interface PreAuthStatsHook {
  stats: any | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for overall statistics
 */
export const usePreAuthStats = (): PreAuthStatsHook => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await preAuthDashboardService.getStats();
      setStats(response.data || response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل الإحصائيات');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
};

export interface HighPriorityQueueHook {
  queue: any[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for high priority queue
 */
export const useHighPriorityQueue = (limit: number = 10): HighPriorityQueueHook => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await preAuthDashboardService.getHighPriorityQueue(limit);
      setQueue(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل قائمة الأولويات');
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { queue, loading, error, refresh: fetchQueue };
};

export interface ExpiringSoonHook {
  items: any[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for expiring soon alerts
 */
export const useExpiringSoon = (withinDays: number = 7, limit: number = 10): ExpiringSoonHook => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await preAuthDashboardService.getExpiringSoon(withinDays, limit);
      setItems(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل التنبيهات');
      console.error('Error fetching expiring items:', err);
    } finally {
      setLoading(false);
    }
  }, [withinDays, limit]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refresh: fetchItems };
};
