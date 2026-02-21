import { AxiosError } from 'axios';
// @ts-ignore
import { useRBACStore } from 'store';

/**
 * Error Logging Service - Production Stabilization
 * ================================================
 * 
 * Centralized error handling with proper taxonomy:
 * - Expected errors (401 pre-login, 403 permission denied) → Info/Debug
 * - Unexpected errors (500, network) → Error level
 * - Validation errors (400) → Warning
 * 
 * PRODUCTION STABILIZATION (2026-01-13):
 * - Prevents console.error noise from expected behavior
 * - Classifies errors by severity and type
 * - Provides context-aware logging
 */

// ==============================|| ERROR TYPES ||============================== //

export enum ErrorType {
  // Authentication related
  AUTH_REQUIRED = 'AUTH_REQUIRED',           // 401 - Expected pre-login
  AUTH_EXPIRED = 'AUTH_EXPIRED',             // 401 - Session expired (unexpected)

  // Authorization related
  PERMISSION_DENIED = 'PERMISSION_DENIED',   // 403 - User doesn't have access
  ROLE_INSUFFICIENT = 'ROLE_INSUFFICIENT',   // 403 - Role too low

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',     // 400 - Bad request
  NOT_FOUND = 'NOT_FOUND',                   // 404 - Resource not found

  // Server
  SERVER_ERROR = 'SERVER_ERROR',             // 500 - Internal error
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 503 - Service down

  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',           // No response
  TIMEOUT = 'TIMEOUT',                       // Request timeout

  // Unknown
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  DEBUG = 'debug',     // Expected behavior, no action needed
  INFO = 'info',       // User should know, but not an error
  WARNING = 'warning', // Something went wrong, but recoverable
  ERROR = 'error'      // Something went wrong, needs attention
}

interface ErrorContext {
  isAuthenticated?: boolean;
  operation?: string;
  component?: string;
}

export interface ErrorClassification {
  type: ErrorType;
  severity: ErrorSeverity;
  shouldLog: boolean;
  message: string;
}

// ==============================|| ERROR CLASSIFICATION ||============================== //

/**
 * Classify an HTTP error by status code and context
 */
export const classifyError = (status: number | undefined, url: string | undefined, context: ErrorContext = {}): ErrorClassification => {
  const { isAuthenticated = false } = context;

  // ===== 401 UNAUTHORIZED =====
  if (status === 401) {
    // Expected 401 during initial auth check (no session yet)
    if (!isAuthenticated && (url?.includes('/session/me') || url?.includes('/auth/'))) {
      return {
        type: ErrorType.AUTH_REQUIRED,
        severity: ErrorSeverity.DEBUG,
        shouldLog: false, // Don't log - expected behavior
        message: 'No active session'
      };
    }

    // Unexpected 401 when user was authenticated
    return {
      type: ErrorType.AUTH_EXPIRED,
      severity: ErrorSeverity.WARNING,
      shouldLog: true,
      message: 'Session expired'
    };
  }

  // ===== 403 FORBIDDEN =====
  if (status === 403) {
    return {
      type: ErrorType.PERMISSION_DENIED,
      severity: ErrorSeverity.INFO, // Not an error - just access control
      shouldLog: true,
      message: 'Access denied - insufficient permissions'
    };
  }

  // ===== 400 BAD REQUEST =====
  if (status === 400) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.WARNING,
      shouldLog: true,
      message: 'Validation error'
    };
  }

  // ===== 404 NOT FOUND =====
  if (status === 404) {
    return {
      type: ErrorType.NOT_FOUND,
      severity: ErrorSeverity.WARNING,
      shouldLog: true,
      message: 'Resource not found'
    };
  }

  // ===== 500+ SERVER ERROR =====
  if (status && status >= 500) {
    return {
      type: status === 503 ? ErrorType.SERVICE_UNAVAILABLE : ErrorType.SERVER_ERROR,
      severity: ErrorSeverity.ERROR,
      shouldLog: true,
      message: 'Server error'
    };
  }

  // ===== NO RESPONSE (Network) =====
  if (!status) {
    return {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.ERROR,
      shouldLog: true,
      message: 'Network error - no response'
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.WARNING,
    shouldLog: true,
    message: 'Unknown error'
  };
};

