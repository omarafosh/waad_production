/**
 * ============================================================================
 * CompanySettingsContext - SINGLE SOURCE OF TRUTH for Company Branding
 * ============================================================================
 *
 * This context provides centralized access to company settings across the app.
 * 
 * USAGE:
 * - Loaded ONCE at app startup
 * - Available to Header, Dashboard, Reports, Export utilities
 * - Persisted in database (not localStorage)
 * 
 * CONSUMERS:
 * - LogoMain / LogoIcon components
 * - Header component (company name)
 * - PDF export utilities (branding)
 * - Excel export utilities (company name header)
 * - Settings page (editing)
 *
 * @created 2026-01-24
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { companyService } from 'services/api/company.service';

// Default static logo fallback
import waadLogoFallback from 'assets/images/waad-logo.png';

// Default settings (fallback when no DB settings exist)
const DEFAULT_SETTINGS = {
  companyName: 'نظام وعد الطبي',
  companyNameEn: 'Waad Medical System',
  businessType: 'إدارة التأمين الصحي', // Activity/business type
  businessTypeEn: 'Health Insurance Management',
  logoUrl: null,
  logoBase64: null,
  primaryColor: '#1976d2',
  secondaryColor: '#42a5f5',
  headerStyle: 'gradient', // 'light' | 'dark' | 'gradient' | 'custom'
  phone: '',
  email: '',
  address: '',
  website: '',
  footerText: 'جميع الحقوق محفوظة © 2026',
  footerTextEn: 'All Rights Reserved © 2026',
  fontFamily: 'Tajawal',
  fontSize: 12
};

// Create context
const CompanySettingsContext = createContext(null);

/**
 * CompanySettingsProvider - Wraps app to provide company settings
 */
export function CompanySettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch company settings from backend
   */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch default company (single-tenant mode)
      const response = await companyService.getSystemCompany();
      const companyData = response?.data || response;

      if (companyData) {
        setSettings({
          ...DEFAULT_SETTINGS,
          companyName: companyData.name || DEFAULT_SETTINGS.companyName,
          companyNameEn: companyData.nameEn || companyData.name || DEFAULT_SETTINGS.companyNameEn,
          logoUrl: companyData.logoUrl || null,
          logoBase64: companyData.logoBase64 || null,
          primaryColor: companyData.primaryColor || DEFAULT_SETTINGS.primaryColor,
          secondaryColor: companyData.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
          headerStyle: companyData.headerStyle || DEFAULT_SETTINGS.headerStyle,
          phone: companyData.phone || '',
          email: companyData.email || '',
          address: companyData.address || '',
          website: companyData.website || '',
          footerText: companyData.footerText || DEFAULT_SETTINGS.footerText,
          footerTextEn: companyData.footerTextEn || DEFAULT_SETTINGS.footerTextEn,
          fontFamily: companyData.fontFamily || DEFAULT_SETTINGS.fontFamily,
          fontSize: companyData.fontSize || DEFAULT_SETTINGS.fontSize
        });
      }
    } catch (err) {
      console.error('[CompanySettings] Failed to load settings:', err);
      setError(err.message || 'فشل في تحميل إعدادات الشركة');
      // Keep default settings on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /**
   * Update settings (after save from settings page)
   */
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  /**
   * Refresh settings from server
   */
  const refreshSettings = useCallback(() => {
    return fetchSettings();
  }, [fetchSettings]);

  /**
   * Get logo source (prioritize base64 > url > fallback)
   */
  const getLogoSrc = useCallback(() => {
    if (settings.logoBase64) {
      return settings.logoBase64;
    }
    if (settings.logoUrl) {
      return settings.logoUrl;
    }
    // Fallback to static asset
    return waadLogoFallback;
  }, [settings.logoBase64, settings.logoUrl]);

  /**
   * Check if logo is available
   */
  const hasLogo = useCallback(() => {
    return !!(settings.logoBase64 || settings.logoUrl);
  }, [settings.logoBase64, settings.logoUrl]);

  /**
   * Get company initials for fallback avatar
   */
  const getInitials = useCallback(() => {
    const name = settings.companyName || settings.companyNameEn || 'TBA';
    return name.charAt(0).toUpperCase();
  }, [settings.companyName, settings.companyNameEn]);

  const value = useMemo(() => ({
    // Settings data
    settings,
    loading,
    error,

    // Actions
    updateSettings,
    refreshSettings,

    // Helper functions
    getLogoSrc,
    hasLogo,
    getInitials,

    // Commonly accessed values (convenience)
    companyName: settings.companyName,
    companyNameEn: settings.companyNameEn,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
  }), [settings, loading, error, updateSettings, refreshSettings, getLogoSrc, hasLogo, getInitials]);

  return (
    <CompanySettingsContext.Provider value={value}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

CompanySettingsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * useCompanySettings - Hook to access company settings
 * 
 * @returns {Object} Company settings and helpers
 * 
 * @example
 * const { companyName, getLogoSrc, primaryColor } = useCompanySettings();
 * <img src={getLogoSrc()} alt={companyName} />
 */
export function useCompanySettings() {
  const context = useContext(CompanySettingsContext);

  if (!context) {
    console.warn('[useCompanySettings] Must be used within CompanySettingsProvider');
    // Return defaults for graceful degradation
    return {
      settings: DEFAULT_SETTINGS,
      loading: false,
      error: null,
      updateSettings: () => { },
      refreshSettings: () => Promise.resolve(),
      getLogoSrc: () => waadLogoFallback,
      hasLogo: () => false,
      getInitials: () => 'T',
      companyName: DEFAULT_SETTINGS.companyName,
      companyNameEn: DEFAULT_SETTINGS.companyNameEn,
      logoUrl: null,
      primaryColor: DEFAULT_SETTINGS.primaryColor,
    };
  }

  return context;
}

export default CompanySettingsContext;
