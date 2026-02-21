import axios, { AxiosRequestConfig, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
// @ts-ignore
import { logError, getUserFriendlyMessage, ErrorType } from 'services/errorLogger';

// ==============================|| AXIOS CLIENT - PRODUCTION STABILIZED ||============================== //

/**
 * PRODUCTION STABILIZATION (2026-01-13):
 * 1. Integrated error taxonomy - no more console.error for expected 401s
 * 2. Permission-aware error messages
 * 3. Silent handling of expected auth lifecycle events
 * 4. Clean console output in production
 */

// Normalize base URL - ensure it ends with /api but not /api/api
const normalizeBaseUrl = (url: string | undefined): string => {
  if (!url) return 'http://localhost:8080/api';
  // Remove trailing slash
  let normalizedUrl = url.replace(/\/+$/, '');
  // If URL ends with /api/api, fix it
  if (normalizedUrl.endsWith('/api/api')) {
    normalizedUrl = normalizedUrl.replace(/\/api\/api$/, '/api');
  }
  // If URL doesn't end with /api, add it
  if (!normalizedUrl.endsWith('/api')) {
    normalizedUrl = normalizedUrl + '/api';
  }
  return normalizedUrl;
};

const axiosServices = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  // Phase C: Enable cookie-based auth (HttpOnly JSESSIONID)
  withCredentials: true,
  // CSRF Protection
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

// ==============================|| REQUEST INTERCEPTOR - SIMPLIFIED ||============================== //

axiosServices.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 🔒 HARDENING: Prevent /api/api duplication - baseURL already has /api
    // If request URL accidentally includes /api prefix, remove it
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/');
      if (import.meta.env.DEV) {
        console.warn('⚠️ Normalized URL: removed duplicate /api/ prefix from:', config.url);
      }
    }

    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    // Session-based auth: JSESSIONID cookie sent automatically via withCredentials: true
    // CSRF disabled in backend for REST API (CORS provides protection)

    // 🔒 FIX (2026-02-06): Backend enforces STATELESS JWT. We must send Bearer token.
    const token = localStorage.getItem('serviceToken'); // From rbac.js STORAGE_KEYS.TOKEN
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ==============================|| RESPONSE INTERCEPTOR - PRODUCTION STABILIZED ||============================== //

// Define custom error interface extending AxiosError
interface CustomAxiosError extends AxiosError {
  userMessage?: string;
  technicalMessage?: string;
  errorType?: string;
}

axiosServices.interceptors.response.use(
  (response: AxiosResponse) => {
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data as any;

    const isAuthenticated = !!localStorage.getItem('serviceToken');

    // Use error taxonomy - this handles logging appropriately
    const classification = logError(error, {
      isAuthenticated,
      operation: error.config?.method?.toUpperCase(),
      component: 'axios-interceptor'
    });

    // ==========================================
    // 401 HANDLING - Clean RBAC store
    // ==========================================
    if (status === 401) {
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

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosServices.get(url, { ...config });
  return res.data;
};

export const fetcherPost = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosServices.post(url, { ...config });
  return res.data;
};

export default axiosServices;
