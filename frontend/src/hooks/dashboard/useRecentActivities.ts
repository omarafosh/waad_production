import { useState, useEffect, useCallback } from 'react';
import { getRecentActivities } from '../../services/api/dashboard.service';

export interface RecentActivity {
  id: string | number;
  action: string;
  entityType: string;
  entityId: string | number;
  timestamp: string;
  user: string;
  details?: any;
}

export interface RecentActivitiesHook {
  activities: RecentActivity[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching recent activities
 * 
 * Uses dedicated dashboard endpoint: GET /api/dashboard/recent-activities
 * Returns recent system activities for timeline display.
 * 
 * @param {number} limit - Maximum number of activities to return (default: 10)
 * @returns {Object} { activities, loading, error, refresh }
 */
export const useRecentActivities = (limit: number = 10): RecentActivitiesHook => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentActivities(limit);
      setActivities(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل الأنشطة الأخيرة';
      setError(errorMessage);
      console.error('Error fetching recent activities:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities
  };
};

