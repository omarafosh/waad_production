import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import settingService from 'services/api/setting.service';
import { useSnackbar } from 'notistack';

export interface SystemSettings {
    systemName?: string;
    systemCode?: string;
    logoUrl?: string;
    businessType?: string;
    currency?: string;
    primaryColor?: string;
    fontFamily?: string;
    numberSystem?: string;
    dateCalendar?: string;
    [key: string]: any;
}

/**
 * Hook for managing System Settings.
 * Replaces useCompany.js
 */
export const useSettings = () => {
    const queryClient = useQueryClient();
    const { enqueueSnackbar } = useSnackbar();

    // Query Key
    const SETTINGS_KEY = ['settings'];

    // ============================================================================
    // FETCH SETTINGS
    // ============================================================================
    const {
        data: settings,
        isLoading,
        error,
        refetch
    } = useQuery<SystemSettings>({
        queryKey: SETTINGS_KEY,
        queryFn: settingService.getSettings,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        select: (response: any) => {
            // API returns { success: true, message: "...", data: {...} }
            // We want the data object directly
            return response?.data || response;
        }
    });

    // ============================================================================
    // UPDATE SETTINGS
    // ============================================================================
    const updateSettingsMutation = useMutation({
        mutationFn: settingService.updateSettings,
        onSuccess: (updatedData: any) => {
            // Invalidate and refetch
            queryClient.setQueryData(SETTINGS_KEY, (oldData: any) => {
                // Optimistic update or merge
                if (oldData && oldData.data) {
                    return { ...oldData, data: updatedData.data || updatedData };
                }
                return updatedData;
            });
            queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });

            enqueueSnackbar('تم تحديث إعدادات النظام بنجاح', { variant: 'success' });
        },
onError: (err: any) => {
            console.error('Error updating settings:', err);
            enqueueSnackbar(err.response?.data?.message || 'حدث خطأ أثناء تحديث الإعدادات', { variant: 'error' });
        }
    });

    return {
        // Data
        settings,
        isLoading,
        error,

        // Actions
        refetch,
        updateSettings: updateSettingsMutation.mutateAsync,
        isUpdating: updateSettingsMutation.isPending
    };
};

export default useSettings;
