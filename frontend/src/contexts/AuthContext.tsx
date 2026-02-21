/**
 * AuthContext - Simplified Session-Based Authentication
 * Enterprise Mode - VPN-based Internal System
 *
 * SIMPLIFIED APPROACH:
 * - State: { user: null | User }
 * - Init: Call /session/me once, set user, done
 * - NO redirects
 * - NO complex state machines
 * - Router handles navigation
 *
 * PRODUCTION STABILIZATION (2026-01-13):
 * - Added AUTH_STATUS enum for guards
 * - Added authStatus to context for proper lifecycle handling
 */

import React, { createContext, useEffect, useState, useContext, ReactNode } from 'react';

// Project imports
import authService from 'services/api/auth.service';
import { useRBACStore } from 'store';
import { openSnackbar } from 'api/snackbar';

// ==============================|| AUTH STATUS ENUM ||============================== //

/**
 * Authentication status states
 * Used by AuthGuard and GuestGuard for proper lifecycle handling
 */
export enum AUTH_STATUS {
  INITIALIZING = 'INITIALIZING',
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHENTICATED = 'UNAUTHENTICATED'
}

export interface User {
  id: string | number;
  username: string;
  email: string;
  fullName?: string;
  role?: string;
  permissions?: string[];
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  authStatus: AUTH_STATUS;
  login: (credentials: any) => Promise<User>;
  register: (email: string, password: string, firstName: string, lastName: string, civilId: string, phone: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Context
const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

const generateUniqueUsername = (email: string, civilId?: string): string => {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';

  if (civilId) {
    // civilId is typically a unique national identifier
    return `${base}_${civilId.slice(-4)}`;
  }

  const timestampSuffix = Date.now().toString(36);
  return `${base}_${timestampSuffix}`;
};

// Provider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AUTH_STATUS>(AUTH_STATUS.INITIALIZING);

  // ============================================================================
  // SESSION LOGIC (Inactivity Timer & 401 Handling)
  // ============================================================================

  const [lastActivity, setLastActivity] = useState(Date.now());
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  // 1. Activity Listener (throttled)
  useEffect(() => {
    // Only track if authenticated
    if (authStatus !== AUTH_STATUS.AUTHENTICATED) return;

    let lastUpdate = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Update max once every 5 seconds to reduce state updates
      if (now - lastUpdate > 5000) {
        setLastActivity(now);
        lastUpdate = now;
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [authStatus]);

  // 2. Inactivity Check Interval
  useEffect(() => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED) return;

    const intervalId = setInterval(() => {
      if (Date.now() - lastActivity > TIMEOUT_MS) {
        console.warn('⚠️ Session timeout due to inactivity');
        openSnackbar({
          message: 'انتهت الجلسة بسبب عدم النشاط',
          alert: { color: 'warning', variant: 'standard' }
        });
        logout(); // Logout user
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [authStatus, lastActivity]); // Dependencies ensure fresh state access

  // 3. Handle 401 Unauthorized from Axios
  useEffect(() => {
    const handleUnauthorized = () => {
      // Only if we think we are logged in
      if (authStatus === AUTH_STATUS.AUTHENTICATED) {
        console.warn('⚠️ Session expired (401) - Force Logout');
        openSnackbar({
          message: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى',
          alert: { color: 'error', variant: 'standard' }
        });

        // Force clean local state without calling backend (backend already said 401)
        setUser(null);
        setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
        useRBACStore.getState().clear();
      }
    };

    window.addEventListener('auth:session-expired', handleUnauthorized);
    return () => window.removeEventListener('auth:session-expired', handleUnauthorized);
  }, [authStatus]);

  /**
   * Multi-tab logout synchronization
   */
  useEffect(() => {
    const channel = new BroadcastChannel('tba-auth-channel');

    channel.onmessage = (event) => {
      if (event.data?.type === 'LOGOUT') {
        console.info('🔄 Logout detected in another tab');
        setUser(null);
        setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
        useRBACStore.getState().clear();
        window.location.href = '/login';
      } else if (event.data?.type === 'REFRESH_USER') {
        // If the updated user is the current user, refresh data
        // We use a functional update or ref to access current 'user' if needed, 
        // but since this effect runs once, we rely on the closure or check inside refreshUser logic? 
        // Actually, 'user' in this closure is stale (from mount). 
        // Safe bet: always refresh, or store userId in localStorage to compare.
        const currentUserId = JSON.parse(localStorage.getItem('userData') || '{}')?.id;
        if (event.data?.userId && currentUserId && Number(currentUserId) === Number(event.data.userId)) {
          console.info('🔄 User update detected in another tab');
          refreshUser();
        }
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  /**
   * Initialize auth state on app startup
   * Check if token exists and validate with me()
   */
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('serviceToken');
        if (!token) {
          setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
          return;
        }

        const response = await authService.me();

        if (response.status === 'success' && response.data) {
          setUser(response.data);
          setAuthStatus(AUTH_STATUS.AUTHENTICATED);
          useRBACStore.getState().initialize(response.data);
          console.info('✅ Session restored:', response.data.username);
        } else {
          // Token invalid or expired
          setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
          localStorage.removeItem('serviceToken');
        }
      } catch (error) {
        setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
        localStorage.removeItem('serviceToken');
      }
    };

    init();
  }, []);

  /**
   * Login - JWT Based
   */
  const login = async (credentials: any): Promise<User> => {
    const response = await authService.login(credentials);

    if (response.status === 'success' && response.data) {
      const { token, user } = response.data;

      if (token) {
        localStorage.setItem('serviceToken', token);
      }

      setUser(user);
      setAuthStatus(AUTH_STATUS.AUTHENTICATED);
      useRBACStore.getState().initialize(user);
      return user;
    } else {
      throw new Error('Login failed');
    }
  };

  /**
   * Register
   */
  const register = async (email: string, password: string, firstName: string, lastName: string, civilId: string, phone: string): Promise<User> => {
    const response = await authService.register({
      email,
      password,
      fullName: `${firstName} ${lastName}`,
      username: generateUniqueUsername(email, civilId),
      civilId,
      phone
    });

    if (response.status === 'success' && response.data) {
      const { token, user } = response.data;
      if (token) {
        localStorage.setItem('serviceToken', token);
      }
      setUser(user);
      setAuthStatus(AUTH_STATUS.AUTHENTICATED);
      useRBACStore.getState().initialize(user);
      return user;
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  };

  /**
   * Logout
   */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout API failed (likely already expired)', error);
    }

    // Clear local state
    setUser(null);
    setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);

    // Clear storage
    localStorage.removeItem('serviceToken');
    useRBACStore.getState().clear();

    // Notify other tabs
    const channel = new BroadcastChannel('tba-auth-channel');
    channel.postMessage({ type: 'LOGOUT' });
    channel.close();
  };

  /**
   * Refresh user data
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const response = await authService.me();

      if (response.status === 'success' && response.data) {
        setUser(response.data);
        setAuthStatus(AUTH_STATUS.AUTHENTICATED);
      } else {
        setUser(null);
        setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
      }
    } catch (error) {
      setUser(null);
      setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
    }
  };

  // NO LOADER - always render immediately
  return (
    <AuthContext.Provider
      value={{
        user,
        authStatus,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
export { AuthContext };

// ==============================|| HOOK ||============================== //

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
