import axios from 'utils/axios';

/**
 * Helper function to unwrap ApiResponse
 */
const unwrap = (response) => response.data?.data || response.data;

export const medicalCatalogService = {
    // === Raw Services & Mapping ===

    /**
     * Get filtered raw services for a provider (All, Mapped, or Unmapped)
     * @param {Object} params - { providerId, mapped, page, size, searchTerm }
     */
    getFilteredServices: async (params) => {
        const response = await axios.get('/catalog/services', { params });
        return unwrap(response);
    },

    /**
     * Get unmapped raw services for a provider
     * @param {Object} params - { providerId, page, size, searchTerm }
     */
    getUnmappedServices: async (params) => {
        // params: { providerId, employerId, page, size, searchTerm }
        const response = await axios.get('/catalog/unmapped', { params });
        return unwrap(response);
    },

    /**
     * Upload raw provider services file
     * @param {File} file 
     * @param {Long} providerId 
     */
    uploadRawServices: async (file, providerId) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('providerId', providerId);

        const response = await axios.post('/catalog/upload-raw', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Map a raw service to a master service
     * @param {Object} mappingData - { rawServiceId, masterServiceId, reasonCode, confidence }
     */
    mapService: async (mappingData) => {
        const response = await axios.post('/catalog/map', mappingData);
        return response.data;
    },

    /**
     * Get overall catalog statistics for KPIs
     */
    getCatalogStats: async () => {
        const response = await axios.get('/catalog/stats');
        return response.data;
    },

    /**
     * Import services from provider contract pricing
     * @param {Long} providerId
     * @param {Long} contractId - optional, if null imports from all active contracts
     */
    importFromContract: async (providerId, contractId = null) => {
        const params = { providerId };
        if (contractId) params.contractId = contractId;
        const response = await axios.post('/catalog/import-from-contract', null, { params });
        return response.data;
    },

    /**
     * Search medical services from the master catalog
     */
    searchMasterServices: async (term) => {
        const response = await axios.get('/medical-services/search', { params: { term, isMaster: true } });
        return response.data;
    }
};
