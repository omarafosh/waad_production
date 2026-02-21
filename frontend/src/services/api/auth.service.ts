/**
 * JWT Authentication Service
 * Reverted to JWT due to Backend Stateless Enforcement (Phase 2)
 *
 * This service handles authentication using Bearer Tokens
 * stored in localStorage.
 */

import axiosClient from 'utils/axios';

/**
 * Login with username/password
 * Returns JWT token and user info
 */
export const login = async (credentials) => {
  // Use JWT endpoint instead of session
  const response = await axiosClient.post('/auth/login', credentials);
  // Backend returns ApiResponse<LoginResponse> wrapped in axios response
  // response.data = { status: 'success', data: { token, user }, message: '...' }
  return response.data;
};

/**
 * Register a new user
 */
export const register = async (userData) => {
  const response = await axiosClient.post('/auth/register', userData);
  return response.data;
};

/**
 * Get current authenticated user
 * Uses Bearer token from localStorage (injected by axios interceptor)
 */
export const me = async () => {
  try {
    // Use JWT endpoint
    const response = await axiosClient.get('/auth/me');
    // Backend returns ApiResponse<UserInfo> wrapped in axios response
    // response.data = { status: 'success', data: UserInfo, message: '...' }
    return response.data;
  } catch (error) {
    // Expected 401 when no token or expired
    if (error.response?.status === 401 || error.response?.status === 403) {
      return { status: 'unauthenticated', data: null };
    }
    // Re-throw other errors
    throw error;
  }
};

/**
 * Logout
 * Client-side only (JWT is stateless), but we call backend to allow any cleanup if needed
 */
export const logout = async () => {
  // Optional: Call backend logout if implemented, otherwise just clear local state
  try {
    // Session logout endpoint might not work with JWT, but safe to ignore error
    await axiosClient.post('/auth/session/logout');
  } catch (e) {
    // Ignore
  }
  return { status: 'success' };
};

/**
 * Check if user is authenticated
 * Tries to fetch current user
 */
export const isAuthenticated = async () => {
  try {
    const response = await me();
    return response.status === 'success';
  } catch (error) {
    return false;
  }
};

// Export as default for backward compatibility
export default {
  login,
  register,
  me,
  logout,
  isAuthenticated
};
