import { useCallback } from 'react';
import { useSystemSettings } from 'contexts/SystemSettingsContext'; // Changed

export interface FormatterHook {
    formatDate: (date: Date | string | number | null | undefined, overrideOptions?: Intl.DateTimeFormatOptions) => string;
    formatCurrency: (amount: number | string | null | undefined, overrideOptions?: Intl.NumberFormatOptions) => string;
}

/**
 * useFormatter - Centralized hook for data formatting
 * 
 * This hook provides consistent formatting for dates and currencies 
 * based on system-wide settings from SystemSettingsContext.
 * 
 * @version 1.0.0
 * @returns {FormatterHook} Formatting functions { formatDate, formatCurrency }
 */
export const useFormatter = (): FormatterHook => {
    const { settings } = useSystemSettings(); // Changed

    const {
        currency = 'LYD',
        dateCalendar = 'gregory',
        monthFormat = 'numeric',
        numberSystem = 'latn'
    } = settings;

    /**
     * Format date according to system settings
     * @param {Date|string|number|null|undefined} date - Date to format
     * @param {Intl.DateTimeFormatOptions} overrideOptions - Optional overrides for Intl.DateTimeFormat
     */
    const formatDate = useCallback((date: Date | string | number | null | undefined, overrideOptions: Intl.DateTimeFormatOptions = {}): string => {
        if (!date) return '---';

        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return '---';

            // Build locale string with extensions (e.g., ar-SA-u-ca-islamic-nu-arab)
            let locale = 'ar-LY'; // Default to Arabic (Libya)

            const parts: string[] = [];
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

            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: monthFormat as any,
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
     * @param {number|string|null|undefined} amount - Amount to format
     * @param {Intl.NumberFormatOptions} overrideOptions - Optional overrides for Intl.NumberFormat
     */
    const formatCurrency = useCallback((amount: number | string | null | undefined, overrideOptions: Intl.NumberFormatOptions = {}): string => {
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (value === null || value === undefined || isNaN(value as number)) return '---';

        try {
            // Build locale for numbers
            const nu = numberSystem === 'arab' ? 'nu-arab' : 'nu-latn';
            const locale = `ar-LY-u-${nu}`;

            const options: Intl.NumberFormatOptions = {
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

            return new Intl.NumberFormat(locale, options).format(value as number);
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
