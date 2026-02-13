/**
 * Claims & Adjudication API Service (Phase 2.4 - HARDENED)
 * 
 * Provides robust management for medical claims and financial transactions.
 * Adheres to SOLID principles and serves as the authoritative source for financial data.
 * 
 * Responsibilities:
 * 1. Claims Lifecycle (Draft -> Submitted -> Under Review -> Approved/Rejected -> Settled).
 * 2. Attachment Management (Medical records, invoices).
 * 3. Financial Reporting (Single Source of Truth totals).
 */

import axiosClient from './client';
import { createErrorHandler } from 'utils/api-error-handler';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

const BASE_URL = '/claims';

// ==============================|| ERROR HANDLING ||============================== //

const handleClaimErrors = createErrorHandler('المطالبة', {
  404: 'المطالبة غير موجودة',
  409: 'رقم المطالبة مكرر أو يوجد تعارض في الحالة',
  422: 'بيانات المطالبة غير مكتملة أو غير صالحة'
});

const unwrap = (response) => response.data?.data || response.data;

// ==============================|| CLAIMS SERVICE OBJECT ||============================== //

export const claimsService = {

  // --- CORE CRUD ---

  getAll: async (params = {}) => {
    try {
      const response = await axiosClient.get(BASE_URL, { params });
      return normalizePaginatedResponse(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  create: async (data) => {
    try {
      const response = await axiosClient.post(BASE_URL, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosClient.delete(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  // --- LIFECYCLE ACTIONS ---

  submit: async (id) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/submit`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  startReview: async (id) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/start-review`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  approve: async (id, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/approve`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  reject: async (id, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/reject`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  settle: async (id, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/settle`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  returnForInfo: async (id, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/return-for-info`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  // --- ATTACHMENTS ---

  getAttachments: async (id) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${id}/attachments`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  uploadAttachment: async (id, file, type) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const response = await axiosClient.post(`${BASE_URL}/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  downloadAttachment: async (claimId, attachmentId) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${claimId}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  // --- FINANCIALS (SINGLE SOURCE OF TRUTH) ---

  getFinancialSummary: async (params = {}) => {
    try {
      const response = await axiosClient.get('/api/reports/financial-summary', { params });
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  getCostBreakdown: async (id) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${id}/cost-breakdown`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  }
};

export default claimsService;
