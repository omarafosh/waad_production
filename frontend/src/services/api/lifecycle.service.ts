import api from 'utils/axios';

/**
 * Get lifecycle preview for an entity.
 * Shows current status and allowed actions with impact summaries.
 * 
 * @param {string} entityType - e.g., 'MEMBER', 'BENEFIT_POLICY'
 * @param {number|string} entityId - The unique ID of the entity
 * @returns {Promise<Object>} Preview data
 */
export const getLifecyclePreview = async (entityType, entityId) => {
    const response = await api.get(`/lifecycle/preview/${entityType}/${entityId}`);
    return response.data;
};

/**
 * Execute a lifecycle action on an entity.
 * 
 * @param {string} entityType - e.g., 'MEMBER', 'BENEFIT_POLICY'
 * @param {number|string} entityId - The unique ID of the entity
 * @param {Object} payload - { action: string, reason: string, notes: string, metadata: Object }
 * @returns {Promise<Object>} Execution result { success: boolean, newStatus: string, message: string }
 */
export const executeLifecycleAction = async (entityType, entityId, payload) => {
    const response = await api.post(`/lifecycle/execute/${entityType}/${entityId}`, payload);
    return response.data;
};

const lifecycleService = {
    getLifecyclePreview,
    executeLifecycleAction
};

export default lifecycleService;
