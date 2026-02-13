import axiosClient from './client';

/**
 * Audit History API Service
 */
const auditService = {
    /**
     * Get paginated audit history
     */
    getHistory: async (params = {}) => {
        const response = await axios.get('/api/audit/history', { params });
        return response.data;
    },

    /**
     * Get recent audit activities
     */
    getRecent: async () => {
        const response = await axios.get('/api/audit/recent');
        return response.data;
    }
};

export default auditService;
