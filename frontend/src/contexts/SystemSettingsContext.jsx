import { createContext, useContext, useMemo, useEffect } from 'react';
import { useSettings } from 'hooks/useSettings';
import PropTypes from 'prop-types';

// ============================================================================
// SYSTEM SETTINGS CONTEXT
// ============================================================================

const SystemSettingsContext = createContext(null);

export const SystemSettingsProvider = ({ children }) => {
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

SystemSettingsProvider.propTypes = {
    children: PropTypes.node
};

export const useSystemSettings = () => {
    const context = useContext(SystemSettingsContext);
    if (!context) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
};

export default SystemSettingsContext;
