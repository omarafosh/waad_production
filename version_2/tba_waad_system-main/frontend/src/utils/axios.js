import axios from 'axios';
import { useRBACStore } from 'api/rbac';
import { logError, getUserFriendlyMessage, ErrorType } from 'services/errorLogger';

// ==============================|| AXIOS CLIENT - PRODUCTION STABILIZED ||============================== //

/**
 * PRODUCTION STABILIZATION (2026-01-13):
 * 1. Integrated error taxonomy - no more console.error for expected 401s
 * 2. Permission-aware error messages
 * 3. Silent handling of expected auth lifecycle events
 * 4. Clean console output in production
 *
 * API VERSIONING (2026-02-03):
 * - All APIs now use /api/v1/ prefix for consistency
 * - This enables future /api/v2/ without breaking changes
 */

// Normalize base URL - ensure it ends with /api/v1
const normalizeBaseUrl = (url) => {
  if (!url) return 'http://localhost:8080/api/v1';
  // Remove trailing slash
  url = url.replace(/\/+$/, '');
  // Fix any duplication patterns
  url = url.replace(/\/api\/v1\/api\/v1$/, '/api/v1');
  url = url.replace(/\/api\/api$/, '/api');
  // Ensure ends with /api/v1
  if (url.endsWith('/api/v1')) {
    return url;
  }
  if (url.endsWith('/api')) {
    return url + '/v1';
  }
  return url + '/api/v1';
};

const axiosServices = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  // Phase C: Enable cookie-based auth (HttpOnly JSESSIONID)
  withCredentials: true
});

// ==============================|| REQUEST INTERCEPTOR - SIMPLIFIED ||============================== //

axiosServices.interceptors.request.use(
  (config) => {
    // 🔒 HARDENING: Prevent URL duplication - baseURL already has /api/v1
    // Remove any /api/v1/ or /api/ prefix from request URLs
    if (config.url) {
      // Remove /api/v1/ prefix if present
      if (config.url.startsWith('/api/v1/')) {
        config.url = config.url.replace(/^\/api\/v1\//, '/');
      }
      // Remove /api/ prefix if present
      else if (config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api\//, '/');
      }
      // Remove /v1/ prefix if present (for services using /v1/xxx)
      else if (config.url.startsWith('/v1/')) {
        config.url = config.url.replace(/^\/v1\//, '/');
      }
    }

    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    // Session-based auth: JSESSIONID cookie sent automatically via withCredentials: true
    // CSRF disabled in backend for REST API (CORS provides protection)

    // 🔐 JWT FALLBACK: Also send Authorization header if token exists
    // This provides dual-auth support for environments where cookies may not work
    // (e.g., Codespaces port forwarding, different domains)
    const token = localStorage.getItem('serviceToken');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ==============================|| RESPONSE INTERCEPTOR - PRODUCTION STABILIZED ||============================== //

axiosServices.interceptors.response.use(
  (response) => {
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data;

    // Get current auth state for context
    const rbacState = useRBACStore.getState();
    const isAuthenticated = !!rbacState.user;

    // Use error taxonomy - this handles logging appropriately
    const classification = logError(error, {
      isAuthenticated,
      operation: error.config?.method?.toUpperCase(),
      component: 'axios-interceptor'
    });

    // ==========================================
    // 401 HANDLING - Clean RBAC store + Force Logout
    // ==========================================
    if (status === 401) {
      // SILENT HANDLING FOR SESSION CHECK
      // Startup check (/auth/session/me) naturally returns 401 if not logged in.
      // We suppress the warning to keep console clean for this expected case.
      const isSessionCheck = url?.includes('/auth/session/me');
      
      if (!isSessionCheck) {
        console.warn('🔒 401 Unauthorized - Session expired or invalid');
      }

      // Clear RBAC store only (no redirect - let router handle)
      rbacState.clear();

      // Clear any stored tokens
      localStorage.removeItem('serviceToken');
      sessionStorage.clear();

      // Notify AuthContext to handle logout
      window.dispatchEvent(new CustomEvent('auth:session-expired'));

      // Attach user-friendly message
      error.userMessage = getUserFriendlyMessage(error);
      error.errorType = classification.type;
    }

    // ==========================================
    // 403 HANDLING - Permission denied
    // ==========================================
    if (status === 403) {
      // Extract user-friendly message from backend response
      const backendMessage = errorData?.message || errorData?.error || 'Access denied';

      // Dispatch custom event for UI components to handle
      window.dispatchEvent(
        new CustomEvent('api:forbidden', {
          detail: {
            url,
            method: error.config?.method?.toUpperCase(),
            message: backendMessage,
            resource: url?.split('/').filter(Boolean)[0] || 'resource'
          }
        })
      );

      // Attach user-friendly messages
      error.userMessage = getUserFriendlyMessage(error);
      error.technicalMessage = backendMessage;
      error.errorType = ErrorType.PERMISSION_DENIED;
    }

    // ==========================================
    // 500 HANDLING - Server error
    // ==========================================
    if (status >= 500) {
      error.userMessage = getUserFriendlyMessage(error);
      error.errorType = classification.type;
    }

    return Promise.reject(error);
  }
);

// ==============================|| LEGACY FETCHERS (for backward compatibility) ||============================== //

export const fetcher = async (args) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosServices.get(url, { ...config });
  return res.data;
};

export const fetcherPost = async (args) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosServices.post(url, { ...config });
  return res.data;
};

export default axiosServices;
