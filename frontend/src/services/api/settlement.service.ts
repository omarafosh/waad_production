import axiosClient from 'utils/axios';
import { createErrorHandler } from 'utils/api-error-handler';
import { normalizePaginatedResponse } from 'utils/api-response-normalizer';

// ==============================|| SETTLEMENT SERVICE ||============================== //

const BASE_URL = '/settlement';

type SettlementBatchQueryParams = {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
    search?: string;
    providerId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
};

type SettlementAccountQueryParams = {
    page?: number;
    size?: number;
    search?: string;
};

/**
 * Helper function to unwrap ApiResponse
 */
const unwrap = (response) => response.data?.data || response.data;

/**
 * Error handler for settlement service
 */
const handleSettlementErrors = createErrorHandler('التسوية', {
    404: 'السجل غير موجود',
    409: 'يوجد تعارض في البيانات',
    422: 'البيانات غير صحيحة',
    400: 'طلب غير صالح'
});

export const settlementService = {
    // ══════════════════════════════════════════════════════════════════════════
    // BATCH MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Get filtered settlement batches
     * @param {Object} params - {page, size, sortBy, sortDir, search, providerId, status, fromDate, toDate}
     */
    getBatches: async (params: SettlementBatchQueryParams = {}) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page !== undefined) queryParams.append('page', String(params.page));
            if (params.size !== undefined) queryParams.append('size', String(params.size));
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortDir) queryParams.append('sortDir', params.sortDir || 'desc');
            if (params.search) queryParams.append('search', params.search);
            if (params.providerId !== undefined) queryParams.append('providerId', String(params.providerId));
            if (params.status) queryParams.append('status', params.status);
            if (params.fromDate) queryParams.append('fromDate', params.fromDate);
            if (params.toDate) queryParams.append('toDate', params.toDate);

            const response = await axiosClient.get(`${BASE_URL}/batches?${queryParams.toString()}`);
            return normalizePaginatedResponse(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Get batch details by ID
     * @param {number} id 
     */
    getBatchById: async (id) => {
        try {
            if (!id) throw new Error('Batch ID is required');
            const response = await axiosClient.get(`${BASE_URL}/batches/${id}`);
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Create new settlement batch
     * @param {Object} data - {providerId, name, notes, claimIds[]}
     */
    createBatch: async (data) => {
        try {
            const response = await axiosClient.post(`${BASE_URL}/batches`, data);
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Add claims to existing batch
     * @param {number} batchId 
     * @param {Array<number>} claimIds 
     */
    addClaimsToBatch: async (batchId, claimIds) => {
        try {
            const response = await axiosClient.post(`${BASE_URL}/batches/${batchId}/claims`, { claimIds });
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Remove claim from batch
     * @param {number} batchId 
     * @param {number} claimId 
     */
    removeClaimFromBatch: async (batchId, claimId) => {
        try {
            const response = await axiosClient.delete(`${BASE_URL}/batches/${batchId}/claims/${claimId}`);
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Confirm batch (OPEN -> PENDING_PAYMENT)
     * @param {number} batchId 
     */
    confirmBatch: async (batchId) => {
        try {
            const response = await axiosClient.post(`${BASE_URL}/batches/${batchId}/confirm`);
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Pay batch (PENDING_PAYMENT -> PAID)
     * @param {number} batchId 
     * @param {Object} data - {paymentReference, paymentDate, notes}
     */
    payBatch: async (batchId, data) => {
        try {
            const response = await axiosClient.post(`${BASE_URL}/batches/${batchId}/pay`, data);
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Cancel batch
     * @param {number} batchId 
     * @param {string} reason 
     */
    cancelBatch: async (batchId, reason) => {
        try {
            const response = await axiosClient.post(`${BASE_URL}/batches/${batchId}/cancel`, { reason });
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // PROVIDER ACCOUNTS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Get provider accounts list
     */
    getProviderAccounts: async (params: SettlementAccountQueryParams = {}) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page !== undefined) queryParams.append('page', String(params.page));
            if (params.size !== undefined) queryParams.append('size', String(params.size));
            if (params.search) queryParams.append('search', params.search);

            const response = await axiosClient.get(`${BASE_URL}/accounts?${queryParams.toString()}`);
            return normalizePaginatedResponse(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Get provider account details and history
     * @param {number} providerId 
     */
    getProviderAccountDetails: async (providerId) => {
        try {
            const response = await axiosClient.get(`${BASE_URL}/accounts/${providerId}`);
            return unwrap(response);
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    },

    /**
     * Get available claims for settlement (for a provider)
     * @param {number} providerId 
     */
    getAvailableClaims: async (providerId) => {
        try {
            const response = await axiosClient.get(`${BASE_URL}/claims/available?providerId=${providerId}`);
            return unwrap(response); // Returns list of claims
        } catch (error) {
            throw handleSettlementErrors(error);
        }
    }
};

export default settlementService;
