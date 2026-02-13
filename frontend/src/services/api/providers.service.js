// ==============================|| PROVIDERS API - TBA DOMAIN ||============================== //
// DOMAIN NOTE: Providers = Hospitals, Clinics, Labs, Pharmacies
// Used in Kanban board to display provider network

import axiosClient from 'utils/axios';
import { createErrorHandler } from 'utils/api-error-handler';
import { validateEmail, validatePhone } from 'utils/api-validators';

const BASE_URL = '/providers';

/**
 * Helper function to unwrap ApiResponse
 */
const unwrap = (response) => response.data?.data || response.data;

/**
 * Error handler for providers service
 * Provides user-friendly Arabic error messages
 */
const handleProviderErrors = createErrorHandler('المزود', {
  404: 'المزود غير موجود',
  409: 'رقم الترخيص مكرر أو يوجد تعارض',
  422: 'البيانات المُدخلة للمزود غير صحيحة'
});

/**
 * Providers Service
 * Manages healthcare providers (hospitals, clinics, labs, pharmacies)
 * Used in Kanban UI to display provider network and status
 */
export const providersService = {
  /**
   * Get all providers with pagination
   * @param {Object} params - Optional query parameters (page, size, search)
   * @returns {Promise<Object>} Paginated list with { content, totalElements, page, size }
   */
  getAll: async (params = {}) => {
    try {
      const response = await axiosClient.get(BASE_URL, { params });
      const data = unwrap(response);

      // Normalize backend response (items/total) to frontend format (content/totalElements)
      // Backend returns: { items: [], total: n, page: n, size: n }
      // Frontend expects: { content: [], totalElements: n }
      if (data && typeof data === 'object') {
        // If it's a paginated response with 'items'
        if (Array.isArray(data.items)) {
          return {
            content: data.items,
            totalElements: data.total || data.items.length,
            page: data.page,
            size: data.size
          };
        }
        // If it's already in the expected format
        if (Array.isArray(data.content)) {
          return data;
        }
        // If it's a raw array
        if (Array.isArray(data)) {
          return {
            content: data,
            totalElements: data.length
          };
        }
      }

      // Fallback: return as-is
      return data;
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Get provider by ID
   * @param {number} id - Provider ID
   * @returns {Promise<Object>} Provider details
   */
  getById: async (id) => {
    try {
      if (!id) throw new Error('معرف المزود مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Create new provider
   * @param {Object} data - Provider data
   * @returns {Promise<Object>} Created provider with id
   */
  create: async (data) => {
    try {
      if (!data) throw new Error('بيانات المزود مطلوبة');
      if (data.email) validateEmail(data.email);
      if (data.phone) validatePhone(data.phone);

      console.log('[providersService.create] Sending:', data);
      const response = await axiosClient.post(BASE_URL, data);
      const created = unwrap(response);
      console.log('[providersService.create] Response:', created);

      // Ensure we got a valid provider with ID
      if (!created || !created.id) {
        console.warn('[providersService.create] Warning: Response missing id', created);
      }

      return created;
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Get allowed employer IDs for a provider
   * @param {number} id - Provider ID
   * @returns {Promise<Array<number>>} List of allowed employer IDs
   */
  getAllowedEmployerIds: async (id) => {
    try {
      if (!id) throw new Error('معرف المزود مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/${id}/allowed-employer-ids`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Update provider
   * @param {number} id - Provider ID
   * @param {Object} data - Updated provider data
   * @returns {Promise<Object>} Updated provider
   */
  update: async (id, data) => {
    try {
      if (!id) throw new Error('معرف المزود مطلوب');
      if (!data) throw new Error('بيانات التحديث مطلوبة');
      if (data.email) validateEmail(data.email);
      if (data.phone) validatePhone(data.phone);
      const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Delete provider
   * @param {number} id - Provider ID
   * @returns {Promise<void>}
   */
  remove: async (id) => {
    try {
      if (!id) throw new Error('معرف المزود مطلوب');
      const response = await axiosClient.delete(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Search providers
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching providers
   */
  search: async (query) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/search`, { params: { query: query || '' } });
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Get providers by type (hospital, clinic, lab, pharmacy)
   * @param {string} type - Provider type
   * @returns {Promise<Array>} Filtered providers
   */
  getByType: async (type) => {
    try {
      if (!type) throw new Error('نوع المزود مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/type/${type}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Get providers by region/city
   * @param {string} region - Region or city name
   * @returns {Promise<Array>} Providers in region
   */
  getByRegion: async (region) => {
    try {
      if (!region) throw new Error('المنطقة مطلوبة');
      const response = await axiosClient.get(`${BASE_URL}/region/${region}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Get provider selector options (for dropdowns)
   * Endpoint: GET /api/providers/selector
   * @returns {Promise<Array>} List of provider selector options
   * @example
   * const options = await providersService.getSelector();
   * // [{ id: 1, code: 'LIC-001', name: 'مستشفى الواحة' }, ...]
   */
  getSelector: async () => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/selector`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Upload Excel file to import providers
   * @param {File} file - Excel file
   * @returns {Promise<Object>} Import result
   */
  uploadExcel: async (file) => {
    try {
      if (!file) throw new Error('الملف مطلوب');

      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosClient.post(`${BASE_URL}/import/excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000,
      });

      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  // ==================== CONTRACTS ====================

  /**
   * Get provider contracts
   */
  getContracts: async (providerId) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${providerId}/contracts`);
      // Handle pagination wrapper if present
      return response.data?.data?.content || response.data?.data || [];
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Create provider contract
   */
  createContract: async (providerId, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${providerId}/contracts`, data);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Delete provider contract
   */
  deleteContract: async (providerId, contractId) => {
    try {
      const response = await axiosClient.delete(`${BASE_URL}/${providerId}/contracts/${contractId}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  // ==================== DOCUMENTS ====================

  /**
   * Get provider documents
   */
  getDocuments: async (providerId) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${providerId}/documents`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Download provider document as blob
   */
  downloadDocument: async (url) => {
    try {
      // Clean up URL to prevent double prefixing by axios
      // If it starts with /api/, remove it because axios baseURL adds it
      let cleanUrl = url;
      if (cleanUrl.startsWith('/api/')) {
        cleanUrl = cleanUrl.substring(5); // Remove /api/
      } else if (cleanUrl.startsWith('api/')) {
        cleanUrl = cleanUrl.substring(4);
      }

      // Check for query params
      if (cleanUrl.includes('?')) {
        const [path, query] = cleanUrl.split('?');
        const params = new URLSearchParams(query);
        const key = params.get('key');

        if (path.includes('files/download') && key) {
          // Reconstruct request cleanly
          const response = await axiosClient.get('/files/download', {
            params: { key: key }, // Axios will encode this safely
            responseType: 'blob'
          });
          return response.data;
        }
      }

      // Fallback for direct URLs
      const response = await axiosClient.get(cleanUrl, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      console.error('Download error:', error);
      throw handleProviderErrors(error);
    }
  },

  /**
   * Add provider document
   * @param {number} providerId
   * @param {Object} data - Document DTO
   */
  addDocument: async (providerId, data) => {
    try {
      const config = {};
      if (data instanceof FormData) {
        config.headers = { 'Content-Type': 'multipart/form-data' };
      }
      const response = await axiosClient.post(`${BASE_URL}/${providerId}/documents`, data, config);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  /**
   * Delete provider document
   */
  deleteDocument: async (providerId, documentId) => {
    try {
      const response = await axiosClient.delete(`${BASE_URL}/${providerId}/documents/${documentId}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  }
};

// Named exports for convenience
export const getProviders = providersService.getAll;
export const getProviderById = providersService.getById;
export const createProvider = providersService.create;
export const updateProvider = providersService.update;
export const deleteProvider = providersService.delete;
export const getProviderSelector = providersService.getSelector;

export default providersService;
