/**
 * Providers & Network API Service (Phase 2.5 - HARDENED)
 * 
 * Manages healthcare provider network (Hospitals, Clinics, Labs, Pharmacies).
 * Adheres to SOLID principles and provides enterprise-grade error handling.
 * 
 * Responsibilities:
 * 1. Provider Profile Management (CRM).
 * 2. Network Segmentation (Type, Region).
 * 3. Contract & Document Management.
 * 4. Provider Selection & Smart Search.
 */

import axiosClient from './client';
import { createErrorHandler } from 'utils/api-error-handler';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

const BASE_URL = '/providers';

// ==============================|| ERROR HANDLING ||============================== //

const handleProviderErrors = createErrorHandler('المزود', {
  404: 'المزود غير موجود',
  409: 'رقم الترخيص مكرر أو يوجد تعارض في البيانات',
  422: 'بيانات المزود غير صالحة أو غير مكتملة'
});

/**
 * Unwrap ApiResponse and handle potential null data
 */
const unwrap = (response) => response.data?.data || response.data;

// ==============================|| PROVIDERS SERVICE OBJECT ||============================== //

export const providersService = {

  // --- CORE CRUD ---

  getAll: async (params = {}) => {
    try {
      const response = await axiosClient.get(BASE_URL, { params });
      return normalizePaginatedResponse(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  create: async (data) => {
    try {
      const response = await axiosClient.post(BASE_URL, data);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosClient.delete(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  // --- SEARCH & SELECTORS ---

  search: async (query) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/search`, { params: { query } });
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  getSelector: async () => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/selector`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  // --- CONTRACTS ---

  getContracts: async (providerId) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${providerId}/contracts`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  createContract: async (providerId, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${providerId}/contracts`, data);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  deleteContract: async (providerId, contractId) => {
    try {
      const response = await axiosClient.delete(`${BASE_URL}/${providerId}/contracts/${contractId}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  // --- DOCUMENTS & MEDIA ---

  getDocuments: async (providerId) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${providerId}/documents`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  addDocument: async (providerId, data) => {
    try {
      const config = (data instanceof FormData) ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const response = await axiosClient.post(`${BASE_URL}/${providerId}/documents`, data, config);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  deleteDocument: async (providerId, documentId) => {
    try {
      const response = await axiosClient.delete(`${BASE_URL}/${providerId}/documents/${documentId}`);
      return unwrap(response);
    } catch (error) {
      throw handleProviderErrors(error);
    }
  },

  downloadDocument: async (fileKey) => {
    try {
      const response = await axiosClient.get('/files/download', {
        params: { key: fileKey },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw handleProviderErrors(error);
    }
  }
};

export default providersService;
