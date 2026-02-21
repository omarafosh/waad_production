import { useState, useEffect, useCallback } from 'react';
import { claimsService } from 'services/api';

export interface ClaimsListParams {
  page?: number;
  size?: number;
  [key: string]: any;
}

export interface ClaimsListData {
  content: any[];
  totalElements: number;
  page: number;
  size: number;
}

export interface ClaimsListHook {
  data: ClaimsListData;
  loading: boolean;
  error: string | null;
  params: ClaimsListParams;
  setParams: React.Dispatch<React.SetStateAction<ClaimsListParams>>;
  refresh: () => Promise<void>;
}

export const useClaimsList = (initialParams: ClaimsListParams = { page: 0, size: 10 }): ClaimsListHook => {
  const [data, setData] = useState<ClaimsListData>({ content: [], totalElements: 0, page: 0, size: 10 });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ClaimsListParams>(initialParams);

  // Sync params with initialParams when they change externally
  useEffect(() => {
    setParams(initialParams);
  }, [initialParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await claimsService.getAll(params);
      // Defensive: ensure result has expected shape
      setData({
        content: Array.isArray(result?.content) ? result.content : Array.isArray(result) ? result : [],
        totalElements: result?.totalElements ?? result?.total ?? 0,
        page: result?.page ?? params.page,
        size: result?.size ?? params.size
      });
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المطالبات');
      // Set safe default on error
      setData({ content: [], totalElements: 0, page: params.page || 0, size: params.size || 10 });
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

export interface ClaimDetailsHook {
  claim: any | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useClaimDetails = (id: string | number | undefined): ClaimDetailsHook => {
  const [claim, setClaim] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClaim = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await claimsService.getById(id);
      setClaim(result);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل تفاصيل المطالبة');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  return {
    claim,
    loading,
    error,
    refresh: fetchClaim
  };
};

export interface CreateClaimResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface CreateClaimHook {
  create: (data: any) => Promise<CreateClaimResult>;
  creating: boolean;
  error: string | null;
}

export const useCreateClaim = (): CreateClaimHook => {
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: any): Promise<CreateClaimResult> => {
    setCreating(true);
    setError(null);
    try {
      const result = await claimsService.create(data);
      return { success: true, data: result };
    } catch (err: any) {
      const errorMsg = err.message || 'فشل إنشاء المطالبة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setCreating(false);
    }
  };

  return { create, creating, error };
};

export interface UpdateClaimResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface UpdateClaimHook {
  update: (id: string | number, data: any) => Promise<UpdateClaimResult>;
  updating: boolean;
  error: string | null;
}

export const useUpdateClaim = (): UpdateClaimHook => {
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (id: string | number, data: any): Promise<UpdateClaimResult> => {
    setUpdating(true);
    setError(null);
    try {
      const result = await claimsService.update(id, data);
      return { success: true, data: result };
    } catch (err: any) {
      const errorMsg = err.message || 'فشل تحديث المطالبة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUpdating(false);
    }
  };

  return { update, updating, error };
};

export interface DeleteClaimResult {
  success: boolean;
  error?: string;
}

export interface DeleteClaimHook {
  remove: (id: string | number) => Promise<DeleteClaimResult>;
  deleting: boolean;
  error: string | null;
}

export const useDeleteClaim = (): DeleteClaimHook => {
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string | number): Promise<DeleteClaimResult> => {
    setDeleting(true);
    setError(null);
    try {
      await claimsService.remove(id);
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'فشل حذف المطالبة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setDeleting(false);
    }
  };

  return { remove, deleting, error };
};
