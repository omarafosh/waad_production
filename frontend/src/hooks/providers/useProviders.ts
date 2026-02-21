import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { providersService } from 'services/api';

export interface ProvidersListParams {
  page?: number;
  size?: number;
  [key: string]: any;
}

export interface ProvidersListData {
  content: any[];
  totalElements: number;
  totalPages: number;
  [key: string]: any;
}

export interface ProvidersListHook {
  data: ProvidersListData | null;
  loading: boolean;
  error: string | null;
  params: ProvidersListParams;
  setParams: React.Dispatch<React.SetStateAction<ProvidersListParams>>;
  refresh: () => Promise<void>;
}

export const useProvidersList = (initialParams: ProvidersListParams = { page: 0, size: 10 }): ProvidersListHook => {
  const [data, setData] = useState<ProvidersListData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ProvidersListParams>(initialParams);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await providersService.getAll(params);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المزودين');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    params,
    setParams,
    refresh: fetchData
  };
};

export interface ProviderDetailsHook {
  provider: any | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useProviderDetails = (id: string | number | undefined): ProviderDetailsHook => {
  const [provider, setProvider] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProvider = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await providersService.getById(id);
      setProvider(result);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل تفاصيل المزود');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  return {
    provider,
    loading,
    error,
    refresh: fetchProvider
  };
};

export interface CreateProviderResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface CreateProviderHook {
  create: (data: any) => Promise<CreateProviderResult>;
  creating: boolean;
  error: string | null;
}

export const useCreateProvider = (): CreateProviderHook => {
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const create = async (data: any): Promise<CreateProviderResult> => {
    setCreating(true);
    setError(null);
    try {
      const result = await providersService.create(data);
      // Invalidate providers cache to refresh list
      console.log('[useCreateProvider] Provider created, invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      return { success: true, data: result };
    } catch (err: any) {
      const errorMsg = err.message || 'فشل إنشاء المزود';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setCreating(false);
    }
  };

  return { create, creating, error };
};

export interface UpdateProviderResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface UpdateProviderHook {
  update: (id: string | number, data: any) => Promise<UpdateProviderResult>;
  updating: boolean;
  error: string | null;
}

export const useUpdateProvider = (): UpdateProviderHook => {
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (id: string | number, data: any): Promise<UpdateProviderResult> => {
    setUpdating(true);
    setError(null);
    try {
      const result = await providersService.update(id, data);
      return { success: true, data: result };
    } catch (err: any) {
      const errorMsg = err.message || 'فشل تحديث المزود';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUpdating(false);
    }
  };

  return { update, updating, error };
};

export interface DeleteProviderResult {
  success: boolean;
  error?: string;
}

export interface DeleteProviderHook {
  remove: (id: string | number) => Promise<DeleteProviderResult>;
  deleting: boolean;
  error: string | null;
}

export const useDeleteProvider = (): DeleteProviderHook => {
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string | number): Promise<DeleteProviderResult> => {
    setDeleting(true);
    setError(null);
    try {
      await providersService.remove(id);
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'فشل حذف المزود';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setDeleting(false);
    }
  };

  return { remove, deleting, error };
};

export interface AllProvidersHook {
  data: any[];
  loading: boolean;
  error: any | null;
  refresh: () => void;
}

/**
 * Hook for fetching all providers (for dropdowns)
 * @returns {AllProvidersHook} { data, loading, error, refresh }
 */
export const useAllProviders = (): AllProvidersHook => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await providersService.getAll();
      setData(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error('[useProviders] Failed to load all providers:', err);
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

export interface ProviderSelectorHook {
  data: any[];
  loading: boolean;
  error: any | null;
  refresh: () => void;
}

/**
 * Hook for fetching provider selector options (for dropdowns/autocomplete)
 * Endpoint: GET /api/providers/selector
 * @returns {ProviderSelectorHook} { data, loading, error, refresh }
 */
export const useProviderSelector = (): ProviderSelectorHook => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await providersService.getSelector();
      setData(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error('[useProviders] Failed to load provider selectors:', err);
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
