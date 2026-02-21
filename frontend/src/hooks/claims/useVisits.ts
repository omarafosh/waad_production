import { useEffect, useState, useCallback } from 'react';
import visitsService from 'services/api/visits.service';

export interface VisitsListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  [key: string]: any;
}

export interface VisitsListData {
  items: any[];
  total: number;
  page: number;
  size: number;
}

export interface VisitsListHook {
  data: VisitsListData;
  loading: boolean;
  error: any | null;
  params: VisitsListParams;
  setParams: React.Dispatch<React.SetStateAction<VisitsListParams>>;
  refresh: () => void;
}

/**
 * Hook for fetching paginated visits list
 * @param {VisitsListParams} initialParams - Initial query parameters
 * @returns {VisitsListHook} { data, loading, error, params, setParams, refresh }
 */
export const useVisitsList = (initialParams: VisitsListParams = {}): VisitsListHook => {
  const [params, setParams] = useState<VisitsListParams>({
    page: 1,
    size: 20,
    sortBy: 'visitDate',
    sortDir: 'desc',
    search: '',
    ...initialParams
  });

  const [data, setData] = useState<VisitsListData>({
    items: [],
    total: 0,
    page: 1,
    size: 20
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitsService.getAll(params);

      // Defensive: handle multiple response shapes
      const paginationData = response?.data?.items ? response.data : response;
      const items = Array.isArray(paginationData?.items) ? paginationData.items : Array.isArray(paginationData) ? paginationData : [];

      setData({
        items,
        total: paginationData?.total ?? paginationData?.totalElements ?? 0,
        page: paginationData?.page ?? params.page ?? 1,
        size: paginationData?.size ?? params.size ?? 20
      });
    } catch (err: any) {
      console.error('[useVisits] Failed to load visits list:', err);
      setError(err);
      setData({ items: [], total: 0, page: params.page ?? 1, size: params.size ?? 20 });
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    params,
    setParams,
    refresh
  };
};

export interface VisitDetailsHook {
  data: any | null;
  loading: boolean;
  error: any | null;
  refresh: () => void;
}

/**
 * Hook for fetching single visit details
 * @param {number | string} id - Visit ID
 * @returns {VisitDetailsHook} { data, loading, error, refresh }
 */
export const useVisitDetails = (id: number | string | undefined): VisitDetailsHook => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await visitsService.getById(id);
      setData(response?.data || response);
    } catch (err: any) {
      console.error('[useVisits] Failed to load visit details:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

export interface VisitsByMemberHook {
  data: any[];
  loading: boolean;
  error: any | null;
  refresh: () => void;
}

/**
 * Hook for fetching visits by member
 * @param {number | string} memberId - Member ID
 * @returns {VisitsByMemberHook} { data, loading, error, refresh }
 */
export const useVisitsByMember = (memberId: number | string | undefined): VisitsByMemberHook => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await visitsService.getByMember(memberId);
      setData(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error('[useVisits] Failed to load member visits:', err);
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh
  };
};
