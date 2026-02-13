/**
 * ════════════════════════════════════════════════════════════════════════════════════════
 * PROVIDER SECURITY CONSTANTS (2026-01-16)
 * ════════════════════════════════════════════════════════════════════════════════════════
 * 
 * Constants and utilities for Provider Portal security enforcement.
 * 
 * ARCHITECTURAL RULES:
 * 1. PROVIDER users can ONLY access /provider/* routes
 * 2. PROVIDER users must have providerId (validated at login)
 * 3. All data operations use providerId from session, NOT from request
 * 4. No direct access to admin routes, members, employers, etc.
 * 
 * ════════════════════════════════════════════════════════════════════════════════════════
 */

/**
 * Routes allowed for PROVIDER users
 */
export const PROVIDER_ALLOWED_ROUTES = [
  '/provider',
  '/provider/eligibility-check',
  '/provider/visits',
  '/provider/claims/submit'
];

/**
 * Routes explicitly blocked for PROVIDER users
 */
export const PROVIDER_BLOCKED_ROUTES = [
  '/dashboard',
  '/members',
  '/employers',
  '/providers',
  '/claims',
  '/pre-approvals',
  '/reports',
  '/settings',
  '/rbac',
  '/audit'
];

/**
 * Default redirect for PROVIDER users
 */
export const PROVIDER_DEFAULT_ROUTE = '/provider/eligibility-check';

/**
 * Error codes for Provider security issues
 */
export const PROVIDER_ERROR_CODES = {
  NOT_LINKED: 'PROVIDER_NOT_LINKED',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  PROVIDER_INACTIVE: 'PROVIDER_INACTIVE',
  ACCESS_DENIED: 'PROVIDER_ACCESS_DENIED'
};

/**
 * Error messages for Provider security issues (bilingual)
 */
export const PROVIDER_ERROR_MESSAGES = {
  [PROVIDER_ERROR_CODES.NOT_LINKED]: {
    ar: 'حساب مقدم الخدمة غير مكتمل الإعداد. يرجى التواصل مع مدير النظام.',
    en: 'Provider account setup incomplete. Please contact system administrator.'
  },
  [PROVIDER_ERROR_CODES.PROVIDER_NOT_FOUND]: {
    ar: 'مقدم الخدمة المرتبط بالحساب غير موجود في النظام.',
    en: 'The linked provider does not exist in the system.'
  },
  [PROVIDER_ERROR_CODES.PROVIDER_INACTIVE]: {
    ar: 'مقدم الخدمة المرتبط بالحساب غير نشط.',
    en: 'The linked provider is not active.'
  },
  [PROVIDER_ERROR_CODES.ACCESS_DENIED]: {
    ar: 'لا يمكن الوصول إلى هذه الصفحة. مقدمو الخدمة يمكنهم الوصول فقط لبوابة مقدم الخدمة.',
    en: 'Access denied. Providers can only access the Provider Portal.'
  }
};

/**
 * Check if a user is a PROVIDER
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isProviderUser = (user) => {
  if (!user || !user.roles) return false;
  return user.roles.includes('PROVIDER');
};

/**
 * Check if PROVIDER user has valid provider binding
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const hasValidProviderBinding = (user) => {
  if (!isProviderUser(user)) return true; // Non-providers always pass
  return !!user.providerId;
};

/**
 * Check if a route is allowed for PROVIDER users
 * @param {string} pathname - Current route pathname
 * @returns {boolean}
 */
export const isRouteAllowedForProvider = (pathname) => {
  return PROVIDER_ALLOWED_ROUTES.some(route => pathname.startsWith(route));
};

/**
 * Get Provider-specific error message
 * @param {string} errorCode - Error code from PROVIDER_ERROR_CODES
 * @param {string} lang - Language ('ar' or 'en')
 * @returns {string}
 */
export const getProviderErrorMessage = (errorCode, lang = 'ar') => {
  const messages = PROVIDER_ERROR_MESSAGES[errorCode];
  if (!messages) return 'Unknown error';
  return messages[lang] || messages.en;
};