// ==============================|| ERROR LOGGER ||============================== //

/**
 * Log an error with proper severity and formatting
 */
export const logError = (error: AxiosError | any, context: ErrorContext = {}): ErrorClassification => {
  const status = error.response?.status;
  const url = error.config?.url;
  const method = error.config?.method?.toUpperCase();

  const classification = classifyError(status, url, context);

  // Skip logging for expected behaviors
  if (!classification.shouldLog) {
    return classification;
  }

  const logData = {
    type: classification.type,
    status,
    method,
    url,
    message: error.response?.data?.message || error.message,
    component: context.component,
    operation: context.operation
  };

  const emojiStr = (sev: ErrorSeverity) => {
    switch (sev) {
      case ErrorSeverity.DEBUG: return '🔍';
      case ErrorSeverity.INFO: return 'ℹ️';
      case ErrorSeverity.WARNING: return '⚠️';
      case ErrorSeverity.ERROR: return '❌';
      default: return '❓';
    }
  };

  const emoji = emojiStr(classification.severity);
  const logMessage = `${emoji} [${classification.type}] ${method || 'UNKNOWN'} ${url || 'UNKNOWN'} [${status || 'No Status'}]`;

  // Log with appropriate console method
  switch (classification.severity) {
    case ErrorSeverity.DEBUG:
      // In production, don't log debug at all
      if (import.meta.env.DEV) {
        console.debug(logMessage, logData);
      }
      break;
    case ErrorSeverity.INFO:
      console.info(logMessage, logData);
      break;
    case ErrorSeverity.WARNING:
      console.warn(logMessage, logData);
      break;
    case ErrorSeverity.ERROR:
      console.error(logMessage, logData);
      break;
    default:
      console.log(logMessage, logData);
  }

  return classification;
};

// ==============================|| USER-FRIENDLY MESSAGES ||============================== //

/**
 * Get a user-friendly message for an error
 */
export const getUserFriendlyMessage = (error: AxiosError | any, defaultMessage = 'حدث خطأ. الرجاء المحاولة مرة أخرى.'): string => {
  const status = error.response?.status;
  const backendMessage = (error.response?.data as any)?.message;

  // Use backend message if available and meaningful
  if (typeof backendMessage === 'string' && backendMessage.length < 200) {
    return backendMessage;
  }

  // Status-based messages
  const messages: Record<number, string> = {
    400: 'البيانات المدخلة غير صحيحة. الرجاء التحقق والمحاولة مرة أخرى.',
    401: 'انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى.',
    403: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
    404: 'العنصر المطلوب غير موجود.',
    500: 'حدث خطأ في الخادم. الرجاء المحاولة لاحقاً.',
    503: 'الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً.'
  };

  if (status && messages[status]) {
    return messages[status];
  }

  // Network error
  if (!error.response) {
    return 'خطأ في الاتصال بالخادم. تحقق من الاتصال بالإنترنت.';
  }

  return defaultMessage;
};

// ==============================|| HOOK FOR COMPONENTS ||============================== //

/**
 * Hook for handling errors in components with proper logging
 */
export const useErrorHandler = () => {
  // @ts-ignore
  const { user } = useRBACStore?.getState?.() || {};

  const handleError = (error: any, operation?: string, component?: string) => {
    const classification = logError(error, {
      isAuthenticated: !!user,
      operation,
      component
    });

    return {
      ...classification,
      userMessage: getUserFriendlyMessage(error)
    };
  };

  return {
    handleError,
    getUserMessage: getUserFriendlyMessage
  };
};

export default {
  ErrorType,
  ErrorSeverity,
  classifyError,
  logError,
  getUserFriendlyMessage,
  useErrorHandler
};
