/**
 * Permission-Aware API Hook
 * ==========================
 * 
 * Prevents API calls when user doesn't have permission.
 * Reduces 403 errors from dashboard loading data user can't access.
 * 
 * PRODUCTION STABILIZATION (2026-01-13):
 * - Check permissions BEFORE making API calls
 * - Return empty data instead of 403 errors
 * - Clean console by preventing unnecessary requests
 */

import { useCallback, useMemo } from 'react';
import { useRBAC } from 'api/rbac';
import { PermissionDomain } from 'constants/rbac';
import axiosClient from 'utils/axios';

// ==============================|| API DOMAIN MAPPING ||============================== //

/**
 * Map API endpoints to permission domains
 * Used to check if user can access an endpoint before calling it
 */
const API_DOMAIN_MAP = {
  // Members
  '/members': PermissionDomain.MEMBERS,
  '/member': PermissionDomain.MEMBERS,
  
  // Claims
  '/claims': PermissionDomain.CLAIMS,
  '/claim': PermissionDomain.CLAIMS,
  
  // Providers
  '/providers': PermissionDomain.PROVIDERS,
  '/provider': PermissionDomain.PROVIDERS,
  
  // Employers
  '/employers': PermissionDomain.EMPLOYERS,
  '/employer': PermissionDomain.EMPLOYERS,
  
  // Policies
  '/benefit-policies': PermissionDomain.POLICIES,
  '/medical-packages': PermissionDomain.POLICIES,
  '/medical-categories': PermissionDomain.POLICIES,
  
  // Pre-Authorization
  '/pre-authorizations': PermissionDomain.PREAUTH,
  '/preauth': PermissionDomain.PREAUTH,
  
  // Reports
  '/reports': PermissionDomain.REPORTS,
  '/dashboard': PermissionDomain.REPORTS,
  
  // Users & RBAC (SUPER_ADMIN only)
  '/users': PermissionDomain.RBAC,
  '/roles': PermissionDomain.RBAC,
  '/rbac': PermissionDomain.RBAC,
  
  // System (SUPER_ADMIN only)
  '/system': PermissionDomain.SYSTEM,
  '/settings': PermissionDomain.SYSTEM,
  '/audit': PermissionDomain.SYSTEM
};

/**
 * Get the permission domain for a URL
 * @param {string} url - API endpoint URL
 * @returns {string|null} Permission domain or null if not mapped
 */
export const getDomainForUrl = (url) => {
  if (!url) return null;
  
  // Normalize URL
  const normalizedUrl = url.toLowerCase().replace(/^\/api/, '');
  
  // Find matching domain
  for (const [pattern, domain] of Object.entries(API_DOMAIN_MAP)) {
    if (normalizedUrl.startsWith(pattern)) {
      return domain;
    }
  }
  
  return null;
};

// ==============================|| PERMISSION-AWARE API HOOK ||============================== //

/**
 * Hook that provides permission-checked API methods
 * Returns null/empty instead of making unauthorized calls
 * 
 * @returns {{ 
 *   canAccess: function,
 *   get: function,
 *   post: function,
 *   put: function,
 *   delete: function 
 * }}
 */
export const usePermissionAwareApi = () => {
  const { hasAccessToDomain, isSuperAdmin, primaryRole } = useRBAC();
  
  /**
   * Check if user can access a URL based on permission domain
   * @param {string} url - API endpoint URL
   * @returns {boolean}
   */
  const canAccess = useCallback((url) => {
    // SUPER_ADMIN can access everything
    if (isSuperAdmin) return true;
    
    const domain = getDomainForUrl(url);
    
    // If no domain mapping, allow access (public or unmapped endpoint)
    if (!domain) return true;
    
    return hasAccessToDomain(domain);
  }, [hasAccessToDomain, isSuperAdmin]);
  
  /**
   * Permission-aware GET request
   * Returns null if user doesn't have permission
   */
  const get = useCallback(async (url, config = {}) => {
    if (!canAccess(url)) {
      console.info(`ℹ️ [PermissionAware] Skipping GET ${url} - no permission for domain`);
      return { data: null, skipped: true };
    }
    return axiosClient.get(url, config);
  }, [canAccess]);
  
  /**
   * Permission-aware POST request
   * Returns null if user doesn't have permission
   */
  const post = useCallback(async (url, data, config = {}) => {
    if (!canAccess(url)) {
      console.info(`ℹ️ [PermissionAware] Skipping POST ${url} - no permission for domain`);
      return { data: null, skipped: true };
    }
    return axiosClient.post(url, data, config);
  }, [canAccess]);
  
  /**
   * Permission-aware PUT request
   * Returns null if user doesn't have permission
   */
  const put = useCallback(async (url, data, config = {}) => {
    if (!canAccess(url)) {
      console.info(`ℹ️ [PermissionAware] Skipping PUT ${url} - no permission for domain`);
      return { data: null, skipped: true };
    }
    return axiosClient.put(url, data, config);
  }, [canAccess]);
  
  /**
   * Permission-aware DELETE request
   * Returns null if user doesn't have permission
   */
  const del = useCallback(async (url, config = {}) => {
    if (!canAccess(url)) {
      console.info(`ℹ️ [PermissionAware] Skipping DELETE ${url} - no permission for domain`);
      return { data: null, skipped: true };
    }
    return axiosClient.delete(url, config);
  }, [canAccess]);
  
  return useMemo(() => ({
    canAccess,
    get,
    post,
    put,
    delete: del
  }), [canAccess, get, post, put, del]);
};

// ==============================|| PERMISSION-AWARE DATA HOOK ||============================== //

/**
 * Hook for fetching data only if user has permission
 * Wraps common data-fetching patterns with permission checks
 * 
 * @param {string} domain - Permission domain to check
 * @param {function} fetchFn - Async function to fetch data
 * @param {array} deps - Dependencies for useEffect
 * @returns {{ data: any, loading: boolean, error: any, hasPermission: boolean }}
 */
export const usePermissionAwareData = (domain, fetchFn, deps = []) => {
  const { hasAccessToDomain, isSuperAdmin, isInitialized } = useRBAC();
  
  const hasPermission = useMemo(() => {
    if (!isInitialized) return false; // Wait for RBAC to initialize
    if (isSuperAdmin) return true;
    return hasAccessToDomain(domain);
  }, [isInitialized, isSuperAdmin, hasAccessToDomain, domain]);
  
  // This hook is designed to be used with useEffect in components
  // Return permission info so component can decide whether to fetch
  return {
    hasPermission,
    isInitialized
  };
};

// ==============================|| EXPORTS ||============================== //

export default {
  usePermissionAwareApi,
  usePermissionAwareData,
  getDomainForUrl,
  API_DOMAIN_MAP
};
