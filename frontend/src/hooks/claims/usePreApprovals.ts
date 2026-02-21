import { useState, useEffect, useCallback } from 'react';
import preApprovalsService from 'services/api/pre-approvals.service';

export interface PreApprovalsParams {
  page?: number;
  size?: number;
  [key: string]: any;
}

export interface PreApprovalsData {
  items: any[];
  total: number;
  page: number;
  size: number;
}

export interface PreApprovalsListHook {
  data: PreApprovalsData;
  loading: boolean;
  error: string | null;
  params: PreApprovalsParams;
  setParams: React.Dispatch<React.SetStateAction<PreApprovalsParams>>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing paginated pre-approvals list
 * @param {PreApprovalsParams} initialParams - Initial query parameters
 * @returns {PreApprovalsListHook} - {data, loading, error, params, setParams, refresh}
 */
export const usePreApprovalsList = (initialParams: PreApprovalsParams = { page: 1, size: 10 }): PreApprovalsListHook => {
  const [data, setData] = useState<PreApprovalsData>({ items: [], total: 0, page: 1, size: 10 });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<PreApprovalsParams>(initialParams);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await preApprovalsService.getAll(params);
      // Defensive: ensure result has expected shape
      setData({
        items: Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : [],
        total: result?.total ?? result?.totalElements ?? 0,
        page: result?.page ?? params.page ?? 1,
        size: result?.size ?? params.size ?? 10
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل الموافقات المسبقة');
      console.error('Error fetching pre-approvals:', err);
      // Set safe default on error
      setData({ items: [], total: 0, page: params.page || 1, size: params.size || 10 });
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

export interface PreApprovalDetailsHook {
  preApproval: any | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing single pre-approval details
 * @param {number | string} id - Pre-approval ID
 * @returns {PreApprovalDetailsHook} - {preApproval, loading, error, refresh}
 */
export const usePreApprovalDetails = (id: number | string | undefined): PreApprovalDetailsHook => {
  const [preApproval, setPreApproval] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await preApprovalsService.getById(id);
      setPreApproval(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تحميل تفاصيل الموافقة المسبقة');
      console.error('Error fetching pre-approval:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    preApproval,
    loading,
    error,
    refresh: fetchData
  };
};

export interface CreatePreApprovalHook {
  create: (data: any) => Promise<any>;
  creating: boolean;
  error: string | null;
}

/**
 * Hook for creating pre-approval
 * @returns {CreatePreApprovalHook} - {create, creating, error}
 */
export const useCreatePreApproval = (): CreatePreApprovalHook => {
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: any): Promise<any> => {
    try {
      setCreating(true);
      setError(null);
      const result = await preApprovalsService.create(data);
      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'فشل إنشاء الموافقة المسبقة';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  return { create, creating, error };
};

export interface UpdatePreApprovalHook {
  update: (id: number | string, data: any) => Promise<any>;
  updating: boolean;
  error: string | null;
}

/**
 * Hook for updating pre-approval
 * @returns {UpdatePreApprovalHook} - {update, updating, error}
 */
export const useUpdatePreApproval = (): UpdatePreApprovalHook => {
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (id: number | string, data: any): Promise<any> => {
    try {
      setUpdating(true);
      setError(null);
      const result = await preApprovalsService.update(id, data);
      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'فشل تحديث الموافقة المسبقة';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  return { update, updating, error };
};

export interface DeletePreApprovalHook {
  remove: (id: number | string) => Promise<boolean>;
  deleting: boolean;
  error: string | null;
}

/**
 * Hook for deleting pre-approval
 * @returns {DeletePreApprovalHook} - {remove, deleting, error}
 */
export const useDeletePreApproval = (): DeletePreApprovalHook => {
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: number | string): Promise<boolean> => {
    try {
      setDeleting(true);
      setError(null);
      await preApprovalsService.remove(id);
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'فشل حذف الموافقة المسبقة';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  return { remove, deleting, error };
};
