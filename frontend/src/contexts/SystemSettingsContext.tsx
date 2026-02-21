import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { useSettings } from 'hooks/useSettings';

// ============================================================================
// SYSTEM SETTINGS CONTEXT
// ============================================================================

export interface SystemSettingsContextType {
    settings: any;
    isLoading: boolean;
    error: any;
    updateSettings: (newSettings: any) => Promise<void>;
    isUpdating: boolean;
    systemName: string;
    systemCode: string;
    logoUrl?: string;
    businessType?: string;
    currency: string;
    primaryColor: string;
    fontFamily: string;
    numberSystem: string;
    dateCalendar: string;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | null>(null);

export interface SystemSettingsProviderProps {
    children: ReactNode;
}

export const SystemSettingsProvider: React.FC<SystemSettingsProviderProps> = ({ children }) => {
    const { settings, isLoading, error, updateSettings, isUpdating } = useSettings();

    const value = useMemo(() => ({
        // Data
        settings: settings || {},
        isLoading,
        error,

        // Actions
        updateSettings,
        isUpdating,

        // Computed (Helpers for cleaner UI code)
        systemName: settings?.systemName || 'Top Doctors TPA',
        systemCode: settings?.systemCode || 'TOP_DOCS',
        logoUrl: settings?.logoUrl,
        businessType: settings?.businessType,
        currency: settings?.currency || 'LYD',
        primaryColor: settings?.primaryColor || '#1890ff',
        fontFamily: settings?.fontFamily || 'Cairo',
        numberSystem: settings?.numberSystem || 'latn',
        dateCalendar: settings?.dateCalendar || 'gregory'
    }), [settings, isLoading, error, updateSettings, isUpdating]);

    // Persist key settings to localStorage for non-hook utilities (like date-formatter)
    useEffect(() => {
        if (settings) {
            localStorage.setItem('app-number-system', settings.numberSystem || 'latn');
            localStorage.setItem('app-date-calendar', settings.dateCalendar || 'gregory');
        }
    }, [settings]);

    return (
        <SystemSettingsContext.Provider value={value}>
            {children}
        </SystemSettingsContext.Provider>
    );
};

export const useSystemSettings = (): SystemSettingsContextType => {
    const context = useContext(SystemSettingsContext);
    if (!context) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
};

export default SystemSettingsContext;
