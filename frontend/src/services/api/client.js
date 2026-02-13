import axios from 'axios';
import { useRBACStore } from 'api/rbac';
import { logError, getUserFriendlyMessage, ErrorType } from 'services/errorLogger';

// ==============================|| TBA API CLIENT - CENTRALIZED ||============================== //

const normalizeBaseUrl = (url) => {
    if (!url) return 'http://localhost:8080/api';
    url = url.replace(/\/+$/, '');
    if (url.endsWith('/api/api')) {
        url = url.replace(/\/api\/api$/, '/api');
    }
    if (!url.endsWith('/api')) {
        url = url + '/api';
    }
    return url;
};

const apiClient = axios.create({
    baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN'
});

// ==============================|| REQUEST INTERCEPTOR ||============================== //

apiClient.interceptors.request.use(
    (config) => {
        // Prevent /api/api duplication
        if (config.url && config.url.startsWith('/api/')) {
            config.url = config.url.replace(/^\/api\//, '/');
        }

        if (import.meta.env.DEV) {
            console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        // JWT Token Injection
        const token = localStorage.getItem('serviceToken'); // From rbac.js STORAGE_KEYS.TOKEN
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// ==============================|| RESPONSE INTERCEPTOR ||============================== //

apiClient.interceptors.response.use(
    (response) => {
        if (import.meta.env.DEV) {
            console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} [${response.status}]`);
        }
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const errorData = error.response?.data;

        const rbacState = useRBACStore.getState();
        const isAuthenticated = !!rbacState.user;

        const classification = logError(error, {
            isAuthenticated,
            operation: error.config?.method?.toUpperCase(),
            component: 'api-client'
        });

        if (status === 401) {
            rbacState.clear();
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
            error.userMessage = getUserFriendlyMessage(error);
            error.errorType = classification.type;
        }

        if (status === 403) {
            const backendMessage = errorData?.message || errorData?.error || 'Access denied';
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
            error.userMessage = getUserFriendlyMessage(error);
            error.technicalMessage = backendMessage;
            error.errorType = ErrorType.PERMISSION_DENIED;
        }

        if (status >= 500) {
            error.userMessage = getUserFriendlyMessage(error);
            error.errorType = classification.type;
        }

        return Promise.reject(error);
    }
);

export default apiClient;
