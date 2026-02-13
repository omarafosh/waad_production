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

import PropTypes from 'prop-types';
import { createContext, useEffect, useState, useContext } from 'react';

// Project imports
import authService from 'services/api/auth.service';
import { useRBACStore } from 'api/rbac';
import { openSnackbar } from 'api/snackbar';

// ==============================|| AUTH STATUS ENUM ||============================== //

/**
 * Authentication status states
 * Used by AuthGuard and GuestGuard for proper lifecycle handling
 */
export const AUTH_STATUS = {
  INITIALIZING: 'INITIALIZING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED'
};

// Simple state - just user data
const initialState = {
  user: null
};

const SET_USER = 'SET_USER';
const CLEAR_USER = 'CLEAR_USER';

// Context
const AuthContext = createContext(null);

// Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.INITIALIZING);

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
          alert: { color: 'warning' }
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
          alert: { color: 'error' }
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
  const login = async (credentials) => {
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
  const register = async (email, password, firstName, lastName, civilId, phone) => {
    const response = await authService.register({
      email,
      password,
      fullName: `${firstName} ${lastName}`,
      username: email.split('@')[0] + Math.floor(Math.random() * 1000), // Simple username gen
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
  const logout = async () => {
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
  const refreshUser = async () => {
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

AuthProvider.propTypes = {
  children: PropTypes.node
};

export default AuthContext;
export { AuthContext };

// ==============================|| HOOK ||============================== //

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
