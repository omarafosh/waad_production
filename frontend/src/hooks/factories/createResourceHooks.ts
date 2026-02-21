
import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

export interface ResourceHooksConfig {
  queryKey: string;
  service: any;
  methods?: {
    list?: string;
    details?: string;
    all?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
}

export interface ResourceHooks<TList = any, TDetails = any, TAll = any, TCreate = any, TUpdate = any, TDelete = any> {
  useList: (params?: any, options?: any) => UseQueryResult<TList, Error>;
  useDetails: (id: string | number | undefined, options?: any) => UseQueryResult<TDetails, Error>;
  useAll: (options?: any) => UseQueryResult<TAll, Error>;
  useCreate: () => UseMutationResult<TCreate, Error, any>;
  useUpdate: () => UseMutationResult<TUpdate, Error, { id: string | number; data: any }>;
  useDelete: () => UseMutationResult<TDelete, Error, string | number>;
}

/**
 * Factory to create standardized React Query hooks.
 * 
 * @param {ResourceHooksConfig} config - Configuration object
 */
export const createResourceHooks = ({ queryKey, service, methods = {} }: ResourceHooksConfig): ResourceHooks => {
    const baseKey = queryKey; // e.g. 'medical-categories'

    // ------------------------------------------------------------------------
    // 1. Hook for Paginated List
    // ------------------------------------------------------------------------
    const useList = (params: any = {}, options: any = {}) => {
        return useQuery({
            queryKey: [baseKey, 'list', params],
            queryFn: async () => {
                const method = methods.list || 'getList';
                return await service[method](params);
            },
            staleTime: 5 * 60 * 1000, // 5 minutes
            ...options
        });
    };

    // ------------------------------------------------------------------------
    // 2. Hook for Single Details
    // ------------------------------------------------------------------------
    const useDetails = (id: string | number | undefined, options: any = {}) => {
        return useQuery({
            queryKey: [baseKey, 'details', id],
            queryFn: async () => {
                const method = methods.details || 'getById';
                return await service[method](id);
            },
            enabled: !!id,
            staleTime: 5 * 60 * 1000,
            ...options
        });
    };

    // ------------------------------------------------------------------------
    // 3. Hook for All Items (Lookup)
    // ------------------------------------------------------------------------
    const useAll = (options: any = {}) => {
        return useQuery({
            queryKey: [baseKey, 'all'],
            queryFn: async () => {
                const method = methods.all || 'getAll';
                return await service[method]();
            },
            staleTime: 10 * 60 * 1000, // 10 minutes
            ...options
        });
    };

    // ------------------------------------------------------------------------
    // 4. Mutation Hooks (Create, Update, Delete)
    // ------------------------------------------------------------------------
    const useCreate = () => {
        const queryClient = useQueryClient();
        return useMutation({
            mutationFn: service[methods.create || 'create'],
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [baseKey] });
            }
        });
    };

    const useUpdate = () => {
        const queryClient = useQueryClient();
        return useMutation({
            mutationFn: ({ id, data }: { id: string | number; data: any }) => {
                const method = methods.update || 'update';
                return service[method](id, data);
            },
            onSuccess: (data, variables) => {
                queryClient.invalidateQueries({ queryKey: [baseKey] });
                queryClient.invalidateQueries({ queryKey: [baseKey, 'details', variables.id] });
            }
        });
    };

    const useDelete = () => {
        const queryClient = useQueryClient();
        return useMutation({
            mutationFn: (id: string | number) => {
                const method = methods.delete || 'delete';
                return service[method](id);
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [baseKey] });
            }
        });
    };

    return {
        useList,
        useDetails,
        useAll,
        useCreate,
        useUpdate,
        useDelete
    };
};
