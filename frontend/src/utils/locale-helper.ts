/**
 * Locale Helper Utility
 * توفير اللغة والتقويم والنظام العددي بناءً على إعدادات النظام
 */

/**
 * Get the current application locale with system extensions
 * @returns {string} locale string (e.g. ar-SA-u-ca-gregory-nu-latn)
 */
export const getAppLocale = (): string => {
    const nu = typeof localStorage !== 'undefined' ? localStorage.getItem('app-number-system') || 'latn' : 'latn';
    const ca = typeof localStorage !== 'undefined' ? localStorage.getItem('app-date-calendar') || 'gregory' : 'gregory';

    // umaq is the Um al-Qura calendar commonly used in SA for Hijri
    const calendar = ca === 'hijri' ? 'islamic-umaq' : 'gregory';

    return `ar-SA-u-ca-${calendar}-nu-${nu}`;
};

/**
 * Get the numbering system locale only
 * @returns {string} locale string (e.g. ar-SA-u-nu-latn)
 */
export const getNumberLocale = (): string => {
    const nu = typeof localStorage !== 'undefined' ? localStorage.getItem('app-number-system') || 'latn' : 'latn';
    return `ar-SA-u-nu-${nu}`;
};

export default getAppLocale;

