/**
 * Employers & Organization API Service (Phase 2.5 - HARDENED)
 * 
 * Manages employer organizations and insurance partners.
 * Adheres to SOLID principles and provides enterprise-grade error handling.
 * 
 * Responsibilities:
 * 1. Employer CRM (Lifecycle, Policies).
 * 2. Organization Structure & Code Management.
 * 3. Archiving & Data Retention.
 * 4. Selector & Financial Tracking Tags.
 */

import axiosClient from './client';
import { createErrorHandler } from 'utils/api-error-handler';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

const BASE_URL = '/employers';

// ==============================|| ERROR HANDLING ||============================== //

const handleEmployerErrors = createErrorHandler('جهة العمل', {
  404: 'جهة العمل غير موجودة',
  409: 'رمز المنظمة مكرر أو مستخدم بالفعل',
  422: 'بيانات جهة العمل غير مكتملة'
});

/**
 * Unwrap ApiResponse and handle potential null data
 */
const unwrap = (response) => response.data?.data || response.data;

// ==============================|| EMPLOYERS SERVICE OBJECT ||============================== //

export const employersService = {

  // --- CORE CRUD ---

  getAll: async (params = {}) => {
    try {
      const response = await axiosClient.get(BASE_URL, { params });
      return normalizePaginatedResponse(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  create: async (data) => {
    try {
      const response = await axiosClient.post(BASE_URL, data);
      return unwrap(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
      return unwrap(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  // --- ARCHIVING & LIFECYCLE ---

  archive: async (id) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/archive`);
      return unwrap(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  restore: async (id) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/restore`);
      return unwrap(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  // --- SELECTORS & STATS ---

  getSelectors: async () => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/selectors`);
      return unwrap(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  getCount: async () => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/count`);
      return unwrap(response);
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  },

  // --- EXPORTS ---

  exportExcel: async () => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/export/excel`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw handleEmployerErrors(error);
    }
  }
};

export default employersService;
