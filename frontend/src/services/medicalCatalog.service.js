import axios from 'utils/axios';

export const medicalCatalogService = {
    // === Raw Services & Mapping ===

    /**
     * Get unmapped raw services for a provider
     * @param {Object} params - { providerId, page, size, searchTerm }
     */
    getUnmappedServices: async (params) => {
        const response = await axios.get('/catalog/unmapped', { params });
        return response.data;
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
     * Search medical services from the master catalog
     */
    searchMasterServices: async (term) => {
        const response = await axios.get('/medical-services/search', { params: { term, isMaster: true } });
        return response.data;
    }
};
