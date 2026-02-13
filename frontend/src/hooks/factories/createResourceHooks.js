
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Factory to create standardized React Query hooks.
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.queryKey - Base query key (e.g., 'medical-categories')
 * @param {Object} config.service - The service module containing API methods
 * @param {Object} [config.methods] - Method name mapping
 * @param {string} [config.methods.list] - Method name for paginated list (default: 'getMedicalCategories')
 * @param {string} [config.methods.details] - Method name for details (default: 'getMedicalCategoryById')
 * @param {string} [config.methods.all] - Method name for all items (default: 'getAllMedicalCategories')
 * @param {string} [config.methods.create] - Method name for create
 * @param {string} [config.methods.update] - Method name for update
 * @param {string} [config.methods.delete] - Method name for delete
 */
export const createResourceHooks = ({ queryKey, service, methods = {} }) => {
    const baseKey = queryKey; // e.g. 'medical-categories'

    // ------------------------------------------------------------------------
    // 1. Hook for Paginated List
    // ------------------------------------------------------------------------
    const useList = (params = {}, options = {}) => {
        return useQuery({
            queryKey: [baseKey, 'list', params],
            queryFn: async () => {
                const method = methods.list || 'getList';
                return await service[method](params);
            },
            keepPreviousData: true,
            staleTime: 5 * 60 * 1000, // 5 minutes
            ...options
        });
    };

    // ------------------------------------------------------------------------
    // 2. Hook for Single Details
    // ------------------------------------------------------------------------
    const useDetails = (id, options = {}) => {
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
    const useAll = (options = {}) => {
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
            mutationFn: ({ id, data }) => {
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
            mutationFn: (id) => {
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
