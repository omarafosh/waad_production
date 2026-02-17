import { useCallback } from 'react';
import { useCompanySettings } from 'contexts/CompanySettingsContext';

/**
 * useFormatter - Centralized hook for data formatting
 * 
 * This hook provides consistent formatting for dates and currencies 
 * based on system-wide settings from CompanySettingsContext.
 * 
 * @version 1.0.0
 * @returns {Object} Formatting functions { formatDate, formatCurrency }
 */
export const useFormatter = () => {
    const { settings } = useCompanySettings();

    const {
        currency = 'LYD',
        dateCalendar = 'gregory',
        monthFormat = 'numeric',
        numberSystem = 'latn'
    } = settings;

    /**
     * Format date according to system settings
     * @param {Date|string|number} date - Date to format
     * @param {Object} overrideOptions - Optional overrides for Intl.DateTimeFormat
     */
    const formatDate = useCallback((date, overrideOptions = {}) => {
        if (!date) return '---';

        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return '---';

            // Build locale string with extensions (e.g., ar-SA-u-ca-islamic-nu-arab)
            let locale = 'ar-LY'; // Default to Arabic (Libya)

            const parts = [];
            if (dateCalendar === 'islamic') {
                locale = 'ar-SA'; // Better support for Hijri in SA locale
                parts.push('ca-islamic');
            } else {
                parts.push('ca-gregory');
            }

            if (numberSystem === 'arab') {
                parts.push('nu-arab');
            } else {
                parts.push('nu-latn');
            }

            const fullLocale = `${locale}-u-${parts.join('-')}`;

            const options = {
                year: 'numeric',
                month: monthFormat,
                day: 'numeric',
                ...overrideOptions
            };

            return new Intl.DateTimeFormat(fullLocale, options).format(dateObj);
        } catch (error) {
            console.error('[useFormatter] formatDate error:', error);
            return typeof date === 'string' ? date : '---';
        }
    }, [dateCalendar, monthFormat, numberSystem]);

    /**
     * Format currency according to system settings
     * @param {number|string} amount - Amount to format
     * @param {Object} overrideOptions - Optional overrides for Intl.NumberFormat
     */
    const formatCurrency = useCallback((amount, overrideOptions = {}) => {
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (value === null || value === undefined || isNaN(value)) return '---';

        try {
            // Build locale for numbers
            const nu = numberSystem === 'arab' ? 'nu-arab' : 'nu-latn';
            const locale = `ar-LY-u-${nu}`;

            const options = {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                ...overrideOptions
            };

            // Custom handling for LYD to match local preference if needed
            if (currency === 'LYD' && !overrideOptions.currencyDisplay) {
                options.currencyDisplay = 'symbol';
            }

            return new Intl.NumberFormat(locale, options).format(value);
        } catch (error) {
            console.error('[useFormatter] formatCurrency error:', error);
            return `${value} ${currency}`;
        }
    }, [currency, numberSystem]);

    return {
        formatDate,
        formatCurrency,
        settings: {
            currency,
            dateCalendar,
            monthFormat,
            numberSystem
        }
    };
};

export default useFormatter;
