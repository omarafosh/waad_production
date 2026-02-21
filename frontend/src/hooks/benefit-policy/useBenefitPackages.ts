import { useEffect, useState, useCallback } from 'react';
import { getBenefitPackages, getBenefitPackageById, getAllBenefitPackages } from '../../services/api/benefit-packages.service';

export interface BenefitPackageParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  [key: string]: any;
}

export interface BenefitPackageData {
  items: any[];
  total: number;
  page: number;
  size: number;
}

export interface BenefitPackagesListHook {
  data: BenefitPackageData;
  loading: boolean;
  error: any;
  params: BenefitPackageParams;
  setParams: React.Dispatch<React.SetStateAction<BenefitPackageParams>>;
  refresh: () => void;
}

/**
 * Hook for fetching paginated benefit packages list
 * @param {Object} initialParams - Initial query parameters
 * @returns {Object} { data, loading, error, params, setParams, refresh }
 */
export const useBenefitPackagesList = (initialParams: BenefitPackageParams = {}): BenefitPackagesListHook => {
  const [params, setParams] = useState<BenefitPackageParams>({
    page: 1,
    size: 20,
    sortBy: 'createdAt',
    sortDir: 'desc',
    search: '',
    ...initialParams
  });

  const [data, setData] = useState<BenefitPackageData>({
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
      const response = await getBenefitPackages(params);

      // Defensive: handle multiple response shapes
      const paginationData = response?.items ? response : response;
      const items = Array.isArray(paginationData?.items) ? paginationData.items : Array.isArray(paginationData) ? paginationData : [];

      setData({
        items,
        total: paginationData?.total ?? paginationData?.totalElements ?? 0,
        page: paginationData?.page ?? params.page ?? 1,
        size: paginationData?.size ?? params.size ?? 20
      });
    } catch (err) {
      console.error('[useBenefitPackages] Failed to load packages list:', err);
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

export interface BenefitPackageDetailsHook {
  data: any;
  loading: boolean;
  error: any;
  refresh: () => void;
}

/**
 * Hook for fetching single benefit package details
 * @param {number} id - Package ID
 * @returns {Object} { data, loading, error, refresh }
 */
export const useBenefitPackageDetails = (id: number | string | null): BenefitPackageDetailsHook => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getBenefitPackageById(id);
      setData(response);
    } catch (err) {
      console.error('[useBenefitPackages] Failed to load package details:', err);
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

export interface AllBenefitPackagesHook {
  data: any[];
  loading: boolean;
  error: any;
  refresh: () => void;
}

/**
 * Hook for fetching all benefit packages (for dropdowns)
 * @returns {Object} { data, loading, error, refresh }
 */
export const useAllBenefitPackages = (): AllBenefitPackagesHook => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllBenefitPackages();
      setData(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('[useBenefitPackages] Failed to load all packages:', err);
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
