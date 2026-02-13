import axiosClient from 'utils/axios';
import { createErrorHandler } from 'utils/api-error-handler';
import { validateClaimNumber, validateAmount } from 'utils/api-validators';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

// ==============================|| CLAIMS SERVICE ||============================== //

const BASE_URL = '/claims';

/**
 * Helper function to unwrap ApiResponse
 */
const unwrap = (response) => response.data?.data || response.data;

/**
 * Error handler for claims service
 * Provides user-friendly Arabic error messages
 */
const handleClaimErrors = createErrorHandler('المطالبة', {
  404: 'المطالبة غير موجودة',
  409: 'رقم المطالبة مكرر أو يوجد تعارض',
  422: 'البيانات المُدخلة للمطالبة غير صحيحة'
});

export const claimsService = {
  /**
   * Get all claims with pagination and filtering
   * @param {Object} params - Query parameters {page, size, employerId, sort, search}
   * @returns {Promise<Object>} Paginated claims list
   */
  getAll: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page !== undefined) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);
      if (params.employerId) queryParams.append('employerId', params.employerId);
      if (params.sort) {
        const [sortBy, sortDir] = params.sort.split(',');
        queryParams.append('sortBy', sortBy);
        queryParams.append('sortDir', sortDir || 'desc');
      }
      if (params.search) queryParams.append('search', params.search);
      
      const url = queryParams.toString() 
        ? `${BASE_URL}?${queryParams.toString()}`
        : BASE_URL;
      const response = await axiosClient.get(url);
      return normalizePaginatedResponse(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get claim by ID
   * @param {number} id - Claim ID
   * @returns {Promise<Object>} Claim details
   */
  getById: async (id) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get claim by claim number
   * @param {string} claimNumber - Claim number (format: CLM-YYYYMMDD-XXXX)
   * @returns {Promise<Object>} Claim details
   */
  getByClaimNumber: async (claimNumber) => {
    try {
      validateClaimNumber(claimNumber);
      const response = await axiosClient.get(`${BASE_URL}/number/${claimNumber}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Create new claim
   * @param {Object} data - Claim data
   * @returns {Promise<Object>} Created claim
   */
  create: async (data) => {
    try {
      if (!data) throw new Error('بيانات المطالبة مطلوبة');
      if (data.requestedAmount !== undefined) {
        validateAmount(data.requestedAmount, 'المبلغ المطلوب');
      }
      const response = await axiosClient.post(BASE_URL, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Update claim
   * @param {number} id - Claim ID
   * @param {Object} data - Updated claim data
   * @returns {Promise<Object>} Updated claim
   */
  update: async (id, data) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      if (!data) throw new Error('بيانات التحديث مطلوبة');
      if (data.requestedAmount !== undefined) {
        validateAmount(data.requestedAmount, 'المبلغ المطلوب');
      }
      const response = await axiosClient.put(`${BASE_URL}/${id}`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Delete claim
   * @param {number} id - Claim ID
   * @returns {Promise<void>}
   */
  remove: async (id) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      const response = await axiosClient.delete(`${BASE_URL}/${id}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get claims by visit
   * @param {number} visitId - Visit ID
   * @returns {Promise<Array>} List of claims
   */
  getByVisit: async (visitId) => {
    try {
      if (!visitId) throw new Error('معرف الزيارة مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/visit/${visitId}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get claims by status
   * @param {string} status - Claim status (PENDING, APPROVED, REJECTED)
   * @returns {Promise<Array>} List of claims
   */
  getByStatus: async (status) => {
    try {
      if (!status) throw new Error('حالة المطالبة مطلوبة');
      const response = await axiosClient.get(`${BASE_URL}/status/${status}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Approve claim
   * @param {number} id - Claim ID
   * @param {Object} data - Approval data (approvedAmount, notes)
   * @returns {Promise<Object>} Approved claim
   */
  approve: async (id, data) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      if (data?.approvedAmount !== undefined) {
        validateAmount(data.approvedAmount, 'المبلغ المعتمد');
      }
      const response = await axiosClient.post(`${BASE_URL}/${id}/approve`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Reject claim
   * @param {number} id - Claim ID
   * @param {Object} data - Rejection data (rejectionReason)
   * @returns {Promise<Object>} Rejected claim
   */
  reject: async (id, data) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      if (!data?.rejectionReason) {
        throw new Error('سبب الرفض مطلوب');
      }
      const response = await axiosClient.post(`${BASE_URL}/${id}/reject`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Search claims
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Filtered claims
   */
  search: async (searchTerm) => {
    try {
      const response = await axiosClient.get(`${BASE_URL}/search?q=${encodeURIComponent(searchTerm || '')}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  // ======================= INBOX OPERATIONS =======================

  /**
   * Get pending claims for inbox (operations review)
   * @param {Object} params - Pagination params {page, size, sortBy, sortDir}
   * @returns {Promise<Object>} Paginated pending claims {items, total, page, size}
   */
  getPendingClaims: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortDir) queryParams.append('sortDir', params.sortDir);

      const response = await axiosClient.get(`${BASE_URL}/inbox/pending?${queryParams.toString()}`);
      return normalizePaginatedResponse(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get approved claims ready for settlement
   * @param {Object} params - Pagination params {page, size, sortBy, sortDir}
   * @returns {Promise<Object>} Paginated approved claims {items, total, page, size}
   */
  getApprovedClaims: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.size) queryParams.append('size', params.size);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortDir) queryParams.append('sortDir', params.sortDir);

      const response = await axiosClient.get(`${BASE_URL}/inbox/approved?${queryParams.toString()}`);
      return normalizePaginatedResponse(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get cost breakdown (Financial Snapshot) for a claim
   * @param {number} id - Claim ID
   * @returns {Promise<Object>} Cost breakdown {requestedAmount, patientCoPay, netProviderAmount, ...}
   */
  getCostBreakdown: async (id) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/${id}/cost-breakdown`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get claim attachments
   * @param {number} id - Claim ID
   * @returns {Promise<Array>} List of attachments
   */
  getAttachments: async (id) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/${id}/attachments`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Upload attachment to claim
   * @param {number} id - Claim ID
   * @param {FormData} formData - Form data with file and attachmentType
   * @returns {Promise<Object>} Uploaded attachment metadata
   */
  uploadAttachment: async (id, formData) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      if (!formData) throw new Error('بيانات الملف مطلوبة');
      const response = await axiosClient.post(`${BASE_URL}/${id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Download claim attachment
   * @param {number} claimId - Claim ID
   * @param {number} attachmentId - Attachment ID
   * @returns {Promise<Blob>} File blob
   */
  downloadAttachment: async (claimId, attachmentId) => {
    try {
      if (!claimId) throw new Error('معرف المطالبة مطلوب');
      if (!attachmentId) throw new Error('معرف المرفق مطلوب');
      const response = await axiosClient.get(`${BASE_URL}/${claimId}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Submit claim for review (change status from DRAFT to SUBMITTED)
   * @param {number} id - Claim ID
   * @returns {Promise<Object>} Updated claim
   */
  submit: async (id) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      const response = await axiosClient.post(`${BASE_URL}/${id}/submit`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Start review of a submitted claim (SUBMITTED → UNDER_REVIEW)
   * @param {number} id - Claim ID
   * @returns {Promise<Object>} Updated claim
   */
  startReview: async (id) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      const response = await axiosClient.post(`${BASE_URL}/${id}/start-review`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Settle an approved claim (Finance operation)
   * @param {number} id - Claim ID
   * @param {Object} data - Settlement data {paymentReference, notes}
   * @returns {Promise<Object>} Settled claim
   */
  settle: async (id, data) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      const response = await axiosClient.post(`${BASE_URL}/${id}/settle`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Return claim for additional information (UNDER_REVIEW → RETURNED_FOR_INFO)
   * @param {number} id - Claim ID
   * @param {Object} data - Return data {reason, requiredDocuments}
   * @returns {Promise<Object>} Updated claim
   */
  returnForInfo: async (id, data) => {
    try {
      if (!id) throw new Error('معرف المطالبة مطلوب');
      if (!data?.reason) throw new Error('سبب طلب المعلومات مطلوب');
      const response = await axiosClient.post(`${BASE_URL}/${id}/return-for-info`, data);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  // ======================= REPORTS =======================

  /**
   * Get adjudication report
   * @param {Object} params - Report params {startDate, endDate, providerId, status}
   * @returns {Promise<Object>} Adjudication report
   */
  getAdjudicationReport: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.providerId) queryParams.append('providerId', params.providerId);
      if (params.status) queryParams.append('status', params.status);

      const response = await axiosClient.get(`/reports/adjudication?${queryParams.toString()}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get provider settlement report
   * @param {number} providerId - Provider ID
   * @param {Object} params - Report params {startDate, endDate}
   * @returns {Promise<Object>} Provider settlement report
   */
  getProviderSettlementReport: async (providerId, params = {}) => {
    try {
      if (!providerId) throw new Error('معرف المزود مطلوب');
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await axiosClient.get(`/reports/provider-settlement/${providerId}?${queryParams.toString()}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get member statement
   * @param {number} memberId - Member ID
   * @returns {Promise<Object>} Member claims statement
   */
  getMemberStatement: async (memberId) => {
    try {
      if (!memberId) throw new Error('معرف العضو مطلوب');
      const response = await axiosClient.get(`/reports/member-statement/${memberId}`);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // FINANCIAL SUMMARY ENDPOINTS - SINGLE SOURCE OF TRUTH
  // ═══════════════════════════════════════════════════════════════════════════════
  // THESE ENDPOINTS MUST BE USED FOR ALL FINANCIAL TOTALS.
  // FRONTEND IS FORBIDDEN FROM USING .reduce() ON FINANCIAL FIELDS.
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get comprehensive financial summary from backend.
   * ⚠️ SINGLE SOURCE OF TRUTH - Never calculate totals in frontend!
   * 
   * @param {Object} params - Optional filters {employerOrgId, fromDate, toDate}
   * @returns {Promise<Object>} Financial summary with all totals
   */
  getFinancialSummary: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.employerOrgId) queryParams.append('employerOrgId', params.employerOrgId);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);

      const queryString = queryParams.toString();
      const url = `/api/reports/financial-summary${queryString ? `?${queryString}` : ''}`;
      const response = await axiosClient.get(url);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  },

  /**
   * Get settlement-focused summary for Settlement Inbox.
   * ⚠️ SINGLE SOURCE OF TRUTH - Never calculate settlement totals in frontend!
   * 
   * @param {Object} params - Optional filters {employerOrgId}
   * @returns {Promise<Object>} Settlement summary with authoritative totals
   */
  getSettlementSummary: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.employerOrgId) queryParams.append('employerOrgId', params.employerOrgId);

      const queryString = queryParams.toString();
      const url = `/api/reports/settlement-summary${queryString ? `?${queryString}` : ''}`;
      const response = await axiosClient.get(url);
      return unwrap(response);
    } catch (error) {
      throw handleClaimErrors(error);
    }
  }
};

export default claimsService;
