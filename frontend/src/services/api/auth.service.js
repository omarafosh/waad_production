/**
 * JWT Authentication Service (Phase 2.2 - Hardened)
 * 
 * This service implements SOLID principles and handles all authentication 
 * operations using Bearer Tokens and Refresh Tokens.
 */

import axiosClient from './client';

// ==============================|| HELPER FUNCTIONS ||============================== //

/**
 * Unwrap ApiResponse and handle potential null data
 * @param {Object} response - Axios response object
 * @returns {any} Unwrapped data
 */
const unwrap = (response) => response.data?.data || response.data;

// ==============================|| AUTH SERVICE OBJECT ||============================== //

export const authService = {
  /**
   * Login with username/password
   * @param {Object} credentials - { identifier, password }
   * @returns {Promise<Object>} LoginResponse { token, refreshToken, user }
   */
  login: async (credentials) => {
    const response = await axiosClient.post('/auth/login', credentials);
    return unwrap(response);
  },

  /**
   * Register a new user
   * @param {Object} userData - Registration details
   * @returns {Promise<Object>} Created user information
   */
  register: async (userData) => {
    const response = await axiosClient.post('/auth/register', userData);
    return unwrap(response);
  },

  /**
   * Get current authenticated user profile
   * @returns {Promise<Object>} User information
   */
  me: async () => {
    try {
      const response = await axiosClient.get('/auth/me');
      return unwrap(response);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { status: 'unauthenticated', data: null };
      }
      throw error;
    }
  },

  /**
   * Refresh the access token using a refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} New access token and refresh token
   */
  refreshToken: async (refreshToken) => {
    const response = await axiosClient.post('/auth/refresh', { refreshToken });
    return unwrap(response);
  },

  /**
   * Logout the user
   * @returns {Promise<void>}
   */
  logout: async () => {
    try {
      await axiosClient.post('/auth/session/logout');
    } catch (e) {
      // Ignore errors on logout
    }
    // Note: Local storage cleanup should be handled by the caller/store
  },

  /**
   * Request a password reset email (Token-based)
   * @param {string} email - User email address
   * @returns {Promise<void>}
   */
  forgotPassword: async (email) => {
    await axiosClient.post('/auth/token/forgot-password', { email });
  },

  /**
   * Reset password using a secure token
   * @param {Object} data - { token, newPassword }
   * @returns {Promise<void>}
   */
  resetPassword: async (data) => {
    await axiosClient.post('/auth/token/reset-password', data);
  },

  /**
   * Change password for logged-in user
   * @param {Object} data - { currentPassword, newPassword }
   * @returns {Promise<void>}
   */
  changePassword: async (data) => {
    await axiosClient.put('/auth/users/me/password', data);
  },

  /**
   * Verify email address using token
   * @param {string} token - Verification token
   * @returns {Promise<void>}
   */
  verifyEmail: async (token) => {
    await axiosClient.post('/auth/verify-email', { token });
  },

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  resendVerification: async (email) => {
    await axiosClient.post('/auth/resend-verification', { email });
  }
};

export default authService;
