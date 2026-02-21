/**
 * Role-Based Landing Page Routes
 * Phase 5.5: Critical Stabilization
 *
 * Maps each role to its primary landing page to eliminate post-login navigation confusion
 */

/**
 * Get the default landing page route for a given role
 * @param {string} role - User role (SUPER_ADMIN, ACCOUNTANT, MEDICAL_REVIEWER, PROVIDER_STAFF, EMPLOYER_ADMIN)
 * @returns {string} - Route path for the role's primary landing page
 */
export const getDefaultRouteForRole = (role) => {
  const normalizedRole = (role || '').toString().trim().toUpperCase().replace(/\s+/g, '_');

  const roleRoutes = {
    SUPER_ADMIN: '/dashboard',
    ACCOUNTANT: '/settlement/batches',
    MEDICAL_REVIEWER: '/claims/inbox',
    PROVIDER_STAFF: '/provider/eligibility-check',
    EMPLOYER_ADMIN: '/',
    DATA_ENTRY: '/dashboard',
    FINANCE_VIEWER: '/dashboard'
  };

  return roleRoutes[normalizedRole] || '/dashboard';
};

/**
 * Check if a user should be redirected from their current path
 * @param {string} currentPath - Current route path
 * @param {string} role - User role
 * @returns {boolean} - True if redirect is needed
 */
export const shouldRedirectToLanding = (currentPath, role) => {
  // Redirect from root or login to role-specific landing
  if (currentPath === '/' || currentPath === '/login') {
    return true;
  }
  return false;
};
