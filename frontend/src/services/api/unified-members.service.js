/**
 * Unified Members & Eligibility Service (Phase 2.3 - HARDEN_SOLID)
 * 
 * This service consolidates legacy members.service.js and unified-members.service.js
 * into a single, high-performance module following SOLID principles.
 * 
 * Responsibilities:
 * 1. CRUD operations for Principal & Dependent members.
 * 2. Status & Card Management.
 * 3. Eligibility Verification (Smart Search).
 * 4. Bulk Data Operations (Excel Import/Exports).
 * 5. Media Management (Photos).
 * 
 * Backend API: MemberController.java & UnifiedMemberController.java
 */

import axiosClient from './client';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

// ==============================|| BASE CONFIG & HELPERS ||============================== //

const BASE_URL = '/unified-members'; // Standardized on Unified endpoint
const LEGACY_BASE_URL = '/members';

/**
 * Unwrap ApiResponse and handle potential null data
 */
const unwrap = (response) => response.data?.data || response.data;

/**
 * Field Normalizer: Standardizes payloads before sending to Backend
 */
export const normalizeMemberPayload = (payload) => {
  if (!payload) return payload;
  const normalized = { ...payload };

  // Protective cleanup: Remove read-only or backend-managed fields
  const readOnlyFields = ['id', 'barcode', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'];
  readOnlyFields.forEach(field => delete normalized[field]);

  // Convert empty strings to null for optional database fields
  const dbOptionalFields = [
    'civilId', 'birthDate', 'gender', 'maritalStatus',
    'nationality', 'phone', 'email', 'address',
    'policyNumber', 'benefitPolicyId', 'startDate', 'endDate', 'notes'
  ];

  dbOptionalFields.forEach(field => {
    if (normalized[field] === '' || normalized[field] === undefined) {
      normalized[field] = null;
    }
  });

  return normalized;
};

// ==============================|| MEMBER SERVICE OBJECT ||============================== //

export const membersService = {
  // --- CORE CRUD ---

  /**
   * Create Principal Member with optional nested dependents
   */
  createPrincipal: async (data) => {
    const payload = normalizeMemberPayload(data);
    const response = await axiosClient.post(BASE_URL, payload);
    return unwrap(response);
  },

  /**
   * Add Dependent to an existing Principal
   */
  addDependent: async (principalId, data) => {
    const payload = normalizeMemberPayload(data);
    const response = await axiosClient.post(`${BASE_URL}/${principalId}/dependents`, payload);
    return unwrap(response);
  },

  /**
   * Update Member (Principal or Dependent)
   */
  update: async (id, data) => {
    const payload = normalizeMemberPayload(data);
    const response = await axiosClient.put(`${BASE_URL}/${id}`, payload);
    return unwrap(response);
  },

  /**
   * Get Member by ID with dependents
   */
  getById: async (id) => {
    const response = await axiosClient.get(`${BASE_URL}/${id}`);
    return unwrap(response);
  },

  /**
   * Get paginated members list with filters
   */
  getAll: async (params = {}) => {
    const response = await axiosClient.get(BASE_URL, { params });
    return normalizePaginatedResponse(response);
  },

  // --- STATUS & CARD MANAGEMENT ---

  /**
   * Activate Member/Card
   */
  activate: async (id) => {
    const response = await axiosClient.post(`${BASE_URL}/${id}/activate`);
    return unwrap(response);
  },

  /**
   * Suspend Member/Card
   */
  suspend: async (id, reason) => {
    const response = await axiosClient.post(`${BASE_URL}/${id}/suspend`, { reason });
    return unwrap(response);
  },

  /**
   * Terminate Member (IRREVERSIBLE)
   */
  terminate: async (id) => {
    const response = await axiosClient.post(`${BASE_URL}/${id}/terminate`);
    return unwrap(response);
  },

  // --- ELIGIBILITY & SMART SEARCH ---

  /**
   * Smart Search for Eligibility Verification
   * @param {Object} criteria - { civilId, barcode, cardNumber, fullName }
   */
  search: async (criteria = {}) => {
    const response = await axiosClient.get(`${BASE_URL}/search`, { params: criteria });
    return unwrap(response);
  },

  /**
   * Check Eligibility for specific Member
   */
  checkEligibility: async (id, serviceDate = null) => {
    const params = serviceDate ? { serviceDate } : {};
    const response = await axiosClient.get(`${BASE_URL}/${id}/eligibility`, { params });
    return unwrap(response);
  },

  // --- BULK OPERATIONS ---

  /**
   * Import data from Excel
   */
  importExcel: async (file, params) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(params).forEach(key => formData.append(key, params[key]));

    const response = await axiosClient.post(`${BASE_URL}/import/execute`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000 // 5 minutes
    });
    return unwrap(response);
  },

  /**
   * Export data to Excel
   */
  exportExcel: async (params = {}) => {
    const response = await axiosClient.get(`${BASE_URL}/export/excel`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Export to PDF (Legacy Support)
   */
  exportPdf: async (params = {}) => {
    const response = await axiosClient.get(`${LEGACY_BASE_URL}/export/pdf`, {
      params,
      responseType: 'blob',
      timeout: 120000
    });
    return response.data;
  },

  // --- MEDIA ---

  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post(`${BASE_URL}/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return unwrap(response);
  },

  deletePhoto: async (id) => {
    const response = await axiosClient.delete(`${BASE_URL}/${id}/photo`);
    return unwrap(response);
  }
};

// ==============================|| ENUMS & MACROS ||============================== //

export const RELATIONSHIPS = {
  WIFE: 'WIFE', HUSBAND: 'HUSBAND', SON: 'SON', DAUGHTER: 'DAUGHTER',
  FATHER: 'FATHER', MOTHER: 'MOTHER', BROTHER: 'BROTHER', SISTER: 'SISTER'
};

export const MEMBER_STATUSES = {
  ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', TERMINATED: 'TERMINATED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION'
};

export default membersService;
