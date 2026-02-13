/**
 * Pre-Authorizations (Pre-Approvals) API Service (Phase 2.4 - HARDENED)
 * 
 * Manages medical pre-authorizations following a Visit-Centric Architecture.
 * Adheres to SOLID principles and provides robust error handling.
 * 
 * Responsibilities:
 * 1. Pre-Auth Lifecycle (Requested -> Under Review -> Approved/Rejected).
 * 2. Attachment Management (Medical reports, prescriptions).
 * 3. Validity tracking (Check if member has valid pre-auth for service).
 */

import axiosClient from './client';
import { createErrorHandler } from 'utils/api-error-handler';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

// Backend endpoint is /pre-authorizations
const BASE_URL = '/pre-authorizations';

// ==============================|| ERROR HANDLING ||============================== //

const handlePreAuthErrors = createErrorHandler('الموافقة المسبقة', {
  404: 'الموافقة المسبقة غير موجودة',
  409: 'يوجد تعارض في حالة الموافقة أو البيانات المرفوعة',
  422: 'بيانات طلب الموافقة غير مكتملة'
});

const unwrap = (response) => response.data?.data || response.data;

// ==============================|| PRE-APPROVALS SERVICE OBJECT ||============================== //

export const preApprovalsService = {

  // --- CORE CRUD ---

  getAll: async (params = {}) => {
    try {
      // Backend expects 0-indexed page if using direct controller, 
      // but our normalizePaginatedResponse expects standard 1-indexed.
      const response = await axiosClient.get(BASE_URL, { params });
      return normalizePaginatedResponse(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  create: async (data) => {
    try {
      // Visit-Centric Requirement: visitId must be present
      if (!data.visitId) throw new Error('معرف الزيارة مطلوب لإنشاء موافقة مسبقة');
      const response = await axiosClient.post(BASE_URL, data);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosClient.delete(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  // --- ACTIONS ---

  startReview: async (id) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/start-review`);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  approve: async (id, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/approve`, data);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  reject: async (id, data) => {
    try {
      const response = await axiosClient.post(`${BASE_URL}/${id}/reject`, data);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  // --- ATTACHMENTS ---

  getAttachments: async (id) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${id}/attachments`);
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
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
      throw handlePreAuthErrors(error);
    }
  },

  downloadAttachment: async (preAuthId, attachmentId) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/${preAuthId}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  },

  // --- UTILS ---

  checkValidity: async (memberId, serviceCode) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/check-validity`, {
        params: { memberId, serviceCode }
      });
      return unwrap(response);
    } catch (error) {
      throw handlePreAuthErrors(error);
    }
  }
};

export default preApprovalsService;
