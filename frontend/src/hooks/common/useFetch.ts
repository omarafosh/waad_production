import { useState, useEffect, useCallback } from 'react';

export interface FetchOptions<T> {
  initialData?: T | null;
  skip?: boolean;
}

export interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  refetch: () => void;
}

/**
 * Custom hook for data fetching with loading, error, and retry logic
 * @param {Function} fetchFn - Async function that fetches data
 * @param {Array} deps - Dependencies array for useEffect
 * @param {Object} options - { initialData, skip }
 * @returns {Object} - { data, loading, error, retry, refetch }
 */
export default function useFetch<T>(
  fetchFn: () => Promise<any>,
  deps: any[] = [],
  options: FetchOptions<T> = {}
): FetchResult<T> {
  const { initialData = null, skip = false } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const fetchData = useCallback(async () => {
    if (skip) return;

    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();

      // Handle both wrapped (ApiResponse) and unwrapped (direct data) responses
      if (result && typeof result.success === 'boolean') {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'An error occurred');
        }
      } else {
        // Assume unwrapped success if no error was thrown
        setData(result);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, skip, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    retry,
    refetch
  };
}
