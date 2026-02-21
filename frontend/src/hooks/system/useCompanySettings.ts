import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { companySettingsService } from 'services/api/companySettings.service';
import { useSnackbar } from 'notistack';

/**
 * ============================================================================
 * Company Settings React Hooks
 * ============================================================================
 *
 * Custom hooks for managing employer settings and UI visibility controls.
 *
 * Hooks:
 * - useEmployerSettings: Fetch employer settings
 * - useUpdateEmployerSettings: Update employer permissions
 * - useEmployerUiVisibility: Fetch UI visibility settings
 * - useUpdateEmployerUiVisibility: Update UI visibility
 *
 * Features:
 * - Automatic cache invalidation
 * - Loading and error states
 * - Success/error notifications
 * - Granular control over employer permissions
 *
 * @created 2026-01-02
 */

// ============================================================================
// EMPLOYER SETTINGS HOOKS
// ============================================================================

export interface EmployerSettingsData {
  id?: number;
  employerId?: number;
  [key: string]: any;
}

export interface UpdateEmployerSettingsParams {
  employerId: number | string;
  data: any;
}

/**
 * Hook to fetch employer settings
 * @param {number | string} employerId - Employer ID
 * @returns {UseQueryResult<EmployerSettingsData, Error>} Query result with employer settings
 */
export const useEmployerSettings = (employerId: number | string | undefined): UseQueryResult<EmployerSettingsData, Error> => {
  return useQuery({
    queryKey: ['employerSettings', employerId],
    queryFn: async () => {
      if (!employerId) throw new Error('Employer ID is required');
      const response = await companySettingsService.getByEmployerId(employerId);
      return response;
    },
    enabled: !!employerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to update employer settings
 * @returns {UseMutationResult<any, any, UpdateEmployerSettingsParams>} Mutation result
 */
export const useUpdateEmployerSettings = (): UseMutationResult<any, any, UpdateEmployerSettingsParams> => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async ({ employerId, data }: UpdateEmployerSettingsParams) => {
      return await companySettingsService.updateSettings(employerId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employerSettings', variables.employerId] });
      enqueueSnackbar('تم تحديث إعدادات الشريك بنجاح', { variant: 'success' });
      return data;
    },
    onError: (error: any) => {
      console.error('Error updating employer settings:', error);
      enqueueSnackbar(error.response?.data?.message || 'حدث خطأ أثناء تحديث الإعدادات', {
        variant: 'error'
      });
    },
  });
};

// ============================================================================
// UI VISIBILITY HOOKS
// ============================================================================

export interface EmployerUiVisibilityData {
  [key: string]: any;
}

export interface UpdateEmployerUiVisibilityParams {
  employerId: number | string;
  data: any;
}

/**
 * Hook to fetch employer UI visibility settings
 * @param {number | string} employerId - Employer ID
 * @returns {UseQueryResult<EmployerUiVisibilityData, Error>} Query result with UI visibility configuration
 */
export const useEmployerUiVisibility = (employerId: number | string | undefined): UseQueryResult<EmployerUiVisibilityData, Error> => {
  return useQuery({
    queryKey: ['employerUiVisibility', employerId],
    queryFn: async () => {
      if (!employerId) throw new Error('Employer ID is required');
      const response = await companySettingsService.getUiVisibility(employerId);
      return response;
    },
    enabled: !!employerId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to update employer UI visibility settings
 * @returns {UseMutationResult<any, any, UpdateEmployerUiVisibilityParams>} Mutation result
 */
export const useUpdateEmployerUiVisibility = (): UseMutationResult<any, any, UpdateEmployerUiVisibilityParams> => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async ({ employerId, data }: UpdateEmployerUiVisibilityParams) => {
      return await companySettingsService.updateUiVisibility(employerId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employerUiVisibility', variables.employerId] });
      queryClient.invalidateQueries({ queryKey: ['employerSettings', variables.employerId] });
      enqueueSnackbar('تم تحديث إعدادات واجهة المستخدم بنجاح', { variant: 'success' });
      return data;
    },
    onError: (error: any) => {
      console.error('Error updating UI visibility:', error);
      enqueueSnackbar(error.response?.data?.message || 'حدث خطأ أثناء تحديث إعدادات الواجهة', {
        variant: 'error'
      });
    },
  });
};
