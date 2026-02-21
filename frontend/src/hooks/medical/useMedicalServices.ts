import { useEffect, useState, useCallback } from 'react';
import { getMedicalServices, getMedicalServiceById, getAllMedicalServices } from 'services/api/medical-services.service';

export interface MedicalServicesParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  [key: string]: any;
}

export interface MedicalServicesData {
  items: any[];
  total: number;
  page: number;
  size: number;
}

export interface MedicalServicesListHook {
  data: MedicalServicesData;
  loading: boolean;
  error: any;
  params: MedicalServicesParams;
  setParams: React.Dispatch<React.SetStateAction<MedicalServicesParams>>;
  refresh: () => void;
}

/**
 * Hook for fetching paginated medical services list
 * @param {MedicalServicesParams} initialParams - Initial query parameters
 * @returns {MedicalServicesListHook} { data, loading, error, params, setParams, refresh }
 */
export const useMedicalServicesList = (initialParams: MedicalServicesParams = {}): MedicalServicesListHook => {
  const [params, setParams] = useState<MedicalServicesParams>({
    page: 1,
    size: 20,
    sortBy: 'createdAt',
    sortDir: 'desc',
    search: '',
    ...initialParams
  });

  const [data, setData] = useState<MedicalServicesData>({
    items: [],
    total: 0,
    page: 1,
    size: 20
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMedicalServices(params);

      // Defensive: handle multiple response shapes
      const paginationData = response?.items ? response : response;
      const items = Array.isArray(paginationData?.items) ? paginationData.items : Array.isArray(paginationData) ? paginationData : [];

      setData({
        items,
        total: paginationData?.total ?? paginationData?.totalElements ?? 0,
        page: paginationData?.page ?? params.page ?? 1,
        size: paginationData?.size ?? params.size ?? 20
      });
    } catch (err: any) {
      console.error('[useMedicalServices] Failed to load services list:', err);
      setError(err);
      setData({ items: [], total: 0, page: params.page || 1, size: params.size || 20 });
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

export interface MedicalServiceDetailsHook {
  data: any | null;
  loading: boolean;
  error: any;
  refresh: () => void;
}

/**
 * Hook for fetching single medical service details
 * @param {number | string} id - Service ID
 * @returns {MedicalServiceDetailsHook} { data, loading, error, refresh }
 */
export const useMedicalServiceDetails = (id: number | string | undefined): MedicalServiceDetailsHook => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getMedicalServiceById(id);
      setData(response);
    } catch (err: any) {
      console.error('[useMedicalServices] Failed to load service details:', err);
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

export interface AllMedicalServicesHook {
  data: any[];
  loading: boolean;
  error: any;
  refresh: () => void;
}

/**
 * Hook for fetching all medical services (for dropdowns)
 * @returns {AllMedicalServicesHook} { data, loading, error, refresh }
 */
export const useAllMedicalServices = (): AllMedicalServicesHook => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllMedicalServices();
      setData(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error('[useMedicalServices] Failed to load all services:', err);
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
