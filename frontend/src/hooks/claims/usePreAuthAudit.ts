import { useState, useEffect, useCallback } from 'react';
import preAuthAuditService from 'services/api/preauth-audit.service';

export interface PreAuthAuditOptions {
  preAuthId?: number | string;
  action?: string;
  user?: string;
  days?: number;
}

export interface PreAuthAuditHook {
  data: any[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

/**
 * Hook for PreAuthorization Audit Trail
 * @param {PreAuthAuditOptions} options - { preAuthId, action, user, days }
 */
export const usePreAuthAudit = (options: PreAuthAuditOptions = {}): PreAuthAuditHook => {
  const { preAuthId, action, user, days = 7 } = options;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(20);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchAuditData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response: any;

      // Determine which API to call based on options
      if (preAuthId) {
        response = await preAuthAuditService.getAuditHistory(preAuthId, page, size);
      } else if (action) {
        response = await preAuthAuditService.getAuditsByAction(action, page, size);
      } else if (user) {
        response = await preAuthAuditService.getAuditsByUser(user, page, size);
      } else {
        response = await preAuthAuditService.getRecentAudits(days, page, size);
      }

      // Extract data from ApiResponse wrapper: { status, message, data: { content, totalPages, ... } }
      const pageData = response?.data || response;
      const content = pageData?.content || [];
      const totalPages = pageData?.totalPages || 0;

      if (page === 0) {
        setData(content);
      } else {
        setData((prev) => [...prev, ...content]);
      }

      setHasMore(page < totalPages - 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل سجل التدقيق');
      console.error('Error fetching audit trail:', err);
    } finally {
      setLoading(false);
    }
  }, [preAuthId, action, user, days, page, size]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const refresh = () => {
    setPage(0);
    setData([]);
    setHasMore(true);
  };

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
};

export interface PreAuthAuditSearchHook {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  data: any[];
  loading: boolean;
  error: string | null;
  search: (searchQuery: string) => Promise<void>;
}

/**
 * Hook for searching audit trail
 */
export const usePreAuthAuditSearch = (initialQuery: string = ''): PreAuthAuditSearchHook => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await preAuthAuditService.searchAudits(searchQuery, 0, 50);
      // Extract data from ApiResponse wrapper
      const pageData = response?.data || response;
      setData(pageData?.content || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل البحث في سجل التدقيق');
      console.error('Error searching audit trail:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query && query.trim().length >= 2) {
      const debounce = setTimeout(() => {
        search(query);
      }, 500);
      return () => clearTimeout(debounce);
    } else {
      setData([]);
    }
  }, [query, search]);

  return {
    query,
    setQuery,
    data,
    loading,
    error,
    search
  };
};

export interface PreAuthAuditStatsHook {
  stats: any | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for audit statistics
 */
export const usePreAuthAuditStats = (): PreAuthAuditStatsHook => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await preAuthAuditService.getStatistics();
      // Extract data from ApiResponse wrapper
      setStats(response?.data || response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل إحصائيات التدقيق');
      console.error('Error fetching audit statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
};
