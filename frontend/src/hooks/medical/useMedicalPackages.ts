import { useEffect, useState, useCallback } from 'react';
import { getMedicalPackages, getMedicalPackageById, getAllMedicalPackages } from 'services/api/medical-packages.service';

export interface MedicalPackagesParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  [key: string]: any;
}

export interface MedicalPackagesData {
  items: any[];
  total: number;
  page: number;
  size: number;
}

export interface MedicalPackagesListHook {
  data: MedicalPackagesData;
  loading: boolean;
  error: any;
  params: MedicalPackagesParams;
  setParams: React.Dispatch<React.SetStateAction<MedicalPackagesParams>>;
  refresh: () => void;
}

/**
 * Hook for fetching paginated medical packages list
 * @param {MedicalPackagesParams} initialParams - Initial query parameters
 * @returns {MedicalPackagesListHook} { data, loading, error, params, setParams, refresh }
 */
export const useMedicalPackagesList = (initialParams: MedicalPackagesParams = {}): MedicalPackagesListHook => {
  const [params, setParams] = useState<MedicalPackagesParams>({
    page: 1,
    size: 20,
    sortBy: 'createdAt',
    sortDir: 'desc',
    search: '',
    ...initialParams
  });

  const [data, setData] = useState<MedicalPackagesData>({
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
      const response = await getMedicalPackages(params);

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
      console.error('[useMedicalPackages] Failed to load packages list:', err);
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

export interface MedicalPackageDetailsHook {
  data: any | null;
  loading: boolean;
  error: any;
  refresh: () => void;
}

/**
 * Hook for fetching single medical package details
 * @param {number | string} id - Package ID
 * @returns {MedicalPackageDetailsHook} { data, loading, error, refresh }
 */
export const useMedicalPackageDetails = (id: number | string | undefined): MedicalPackageDetailsHook => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getMedicalPackageById(id);
      setData(response);
    } catch (err: any) {
      console.error('[useMedicalPackages] Failed to load package details:', err);
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

export interface AllMedicalPackagesHook {
  data: any[];
  loading: boolean;
  error: any;
  refresh: () => void;
}

/**
 * Hook for fetching all medical packages (for dropdowns)
 * @returns {AllMedicalPackagesHook} { data, loading, error, refresh }
 */
export const useAllMedicalPackages = (): AllMedicalPackagesHook => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllMedicalPackages();
      setData(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error('[useMedicalPackages] Failed to load all packages:', err);
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
