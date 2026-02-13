import { createContext, useEffect, useReducer, useCallback, useContext } from 'react';
/**
 * ⚠️ DEPRECATED - DO NOT USE IN NEW CODE
 *
 * JWTContext - Legacy JWT Authentication (Phase A/B)
 *
 * This file is kept for reference only. All new code should use:
 *   - AuthContext.jsx for session-based authentication
 *
 * AUDIT FIX (TASK B): Web frontend now uses session-only auth.
 * JWT support remains in backend for future mobile app integration.
 *
 * Migration Notes:
 * - Replace: import JWTContext from 'contexts/JWTContext';
 * - With:    import { AuthContext } from 'contexts/AuthContext';
 *
 * See: AUTH_RBAC_COMPLETION_REPORT.md for Phase C migration details
 */

import PropTypes from 'prop-types';
import { jwtDecode } from 'jwt-decode';

// reducer
import { LOGIN, LOGOUT } from 'contexts/auth-reducer/actions';
import authReducer from 'contexts/auth-reducer/auth';

// project imports
import Loader from 'components/Loader';
import axios from 'utils/axios';
import { useRBACStore } from 'api/rbac';

// ==============================|| INITIAL STATE ||============================== //

const initialState = {
  isLoggedIn: false,
  isInitialized: false,
  user: null,
  roles: [],
  permissions: []
};

// ==============================|| TOKEN HELPERS ||============================== //

const verifyToken = (token) => {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    return decoded.exp > Date.now() / 1000;
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    return false;
  }
};

const setSession = (token) => {
  if (token) {
    localStorage.setItem('serviceToken', token);
    if (!axios.defaults.headers) axios.defaults.headers = {};
    if (!axios.defaults.headers.common) axios.defaults.headers.common = {};
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;} else {
    localStorage.removeItem('serviceToken');
    if (axios.defaults.headers?.common?.Authorization) {
      delete axios.defaults.headers.common.Authorization;
    }}
};

// ==============================|| CONTEXT ||============================== //

const JWTContext = createContext(null);

export const JWTProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ==============================|| INITIALIZATION - FIXED ||============================== //

  useEffect(() => {
    const init = async () => {try {
        const token = localStorage.getItem('serviceToken');

        if (token && verifyToken(token)) {setSession(token);

          const response = await axios.get('/auth/me');
          const userData = response.data.data;// CRITICAL FIX: Initialize RBAC store with userData
          useRBACStore.getState().initialize(userData);dispatch({
            type: LOGIN,
            payload: {
              user: userData,
              roles: userData.roles || [],
              permissions: userData.permissions || []
            }
          });} else {
          console.warn('⚠️ No valid token found, user not logged in');

          // CRITICAL FIX: Still initialize RBAC with empty state
          useRBACStore.getState().initialize(null);

          dispatch({ type: LOGOUT });
        }
      } catch (err) {
        console.error('❌ JWTContext initialization failed:', err);

        // CRITICAL FIX: On error, clear everything safely
        setSession(null);
        useRBACStore.getState().clear();
        dispatch({ type: LOGOUT });
      }
    };

    init();
  }, []);

  // ==============================|| LOGIN - FIXED ||============================== //

  const login = async (identifier, password) => {try {
      const response = await axios.post('/auth/login', {
        identifier,
        password
      });

      const { token, user: userData } = response.data.data;setSession(token);

      // CRITICAL FIX: Initialize RBAC store with fresh userData
      useRBACStore.getState().initialize(userData);dispatch({
        type: LOGIN,
        payload: {
          user: userData,
          roles: userData.roles || [],
          permissions: userData.permissions || []
        }
      });

      // Get redirect path based on role
      const redirectPath = getRedirectPath(userData.roles);return redirectPath;
    } catch (err) {
      console.error('❌ Login failed:', err);
      throw err;
    }
  };

  // ==============================|| LOGOUT - FIXED ||============================== //

  const logout = () => {setSession(null);

    // CRITICAL FIX: Clear RBAC store
    useRBACStore.getState().clear();dispatch({ type: LOGOUT });

    // Hard redirect to login to ensure clean statewindow.location.href = '/login';
  };

  // ==============================|| REDIRECT LOGIC - FIXED ||============================== //

  /**
   * Get redirect path based on user role
   * CRITICAL FIX: Updated for new role names (Phase 1.5)
   * @param {string[]} roles - Array of user roles
   * @returns {string} - Redirect path
   */
  const getRedirectPath = useCallback((roles) => {
    if (!roles || roles.length === 0) {
      console.warn('⚠️ No roles found, redirecting to profile');
      return '/profile';
    }// Priority order for roles (Phase 1.5 role names)
    if (roles.includes('ADMIN')) {return '/dashboard';
    }
    if (roles.includes('INSURANCE_COMPANY')) {return '/dashboard';
    }
    if (roles.includes('EMPLOYER')) {return '/members';
    }
    if (roles.includes('REVIEWER')) {return '/claims';
    }

    // Default fallback
    console.warn('⚠️ No matching role, redirecting to /profile');
    return '/profile';
  }, []);

  // ==============================|| SIMPLIFIED RBAC HELPERS ||============================== //

  /**
   * Get user's primary role (simplified - each user has ONE role)
   * @returns {string|null}
   */
  const getPrimaryRole = () => {
    if (!state.roles || state.roles.length === 0) return null;
    return state.roles[0];
  };

  /**
   * Check if user's role matches one of the allowed roles
   * @param {string[]} allowedRoles - Array of allowed role names
   * @returns {boolean}
   */
  const hasRole = (allowedRoles) => {
    const primaryRole = getPrimaryRole();
    if (!primaryRole) return false;

    // SUPER_ADMIN bypasses all checks
    if (primaryRole === 'SUPER_ADMIN') return true;

    // Check if primary role is in allowed list
    return allowedRoles.includes(primaryRole);
  };

  /**
   * Check if user is ADMIN
   * @returns {boolean}
   */
  const isAdmin = () => {
    return getPrimaryRole() === 'ADMIN';
  };

  /**
   * Check if user is SUPER_ADMIN
   * @returns {boolean}
   */
  const isSuperAdmin = () => {
    return getPrimaryRole() === 'SUPER_ADMIN';
  };

  // Show loader during initialization
  if (!state.isInitialized) {
    return <Loader />;
  }

  return (
    <JWTContext.Provider
      value={{
        ...state,
        login,
        logout,
        hasRole,
        getPrimaryRole,
        isAdmin,
        isSuperAdmin,
        getRedirectPath
      }}
    >
      {children}
    </JWTContext.Provider>
  );
};

JWTProvider.propTypes = {
  children: PropTypes.node
};

export default JWTContext;

// ==============================|| HOOK ||============================== //

/**
 * Simplified useAuth hook
 * @returns {Object} Auth context with simplified RBAC
 */
export const useAuth = () => {
  const context = useContext(JWTContext);
  if (!context) {
    throw new Error('useAuth must be used within JWTProvider');
  }
  return context;
};
